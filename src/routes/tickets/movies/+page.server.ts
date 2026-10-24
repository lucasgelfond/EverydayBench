import { filmsOf } from '#lib/server/catalog.ts';

export const load = ({ locals }) => ({ films: filmsOf(locals.ctx, locals.site!) });
