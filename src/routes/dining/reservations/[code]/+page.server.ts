import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { reservations } from '#lib/server/schema.ts';
import { OCCASIONS, restaurantAt } from '#lib/server/actions/dining.ts';

export const load = ({ locals, params }) => {
	const site = locals.site!.id;
	const r = locals.ctx.db(site).select().from(reservations).where(eq(reservations.code, params.code)).get();
	if (!r) error(404, 'Reservation not found');
	const place = restaurantAt(locals.ctx, site, r.restaurant)!;
	return { reservation: { code: r.code, at: r.startsAt, party: r.party, name: r.name, email: r.email, occasion: OCCASIONS[r.occasion] ?? '', notes: r.notes }, restaurant: { name: place.name, address: place.address, area: place.area } };
};
