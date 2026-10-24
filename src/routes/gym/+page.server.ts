import { asc } from 'drizzle-orm';
import { locations } from '#lib/server/schema.ts';

export const load = ({ locals }) => ({ locations: locals.ctx.db('sweatlantis').select().from(locations).orderBy(asc(locations.name)).all() });
