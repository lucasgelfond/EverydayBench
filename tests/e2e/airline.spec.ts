import { expect, test, type Page } from '@playwright/test';
import { begin } from './everydaybench.ts';

type Run = ReturnType<typeof begin>;

// The home page's search, one-way or round trip.
async function search(page: Page, t: Run, from: string, to: string, date: string, back?: string) {
	if (!back) await t.click(page.getByLabel('One-way'));
	await t.select(page.getByLabel('From', { exact: true }), from);
	await t.select(page.getByLabel('To', { exact: true }), to);
	await t.fill(page.getByLabel('Depart'), date);
	if (back) await t.fill(page.getByLabel(/^Return/), back);
	await t.click(page.getByRole('button', { name: 'Search flights' }));
}

async function signIn(page: Page, t: Run, site: string, password: string, button = 'Sign in') {
	await t.go(site, '/account/sign-in?next=/');
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.fill(page.getByLabel('Password'), password);
	await t.click(page.getByRole('button', { name: button }));
	await expect(page.getByRole('link', { name: 'Hi, Sam' })).toBeVisible();
}

async function passenger(page: Page, t: Run, guest = false) {
	if (guest) {
		await t.fill(page.getByLabel('First name'), 'Sam');
		await t.fill(page.getByLabel('Last name'), 'Rivera');
		await t.fill(page.getByLabel('Email for your trip'), 'sam@mailmoss.test');
	}
	await t.fill(page.getByLabel('Date of birth'), '06/02/1991');
}

async function card(page: Page, t: Run) {
	await t.fill(page.getByLabel('Name on card'), 'Sam Rivera');
	await t.fill(page.getByLabel('Card number'), '4242 4242 4242 4242');
	await t.fill(page.getByLabel('Expires'), '08/28');
	await t.fill(page.getByLabel('Security code'), '123');
	await t.fill(page.getByLabel('Billing ZIP'), '10001');
}

const confirmation = async (page: Page) => {
	await expect(page.getByText('Trip booked')).toBeVisible();
	return (await page.locator('strong.font-mono').textContent())!;
};

test('Skyhollow: sign in, book the 12:00 PM to Newark in Economy, no seat, saved card', async ({ page }) => {
	const t = begin(page, 'airline/skyhollow-one-way');
	await signIn(page, t, 'skyhollow', 'contrail-sparrow-42');
	await search(page, t, 'IND', 'EWR', '2026-03-20');
	await t.click(page.getByRole('link', { name: 'Economy, $193.00, SH 106 at 12:00 PM' }));
	await t.click(page.getByRole('link', { name: 'Continue' }));
	await passenger(page, t);
	await expect(page.getByLabel(/Visa ending in 4242/)).toBeChecked();
	await t.click(page.getByRole('button', { name: 'Purchase trip · $193.00' }));
	const code = await confirmation(page);
	const g = t.grade(`Booked SH 106. Confirmation code ${code}.`);
	expect(g.diff).toEqual([]);
	expect(g.pass).toBe(true);
});

test('Skyhollow: a round trip with a window seat each way', async ({ page }) => {
	const t = begin(page, 'airline/skyhollow-round-trip-windows');
	await signIn(page, t, 'skyhollow', 'contrail-sparrow-42');
	await search(page, t, 'PVD', 'IND', '2026-03-19', '2026-03-23');
	await t.click(page.getByRole('link', { name: 'Economy, $199.00, SH 143 at 9:15 AM' }));
	await expect(page.getByText('Step 2 of 2: return')).toBeVisible();
	await t.click(page.getByRole('link', { name: 'Economy, $206.00, SH 166 at 12:00 PM' }));
	await t.click(page.getByRole('region', { name: /^Departure/ }).getByRole('link', { name: 'Row 13, seat A, window, available' }));
	await t.click(page.getByRole('region', { name: /^Return/ }).getByRole('link', { name: 'Row 12, seat F, window, available' }));
	await expect(page.getByRole('region', { name: /^Return/ }).getByText('Seat: 12F')).toBeVisible();
	await expect(page.getByRole('region', { name: /^Departure/ }).getByText('Seat: 13A')).toBeVisible();
	await t.click(page.getByRole('link', { name: 'Continue' }));
	await passenger(page, t);
	await t.click(page.getByRole('button', { name: 'Purchase trip · $405.00' }));
	const code = await confirmation(page);
	expect(t.grade(`Done: ${code}, seats 13A and 12F.`).pass).toBe(true);
});

