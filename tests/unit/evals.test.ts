import { beforeAll, describe, expect, test } from 'vitest';
import { seed } from '../../scripts/seed.ts';
import { ctxFor } from '../../src/lib/server/ctx.ts';
import { deleteRun } from '../../src/lib/server/runs.ts';
import { call } from '../../src/lib/server/evals/registry.ts';
import { DEFAULT_IGNORE, expectedState, grade, passHatK, startTask } from '../../src/lib/server/evals/evaluate.ts';
import { loadTasks } from '../../src/lib/server/evals/task.ts';

const tasks = loadTasks();
const show = 'lumiscope-harborview-last-lighthouse-20260315-1845';
const buy = (seats: string[]) => ({ site: 'lumiscope', showtime: show, seats, email: 'sam@mailmoss.test', account: 1, payment: { kind: 'saved', card: 1 } });

// A run of a task where `act` stands in for the agent, graded with `report`.
function attempt(id: string, act: (ctx: ReturnType<typeof ctxFor>) => unknown, report: (code: string) => string) {
	const task = tasks.get(id)!;
	const run = startTask(task);
	try {
		const ctx = ctxFor(run);
		const r = act(ctx) as { code?: string } | undefined;
		return grade(task, run.id, report(r?.code ?? ''));
	} finally {
		deleteRun(run.id);
	}
}

beforeAll(() => void seed());

describe('lumiscope-named-seats', () => {
	test('the right purchase, reported, passes', () => {
		const g = attempt('tickets/lumiscope-named-seats', (ctx) => call(ctx, 'tickets.purchase', buy(['E13', 'E14'])), (c) => `Done! Confirmation ${c}.`);
		expect(g.diff).toEqual([]);
		expect(g.pass).toBe(true);
	});

	test('an extra seat is an unexpected write', () => {
		const g = attempt('tickets/lumiscope-named-seats', (ctx) => call(ctx, 'tickets.purchase', buy(['E13', 'E14', 'E15'])), (c) => c);
		expect(g.parts.STATE).toBe(false);
		expect(g.diff.map((d) => `${d.site}:${d.table}`)).toContain('lumiscope:orders');
	});

	test('doing nothing fails, and so does not reporting the code', () => {
		expect(attempt('tickets/lumiscope-named-seats', () => undefined, () => 'I bought them').pass).toBe(false);
		const g = attempt('tickets/lumiscope-named-seats', (ctx) => call(ctx, 'tickets.purchase', buy(['E13', 'E14'])), () => 'Bought E13 and E14.');
		expect(g.parts).toEqual({ STATE: true, ASSERT: true, ANSWER: false });
	});
});

describe('lumiscope-two-together', () => {
	test('any two adjacent middle seats under the cap pass', () => {
		expect(attempt('tickets/lumiscope-two-together', (ctx) => call(ctx, 'tickets.purchase', buy(['E16', 'E17'])), (c) => `E16 and E17, ${c}`).pass).toBe(true);
	});

	test('seats apart fail, and so does a second order', () => {
		const apart = attempt('tickets/lumiscope-two-together', (ctx) => call(ctx, 'tickets.purchase', buy(['E12', 'E16'])), (c) => c);
		expect(apart.assertions.find((a) => a.fn === 'seats_together')?.pass).toBe(false);
		const twice = attempt('tickets/lumiscope-two-together', (ctx) => (call(ctx, 'tickets.purchase', buy(['E12'])), call(ctx, 'tickets.purchase', buy(['E13', 'E14']))), (c) => c);
		expect(twice.assertions.find((a) => a.fn === 'orders')?.pass).toBe(false);
	});
});

test('pass^k', () => {
	expect(passHatK(4, 4, 4)).toBe(1);
	expect(passHatK(4, 2, 1)).toBe(0.5);
	expect(passHatK(4, 2, 3)).toBe(0);
});

// Every task's reference solution replays, and twice gives the same end state (the sites are deterministic).
describe('every task', () => {
	for (const task of tasks.values())
		test(`${task.id} replays the same way twice`, () => {
			const ignore = [...DEFAULT_IGNORE, ...task.evaluation.ignore];
			expect(expectedState(task, ignore)).toEqual(expectedState(task, ignore));
		});
});
