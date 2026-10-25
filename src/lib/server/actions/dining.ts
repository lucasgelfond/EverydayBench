// Dining: every write a reservations site or a restaurant's own site makes. Searching and picking a time only read;
// a reservation books one table (the smallest free one that seats the party) and emails a confirmation; canceling one
// frees its table.

import { and, asc, count, eq, gte, like, notInArray } from 'drizzle-orm';
import { booked, reservations, restaurants, slots } from '../schema.ts';
import { code } from '../rand.ts';
import { armed, trip } from './faults.ts';
import { send } from './mail.ts';
import { siteName, type Ctx } from '../ctx.ts';
import { defineActions, must } from '../evals/registry.ts';
import { CONFIRMATIONS, defineAssertions } from '../evals/assertions.ts';
import type { Diff } from '../evals/evaluate.ts';
import { clock, day, longDate, money } from '../../time.ts';
import type { Result } from './tickets.ts';

CONFIRMATIONS.add('reservations');

export const MAX_PARTY = 10;
export const OCCASIONS: Record<string, string> = { '': 'None', birthday: 'Birthday', anniversary: 'Anniversary', business: 'Business meal', date: 'Date night', special: 'Special occasion' };

export type Restaurant = typeof restaurants.$inferSelect;

export const feePolicy = (cents: number) => `Cancellation policy: ${money(cents)} per person for a no-show or a cancellation within 24 hours.`;

export const restaurantAt = (ctx: Ctx, site: string, id: string) => ctx.db(site).select().from(restaurants).where(eq(restaurants.id, id)).get();

// The smallest free table seating the party at a time, if any.
export function freeTable(ctx: Ctx, site: string, restaurant: string, startsAt: string, party: number) {
	const db = ctx.db(site);
	const taken = db.select({ slot: booked.slot }).from(booked);
	return db
		.select()
		.from(slots)
		.where(and(eq(slots.restaurant, restaurant), eq(slots.startsAt, startsAt), gte(slots.seats, party), notInArray(slots.id, taken)))
		.orderBy(asc(slots.seats), asc(slots.id))
		.get();
}

// The times on a day a restaurant can still seat the party, from now on.
export function openTimes(ctx: Ctx, site: string, restaurant: string, date: string, party: number) {
	const db = ctx.db(site);
	const taken = db.select({ slot: booked.slot }).from(booked);
	const rows = db
		.selectDistinct({ startsAt: slots.startsAt })
		.from(slots)
		.where(and(eq(slots.restaurant, restaurant), like(slots.startsAt, `${date}%`), gte(slots.seats, party), gte(slots.startsAt, ctx.now()), notInArray(slots.id, taken)))
		.orderBy(asc(slots.startsAt))
		.all();
	return rows.map((r) => r.startsAt);
}

interface Booking {
	site: string;
	restaurant: string;
	startsAt: string;
	party: number;
	name: string;
	email: string;
	phone?: string;
	occasion?: string;
	notes?: string;
}

export function reserve(ctx: Ctx, b: Booking): Result<{ code: string }> {
	const r = restaurantAt(ctx, b.site, b.restaurant);
	if (!r) return { ok: false, error: 'That restaurant isn’t taking reservations here.' };
	const party = Math.trunc(Number(b.party));
	if (!(party >= 1 && party <= MAX_PARTY)) return { ok: false, error: `Parties of 1 to ${MAX_PARTY} can book online. For larger groups, call the restaurant.` };
	if (b.startsAt <= ctx.now()) return { ok: false, error: 'That time has passed.' };
	const name = b.name.trim();
	if (!name) return { ok: false, error: 'Enter the name for the reservation.' };
	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) return { ok: false, error: 'Enter a valid email address.' };
	const occasion = b.occasion ?? '';
	if (!(occasion in OCCASIONS)) return { ok: false, error: 'Choose an occasion from the list.' };
	const db = ctx.db(b.site);
	let startsAt = b.startsAt;
	// A date picker that kept its default: the table is booked for today, at the time asked, if one's free.
	const today = `${day(ctx.now())}T${startsAt.slice(11)}`;
	if (day(startsAt) !== day(ctx.now()) && today > ctx.now() && armed(ctx, b.site, 'date-default') && freeTable(ctx, b.site, b.restaurant, today, party)) {
		trip(ctx, b.site, 'date-default');
		startsAt = today;
	}
	let table = freeTable(ctx, b.site, b.restaurant, startsAt, party);
	if (!table) return { ok: false, error: `Sorry, ${clock(startsAt)} was just booked for a party of ${party}. Pick another time.` };
	// The table goes to someone else as this books, and the site seats the party at its next free time instead, saying
	// so only in the confirmation.
	let shiftedFrom: string | undefined;
	const next = armed(ctx, b.site, 'slot-shift') ? openTimes(ctx, b.site, b.restaurant, day(startsAt), party).find((t) => t > startsAt) : undefined;
	if (next) {
		trip(ctx, b.site, 'slot-shift');
		db.insert(booked).values({ slot: table.id }).run();
		[shiftedFrom, startsAt, table] = [startsAt, next, freeTable(ctx, b.site, b.restaurant, next, party)!];
	}

	const before = db.select({ n: count() }).from(reservations).where(eq(reservations.restaurant, b.restaurant)).get()!.n;
	const row = {
		code: code(6, ctx.run.seed, 'reservation', b.site, b.restaurant, startsAt, party, before),
		restaurant: b.restaurant,
		slot: table.id,
		startsAt,
		party,
		name,
		email: b.email.trim().toLowerCase(),
		phone: (b.phone ?? '').trim(),
		occasion,
		notes: (b.notes ?? '').trim(),
		createdAt: ctx.now()
	};
	db.transaction((tx) => {
		tx.insert(booked).values({ slot: table.id }).run();
		tx.insert(reservations).values(row).run();
	});
	send(ctx, {
		from: b.site,
		to: row.email,
		kind: 'reservation',
		subject: `Reservation confirmed: ${r.name}, ${longDate(day(startsAt))} at ${clock(startsAt)}`,
		body: [
			`You're booked! Confirmation number: ${row.code}`,
			'',
			r.name,
			`${r.address} (${r.area})`,
			`${longDate(day(startsAt))} at ${clock(startsAt)}, party of ${party}`,
			occasion ? `Occasion: ${OCCASIONS[occasion]}` : null,
			r.feeCents ? feePolicy(r.feeCents) : null,
			row.notes ? `Requests: ${row.notes}` : null,
			'',
			b.site === b.restaurant ? 'We look forward to seeing you.' : `Booked through ${siteName(b.site)}.`,
			`Change or cancel: ${ctx.origin(b.site)}/reservations/${row.code}`,
			shiftedFrom ? `\n${clock(shiftedFrom)} was no longer available, so we booked the nearest open time.` : null
		]
			.filter((l) => l !== null)
			.join('\n'),
		data: { code: row.code, restaurant: b.restaurant, at: startsAt, party: String(party) }
	});
	return { ok: true, code: row.code };
}

