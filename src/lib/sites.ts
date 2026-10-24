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
	showlark: {
		id: 'showlark',
		family: 'tickets',
		kind: 'aggregator',
		name: 'Showlark',
		tagline: 'Showtimes and tickets at theaters near you',
		skin: {
			vars: { '--brand': '#e8590c', '--brand-ink': '#ffffff', '--bg': '#fff8f3', '--surface': '#ffffff', '--ink': '#1f1300', '--muted': '#7a6656', '--radius': '10px', ...font('ui-sans-serif, system-ui, sans-serif') },
			words: { buy: 'Get tickets', continue: 'Continue', purchase: 'Complete purchase', findTheater: 'Find a theater', nowPlaying: 'Now playing' }
		}
	},
	lumiscope: {
		id: 'lumiscope',
		family: 'tickets',
		kind: 'chain',
		name: 'Lumiscope Cinemas',
		tagline: 'Big screens. Bigger nights.',
		skin: {
			vars: { '--brand': '#b0001e', '--brand-ink': '#ffffff', '--bg': '#0f0f12', '--surface': '#1b1b21', '--ink': '#f4f4f6', '--muted': '#a0a0ab', '--radius': '4px', ...font('"Helvetica Neue", Arial, sans-serif') },
			words: { buy: 'Buy tickets', continue: 'Continue to checkout', purchase: 'Place order', findTheater: 'Find your theatre', nowPlaying: 'Now showing', seatsHeading: 'Choose your seats', screen: 'Screen' },
			layout: { header: 'bar', showtimes: 'grid', screen: 'top' }
		}
	},
	orbelle: {
		id: 'orbelle',
		family: 'tickets',
		kind: 'chain',
		name: 'Orbelle Theatres',
		tagline: 'Movies, made an occasion.',
		skin: {
			vars: { '--brand': '#1d3fa6', '--brand-ink': '#ffffff', '--bg': '#f3f5fb', '--surface': '#ffffff', '--ink': '#0d1530', '--muted': '#5b6584', '--radius': '14px', ...font('Georgia, "Times New Roman", serif') },
			words: { buy: 'Tickets', continue: 'Next', purchase: 'Pay now', findTheater: 'Theatres near you', nowPlaying: 'In theatres', seatsHeading: 'Select seats', screen: 'Screen this way' },
			layout: { header: 'centered', showtimes: 'list', screen: 'top' }
		}
	},
	brightreel: {
		id: 'brightreel',
		family: 'tickets',
		kind: 'chain',
		name: 'Brightreel Cinema',
		tagline: 'Your seat is waiting.',
		skin: {
			vars: { '--brand': '#0f7b6c', '--brand-ink': '#ffffff', '--bg': '#f6fbfa', '--surface': '#ffffff', '--ink': '#06231f', '--muted': '#4f6b67', '--radius': '999px', ...font('Verdana, Geneva, sans-serif') },
			words: { buy: 'Showtimes & tickets', continue: 'Review order', purchase: 'Confirm and pay', findTheater: 'Pick a location', nowPlaying: 'Playing now', seatsHeading: 'Pick your seats', screen: 'SCREEN' },
			// The screen drawn at the bottom: row A is still nearest the screen, so it's the bottom row.
			layout: { header: 'bar', showtimes: 'grid', screen: 'bottom' }
		}
	},
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
