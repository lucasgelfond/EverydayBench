import { redirect } from '@sveltejs/kit';
import { findTrip } from '#lib/server/actions/airline.ts';

// Finding a trip to manage without signing in: its confirmation code and the passenger's last name, as at check-in.
export const load = ({ locals, url }) => {
	const code = url.searchParams.get('code') ?? '';
	const last = url.searchParams.get('last') ?? '';
	if (!code && !last) return { code, last, missing: false };
	const t = findTrip(locals.ctx, locals.site!.id, code, last);
	if (t) redirect(303, `/trips/${t.code}`);
	return { code, last, missing: true };
};
