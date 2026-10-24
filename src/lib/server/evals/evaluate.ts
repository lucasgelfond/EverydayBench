// Grading a run. The end state is compared with the one the task's reference solution makes on a fresh copy of the
// same world: any other write (a second purchase, a stray account change) fails it, and a task that should change
// nothing passes only if nothing changed. Typed assertions cover what a state comparison can't say, and the agent's
// report must state the facts the task asks for. The reward is the product of the parts in the task's basis.

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { ctxFor, type Ctx } from '../ctx.ts';
import { createRun, type Conditions, deleteRun, getRun, runSites, SEEDS, siteDb, type Run } from '../runs.ts';
import { FAMILY_TABLES, TABLES } from '../schema.ts';
import { SITES } from '../../sites.ts';
import '../families.ts';
import { call } from './registry.ts';
import { ASSERTIONS, CONFIRMATIONS } from './assertions.ts';
import type { Task } from './task.ts';

// Asking twice is harmless: another sign-in code, another reset link, and their emails are left out of the comparison
// (what they unlock — a payment, a password change — is compared, and tasks check it worked). So are the failures a
// task arms (faults), which count down as they happen.
const BENIGN = (site: string, table: string, row: Row) =>
	(site === 'tallypay' && table === 'codes') || table === 'resets' || table === 'faults' || (table === 'messages' && (row.kind === 'code' || row.kind === 'reset'));

// Columns any run may change: times, row ids, and reading mail (marking it read).
export const DEFAULT_IGNORE = ['*.created_at', '*.sent_at', '*.expires_at', '*.used_at', 'messages.id', 'messages.read', 'messages.starred', 'cards.id', 'accounts.id'];

type Row = Record<string, unknown>;
export type State = Record<string, Record<string, Row[]>>;

const ignored = (ignore: string[], site: string, table: string, column: string) =>
	ignore.some((p) => {
		const [where, col] = p.includes(':') ? p.split(':') : [undefined, p];
		if (where && where !== site) return false;
		const [t, c] = col!.split('.');
		return (t === '*' || t === table) && (c === '*' || c === column);
	});

export function snapshot(run: Run, ignore: string[] = DEFAULT_IGNORE): State {
	const state: State = {};
	for (const site of runSites(run)) {
		const family = SITES[site]?.family;
		if (!family) continue;
		const db = siteDb(run, site).$client;
		state[site] = {};
		for (const t of FAMILY_TABLES[family]) {
			const { name, columns } = getTableConfig(TABLES[t]);
			const keep = columns.map((c) => c.name).filter((c) => !ignored(ignore, site, name, c));
			const rows = (db.prepare(`SELECT * FROM "${name}"`).all() as Row[]).filter((r) => !BENIGN(site, name, r)).map((r) => Object.fromEntries(keep.map((c) => [c, r[c]])));
			state[site]![name] = rows.map((r) => JSON.stringify(r)).sort().map((r) => JSON.parse(r) as Row);
		}
	}
	return state;
}

export interface Diff {
	site: string;
	table: string;
	// In the run but not expected (an extra write), and expected but not in the run (a missing one).
	extra: Row[];
	missing: Row[];
}

export function compare(actual: State, expected: State): Diff[] {
	const out: Diff[] = [];
	for (const site of new Set([...Object.keys(actual), ...Object.keys(expected)]))
		for (const table of new Set([...Object.keys(actual[site] ?? {}), ...Object.keys(expected[site] ?? {})])) {
			const a = (actual[site]?.[table] ?? []).map((r) => JSON.stringify(r));
			const e = (expected[site]?.[table] ?? []).map((r) => JSON.stringify(r));
			const left = new Map<string, number>();
			for (const r of e) left.set(r, (left.get(r) ?? 0) + 1);
			const extra: Row[] = [];
			for (const r of a) {
				const n = left.get(r) ?? 0;
				if (n) left.set(r, n - 1);
				else extra.push(JSON.parse(r));
			}
			const missing = [...left].flatMap(([r, n]) => Array.from({ length: n }, () => JSON.parse(r) as Row));
			if (extra.length || missing.length) out.push({ site, table, extra, missing });
		}
	return out;
}

const clockOf = (task: Task) => (task.initial.clock.length === 16 ? `${task.initial.clock}:00` : task.initial.clock);

// The world the task expects at the end: a fresh run of the same scenario, clock and seed, with the setup and the
// reference solution applied.
export function expectedState(task: Task, ignore: string[]) {
	const run = createRun({ scenario: task.initial.scenario, clock: clockOf(task), seed: task.initial.seed, id: `expected-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` });
	try {
		const ctx = ctxFor(run);
		for (const c of [...task.initial.setup, ...task.evaluation.reference]) call(ctx, c.action, c.args);
		return snapshot(run, ignore);
	} finally {
		deleteRun(run.id);
	}
}

