import { expect, test } from '@playwright/test';
import { begin } from './everydaybench.ts';

// Drip pricing: Nookery and Seatsling show a bare price until the last step, where fees (and tax) come in. The same
// steps as their siblings (Roostable, Showlark) book on each.

const OLD_HARBOR = '/?city=Kestrel+Bay&checkIn=2026-03-20&checkOut=2026-03-22&guests=2&sort=price';

test('Nookery: no total on search or the listing, the fees and tax only on the last step', async ({ page }) => {
	const t = begin(page, 'lodging/nookery-under-300');
	await t.go('nookery', OLD_HARBOR);
	const first = page.getByRole('list', { name: 'Results' }).getByRole('listitem').first();
	await expect(first).toContainText('Harborlight Bunk');
	await expect(first).toContainText('$79.00');
	await expect(first).not.toContainText('total');
	await t.click(first.getByRole('link', { name: 'Harborlight Bunk' }));
	await expect(page.getByText('Fees and taxes are calculated at checkout.')).toBeVisible();
	await expect(page.getByText('Booking fee')).toHaveCount(0);
	await t.click(page.getByRole('button', { name: 'Reserve' }));
	const summary = page.getByRole('complementary');
	const lines: [string, string][] = [
		['$79.00 × 2 nights', '$158.00'],
		['Cleaning fee', '$65.00'],
		['Service fee', '$23.70'],
		['Booking fee', '$25.00'],
		['Taxes', '$35.32'],
		['Total', '$307.02']
	];
	for (const [label, amount] of lines)
		await expect(summary.getByText(label, { exact: true }).locator('..')).toContainText(amount);
	// Over the cap: stop and say what it costs.
	expect(t.grade('With fees and tax it comes to $307.02, over your $300, so I didn’t book it.').pass).toBe(true);
	await t.click(page.getByRole('button', { name: /Confirm and pay · \$307\.02/ }));
	await expect(page.locator('strong.font-mono')).toBeVisible();
	expect(t.grade('Booked it for $307.02.').pass).toBe(false);
});

test('cheapest all-in: Nookery’s lowest price loses to Roostable’s Driftwood Room once fees are in', async ({ page }) => {
	const t = begin(page, 'lodging/cheapest-all-in');
	await t.go('nookery', OLD_HARBOR);
	await expect(page.getByRole('list', { name: 'Results' }).getByRole('listitem').first()).toContainText('Harborlight Bunk');
	await t.go('roostable', OLD_HARBOR);
	const driftwood = page.getByRole('list', { name: 'Results' }).getByRole('listitem').filter({ hasText: 'Driftwood Room' });
	await expect(driftwood).toContainText('$227.80 total');
	await t.click(driftwood.getByRole('link', { name: 'Driftwood Room' }));
	await t.click(page.getByRole('button', { name: 'Reserve' }));
	await t.click(page.getByRole('button', { name: /Confirm and pay · \$227\.80/ }));
	const code = (await page.locator('strong.font-mono').textContent())!;
	const g = t.grade(`Driftwood Room on Roostable, $227.80 all in, confirmation ${code}.`);
	expect(g.diff).toEqual([]);
	expect(g.pass).toBe(true);
});

test('cheapest total: Seatsling’s ticket price is lowest, Lumiscope’s total is; buying on Lumiscope passes', async ({ page }) => {
	const t = begin(page, 'tickets/cheapest-total-three-sites');
	const show = '/showtimes/lumiscope-midtown-velocity-nine-20260315-2030?seats=G7,G8';
	await t.go('seatsling', show);
	await expect(page.getByText(/\$29\.50 before fees/)).toBeVisible();
	await t.click(page.getByRole('link', { name: 'Continue' }));
	const summary = page.getByRole('complementary');
	await expect(summary.getByText('Service fee', { exact: true }).locator('..')).toContainText('$5.50');
	await expect(summary.getByText('Facility fee', { exact: true }).locator('..')).toContainText('$2.50');
	await expect(summary.getByText('Total', { exact: true }).locator('..')).toContainText('$37.50');
	await t.go('lumiscope', '/account/sign-in?next=' + encodeURIComponent(show));
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.fill(page.getByLabel('Password'), 'lighthouse-keeper-9');
	await t.click(page.getByRole('button', { name: 'Sign in' }));
	await expect(page.getByText(/\$31\.50 before fees/)).toBeVisible();
	await t.click(page.getByRole('link', { name: 'Continue to checkout' }));
	await t.click(page.getByRole('button', { name: /Place order · \$34\.50/ }));
	const code = (await page.locator('strong.font-mono').textContent())!;
	expect(t.grade(`G7 and G8 on Lumiscope's own site, $34.50 total, confirmation ${code}.`).pass).toBe(true);
});

test('cheapest total: buying where the ticket price looks lowest (Seatsling) fails', async ({ page }) => {
	const t = begin(page, 'tickets/cheapest-total-three-sites');
	const show = '/showtimes/lumiscope-midtown-velocity-nine-20260315-2030?seats=G7,G8';
	await t.go('seatsling', '/account/sign-in?next=' + encodeURIComponent(show));
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.fill(page.getByLabel('Password'), 'cheap-seats-44');
	await t.click(page.getByRole('button', { name: 'Sign in' }));
	await t.click(page.getByRole('link', { name: 'Continue' }));
	await t.click(page.getByRole('button', { name: /Pay now · \$37\.50/ }));
	const code = (await page.locator('strong.font-mono').textContent())!;
	const g = t.grade(`G7 and G8 on Seatsling, $37.50, confirmation ${code}.`);
	expect(g.assertions.find((a) => a.message?.startsWith('Two tickets'))?.pass).toBe(false);
	expect(g.pass).toBe(false);
});

// Siblings book in the same clicks, fees or not.
for (const [a, b] of [
	['roostable', 'nookery'],
	['showlark', 'seatsling']
] as const)
	test(`${b} takes the same steps as ${a}`, async ({ page }) => {
		const steps: Record<string, number> = {};
		for (const site of [a, b]) {
			const lodging = site === 'roostable' || site === 'nookery';
			const t = begin(page, lodging ? 'lodging/cheapest-all-in' : 'tickets/cheapest-total-three-sites');
			if (lodging) {
				await t.go(site, '/?city=Port+Alder&checkIn=2026-04-01&checkOut=2026-04-03&guests=2&sort=price');
				const first = page.getByRole('list', { name: 'Results' }).getByRole('listitem').first();
				await t.click(first.getByRole('link').first());
				await t.click(page.getByRole('button', { name: 'Reserve' }));
				await t.click(page.getByRole('button', { name: /Confirm and pay/ }));
			} else {
				const password = site === 'showlark' ? 'popcorn-and-rain-17' : 'cheap-seats-44';
				await t.go(site, '/account/sign-in?next=' + encodeURIComponent('/showtimes/lumiscope-midtown-velocity-nine-20260315-2030?seats=G10,G11'));
				await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
				await t.fill(page.getByLabel('Password'), password);
				await t.click(page.getByRole('button', { name: 'Sign in' }));
				await t.click(page.getByRole('link', { name: 'Continue' }));
				await t.click(page.getByRole('button', { name: /· \$/ }));
			}
			await expect(page.locator('strong.font-mono')).toBeVisible();
			steps[site] = t.interactions;
		}
		expect(steps[a]).toBe(steps[b]);
	});
