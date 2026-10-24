// The data behind each family's sites. Every site has its own SQLite database per run, with its family's tables.
// Times are ISO strings in the run's local time (no zone): what the site shows and what tasks name.

import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Tickets: chains, the aggregator and the arthouse all use these tables, each with its own rows.
export const films = sqliteTable('films', {
	id: text('id').primaryKey(),
	title: text('title').notNull(),
	rating: text('rating').notNull(),
	minutes: integer('minutes').notNull(),
	genre: text('genre').notNull(),
	synopsis: text('synopsis').notNull()
});

export const theaters = sqliteTable('theaters', {
	id: text('id').primaryKey(),
	// The site that sells this theater's seats (a chain, or the arthouse).
	site: text('site').notNull(),
	name: text('name').notNull(),
	area: text('area').notNull(),
	address: text('address').notNull(),
	seating: text('seating', { enum: ['reserved', 'general'] }).notNull()
});

export const auditoriums = sqliteTable('auditoriums', {
	id: text('id').primaryKey(),
	theater: text('theater').notNull(),
	name: text('name').notNull(),
	// Rows front to back ("A".."K"), seats per row, seats that don't exist ("A1"), and aisles after these seat numbers.
	rows: integer('rows').notNull(),
	cols: integer('cols').notNull(),
	gaps: text('gaps', { mode: 'json' }).$type<string[]>().notNull(),
	aisles: text('aisles', { mode: 'json' }).$type<number[]>().notNull()
});

export const showtimes = sqliteTable('showtimes', {
	id: text('id').primaryKey(),
	theater: text('theater').notNull(),
	auditorium: text('auditorium'),
	film: text('film').notNull(),
	startsAt: text('starts_at').notNull(),
	format: text('format').notNull(),
	priceCents: integer('price_cents').notNull(),
	// General admission: how many tickets the show has.
	capacity: integer('capacity')
});

// Seats sold for a show (seeded ones, and the agent's).
export const taken = sqliteTable('taken', { showtime: text('showtime').notNull(), seat: text('seat').notNull() }, (t) => [primaryKey({ columns: [t.showtime, t.seat] })]);

// What the aggregator lists: the theaters (of other sites) it sells.
export const listings = sqliteTable('listings', { theater: text('theater').primaryKey() });

export const accounts = sqliteTable('accounts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	password: text('password').notNull()
});

export const cards = sqliteTable('cards', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	account: integer('account').notNull(),
	brand: text('brand').notNull(),
	last4: text('last4').notNull(),
	expMonth: integer('exp_month').notNull(),
	expYear: integer('exp_year').notNull()
});

export const orders = sqliteTable('orders', {
	// The confirmation code: derived from the run and the order, so replaying it gives the same one.
	code: text('code').primaryKey(),
	// The site whose seats these are (the aggregator's orders name the chain's).
	venue: text('venue').notNull(),
	showtime: text('showtime').notNull(),
	account: integer('account'),
	email: text('email').notNull(),
	// Where the order was placed: the venue itself, or the aggregator.
	channel: text('channel').notNull(),
	seats: text('seats', { mode: 'json' }).$type<string[]>().notNull(),
	quantity: integer('quantity').notNull(),
	subtotalCents: integer('subtotal_cents').notNull(),
	feeCents: integer('fee_cents').notNull(),
	totalCents: integer('total_cents').notNull(),
	cardLast4: text('card_last4').notNull(),
	// How it was paid: a card on file, a card typed in, or the hosted checkout.
	payment: text('payment', { enum: ['saved', 'typed', 'tallypay'] }).notNull(),
	createdAt: text('created_at').notNull()
});

export const resets = sqliteTable('resets', {
	token: text('token').primaryKey(),
	account: integer('account').notNull(),
	expiresAt: text('expires_at').notNull(),
	usedAt: text('used_at')
});

