import type { Ctx } from '#lib/server/ctx.ts';
import type { Run } from '#lib/server/runs.ts';
import type { Site } from '#lib/sites.ts';

declare global {
	namespace App {
		interface Locals {
			run: Run;
			ctx: Ctx;
			site: Site | undefined;
			// The signed-in account on this site, if any.
			account: number | undefined;
		}
	}
}

export {};
