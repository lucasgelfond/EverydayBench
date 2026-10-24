import { error, redirect } from '@sveltejs/kit';
import { session } from '#lib/server/actions/pay.ts';

// Back from the hosted checkout: the order was made when the payment went through.
export const load = ({ locals, url }) => {
	const s = session(locals.ctx, url.searchParams.get('session') ?? '');
	const code = (s?.ref as { order?: string } | undefined)?.order;
	if (!s || s.merchant !== locals.site!.id) error(404, 'Checkout not found');
	if (!code) redirect(303, `${locals.ctx.origin('tallypay')}/c/${s.id}`, { external: true });
	redirect(303, `/orders/${code}`);
};
