import { redirect } from '@sveltejs/kit';
import { problems, RENEWAL_FEE_CENTS } from '#lib/server/actions/gov.ts';
import { draftOf } from '#lib/server/renewal.ts';
import { day } from '#lib/time.ts';

export const load = ({ cookies, locals }) => {
	const draft = draftOf(cookies, locals.run.id);
	if (!draft.eligible) redirect(303, '/renew');
	if (Object.keys(problems(draft, day(locals.ctx.now()))).length) redirect(303, '/renew/details');
	return { draft, feeCents: RENEWAL_FEE_CENTS };
};
