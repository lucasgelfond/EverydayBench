import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { accounts } from '#lib/server/schema.ts';
import { day } from '#lib/time.ts';

export const load = ({ locals }) => {
	if (locals.site?.family !== 'gym') error(404);
	const account = locals.account === undefined ? undefined : locals.ctx.db('sweatlantis').select({ name: accounts.name }).from(accounts).where(eq(accounts.id, locals.account)).get();
	return { member: account?.name, today: day(locals.ctx.now()) };
};
