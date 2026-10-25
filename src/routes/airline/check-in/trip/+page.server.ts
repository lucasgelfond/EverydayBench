import { fail, redirect } from '@sveltejs/kit';
import { cabinOf, inCabin } from '#lib/airline.ts';
import { checkIn, checkinCloses, checkinOpens, extraRoomOffer, findTrip, takenOn } from '#lib/server/actions/airline.ts';

// A trip found by code and last name: each flight's check-in, open or not yet. A passenger without a seat picks one on
// the map (?seat=, in the URL until "Check in"); one with an Economy seat is offered an exit-row seat for a fee, as
// airlines do at check-in.
export const load = ({ locals, url }) => {
	const site = locals.site!.id;
	const code = url.searchParams.get('code') ?? '';
	const last = url.searchParams.get('last') ?? '';
	const t = findTrip(locals.ctx, site, code, last);
	if (!t) return { missing: true, code, last };
	const now = locals.ctx.now();
	const want = url.searchParams.get('seat');
	return {
		missing: false,
		code: t.code,
		last: t.last,
		first: t.first,
		legs: t.legs.map((l) => {
			const opens = checkinOpens(l.flight);
			const state = l.checkin ? 'done' : now < opens ? 'early' : now >= checkinCloses(l.flight) ? 'closed' : 'open';
			const taken = state === 'open' && !l.seat ? takenOn(locals.ctx, site, l.flight.id) : [];
			const cabin = cabinOf(l.fare);
			return {
				flight: l.flight,
				fare: l.fare,
				seat: l.seat,
				state,
				opens,
				checkin: l.checkin,
				cabin,
				taken,
				offer: state === 'open' ? extraRoomOffer(locals.ctx, site, l) : undefined,
				pick: state === 'open' && !l.seat && want && inCabin(cabin, want) && !taken.includes(want) ? want : null
			};
		})
	};
};

export const actions = {
	default: async ({ locals, request, url }) => {
		const f = await request.formData();
		const code = url.searchParams.get('code') ?? '';
		const last = url.searchParams.get('last') ?? '';
		const r = checkIn(locals.ctx, { site: locals.site!.id, code, last, flight: String(f.get('flight') ?? ''), seat: String(f.get('seat') ?? '') || null, upgrade: String(f.get('upgrade') ?? '') || null });
		if (!r.ok) return fail(400, { error: r.error });
		redirect(303, `/check-in/trip?${new URLSearchParams({ code, last })}`);
	}
};
