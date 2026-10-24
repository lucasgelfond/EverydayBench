import { error } from '@sveltejs/kit';
import { book, pending } from '#lib/server/booking.ts';

const restaurant = (url: URL) => url.searchParams.get('r') ?? '';

export const load = ({ locals, url }) => {
	if (locals.site!.kind !== 'reservations') error(404);
	return pending(locals.ctx, locals.site!.id, url, restaurant(url));
};

export const actions = { default: ({ locals, url, request }) => book(locals.ctx, locals.site!.id, url, restaurant(url), request) };
