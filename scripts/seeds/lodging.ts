// Roostable's seed data: homes in three cities with nights already taken, and the owner's account and saved cards.
// Kestrel Bay's homes are written out (a task needs one cheapest home that fits, with near misses around it); the other
// cities' are generated.

import { accounts, cards, homes, nights } from '../../src/lib/server/schema.ts';
import { rng } from '../../src/lib/server/rand.ts';
import { passwordHash } from '../../src/lib/server/actions/tickets.ts';
import { OWNER } from '../../src/lib/server/ctx.ts';
import { addDays } from '../../src/lib/time.ts';
import type { Make } from '../seed.ts';

const START = '2026-03-14';
const DAYS = 75;

type Home = typeof homes.$inferInsert;

const KESTREL: [title: string, area: string, kind: string, guests: number, bedrooms: number, beds: number, nightly: number, cleaning: number, amenities: string[], taken: number[]][] = [
	// Nights taken are days after START; the booking task's are 6 and 7 (March 20 and 21).
	['Driftwood Room', 'Old Harbor', 'Private room', 2, 1, 1, 95, 15, ['wifi'], [1, 2]],
	['Breakwater Bungalow', 'South Shore', 'Entire home', 4, 2, 2, 139, 50, ['wifi', 'kitchen', 'washer'], [6]],
	['Harbor Nook', 'Old Harbor', 'Entire apartment', 2, 1, 1, 145, 35, ['wifi', 'kitchen'], []],
	["Gull's Rest Studio", 'Lighthouse Point', 'Entire apartment', 2, 1, 1, 155, 40, ['wifi', 'kitchen', 'washer'], [7, 8]],
	['Tidewater Loft', 'Old Harbor', 'Entire loft', 1, 1, 1, 160, 30, ['wifi', 'washer', 'workspace'], []],
	['Saltbox Cottage', 'South Shore', 'Entire cottage', 2, 1, 1, 165, 30, ['wifi', 'kitchen', 'washer', 'parking'], [12, 13]],
	['Pier Street Flat', 'Old Harbor', 'Entire apartment', 3, 1, 2, 172, 45, ['wifi', 'kitchen', 'washer'], [3]],
	['Seaglass Apartment', 'Lighthouse Point', 'Entire apartment', 2, 1, 1, 176, 40, ['wifi', 'washer', 'air conditioning'], []],
	['Kelp Forest Cabin', 'North Woods', 'Entire cabin', 6, 3, 4, 188, 75, ['wifi', 'kitchen', 'washer', 'parking', 'hot tub'], []],
	['Anchor & Oak', 'Old Harbor', 'Entire home', 4, 2, 2, 199, 60, ['wifi', 'kitchen', 'parking'], []],
	['Lighthouse View Suite', 'Lighthouse Point', 'Entire suite', 4, 2, 2, 210, 55, ['wifi', 'kitchen', 'washer', 'air conditioning'], [9]],
	['Moonraker House', 'South Shore', 'Entire home', 8, 4, 5, 240, 90, ['wifi', 'kitchen', 'washer', 'parking', 'pets allowed'], [6, 7, 8]]
];

const HOSTS = ['Marisol', 'Theo', 'Hana', 'Desmond', 'Ines', 'Callum', 'Rosa', 'Kwame', 'Elin', 'Farid', 'June', 'Otto'];
const AMENITIES = ['wifi', 'kitchen', 'washer', 'parking', 'air conditioning', 'workspace', 'pets allowed', 'hot tub'];
const WORDS = { a: ['Sunny', 'Quiet', 'Garden', 'Corner', 'Brick', 'Hilltop', 'Riverside', 'Leafy', 'Bright', 'Cozy', 'Modern', 'Old Town'], b: ['Flat', 'Loft', 'House', 'Cottage', 'Townhouse', 'Studio', 'Retreat', 'Rowhouse', 'Bungalow', 'Duplex'] };
const CITIES = [
	{ city: 'Port Alder', areas: ['Canal District', 'Beacon Hill', 'Millbrook', 'Old Port'] },
	{ city: 'Marrowdale', areas: ['Market Square', 'Elm Park', 'University Quarter'] }
];

function generated(city: string, areas: string[], index: number, n: number) {
	const out: { home: Home; taken: number[] }[] = [];
	for (let i = 0; i < n; i++) {
		const r = rng('lodging-v1', index, i);
		const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)]!;
		const bedrooms = 1 + Math.floor(r() * 4);
		const guests = Math.max(1, bedrooms * 2 - Math.floor(r() * 2));
		const amenities = AMENITIES.filter((a, k) => r() < (k === 0 ? 0.7 : 0.45) && a);
		const taken: number[] = [];
		for (let d = 0; d < DAYS; d++) if (r() < 0.25) taken.push(d);
		out.push({
			home: {
				id: `${city.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`,
				city,
				area: pick(areas),
				title: `${pick(WORDS.a)} ${pick(WORDS.b)}`,
				kind: bedrooms > 1 ? 'Entire home' : pick(['Entire apartment', 'Private room']),
				guests,
				bedrooms,
				beds: bedrooms + Math.floor(r() * 2),
				baths: Math.max(1, Math.floor(bedrooms / 2) + Math.floor(r() * 2)),
				nightlyCents: (70 + bedrooms * 40 + Math.floor(r() * 90)) * 100,
				cleaningCents: (20 + Math.floor(r() * 60)) * 100,
				amenities,
				rating: 410 + Math.floor(r() * 90),
				reviews: 3 + Math.floor(r() * 300),
				host: pick(HOSTS),
				description: `A ${bedrooms}-bedroom place in ${city}.`
			},
			taken
		});
	}
	return out;
}

export function seedLodging(make: Make) {
	const db = make('roostable');
	const kestrel = KESTREL.map(([title, area, kind, guests, bedrooms, beds, nightly, cleaning, amenities, taken], i) => ({
		home: {
			id: `kestrel-bay-${i + 1}`,
			city: 'Kestrel Bay',
			area,
			title,
			kind,
			guests,
			bedrooms,
			beds,
			baths: 1,
			nightlyCents: nightly * 100,
			cleaningCents: cleaning * 100,
			amenities,
			rating: 455 + ((i * 7) % 45),
			reviews: 12 + i * 17,
			host: HOSTS[i % HOSTS.length]!,
			description: `${kind} in ${area}, a short walk from the water.`
		},
		taken
	}));
	const all = [...kestrel, ...CITIES.flatMap((c, i) => generated(c.city, c.areas, i, 20))];
	db.insert(homes).values(all.map((h) => h.home)).run();
	const taken = all.flatMap((h) => h.taken.map((d) => ({ home: h.home.id!, date: addDays(START, d) })));
	for (let i = 0; i < taken.length; i += 500) db.insert(nights).values(taken.slice(i, i + 500)).run();
	db.insert(accounts).values({ email: OWNER.email, name: OWNER.name, password: passwordHash(OWNER.email, 'nest-egg-2026') }).run();
	db.insert(cards)
		.values([
			{ account: 1, brand: 'Mastercard', last4: '5454', expMonth: 11, expYear: 2028 },
			{ account: 1, brand: 'Visa', last4: '1881', expMonth: 1, expYear: 2026 }
		])
		.run();
}
