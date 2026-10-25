// Gridwhistle's seed data: the owner's spreadsheets. The apartment's rent ledger, split with a roommate, has January and
// February; each month's total and share are formulas.

import { cells, tabs, workbooks } from '../../src/lib/server/schema.ts';
import type { Make } from '../seed.ts';

const LEDGER = [
	['Month', 'Rent', 'Power', 'Internet', 'Total', 'Each'],
	['January 2026', '1850', '91.20', '65', '=SUM(B2:D2)', '=E2/2'],
	['February 2026', '1850', '88.34', '65', '=SUM(B3:D3)', '=E3/2']
];

const GROCERIES = [
	['Item', 'Qty', 'Done'],
	['Oat milk', '2', ''],
	['Eggs', '1', 'x'],
	['Coffee beans', '1', '']
];

export function seedSheets(make: Make) {
	const db = make('gridwhistle');
	db.insert(workbooks)
		.values([
			{ id: 'apartment', title: 'Apartment', createdAt: '2026-01-04T11:20:00' },
			{ id: 'groceries', title: 'Grocery list', createdAt: '2026-02-28T18:05:00' }
		])
		.run();
	db.insert(tabs)
		.values([
			{ id: 1, workbook: 'apartment', name: 'Rent ledger', position: 1 },
			{ id: 2, workbook: 'apartment', name: 'Move-in checklist', position: 2 },
			{ id: 3, workbook: 'groceries', name: 'Sheet1', position: 1 }
		])
		.run();
	const grid = (tab: number, rows: string[][]) => rows.flatMap((r, i) => r.flatMap((value, j) => (value ? [{ tab, row: i + 1, col: j + 1, value }] : [])));
	db.insert(cells)
		.values([...grid(1, LEDGER), ...grid(2, [['Thing', 'Done'], ['Renter’s insurance', 'x'], ['Change address', 'x']]), ...grid(3, GROCERIES)])
		.run();
}
