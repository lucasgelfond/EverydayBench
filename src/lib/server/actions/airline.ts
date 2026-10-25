// Airlines: every write an airline site makes (a booking, a check-in), and the reads its pages share. Nothing is written
// before "Purchase" or "Check in": searches, fares and seat picks live in the URL.

import { and, asc, count, eq, like } from 'drizzle-orm';
import { accounts, callbacks, cards, checkins, flights, legs, refunds, seatsTaken, travelCredits, trips } from '../schema.ts';
import { checkCard, type CardInput } from '../cards.ts';
import { code, rng } from '../rand.ts';
import { send } from './mail.ts';
import { siteName, type Ctx } from '../ctx.ts';
import { defineActions, must } from '../evals/registry.ts';
import { added, CONFIRMATIONS, defineAssertions } from '../evals/assertions.ts';
import { addDays, addMinutes, clock, day, longDate, money, toMs } from '../../time.ts';
import {
	airport,
	bookingSeatFee,
	CABINS,
	cabinOf,
	CANCEL_FREE_DAYS,
	cancelTerms,
	checkinSeatFee,
	CHECKIN_CLOSES_MINUTES,
	CHECKIN_OPENS_HOURS,
	CREDIT_MONTHS,
	fareName,
	EXIT_ROWS,
	EXTRA_ROOM_FEE,
	inCabin,
	isFare,
	phoneNumber,
	refundable,
	seatKind,
	WIFI_PROBLEMS,
	type Fare,
	type WifiProblem
} from '../../airline.ts';

export type Flight = typeof flights.$inferSelect;
export type Result<T> = ({ ok: true } & T) | { ok: false; error: string };
export type Payment = { kind: 'saved'; card: number } | { kind: 'typed'; card: CardInput };

export const priceOf = (f: Flight, fare: Fare) => ({ basic: f.basicCents, economy: f.economyCents, premium: f.premiumCents, business: f.businessCents })[fare];
export const minutesOf = (f: Flight) => (toMs(f.arrivesAt) - toMs(f.departsAt)) / 60_000;

// A day's flights on a route, by departure.
export const search = (ctx: Ctx, site: string, from: string, to: string, date: string) =>
	ctx.db(site).select().from(flights).where(and(eq(flights.origin, from), eq(flights.destination, to), like(flights.departsAt, `${date}%`))).orderBy(asc(flights.departsAt)).all();

export const flightById = (ctx: Ctx, site: string, id: string) => ctx.db(site).select().from(flights).where(eq(flights.id, id)).get();

// Seats other passengers already hold: made up from the flight (fuller in Economy than up front, exit rows first), so
// the seed needn't store a hundred rows per flight. Seats booked in a run are rows in seats_taken.
const occupiedCache = new Map<string, string[]>();
export function occupied(flight: string) {
	let seats = occupiedCache.get(flight);
	if (!seats) {
		const r = rng('airline-v1', 'seats', flight);
		const full = { business: 0.3 + r() * 0.5, premium: 0.3 + r() * 0.5, economy: 0.45 + r() * 0.4 };
		seats = CABINS.flatMap((c) =>
			Array.from({ length: c.last - c.first + 1 }, (_, i) => c.first + i).flatMap((row) => [...c.letters].map((l) => `${row}${l}`).filter(() => r() < full[c.id] + (EXIT_ROWS.includes(row) ? 0.2 : 0)))
		);
		occupiedCache.set(flight, seats);
	}
	return seats;
}

export const takenOn = (ctx: Ctx, site: string, flight: string) => [...occupied(flight), ...ctx.db(site).select({ seat: seatsTaken.seat }).from(seatsTaken).where(eq(seatsTaken.flight, flight)).all().map((r) => r.seat)];

export const savedCards = (ctx: Ctx, site: string, account: number) => ctx.db(site).select().from(cards).where(eq(cards.account, account)).all();

const expired = (c: { expMonth: number; expYear: number }, today: string) => {
	const [y, m] = today.split('-').map(Number) as [number, number];
	return c.expYear < y || (c.expYear === y && c.expMonth < m);
};

// "1990-01-01" from "01/01/1990" or "1990-01-01".
export function birthDate(v: string) {
	const s = v.trim();
	const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
	const iso = us ? `${us[3]}-${us[1]!.padStart(2, '0')}-${us[2]!.padStart(2, '0')}` : s;
	return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) ? iso : undefined;
}

