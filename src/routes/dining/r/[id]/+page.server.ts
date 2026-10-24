import { error } from '@sveltejs/kit';
import { openTimes, restaurantAt } from '#lib/server/actions/dining.ts';
import { card, options, query } from '#lib/server/dining.ts';

export const load = ({ locals, params, url }) => {
	const site = locals.site!;
	const r = site.kind === 'reservations' ? restaurantAt(locals.ctx, site.id, params.id) : undefined;
	if (!r) error(404, 'Restaurant not found');
	const q = query(locals.ctx, url);
	return { restaurant: card(r), options: options(locals.ctx), values: q, times: openTimes(locals.ctx, site.id, r.id, q.date, q.party) };
};
