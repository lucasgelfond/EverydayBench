import { requestReset } from '#lib/server/actions/tickets.ts';

export const actions = {
	default: async ({ locals, request }) => {
		const email = String((await request.formData()).get('email') ?? '');
		requestReset(locals.ctx, locals.site!.id, email);
		// The same answer whether or not the account exists.
		return { sent: email };
	}
};
