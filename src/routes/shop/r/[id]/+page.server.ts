import { error, redirect } from '@sveltejs/kit';
import { addToCart } from '#lib/server/cart.ts';
import { menuOf, productById } from '#lib/server/storefront.ts';

export const load = ({ locals, params, url }) => {
	const site = locals.site!;
	if (site.kind !== 'delivery') error(404);
	const menu = menuOf(locals.ctx, site.id, params.id);
	if (!menu) error(404, 'Restaurant not found');
	const added = productById(locals.ctx, site.id, url.searchParams.get('added') ?? '');
	return { ...menu, added: added?.name, fresh: url.searchParams.has('new') };
};

export const actions = {
	add: async ({ locals, params, request, cookies }) => {
		const site = locals.site!.id;
		const id = String((await request.formData()).get('product') ?? '');
		const p = productById(locals.ctx, site, id);
		if (!p || p.merchant !== params.id) error(404, 'Dish not found');
		const fresh = addToCart(cookies, locals.run.id, site, p, 1, (other) => productById(locals.ctx, site, other)?.merchant);
		redirect(303, `/r/${params.id}?added=${p.id}${fresh ? '&new' : ''}`);
	}
};
