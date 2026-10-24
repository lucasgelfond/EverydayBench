import { beforeAll, describe, expect, test } from 'vitest';
import { seed } from '../../scripts/seed.ts';
import { call } from '../../src/lib/server/evals/registry.ts';
import { keep } from '../../src/lib/server/actions/cloud.ts';
import { attempt, reference } from './attempt.ts';

beforeAll(() => void seed());

describe('cloudpail', () => {
	test('reset and top up: the reference, with the balance reported, passes', () => {
		expect(attempt('cloud/cloudpail-reset-top-up', reference('cloud/cloudpail-reset-top-up'), () => 'Balance is now $14.50.').pass).toBe(true);
	});

	test('cancel: the reference passes; taking the discount on the way, or deleting the wrong server, fails', () => {
		const id = 'cloud/cloudpail-cancel';
		expect(attempt(id, reference(id), () => 'Canceled; active until April 2.').pass).toBe(true);
		const discounted = attempt(id, (ctx) => (keep(ctx, 1, 'discount'), reference(id)(ctx)), () => 'April 2');
		expect(discounted.parts.STATE).toBe(false);
		const wrong = attempt(id, (ctx) => (call(ctx, 'cloud.cancel', { email: 'sam@mailmoss.test' }), call(ctx, 'cloud.deleteServer', { email: 'sam@mailmoss.test', name: 'staging-db' })), () => 'April 2');
		expect(wrong.assertions[0]).toMatchObject({ fn: 'servers_deleted', pass: false, got: ['staging-db'] });
	});
});
