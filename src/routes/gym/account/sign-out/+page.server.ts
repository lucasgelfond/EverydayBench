import { redirect } from '@sveltejs/kit';
import { clearSession } from '#lib/server/session.ts';

export const actions = {
	default: async ({ cookies }) => {
		clearSession(cookies, 'sweatlantis');
		redirect(303, '/');
	}
};
