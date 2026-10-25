import { expect, test, type Page } from '@playwright/test';
import { begin } from './everydaybench.ts';

// The confirmation page's code, after a booking.
const confirmation = async (page: Page) => {
	await expect(page.getByRole('heading', { name: 'Reservation confirmed' })).toBeVisible();
	return (await page.locator('strong.font-mono').textContent())!;
};

test('Osteria Vellutina: its own booking flow, a table for five at 7:30 on Thursday', async ({ page }) => {
	const t = begin(page, 'dining/vellutina-party-of-five');
	await t.go('vellutina');
	await t.click(page.getByRole('link', { name: 'Reserve a table' }));
	await t.select(page.getByLabel('Guests'), '5');
	await t.select(page.getByLabel('Day'), '2026-03-19');
	await t.click(page.getByRole('button', { name: 'Check availability' }));
	await expect(page.getByRole('radio', { name: '7:00 PM' })).toHaveCount(0);
	await t.click(page.getByRole('radio', { name: '7:30 PM' }));
	await t.click(page.getByRole('button', { name: 'Continue' }));
	await expect(page.getByText('Table for 5 on Thursday, March 19 at 7:30 PM')).toBeVisible();
	await t.fill(page.getByLabel('Name for the reservation'), 'Sam Rivera');
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.click(page.getByRole('button', { name: 'Confirm reservation' }));
	const code = await confirmation(page);
	const g = t.grade(`Booked for 5 on Thursday at 7:30. Confirmation ${code}.`);
	expect(g.diff).toEqual([]);
	expect(g.pass).toBe(true);
});

test('Tablenook: dinner for six in Midtown between 8 and 10 next Friday, as a business meal', async ({ page }) => {
	const t = begin(page, 'dining/tablenook-business-dinner');
	await t.go('tablenook');
	await t.select(page.getByLabel('Date'), '2026-03-20');
	await t.select(page.getByLabel('Time'), '21:00');
	await t.select(page.getByLabel('Party size'), '6');
	await t.select(page.getByLabel('Neighborhood'), 'Midtown');
	await t.click(page.getByRole('button', { name: "Let's go" }));
	await expect(page.getByRole('article', { name: 'Copperline Tavern' })).toContainText('No tables within 90 minutes');
	await t.click(page.getByRole('article', { name: 'Ember Ledger Steakhouse' }).getByRole('link', { name: '9:00 PM' }));
	await t.fill(page.getByLabel('Name for the reservation'), 'Sam Rivera');
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.select(page.getByLabel('Occasion'), 'business');
	await t.click(page.getByRole('button', { name: 'Complete reservation' }));
	const code = await confirmation(page);
	expect(t.grade(`Ember Ledger Steakhouse, Friday March 20 at 9 PM, for 6. Confirmation ${code}.`).pass).toBe(true);
});

test('Seatwell: two tonight in Riverside, rated over 3 stars', async ({ page }) => {
	const t = begin(page, 'dining/seatwell-riverside');
	await t.go('seatwell');
	await t.select(page.getByLabel('Neighborhood'), 'Riverside');
	await t.click(page.getByRole('button', { name: 'Find a table' }));
	const basil = page.getByRole('article', { name: 'Basil Lattice' });
	await expect(basil.getByLabel(/Rated 4\.4 out of 5/)).toBeVisible();
	await t.click(basil.getByRole('link', { name: '7:00 PM' }));
	await t.fill(page.getByLabel('Name for the reservation'), 'Sam Rivera');
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.click(page.getByRole('button', { name: 'Book it' }));
	const code = await confirmation(page);
	expect(t.grade(`Basil Lattice at 7 PM tonight. Confirmation ${code}.`).pass).toBe(true);
});

