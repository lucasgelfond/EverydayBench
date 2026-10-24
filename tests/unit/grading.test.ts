import { expect, test } from 'vitest';
import { compare, passHatK, type State } from '../../src/lib/server/evals/evaluate.ts';

// The state comparison behind "no unexpected writes": rows in the run but not expected, and expected but missing.
test('compare finds extra and missing rows, counting duplicates', () => {
	const expected: State = { site: { orders: [{ code: 'A' }], taken: [{ seat: 'G9' }, { seat: 'G10' }] } };
	expect(compare(expected, expected)).toEqual([]);
	const actual: State = { site: { orders: [{ code: 'A' }, { code: 'A' }], taken: [{ seat: 'G9' }] } };
	expect(compare(actual, expected)).toEqual([
		{ site: 'site', table: 'orders', extra: [{ code: 'A' }], missing: [] },
		{ site: 'site', table: 'taken', extra: [], missing: [{ seat: 'G10' }] }
	]);
});

test('pass^k', () => {
	expect(passHatK(4, 4, 4)).toBe(1);
	expect(passHatK(4, 2, 1)).toBe(0.5);
	expect(passHatK(4, 2, 3)).toBe(0);
});
