// The last step of a booking, shared by a reservations site's /book and a restaurant's /reserve/details: what's being
// booked (from the URL), and the form that books it.

import { error, fail, redirect } from '@sveltejs/kit';
import { freeTable, OCCASIONS, reserve, restaurantAt } from './actions/dining.ts';
import { PARTIES } from './dining.ts';
import type { Ctx } from './ctx.ts';

export function pending(ctx: Ctx, site: string, url: URL, restaurant: string) {
	const r = restaurantAt(ctx, site, restaurant);
	const at = url.searchParams.get('at') ?? '';
	const party = Number(url.searchParams.get('party'));
	if (!r || !PARTIES.includes(party) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/.test(at)) error(404, 'Pick a time first');
	return { restaurant: { id: r.id, name: r.name, address: r.address, area: r.area }, at, party, open: at > ctx.now() && !!freeTable(ctx, site, r.id, at, party), occasions: OCCASIONS };
}

export async function book(ctx: Ctx, site: string, url: URL, restaurant: string, request: Request) {
	const f = Object.fromEntries(await request.formData()) as Record<string, string>;
	const { at, party } = pending(ctx, site, url, restaurant);
	const r = reserve(ctx, { site, restaurant, startsAt: at, party, name: f.name ?? '', email: f.email ?? '', phone: f.phone, occasion: f.occasion, notes: f.notes });
	if (!r.ok) return fail(400, { error: r.error, values: f });
	redirect(303, `/reservations/${r.code}`);
}
