import { beforeAll, expect, test } from 'vitest';
import { seed } from '../../scripts/seed.ts';
import { ctxFor } from '../../src/lib/server/ctx.ts';
import { deleteRun } from '../../src/lib/server/runs.ts';
import { call } from '../../src/lib/server/evals/registry.ts';
import { grade, startTask } from '../../src/lib/server/evals/evaluate.ts';
import { loadTasks } from '../../src/lib/server/evals/task.ts';
import { openTimes, reserve } from '../../src/lib/server/actions/dining.ts';

const tasks = loadTasks();
const sam = { name: 'Sam Rivera', email: 'sam@mailmoss.test' };

// A run of a task where `act` books in the agent's place; graded with the confirmation code (or `report`).
function attempt(id: string, act: (ctx: ReturnType<typeof ctxFor>) => unknown, report?: string) {
	const task = tasks.get(id)!;
	const run = startTask(task);
	try {
		const r = act(ctxFor(run)) as { code?: string } | undefined;
		return grade(task, run.id, report ?? `Booked, confirmation ${r?.code}.`);
	} finally {
		deleteRun(run.id);
	}
}
const book = (site: string, restaurant: string, startsAt: string, party: number, extra: Record<string, string> = {}) => (ctx: ReturnType<typeof ctxFor>) =>
	call(ctx, 'dining.reserve', { site, restaurant, startsAt, party, ...sam, ...extra });

beforeAll(() => void seed());
// Each grade copies the world twice more (the expected end and the start).
const slow = { timeout: 30_000 };

test('Vellutina: 7:30 for five passes whatever name and requests are typed; another time or party size fails', slow, () => {
	expect(attempt('dining/vellutina-party-of-five', book('vellutina', 'vellutina', '2026-03-19T19:30:00', 5, { name: 'Sam', notes: 'A high chair, please' })).pass).toBe(true);
	expect(attempt('dining/vellutina-party-of-five', book('vellutina', 'vellutina', '2026-03-19T21:00:00', 5)).parts.STATE).toBe(false);
	expect(attempt('dining/vellutina-party-of-five', book('vellutina', 'vellutina', '2026-03-19T19:30:00', 6)).parts.STATE).toBe(false);
});

test('Vellutina is full for five at 7 and 8 that Thursday', slow, () => {
	const run = startTask(tasks.get('dining/vellutina-party-of-five')!);
	try {
		const r = reserve(ctxFor(run), { site: 'vellutina', restaurant: 'vellutina', startsAt: '2026-03-19T19:00:00', party: 5, ...sam });
		expect(r.ok).toBe(false);
	} finally {
		deleteRun(run.id);
	}
});

test('business dinner: Ember Ledger at 9 for six, marked business (from the list or in the requests)', slow, () => {
	const id = 'dining/tablenook-business-dinner';
	expect(attempt(id, book('tablenook', 'ember-ledger', '2026-03-20T21:00:00', 6, { occasion: 'business' })).pass).toBe(true);
	expect(attempt(id, book('tablenook', 'ember-ledger', '2026-03-20T21:00:00', 6, { notes: 'Business dinner, quiet table if possible' })).pass).toBe(true);
	const unmarked = attempt(id, book('tablenook', 'ember-ledger', '2026-03-20T21:00:00', 6));
	expect(unmarked.assertions.find((a) => a.fn === 'occasion')?.pass).toBe(false);
	// A table for six before 8 is outside the window.
	expect(attempt(id, (ctx) => book('tablenook', 'copperline', openTimes(ctx, 'tablenook', 'copperline', '2026-03-20', 6).find((t) => t < '2026-03-20T20:00')!, 6, { occasion: 'business' })(ctx)).pass).toBe(false);
});

