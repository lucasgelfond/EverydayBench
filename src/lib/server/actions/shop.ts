// Shop: every write a store or the delivery app makes, which is only placing an order. The cart lives in a cookie until
// then (shop/cart.ts), so browsing, adding and removing are never writes a grader sees.

import { and, count, eq, inArray } from 'drizzle-orm';
import { addresses, cards, merchants, products, shopOrders, type Line } from '../schema.ts';
import { checkCard, type CardInput } from '../cards.ts';
import { code } from '../rand.ts';
import { send } from './mail.ts';
import { siteName, type Ctx } from '../ctx.ts';
import { defineActions, must } from '../evals/registry.ts';
import { added, CONFIRMATIONS, defineAssertions } from '../evals/assertions.ts';
import { SITES } from '../../sites.ts';
import { day, money } from '../../time.ts';
import type { Result } from './tickets.ts';

CONFIRMATIONS.add('shop_orders');

export type Item = { product: string; quantity: number };
export type Address = { saved: number } | { name: string; line1: string; city: string; zip: string };
export type ShopPayment = { kind: 'saved'; card: number } | { kind: 'typed'; card: CardInput };

export const MAX_QUANTITY = 10;
// Stores: free shipping from $35, else a flat rate. The app: the restaurant's delivery fee and a service fee.
export const FREE_SHIPPING_CENTS = 3500;
export const SHIPPING_CENTS = 599;
export const TAX_RATE = 0.08;
export const TIPS = [0, 10, 15, 20];
export const DEFAULT_TIP = 20;
const serviceFee = (subtotal: number) => Math.max(200, Math.round(subtotal * 0.12));

export type Product = typeof products.$inferSelect;

// A cart's lines, priced: the products as the site sells them now, and what it all comes to.
export function price(ctx: Ctx, site: string, items: Item[], tipPercent = DEFAULT_TIP) {
	const db = ctx.db(site);
	const ids = items.map((i) => i.product);
	const found = ids.length ? db.select().from(products).where(inArray(products.id, ids)).all() : [];
	const byId = new Map(found.map((p) => [p.id, p]));
	const lines = items.flatMap((i) => {
		const p = byId.get(i.product);
		return p ? [{ product: p, quantity: i.quantity }] : [];
	});
	const subtotalCents = lines.reduce((s, l) => s + l.product.priceCents * l.quantity, 0);
	const delivery = SITES[site]?.kind === 'delivery';
	const merchant = delivery && lines[0]?.product.merchant ? db.select().from(merchants).where(eq(merchants.id, lines[0].product.merchant)).get() : undefined;
	const shippingCents = !lines.length ? 0 : delivery ? (merchant?.deliveryFeeCents ?? 0) : subtotalCents >= FREE_SHIPPING_CENTS ? 0 : SHIPPING_CENTS;
	const serviceCents = delivery && lines.length ? serviceFee(subtotalCents) : 0;
	const taxCents = Math.round(subtotalCents * TAX_RATE);
	const tipCents = delivery ? Math.round((subtotalCents * tipPercent) / 100) : 0;
	return { lines, merchant, subtotalCents, shippingCents, serviceCents, taxCents, tipCents, totalCents: subtotalCents + shippingCents + serviceCents + taxCents + tipCents };
}

interface Order {
	site: string;
	items: Item[];
	email: string;
	account?: number;
	address: Address;
	payment: ShopPayment;
	tipPercent?: number;
}

