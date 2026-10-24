import { fail, redirect } from '@sveltejs/kit';
import { addEvent } from '#lib/server/actions/calendar.ts';
import { day } from '#lib/time.ts';

export const load = ({ url, locals }) => ({ date: url.searchParams.get('date') ?? day(locals.ctx.now()) });

export const actions = {
	default: async ({ locals, request }) => {
		const f = await request.formData();
		const get = (k: string) => String(f.get(k) ?? '').trim();
		const e = { title: get('title'), date: get('date'), allDay: f.get('allDay') === 'on', startTime: get('startTime'), endTime: get('endTime'), endDate: get('endDate'), location: get('location'), notes: get('notes') };
		const r = addEvent(locals.ctx, e);
		if (!r.ok) return fail(400, { ...e, error: r.error });
		redirect(303, `/e/${r.id}?saved=1`);
	}
};
