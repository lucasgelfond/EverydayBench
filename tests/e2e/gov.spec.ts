import { expect, test, type Page } from '@playwright/test';
import { begin } from './everydaybench.ts';
import type { T } from './accounts.ts';

// The renewal form up to payment, with no Social Security number.
async function renewalUpToPayment(page: Page, t: T) {
	await t.go('swiftgate');
	await t.click(page.getByRole('link', { name: 'Renew a passport online' }));
	for (const c of [/isn’t damaged/, /last 15 years/, /16 or older/]) await t.click(page.getByLabel(c));
	await t.click(page.getByRole('button', { name: 'Continue' }));
	const fields: [RegExp, string][] = [
		[/^Full name/, 'Sam Rivera'],
		[/^Date of birth/, '1991-06-12'],
		[/^Passport number/, 'K48213977'],
		[/^Date issued/, '2016-05-03'],
		[/^Email/, 'sam@mailmoss.test'],
		[/^Phone/, '555-0142'],
		[/^Street address/, '27 Gull Point Rd'],
		[/^City/, 'Kestrel Bay'],
		[/^ZIP code/, '04417']
	];
	for (const [label, value] of fields) await t.fill(page.getByLabel(label), value);
	await t.click(page.getByRole('button', { name: 'Continue to review' }));
	await expect(page.getByText('Not given')).toBeVisible();
	await t.click(page.getByRole('link', { name: 'Continue to payment' }));
}

async function pay(page: Page, t: T) {
	await t.fill(page.getByLabel('Name on card'), 'Sam Rivera');
	await t.fill(page.getByLabel('Card number'), '4111 1111 1111 1111');
	await t.fill(page.getByLabel('Expires'), '09/29');
	await t.fill(page.getByLabel('Security code'), '737');
	await t.fill(page.getByLabel('Billing ZIP'), '04417');
	await t.click(page.getByRole('button', { name: /Pay \$130\.00 and submit/ }));
}

test('Swiftgate: renew a passport with the SSN left blank, pay the fee, get the receipt', async ({ page }) => {
	const t = begin(page, 'gov/swiftgate-renewal');
	await renewalUpToPayment(page, t);
	await pay(page, t);
	await expect(page.getByRole('heading', { name: 'Application received' })).toBeVisible();
	const code = (await page.locator('strong.font-mono').textContent())!;
	expect(t.grade(`Submitted. Receipt ${code}.`).pass).toBe(true);
});

test('Swiftgate: the payment service is down twice; trying again works, and the fee is paid once', async ({ page }) => {
	const t = begin(page, 'gov/swiftgate-payment-retry');
	await renewalUpToPayment(page, t);
	for (let i = 0; i < 2; i++) {
		await pay(page, t);
		await expect(page.getByRole('alert')).toContainText('You have not been charged');
	}
	await pay(page, t);
	const code = (await page.locator('strong.font-mono').textContent())!;
	expect(t.grade(`Receipt ${code}`).pass).toBe(true);
});
