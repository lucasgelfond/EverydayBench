// A task: what the agent is asked (`ticket`), where it starts, the world it starts in, and how it's graded. Shaped
// after τ²-bench (end state, typed assertions, required facts, a reward that's the product of its parts) with
// WebArena's fields (sites, start page, possible).

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { z } from 'zod';

const Call = z.object({ action: z.string(), args: z.record(z.string(), z.unknown()).default({}) });
export type Call = z.infer<typeof Call>;

const Assertion = z.object({
	fn: z.string(),
	args: z.record(z.string(), z.unknown()).default({}),
	expect: z.unknown().default(true),
	// Safety assertions are reported apart from the rest (a cap respected, nothing substituted).
	safety: z.boolean().default(false),
	message: z.string().optional()
});
export type Assertion = z.infer<typeof Assertion>;

export const Task = z.object({
	id: z.string(),
	version: z.number().int().default(1),
	family: z.string(),
	sites: z.array(z.string()).min(1),
	// What the agent is asked, in the owner's words.
	ticket: z.string(),
	// The site the browser opens on (its home page, or a path on it).
	start: z.object({ site: z.string(), path: z.string().default('/') }),
	initial: z.object({
		scenario: z.string(),
		clock: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/),
		seed: z.string().optional(),
		// Actions run before the agent starts (an email already sent, a seat already gone).
		setup: z.array(Call).default([])
	}),
	// Rules the agent is given alongside the ticket (a spending cap, what it may not do).
	policy: z.string().optional(),
	// What the agent knows that the ticket doesn't say: logins, cards to type. A harness can put these in a vault.
	known: z.record(z.string(), z.string()).default({}),
	possible: z.boolean().default(true),
	evaluation: z.object({
		// One way to do the task, as actions: replayed on a fresh world, it gives the end state to expect. The agent
		// doesn't have to take this path; it has to end in the same state. Empty means "change nothing".
		reference: z.array(Call).default([]),
		assertions: z.array(Assertion).default([]),
		answer: z.object({ include: z.array(z.string()).default([]), exclude: z.array(z.string()).default([]) }).default({ include: [], exclude: [] }),
		// Columns a run may change freely, as "table.column" (or "site:table.column"), beyond the defaults.
		ignore: z.array(z.string()).default([]),
		basis: z.array(z.enum(['STATE', 'ASSERT', 'ANSWER'])).default(['STATE', 'ASSERT', 'ANSWER'])
	}),
	tags: z.array(z.string()).default([]),
	// Known problems with the task, kept with it.
	issues: z.array(z.string()).default([])
});
export type Task = z.infer<typeof Task>;

export const TASKS_DIR = resolve(process.env.EVERYDAYBENCH_TASKS ?? 'tasks');

// Every task under tasks/, by id; a file's id must match its path (tasks/tickets/two-seats.json -> tickets/two-seats).
export function loadTasks(dir = TASKS_DIR): Map<string, Task> {
	const out = new Map<string, Task>();
	const walk = (d: string) => {
		for (const e of readdirSync(d, { withFileTypes: true })) {
			const p = join(d, e.name);
			if (e.isDirectory()) walk(p);
			else if (e.name.endsWith('.json')) {
				const task = Task.parse(JSON.parse(readFileSync(p, 'utf8')));
				const id = relative(dir, p).slice(0, -5);
				if (task.id !== id) throw new Error(`${p}: id should be "${id}"`);
				out.set(task.id, task);
			}
		}
	};
	walk(dir);
	return out;
}
