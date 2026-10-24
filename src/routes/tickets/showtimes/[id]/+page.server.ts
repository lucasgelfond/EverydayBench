import { error, fail, redirect } from '@sveltejs/kit';
import { showOf } from '#lib/server/catalog.ts';
import { startCheckout } from '#lib/server/actions/pay.ts';
import { MAX_SEATS } from '#lib/server/actions/tickets.ts';

export const load = ({ locals, params, url }) => {
	const s = showOf(locals.ctx, locals.site!, params.id);
	if (!s) error(404, 'Showtime not found');
	const seats = (url.searchParams.get('seats') ?? '').split(',').filter((x) => /^[A-Z]\d{1,2}$/.test(x) && !s.sold.includes(x)).slice(0, MAX_SEATS);
	return {
		show: { id: s.id, startsAt: s.startsAt, format: s.format, priceCents: s.priceCents, capacity: s.capacity, left: s.capacity === null ? null : s.capacity - s.sold.length },
		film: s.film,
		theater: s.theater,
		room: s.room ? { name: s.room.name, rows: s.room.rows, cols: s.room.cols, gaps: s.room.gaps, aisles: s.room.aisles } : null,
		sold: s.room ? s.sold : [],
		seats,
		max: MAX_SEATS
	};
};

export const actions = {
	// General admission: a hosted checkout for the tickets.
	checkout: async ({ locals, params, request }) => {
		const form = await request.formData();
		const started = startCheckout(locals.ctx, { merchant: locals.site!.id, showtime: params.id, quantity: Number(form.get('quantity')), email: String(form.get('email') ?? '') });
		if (!started.ok) return fail(400, { error: started.error });
		redirect(303, started.url, { external: true });
	}
};
