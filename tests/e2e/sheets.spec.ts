import { expect, test } from '@playwright/test';
import { begin } from './everydaybench.ts';

const FLIGHTS = `Date\tFlight\tFrom\tTo
2025-06-12\tSH 214\tSFO\tEWR
2025-06-16\tSH 233\tEWR\tSFO
2025-08-03\tLK 118\tSFO\tORD
2025-08-06\tLK 131\tORD\tSFO
2025-10-21\tSH 402\tSFO\tBOS
2025-10-24\tSH 415\tBOS\tSFO
2026-01-09\tLK 305\tSFO\tSEA
2026-01-11\tLK 312\tSEA\tSFO`;

test('Gridwhistle: a flight log from the inbox, pasted in and one row typed', async ({ page }) => {
	const t = begin(page, 'sheets/flight-log');
	await t.go('mailmoss');
	await expect(page.getByText('Schedule change for your trip M2VTR8')).toBeVisible();
	await t.go('gridwhistle');
	await t.fill(page.getByLabel('Name'), 'Flight log');
	await t.click(page.getByRole('button', { name: 'Create spreadsheet' }));
	await expect(page.getByLabel('Spreadsheet name')).toHaveValue('Flight log');
	await t.click(page.getByText('Paste rows'));
	await t.fill(page.getByLabel(/Rows to paste/), FLIGHTS);
	await t.fill(page.getByLabel('Start at cell'), 'A1');
	await t.click(page.getByRole('button', { name: 'Paste', exact: true }));
	await expect(page.getByLabel('Cell B6, Flight')).toHaveValue('SH 402');
	// The last flight typed into the grid, then saved.
	await t.fill(page.getByLabel('Cell A10, Date'), '2026-02-12');
	await t.fill(page.getByLabel('Cell B10, Flight'), 'LK 409');
	await t.fill(page.getByLabel('Cell C10, From'), 'SFO');
	await t.fill(page.getByLabel('Cell D10, To'), 'PIT');
	await t.click(page.getByRole('button', { name: 'Save', exact: true }));
	await expect(page.getByRole('status')).toHaveText('All changes saved');
	expect(t.grade('9 flights.').pass).toBe(true);
});

test('Gridwhistle: cells save as they’re typed, and formulas show their results', async ({ page }) => {
	const t = begin(page, 'sheets/rent-ledger-march');
	await t.go('gridwhistle');
	await t.click(page.getByRole('link', { name: 'Apartment' }));
	await expect(page.getByRole('link', { name: 'Rent ledger' })).toHaveAttribute('aria-current', 'page');
	await expect(page.locator('#result-E2')).toHaveText('= 2006.2');
	for (const [cell, value] of [
		['Cell A4, Month', 'March 2026'],
		['Cell B4, Rent', '1850'],
		['Cell C4, Power', '76.58'],
		['Cell D4, Internet', '65'],
		['Cell E4, Total', '=SUM(B4:D4)'],
		['Cell F4, Each', '=E4/2']
	]) {
		await t.fill(page.getByLabel(cell!), value!);
		await page.getByLabel(cell!).press('Tab');
	}
	await expect(page.getByRole('status')).toHaveText('All changes saved');
	await page.waitForLoadState('networkidle');
	// Saved without the Save button: a fresh load shows them.
	await page.reload();
	await expect(page.getByLabel('Cell C4, Power')).toHaveValue('76.58');
	await expect(page.locator('#result-F4')).toHaveText('= 995.79');
	expect(t.grade('We each owe $995.79.').pass).toBe(true);
});

test('Gridwhistle: changing February in the ledger fails the task', async ({ page }) => {
	const t = begin(page, 'sheets/rent-ledger-march');
	await t.go('gridwhistle');
	await t.click(page.getByRole('link', { name: 'Apartment' }));
	await t.click(page.getByText('Paste rows'));
	await t.fill(page.getByLabel(/Rows to paste/), 'February 2026\t1850\t76.58\t65\t=SUM(B3:D3)\t=E3/2');
	await t.fill(page.getByLabel('Start at cell'), 'A3');
	await t.click(page.getByRole('button', { name: 'Paste', exact: true }));
	await expect(page.locator('#result-F3')).toHaveText('= 995.79');
	const g = t.grade('$995.79');
	expect(g.pass).toBe(false);
	expect(g.assertions.filter((a) => !a.pass).map((a) => a.fn)).toEqual(['row_with', 'cells_kept']);
});

test('Thriftwell: February on the Visa, with the refund, the card payment and the pending hold', async ({ page }) => {
	const t = begin(page, 'sheets/february-budget');
	await t.go('thriftwell');
	await t.click(page.getByRole('link', { name: /Thriftwell Visa Signature/ }));
	await expect(page.getByRole('heading', { name: 'March 2026' })).toBeVisible();
	await t.click(page.getByRole('link', { name: '← February 2026' }));
	const row = (text: string) => page.getByRole('row').filter({ hasText: text });
	await expect(row('Parcelpine refund')).toContainText('+$18.00');
	await expect(row('Payment — thank you')).toContainText('+$612.40');
	await expect(row('Tablenook hold')).toContainText('Pending');
	// Pending charges first, as at a real bank.
	await expect(page.getByRole('row').nth(1)).toContainText('Tablenook hold');
	await expect(page.getByRole('row').filter({ hasText: 'Green Basket Market' })).toHaveCount(3);
	// Nothing here writes: a run that only looks adds nothing, and fails for want of the sheet.
	const g = t.grade('Nothing yet.');
	expect(g.diff.flatMap((d) => d.extra)).toEqual([]);
	expect(g.pass).toBe(false);
});

test('Gridwhistle: rows pasted into a cell fill the cells from there', async ({ page }) => {
	const t = begin(page, 'sheets/flight-log');
	await t.go('gridwhistle');
	await t.fill(page.getByLabel('Name'), 'Flight log');
	await t.click(page.getByRole('button', { name: 'Create spreadsheet' }));
	const a1 = page.getByLabel('Cell A1', { exact: true });
	await a1.focus();
	// What a paste from another spreadsheet (or an agent's clipboard) sends.
	await a1.evaluate((el, text) => {
		const data = new DataTransfer();
		data.setData('text/plain', text);
		el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
	}, `${FLIGHTS}\n2026-02-12\tLK 409\tSFO\tPIT\n`);
	await expect(page.getByLabel('Cell B10, Flight')).toHaveValue('LK 409');
	expect(t.grade('9 flights').pass).toBe(true);
});
