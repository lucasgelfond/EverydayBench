// The control port: what a harness uses to run tasks. It's served apart from the sites, on a port the agent's browser
// never reaches, so an agent can't read a task's answers or reset its world.
//   GET  /tasks                    the tasks
//   GET  /tasks/<id>               one task, as written
//   POST /runs        {task, id?, conditions?}  start a run (conditions: {latencyMs, hideAria}): { run, start (URL with the run token), prompt, known, ticket, policy }
//   POST /runs/<id>/grade {report} grade it
//   POST /runs/<id>/clock {minutes} move its clock forward (a restock "tomorrow morning")
//   GET  /runs/<id>/state          every site's rows
//   DELETE /runs/<id>

import { Hono } from 'hono';
import { ORIGIN } from '../src/lib/server/ctx.ts';
import { advance, deleteRun, getRun, type Conditions } from '../src/lib/server/runs.ts';
import { grade, snapshot, startTask } from '../src/lib/server/evals/evaluate.ts';
import { loadTasks, promptFor } from '../src/lib/server/evals/task.ts';

const tasks = loadTasks();
const task = (id: string) => tasks.get(id);

export const control = new Hono()
	.get('/health', (c) => c.json({ ok: true, tasks: tasks.size }))
	.get('/tasks', (c) => c.json([...tasks.values()].map(({ id, ticket, sites, tags, start, possible, difficulty }) => ({ id, ticket, sites, tags, start, possible, difficulty }))))
	.get('/tasks/*', (c) => {
		const t = task(c.req.path.slice('/tasks/'.length));
		return t ? c.json(t) : c.json({ error: 'no such task' }, 404);
	})
	.post('/runs', async (c) => {
		const body = await c.req.json<{ task: string; id?: string; conditions?: Conditions }>();
		const t = task(body.task);
		if (!t) return c.json({ error: `no task ${body.task}` }, 404);
		const run = startTask(t, body.id, body.conditions);
		const start = `${ORIGIN.replace('{site}', t.start.site)}${t.start.path}${t.start.path.includes('?') ? '&' : '?'}everydaybench_run=${run.id}`;
		return c.json({ run: run.id, start, prompt: promptFor(t), ticket: t.ticket, policy: t.policy, known: t.known, sites: t.sites }, 201);
	})
	.post('/runs/:id/grade', async (c) => {
		const run = getRun(c.req.param('id'));
		if (!run?.task) return c.json({ error: 'no such run' }, 404);
		const { report = '' } = await c.req.json<{ report?: string }>().catch(() => ({ report: '' }));
		return c.json({ run: run.id, task: run.task, ...grade(task(run.task)!, run.id, report) });
	})
	.post('/runs/:id/clock', async (c) => {
		const run = getRun(c.req.param('id'));
		if (!run) return c.json({ error: 'no such run' }, 404);
		const { minutes } = await c.req.json<{ minutes: number }>();
		return c.json(advance(run, Number(minutes)));
	})
	.get('/runs/:id/state', (c) => {
		const run = getRun(c.req.param('id'));
		return run ? c.json(snapshot(run)) : c.json({ error: 'no such run' }, 404);
	})
	.delete('/runs/:id', (c) => (deleteRun(c.req.param('id')), c.body(null, 204)));
