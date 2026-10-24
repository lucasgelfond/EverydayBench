import { fail, redirect } from '@sveltejs/kit';
import { mustSignIn } from '#lib/server/account-pages.ts';
import { savedCards } from '#lib/server/actions/tickets.ts';
import { balance, creditsOf, TOP_UPS, topUp } from '#lib/server/actions/cloud.ts';

export const load = (event) => {
	const account = mustSignIn(event);
	const ctx = event.locals.ctx;
	return {
		balanceCents: balance(ctx, account),
		credits: creditsOf(ctx, account),
		cards: savedCards(ctx, 'cloudpail', account).map(({ id, brand, last4 }) => ({ id, brand, last4 })),
		amounts: TOP_UPS,
		added: event.url.searchParams.get('added') ?? undefined
	};
};

export const actions = {
	default: async (event) => {
		const f = await event.request.formData();
		const r = topUp(event.locals.ctx, mustSignIn(event), Number(f.get('amount')), Number(f.get('card')));
		if (!r.ok) return fail(400, { error: r.error });
		redirect(303, `/billing?added=${r.code}`);
	}
};
