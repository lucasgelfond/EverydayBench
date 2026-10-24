import { error } from '@sveltejs/kit';
import { orderByCode } from '#lib/server/storefront.ts';
import { merchants } from '#lib/server/schema.ts';
import { eq } from 'drizzle-orm';

export const load = ({ locals, params }) => {
	const site = locals.site!.id;
	const order = orderByCode(locals.ctx, site, params.code);
	if (!order) error(404, 'Order not found');
	const merchant = order.merchant ? locals.ctx.db(site).select().from(merchants).where(eq(merchants.id, order.merchant)).get() : undefined;
	return { order, merchant: merchant && { name: merchant.name, etaMinutes: merchant.etaMinutes } };
};
