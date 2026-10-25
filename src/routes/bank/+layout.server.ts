import { error } from '@sveltejs/kit';
import { OWNER } from '#lib/server/ctx.ts';

export const load = ({ locals }) => {
	if (locals.site?.family !== 'bank') error(404);
	return { owner: OWNER };
};
