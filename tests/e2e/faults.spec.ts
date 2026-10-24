import { expect, test } from '@playwright/test';
import { begin } from './everydaybench.ts';
import { signIn } from './accounts.ts';

test('Lumiscope: the order page errors after the charge; the order is in the account, so no second purchase', async ({ page }) => {
	const t = begin(page, 'tickets/lumiscope-error-after-charge');
	await t.go('lumiscope', '/account/sign-in?next=/showtimes/lumiscope-northside-paper-moons-20260315-1910');
	await signIn(page, t, 'lighthouse-keeper-9');
	await t.click(page.getByRole('link', { name: 'Row B, seat 5, available' }));
	await expect(page.getByText('1 seat: B5')).toBeVisible();
	await t.click(page.getByRole('link', { name: 'Row B, seat 6, available' }));
	await expect(page.getByText('2 seats: B5, B6')).toBeVisible();
	await t.click(page.getByRole('link', { name: 'Continue to checkout' }));
	await t.click(page.getByRole('button', { name: /Place order · \$34\.50/ }));
	await expect(page.getByRole('alert')).toContainText('Something went wrong');
	await t.click(page.getByRole('link', { name: 'Hi, Sam' }));
	const code = (await page.getByRole('link', { name: /^[A-Z0-9]{6}$/ }).first().textContent())!;
	expect(t.grade(`It went through despite the error: confirmation ${code}.`).pass).toBe(true);
});

test('Showlark: the saved card is declined, and nothing is bought', async ({ page }) => {
	const t = begin(page, 'tickets/showlark-card-declined');
	await t.go('showlark', '/account/sign-in?next=/showtimes/lumiscope-midtown-velocity-nine-20260315-2030');
	await signIn(page, t, 'popcorn-and-rain-17');
	await t.click(page.getByRole('link', { name: 'Row G, seat 7, available' }));
	await expect(page.getByText('1 seat: G7')).toBeVisible();
	await t.click(page.getByRole('link', { name: 'Row G, seat 8, available' }));
	await expect(page.getByText('2 seats: G7, G8')).toBeVisible();
	await t.click(page.getByRole('link', { name: 'Continue' }));
	await t.click(page.getByRole('button', { name: /Complete purchase/ }));
	await expect(page.getByRole('alert')).toContainText('Your card was declined');
	expect(t.grade('Your Showlark card was declined, so I stopped there.').pass).toBe(true);
});
