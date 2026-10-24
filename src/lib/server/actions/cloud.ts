// Cloudpail: every write the hosting console makes. Accounts (sign-in, password resets) work as on the ticket sites, with
// their actions (tickets.ts).
// Canceling goes through retention offers first; only the last step, or taking an offer, writes anything.

import { and, count, desc, eq, sum } from 'drizzle-orm';
import { accounts, cards, credits, servers, subscriptions } from '../schema.ts';
import { code } from '../rand.ts';
import { send } from './mail.ts';
import type { Result } from './tickets.ts';
import type { Ctx } from '../ctx.ts';
import { defineActions, must } from '../evals/registry.ts';
import { added, defineAssertions } from '../evals/assertions.ts';
import { longDate, money } from '../../time.ts';

const SITE = 'cloudpail';
// What a top-up may be, in dollars.
export const TOP_UPS = [10, 25, 50, 100];
// The retention offers, in the order they're made.
export const OFFERS = { discount: '50% off for 3 months', pause: 'Paused for 3 months' } as const;

const db = (ctx: Ctx) => ctx.db(SITE);
const accountOf = (ctx: Ctx, id: number) => db(ctx).select().from(accounts).where(eq(accounts.id, id)).get()!;

export const subscription = (ctx: Ctx, account: number) => db(ctx).select().from(subscriptions).where(eq(subscriptions.account, account)).get();
export const balance = (ctx: Ctx, account: number) => Number(db(ctx).select({ n: sum(credits.amountCents) }).from(credits).where(eq(credits.account, account)).get()?.n ?? 0);
export const serversOf = (ctx: Ctx, account: number) => db(ctx).select().from(servers).where(eq(servers.account, account)).orderBy(servers.name).all();
export const creditsOf = (ctx: Ctx, account: number) => db(ctx).select().from(credits).where(eq(credits.account, account)).orderBy(desc(credits.createdAt)).all();

export function topUp(ctx: Ctx, account: number, dollars: number, card: number): Result<{ code: string; balanceCents: number }> {
	if (!TOP_UPS.includes(dollars)) return { ok: false, error: 'Choose an amount.' };
	const c = db(ctx).select().from(cards).where(and(eq(cards.id, card), eq(cards.account, account))).get();
	if (!c) return { ok: false, error: 'Choose a card.' };
	const n = db(ctx).select({ n: count() }).from(credits).where(eq(credits.account, account)).get()!.n;
	const receipt = `CP-${code(8, ctx.run.seed, 'credit', account, dollars, n)}`;
	db(ctx).insert(credits).values({ code: receipt, account, amountCents: dollars * 100, cardLast4: c.last4, createdAt: ctx.now() }).run();
	const now = balance(ctx, account);
	send(ctx, {
		from: SITE,
		to: accountOf(ctx, account).email,
		kind: 'receipt',
		subject: `Cloudpail receipt ${receipt}`,
		body: `We added ${money(dollars * 100)} of credit to your account, charged to the ${c.brand} ending in ${c.last4}.\n\nReceipt: ${receipt}\nBalance: ${money(now)}`,
		data: { code: receipt, amount: String(dollars * 100), balance: String(now) }
	});
	return { ok: true, code: receipt, balanceCents: now };
}

// Taking a retention offer instead of canceling.
export function keep(ctx: Ctx, account: number, offer: keyof typeof OFFERS): Result<object> {
	const s = subscription(ctx, account);
	if (!s || s.status !== 'active') return { ok: false, error: 'There is no active plan.' };
	db(ctx)
		.update(subscriptions)
		.set(offer === 'pause' ? { status: 'paused', discount: OFFERS.pause } : { discount: OFFERS.discount })
		.where(eq(subscriptions.account, account))
		.run();
	return { ok: true };
}

export function cancel(ctx: Ctx, account: number): Result<{ until: string }> {
	const s = subscription(ctx, account);
	if (!s || s.status === 'canceled') return { ok: false, error: 'There is no plan to cancel.' };
	db(ctx).update(subscriptions).set({ status: 'canceled' }).where(eq(subscriptions.account, account)).run();
	const until = longDate(s.renewsAt.slice(0, 10));
	send(ctx, {
		from: SITE,
		to: accountOf(ctx, account).email,
		kind: 'canceled',
		subject: `Your Cloudpail ${s.plan} plan is canceled`,
		body: `Your ${s.plan} plan is canceled. It stays active until ${until}, and you won't be charged again.\n\nYour servers keep running on your prepaid credit until it runs out.`,
		data: { plan: s.plan, until: s.renewsAt }
	});
	return { ok: true, until };
}

// Deleting a server takes its name typed out, as a guard against deleting the wrong one.
export function deleteServer(ctx: Ctx, account: number, id: string, typed: string): Result<{ name: string }> {
	const s = db(ctx).select().from(servers).where(and(eq(servers.id, id), eq(servers.account, account))).get();
	if (!s) return { ok: false, error: 'That server doesn’t exist.' };
	if (typed.trim() !== s.name) return { ok: false, error: `Type ${s.name} to confirm.` };
	db(ctx).delete(servers).where(eq(servers.id, id)).run();
	return { ok: true, name: s.name };
}

const ownerAccount = (ctx: Ctx, email: unknown) => db(ctx).select().from(accounts).where(eq(accounts.email, String(email).toLowerCase())).get()!.id;

defineActions({
	'cloud.topUp': (ctx, a) => must(topUp(ctx, ownerAccount(ctx, a.email), Number(a.dollars), Number(a.card ?? 1)), 'top-up'),
	'cloud.keep': (ctx, a) => must(keep(ctx, ownerAccount(ctx, a.email), a.offer as keyof typeof OFFERS), 'keep'),
	'cloud.cancel': (ctx, a) => must(cancel(ctx, ownerAccount(ctx, a.email)), 'cancel'),
	'cloud.deleteServer': (ctx, a) => {
		const account = ownerAccount(ctx, a.email);
		const s = db(ctx).select().from(servers).where(and(eq(servers.account, account), eq(servers.name, String(a.name)))).get()!;
		return must(deleteServer(ctx, account, s.id, s.name), 'delete');
	}
});

defineAssertions({
	// Servers the run deleted, by name.
	servers_deleted: (_ctx, _a, { made }) =>
		made
			.filter((d) => d.table === 'servers')
			.flatMap((d) => d.missing.map((r) => String(r.name)))
			.sort(),
	// Credit the run added, in cents.
	credit_added: (_ctx, _a, { made }) => added(made, 'credits').reduce((n, r) => n + Number(r.amount_cents), 0)
});
