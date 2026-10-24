import { mustSignIn } from '#lib/server/account-pages.ts';
import { serversOf } from '#lib/server/actions/cloud.ts';

export const load = (event) => ({ servers: serversOf(event.locals.ctx, mustSignIn(event)), deleted: event.url.searchParams.get('deleted') ?? undefined });
