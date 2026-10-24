// What shop pages show: a store's catalog and search, the delivery app's restaurants and menus, orders.

import { and, asc, desc, eq, isNull, like, or } from 'drizzle-orm';
import { merchants, products, shopOrders } from './schema.ts';
import type { Ctx } from './ctx.ts';

export type Product = typeof products.$inferSelect;
export type Merchant = typeof merchants.$inferSelect;

// Products matching words (in the name, category or description), or in a category; most reviewed first.
export function searchProducts(ctx: Ctx, site: string, { q = '', category = '' }: { q?: string; category?: string }) {
	const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
	const text = words.map((w) => or(like(products.name, `%${w}%`), like(products.category, `%${w}%`), like(products.description, `%${w}%`)));
	return ctx
		.db(site)
		.select()
		.from(products)
		.where(and(isNull(products.merchant), category ? eq(products.category, category) : undefined, ...text))
		.orderBy(desc(products.reviews))
		.all();
}

export const categoriesOf = (ctx: Ctx, site: string) =>
	ctx.db(site).selectDistinct({ category: products.category }).from(products).where(isNull(products.merchant)).orderBy(asc(products.category)).all().map((r) => r.category);

export const productById = (ctx: Ctx, site: string, id: string) => ctx.db(site).select().from(products).where(eq(products.id, id)).get();

// Restaurants, best rated first; with words, those whose name, cuisine or a dish matches.
export function restaurants(ctx: Ctx, site: string, q = '') {
	const db = ctx.db(site);
	const all = db.select().from(merchants).orderBy(desc(merchants.rating), asc(merchants.name)).all();
	const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (!words.length) return all;
	const dishes = db.select().from(products).all();
	return all.filter((m) => {
		const text = [m.name, m.cuisine, ...dishes.filter((d) => d.merchant === m.id).map((d) => d.name)].join(' ').toLowerCase();
		return words.every((w) => text.includes(w));
	});
}

export function menuOf(ctx: Ctx, site: string, id: string) {
	const db = ctx.db(site);
	const merchant = db.select().from(merchants).where(eq(merchants.id, id)).get();
	if (!merchant) return undefined;
	const dishes = db.select().from(products).where(eq(products.merchant, id)).orderBy(asc(products.category), asc(products.name)).all();
	return { merchant, sections: [...Map.groupBy(dishes, (d) => d.category)].map(([name, items]) => ({ name, items })) };
}

export const orderByCode = (ctx: Ctx, site: string, code: string) => ctx.db(site).select().from(shopOrders).where(eq(shopOrders.code, code)).get();
export const ordersOf = (ctx: Ctx, site: string, account: number) => ctx.db(site).select().from(shopOrders).where(eq(shopOrders.account, account)).orderBy(desc(shopOrders.createdAt)).all();

// "4.6 ★ (2,804)"
export const stars = (rating: number, reviews: number) => `${(rating / 10).toFixed(1)} ★ (${reviews.toLocaleString('en-US')})`;
