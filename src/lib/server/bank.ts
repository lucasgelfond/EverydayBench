// Thriftwell Bank's reads: accounts with their balances, and an account's transactions by month. The bank only shows;
// nothing on it writes.

import { and, asc, desc, eq, like, sum } from 'drizzle-orm';
import { bankAccounts, transactions } from './schema.ts';
import type { Ctx } from './ctx.ts';

const SITE = 'thriftwell';

// Posted balances (what a pending charge will take isn't counted until it posts, as at a real bank).
export const accountsWithBalances = (ctx: Ctx) =>
	ctx
		.db(SITE)
		.select()
		.from(bankAccounts)
		.all()
		.map((a) => {
			const moved = ctx.db(SITE).select({ n: sum(transactions.amountCents) }).from(transactions).where(and(eq(transactions.account, a.id), eq(transactions.status, 'posted'))).get()?.n;
			return { ...a, balanceCents: a.openingCents + Number(moved ?? 0) };
		});

export const accountById = (ctx: Ctx, id: string) => ctx.db(SITE).select().from(bankAccounts).where(eq(bankAccounts.id, id)).get();

// A month's transactions ("2026-02"), newest first, pending ones on top.
export const monthOf = (ctx: Ctx, account: string, month: string) =>
	ctx
		.db(SITE)
		.select()
		.from(transactions)
		.where(and(eq(transactions.account, account), like(transactions.date, `${month}-%`)))
		.orderBy(asc(transactions.status), desc(transactions.date), asc(transactions.id))
		.all();
