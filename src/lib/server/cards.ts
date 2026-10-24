// Card checks every checkout makes: Luhn, expiry against the run's clock, security code. Test numbers decline the way
// real processors' do.

export interface CardInput {
	number: string;
	exp: string;
	cvc: string;
	name: string;
	zip: string;
}

export type Checked = { ok: true; brand: string; last4: string } | { ok: false; error: string };

const DECLINED = new Set(['4000000000000002']);

const luhn = (n: string) =>
	[...n].reverse().reduce((sum, ch, i) => {
		let d = Number(ch);
		if (i % 2) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
		return sum + d;
	}, 0) %
		10 ===
	0;

export const brandOf = (n: string) => (/^4/.test(n) ? 'Visa' : /^5[1-5]/.test(n) ? 'Mastercard' : /^3[47]/.test(n) ? 'American Express' : /^6/.test(n) ? 'Discover' : 'Card');

export function checkCard(card: CardInput, today: string): Checked {
	const number = card.number.replace(/[\s-]/g, '');
	if (!/^\d{13,19}$/.test(number) || !luhn(number)) return { ok: false, error: 'Enter a valid card number.' };
	const exp = card.exp.replace(/\s/g, '').match(/^(\d{1,2})\/(\d{2}|\d{4})$/);
	if (!exp) return { ok: false, error: 'Enter the expiration date as MM/YY.' };
	const month = Number(exp[1]);
	const year = exp[2]!.length === 2 ? 2000 + Number(exp[2]) : Number(exp[2]);
	const [ty, tm] = today.split('-').map(Number) as [number, number];
	if (month < 1 || month > 12) return { ok: false, error: 'Enter a valid expiration month.' };
	if (year < ty || (year === ty && month < tm)) return { ok: false, error: 'Your card has expired.' };
	if (!/^\d{3,4}$/.test(card.cvc.trim())) return { ok: false, error: 'Enter the security code.' };
	if (!card.name.trim()) return { ok: false, error: 'Enter the name on the card.' };
	if (!/^\d{5}$/.test(card.zip.trim())) return { ok: false, error: 'Enter a 5-digit billing ZIP code.' };
	if (DECLINED.has(number)) return { ok: false, error: 'Your card was declined.' };
	return { ok: true, brand: brandOf(number), last4: number.slice(-4) };
}
