// Daybrella's seed data: the owner's week, agreeing with their inbox (the budget review, Saturday's dinner).

import { events } from '../../src/lib/server/schema.ts';
import { addDays } from '../../src/lib/time.ts';
import type { Make } from '../seed.ts';

const START = '2026-03-14';

export function seedCalendar(make: Make) {
	const d = (n: number) => addDays(START, n);
	const timed = (n: number, from: string, to: string, title: string, location = '') => ({ title, allDay: false, start: `${d(n)}T${from}:00`, end: `${d(n)}T${to}:00`, location, notes: '' });
	make('daybrella')
		.insert(events)
		.values([
			timed(-2, '12:00', '13:00', 'Lunch with Jordan', 'Fig & Ferry'),
			timed(0, '09:00', '10:00', 'Farmers market', 'Harborview Pier'),
			timed(0, '18:00', '20:00', 'Dinner with Priya', 'The usual place'),
			timed(2, '08:00', '08:45', 'Dentist', 'Bright Smiles, 210 Alder Ave'),
			timed(3, '18:30', '19:30', 'Basketball practice', 'Northside Rec Center'),
			timed(5, '09:00', '10:00', 'Budget review', 'Lantern Room'),
			{ title: "Jordan's birthday", allDay: true, start: d(5), end: d(5), location: '', notes: '' },
			timed(7, '10:00', '11:00', 'Haircut', 'Old Mill Barbers')
		])
		.run();
}
