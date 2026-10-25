import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { accounts } from '#lib/server/schema.ts';
import { savedCards } from '#lib/server/actions/tickets.ts';
import { DEFAULT_TIP, placeOrder, price, savedAddresses, TIPS, type Address, type ShopPayment } from '#lib/server/actions/shop.ts';
import { readCart, writeCart } from '#lib/server/cart.ts';

export const load = ({ locals, cookies }) => {
	const site = locals.site!;
	const items = readCart(cookies, locals.run.id, site.id);
	if (!items.length) redirect(303, '/cart');
	const p = price(locals.ctx, site.id, items, 0);
	const account = locals.account === undefined ? undefined : locals.ctx.db(site.id).select().from(accounts).where(eq(accounts.id, locals.account)).get();
	return {
		lines: p.lines.map(({ product, quantity }) => ({ id: product.id, name: product.name, quantity, priceCents: product.priceCents })),
		merchant: p.merchant && `${p.merchant.name}, ${p.merchant.area}`,
		// Everything but the tip, which the page adds as it's chosen.
		costs: { subtotalCents: p.subtotalCents, shippingCents: p.shippingCents, serviceCents: p.serviceCents, taxCents: p.taxCents },
		tips: site.kind === 'delivery' ? TIPS : [],
		defaultTip: DEFAULT_TIP,
		account: account && { name: account.name, email: account.email },
		addresses: account ? savedAddresses(locals.ctx, site.id, account.id) : [],
		cards: account ? savedCards(locals.ctx, site.id, account.id).map(({ id, brand, last4, expMonth, expYear }) => ({ id, brand, last4, expMonth, expYear })) : []
	};
};

export const actions = {
	default: async ({ locals, request, cookies }) => {
		const site = locals.site!;
		const f = Object.fromEntries(await request.formData()) as Record<string, string>;
		const address: Address = f.address?.startsWith('saved:') ? { saved: Number(f.address.slice(6)) } : { name: f.shipName ?? '', line1: f.line1 ?? '', city: f.city ?? '', zip: f.shipZip ?? '' };
		const payment: ShopPayment = f.payment?.startsWith('saved:')
			? { kind: 'saved', card: Number(f.payment.slice(6)) }
			: { kind: 'typed', card: { number: f.number ?? '', exp: f.exp ?? '', cvc: f.cvc ?? '', name: f.name ?? '', zip: f.zip ?? '' } };
		const r = placeOrder(locals.ctx, {
			site: site.id,
			items: readCart(cookies, locals.run.id, site.id),
			email: f.email ?? '',
			account: locals.account,
			address,
			payment,
			tipPercent: site.kind === 'delivery' ? Number(f.tip ?? DEFAULT_TIP) : 0
		});
		if (!r.ok) return fail(400, { error: r.error, values: { email: f.email ?? '', name: f.name ?? '', exp: f.exp ?? '', zip: f.zip ?? '', shipName: f.shipName ?? '', line1: f.line1 ?? '', city: f.city ?? '', shipZip: f.shipZip ?? '' } });
		writeCart(cookies, locals.run.id, site.id, []);
		redirect(303, `/orders/${r.code}`);
	}
};
