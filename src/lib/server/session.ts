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
