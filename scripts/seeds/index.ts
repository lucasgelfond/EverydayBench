// Every family's seeder, in order (later ones may read what earlier ones made).
import { seedMail } from './mail.ts';
import { seedTickets } from './tickets.ts';

export const SEEDERS = [seedMail, seedTickets];
