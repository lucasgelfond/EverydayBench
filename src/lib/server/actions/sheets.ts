// Gridwhistle: every write the spreadsheet site makes (a workbook, a sheet, cells), and graders' reads of what's in a
// sheet. Every cell edit is a write, as a typed value is saved when it's entered.

import { and, count, eq, max } from 'drizzle-orm';
import { cells, tabs, workbooks } from '../schema.ts';
import { code } from '../rand.ts';
import type { Ctx } from '../ctx.ts';
import { defineActions, must } from '../evals/registry.ts';
import { defineAssertions } from '../evals/assertions.ts';
import { asNumber, sheetsNamed, SITE, tabsOf, workbookById, workbookList } from '../sheet.ts';
import { MAX_COLS, MAX_ROWS, parseAddress, parseTsv } from '../../sheet.ts';
import { AIRPORTS } from '../../airline.ts';
import type { Result } from './tickets.ts';

const db = (ctx: Ctx) => ctx.db(SITE);

export function createWorkbook(ctx: Ctx, title: string): Result<{ id: string; tab: number }> {
	const name = title.trim() || 'Untitled spreadsheet';
	const n = db(ctx).select({ n: count() }).from(workbooks).get()!.n;
	const id = code(10, ctx.run.seed, 'workbook', name, n).toLowerCase();
	db(ctx).insert(workbooks).values({ id, title: name, createdAt: ctx.now() }).run();
	const tab = db(ctx).insert(tabs).values({ workbook: id, name: 'Sheet1', position: 1 }).returning({ id: tabs.id }).get().id;
	return { ok: true, id, tab };
}

export function renameWorkbook(ctx: Ctx, id: string, title: string): Result<object> {
	if (!title.trim()) return { ok: false, error: 'Give the spreadsheet a name.' };
	if (!workbookById(ctx, id)) return { ok: false, error: 'That spreadsheet doesn’t exist.' };
	db(ctx).update(workbooks).set({ title: title.trim() }).where(eq(workbooks.id, id)).run();
	return { ok: true };
}

export function addTab(ctx: Ctx, workbook: string, name: string): Result<{ tab: number }> {
	if (!workbookById(ctx, workbook)) return { ok: false, error: 'That spreadsheet doesn’t exist.' };
	const existing = tabsOf(ctx, workbook);
	const wanted = name.trim() || `Sheet${existing.length + 1}`;
	if (existing.some((t) => t.name.toLowerCase() === wanted.toLowerCase())) return { ok: false, error: `There’s already a sheet named “${wanted}”.` };
	const position = (db(ctx).select({ p: max(tabs.position) }).from(tabs).where(eq(tabs.workbook, workbook)).get()?.p ?? 0) + 1;
	return { ok: true, tab: db(ctx).insert(tabs).values({ workbook, name: wanted, position }).returning({ id: tabs.id }).get().id };
}

export function renameTab(ctx: Ctx, tab: number, name: string): Result<object> {
	const t = db(ctx).select().from(tabs).where(eq(tabs.id, tab)).get();
	if (!t) return { ok: false, error: 'That sheet doesn’t exist.' };
	const wanted = name.trim();
	if (!wanted) return { ok: false, error: 'Give the sheet a name.' };
	if (tabsOf(ctx, t.workbook).some((o) => o.id !== tab && o.name.toLowerCase() === wanted.toLowerCase())) return { ok: false, error: `There’s already a sheet named “${wanted}”.` };
	db(ctx).update(tabs).set({ name: wanted }).where(eq(tabs.id, tab)).run();
	return { ok: true };
}

export interface CellEdit {
	row: number;
	col: number;
	value: string;
}

// Saves cells as typed; an empty one is cleared. Only cells that changed are written.
export function setCells(ctx: Ctx, tab: number, edits: CellEdit[]): Result<{ changed: number }> {
	if (!db(ctx).select().from(tabs).where(eq(tabs.id, tab)).get()) return { ok: false, error: 'That sheet doesn’t exist.' };
	if (edits.some((e) => !(e.row >= 1 && e.row <= MAX_ROWS && e.col >= 1 && e.col <= MAX_COLS))) return { ok: false, error: `Cells go from A1 to Z${MAX_ROWS}.` };
	let changed = 0;
	db(ctx).transaction((tx) => {
		for (const e of edits) {
			const where = and(eq(cells.tab, tab), eq(cells.row, e.row), eq(cells.col, e.col));
			const old = tx.select().from(cells).where(where).get();
			const value = e.value.replace(/\r\n?/g, '\n');
			if ((old?.value ?? '') === value) continue;
			changed++;
			if (!value) tx.delete(cells).where(where).run();
			else if (old) tx.update(cells).set({ value }).where(where).run();
			else tx.insert(cells).values({ tab, row: e.row, col: e.col, value }).run();
		}
	});
	return { ok: true, changed };
}