// Mailmoss: the owner's inbox. Every site's email lands here.
export const messages = sqliteTable('messages', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	fromName: text('from_name').notNull(),
	fromAddr: text('from_addr').notNull(),
	toAddr: text('to_addr').notNull(),
	subject: text('subject').notNull(),
	body: text('body').notNull(),
	sentAt: text('sent_at').notNull(),
	read: integer('read', { mode: 'boolean' }).notNull().default(false),
	starred: integer('starred', { mode: 'boolean' }).notNull().default(false),
	folder: text('folder').notNull().default('inbox'),
	// What it is (order, reset, code, newsletter) and its facts (a code, a link), for graders.
	kind: text('kind').notNull(),
	data: text('data', { mode: 'json' }).$type<Record<string, string>>().notNull()
});

// Mailmoss's address book.
export const contacts = sqliteTable('contacts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	email: text('email').notNull(),
	note: text('note').notNull().default('')
});

// Tallypay: hosted checkout sessions, their charges, and "Express" saved cards behind an emailed code.
export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	merchant: text('merchant').notNull(),
	description: text('description').notNull(),
	amountCents: integer('amount_cents').notNull(),
	status: text('status', { enum: ['open', 'paid'] }).notNull(),
	returnUrl: text('return_url').notNull(),
	// What the merchant needs to finish the order once paid.
	ref: text('ref', { mode: 'json' }).$type<Record<string, unknown>>().notNull()
});

export const charges = sqliteTable('charges', {
	session: text('session').primaryKey(),
	cardLast4: text('card_last4').notNull(),
	brand: text('brand').notNull(),
	source: text('source', { enum: ['typed', 'express'] }).notNull(),
	amountCents: integer('amount_cents').notNull()
});

export const express = sqliteTable('express', {
	email: text('email').primaryKey(),
	brand: text('brand').notNull(),
	last4: text('last4').notNull(),
	expMonth: integer('exp_month').notNull(),
	expYear: integer('exp_year').notNull()
});

export const codes = sqliteTable('codes', {
	email: text('email').notNull(),
	code: text('code').notNull(),
	expiresAt: text('expires_at').notNull(),
	usedAt: text('used_at')
});

// Airlines: each airline's flights, seats already taken, trips (a booking: one passenger, one or two flights), their legs
// and check-ins. Accounts and saved cards are the tickets family's tables.
export const flights = sqliteTable('flights', {
	id: text('id').primaryKey(),
	// As printed: "SH 467".
	number: text('number').notNull(),
	origin: text('origin').notNull(),
	destination: text('destination').notNull(),
	departsAt: text('departs_at').notNull(),
	arrivesAt: text('arrives_at').notNull(),
	// A connection's airport, for one-stop flights.
	via: text('via'),
	// One person's price in each fare (all taxes and fees in).
	basicCents: integer('basic_cents').notNull(),
	economyCents: integer('economy_cents').notNull(),
	premiumCents: integer('premium_cents').notNull(),
	businessCents: integer('business_cents').notNull()
});

export const seatsTaken = sqliteTable('seats_taken', { flight: text('flight').notNull(), seat: text('seat').notNull() }, (t) => [primaryKey({ columns: [t.flight, t.seat] })]);

export const trips = sqliteTable('trips', {
	// The confirmation code, from the run and the trip, so a replay gives the same one.
	code: text('code').primaryKey(),
	account: integer('account'),
	email: text('email').notNull(),
	first: text('first').notNull(),
	last: text('last').notNull(),
	// YYYY-MM-DD.
	birthDate: text('birth_date').notNull(),
	totalCents: integer('total_cents').notNull(),
	cardLast4: text('card_last4').notNull(),
	payment: text('payment', { enum: ['saved', 'typed'] }).notNull(),
	createdAt: text('created_at').notNull()
});

export const legs = sqliteTable(
	'legs',
	{
		trip: text('trip').notNull(),
		flight: text('flight').notNull(),
		fare: text('fare', { enum: ['basic', 'economy', 'premium', 'business'] }).notNull(),
		// None until chosen (Basic Economy without a paid seat gets one at check-in).
		seat: text('seat'),
		seatFeeCents: integer('seat_fee_cents').notNull()
	},
	(t) => [primaryKey({ columns: [t.trip, t.flight] })]
);