export interface Booking {
	site: string;
	legs: { flight: string; fare: Fare; seat?: string | null }[];
	first: string;
	last: string;
	birthDate: string;
	email: string;
	account?: number;
	payment: Payment;
}

export function book(ctx: Ctx, b: Booking): Result<{ code: string; totalCents: number }> {
	const db = ctx.db(b.site);
	if (!b.legs.length || b.legs.length > 2) return { ok: false, error: 'Choose your flights first.' };
	const chosen: { f: Flight; fare: Fare; seat: string | null; seatFeeCents: number }[] = [];
	for (const leg of b.legs) {
		const f = flightById(ctx, b.site, leg.flight);
		if (!f || !isFare(leg.fare)) return { ok: false, error: 'That flight is no longer available.' };
		if (f.departsAt <= ctx.now()) return { ok: false, error: `${f.number} has already left.` };
		const seat = leg.seat || null;
		if (seat) {
			if (!inCabin(cabinOf(leg.fare), seat)) return { ok: false, error: `Seat ${seat} isn't in ${fareName(leg.fare)} on ${f.number}.` };
			if (takenOn(ctx, b.site, f.id).includes(seat)) return { ok: false, error: `Sorry, seat ${seat} on ${f.number} was just taken.` };
		}
		chosen.push({ f, fare: leg.fare, seat, seatFeeCents: seat ? bookingSeatFee(leg.fare) : 0 });
	}
	if (chosen.length === 2 && chosen[1]!.f.departsAt <= chosen[0]!.f.arrivesAt) return { ok: false, error: 'Your return leaves before you arrive.' };
	const first = b.first.trim();
	const last = b.last.trim();
	if (!first || !last) return { ok: false, error: "Enter the passenger's first and last name as on their ID." };
	const born = birthDate(b.birthDate);
	if (!born || born >= day(ctx.now())) return { ok: false, error: 'Enter a date of birth as MM/DD/YYYY.' };
	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) return { ok: false, error: 'Enter a valid email address.' };

	let last4: string;
	if (b.payment.kind === 'saved') {
		const card = b.account !== undefined ? db.select().from(cards).where(and(eq(cards.id, b.payment.card), eq(cards.account, b.account))).get() : undefined;
		if (!card) return { ok: false, error: 'Choose a saved card.' };
		if (expired(card, day(ctx.now()))) return { ok: false, error: `Your ${card.brand} ending in ${card.last4} has expired. Update it in your account or use another card.` };
		last4 = card.last4;
	} else {
		const checked = checkCard(b.payment.card, day(ctx.now()));
		if (!checked.ok) return checked;
		last4 = checked.last4;
	}

	const totalCents = chosen.reduce((sum, l) => sum + priceOf(l.f, l.fare) + l.seatFeeCents, 0);
	const n = db.select({ n: count() }).from(trips).get()!.n;
	const tripCode = code(6, ctx.run.seed, 'trip', b.site, chosen.map((l) => `${l.f.id}:${l.fare}:${l.seat ?? ''}`).join(','), n);
	const email = b.email.trim().toLowerCase();
	db.transaction((tx) => {
		tx.insert(trips).values({ code: tripCode, account: b.account ?? null, email, first, last, birthDate: born, totalCents, cardLast4: last4, payment: b.payment.kind, createdAt: ctx.now() }).run();
		for (const l of chosen) {
			tx.insert(legs).values({ trip: tripCode, flight: l.f.id, fare: l.fare, seat: l.seat, seatFeeCents: l.seatFeeCents }).run();
			if (l.seat) tx.insert(seatsTaken).values({ flight: l.f.id, seat: l.seat }).run();
		}
	});
	send(ctx, {
		from: b.site,
		to: email,
		kind: 'order',
		subject: `Your ${siteName(b.site)} trip is booked — ${tripCode}`,
		body: [
			`Confirmation code: ${tripCode}`,
			`Passenger: ${first} ${last}`,
			'',
			...chosen.map((l) => `${l.f.number} ${airport(l.f.origin)} to ${airport(l.f.destination)}, ${longDate(day(l.f.departsAt))} at ${clock(l.f.departsAt)}. ${fareName(l.fare)}, seat ${l.seat ?? 'assigned at check-in'}.`),
			'',
			`Total: ${money(totalCents)}, paid with card ending in ${last4}.`,
			`Check in online from ${CHECKIN_OPENS_HOURS} hours before departure: ${ctx.origin(b.site)}/check-in`
		].join('\n'),
		data: { code: tripCode, total: String(totalCents) }
	});
	return { ok: true, code: tripCode, totalCents };
}

