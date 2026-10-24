// The Owlbox's seed data: an arthouse program of general-admission shows.

import { films, showtimes, taken, theaters } from '../../src/lib/server/schema.ts';
import { rng } from '../../src/lib/server/rand.ts';
import { addDays } from '../../src/lib/time.ts';
import { FILMS, TICKETS_START } from './tickets.ts';
import type { Make } from '../seed.ts';

export function seedOwlbox(make: Make, days = 7) {
	const db = make('owlbox');
	db.insert(films).values(FILMS.filter((f) => ['static-bloom', 'quiet-season', 'pinewood'].includes(f.id))).run();
	db.insert(theaters).values({ id: 'owlbox', site: 'owlbox', name: 'The Owlbox', area: 'Old Mill', address: '31 Foundry St', seating: 'general' }).run();
	const r = rng('tickets-v1', 'arthouse');
	const program = [
		{ film: 'static-bloom', slots: ['13:00', '18:30'], format: 'Digital' },
		{ film: 'quiet-season', slots: ['15:45', '21:00'], format: '35mm' },
		{ film: 'pinewood', slots: ['11:00', '19:15'], format: 'Digital' }
	];
	for (let d = 0; d < days; d++) {
		const date = addDays(TICKETS_START, d);
		for (const p of program)
			for (const slot of p.slots) {
				const id = `owlbox-${p.film}-${date.replaceAll('-', '')}-${slot.replace(':', '')}`;
				db.insert(showtimes).values({ id, theater: 'owlbox', auditorium: null, film: p.film, startsAt: `${date}T${slot}:00`, format: p.format, priceCents: 1400, capacity: 80 }).run();
				const sold = Math.floor(r() * 70);
				if (sold) db.insert(taken).values(Array.from({ length: sold }, (_, i) => ({ showtime: id, seat: `GA${i + 1}` }))).run();
			}
	}
}

