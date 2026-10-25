// Hard controls: the widgets real sites use in place of plain form controls, on a site whose skin asks for them (a hard
// twin, sites.ts). The script (hard-controls.client.js) swaps them in the browser; the forms submit the same fields, so
// the twin's tasks run the same actions and grade the same way as its sibling's.
import script from './hard-controls.client.js?raw';

export const HARD_CONTROLS = [
	// <select>s become a button and a short scrolling list that only exists while it's open.
	'select',
	// Dates are picked from a calendar a month at a time (no typing), times from a 15-minute list.
	'date',
	// Numbers take − and + (a short range) or a slider (an open one, like a price cap).
	'number',
	// Purchases, bookings, sends and cancels take a slide to confirm; the button alone does nothing.
	'slide',
	// Common buttons show only an icon (their name stays for screen readers, and in a tooltip).
	'icons',
	// A notice loads late and pushes the page down.
	'shift',
	// Card number, expiry and security code are typed in frames, like hosted payment fields.
	'iframe'
] as const;
export type HardControl = (typeof HARD_CONTROLS)[number];

// The page with the script, set up for the run (its variants, and "today" for where a calendar opens).
export function withHardControls(html: string, on: readonly HardControl[], today: string) {
	const config = JSON.stringify({ on, today }).replaceAll('"', '&quot;');
	return html.replace('</head>', `<script data-config="${config}">${script}</script></head>`);
}
