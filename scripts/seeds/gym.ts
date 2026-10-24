// Sweatlantis's seed data: three locations and two weeks of classes. Tomorrow's schedule at Eastgate and Harborview is
// written out (tasks ask about it); the rest is drawn from each location's weekly rotation.

import { accounts, classes, locations } from '../../src/lib/server/schema.ts';
import { rng } from '../../src/lib/server/rand.ts';
import { passwordHash } from '../../src/lib/server/actions/tickets.ts';
import { OWNER } from '../../src/lib/server/ctx.ts';
import { addDays } from '../../src/lib/time.ts';
import type { Make } from '../seed.ts';

const START = '2026-03-14';
const TOMORROW = addDays(START, 1);

const LOCATIONS = [
	{ id: 'harborview', name: 'Sweatlantis Harborview', area: 'Harborview', address: '60 Pier Rd' },
	{ id: 'eastgate', name: 'Sweatlantis Eastgate', area: 'Eastgate', address: '140 Eastgate Blvd' },
	{ id: 'old-mill', name: 'Sweatlantis Old Mill', area: 'Old Mill', address: '7 Millrace Ln' }
];

// Classes by name: kind, minutes, room.
const CLASSES: Record<string, [kind: string, minutes: number, room: string]> = {
	'Sunrise Vinyasa': ['yoga', 60, 'Studio A'],
	'Yin & Tonic': ['yoga', 75, 'Studio A'],
	'Hot Yoga': ['yoga', 60, 'Hot Room'],
	'Vinyasa After Dark': ['yoga', 60, 'Studio A'],
	'Spin Cycle of Life': ['cycling', 45, 'Cycle Studio'],
	'Barbell Shop Quartet': ['strength', 50, 'Weight Room'],
	'HIIT Me Baby One More Time': ['hiit', 45, 'Studio B'],
	'Core Values': ['pilates', 50, 'Studio B'],
	Zumbalantis: ['dance', 55, 'Studio B'],
	'Aqua Wobble': ['aqua', 45, 'Pool']
};
const INSTRUCTORS = ['Ines Okoro', 'Marcus Bell', 'Theo Brandt', 'Lena Fischer', 'Dana Whitlock', 'Rafael Soto', 'Kim Ashby', 'Noor Haddad'];
const TIMES = ['06:30', '07:00', '08:15', '09:30', '11:00', '12:30', '16:00', '17:30', '18:30', '19:00'];

// Written out: [time, class, instructor].
const FIXED: Record<string, [string, string, string][]> = {
	eastgate: [
		['07:00', 'Sunrise Vinyasa', 'Ines Okoro'],
		['08:15', 'Spin Cycle of Life', 'Theo Brandt'],
		['09:30', 'Yin & Tonic', 'Marcus Bell'],
		['11:00', 'Barbell Shop Quartet', 'Rafael Soto'],
		['12:30', 'Core Values', 'Lena Fischer'],
		['16:00', 'Hot Yoga', 'Ines Okoro'],
		['17:30', 'HIIT Me Baby One More Time', 'Kim Ashby'],
		['19:00', 'Zumbalantis', 'Noor Haddad']
	],
	harborview: [
		['06:30', 'Spin Cycle of Life', 'Kim Ashby'],
		['08:15', 'Hot Yoga', 'Dana Whitlock'],
		['09:30', 'Aqua Wobble', 'Noor Haddad'],
		['12:30', 'Barbell Shop Quartet', 'Theo Brandt'],
		['17:30', 'Core Values', 'Lena Fischer'],
		['18:30', 'Vinyasa After Dark', 'Dana Whitlock'],
		['19:00', 'HIIT Me Baby One More Time', 'Rafael Soto']
	]
};

export function seedGym(make: Make) {
	const db = make('sweatlantis');
	db.insert(locations).values(LOCATIONS).run();
	const rows: (typeof classes.$inferInsert)[] = [];
	const names = Object.keys(CLASSES);
	for (const [li, loc] of LOCATIONS.entries())
		for (let d = -1; d < 14; d++) {
			const date = addDays(START, d);
			const r = rng('gym-v1', li, d);
			const day = FIXED[loc.id] && date === TOMORROW ? FIXED[loc.id]! : TIMES.filter(() => r() < 0.7).map((t) => [t, names[Math.floor(r() * names.length)]!, INSTRUCTORS[Math.floor(r() * INSTRUCTORS.length)]!] as [string, string, string]);
			for (const [time, name, instructor] of day) {
				const [kind, minutes, room] = CLASSES[name]!;
				const capacity = kind === 'cycling' ? 24 : kind === 'aqua' ? 12 : 20;
				rows.push({ id: `${loc.id}-${date.replaceAll('-', '')}-${time.replace(':', '')}`, location: loc.id, name, kind, startsAt: `${date}T${time}:00`, minutes, instructor, room, capacity, held: Math.floor(r() * capacity) });
			}
		}
	db.insert(classes).values(rows).run();
	db.insert(accounts).values({ email: OWNER.email, name: OWNER.name, password: passwordHash(OWNER.email, 'deep-end-squats') }).run();
}
