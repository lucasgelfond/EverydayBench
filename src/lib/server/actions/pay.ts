// Tallypay: a hosted checkout on its own origin. A merchant opens a session and sends the shopper there; the shopper
// pays with a typed card or with an "Express" card saved under their email, unlocked by a code emailed to them; the
// merchant's order is completed the moment the charge goes through (as a webhook would), whether or not the shopper
// follows the redirect back.

import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { charges, codes, express, sessions } from '../schema.ts';
import { checkCard, type CardInput } from '../cards.ts';
import { code, digits } from '../rand.ts';
import { send } from './mail.ts';
import { purchase, show, FEE_CENTS, type Result } from './tickets.ts';
import { siteName, type Ctx } from '../ctx.ts';
import { defineActions, must } from '../evals/registry.ts';
import { addMinutes, clock, day, longDate } from '../../time.ts';

export function startCheckout(ctx: Ctx, { merchant, showtime, quantity, email }: { merchant: string; showtime: string; quantity: number; email: string }): Result<{ url: string }> {
	const s = show(ctx, merchant, showtime);
	if (!s) return { ok: false, error: 'That showtime is no longer available.' };
	if (quantity < 1 || quantity > 10) return { ok: false, error: 'Choose between 1 and 10 tickets.' };
	if (s.capacity !== null && s.sold.length + quantity > s.capacity) return { ok: false, error: `Only ${s.capacity - s.sold.length} tickets are left.` };
	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Enter a valid email address.' };
	const db = ctx.db('tallypay');
	const id = `cs_${code(12, ctx.run.seed, 'session', merchant, showtime, quantity, email.toLowerCase(), s.sold.length).toLowerCase()}`;
	// Starting the same checkout again reuses the open session.
	if (!db.select().from(sessions).where(eq(sessions.id, id)).get()) {
		const film = ctx.db(merchant).query.films.findFirst({ where: (f, { eq }) => eq(f.id, s.film) }).sync();
		db.insert(sessions)
			.values({
				id,
				merchant,
				description: `${quantity} × ${film?.title ?? 'Ticket'} — ${longDate(day(s.startsAt))}, ${clock(s.startsAt)}`,
				amountCents: (s.priceCents + FEE_CENTS.arthouse!) * quantity,
				status: 'open',
				returnUrl: `${ctx.origin(merchant)}/orders/return?session=${id}`,
				ref: { showtime, quantity, email: email.toLowerCase() }
			})
			.run();
	}
	return { ok: true, url: `${ctx.origin('tallypay')}/c/${id}` };
}

export const session = (ctx: Ctx, id: string) => ctx.db('tallypay').select().from(sessions).where(eq(sessions.id, id)).get();

function charge(ctx: Ctx, id: string, card: { brand: string; last4: string }, source: 'typed' | 'express'): Result<{ returnUrl: string; code: string }> {
	const db = ctx.db('tallypay');
	const s = session(ctx, id);
	if (!s) return { ok: false, error: 'This checkout link is invalid.' };
	if (s.status === 'paid') return { ok: false, error: 'This checkout has already been paid.' };
	const ref = s.ref as { showtime: string; quantity: number; email: string };
	// The merchant's order first: if its seats are gone, nothing is charged.
	const order = purchase(ctx, { site: s.merchant, venue: s.merchant, showtime: ref.showtime, quantity: ref.quantity, email: ref.email, payment: { kind: 'tallypay', last4: card.last4 } });
	if (!order.ok) return order;
	db.transaction((tx) => {
		tx.insert(charges).values({ session: id, cardLast4: card.last4, brand: card.brand, source, amountCents: s.amountCents }).run();
		tx.update(sessions).set({ status: 'paid', ref: { ...ref, order: order.code } }).where(eq(sessions.id, id)).run();
	});
	return { ok: true, returnUrl: s.returnUrl, code: order.code };
}

export function payTyped(ctx: Ctx, id: string, card: CardInput) {
	const checked = checkCard(card, day(ctx.now()));
	return checked.ok ? charge(ctx, id, checked, 'typed') : checked;
}

// Express: a code to the email's inbox; the same answer whether or not the email has a saved card.
export function sendCode(ctx: Ctx, email: string) {
	const db = ctx.db('tallypay');
	const e = email.trim().toLowerCase();
	if (!db.select().from(express).where(eq(express.email, e)).get()) return;
	const n = db.select({ n: count() }).from(codes).where(eq(codes.email, e)).get()!.n;
	const otp = digits(6, ctx.run.seed, 'otp', e, n);
	db.insert(codes).values({ email: e, code: otp, expiresAt: addMinutes(ctx.now(), 10) }).run();
	send(ctx, { from: 'tallypay', to: e, kind: 'code', subject: `${otp} is your Tallypay code`, body: `Your Tallypay verification code is ${otp}.\n\nIt expires in 10 minutes. Never share it with anyone who contacts you.`, data: { code: otp } });
}

export function payExpress(ctx: Ctx, id: string, email: string, otp: string) {
	const db = ctx.db('tallypay');
	const e = email.trim().toLowerCase();
	const latest = db.select().from(codes).where(and(eq(codes.email, e), isNull(codes.usedAt))).orderBy(desc(codes.expiresAt)).get();
	if (!latest || latest.code !== otp.trim() || latest.expiresAt < ctx.now()) return { ok: false as const, error: 'That code is incorrect or has expired.' };
	const card = db.select().from(express).where(eq(express.email, e)).get()!;
	const paid = charge(ctx, id, card, 'express');
	if (paid.ok) db.update(codes).set({ usedAt: ctx.now() }).where(and(eq(codes.email, e), eq(codes.code, latest.code))).run();
	return paid;
}

export const expressCard = (ctx: Ctx, email: string) => ctx.db('tallypay').select().from(express).where(eq(express.email, email.trim().toLowerCase())).get();

export const merchantName = siteName;

defineActions({
	'pay.startCheckout': (ctx, a) => must(startCheckout(ctx, { merchant: String(a.merchant), showtime: String(a.showtime), quantity: Number(a.quantity), email: String(a.email) }), 'checkout'),
	'pay.payTyped': (ctx, a) => must(payTyped(ctx, String(a.session), a.card as CardInput), 'pay'),
	// Start a hosted checkout and pay it: with a typed card, or with Express (a code to the inbox, then the code).
	'pay.checkout': (ctx, a) => {
		const started = must(startCheckout(ctx, { merchant: String(a.merchant), showtime: String(a.showtime), quantity: Number(a.quantity), email: String(a.email) }), 'checkout');
		const id = started.url.split('/').pop()!;
		if (a.card) return must(payTyped(ctx, id, a.card as CardInput), 'pay');
		const email = String(a.express);
		sendCode(ctx, email);
		const otp = ctx.db('tallypay').select().from(codes).where(and(eq(codes.email, email), isNull(codes.usedAt))).orderBy(desc(codes.expiresAt)).get()!.code;
		return must(payExpress(ctx, id, email, otp), 'express');
	}
});