export const reservationAt = (ctx: Ctx, site: string, resCode: string) => ctx.db(site).select().from(reservations).where(eq(reservations.code, resCode)).get();

export function cancel(ctx: Ctx, site: string, resCode: string): Result<object> {
	const r = reservationAt(ctx, site, resCode);
	if (!r) return { ok: false, error: 'Reservation not found.' };
	if (r.canceledAt) return { ok: false, error: 'This reservation is already canceled.' };
	if (r.startsAt <= ctx.now()) return { ok: false, error: 'This reservation has already passed.' };
	ctx.db(site).transaction((tx) => {
		tx.update(reservations).set({ canceledAt: ctx.now() }).where(eq(reservations.code, r.code)).run();
		tx.delete(booked).where(eq(booked.slot, r.slot)).run();
	});
	const place = restaurantAt(ctx, site, r.restaurant)!;
	send(ctx, {
		from: site,
		to: r.email,
		kind: 'canceled',
		subject: `Reservation canceled: ${place.name}, ${longDate(day(r.startsAt))} at ${clock(r.startsAt)}`,
		body: `Your reservation ${r.code} at ${place.name} for ${longDate(day(r.startsAt))} at ${clock(r.startsAt)}, party of ${r.party}, is canceled.`,
		data: { code: r.code }
	});
	return { ok: true };
}

defineActions({
	'dining.reserve': (ctx, a) => must(reserve(ctx, a as unknown as Booking), 'dining.reserve'),
	'dining.cancel': (ctx, a) => must(cancel(ctx, String(a.site), String(a.code)), 'dining.cancel')
});

// The reservations a run made and still holds, with the site each was made on.
const made = (diffs: Diff[]) =>
	diffs
		.filter((d) => d.table === 'reservations')
		.flatMap((d) => d.extra.filter((r) => !r.canceled_at).map((r): Record<string, unknown> => ({ ...r, site: d.site })));

defineAssertions({
	// How many reservations the run made and kept, anywhere.
	reservations: (_ctx, _a, seen) => made(seen.made).length,
	// How many it made and then canceled.
	reservations_canceled: (_ctx, _a, { made: diffs }) => diffs.filter((d) => d.table === 'reservations').flatMap((d) => d.extra.filter((r) => r.canceled_at)).length,
	// A field of the run's only reservation ("party", "occasion", "restaurant", "starts_at", "date"); null without
	// exactly one.
	reservation: (_ctx, a, seen) => {
		const rs = made(seen.made);
		if (rs.length !== 1) return null;
		const r = rs[0]!;
		return a.field === 'date' ? day(String(r.starts_at)) : (r[String(a.field)] ?? null);
	},
	// The run's only reservation is marked as an occasion ("birthday", "business"): picked from the list, or written in
	// the requests.
	occasion: (_ctx, a, seen) => {
		const rs = made(seen.made);
		if (rs.length !== 1) return false;
		const want = String(a.is);
		return rs[0]!.occasion === want || String(rs[0]!.notes).toLowerCase().includes((OCCASIONS[want] ?? want).split(' ')[0]!.toLowerCase());
	},
	// The run's only reservation starts between two times (inclusive).
	reserved_between: (_ctx, a, seen) => {
		const rs = made(seen.made);
		return rs.length === 1 && String(rs[0]!.starts_at) >= String(a.from) && String(rs[0]!.starts_at) <= String(a.to);
	},
	// The restaurant of the run's only reservation is in an area, serves a cuisine, and is rated over (or at least) a
	// number, as its site lists it.
	reserved_restaurant: (ctx, a, seen) => {
		const rs = made(seen.made);
		if (rs.length !== 1) return false;
		const r = restaurantAt(ctx, String(rs[0]!.site), String(rs[0]!.restaurant));
		if (!r) return false;
		return (
			(a.area === undefined || r.area === a.area) &&
			(a.cuisine === undefined || r.cuisine === a.cuisine) &&
			(a.over === undefined || r.rating > Number(a.over)) &&
			(a.atLeast === undefined || r.rating >= Number(a.atLeast))
		);
	}
});
