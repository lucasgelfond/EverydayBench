import { error } from '@sveltejs/kit';
import { word, type Word } from '#lib/sites.ts';
import { accountName } from '#lib/server/actions/airline.ts';
import { day } from '#lib/time.ts';

const WORDS: Word[] = ['continue', 'purchase', 'signIn'];

export const load = ({ locals }) => {
	const site = locals.site;
	if (site?.family !== 'airline') error(404);
	return {
		site: { id: site.id, name: site.name, tagline: site.tagline, layout: site.skin.layout ?? {} },
		words: Object.fromEntries(WORDS.map((w) => [w, word(site, w)])) as Record<Word, string>,
		account: locals.account === undefined ? undefined : accountName(locals.ctx, site.id, locals.account)?.name,
		today: day(locals.ctx.now())
	};
};
