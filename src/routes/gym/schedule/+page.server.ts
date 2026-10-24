import { and, asc, eq, like } from 'drizzle-orm';
import { classes, locations } from '#lib/server/schema.ts';
import { spotsLeft } from '#lib/server/actions/gym.ts';
import { addDays, day } from '#lib/time.ts';

const KINDS = ['yoga', 'cycling', 'strength', 'hiit', 'pilates', 'dance', 'aqua'];

// One location's classes on one day (today, the first location, by default), optionally of one kind.
export const load = ({ locals, url }) => {
	const db = locals.ctx.db('sweatlantis');
	const all = db.select().from(locations).orderBy(asc(locations.name)).all();
	const today = day(locals.ctx.now());
	const location = all.find((l) => l.id === url.searchParams.get('location')) ?? all[0]!;
	const asked = url.searchParams.get('date') ?? '';
	const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
	const date = days.includes(asked) ? asked : today;
	const kind = KINDS.includes(url.searchParams.get('kind') ?? '') ? url.searchParams.get('kind')! : '';
	const rows = db
		.select()
		.from(classes)
		.where(and(eq(classes.location, location.id), like(classes.startsAt, `${date}%`), kind ? eq(classes.kind, kind) : undefined))
		.orderBy(asc(classes.startsAt))
		.all();
	return { locations: all, location, date, days, kind, kinds: KINDS, classes: rows.map((c) => ({ ...c, left: spotsLeft(locals.ctx, c) })), now: locals.ctx.now() };
};
