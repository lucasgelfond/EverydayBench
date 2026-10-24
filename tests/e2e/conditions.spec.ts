import { expect, test } from '@playwright/test';
import { origin, tasks } from './everydaybench.ts';
import { startTask } from '../../src/lib/server/evals/evaluate.ts';

// A run's conditions: the same task with no aria-label anywhere, and with every response slowed.
test('a run without aria labels serves its seat map without them, and a slow run is slow', async ({ page }) => {
	const task = tasks.get('tickets/lumiscope-named-seats')!;
	const plain = startTask(task, undefined, { hideAria: true, latencyMs: 600 });
	const seats = `/showtimes/lumiscope-harborview-last-lighthouse-20260315-1845`;

	const started = Date.now();
	await page.goto(`${origin('lumiscope')}${seats}?everydaybench_run=${plain.id}`);
	const ms = Date.now() - started;

	await expect(page.getByRole('link', { name: 'Row E, seat 13, available' })).toHaveCount(0);
	expect(await page.locator('[aria-label]').count()).toBe(0);
	expect(ms).toBeGreaterThanOrEqual(600);

	const normal = startTask(task);
	await page.goto(`${origin('lumiscope')}${seats}?everydaybench_run=${normal.id}`);
	await expect(page.getByRole('link', { name: 'Row E, seat 13, available' })).toHaveCount(1);
});
