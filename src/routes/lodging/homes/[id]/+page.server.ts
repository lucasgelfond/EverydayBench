import { error, fail, redirect } from '@sveltejs/kit';
import { drips, home, isFree, nightsOf, price, save, saved, unsave } from '#lib/server/actions/lodging.ts';

export const load = ({ locals, params, url }) => {
	const site = locals.site!.id;
	const h = home(locals.ctx, site, params.id);
	if (!h) error(404, 'Home not found');
	const checkIn = url.searchParams.get('checkIn') ?? '';
	const checkOut = url.searchParams.get('checkOut') ?? '';
	const guests = Number(url.searchParams.get('guests')) || 1;
	const dated = /^\d{4}-\d{2}-\d{2}$/.test(checkIn) && /^\d{4}-\d{2}-\d{2}$/.test(checkOut) && checkIn < checkOut;
	const n = dated ? nightsOf(checkIn, checkOut).length : 0;
	return {
		h,
		checkIn,
		checkOut,
		guests,
		nights: n,
		free: dated ? isFree(locals.ctx, site, h.id, checkIn, checkOut) : undefined,
		// A drip-pricing site adds its fees on the last step only.
		cost: n && !drips(site) ? price(site, h, n) : undefined,
		drip: drips(site),
		isSaved: saved(locals.ctx, site).has(h.id)
	};
};

// Back to the same page, without the action's own parameter ("?/save").
const back = (url: URL) => {
	const p = new URLSearchParams([...url.searchParams].filter(([k]) => !k.startsWith('/')));
	return url.pathname + (p.size ? `?${p}` : '');
};

export const actions = {
	save: async ({ locals, params, url }) => {
		const r = save(locals.ctx, locals.site!.id, params.id);
		if (!r.ok) return fail(400, { error: r.error });
		redirect(303, back(url));
	},
	unsave: async ({ locals, params, url }) => {
		unsave(locals.ctx, locals.site!.id, params.id);
		redirect(303, back(url));
	}
};