export function placeOrder(ctx: Ctx, o: Order): Result<{ code: string; totalCents: number }> {
	const db = ctx.db(o.site);
	if (!o.items.length) return { ok: false, error: 'Your cart is empty.' };
	const bad = o.items.find((i) => !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > MAX_QUANTITY);
	if (bad) return { ok: false, error: `Choose between 1 and ${MAX_QUANTITY} of each item.` };
	const tip = o.tipPercent ?? DEFAULT_TIP;
	if (!TIPS.includes(tip)) return { ok: false, error: 'Choose a tip.' };
	const p = price(ctx, o.site, o.items, tip);
	if (p.lines.length !== o.items.length) return { ok: false, error: 'Something in your cart is no longer sold.' };
	const gone = p.lines.find((l) => !l.product.inStock);
	if (gone) return { ok: false, error: `${gone.product.name} is out of stock.` };
	if (new Set(p.lines.map((l) => l.product.merchant)).size > 1) return { ok: false, error: 'An order can only come from one restaurant.' };
	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email)) return { ok: false, error: 'Enter a valid email address.' };

	let shipTo: string;
	if ('saved' in o.address) {
		const a = o.account !== undefined ? db.select().from(addresses).where(and(eq(addresses.id, o.address.saved), eq(addresses.account, o.account))).get() : undefined;
		if (!a) return { ok: false, error: 'Choose a saved address.' };
		shipTo = `${a.name}, ${a.line1}, ${a.city} ${a.zip}`;
	} else {
		const { name, line1, city, zip } = o.address;
		if (!name.trim() || !line1.trim() || !city.trim()) return { ok: false, error: 'Enter the full address.' };
		if (!/^\d{5}$/.test(zip.trim())) return { ok: false, error: 'Enter a 5-digit ZIP code.' };
		shipTo = `${name.trim()}, ${line1.trim()}, ${city.trim()} ${zip.trim()}`;
	}

	let last4: string;
	if (o.payment.kind === 'saved') {
		const card = o.account !== undefined ? db.select().from(cards).where(and(eq(cards.id, o.payment.card), eq(cards.account, o.account))).get() : undefined;
		if (!card) return { ok: false, error: 'Choose a saved card.' };
		last4 = card.last4;
	} else {
		const checked = checkCard(o.payment.card, day(ctx.now()));
		if (!checked.ok) return checked;
		last4 = checked.last4;
	}

	const lines: Line[] = p.lines.map((l) => ({ product: l.product.id, name: l.product.name, category: l.product.category, quantity: l.quantity, priceCents: l.product.priceCents }));
	const before = db.select({ n: count() }).from(shopOrders).get()!.n;
	const order = {
		code: code(7, ctx.run.seed, 'shop', o.site, lines.map((l) => `${l.product}x${l.quantity}`).join(','), before),
		account: o.account ?? null,
		email: o.email.trim().toLowerCase(),
		merchant: p.merchant?.id ?? null,
		lines,
		shipTo,
		subtotalCents: p.subtotalCents,
		shippingCents: p.shippingCents,
		serviceCents: p.serviceCents,
		taxCents: p.taxCents,
		tipCents: p.tipCents,
		totalCents: p.totalCents,
		cardLast4: last4,
		payment: o.payment.kind,
		createdAt: ctx.now()
	};
	db.insert(shopOrders).values(order).run();

	const delivery = SITES[o.site]?.kind === 'delivery';
	send(ctx, {
		from: o.site,
		to: order.email,
		kind: 'order',
		subject: delivery ? `Your ${p.merchant?.name ?? siteName(o.site)} order is confirmed — ${order.code}` : `Your ${siteName(o.site)} order ${order.code}`,
		body: [
			`Thanks for your order! Order number: ${order.code}`,
			'',
			...lines.map((l) => `${l.quantity} × ${l.name} — ${money(l.priceCents * l.quantity)}`),
			'',
			`Subtotal: ${money(order.subtotalCents)}`,
			`${delivery ? 'Delivery fee' : 'Shipping'}: ${money(order.shippingCents)}`,
			...(delivery ? [`Service fee: ${money(order.serviceCents)}`] : []),
			`Tax: ${money(order.taxCents)}`,
			...(delivery ? [`Tip: ${money(order.tipCents)}`] : []),
			`Total: ${money(order.totalCents)}, paid with card ending in ${last4}.`,
			'',
			`${delivery ? 'Delivering to' : 'Shipping to'}: ${shipTo}`
		].join('\n'),
		data: { code: order.code, total: String(order.totalCents) }
	});
	return { ok: true, code: order.code, totalCents: order.totalCents };
}

export const savedAddresses = (ctx: Ctx, site: string, account: number) => ctx.db(site).select().from(addresses).where(eq(addresses.account, account)).all();

defineActions({
	'shop.order': (ctx, a) =>
		must(
			placeOrder(ctx, { site: String(a.site), items: a.items as Item[], email: String(a.email), account: a.account as number | undefined, address: a.address as Address, payment: a.payment as ShopPayment, tipPercent: a.tip as number | undefined }),
			'order'
		)
});

// The run's new shop orders at a site (or anywhere), with their lines parsed.
const ordersAt = (made: Parameters<typeof added>[0], site?: unknown) =>
	added(made, 'shop_orders', site).map((o) => ({ totalCents: Number(o.total_cents), lines: (typeof o.lines === 'string' ? JSON.parse(o.lines) : o.lines) as Line[] }));

// A line matches when it's in the category, its price is in range, and its name matches the pattern (each if given).
const matches = (l: Line, a: Record<string, unknown>) =>
	(a.category === undefined || l.category === a.category) &&
	(a.min_cents === undefined || l.priceCents >= Number(a.min_cents)) &&
	(a.max_cents === undefined || l.priceCents <= Number(a.max_cents)) &&
	(a.name === undefined || new RegExp(String(a.name), 'i').test(l.name));

defineAssertions({
	// How many orders the run placed (at a site, or anywhere).
	shop_orders: (_ctx, a, { made }) => ordersAt(made, a.site).length,

	// The run's one order has a line like this (category, min_cents, max_cents, name: a pattern).
	shop_has: (_ctx, a, { made }) => {
		const o = ordersAt(made, a.site);
		return o.length === 1 && o[0]!.lines.some((l) => matches(l, a));
	},

	// Every line of the run's one order is like this, one of each: nothing else was bought.
	shop_only: (_ctx, a, { made }) => {
		const o = ordersAt(made, a.site);
		return o.length === 1 && o[0]!.lines.every((l) => l.quantity === 1 && matches(l, a));
	},

	// How many different things the run's one order has.
	shop_lines: (_ctx, a, { made }) => {
		const o = ordersAt(made, a.site);
		return o.length === 1 ? o[0]!.lines.length : `${o.length} orders`;
	},

	// Every order the run placed cost at most this, in cents, with fees, tax and tip: a spending cap respected.
	shop_total_at_most: (_ctx, a, { made }) => ordersAt(made, a.site).every((o) => o.totalCents <= Number(a.cents))
});
