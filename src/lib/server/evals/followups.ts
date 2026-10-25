// A task's follow-ups: the owner texting again mid-run ("wait, make it 4 people"). Each is due once its `when` holds
// (seconds since the run began, a page the agent's browser loaded, a first write to a table) and the one before it
// was handed out, and it's handed out once. What's been handed out is kept in the run's folder, so a harness can poll.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runDir, visited, type Run } from '../runs.ts';
import { changes } from './evaluate.ts';
import type { Followup, Task } from './task.ts';

const file = (run: Run) => join(runDir(run.id), 'followups.json');
const delivered = (run: Run): number => (existsSync(file(run)) ? (JSON.parse(readFileSync(file(run), 'utf8')) as number) : 0);

function holds(task: Task, run: Run, { when }: Followup) {
	if ('afterSeconds' in when) return Date.now() - run.createdAt >= when.afterSeconds * 1000;
	if ('onPath' in when) return visited(run, when.onPath);
	return changes(task, run).some((d) => d.table === when.afterWrite && d.extra.length > 0);
}

// The follow-ups due now, in order, each with its index as an id; they're marked handed out.
export function dueFollowups(task: Task, run: Run) {
	const from = delivered(run);
	let to = from;
	while (to < task.followups.length && holds(task, run, task.followups[to]!)) to++;
	if (to > from) writeFileSync(file(run), JSON.stringify(to));
	return task.followups.slice(from, to).map((f, i) => ({ id: from + i, text: f.text }));
}
