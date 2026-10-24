// Sign-in, reset and sign-out for a site's account pages (routes/<family>/account/...), with the accounts actions the
// ticket sites use. Each family's routes re-export these.

import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { completeReset, requestReset, verify } from './actions/tickets.ts';
import { clearSession, writeSession } from './session.ts';

const safe = (next: string | null) => (next?.startsWith('/') && !next.startsWith('//') ? next : '/');

export const signIn = async ({ locals, request, cookies, url }: RequestEvent) => {
	const f = await request.formData();
	const email = String(f.get('email') ?? '');
	const a = verify(locals.ctx, locals.site!.id, email, String(f.get('password') ?? ''));
	if (!a) return fail(400, { email, error: 'That email and password don’t match.' });
	writeSession(cookies, locals.run.id, locals.site!.id, a.id);
	redirect(303, safe(url.searchParams.get('next')));
};

export const forgot = async ({ locals, request }: RequestEvent) => {
	const email = String((await request.formData()).get('email') ?? '');
	requestReset(locals.ctx, locals.site!.id, email);
	// The same answer whether or not the account exists.
	return { sent: email };
};

export const resetLoad = ({ url }: RequestEvent) => ({ token: url.searchParams.get('token') ?? '' });

export const reset = async ({ locals, request }: RequestEvent) => {
	const f = await request.formData();
	const password = String(f.get('password') ?? '');
	if (password !== String(f.get('confirm') ?? '')) return fail(400, { error: 'The passwords don’t match.' });
	const r = completeReset(locals.ctx, locals.site!.id, String(f.get('token') ?? ''), password);
	return r.ok ? { done: r.email } : fail(400, { error: r.error });
};

export const signOut = ({ locals, cookies }: RequestEvent) => {
	clearSession(cookies, locals.site!.id);
	redirect(303, '/');
};

// A page that needs a signed-in account: its id, or off to sign in and back.
export function mustSignIn({ locals, url }: Pick<RequestEvent, 'locals' | 'url'>) {
	if (locals.account === undefined) redirect(303, `/account/sign-in?next=${encodeURIComponent(url.pathname + url.search)}`);
	return locals.account;
}
