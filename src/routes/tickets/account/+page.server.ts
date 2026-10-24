import { redirect } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { accounts, orders } from '#lib/server/schema.ts';
import { savedCards } from '#lib/server/actions/tickets.ts';

export const load = ({ locals }) => {
	if (locals.account === undefined) redirect(303, '/account/sign-in?next=/account');
	const db = locals.ctx.db(locals.site!.id);
	const me = db.select().from(accounts).where(eq(accounts.id, locals.account)).get()!;
	return {
		me: { name: me.name, email: me.email },
		orders: db.select().from(orders).where(eq(orders.account, locals.account)).orderBy(desc(orders.createdAt)).all(),
		cards: savedCards(locals.ctx, locals.site!.id, locals.account).map(({ brand, last4 }) => ({ brand, last4 }))
	};
};
