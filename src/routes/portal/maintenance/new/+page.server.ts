import { fail, redirect } from '@sveltejs/kit';
import { mustSignIn } from '#lib/server/account-pages.ts';
import { CATEGORIES, LOCATIONS, fileRequest } from '#lib/server/actions/portal.ts';

export const load = (event) => (mustSignIn(event), { categories: CATEGORIES, locations: LOCATIONS });

export const actions = {
	default: async (event) => {
		const f = Object.fromEntries(await event.request.formData()) as Record<string, string>;
		const values = { category: f.category ?? '', location: f.location ?? '', description: f.description ?? '', enter: f.enter === 'yes', pets: f.pets === 'yes' };
		if (!f.enter || !f.pets) return fail(400, { error: 'Answer both questions about entering your apartment.', values });
		const r = fileRequest(event.locals.ctx, mustSignIn(event), values);
		if (!r.ok) return fail(400, { error: r.error, values });
		redirect(303, `/maintenance?filed=${r.code}`);
	}
};
