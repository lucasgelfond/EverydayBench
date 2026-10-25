// Airlines: what both the server and the pages need. Every flight is the same aircraft, so a seat ("12A") means the same
// place on any of them: Business in rows 1-3 (two and two), Premium Economy in 4-7 and Economy from 8 (three and
// three), exits at rows 14 and 15. A and F are windows, C and D aisles, B and E middles.

export const AIRPORTS: Record<string, string> = {
	AUS: 'Austin',
	BOI: 'Boise',
	BOS: 'Boston',
	DEN: 'Denver',
	EWR: 'Newark',
	IND: 'Indianapolis',
	JAX: 'Jacksonville',
	MCO: 'Orlando',
	MKE: 'Milwaukee',
	ORD: 'Chicago O’Hare',
	PIT: 'Pittsburgh',
	PVD: 'Providence',
	SEA: 'Seattle',
	SFO: 'San Francisco'
};

export const airport = (code: string) => `${AIRPORTS[code] ?? code} (${code})`;

export type Fare = 'basic' | 'economy' | 'premium' | 'business';
export const FARES: { id: Fare; name: string; note: string }[] = [
	{ id: 'basic', name: 'Basic Economy', note: 'Seat assigned at check-in, or choose one for a fee' },
	{ id: 'economy', name: 'Economy', note: 'Choose your seat free' },
	{ id: 'premium', name: 'Premium Economy', note: 'Extra legroom, rows 4-7' },
	{ id: 'business', name: 'Business', note: 'Lie-flat seats, rows 1-3' }
];
export const fareName = (f: string) => FARES.find((x) => x.id === f)?.name ?? f;
export const isFare = (f: string): f is Fare => FARES.some((x) => x.id === f);

export type Cabin = { id: 'business' | 'premium' | 'economy'; name: string; first: number; last: number; letters: string };
export const CABINS: Cabin[] = [
	{ id: 'business', name: 'Business', first: 1, last: 3, letters: 'ACDF' },
	{ id: 'premium', name: 'Premium Economy', first: 4, last: 7, letters: 'ABCDEF' },
	{ id: 'economy', name: 'Economy', first: 8, last: 30, letters: 'ABCDEF' }
];
export const EXIT_ROWS = [14, 15];

// Basic Economy and Economy sit in the Economy cabin.
export const cabinOf = (fare: Fare) => CABINS.find((c) => c.id === (fare === 'basic' ? 'economy' : fare))!;

export const parseSeat = (seat: string) => {
	const m = /^(\d{1,2})([A-F])$/.exec(seat);
	return m ? { row: Number(m[1]), letter: m[2]! } : undefined;
};

export const inCabin = (cabin: Cabin, seat: string) => {
	const s = parseSeat(seat);
	return !!s && s.row >= cabin.first && s.row <= cabin.last && cabin.letters.includes(s.letter);
};

export type SeatKind = 'window' | 'aisle' | 'middle';
export const seatKind = (seat: string): SeatKind => {
	const l = seat.slice(-1);
	return l === 'A' || l === 'F' ? 'window' : l === 'C' || l === 'D' ? 'aisle' : 'middle';
};

// Choosing a seat when booking Basic Economy costs this; other fares choose free.
export const BASIC_SEAT_FEE = 2500;
// At check-in, a seat for someone who has none: middle seats are free, the rest are "preferred".
export const PREFERRED_SEAT_FEE = 3900;
export const bookingSeatFee = (fare: Fare) => (fare === 'basic' ? BASIC_SEAT_FEE : 0);
export const checkinSeatFee = (seat: string) => (seatKind(seat) === 'middle' ? 0 : PREFERRED_SEAT_FEE);

// Check-in opens a day before departure and closes 45 minutes before.
export const CHECKIN_OPENS_HOURS = 24;
export const CHECKIN_CLOSES_MINUTES = 45;

// "2h 35m"
export const duration = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;

// A leg as the booking pages carry it in the URL: "<flight id>.<fare>".
export const parseLeg = (v: string | null) => {
	const [flight, fare] = (v ?? '').split('.');
	return flight && fare && isFare(fare) ? { flight, fare } : undefined;
};

// Premium Economy and Business refund to the card; Basic and Economy don't, but can be canceled for travel credit,
// good for a year.
export const refundable = (fares: Fare[]) => fares.every((f) => f === 'premium' || f === 'business');
export const CREDIT_MONTHS = 12;

// The support chat's choices: what it helps with (only Wi-Fi, for now) and what went wrong with it.
export const CHAT_TOPICS = { wifi: 'Wi-Fi or entertainment', bags: 'Bags', change: 'Changing a trip' } as const;
export const WIFI_PROBLEMS = { never: 'I paid for Wi-Fi and it never connected', slow: 'It was too slow to use', twice: 'I was charged twice' } as const;
export type WifiProblem = keyof typeof WIFI_PROBLEMS;

// "(617) 555-0143" from any way of writing a US number, or undefined.
export function phoneNumber(v: string) {
	const d = v.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
	return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : undefined;
}
