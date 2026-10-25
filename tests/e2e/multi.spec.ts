import { expect, test, type Page } from '@playwright/test';
import { begin } from './everydaybench.ts';

type Run = ReturnType<typeof begin>;

// The code on a confirmation page.
const code = async (page: Page) => (await page.locator('strong.font-mono').textContent())!;

// A timed event on Daybrella, from the week view (`next` weeks ahead).
async function event(page: Page, t: Run, day: string, title: string, start: string, next = 1) {
	await t.go('daybrella');
	for (let i = 0; i < next; i++) await t.click(page.getByRole('link', { name: 'Next week →' }));
	await t.click(page.getByRole('link', { name: `New event on ${day}` }));
	await t.fill(page.getByLabel('Title'), title);
	await t.fill(page.getByLabel('Starts'), start);
	await t.click(page.getByRole('button', { name: 'Save event' }));
	await expect(page.getByRole('status')).toHaveText('Event saved.');
}

// Replying to an email in Mailmoss, found by its subject.
async function reply(page: Page, t: Run, subject: RegExp, text: string) {
	await t.go('mailmoss');
	await t.click(page.getByRole('link', { name: subject }));
	await t.click(page.getByRole('link', { name: 'Reply' }));
	await t.fill(page.getByLabel('Message'), text);
	await t.click(page.getByRole('button', { name: 'Send' }));
	await expect(page.getByRole('status')).toHaveText('Message sent.');
}

// Jordan's email and the calendar leave Thursday at 7:30: a table at Fiorellino.
async function dinnerWithJordan(page: Page, t: Run) {
	await t.go('mailmoss');
	await t.click(page.getByRole('link', { name: /Dinner this week\?/ }));
	await expect(page.getByText(/Wednesday or Thursday from 7:30 on/)).toBeVisible();
	await t.go('daybrella');
	await t.click(page.getByRole('link', { name: 'Next week →' }));
	await expect(page.getByRole('region', { name: 'Wednesday, March 18' })).toContainText('Book club');
	await expect(page.getByRole('region', { name: 'Friday, March 20' })).toContainText('Team offsite');
	await t.go('tablenook');
	await t.select(page.getByLabel('Date'), '2026-03-19');
	await t.select(page.getByLabel('Time'), '19:30');
	await t.select(page.getByLabel('Cuisine'), 'Italian');
	await t.click(page.getByRole('button', { name: "Let's go" }));
	await t.click(page.getByRole('article', { name: 'Trattoria Fiorellino' }).getByRole('link', { name: '7:30 PM' }));
	await t.fill(page.getByLabel('Name for the reservation'), 'Sam Rivera');
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.click(page.getByRole('button', { name: 'Complete reservation' }));
	await expect(page.getByRole('heading', { name: 'Reservation confirmed' })).toBeVisible();
	return code(page);
}

test('Dinner when we’re both free: Jordan’s email, the calendar, Tablenook, then the calendar and a reply', async ({ page }) => {
	const t = begin(page, 'multi/dinner-when-free');
	const c = await dinnerWithJordan(page, t);
	await event(page, t, 'Thursday, March 19', 'Dinner with Jordan', '19:30');
	await reply(page, t, /Dinner this week\?/, 'Booked Trattoria Fiorellino for Thursday at 7:30!');
	expect(t.grade(`Trattoria Fiorellino, Thursday at 7:30. Confirmation ${c}.`).pass).toBe(true);
});

test('Dinner when we’re both free: booked and Jordan told, but not on the calendar, fails', async ({ page }) => {
	const t = begin(page, 'multi/dinner-when-free');
	const c = await dinnerWithJordan(page, t);
	await reply(page, t, /Dinner this week\?/, 'Booked Trattoria Fiorellino for Thursday at 7:30!');
	const g = t.grade(`Confirmation ${c}.`);
	expect(g.pass).toBe(false);
	expect(g.assertions.filter((a) => !a.pass).map((a) => a.fn)).toEqual(['event_for_reservation']);
});

