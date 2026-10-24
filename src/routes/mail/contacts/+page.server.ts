import { asc, like, or } from 'drizzle-orm';
import { contacts } from '#lib/server/schema.ts';

export const load = ({ locals, url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const where = q ? or(like(contacts.name, `%${q}%`), like(contacts.email, `%${q}%`)) : undefined;
	return { q, contacts: locals.ctx.db('mailmoss').select().from(contacts).where(where).orderBy(asc(contacts.name)).all() };
};
