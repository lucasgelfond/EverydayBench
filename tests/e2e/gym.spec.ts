import { expect, test } from '@playwright/test';
import { begin } from './everydaybench.ts';

test('Sweatlantis: tomorrow’s yoga at Eastgate, without signing in', async ({ page }) => {
	const t = begin(page, 'gym/yoga-tomorrow');
	await t.go('sweatlantis');
	await t.click(page.getByRole('link', { name: 'Class schedule', exact: true }));
	await t.click(page.getByRole('navigation', { name: 'Locations' }).getByRole('link', { name: 'Sweatlantis Eastgate' }));
	await t.click(page.getByRole('link', { name: 'Tomorrow' }));
	await t.click(page.getByRole('navigation', { name: 'Class types' }).getByRole('link', { name: 'yoga' }));
	const rows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
	await expect(rows).toHaveCount(3);
	const report = (await rows.allTextContents()).join('\n');
	expect(t.grade(report).pass).toBe(true);
});

test('Sweatlantis: sign in and book tomorrow’s 6:30 PM Vinyasa at Harborview', async ({ page }) => {
	const t = begin(page, 'gym/book-vinyasa');
	await t.go('sweatlantis', '/schedule?location=harborview');
	await t.click(page.getByRole('link', { name: 'Tomorrow' }));
	await t.click(page.getByRole('row', { name: /6:30 PM/ }).getByRole('link', { name: 'Vinyasa After Dark' }));
	await t.click(page.getByRole('link', { name: 'Sign in to book' }));
	await t.fill(page.getByLabel('Email'), 'sam@mailmoss.test');
	await t.fill(page.getByLabel('Password'), 'deep-end-squats');
	await t.click(page.getByRole('button', { name: 'Sign in' }));
	await t.click(page.getByRole('button', { name: 'Book this class' }));
	await expect(page.getByRole('status')).toContainText('You’re booked');
	const g = t.grade('Booked.');
	expect(g.diff).toEqual([]);
	expect(g.pass).toBe(true);
});
