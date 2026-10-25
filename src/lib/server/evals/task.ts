// A task: what the agent is asked (`ticket`), where it starts, the world it starts in, and how it's graded. Shaped
// after τ²-bench (end state, typed assertions, required facts, a reward that's the product of its parts) with
// WebArena's fields (sites, start page, possible).
//
// On disk a task is a folder, tasks/<family>/<name>/, in two parts:
// - prompt.md: what the agent is given. Front matter (`start`: a site, or a site and path like "orbelle/account";
//   `policy`; `known`; `followups`, later texts from the owner), then the ticket in the owner's words. Reword it
//   freely; grading doesn't read it.
// - eval.json: the rest, deterministic: the world it starts in (`sites`, `initial`) and how it's graded (`evaluation`).

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { OWNER, siteName } from '../ctx.ts';

const Call = z.object({ action: z.string(), args: z.record(z.string(), z.unknown()).default({}) });
export type Call = z.infer<typeof Call>;

// The owner texting again mid-run: what they say, and when, from what EverydayBench sees of the run. A harness polls the
// control port for the ones due and delivers them as new messages (see control/app.ts).
const When = z.union([
	z.object({ afterSeconds: z.number().positive() }).strict(),
	// The agent's browser loaded a page: "site:/path", matching that path and anything under it.
	z.object({ onPath: z.string().regex(/^[a-z]+:\/\S*$/) }).strict(),
	// The run wrote its first row to a table (a booking made, an order placed), on any site.
	z.object({ afterWrite: z.string() }).strict()
]);
const Followup = z.object({ text: z.string().min(1), when: When });
export type Followup = z.infer<typeof Followup>;

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
	// Later messages from the owner, in order: each is due once its `when` holds and the one before was delivered.
	followups: z.array(Followup).default([]),
	possible: z.boolean().default(true),
	// For splitting results (easy, medium, hard): how much reading, choosing and recovering the task takes.
	difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
	evaluation: z.object({
		// One way to do the task, as actions: replayed on a fresh world, it gives the end state to expect. The agent
		// doesn't have to take this path; it has to end in the same state. Empty means "change nothing".
		reference: z.array(Call).default([]),
		assertions: z.array(Assertion).default([]),
		// Facts the report must state (and mustn't); with `ordered`, the included ones in that order (times earliest first).
		answer: z
			.object({ include: z.array(z.string()).default([]), exclude: z.array(z.string()).default([]), ordered: z.boolean().default(false) })
			.default({ include: [], exclude: [], ordered: false }),
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

// prompt.md's front matter and ticket, as the fields Task has.
export function readPrompt(text: string) {
	const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
	if (!m) throw new Error('prompt.md starts with front matter between --- lines');
	const front = (parseYaml(m[1]!) ?? {}) as { start?: string; policy?: string; known?: Record<string, string>; followups?: unknown };
	if (!front.start) throw new Error('prompt.md needs a start site');
	const slash = front.start.indexOf('/');
	const start = slash < 0 ? { site: front.start } : { site: front.start.slice(0, slash), path: front.start.slice(slash) };
	return { ticket: m[2]!.trim(), start, policy: front.policy, known: front.known, followups: front.followups };
}

// Every task under tasks/, by id: tasks/tickets/two-seats/ is tickets/two-seats, family tickets.
export function loadTasks(dir = TASKS_DIR): Map<string, Task> {
	const out = new Map<string, Task>();
	const walk = (d: string) => {
		if (existsSync(join(d, 'prompt.md'))) {
			const id = relative(dir, d);
			try {
				const evaluation = JSON.parse(readFileSync(join(d, 'eval.json'), 'utf8'));
				const prompt = readPrompt(readFileSync(join(d, 'prompt.md'), 'utf8'));
				out.set(id, Task.parse({ ...evaluation, ...prompt, id, family: id.split('/')[0] }));
			} catch (err) {
				throw new Error(`${d}: ${(err as Error).message}`);
			}
			return;
		}
		for (const e of readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) walk(join(d, e.name));
	};
	walk(dir);
	return out;
}

// What a harness hands its agent, whole: the ticket, the rules, where the browser is, and who the owner is (for a site
// that asks). `known` isn't in it: a harness puts those in its vault, or adds them itself. Nor are `followups`: they
// come later, from the control port.
export const promptFor = (t: Task) =>
	[t.ticket, t.policy && `Rules: ${t.policy}`, `${siteName(t.start.site)} is open in the browser.`, `If a site asks who I am: ${OWNER.name}, ${OWNER.email}.`]
		.filter(Boolean)
		.join('\n\n');
