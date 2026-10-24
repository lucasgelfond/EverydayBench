import { expect, test } from '@playwright/test';
import { origin } from './everydaybench.ts';
import { createRun, deleteRun } from '../../src/lib/server/runs.ts';
import { ctxFor } from '../../src/lib/server/ctx.ts';
import { search, takenOn } from '../../src/lib/server/actions/airline.ts';
import { CABINS } from '../../src/lib/airline.ts';
import { SITES, word } from '../../src/lib/sites.ts';
import { clock, money } from '../../src/lib/time.ts';

// Sibling airlines differ only in look and wording (one lists flights as cards, the other as a table): the same errand
// takes the same steps on each. The errand: a guest books the day after tomorrow's first Indianapolis-Newark flight in
// Economy, with the frontmost free window seat, paying with a typed card.
const counts: Record<string, number> = {};
test.describe.configure({ mode: 'serial' });

for (const site of ['skyhollow', 'larkspan']) {
	test(`${site}: a guest books a window seat in Economy`, async ({ page }) => {
		const run = createRun({ scenario: 'tickets-v1', clock: '2026-03-14T10:00:00', id: `parity-${site}-${Date.now().toString(36)}` });
		const ctx = ctxFor(run);
		const f = search(ctx, site, 'IND', 'EWR', '2026-03-16')[0]!;
		const held = new Set(takenOn(ctx, site, f.id));
		const economy = CABINS.find((c) => c.id === 'economy')!;
		let seat = '';
		for (let row = economy.first; !seat; row++) seat = ['A', 'F'].map((l) => `${row}${l}`).find((s) => !held.has(s)) ?? '';
		let n = 0;
		const click = async (l: ReturnType<typeof page.getByRole>) => (n++, l.click());
		const fill = async (l: ReturnType<typeof page.getByLabel>, v: string) => (n++, l.fill(v));
		try {
			await page.goto(`${origin(site)}/?everydaybench_run=${run.id}`);
			await click(page.getByLabel('One-way'));
			n++, await page.getByLabel('From', { exact: true }).selectOption('IND');
			n++, await page.getByLabel('To', { exact: true }).selectOption('EWR');
			await fill(page.getByLabel('Depart'), '2026-03-16');
			await click(page.getByRole('button', { name: 'Search flights' }));
			await click(page.getByRole('link', { name: `Economy, ${money(f.economyCents)}, ${f.number} at ${clock(f.departsAt)}`, exact: true }));
			await click(page.getByRole('link', { name: `Row ${seat.slice(0, -1)}, seat ${seat.slice(-1)}, window, available` }));
			await expect(page.getByText(`Seat: ${seat}`)).toBeVisible();
			await click(page.getByRole('link', { name: word(SITES[site]!, 'continue'), exact: true }));
			await fill(page.getByLabel('First name'), 'Sam');
			await fill(page.getByLabel('Last name'), 'Rivera');
			await fill(page.getByLabel('Date of birth'), '06/02/1991');
			await fill(page.getByLabel('Email for your trip'), 'sam@mailmoss.test');
			await fill(page.getByLabel('Name on card'), 'Sam Rivera');
			await fill(page.getByLabel('Card number'), '4242 4242 4242 4242');
			await fill(page.getByLabel('Expires'), '08/28');
			await fill(page.getByLabel('Security code'), '123');
			await fill(page.getByLabel('Billing ZIP'), '10001');
			await click(page.getByRole('button', { name: new RegExp(word(SITES[site]!, 'purchase')) }));
			await expect(page.getByText('Trip booked')).toBeVisible();
			await expect(page.getByText(`Seat ${seat}`)).toBeVisible();
			counts[site] = n;
		} finally {
			deleteRun(run.id);
		}
	});
}

test('both airlines took the same number of steps', () => {
	expect(Object.keys(counts)).toHaveLength(2);
	expect(new Set(Object.values(counts)).size, JSON.stringify(counts)).toBe(1);
});