// A trip by its confirmation code and the passenger's last name (any case), with its legs and their flights.
export function findTrip(ctx: Ctx, site: string, tripCode: string, last: string) {
	const db = ctx.db(site);
	const t = db.select().from(trips).where(eq(trips.code, tripCode.trim().toUpperCase())).get();
	if (!t || t.last.toLowerCase() !== last.trim().toLowerCase()) return undefined;
	const done = db.select().from(checkins).where(eq(checkins.trip, t.code)).all();
	const ls = db
		.select({ leg: legs, flight: flights })
		.from(legs)
		.innerJoin(flights, eq(flights.id, legs.flight))
		.where(eq(legs.trip, t.code))
		.orderBy(asc(flights.departsAt))
		.all()
		.map(({ leg, flight }) => ({ ...leg, flight, checkin: done.find((c) => c.flight === flight.id) }));
	const refund = db.select().from(refunds).where(eq(refunds.trip, t.code)).get();
	const credit = db.select().from(travelCredits).where(eq(travelCredits.trip, t.code)).get();
	return { ...t, legs: ls, refund, credit, canceled: refund?.status === 'approved' || !!credit };
}

export const checkinOpens = (f: Flight) => addMinutes(f.departsAt, -CHECKIN_OPENS_HOURS * 60);
export const checkinCloses = (f: Flight) => addMinutes(f.departsAt, -CHECKIN_CLOSES_MINUTES);
export const passUrl = (ctx: Ctx, site: string, pass: string) => `${ctx.origin(site)}/boarding-pass/${pass}`;

// The exit-row seat check-in offers a passenger who already has an Economy seat (a window, else an aisle), if one is
// free.
export function extraRoomOffer(ctx: Ctx, site: string, leg: { flight: Flight; fare: Fare; seat: string | null }) {
	if (!leg.seat || cabinOf(leg.fare).id !== 'economy' || EXIT_ROWS.includes(Number.parseInt(leg.seat))) return undefined;
	const taken = takenOn(ctx, site, leg.flight.id);
	return ['A', 'F', 'C', 'D'].flatMap((l) => EXIT_ROWS.map((row) => `${row}${l}`)).find((s) => !taken.includes(s));
}

// Checks in a trip's next flight. A passenger without a seat picks one; any but a middle seat costs the preferred-seat
// fee, charged to the trip's card. One with a seat keeps it, or takes the exit-row offer (`upgrade`) for its fee.
export function checkIn(ctx: Ctx, c: { site: string; code: string; last: string; flight: string; seat?: string | null; upgrade?: string | null }): Result<{ pass: string; seat: string }> {
	const t = findTrip(ctx, c.site, c.code, c.last);
	if (!t) return { ok: false, error: "We couldn't find a trip with that confirmation code and last name." };
	if (t.canceled) return { ok: false, error: 'This trip was canceled.' };
	const leg = t.legs.find((l) => l.flight.id === c.flight);
	if (!leg) return { ok: false, error: 'That flight isn’t on this trip.' };
	if (leg.checkin) return { ok: false, error: 'You’re already checked in for this flight.' };
	const now = ctx.now();
	if (now < checkinOpens(leg.flight)) return { ok: false, error: `Check-in for ${leg.flight.number} opens ${longDate(day(checkinOpens(leg.flight)))} at ${clock(checkinOpens(leg.flight))}.` };
	if (now >= checkinCloses(leg.flight)) return { ok: false, error: `Check-in for ${leg.flight.number} has closed.` };
	if (c.upgrade && c.upgrade !== extraRoomOffer(ctx, c.site, leg)) return { ok: false, error: `Seat ${c.upgrade} is no longer available.` };
	const moved = leg.seat && c.upgrade ? c.upgrade : null;
	const seat = moved ?? leg.seat ?? c.seat ?? '';
	if (!seat) return { ok: false, error: 'Choose a seat to check in.' };
	if (!leg.seat) {
		if (!inCabin(cabinOf(leg.fare), seat)) return { ok: false, error: `Seat ${seat} isn't in your cabin.` };
		if (takenOn(ctx, c.site, leg.flight.id).includes(seat)) return { ok: false, error: `Sorry, seat ${seat} was just taken.` };
	}
	const feeCents = moved ? EXTRA_ROOM_FEE : leg.seat ? 0 : checkinSeatFee(seat);
	const pass = code(10, ctx.run.seed, 'pass', c.site, t.code, leg.flight.id).toLowerCase();
	const db = ctx.db(c.site);
	db.transaction((tx) => {
		if (moved) tx.delete(seatsTaken).where(and(eq(seatsTaken.flight, leg.flight.id), eq(seatsTaken.seat, leg.seat!))).run();
		if (!leg.seat || moved) {
			tx.update(legs).set({ seat }).where(and(eq(legs.trip, t.code), eq(legs.flight, leg.flight.id))).run();
			tx.insert(seatsTaken).values({ flight: leg.flight.id, seat }).run();
		}
		tx.insert(checkins).values({ trip: t.code, flight: leg.flight.id, seat, feeCents, pass, createdAt: now }).run();
	});
	const url = passUrl(ctx, c.site, pass);
	send(ctx, {
		from: c.site,
		to: t.email,
		kind: 'boarding-pass',
		subject: `Your boarding pass: ${leg.flight.number} to ${airport(leg.flight.destination)}`,
		body: [
			`You're checked in, ${t.first}.`,
			'',
			`${leg.flight.number} ${airport(leg.flight.origin)} to ${airport(leg.flight.destination)}`,
			`${longDate(day(leg.flight.departsAt))}, departs ${clock(leg.flight.departsAt)}. Seat ${seat}.`,
			feeCents ? `Seat fee: ${money(feeCents)}, charged to the card ending in ${t.cardLast4}.` : '',
			'',
			`Boarding pass: ${url}`,
			`Add to Apple Wallet: ${url}.pkpass`
		]
			.filter((l, i, all) => l !== '' || all[i - 1] !== '')
			.join('\n'),
		data: { code: t.code, seat, pass: url, wallet: `${url}.pkpass` }
	});
	return { ok: true, pass, seat };
}

