// Shops' seed data: the two sibling stores' catalog (the same products, so an errand works the same on either), the
// delivery app's restaurants and menus, and the owner's accounts with a card and an address on file.

import { accounts, addresses, cards, merchants, products } from '../../src/lib/server/schema.ts';
import { passwordHash } from '../../src/lib/server/actions/tickets.ts';
import { OWNER } from '../../src/lib/server/ctx.ts';
import type { Db } from '../../src/lib/server/db.ts';
import type { Make } from '../seed.ts';

type P = [id: string, name: string, category: string, priceCents: number, rating: number, reviews: number, description: string, inStock?: boolean];

// Near-misses on purpose: things that come up when you search "headphones" but aren't headphones, a pair in the price
// range that's out of stock, pot holders and a pot-lid rack that aren't pots.
const CATALOG: P[] = [
	['driftline-earbuds', 'Driftline Wired Earbuds', 'Headphones', 1299, 39, 2210, 'In-ear wired earbuds with an inline mic and three tip sizes.'],
	['pulsewave-kids', "Pulsewave Kids' Headphones", 'Headphones', 1999, 42, 873, 'Volume-limited on-ear headphones in bright colors, for ages 3 and up.'],
	['corvane-on-ear', 'Corvane On-Ear Wired Headphones', 'Headphones', 2250, 41, 1534, 'Lightweight folding on-ear headphones with a 1.2 m cable.'],
	['brisa-sport', 'Brisa Sport Wireless Earbuds', 'Headphones', 3499, 43, 4120, 'Sweat-resistant Bluetooth earbuds with ear hooks and 8 hours of battery.'],
	['hushwell-over-ear', 'Hushwell Over-Ear Bluetooth Headphones', 'Headphones', 5900, 45, 6388, 'Cushioned over-ear headphones with 40 hours of battery and a carrying pouch.'],
	['lumen-studio', 'Lumen Studio Monitor Headphones', 'Headphones', 7495, 46, 1902, 'Closed-back studio headphones with a detachable coiled cable.', false],
	['aurora-anc', 'Aurora ANC Wireless Headphones', 'Headphones', 8999, 44, 3307, 'Active noise cancelling over-ear headphones with a transparency mode.'],
	['aurora-anc-pro', 'Aurora ANC Pro Wireless Headphones', 'Headphones', 12900, 47, 2785, 'Flagship noise cancelling headphones with spatial audio and 50 hours of battery.'],
	['sonnet-reference', 'Sonnet Reference Open-Back Headphones', 'Headphones', 24900, 48, 512, 'Open-back reference headphones for critical listening.'],
	['walnut-stand', 'Walnut Headphone Stand', 'Audio Accessories', 2799, 46, 990, 'A solid walnut stand that holds one pair of headphones.'],
	['hardshell-case', 'Hard-Shell Headphone Case', 'Audio Accessories', 2499, 44, 1411, 'A zippered travel case that fits most over-ear headphones.'],
	['ear-cushions', 'Replacement Headphone Ear Cushions', 'Audio Accessories', 2999, 40, 377, 'Memory-foam ear cushions for over-ear headphones, one pair.'],
	['canvas-apron', 'Canvas Cross-Back Apron', 'Kitchen Linens', 2400, 47, 2804, 'Heavy cotton canvas apron with cross-back straps and two pockets.'],
	['striped-apron', "Striped Chef's Apron", 'Kitchen Linens', 1850, 44, 1290, 'A classic blue-and-white striped bib apron with an adjustable neck.'],
	['kids-apron', "Kids' Baking Apron", 'Kitchen Linens', 1200, 45, 640, 'A small apron for young bakers, ages 4–8.'],
	['pot-holders', 'Quilted Pot Holders, Set of 2', 'Kitchen Linens', 999, 43, 3120, 'Thick quilted cotton pot holders with hanging loops.'],
	['oven-mitts', 'Silicone Oven Mitts, Pair', 'Kitchen Linens', 1499, 45, 2033, 'Heat-resistant to 450°F, with a cotton lining.'],
	['tea-towels', 'Linen Tea Towels, Set of 3', 'Kitchen Linens', 1600, 46, 905, 'Stonewashed linen towels in three colors.'],
	['stock-pot', '8-Quart Stainless Steel Stock Pot', 'Cookware', 3995, 46, 2671, 'A tri-ply stock pot with a glass lid, for soups, stocks and pasta.'],
	['dutch-oven', '5.5-Quart Enameled Cast Iron Dutch Oven', 'Cookware', 6400, 48, 5120, 'An enameled cast iron pot for braising, stews and bread.'],
	['saucepan', '2-Quart Saucepan with Lid', 'Cookware', 2999, 45, 1876, 'A stainless saucepan with a pour spout and a tight-fitting lid.'],
	['frying-pan', '10-Inch Nonstick Frying Pan', 'Cookware', 2750, 44, 4402, 'A nonstick skillet with a stay-cool handle; oven safe to 400°F.'],
	['pot-lid-rack', 'Expandable Pot Lid Organizer', 'Kitchen Storage', 1899, 42, 812, 'Holds up to seven pot lids upright in a cabinet or drawer.'],
	['spoon-set', 'Bamboo Cooking Spoons, Set of 5', 'Kitchen Tools', 1399, 46, 3301, 'Smooth bamboo spoons and spatulas that won’t scratch pans.'],
	['chef-knife', "8-Inch Chef's Knife", 'Kitchen Tools', 4500, 47, 2150, 'A forged German steel chef’s knife with a full tang.'],
	['cutting-board', 'Maple Cutting Board', 'Kitchen Tools', 3800, 47, 1198, 'An edge-grain maple board with a juice groove.']
];

