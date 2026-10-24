import { error } from '@sveltejs/kit';
import { word, type Word } from '#lib/sites.ts';

const WORDS: Word[] = ['findTable', 'reserve'];

export const load = ({ locals }) => {
	const site = locals.site;
	if (site?.family !== 'dining') error(404);
	return {
		site: { id: site.id, name: site.name, tagline: site.tagline, kind: site.kind!, layout: site.skin.layout ?? {} },
		words: Object.fromEntries(WORDS.map((w) => [w, word(site, w)])) as Record<Word, string>
	};
};
