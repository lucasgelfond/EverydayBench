import { beforeAll, expect, test } from 'vitest';
import { seed } from '../../scripts/seed.ts';
import { ctxFor, type Ctx } from '../../src/lib/server/ctx.ts';
import { deleteRun, noteVisit, type Run } from '../../src/lib/server/runs.ts';
import { call } from '../../src/lib/server/evals/registry.ts';
import { grade, startTask } from '../../src/lib/server/evals/evaluate.ts';
import { dueFollowups } from '../../src/lib/server/evals/followups.ts';
import { loadTasks, Task } from '../../src/lib/server/evals/task.ts';
import { control } from '../../control/app.ts';

const tasks = loadTasks();
const sam = { name: 'Sam Rivera', email: 'sam@mailmoss.test' };

beforeAll(() => void seed());
// Each grade copies the world twice more (the expected end and the start).
const slow = { timeout: 30_000 };

// A run of a task, handed to `body`, then deleted.
function inRun<T>(task: Task, body: (run: Run, ctx: Ctx) => T) {
	const run = startTask(task);
	try {
		return body(run, ctxFor(run));
	} finally {
		deleteRun(run.id);
	}
}

// What the agent does, as actions, then the grade.
function attempt(id: string, act: (ctx: Ctx) => unknown, report: (codes: string[]) => string) {
	return inRun(tasks.get(id)!, (run, ctx) => {
		const codes: string[] = [];
		const r = act(ctx);
		for (const x of [r].flat()) if (x && typeof x === 'object' && 'code' in x) codes.push(String(x.code));
		return grade(tasks.get(id)!, run.id, report(codes));
	});
}
const reserve = (ctx: Ctx, restaurant: string, startsAt: string, party: number) => call(ctx, 'dining.reserve', { site: 'tablenook', restaurant, startsAt, party, ...sam }) as { code: string };

test('a page follow-up is due once the browser loads that page (or one under it), and only once', slow, () => {
	const task = tasks.get('dining/tablenook-make-it-four')!;
	expect(task.followups).toEqual([{ text: 'Wait, sorry, make it 4 people, and 8 PM instead of 7.', when: { onPath: 'tablenook:/book' } }]);
	inRun(task, (run) => {
		expect(run.watch).toEqual(['tablenook:/book']);
		noteVisit(run, 'tablenook', '/bookings');
		noteVisit(run, 'seatwell', '/book');
		expect(dueFollowups(task, run)).toEqual([]);
		noteVisit(run, 'tablenook', '/book/__data.json');
		expect(dueFollowups(task, run)).toEqual([{ id: 0, text: task.followups[0]!.text }]);
		expect(dueFollowups(task, run)).toEqual([]);
	});
});

test('a write follow-up is due after the first row in its table', slow, () => {
	const task = tasks.get('dining/fiorellino-friday-instead')!;
	inRun(task, (run, ctx) => {
		expect(dueFollowups(task, run)).toEqual([]);
		reserve(ctx, 'fiorellino', '2026-03-19T19:00:00', 2);
		expect(dueFollowups(task, run).map((f) => f.id)).toEqual([0]);
	});
});

test('follow-ups come in order: a later one waits for the one before, then both can come at once', slow, () => {
	const task = Task.parse({
		...tasks.get('dining/tablenook-make-it-four')!,
		followups: [
			{ text: 'first', when: { onPath: 'tablenook:/book' } },
			{ text: 'second', when: { afterSeconds: 0.001 } }
		]
	});
	inRun(task, (run) => {
		expect(dueFollowups(task, run)).toEqual([]);
		noteVisit(run, 'tablenook', '/book');
		expect(dueFollowups(task, run).map((f) => f.text)).toEqual(['first', 'second']);
	});
});

test('the control port hands out follow-ups and says how many a run has', slow, async () => {
	const res = await control.request('/runs', { method: 'POST', body: JSON.stringify({ task: 'dining/tablenook-make-it-four' }) });
	const run = (await res.json()) as { run: string; followups: number; prompt: string };
	try {
		expect(run.followups).toBe(1);
		expect(run.prompt).not.toContain('make it 4');
		expect(await (await control.request(`/runs/${run.run}/followups`)).json()).toEqual([]);
		noteVisit({ id: run.run, watch: ['tablenook:/book'] } as Run, 'tablenook', '/book');
		expect(await (await control.request(`/runs/${run.run}/followups`)).json()).toEqual([{ id: 0, text: 'Wait, sorry, make it 4 people, and 8 PM instead of 7.' }]);
	} finally {
		deleteRun(run.run);
	}
});

