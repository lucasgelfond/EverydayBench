import { restaurantAt } from '#lib/server/actions/dining.ts';
import { card, listed, options, query } from '#lib/server/dining.ts';

export const load = ({ locals, url }) => {
	const site = locals.site!;
	// A restaurant's own site: its home is the restaurant.
	if (site.kind === 'restaurant') return { restaurant: card(restaurantAt(locals.ctx, site.id, site.id)!) };
	const all = listed(locals.ctx, site.id);
	return {
		options: options(locals.ctx),
		values: query(locals.ctx, url),
		areas: [...new Set(all.map((r) => r.area))].sort(),
		cuisines: [...new Set(all.map((r) => r.cuisine))].sort(),
		// The best rated, as a reservations site's front page shows them.
		popular: all
			.toSorted((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))
			.slice(0, 6)
			.map(card)
	};
};
