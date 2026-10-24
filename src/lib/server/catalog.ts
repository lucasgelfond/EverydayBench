// What ticket sites show: theaters, films and showtimes. A chain or the arthouse shows its own; the aggregator shows the
// theaters it lists, read from the chains that sell them (their seats, their availability).

import { and, asc, eq, gte, inArray, like } from 'drizzle-orm';
import { films, listings, showtimes, taken, theaters, orders } from './schema.ts';
import { show } from './actions/tickets.ts';
import { SITES, type Site } from '../sites.ts';
import { addDays, day } from '../time.ts';
import type { Ctx } from './ctx.ts';

export type Theater = typeof theaters.$inferSelect;
export type Film = typeof films.$inferSelect;
export type Showtime = typeof showtimes.$inferSelect;

// The site whose database has a theater's (or a showtime's) rows: ids start with it ("lumiscope-harborview-...").
export const venueOf = (id: string) => id.split('-')[0]!;

export function theatersOf(ctx: Ctx, site: Site): Theater[] {
	if (site.kind !== 'aggregator') return ctx.db(site.id).select().from(theaters).orderBy(asc(theaters.name)).all();
	const ids = ctx.db(site.id).select().from(listings).all().map((l) => l.theater);
	const byVenue = Map.groupBy(ids, venueOf);
	return [...byVenue].flatMap(([venue, list]) => ctx.db(venue).select().from(theaters).where(inArray(theaters.id, list)).all()).sort((a, b) => a.name.localeCompare(b.name));
}

// A theater the site sells, if it does.
export const theaterOf = (ctx: Ctx, site: Site, id: string) => theatersOf(ctx, site).find((t) => t.id === id);

// The days a site sells: today and the six after.
export const days = (ctx: Ctx) => Array.from({ length: 7 }, (_, i) => addDays(day(ctx.now()), i));

export function filmById(ctx: Ctx, site: Site, id: string): Film | undefined {
	for (const venue of venuesOf(ctx, site)) {
		const f = ctx.db(venue).select().from(films).where(eq(films.id, id)).get();
		if (f) return f;
	}
}

const venuesOf = (ctx: Ctx, site: Site) => [...new Set(theatersOf(ctx, site).map((t) => t.site))];

// Films playing at the site's theaters from now on, each once.
export function filmsOf(ctx: Ctx, site: Site): Film[] {
	const seen = new Map<string, Film>();
	const from = ctx.now();
	for (const t of theatersOf(ctx, site)) {
		const db = ctx.db(t.site);
		const ids = db.selectDistinct({ film: showtimes.film }).from(showtimes).where(and(eq(showtimes.theater, t.id), gte(showtimes.startsAt, from))).all();
		for (const { film } of ids) if (!seen.has(film)) seen.set(film, db.select().from(films).where(eq(films.id, film)).get()!);
	}
	return [...seen.values()].sort((a, b) => a.title.localeCompare(b.title));
}

// A theater's shows on a day, by film, from now on.
export function scheduleAt(ctx: Ctx, theater: Theater, date: string) {
	const db = ctx.db(theater.site);
	const rows = db
		.select({ s: showtimes, f: films })
		.from(showtimes)
		.innerJoin(films, eq(films.id, showtimes.film))
		.where(and(eq(showtimes.theater, theater.id), like(showtimes.startsAt, `${date}%`), gte(showtimes.startsAt, ctx.now())))
		.orderBy(asc(films.title), asc(showtimes.startsAt))
		.all();
	return [...Map.groupBy(rows, (r) => r.f.id).values()].map((group) => ({ film: group[0]!.f, shows: group.map((r) => withLeft(ctx, r.s, theater)) }));
}

// A film's shows on a day at the site's theaters, by theater (optionally only theaters in an area).
export function scheduleFor(ctx: Ctx, site: Site, film: string, date: string, area?: string) {
	return theatersOf(ctx, site)
		.filter((t) => !area || t.area === area)
		.map((t) => ({
			theater: t,
			shows: ctx
				.db(t.site)
				.select()
				.from(showtimes)
				.where(and(eq(showtimes.theater, t.id), eq(showtimes.film, film), like(showtimes.startsAt, `${date}%`), gte(showtimes.startsAt, ctx.now())))
				.orderBy(asc(showtimes.startsAt))
				.all()
				.map((s) => withLeft(ctx, s, t))
		}))
		.filter((t) => t.shows.length);
}

// How full a show is, for "almost sold out" labels.
function withLeft(ctx: Ctx, s: Showtime, theater: Theater) {
	const sold = ctx.db(theater.site).select({ seat: taken.seat }).from(taken).where(eq(taken.showtime, s.id)).all().length;
	const total = s.capacity ?? showSize(ctx, s);
	return { ...s, left: Math.max(0, total - sold) };
}

const sizes = new Map<string, number>();
function showSize(ctx: Ctx, s: Showtime) {
	const key = `${ctx.run.id}:${s.auditorium}`;
	if (!sizes.has(key)) {
		const full = show(ctx, venueOf(s.id), s.id);
		sizes.set(key, full?.room ? full.room.rows * full.room.cols - full.room.gaps.length : 0);
	}
	return sizes.get(key)!;
}

// A showtime the site sells, with its theater, room and sold seats.
export function showOf(ctx: Ctx, site: Site, id: string) {
	const venue = venueOf(id);
	if (!theatersOf(ctx, site).some((t) => t.site === venue)) return undefined;
	const s = show(ctx, venue, id);
	if (!s || !theaterOf(ctx, site, s.theater.id)) return undefined;
	const film = ctx.db(venue).select().from(films).where(eq(films.id, s.film)).get()!;
	return { ...s, venue, film };
}

export const orderAt = (ctx: Ctx, site: string, code: string) => ctx.db(site).select().from(orders).where(eq(orders.code, code)).get();

export const areas = (ctx: Ctx, site: Site) => [...new Set(theatersOf(ctx, site).map((t) => t.area))].sort();

export const siteById = (id: string) => SITES[id];