type M = [id: string, name: string, cuisine: string, area: string, address: string, rating: number, reviews: number, deliveryFeeCents: number, etaMinutes: number, menu: [string, string, string, number, string][]];

// The best-rated rotisserie place's sandwich goes over $30 with its fees and the default tip; the sandwich shop's
// doesn't. Mopedette has two locations under one name, with near-identical menus: the Midtown one is better rated, so it
// comes first when the owner wants the Old Mill one.
const RESTAURANTS: M[] = [
	['ember-rotisserie', 'Ember Rotisserie', 'Rotisserie', 'Midtown', '210 Grand St', 47, 1840, 549, 35, [
		['ember-chicken-sandwich', 'Rotisserie Chicken Sandwich', 'Sandwiches', 1895, 'Pulled rotisserie chicken, garlic aioli, pickled onions and arugula on a toasted ciabatta.'],
		['ember-meal', 'Rotisserie Chicken Meal', 'Meals', 2295, 'A quarter chicken with two sides and a drink.'],
		['ember-half', 'Half Rotisserie Chicken', 'Meals', 1650, 'Half a chicken, herb-rubbed and slow roasted.'],
		['ember-fries', 'Herb Fries', 'Sides', 595, 'Crisp fries with rosemary salt.'],
		['ember-wrap', 'Chicken Caesar Wrap', 'Sandwiches', 1450, 'Rotisserie chicken, romaine, parmesan and Caesar dressing.']
	]],
	['coop-and-crumb', 'Coop & Crumb', 'Sandwiches', 'Northside', '77 Alder Ave', 44, 960, 299, 25, [
		['coop-chicken-sandwich', 'Rotisserie Chicken Sandwich', 'Sandwiches', 1350, 'Rotisserie chicken, provolone, tomato and herb mayo on sourdough.'],
		['coop-turkey-club', 'Turkey Club', 'Sandwiches', 1295, 'Roast turkey, bacon, lettuce and tomato on toasted white.'],
		['coop-soup', 'Tomato Soup', 'Soups', 650, 'Roasted tomato soup, 12 oz.'],
		['coop-cookie', 'Brown Butter Chocolate Chip Cookie', 'Desserts', 325, 'Baked every morning.']
	]],
	['basil-and-broth', 'Basil & Broth', 'Vietnamese', 'Eastgate', '15 Eastgate Blvd', 46, 1215, 399, 30, [
		['bb-banh-mi', 'Lemongrass Chicken Banh Mi', 'Sandwiches', 1195, 'Grilled lemongrass chicken, pickled carrot and daikon, cilantro, jalapeño.'],
		['bb-pho', 'Chicken Pho', 'Soups', 1550, 'Rice noodles in a slow-simmered chicken broth with herbs.'],
		['bb-rolls', 'Fresh Spring Rolls', 'Starters', 795, 'Shrimp, vermicelli and herbs in rice paper, with peanut sauce.']
	]],
	['mopedette-midtown', 'Mopedette', 'Vietnamese', 'Midtown', '48 Grand St', 47, 2306, 349, 25, [
		['mm-pork-banh-mi', 'Grilled Pork Banh Mi', 'Sandwiches', 1150, 'Lemongrass pork, pâté, pickled carrot and daikon, cilantro and jalapeño on a crackly roll.'],
		['mm-tofu-banh-mi', 'Crispy Tofu Banh Mi', 'Sandwiches', 1050, 'Five-spice tofu, pickles, cucumber and sriracha mayo.'],
		['mm-iced-coffee', 'Vietnamese Iced Coffee', 'Drinks', 550, 'Dark roast over condensed milk.']
	]],
	['mopedette-old-mill', 'Mopedette', 'Vietnamese', 'Old Mill', '9 Millrace Ln', 44, 688, 299, 30, [
		['mo-pork-banh-mi', 'Grilled Pork Banh Mi', 'Sandwiches', 1075, 'Lemongrass pork, pâté, pickled carrot and daikon, cilantro and jalapeño on a crackly roll.'],
		['mo-tofu-banh-mi', 'Crispy Tofu Banh Mi', 'Sandwiches', 995, 'Five-spice tofu, pickles, cucumber and sriracha mayo.'],
		['mo-iced-coffee', 'Vietnamese Iced Coffee', 'Drinks', 500, 'Dark roast over condensed milk.']
	]],
	['crustwell', 'Crustwell Pizza', 'Pizza', 'Riverside', '6 River Walk', 43, 2410, 199, 40, [
		['cw-margherita', 'Margherita Pizza, 14"', 'Pizza', 1800, 'Tomato, mozzarella and basil.'],
		['cw-chicken-pesto', 'Chicken Pesto Pizza, 14"', 'Pizza', 2150, 'Roast chicken, pesto, mozzarella and cherry tomatoes.'],
		['cw-knots', 'Garlic Knots (6)', 'Sides', 600, 'With marinara.']
	]]
];

