// Builds each scenario's seed databases (seeds/<scenario>/<site>.db) from code, deterministically: the same script
// always makes the same rows. Runs copy these. Each family's seeder is in seeds/.
//   node scripts/seed.ts

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { closeDb, createDb, type Db } from '../src/lib/server/db.ts';
import { SEEDS } from '../src/lib/server/runs.ts';
import { SITES } from '../src/lib/sites.ts';
import { SEEDERS } from './seeds/index.ts';

// A site's database in the scenario being seeded (made on first use, with its family's tables).
export type Make = (site: string) => Db;

export function seed(scenario = 'tickets-v1') {
	const dir = join(SEEDS, scenario);
	if (existsSync(dir)) rmSync(dir, { recursive: true });
	mkdirSync(dir, { recursive: true });
	const made = new Set<string>();
	const make: Make = (site) => (made.add(site), createDb(join(dir, `${site}.db`), SITES[site]!.family));
	for (const s of SEEDERS) s(make);
	for (const site of made) {
		const path = join(dir, `${site}.db`);
		createDb(path, SITES[site]!.family).$client.exec('VACUUM');
		closeDb(path);
	}
	return dir;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(`seeded ${seed()}`);
