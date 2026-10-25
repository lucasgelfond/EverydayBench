import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { homes, stays } from '#lib/server/schema.ts';

export const load = ({ locals, params }) => {
	const row = locals.ctx.db(locals.site!.id).select({ s: stays, h: homes }).from(stays).innerJoin(homes, eq(homes.id, stays.home)).where(eq(stays.code, params.code)).get();
	if (!row) error(404, 'Trip not found');
	return row;
};
