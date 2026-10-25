import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { trips } from '#lib/server/schema.ts';
import { cancelForCredit, findTrip, requestRefund, tripCancelTerms } from '#lib/server/actions/airline.ts';
import type { Ctx } from '#lib/server/ctx.ts';

// The page "Purchase" lands on, and where a trip is managed (by code: whoever has it can see the trip, as on most
// airlines' confirmation pages). Canceling for credit asks first (?cancel), since it can't be undone.
const tripOf = (ctx: Ctx, site: string, code: string) => {
	const t = ctx.db(site).select({ last: trips.last }).from(trips).where(eq(trips.code, code)).get();
	return t && findTrip(ctx, site, code, t.last);
};

export const load = ({ locals, params, url }) => {
	const trip = tripOf(locals.ctx, locals.site!.id, params.code);
	if (!trip) error(404, 'Trip not found');
	return { trip, terms: tripCancelTerms(locals.ctx, trip), started: trip.legs[0]!.flight.departsAt <= locals.ctx.now(), confirming: url.searchParams.has('cancel') };
};

export const actions = {
	refund: ({ locals, params }) => {
		const site = locals.site!.id;
		const t = tripOf(locals.ctx, site, params.code);
		if (!t) error(404, 'Trip not found');
		const r = requestRefund(locals.ctx, site, t.code, t.last);
		if (!r.ok) return fail(400, { error: r.error });
		redirect(303, `/trips/${t.code}`);
	},
	cancel: ({ locals, params }) => {
		const site = locals.site!.id;
		const t = tripOf(locals.ctx, site, params.code);
		if (!t) error(404, 'Trip not found');
		const r = cancelForCredit(locals.ctx, site, t.code, t.last);
		if (!r.ok) return fail(400, { error: r.error });
		redirect(303, `/trips/${t.code}`);
	}
};
