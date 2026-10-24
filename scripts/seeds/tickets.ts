// Ticket sites' seed data: films, the chains' theaters, auditoriums and a week of showtimes with seats already sold,
// the aggregator's listings, and the owner's accounts and saved cards.

import { accounts, auditoriums, cards, films, listings, showtimes, taken, theaters } from '../../src/lib/server/schema.ts';
import { rng } from '../../src/lib/server/rand.ts';
import { passwordHash } from '../../src/lib/server/actions/tickets.ts';
import { OWNER } from '../../src/lib/server/ctx.ts';
import type { Db } from '../../src/lib/server/db.ts';
import { addDays } from '../../src/lib/time.ts';
import type { Make } from '../seed.ts';

// The scenario's first day; a run's clock starts on it (tasks say when).
export const TICKETS_START = '2026-03-14';
const DAYS = 7;

export const FILMS = [
	{ id: 'pinewood', title: 'Pinewood', rating: 'R', minutes: 128, genre: 'Drama', synopsis: 'Two brothers return to the logging town that made and unmade their father.' },
	{ id: 'last-lighthouse', title: 'The Last Lighthouse', rating: 'PG-13', minutes: 112, genre: 'Mystery', synopsis: 'A keeper on a fog-bound island receives letters from a ship that sank in 1904.' },
	{ id: 'neon-harbor', title: 'Neon Harbor', rating: 'R', minutes: 121, genre: 'Thriller', synopsis: 'A night-shift crane operator sees something on the docks she was never meant to.' },
	{ id: 'paper-moons', title: 'Paper Moons', rating: 'PG', minutes: 98, genre: 'Animation', synopsis: 'An origami fox sets out to fold the moon back into the sky.' },
	{ id: 'velocity-nine', title: 'Velocity Nine', rating: 'PG-13', minutes: 134, genre: 'Action', synopsis: 'A retired test pilot is pulled back for one impossible flight.' },
	{ id: 'cartographer', title: "The Cartographer's Daughter", rating: 'PG-13', minutes: 141, genre: 'Drama', synopsis: 'Mapping a coastline that keeps changing, a mapmaker finds her mother in its margins.' },
	{ id: 'quiet-season', title: 'A Quiet Season', rating: 'PG-13', minutes: 105, genre: 'Romance', synopsis: 'Off-season at a seaside hotel, the last two guests keep missing each other.' },
	{ id: 'static-bloom', title: 'Static Bloom', rating: 'NR', minutes: 88, genre: 'Documentary', synopsis: 'The radio hobbyists who listen for signals no one else is sending.' }
];

// Chains' theaters, by area of the city, and which the aggregator lists (it misses some, as real ones do).
const THEATERS = [
	{ id: 'lumiscope-northside', site: 'lumiscope', name: 'Lumiscope Northside 12', area: 'Northside', address: '1200 Alder Ave', listed: true },
	{ id: 'lumiscope-harborview', site: 'lumiscope', name: 'Lumiscope Harborview 8', area: 'Harborview', address: '45 Pier Rd', listed: false },
	{ id: 'lumiscope-midtown', site: 'lumiscope', name: 'Lumiscope Midtown IMAX', area: 'Midtown', address: '300 Grand St', listed: true },
	{ id: 'orbelle-eastgate', site: 'orbelle', name: 'Orbelle Eastgate Stadium 14', area: 'Eastgate', address: '88 Eastgate Blvd', listed: true },
	{ id: 'orbelle-riverside', site: 'orbelle', name: 'Orbelle Riverside 10', area: 'Riverside', address: '17 River Walk', listed: true },
	{ id: 'orbelle-midtown', site: 'orbelle', name: 'Orbelle Midtown Square', area: 'Midtown', address: '5 Union Sq', listed: false },
	{ id: 'brightreel-oldmill', site: 'brightreel', name: 'Brightreel Old Mill 9', area: 'Old Mill', address: '2 Millrace Ln', listed: true },
	{ id: 'brightreel-northside', site: 'brightreel', name: 'Brightreel Northside Commons', area: 'Northside', address: '410 Commons Way', listed: false },
	{ id: 'brightreel-harbor', site: 'brightreel', name: 'Brightreel Harbor Point', area: 'Harborview', address: '9 Lighthouse Pl', listed: false }
];

const shuffle = <T>(xs: T[], r: () => number) => {
	const out = [...xs];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[out[i], out[j]] = [out[j]!, out[i]!];
	}
	return out;
};