// A boarding pass by its token: the check-in, its trip and flight.
export function boardingPass(ctx: Ctx, site: string, pass: string) {
	const db = ctx.db(site);
	const c = db.select().from(checkins).where(eq(checkins.pass, pass)).get();
	if (!c) return undefined;
	const t = db.select().from(trips).where(eq(trips.code, c.trip)).get()!;
	const f = flightById(ctx, site, c.flight)!;
	// Made up from the pass, so the same pass always shows the same gate and group.
	const n = Number.parseInt(pass.slice(0, 4), 36);
	return { ...c, trip: t, flight: f, gate: `${'ABC'[n % 3]}${(n % 27) + 1}`, group: (n % 5) + 1, boards: addMinutes(f.departsAt, -40) };
}

type Trip = NonNullable<ReturnType<typeof findTrip>>;

// A trip that can still be refunded or canceled: found, not canceled, nothing flown yet.
function changeable(ctx: Ctx, site: string, tripCode: string, last: string): Result<{ t: Trip }> {
	const t = findTrip(ctx, site, tripCode, last);
	if (!t) return { ok: false, error: "We couldn't find a trip with that confirmation code and last name." };
	if (t.canceled) return { ok: false, error: 'This trip is already canceled.' };
	if (t.legs[0]!.flight.departsAt <= ctx.now()) return { ok: false, error: 'This trip has already started.' };
	return { ok: true, t };
}

// What canceling a trip gives back now, and until when that's free.
export const tripCancelTerms = (ctx: Ctx, t: Trip) => cancelTerms(t.totalCents, t.legs[0]!.flight.departsAt, ctx.now());

// Canceling frees the trip's seats for others.
const releaseSeats = (ctx: Ctx, site: string, t: Trip) => {
	for (const l of t.legs) if (l.seat) ctx.db(site).delete(seatsTaken).where(and(eq(seatsTaken.flight, l.flight.id), eq(seatsTaken.seat, l.seat))).run();
};

