import { redirect } from '@sveltejs/kit';
import { filmsOf, theatersOf } from '#lib/server/catalog.ts';

export const load = ({ locals }) => {
	const site = locals.site!;
	// The arthouse is one theater: its home is its program.
	if (site.kind === 'arthouse') redirect(307, `/theaters/${theatersOf(locals.ctx, site)[0]!.id}`);
	return {
		theaters: theatersOf(locals.ctx, site).map(({ id, name, area }) => ({ id, name, area })),
		films: filmsOf(locals.ctx, site)
	};
};
