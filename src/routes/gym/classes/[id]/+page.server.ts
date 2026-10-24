import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { bookings, classes, locations } from '#lib/server/schema.ts';
import { bookClass, cancelClass, spotsLeft } from '#lib/server/actions/gym.ts';

export const load = ({ locals, params, url }) => {
	const db = locals.ctx.db('sweatlantis');
	const c = db.select().from(classes).where(eq(classes.id, params.id)).get();
	if (!c) error(404, 'Class not found');
	const booked = locals.account !== undefined && !!db.select().from(bookings).where(and(eq(bookings.class, c.id), eq(bookings.account, locals.account))).get();
	return { c, location: db.select().from(locations).where(eq(locations.id, c.location)).get()!, left: spotsLeft(locals.ctx, c), booked, started: c.startsAt <= locals.ctx.now(), signedIn: locals.account !== undefined, just: url.searchParams.has('booked') };
};

export const actions = {
	book: async ({ locals, params, url }) => {
		if (locals.account === undefined) redirect(303, `/account/sign-in?next=${encodeURIComponent(url.pathname)}`);
		const r = bookClass(locals.ctx, params.id, locals.account);
		if (!r.ok) return fail(400, { error: r.error });
		redirect(303, `${url.pathname}?booked=1`);
	},
	cancel: async ({ locals, params, url }) => {
		if (locals.account !== undefined) cancelClass(locals.ctx, params.id, locals.account);
		redirect(303, url.pathname);
	}
};
