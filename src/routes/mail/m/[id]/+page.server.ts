import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { messages } from '#lib/server/schema.ts';
import { markRead } from '#lib/server/actions/mail.ts';

export const load = ({ locals, params }) => {
	const m = locals.ctx.db('mailmoss').select().from(messages).where(eq(messages.id, Number(params.id))).get();
	if (!m) error(404, 'Message not found');
	if (!m.read) markRead(locals.ctx, m.id);
	return { m: { id: m.id, fromName: m.fromName, fromAddr: m.fromAddr, toAddr: m.toAddr, subject: m.subject, body: m.body, sentAt: m.sentAt } };
};
