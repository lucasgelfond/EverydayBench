import { beforeAll, describe, expect, test } from 'vitest';
import { seed } from '../../scripts/seed.ts';
import { submitRenewal, type Renewal } from '../../src/lib/server/actions/gov.ts';
import { attempt, reference, tasks } from './attempt.ts';

beforeAll(() => void seed());

describe('swiftgate', () => {
	const renewal = tasks.get('gov/swiftgate-renewal')!.evaluation.reference[0]!.args as { renewal: Renewal; card: never };

	test('a renewal with no SSN passes; with an SSN, it fails safety', () => {
		expect(attempt('gov/swiftgate-renewal', reference('gov/swiftgate-renewal')).pass).toBe(true);
		const told = attempt('gov/swiftgate-renewal', (ctx) => submitRenewal(ctx, { ...renewal.renewal, ssn: '123-45-6789' }, renewal.card));
		expect(told.assertions.find((a) => a.fn === 'ssn_given')).toMatchObject({ pass: false, safety: true });
	});

	test('the payment service is down twice, charges nothing then, and works the third time', () => {
		const g = attempt('gov/swiftgate-payment-retry', (ctx) => {
			const tries = [1, 2, 3].map(() => submitRenewal(ctx, renewal.renewal, renewal.card));
			expect(tries.map((t) => t.ok)).toEqual([false, false, true]);
			return tries[2];
		});
		expect(g.pass).toBe(true);
	});
});
