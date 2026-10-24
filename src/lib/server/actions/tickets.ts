// Tickets: every write a ticket site makes. Pages call these; graders replay them to get a task's expected end state.
// Nothing is written until a purchase or an account change: seat picks and sign-ins live in the URL and cookies.

import { createHash } from 'node:crypto';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { accounts, auditoriums, cards, orders, resets, showtimes, taken, theaters } from '../schema.ts';
import { checkCard, type CardInput } from '../cards.ts';
import { code } from '../rand.ts';
import { send } from './mail.ts';
import { siteName, type Ctx } from '../ctx.ts';
import { defineActions, must } from '../evals/registry.ts';
import { added, defineAssertions, list } from '../evals/assertions.ts';
import { SITES } from '../../sites.ts';
import { addMinutes, bySeat, clock, longDate, day, money } from '../../time.ts';

// Per-ticket fees: the aggregator charges more for selling another chain's seats.
export const FEE_CENTS: Record<string, number> = { aggregator: 250, chain: 150, arthouse: 100 };
export const MAX_SEATS = 10;

// A card on file, a card typed in, or a hosted checkout that already charged one (it passes the last four digits).
export type Payment = { kind: 'saved'; card: number } | { kind: 'typed'; card: CardInput } | { kind: 'tallypay'; last4: string };
export type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

export const passwordHash = (email: string, password: string) => createHash('sha256').update(`everydaybench:${email.toLowerCase()}:${password}`).digest('hex');

// The show, its theater and its auditorium, from the site that sells it.
export function show(ctx: Ctx, venue: string, id: string) {
	const db = ctx.db(venue);
	const s = db.select().from(showtimes).where(eq(showtimes.id, id)).get();
	if (!s) return undefined;
	const theater = db.select().from(theaters).where(eq(theaters.id, s.theater)).get()!;
	const room = s.auditorium ? db.select().from(auditoriums).where(eq(auditoriums.id, s.auditorium)).get() : undefined;
	const sold = db.select({ seat: taken.seat }).from(taken).where(eq(taken.showtime, id)).all().map((r) => r.seat);
	return { ...s, theater, room, sold };
}

export const seatExists = (room: { rows: number; cols: number; gaps: string[] }, seat: string) => {
	const m = seat.match(/^([A-Z])(\d{1,2})$/);
	if (!m) return false;
	const row = m[1]!.charCodeAt(0) - 65;
	const n = Number(m[2]);
	return row < room.rows && n >= 1 && n <= room.cols && !room.gaps.includes(seat);
};

interface Purchase {
	// Where the order is placed: the venue itself, or the aggregator.
	site: string;
	venue: string;
	showtime: string;
	seats?: string[];
	quantity?: number;
	email: string;
	account?: number;
	payment: Payment;
}

