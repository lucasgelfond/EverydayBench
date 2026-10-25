// Receiptacle's seed data: the owner's account and a claim from last month, already paid.

import { claimLines, claims } from '../../src/lib/server/schema.ts';
import { seedAccounts } from './tickets.ts';
import type { Make } from '../seed.ts';

export function seedExpenses(make: Make) {
	const db = make('receiptacle');
	seedAccounts(db, 'receiptacle', 'carbon-copy-38');
	db.insert(claims).values({ code: 'EX-402118', account: 1, purpose: 'Client workshop, Halden', totalCents: 21475, status: 'paid', createdAt: '2026-02-09T16:20:00' }).run();
	db.insert(claimLines)
		.values([
			{ claim: 'EX-402118', line: 1, date: '2026-02-05', merchant: 'Northgate Taxi', category: 'transport', amountCents: 4275 },
			{ claim: 'EX-402118', line: 2, date: '2026-02-05', merchant: 'Copperpot Café', category: 'meals', amountCents: 17200 }
		])
		.run();
}
