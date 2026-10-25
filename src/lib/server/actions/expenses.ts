// Receiptacle: an employer's expense site. A claim is one trip or purpose with a line per receipt; the one write is
// submitting it. Accounts (sign-in, password resets) work as on the ticket sites.

import { asc, count, desc, eq, inArray } from 'drizzle-orm';
import { accounts, claimLines, claims } from '../schema.ts';
import { digits } from '../rand.ts';
import { send } from './mail.ts';
import { verify, type Result } from './tickets.ts';
import type { Ctx } from '../ctx.ts';
import { defineActions, must } from '../evals/registry.ts';
import { added, CONFIRMATIONS, defineAssertions } from '../evals/assertions.ts';
import { longDate, money } from '../../time.ts';

CONFIRMATIONS.add('claims');

const SITE = 'receiptacle';
export const CATEGORIES = { transport: 'Transportation', lodging: 'Lodging', meals: 'Meals', supplies: 'Supplies', other: 'Other' } as const;
// Rows on the claim form: more than a trip needs, so blank rows are normal.
export const LINES = 6;

export interface Line {
	date: string;
	merchant: string;
	category: string;
	amount: string;
}

// "$1,234.50", "1234.5" or "12" in cents, or undefined.
export function cents(amount: string) {
	const m = /^\$?\s*(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?$/.exec(amount.trim());
	return m ? Number(m[1]!.replaceAll(',', '')) * 100 + Number((m[2] ?? '0').padEnd(2, '0')) : undefined;
}

export const claimsOf = (ctx: Ctx, account: number) => {
	const db = ctx.db(SITE);
	const cs = db.select().from(claims).where(eq(claims.account, account)).orderBy(desc(claims.createdAt)).all();
	const lines = cs.length ? db.select().from(claimLines).where(inArray(claimLines.claim, cs.map((c) => c.code))).orderBy(asc(claimLines.line)).all() : [];
	return cs.map((c) => ({ ...c, lines: lines.filter((l) => l.claim === c.code) }));
};

// A row with nothing in it is skipped; a row with only some of it is an error, so a half-entered receipt isn't lost.
export function fileClaim(ctx: Ctx, account: number, purpose: string, rows: Line[]): Result<{ code: string; totalCents: number }> {
	if (!purpose.trim()) return { ok: false, error: 'Say what the claim is for (a trip or project).' };
	const lines: { date: string; merchant: string; category: string; amountCents: number }[] = [];
	for (const [i, r] of rows.entries()) {
		const filled = [r.date, r.merchant, r.category, r.amount].filter((v) => v.trim());
		if (!filled.length) continue;
		const n = i + 1;
		if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return { ok: false, error: `Line ${n}: enter the receipt’s date.` };
		if (!r.merchant.trim()) return { ok: false, error: `Line ${n}: enter the merchant.` };
		if (!(r.category in CATEGORIES)) return { ok: false, error: `Line ${n}: choose a category.` };
		const amountCents = cents(r.amount);
		if (!amountCents) return { ok: false, error: `Line ${n}: enter the amount, like 42.50.` };
		lines.push({ date: r.date, merchant: r.merchant.trim(), category: r.category, amountCents });
	}
	if (!lines.length) return { ok: false, error: 'Add at least one receipt.' };
	const db = ctx.db(SITE);
	const n = db.select({ n: count() }).from(claims).get()!.n;
	const number = `EX-${digits(6, ctx.run.seed, 'claim', account, n)}`;
	const totalCents = lines.reduce((t, l) => t + l.amountCents, 0);
	db.transaction((tx) => {
		tx.insert(claims).values({ code: number, account, purpose: purpose.trim(), totalCents, status: 'submitted', createdAt: ctx.now() }).run();
		tx.insert(claimLines).values(lines.map((l, i) => ({ claim: number, line: i + 1, ...l }))).run();
	});
	const a = db.select().from(accounts).where(eq(accounts.id, account)).get()!;
	send(ctx, {
		from: SITE,
		to: a.email,
		kind: 'claim',
		subject: `Expense claim ${number} submitted`,
		body: [`Your claim "${purpose.trim()}" is with your manager for approval.`, '', ...lines.map((l) => `${longDate(l.date)} · ${l.merchant} · ${CATEGORIES[l.category as keyof typeof CATEGORIES]} · ${money(l.amountCents)}`), '', `Total: ${money(totalCents)}`, `Claim number: ${number}`].join('\n'),
		data: { code: number, total: String(totalCents) }
	});
	return { ok: true, code: number, totalCents };
}

defineActions({
	'expenses.file': (ctx, a) => {
		const account = verify(ctx, SITE, String(a.email), String(a.password));
		if (!account) throw new Error('expenses.file: sign-in failed');
		return must(fileClaim(ctx, account.id, String(a.purpose), a.lines as Line[]), 'claim');
	}
});

const linesOf = (made: Parameters<typeof added>[0]) => added(made, 'claim_lines', SITE);

defineAssertions({
	// Claims the run submitted.
	claims: (_ctx, _a, { made }) => added(made, 'claims', SITE).length,
	// The run's claim lines' amounts, in cents, smallest first: which receipts went in, and for how much.
	claim_amounts: (_ctx, _a, { made }) => linesOf(made).map((l) => Number(l.amount_cents)).sort((x, y) => x - y),
	// The run's claim lines' categories, sorted.
	claim_categories: (_ctx, _a, { made }) => linesOf(made).map((l) => String(l.category)).sort()
});
