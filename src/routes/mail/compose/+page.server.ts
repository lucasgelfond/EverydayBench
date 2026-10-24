import { fail, redirect } from '@sveltejs/kit';
import { compose } from '#lib/server/actions/mail.ts';

export const load = ({ url }) => ({ to: url.searchParams.get('to') ?? '', subject: url.searchParams.get('subject') ?? '' });

export const actions = {
	default: async ({ locals, request }) => {
		const f = await request.formData();
		const m = { to: String(f.get('to') ?? ''), subject: String(f.get('subject') ?? ''), body: String(f.get('body') ?? '') };
		const r = compose(locals.ctx, m);
		if (!r.ok) return fail(400, { ...m, error: r.error });
		redirect(303, '/sent?sent=1');
	}
};
