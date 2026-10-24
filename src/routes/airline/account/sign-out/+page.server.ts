import { redirect } from '@sveltejs/kit';
import { clearSession } from '#lib/server/session.ts';

export const actions = {
	default: ({ locals, cookies }) => {
		clearSession(cookies, locals.site!.id);
		redirect(303, '/');
	}
};
