import { error } from '@sveltejs/kit';
import { orderAt } from '#lib/server/catalog.ts';
import { show } from '#lib/server/actions/tickets.ts';
import { films } from '#lib/server/schema.ts';
import { eq } from 'drizzle-orm';

export const load = ({ locals, params }) => {
	const order = orderAt(locals.ctx, locals.site!.id, params.code);
	if (!order) error(404, 'Order not found');
	const s = show(locals.ctx, order.venue, order.showtime)!;
	const film = locals.ctx.db(order.venue).select().from(films).where(eq(films.id, s.film)).get()!;
	return { order, startsAt: s.startsAt, format: s.format, theater: s.theater, room: s.room?.name, film: film.title };
};