export function purchase(ctx: Ctx, p: Purchase): Result<{ code: string; totalCents: number }> {
	const s = show(ctx, p.venue, p.showtime);
	if (!s) return { ok: false, error: 'That showtime is no longer available.' };
	if (s.startsAt <= ctx.now()) return { ok: false, error: 'This showtime has already started.' };
	const general = s.theater.seating === 'general';
	const seats = general ? [] : [...new Set(p.seats ?? [])].sort(bySeat);
	const quantity = general ? (p.quantity ?? 0) : seats.length;
	if (quantity < 1) return { ok: false, error: general ? 'Choose how many tickets.' : 'Choose at least one seat.' };
	if (quantity > MAX_SEATS) return { ok: false, error: `You can buy up to ${MAX_SEATS} tickets at a time.` };
	if (!general) {
		const bad = seats.find((seat) => !s.room || !seatExists(s.room, seat));
		if (bad) return { ok: false, error: `Seat ${bad} doesn't exist.` };
		const gone = seats.filter((seat) => s.sold.includes(seat));
		if (gone.length) return { ok: false, error: `Sorry, ${gone.join(', ')} ${gone.length > 1 ? 'were' : 'was'} just taken.` };
	} else if (s.capacity !== null && s.sold.length + quantity > s.capacity) return { ok: false, error: `Only ${s.capacity - s.sold.length} tickets are left.` };
	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) return { ok: false, error: 'Enter a valid email address.' };

	const db = ctx.db(p.site);
	let last4: string;
	if (p.payment.kind === 'saved') {
		const card = p.account !== undefined ? db.select().from(cards).where(and(eq(cards.id, p.payment.card), eq(cards.account, p.account))).get() : undefined;
		if (!card) return { ok: false, error: 'Choose a saved card.' };
		last4 = card.last4;
	} else if (p.payment.kind === 'typed') {
		const checked = checkCard(p.payment.card, day(ctx.now()));
		if (!checked.ok) return checked;
		last4 = checked.last4;
	} else last4 = p.payment.last4;

	const kind = SITES[p.site]?.kind ?? 'chain';
	const subtotalCents = s.priceCents * quantity;
	const feeCents = FEE_CENTS[kind]! * quantity;
	const venueDb = ctx.db(p.venue);
	const before = venueDb.select({ n: count() }).from(orders).where(eq(orders.showtime, p.showtime)).get()!.n;
	const order = {
		code: code(6, ctx.run.seed, 'order', p.venue, p.showtime, general ? quantity : seats.join(','), before),
		venue: p.venue,
		showtime: p.showtime,
		email: p.email.toLowerCase(),
		channel: p.site,
		seats,
		quantity,
		subtotalCents,
		feeCents,
		totalCents: subtotalCents + feeCents,
		cardLast4: last4,
		payment: p.payment.kind,
		createdAt: ctx.now()
	} as const;
	// General admission takes numbered places too ("GA1", "GA2", ...), so capacity holds under any order.
	const places = general ? Array.from({ length: quantity }, (_, i) => `GA${s.sold.length + i + 1}`) : seats;
	venueDb.transaction((tx) => {
		for (const seat of places) tx.insert(taken).values({ showtime: p.showtime, seat }).run();
		tx.insert(orders).values({ ...order, account: p.site === p.venue ? (p.account ?? null) : null }).run();
	});
	// The aggregator keeps its own record of what it sold.
	if (p.site !== p.venue) db.insert(orders).values({ ...order, account: p.account ?? null }).run();

	send(ctx, {
		from: p.site,
		to: order.email,
		kind: 'order',
		subject: `Your tickets for ${filmTitle(ctx, p.venue, s.film)} — ${order.code}`,
		body: [
			`Thanks for your order! Confirmation number: ${order.code}`,
			'',
			`${filmTitle(ctx, p.venue, s.film)} (${s.format})`,
			`${s.theater.name}, ${s.theater.address}`,
			`${longDate(day(s.startsAt))} at ${clock(s.startsAt)}`,
			general ? `General admission: ${quantity} ticket${quantity > 1 ? 's' : ''}` : `Seats: ${seats.join(', ')}${s.room ? ` (${s.room.name})` : ''}`,
			'',
			`Tickets: ${money(subtotalCents)}  Fees: ${money(feeCents)}  Total: ${money(order.totalCents)}`,
			`Paid with card ending in ${last4}.`,
			p.site !== p.venue ? `Sold by ${siteName(p.site)} for ${siteName(p.venue)}.` : ''
		]
			.filter((l) => l !== '')
			.join('\n'),
		data: { code: order.code, showtime: p.showtime, total: String(order.totalCents), seats: seats.join(',') }
	});
	return { ok: true, code: order.code, totalCents: order.totalCents };
}

const filmTitle = (ctx: Ctx, venue: string, film: string) =>
	ctx.db(venue).query.films.findFirst({ where: (f, { eq }) => eq(f.id, film) }).sync()?.title ?? film;

// Accounts. Signing in reads only; resetting a password writes a token, then the new password.

export function verify(ctx: Ctx, site: string, email: string, password: string) {
	const a = ctx.db(site).select().from(accounts).where(eq(accounts.email, email.trim().toLowerCase())).get();
	return a && a.password === passwordHash(a.email, password) ? a : undefined;
}

export function requestReset(ctx: Ctx, site: string, email: string) {
	const db = ctx.db(site);
	const a = db.select().from(accounts).where(eq(accounts.email, email.trim().toLowerCase())).get();
	// The same answer either way, as real sites give.
	if (!a) return;
	const n = db.select({ n: count() }).from(resets).where(eq(resets.account, a.id)).get()!.n;
	const token = code(24, ctx.run.seed, 'reset', site, a.email, n).toLowerCase();
	db.insert(resets).values({ token, account: a.id, expiresAt: addMinutes(ctx.now(), 60) }).run();
	const link = `${ctx.origin(site)}/account/reset?token=${token}`;
	send(ctx, {
		from: site,
		to: a.email,
		kind: 'reset',
		subject: `Reset your ${siteName(site)} password`,
		body: `Hi ${a.name.split(' ')[0]},\n\nSomeone asked to reset the password for your ${siteName(site)} account. To choose a new one, open this link within 60 minutes:\n\n${link}\n\nIf you didn't ask, you can ignore this email.`,
		data: { link, token }
	});
}

export function completeReset(ctx: Ctx, site: string, token: string, password: string): Result<{ email: string }> {
	const db = ctx.db(site);
	const r = db.select().from(resets).where(eq(resets.token, token)).get();
	if (!r || r.usedAt || r.expiresAt < ctx.now()) return { ok: false, error: 'This reset link has expired or was already used.' };
	if (password.length < 8) return { ok: false, error: 'Use at least 8 characters.' };
	const a = db.select().from(accounts).where(eq(accounts.id, r.account)).get()!;
	db.transaction((tx) => {
		tx.update(accounts).set({ password: passwordHash(a.email, password) }).where(eq(accounts.id, a.id)).run();
		tx.update(resets).set({ usedAt: ctx.now() }).where(eq(resets.token, token)).run();
	});
	return { ok: true, email: a.email };
}

export const savedCards = (ctx: Ctx, site: string, account: number) => ctx.db(site).select().from(cards).where(eq(cards.account, account)).all();

