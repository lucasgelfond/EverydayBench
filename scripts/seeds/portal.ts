// Fernwick Residents' seed data: the owner's account (unit 4C) and a past maintenance request.

import { requests, residents } from '../../src/lib/server/schema.ts';
import { seedAccounts } from './tickets.ts';
import type { Make } from '../seed.ts';

export function seedPortal(make: Make) {
	const db = make('fernwick');
	seedAccounts(db, 'fernwick', 'larch-street-1907');
	db.insert(residents).values({ account: 1, unit: '4C' }).run();
	db.insert(requests).values({ code: 'WO-118204', account: 1, unit: '4C', category: 'plumbing', location: 'Bathroom', description: 'The sink drains slowly.', enter: true, pets: false, createdAt: '2026-01-20T08:15:00' }).run();
}
