import { theatersOf } from '#lib/server/catalog.ts';

// All the site's theaters, or those matching a search (the location search without JavaScript).
export const load = ({ locals, url }) => {
	const q = url.searchParams.get('q')?.trim().toLowerCase();
	const all = theatersOf(locals.ctx, locals.site!);
	return { q, theaters: q ? all.filter((t) => `${t.name} ${t.area}`.toLowerCase().includes(q)) : all };
};