test('Tablenook: Italian for two at 12:30 today, where the first choice is full', async ({ page }) => {
	const t = begin(page, 'dining/tablenook-italian-lunch');
	await t.go('tablenook');
	await t.select(page.getByLabel('Time'), '12:30');
	await t.select(page.getByLabel('Cuisine'), 'Italian');
	await t.click(page.getByRole('button', { name: "Let's go" }));
	await expect(page.getByRole('article', { name: 'Forno Ventisette' }).getByRole('link', { name: '12:30 PM' })).toHaveCount(0);
	await t.click(page.getByRole('article', { name: 'Pergola Minuta' }).getByRole('link', { name: '12:30 PM' }));
	await t.fill(page.getByLabel('Name for the reservation'), 'Sam Rivera');
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.click(page.getByRole('button', { name: 'Complete reservation' }));
	const code = await confirmation(page);
	expect(t.grade(`Pergola Minuta at 12:30. Confirmation ${code}.`).pass).toBe(true);
});

test('Seatwell: a birthday dinner for two tonight at a 4-star place', async ({ page }) => {
	const t = begin(page, 'dining/seatwell-birthday');
	await t.go('seatwell');
	await t.select(page.getByLabel('Time'), '19:30');
	await t.click(page.getByRole('button', { name: 'Find a table' }));
	await t.click(page.getByRole('article', { name: 'Kumo Counter' }).getByRole('link', { name: '7:30 PM' }));
	await t.fill(page.getByLabel('Name for the reservation'), 'Sam Rivera');
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.select(page.getByLabel('Occasion'), 'birthday');
	await t.click(page.getByRole('button', { name: 'Book it' }));
	const code = await confirmation(page);
	// The confirmation lands in the inbox.
	await t.go('mailmoss');
	await expect(page.getByRole('link', { name: /Reservation confirmed: Kumo Counter/ })).toBeVisible();
	expect(t.grade(`Kumo Counter, tonight at 7:30. Confirmation ${code}.`).pass).toBe(true);
});

test('Tablenook and Seatwell: Ember Ledger has nothing for two from 7 to 8:30 tonight, only 9:30', async ({ page }) => {
	const t = begin(page, 'dining/ember-ledger-late');
	for (const site of ['tablenook', 'seatwell']) {
		await t.go(site, '/r/ember-ledger');
		await expect(page.getByRole('list', { name: 'Open times at Ember Ledger Steakhouse' }).getByRole('link')).toHaveText(['9:30 PM']);
	}
	const g = t.grade('Ember Ledger has nothing for two between 7 and 8:30 tonight. The only table is at 9:30 PM; I didn’t book it.');
	expect(g.diff).toEqual([]);
	expect(g.pass).toBe(true);
});

test('Tablenook: Saturday for four, 7 to 9: Quillon at 7:30, Ember Ledger at 8:30, each with a fee to cancel; found, not booked', async ({ page }) => {
	const t = begin(page, 'dining/find-saturday-four');
	await t.go('tablenook');
	await t.select(page.getByLabel('Date'), '2026-03-21');
	await t.select(page.getByLabel('Time'), '20:00');
	await t.select(page.getByLabel('Party size'), '4');
	await t.click(page.getByRole('button', { name: "Let's go" }));
	await expect(page.getByRole('article', { name: 'Brasserie Quillon' }).getByRole('link', { name: '7:30 PM' })).toBeVisible();
	await expect(page.getByRole('article', { name: 'Ember Ledger Steakhouse' }).getByRole('link', { name: '8:30 PM' })).toBeVisible();
	// The fee is on the restaurant's page and next to the booking form, before anything is booked.
	await t.go('tablenook', '/r/ember-ledger?date=2026-03-21&party=4');
	await expect(page.getByText('Cancellation policy: $50.00 per person')).toBeVisible();
	await t.click(page.getByRole('link', { name: '8:30 PM' }));
	await expect(page.getByText('Cancellation policy: $50.00 per person')).toBeVisible();
	const g = t.grade('For four on Saturday between 7 and 9: Brasserie Quillon at 7:30 PM, Ember Ledger at 8:30 PM. Both charge $50 a person to cancel late. Which do you want?');
	expect(g.diff).toEqual([]);
	expect(g.pass).toBe(true);
});
