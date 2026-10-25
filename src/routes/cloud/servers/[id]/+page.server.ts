import { error, fail, redirect } from '@sveltejs/kit';
import { mustSignIn } from '#lib/server/account-pages.ts';
import { deleteServer, serversOf } from '#lib/server/actions/cloud.ts';

export const load = (event) => {
	const server = serversOf(event.locals.ctx, event.locals.site!.id, mustSignIn(event)).find((s) => s.id === event.params.id);
	if (!server) error(404, 'Server not found');
	return { server };
};

export const actions = {
	delete: async (event) => {
		const typed = String((await event.request.formData()).get('confirm') ?? '');
		const r = deleteServer(event.locals.ctx, event.locals.site!.id, mustSignIn(event), event.params.id, typed);
		if (!r.ok) return fail(400, { error: r.error });
		redirect(303, `/?deleted=${encodeURIComponent(r.name)}`);
	}
};
