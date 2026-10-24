import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { accounts } from '#lib/server/schema.ts';
import { unitOf } from '#lib/server/actions/portal.ts';

export const load = ({ locals }) => {
	const site = locals.site;
	if (site?.family !== 'portal') error(404);
	const account = locals.account === undefined ? undefined : locals.ctx.db(site.id).select({ name: accounts.name }).from(accounts).where(eq(accounts.id, locals.account)).get();
	return { site: { id: site.id, name: site.name, tagline: site.tagline }, account: account && { name: account.name, unit: unitOf(locals.ctx, locals.account!) } };
};
