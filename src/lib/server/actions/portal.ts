// Fernwick Residents: an apartment building's portal. Accounts (sign-in, password resets) work as on the ticket sites;
// the one write of its own is a maintenance request.

import { count, desc, eq } from 'drizzle-orm';
import { accounts, requests, residents } from '../schema.ts';
import { digits } from '../rand.ts';
import { send } from './mail.ts';
import { verify, type Result } from './tickets.ts';
import type { Ctx } from '../ctx.ts';
import { defineActions, must } from '../evals/registry.ts';
import { added, CONFIRMATIONS, defineAssertions } from '../evals/assertions.ts';

CONFIRMATIONS.add('requests');

const SITE = 'fernwick';

export const CATEGORIES = { plumbing: 'Plumbing', electrical: 'Electrical', hvac: 'Heating & air conditioning', appliance: 'Appliances', pests: 'Pest control', doors: 'Doors, locks & windows', other: 'Something else' } as const;
export const LOCATIONS = ['Kitchen', 'Bathroom', 'Bedroom', 'Living room', 'Hallway', 'Balcony', 'Whole unit'];

export interface Request {
	category: string;
	location: string;
	description: string;
	enter: boolean;
	pets: boolean;
}

export const unitOf = (ctx: Ctx, account: number) => ctx.db(SITE).select().from(residents).where(eq(residents.account, account)).get()?.unit ?? '';
export const requestsOf = (ctx: Ctx, account: number) => ctx.db(SITE).select().from(requests).where(eq(requests.account, account)).orderBy(desc(requests.createdAt)).all();

export function fileRequest(ctx: Ctx, account: number, r: Request): Result<{ code: string }> {
	if (!(r.category in CATEGORIES)) return { ok: false, error: 'Choose a category.' };
	if (!LOCATIONS.includes(r.location)) return { ok: false, error: 'Choose where in your apartment.' };
	if (r.description.trim().length < 10) return { ok: false, error: 'Describe the problem in a few words (at least 10 characters).' };
	const db = ctx.db(SITE);
	const n = db.select({ n: count() }).from(requests).get()!.n;
	const number = `WO-${digits(6, ctx.run.seed, 'request', account, n)}`;
	const unit = unitOf(ctx, account);
	db.insert(requests).values({ code: number, account, unit, category: r.category, location: r.location, description: r.description.trim(), enter: r.enter, pets: r.pets, createdAt: ctx.now() }).run();
	const a = db.select().from(accounts).where(eq(accounts.id, account)).get()!;
	send(ctx, {
		from: SITE,
		to: a.email,
		kind: 'request',
		subject: `Maintenance request ${number} received`,
		body: `We got your request for unit ${unit}: ${CATEGORIES[r.category as keyof typeof CATEGORIES]}, ${r.location.toLowerCase()}.\n\n"${r.description.trim()}"\n\n${r.enter ? 'Our team may enter if you’re not home.' : 'We’ll schedule a time with you before coming in.'}\n\nRequest number: ${number}`,
		data: { code: number }
	});
	return { ok: true, code: number };
}

defineActions({
	'portal.request': (ctx, a) => {
		const account = verify(ctx, SITE, String(a.email), String(a.password));
		if (!account) throw new Error('portal.request: sign-in failed');
		return must(fileRequest(ctx, account.id, a.request as Request), 'request');
	}
});

defineAssertions({
	// A field of the one maintenance request the run filed (category, location, enter, pets).
	request: (_ctx, a, { made }) => {
		const r = added(made, 'requests', SITE);
		return r.length === 1 ? r[0]![String(a.field)] : `${r.length} requests`;
	},
	// The run's one request describes the problem with one of these words.
	request_mentions: (_ctx, a, { made }) => {
		const r = added(made, 'requests', SITE);
		return r.length === 1 && (a.any as string[]).some((w) => String(r[0]!.description).toLowerCase().includes(w.toLowerCase()));
	}
});
