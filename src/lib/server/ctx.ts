// What an action gets: the run, any site's database in it, and the run's clock.

import { now, siteDb, type Run } from './runs.ts';
import { DOMAIN, SITES } from '../sites.ts';
import type { Db } from './db.ts';

export interface Ctx {
	run: Run;
	db: (site: string) => Db;
	now: () => string;
	// A site's public origin, for links in emails and redirects.
	origin: (site: string) => string;
}

// Where sites are reached: EVERYDAYBENCH_ORIGIN is a template like "http://{site}.everydaybench.test:8700".
export const ORIGIN = process.env.EVERYDAYBENCH_ORIGIN ?? `http://{site}.${DOMAIN}:8700`;

export function ctxFor(run: Run): Ctx {
	return {
		run,
		db: (site) => siteDb(run, site),
		now: () => now(run),
		origin: (site) => ORIGIN.replace('{site}', site)
	};
}

// The person every task is for: their inbox, and the accounts and cards seeded for them.
export const OWNER = { name: 'Sam Rivera', email: 'sam@mailmoss.test' };

export const siteName = (id: string) => SITES[id]?.name ?? id;
