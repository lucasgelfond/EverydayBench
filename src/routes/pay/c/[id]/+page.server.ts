import { error, fail, redirect } from '@sveltejs/kit';
import { merchantName, payExpress, payTyped, sendCode, session } from '#lib/server/actions/pay.ts';

export const load = ({ locals, params, url }) => {
	const s = session(locals.ctx, params.id);
	if (!s) error(404, 'This checkout link is invalid.');
	if (s.status === 'paid') redirect(303, s.returnUrl, { external: true });
	return { id: s.id, merchant: merchantName(s.merchant), description: s.description, amountCents: s.amountCents, email: (s.ref as { email: string }).email, method: url.searchParams.get('method') === 'express' ? 'express' : 'card', sent: url.searchParams.get('sent') ?? undefined };
};

export const actions = {
	card: async ({ locals, params, request }) => {
		const f = Object.fromEntries(await request.formData()) as Record<string, string>;
		const r = payTyped(locals.ctx, params.id, { number: f.number ?? '', exp: f.exp ?? '', cvc: f.cvc ?? '', name: f.name ?? '', zip: f.zip ?? '' });
		if (!r.ok) return fail(400, { error: r.error, tab: 'card', values: { name: f.name ?? '', exp: f.exp ?? '', zip: f.zip ?? '' } });
		redirect(303, r.returnUrl, { external: true });
	},
	code: async ({ locals, request }) => {
		const email = String((await request.formData()).get('email') ?? '');
		sendCode(locals.ctx, email);
		// Whether or not the email has a saved card, the page looks the same (no account probing); the URL remembers
		// the code was sent, so coming back from the inbox lands on the code box.
		redirect(303, `?method=express&sent=${encodeURIComponent(email)}`);
	},
	express: async ({ locals, params, request }) => {
		const f = await request.formData();
		const email = String(f.get('email') ?? '');
		const r = payExpress(locals.ctx, params.id, email, String(f.get('code') ?? ''));
		if (!r.ok) return fail(400, { tab: 'express', email, error: r.error });
		redirect(303, r.returnUrl, { external: true });
	}
};
