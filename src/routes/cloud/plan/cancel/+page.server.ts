import { fail, redirect } from '@sveltejs/kit';
import { mustSignIn } from '#lib/server/account-pages.ts';
import { cancel, keep, subscription } from '#lib/server/actions/cloud.ts';

// Three steps: an offer, another offer, then the cancellation itself. Only accepting an offer or the last step writes.
export const load = (event) => {
	const plan = subscription(event.locals.ctx, event.locals.site!.id, mustSignIn(event))!;
	if (plan.status !== 'active') redirect(303, '/plan');
	const step = Math.min(3, Math.max(1, Number(event.url.searchParams.get('step')) || 1));
	return { plan, step };
};

const done = (r: { ok: boolean; error?: string }, what: string) => (r.ok ? redirect(303, `/plan?done=${what}`) : fail(400, { error: r.error }));

export const actions = {
	discount: (event) => done(keep(event.locals.ctx, event.locals.site!.id, mustSignIn(event), 'discount'), 'discount'),
	pause: (event) => done(keep(event.locals.ctx, event.locals.site!.id, mustSignIn(event), 'pause'), 'pause'),
	cancel: (event) => done(cancel(event.locals.ctx, event.locals.site!.id, mustSignIn(event)), 'canceled')
};
