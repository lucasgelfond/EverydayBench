import { mustSignIn } from '#lib/server/account-pages.ts';
import { subscription } from '#lib/server/actions/cloud.ts';

export const load = (event) => ({ plan: subscription(event.locals.ctx, event.locals.site!.id, mustSignIn(event))!, done: event.url.searchParams.get('done') ?? undefined });
