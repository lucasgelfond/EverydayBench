// Helpers for browser tests: start a task's run, open its sites in that run, count what the test does (for click
// parity between sibling sites), and grade the run with the task's own evaluation.
//
// On a hard twin's pages (hard-controls.ts), `fill`, `select` and `click` work the widgets the site puts in place of the
// plain controls, as an agent would have to; elsewhere they're Playwright's own.

import type { Locator, Page } from '@playwright/test';
import { loadTasks } from '../../src/lib/server/evals/task.ts';
import { grade, startTask } from '../../src/lib/server/evals/evaluate.ts';
import { SITES } from '../../src/lib/sites.ts';

export const tasks = loadTasks();
export const origin = (site: string) => `http://${site}.everydaybench.test:${process.env.PORT ?? 8700}`;

export function begin(page: Page, id: string) {
	const task = tasks.get(id);
	if (!task) throw new Error(`no task ${id}`);
	const run = startTask(task);
	let n = 0;
	return {
		run,
		task,
		// Opens a site in this run (the first visit sets the run's cookie for every site).
		go: async (site: string, path = '/') => {
			const res = await page.goto(`${origin(site)}${path}${path.includes('?') ? '&' : '?'}everydaybench_run=${run.id}`);
			if (SITES[site]?.skin.controls === 'hard') await page.waitForFunction(() => document.documentElement.dataset.ebReady === '1');
			return res;
		},
		click: async (l: Locator) => (n++, (await isHard(page)) ? hardClick(page, l) : l.click()),
		fill: async (l: Locator, v: string) => (n++, (await isHard(page)) ? hardFill(page, l, v) : l.fill(v)),
		select: async (l: Locator, v: string) => (n++, (await isHard(page)) ? hardSelect(page, l, v) : l.selectOption(v)),
		get interactions() {
			return n;
		},
		grade: (report: string) => grade(task, run.id, report)
	};
}

const isHard = (page: Page) => page.evaluate(() => !!document.querySelector('script[data-config]'));
// A label names the hidden control and the widget both; the control is the one the test means.
const control = (page: Page, l: Locator) => l.and(page.locator('select, input, textarea, button'));

// Lets the page put its widgets on what just rendered (it does so on the next frame after a change).
// A late banner (the "shift" variant) is waited out, so a test's click lands where it aimed; an agent gets no such wait.
const settle = async (page: Page) => {
	await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
	await page.waitForFunction(() => document.documentElement.dataset.ebBanner !== 'pending');
};

// Which widget stands in for a control (hard-controls.client.js), once the page has put it in place.
async function widgetOf(page: Page, given: Locator) {
	await settle(page);
	const l = control(page, given).and(page.locator(':not([data-eb-widget] *)'));
	const swapped = await l.evaluate((e) => e instanceof HTMLSelectElement || (e instanceof HTMLInputElement && (['date', 'time', 'number'].includes(e.type) || e.autocomplete.startsWith('cc-'))));
	if (!swapped) return undefined;
	await page.waitForFunction((e) => !!(e as HTMLElement).dataset.eb, await l.elementHandle());
	return { l, kind: (await l.getAttribute('data-eb'))!, widget: l.locator('xpath=following-sibling::*[1]') };
}

async function hardSelect(page: Page, l: Locator, v: string) {
	const w = await widgetOf(page, l);
	const box = w ? w.widget : l.locator('xpath=ancestor-or-self::*[@data-eb-widget][1]');
	await box.getByRole('combobox').click();
	await box.locator(`[role=option][data-value="${v}"]`).click();
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

async function hardFill(page: Page, given: Locator, v: string) {
	const w = await widgetOf(page, given);
	if (!w) return given.fill(v);
	const { l, kind, widget } = w;
	if (kind === 'select' || kind === 'time') return hardSelect(page, l, v);
	if (kind === 'frame') return widget.contentFrame().locator('input').fill(v);
	if (kind === 'date') {
		await widget.getByRole('button').first().click();
		const [y, m, d] = v.split('-').map(Number) as [number, number, number];
		const want = y * 12 + m - 1;
		for (;;) {
			const [name, year] = (await widget.getByRole('grid').getAttribute('aria-label'))!.split(' ');
			const at = Number(year) * 12 + MONTHS.indexOf(name!);
			if (at === want) break;
			await widget.getByRole('button', { name: at < want ? 'Next month' : 'Previous month' }).click();
		}
		const day = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
		return widget.getByRole('button', { name: day, exact: true }).click();
	}
	if (kind === 'number') {
		for (let i = 0; i < 40 && (await l.inputValue()) !== v; i++) {
			const now = Number((await l.inputValue()) || 0);
			await widget.getByRole('button', { name: Number(v) > now ? /^More/ : /^Fewer/ }).click();
		}
		return;
	}
	if (kind === 'range') {
		const thumb = widget.getByRole('slider');
		await thumb.press(v === '' ? 'End' : 'Home');
		for (let i = 0; v !== '' && i < 2000 && Number(await l.inputValue()) < Number(v); i++) await thumb.press('ArrowRight');
	}
}

// A guarded button (a purchase, a booking) is confirmed by dragging its slider all the way, as a person would.
async function hardClick(page: Page, l: Locator) {
	await settle(page);
	if ((await l.getAttribute('data-eb-guard')) !== '1') return l.click();
	const thumb = l.locator('xpath=preceding-sibling::*[1]').getByRole('slider');
	await thumb.scrollIntoViewIfNeeded();
	const track = (await l.locator('xpath=preceding-sibling::*[1]').boundingBox())!;
	const t = (await thumb.boundingBox())!;
	await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
	await page.mouse.down();
	await page.mouse.move(track.x + track.width - 4, t.y + t.height / 2, { steps: 12 });
	await page.mouse.up();
}