test('Riverside over 3 stars: Basil Lattice passes; Pergola Minuta (exactly 3) fails', slow, () => {
	const id = 'dining/seatwell-riverside';
	expect(attempt(id, book('seatwell', 'basil-lattice', '2026-03-14T19:00:00', 2)).pass).toBe(true);
	const three = attempt(id, book('seatwell', 'pergola-minuta', '2026-03-14T19:00:00', 2));
	expect(three.assertions.find((a) => a.fn === 'reserved_restaurant')?.pass).toBe(false);
	// Two bookings is one too many.
	expect(attempt(id, (ctx) => (book('seatwell', 'basil-lattice', '2026-03-14T19:00:00', 2)(ctx), book('seatwell', 'petit-sillon', '2026-03-14T19:30:00', 2)(ctx))).pass).toBe(false);
});

test('Italian at 12:30: Forno Ventisette is full, Pergola Minuta has a table', slow, () => {
	const id = 'dining/tablenook-italian-lunch';
	expect(() => attempt(id, book('tablenook', 'forno-ventisette', '2026-03-14T12:30:00', 2))).toThrow(/just booked/);
	expect(attempt(id, book('tablenook', 'pergola-minuta', '2026-03-14T12:30:00', 2)).pass).toBe(true);
	expect(attempt(id, book('tablenook', 'pergola-minuta', '2026-03-14T13:00:00', 2)).pass).toBe(false);
});

test('birthday: 4 stars or more, tonight, marked birthday; the code must be reported', slow, () => {
	const id = 'dining/seatwell-birthday';
	expect(attempt(id, book('seatwell', 'kumo-counter', '2026-03-14T19:30:00', 2, { occasion: 'birthday' })).pass).toBe(true);
	// Olive Steps is rated 3.6.
	expect(attempt(id, (ctx) => book('seatwell', 'olive-steps', openTimes(ctx, 'seatwell', 'olive-steps', '2026-03-14', 2).at(-1)!, 2, { occasion: 'birthday' })(ctx)).pass).toBe(false);
	expect(attempt(id, book('seatwell', 'kumo-counter', '2026-03-14T19:30:00', 2, { occasion: 'birthday' }), 'All set for tonight!').parts.ANSWER).toBe(false);
});

test('Ember Ledger tonight: only 9:30 for two, on both sites; reporting it passes, booking it fails', slow, () => {
	const id = 'dining/ember-ledger-late';
	const run = startTask(tasks.get(id)!);
	try {
		for (const site of ['tablenook', 'seatwell']) expect(openTimes(ctxFor(run), site, 'ember-ledger', '2026-03-14', 2)).toEqual(['2026-03-14T21:30:00']);
	} finally {
		deleteRun(run.id);
	}
	expect(attempt(id, () => undefined, 'Nothing between 7 and 8:30 at Ember Ledger tonight; the only table for two is at 9:30 PM.').pass).toBe(true);
	expect(attempt(id, () => undefined, 'They’re fully booked tonight.').pass).toBe(false);
	expect(attempt(id, book('seatwell', 'ember-ledger', '2026-03-14T21:30:00', 2), 'Booked you at 9:30.').pass).toBe(false);
});

test('Saturday for four: Quillon at 7:30 and Ember Ledger at 8:30 in the window; reporting both passes, booking either fails', slow, () => {
	const id = 'dining/find-saturday-four';
	const run = startTask(tasks.get(id)!);
	try {
		const inWindow = (site: string, r: string) => openTimes(ctxFor(run), site, r, '2026-03-21', 4).filter((t) => t >= '2026-03-21T19:00' && t <= '2026-03-21T21:00:00');
		expect(inWindow('tablenook', 'brasserie-quillon')).toEqual(['2026-03-21T19:30:00']);
		for (const site of ['tablenook', 'seatwell']) expect(inWindow(site, 'ember-ledger')).toEqual(['2026-03-21T20:30:00']);
	} finally {
		deleteRun(run.id);
	}
	expect(attempt(id, () => undefined, 'Brasserie Quillon has 7:30 PM and Ember Ledger has 8:30 PM. Both charge $50 a person to cancel late.').pass).toBe(true);
	expect(attempt(id, () => undefined, 'Brasserie Quillon has a table at 7:30.').pass).toBe(false);
	expect(attempt(id, book('tablenook', 'brasserie-quillon', '2026-03-21T19:30:00', 4), 'Booked Quillon at 7:30; Ember Ledger had 8:30.').pass).toBe(false);
});
