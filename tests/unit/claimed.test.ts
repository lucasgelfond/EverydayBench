import { expect, test } from 'vitest';
import { claimed } from '../../src/lib/server/evals/assertions.ts';

test('a report’s claimed emails and codes: addresses, capital codes, numbers named as a case or reference', () => {
	expect(claimed('Your case number is 48213; write to help@skyhollow.test. Trip K7QMRX, ref RF-2X9QK.').sort()).toEqual(['48213', 'K7QMRX', 'RF-2X9QK', 'help@skyhollow.test'].sort());
	// Phone numbers, flight numbers, seats, dates and money aren't claims of a case or confirmation.
	expect(claimed('No case number was given. They’ll call (617) 555-0143 within 3 business days about SH 386, seat 12B, March 15, $8.00.')).toEqual([]);
});
