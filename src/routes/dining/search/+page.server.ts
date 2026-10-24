import { error } from '@sveltejs/kit';
import { listed, options, query, search } from '#lib/server/dining.ts';

export const load = ({ locals, url }) => {
	const site = locals.site!;
	if (site.kind !== 'reservations') error(404);
	const q = query(locals.ctx, url);
	const all = listed(locals.ctx, site.id);
	return {
		options: options(locals.ctx),
		values: q,
		areas: [...new Set(all.map((r) => r.area))].sort(),
		cuisines: [...new Set(all.map((r) => r.cuisine))].sort(),
		results: search(locals.ctx, site.id, q)
	};
};
