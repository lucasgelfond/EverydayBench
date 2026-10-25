import { expect, test, type Page } from '@playwright/test';
import { begin } from './everydaybench.ts';
import { signIn, type T } from './accounts.ts';

async function claim(page: Page, t: T, purpose: string, lines: [string, string, string, string][]) {
	await t.go('receiptacle', '/claims/new');
	await signIn(page, t, 'carbon-copy-38');
	await t.fill(page.getByLabel('What’s it for?'), purpose);
	for (const [i, [date, merchant, category, amount]] of lines.entries()) {
		await t.fill(page.getByLabel(`Line ${i + 1} date`), date);
		await t.fill(page.getByLabel(`Line ${i + 1} merchant`), merchant);
		await t.select(page.getByLabel(`Line ${i + 1} category`), category);
		await t.fill(page.getByLabel(`Line ${i + 1} amount`), amount);
	}
	await t.click(page.getByRole('button', { name: 'Submit claim' }));
	return (await page.getByRole('status').locator('strong').textContent())!;
}

test('Receiptacle: the Boston receipts from the inbox, the train once and not the gift, as one claim', async ({ page }) => {
	const t = begin(page, 'expenses/boston-trip-claim');
	await t.go('mailmoss');
	for (const subject of [/Spindrift Rail/, /Kelpie's Table/, /Barnacle & Bough/, /Foxglove & Folio/]) await expect(page.getByRole('link', { name: subject }).first()).toBeVisible();
	const code = await claim(page, t, 'Boston trip, Mar 3–5', [
		['2026-02-27', 'Spindrift Rail', 'transport', '68.00'],
		['2026-03-05', 'The Barnacle & Bough Inn', 'lodging', '$412.30'],
		['2026-03-04', "Kelpie's Table", 'meals', '186.40']
	]);
	expect(code).toMatch(/^EX-\d{6}$/);
	await expect(page.getByText('$666.70')).toBeVisible();
	expect(t.grade(`Claim ${code}, $666.70.`).pass).toBe(true);
});

test('Receiptacle: claiming the Portland receipts with their tips fails the policy', async ({ page }) => {
	const t = begin(page, 'expenses/portland-trip-tips');
	const code = await claim(page, t, 'Portland trip', [
		['2026-03-06', 'Spindrift Rail', 'transport', '54.00'],
		['2026-03-10', 'Gullcab', 'transport', '37.50'],
		['2026-03-10', 'Saltmarrow Kitchen', 'meals', '123.36']
	]);
	expect(t.grade(`Claim ${code}, $214.86.`).pass).toBe(false);
});
