import { accountsWithBalances } from '#lib/server/bank.ts';

export const load = ({ locals }) => ({ accounts: accountsWithBalances(locals.ctx) });
