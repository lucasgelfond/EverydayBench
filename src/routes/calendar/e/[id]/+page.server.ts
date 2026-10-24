import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { events } from '#lib/server/schema.ts';
import { deleteEvent } from '#lib/server/actions/calendar.ts';

export const load = ({ locals, params, url }) => {
	const e = locals.ctx.db('daybrella').select().from(events).where(eq(events.id, Number(params.id))).get();
	if (!e) error(404, 'Event not found');
	return { e, saved: url.searchParams.has('saved') };
};

export const actions = {
	delete: async ({ locals, params }) => {
		deleteEvent(locals.ctx, Number(params.id));
		redirect(303, '/');
	}
};
