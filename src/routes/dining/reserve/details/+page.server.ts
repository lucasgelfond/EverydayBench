import { error } from '@sveltejs/kit';
import { book, pending } from '#lib/server/booking.ts';

export const load = ({ locals, url }) => {
	if (locals.site!.kind !== 'restaurant') error(404);
	return pending(locals.ctx, locals.site!.id, url, locals.site!.id);
};

export const actions = { default: ({ locals, url, request }) => book(locals.ctx, locals.site!.id, url, locals.site!.id, request) };
