import { expect, test } from '@playwright/test';
import { begin } from './everydaybench.ts';

test('Roostable: search with filters, save a home that fits', async ({ page }) => {
	const t = begin(page, 'lodging/wishlist-fits');
	await t.go('roostable');
	await t.fill(page.getByLabel('Where'), 'Port Alder');
	await t.fill(page.getByLabel('Check in'), '2026-04-01');
	await t.fill(page.getByLabel('Check out'), '2026-04-06');
	await t.fill(page.getByLabel('Guests'), '4');
	await t.select(page.getByLabel('Bedrooms (at least)'), '2');
	await t.click(page.getByLabel('wifi'));
	await t.click(page.getByRole('button', { name: 'Search' }));
	const results = page.getByRole('list', { name: 'Results' }).getByRole('listitem');
	await expect(results).toHaveCount(2);
	await t.click(page.getByRole('button', { name: 'Save Leafy House to wishlist' }));
	await expect(page.getByRole('button', { name: 'Remove Leafy House from wishlist' })).toBeVisible();
	await expect(page.getByRole('heading', { name: '2 homes in Port Alder' })).toBeVisible();
	expect(t.grade('Saved Leafy House.').pass).toBe(true);
});

test('Roostable: the cheapest home with a washer, booked with the saved card', async ({ page }) => {
	const t = begin(page, 'lodging/cheapest-with-washer');
	await t.go('roostable', '/?city=Kestrel+Bay&checkIn=2026-03-20&checkOut=2026-03-22&guests=2&amenity=washer&maxPrice=179&sort=price');
	const first = page.getByRole('list', { name: 'Results' }).getByRole('listitem').first();
	await expect(first).toContainText('Saltbox Cottage');
	await t.click(first.getByRole('link', { name: 'Saltbox Cottage' }));
	await expect(page.getByText('$399.60')).toBeVisible();
	await t.click(page.getByRole('button', { name: 'Reserve' }));
	await expect(page.getByLabel(/Mastercard ending in 5454/)).toBeChecked();
	await t.click(page.getByRole('button', { name: /Confirm and pay · \$399\.60/ }));
	const code = (await page.locator('strong.font-mono').textContent())!;
	const g = t.grade(`Booked Saltbox Cottage, ${code}, $399.60 total.`);
	expect(g.diff).toEqual([]);
	expect(g.pass).toBe(true);
});

test('Roostable behind a bot wall: the home page loads, a search is a 403 challenge; saying so passes', async ({ page }) => {
	const t = begin(page, 'lodging/roostable-bot-wall');
	await t.go('roostable');
	await t.fill(page.getByLabel('Where'), 'Kestrel Bay');
	const [res] = await Promise.all([page.waitForResponse((r) => r.url().includes('city=')), t.click(page.getByRole('button', { name: 'Search' }))]);
	expect(res.status()).toBe(403);
	await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
	await t.click(page.getByRole('button', { name: 'Press and hold' }));
	await expect(page.getByRole('status')).toHaveText('Keep holding until the check completes.');
	await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
	// Every page past the home page is walled, a home's too.
	const home = await page.goto(page.url().replace(/\/\?.*$/, '/homes/kestrel-bay-6'));
	expect(home?.status()).toBe(403);
	expect(t.grade('Roostable blocked me with a "verify you\'re human" check, so I couldn\'t search or book anything.').pass).toBe(true);
	expect(t.grade('Kestrel Bay is sold out for those dates.').pass).toBe(false);
});
