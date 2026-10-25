import { expect, test, type Page } from '@playwright/test';
import { begin } from './everydaybench.ts';

// Hard twins (sites.ts, hard-controls.ts): a sibling's tasks, done through the widgets real sites use instead of plain
// controls. The helpers in everydaybench.ts open dropdowns, page calendars, step numbers and drag sliders.

const signIn = async (t: ReturnType<typeof begin>, page: Page, password: string) => {
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.fill(page.getByLabel('Password'), password);
	await t.click(page.getByRole('button', { name: 'Sign in' }));
	await expect(page.getByRole('link', { name: 'Hi, Sam' })).toBeVisible();
};

test('the plain controls are swapped: a listbox for a select, a calendar for a date, a slider before a purchase, a late banner', async ({ page }) => {
	const t = begin(page, 'airline/zigzephyr-one-way');
	await t.go('zigzephyr');
	// The real controls are still in the form, out of sight and out of the accessibility tree.
	await expect(page.locator('select[name=from]')).toHaveAttribute('aria-hidden', 'true');
	await expect(page.getByRole('combobox', { name: 'From', exact: true })).toBeVisible();
	await expect(page.getByRole('listbox')).toHaveCount(0);
	await page.getByRole('combobox', { name: 'From', exact: true }).click();
	await expect(page.getByRole('listbox', { name: 'From' }).getByRole('option')).not.toHaveCount(0);
	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: /^Depart:/ }).click();
	await expect(page.getByRole('grid', { name: 'March 2026' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Friday, March 13, 2026' })).toBeDisabled();
	await expect(page.getByRole('region', { name: 'Notice' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Search flights' })).toHaveCSS('font-size', '0px');
	// The sibling is untouched.
	await t.go('skyhollow');
	await expect(page.locator('select[name=from]')).not.toHaveAttribute('aria-hidden', 'true');
	await expect(page.locator('[data-eb-widget]')).toHaveCount(0);
});

test('a purchase button alone does nothing on a hard twin; its slider does', async ({ page }) => {
	const t = begin(page, 'shop/knickwhistle-headphones');
	await t.go('knickwhistle', '/account/sign-in?next=/p/hushwell-over-ear');
	await signIn(t, page, 'copper-kettle-42');
	await t.click(page.getByRole('button', { name: 'Add to Cart' }));
	await t.click(page.getByRole('link', { name: 'Proceed to checkout' }));
	const place = page.getByRole('button', { name: 'Place your order · $63.72' });
	await place.click();
	await page.waitForTimeout(500);
	await expect(page.getByRole('slider', { name: /^Slide to confirm: Place your order/ })).toBeVisible();
	// Nothing ordered: the grade misses the order, and nothing else was written.
	const g = t.grade('Nothing yet.');
	expect(g.pass).toBe(false);
	expect(g.diff.flatMap((d) => d.extra)).toEqual([]);
	await t.click(place);
	await expect(page.locator('strong.font-mono')).toBeVisible();
});

test('Zigzephyr: sign in, book the 12:00 PM to Newark in Economy, no seat, saved card', async ({ page }) => {
	const t = begin(page, 'airline/zigzephyr-one-way');
	await t.go('zigzephyr', '/account/sign-in?next=/');
	await signIn(t, page, 'contrail-sparrow-42');
	await t.click(page.getByLabel('One-way'));
	await t.select(page.getByLabel('From', { exact: true }), 'IND');
	await t.select(page.getByLabel('To', { exact: true }), 'EWR');
	await t.fill(page.getByLabel('Depart'), '2026-03-20');
	await t.click(page.getByRole('button', { name: 'Search flights' }));
	await t.click(page.getByRole('link', { name: 'Economy, $193.00, ZI 106 at 12:00 PM' }));
	await t.click(page.getByRole('link', { name: 'Continue' }));
	await t.fill(page.getByLabel('Date of birth'), '06/02/1991');
	await t.click(page.getByRole('button', { name: 'Purchase trip · $193.00' }));
	await expect(page.getByText('Trip booked')).toBeVisible();
	const code = (await page.locator('strong.font-mono').textContent())!;
	const g = t.grade(`Booked ZI 106. Confirmation code ${code}.`);
	expect(g.diff).toEqual([]);
	expect(g.pass).toBe(true);
});

test('Zigzephyr: check in, take a free middle seat, get the boarding pass by email', async ({ page }) => {
	const t = begin(page, 'airline/zigzephyr-check-in');
	await t.go('zigzephyr', '/check-in');
	await t.fill(page.getByLabel('Confirmation code'), 'K7QMRX');
	await t.fill(page.getByLabel('Last name'), 'Rivera');
	await t.click(page.getByRole('button', { name: 'Find my trip' }));
	await t.click(page.getByRole('link', { name: 'Row 13, seat B, middle, available' }));
	await t.click(page.getByRole('button', { name: 'Check in', exact: true }));
	await expect(page.getByRole('status')).toContainText('You’re checked in. Seat 13B.');
	await t.go('mailmoss');
	await t.click(page.getByRole('link', { name: /Your boarding pass: ZI 386/ }));
	const pass = (await page.getByRole('link', { name: /\/boarding-pass\/\w+$/ }).textContent())!;
	const wallet = (await page.getByRole('link', { name: /\.pkpass$/ }).textContent())!;
	expect(t.grade(`Checked in: seat 13B. Boarding pass: ${pass}\nAdd to Apple Wallet: ${wallet}`).pass).toBe(true);
});

test('Knickwhistle: headphones in range, ordered with saved details', async ({ page }) => {
	const t = begin(page, 'shop/knickwhistle-headphones');
	await t.go('knickwhistle', '/account/sign-in?next=/');
	await signIn(t, page, 'copper-kettle-42');
	await t.fill(page.getByRole('search').getByLabel('Search Knickwhistle'), 'headphones');
	await t.click(page.getByRole('search').getByRole('button', { name: 'Search' }));
	await t.click(page.getByRole('link', { name: 'Hushwell Over-Ear Bluetooth Headphones' }));
	await t.click(page.getByRole('button', { name: 'Add to Cart' }));
	await t.click(page.getByRole('link', { name: 'Proceed to checkout' }));
	await t.click(page.getByRole('button', { name: 'Place your order · $63.72' }));
	const code = (await page.locator('strong.font-mono').textContent())!;
	expect(t.grade(`Ordered the Hushwell Over-Ear Bluetooth Headphones ($59.00). Order ${code}.`).pass).toBe(true);
});

test('Tabletangle: dinner for six in Midtown between 8 and 10 next Friday, as a business meal', async ({ page }) => {
	const t = begin(page, 'dining/tabletangle-business-dinner');
	await t.go('tabletangle');
	await t.select(page.getByLabel('Date'), '2026-03-20');
	await t.select(page.getByLabel('Time'), '21:00');
	await t.select(page.getByLabel('Party size'), '6');
	await t.select(page.getByLabel('Neighborhood'), 'Midtown');
	await t.click(page.getByRole('button', { name: "Let's go" }));
	await t.click(page.getByRole('article', { name: 'Ember Ledger Steakhouse' }).getByRole('link', { name: '9:00 PM' }));
	await t.fill(page.getByLabel('Name for the reservation'), 'Sam Rivera');
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.select(page.getByLabel('Occasion'), 'business');
	await t.click(page.getByRole('button', { name: 'Complete reservation' }));
	await expect(page.getByRole('heading', { name: 'Reservation confirmed' })).toBeVisible();
	const code = (await page.locator('strong.font-mono').textContent())!;
	expect(t.grade(`Ember Ledger Steakhouse, Friday March 20 at 9 PM, for 6. Confirmation ${code}.`).pass).toBe(true);
});

test('Tabletangle: Italian for two at 12:30 today, where the first choice is full', async ({ page }) => {
	const t = begin(page, 'dining/tabletangle-italian-lunch');
	await t.go('tabletangle');
	await t.select(page.getByLabel('Time'), '12:30');
	await t.select(page.getByLabel('Cuisine'), 'Italian');
	await t.click(page.getByRole('button', { name: "Let's go" }));
	await t.click(page.getByRole('article', { name: 'Pergola Minuta' }).getByRole('link', { name: '12:30 PM' }));
	await t.fill(page.getByLabel('Name for the reservation'), 'Sam Rivera');
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.click(page.getByRole('button', { name: 'Complete reservation' }));
	await expect(page.getByRole('heading', { name: 'Reservation confirmed' })).toBeVisible();
	const code = (await page.locator('strong.font-mono').textContent())!;
	expect(t.grade(`Pergola Minuta at 12:30. Confirmation ${code}.`).pass).toBe(true);
});

test('Zigzephyr: card fields are typed inside frames, and reach the form', async ({ page }) => {
	const t = begin(page, 'airline/zigzephyr-one-way');
	await t.go('zigzephyr');
	await t.click(page.getByLabel('One-way'));
	await t.select(page.getByLabel('From', { exact: true }), 'IND');
	await t.select(page.getByLabel('To', { exact: true }), 'EWR');
	await t.fill(page.getByLabel('Depart'), '2026-03-20');
	await t.click(page.getByRole('button', { name: 'Search flights' }));
	await t.click(page.getByRole('link', { name: 'Economy, $193.00, ZI 106 at 12:00 PM' }));
	await t.click(page.getByRole('link', { name: 'Continue' }));
	await expect(page.locator('iframe[title="Secure card number field"]')).toBeVisible();
	await t.fill(page.getByLabel('Card number'), '4242 4242 4242 4242');
	await t.fill(page.getByLabel('Expires'), '08/28');
	await expect(page.locator('input[name=number]')).toHaveValue('4242 4242 4242 4242');
	await expect(page.locator('input[name=exp]')).toHaveValue('08/28');
	await expect(page.locator('input[name=number]')).toHaveAttribute('aria-hidden', 'true');
});