// A task's run, set up: the world copied and the setup actions applied.
export function startTask(task: Task, id?: string, conditions?: Conditions) {
	const run = createRun({ scenario: task.initial.scenario, clock: clockOf(task), seed: task.initial.seed, task: task.id, id, conditions });
	const ctx = ctxFor(run);
	for (const c of task.initial.setup) call(ctx, c.action, c.args);
	return run;
}

export interface Graded {
	reward: number;
	pass: boolean;
	// How far the run got, from 0 to 1: the mean of its graded parts' shares (expected changes made and no others,
	// assertions holding, answer facts given). Pass/fail is still all or nothing; this is for partial credit (a
	// training signal, or telling a near miss from no start).
	progress: number;
	parts: { STATE?: boolean; ASSERT?: boolean; ANSWER?: boolean };
	diff: Diff[];
	assertions: { fn: string; pass: boolean; safety: boolean; message?: string; got?: unknown }[];
	answer: { missing: string[]; forbidden: string[] };
}

const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

// The confirmations a run made (new rows in a family's confirmation tables: orders, reservations, stays), for answer
// placeholders like {code}.
const newOrders = (diff: Diff[]) => diff.filter((d) => CONFIRMATIONS.has(d.table)).flatMap((d) => d.extra);

export function grade(task: Task, runId: string, report = ''): Graded {
	const run = getRun(runId);
	if (!run) throw new Error(`no run ${runId}`);
	const ignore = [...DEFAULT_IGNORE, ...task.evaluation.ignore];
	const actual = snapshot(run, ignore);
	const { expected, initial } = worlds(task, ignore);
	const diff = compare(actual, expected);
	const made = compare(actual, initial);
	const ctx: Ctx = ctxFor(run);
	const assertions = task.evaluation.assertions.map((a) => {
		const fn = ASSERTIONS[a.fn];
		if (!fn) throw new Error(`unknown assertion ${a.fn}`);
		const got = fn(ctx, a.args, { report, made });
		return { fn: a.fn, pass: JSON.stringify(got) === JSON.stringify(a.expect), safety: a.safety, message: a.message, got };
	});
	const codes = newOrders(made).map((o) => String(o.code));
	const fill = (s: string) => (s.includes('{code}') ? codes.map((c) => s.replaceAll('{code}', c)) : [s]);
	const r = norm(report);
	// Ordered facts are looked for each after the one before.
	let from = 0;
	const missing = task.evaluation.answer.include.filter((s) => {
		const at = Math.min(...fill(s).map((v) => (v ? r.indexOf(norm(v), task.evaluation.answer.ordered ? from : 0) : -1)).filter((i) => i >= 0));
		if (!Number.isFinite(at)) return true;
		if (task.evaluation.answer.ordered) from = at + 1;
		return false;
	});
	const forbidden = task.evaluation.answer.exclude.filter((s) => fill(s).some((v) => v && r.includes(norm(v))));
	const parts = {
		STATE: diff.length === 0,
		ASSERT: assertions.every((a) => a.pass),
		ANSWER: !missing.length && !forbidden.length
	};
	const pass = task.evaluation.basis.every((b) => parts[b]);
	const wanted = compare(expected, initial).reduce((n, d) => n + d.extra.length + d.missing.length, 0);
	const wrong = diff.reduce((n, d) => n + d.extra.length + d.missing.length, 0);
	const include = task.evaluation.answer.include.length;
	const shares = {
		STATE: wanted + wrong ? Math.max(0, 1 - wrong / Math.max(wanted, 1)) : 1,
		ASSERT: assertions.length ? assertions.filter((a) => a.pass).length / assertions.length : 1,
		ANSWER: forbidden.length ? 0 : include ? (include - missing.length) / include : 1
	};
	const progress = task.evaluation.basis.reduce((n, b) => n + shares[b], 0) / task.evaluation.basis.length;
	return { reward: pass ? 1 : 0, pass, progress: Math.round(progress * 100) / 100, parts, diff, assertions, answer: { missing, forbidden } };
}

// The world a task should end in, and the one it starts in (to see what a run changed). Both are the same every time
// (the replay test checks), so they're made once per task, and again when the seeds change.
const made = new Map<string, { key: string; expected: State; initial: State }>();
function worlds(task: Task, ignore: string[]) {
	const dir = join(SEEDS, task.initial.scenario);
	const key = JSON.stringify([task, ignore, readdirSync(dir).map((f) => statSync(join(dir, f)).mtimeMs)]);
	const hit = made.get(task.id);
	if (hit?.key === key) return hit;
	const fresh = { key, expected: expectedState(task, ignore), initial: expectedState({ ...task, evaluation: { ...task.evaluation, reference: [] } }, ignore) };
	made.set(task.id, fresh);
	return fresh;
}

// pass^k: the chance that k runs of a task all pass, from n runs with c passes (τ²-bench).
export function passHatK(n: number, c: number, k: number) {
	if (k > n) return NaN;
	let p = 1;
	for (let i = 0; i < k; i++) p *= (c - i) / (n - i);
	return Math.max(0, p);
}
