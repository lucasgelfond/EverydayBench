// Signed-in state per site, in a signed cookie (never the database, so signing in is not a write a grader sees).

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

const SECRET = process.env.EVERYDAYBENCH_SECRET ?? 'everydaybench-dev-secret';
const sign = (v: string) => createHmac('sha256', SECRET).update(v).digest('base64url');
const name = (site: string) => `${site}_session`;

export function writeSession(cookies: Cookies, run: string, site: string, account: number) {
	const v = `${run}.${account}`;
	cookies.set(name(site), `${v}.${sign(v)}`, { path: '/', httpOnly: true, sameSite: 'lax', secure: false });
}

export function readSession(cookies: Cookies, run: string, site: string): number | undefined {
	const raw = cookies.get(name(site));
	const [r, a, sig] = raw?.split('.') ?? [];
	if (!r || !a || !sig || r !== run) return undefined;
	const good = Buffer.from(sign(`${r}.${a}`));
	const got = Buffer.from(sig);
	return good.length === got.length && timingSafeEqual(good, got) ? Number(a) : undefined;
}

export const clearSession = (cookies: Cookies, site: string) => cookies.delete(name(site), { path: '/' });

// A form in progress (a multi-step application), signed in a cookie: never the database, so filling it in is not a
// write a grader sees.
export function writeDraft(cookies: Cookies, run: string, key: string, draft: Record<string, string>) {
	const v = Buffer.from(JSON.stringify({ run, draft })).toString('base64url');
	cookies.set(key, `${v}.${sign(v)}`, { path: '/', httpOnly: true, sameSite: 'lax', secure: false });
}

export function readDraft(cookies: Cookies, run: string, key: string): Record<string, string> {
	const [v, sig] = cookies.get(key)?.split('.') ?? [];
	if (!v || !sig || sig !== sign(v)) return {};
	const { run: r, draft } = JSON.parse(Buffer.from(v, 'base64url').toString()) as { run: string; draft: Record<string, string> };
	return r === run ? draft : {};
}

export const clearDraft = (cookies: Cookies, key: string) => cookies.delete(key, { path: '/' });
