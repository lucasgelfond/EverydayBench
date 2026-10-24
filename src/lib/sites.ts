// Every site EverydayBench serves, by the hostname's first label (lumiscope.everydaybench.test -> lumiscope). A site is a family (its
// routes, data and actions) plus a skin: name, look and wording. Sibling sites in a family share every step and click;
// only the skin differs, so a task can be run on each to separate "can't do the flow" from "can't read this layout".

export type Family = 'tickets' | 'mail' | 'pay' | 'airline' | 'shop' | 'dining' | 'calendar' | 'lodging' | 'gym' | 'cloud' | 'gov' | 'portal';

export interface Skin {
	// CSS custom properties on <html>: --brand, --brand-ink, --bg, --surface, --ink, --muted, --radius, --font.
	vars: Record<string, string>;
	// Wording that differs between siblings ("Get tickets" vs "Buy tickets").
	words: Partial<Record<Word, string>>;
	// Layout variants with the same controls and click count.
	layout?: { header?: 'bar' | 'centered'; showtimes?: 'grid' | 'list'; screen?: 'top' | 'bottom'; flights?: 'cards' | 'table'; catalog?: 'grid' | 'list'; results?: 'grid' | 'list' };
}

export type Word =
	| 'buy'
	| 'continue'
	| 'purchase'
	| 'signIn'
	| 'findTheater'
	| 'nowPlaying'
	| 'seatsHeading'
	| 'screen'
	| 'addToCart'
	| 'cart'
	| 'checkout'
	| 'placeOrder'
	| 'findTable'
	| 'reserve';

