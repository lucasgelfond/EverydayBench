import { categoriesOf, restaurants, searchProducts } from '#lib/server/storefront.ts';

export const load = ({ locals, url }) => {
	const site = locals.site!;
	if (site.kind === 'delivery') {
		const q = url.searchParams.get('q') ?? '';
		return { q, restaurants: restaurants(locals.ctx, site.id, q) };
	}
	// A store's front page: its departments and what's popular.
	return { categories: categoriesOf(locals.ctx, site.id), popular: searchProducts(locals.ctx, site.id, {}).slice(0, 8) };
};
