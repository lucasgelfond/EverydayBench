import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { trips } from '#lib/server/schema.ts';
import { findTrip } from '#lib/server/actions/airline.ts';

// The page "Purchase" lands on (by code: whoever has it can see the trip, as on most airlines' confirmation pages).
export const load = ({ locals, params }) => {
	const site = locals.site!.id;
	const t = locals.ctx.db(site).select({ last: trips.last }).from(trips).where(eq(trips.code, params.code)).get();
	const trip = t && findTrip(locals.ctx, site, params.code, t.last);
	if (!trip) error(404, 'Trip not found');
	return { trip };
};
