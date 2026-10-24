// Every family's seeder, in order (later ones may read what earlier ones made).
import { seedMail } from './mail.ts';

export const SEEDERS = [seedMail];
