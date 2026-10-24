// Dining's seed data: restaurants on the two reservations sites (most on one, some on both), Osteria Vellutina on its
// own site, ten days of tables at every lunch and dinner time with many already booked, and a few fixed facts tasks
// rely on (a sold-out lunch, a 6-top left at one time).

import { and, eq, gte, inArray } from 'drizzle-orm';
import { booked, restaurants, slots } from '../../src/lib/server/schema.ts';
import { rng } from '../../src/lib/server/rand.ts';
import type { Db } from '../../src/lib/server/db.ts';
import { addDays, weekday } from '../../src/lib/time.ts';
import type { Make } from '../seed.ts';

// The scenario's first day (the tickets world's): a run's clock starts on it.
const START = '2026-03-14';
const DAYS = 10;

type R = Omit<typeof restaurants.$inferInsert, 'reviews'> & { reviews: number; lunch: boolean; tables: number[]; on: string[] };
const both = ['tablenook', 'seatwell'];
const SMALL = [2, 2, 2, 4, 4];
const BIG = [...SMALL, 6];
const GROUP = [...SMALL, 6, 8];

export const RESTAURANTS: R[] = [
	{ id: 'saltmarsh', name: 'Saltmarsh Oyster Room', cuisine: 'Seafood', area: 'Harborview', address: '12 Pier Rd', rating: 4.6, reviews: 812, price: 3, lunch: false, tables: SMALL, on: ['tablenook'], blurb: 'Raw bar, smoked fish and a long list of muscadets.' },
	{ id: 'pocket-lantern', name: 'Pocket Lantern Noodle Bar', cuisine: 'Chinese', area: 'Midtown', address: '71 Grand St', rating: 4.1, reviews: 1290, price: 1, lunch: true, tables: SMALL, on: ['tablenook'], blurb: 'Hand-pulled noodles and soup dumplings, fast.' },
	{ id: 'casa-ondina', name: 'Casa Ondina', cuisine: 'Mexican', area: 'Eastgate', address: '204 Eastgate Blvd', rating: 3.8, reviews: 455, price: 2, lunch: true, tables: BIG, on: ['tablenook'], blurb: 'Coastal Mexican: aguachiles, tlayudas, mezcal.' },
	{ id: 'forno-ventisette', name: 'Forno Ventisette', cuisine: 'Italian', area: 'Midtown', address: '27 Union Sq', rating: 4.4, reviews: 967, price: 2, lunch: true, tables: SMALL, on: ['tablenook'], blurb: 'Neapolitan pizza from a 900-degree oven.' },
	{ id: 'pergola-minuta', name: 'Pergola Minuta', cuisine: 'Italian', area: 'Riverside', address: '3 River Walk', rating: 3.0, reviews: 210, price: 2, lunch: true, tables: SMALL, on: both, blurb: 'A small trattoria with a covered patio by the water.' },
	{ id: 'brasserie-quillon', name: 'Brasserie Quillon', cuisine: 'French', area: 'Old Mill', address: '18 Millrace Ln', rating: 4.7, reviews: 640, price: 4, lunch: false, tables: GROUP, on: ['tablenook'], blurb: 'Steak frites, duck, and a zinc bar under the old mill wheel.' },
	{ id: 'tamarind-tram', name: 'Tamarind Tram', cuisine: 'Indian', area: 'Northside', address: '940 Alder Ave', rating: 4.2, reviews: 530, price: 2, lunch: true, tables: BIG, on: both, blurb: 'Railway-canteen curries and dosas.' },
	{ id: 'ember-ledger', name: 'Ember Ledger Steakhouse', cuisine: 'Steakhouse', area: 'Midtown', address: '1 Exchange Pl', rating: 4.5, reviews: 1105, price: 4, lunch: false, tables: GROUP, on: both, blurb: 'Dry-aged steaks and private booths for business dinners.' },
	{ id: 'basil-lattice', name: 'Basil Lattice', cuisine: 'Thai', area: 'Riverside', address: '55 River Walk', rating: 4.4, reviews: 388, price: 2, lunch: true, tables: SMALL, on: both, blurb: 'Northern Thai, khao soi and grilled sausage.' },
	{ id: 'sprigwood', name: 'Sprigwood Kitchen', cuisine: 'Vegetarian', area: 'Riverside', address: '8 Ferry St', rating: 2.7, reviews: 96, price: 1, lunch: true, tables: SMALL, on: both, blurb: 'Grain bowls and seasonal plates.' },
	{ id: 'hanbit', name: 'Hanbit Grill House', cuisine: 'Korean', area: 'Eastgate', address: '310 Eastgate Blvd', rating: 4.3, reviews: 702, price: 2, lunch: false, tables: GROUP, on: both, blurb: 'Tabletop charcoal grills, banchan, soju.' },
	{ id: 'olive-steps', name: 'Olive Steps', cuisine: 'Mediterranean', area: 'Harborview', address: '40 Lighthouse Pl', rating: 3.6, reviews: 284, price: 2, lunch: true, tables: SMALL, on: both, blurb: 'Mezze and grilled fish on a terrace over the harbor.' },
	{ id: 'quarter-moon', name: 'Quarter Moon Diner', cuisine: 'American', area: 'Northside', address: '1450 Alder Ave', rating: 3.4, reviews: 1540, price: 1, lunch: true, tables: BIG, on: both, blurb: 'Pancakes all day, pie all night.' },
	{ id: 'kumo-counter', name: 'Kumo Counter', cuisine: 'Japanese', area: 'Old Mill', address: '6 Millrace Ln', rating: 4.8, reviews: 420, price: 4, lunch: false, tables: [2, 2, 2, 4], on: both, blurb: 'A ten-seat omakase counter.' },
	{ id: 'fiorellino', name: 'Trattoria Fiorellino', cuisine: 'Italian', area: 'Northside', address: '1012 Alder Ave', rating: 4.0, reviews: 830, price: 2, lunch: false, tables: BIG, on: both, blurb: 'Fresh pasta and a nightly roast. Dinner only.' },
	{ id: 'copperline', name: 'Copperline Tavern', cuisine: 'American', area: 'Midtown', address: '220 Grand St', rating: 3.9, reviews: 1022, price: 2, lunch: true, tables: BIG, on: both, blurb: 'Burgers, oysters and a big back room for groups.' },
	{ id: 'petit-sillon', name: 'Petit Sillon', cuisine: 'French', area: 'Riverside', address: '21 Ferry St', rating: 3.9, reviews: 260, price: 3, lunch: false, tables: SMALL, on: ['seatwell'], blurb: 'A bistro of twelve tables and a chalkboard menu.' },
	{ id: 'nonna-cesira', name: 'Nonna Cesira', cuisine: 'Italian', area: 'Eastgate', address: '77 Eastgate Blvd', rating: 4.6, reviews: 1310, price: 2, lunch: true, tables: BIG, on: ['seatwell'], blurb: 'Sunday-gravy cooking, every day of the week.' },
	{ id: 'driftwood', name: 'Driftwood Supper Club', cuisine: 'American', area: 'Harborview', address: '90 Pier Rd', rating: 4.2, reviews: 690, price: 3, lunch: false, tables: GROUP, on: ['seatwell'], blurb: 'Martinis, prime rib and a piano on weekends.' },
	{ id: 'tsuki-ame', name: 'Izakaya Tsuki-Ame', cuisine: 'Japanese', area: 'Midtown', address: '15 Union Sq', rating: 4.1, reviews: 515, price: 2, lunch: false, tables: SMALL, on: ['seatwell'], blurb: 'Skewers, highballs and late-night ramen.' },
	{ id: 'molino-azul', name: 'Molino Azul', cuisine: 'Mexican', area: 'Old Mill', address: '30 Millrace Ln', rating: 3.2, reviews: 240, price: 1, lunch: true, tables: SMALL, on: ['seatwell'], blurb: 'Blue-corn tortillas made in the window.' },
	{ id: 'lotus-wick', name: 'Lotus Wick', cuisine: 'Thai', area: 'Northside', address: '880 Alder Ave', rating: 2.9, reviews: 130, price: 1, lunch: true, tables: SMALL, on: ['seatwell'], blurb: 'Curries and noodles to go or stay.' }
];

