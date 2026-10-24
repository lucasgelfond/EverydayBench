// The data behind each family's sites. Every site has its own SQLite database per run, with its family's tables.
// Times are ISO strings in the run's local time (no zone): what the site shows and what tasks name.

import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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

export const TABLES = { films, theaters, auditoriums, showtimes, taken, listings, accounts, cards, orders, resets, messages, sessions, charges, express, codes };

// Which tables each family's databases have.
export const FAMILY_TABLES = {
	tickets: ['films', 'theaters', 'auditoriums', 'showtimes', 'taken', 'listings', 'accounts', 'cards', 'orders', 'resets'],
	mail: ['messages'],
	pay: ['sessions', 'charges', 'express', 'codes']
} as const;
