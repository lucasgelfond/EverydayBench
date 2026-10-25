// Builds each scenario's seed databases (seeds/<scenario>/<site>.db) from code, deterministically: the same script
// always makes the same rows. Runs copy these. Each family's seeder is in seeds/.
//   node scripts/seed.ts

import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { closeDb, createDb, type Db } from '../src/lib/server/db.ts';
import { SEEDS } from '../src/lib/server/runs.ts';
import { faults } from '../src/lib/server/schema.ts';
import { SITES, type Family } from '../src/lib/sites.ts';
import type { Database } from 'better-sqlite3';
import { SEEDERS } from './seeds/index.ts';

// A site's database in the scenario being seeded (made on first use, with its family's tables).
export type Make = (site: string) => Db;

// An airline's flight numbers carry its code (SH 386 on Skyhollow). Flight ids stay as they are: seat maps are made up
// from them, so the twin's seats are taken where its sibling's are.
const TWIN_FIXES: Partial<Record<Family, (db: Database, from: string, to: string) => void>> = {
	airline: (db, _from, to) => void db.prepare('UPDATE flights SET number = ? || substr(number, 3)').run(to.slice(0, 2).toUpperCase())
};

export function seed(scenario = 'tickets-v1') {
	const dir = join(SEEDS, scenario);
	if (existsSync(dir)) rmSync(dir, { recursive: true });
	mkdirSync(dir, { recursive: true });
	const made = new Set<string>();
	const make: Make = (site) => (made.add(site), createDb(join(dir, `${site}.db`), SITES[site]!.family));
	for (const s of SEEDERS) s(make);
	// A quirky sibling starts with its quirks armed, once.
	for (const site of made) for (const kind of SITES[site]!.quirks ?? []) make(site).insert(faults).values({ kind, left: 1 }).run();
	for (const site of made) {
		const path = join(dir, `${site}.db`);
		createDb(path, SITES[site]!.family).$client.exec('VACUUM');
		closeDb(path);
	}
	// Hard twins start as copies of their sibling, renamed where the data names it.
	for (const t of Object.values(SITES)) {
		if (!t.twin) continue;
		const path = join(dir, `${t.id}.db`);
		copyFileSync(join(dir, `${t.twin}.db`), path);
		TWIN_FIXES[t.family]?.(createDb(path, t.family).$client, t.twin, t.id);
		closeDb(path);
	}
	return dir;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(`seeded ${seed()}`);
