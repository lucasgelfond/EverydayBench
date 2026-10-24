import { error } from '@sveltejs/kit';
import { categoriesOf, searchProducts } from '#lib/server/storefront.ts';

export const load = ({ locals, url }) => {
	const site = locals.site!;
	if (site.kind !== 'store') error(404);
	const q = url.searchParams.get('q') ?? '';
	const category = url.searchParams.get('category') ?? '';
	return { q, category, categories: categoriesOf(locals.ctx, site.id), results: searchProducts(locals.ctx, site.id, { q, category }) };
};
