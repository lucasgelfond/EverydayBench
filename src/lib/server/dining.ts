// What dining pages read: restaurants a site lists, the times they can seat a party, and the search form's choices.
// Everything a person picks (date, time, party, filters) lives in the URL, so nothing is written until a reservation.

import { asc } from 'drizzle-orm';
import { restaurants } from './schema.ts';
import { feePolicy, MAX_PARTY, openTimes, type Restaurant } from './actions/dining.ts';
import { addDays, clock, day, shortDate, toMs } from '../time.ts';
import type { Ctx } from './ctx.ts';

// The ten days sites take bookings for, today first.
export const dates = (ctx: Ctx) => Array.from({ length: 10 }, (_, i) => addDays(day(ctx.now()), i));
export const dateLabel = (date: string, i: number) => `${i === 0 ? 'Today, ' : i === 1 ? 'Tomorrow, ' : ''}${shortDate(date)}`;

// Every half hour a restaurant might seat someone.
export const TIMES = ['11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];
export const PARTIES = Array.from({ length: MAX_PARTY }, (_, i) => i + 1);

export const options = (ctx: Ctx) => ({
	dates: dates(ctx).map((d, i) => ({ value: d, label: dateLabel(d, i) })),
	times: TIMES.map((t) => ({ value: t, label: clock(`2000-01-01T${t}`) })),
	parties: PARTIES.map((p) => ({ value: p, label: `${p} ${p === 1 ? 'person' : 'people'}` }))
});

// A search from the URL, with defaults: today, 7 PM, two people.
export function query(ctx: Ctx, url: URL) {
	const valid = dates(ctx);
	const date = url.searchParams.get('date') ?? '';
	const time = url.searchParams.get('time') ?? '';
	const party = Number(url.searchParams.get('party'));
	return {
		date: valid.includes(date) ? date : valid[0]!,
		time: TIMES.includes(time) ? time : '19:00',
		party: PARTIES.includes(party) ? party : 2,
		area: url.searchParams.get('area') ?? '',
		cuisine: url.searchParams.get('cuisine') ?? ''
	};
}
export type Query = ReturnType<typeof query>;

export const listed = (ctx: Ctx, site: string) => ctx.db(site).select().from(restaurants).orderBy(asc(restaurants.name)).all();

// Restaurants matching the filters, each with up to five open times within 90 minutes of the one asked for.
export function search(ctx: Ctx, site: string, q: Query) {
	const wanted = toMs(`${q.date}T${q.time}:00`);
	return listed(ctx, site)
		.filter((r) => (!q.area || r.area === q.area) && (!q.cuisine || r.cuisine === q.cuisine))
		.map((r) => ({
			restaurant: card(r),
			times: openTimes(ctx, site, r.id, q.date, q.party)
				.filter((t) => Math.abs(toMs(t) - wanted) <= 90 * 60_000)
				.sort((a, b) => Math.abs(toMs(a) - wanted) - Math.abs(toMs(b) - wanted))
				.slice(0, 5)
				.sort()
		}));
}

export const card = ({ id, name, cuisine, area, address, rating, reviews, price, blurb, feeCents }: Restaurant) => ({ id, name, cuisine, area, address, rating, reviews, price, blurb, fee: feeCents ? feePolicy(feeCents) : null });
