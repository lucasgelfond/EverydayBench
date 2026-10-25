import { error, fail } from '@sveltejs/kit';
import { cancel, OCCASIONS, reservationAt, restaurantAt } from '#lib/server/actions/dining.ts';

export const load = ({ locals, params }) => {
	const site = locals.site!.id;
	const r = reservationAt(locals.ctx, site, params.code);
	if (!r) error(404, 'Reservation not found');
	const place = restaurantAt(locals.ctx, site, r.restaurant)!;
	return {
		reservation: { code: r.code, at: r.startsAt, party: r.party, name: r.name, email: r.email, occasion: OCCASIONS[r.occasion] ?? '', notes: r.notes, canceled: !!r.canceledAt, upcoming: r.startsAt > locals.ctx.now() },
		restaurant: { name: place.name, address: place.address, area: place.area }
	};
};

export const actions = {
	cancel: ({ locals, params }) => {
		const r = cancel(locals.ctx, locals.site!.id, params.code);
		if (!r.ok) return fail(400, { error: r.error });
	}
};
