// Mailmoss: every site's email to the owner lands in the run's mailmoss database.

import { eq } from 'drizzle-orm';
import { messages } from '../schema.ts';
import { OWNER, siteName, type Ctx } from '../ctx.ts';
import { defineActions } from '../evals/registry.ts';
import { added, defineAssertions } from '../evals/assertions.ts';

export interface Mail {
	from: string;
	subject: string;
	body: string;
	kind: string;
	data?: Record<string, string>;
	to?: string;
}

export function send(ctx: Ctx, mail: Mail) {
	ctx.db('mailmoss')
		.insert(messages)
		.values({
			fromName: siteName(mail.from),
			fromAddr: `no-reply@${mail.from}.test`,
			toAddr: mail.to ?? OWNER.email,
			subject: mail.subject,
			body: mail.body,
			sentAt: ctx.now(),
			kind: mail.kind,
			data: mail.data ?? {}
		})
		.run();
}

// Reading a message marks it read: a write graders ignore (see evals' default ignore list).
export const markRead = (ctx: Ctx, id: number) => ctx.db('mailmoss').update(messages).set({ read: true }).where(eq(messages.id, id)).run();

defineActions({ 'mail.send': (ctx, a) => send(ctx, a as unknown as Mail) });

defineAssertions({
	// Emails of a kind (order, reset, code) the run caused.
	emails: (_ctx, a, { made }) => added(made, 'messages').filter((m) => a.kind === undefined || m.kind === a.kind).length
});