test("Priya's thread: the update (five at 8) passes; the first plan (four at 7) fails", slow, () => {
	expect(attempt('dining/priya-dinner-update', (ctx) => reserve(ctx, 'hanbit', '2026-03-17T20:00:00', 5), ([c]) => `Hanbit Grill House, Tuesday at 8 PM for 5. Confirmation ${c}.`).pass).toBe(true);
	const g = attempt('dining/priya-dinner-update', (ctx) => reserve(ctx, 'hanbit', '2026-03-17T19:00:00', 4), ([c]) => `Hanbit, Tuesday 7 PM for 4. Confirmation ${c}.`);
	expect(g.pass).toBe(false);
	expect(g.assertions.filter((a) => !a.pass).map((a) => a.got)).toEqual([4, '2026-03-17T19:00:00']);
});

test("Carol's update: the review at 10:30 in the Orchard Room passes; the old time and room fail", slow, () => {
	const add = (startTime: string, location: string) => (ctx: Ctx) => call(ctx, 'calendar.add', { title: 'Budget review', date: '2026-03-19', startTime, location });
	expect(attempt('calendar/budget-review-moved', add('10:30', 'Orchard Room'), () => 'Added.').pass).toBe(true);
	expect(attempt('calendar/budget-review-moved', add('09:00', 'Lantern Room'), () => 'Added.').pass).toBe(false);
});

test('make it four: four at 8 passes, even after booking two at 7 and canceling it; two at 7 alone fails', slow, () => {
	expect(attempt('dining/tablenook-make-it-four', (ctx) => reserve(ctx, 'hanbit', '2026-03-15T20:00:00', 4), ([c]) => `Done, ${c}.`).pass).toBe(true);
	const redone = attempt(
		'dining/tablenook-make-it-four',
		(ctx) => {
			const first = reserve(ctx, 'hanbit', '2026-03-15T19:00:00', 2);
			call(ctx, 'dining.cancel', { site: 'tablenook', code: first.code });
			return reserve(ctx, 'hanbit', '2026-03-15T20:00:00', 4);
		},
		([c]) => `Changed it: 4 at 8 PM, ${c}.`
	);
	expect(redone.pass).toBe(true);
	expect(attempt('dining/tablenook-make-it-four', (ctx) => reserve(ctx, 'hanbit', '2026-03-15T19:00:00', 2), ([c]) => `Done, ${c}.`).pass).toBe(false);
});

test('Friday instead: Thursday canceled and Friday booked passes; keeping both, or not canceling, fails', slow, () => {
	const switched = (ctx: Ctx) => {
		const thu = reserve(ctx, 'fiorellino', '2026-03-19T19:00:00', 2);
		call(ctx, 'dining.cancel', { site: 'tablenook', code: thu.code });
		return reserve(ctx, 'fiorellino', '2026-03-20T19:00:00', 2);
	};
	expect(attempt('dining/fiorellino-friday-instead', switched, ([c]) => `Friday at 7 instead: ${c}.`).pass).toBe(true);
	const both = attempt('dining/fiorellino-friday-instead', (ctx) => [reserve(ctx, 'fiorellino', '2026-03-19T19:00:00', 2), reserve(ctx, 'fiorellino', '2026-03-20T19:00:00', 2)], (cs) => cs.join(', '));
	expect(both.pass).toBe(false);
	expect(both.assertions.find((a) => a.fn === 'reservations')!.got).toBe(2);
});

test('never mind: buying nothing passes; buying anyway fails', slow, () => {
	expect(attempt('tickets/lumiscope-never-mind', () => undefined, () => "OK, I didn't buy them.").pass).toBe(true);
	const buy = (ctx: Ctx) =>
		call(ctx, 'tickets.purchase', { site: 'lumiscope', showtime: 'lumiscope-harborview-last-lighthouse-20260315-1845', seats: ['E13', 'E14'], email: 'sam@mailmoss.test', account: 1, payment: { kind: 'saved', card: 1 } });
	expect(attempt('tickets/lumiscope-never-mind', buy, () => 'Bought.').pass).toBe(false);
});

test('the later flight: the 6:20 PM passes; the noon one fails', slow, () => {
	const fly = (flight: string) => (ctx: Ctx) =>
		call(ctx, 'airline.book', { site: 'skyhollow', legs: [{ flight, fare: 'economy' }], first: 'Sam', last: 'Rivera', birthDate: '1991-06-02', email: 'sam@mailmoss.test', account: 1, payment: { kind: 'saved', card: 1 } });
	expect(attempt('airline/skyhollow-later-flight', fly('skyhollow-sh111-20260320'), ([c]) => `Booked the 6:20 PM, ${c}.`).pass).toBe(true);
	expect(attempt('airline/skyhollow-later-flight', fly('skyhollow-sh106-20260320'), ([c]) => `Booked, ${c}.`).pass).toBe(false);
});
