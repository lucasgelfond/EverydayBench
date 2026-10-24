import { expect, test } from '@playwright/test';
import { begin } from './everydaybench.ts';

test('Mailmoss: reply to Carol that the meeting moved', async ({ page }) => {
	const t = begin(page, 'mail/meeting-moved');
	await t.go('mailmoss');
	await t.click(page.getByRole('link', { name: /Budget review Thursday/ }));
	await t.click(page.getByRole('link', { name: 'Reply' }));
	await expect(page.getByLabel('To')).toHaveValue('carol.mendes@harborworks.test');
	await t.fill(page.getByLabel('Message'), "Hi Carol, Thursday's budget review has moved to 8:30 AM.");
	await t.click(page.getByRole('button', { name: 'Send' }));
	await expect(page.getByRole('status')).toHaveText('Message sent.');
	expect(t.grade('Sent.').pass).toBe(true);
});

test('Mailmoss: find Brian in Contacts and ask for the notes', async ({ page }) => {
	const t = begin(page, 'mail/ask-for-notes');
	await t.go('mailmoss');
	await t.click(page.getByRole('link', { name: 'Contacts' }));
	await t.fill(page.getByLabel('Search contacts'), 'Brian');
	await page.getByLabel('Search contacts').press('Enter');
	await t.click(page.getByRole('link', { name: 'Email Brian Kowalski' }));
	await t.fill(page.getByLabel('Subject'), 'Planning meeting notes');
	await t.fill(page.getByLabel('Message'), "Could you send me your notes from Friday's planning meeting?");
	await t.click(page.getByRole('button', { name: 'Send' }));
	await expect(page.getByRole('status')).toHaveText('Message sent.');
	const g = t.grade('Asked Brian for the notes.');
	expect(g.assertions.every((a) => a.pass)).toBe(true);
	expect(g.pass).toBe(true);
});