export const VELLUTINA: R = { id: 'vellutina', name: 'Osteria Vellutina', cuisine: 'Italian', area: 'Old Mill', address: '44 Millrace Ln', rating: 4.5, reviews: 0, price: 3, lunch: true, tables: [2, 2, 2, 4, 4, 6, 6], on: ['vellutina'], blurb: 'Handmade pasta, wood-fired plates and a cellar of small-producer wines.' };

const LUNCH = ['11:30', '12:00', '12:30', '13:00', '13:30', '14:00'];
const DINNER = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];

function seedRestaurant(db: Db, site: string, r: R) {
	const { lunch, tables, on: _, ...row } = r;
	db.insert(restaurants).values(row).run();
	// Keyed by the site and the restaurant's place in the list: renaming one mustn't reshuffle its bookings.
	const next = rng('dining-v1', site, r === VELLUTINA ? -1 : RESTAURANTS.indexOf(r));
	for (let d = 0; d < DAYS; d++) {
		const date = addDays(START, d);
		const weekend = ['Friday', 'Saturday'].includes(weekday(date));
		for (const time of [...(lunch ? LUNCH : []), ...DINNER]) {
			const prime = time >= '18:30' && time <= '20:30';
			// Busier at prime time, on weekends, and at places people rate highly.
			const fullness = Math.min(0.95, (time < '17:00' ? 0.3 : prime ? 0.55 : 0.35) + (weekend ? 0.2 : 0) + (r.rating - 3.5) * 0.12 + next() * 0.2);
			const ids = db.insert(slots).values(tables.map((seats) => ({ restaurant: r.id, startsAt: `${date}T${time}:00`, seats }))).returning({ id: slots.id }).all();
			const gone = ids.filter(() => next() < fullness);
			if (gone.length) db.insert(booked).values(gone.map((s) => ({ slot: s.id }))).run();
		}
	}
}

