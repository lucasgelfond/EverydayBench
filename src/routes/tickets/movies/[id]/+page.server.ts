import { error } from '@sveltejs/kit';
import { areas, days, filmById, scheduleFor } from '#lib/server/catalog.ts';

export const load = ({ locals, params, url }) => {
	const site = locals.site!;
	const film = filmById(locals.ctx, site, params.id);
	if (!film) error(404, 'Movie not found');
	const all = days(locals.ctx);
	const date = all.includes(url.searchParams.get('date') ?? '') ? url.searchParams.get('date')! : all[0]!;
	const area = url.searchParams.get('area') ?? '';
	return { film, days: all, date, area, areas: areas(locals.ctx, site), theaters: scheduleFor(locals.ctx, site, film.id, date, area || undefined) };
};
