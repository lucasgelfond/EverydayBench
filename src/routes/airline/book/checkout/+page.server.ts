import { error, fail, redirect } from '@sveltejs/kit';
import { bookingSeatFee } from '#lib/airline.ts';
import { legsFrom } from '#lib/server/airline-pages.ts';
import { accountName, book, priceOf, savedCards, type Payment } from '#lib/server/actions/airline.ts';

export const load = ({ locals, url }) => {
	const site = locals.site!.id;
	const legs = legsFrom(locals.ctx, site, url.searchParams);
	if (!legs) error(404, 'Choose your flights first');
	const rows = legs.map((l) => ({ i: l.i, flight: l.flight, fare: l.fare, seat: l.seat, cents: priceOf(l.flight, l.fare), seatFee: l.seat ? bookingSeatFee(l.fare) : 0 }));
	const account = locals.account === undefined ? undefined : accountName(locals.ctx, site, locals.account);
	return {
		legs: rows,
		totalCents: rows.reduce((s, l) => s + l.cents + l.seatFee, 0),
		account,
		cards: account ? savedCards(locals.ctx, site, locals.account!).map(({ id, brand, last4, expMonth, expYear }) => ({ id, brand, last4, expMonth, expYear })) : [],
		back: url.pathname + url.search
	};
};

export const actions = {
	default: async ({ locals, request, url }) => {
		const site = locals.site!.id;
		const legs = legsFrom(locals.ctx, site, url.searchParams);
		if (!legs) error(404, 'Choose your flights first');
		const f = Object.fromEntries(await request.formData()) as Record<string, string>;
		const payment: Payment = f.payment?.startsWith('saved:')
			? { kind: 'saved', card: Number(f.payment.slice(6)) }
			: { kind: 'typed', card: { number: f.number ?? '', exp: f.exp ?? '', cvc: f.cvc ?? '', name: f.name ?? '', zip: f.zip ?? '' } };
		const r = book(locals.ctx, {
			site,
			legs: legs.map((l) => ({ flight: l.flight.id, fare: l.fare, seat: l.seat })),
			first: f.first ?? '',
			last: f.last ?? '',
			birthDate: f.birth ?? '',
			email: f.email ?? '',
			account: locals.account,
			payment
		});
		const values = { first: f.first ?? '', last: f.last ?? '', birth: f.birth ?? '', email: f.email ?? '', name: f.name ?? '', exp: f.exp ?? '', zip: f.zip ?? '' };
		if (!r.ok) return fail(400, { error: r.error, values });
		redirect(303, `/trips/${r.code}`);
	}
};
