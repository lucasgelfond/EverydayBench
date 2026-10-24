import { desc, eq } from 'drizzle-orm';
import { messages } from '#lib/server/schema.ts';

export const load = ({ locals, url }) => ({
	sent: url.searchParams.has('sent'),
	messages: locals.ctx
		.db('mailmoss')
		.select({ id: messages.id, toAddr: messages.toAddr, subject: messages.subject, body: messages.body, sentAt: messages.sentAt })
		.from(messages)
		.where(eq(messages.folder, 'sent'))
		.orderBy(desc(messages.sentAt), desc(messages.id))
		.all()
});
