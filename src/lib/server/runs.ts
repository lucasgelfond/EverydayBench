// A run is one attempt at a task: every site's database copied from the scenario's seeds, a clock, and a seed for
// whatever the sites make up. Runs live on disk (runs/<id>/) so the site server and the control server share them.

import { appendFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { closeDb, openDb } from './db.ts';
import { code } from './rand.ts';
import { fromMs, toMs } from '../time.ts';

export const DATA = resolve(process.env.EVERYDAYBENCH_DATA ?? 'runs');
export const SEEDS = resolve(process.env.EVERYDAYBENCH_SEEDS ?? 'seeds');

export interface Run {
	id: string;
	scenario: string;
	task?: string;
	seed: string;
	// The run's local time when it was created; it then moves with real time, plus any jump the control port makes.
	clock: string;
	createdAt: number;
	offsetMs: number;
	conditions?: Conditions;
	// Pages ("site:/path" and under) whose loads are noted, for follow-ups that wait on them.
	watch?: string[];
}

// How a run's sites behave, beyond the task: every response this much slower, and pages without
// aria-label (for agents that should work from pixels, or to see how much an agent leans on them).
export interface Conditions {
	latencyMs?: number;
	hideAria?: boolean;
}

// A run's folder: its databases, run.json, and anything else kept per run (injections.json).
export const runDir = (id: string) => join(DATA, id);
const dir = runDir;
const file = (id: string) => join(dir(id), 'run.json');

// Runs are read on each request, so a clock jump from the control server shows at once; cached by file time.
const cache = new Map<string, { mtime: number; run: Run }>();

export function getRun(id: string): Run | undefined {
	if (!/^[\w-]+$/.test(id)) return undefined;
	const path = file(id);
	if (!existsSync(path)) return undefined;
	const mtime = statSync(path).mtimeMs;
	const hit = cache.get(id);
	if (hit?.mtime === mtime) return hit.run;
	const run = JSON.parse(readFileSync(path, 'utf8')) as Run;
	cache.set(id, { mtime, run });
	return run;
}

const save = (run: Run) => writeFileSync(file(run.id), JSON.stringify(run, null, 2));

export function createRun({
	scenario,
	clock,
	seed,
	task,
	id,
	conditions,
	watch
}: {
	scenario: string;
	clock: string;
	seed?: string;
	task?: string;
	id?: string;
	conditions?: Conditions;
	watch?: string[];
}): Run {
	const from = join(SEEDS, scenario);
	if (!existsSync(from)) throw new Error(`no seeds for scenario ${scenario} (run the seed script)`);
	const run: Run = { id: id ?? `r${Date.now().toString(36)}${code(4, Math.random())}`.toLowerCase(), scenario, task, seed: seed ?? scenario, clock, createdAt: Date.now(), offsetMs: 0, ...(conditions && { conditions }), ...(watch?.length && { watch }) };
	if (existsSync(dir(run.id))) deleteRun(run.id);
	mkdirSync(dir(run.id), { recursive: true });
	for (const f of readdirSync(from)) if (f.endsWith('.db')) copyFileSync(join(from, f), join(dir(run.id), f));
	save(run);
	return run;
}

export function deleteRun(id: string) {
	if (!existsSync(dir(id))) return;
	for (const f of readdirSync(dir(id))) if (f.endsWith('.db')) closeDb(join(dir(id), f));
	rmSync(dir(id), { recursive: true, force: true });
	cache.delete(id);
}

export const runSites = (run: Run) => readdirSync(dir(run.id)).filter((f) => f.endsWith('.db')).map((f) => f.slice(0, -3));

export function siteDb(run: Run, site: string) {
	const path = join(dir(run.id), `${site}.db`);
	if (!existsSync(path)) throw new Error(`run ${run.id} has no ${site} database`);
	return openDb(path);
}

// The run's local time now.
export const now = (run: Run) => fromMs(toMs(run.clock) + (Date.now() - run.createdAt) + run.offsetMs);

export function advance(run: Run, minutes: number) {
	const next = { ...run, offsetMs: run.offsetMs + minutes * 60_000 };
	save(next);
	return next;
}

// Page loads the run watches for, one "site:/path" a line. The site server writes them; the control server reads them.
const visitsFile = (id: string) => join(dir(id), 'visits.log');
// "tablenook:/book" covers "tablenook:/book" and "tablenook:/book/…", not "tablenook:/booking".
const under = (w: string, at: string) => at === w || at.startsWith(w.endsWith('/') ? w : `${w}/`);

export function noteVisit(run: Run, site: string, path: string) {
	const at = `${site}:${path.replace(/\/__data\.json$/, '') || '/'}`;
	if (run.watch?.some((w) => under(w, at))) appendFileSync(visitsFile(run.id), `${at}\n`);
}

export const visited = (run: Run, w: string) => existsSync(visitsFile(run.id)) && readFileSync(visitsFile(run.id), 'utf8').split('\n').some((at) => at && under(w, at));
