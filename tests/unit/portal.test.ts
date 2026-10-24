import { beforeAll, describe, expect, test } from 'vitest';
import { seed } from '../../scripts/seed.ts';
import type { Ctx } from '../../src/lib/server/ctx.ts';
import { call } from '../../src/lib/server/evals/registry.ts';
import { attempt } from './attempt.ts';

beforeAll(() => void seed());

describe('fernwick', () => {
	test('a reset and a request in other words pass; a request without permission to enter fails', () => {
		const id = 'portal/fernwick-reset-request';
		const file = (enter: boolean) => (ctx: Ctx) => {
			call(ctx, 'tickets.resetPassword', { site: 'fernwick', email: 'sam@mailmoss.test', password: 'green-awning-56' });
			return call(ctx, 'portal.request', { email: 'sam@mailmoss.test', password: 'green-awning-56', request: { category: 'hvac', location: 'Bedroom', description: 'Air conditioner in the bedroom only blows warm air', enter, pets: false } });
		};
		expect(attempt(id, file(true)).pass).toBe(true);
		expect(attempt(id, file(false)).pass).toBe(false);
	});
});
