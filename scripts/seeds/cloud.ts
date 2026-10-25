// The cloud consoles' seed data. Cloudpail: the owner's account on the Pro plan, four servers, a card on file and a little
// credit left. Voltbarrow: a GPU account on the Starter plan, two GPU servers, its own card and some credit.

import { cards, credits, servers, subscriptions } from '../../src/lib/server/schema.ts';
import { seedAccounts } from './tickets.ts';
import type { Make } from '../seed.ts';

export function seedCloud(make: Make) {
	const db = make('cloudpail');
	seedAccounts(db, 'cloudpail', 'bucket-brigade-44');
	db.insert(cards).values({ account: 1, brand: 'Mastercard', last4: '5100', expMonth: 3, expYear: 2029 }).run();
	db.insert(subscriptions).values({ account: 1, plan: 'Pro', priceCents: 2400, status: 'active', discount: null, renewsAt: '2026-04-02T00:00:00' }).run();
	db.insert(servers)
		.values([
			{ id: 'srv-7f3a91', account: 1, name: 'web-prod', region: 'Kestrel Bay 1', size: '2 vCPU · 4 GB', ip: '203.0.113.24' },
			{ id: 'srv-c01d55', account: 1, name: 'web-staging', region: 'Kestrel Bay 1', size: '1 vCPU · 2 GB', ip: '203.0.113.57' },
			{ id: 'srv-4be2a0', account: 1, name: 'db-backup', region: 'Harborview 2', size: '1 vCPU · 1 GB', ip: '198.51.100.12' },
			{ id: 'srv-9e8812', account: 1, name: 'staging-db', region: 'Kestrel Bay 1', size: '1 vCPU · 2 GB', ip: '203.0.113.88' }
		])
		.run();
	db.insert(credits).values({ code: 'CP-WELCOME', account: 1, amountCents: 450, cardLast4: null, createdAt: '2026-02-02T09:00:00' }).run();

	const volt = make('voltbarrow');
	seedAccounts(volt, 'voltbarrow', 'spark-gap-1912');
	volt.insert(cards).values({ account: 1, brand: 'Visa', last4: '1881', expMonth: 9, expYear: 2028 }).run();
	volt.insert(subscriptions).values({ account: 1, plan: 'Starter', priceCents: 900, status: 'active', discount: null, renewsAt: '2026-03-28T00:00:00' }).run();
	volt.insert(servers)
		.values([
			{ id: 'gpu-21c0d4', account: 1, name: 'finetune-a', region: 'Kestrel Bay 1', size: '1× A-class GPU · 24 GB', ip: '203.0.113.141' },
			{ id: 'gpu-8a7e19', account: 1, name: 'notebook', region: 'Harborview 2', size: '1× T-class GPU · 16 GB', ip: '198.51.100.77' }
		])
		.run();
	volt.insert(credits).values({ code: 'VB-WELCOME', account: 1, amountCents: 1275, cardLast4: null, createdAt: '2026-02-20T09:00:00' }).run();
}
