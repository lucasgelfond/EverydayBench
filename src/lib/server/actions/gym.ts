// Sweatlantis: every write the gym makes. Members book (and cancel) spots in classes; the schedule is read-only.

import { and, count, eq } from 'drizzle-orm';
import { bookings, classes, locations } from '../schema.ts';
import { send } from './mail.ts';
import type { Ctx } from '../ctx.ts';
import { defineActions, must } from '../evals/registry.ts';
import { clock, longDate } from '../../time.ts';

const SITE = 'sweatlantis';

export type GymClass = typeof classes.$inferSelect;

export const spotsLeft = (ctx: Ctx, c: GymClass) => c.capacity - c.held - ctx.db(SITE).select({ n: count() }).from(bookings).where(eq(bookings.class, c.id)).get()!.n;

export function bookClass(ctx: Ctx, id: string, account: number): { ok: true } | { ok: false; error: string } {
	const db = ctx.db(SITE);
	const c = db.select().from(classes).where(eq(classes.id, id)).get();
	if (!c) return { ok: false, error: 'That class isn’t on the schedule.' };
	if (c.startsAt <= ctx.now()) return { ok: false, error: 'This class has already started.' };
	if (db.select().from(bookings).where(and(eq(bookings.class, id), eq(bookings.account, account))).get()) return { ok: false, error: 'You’re already booked into this class.' };
	if (spotsLeft(ctx, c) < 1) return { ok: false, error: 'This class is full.' };
	db.insert(bookings).values({ class: id, account }).run();
	const where = db.select().from(locations).where(eq(locations.id, c.location)).get()!;
	send(ctx, {
		from: SITE,
		kind: 'order',
		subject: `You're booked: ${c.name}, ${longDate(c.startsAt.slice(0, 10))} at ${clock(c.startsAt)}`,
		body: `See you there!\n\n${c.name} with ${c.instructor}\n${longDate(c.startsAt.slice(0, 10))}, ${clock(c.startsAt)} (${c.minutes} min)\n${where.name}, ${c.room}\n\nCan't make it? Cancel from your account up to an hour before.`,
		data: { class: id }
	});
	return { ok: true };
}

export const cancelClass = (ctx: Ctx, id: string, account: number) => ctx.db(SITE).delete(bookings).where(and(eq(bookings.class, id), eq(bookings.account, account))).run();

defineActions({
	'gym.book': (ctx, a) => must(bookClass(ctx, String(a.class), Number(a.account ?? 1)), 'book class'),
	'gym.cancel': (ctx, a) => cancelClass(ctx, String(a.class), Number(a.account ?? 1))
});

