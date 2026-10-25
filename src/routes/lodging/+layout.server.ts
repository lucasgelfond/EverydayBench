import { error } from '@sveltejs/kit';
import { OWNER } from '#lib/server/ctx.ts';
import { saved } from '#lib/server/actions/lodging.ts';
import { day } from '#lib/time.ts';

export const load = ({ locals }) => {
	if (locals.site?.family !== 'lodging') error(404);
	return { site: { name: locals.site.name }, owner: OWNER, saved: saved(locals.ctx, locals.site.id).size, today: day(locals.ctx.now()) };
};
