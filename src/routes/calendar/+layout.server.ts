import { error } from '@sveltejs/kit';
import { OWNER } from '#lib/server/ctx.ts';
import { day } from '#lib/time.ts';

export const load = ({ locals }) => {
	if (locals.site?.family !== 'calendar') error(404);
	return { owner: OWNER, today: day(locals.ctx.now()) };
};
