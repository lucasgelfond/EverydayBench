import { expect, test } from '@playwright/test';
import { begin } from './everydaybench.ts';

test('Daybrella: tonight’s game at 7', async ({ page }) => {
	const t = begin(page, 'calendar/game-tonight');
	await t.go('daybrella');
	await t.click(page.getByRole('link', { name: 'New event', exact: true }));
	await t.fill(page.getByLabel('Title'), 'Basketball game');
	await expect(page.getByLabel('Date', { exact: true })).toHaveValue('2026-03-14');
	await t.fill(page.getByLabel('Starts'), '19:00');
	await t.fill(page.getByLabel('Location'), 'Kestrel Bay Rec Center');
	await t.click(page.getByRole('button', { name: 'Save event' }));
	await expect(page.getByRole('status')).toHaveText('Event saved.');
	await expect(page.getByText('Saturday, March 14, 7:00 PM – 8:00 PM')).toBeVisible();
	expect(t.grade('Added.').pass).toBe(true);
});

test('Daybrella: camp all day, Monday to Friday', async ({ page }) => {
	const t = begin(page, 'calendar/camp-week');
	await t.go('daybrella');
	// Today is Saturday, the week's last day: Monday is in the next week.
	await t.click(page.getByRole('link', { name: 'Next week →' }));
	await t.click(page.getByRole('link', { name: 'New event on Monday, March 16' }));
	await t.fill(page.getByLabel('Title'), 'Math camp');
	await t.click(page.getByLabel('All day'));
	await t.fill(page.getByLabel(/Last day/), '2026-03-20');
	await t.fill(page.getByLabel('Location'), 'Alder Point');
	await t.click(page.getByRole('button', { name: 'Save event' }));
	await expect(page.getByText('Monday, March 16 – Friday, March 20, all day')).toBeVisible();
	expect(t.grade('Added.').pass).toBe(true);
});