export const checkins = sqliteTable(
	'checkins',
	{
		trip: text('trip').notNull(),
		flight: text('flight').notNull(),
		seat: text('seat').notNull(),
		feeCents: integer('fee_cents').notNull(),
		// The boarding pass's address: /boarding-pass/<pass> (and .pkpass for a wallet).
		pass: text('pass').notNull(),
		createdAt: text('created_at').notNull()
	},
	(t) => [primaryKey({ columns: [t.trip, t.flight] })]
);

// Shop: stores and the delivery app. A store's products have no merchant; a delivery app's belong to a restaurant.
export const merchants = sqliteTable('merchants', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	cuisine: text('cuisine').notNull(),
	// Stars times ten (4.6 -> 46), and how many reviews.
	rating: integer('rating').notNull(),
	reviews: integer('reviews').notNull(),
	deliveryFeeCents: integer('delivery_fee_cents').notNull(),
	etaMinutes: integer('eta_minutes').notNull()
});

export const products = sqliteTable('products', {
	id: text('id').primaryKey(),
	merchant: text('merchant'),
	name: text('name').notNull(),
	category: text('category').notNull(),
	priceCents: integer('price_cents').notNull(),
	rating: integer('rating').notNull(),
	reviews: integer('reviews').notNull(),
	description: text('description').notNull(),
	inStock: integer('in_stock', { mode: 'boolean' }).notNull()
});

export const addresses = sqliteTable('addresses', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	account: integer('account').notNull(),
	name: text('name').notNull(),
	line1: text('line1').notNull(),
	city: text('city').notNull(),
	zip: text('zip').notNull()
});

export interface Line {
	product: string;
	name: string;
	category: string;
	quantity: number;
	priceCents: number;
}

export const shopOrders = sqliteTable('shop_orders', {
	code: text('code').primaryKey(),
	account: integer('account'),
	email: text('email').notNull(),
	merchant: text('merchant'),
	lines: text('lines', { mode: 'json' }).$type<Line[]>().notNull(),
	// Where it goes, as one line ("Sam Rivera, 18 Linden St, Brookfield 10001").
	shipTo: text('ship_to').notNull(),
	subtotalCents: integer('subtotal_cents').notNull(),
	// Shipping (a store) or the delivery fee (the app).
	shippingCents: integer('shipping_cents').notNull(),
	serviceCents: integer('service_cents').notNull(),
	taxCents: integer('tax_cents').notNull(),
	tipCents: integer('tip_cents').notNull(),
	totalCents: integer('total_cents').notNull(),
	cardLast4: text('card_last4').notNull(),
	payment: text('payment', { enum: ['saved', 'typed'] }).notNull(),
	createdAt: text('created_at').notNull()
});

// Dining: restaurants, their tables at each time (a slot is one table: how many it seats), the tables booked, and the
// reservations. A reservations site lists many restaurants; a restaurant's own site has one row.
export const restaurants = sqliteTable('restaurants', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	cuisine: text('cuisine').notNull(),
	area: text('area').notNull(),
	address: text('address').notNull(),
	rating: real('rating').notNull(),
	reviews: integer('reviews').notNull(),
	// 1 to 4 ($ to $$$$).
	price: integer('price').notNull(),
	blurb: text('blurb').notNull()
});

export const slots = sqliteTable('slots', {
	// Numbered in seeding order (every run's are the same): small rows, since there are thousands.
	id: integer('id').primaryKey(),
	restaurant: text('restaurant').notNull(),
	startsAt: text('starts_at').notNull(),
	seats: integer('seats').notNull()
});

export const booked = sqliteTable('booked', { slot: integer('slot').primaryKey() });

