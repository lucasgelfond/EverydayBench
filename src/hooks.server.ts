import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { siteFromHost } from '#lib/sites.ts';
import { ctxFor } from '#lib/server/ctx.ts';
import { createRun, getRun } from '#lib/server/runs.ts';
import { readSession } from '#lib/server/session.ts';

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
	const { latencyMs, hideAria } = run.conditions ?? {};
	if (latencyMs) await new Promise((r) => setTimeout(r, latencyMs));
	return resolve(event, {
		transformPageChunk: ({ html }) => {
			const page = html.replace('%everydaybench.site%', site.id).replace('%everydaybench.style%', Object.entries(site.skin.vars).map(([k, v]) => `${k}:${v}`).join(';').replaceAll('"', '&quot;'));
			return hideAria ? withoutAria(page) : page;
		}
	});
};

// A page with no aria-label, as served and as it changes after (client-side rendering adds them back otherwise).
const STRIP = `<script>(() => { const strip = (root) => { for (const el of root.querySelectorAll?.('[aria-label]') ?? []) el.removeAttribute('aria-label'); root.removeAttribute?.('aria-label'); }; strip(document); new MutationObserver((ms) => ms.forEach((m) => (m.type === 'attributes' ? m.target.removeAttribute('aria-label') : m.addedNodes.forEach(strip)))).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-label'] }); })();</script>`;
const withoutAria = (html: string) => html.replace(/\s+aria-label="[^"]*"/g, '').replace('</head>', `${STRIP}</head>`);
