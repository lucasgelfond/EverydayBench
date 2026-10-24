import { fail, redirect } from '@sveltejs/kit';
import { MAX_QUANTITY, price } from '#lib/server/actions/shop.ts';
import { readCart, writeCart } from '#lib/server/cart.ts';
import { productById } from '#lib/server/storefront.ts';

export const load = ({ locals, cookies, url }) => {
	const site = locals.site!;
	const p = price(locals.ctx, site.id, readCart(cookies, locals.run.id, site.id), 0);
	return {
		added: productById(locals.ctx, site.id, url.searchParams.get('added') ?? '')?.name,
		lines: p.lines.map(({ product, quantity }) => ({ id: product.id, name: product.name, priceCents: product.priceCents, inStock: product.inStock, quantity })),
		merchant: p.merchant && { id: p.merchant.id, name: p.merchant.name },
		subtotalCents: p.subtotalCents,
		max: MAX_QUANTITY
	};
};

export const actions = {
	// One line's quantity (0 removes it).
	update: async ({ locals, cookies, request }) => {
		const f = await request.formData();
		const product = String(f.get('product') ?? '');
		const quantity = Number(f.get('quantity') ?? 0);
		if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QUANTITY) return fail(400, { error: 'Choose a quantity.' });
		const site = locals.site!.id;
		writeCart(cookies, locals.run.id, site, readCart(cookies, locals.run.id, site).map((i) => (i.product === product ? { ...i, quantity } : i)));
		redirect(303, '/cart');
	}
};