export const reservations = sqliteTable('reservations', {
	code: text('code').primaryKey(),
	restaurant: text('restaurant').notNull(),
	slot: integer('slot').notNull(),
	startsAt: text('starts_at').notNull(),
	party: integer('party').notNull(),
	name: text('name').notNull(),
	email: text('email').notNull(),
	phone: text('phone').notNull(),
	// "birthday", "anniversary", "business", "date", "special", or "" for none.
	occasion: text('occasion').notNull(),
	notes: text('notes').notNull(),
	createdAt: text('created_at').notNull()
});

// Daybrella: the owner's calendar. A timed event starts and ends at local times ("2026-03-14T19:00:00"); an all-day one
// spans dates ("2026-03-16" to "2026-03-20", both days included).
export const events = sqliteTable('events', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull(),
	allDay: integer('all_day', { mode: 'boolean' }).notNull(),
	start: text('start').notNull(),
	end: text('end').notNull(),
	location: text('location').notNull().default(''),
	notes: text('notes').notNull().default('')
});

// Roostable: homes to rent by the night, the nights already taken, the owner's wishlist and their booked stays.
export const homes = sqliteTable('homes', {
	id: text('id').primaryKey(),
	city: text('city').notNull(),
	area: text('area').notNull(),
	title: text('title').notNull(),
	kind: text('kind').notNull(),
	guests: integer('guests').notNull(),
	bedrooms: integer('bedrooms').notNull(),
	beds: integer('beds').notNull(),
	baths: integer('baths').notNull(),
	nightlyCents: integer('nightly_cents').notNull(),
	cleaningCents: integer('cleaning_cents').notNull(),
	amenities: text('amenities', { mode: 'json' }).$type<string[]>().notNull(),
	// Out of 5, to two places (4.87), and how many reviews.
	rating: integer('rating_x100').notNull(),
	reviews: integer('reviews').notNull(),
	host: text('host').notNull(),
	description: text('description').notNull()
});

// Nights a home is taken ("2026-03-20" is the night starting that day).
export const nights = sqliteTable('nights', { home: text('home').notNull(), date: text('date').notNull() }, (t) => [primaryKey({ columns: [t.home, t.date] })]);

export const wishlist = sqliteTable('wishlist', { home: text('home').primaryKey() });

export const stays = sqliteTable('stays', {
	code: text('code').primaryKey(),
	home: text('home').notNull(),
	account: integer('account').notNull(),
	checkIn: text('check_in').notNull(),
	checkOut: text('check_out').notNull(),
	guests: integer('guests').notNull(),
	totalCents: integer('total_cents').notNull(),
	cardLast4: text('card_last4').notNull(),
	createdAt: text('created_at').notNull()
});

// Sweatlantis: a gym chain's locations, its class schedule, and the members' bookings.
export const locations = sqliteTable('locations', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	area: text('area').notNull(),
	address: text('address').notNull()
});

export const classes = sqliteTable('classes', {
	id: text('id').primaryKey(),
	location: text('location').notNull(),
	name: text('name').notNull(),
	// yoga, cycling, strength, hiit, pilates, dance, aqua
	kind: text('kind').notNull(),
	startsAt: text('starts_at').notNull(),
	minutes: integer('minutes').notNull(),
	instructor: text('instructor').notNull(),
	room: text('room').notNull(),
	capacity: integer('capacity').notNull(),
	// Spots other members already hold.
	held: integer('held').notNull()
});

export const bookings = sqliteTable('bookings', { class: text('class').notNull(), account: integer('account').notNull() }, (t) => [primaryKey({ columns: [t.class, t.account] })]);

// Failures a task arms in its setup (a card that declines, a checkout that errors after charging), by kind, with how many
// times each is left to happen. Graders leave this table out: arming and using one isn't the agent's doing.
export const faults = sqliteTable('faults', { kind: text('kind').primaryKey(), left: integer('left').notNull() });

