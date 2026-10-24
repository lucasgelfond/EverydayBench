// Daybrella: every write the calendar makes. Events are added and deleted; nothing else changes.

import { eq } from 'drizzle-orm';
import { events } from '../schema.ts';
import type { Ctx } from '../ctx.ts';
import { defineActions, must } from '../evals/registry.ts';
import { added, defineAssertions } from '../evals/assertions.ts';
import { addMinutes } from '../../time.ts';

export interface NewEvent {
	title: string;
	date: string;
	allDay?: boolean;
	// Timed events: "19:00", and an end (an hour later if not given).
	startTime?: string;
	endTime?: string;
	// All-day events: the last day (the same day if not given).
	endDate?: string;
	location?: string;
	notes?: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;
const pad = (t: string) => t.padStart(5, '0');

export function addEvent(ctx: Ctx, e: NewEvent): { ok: true; id: number } | { ok: false; error: string } {
	const title = e.title.trim();
	if (!title) return { ok: false, error: 'Give the event a title.' };
	if (!DATE.test(e.date)) return { ok: false, error: 'Choose a date.' };
	let start: string, end: string;
	if (e.allDay) {
		const last = e.endDate || e.date;
		if (!DATE.test(last)) return { ok: false, error: 'Choose the last day.' };
		if (last < e.date) return { ok: false, error: 'The last day can’t be before the first.' };
		[start, end] = [e.date, last];
	} else {
		if (!e.startTime || !TIME.test(e.startTime)) return { ok: false, error: 'Choose a start time, or make it an all-day event.' };
		start = `${e.date}T${pad(e.startTime)}:00`;
		if (e.endTime && !TIME.test(e.endTime)) return { ok: false, error: 'Choose a valid end time.' };
		end = e.endTime ? `${e.date}T${pad(e.endTime)}:00` : addMinutes(start, 60);
		if (end <= start) return { ok: false, error: 'The event has to end after it starts.' };
	}
	const row = ctx
		.db('daybrella')
		.insert(events)
		.values({ title, allDay: Boolean(e.allDay), start, end, location: e.location?.trim() ?? '', notes: e.notes?.trim() ?? '' })
		.returning({ id: events.id })
		.get();
	return { ok: true, id: row.id };
}

export const deleteEvent = (ctx: Ctx, id: number) => ctx.db('daybrella').delete(events).where(eq(events.id, id)).run();

defineActions({
	'calendar.add': (ctx, a) => must(addEvent(ctx, a as unknown as NewEvent), 'add event'),
	'calendar.delete': (ctx, a) => deleteEvent(ctx, Number(a.id))
});

const has = (v: unknown, part: unknown) => part === undefined || String(v).toLowerCase().includes(String(part).toLowerCase());

defineAssertions({
	// Events the run added that match: a title and place containing these words, exact start and end, all day or not.
	event: (_ctx, a, { made }) =>
		added(made, 'events', 'daybrella').filter(
			(e) =>
				has(e.title, a.title_has) &&
				has(e.location, a.location_has) &&
				(a.start === undefined || e.start === a.start) &&
				(a.end === undefined || e.end === a.end) &&
				(a.all_day === undefined || Boolean(e.all_day) === a.all_day)
		).length
});
