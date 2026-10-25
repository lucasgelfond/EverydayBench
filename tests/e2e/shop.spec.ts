import { expect, test, type Page } from '@playwright/test';
import { begin } from './everydaybench.ts';

const signIn = async (t: ReturnType<typeof begin>, page: Page, password: string) => {
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.fill(page.getByLabel('Password'), password);
	await t.click(page.getByRole('button', { name: 'Sign in' }));
};

test('Kettlewick: search headphones, skip the stand and the out-of-stock pair, order one in range with saved details', async ({ page }) => {
	const t = begin(page, 'shop/kettlewick-headphones');
	await t.go('kettlewick', '/account/sign-in?next=/');
	await signIn(t, page, 'copper-kettle-42');
	await expect(page.getByRole('link', { name: 'Hi, Sam' })).toBeVisible();
	await t.fill(page.getByRole('search').getByLabel('Search Kettlewick'), 'headphones');
	await t.click(page.getByRole('search').getByRole('button', { name: 'Search' }));
	await expect(page.getByRole('link', { name: 'Walnut Headphone Stand' })).toBeVisible();
	await t.click(page.getByRole('link', { name: 'Hushwell Over-Ear Bluetooth Headphones' }));
	await t.click(page.getByRole('button', { name: 'Add to Cart' }));
	await expect(page.getByRole('status')).toContainText('Hushwell');
	await t.click(page.getByRole('link', { name: 'Proceed to checkout' }));
	await expect(page.getByLabel(/18 Linden St/)).toBeChecked();
	await expect(page.getByLabel(/Visa ending in 4242/)).toBeChecked();
	// $59.00, free shipping from $35, 8% tax.
	await t.click(page.getByRole('button', { name: 'Place your order · $63.72' }));
	const code = (await page.locator('strong.font-mono').textContent())!;
	const g = t.grade(`Ordered the Hushwell Over-Ear Bluetooth Headphones ($59.00). Order ${code}.`);
	expect(g.assertions.filter((a) => !a.pass)).toEqual([]);
	expect(g.pass).toBe(true);
});

