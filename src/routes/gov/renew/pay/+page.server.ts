import { fail, redirect } from '@sveltejs/kit';
import { feeOf, problems, submitRenewal, type Renewal } from '#lib/server/actions/gov.ts';
import { draftOf, dropDraft } from '#lib/server/renewal.ts';
import { day } from '#lib/time.ts';

export const load = ({ cookies, locals }) => {
	const draft = draftOf(cookies, locals.run.id);
	if (!draft.eligible || Object.keys(problems(draft, day(locals.ctx.now()))).length) redirect(303, '/renew');
	return { feeCents: feeOf(draft.speed ?? 'routine'), name: draft.fullName };
};

export const actions = {
	default: async ({ request, cookies, locals }) => {
		const f = Object.fromEntries(await request.formData()) as Record<string, string>;
		const card = { number: f.number ?? '', exp: f.exp ?? '', cvc: f.cvc ?? '', name: f.name ?? '', zip: f.zip ?? '' };
		const draft = draftOf(cookies, locals.run.id);
		const r = submitRenewal(locals.ctx, draft as Renewal, card, draft.speed ?? 'routine');
		if (!r.ok) return fail(400, { error: r.error, values: { name: card.name, exp: card.exp, zip: card.zip } });
		dropDraft(cookies);
		redirect(303, `/renew/receipt/${r.code}`);
	}
};
