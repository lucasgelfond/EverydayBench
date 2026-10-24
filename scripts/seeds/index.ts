// Every family's seeder, in order (later ones may read what earlier ones made).
import { seedMail } from './mail.ts';
import { seedTickets } from './tickets.ts';
import { seedOwlbox } from './owlbox.ts';
import { seedTallypay } from './tallypay.ts';

export const SEEDERS = [seedMail, seedTickets, seedOwlbox, seedTallypay];
