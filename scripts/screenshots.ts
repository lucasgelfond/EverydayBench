// Screenshots of every site for the README (public/screenshots/), from a fresh run, against a running server.
//   pnpm dev (or pnpm start), then: node scripts/screenshots.ts [name prefix…] (only those, e.g. "gridwhistle")
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createRun, deleteRun } from '../src/lib/server/runs.ts';
import { ORIGIN, ctxFor } from '../src/lib/server/ctx.ts';
import { purchase } from '../src/lib/server/actions/tickets.ts';
import { startCheckout } from '../src/lib/server/actions/pay.ts';

const OUT = 'public/screenshots';
mkdirSync(OUT, { recursive: true });
const run = createRun({ scenario: 'tickets-v1', clock: '2026-03-14T10:00:00', id: 'screenshots' });
const ctx = ctxFor(run);
// Something in the inbox, and a checkout to show.
purchase(ctx, { site: 'showlark', venue: 'orbelle', showtime: 'orbelle-eastgate-last-lighthouse-20260315-1315', seats: ['F7', 'F8'], email: 'sam@mailmoss.test', account: 1, payment: { kind: 'saved', card: 1 } });
const pay = startCheckout(ctx, { merchant: 'owlbox', showtime: 'owlbox-pinewood-20260315-1915', quantity: 2, email: 'sam@mailmoss.test' });
const at = (site: string, path: string) => `${ORIGIN.replace('{site}', site)}${path}`;
const shots: [string, string][] = [
	['showlark-home', at('showlark', '/')],
	['showlark-movie', at('showlark', '/movies/pinewood?date=2026-03-15')],
	['lumiscope-theater', at('lumiscope', '/theaters/lumiscope-harborview?date=2026-03-15')],
	['lumiscope-seats', at('lumiscope', '/showtimes/lumiscope-harborview-last-lighthouse-20260315-1845?seats=E13,E14')],
	['lumiscope-checkout', at('lumiscope', '/checkout?showtime=lumiscope-harborview-last-lighthouse-20260315-1845&seats=E13,E14')],
	['orbelle-theater', at('orbelle', '/theaters/orbelle-eastgate?date=2026-03-15')],
	['brightreel-seats', at('brightreel', '/showtimes/brightreel-harbor-last-lighthouse-20260315-1845')],
	['owlbox', at('owlbox', '/theaters/owlbox?date=2026-03-15')],
	['tallypay', pay.ok ? pay.url : at('tallypay', '/')],
	['mailmoss', at('mailmoss', '/')],
	['skyhollow-flights', at('skyhollow', '/flights?trip=one&from=IND&to=EWR&date=2026-03-20')],
	['larkspan-flights', at('larkspan', '/flights?trip=one&from=AUS&to=PIT&date=2026-03-21')],
	['skyhollow-seats', at('skyhollow', '/book/seats?out=skyhollow-sh226-20260319.economy&s0=9F')],
	['kettlewick-search', at('kettlewick', '/search?q=headphones')],
	['parcelpine-product', at('parcelpine', '/p/dutch-oven')],
	['forkfly-home', at('forkfly', '/')],
	['forkfly-restaurant', at('forkfly', '/r/ember-rotisserie')],
	['tablenook-home', at('tablenook', '/')],
	['tablenook-search', at('tablenook', '/search?date=2026-03-20&time=21:00&party=6&area=Midtown')],
	['seatwell-search', at('seatwell', '/search?date=2026-03-14&time=19:00&party=2&area=Riverside')],
	['vellutina-reserve', at('vellutina', '/reserve?party=5&date=2026-03-19')],
	['mailmoss-contacts', at('mailmoss', '/contacts')],
	['daybrella', at('daybrella', '/')],
	['roostable-search', at('roostable', '/?city=Port+Alder&checkIn=2026-04-01&checkOut=2026-04-06&guests=4&bedrooms=2')],
	['roostable-home', at('roostable', '/homes/kestrel-bay-6?checkIn=2026-03-20&checkOut=2026-03-22&guests=2')],
	['nookery-book', at('nookery', '/book?home=nookery-kb-1&checkIn=2026-03-20&checkOut=2026-03-22&guests=2')],
	['seatsling-checkout', at('seatsling', '/checkout?showtime=lumiscope-midtown-velocity-nine-20260315-2030&seats=G7,G8')],
	['sweatlantis-schedule', at('sweatlantis', '/schedule?location=eastgate&date=2026-03-15')],
	['gridwhistle-sheet', at('gridwhistle', '/w/apartment')],
	['thriftwell-account', at('thriftwell', '/a/visa?month=2026-02')]
];
const only = process.argv.slice(2);

const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP *.everydaybench.test 127.0.0.1'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
try {
	await page.goto(`${at('mailmoss', '/')}?everydaybench_run=${run.id}`);
	for (const [name, url] of shots.filter(([n]) => !only.length || only.some((p) => n.startsWith(p)))) {
		const res = await page.goto(url);
		if (!res?.ok()) throw new Error(`${name}: ${res?.status()} at ${url}`);
		await page.waitForLoadState('networkidle');
		await page.screenshot({ path: `${OUT}/${name}.png` });
		console.log(`${OUT}/${name}.png`);
	}
} finally {
	await browser.close();
	deleteRun(run.id);
}
