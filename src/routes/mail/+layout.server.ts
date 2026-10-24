import { error } from '@sveltejs/kit';
import { and, count, eq } from 'drizzle-orm';
import { messages } from '#lib/server/schema.ts';
import { OWNER } from '#lib/server/ctx.ts';

export const load = ({ locals }) => {
	if (locals.site?.family !== 'mail') error(404);
	const unread = locals.ctx.db('mailmoss').select({ n: count() }).from(messages).where(and(eq(messages.read, false), eq(messages.folder, 'inbox'))).get()!.n;
	return { owner: OWNER, unread };
};
