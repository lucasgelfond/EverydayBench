// Typed checks a task can make beyond its end state, by name. Each gets the run, its arguments, and what the run
// changed (`made`: rows added or removed against the starting world) and returns a value the task compares with its
// `expect` (true by default). The checks here work for any family; families register their own.

import type { Ctx } from '../ctx.ts';
import type { Diff } from './evaluate.ts';

export type Seen = { report: string; made: Diff[] };
export type Check = (ctx: Ctx, args: Record<string, unknown>, seen: Seen) => unknown;

export const ASSERTIONS: Record<string, Check> = {
	// The run changed only these tables ("site:table"): "no unexpected writes" for tasks with more than one right answer,
	// where the end state can't be compared exactly.
	writes_only: (_ctx, a, { made }) => made.every((d) => (a.allow as string[]).includes(`${d.site}:${d.table}`)),

	// The report says something (case-insensitive), e.g. "general admission".
	report_says: (_ctx, a, { report }) => report.toLowerCase().includes(String(a.text).toLowerCase())
};
export const defineAssertions = (checks: Record<string, Check>) => void Object.assign(ASSERTIONS, checks);

// Rows a run added to a table (at one site, or any).
export const added = (made: Diff[], table: string, site?: unknown) => made.filter((d) => d.table === table && (site === undefined || d.site === site)).flatMap((d) => d.extra);

// A JSON column as snapshots hold it (raw text), parsed.
export const list = (v: unknown) => (typeof v === 'string' ? (JSON.parse(v) as string[]) : (v as string[]));
