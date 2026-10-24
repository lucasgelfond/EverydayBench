import { fail, redirect } from '@sveltejs/kit';
import { FIELDS, problems, type Renewal } from '#lib/server/actions/gov.ts';
import { draftOf, saveDraft } from '#lib/server/renewal.ts';
import { day } from '#lib/time.ts';

export const load = ({ cookies, locals }) => {
	const draft = draftOf(cookies, locals.run.id);
	if (!draft.eligible) redirect(303, '/renew');
	return { draft };
};

export const actions = {
	default: async ({ request, cookies, locals }) => {
		const f = await request.formData();
		const values = Object.fromEntries(FIELDS.map((k) => [k, String(f.get(k) ?? '').trim()])) as Renewal;
		const errors = problems(values, day(locals.ctx.now()));
		if (Object.keys(errors).length) return fail(400, { errors, values });
		saveDraft(cookies, locals.run.id, { ...draftOf(cookies, locals.run.id), ...values });
		redirect(303, '/renew/review');
	}
};
