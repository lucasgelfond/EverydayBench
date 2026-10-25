import { beforeAll, describe, expect, test } from 'vitest';
import { seed } from '../../scripts/seed.ts';
import { BANK_ROWS } from '../../scripts/seeds/bank.ts';
import { ctxFor, type Ctx } from '../../src/lib/server/ctx.ts';
import { deleteRun } from '../../src/lib/server/runs.ts';
import { asDate, createWorkbook, paste, setCells } from '../../src/lib/server/actions/sheets.ts';
import { evaluate, grid } from '../../src/lib/server/sheet.ts';
import { call } from '../../src/lib/server/evals/registry.ts';
import { grade, startTask } from '../../src/lib/server/evals/evaluate.ts';
import { loadTasks } from '../../src/lib/server/evals/task.ts';

const tasks = loadTasks();

// A run of a task where `act` stands in for the agent, graded with `report`.
function attempt(id: string, act: (ctx: Ctx) => unknown, report: string) {
	const task = tasks.get(id)!;
	const run = startTask(task);
	try {
		act(ctxFor(run));
		return grade(task, run.id, report);
	} finally {
		deleteRun(run.id);
	}
}
const failing = (g: ReturnType<typeof attempt>) => g.assertions.filter((a) => !a.pass).map((a) => a.fn);
// A new spreadsheet with `rows` pasted from A1.
const sheet = (title: string, rows: string[][]) => (ctx: Ctx) => {
	const w = createWorkbook(ctx, title);
	if (w.ok) paste(ctx, w.tab, 'A1', rows.map((r) => r.join('\t')).join('\n'));
};

beforeAll(() => void seed());

describe('formulas', () => {
	const values = (cells: Record<string, string>) => {
		const raw = new Map(Object.entries(cells).map(([a, v]) => [`${Number(a.slice(1))}:${a.charCodeAt(0) - 64}`, v]));
		return Object.fromEntries([...evaluate(raw)].map(([k, v]) => [k, v]));
	};
	test('SUM over a range, arithmetic, and references to formulas', () => {
		expect(values({ B2: '1850', C2: '$91.20', D2: '65', E2: '=SUM(B2:D2)', F2: '=E2/2', G2: '=(B2 - 50) * 2 + sum(C2, 1)' })).toMatchObject({ '2:5': 2006.2, '2:6': 1003.1, '2:7': 3692.2 });
	});
	test('a formula that refers to itself, or makes no sense, is #ERROR!', () => {
		expect(values({ A1: '=A1+1', A2: '=SUM(', A3: '=1/0', A4: '=FOO(1)' })).toEqual({ '1:1': '#ERROR!', '2:1': '#ERROR!', '3:1': '#ERROR!', '4:1': '#ERROR!' });
	});
});

test('dates as people type them', () => {
	for (const s of ['2026-02-03', '2/3/2026', '02/03/26', 'Feb 3, 2026', 'Tuesday, February 3 2026', '3 Feb 2026', 'Feb 3rd, 2026']) expect(asDate(s), s).toBe('2026-02-03');
	expect(asDate('Feb 3')).toBeUndefined();
	expect(asDate('Feb 3', 2026)).toBe('2026-02-03');
	expect(asDate('65')).toBeUndefined();
});

test('cells: only changes are written, an empty value clears, a paste fills down and right', () => {
	const task = tasks.get('sheets/flight-log')!;
	const run = startTask(task);
	try {
		const ctx = ctxFor(run);
		const w = createWorkbook(ctx, 'Scratch');
		if (!w.ok) throw new Error(w.error);
		paste(ctx, w.tab, 'B2', 'a\tb\nc\td\n');
		expect(setCells(ctx, w.tab, [{ row: 2, col: 2, value: 'a' }, { row: 2, col: 3, value: '' }])).toEqual({ ok: true, changed: 1 });
		expect(grid(ctx, w.tab)).toEqual([['', '', ''], ['', 'a', ''], ['', 'c', 'd']]);
		expect(setCells(ctx, w.tab, [{ row: 600, col: 1, value: 'x' }]).ok).toBe(false);
	} finally {
		deleteRun(run.id);
	}
});

