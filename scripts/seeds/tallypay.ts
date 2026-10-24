// Tallypay's seed data: the owner's Express card, unlocked by a code to their inbox.

import { express } from '../../src/lib/server/schema.ts';
import { OWNER } from '../../src/lib/server/ctx.ts';
import type { Make } from '../seed.ts';

export const seedTallypay = (make: Make) => void make('tallypay').insert(express).values({ email: OWNER.email, brand: 'Mastercard', last4: '4444', expMonth: 11, expYear: 2029 }).run();
