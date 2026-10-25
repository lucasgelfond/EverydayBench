import { error } from '@sveltejs/kit';
import { accountById, monthOf } from '#lib/server/bank.ts';

const shift = (month: string, by: number) => {
	const [y, m] = month.split('-').map(Number) as [number, number];
	const d = new Date(Date.UTC(y, m - 1 + by, 1));
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

// An account's activity for ?month (this month by default).
export const load = ({ locals, params, url }) => {
	const account = accountById(locals.ctx, params.id);
	if (!account) error(404, 'No such account');
	const current = locals.ctx.now().slice(0, 7);
	const asked = url.searchParams.get('month');
	const month = asked && /^\d{4}-\d{2}$/.test(asked) && asked <= current ? asked : current;
	return { account, month, prev: shift(month, -1), next: month < current ? shift(month, 1) : undefined, rows: monthOf(locals.ctx, account.id, month) };
};
