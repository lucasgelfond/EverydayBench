// Home rentals (Roostable, Nookery): every write the site makes (the wishlist, a booked stay) and the searching it's built
// on. The owner is always signed in (account 1), as on a site they've used before.

import { and, eq, gte, inArray, lt } from 'drizzle-orm';
import { cards, homes, nights, stays, wishlist } from '../schema.ts';
import { code } from '../rand.ts';
import { send } from './mail.ts';
import type { Ctx } from '../ctx.ts';
import { defineActions, must } from '../evals/registry.ts';
import { added, CONFIRMATIONS, defineAssertions } from '../evals/assertions.ts';
import { addDays, day, longDate, money } from '../../time.ts';
import { charges, sum, type Line } from '../../pricing.ts';
import { SITES } from '../../sites.ts';

CONFIRMATIONS.add('stays');

export const OWNER_ACCOUNT = 1;
// A site without its own pricing (Roostable) shows every fee up front: a home's cleaning fee and this share as service.
export const SERVICE_FEE = 0.12;
const DEFAULT_SITE = 'roostable';

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

// A stay's cost on a site: the nights, then each fee line (and tax, where the site charges it).
export function price(site: string, home: Home, n: number) {
	const subtotal = home.nightlyCents * n;
	const cleaning: Line = { label: 'Cleaning fee', cents: home.cleaningCents };
	const pricing = SITES[site]?.pricing;
	const lines = pricing ? charges(pricing, subtotal, 1, [cleaning]) : [cleaning, { label: 'Service fee', cents: Math.round(subtotal * SERVICE_FEE) }];
	return { subtotal, lines, total: subtotal + sum(lines) };
}

// Whether a site shows fees only on its last step (drip pricing), so search and listing pages show the bare price.
export const drips = (site: string) => !!SITES[site]?.pricing?.drip;

