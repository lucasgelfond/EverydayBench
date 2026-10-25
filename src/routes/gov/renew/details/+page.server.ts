import { fail, redirect } from '@sveltejs/kit';
import { FIELDS, isSpeed, problems, SPEEDS, unknownPassport, type Renewal } from '#lib/server/actions/gov.ts';
import { draftOf, saveDraft } from '#lib/server/renewal.ts';
import { day } from '#lib/time.ts';

export const load = ({ cookies, locals }) => {
	const draft = draftOf(cookies, locals.run.id);
	if (!draft.eligible) redirect(303, '/renew');
	return { draft, speeds: SPEEDS };
};

export const actions = {
	default: async ({ request, cookies, locals }) => {
		const f = await request.formData();
		const values = Object.fromEntries(FIELDS.map((k) => [k, String(f.get(k) ?? '').trim()])) as Renewal;
		const speed = f.get('speed');
		const errors = problems(values, day(locals.ctx.now()));
		if (!errors.passportNumber && !errors.dateOfBirth) {
			const unknown = unknownPassport(locals.ctx, values);
			if (unknown) errors.passportNumber = unknown;
		}
		if (Object.keys(errors).length || !isSpeed(speed)) return fail(400, { errors, values: { ...values, speed: String(speed ?? '') }, speedError: isSpeed(speed) ? undefined : 'Choose how fast you need it.' });
		saveDraft(cookies, locals.run.id, { ...draftOf(cookies, locals.run.id), ...values, speed });
		redirect(303, '/renew/review');
	}
};