export interface Site {
	id: string;
	family: Family;
	name: string;
	tagline: string;
	// Tickets: a chain sells its own theaters' seats; an aggregator sells several chains'; an arthouse sells general
	// admission through a hosted checkout. Shop: a store ships its own catalog; a delivery app sells restaurants' menus.
	// Dining: a reservations site lists many restaurants; a restaurant takes its own bookings on its own site.
	kind?: 'chain' | 'aggregator' | 'arthouse' | 'store' | 'delivery' | 'reservations' | 'restaurant';
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
	owlbox: {
		id: 'owlbox',
		family: 'tickets',
		kind: 'arthouse',
		name: 'The Owlbox',
		tagline: 'Independent, repertory and first-run cinema since 1971.',
		skin: {
			vars: { '--brand': '#3b2f2f', '--brand-ink': '#f6efe3', '--bg': '#f6efe3', '--surface': '#fffaf1', '--ink': '#2a2020', '--muted': '#7d6b5d', '--radius': '0px', ...font('"Iowan Old Style", Palatino, Georgia, serif') },
			words: { buy: 'Tickets', continue: 'Checkout', nowPlaying: 'This week' }
		}
	},
	mailmoss: {
		id: 'mailmoss',
		family: 'mail',
		name: 'Mailmoss',
		tagline: 'Mail',
		skin: { vars: { '--brand': '#2563eb', '--brand-ink': '#ffffff', '--bg': '#f7f8fa', '--surface': '#ffffff', '--ink': '#111827', '--muted': '#6b7280', '--radius': '8px', ...font('ui-sans-serif, system-ui, sans-serif') }, words: {} }
	},
	tallypay: {
		id: 'tallypay',
		family: 'pay',
		name: 'Tallypay',
		tagline: 'Secure checkout',
		skin: { vars: { '--brand': '#5b4cdb', '--brand-ink': '#ffffff', '--bg': '#f6f7fb', '--surface': '#ffffff', '--ink': '#1a1b25', '--muted': '#697386', '--radius': '6px', ...font('ui-sans-serif, system-ui, sans-serif') }, words: {} }
	},
	skyhollow: {
		id: 'skyhollow',
		family: 'airline',
		name: 'Skyhollow Air',
		tagline: 'Fly the quiet way.',
		skin: {
			vars: { '--brand': '#0e5e6f', '--brand-ink': '#ffffff', '--bg': '#f2f7f8', '--surface': '#ffffff', '--ink': '#0b2a31', '--muted': '#5a7279', '--radius': '12px', ...font('ui-sans-serif, system-ui, sans-serif') },
			words: { continue: 'Continue', purchase: 'Purchase trip', signIn: 'Sign in' },
			layout: { header: 'bar', flights: 'cards' }
		}
	},
	larkspan: {
		id: 'larkspan',
		family: 'airline',
		name: 'Larkspan Airways',
		tagline: 'Wherever the day takes you.',
		skin: {
			vars: { '--brand': '#6b2a7d', '--brand-ink': '#fdf7ff', '--bg': '#faf7fb', '--surface': '#ffffff', '--ink': '#24112b', '--muted': '#76627d', '--radius': '3px', ...font('"Trebuchet MS", "Segoe UI", sans-serif') },
			words: { continue: 'Next', purchase: 'Book and pay', signIn: 'Log in' },
			layout: { header: 'centered', flights: 'table' }
		}
	},
	kettlewick: {
		id: 'kettlewick',
		family: 'shop',
		kind: 'store',
		name: 'Kettlewick',
		tagline: 'Everything for home, shipped fast.',
		skin: {
			vars: { '--brand': '#232f3e', '--brand-ink': '#ffffff', '--bg': '#eaeded', '--surface': '#ffffff', '--ink': '#0f1111', '--muted': '#565959', '--radius': '8px', ...font('Arial, "Helvetica Neue", sans-serif') },
			words: { addToCart: 'Add to Cart', cart: 'Cart', checkout: 'Proceed to checkout', placeOrder: 'Place your order' },
			layout: { header: 'bar', catalog: 'grid' }
		}
	},
	parcelpine: {
		id: 'parcelpine',
		family: 'shop',
		kind: 'store',
		name: 'Parcelpine',
		tagline: 'Good things for the home, delivered.',
		skin: {
			vars: { '--brand': '#2f6b3b', '--brand-ink': '#ffffff', '--bg': '#fbf8f1', '--surface': '#ffffff', '--ink': '#1d2a1f', '--muted': '#5f6e60', '--radius': '2px', ...font('Georgia, "Times New Roman", serif') },
			words: { addToCart: 'Add to bag', cart: 'Bag', checkout: 'Check out', placeOrder: 'Complete order' },
			layout: { header: 'centered', catalog: 'list' }
		}
	},
	forkfly: {
		id: 'forkfly',
		family: 'shop',
		kind: 'delivery',
		name: 'Forkfly',
		tagline: 'Food from local spots, at your door.',
		skin: {
			vars: { '--brand': '#e2372b', '--brand-ink': '#ffffff', '--bg': '#ffffff', '--surface': '#ffffff', '--ink': '#191919', '--muted': '#6b6b6b', '--radius': '999px', ...font('ui-sans-serif, system-ui, sans-serif') },
			words: { addToCart: 'Add to order', cart: 'Your order', checkout: 'Go to checkout', placeOrder: 'Place order' }
		}
	},
	tablenook: {
		id: 'tablenook',
		family: 'dining',
		kind: 'reservations',
		name: 'Tablenook',
		tagline: 'Book a table at the best spots in town',
		skin: {
			vars: { '--brand': '#c2410c', '--brand-ink': '#ffffff', '--bg': '#fffaf5', '--surface': '#ffffff', '--ink': '#1c1208', '--muted': '#7c6a5a', '--radius': '8px', ...font('ui-sans-serif, system-ui, sans-serif') },
			words: { findTable: "Let's go", reserve: 'Complete reservation' },
			layout: { header: 'bar', results: 'list' }
		}
	},
	seatwell: {
		id: 'seatwell',
		family: 'dining',
		kind: 'reservations',
		name: 'Seatwell',
		tagline: 'Tables tonight, and every night.',
		skin: {
			vars: { '--brand': '#14532d', '--brand-ink': '#f0fdf4', '--bg': '#f4f7f2', '--surface': '#ffffff', '--ink': '#0b1f12', '--muted': '#55705d', '--radius': '18px', ...font('Georgia, "Times New Roman", serif') },
			words: { findTable: 'Find a table', reserve: 'Book it' },
			layout: { header: 'centered', results: 'grid' }
		}
	},
	vellutina: {
		id: 'vellutina',
		family: 'dining',
		kind: 'restaurant',
		name: 'Osteria Vellutina',
		tagline: 'Handmade pasta and wood-fired plates in Old Mill.',
		skin: {
			vars: { '--brand': '#7f1d1d', '--brand-ink': '#fef3c7', '--bg': '#fdf8ee', '--surface': '#fffdf7', '--ink': '#2b1a12', '--muted': '#7a6450', '--radius': '2px', ...font('"Iowan Old Style", Palatino, Georgia, serif') },
			words: { reserve: 'Confirm reservation' }
		}
	},
	daybrella: {
		id: 'daybrella',
		family: 'calendar',
		name: 'Daybrella',
		tagline: 'Calendar',
		skin: { vars: { '--brand': '#0b8a5f', '--brand-ink': '#ffffff', '--bg': '#f5f8f6', '--surface': '#ffffff', '--ink': '#13201b', '--muted': '#5f7068', '--radius': '10px', ...font('ui-sans-serif, system-ui, sans-serif') }, words: {} }
	},
	roostable: {
		id: 'roostable',
		family: 'lodging',
		name: 'Roostable',
		tagline: 'Homes to stay in, wherever you’re headed',
		skin: { vars: { '--brand': '#d9485f', '--brand-ink': '#ffffff', '--bg': '#ffffff', '--surface': '#ffffff', '--ink': '#222222', '--muted': '#717171', '--radius': '12px', ...font('ui-sans-serif, system-ui, sans-serif') }, words: {} }
	},
	sweatlantis: {
		id: 'sweatlantis',
		family: 'gym',
		name: 'Sweatlantis',
		tagline: 'Dive in. Sweat out.',
		skin: { vars: { '--brand': '#0e6ba8', '--brand-ink': '#ffffff', '--bg': '#eef6fb', '--surface': '#ffffff', '--ink': '#0a2233', '--muted': '#53708a', '--radius': '6px', ...font('"Trebuchet MS", "Helvetica Neue", sans-serif') }, words: {} }
	},
	cloudpail: {
		id: 'cloudpail',
		family: 'cloud',
		name: 'Cloudpail',
		tagline: 'Servers by the bucket',
		skin: { vars: { '--brand': '#0b6bcb', '--brand-ink': '#ffffff', '--bg': '#f4f7fb', '--surface': '#ffffff', '--ink': '#0b1b2b', '--muted': '#5f6f82', '--radius': '6px', ...font('ui-sans-serif, system-ui, sans-serif') }, words: {} }
	},
	swiftgate: {
		id: 'swiftgate',
		family: 'gov',
		name: 'Swiftgate',
		tagline: 'Kestrel Bay Office of Travel Documents',
		skin: { vars: { '--brand': '#1b365d', '--brand-ink': '#ffffff', '--bg': '#ffffff', '--surface': '#ffffff', '--ink': '#1b1b1b', '--muted': '#565c65', '--radius': '2px', ...font('"Source Sans Pro", "Helvetica Neue", Arial, sans-serif') }, words: {} }
	},
	fernwick: {
		id: 'fernwick',
		family: 'portal',
		name: 'Fernwick Residents',
		tagline: 'The Fernwick, 210 Larch St',
		skin: { vars: { '--brand': '#3f6b4f', '--brand-ink': '#ffffff', '--bg': '#f5f4ef', '--surface': '#ffffff', '--ink': '#1f2a22', '--muted': '#68736b', '--radius': '10px', ...font('ui-sans-serif, system-ui, sans-serif') }, words: {} }
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
	screen: 'Screen',
	addToCart: 'Add to cart',
	cart: 'Cart',
	checkout: 'Checkout',
	placeOrder: 'Place order',
	findTable: 'Find a table',
	reserve: 'Reserve'
};

export const word = (site: Site, w: Word) => site.skin.words[w] ?? DEFAULT_WORDS[w];

// The site a hostname names: its first label, if that's a site.
export const siteFromHost = (host: string): Site | undefined => SITES[host.split('.')[0]?.toLowerCase() ?? ''];

// The base domain sites live under; *.everydaybench.test by default (point it at the server with a hosts entry or Chromium's
// --host-resolver-rules).
export const DOMAIN = 'everydaybench.test';
