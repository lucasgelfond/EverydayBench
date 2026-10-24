import { error, fail, redirect } from '@sveltejs/kit';
import { book, home, isFree, nightsOf, price, savedCards } from '#lib/server/actions/lodging.ts';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const load = ({ locals, url }) => {
	const h = home(locals.ctx, url.searchParams.get('home') ?? '');
	if (!h) error(404, 'Home not found');
	const checkIn = url.searchParams.get('checkIn') ?? '';
	const checkOut = url.searchParams.get('checkOut') ?? '';
	const guests = Number(url.searchParams.get('guests')) || 1;
	if (!DATE.test(checkIn) || !DATE.test(checkOut) || checkOut <= checkIn) redirect(303, `/homes/${h.id}`);
	const n = nightsOf(checkIn, checkOut).length;
	return { h, checkIn, checkOut, guests, nights: n, cost: price(h, n), free: isFree(locals.ctx, h.id, checkIn, checkOut), cards: savedCards(locals.ctx) };
};

export const actions = {
	default: async ({ locals, request, url }) => {
		const f = await request.formData();
		const r = book(locals.ctx, {
			home: url.searchParams.get('home') ?? '',
			checkIn: url.searchParams.get('checkIn') ?? '',
			checkOut: url.searchParams.get('checkOut') ?? '',
			guests: Number(url.searchParams.get('guests')) || 1,
			card: Number(f.get('card'))
		});
		if (!r.ok) return fail(400, { error: r.error });
		redirect(303, `/trips/${r.code}`);
	}
};
