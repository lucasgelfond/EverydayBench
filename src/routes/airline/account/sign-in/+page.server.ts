import { fail, redirect } from '@sveltejs/kit';
import { verify } from '#lib/server/actions/tickets.ts';
import { writeSession } from '#lib/server/session.ts';

const safe = (next: string | null) => (next?.startsWith('/') && !next.startsWith('//') ? next : '/account');

export const actions = {
	default: async ({ locals, request, cookies, url }) => {
		const f = await request.formData();
		const email = String(f.get('email') ?? '');
		const a = verify(locals.ctx, locals.site!.id, email, String(f.get('password') ?? ''));
		if (!a) return fail(400, { email, error: 'That email and password don’t match.' });
		writeSession(cookies, locals.run.id, locals.site!.id, a.id);
		redirect(303, safe(url.searchParams.get('next')));
	}
};
