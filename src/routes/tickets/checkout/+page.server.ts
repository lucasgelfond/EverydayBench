import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { accounts } from '#lib/server/schema.ts';
import { showOf, venueOf } from '#lib/server/catalog.ts';
import { purchase, savedCards, ticketCost, type Payment } from '#lib/server/actions/tickets.ts';
import { trip } from '#lib/server/actions/faults.ts';
import { bySeat } from '#lib/time.ts';

const parse = (url: URL) => ({ showtime: url.searchParams.get('showtime') ?? '', seats: (url.searchParams.get('seats') ?? '').split(',').filter(Boolean) });

export const load = ({ locals, url }) => {
	const site = locals.site!;
	const { showtime, seats } = parse(url);
	const s = showOf(locals.ctx, site, showtime);
	if (!s || !s.room || !seats.length) error(404, 'Pick seats for a showtime first');
	const cost = ticketCost(site, s.priceCents, seats.length);
	const account = locals.account === undefined ? undefined : locals.ctx.db(site.id).select().from(accounts).where(eq(accounts.id, locals.account)).get();
	return {
		show: { id: s.id, startsAt: s.startsAt, format: s.format },
		film: s.film.title,
		theater: s.theater.name,
		room: s.room.name,
		seats: [...seats].sort(bySeat),
		subtotalCents: cost.subtotalCents,
		lines: cost.lines,
		totalCents: cost.totalCents,
		account: account && { name: account.name, email: account.email },
		cards: account ? savedCards(locals.ctx, site.id, account.id).map(({ id, brand, last4, expMonth, expYear }) => ({ id, brand, last4, expMonth, expYear })) : [],
		back: url.pathname + url.search
	};
};

export const actions = {
	default: async ({ locals, request, url }) => {
		const site = locals.site!;
		const { showtime, seats } = parse(url);
		const f = Object.fromEntries(await request.formData()) as Record<string, string>;
		const saved = f.payment?.startsWith('saved:');
		const payment: Payment = saved
			? { kind: 'saved', card: Number(f.payment!.slice(6)) }
			: { kind: 'typed', card: { number: f.number ?? '', exp: f.exp ?? '', cvc: f.cvc ?? '', name: f.name ?? '', zip: f.zip ?? '' } };
		const values = { email: f.email ?? '', name: f.name ?? '', exp: f.exp ?? '', zip: f.zip ?? '' };
		// Failures a task can arm: a saved card that declines, and an order that goes through but whose page errors.
		if (payment.kind === 'saved' && trip(locals.ctx, site.id, 'decline')) return fail(402, { error: 'Your card was declined. Use a different card or contact your bank.', values });
		const r = purchase(locals.ctx, { site: site.id, venue: venueOf(showtime), showtime, seats, email: f.email ?? '', account: locals.account, payment });
		if (!r.ok) return fail(400, { error: r.error, values });
		if (trip(locals.ctx, site.id, 'error-after-charge')) return fail(502, { error: 'Something went wrong while confirming your order. Please try again.', values });
		redirect(303, `/orders/${r.code}`);
	}
};
