import { error } from '@sveltejs/kit';
import { boardingPass } from '#lib/server/actions/airline.ts';

export const load = ({ locals, params }) => {
	const p = boardingPass(locals.ctx, locals.site!.id, params.pass);
	if (!p) error(404, 'Boarding pass not found');
	return { p };
};
