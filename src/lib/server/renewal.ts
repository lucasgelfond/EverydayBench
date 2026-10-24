// The renewal in progress, page to page: a signed cookie (session.ts), so nothing is written before it's paid for.

import type { Cookies } from '@sveltejs/kit';
import { clearDraft, readDraft, writeDraft } from './session.ts';
import type { Renewal } from './actions/gov.ts';

const KEY = 'swiftgate_renewal';
export type Draft = Partial<Renewal> & { eligible?: string };

export const draftOf = (cookies: Cookies, run: string): Draft => readDraft(cookies, run, KEY);
export const saveDraft = (cookies: Cookies, run: string, draft: Draft) => writeDraft(cookies, run, KEY, draft as Record<string, string>);
export const dropDraft = (cookies: Cookies) => clearDraft(cookies, KEY);
