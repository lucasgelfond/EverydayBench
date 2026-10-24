import { error } from '@sveltejs/kit';
import { days, scheduleAt, theaterOf } from '#lib/server/catalog.ts';

export const load = ({ locals, params, url }) => {
	const theater = theaterOf(locals.ctx, locals.site!, params.id);
	if (!theater) error(404, 'Theater not found');
	const all = days(locals.ctx);
	const date = all.includes(url.searchParams.get('date') ?? '') ? url.searchParams.get('date')! : all[0]!;
	return { theater, days: all, date, schedule: scheduleAt(locals.ctx, theater, date) };
};
