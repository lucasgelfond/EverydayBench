import { beforeAll, expect, test } from 'vitest';
import { seed } from '../../scripts/seed.ts';
import type { Ctx } from '../../src/lib/server/ctx.ts';
import { call } from '../../src/lib/server/evals/registry.ts';
import { attempt, tasks } from './attempt.ts';

beforeAll(() => void seed());
const slow = { timeout: 30_000 };

type Call = { action: string; args: Record<string, unknown> };
const sam = { name: 'Sam Rivera', email: 'sam@mailmoss.test' };

// The reference with some calls swapped out, done in order; the codes of everything it booked, for the report.
function doing(id: string, swap: (c: Call) => Call | null = (c) => c) {
	return (ctx: Ctx) => {
		const codes = tasks
			.get(id)!
			.evaluation.reference.map(swap)
			.filter((c): c is Call => c !== null)
			.map((c) => (call(ctx, c.action, c.args) as { code?: string } | undefined)?.code)
			.filter(Boolean);
		return { code: codes.join(', ') };
	};
}
const named = (action: string, args: Record<string, unknown>) => (c: Call) => (c.action === action ? { action, args: { ...c.args, ...args } } : c);
const without = (action: string) => (c: Call) => (c.action === action ? null : c);
const failed = (g: ReturnType<typeof attempt>) => g.assertions.filter((a) => !a.pass).map((a) => a.fn);

test('dinner with Jordan: Thursday at 7:30 at any Italian place, on the calendar, Jordan told', slow, () => {
	const id = 'multi/dinner-when-free';
	expect(attempt(id, doing(id)).pass).toBe(true);
	const seatwell = named('dining.reserve', { site: 'seatwell', restaurant: 'nonna-cesira' });
	expect(attempt(id, doing(id, (c) => named('calendar.add', { location: 'Nonna Cesira' })(seatwell(c)))).pass).toBe(true);
	// Wednesday at 10 is after 7:30, but book club runs until 10:30.
	const wednesday = (c: Call) => (c.action === 'calendar.add' ? { ...c, args: { ...c.args, date: '2026-03-18', startTime: '22:00' } } : named('dining.reserve', { startsAt: '2026-03-18T22:00:00' })(c));
	expect(failed(attempt(id, doing(id, wednesday)))).toEqual(['reserved_between']);
	// Not Italian.
	expect(failed(attempt(id, doing(id, named('dining.reserve', { restaurant: 'copperline' }))))).toContain('reserved_restaurant');
	// Forgot the calendar, or Jordan.
	expect(failed(attempt(id, doing(id, without('calendar.add'))))).toEqual(['event_for_reservation']);
	expect(failed(attempt(id, doing(id, without('mail.compose'))))).toEqual(['sent']);
});

test('wedding trip: the cheapest nonstops, Seaglass for both nights, Harborview after the rehearsal, all on the calendar', slow, () => {
	const id = 'multi/wedding-trip';
	expect(attempt(id, doing(id), (codes) => `Booked: ${codes}`).pass).toBe(true);
	// Without the codes in the report.
	expect(failed(attempt(id, doing(id), () => 'All booked!'))).toEqual(['codes_reported']);
	// The cheaper return, with a stop in Denver.
	const stop = (c: Call) => (c.action === 'airline.book' ? { ...c, args: { ...c.args, legs: [{ flight: 'skyhollow-sh585-20260320', fare: 'economy' }, { flight: 'skyhollow-sh608-20260322', fare: 'economy' }] } } : c);
	expect(failed(attempt(id, doing(id, stop), (codes) => codes))).toEqual(['trip_flights', 'trip_plan']);
	// One night short: the stay ends the day before the flight home.
	const short = (c: Call) => (c.action === 'lodging.book' ? { ...c, args: { ...c.args, checkOut: '2026-03-21' } } : c);
	const g = attempt(id, doing(id, short), (codes) => codes);
	expect(failed(g)).toEqual(['stays_booked', 'trip_plan']);
	expect(g.assertions.find((a) => a.fn === 'trip_plan')?.got).toEqual(['the stay ends on another day than the return leaves']);
	// Dinner during the rehearsal, and on the calendar at that time.
	const early = (c: Call) =>
		c.action === 'dining.reserve'
			? { action: c.action, args: { site: 'tablenook', restaurant: 'olive-steps', startsAt: '2026-03-20T19:00:00', party: 2, ...sam } }
			: c.action === 'calendar.add' && String(c.args.title).startsWith('Dinner')
				? { ...c, args: { ...c.args, startTime: '19:00' } }
				: c;
	expect(failed(attempt(id, doing(id, early), (codes) => codes))).toEqual(['reserved_between']);
	// The flights left off the calendar.
	const noFlights = (c: Call) => (c.action === 'calendar.add' && String(c.args.title).startsWith('Flight') ? null : c);
	expect(attempt(id, doing(id, noFlights), (codes) => codes).assertions.find((a) => a.fn === 'trip_plan')?.got).toEqual(['no calendar event for the flight there', 'no calendar event for the flight back']);
});

test('movie with Jordan: G6 (G3 is across the aisle), on the calendar, Jordan told', slow, () => {
	const id = 'multi/movie-with-jordan';
	expect(attempt(id, doing(id)).pass).toBe(true);
	expect(failed(attempt(id, doing(id, named('tickets.purchase', { seats: ['G8'] }))))).toEqual(['order_seats']);
	expect(failed(attempt(id, doing(id, without('mail.compose'))))).toEqual(['sent']);
	// G4 and G5 are Jordan's: buying one fails before it's written.
	expect(() => attempt(id, doing(id, named('tickets.purchase', { seats: ['G5'] })))).toThrow();
});
