import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { accounts } from '#lib/server/schema.ts';
import { savedCards } from '#lib/server/actions/tickets.ts';
import { savedAddresses } from '#lib/server/actions/shop.ts';
import { ordersOf } from '#lib/server/storefront.ts';

export const load = ({ locals }) => {
	if (locals.account === undefined) redirect(303, '/account/sign-in?next=/account');
	const site = locals.site!.id;
	const me = locals.ctx.db(site).select().from(accounts).where(eq(accounts.id, locals.account)).get()!;
	return {
		me: { name: me.name, email: me.email },
		orders: ordersOf(locals.ctx, site, locals.account).map(({ code, lines, totalCents }) => ({ code, items: lines.map((l) => l.name).join(', '), totalCents })),
		cards: savedCards(locals.ctx, site, locals.account).map(({ brand, last4 }) => ({ brand, last4 })),
		addresses: savedAddresses(locals.ctx, site, locals.account).map(({ id, name, line1, city, zip }) => ({ id, text: `${name}, ${line1}, ${city} ${zip}` }))
	};
};
