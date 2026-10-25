// Mailmoss: every site's email to the owner lands in the run's mailmoss database, and the owner writes from it.

import { eq } from 'drizzle-orm';
import { messages } from '../schema.ts';
import { OWNER, siteName, type Ctx } from '../ctx.ts';
import { defineActions, must } from '../evals/registry.ts';
import { added, defineAssertions } from '../evals/assertions.ts';
import { addMinutes } from '../../time.ts';

export interface Mail {
	from: string;
	subject: string;
	body: string;
	kind: string;
	data?: Record<string, string>;
	to?: string;
	// For mail a task's setup puts in the inbox from before the run (an old receipt): who it's from, when it came, and
	// whether it's been read. Sites' own mail is from no-reply@<site>.test, now, unread.
	fromName?: string;
	fromAddr?: string;
	at?: string;
	read?: boolean;
}

export function send(ctx: Ctx, mail: Mail) {
	ctx.db('mailmoss')
		.insert(messages)
		.values({
			fromName: mail.fromName ?? siteName(mail.from),
			fromAddr: mail.fromAddr ?? `no-reply@${mail.from}.test`,
			toAddr: mail.to ?? OWNER.email,
			subject: mail.subject,
			body: mail.body,
			sentAt: mail.at ?? ctx.now(),
			read: mail.read ?? false,
			kind: mail.kind,
			data: mail.data ?? {}
		})
		.run();
}

// The owner writing an email: it goes in Sent. Several recipients are separated by commas.
export function compose(ctx: Ctx, m: { to: string; subject: string; body: string }): { ok: true; id: number } | { ok: false; error: string } {
	const to = m.to.split(/[,;]/).map((a) => a.trim().toLowerCase()).filter(Boolean);
	if (!to.length) return { ok: false, error: 'Add at least one recipient.' };
	const bad = to.find((a) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a));
	if (bad) return { ok: false, error: `“${bad}” isn’t an email address.` };
	if (!m.subject.trim() && !m.body.trim()) return { ok: false, error: 'Write a subject or a message.' };
	const row = ctx
		.db('mailmoss')
		.insert(messages)
		.values({ fromName: OWNER.name, fromAddr: OWNER.email, toAddr: to.join(', '), subject: m.subject.trim(), body: m.body.trim(), sentAt: ctx.now(), read: true, folder: 'sent', kind: 'sent', data: {} })
		.returning({ id: messages.id })
		.get();
	return { ok: true, id: row.id };
}

// A person's email to the owner, some minutes before now (for a task's setup: a newer message in a thread).
export function receive(ctx: Ctx, m: { fromName: string; fromAddr: string; subject: string; body: string; minutesAgo?: number; at?: string; kind?: string }) {
	ctx.db('mailmoss')
		.insert(messages)
		.values({ fromName: m.fromName, fromAddr: m.fromAddr, toAddr: OWNER.email, subject: m.subject, body: m.body, sentAt: m.at ?? addMinutes(ctx.now(), -(m.minutesAgo ?? 0)), kind: m.kind ?? 'personal', data: {} })
		.run();
}

// Reading a message marks it read: a write graders ignore (see evals' default ignore list).
export const markRead = (ctx: Ctx, id: number) => ctx.db('mailmoss').update(messages).set({ read: true }).where(eq(messages.id, id)).run();

defineActions({
	'mail.send': (ctx, a) => send(ctx, a as unknown as Mail),
	// For a task's setup: an email to the owner (a friend's plans, a merchant's receipt), sent `at` a time or `minutesAgo`
	// minutes before the run starts.
	'mail.receive': (ctx, a) =>
		receive(ctx, { fromName: String(a.fromName), fromAddr: String(a.fromAddr), subject: String(a.subject), body: String(a.body), minutesAgo: Number(a.minutesAgo ?? 0), at: a.at === undefined ? undefined : String(a.at), kind: a.kind === undefined ? undefined : String(a.kind) }),
	'mail.compose': (ctx, a) => must(compose(ctx, { to: String(a.to), subject: String(a.subject ?? ''), body: String(a.body ?? '') }), 'compose')
});

defineAssertions({
	// Emails of a kind (order, reset, code) the run caused.
	emails: (_ctx, a, { made }) => added(made, 'messages').filter((m) => a.kind === undefined || m.kind === a.kind).length,
	// Emails the owner sent (to an address, saying every one of `says`, in the subject or body, case-insensitive).
	sent: (_ctx, a, { made }) =>
		added(made, 'messages').filter((m) => {
			if (m.folder !== 'sent') return false;
			if (a.to !== undefined && !String(m.to_addr).split(', ').includes(String(a.to).toLowerCase())) return false;
			const text = `${m.subject}\n${m.body}`.toLowerCase();
			return ((a.says as string[] | undefined) ?? []).every((w) => text.includes(w.toLowerCase()));
		}).length
});
