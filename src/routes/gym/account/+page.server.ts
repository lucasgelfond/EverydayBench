import { redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { bookings, classes } from '#lib/server/schema.ts';

export const load = ({ locals }) => {
	if (locals.account === undefined) redirect(303, '/account/sign-in?next=/account');
	const db = locals.ctx.db('sweatlantis');
	return { booked: db.select({ c: classes }).from(bookings).innerJoin(classes, eq(classes.id, bookings.class)).where(eq(bookings.account, locals.account)).orderBy(asc(classes.startsAt)).all().map((r) => r.c) };
};
