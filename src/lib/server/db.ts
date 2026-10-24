// SQLite databases: one per site per run, opened once and kept.

import Database from 'better-sqlite3';
import { getTableConfig, type SQLiteTable } from 'drizzle-orm/sqlite-core';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { FAMILY_TABLES, TABLES } from './schema.ts';
import type { Family } from '../sites.ts';

export type Db = BetterSQLite3Database<typeof TABLES> & { $client: Database.Database };

// CREATE TABLE from a Drizzle table, so seeds need no migrations.
export function ddl(table: SQLiteTable) {
	const { name, columns, primaryKeys } = getTableConfig(table);
	const cols = columns.map((c) => {
		const parts = [`"${c.name}"`, c.getSQLType()];
		if (c.primary) parts.push('PRIMARY KEY');
		if (c.primary && c.getSQLType() === 'integer' && (c as { autoIncrement?: boolean }).autoIncrement) parts.push('AUTOINCREMENT');
		if (c.notNull && !c.primary) parts.push('NOT NULL');
		if (c.isUnique) parts.push('UNIQUE');
		const d = c.default;
		if (typeof d === 'boolean' || typeof d === 'number') parts.push(`DEFAULT ${Number(d)}`);
		else if (typeof d === 'string') parts.push(`DEFAULT '${d.replaceAll("'", "''")}'`);
		return parts.join(' ');
	});
	for (const pk of primaryKeys) cols.push(`PRIMARY KEY (${pk.columns.map((c) => `"${c.name}"`).join(', ')})`);
	return `CREATE TABLE IF NOT EXISTS "${name}" (${cols.join(', ')})`;
}

const open = new Map<string, Db>();

export function openDb(path: string) {
	let db = open.get(path);
	if (!db) {
		const client = new Database(path);
		client.pragma('journal_mode = WAL');
		client.pragma('busy_timeout = 2000');
		db = drizzle(client, { schema: TABLES }) as Db;
		open.set(path, db);
	}
	return db;
}

export function closeDb(path: string) {
	open.get(path)?.$client.close();
	open.delete(path);
}

// A new database with a family's tables.
export function createDb(path: string, family: Family) {
	const db = openDb(path);
	for (const t of FAMILY_TABLES[family]) db.$client.exec(ddl(TABLES[t]));
	return db;
}
