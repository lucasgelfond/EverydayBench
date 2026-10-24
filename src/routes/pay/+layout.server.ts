import { error } from '@sveltejs/kit';

export const load = ({ locals }) => {
	if (locals.site?.family !== 'pay') error(404);
};
