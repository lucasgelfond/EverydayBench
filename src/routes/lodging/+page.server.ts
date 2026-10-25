import { fail, redirect } from '@sveltejs/kit';
import { drips, price, save, saved, search, unsave, nightsOf, type Query } from '#lib/server/actions/lodging.ts';
import { homes } from '#lib/server/schema.ts';

const AMENITY_NAMES = ['wifi', 'kitchen', 'washer', 'parking', 'air conditioning', 'workspace', 'pets allowed', 'hot tub'];

const int = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : undefined);

export const load = ({ locals, url }) => {
	const site = locals.site!.id;
	const p = url.searchParams;
	const q: Query = {
		city: p.get('city')?.trim() || undefined,
		checkIn: p.get('checkIn') || undefined,
		checkOut: p.get('checkOut') || undefined,
		guests: int(p.get('guests')),
		bedrooms: int(p.get('bedrooms')),
		beds: int(p.get('beds')),
		amenities: p.getAll('amenity').filter((a) => AMENITY_NAMES.includes(a)),
		maxNightlyCents: int(p.get('maxPrice')) && int(p.get('maxPrice'))! * 100
	};
	const sort = p.get('sort') === 'price' ? 'price' : 'rating';
	const cities = [...new Set(locals.ctx.db(site).select({ city: homes.city }).from(homes).all().map((h) => h.city))].sort();
	const n = q.checkIn && q.checkOut && q.checkIn < q.checkOut ? nightsOf(q.checkIn, q.checkOut).length : 0;
	const results = q.city
		? search(locals.ctx, site, q)
				.sort((a, b) => (sort === 'price' ? a.nightlyCents - b.nightlyCents : b.rating - a.rating))
				// A drip-pricing site shows no total until its last step.
				.map((h) => ({ ...h, total: n && !drips(site) ? price(site, h, n).total : undefined }))
		: [];
	return { q, sort, cities, nights: n, results, saved: [...saved(locals.ctx, site)], amenityNames: AMENITY_NAMES, back: url.pathname + url.search };
};

// The heart on a result: saves (or unsaves) and goes back to the same search.
const back = (f: FormData) => {
	const b = String(f.get('back') ?? '/');
	return b.startsWith('/') && !b.startsWith('//') ? b : '/';
};

export const actions = {
	save: async ({ locals, request }) => {
		const f = await request.formData();
		const r = save(locals.ctx, locals.site!.id, String(f.get('home')));
		if (!r.ok) return fail(400, { error: r.error });
		redirect(303, back(f));
	},
	unsave: async ({ locals, request }) => {
		const f = await request.formData();
		unsave(locals.ctx, locals.site!.id, String(f.get('home')));
		redirect(303, back(f));
	}
};
