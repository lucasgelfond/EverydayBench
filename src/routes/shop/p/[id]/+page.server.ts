import { error, fail, redirect } from '@sveltejs/kit';
import { MAX_QUANTITY } from '#lib/server/actions/shop.ts';
import { addToCart } from '#lib/server/cart.ts';
import { productById } from '#lib/server/storefront.ts';

export const load = ({ locals, params }) => {
	const p = productById(locals.ctx, locals.site!.id, params.id);
	if (!p || p.merchant) error(404, 'Product not found');
	return { product: p, max: MAX_QUANTITY };
};

export const actions = {
	add: async ({ locals, params, request, cookies }) => {
		const p = productById(locals.ctx, locals.site!.id, params.id);
		if (!p || p.merchant) error(404, 'Product not found');
		if (!p.inStock) return fail(400, { error: 'This item is out of stock.' });
		const quantity = Number((await request.formData()).get('quantity') ?? 1);
		if (!Number.isInteger(quantity) || quantity < 1) return fail(400, { error: 'Choose a quantity.' });
		addToCart(cookies, locals.run.id, locals.site!.id, p, quantity, () => null);
		redirect(303, `/cart?added=${p.id}`);
	}
};
