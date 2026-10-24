import { desc, eq } from 'drizzle-orm';
import { homes, stays } from '#lib/server/schema.ts';

export const load = ({ locals }) => ({
	trips: locals.ctx.db('roostable').select({ s: stays, h: homes }).from(stays).innerJoin(homes, eq(homes.id, stays.home)).orderBy(desc(stays.checkIn)).all()
});
