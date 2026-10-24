import { error } from '@sveltejs/kit';
import { legsFrom } from '#lib/server/airline-pages.ts';
import { priceOf } from '#lib/server/actions/airline.ts';

export const load = ({ locals, url }) => {
	const legs = legsFrom(locals.ctx, locals.site!.id, url.searchParams);
	if (!legs) error(404, 'Choose your flights first');
	return {
		legs: legs.map((l) => ({ ...l, cents: priceOf(l.flight, l.fare) })),
		query: url.searchParams.toString()
	};
};