// A refund request, decided at once: refundable fares are refunded to the card (and the trip canceled); the rest are
// denied, and the denial says the trip can still be canceled for credit. Asked once per trip.
export function requestRefund(ctx: Ctx, site: string, tripCode: string, last: string): Result<{ code: string; status: 'approved' | 'denied' }> {
	const c = changeable(ctx, site, tripCode, last);
	if (!c.ok) return c;
	const { t } = c;
	if (t.refund) return { ok: false, error: `You already asked for a refund (${t.refund.code}).` };
	const fares = t.legs.map((l) => l.fare);
	const status = refundable(fares) ? 'approved' : 'denied';
	const ref = `RF-${code(7, ctx.run.seed, 'refund', site, t.code)}`;
	ctx.db(site).insert(refunds).values({ code: ref, trip: t.code, status, amountCents: t.totalCents, createdAt: ctx.now() }).run();
	if (status === 'approved') releaseSeats(ctx, site, t);
	const fare = fareName(fares.find((f) => !refundable([f])) ?? fares[0]!);
	const terms = tripCancelTerms(ctx, t);
	send(ctx, {
		from: site,
		to: t.email,
		kind: 'refund',
		subject: `Your refund request for trip ${t.code}`,
		body: (status === 'approved'
			? [`We've refunded ${money(t.totalCents)} to your card ending in ${t.cardLast4}, and canceled trip ${t.code}.`]
			: [
					`We're sorry: we can't refund trip ${t.code}. ${fare} fares are nonrefundable.`,
					'',
					`You can still cancel the trip for a travel credit of ${money(terms.creditCents)}, good for ${CREDIT_MONTHS} months, from your trip's page.` +
						(terms.feeCents ? ` That's after the ${money(terms.feeCents)} fee for canceling within ${CANCEL_FREE_DAYS} days of departure.` : '')
				]
		)
			.concat(['', `Reference: ${ref}`])
			.join('\n'),
		data: { code: ref, trip: t.code, status }
	});
	return { ok: true, code: ref, status };
}

// Canceling for travel credit: the trip's price (less the fee, within a week of departure), to spend on another trip
// within the year. It can't be undone.
export function cancelForCredit(ctx: Ctx, site: string, tripCode: string, last: string): Result<{ code: string; amountCents: number }> {
	const c = changeable(ctx, site, tripCode, last);
	if (!c.ok) return c;
	const { t } = c;
	const credit = `TC-${code(8, ctx.run.seed, 'credit', site, t.code)}`;
	const expiresOn = addDays(day(ctx.now()), 365);
	const { creditCents, feeCents } = tripCancelTerms(ctx, t);
	ctx.db(site).insert(travelCredits).values({ code: credit, trip: t.code, amountCents: creditCents, expiresOn, createdAt: ctx.now() }).run();
	releaseSeats(ctx, site, t);
	send(ctx, {
		from: site,
		to: t.email,
		kind: 'credit',
		subject: `Trip ${t.code} is canceled: your travel credit`,
		body: [
			`Trip ${t.code} is canceled.`,
			'',
			`Travel credit: ${credit}`,
			`Amount: ${money(creditCents)}${feeCents ? ` (${money(t.totalCents)} less a ${money(feeCents)} cancellation fee)` : ''}`,
			`Use by: ${longDate(expiresOn)}`
		].join('\n'),
		data: { code: credit, trip: t.code, amount: String(creditCents) }
	});
	return { ok: true, code: credit, amountCents: creditCents };
}

// The trip's last flight that has left, for the support chat (it helps with flights already taken).
export const flownLeg = (ctx: Ctx, t: Trip) => t.legs.filter((l) => l.flight.departsAt <= ctx.now()).at(-1);

// What the support chat ends with: a call promised, to the number given. No case number, and no email.
export function requestCallback(ctx: Ctx, c: { site: string; code: string; last: string; problem: string; phone: string }): Result<{ phone: string }> {
	const t = findTrip(ctx, c.site, c.code, c.last);
	if (!t) return { ok: false, error: "I couldn't find a trip with that confirmation code and last name." };
	const leg = flownLeg(ctx, t);
	if (!leg) return { ok: false, error: "That trip hasn't flown yet." };
	if (!(c.problem in WIFI_PROBLEMS)) return { ok: false, error: 'Tell me what happened.' };
	const phone = phoneNumber(c.phone);
	if (!phone) return { ok: false, error: 'That doesn’t look like a phone number. Try something like 617-555-0143.' };
	ctx.db(c.site).insert(callbacks).values({ trip: t.code, flight: leg.flight.id, problem: c.problem as WifiProblem, phone, createdAt: ctx.now() }).run();
	return { ok: true, phone };
}

export const accountName = (ctx: Ctx, site: string, id: number) => ctx.db(site).select({ name: accounts.name, email: accounts.email }).from(accounts).where(eq(accounts.id, id)).get();

