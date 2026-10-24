import { expect, test } from '@playwright/test';
import { begin } from './everydaybench.ts';
import { resetAndSignIn, signIn } from './accounts.ts';

test('Cloudpail: reset the password from the email, then add $10 of credit with the card on file', async ({ page }) => {
	const t = begin(page, 'cloud/cloudpail-reset-top-up');
	await resetAndSignIn(page, t, 'cloudpail', /Reset your Cloudpail password/, 'tin-roof-rain-82');
	await expect(page.getByRole('heading', { name: 'Servers' })).toBeVisible();
	await t.click(page.getByRole('link', { name: 'Billing' }));
	await t.click(page.getByLabel('$10.00'));
	await t.click(page.getByRole('button', { name: 'Add credit' }));
	await expect(page.getByRole('status')).toContainText('Credit added');
	await expect(page.getByText('$14.50')).toBeVisible();
	expect(t.grade('Your balance is now $14.50.').pass).toBe(true);
});

test('Cloudpail: cancel past both retention offers, delete only web-staging, read the email', async ({ page }) => {
	const t = begin(page, 'cloud/cloudpail-cancel');
	await t.go('cloudpail');
	await signIn(page, t, 'bucket-brigade-44');
	await t.click(page.getByRole('link', { name: 'Plan' }));
	await t.click(page.getByRole('link', { name: 'Cancel plan' }));
	await expect(page.getByRole('heading', { name: /half price/ })).toBeVisible();
	await t.click(page.getByRole('link', { name: 'No thanks, continue canceling' }));
	await t.click(page.getByRole('link', { name: 'No, I still want to cancel' }));
	await t.click(page.getByRole('button', { name: 'Cancel my plan' }));
	await expect(page.getByRole('status')).toHaveText('Your plan is canceled.');
	await t.click(page.getByRole('link', { name: 'Servers' }));
	await t.click(page.getByRole('link', { name: 'web-staging' }));
	await t.fill(page.getByLabel(/to confirm/), 'web-staging');
	await t.click(page.getByRole('button', { name: 'Delete web-staging' }));
	await expect(page.getByRole('status')).toContainText('web-staging was deleted');
	await t.go('mailmoss');
	await t.click(page.getByRole('link', { name: /Your Cloudpail Pro plan is canceled/ }));
	await expect(page.getByText('stays active until Thursday, April 2')).toBeVisible();
	expect(t.grade('Canceled. It stays active until Thursday, April 2; web-staging is deleted.').pass).toBe(true);
});