// Every table seating `seats` or more at these times, booked (or freed).
function fix(db: Db, restaurant: string, times: string[], seats: number, state: 'full' | 'free') {
	const ids = db
		.select({ id: slots.id })
		.from(slots)
		.where(and(eq(slots.restaurant, restaurant), inArray(slots.startsAt, times), gte(slots.seats, seats)))
		.all()
		.map((s) => s.id);
	db.delete(booked).where(inArray(booked.slot, ids)).run();
	if (state === 'full') db.insert(booked).values(ids.map((slot) => ({ slot }))).run();
}

const at = (date: string, ...times: string[]) => times.map((t) => `${date}T${t}:00`);

export function seedDining(make: Make) {
	for (const site of both) {
		const db = make(site);
		for (const r of RESTAURANTS) if (r.on.includes(site)) seedRestaurant(db, site, r);
	}
	const tablenook = make('tablenook');
	const seatwell = make('seatwell');
	const vellutina = make('vellutina');
	seedRestaurant(vellutina, 'vellutina', VELLUTINA);

	// Lunch today: Forno Ventisette is full at 12:30; Pergola Minuta has a table (Fiorellino does dinner only).
	fix(tablenook, 'forno-ventisette', at(START, '12:00', '12:30', '13:00'), 1, 'full');
	fix(tablenook, 'pergola-minuta', at(START, '12:30'), 2, 'free');
	// Friday the 20th, 8 to 10 PM, for six in Midtown: Copperline's big tables are gone; Ember Ledger has one at 9.
	const friday = addDays(START, 6);
	const late = ['20:00', '20:30', '21:00', '21:30', '22:00'];
	fix(tablenook, 'copperline', at(friday, ...late), 6, 'full');
	fix(tablenook, 'ember-ledger', at(friday, ...late), 6, 'full');
	fix(tablenook, 'ember-ledger', at(friday, '21:00'), 6, 'free');
	// Tonight in Riverside: the over-3-star places have tables at 7 and 7:30; Pergola Minuta (exactly 3) has plenty.
	fix(seatwell, 'basil-lattice', at(START, '19:00', '19:30'), 2, 'free');
	fix(seatwell, 'petit-sillon', at(START, '19:30'), 2, 'free');
	fix(seatwell, 'pergola-minuta', at(START, '18:00', '18:30', '19:00', '19:30', '20:00'), 2, 'free');
	// Thursday the 19th at Vellutina: a table for five or six at 7:30, none at 7 or 8.
	const thursday = addDays(START, 5);
	fix(vellutina, 'vellutina', at(thursday, '19:00', '20:00'), 5, 'full');
	fix(vellutina, 'vellutina', at(thursday, '19:30'), 5, 'free');
}