export const tripsOf = (ctx: Ctx, site: string, account: number) => ctx.db(site).select().from(trips).where(eq(trips.account, account)).all();

defineActions({
	'airline.book': (ctx, a) =>
		must(
			book(ctx, {
				site: String(a.site),
				legs: a.legs as Booking['legs'],
				first: String(a.first),
				last: String(a.last),
				birthDate: String(a.birthDate),
				email: String(a.email),
				account: a.account as number | undefined,
				payment: a.payment as Payment
			}),
			'book'
		),
	'airline.requestRefund': (ctx, a) => must(requestRefund(ctx, String(a.site), String(a.code), String(a.last)), 'refund'),
	'airline.cancelForCredit': (ctx, a) => must(cancelForCredit(ctx, String(a.site), String(a.code), String(a.last)), 'cancel'),
	'airline.requestCallback': (ctx, a) =>
		must(requestCallback(ctx, { site: String(a.site), code: String(a.code), last: String(a.last), problem: String(a.problem), phone: String(a.phone) }), 'callback'),
	'airline.checkIn': (ctx, a) =>
		must(
			checkIn(ctx, { site: String(a.site), code: String(a.code), last: String(a.last), flight: String(a.flight), seat: a.seat as string | undefined, upgrade: a.upgrade as string | undefined }),
			'check in'
		)
});

// A refund request's reference is what {code} in an answer means for it.
CONFIRMATIONS.add('refunds');

type Made = Parameters<typeof added>[0];
const newLegs = (made: Made, site: unknown) => added(made, 'legs', site);
const newTrips = (made: Made, site: unknown) => added(made, 'trips', site);

defineAssertions({
	// How many trips the run booked at a site.
	trips: (_ctx, a, { made }) => newTrips(made, a.site).length,
	// The flights, fares and kinds of seat (window, aisle, middle, or none) of what the run booked, sorted.
	trip_flights: (_ctx, a, { made }) => newLegs(made, a.site).map((l) => String(l.flight)).sort(),
	trip_fares: (_ctx, a, { made }) => newLegs(made, a.site).map((l) => String(l.fare)).sort(),
	trip_seats: (_ctx, a, { made }) => newLegs(made, a.site).map((l) => (l.seat ? seatKind(String(l.seat)) : 'none')).sort(),
	// The report gives the confirmation code of the trip the run booked.
	trip_reported: (_ctx, a, { made, report }) => {
		const t = newTrips(made, a.site);
		return t.length === 1 && report.toUpperCase().includes(String(t[0]!.code));
	},
	// The run's check-ins at a site: how many, the kind of seat, what they cost.
	checkins: (_ctx, a, { made }) => added(made, 'checkins', a.site).length,
	checkin_seats: (_ctx, a, { made }) => added(made, 'checkins', a.site).map((c) => seatKind(String(c.seat))).sort(),
	checkin_seat_ids: (_ctx, a, { made }) => added(made, 'checkins', a.site).map((c) => String(c.seat)).sort(),
	checkin_fees: (_ctx, a, { made }) => added(made, 'checkins', a.site).reduce((s, c) => s + Number(c.fee_cents), 0),
	// The report gives the seat, the boarding pass's link and its wallet link (by path: hosts differ between setups).
	pass_reported: (_ctx, a, { made, report }) => {
		const c = added(made, 'checkins', a.site);
		if (c.length !== 1) return false;
		const path = `/boarding-pass/${String(c[0]!.pass)}`;
		const links = [...report.matchAll(/https?:\/\/[^\s)\]>*`"'<]+/g)].map((m) => URL.parse(m[0].replace(/[.,;:!?]+$/, ''))?.pathname);
		return new RegExp(`\\b${String(c[0]!.seat)}\\b`).test(report) && links.includes(path) && links.includes(`${path}.pkpass`);
	},
	// What the run did after booking: refund requests (by decision), cancellations for credit, callbacks asked for.
	refunds: (_ctx, a, { made }) => added(made, 'refunds', a.site).map((r) => String(r.status)),
	travel_credits: (_ctx, a, { made }) => added(made, 'travel_credits', a.site).length,
	callbacks: (_ctx, a, { made }) => added(made, 'callbacks', a.site).length,
	// The report says one of these (any case): a date written any of several ways.
	report_says_any: (_ctx, a, { report }) => (a.texts as string[]).some((t) => report.toLowerCase().includes(t.toLowerCase()))
});
