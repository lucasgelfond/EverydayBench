import { beforeAll, describe, expect, test } from 'vitest';
import { seed } from '../../scripts/seed.ts';
import { cents, fileClaim, type Line } from '../../src/lib/server/actions/expenses.ts';
import { attempt, reference } from './attempt.ts';

beforeAll(() => void seed());

const line = (date: string, merchant: string, category: string, amount: string): Line => ({ date, merchant, category, amount });
const blank = line('', '', '', '');

describe('receiptacle', () => {
	test('amounts parse with or without $ and commas; junk doesn’t', () => {
		expect([cents('$1,234.5'), cents('68'), cents('412.30'), cents('12.345'), cents('ten')]).toEqual([123450, 6800, 41230, undefined, undefined]);
	});

	test('blank rows are skipped; a half-filled row is an error, and nothing is written', () => {
		const r = attempt('expenses/boston-trip-claim', (ctx) => {
			const half = fileClaim(ctx, 1, 'Boston', [line('2026-03-04', 'Kelpie’s Table', '', '186.40'), blank]);
			expect(half).toMatchObject({ ok: false, error: 'Line 1: choose a category.' });
		});
		expect(r.assertions.find((a) => a.fn === 'claims')?.got).toBe(0);
	});

	test('Boston: the three receipts pass; the gift or the copied train ticket fails', () => {
		const id = 'expenses/boston-trip-claim';
		expect(attempt(id, reference(id), (c) => `Claim ${c}, total $666.70.`).pass).toBe(true);
		const train = line('2026-02-27', 'Spindrift Rail', 'transport', '68.00');
		const rest = [line('2026-03-05', 'Barnacle & Bough', 'lodging', '412.30'), line('2026-03-04', 'Kelpie’s Table', 'meals', '186.40')];
		const twice = attempt(id, (ctx) => fileClaim(ctx, 1, 'Boston', [train, train, ...rest]), (c) => `Claim ${c}, total $734.70.`);
		expect(twice.pass).toBe(false);
		const gift = attempt(id, (ctx) => fileClaim(ctx, 1, 'Boston', [train, ...rest, line('2026-03-04', 'Foxglove & Folio', 'other', '30.00')]), (c) => `Claim ${c}`);
		expect(gift.assertions.find((a) => a.fn === 'claim_amounts')?.pass).toBe(false);
	});

	test('Portland: tips come off; claiming receipt totals fails', () => {
		const id = 'expenses/portland-trip-tips';
		expect(attempt(id, reference(id), (c) => `Claim ${c}: $189.66.`).pass).toBe(true);
		const totals = attempt(id, (ctx) =>
			fileClaim(ctx, 1, 'Portland', [line('2026-03-06', 'Spindrift Rail', 'transport', '54'), line('2026-03-10', 'Gullcab', 'transport', '37.50'), line('2026-03-10', 'Saltmarrow', 'meals', '123.36')])
		);
		expect(totals.pass).toBe(false);
	});
});
