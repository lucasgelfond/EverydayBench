// Failures a task arms in its setup, so a run meets them on cue: a saved card that declines, a checkout that errors
// after it charged, a payment service that's down the first few tries. Each kind happens `left` more times.

import { eq, sql } from 'drizzle-orm';
import { faults } from '../schema.ts';
import type { Ctx } from '../ctx.ts';
import { defineActions } from '../evals/registry.ts';

export type Fault = 'decline' | 'error-after-charge' | 'payment-down';

export const arm = (ctx: Ctx, site: string, kind: Fault, times = 1) =>
	ctx.db(site).insert(faults).values({ kind, left: times }).onConflictDoUpdate({ target: faults.kind, set: { left: times } }).run();

// Whether the fault happens now (and one fewer is left).
export function trip(ctx: Ctx, site: string, kind: Fault) {
	const db = ctx.db(site);
	const f = db.select().from(faults).where(eq(faults.kind, kind)).get();
	if (!f || f.left < 1) return false;
	db.update(faults).set({ left: sql`${faults.left} - 1` }).where(eq(faults.kind, kind)).run();
	return true;
}

defineActions({ 'faults.arm': (ctx, a) => arm(ctx, String(a.site), a.kind as Fault, Number(a.times ?? 1)) });
