import { fail, redirect } from '@sveltejs/kit';
import { createWorkbook } from '#lib/server/actions/sheets.ts';
import { tabsOf, workbookList } from '#lib/server/sheet.ts';

export const load = ({ locals }) => ({
	workbooks: workbookList(locals.ctx)
		.reverse()
		.map((w) => ({ ...w, sheets: tabsOf(locals.ctx, w.id).map((t) => t.name) }))
});

export const actions = {
	default: async ({ locals, request }) => {
		const title = String((await request.formData()).get('title') ?? '');
		const r = createWorkbook(locals.ctx, title);
		if (!r.ok) return fail(400, { title, error: r.error });
		redirect(303, `/w/${r.id}`);
	}
};
