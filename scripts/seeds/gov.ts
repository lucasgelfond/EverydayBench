// Swiftgate: the owner hasn't applied for anything yet; their current passport is on record.

import { passports } from '../../src/lib/server/schema.ts';
import type { Make } from '../seed.ts';

export const seedGov = (make: Make) => void make('swiftgate').insert(passports).values({ number: 'K48213977', fullName: 'Sam Rivera', dateOfBirth: '1991-06-12', issuedOn: '2016-05-03' }).run();
