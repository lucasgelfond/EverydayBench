// Every family's seeder, in order (later ones may read what earlier ones made). Families add theirs here.
import type { Make } from '../seed.ts';

export const SEEDERS: ((make: Make) => void)[] = [];
