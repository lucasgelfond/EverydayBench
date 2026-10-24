import { error } from '@sveltejs/kit';
import { openTimes } from '#lib/server/actions/dining.ts';
import { dates, options, PARTIES } from '#lib/server/dining.ts';

// A restaurant's own booking: party and date first, then a time from what's open, then the details.
export const load = ({ locals, url }) => {
	const site = locals.site!;
	if (site.kind !== 'restaurant') error(404);
	const date = url.searchParams.get('date') ?? '';
	const party = Number(url.searchParams.get('party'));
	const chosen = dates(locals.ctx).includes(date) && PARTIES.includes(party);
	return { options: options(locals.ctx), date, party, times: chosen ? openTimes(locals.ctx, site.id, site.id, date, party) : undefined };
};
