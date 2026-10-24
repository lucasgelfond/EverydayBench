import { expect, test } from '@playwright/test';
import { origin } from './everydaybench.ts';
import { createRun, deleteRun } from '../../src/lib/server/runs.ts';
import { SITES } from '../../src/lib/sites.ts';

// Sibling stores differ only in look and wording: the same errand takes the same steps on each. The errand: a guest
// searches, adds two things, changes a quantity, and checks out with a typed address and card.
const counts: Record<string, number> = {};
test.describe.configure({ mode: 'serial' });

for (const site of ['kettlewick', 'parcelpine']) {
	test(`${site}: a guest buys two things`, async ({ page }) => {
		const run = createRun({ scenario: 'tickets-v1', clock: '2026-03-14T10:00:00', id: `parity-${site}-${Date.now().toString(36)}` });
		const w = SITES[site]!.skin.words;
		let n = 0;
		const click = async (l: ReturnType<typeof page.getByRole>) => (n++, l.click());
		const fill = async (l: ReturnType<typeof page.getByLabel>, v: string) => (n++, l.fill(v));
		try {
			await page.goto(`${origin(site)}/?everydaybench_run=${run.id}`);
			await fill(page.getByRole('search').getByRole('textbox'), 'apron');
			await click(page.getByRole('search').getByRole('button', { name: 'Search' }));
			await click(page.getByRole('link', { name: "Striped Chef's Apron" }));
			await click(page.getByRole('button', { name: w.addToCart }));
			await fill(page.getByRole('search').getByRole('textbox'), 'spoons');
			await click(page.getByRole('search').getByRole('button', { name: 'Search' }));
			await click(page.getByRole('link', { name: 'Bamboo Cooking Spoons, Set of 5' }));
			await click(page.getByRole('button', { name: w.addToCart }));
			await page.getByLabel("Quantity of Striped Chef's Apron").selectOption('2');
			n++;
			await click(page.getByRole('listitem').filter({ hasText: "Striped Chef's Apron" }).getByRole('button', { name: 'Update' }));
			await click(page.getByRole('link', { name: w.checkout }));
			await fill(page.getByLabel('Email for your receipt'), 'sam@mailmoss.test');
			await fill(page.getByLabel('Full name'), 'Sam Rivera');
			await fill(page.getByLabel('Street address'), '18 Linden St, Apt 3');
			await fill(page.getByLabel('City'), 'Brookfield');
			await fill(page.getByLabel('ZIP code'), '10001');
			await fill(page.getByLabel('Name on card'), 'Sam Rivera');
			await fill(page.getByLabel('Card number'), '4242 4242 4242 4242');
			await fill(page.getByLabel('Expires'), '08/28');
			await fill(page.getByLabel('Security code'), '123');
			await fill(page.getByLabel('Billing ZIP'), '10001');
			// 2 × $18.50 + $13.99 = $50.99, free shipping, $4.08 tax.
			await click(page.getByRole('button', { name: `${w.placeOrder} · $55.07` }));
			await expect(page.getByText('Order placed')).toBeVisible();
			counts[site] = n;
		} finally {
			deleteRun(run.id);
		}
	});
}

test('both stores took the same number of steps', () => {
	expect(Object.keys(counts)).toHaveLength(2);
	expect(new Set(Object.values(counts)).size, JSON.stringify(counts)).toBe(1);
});