// Tab-separated rows pasted from `at` ("A2") down and to the right.
export function paste(ctx: Ctx, tab: number, at: string, text: string): Result<{ changed: number }> {
	const start = parseAddress(at);
	if (!start) return { ok: false, error: 'Start at a cell like A1.' };
	if (!text.trim()) return { ok: false, error: 'There’s nothing to paste.' };
	const edits = parseTsv(text).flatMap((line, r) => line.map((value, c) => ({ row: start.row + r, col: start.col + c, value: value.trim() })));
	return setCells(ctx, tab, edits);
}

// For setups and reference solutions: a sheet by its workbook's title and the sheet's name (the first sheet if none).
function tabNamed(ctx: Ctx, workbook: string, tab?: string) {
	const w = workbookList(ctx).find((x) => x.title === workbook);
	if (!w) throw new Error(`no workbook ${workbook}`);
	const t = tabsOf(ctx, w.id).find((x) => tab === undefined || x.name === tab);
	if (!t) throw new Error(`no sheet ${tab} in ${workbook}`);
	return t.id;
}

defineActions({
	'sheets.create': (ctx, a) => must(createWorkbook(ctx, String(a.title)), 'create'),
	'sheets.addTab': (ctx, a) => must(addTab(ctx, workbookList(ctx).find((w) => w.title === a.workbook)!.id, String(a.name)), 'add sheet'),
	'sheets.renameTab': (ctx, a) => must(renameTab(ctx, tabNamed(ctx, String(a.workbook), a.tab as string | undefined), String(a.name)), 'rename sheet'),
	'sheets.paste': (ctx, a) => must(paste(ctx, tabNamed(ctx, String(a.workbook), a.tab as string | undefined), String(a.at ?? 'A1'), String(a.text)), 'paste')
});

// Reading what someone typed, however they wrote it.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const iso = (y: number, m: number, d: number) => {
	const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
	return m >= 1 && m <= 12 && d >= 1 && d <= 31 && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ? date : undefined;
};
const fullYear = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y));

