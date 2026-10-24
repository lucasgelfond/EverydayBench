// Account steps sites share: signing in, and resetting a password from the emailed link.

import { expect, type Page } from '@playwright/test';
import type { begin } from './everydaybench.ts';

export type T = ReturnType<typeof begin>;

// Forgot password, the emailed link, a new password, then signed in with it.
export async function resetAndSignIn(page: Page, t: T, site: string, subject: RegExp, password: string) {
	await t.go(site, '/account/sign-in');
	await t.click(page.getByRole('link', { name: 'Forgot your password?' }));
	await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.click(page.getByRole('button', { name: 'Email me a reset link' }));
	await expect(page.getByRole('status')).toContainText('sam@mailmoss.test');
	await t.go('mailmoss');
	await t.click(page.getByRole('link', { name: subject }));
	await t.click(page.getByRole('link', { name: /\/account\/reset\?token=/ }));
	await t.fill(page.getByLabel('New password', { exact: true }), password);
	await t.fill(page.getByLabel('Confirm new password'), password);
	await t.click(page.getByRole('button', { name: 'Change password' }));
	await t.click(page.getByRole('status').getByRole('link', { name: 'Sign in' }));
	await signIn(page, t, password);
}

export async function signIn(page: Page, t: T, password: string) {
	await expect(page.getByRole('heading', { name: /^Sign in/ })).toBeVisible();
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.fill(page.getByLabel('Password'), password);
	await t.click(page.getByRole('button', { name: 'Sign in' }));
}