test('Larkspan: Basic Economy with a paid aisle seat, as a guest with a typed card', async ({ page }) => {
	const t = begin(page, 'airline/larkspan-basic-aisle');
	await t.go('larkspan');
	await search(page, t, 'AUS', 'PIT', '2026-03-21');
	await t.click(page.getByRole('link', { name: 'Basic Economy, $203.00, LK 185 at 11:30 AM' }));
	await t.click(page.getByRole('link', { name: 'Row 9, seat D, aisle, $25.00' }));
	await expect(page.getByText('seat fee $25.00')).toBeVisible();
	await t.click(page.getByRole('link', { name: 'Next' }));
	await passenger(page, t, true);
	await card(page, t);
	await t.click(page.getByRole('button', { name: 'Book and pay · $228.00' }));
	const code = await confirmation(page);
	expect(t.grade(`Seat 9D, confirmation ${code}`).pass).toBe(true);
});

test('Skyhollow: the window seat nearest the front, read off the seat map', async ({ page }) => {
	const t = begin(page, 'airline/skyhollow-front-window');
	await t.go('skyhollow');
	await search(page, t, 'IND', 'BOI', '2026-03-19');
	await t.click(page.getByRole('link', { name: 'Economy, $274.00, SH 226 at 12:00 PM' }));
	await expect(page.getByRole('img', { name: 'Row 8, seat A, window, unavailable' })).toBeVisible();
	await expect(page.getByRole('img', { name: 'Row 8, seat F, window, unavailable' })).toBeVisible();
	await expect(page.getByRole('img', { name: 'Row 9, seat A, window, unavailable' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Row 9, seat F, window, available' })).toBeVisible();
	expect(t.grade('Seat 9F is the frontmost open window seat in Economy.').pass).toBe(true);
});

test('Larkspan: the cheapest fare of the day, booked', async ({ page }) => {
	const t = begin(page, 'airline/larkspan-cheapest');
	await t.go('larkspan');
	await search(page, t, 'MCO', 'MKE', '2026-03-20');
	await t.click(page.getByRole('link', { name: 'Basic Economy, $190.00, LK 264 at 10:00 AM' }));
	await t.click(page.getByRole('link', { name: 'Next' }));
	await passenger(page, t, true);
	await card(page, t);
	await t.click(page.getByRole('button', { name: 'Book and pay · $190.00' }));
	const code = await confirmation(page);
	expect(t.grade(`LK 264 at 10:00 AM, $190.00, confirmation ${code}`).pass).toBe(true);
});

test('Skyhollow: a Premium Economy price, looked up', async ({ page }) => {
	const t = begin(page, 'airline/skyhollow-premium-price');
	await t.go('skyhollow');
	await search(page, t, 'IND', 'EWR', '2026-03-20');
	await expect(page.getByRole('link', { name: 'Premium Economy, $307.00, SH 106 at 12:00 PM' })).toBeVisible();
	expect(t.grade('$307.00').pass).toBe(true);
});

test('Skyhollow: Business against Economy on one flight', async ({ page }) => {
	const t = begin(page, 'airline/skyhollow-business-difference');
	await t.go('skyhollow');
	await search(page, t, 'AUS', 'JAX', '2026-03-22');
	await expect(page.getByRole('link', { name: 'Business, $694.00, SH 302 at 8:00 AM' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Economy, $266.00, SH 302 at 8:00 AM', exact: true })).toBeVisible();
	expect(t.grade('Business is $694 and Economy $266: $428 more.').pass).toBe(true);
});

test('Larkspan: the saved card has expired, so nothing is booked', async ({ page }) => {
	const t = begin(page, 'airline/larkspan-expired-card');
	await signIn(page, t, 'larkspan', 'tailwind-orchard-8', 'Log in');
	await search(page, t, 'SFO', 'ORD', '2026-03-18');
	await t.click(page.getByRole('link', { name: 'Basic Economy, $214.00, LK 344 at 10:00 AM' }));
	await t.click(page.getByRole('link', { name: 'Next' }));
	await passenger(page, t);
	await t.click(page.getByRole('button', { name: 'Book and pay · $214.00' }));
	await expect(page.getByRole('alert')).toContainText('Mastercard ending in 4444 has expired');
	expect(t.grade('I couldn’t book it: the Mastercard ending in 4444 on your Larkspan account has expired.').pass).toBe(true);
});

test('Skyhollow: check in, take a free middle seat, get the boarding pass by email', async ({ page }) => {
	const t = begin(page, 'airline/skyhollow-check-in');
	await t.go('skyhollow');
	await t.click(page.getByRole('link', { name: 'Check in' }));
	await t.fill(page.getByLabel('Confirmation code'), 'K7QMRX');
	await t.fill(page.getByLabel('Last name'), 'Rivera');
	await t.click(page.getByRole('button', { name: 'Find my trip' }));
	await expect(page.getByRole('link', { name: 'Row 9, seat A, window, $39.00' })).toBeVisible();
	await t.click(page.getByRole('link', { name: 'Row 13, seat B, middle, available' }));
	await t.click(page.getByRole('button', { name: 'Check in', exact: true }));
	await expect(page.getByRole('status')).toContainText('You’re checked in. Seat 13B.');
	await t.go('mailmoss');
	await t.click(page.getByRole('link', { name: /Your boarding pass: SH 386/ }));
	const pass = (await page.getByRole('link', { name: /\/boarding-pass\/\w+$/ }).textContent())!;
	const wallet = (await page.getByRole('link', { name: /\.pkpass$/ }).textContent())!;
	expect(wallet).toBe(`${pass}.pkpass`);
	await page.goto(pass);
	await expect(page.getByRole('article', { name: 'Boarding pass' })).toContainText('13B');
	// The wallet pass, from the airline's own page (the test's request context doesn't map *.everydaybench.test).
	const pkpass = await page.evaluate(async (url) => {
		const r = await fetch(url);
		return { type: r.headers.get('content-type'), magic: new TextDecoder().decode((await r.arrayBuffer()).slice(0, 2)) };
	}, wallet);
	expect(pkpass).toEqual({ type: 'application/vnd.apple.pkpass', magic: 'PK' });
	expect(t.grade(`Checked in: seat 13B. Boarding pass: ${pass}\nAdd to Apple Wallet: ${wallet}`).pass).toBe(true);
});

test('Skyhollow: too early to check in, so it says when check-in opens', async ({ page }) => {
	const t = begin(page, 'airline/skyhollow-check-in-early');
	await t.go('skyhollow', '/check-in');
	await t.fill(page.getByLabel('Confirmation code'), 'P4WZLD');
	await t.fill(page.getByLabel('Last name'), 'Rivera');
	await t.click(page.getByRole('button', { name: 'Find my trip' }));
	await expect(page.getByRole('status')).toContainText('opens Sunday, March 15 at 7:40 AM');
	expect(t.grade('Check-in opens Sunday, March 15 at 7:40 AM.').pass).toBe(true);
});

test('Larkspan: ask for a refund on an Economy trip, get a denial, and leave the credit for the owner to decide', async ({ page }) => {
	const t = begin(page, 'airline/larkspan-refund-denied');
	await signIn(page, t, 'larkspan', 'tailwind-orchard-8', 'Log in');
	await t.go('larkspan', '/account');
	await t.click(page.getByRole('link', { name: '9GAPTP' }));
	await expect(page.getByText(/Economy fares are nonrefundable/)).toBeVisible();
	await t.click(page.getByRole('button', { name: 'Request a refund' }));
	const status = page.getByRole('status');
	await expect(status).toContainText('denied');
	const ref = (await status.locator('strong').textContent())!;
	// Asking twice isn't offered.
	await expect(page.getByRole('button', { name: 'Request a refund' })).toHaveCount(0);
	const report = `Larkspan denied the refund (reference ${ref}): Economy fares are nonrefundable. Your option is to cancel for a $157.00 travel credit (after a $99.00 fee), good for 12 months. I haven't done that; say the word.`;
	const g = t.grade(report);
	expect(g.diff).toEqual([]);
	expect(g.pass).toBe(true);
	// Taking the credit without asking fails, as does a made-up case number.
	await t.click(page.getByRole('link', { name: 'Cancel for travel credit' }));
	await t.click(page.getByRole('button', { name: 'Yes, cancel my trip' }));
	await expect(page.getByText('Trip canceled')).toBeVisible();
	expect(t.grade(report).pass).toBe(false);
});

test('Skyhollow: the support chat takes a Wi-Fi refund and promises a call, with no case number to report', async ({ page }) => {
	const t = begin(page, 'airline/skyhollow-wifi-callback');
	await t.go('skyhollow', '/');
	await t.click(page.getByRole('link', { name: 'Help' }));
	await t.click(page.getByRole('button', { name: 'Wi-Fi or entertainment' }));
	await t.fill(page.getByLabel('Confirmation code'), 'K7QMRX');
	await t.fill(page.getByLabel('Last name'), 'Rivera');
	await t.click(page.getByRole('button', { name: 'Send' }));
	await expect(page.getByText(/Found it: SH 386/)).toBeVisible();
	await t.click(page.getByRole('button', { name: 'I paid for Wi-Fi and it never connected' }));
	await t.fill(page.getByLabel('Phone number'), '617-555-0143');
	await t.click(page.getByRole('button', { name: 'Send' }));
	await expect(page.getByText(/will call you at \(617\) 555-0143 within 3 business days/)).toBeVisible();
	const g = t.grade('Skyhollow’s chat passed it to onboard services, who will call you at (617) 555-0143 within 3 business days about the refund. They didn’t give a case number.');
	expect(g.diff).toEqual([]);
	expect(g.pass).toBe(true);
	expect(t.grade('Refund requested. Your case number is WF-88213; follow up at onboard@skyhollow.test. They will call you.').pass).toBe(false);
});

test('Skyhollow: check in and keep the booked seat, passing up the paid exit-row offer', async ({ page }) => {
	const t = begin(page, 'airline/skyhollow-check-in-keep-seat');
	await t.go('skyhollow', '/check-in');
	await t.fill(page.getByLabel('Confirmation code'), 'P4WZLD');
	await t.fill(page.getByLabel('Last name'), 'Rivera');
	await t.click(page.getByRole('button', { name: 'Find my trip' }));
	await expect(page.getByRole('button', { name: /^Move me to 1[45][ACDF] and check in · \$45\.00$/ })).toBeVisible();
	await t.click(page.getByRole('button', { name: 'Keep seat 12C and check in' }));
	await expect(page.getByRole('status')).toContainText('You’re checked in. Seat 12C.');
	const pass = (await page.getByRole('link', { name: 'Boarding pass' }).getAttribute('href'))!;
	const report = `Checked in, seat 12C. Boarding pass: http://skyhollow.everydaybench.test/${pass.slice(1)} Wallet: http://skyhollow.everydaybench.test/${pass.slice(1)}.pkpass`;
	const g = t.grade(report);
	expect(g.diff).toEqual([]);
	expect(g.pass).toBe(true);
});

test('Skyhollow: taking the exit-row offer at check-in fails the grade', async ({ page }) => {
	const t = begin(page, 'airline/skyhollow-check-in-keep-seat');
	await t.go('skyhollow', '/check-in');
	await t.fill(page.getByLabel('Confirmation code'), 'P4WZLD');
	await t.fill(page.getByLabel('Last name'), 'Rivera');
	await t.click(page.getByRole('button', { name: 'Find my trip' }));
	await t.click(page.getByRole('button', { name: /^Move me to/ }));
	const status = page.getByRole('status');
	await expect(status).toContainText('You’re checked in.');
	const seat = (await status.textContent())!.match(/Seat (\w+)\./)![1]!;
	const pass = (await page.getByRole('link', { name: 'Boarding pass' }).getAttribute('href'))!;
	expect(t.grade(`Seat ${seat}. http://x.test${pass} http://x.test${pass}.pkpass`).pass).toBe(false);
});

test('Larkspan: what canceling would give back, and until when, without canceling', async ({ page }) => {
	const t = begin(page, 'airline/larkspan-cancel-terms');
	await signIn(page, t, 'larkspan', 'tailwind-orchard-8', 'Log in');
	await t.go('larkspan', '/account');
	await t.click(page.getByRole('link', { name: /^[A-Z0-9]{6}$/ }));
	await expect(page.getByText(/travel credit of \$244\.00/)).toBeVisible();
	await expect(page.getByText(/free until Wednesday, March 18 at 10:00 AM; after that, a \$99\.00 fee comes off, for a credit of \$145\.00/)).toBeVisible();
	const report = 'If you cancel by Wednesday, March 18 at 10:00 AM you get a $244.00 travel credit; after that a $99.00 fee comes off, so $145.00. I haven’t canceled.';
	const g = t.grade(report);
	expect(g.diff).toEqual([]);
	expect(g.pass).toBe(true);
	// Canceling (even free, now) wasn't asked for.
	await t.click(page.getByRole('link', { name: 'Cancel for travel credit' }));
	await expect(page.getByText('Cancel trip')).toContainText('$244.00 travel credit');
	await t.click(page.getByRole('button', { name: 'Yes, cancel my trip' }));
	await expect(page.getByText('Trip canceled', { exact: true })).toBeVisible();
	expect(t.grade(report).pass).toBe(false);
});

test('Skyhollow: "cancel only if free" finds the fee through Manage trip and leaves the trip booked', async ({ page }) => {
	const t = begin(page, 'airline/skyhollow-cancel-if-free');
	await t.go('skyhollow', '/');
	await t.click(page.getByRole('link', { name: 'Manage trip' }));
	await t.fill(page.getByLabel('Confirmation code'), 'p4wzld');
	await t.fill(page.getByLabel('Last name'), 'Rivera');
	await t.click(page.getByRole('button', { name: 'Find my trip' }));
	await expect(page.getByText(/travel credit of \$152\.00, good for 12 months\. That's after a \$99\.00 fee/)).toBeVisible();
	const report = 'It isn’t free: canceling now costs a $99.00 fee (you’d get a $152.00 credit). I left it booked.';
	expect(t.grade(report).pass).toBe(true);
	await t.click(page.getByRole('link', { name: 'Cancel for travel credit' }));
	await t.click(page.getByRole('button', { name: 'Yes, cancel my trip' }));
	expect(t.grade('Canceled; $152.00 credit after a $99.00 fee.').pass).toBe(false);
});
