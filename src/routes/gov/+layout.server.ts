import { error } from '@sveltejs/kit';

export const load = ({ locals }) => {
	const site = locals.site;
	if (site?.family !== 'gov') error(404);
	return { site: { id: site.id, name: site.name, tagline: site.tagline } };
};
