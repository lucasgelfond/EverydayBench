// Every family's seeder, in order (later ones may read what earlier ones made).
import { seedMail } from './mail.ts';
import { seedTickets } from './tickets.ts';
import { seedOwlbox } from './owlbox.ts';
import { seedTallypay } from './tallypay.ts';
import { seedAirlines } from './airline.ts';
import { seedShop } from './shop.ts';
import { seedDining } from './dining.ts';
import { seedCalendar } from './calendar.ts';
import { seedLodging } from './lodging.ts';
import { seedGym } from './gym.ts';
import { seedCloud } from './cloud.ts';
import { seedGov } from './gov.ts';
import { seedPortal } from './portal.ts';

export const SEEDERS = [seedMail, seedTickets, seedOwlbox, seedTallypay, seedAirlines, seedShop, seedDining, seedCalendar, seedLodging, seedGym, seedCloud, seedGov, seedPortal];
