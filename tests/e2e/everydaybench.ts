// Helpers for browser tests: start a task's run, open its sites in that run, count what the test does (for click
// parity between sibling sites), and grade the run with the task's own evaluation.

import type { Locator, Page } from '@playwright/test';
import { loadTasks } from '../../src/lib/server/evals/task.ts';
import { grade, startTask } from '../../src/lib/server/evals/evaluate.ts';

export const tasks = loadTasks();
export const origin = (site: string) => `http://${site}.everydaybench.test:8700`;

export function begin(page: Page, id: string) {
	const task = tasks.get(id);
	if (!task) throw new Error(`no task ${id}`);
	const run = startTask(task);
	let n = 0;
	return {
		run,
		task,
		// Opens a site in this run (the first visit sets the run's cookie for every site).
		go: (site: string, path = '/') => page.goto(`${origin(site)}${path}${path.includes('?') ? '&' : '?'}everydaybench_run=${run.id}`),
		click: async (l: Locator) => (n++, l.click()),
		fill: async (l: Locator, v: string) => (n++, l.fill(v)),
		select: async (l: Locator, v: string) => (n++, l.selectOption(v)),
		get interactions() {
			return n;
		},
		grade: (report: string) => grade(task, run.id, report)
	};
}