test("Kettlewick: an out-of-stock pair can't go in the cart", async ({ page }) => {
	const t = begin(page, 'shop/kettlewick-headphones');
	await t.go('kettlewick', '/p/lumen-studio');
	await expect(page.getByText('Out of stock', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Add to Cart' })).toHaveCount(0);
});

test('Parcelpine: an apron and a stock pot in one order, from departments', async ({ page }) => {
	const t = begin(page, 'shop/parcelpine-apron-and-pot');
	await t.go('parcelpine', '/account/sign-in?next=/');
	await signIn(t, page, 'pinecone-parcel-8');
	await t.click(page.getByRole('navigation', { name: 'Departments' }).getByRole('link', { name: 'Kitchen Linens' }));
	await t.click(page.getByRole('link', { name: 'Canvas Cross-Back Apron' }));
	await t.click(page.getByRole('button', { name: 'Add to bag' }));
	await t.fill(page.getByRole('search').getByLabel('Search Parcelpine'), 'pot');
	await t.click(page.getByRole('search').getByRole('button', { name: 'Search' }));
	await t.click(page.getByRole('link', { name: '8-Quart Stainless Steel Stock Pot' }));
	await t.click(page.getByRole('button', { name: 'Add to bag' }));
	await expect(page.getByRole('list', { name: 'Items' }).getByRole('listitem')).toHaveCount(2);
	await t.click(page.getByRole('link', { name: 'Check out' }));
	// $24.00 + $39.95, free shipping, 8% tax.
	await t.click(page.getByRole('button', { name: 'Complete order · $69.07' }));
	const code = (await page.locator('strong.font-mono').textContent())!;
	expect(t.grade(`Canvas Cross-Back Apron and 8-Quart Stainless Steel Stock Pot, order ${code}`).pass).toBe(true);
});

test('Forkfly: the best-rated sandwich is over the cap with fees and tip, so the cheaper place', async ({ page }) => {
	const t = begin(page, 'shop/forkfly-chicken-sandwich');
	await t.go('forkfly', '/account/sign-in?next=/');
	await signIn(t, page, 'extra-crispy-77');
	await t.fill(page.getByLabel('Search restaurants and dishes'), 'rotisserie chicken sandwich');
	await t.click(page.getByRole('main').getByRole('button', { name: 'Search' }));
	await expect(page.getByRole('link', { name: 'Ember Rotisserie' })).toBeVisible();
	// The best-rated one first: its sandwich comes to $32.02 with the default tip.
	await t.click(page.getByRole('link', { name: 'Ember Rotisserie' }));
	await t.click(page.getByRole('button', { name: 'Add to order: Rotisserie Chicken Sandwich, $18.95' }));
	await t.click(page.getByRole('status').getByRole('link', { name: /Your order/ }));
	await t.click(page.getByRole('link', { name: 'Go to checkout' }));
	await expect(page.getByRole('button', { name: 'Place order · $32.02' })).toBeVisible();
	// Too much: the sandwich shop instead, which starts a new order.
	await t.click(page.getByRole('link', { name: 'Forkfly' }));
	await t.fill(page.getByLabel('Search restaurants and dishes'), 'rotisserie chicken sandwich');
	await t.click(page.getByRole('main').getByRole('button', { name: 'Search' }));
	await t.click(page.getByRole('link', { name: 'Coop & Crumb' }));
	await t.click(page.getByRole('button', { name: 'Add to order: Rotisserie Chicken Sandwich, $13.50' }));
	await expect(page.getByRole('status')).toContainText('another restaurant were removed');
	await t.click(page.getByRole('status').getByRole('link', { name: /Your order/ }));
	await t.click(page.getByRole('link', { name: 'Go to checkout' }));
	await t.click(page.getByRole('button', { name: 'Place order · $22.27' }));
	const code = (await page.locator('strong.font-mono').textContent())!;
	expect(t.grade(`Rotisserie Chicken Sandwich from Coop & Crumb, $22.27 total. Order ${code}.`).pass).toBe(true);
});

test('Forkfly: two Mopedettes; the Old Mill one, though Midtown is listed first', async ({ page }) => {
	const t = begin(page, 'shop/forkfly-banh-mi-old-mill');
	await t.go('forkfly', '/account/sign-in?next=/');
	await signIn(t, page, 'extra-crispy-77');
	await t.fill(page.getByLabel('Search restaurants and dishes'), 'mopedette');
	await t.click(page.getByRole('main').getByRole('button', { name: 'Search' }));
	const found = page.getByRole('main').getByRole('listitem');
	await expect(found).toHaveCount(2);
	await expect(found.first()).toContainText('Midtown');
	await t.click(found.filter({ hasText: 'Old Mill' }).getByRole('link', { name: 'Mopedette' }));
	await expect(page.getByText('Old Mill · 9 Millrace Ln')).toBeVisible();
	await t.click(page.getByRole('button', { name: 'Add to order: Grilled Pork Banh Mi, $10.75' }));
	await t.click(page.getByRole('status').getByRole('link', { name: /Your order/ }));
	await expect(page.getByText('From Mopedette (Old Mill)')).toBeVisible();
	await t.click(page.getByRole('link', { name: 'Go to checkout' }));
	await expect(page.getByRole('complementary', { name: 'Order summary' })).toContainText('Mopedette, Old Mill');
	// $10.75, $2.99 delivery, $2.00 service, $0.86 tax, 20% tip.
	await t.click(page.getByRole('button', { name: 'Place order · $18.75' }));
	await expect(page.getByRole('heading', { name: 'Mopedette (Old Mill) is preparing your order' })).toBeVisible();
	const code = (await page.locator('strong.font-mono').textContent())!;
	expect(t.grade(`Grilled Pork Banh Mi from Mopedette in Old Mill, $18.75. Order ${code}.`).pass).toBe(true);
});

test('Forkfly: the card declines at the Old Mill Mopedette; nothing else tried', async ({ page }) => {
	const t = begin(page, 'shop/forkfly-banh-mi-declined');
	await t.go('forkfly', '/account/sign-in?next=/r/mopedette-old-mill');
	await signIn(t, page, 'extra-crispy-77');
	await t.click(page.getByRole('button', { name: 'Add to order: Grilled Pork Banh Mi, $10.75' }));
	await t.click(page.getByRole('status').getByRole('link', { name: /Your order/ }));
	await t.click(page.getByRole('link', { name: 'Go to checkout' }));
	await t.click(page.getByRole('button', { name: 'Place order · $18.75' }));
	await expect(page.getByText('Your card was declined.')).toBeVisible();
	const g = t.grade('Your Mastercard ending in 4444 was declined at the Old Mill Mopedette, so nothing was ordered.');
	expect(g.assertions.filter((a) => !a.pass)).toEqual([]);
	expect(g.pass).toBe(true);
});

test('Forkfly: a lower tip changes the total before ordering', async ({ page }) => {
	const t = begin(page, 'shop/forkfly-chicken-sandwich');
	await t.go('forkfly', '/account/sign-in?next=/r/ember-rotisserie');
	await signIn(t, page, 'extra-crispy-77');
	await t.click(page.getByRole('button', { name: 'Add to order: Rotisserie Chicken Sandwich, $18.95' }));
	await t.click(page.getByRole('status').getByRole('link', { name: /Your order/ }));
	await t.click(page.getByRole('link', { name: 'Go to checkout' }));
	await t.click(page.getByLabel('No tip'));
	await t.click(page.getByRole('button', { name: 'Place order · $28.23' }));
	const code = (await page.locator('strong.font-mono').textContent())!;
	expect(t.grade(`Ember Rotisserie, $28.23 with no tip, order ${code}`).pass).toBe(true);
});

test('Brightreel: read the seat map (screen at the bottom), recommend an open pair, buy nothing', async ({ page }) => {
	const t = begin(page, 'tickets/brightreel-seat-map');
	await t.go('brightreel', '/theaters/brightreel-oldmill');
	await t.click(page.getByRole('link', { name: /Tomorrow/ }));
	await expect(page.getByRole('link', { name: /Tomorrow/ })).toHaveAttribute('aria-current', 'date');
	const film = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Velocity Nine' }) });
	await t.click(film.getByRole('link', { name: /^7:10 PM/ }));
	await expect(page.getByRole('link', { name: 'Row E, seat 14, available' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Row E, seat 15, available' })).toBeVisible();
	expect(t.grade('It’s about 86% full (33 seats left). I’d take E14 and E15, in the middle section.').pass).toBe(true);
});

test('Showlark: a film’s showtimes at every theater tomorrow, earliest first', async ({ page }) => {
	const t = begin(page, 'tickets/showlark-showtimes-in-order');
	await t.go('showlark', '/movies/velocity-nine');
	await t.click(page.getByRole('link', { name: /Tomorrow/ }));
	await expect(page.getByRole('link', { name: /Tomorrow/ })).toHaveAttribute('aria-current', 'date');
	const rows = await page.getByRole('article').evaluateAll((articles) =>
		articles.flatMap((a) => {
			const theater = a.querySelector('h3')!.textContent!.trim();
			return [...a.querySelectorAll('a[href^="/showtimes/"], span.pointer-events-none')].map((l) => ({ theater, time: l.textContent!.trim().split(/\s/).slice(0, 2).join(' ') }));
		})
	);
	const minutes = (s: string) => {
		const [, h, m, ap] = s.match(/(\d+):(\d+) (AM|PM)/)!;
		return ((Number(h) % 12) + (ap === 'PM' ? 12 : 0)) * 60 + Number(m);
	};
	const report = rows.sort((a, b) => minutes(a.time) - minutes(b.time)).map((r) => `${r.time} at ${r.theater}`).join('\n');
	const g = t.grade(report);
	expect(g.answer).toEqual({ missing: [], forbidden: [] });
	expect(g.pass).toBe(true);
});
