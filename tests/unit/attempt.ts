// A run of a task where `act` stands in for the agent (its result's `code`, if any, goes in the report), graded.

import { ctxFor, type Ctx } from '../../src/lib/server/ctx.ts';
import { deleteRun } from '../../src/lib/server/runs.ts';
import { call } from '../../src/lib/server/evals/registry.ts';
import { grade, startTask } from '../../src/lib/server/evals/evaluate.ts';
import { loadTasks } from '../../src/lib/server/evals/task.ts';

export const tasks = loadTasks();

export function attempt(id: string, act: (ctx: Ctx) => unknown, report: (code: string) => string = (c) => `Done: ${c}`) {
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

// The task's reference solution, done by the "agent".
export const reference = (id: string) => (ctx: Ctx) => tasks.get(id)!.evaluation.reference.map((c) => call(ctx, c.action, c.args)).at(-1);
