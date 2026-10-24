import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { accounts } from '#lib/server/schema.ts';
import { word, type Word } from '#lib/sites.ts';
import { day } from '#lib/time.ts';

const WORDS: Word[] = ['buy', 'continue', 'purchase', 'signIn', 'findTheater', 'nowPlaying', 'seatsHeading', 'screen'];

export const load = ({ locals }) => {
	const site = locals.site;
	if (site?.family !== 'tickets') error(404);
	const account = locals.account === undefined ? undefined : locals.ctx.db(site.id).select({ name: accounts.name }).from(accounts).where(eq(accounts.id, locals.account)).get();
	return {
		site: { id: site.id, name: site.name, tagline: site.tagline, kind: site.kind!, layout: site.skin.layout ?? {} },
		words: Object.fromEntries(WORDS.map((w) => [w, word(site, w)])) as Record<Word, string>,
		account: account?.name,
		today: day(locals.ctx.now())
	};
};
