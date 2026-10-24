// The actions a task's setup and reference solution can call, by name ("tickets.purchase"). Each family registers its
// own (src/lib/server/families.ts loads them all): a site action, or a few in a row where a person would do them in one
// go (asking for a reset link and using it).

import type { Ctx } from '../ctx.ts';

export type Action = (ctx: Ctx, args: Record<string, unknown>) => unknown;

export const ACTIONS: Record<string, Action> = {};
export const defineActions = (actions: Record<string, Action>) => void Object.assign(ACTIONS, actions);

// An action's result, or the error it gave (a reference solution that fails is a broken task).
export const must = <T extends object>(r: ({ ok: true } & T) | { ok: false; error: string }, what: string): { ok: true } & T => {
	if (!r.ok) throw new Error(`${what}: ${r.error}`);
	return r;
};

export function call(ctx: Ctx, action: string, args: Record<string, unknown>) {
	const fn = ACTIONS[action];
	if (!fn) throw new Error(`unknown action ${action}`);
	return fn(ctx, args);
}