describe('flight log', () => {
	const FLOWN = [
		['2025-06-12', 'SH 214', 'SFO', 'EWR'],
		['2025-06-16', 'SH 233', 'EWR', 'SFO'],
		['2025-08-03', 'LK 118', 'SFO', 'ORD'],
		['2025-08-06', 'LK 131', 'ORD', 'SFO'],
		['2025-10-21', 'SH 402', 'SFO', 'BOS'],
		['2025-10-24', 'SH 415', 'BOS', 'SFO'],
		['2026-01-09', 'LK 305', 'SFO', 'SEA'],
		['2026-01-11', 'LK 312', 'SEA', 'SFO'],
		['2026-02-12', 'LK 409', 'SFO', 'PIT']
	];
	const log = (rows: string[][]) => sheet('Flight log', [['Date', 'Flight', 'From', 'To'], ...rows]);

	test('every flight flown, in any order and with city names, passes', () => {
		const rows = [...FLOWN].reverse().map(([d, f, a, b]) => [d!, f!.replace(' ', ''), a === 'SFO' ? 'San Francisco' : a!, b!]);
		expect(attempt('sheets/flight-log', log(rows), 'Done: 9 flights.').pass).toBe(true);
	});

	test('the cancelled trip, the flight before the schedule change, the trip ahead, or a duplicate fails', () => {
		const wrong = {
			cancelled: [...FLOWN, ['2025-12-05', 'LK 220', 'SFO', 'AUS']],
			unchanged: [...FLOWN.filter((r) => r[1] !== 'SH 402'), ['2025-10-20', 'SH 400', 'SFO', 'BOS']],
			ahead: [...FLOWN, ['2026-03-20', 'SH 518', 'SFO', 'DEN']],
			duplicate: [...FLOWN, FLOWN[6]!]
		};
		for (const [why, rows] of Object.entries(wrong)) {
			const g = attempt('sheets/flight-log', log(rows), '9 flights');
			expect(g.pass, why).toBe(false);
			expect(failing(g), why).toEqual(['flight_rows']);
		}
	});

	test('the reference passes; with no count in the report, it doesn’t', () => {
		const task = tasks.get('sheets/flight-log')!;
		expect(attempt('sheets/flight-log', (ctx) => task.evaluation.reference.forEach((c) => call(ctx, c.action, c.args)), 'Nine flights (9).').pass).toBe(true);
		expect(attempt('sheets/flight-log', (ctx) => task.evaluation.reference.forEach((c) => call(ctx, c.action, c.args)), 'All done.').pass).toBe(false);
	});
});

