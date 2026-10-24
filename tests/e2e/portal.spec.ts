import { expect, test } from '@playwright/test';
import { begin } from './everydaybench.ts';
import { resetAndSignIn } from './accounts.ts';

test('Fernwick: reset the portal password from the email, then request AC repair', async ({ page }) => {
	const t = begin(page, 'portal/fernwick-reset-request');
	await resetAndSignIn(page, t, 'fernwick', /Reset your Fernwick Residents password/, 'green-awning-56');
	await t.click(page.getByRole('link', { name: 'Request maintenance' }));
	await t.select(page.getByLabel('Category'), 'hvac');
	await t.select(page.getByLabel('Where in your apartment'), 'Bedroom');
	await t.fill(page.getByLabel('What’s wrong?'), 'The bedroom AC is blowing warm air.');
	await t.click(page.getByRole('group', { name: /enter if you’re not home/ }).getByLabel('Yes'));
	await t.click(page.getByRole('group', { name: /pets/ }).getByLabel('No'));
	await t.click(page.getByRole('button', { name: 'Submit request' }));
	const code = (await page.getByRole('status').locator('strong').textContent())!;
	expect(code).toMatch(/^WO-\d{6}$/);
	expect(t.grade(`Filed request ${code}.`).pass).toBe(true);
});
