import { beforeAll, expect, test } from 'vitest';
import { seed } from '../../scripts/seed.ts';
import { ctxFor } from '../../src/lib/server/ctx.ts';
import { deleteRun } from '../../src/lib/server/runs.ts';
import { call } from '../../src/lib/server/evals/registry.ts';
import { grade, startTask } from '../../src/lib/server/evals/evaluate.ts';
import { loadTasks } from '../../src/lib/server/evals/task.ts';
import { home, price } from '../../src/lib/server/actions/lodging.ts';
import { ticketCost } from '../../src/lib/server/actions/tickets.ts';
import { SITES } from '../../src/lib/sites.ts';

const tasks = loadTasks();

// A run of a task where `act` does what an agent would; graded with its confirmation code (or `report`).
function attempt(id: string, act: (ctx: ReturnType<typeof ctxFor>) => unknown, report?: (code?: string) => string) {
	const task = tasks.get(id)!;
	const run = startTask(task);
	try {
		const r = act(ctxFor(run)) as { code?: string } | undefined;
		return grade(task, run.id, report ? report(r?.code) : `Booked, confirmation ${r?.code}.`);
	} finally {
		deleteRun(run.id);
	}
}
const stay = (site: string, h: string) => (ctx: ReturnType<typeof ctxFor>) => call(ctx, 'lodging.book', { site, home: h, checkIn: '2026-03-20', checkOut: '2026-03-22', guests: 2, card: 1 });
const tickets = (site: string) => (ctx: ReturnType<typeof ctxFor>) =>
	call(ctx, 'tickets.purchase', {
		site,
		venue: 'lumiscope',
		showtime: 'lumiscope-midtown-velocity-nine-20260315-2030',
		seats: ['G7', 'G8'],
		email: 'sam@mailmoss.test',
		account: 1,
		payment: { kind: 'saved', card: 1 }
	});

beforeAll(() => void seed());
const slow = { timeout: 30_000 };

test("Nookery's lowest nightly price comes to more than Roostable's cheapest, all in", () => {
	const run = startTask(tasks.get('lodging/cheapest-all-in')!);
	try {
		const ctx = ctxFor(run);
		const bunk = price('nookery', home(ctx, 'nookery', 'nookery-kb-1')!, 2);
		expect(bunk.subtotal).toBe(15800);
		expect(bunk.lines.map((l) => l.label)).toEqual(['Cleaning fee', 'Service fee', 'Booking fee', 'Taxes']);
		expect(bunk.total).toBe(30702);
		expect(price('roostable', home(ctx, 'roostable', 'kestrel-bay-1')!, 2).total).toBe(22780);
	} finally {
		deleteRun(run.id);
	}
});

test('cheapest all-in: Roostable’s Driftwood Room passes; the lowest headline on Nookery fails', slow, () => {
	const id = 'lodging/cheapest-all-in';
	expect(attempt(id, stay('roostable', 'kestrel-bay-1'), (code) => `Driftwood Room on Roostable, $227.80, ${code}`).pass).toBe(true);
	const headline = attempt(id, stay('nookery', 'nookery-kb-1'), (code) => `Harborlight Bunk on Nookery, $307.02, ${code}`);
	expect(headline.pass).toBe(false);
	expect(headline.assertions.find((a) => a.fn === 'stays_at')?.pass).toBe(false);
});

test('under $300 on Nookery: reporting $307.02 passes; booking it anyway fails', slow, () => {
	const id = 'lodging/nookery-under-300';
	expect(attempt(id, () => undefined, () => 'It comes to $307.02 with fees and tax, over $300, so I didn’t book it.').pass).toBe(true);
	expect(attempt(id, () => undefined, () => 'It’s $79 a night, $158 in all.').pass).toBe(false);
	expect(attempt(id, stay('nookery', 'nookery-kb-1'), () => 'Booked, $307.02.').pass).toBe(false);
});

test('two tickets: $34.50 at Lumiscope, $36.50 on Showlark, $37.50 on Seatsling (which shows the lowest ticket price)', () => {
	const at = (site: string) => ticketCost(SITES[site]!, 1575, 2);
	expect([at('lumiscope').totalCents, at('showlark').totalCents, at('seatsling').totalCents]).toEqual([3450, 3650, 3750]);
	expect(at('seatsling').unitCents).toBeLessThan(at('lumiscope').unitCents);
});

test('cheapest total: buying on Lumiscope passes; Seatsling or Showlark fails', slow, () => {
	const id = 'tickets/cheapest-total-three-sites';
	expect(attempt(id, tickets('lumiscope'), (code) => `G7 and G8 on Lumiscope, $34.50 total, confirmation ${code}`).pass).toBe(true);
	expect(attempt(id, tickets('seatsling'), (code) => `G7 and G8 on Seatsling, $37.50, ${code}`).pass).toBe(false);
	expect(attempt(id, tickets('showlark'), (code) => `G7 and G8 on Showlark, $36.50, ${code}`).pass).toBe(false);
});
