import { mustSignIn } from '#lib/server/account-pages.ts';
import { CATEGORIES, requestsOf } from '#lib/server/actions/portal.ts';

export const load = (event) => ({ requests: requestsOf(event.locals.ctx, mustSignIn(event)), categories: CATEGORIES, filed: event.url.searchParams.get('filed') ?? undefined });
