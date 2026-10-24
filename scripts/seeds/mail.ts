// Mailmoss's seed data: a lived-in inbox, so a site's email isn't the only thing there.

import { messages } from '../../src/lib/server/schema.ts';
import { OWNER } from '../../src/lib/server/ctx.ts';
import { addDays } from '../../src/lib/time.ts';
import type { Make } from '../seed.ts';

// Days before the tickets scenario's first day.
const START = '2026-03-14';

export function seedMail(make: Make) {
	const db = make('mailmoss');
	const at = (d: number, t: string) => `${addDays(START, d)}T${t}:00`;
	const mail = [
		{ fromName: 'Harbor Library', fromAddr: 'events@harborlibrary.test', subject: 'This week at the library', body: 'Author talk Thursday at 7 PM. Seed swap Saturday morning.', sentAt: at(-6, '08:02'), kind: 'newsletter' },
		{ fromName: 'Jordan Lee', fromAddr: 'jordan@mailmoss.test', subject: 'Movie this weekend?', body: "Want to catch something Sunday? I'm free after noon. Not a horror person though.", sentAt: at(-2, '21:40'), kind: 'personal' },
		{ fromName: 'Lumiscope Cinemas', fromAddr: 'no-reply@lumiscope.test', subject: 'Members save on Tuesdays', body: '$7 tickets every Tuesday for Lumiscope members.', sentAt: at(-3, '10:00'), kind: 'newsletter' },
		{ fromName: 'Kestrel Bay Transit', fromAddr: 'alerts@kestrelbaytransit.test', subject: 'Weekend service change: Line 2', body: 'Line 2 trains run every 20 minutes this weekend.', sentAt: at(-1, '17:15'), kind: 'newsletter' },
		{ fromName: 'Priya Natarajan', fromAddr: 'priya@mailmoss.test', subject: 'Re: dinner', body: 'Saturday works! 6 PM at the usual place?', sentAt: at(-1, '12:31'), kind: 'personal' }
	];
	db.insert(messages).values(mail.map((m) => ({ ...m, toAddr: OWNER.email, data: {}, read: m.kind !== 'personal' }))).run();
}

