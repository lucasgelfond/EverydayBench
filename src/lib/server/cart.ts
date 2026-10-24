// A shop's cart, kept in a cookie ("product:quantity,..."): adding to it is not a write a grader sees, as with a real
// site's session cart. Per site, per run.

import type { Cookies } from '@sveltejs/kit';
import { MAX_QUANTITY, type Item } from './actions/shop.ts';

const name = (site: string) => `${site}_cart`;

export function readCart(cookies: Cookies, run: string, site: string): Item[] {
	const [r, items] = (cookies.get(name(site)) ?? '').split('|');
	if (r !== run || !items) return [];
	return items.split(',').flatMap((part) => {
		const [product, n] = part.split(':');
		const quantity = Number(n);
		return product && Number.isInteger(quantity) && quantity >= 1 ? [{ product, quantity: Math.min(quantity, MAX_QUANTITY) }] : [];
	});
}

export function writeCart(cookies: Cookies, run: string, site: string, items: Item[]) {
	const kept = items.filter((i) => i.quantity > 0);
	if (!kept.length) return cookies.delete(name(site), { path: '/' });
	cookies.set(name(site), `${run}|${kept.map((i) => `${i.product}:${i.quantity}`).join(',')}`, { path: '/', httpOnly: true, sameSite: 'lax', secure: false });
}

// Adds a product (more of it, if it's there). An order comes from one restaurant, so on the delivery app a dish from
// another one starts a new cart; says whether it did.
export function addToCart(cookies: Cookies, run: string, site: string, product: { id: string; merchant: string | null }, quantity: number, merchantOf: (id: string) => string | null | undefined) {
	let items = readCart(cookies, run, site);
	const fresh = product.merchant !== null && items.some((i) => merchantOf(i.product) !== product.merchant);
	if (fresh) items = [];
	const there = items.find((i) => i.product === product.id);
	if (there) there.quantity = Math.min(MAX_QUANTITY, there.quantity + quantity);
	else items.push({ product: product.id, quantity: Math.min(MAX_QUANTITY, quantity) });
	writeCart(cookies, run, site, items);
	return fresh;
}
