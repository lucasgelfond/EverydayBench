// Roostable: every write the home-rental site makes (the wishlist, a booked stay) and the searching it's built on. The
// owner is always signed in (account 1), as on a site they've used before.

import { and, eq, gte, inArray, lt } from 'drizzle-orm';
import { cards, homes, nights, stays, wishlist } from '../schema.ts';
import { code } from '../rand.ts';
import { send } from './mail.ts';
import type { Ctx } from '../ctx.ts';
import { defineActions, must } from '../evals/registry.ts';
import { added, CONFIRMATIONS, defineAssertions } from '../evals/assertions.ts';
import { addDays, day, longDate, money } from '../../time.ts';

CONFIRMATIONS.add('stays');

export const OWNER_ACCOUNT = 1;
export const SERVICE_FEE = 0.12;
const SITE = 'roostable';

export type Home = typeof homes.$inferSelect;
export interface Query {
	city?: string;
	checkIn?: string;
	checkOut?: string;
	guests?: number;
	bedrooms?: number;
	beds?: number;
	amenities?: string[];
	maxNightlyCents?: number;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// The nights of a stay: check-in up to, not including, check-out.
export function nightsOf(checkIn: string, checkOut: string) {
	const out: string[] = [];
	for (let d = checkIn; d < checkOut && out.length < 60; d = addDays(d, 1)) out.push(d);
	return out;
}

export function price(home: Home, n: number) {
	const subtotal = home.nightlyCents * n;
	const service = Math.round(subtotal * SERVICE_FEE);
	return { subtotal, cleaning: home.cleaningCents, service, total: subtotal + home.cleaningCents + service };
}

// Which of these homes have any of the stay's nights taken.
function takenAmong(ctx: Ctx, ids: string[], checkIn: string, checkOut: string) {
	if (!ids.length) return new Set<string>();
	const rows = ctx.db(SITE).select({ home: nights.home }).from(nights).where(and(inArray(nights.home, ids), gte(nights.date, checkIn), lt(nights.date, checkOut))).all();
	return new Set(rows.map((r) => r.home));
}

export function matches(home: Home, q: Query) {
	return (
		(!q.city || home.city.toLowerCase() === q.city.trim().toLowerCase()) &&
		(!q.guests || home.guests >= q.guests) &&
		(!q.bedrooms || home.bedrooms >= q.bedrooms) &&
		(!q.beds || home.beds >= q.beds) &&
		(q.amenities ?? []).every((a) => home.amenities.includes(a)) &&
		(!q.maxNightlyCents || home.nightlyCents <= q.maxNightlyCents)
	);
}

// Homes that fit a search, free for its dates (when it has them).
export function search(ctx: Ctx, q: Query) {
	const all = ctx.db(SITE).select().from(homes).all().filter((h) => matches(h, q));
	const dated = q.checkIn && q.checkOut && DATE.test(q.checkIn) && DATE.test(q.checkOut) && q.checkIn < q.checkOut;
	if (!dated) return all;
	const taken = takenAmong(ctx, all.map((h) => h.id), q.checkIn!, q.checkOut!);
	return all.filter((h) => !taken.has(h.id));
}

export const home = (ctx: Ctx, id: string) => ctx.db(SITE).select().from(homes).where(eq(homes.id, id)).get();
export const isFree = (ctx: Ctx, id: string, checkIn: string, checkOut: string) => !takenAmong(ctx, [id], checkIn, checkOut).size;
export const saved = (ctx: Ctx) => new Set(ctx.db(SITE).select().from(wishlist).all().map((w) => w.home));
export const savedCards = (ctx: Ctx) => ctx.db(SITE).select().from(cards).where(eq(cards.account, OWNER_ACCOUNT)).all();

export function save(ctx: Ctx, id: string) {
	if (!home(ctx, id)) return { ok: false as const, error: 'No such home.' };
	ctx.db(SITE).insert(wishlist).values({ home: id }).onConflictDoNothing().run();
	return { ok: true as const };
}

export const unsave = (ctx: Ctx, id: string) => ctx.db(SITE).delete(wishlist).where(eq(wishlist.home, id)).run();

interface Booking {
	home: string;
	checkIn: string;
	checkOut: string;
	guests: number;
	card: number;
}

export function book(ctx: Ctx, b: Booking): { ok: true; code: string; totalCents: number } | { ok: false; error: string } {
	const h = home(ctx, b.home);
	if (!h) return { ok: false, error: 'That home isn’t available.' };
	if (!DATE.test(b.checkIn) || !DATE.test(b.checkOut) || b.checkOut <= b.checkIn) return { ok: false, error: 'Choose check-in and check-out dates.' };
	if (b.checkIn < day(ctx.now())) return { ok: false, error: 'Check-in can’t be in the past.' };
	if (!(b.guests >= 1)) return { ok: false, error: 'Add at least one guest.' };
	if (b.guests > h.guests) return { ok: false, error: `This home sleeps up to ${h.guests}.` };
	if (!isFree(ctx, h.id, b.checkIn, b.checkOut)) return { ok: false, error: 'Those dates are no longer available.' };
	const card = ctx.db(SITE).select().from(cards).where(and(eq(cards.id, b.card), eq(cards.account, OWNER_ACCOUNT))).get();
	if (!card) return { ok: false, error: 'Choose a payment method.' };
	const [ty, tm] = day(ctx.now()).split('-').map(Number) as [number, number];
	if (card.expYear < ty || (card.expYear === ty && card.expMonth < tm)) return { ok: false, error: `Your ${card.brand} ending in ${card.last4} has expired. Choose another card.` };
	const list = nightsOf(b.checkIn, b.checkOut);
	const cost = price(h, list.length);
	const stay = { code: `HM${code(8, ctx.run.seed, 'stay', h.id, b.checkIn, b.checkOut)}`, home: h.id, account: OWNER_ACCOUNT, checkIn: b.checkIn, checkOut: b.checkOut, guests: b.guests, totalCents: cost.total, cardLast4: card.last4, createdAt: ctx.now() };
	ctx.db(SITE).transaction((tx) => {
		for (const date of list) tx.insert(nights).values({ home: h.id, date }).run();
		tx.insert(stays).values(stay).run();
	});
	send(ctx, {
		from: SITE,
		kind: 'order',
		subject: `Your stay at ${h.title} is confirmed — ${stay.code}`,
		body: [
			`You're going to ${h.city}! Confirmation code: ${stay.code}`,
			'',
			`${h.title} (${h.area}, ${h.city}), hosted by ${h.host}`,
			`Check-in ${longDate(b.checkIn)} · Check-out ${longDate(b.checkOut)} · ${b.guests} guest${b.guests > 1 ? 's' : ''}`,
			`${list.length} nights × ${money(h.nightlyCents)}: ${money(cost.subtotal)}  Cleaning: ${money(cost.cleaning)}  Service: ${money(cost.service)}  Total: ${money(cost.total)}`,
			`Paid with ${card.brand} ending in ${card.last4}.`
		].join('\n'),
		data: { code: stay.code, home: h.id, total: String(cost.total) }
	});
	return { ok: true, code: stay.code, totalCents: cost.total };
}

defineActions({
	'lodging.save': (ctx, a) => must(save(ctx, String(a.home)), 'save'),
	'lodging.unsave': (ctx, a) => unsave(ctx, String(a.home)),
	'lodging.book': (ctx, a) =>
		must(book(ctx, { home: String(a.home), checkIn: String(a.checkIn), checkOut: String(a.checkOut), guests: Number(a.guests), card: Number(a.card ?? 1) }), 'book')
});

defineAssertions({
	// Homes the run added to the wishlist that fit a search (city, guests, bedrooms, beds, amenities, free on the dates).
	wishlisted: (ctx, a, { made }) =>
		added(made, 'wishlist', SITE).filter((w) => {
			const h = home(ctx, String(w.home));
			const q: Query = { city: a.city as string, guests: a.guests as number, bedrooms: a.bedrooms as number, beds: a.beds as number, amenities: a.amenities as string[] };
			return !!h && matches(h, q) && (!a.check_in || isFree(ctx, h.id, String(a.check_in), String(a.check_out)));
		}).length,
	stays: (_ctx, _a, { made }) => added(made, 'stays', SITE).length
});
