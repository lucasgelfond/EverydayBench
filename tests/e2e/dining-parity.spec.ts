import { expect, test } from '@playwright/test';
import { origin } from './everydaybench.ts';
import { createRun, deleteRun } from '../../src/lib/server/runs.ts';
import { ctxFor } from '../../src/lib/server/ctx.ts';
import { search } from '../../src/lib/server/dining.ts';
import { SITES } from '../../src/lib/sites.ts';
import { clock } from '../../src/lib/time.ts';

// Sibling reservations sites differ only in look and wording: the same errand takes the same steps on each. The errand:
// a table for two tomorrow near 7 PM at the first restaurant (by name) that has one.
const counts: Record<string, number> = {};
test.describe.configure({ mode: 'serial' });

for (const site of ['tablenook', 'seatwell']) {
	test(`${site}: a table for two tomorrow evening`, async ({ page }) => {
		const run = createRun({ scenario: 'tickets-v1', clock: '2026-03-14T10:00:00', id: `parity-${site}-${Date.now().toString(36)}` });
		const ctx = ctxFor(run);
		// What the search shows: the first restaurant with a time, and its first time.
		const hit = search(ctx, site, { date: '2026-03-15', time: '19:00', party: 2, area: '', cuisine: '' }).find((h) => h.times.length)!;
		const [r, at] = [hit.restaurant, hit.times[0]!];
		let n = 0;
		try {
			await page.goto(`${origin(site)}/?everydaybench_run=${run.id}`);
			await (n++, page.getByLabel('Date').selectOption('2026-03-15'));
			await (n++, page.getByLabel('Time').selectOption('19:00'));
			await (n++, page.getByRole('button', { name: SITES[site]!.skin.words.findTable! }).click());
			await (n++, page.getByRole('article', { name: r.name }).getByRole('link', { name: clock(at) }).click());
			await (n++, page.getByLabel('Name for the reservation').fill('Sam Rivera'));
			await (n++, page.getByLabel('Email').fill('sam@mailmoss.test'));
			await (n++, page.getByRole('button', { name: SITES[site]!.skin.words.reserve! }).click());
			await expect(page.getByRole('heading', { name: 'Reservation confirmed' })).toBeVisible();
			counts[site] = n;
		} finally {
			deleteRun(run.id);
		}
	});
}

test('both sites took the same number of steps', () => {
	expect(Object.keys(counts)).toHaveLength(2);
	expect(new Set(Object.values(counts)).size, JSON.stringify(counts)).toBe(1);
});
