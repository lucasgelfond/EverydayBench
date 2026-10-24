import { fail, redirect } from '@sveltejs/kit';
import { draftOf, saveDraft } from '#lib/server/renewal.ts';

const CHECKS = ['undamaged', 'recent', 'adult'];

export const actions = {
	default: async ({ request, cookies, locals }) => {
		const f = await request.formData();
		if (!CHECKS.every((c) => f.get(c))) return fail(400, { error: 'You can renew online only if all three are true. Otherwise, apply in person.' });
		saveDraft(cookies, locals.run.id, { ...draftOf(cookies, locals.run.id), eligible: 'yes' });
		redirect(303, '/renew/details');
	}
};
