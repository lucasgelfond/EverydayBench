import { desc, eq, like, or } from 'drizzle-orm';
import { messages } from '#lib/server/schema.ts';

export const load = ({ locals, url }) => {
	const q = url.searchParams.get('q')?.trim();
	const db = locals.ctx.db('mailmoss');
	// Searching looks in every folder; the inbox alone otherwise.
	const where = q ? or(like(messages.subject, `%${q}%`), like(messages.body, `%${q}%`), like(messages.fromName, `%${q}%`), like(messages.toAddr, `%${q}%`)) : eq(messages.folder, 'inbox');
	return { q, messages: db.select({ id: messages.id, fromName: messages.fromName, subject: messages.subject, body: messages.body, sentAt: messages.sentAt, read: messages.read }).from(messages).where(where).orderBy(desc(messages.sentAt), desc(messages.id)).all() };
};
