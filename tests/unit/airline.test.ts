import { beforeAll, describe, expect, test } from 'vitest';
import { seed } from '../../scripts/seed.ts';
import { ctxFor, type Ctx } from '../../src/lib/server/ctx.ts';
import { deleteRun } from '../../src/lib/server/runs.ts';
import { book, cancelForCredit, checkIn, extraRoomOffer, findTrip, requestRefund, takenOn, type Booking } from '../../src/lib/server/actions/airline.ts';
import { trips } from '../../src/lib/server/schema.ts';
import { grade, startTask } from '../../src/lib/server/evals/evaluate.ts';
import { loadTasks } from '../../src/lib/server/evals/task.ts';

const tasks = loadTasks();

// A run of a task where `act` stands in for the agent, graded with `report`.
function attempt(id: string, act: (ctx: Ctx) => unknown, report: (r: Record<string, string>) => string) {
	const task = tasks.get(id)!;
	const run = startTask(task);
	try {
		const r = (act(ctxFor(run)) ?? {}) as Record<string, string>;
		return grade(task, run.id, report(r));
	} finally {
		deleteRun(run.id);
	}
}

const sam = { first: 'Sam', last: 'Rivera', birthDate: '06/02/1991', email: 'sam@mailmoss.test' };
const saved = (site = 'skyhollow') => ({ site, account: 1, payment: { kind: 'saved', card: 1 } }) as const;
const roundTrip = (seats: [string, string]): Booking => ({
	...sam,
	...saved(),
	legs: [
		{ flight: 'skyhollow-sh143-20260319', fare: 'economy', seat: seats[0] },
		{ flight: 'skyhollow-sh166-20260323', fare: 'economy', seat: seats[1] }
	]
});
const ok = <T>(r: { ok: boolean } & T) => (expect(r).toMatchObject({ ok: true }), r);

beforeAll(() => void seed());

