import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { accounts } from '#lib/server/schema.ts';

export const load = ({ locals }) => {
	const site = locals.site;
	if (site?.family !== 'cloud') error(404);
	const account = locals.account === undefined ? undefined : locals.ctx.db(site.id).select({ name: accounts.name, email: accounts.email }).from(accounts).where(eq(accounts.id, locals.account)).get();
	return { site: { id: site.id, name: site.name, tagline: site.tagline }, account };
};
