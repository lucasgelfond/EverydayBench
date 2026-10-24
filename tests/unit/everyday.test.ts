import { beforeAll, describe, expect, test } from 'vitest';
import { seed } from '../../scripts/seed.ts';
import { ctxFor, type Ctx } from '../../src/lib/server/ctx.ts';
import { deleteRun } from '../../src/lib/server/runs.ts';
import { call } from '../../src/lib/server/evals/registry.ts';
import { grade, startTask } from '../../src/lib/server/evals/evaluate.ts';
import { loadTasks } from '../../src/lib/server/evals/task.ts';

const tasks = loadTasks();

// A run of a task where `act` stands in for the agent, graded with `report`.
function attempt(id: string, act: (ctx: Ctx) => unknown, report = '') {
	const task = tasks.get(id)!;
	const run = startTask(task);
	try {
		act(ctxFor(run));
		return grade(task, run.id, report);
	} finally {
		deleteRun(run.id);
	}
}

beforeAll(() => void seed());

describe('mail', () => {
	const mail = (to: string, body: string) => (ctx: Ctx) => call(ctx, 'mail.compose', { to, subject: 'Budget review', body });

	test('telling the right Carol passes; the near-miss Carol, a second email or a missing time fail', () => {
		expect(attempt('mail/meeting-moved', mail('carol.mendes@harborworks.test', 'Moved to 8:30 AM.')).pass).toBe(true);
		expect(attempt('mail/meeting-moved', mail('carla.mendez@mailmoss.test', 'Moved to 8:30 AM.')).pass).toBe(false);
		expect(attempt('mail/meeting-moved', mail('carol.mendes@harborworks.test', 'It moved.')).pass).toBe(false);
		const twice = attempt('mail/meeting-moved', (ctx) => (mail('carol.mendes@harborworks.test', 'Moved to 8:30 AM.')(ctx), mail('jordan@mailmoss.test', 'hi')(ctx)));
		expect(twice.pass).toBe(false);
	});

	test('asking Brian passes; asking Brianna fails', () => {
		expect(attempt('mail/ask-for-notes', mail('brian.kowalski@harborworks.test', 'Could you send your notes?')).pass).toBe(true);
		expect(attempt('mail/ask-for-notes', mail('brianna.cole@mailmoss.test', 'Could you send your notes?')).pass).toBe(false);
	});
});

describe('calendar', () => {
	const add = (e: Record<string, unknown>) => (ctx: Ctx) => call(ctx, 'calendar.add', e);

	test('the game at 7 PM tonight passes; 7 AM, tomorrow or no place fail', () => {
		const game = { title: 'Basketball', date: '2026-03-14', startTime: '19:00', location: 'Kestrel Bay Rec Center' };
		expect(attempt('calendar/game-tonight', add(game)).pass).toBe(true);
		expect(attempt('calendar/game-tonight', add({ ...game, startTime: '07:00' })).pass).toBe(false);
		expect(attempt('calendar/game-tonight', add({ ...game, date: '2026-03-15' })).pass).toBe(false);
		expect(attempt('calendar/game-tonight', add({ ...game, location: '' })).pass).toBe(false);
	});

	test('camp as one all-day event over the week passes; one a day fails', () => {
		const camp = { title: 'Math camp', date: '2026-03-16', allDay: true, endDate: '2026-03-20', location: 'Alder Point' };
		expect(attempt('calendar/camp-week', add(camp)).pass).toBe(true);
		const daily = (ctx: Ctx) => ['16', '17', '18', '19', '20'].forEach((d) => add({ ...camp, date: `2026-03-${d}`, endDate: undefined })(ctx));
		expect(attempt('calendar/camp-week', daily).pass).toBe(false);
	});
});

describe('lodging', () => {
	const save = (home: string) => (ctx: Ctx) => call(ctx, 'lodging.save', { home });

	test('saving either home that fits passes; one taken on those dates, without wifi, or two saves fail', () => {
		expect(attempt('lodging/wishlist-fits', save('port-alder-11')).pass).toBe(true);
		expect(attempt('lodging/wishlist-fits', save('port-alder-7')).pass).toBe(true);
		expect(attempt('lodging/wishlist-fits', save('port-alder-19')).pass).toBe(false);
		expect(attempt('lodging/wishlist-fits', save('port-alder-15')).pass).toBe(false);
		expect(attempt('lodging/wishlist-fits', (ctx) => (save('port-alder-11')(ctx), save('port-alder-7')(ctx))).pass).toBe(false);
	});

	test('booking the cheapest fitting home passes; the next cheapest fails; the expired card is refused', () => {
		const stay = (home: string, card = 1) => (ctx: Ctx) => call(ctx, 'lodging.book', { home, checkIn: '2026-03-20', checkOut: '2026-03-22', guests: 2, card });
		let code = '';
		const g = attempt('lodging/cheapest-with-washer', (ctx) => (code = (stay('kestrel-bay-6')(ctx) as { code: string }).code));
		expect(g.parts).toEqual({ STATE: true, ASSERT: true, ANSWER: false });
		expect(attempt('lodging/cheapest-with-washer', stay('kestrel-bay-6'), `${code}, $399.60`).pass).toBe(true);
		expect(attempt('lodging/cheapest-with-washer', stay('kestrel-bay-7'), '$430.28').parts.STATE).toBe(false);
		expect(() => attempt('lodging/cheapest-with-washer', stay('kestrel-bay-6', 2))).toThrow(/expired/);
		// Taken on one of the nights.
		expect(() => attempt('lodging/cheapest-with-washer', stay('kestrel-bay-2'))).toThrow(/no longer available/);
	});
});

describe('gym', () => {
	const all = '7:00 AM Sunrise Vinyasa with Ines Okoro; 9:30 AM Yin & Tonic with Marcus Bell; 4:00 PM Hot Yoga with Ines Okoro.';

	test('every yoga class with its instructor passes; one missing, or Harborview’s mixed in, fails', () => {
		expect(attempt('gym/yoga-tomorrow', () => undefined, all).pass).toBe(true);
		expect(attempt('gym/yoga-tomorrow', () => undefined, '7:00 AM Ines Okoro; 9:30 AM Marcus Bell').pass).toBe(false);
		expect(attempt('gym/yoga-tomorrow', () => undefined, `${all} Also Hot Yoga at Harborview with Dana Whitlock.`).pass).toBe(false);
		// Booking anything is a write the task didn't ask for.
		expect(attempt('gym/yoga-tomorrow', (ctx) => call(ctx, 'gym.book', { class: 'eastgate-20260315-0700', account: 1 }), all).pass).toBe(false);
	});

	test('the right class passes; the morning one or a second booking fail', () => {
		const book = (id: string) => (ctx: Ctx) => call(ctx, 'gym.book', { class: id, account: 1 });
		expect(attempt('gym/book-vinyasa', book('harborview-20260315-1830')).pass).toBe(true);
		expect(attempt('gym/book-vinyasa', book('harborview-20260315-0815')).pass).toBe(false);
		expect(attempt('gym/book-vinyasa', (ctx) => (book('harborview-20260315-1830')(ctx), book('harborview-20260315-1900')(ctx))).pass).toBe(false);
	});
});
