import { AIRPORTS, FARES, parseLeg } from '#lib/airline.ts';
import { flightById, minutesOf, priceOf, search } from '#lib/server/actions/airline.ts';
import { addDays } from '#lib/time.ts';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Outbound flights, then (for a round trip, once one is picked) return flights. Picking a fare is a link to the next
// step, so the search, the picks and the seats all live in the URL.
export const load = ({ locals, url }) => {
	const p = url.searchParams;
	const site = locals.site!.id;
	const from = p.get('from') ?? '';
	const to = p.get('to') ?? '';
	const date = p.get('date') ?? '';
	const ret = p.get('return') ?? '';
	const round = p.get('trip') !== 'one';
	const problem = !AIRPORTS[from] || !AIRPORTS[to] ? 'Choose where you’re flying from and to.' : from === to ? 'Choose two different airports.' : !DATE.test(date) ? 'Choose a departure date.' : round && (!DATE.test(ret) || ret < date) ? 'Choose a return date on or after your departure, or search one-way.' : undefined;
	if (problem) return { ok: false as const, problem };
	const out = parseLeg(p.get('out'));
	const outFlight = out && flightById(locals.ctx, site, out.flight);
	const returning = round && !!outFlight;
	const [a, b, on] = returning ? [to, from, ret] : [from, to, date];
	const now = locals.ctx.now();
	const at = (changes: Record<string, string>) => {
		const q = new URLSearchParams(p);
		for (const [k, v] of Object.entries(changes)) q.set(k, v);
		return `/flights?${q}`;
	};
	const next = (flight: string, fare: string) =>
		round && !returning ? at({ out: `${flight}.${fare}` }) : `/book/seats?${new URLSearchParams(returning ? { out: p.get('out')!, ret: `${flight}.${fare}` } : { out: `${flight}.${fare}` })}`;
	const flights = search(locals.ctx, site, a, b, on)
		.filter((f) => f.departsAt > now)
		.map((f) => ({ ...f, minutes: minutesOf(f), fares: FARES.map((fare) => ({ ...fare, cents: priceOf(f, fare.id), href: next(f.id, fare.id) })) }));
	const shift = (days: number) => at(returning ? { return: addDays(ret, days) } : { date: addDays(date, days) });
	return {
		ok: true as const,
		from: a,
		to: b,
		date: on,
		returning,
		round,
		picked: outFlight && out ? { number: outFlight.number, departsAt: outFlight.departsAt, fare: out.fare } : undefined,
		flights,
		earlier: on > locals.ctx.now().slice(0, 10) ? shift(-1) : undefined,
		later: shift(1)
	};
};