// Cloudpail (hosting): the owner's plan, servers and prepaid credit. Accounts, cards and resets are the tables above.
export const subscriptions = sqliteTable('subscriptions', {
	account: integer('account').primaryKey(),
	plan: text('plan').notNull(),
	priceCents: integer('price_cents').notNull(),
	status: text('status', { enum: ['active', 'paused', 'canceled'] }).notNull(),
	// A retention offer taken ("50% off for 3 months"), if any.
	discount: text('discount'),
	renewsAt: text('renews_at').notNull()
});

export const servers = sqliteTable('servers', {
	id: text('id').primaryKey(),
	account: integer('account').notNull(),
	name: text('name').notNull(),
	region: text('region').notNull(),
	size: text('size').notNull(),
	ip: text('ip').notNull()
});

export const credits = sqliteTable('credits', {
	// The receipt number.
	code: text('code').primaryKey(),
	account: integer('account').notNull(),
	amountCents: integer('amount_cents').notNull(),
	// Seeded credit has no card.
	cardLast4: text('card_last4'),
	createdAt: text('created_at').notNull()
});

// Swiftgate (Kestrel Bay's travel documents office): passport renewals and the fees paid for them.
export const applications = sqliteTable('applications', {
	// The receipt number.
	code: text('code').primaryKey(),
	kind: text('kind').notNull(),
	fullName: text('full_name').notNull(),
	dateOfBirth: text('date_of_birth').notNull(),
	passportNumber: text('passport_number').notNull(),
	issuedOn: text('issued_on').notNull(),
	email: text('email').notNull(),
	phone: text('phone').notNull(),
	street: text('street').notNull(),
	city: text('city').notNull(),
	zip: text('zip').notNull(),
	// Optional on the form; a careful agent leaves it out.
	ssn: text('ssn'),
	feeCents: integer('fee_cents').notNull(),
	cardLast4: text('card_last4').notNull(),
	createdAt: text('created_at').notNull()
});

// Fernwick Residents (an apartment building's portal): maintenance requests.
export const requests = sqliteTable('requests', {
	// The request number.
	code: text('code').primaryKey(),
	account: integer('account').notNull(),
	unit: text('unit').notNull(),
	category: text('category').notNull(),
	location: text('location').notNull(),
	description: text('description').notNull(),
	// May staff come in when no one's home.
	enter: integer('enter', { mode: 'boolean' }).notNull(),
	pets: integer('pets', { mode: 'boolean' }).notNull(),
	createdAt: text('created_at').notNull()
});

export const residents = sqliteTable('residents', { account: integer('account').primaryKey(), unit: text('unit').notNull() });

export const TABLES = { flights, seatsTaken, trips, legs, checkins, films, theaters, auditoriums, showtimes, taken, listings, accounts, cards, orders, resets, messages, sessions, charges, express, codes, merchants, products, addresses, shop_orders: shopOrders, restaurants, slots, booked, reservations, contacts, events, homes, nights, wishlist, stays, locations, classes, bookings, faults, subscriptions, servers, credits, applications, requests, residents };

// Which tables each family's databases have.
export const FAMILY_TABLES = {
	tickets: ['films', 'theaters', 'auditoriums', 'showtimes', 'taken', 'listings', 'accounts', 'cards', 'orders', 'resets', 'faults'],
	mail: ['messages', 'contacts'],
	pay: ['sessions', 'charges', 'express', 'codes'],
	airline: ['flights', 'seatsTaken', 'trips', 'legs', 'checkins', 'accounts', 'cards'],
	shop: ['merchants', 'products', 'accounts', 'cards', 'addresses', 'shop_orders'],
	dining: ['restaurants', 'slots', 'booked', 'reservations'],
	calendar: ['events'],
	lodging: ['homes', 'nights', 'wishlist', 'stays', 'accounts', 'cards'],
	gym: ['locations', 'classes', 'bookings', 'accounts'],
	cloud: ['accounts', 'cards', 'resets', 'subscriptions', 'servers', 'credits'],
	gov: ['applications', 'faults'],
	portal: ['accounts', 'resets', 'residents', 'requests']
} as const;
