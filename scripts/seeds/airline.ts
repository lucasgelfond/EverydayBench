// Airlines' seed data: two weeks of flights on each airline's routes (the seats other passengers hold are made up from
// each flight's id: see `occupied`), the owner's accounts and saved cards, and two trips already booked on Skyhollow (for checking in: one tomorrow, one later).

import { accounts, cards, flights, legs, messages, seatsTaken, trips } from '../../src/lib/server/schema.ts';
import { rng } from '../../src/lib/server/rand.ts';
import { passwordHash } from '../../src/lib/server/actions/tickets.ts';
import { OWNER } from '../../src/lib/server/ctx.ts';
import type { Db } from '../../src/lib/server/db.ts';
import { addDays, addMinutes, clock, day, longDate } from '../../src/lib/time.ts';
import { airport } from '../../src/lib/airline.ts';
import type { Make } from '../seed.ts';

export const AIRLINE_START = '2026-03-14';
const DAYS = 14;

// Both directions of each, on both airlines.
const ROUTES = [
	['IND', 'EWR'],
	['PVD', 'IND'],
	['AUS', 'PIT'],
	['IND', 'BOI'],
	['MCO', 'MKE'],
	['AUS', 'JAX'],
	['SFO', 'ORD'],
	['BOS', 'DEN'],
	['SEA', 'SFO'],
	['BOS', 'ORD'],
	['DEN', 'SEA'],
	['AUS', 'DEN']
] as const;
const HUBS = ['DEN', 'ORD'];
const SLOTS = ['06:00', '07:40', '08:00', '09:15', '10:00', '11:30', '12:00', '13:45', '14:00', '15:30', '17:05', '18:20', '19:50', '21:10'];

export const AIRLINE_ACCOUNTS = {
	skyhollow: { password: 'contrail-sparrow-42', card: { brand: 'Visa', last4: '4242', expMonth: 8, expYear: 2028 } },
	// The card on file expired in January: booking with it fails.
	larkspan: { password: 'tailwind-orchard-8', card: { brand: 'Mastercard', last4: '4444', expMonth: 1, expYear: 2026 } }
};

// Trips Sam already has on Skyhollow: Basic Economy without a seat, tomorrow morning (check-in is open); and later in
// the week, with a seat (check-in isn't open yet).
export const SEEDED_TRIPS = [
	{ code: 'K7QMRX', route: ['BOS', 'DEN'], date: '2026-03-15', slot: 0, fare: 'basic', seat: null },
	{ code: 'P4WZLD', route: ['SEA', 'SFO'], date: '2026-03-16', slot: 0, fare: 'economy', seat: '12C' }
] as const;

function seedAirline(db: Db, site: keyof typeof AIRLINE_ACCOUNTS, prefix: string) {
	const r = rng('airline-v1', site);
	const made: (typeof flights.$inferInsert)[] = [];
	ROUTES.forEach(([a, b], ri) => {
		// A route's length, and so its time and price, is the same both ways and every day.
		const base = 80 + Math.floor(rng('airline-v1', 'route', a, b)() * 220);
		for (const [dir, [from, to]] of ([[a, b], [b, a]] as const).entries()) {
			for (let d = 0; d < DAYS; d++) {
				const date = addDays(AIRLINE_START, d);
				const slots = SLOTS.filter((_, si) => (si + ri + dir + d) % 3 !== 1).filter(() => r() > 0.4).slice(0, 4);
				for (const slot of slots) {
					const si = SLOTS.indexOf(slot);
					const stop = r() < 0.25 ? HUBS.find((h) => h !== from && h !== to)! : null;
					const minutes = base + (stop ? 75 + Math.floor(r() * 90) : 0);
					const departsAt = `${date}T${slot}:00`;
					const basic = Math.round(70 + base * 0.45 + r() * 60 - (stop ? 25 : 0));
					const economy = basic + 30 + Math.floor(r() * 40);
					const premium = Math.round(economy * (1.5 + r() * 0.3));
					const business = Math.round(economy * (2.6 + r() * 0.8));
					const number = `${prefix} ${100 + ri * 40 + dir * 20 + si}`;
					made.push({
						id: `${site}-${number.replace(' ', '').toLowerCase()}-${date.replaceAll('-', '')}`,
						number,
						origin: from,
						destination: to,
						departsAt,
						arrivesAt: addMinutes(departsAt, minutes),
						via: stop,
						basicCents: basic * 100,
						economyCents: economy * 100,
						premiumCents: premium * 100,
						businessCents: business * 100
					});
				}
			}
		}
	});
	for (let i = 0; i < made.length; i += 200) db.insert(flights).values(made.slice(i, i + 200)).run();
	const { password, card } = AIRLINE_ACCOUNTS[site];
	db.insert(accounts).values({ id: 1, email: OWNER.email, name: OWNER.name, password: passwordHash(OWNER.email, password) }).run();
	db.insert(cards).values({ account: 1, ...card }).run();
	return made;
}

export function seedAirlines(make: Make) {
	const sky = seedAirline(make('skyhollow'), 'skyhollow', 'SH');
	seedAirline(make('larkspan'), 'larkspan', 'LK');
	const db = make('skyhollow');
	const mail = make('mailmoss');
	for (const t of SEEDED_TRIPS) {
		const f = sky.filter((x) => x.origin === t.route[0] && x.destination === t.route[1] && day(x.departsAt!) === t.date)[t.slot]!;
		const [first, last] = OWNER.name.split(' ') as [string, string];
		const total = t.fare === 'basic' ? f.basicCents : f.economyCents;
		db.insert(trips).values({ code: t.code, account: 1, email: OWNER.email, first, last, birthDate: '1991-06-02', totalCents: total, cardLast4: '4242', payment: 'saved', createdAt: '2026-02-20T19:12:00' }).run();
		db.insert(legs).values({ trip: t.code, flight: f.id!, fare: t.fare, seat: t.seat, seatFeeCents: 0 }).run();
		if (t.seat) db.insert(seatsTaken).values({ flight: f.id!, seat: t.seat }).onConflictDoNothing().run();
		mail
			.insert(messages)
			.values({
				fromName: 'Skyhollow Air',
				fromAddr: 'no-reply@skyhollow.test',
				toAddr: OWNER.email,
				subject: `Your Skyhollow Air trip is booked — ${t.code}`,
				body: `Confirmation code: ${t.code}\nPassenger: ${OWNER.name}\n\n${f.number} ${airport(f.origin!)} to ${airport(f.destination!)}, ${longDate(day(f.departsAt!))} at ${clock(f.departsAt!)}. ${t.fare === 'basic' ? 'Basic Economy, seat assigned at check-in' : `Economy, seat ${t.seat}`}.\n\nCheck in online from 24 hours before departure.`,
				sentAt: '2026-02-20T19:12:00',
				kind: 'order',
				data: { code: t.code },
				read: true
			})
			.run();
	}
}
