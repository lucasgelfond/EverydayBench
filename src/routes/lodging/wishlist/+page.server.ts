import { redirect } from '@sveltejs/kit';
import { inArray } from 'drizzle-orm';
import { homes } from '#lib/server/schema.ts';
import { saved, unsave } from '#lib/server/actions/lodging.ts';

export const load = ({ locals }) => {
	const ids = [...saved(locals.ctx)];
	return { homes: ids.length ? locals.ctx.db('roostable').select().from(homes).where(inArray(homes.id, ids)).all() : [] };
};

export const actions = {
	unsave: async ({ locals, request }) => {
		unsave(locals.ctx, String((await request.formData()).get('home')));
		redirect(303, '/wishlist');
	}
};
