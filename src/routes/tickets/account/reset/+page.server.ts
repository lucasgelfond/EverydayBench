import { fail } from '@sveltejs/kit';
import { completeReset } from '#lib/server/actions/tickets.ts';

export const load = ({ url }) => ({ token: url.searchParams.get('token') ?? '' });

export const actions = {
	default: async ({ locals, request }) => {
		const f = await request.formData();
		const password = String(f.get('password') ?? '');
		if (password !== String(f.get('confirm') ?? '')) return fail(400, { error: 'The passwords don’t match.' });
		const r = completeReset(locals.ctx, locals.site!.id, String(f.get('token') ?? ''), password);
		return r.ok ? { done: r.email } : fail(400, { error: r.error });
	}
};
