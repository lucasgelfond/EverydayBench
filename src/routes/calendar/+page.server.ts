import { and, asc, gte, lte } from 'drizzle-orm';
import { events } from '#lib/server/schema.ts';
import { addDays, day } from '#lib/time.ts';

// A week, Sunday to Saturday, around ?date (today by default).
export const load = ({ locals, url }) => {
	const today = day(locals.ctx.now());
	const asked = url.searchParams.get('date');
	const date = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : today;
	const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
	const first = addDays(date, -weekday);
	const days = Array.from({ length: 7 }, (_, i) => addDays(first, i));
	const last = days[6]!;
	// Events touching the week: starting by its end, ending from its start (dates sort before their times).
	const rows = locals.ctx.db('daybrella').select().from(events).where(and(lte(events.start, `${last}T99`), gte(events.end, first))).orderBy(asc(events.allDay), asc(events.start)).all();
	return {
		days: days.map((d) => ({ date: d, events: rows.filter((e) => e.start.slice(0, 10) <= d && e.end.slice(0, 10) >= d).sort((a, b) => Number(b.allDay) - Number(a.allDay)) })),
		prev: addDays(first, -7),
		next: addDays(first, 7)
	};
};
