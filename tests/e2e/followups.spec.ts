import { expect, test, type Page } from '@playwright/test';
import { begin } from './everydaybench.ts';

type Run = ReturnType<typeof begin>;

// The owner's later texts now due, from the control port, as a harness polls for them.
const followups = async (t: Run) => {
	const res = await fetch(`http://127.0.0.1:${Number(process.env.PORT ?? 8700) + 1}/runs/${t.run.id}/followups`);
	return ((await res.json()) as { text: string }[]).map((f) => f.text);
};

// Tablenook's booking form, from a restaurant's page: a day, a party size, a time, then the details.
async function book(page: Page, t: Run, restaurant: string, date: string, party: number, time: string) {
	await t.go('tablenook', `/r/${restaurant}?date=${date}&party=${party}`);
	await t.click(page.getByRole('link', { name: time, exact: true }));
	await t.fill(page.getByLabel('Name for the reservation'), 'Sam Rivera');
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.click(page.getByRole('button', { name: 'Complete reservation' }));
	await expect(page.getByRole('heading', { name: 'Reservation confirmed' })).toBeVisible();
	return (await page.locator('strong.font-mono').textContent())!;
}

test("Priya's dinner: the later email changes it to five at 8, and that's what's booked", async ({ page }) => {
	const t = begin(page, 'dining/priya-dinner-update');
	await t.go('mailmoss');
	await t.click(page.getByRole('link', { name: /Re: Dinner Tuesday\?/ }));
	await expect(page.getByText(/we're 5 now/)).toBeVisible();
	const code = await book(page, t, 'hanbit', '2026-03-17', 5, '8:00 PM');
	expect(t.grade(`Hanbit Grill House, Tuesday March 17 at 8 PM for 5. Confirmation ${code}.`).pass).toBe(true);
});

test("Carol's newer email moves the review: on the calendar at 10:30 in the Orchard Room", async ({ page }) => {
	const t = begin(page, 'calendar/budget-review-moved');
	await t.go('mailmoss');
	await t.click(page.getByRole('link', { name: /Re: Budget review Thursday/ }));
	await expect(page.getByText(/Orchard Room/)).toBeVisible();
	await t.go('daybrella');
	await t.click(page.getByRole('link', { name: 'New event', exact: true }));
	await t.fill(page.getByLabel('Title'), 'Budget review with Carol');
	await t.fill(page.getByLabel('Date', { exact: true }), '2026-03-19');
	await t.fill(page.getByLabel('Starts'), '10:30');
	await t.fill(page.getByLabel('Location'), 'Orchard Room');
	await t.click(page.getByRole('button', { name: 'Save event' }));
	await expect(page.getByRole('status')).toHaveText('Event saved.');
	expect(t.grade('Added.').pass).toBe(true);
});

test('make it four: the text comes once the booking form opens; four at 8 passes', async ({ page }) => {
	const t = begin(page, 'dining/tablenook-make-it-four');
	await t.go('tablenook', '/r/hanbit?date=2026-03-15&party=2');
	expect(await followups(t)).toEqual([]);
	await t.click(page.getByRole('link', { name: '7:00 PM', exact: true }));
	await expect(page.getByLabel('Name for the reservation')).toBeVisible();
	expect(await followups(t)).toEqual(['Wait, sorry, make it 4 people, and 8 PM instead of 7.']);
	expect(await followups(t)).toEqual([]);
	const code = await book(page, t, 'hanbit', '2026-03-15', 4, '8:00 PM');
	expect(t.grade(`4 people at 8 PM tomorrow, confirmation ${code}.`).pass).toBe(true);
});

test('make it four: booking two at 7 anyway fails', async ({ page }) => {
	const t = begin(page, 'dining/tablenook-make-it-four');
	const code = await book(page, t, 'hanbit', '2026-03-15', 2, '7:00 PM');
	expect(t.grade(`Booked, ${code}.`).pass).toBe(false);
});

test('Friday instead: the text comes after the booking; canceling Thursday and booking Friday passes', async ({ page }) => {
	const t = begin(page, 'dining/fiorellino-friday-instead');
	expect(await followups(t)).toEqual([]);
	const thursday = await book(page, t, 'fiorellino', '2026-03-19', 2, '7:00 PM');
	expect(await followups(t)).toEqual(['Actually, cancel that and do Friday at 7 instead, same place.']);
	await t.go('tablenook', `/reservations/${thursday}`);
	await t.click(page.getByRole('button', { name: 'Cancel reservation' }));
	await expect(page.getByRole('heading', { name: 'Reservation canceled' })).toBeVisible();
	const friday = await book(page, t, 'fiorellino', '2026-03-20', 2, '7:00 PM');
	expect(t.grade(`Canceled Thursday; Friday at 7 instead, confirmation ${friday}.`).pass).toBe(true);
});

test('Friday instead: booking Friday without canceling Thursday fails', async ({ page }) => {
	const t = begin(page, 'dining/fiorellino-friday-instead');
	await book(page, t, 'fiorellino', '2026-03-19', 2, '7:00 PM');
	const friday = await book(page, t, 'fiorellino', '2026-03-20', 2, '7:00 PM');
	expect(t.grade(`Friday at 7, confirmation ${friday}.`).pass).toBe(false);
});

// Lumiscope as far as checkout: signed in, two seats picked.
async function toCheckout(page: Page, t: Run) {
	await t.go('lumiscope', '/account/sign-in?next=/');
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.fill(page.getByLabel('Password'), 'lighthouse-keeper-9');
	await t.click(page.getByRole('button', { name: 'Sign in' }));
	await expect(page.getByRole('link', { name: 'Hi, Sam' })).toBeVisible();
	await t.go('lumiscope', '/showtimes/lumiscope-harborview-last-lighthouse-20260315-1845?seats=E13,E14');
	await t.click(page.getByRole('link', { name: 'Continue to checkout' }));
	await expect(page.getByLabel(/Visa ending in 4242/)).toBeChecked();
}

test('never mind: the text comes at checkout; stopping there passes', async ({ page }) => {
	const t = begin(page, 'tickets/lumiscope-never-mind');
	await toCheckout(page, t);
	expect(await followups(t)).toEqual(["Actually never mind, don't buy them. Plans changed."]);
	expect(t.grade("OK, I stopped at checkout and didn't buy anything.").pass).toBe(true);
});

test('never mind: buying anyway fails', async ({ page }) => {
	const t = begin(page, 'tickets/lumiscope-never-mind');
	await toCheckout(page, t);
	await t.click(page.getByRole('button', { name: /Place order/ }));
	await expect(page.locator('strong.font-mono')).toBeVisible();
	expect(t.grade('Bought E13 and E14.').pass).toBe(false);
});

// Skyhollow, signed in, at the day's flights from Indianapolis to Newark on March 20.
async function flights(page: Page, t: Run) {
	await t.go('skyhollow', '/account/sign-in?next=/');
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.fill(page.getByLabel('Password'), 'contrail-sparrow-42');
	await t.click(page.getByRole('button', { name: 'Sign in' }));
	await expect(page.getByRole('link', { name: 'Hi, Sam' })).toBeVisible();
	await t.click(page.getByLabel('One-way'));
	await t.select(page.getByLabel('From', { exact: true }), 'IND');
	await t.select(page.getByLabel('To', { exact: true }), 'EWR');
	await t.fill(page.getByLabel('Depart'), '2026-03-20');
	await t.click(page.getByRole('button', { name: 'Search flights' }));
}

async function purchase(page: Page, t: Run, fare: RegExp) {
	await t.click(page.getByRole('link', { name: fare }));
	await t.click(page.getByRole('link', { name: 'Continue' }));
	await t.fill(page.getByLabel('Date of birth'), '06/02/1991');
	await t.click(page.getByRole('button', { name: /^Purchase trip/ }));
	await expect(page.getByText('Trip booked')).toBeVisible();
	return (await page.locator('strong.font-mono').textContent())!;
}

test('the later flight: the text comes once booking starts; going back for the 6:20 PM passes', async ({ page }) => {
	const t = begin(page, 'airline/skyhollow-later-flight');
	await flights(page, t);
	expect(await followups(t)).toEqual([]);
	await t.click(page.getByRole('link', { name: /^Economy, .*SH 106 at 12:00 PM$/ }));
	expect(await followups(t)).toEqual(["Change of plans, I can't make noon. Get the 6:20 PM one instead, same everything else."]);
	await flights(page, t);
	const code = await purchase(page, t, /^Economy, .*SH 111 at 6:20 PM$/);
	expect(t.grade(`Booked SH 111 at 6:20 PM. Confirmation ${code}.`).pass).toBe(true);
});

test('the later flight: booking noon anyway fails', async ({ page }) => {
	const t = begin(page, 'airline/skyhollow-later-flight');
	await flights(page, t);
	const code = await purchase(page, t, /^Economy, .*SH 106 at 12:00 PM$/);
	expect(t.grade(`Booked SH 106. Confirmation ${code}.`).pass).toBe(false);
});
