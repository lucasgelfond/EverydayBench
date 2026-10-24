import { expect, test } from '@playwright/test';
import { origin } from './everydaybench.ts';
import { createRun, deleteRun } from '../../src/lib/server/runs.ts';
import { ctxFor } from '../../src/lib/server/ctx.ts';
import { scheduleAt, theatersOf } from '../../src/lib/server/catalog.ts';
import { show } from '../../src/lib/server/actions/tickets.ts';
import { SITES } from '../../src/lib/sites.ts';
import { clock } from '../../src/lib/time.ts';

// Sibling chains differ only in look and wording: the same errand takes the same steps and clicks on each. The errand:
// a guest buys two seats side by side for tomorrow's first evening show at the chain's first theater, with a typed card.
const counts: Record<string, number> = {};
test.describe.configure({ mode: 'serial' });

for (const site of ['lumiscope', 'orbelle', 'brightreel']) {
	test(`${site}: a guest buys two seats together`, async ({ page }) => {
		const run = createRun({ scenario: 'tickets-v1', clock: '2026-03-14T10:00:00', id: `parity-${site}-${Date.now().toString(36)}` });
		const ctx = ctxFor(run);
		const theater = theatersOf(ctx, SITES[site]!)[0]!;
		const evening = scheduleAt(ctx, theater, '2026-03-15').flatMap(({ film, shows }) => shows.map((s) => ({ film, s }))).filter(({ s }) => s.startsAt >= '2026-03-15T18:00').sort((a, b) => a.s.startsAt.localeCompare(b.s.startsAt))[0]!;
		const full = show(ctx, site, evening.s.id)!;
		// Two free seats side by side, not across an aisle.
		let pair: [string, string] | undefined;
		for (let r = 0; r < full.room!.rows && !pair; r++)
			for (let n = 1; n < full.room!.cols && !pair; n++) {
				const a = `${String.fromCharCode(65 + r)}${n}`;
				const b = `${String.fromCharCode(65 + r)}${n + 1}`;
				if (![a, b].some((x) => full.sold.includes(x) || full.room!.gaps.includes(x)) && !full.room!.aisles.includes(n)) pair = [a, b];
			}
		let n = 0;
		const click = async (l: ReturnType<typeof page.getByRole>) => (n++, l.click());
		const fill = async (l: ReturnType<typeof page.getByLabel>, v: string) => (n++, l.fill(v));
		try {
			await page.goto(`${origin(site)}/?everydaybench_run=${run.id}`);
			await fill(page.getByRole('search').getByRole('textbox'), theater.area);
			await click(page.getByRole('link', { name: new RegExp(theater.name) }));
			await click(page.getByRole('link', { name: /Tomorrow/ }));
			const film = page.getByRole('article').filter({ has: page.getByRole('heading', { name: evening.film.title, exact: true }) });
			await click(film.getByRole('link', { name: new RegExp(`^${clock(evening.s.startsAt)}`) }).first());
			for (const seat of pair!) await click(page.getByRole('link', { name: `Row ${seat[0]}, seat ${seat.slice(1)}, available` }));
			await click(page.getByRole('link', { name: SITES[site]!.skin.words.continue! }));
			await fill(page.getByLabel('Email for your tickets'), 'sam@mailmoss.test');
			await fill(page.getByLabel('Name on card'), 'Sam Rivera');
			await fill(page.getByLabel('Card number'), '4242 4242 4242 4242');
			await fill(page.getByLabel('Expires'), '08/28');
			await fill(page.getByLabel('Security code'), '123');
			await fill(page.getByLabel('Billing ZIP'), '10001');
			await click(page.getByRole('button', { name: new RegExp(SITES[site]!.skin.words.purchase!) }));
			await expect(page.getByText('Order confirmed')).toBeVisible();
			counts[site] = n;
		} finally {
			deleteRun(run.id);
		}
	});
}

test('every chain took the same number of steps', () => {
	expect(Object.keys(counts)).toHaveLength(3);
	expect(new Set(Object.values(counts)).size, JSON.stringify(counts)).toBe(1);
});
