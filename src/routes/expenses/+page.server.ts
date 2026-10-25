import { CATEGORIES, claimsOf } from '#lib/server/actions/expenses.ts';

export const load = ({ locals, url }) => ({
	claims: locals.account === undefined ? [] : claimsOf(locals.ctx, locals.account),
	categories: CATEGORIES,
	filed: url.searchParams.get('filed') ?? undefined
});
