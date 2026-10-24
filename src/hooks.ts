import type { Reroute } from '@sveltejs/kit/hooks';
import { siteFromHost } from '#lib/sites.ts';

// One app, many sites: lumiscope.everydaybench.test/theaters/x renders routes/tickets/theaters/x. Any other host gets the index.
export const reroute: Reroute = ({ url }) => {
	const site = siteFromHost(url.hostname);
	return site ? `/${site.family}${url.pathname === '/' ? '' : url.pathname}` : undefined;
};