const SLOTS = ['10:30', '11:45', '13:15', '14:30', '16:00', '17:20', '18:45', '19:10', '20:30', '21:50', '22:15'];

function seedChain(db: Db, site: string, days = DAYS) {
	const own = THEATERS.filter((t) => t.site === site);
	db.insert(films).values(FILMS.filter((f) => !['static-bloom'].includes(f.id))).run();
	for (const t of own) {
		// Keyed by position, not name: renaming a theater mustn't reshuffle its showtimes.
		const r = rng('tickets-v1', 'theater', THEATERS.indexOf(t));
		db.insert(theaters).values({ id: t.id, site, name: t.name, area: t.area, address: t.address, seating: 'reserved' }).run();
		const rooms = [
			{ id: `${t.id}-1`, name: 'Auditorium 1', rows: 8, cols: 12, aisles: [3, 9], gaps: ['A1', 'A12'] },
			{ id: `${t.id}-2`, name: 'Auditorium 2', rows: 10, cols: 16, aisles: [4, 12], gaps: ['A1', 'A2', 'A15', 'A16'] },
			{ id: `${t.id}-3`, name: t.name.includes('IMAX') ? 'IMAX' : 'Auditorium 3', rows: 12, cols: 20, aisles: [5, 15], gaps: ['A1', 'A2', 'A19', 'A20'] }
		];
		db.insert(auditoriums).values(rooms.map((a) => ({ ...a, theater: t.id }))).run();
		// Five films per theater, each three or four times a day, in rotating rooms.
		const playing = shuffle(FILMS.filter((f) => f.id !== 'static-bloom'), r).slice(0, 5);
		for (let d = 0; d < days; d++) {
			const date = addDays(TICKETS_START, d);
			playing.forEach((film, i) => {
				const slots = SLOTS.filter((_, j) => (j + i + d) % 3 !== 0).filter(() => r() > 0.35).slice(0, 4);
				for (const slot of slots) {
					const room = rooms[(i + slots.indexOf(slot)) % rooms.length]!;
					const startsAt = `${date}T${slot}:00`;
					const evening = slot >= '16:00';
					const imax = room.name === 'IMAX';
					const id = `${t.id}-${film.id}-${date.replaceAll('-', '')}-${slot.replace(':', '')}`;
					db.insert(showtimes).values({ id, theater: t.id, auditorium: room.id, film: film.id, startsAt, format: imax ? 'IMAX' : 'Standard', priceCents: (evening ? 1575 : 1150) + (imax ? 500 : 0) + (site === 'orbelle' ? 50 : site === 'brightreel' ? -25 : 0) }).run();
					// Busier evenings; the odd sold-out show.
					const fullness = Math.min(0.97, (evening ? 0.45 : 0.2) + r() * 0.4 + (r() > 0.94 ? 0.5 : 0));
					const sold: string[] = [];
					for (let row = 0; row < room.rows; row++)
						for (let n = 1; n <= room.cols; n++) {
							const seat = `${String.fromCharCode(65 + row)}${n}`;
							// Middle rows sell first.
							const middle = 1 - Math.abs(row / (room.rows - 1) - 0.6);
							if (!room.gaps.includes(seat) && r() < fullness * (0.6 + 0.6 * middle)) sold.push(seat);
						}
					if (sold.length) db.insert(taken).values(sold.map((seat) => ({ showtime: id, seat }))).run();
				}
			});
		}
	}
}

export function seedAccounts(db: Db, site: string, password: string, card?: { brand: string; last4: string; expMonth: number; expYear: number }) {
	const [a] = db.insert(accounts).values({ email: OWNER.email, name: OWNER.name, password: passwordHash(OWNER.email, password) }).returning().all();
	if (card) db.insert(cards).values({ account: a!.id, ...card }).run();
}


export function seedTickets(make: Make) {
	for (const site of ['lumiscope', 'orbelle', 'brightreel']) seedChain(make(site), site);
	const showlark = make('showlark');
	showlark.insert(listings).values(THEATERS.filter((t) => t.listed).map((t) => ({ theater: t.id }))).run();
	// Accounts: Lumiscope and Showlark have a card on file; Orbelle has an account without one.
	const visa = { brand: 'Visa', last4: '4242', expMonth: 8, expYear: 2028 };
	seedAccounts(showlark, 'showlark', 'popcorn-and-rain-17', visa);
	seedAccounts(make('lumiscope'), 'lumiscope', 'lighthouse-keeper-9', visa);
	seedAccounts(make('orbelle'), 'orbelle', 'quiet-harbor-31');
}
