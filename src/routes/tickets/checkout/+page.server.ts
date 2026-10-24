import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { accounts } from '#lib/server/schema.ts';
import { showOf, venueOf } from '#lib/server/catalog.ts';
import { FEE_CENTS, purchase, savedCards, type Payment } from '#lib/server/actions/tickets.ts';
import { bySeat } from '#lib/time.ts';

const parse = (url: URL) => ({ showtime: url.searchParams.get('showtime') ?? '', seats: (url.searchParams.get('seats') ?? '').split(',').filter(Boolean) });

export const load = ({ locals, url }) => {
	const site = locals.site!;
	const { showtime, seats } = parse(url);
	const s = showOf(locals.ctx, site, showtime);
	if (!s || !s.room || !seats.length) error(404, 'Pick seats for a showtime first');
	const fee = FEE_CENTS[site.kind ?? 'chain']! * seats.length;
	const account = locals.account === undefined ? undefined : locals.ctx.db(site.id).select().from(accounts).where(eq(accounts.id, locals.account)).get();
	return {
		show: { id: s.id, startsAt: s.startsAt, format: s.format },
		film: s.film.title,
		theater: s.theater.name,
		room: s.room.name,
		seats: [...seats].sort(bySeat),
		subtotalCents: s.priceCents * seats.length,
		feeCents: fee,
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
		const r = purchase(locals.ctx, { site: site.id, venue: venueOf(showtime), showtime, seats, email: f.email ?? '', account: locals.account, payment });
		if (!r.ok) return fail(400, { error: r.error, values: { email: f.email ?? '', name: f.name ?? '', exp: f.exp ?? '', zip: f.zip ?? '' } });
		redirect(303, `/orders/${r.code}`);
	}
};
