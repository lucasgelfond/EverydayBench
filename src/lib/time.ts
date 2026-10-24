// Times in EverydayBench are local wall-clock times without a zone ("2026-03-14T19:10:00"): what sites show and tasks name. The
// arithmetic treats them as UTC so no machine's zone ever shifts them.

export const toMs = (local: string) => Date.parse(`${local.slice(0, 19)}Z`);
export const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 19);
export const addMinutes = (local: string, minutes: number) => fromMs(toMs(local) + minutes * 60_000);
export const day = (local: string) => local.slice(0, 10);
export const addDays = (date: string, days: number) => fromMs(toMs(`${date}T00:00:00`) + days * 86_400_000).slice(0, 10);

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const at = (local: string) => new Date(toMs(local));

// "7:10 PM"
export function clock(local: string) {
	const d = at(local);
	const h = d.getUTCHours();
	return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

// "Saturday, March 14"
export const longDate = (date: string) => {
	const d = at(`${date}T00:00:00`);
	return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

// "Sat 14"
export const shortDate = (date: string) => {
	const d = at(`${date}T00:00:00`);
	return `${WEEKDAYS[d.getUTCDay()]!.slice(0, 3)} ${d.getUTCDate()}`;
};

export const weekday = (date: string) => WEEKDAYS[at(`${date}T00:00:00`).getUTCDay()]!;

export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// Seats in the order a person reads them: by row, then number (G9 before G10).
export const bySeat = (a: string, b: string) => a[0]!.localeCompare(b[0]!) || Number(a.slice(1)) - Number(b.slice(1));
