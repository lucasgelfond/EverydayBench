// What the booking pages share: the legs a URL names (out=<flight>.<fare>, ret=..., seats s0 and s1), checked against
// the airline's flights.

import { cabinOf, inCabin, parseLeg } from '../airline.ts';
import { flightById, takenOn } from './actions/airline.ts';
import type { Ctx } from './ctx.ts';

export function legsFrom(ctx: Ctx, site: string, p: URLSearchParams) {
	const picked = [parseLeg(p.get('out')), parseLeg(p.get('ret'))];
	if (!picked[0] || (p.has('ret') && !picked[1])) return undefined;
	const legs = [];
	for (const [i, leg] of picked.entries()) {
		if (!leg) continue;
		const flight = flightById(ctx, site, leg.flight);
		if (!flight) return undefined;
		const taken = takenOn(ctx, site, flight.id);
		const want = p.get(`s${i}`);
		const cabin = cabinOf(leg.fare);
		legs.push({ i, flight, fare: leg.fare, cabin, taken, seat: want && inCabin(cabin, want) && !taken.includes(want) ? want : null });
	}
	return legs;
}