// Flights, the stay and dinner, each on its site; `back` is the return flight's link.
async function weddingTrip(page: Page, t: Run, back: string, total: string) {
	await t.go('skyhollow', '/account/sign-in?next=/');
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.fill(page.getByLabel('Password'), 'contrail-sparrow-42');
	await t.click(page.getByRole('button', { name: 'Sign in' }));
	await expect(page.getByRole('link', { name: 'Hi, Sam' })).toBeVisible();
	await t.select(page.getByLabel('From', { exact: true }), 'BOS');
	await t.select(page.getByLabel('To', { exact: true }), 'KBY');
	await t.fill(page.getByLabel('Depart'), '2026-03-20');
	await t.fill(page.getByLabel(/^Return/), '2026-03-22');
	await t.click(page.getByRole('button', { name: 'Search flights' }));
	await t.click(page.getByRole('link', { name: 'Economy, $198.00, SH 585 at 11:30 AM' }));
	await t.click(page.getByRole('link', { name: back }));
	await t.click(page.getByRole('link', { name: 'Continue' }));
	await t.fill(page.getByLabel('Date of birth'), '06/02/1991');
	await t.click(page.getByRole('button', { name: `Purchase trip · ${total}` }));
	await expect(page.getByText('Trip booked')).toBeVisible();
	const trip = await code(page);

	await t.go('roostable', '/?city=Kestrel+Bay&checkIn=2026-03-20&checkOut=2026-03-22&guests=2&maxPrice=199');
	await t.click(page.getByRole('link', { name: 'Seaglass Apartment' }));
	await t.click(page.getByRole('button', { name: 'Reserve' }));
	await t.click(page.getByRole('button', { name: /Confirm and pay/ }));
	const stay = await code(page);

	await t.go('seatwell');
	await t.select(page.getByLabel('Date'), '2026-03-20');
	await t.select(page.getByLabel('Time'), '19:30');
	await t.select(page.getByLabel('Neighborhood'), 'Harborview');
	await t.click(page.getByRole('button', { name: 'Find a table' }));
	await t.click(page.getByRole('article', { name: 'Olive Steps' }).getByRole('link', { name: '7:30 PM' }));
	await t.fill(page.getByLabel('Name for the reservation'), 'Sam Rivera');
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.click(page.getByRole('button', { name: 'Book it' }));
	await expect(page.getByRole('heading', { name: 'Reservation confirmed' })).toBeVisible();
	const dinner = await code(page);

	await event(page, t, 'Friday, March 20', 'Flight SH 585 to Kestrel Bay', '11:30');
	await event(page, t, 'Sunday, March 22', 'Flight home', '11:30', 2);
	await event(page, t, 'Friday, March 20', 'Dinner at Olive Steps', '19:30');
	return `Flights ${trip}, Seaglass Apartment ${stay}, Olive Steps ${dinner}.`;
}

test('Wedding trip: the cheapest nonstops on Skyhollow, Seaglass on Roostable, Olive Steps after the rehearsal, all on the calendar', async ({ page }) => {
	const t = begin(page, 'multi/wedding-trip');
	const report = await weddingTrip(page, t, 'Economy, $254.00, SH 605 at 11:30 AM', '$452.00');
	const g = t.grade(report);
	expect(g.assertions.filter((a) => !a.pass)).toEqual([]);
	expect(g.pass).toBe(true);
});

test('Wedding trip: the cheaper return with a stop in Denver fails', async ({ page }) => {
	const t = begin(page, 'multi/wedding-trip');
	const g = t.grade(await weddingTrip(page, t, 'Economy, $215.00, SH 608 at 2:00 PM', '$413.00'));
	expect(g.assertions.filter((a) => !a.pass).map((a) => a.fn)).toEqual(['trip_flights', 'trip_plan']);
});

// Jordan's email names the show and their seats; the seat next to them, bought on Lumiscope.
async function seatNextToJordan(page: Page, t: Run, seat: string) {
	await t.go('mailmoss');
	await t.click(page.getByRole('link', { name: /Paper Moons Friday!/ }));
	await expect(page.getByText(/G4 and G5/)).toBeVisible();
	await t.go('lumiscope', '/account/sign-in?next=/');
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.fill(page.getByLabel('Password'), 'lighthouse-keeper-9');
	await t.click(page.getByRole('button', { name: 'Sign in' }));
	await expect(page.getByRole('link', { name: 'Hi, Sam' })).toBeVisible();
	await t.fill(page.getByLabel('Find your theatre'), 'Harbor');
	await t.click(page.getByRole('link', { name: /Lumiscope Harborview 8/ }));
	await t.click(page.getByRole('link', { name: 'Fri Fri 20' }));
	const film = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Paper Moons' }) });
	await t.click(film.getByRole('link', { name: /^7:10 PM/ }));
	await expect(page.getByRole('link', { name: 'Row G, seat 5, available' })).toHaveCount(0);
	await t.click(page.getByRole('link', { name: `Row G, seat ${seat.slice(1)}, available` }));
	await expect(page.getByText(`1 seat: ${seat}`)).toBeVisible();
	await t.click(page.getByRole('link', { name: 'Continue to checkout' }));
	await t.click(page.getByRole('button', { name: /Place order/ }));
	return code(page);
}

test('Movie with Jordan: G6, next to their G4 and G5, on the calendar, and Jordan told', async ({ page }) => {
	const t = begin(page, 'multi/movie-with-jordan');
	const c = await seatNextToJordan(page, t, 'G6');
	await event(page, t, 'Friday, March 20', 'Paper Moons', '19:10');
	await reply(page, t, /Paper Moons Friday!/, 'Got G6, right next to you!');
	expect(t.grade(`Got G6. Confirmation ${c}.`).pass).toBe(true);
});

test('Movie with Jordan: a seat that isn’t next to them fails', async ({ page }) => {
	const t = begin(page, 'multi/movie-with-jordan');
	await seatNextToJordan(page, t, 'G8');
	await event(page, t, 'Friday, March 20', 'Paper Moons', '19:10');
	await reply(page, t, /Paper Moons Friday!/, 'Got G8!');
	expect(t.grade('Got G8.').assertions.filter((a) => !a.pass).map((a) => a.fn)).toEqual(['order_seats', 'sent']);
});