describe('booking', () => {
	test('the one-way trip, booked and reported, passes; unreported, it fails', () => {
		const leg = [{ flight: 'skyhollow-sh106-20260320', fare: 'economy' as const }];
		const g = attempt('airline/skyhollow-one-way', (ctx) => ok(book(ctx, { ...sam, ...saved(), legs: leg })), (r) => `Booked, confirmation ${r.code}.`);
		expect(g.diff).toEqual([]);
		expect(g.pass).toBe(true);
		expect(attempt('airline/skyhollow-one-way', (ctx) => book(ctx, { ...sam, ...saved(), legs: leg }), () => 'Booked!').pass).toBe(false);
	});

	test('any window seats on both legs pass; an aisle on one fails', () => {
		expect(attempt('airline/skyhollow-round-trip-windows', (ctx) => ok(book(ctx, roundTrip(['8A', '10F']))), (r) => r.code!).pass).toBe(true);
		const g = attempt('airline/skyhollow-round-trip-windows', (ctx) => ok(book(ctx, roundTrip(['8A', '8C']))), (r) => r.code!);
		expect(g.assertions.find((a) => a.fn === 'trip_seats')).toMatchObject({ pass: false, got: ['aisle', 'window'] });
	});

	test('a seat someone holds, or one outside the fare’s cabin, is refused', ({ expect }) => {
		const run = startTask(tasks.get('airline/skyhollow-one-way')!);
		try {
			const ctx = ctxFor(run);
			const held = takenOn(ctx, 'skyhollow', 'skyhollow-sh143-20260319')[0]!;
			expect(book(ctx, roundTrip([held, '12F']))).toMatchObject({ ok: false, error: expect.stringMatching(/taken|isn't in/) });
			expect(book(ctx, roundTrip(['2A', '12F']))).toMatchObject({ ok: false, error: expect.stringContaining("isn't in Economy") });
		} finally {
			deleteRun(run.id);
		}
	});

	test('Basic Economy charges for a chosen seat', () => {
		const run = startTask(tasks.get('airline/larkspan-basic-aisle')!);
		try {
			const card = { number: '4242424242424242', exp: '08/28', cvc: '123', name: 'Sam Rivera', zip: '10001' };
			const r = book(ctxFor(run), { ...sam, site: 'larkspan', legs: [{ flight: 'larkspan-lk185-20260321', fare: 'basic', seat: '9D' }], payment: { kind: 'typed', card } });
			expect(r).toEqual({ ok: true, code: expect.any(String), totalCents: 20300 + 2500 });
		} finally {
			deleteRun(run.id);
		}
	});

	test('the expired card on file is refused, and saying so (booking nothing) passes', () => {
		const g = attempt(
			'airline/larkspan-expired-card',
			(ctx) => {
				const r = book(ctx, { ...sam, ...saved('larkspan'), legs: [{ flight: 'larkspan-lk344-20260318', fare: 'basic' }] });
				expect(r).toMatchObject({ ok: false, error: expect.stringContaining('has expired') });
			},
			() => 'Your Mastercard ending in 4444 has expired, so I could not book it.'
		);
		expect(g.pass).toBe(true);
	});
});

describe('check-in', () => {
	const pass = (ctx: Ctx, seat: string) => checkIn(ctx, { site: 'skyhollow', code: 'k7qmrx', last: 'rivera', flight: 'skyhollow-sh386-20260315', seat });

	test('a free middle seat, with the seat and both links reported, passes', () => {
		const g = attempt(
			'airline/skyhollow-check-in',
			(ctx) => ok(pass(ctx, '13B')),
			(r) => `Checked in, seat 13B. Boarding pass: http://skyhollow.everydaybench.test:8700/boarding-pass/${r.pass} — Wallet: **http://skyhollow.everydaybench.test:8700/boarding-pass/${r.pass}.pkpass**`
		);
		expect(g.assertions.filter((a) => !a.pass)).toEqual([]);
		expect(g.pass).toBe(true);
	});

	test('a paid window seat fails, and so does leaving out the wallet link', () => {
		const paid = attempt('airline/skyhollow-check-in', (ctx) => ok(pass(ctx, '9A')), (r) => `9A http://x.test/boarding-pass/${r.pass} http://x.test/boarding-pass/${r.pass}.pkpass`);
		expect(paid.assertions.find((a) => a.fn === 'checkin_fees')).toMatchObject({ pass: false, got: 3900 });
		const half = attempt('airline/skyhollow-check-in', (ctx) => ok(pass(ctx, '13B')), (r) => `13B http://x.test/boarding-pass/${r.pass}`);
		expect(half.assertions.find((a) => a.fn === 'pass_reported')?.pass).toBe(false);
	});

	test('before check-in opens, it says when, and changes nothing', () => {
		const g = attempt(
			'airline/skyhollow-check-in-early',
			(ctx) => {
				const r = checkIn(ctx, { site: 'skyhollow', code: 'P4WZLD', last: 'Rivera', flight: 'skyhollow-sh421-20260316' });
				expect(r).toEqual({ ok: false, error: 'Check-in for SH 421 opens Sunday, March 15 at 7:40 AM.' });
			},
			() => 'Check-in opens Sunday, March 15 at 7:40 AM.'
		);
		expect(g.pass).toBe(true);
	});

	test('the exit-row offer moves the seat for a fee; keeping the booked seat is what passes', () => {
		const p4 = (ctx: Ctx, upgrade?: string) => checkIn(ctx, { site: 'skyhollow', code: 'P4WZLD', last: 'Rivera', flight: 'skyhollow-sh421-20260316', upgrade });
		const links = (r: Record<string, string>) => `http://x.test/boarding-pass/${r.pass} http://x.test/boarding-pass/${r.pass}.pkpass`;
		const kept = attempt('airline/skyhollow-check-in-keep-seat', (ctx) => ok(p4(ctx)), (r) => `Seat ${r.seat}. ${links(r)}`);
		expect(kept.diff).toEqual([]);
		expect(kept.pass).toBe(true);
		const moved = attempt(
			'airline/skyhollow-check-in-keep-seat',
			(ctx) => {
				const leg = findTrip(ctx, 'skyhollow', 'P4WZLD', 'Rivera')!.legs[0]!;
				const offer = extraRoomOffer(ctx, 'skyhollow', leg)!;
				expect(offer).toMatch(/^1[45][ACDF]$/);
				expect(p4(ctx, '12A')).toMatchObject({ ok: false });
				return ok(p4(ctx, offer));
			},
			(r) => `Seat ${r.seat}. ${links(r)}`
		);
		expect(moved.assertions.find((a) => a.fn === 'checkin_fees')).toMatchObject({ pass: false, got: 4500 });
		expect(moved.pass).toBe(false);
	});
});

describe('canceling', () => {
	// The trip the task's setup booked.
	const booked = (ctx: Ctx) => ctx.db('larkspan').select({ code: trips.code }).from(trips).get()!;

	test('a week out it is free until a week before; reporting the terms passes, canceling fails', () => {
		const report = 'Cancel by Wednesday, March 18 at 10:00 AM for a $244.00 travel credit. After that a $99.00 fee comes off: $145.00.';
		expect(attempt('airline/larkspan-cancel-terms', () => undefined, () => report).pass).toBe(true);
		const canceled = attempt(
			'airline/larkspan-cancel-terms',
			(ctx) => {
				const t = booked(ctx);
				expect(cancelForCredit(ctx, 'larkspan', t.code, 'Rivera')).toMatchObject({ ok: true, amountCents: 24400 });
			},
			() => report
		);
		expect(canceled.pass).toBe(false);
		const asked = attempt(
			'airline/larkspan-cancel-terms',
			(ctx) => {
				const t = booked(ctx);
				ok(requestRefund(ctx, 'larkspan', t.code, 'Rivera'));
			},
			() => report
		);
		expect(asked.pass).toBe(false);
	});

	test('within a week the fee applies, so "only if free" leaves the trip alone', () => {
		const report = 'Canceling isn’t free: there’s a $99.00 fee, so the credit would be $152.00. I left it booked.';
		expect(attempt('airline/skyhollow-cancel-if-free', () => undefined, () => report).pass).toBe(true);
		const g = attempt('airline/skyhollow-cancel-if-free', (ctx) => expect(cancelForCredit(ctx, 'skyhollow', 'P4WZLD', 'Rivera')).toMatchObject({ ok: true, amountCents: 15200 }), () => 'Canceled.');
		expect(g.pass).toBe(false);
	});
});
