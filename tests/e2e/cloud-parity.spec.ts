import { expect, test } from '@playwright/test';
import { origin } from './everydaybench.ts';
import { createRun, deleteRun } from '../../src/lib/server/runs.ts';

// Sibling consoles differ only in look: the same errand takes the same steps on each. The errand: sign in, add $10 of
// credit with the card on file, and open the first server.
const counts: Record<string, number> = {};
test.describe.configure({ mode: 'serial' });

for (const [site, password, server] of [
	['cloudpail', 'bucket-brigade-44', 'db-backup'],
	['voltbarrow', 'spark-gap-1912', 'finetune-a']
] as const) {
	test(`${site}: sign in, add credit, open a server`, async ({ page }) => {
		const run = createRun({ scenario: 'tickets-v1', clock: '2026-03-14T10:00:00', id: `parity-${site}-${Date.now().toString(36)}` });
		let n = 0;
		const click = async (l: ReturnType<typeof page.getByRole>) => (n++, l.click());
		const fill = async (l: ReturnType<typeof page.getByLabel>, v: string) => (n++, l.fill(v));
		try {
			await page.goto(`${origin(site)}/account/sign-in?everydaybench_run=${run.id}`);
			await fill(page.getByLabel('Email'), 'sam@mailmoss.test');
			await fill(page.getByLabel('Password'), password);
			await click(page.getByRole('button', { name: 'Sign in' }));
			await click(page.getByRole('link', { name: 'Billing' }));
			await click(page.getByLabel('$10.00'));
			await click(page.getByRole('button', { name: 'Add credit' }));
			await expect(page.getByRole('status')).toContainText('Credit added');
			await click(page.getByRole('link', { name: 'Servers' }));
			await click(page.getByRole('link', { name: server }));
			await expect(page.getByRole('heading', { name: server })).toBeVisible();
			counts[site] = n;
		} finally {
			deleteRun(run.id);
		}
	});
}

test('both consoles took the same number of steps', () => {
	expect(Object.keys(counts)).toHaveLength(2);
	expect(new Set(Object.values(counts)).size, JSON.stringify(counts)).toBe(1);
});