describe('February budget', () => {
	const reference = (ctx: Ctx) => tasks.get('sheets/february-budget')!.evaluation.reference.forEach((c) => call(ctx, c.action, c.args));
	const REPORT = 'Groceries $241.90, Dining $198.85, Transport $86.12, Bills $2,015.34, Shopping $165.99, Other $81.00.';

	test('the bank’s February adds up to the task’s totals', () => {
		const feb = BANK_ROWS.filter(([account, date, d, , status]) => date.startsWith('2026-02') && !status && account !== 'savings' && !/transfer|payment|payroll/i.test(d));
		expect(feb).toHaveLength(18);
		expect(Math.round(feb.reduce((n, [, , , dollars]) => n + dollars, 0) * 100)).toBe(-(24190 + 19885 + 8612 + 201534 + 16599 + 8100));
	});

	test('the reference passes', () => {
		expect(attempt('sheets/february-budget', reference, REPORT).pass).toBe(true);
	});

	test('totals as formulas, dates without the year, and a refund typed positive pass', () => {
		const lines: string[][] = [
			['Feb 1', 'Linkwave', '65.00', 'Bills'],
			['Feb 1', 'Rent', '1,850.00', 'Bills'],
			['Feb 2', 'Green Basket', '84.37', 'Groceries'],
			['Feb 4', 'Transit', '40', 'Transport'],
			['Feb 6', 'Mopedette', '21.50', 'Dining'],
			['Feb 7', 'Kettlewick', '129.99', 'Shopping'],
			['Feb 9', 'Green Basket', '62.15', 'Groceries'],
			['Feb 10', 'Power', '88.34', 'Bills'],
			['Feb 11', 'Barbers', '32', 'Other'],
			['Feb 13', 'Ember Ledger', '148.60', 'Dining'],
			['Feb 14', 'Cloudpail', '12', 'Bills'],
			['Feb 16', 'Fernhill', '23.48', 'Groceries'],
			['Feb 18', 'Harbor Fuel', '46.12', 'Transport'],
			['Feb 20', 'Forkfly', '28.75', 'Dining'],
			['Feb 21', 'Parcelpine', '54', 'Shopping'],
			['Feb 23', 'Green Basket', '71.90', 'Groceries'],
			['Feb 25', 'Parcelpine refund', '18.00', 'Shopping'],
			['Feb 26', 'Sweatlantis', '49', 'Other']
		];
		const totals = [
			['Total Groceries', '=C4+C8+C13+C17'],
			['Dining', '=SUM(C6,C11,C15)'],
			['Transport', '=C5+C14'],
			['Bills', '=C2+C3+C9+C12'],
			['Shopping', '=C7+C16-C18'],
			['Other', '=C10+C19']
		];
		const act = sheet('February budget', [['Date', 'What', 'Amount', 'Category'], ...lines, [], ...totals.map(([l, f]) => [l!, '', f!])]);
		const g = attempt('sheets/february-budget', act, REPORT);
		expect(failing(g)).toEqual([]);
		expect(g.pass).toBe(true);
	});

	test('a transfer or a pending charge listed, or a refund added instead of taken off, fails', () => {
		const reference = tasks.get('sheets/february-budget')!.evaluation.reference[1]!.args.text as string;
		const rows = reference.split('\n').map((l) => l.split('\t'));
		const withRows = (extra: string[][]) => sheet('February budget', [...rows.slice(0, 19), ...extra, ...rows.slice(19)]);
		expect(failing(attempt('sheets/february-budget', withRows([['2026-02-20', 'Transfer to Savings', '500.00', 'Other']]), REPORT))).toContain('dated_lines');
		expect(failing(attempt('sheets/february-budget', withRows([['2026-02-27', 'Tablenook hold', '25.00', 'Dining']]), REPORT))).toContain('dated_lines');
		const added = rows.map((r) => (r[0] === 'Shopping' ? ['Shopping', '201.99'] : r));
		expect(failing(attempt('sheets/february-budget', sheet('February budget', added), REPORT))).toEqual(['labeled_totals']);
	});
});

describe('rent ledger', () => {
	const id = 'sheets/rent-ledger-march';
	const tab = 1;
	test('March added with formulas like the other months passes', () => {
		const g = attempt(id, (ctx) => paste(ctx, tab, 'A4', 'March 2026\t1850\t76.58\t65\t=SUM(B4:D4)\t=E4/2'), 'We each owe $995.79.');
		expect(g.pass).toBe(true);
	});
	test('last month’s power bill, or a change to February, fails', () => {
		expect(failing(attempt(id, (ctx) => paste(ctx, tab, 'A4', 'March 2026\t1850\t88.34\t65\t=SUM(B4:D4)\t=E4/2'), '$1,001.67 each'))).toEqual(['row_with']);
		const g = attempt(id, (ctx) => (paste(ctx, tab, 'A4', 'March 2026\t1850\t76.58\t65\t=SUM(B4:D4)\t=E4/2'), setCells(ctx, tab, [{ row: 3, col: 3, value: '76.58' }])), '$995.79');
		expect(failing(g)).toEqual(['cells_kept']);
	});
});
