import { and, eq } from 'drizzle-orm';
import { applications } from '#lib/server/schema.ts';

// A read-only lookup by receipt number and date of birth.
export const actions = {
	default: async ({ request, locals }) => {
		const f = await request.formData();
		const code = String(f.get('code') ?? '').trim().toUpperCase();
		const dob = String(f.get('dateOfBirth') ?? '');
		const a = locals.ctx.db('swiftgate').select().from(applications).where(and(eq(applications.code, code), eq(applications.dateOfBirth, dob))).get();
		return a ? { found: { code: a.code, name: a.fullName } } : { missing: true };
	}
};