const HOME = { line1: '18 Linden St, Apt 3', city: 'Brookfield', zip: '10001' };
// Where the owner lived before: still saved on some accounts, first.
const OLD_HOME = { line1: '402 Quarry Rd, Apt 5B', city: 'Brookfield', zip: '10004' };

function seedAccount(db: Db, password: string, card: { brand: string; last4: string; expMonth: number; expYear: number }, homes = [HOME]) {
	const [a] = db.insert(accounts).values({ email: OWNER.email, name: OWNER.name, password: passwordHash(OWNER.email, password) }).returning().all();
	db.insert(cards).values({ account: a!.id, ...card }).run();
	db.insert(addresses).values(homes.map((h) => ({ account: a!.id, name: OWNER.name, ...h }))).run();
}

const row = ([id, name, category, priceCents, rating, reviews, description, inStock = true]: P, merchant: string | null = null) => ({ id, merchant, name, category, priceCents, rating, reviews, description, inStock });

export function seedShop(make: Make) {
	for (const [site, password] of [['kettlewick', 'copper-kettle-42'], ['parcelpine', 'pinecone-parcel-8']] as const) {
		const db = make(site);
		db.insert(products).values(CATALOG.map((p) => row(p))).run();
		seedAccount(db, password, { brand: 'Visa', last4: '4242', expMonth: 8, expYear: 2028 });
	}
	// Bramblecart: the same catalog; the account still has the old address, saved first, so checkout picks it.
	const bramblecart = make('bramblecart');
	bramblecart.insert(products).values(CATALOG.map((p) => row(p))).run();
	seedAccount(bramblecart, 'thorny-basket-31', { brand: 'Visa', last4: '4242', expMonth: 8, expYear: 2028 }, [OLD_HOME, HOME]);
	const forkfly = make('forkfly');
	for (const [id, name, cuisine, area, address, rating, reviews, deliveryFeeCents, etaMinutes, menu] of RESTAURANTS) {
		forkfly.insert(merchants).values({ id, name, cuisine, area, address, rating, reviews, deliveryFeeCents, etaMinutes }).run();
		forkfly.insert(products).values(menu.map(([pid, pname, category, price, description]) => row([pid, pname, category, price, rating, reviews, description], id))).run();
	}
	seedAccount(forkfly, 'extra-crispy-77', { brand: 'Mastercard', last4: '4444', expMonth: 11, expYear: 2027 });
}
