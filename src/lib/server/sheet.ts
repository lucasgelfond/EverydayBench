// Gridwhistle's reads: a sheet's cells as a grid, with formulas worked out. Formulas are what people type for totals:
// numbers, cell references, + - * /, parentheses, and SUM over ranges or cells ("=SUM(B2:B9)", "=B2+C2", "=E2/2").
// Pages show the results; graders read them, so a total typed as a formula counts the same as one typed as a number.

import { asc, eq } from 'drizzle-orm';
import { cells, tabs, workbooks } from './schema.ts';
import type { Ctx } from './ctx.ts';
import { parseAddress } from '../sheet.ts';

export const SITE = 'gridwhistle';

export type Raw = Map<string, string>;
const key = (row: number, col: number) => `${row}:${col}`;

export const workbookList = (ctx: Ctx) => ctx.db(SITE).select().from(workbooks).orderBy(asc(workbooks.createdAt), asc(workbooks.title)).all();
export const workbookById = (ctx: Ctx, id: string) => ctx.db(SITE).select().from(workbooks).where(eq(workbooks.id, id)).get();
export const tabsOf = (ctx: Ctx, workbook: string) => ctx.db(SITE).select().from(tabs).where(eq(tabs.workbook, workbook)).orderBy(asc(tabs.position)).all();

export function rawCells(ctx: Ctx, tab: number): Raw {
	const out: Raw = new Map();
	for (const c of ctx.db(SITE).select().from(cells).where(eq(cells.tab, tab)).all()) out.set(key(c.row, c.col), c.value);
	return out;
}

// A number typed the way people type money: "1,234.50", "$12", "-3", "(40.00)".
export function asNumber(s: string): number | undefined {
	const t = s.trim().replace(/[$,\s]/g, '');
	const neg = /^\(.*\)$/.test(t);
	const n = neg ? t.slice(1, -1) : t;
	if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(n)) return undefined;
	return neg ? -Number(n) : Number(n);
}

type Value = number | string;
const ERROR = '#ERROR!';

// Every cell's value: its text, or its formula's result (a number, or #ERROR! for one that doesn't work out, including
// one that refers to itself).
export function evaluate(raw: Raw): Map<string, Value> {
	const done = new Map<string, Value>();
	const busy = new Set<string>();
	const valueOf = (row: number, col: number): Value => {
		const k = key(row, col);
		if (done.has(k)) return done.get(k)!;
		const text = raw.get(k) ?? '';
		if (!text.startsWith('=')) return text;
		if (busy.has(k)) return ERROR;
		busy.add(k);
		let v: Value;
		try {
			v = formula(text.slice(1), valueOf);
		} catch {
			v = ERROR;
		}
		busy.delete(k);
		done.set(k, v);
		return v;
	};
	const out = new Map<string, Value>();
	for (const k of raw.keys()) {
		const [row, col] = k.split(':').map(Number) as [number, number];
		out.set(k, valueOf(row, col));
	}
	return out;
}

// A recursive-descent parser over the formula's tokens.
function formula(src: string, valueOf: (row: number, col: number) => Value): number {
	const tokens = src.match(/\$?[A-Za-z]+\$?\d+(?::\$?[A-Za-z]+\$?\d+)?|[A-Za-z]+(?=\s*\()|\d+\.?\d*|\.\d+|[-+*/(),]/g) ?? [];
	if (tokens.join('') !== src.replace(/\s+/g, '')) throw new Error('bad formula');
	let i = 0;
	const peek = () => tokens[i];
	const next = () => tokens[i++];
	const num = (v: Value) => {
		if (typeof v === 'number') return v;
		if (v === ERROR) throw new Error(ERROR);
		return asNumber(v) ?? 0;
	};
	const range = (t: string) => {
		const [a, b] = t.split(':');
		const from = parseAddress(a!);
		const to = parseAddress(b ?? a!);
		if (!from || !to) throw new Error('bad reference');
		const out: number[] = [];
		for (let r = Math.min(from.row, to.row); r <= Math.max(from.row, to.row); r++)
			for (let c = Math.min(from.col, to.col); c <= Math.max(from.col, to.col); c++) out.push(num(valueOf(r, c)));
		return out;
	};
	const expr = (): number => {
		let v = term();
		while (peek() === '+' || peek() === '-') v = next() === '+' ? v + term() : v - term();
		return v;
	};
	const term = (): number => {
		let v = factor();
		while (peek() === '*' || peek() === '/') {
			if (next() === '*') v *= factor();
			else {
				const d = factor();
				if (d === 0) throw new Error('#DIV/0!');
				v /= d;
			}
		}
		return v;
	};
	const factor = (): number => {
		const t = next();
		if (t === undefined) throw new Error('unexpected end');
		if (t === '-') return -factor();
		if (t === '+') return factor();
		if (t === '(') {
			const v = expr();
			if (next() !== ')') throw new Error('missing )');
			return v;
		}
		if (/^[A-Za-z]+$/.test(t)) {
			if (t.toUpperCase() !== 'SUM' || next() !== '(') throw new Error(`unknown function ${t}`);
			let total = 0;
			for (;;) {
				const arg = peek();
				total += arg && /^\$?[A-Za-z]+\$?\d+/.test(arg) && (tokens[i + 1] === ',' || tokens[i + 1] === ')') ? range(next()!).reduce((a, b) => a + b, 0) : expr();
				const sep = next();
				if (sep === ')') return total;
				if (sep !== ',') throw new Error('expected , or )');
			}
		}
		if (/^\d|^\./.test(t)) return Number(t);
		return range(t).reduce((a, b) => a + b, 0);
	};
	const v = expr();
	if (i !== tokens.length) throw new Error('trailing input');
	return v;
}

// How a value shows: numbers without float noise (0.1 + 0.2 is 0.3).
export const shown = (v: Value) => (typeof v === 'number' ? String(Math.round(v * 1e9) / 1e9) : v);

// A sheet as rows of shown values, from row 1 and column A to the last filled cell (empty cells are "").
export function grid(ctx: Ctx, tab: number): string[][] {
	const raw = rawCells(ctx, tab);
	const values = evaluate(raw);
	let rows = 0;
	let cols = 0;
	for (const [k, v] of raw) {
		if (!v.trim()) continue;
		const [r, c] = k.split(':').map(Number) as [number, number];
		rows = Math.max(rows, r);
		cols = Math.max(cols, c);
	}
	return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => shown(values.get(key(r + 1, c + 1)) ?? '')));
}

// The sheets whose workbook title or tab name contains `has` (any case), each as its grid.
export function sheetsNamed(ctx: Ctx, has: string) {
	const want = has.toLowerCase();
	return workbookList(ctx).flatMap((w) =>
		tabsOf(ctx, w.id)
			.filter((t) => w.title.toLowerCase().includes(want) || t.name.toLowerCase().includes(want))
			.map((t) => ({ workbook: w.title, tab: t.name, rows: grid(ctx, t.id) }))
	);
}