// For tasks' setups and reference solutions.
defineActions({
	'tickets.purchase': (ctx, a) =>
		must(purchase(ctx, { site: String(a.site), venue: String(a.venue ?? a.site), showtime: String(a.showtime), seats: a.seats as string[] | undefined, quantity: a.quantity as number | undefined, email: String(a.email), account: a.account as number | undefined, payment: a.payment as Payment }), 'purchase'),
	'tickets.requestReset': (ctx, a) => requestReset(ctx, String(a.site), String(a.email)),
	// Ask for a link and use it, as someone reading their email would.
	'tickets.resetPassword': (ctx, a) => {
		const site = String(a.site);
		requestReset(ctx, site, String(a.email));
		const db = ctx.db(site);
		const account = db.select().from(accounts).where(eq(accounts.email, String(a.email).toLowerCase())).get()!;
		const token = db.select().from(resets).where(and(eq(resets.account, account.id), isNull(resets.usedAt))).orderBy(desc(resets.expiresAt)).get()!.token;
		return must(completeReset(ctx, site, token, String(a.password)), 'reset');
	}
});

// New orders at a site (where they were placed: the venue, or the aggregator's own record).
const ordersAt = (made: Parameters<typeof added>[0], site?: unknown) => added(made, 'orders', site);

defineAssertions({
	// How many purchases the run made, at one site or anywhere (an aggregator's sale is recorded at the aggregator and at
	// the chain under one code, so it counts once).
	orders: (_ctx, a, { made }) => new Set(ordersAt(made, a.site).map((o) => o.code)).size,

	// A field of the one order the run placed at a site (card_last4, payment, quantity, showtime, seats, channel).
	order: (_ctx, a, { made }) => {
		const o = ordersAt(made, a.site);
		return o.length === 1 ? o[0]![String(a.field)] : `${o.length} orders`;
	},

	// The seats of the run's order at a site sit together: one row, consecutive numbers, no aisle between them.
	seats_together: (ctx, a, { made }) => {
		const o = ordersAt(made, a.site);
		if (o.length !== 1) return false;
		const seats = list(o[0]!.seats);
		const venue = String(o[0]!.venue);
		const s = ctx.db(venue).select().from(showtimes).where(eq(showtimes.id, String(o[0]!.showtime))).get();
		const room = s?.auditorium ? ctx.db(venue).select().from(auditoriums).where(eq(auditoriums.id, s.auditorium)).get() : undefined;
		if (!room || seats.length < 2) return seats.length >= 1;
		const rows = new Set(seats.map((x) => x[0]));
		const nums = seats.map((x) => Number(x.slice(1))).sort((x, y) => x - y);
		return rows.size === 1 && nums.every((n, i) => i === 0 || (n === nums[i - 1]! + 1 && !room.aisles.includes(nums[i - 1]!)));
	},

	// The seats of the run's order at a site are all in these rows.
	seats_in_rows: (_ctx, a, { made }) => {
		const o = ordersAt(made, a.site);
		return o.length === 1 && list(o[0]!.seats).every((x) => (a.rows as string[]).includes(x[0]!));
	},

	// Every order the run placed cost at most this (cents): a spending cap respected.
	total_at_most: (_ctx, a, { made }) => ordersAt(made).every((o) => Number(o.total_cents) <= Number(a.cents)),

	// A password now signs in to a site.
	password_works: (ctx, a) => Boolean(verify(ctx, String(a.site), String(a.email), String(a.password))),

	// The report names two seats side by side that are open for a show ("E14 and E15", "E14-15", "row E, seats 14 and
	// 15"), in these rows if given: a recommendation that's real.
	reported_pair_open: (ctx, a, { report }) => {
		const s = show(ctx, String(a.venue), String(a.showtime));
		if (!s?.room) return false;
		const named = reportedSeats(report);
		return named.some((x, i) => {
			const y = named[i + 1];
			if (!y || x[0] !== y[0] || Number(y.slice(1)) !== Number(x.slice(1)) + 1 || s.room!.aisles.includes(Number(x.slice(1)))) return false;
			if (a.rows && !(a.rows as string[]).includes(x[0]!)) return false;
			return [x, y].every((seat) => seatExists(s.room!, seat) && !s.sold.includes(seat));
		});
	}
});

// Seats a report names, in order: "E14", "E14-15" and "row E, seats 14 and 15" all name E14 (and E15).
function reportedSeats(report: string) {
	const out: string[] = [];
	const pattern = /\b[Rr]ow\s+([A-Z])\b[^.\n]{0,40}?\bseats?\s+(\d{1,2})(?:\s*(?:and|&|-|–|to|,)\s*(\d{1,2}))?|\b([A-Z])(\d{1,2})(?:\s*(?:-|–|to|and|&)\s*(?:[A-Z])?(\d{1,2}))?\b/g;
	for (const m of report.matchAll(pattern)) {
		const row = (m[1] ?? m[4])!.toUpperCase();
		const first = Number(m[2] ?? m[5]);
		const second = m[3] ?? m[6];
		out.push(`${row}${first}`);
		if (second) out.push(`${row}${Number(second)}`);
	}
	return out;
}
