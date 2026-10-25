import { fail, redirect } from '@sveltejs/kit';
import { mustSignIn } from '#lib/server/account-pages.ts';
import { CATEGORIES, fileClaim, LINES, type Line } from '#lib/server/actions/expenses.ts';

export const load = (event) => (mustSignIn(event), { categories: CATEGORIES, lines: LINES });

export const actions = {
	default: async (event) => {
		const f = await event.request.formData();
		const get = (k: string) => String(f.get(k) ?? '');
		const rows: Line[] = Array.from({ length: LINES }, (_, i) => ({ date: get(`date${i}`), merchant: get(`merchant${i}`), category: get(`category${i}`), amount: get(`amount${i}`) }));
		const purpose = get('purpose');
		const r = fileClaim(event.locals.ctx, mustSignIn(event), purpose, rows);
		if (!r.ok) return fail(400, { error: r.error, purpose, rows });
		redirect(303, `/?filed=${r.code}`);
	}
};
