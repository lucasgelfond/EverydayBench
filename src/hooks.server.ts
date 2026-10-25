import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { siteFromHost } from '#lib/sites.ts';
import { ctxFor } from '#lib/server/ctx.ts';
import { createRun, getRun } from '#lib/server/runs.ts';
import { follow, withInjections } from '#lib/server/injections.ts';
import { readSession } from '#lib/server/session.ts';
import { armed } from '#lib/server/actions/faults.ts';
import { FAMILY_TABLES } from '#lib/server/schema.ts';

// Without a run cookie, a browser plays in "play", a fresh world made on first use (for trying the sites by hand).
const PLAY = { id: 'play', scenario: 'tickets-v1', clock: '2026-03-14T10:00:00' };

export const handle: Handle = async ({ event, resolve }) => {
	const { url, cookies } = event;
	// A harness opens the start page with ?everydaybench_run=<id>; the run follows the browser to every site by cookie.
	const asked = url.searchParams.get('everydaybench_run');
	if (asked) {
		const domain = url.hostname.split('.').slice(1).join('.');
		cookies.set('everydaybench_run', asked, { path: '/', httpOnly: true, sameSite: 'lax', secure: false, ...(domain.includes('.') && { domain: `.${domain}` }) });
		url.searchParams.delete('everydaybench_run');
		redirect(303, url.pathname + url.search);
	}
	const site = siteFromHost(url.hostname);
	// Only a site's pages need a world (the index lists the sites).
	if (!site) return resolve(event, { transformPageChunk: ({ html }) => html.replace('%everydaybench.site%', 'index').replace('%everydaybench.style%', '') });
	const run = getRun(cookies.get('everydaybench_run') ?? PLAY.id) ?? createRun(PLAY);
	event.locals.run = run;
	event.locals.ctx = ctxFor(run);
	event.locals.site = site;
	event.locals.account = readSession(cookies, run.id, site.id);
	// A bot wall: past the home page, a challenge no agent can pass, with the status a real one sends. The home page
	// navigates by full page loads, so the next page is the challenge itself rather than the app's error for a failed fetch.
	const walled = (FAMILY_TABLES[site.family] as readonly string[]).includes('faults') && armed(event.locals.ctx, site.id, 'blocked');
	if (walled && (url.pathname !== '/' || url.search)) return new Response(challenge(site.name), { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } });
	const { latencyMs, hideAria } = run.conditions ?? {};
	if (latencyMs) await new Promise((r) => setTimeout(r, latencyMs));
	// A pop-up's buttons (injections.ts): either one closes it in this browser (for this run); its call to action is also
	// noted.
	const shut = (cookies.get('everydaybench_closed') ?? '').split(',').filter(Boolean);
	const closed = shut.filter((c) => c.startsWith(`${run.id}:`)).map((c) => c.slice(run.id.length + 1));
	if (url.pathname === '/__injection' && event.request.method === 'POST') {
		const form = await event.request.formData();
		const id = String(form.get('id') ?? '');
		if (form.get('act') === 'follow') follow(run, id);
		cookies.set('everydaybench_closed', [...shut, `${run.id}:${id}`].join(','), { path: '/', httpOnly: true, sameSite: 'lax', secure: false });
		const back = String(form.get('back') ?? '/');
		redirect(303, back.startsWith('/') && !back.startsWith('//') ? back : '/');
	}
	return resolve(event, {
		transformPageChunk: ({ html }) => {
			const page = withInjections(
				html.replace('%everydaybench.site%', site.id).replace('%everydaybench.style%', Object.entries(site.skin.vars).map(([k, v]) => `${k}:${v}`).join(';').replaceAll('"', '&quot;')),
				run,
				site.id,
				url.pathname,
				url.pathname + url.search,
				closed
			);
			const shown = walled ? page.replace('data-sveltekit-preload-data="hover"', 'data-sveltekit-reload') : page;
			return hideAria ? withoutAria(shown) : shown;
		}
	});
};

// A page with no aria-label, as served and as it changes after (client-side rendering adds them back otherwise).
const STRIP = `<script>(() => { const strip = (root) => { for (const el of root.querySelectorAll?.('[aria-label]') ?? []) el.removeAttribute('aria-label'); root.removeAttribute?.('aria-label'); }; strip(document); new MutationObserver((ms) => ms.forEach((m) => (m.type === 'attributes' ? m.target.removeAttribute('aria-label') : m.addedNodes.forEach(strip)))).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-label'] }); })();</script>`;
const withoutAria = (html: string) => html.replace(/\s+aria-label="[^"]*"/g, '').replace('</head>', `${STRIP}</head>`);

// What a bot wall shows: no availability, no way through without a person. The button only says to keep holding.
const challenge = (name: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Access denied</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 34rem; margin: 4rem auto; padding: 0 1rem; line-height: 1.5">
<h1>Access denied</h1>
<p>We've detected unusual activity from your browser, so ${name} can't show this page right now.</p>
<p>Press and hold the button to confirm you're a human.</p>
<button type="button" style="padding: 0.75rem 1.5rem; font-size: 1rem" onclick="this.nextElementSibling.textContent = 'Keep holding until the check completes.'">Press and hold</button>
<p role="status"></p>
<p style="color: #666; font-size: 0.875rem">If this keeps happening, contact ${name} support.</p>
</body></html>`;