// "2026-02-03", "2/3/2026", "02/03/26", "Feb 3, 2026", "Tuesday, February 3 2026", "3 Feb 2026"; with `year`, also
// "Feb 3" and "2/3" (a sheet of one month's purchases rarely repeats the year).
export function asDate(s: string, year?: number): string | undefined {
	const t = s.trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, '$1');
	let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
	if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));
	m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/.exec(t);
	if (m) return m[3] ? iso(fullYear(m[3]), Number(m[1]), Number(m[2])) : year ? iso(year, Number(m[1]), Number(m[2])) : undefined;
	m = /^(?:[a-z]+,?\s+)?([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?(?:\s+(\d{4}))?$/.exec(t);
	if (m && MONTHS.includes(m[1]!)) return m[3] ? iso(Number(m[3]), MONTHS.indexOf(m[1]!) + 1, Number(m[2])) : year ? iso(year, MONTHS.indexOf(m[1]!) + 1, Number(m[2])) : undefined;
	m = /^(\d{1,2})\s+([a-z]{3})[a-z]*\.?,?(?:\s+(\d{4}))?$/.exec(t);
	if (m && MONTHS.includes(m[2]!)) return m[3] ? iso(Number(m[3]), MONTHS.indexOf(m[2]!) + 1, Number(m[1])) : year ? iso(year, MONTHS.indexOf(m[2]!) + 1, Number(m[1])) : undefined;
	return undefined;
}

// "SH 214", "sh-214", "SH214" -> "SH214".
const asFlight = (s: string) => {
	const t = s.trim().toUpperCase().replace(/[\s-]/g, '');
	return /^[A-Z]{2}\d{1,4}$/.test(t) ? t : undefined;
};

// "SFO", "San Francisco", "San Francisco (SFO)" -> "SFO".
function asAirport(s: string) {
	const t = s.trim();
	const inParens = /\(([A-Za-z]{3})\)/.exec(t)?.[1];
	if (inParens && AIRPORTS[inParens.toUpperCase()]) return inParens.toUpperCase();
	if (/^[A-Za-z]{3}$/.test(t) && AIRPORTS[t.toUpperCase()]) return t.toUpperCase();
	const name = t.toLowerCase().replace(/[’']/g, "'");
	return Object.entries(AIRPORTS).find(([, city]) => city.toLowerCase().replace(/[’']/g, "'") === name || city.toLowerCase().split(' ')[0] === name)?.[0];
}

const cents = (s: string) => {
	const n = asNumber(s);
	return n === undefined ? undefined : Math.round(n * 100);
};

// The sheets a check reads: those named like `named`, or every sheet the run has if no name is given.
const sheetsFor = (ctx: Ctx, named: unknown) => sheetsNamed(ctx, String(named ?? ''));

// Multisets compared: what's expected and not there, and what's there and not expected.
function compareRows(got: string[], want: string[]) {
	const left = [...want];
	const extra: string[] = [];
	for (const g of got) {
		const i = left.indexOf(g);
		if (i >= 0) left.splice(i, 1);
		else extra.push(g);
	}
	return { missing: left, extra };
}

defineAssertions({
	// A flight log: every row with a date and a flight number, as "date flight from-to", compared with `rows` as a set
	// (in any order, in any columns, with or without a header). Dates in any common format with the year; airports as
	// codes or city names.
	flight_rows: (ctx, a) => {
		const best = sheetsFor(ctx, a.sheet).map((s) => {
			const got = s.rows.flatMap((row) => {
				const date = row.map((c) => asDate(c)).find(Boolean);
				const flight = row.map(asFlight).find(Boolean);
				const airports = row.map(asAirport).filter(Boolean);
				return date && flight ? [`${date} ${flight} ${airports[0] ?? '?'}-${airports[1] ?? '?'}`] : [];
			});
			return compareRows(got, a.rows as string[]);
		});
		return best.find((r) => !r.missing.length && !r.extra.length) ?? best[0] ?? { missing: a.rows, extra: [] };
	},

	// Line items: every row with a date (in `year` if the sheet leaves it out), a label from `labels`, and an amount, as
	// "date label cents" (amounts unsigned: a refund may be typed either way), compared with `rows` as a set.
	dated_lines: (ctx, a) => {
		const labels = (a.labels as string[]).map((l) => l.toLowerCase());
		const best = sheetsFor(ctx, a.sheet).map((s) => {
			const got = s.rows.flatMap((row) => {
				const dateAt = row.findIndex((c) => asDate(c, Number(a.year)));
				if (dateAt < 0) return [];
				const label = row.map((c) => c.trim().toLowerCase()).find((c) => labels.includes(c));
				const amounts = row.flatMap((c, i) => (i === dateAt ? [] : [cents(c)])).filter((n): n is number => n !== undefined);
				const amount = amounts.at(-1);
				return label && amount !== undefined ? [`${asDate(row[dateAt]!, Number(a.year))} ${label} ${Math.abs(amount)}`] : [];
			});
			return compareRows(got, (a.rows as string[]).map((r) => r.toLowerCase()));
		});
		return best.find((r) => !r.missing.length && !r.extra.length) ?? best[0] ?? { missing: a.rows, extra: [] };
	},

	// Totals: for each label in `totals`, a row without a date whose text names it ("Groceries", "Total groceries") and
	// whose last number is the total (in cents, either sign). The labels not found that way.
	labeled_totals: (ctx, a) => {
		const totals = a.totals as Record<string, number>;
		const sheets = sheetsFor(ctx, a.sheet);
		const found = (label: string, want: number) =>
			sheets.some((s) =>
				s.rows.some((row) => {
					if (row.some((c) => asDate(c, Number(a.year)))) return false;
					if (!row.some((c) => c.toLowerCase().includes(label.toLowerCase()))) return false;
					const last = row.map(cents).filter((n): n is number => n !== undefined).at(-1);
					return last !== undefined && Math.abs(last) === want;
				})
			);
		return Object.entries(totals)
			.filter(([label, want]) => !found(label, want))
			.map(([label]) => label);
	},

	// A row naming `label` (e.g. "March") whose numbers include every one of `amounts` (cents), in the sheet named.
	row_with: (ctx, a) =>
		sheetsFor(ctx, a.sheet).some((s) =>
			s.rows.some((row) => {
				if (!row.some((c) => c.toLowerCase().includes(String(a.label).toLowerCase()))) return false;
				const nums = row.map(cents).filter((n): n is number => n !== undefined);
				return (a.amounts as number[]).every((n) => nums.includes(n));
			})
		),

	// Cells of a sheet's first `rows` rows the run changed or cleared (what was there before has to stay).
	cells_kept: (ctx, a, { made }) => {
		const t = workbookList(ctx).flatMap((w) => (w.title === a.workbook ? tabsOf(ctx, w.id) : [])).find((x) => x.name === a.tab);
		if (!t) return false;
		return made.filter((d) => d.site === SITE && d.table === 'cells').every((d) => d.missing.every((c) => c.tab !== t.id || Number(c.row) > Number(a.rows)));
	}
});
