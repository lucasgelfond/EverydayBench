import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { applications } from '#lib/server/schema.ts';

export const load = ({ locals, params }) => {
	const a = locals.ctx.db('swiftgate').select().from(applications).where(eq(applications.code, params.code)).get();
	if (!a) error(404, 'No application with that receipt number');
	return { code: a.code, name: a.fullName, feeCents: a.feeCents, last4: a.cardLast4, createdAt: a.createdAt };
};
