import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { accounts } from '#lib/server/schema.ts';
import { readCart } from '#lib/server/cart.ts';
import { word, type Word } from '#lib/sites.ts';

const WORDS: Word[] = ['signIn', 'addToCart', 'cart', 'checkout', 'placeOrder'];

export const load = ({ locals, cookies }) => {
	const site = locals.site;
	if (site?.family !== 'shop') error(404);
	const account = locals.account === undefined ? undefined : locals.ctx.db(site.id).select({ name: accounts.name }).from(accounts).where(eq(accounts.id, locals.account)).get();
	return {
		site: { id: site.id, name: site.name, tagline: site.tagline, kind: site.kind as 'store' | 'delivery', layout: site.skin.layout ?? {} },
		words: Object.fromEntries(WORDS.map((w) => [w, word(site, w)])) as Record<Word, string>,
		account: account?.name,
		inCart: readCart(cookies, locals.run.id, site.id).reduce((n, i) => n + i.quantity, 0)
	};
};
