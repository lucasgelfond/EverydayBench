import { redirect } from '@sveltejs/kit';
import { accountName, findTrip, savedCards, tripsOf } from '#lib/server/actions/airline.ts';

export const load = ({ locals }) => {
	if (locals.account === undefined) redirect(303, '/account/sign-in?next=/account');
	const site = locals.site!.id;
	return {
		me: accountName(locals.ctx, site, locals.account)!,
		trips: tripsOf(locals.ctx, site, locals.account).map((t) => findTrip(locals.ctx, site, t.code, t.last)!),
		cards: savedCards(locals.ctx, site, locals.account).map(({ id, brand, last4, expMonth, expYear }) => ({ id, brand, last4, expMonth, expYear }))
	};
};
