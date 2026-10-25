// What a site adds to a price: its fee lines and tax (sites.ts `pricing`), shared by the pages that show them and the
// actions that charge them, so the last step, the charge and the confirmation always agree.

import type { Pricing } from './sites.ts';

export type Line = { label: string; cents: number };

export const sum = (lines: Line[]) => lines.reduce((n, l) => n + l.cents, 0);

// The lines after `baseCents` (the price of `count` tickets, or a stay's nights): any that come first (a home's
// cleaning fee), the site's fees, then tax on all of it.
export function charges(p: Pricing, baseCents: number, count: number, first: Line[] = []): Line[] {
	const lines = [...first, ...p.fees.map((f) => ({ label: f.label, cents: (f.cents ?? 0) * count + Math.round(baseCents * (f.rate ?? 0)) }))];
	return p.taxRate ? [...lines, { label: 'Taxes', cents: Math.round((baseCents + sum(lines)) * p.taxRate) }] : lines;
}