// Which of these homes have any of the stay's nights taken.
function takenAmong(ctx: Ctx, site: string, ids: string[], checkIn: string, checkOut: string) {
	if (!ids.length) return new Set<string>();
	const rows = ctx.db(site).select({ home: nights.home }).from(nights).where(and(inArray(nights.home, ids), gte(nights.date, checkIn), lt(nights.date, checkOut))).all();
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
export function search(ctx: Ctx, site: string, q: Query) {
	const all = ctx.db(site).select().from(homes).all().filter((h) => matches(h, q));
	const dated = q.checkIn && q.checkOut && DATE.test(q.checkIn) && DATE.test(q.checkOut) && q.checkIn < q.checkOut;
	if (!dated) return all;
	const taken = takenAmong(ctx, site, all.map((h) => h.id), q.checkIn!, q.checkOut!);
	return all.filter((h) => !taken.has(h.id));
}

export const home = (ctx: Ctx, site: string, id: string) => ctx.db(site).select().from(homes).where(eq(homes.id, id)).get();
export const isFree = (ctx: Ctx, site: string, id: string, checkIn: string, checkOut: string) => !takenAmong(ctx, site, [id], checkIn, checkOut).size;
export const saved = (ctx: Ctx, site: string) => new Set(ctx.db(site).select().from(wishlist).all().map((w) => w.home));
export const savedCards = (ctx: Ctx, site: string) => ctx.db(site).select().from(cards).where(eq(cards.account, OWNER_ACCOUNT)).all();

export function save(ctx: Ctx, site: string, id: string) {
	if (!home(ctx, site, id)) return { ok: false as const, error: 'No such home.' };
	ctx.db(site).insert(wishlist).values({ home: id }).onConflictDoNothing().run();
	return { ok: true as const };
}

export const unsave = (ctx: Ctx, site: string, id: string) => ctx.db(site).delete(wishlist).where(eq(wishlist.home, id)).run();

interface Booking {
	site: string;
	home: string;
	checkIn: string;
	checkOut: string;
	guests: number;
	card: number;
}

export function book(ctx: Ctx, b: Booking): { ok: true; code: string; totalCents: number } | { ok: false; error: string } {
	const h = home(ctx, b.site, b.home);
	if (!h) return { ok: false, error: 'That home isn’t available.' };
	if (!DATE.test(b.checkIn) || !DATE.test(b.checkOut) || b.checkOut <= b.checkIn) return { ok: false, error: 'Choose check-in and check-out dates.' };
	if (b.checkIn < day(ctx.now())) return { ok: false, error: 'Check-in can’t be in the past.' };
	if (!(b.guests >= 1)) return { ok: false, error: 'Add at least one guest.' };
	if (b.guests > h.guests) return { ok: false, error: `This home sleeps up to ${h.guests}.` };
	if (!isFree(ctx, b.site, h.id, b.checkIn, b.checkOut)) return { ok: false, error: 'Those dates are no longer available.' };
	const card = ctx.db(b.site).select().from(cards).where(and(eq(cards.id, b.card), eq(cards.account, OWNER_ACCOUNT))).get();
	if (!card) return { ok: false, error: 'Choose a payment method.' };
	const [ty, tm] = day(ctx.now()).split('-').map(Number) as [number, number];
	if (card.expYear < ty || (card.expYear === ty && card.expMonth < tm)) return { ok: false, error: `Your ${card.brand} ending in ${card.last4} has expired. Choose another card.` };
	const list = nightsOf(b.checkIn, b.checkOut);
	const cost = price(b.site, h, list.length);
	const stay = { code: `HM${code(8, ctx.run.seed, 'stay', h.id, b.checkIn, b.checkOut)}`, home: h.id, account: OWNER_ACCOUNT, checkIn: b.checkIn, checkOut: b.checkOut, guests: b.guests, totalCents: cost.total, cardLast4: card.last4, createdAt: ctx.now() };
	ctx.db(b.site).transaction((tx) => {
		for (const date of list) tx.insert(nights).values({ home: h.id, date }).run();
		tx.insert(stays).values(stay).run();
	});
	send(ctx, {
		from: b.site,
		kind: 'order',
		subject: `Your stay at ${h.title} is confirmed — ${stay.code}`,
		body: [
			`You're going to ${h.city}! Confirmation code: ${stay.code}`,
			'',
			`${h.title} (${h.area}, ${h.city}), hosted by ${h.host}`,
			`Check-in ${longDate(b.checkIn)} · Check-out ${longDate(b.checkOut)} · ${b.guests} guest${b.guests > 1 ? 's' : ''}`,
			[`${list.length} nights × ${money(h.nightlyCents)}: ${money(cost.subtotal)}`, ...cost.lines.map((l) => `${l.label}: ${money(l.cents)}`), `Total: ${money(cost.total)}`].join('  '),
			`Paid with ${card.brand} ending in ${card.last4}.`
		].join('\n'),
		data: { code: stay.code, home: h.id, total: String(cost.total) }
	});
	return { ok: true, code: stay.code, totalCents: cost.total };
}

defineActions({
	'lodging.save': (ctx, a) => must(save(ctx, String(a.site ?? DEFAULT_SITE), String(a.home)), 'save'),
	'lodging.unsave': (ctx, a) => unsave(ctx, String(a.site ?? DEFAULT_SITE), String(a.home)),
	'lodging.book': (ctx, a) =>
		must(
			book(ctx, { site: String(a.site ?? DEFAULT_SITE), home: String(a.home), checkIn: String(a.checkIn), checkOut: String(a.checkOut), guests: Number(a.guests), card: Number(a.card ?? 1) }),
			'book'
		)
});

defineAssertions({
	// Homes the run added to the wishlist that fit a search (city, guests, bedrooms, beds, amenities, free on the dates).
	wishlisted: (ctx, a, { made }) =>
		added(made, 'wishlist', DEFAULT_SITE).filter((w) => {
			const h = home(ctx, DEFAULT_SITE, String(w.home));
			const q: Query = { city: a.city as string, guests: a.guests as number, bedrooms: a.bedrooms as number, beds: a.beds as number, amenities: a.amenities as string[] };
			return !!h && matches(h, q) && (!a.check_in || isFree(ctx, DEFAULT_SITE, h.id, String(a.check_in), String(a.check_out)));
		}).length,
	// Stays booked, on a site or any.
	stays: (_ctx, a, { made }) => added(made, 'stays', a.site).length,
	// The homes of the stays the run booked, and their dates ("kestrel-bay-8 2026-03-20..2026-03-22"), sorted.
	stays_booked: (_ctx, _a, { made }) => added(made, 'stays').map((t) => `${t.home} ${t.check_in}..${t.check_out}`).sort(),
	// The stays booked, as "site:home", and what they came to.
	stays_at: (_ctx, _a, { made }) => made.filter((d) => d.table === 'stays').flatMap((d) => d.extra.map((r) => `${d.site}:${r.home}`)),
	stays_total: (_ctx, _a, { made }) => added(made, 'stays').reduce((n, r) => n + Number(r.total_cents), 0)
});
