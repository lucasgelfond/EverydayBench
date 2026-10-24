import { reset, resetLoad } from '#lib/server/account-pages.ts';

export const load = resetLoad;
export const actions = { default: reset };
