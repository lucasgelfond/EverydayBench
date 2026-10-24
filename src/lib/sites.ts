// Every site EverydayBench serves, by the hostname's first label (lumiscope.everydaybench.test -> lumiscope). A site is a family (its
// routes, data and actions) plus a skin: name, look and wording. Sibling sites in a family share every step and click;
// only the skin differs, so a task can be run on each to separate "can't do the flow" from "can't read this layout".

export type Family = 'tickets' | 'mail' | 'pay';

export interface Skin {
	// CSS custom properties on <html>: --brand, --brand-ink, --bg, --surface, --ink, --muted, --radius, --font.
	vars: Record<string, string>;
	// Wording that differs between siblings ("Get tickets" vs "Buy tickets").
	words: Partial<Record<Word, string>>;
	// Layout variants with the same controls and click count.
	layout?: { header?: 'bar' | 'centered'; showtimes?: 'grid' | 'list'; screen?: 'top' | 'bottom' };
}

export type Word =
	| 'buy'
	| 'continue'
	| 'purchase'
	| 'signIn'
	| 'findTheater'
	| 'nowPlaying'
	| 'seatsHeading'
	| 'screen';

export interface Site {
	id: string;
	family: Family;
	name: string;
	tagline: string;
	// Tickets only: a chain sells its own theaters' seats; an aggregator sells several chains'; an arthouse sells
	// general admission through a hosted checkout.
	kind?: 'chain' | 'aggregator' | 'arthouse';
	skin: Skin;
}

const font = (stack: string) => ({ '--font': stack });

export const SITES: Record<string, Site> = {
	mailmoss: {
		id: 'mailmoss',
		family: 'mail',
		name: 'Mailmoss',
		tagline: 'Mail',
		skin: { vars: { '--brand': '#2563eb', '--brand-ink': '#ffffff', '--bg': '#f7f8fa', '--surface': '#ffffff', '--ink': '#111827', '--muted': '#6b7280', '--radius': '8px', ...font('ui-sans-serif, system-ui, sans-serif') }, words: {} }
	}
};

const DEFAULT_WORDS: Record<Word, string> = {
	buy: 'Buy tickets',
	continue: 'Continue',
	purchase: 'Purchase',
	signIn: 'Sign in',
	findTheater: 'Find a theater',
	nowPlaying: 'Now playing',
	seatsHeading: 'Select your seats',
	screen: 'Screen'
};

export const word = (site: Site, w: Word) => site.skin.words[w] ?? DEFAULT_WORDS[w];

// The site a hostname names: its first label, if that's a site.
export const siteFromHost = (host: string): Site | undefined => SITES[host.split('.')[0]?.toLowerCase() ?? ''];

// The base domain sites live under; *.everydaybench.test by default (point it at the server with a hosts entry or Chromium's
// --host-resolver-rules).
export const DOMAIN = 'everydaybench.test';
