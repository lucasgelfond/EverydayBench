import { expect, test } from '@playwright/test';
import { begin } from './everydaybench.ts';

test('Lumiscope: sign in, find the theater, pick E13 and E14, pay with the saved card', async ({ page }) => {
	const t = begin(page, 'tickets/lumiscope-named-seats');
	await t.go('lumiscope', '/account/sign-in?next=/');
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.fill(page.getByLabel('Password'), 'lighthouse-keeper-9');
	await t.click(page.getByRole('button', { name: 'Sign in' }));
	await expect(page.getByRole('link', { name: 'Hi, Sam' })).toBeVisible();
	await t.fill(page.getByLabel('Find your theatre'), 'Harbor');
	await t.click(page.getByRole('link', { name: /Lumiscope Harborview 8/ }));
	await t.click(page.getByRole('link', { name: /Tomorrow/ }));
	const film = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'The Last Lighthouse' }) });
	await t.click(film.getByRole('link', { name: /^6:45 PM/ }));
	await t.click(page.getByRole('link', { name: 'Row E, seat 13, available' }));
	await t.click(page.getByRole('link', { name: 'Row E, seat 14, available' }));
	await expect(page.getByText('2 seats: E13, E14')).toBeVisible();
	await t.click(page.getByRole('link', { name: 'Continue to checkout' }));
	await expect(page.getByLabel(/Visa ending in 4242/)).toBeChecked();
	await t.click(page.getByRole('button', { name: /Place order · \$34\.50/ }));
	const code = (await page.locator('strong.font-mono').textContent())!;
	expect(code).toMatch(/^[A-Z0-9]{6}$/);
	const g = t.grade(`Bought E13 and E14. Confirmation ${code}.`);
	expect(g.diff).toEqual([]);
	expect(g.pass).toBe(true);
});

test('Showlark: sell a Orbelle theater’s seats with Showlark’s saved card', async ({ page }) => {
	const t = begin(page, 'tickets/showlark-named-seats');
	await t.go('showlark', '/account/sign-in?next=/');
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.fill(page.getByLabel('Password'), 'popcorn-and-rain-17');
	await t.click(page.getByRole('button', { name: 'Sign in' }));
	await t.fill(page.getByLabel('Find a theater'), 'Eastgate');
	await t.click(page.getByRole('link', { name: /Orbelle Eastgate Stadium 14/ }));
	await t.click(page.getByRole('link', { name: /Tomorrow/ }));
	const film = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'The Last Lighthouse' }) });
	await t.click(film.getByRole('link', { name: /^1:15 PM/ }));
	await t.click(page.getByRole('link', { name: 'Row F, seat 7, available' }));
	await t.click(page.getByRole('link', { name: 'Row F, seat 8, available' }));
	await t.click(page.getByRole('link', { name: 'Continue' }));
	await t.click(page.getByRole('button', { name: /Complete purchase · \$29\.00/ }));
	const code = (await page.locator('strong.font-mono').textContent())!;
	expect(t.grade(`Done: ${code}, total $29.00`).pass).toBe(true);
});

test('Orbelle: reset a password from the emailed link, then sign in with it', async ({ page }) => {
	const t = begin(page, 'tickets/orbelle-reset-password');
	await t.go('orbelle', '/account/sign-in');
	await t.click(page.getByRole('link', { name: 'Forgot your password?' }));
	// The sign-in page has an Email field too: wait for the new page before typing.
	await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.click(page.getByRole('button', { name: 'Email me a reset link' }));
	await expect(page.getByRole('status')).toContainText('sam@mailmoss.test');
	await t.go('mailmoss');
	await t.click(page.getByRole('link', { name: /Reset your Orbelle Theatres password/ }));
	await t.click(page.getByRole('link', { name: /\/account\/reset\?token=/ }));
	await t.fill(page.getByLabel('New password', { exact: true }), 'river-lights-2026');
	await t.fill(page.getByLabel('Confirm new password'), 'river-lights-2026');
	await t.click(page.getByRole('button', { name: 'Change password' }));
	await t.click(page.getByRole('link', { name: 'Tickets' }).or(page.getByRole('status').getByRole('link')).first());
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.fill(page.getByLabel('Password'), 'river-lights-2026');
	await t.click(page.getByRole('button', { name: 'Tickets' }).or(page.getByRole('button', { name: 'Sign in' })).first());
	await expect(page.getByText('Sam Rivera')).toBeVisible();
	expect(t.grade('Reset and signed in.').pass).toBe(true);
});

