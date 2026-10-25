// Thriftwell Bank's seed data: the owner's checking, savings and Visa, from late January to now. February is the month
// the budget task works from: purchases and bills in six plain categories, a partial refund, a card payment and a
// transfer to savings (money moving between the owner's own accounts), a paycheck, and a charge still pending.

import { bankAccounts, transactions } from '../../src/lib/server/schema.ts';
import type { Make } from '../seed.ts';

type Row = [account: string, date: string, description: string, dollars: number, status?: 'pending'];

export const BANK_ROWS: Row[] = [
	['visa', '2026-01-31', 'Green Basket Market', -40.0],
	['visa', '2026-02-01', 'Linkwave Internet', -65.0],
	['checking', '2026-02-01', 'Fernwick Residents rent', -1850.0],
	['visa', '2026-02-02', 'Green Basket Market', -84.37],
	['visa', '2026-02-04', 'Kestrel Bay Transit pass', -40.0],
	['visa', '2026-02-06', 'Mopedette', -21.5],
	['visa', '2026-02-07', 'Kettlewick', -129.99],
	['visa', '2026-02-09', 'Green Basket Market', -62.15],
	['checking', '2026-02-10', 'Kestrel Bay Power & Light', -88.34],
	['visa', '2026-02-11', 'Old Mill Barbers', -32.0],
	['visa', '2026-02-13', 'Ember Ledger Steakhouse', -148.6],
	['visa', '2026-02-14', 'Cloudpail', -12.0],
	['checking', '2026-02-15', 'Payroll — Harborworks', 2850.0],
	['visa', '2026-02-16', 'Fernhill Grocers', -23.48],
	['visa', '2026-02-18', 'Harbor Fuel', -46.12],
	['checking', '2026-02-20', 'Transfer to Savings ••2210', -500.0],
	['savings', '2026-02-20', 'Transfer from Checking ••3317', 500.0],
	['visa', '2026-02-20', 'Forkfly *Ember Rotisserie', -28.75],
	['visa', '2026-02-21', 'Parcelpine', -54.0],
	['visa', '2026-02-22', 'Payment — thank you', 612.4],
	['checking', '2026-02-22', 'Thriftwell Visa payment', -612.4],
	['visa', '2026-02-23', 'Green Basket Market', -71.9],
	['visa', '2026-02-25', 'Parcelpine refund', 18.0],
	['visa', '2026-02-26', 'Sweatlantis membership', -49.0],
	['visa', '2026-02-27', 'Tablenook hold', -25.0, 'pending'],
	['visa', '2026-03-01', 'Linkwave Internet', -65.0],
	['checking', '2026-03-01', 'Fernwick Residents rent', -1850.0],
	['visa', '2026-03-03', 'Green Basket Market', -58.22],
	['checking', '2026-03-06', 'Kestrel Bay Power & Light', -76.58],
	['visa', '2026-03-09', 'Mopedette', -18.25]
];

export function seedBank(make: Make) {
	const db = make('thriftwell');
	db.insert(bankAccounts)
		.values([
			{ id: 'checking', name: 'Everyday Checking', last4: '3317', kind: 'checking', openingCents: 412_655 },
			{ id: 'savings', name: 'Rainy Day Savings', last4: '2210', kind: 'savings', openingCents: 1_240_000 },
			{ id: 'visa', name: 'Thriftwell Visa Signature', last4: '4821', kind: 'credit', openingCents: -61_240 }
		])
		.run();
	db.insert(transactions)
		.values(BANK_ROWS.map(([account, date, description, dollars, status]) => ({ account, date, description, amountCents: Math.round(dollars * 100), status: status ?? ('posted' as const) })))
		.run();
}
