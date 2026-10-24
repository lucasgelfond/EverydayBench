import { error } from '@sveltejs/kit';
import { boardingPass } from '#lib/server/actions/airline.ts';
import { zip } from '#lib/server/pkpass.ts';

export const GET = ({ locals, params }) => {
	const site = locals.site;
	const p = site && boardingPass(locals.ctx, site.id, params.pass);
	if (!p) error(404, 'Boarding pass not found');
	const pass = {
		formatVersion: 1,
		passTypeIdentifier: `pass.test.everydaybench.${site.id}`,
		serialNumber: p.pass,
		organizationName: site.name,
		description: `${site.name} boarding pass`,
		relevantDate: p.flight.departsAt,
		barcodes: [{ format: 'PKBarcodeFormatAztec', message: `${p.trip.code}${p.flight.number.replace(' ', '')}${p.seat}`, messageEncoding: 'iso-8859-1' }],
		boardingPass: {
			transitType: 'PKTransitTypeAir',
			primaryFields: [
				{ key: 'origin', label: p.flight.origin, value: p.flight.origin },
				{ key: 'destination', label: p.flight.destination, value: p.flight.destination }
			],
			auxiliaryFields: [
				{ key: 'flight', label: 'Flight', value: p.flight.number },
				{ key: 'seat', label: 'Seat', value: p.seat },
				{ key: 'gate', label: 'Gate', value: p.gate },
				{ key: 'group', label: 'Group', value: String(p.group) }
			],
			secondaryFields: [{ key: 'passenger', label: 'Passenger', value: `${p.trip.first} ${p.trip.last}` }]
		}
	};
	return new Response(zip({ 'pass.json': JSON.stringify(pass, null, 2) }), {
		headers: { 'content-type': 'application/vnd.apple.pkpass', 'content-disposition': `attachment; filename="${p.pass}.pkpass"` }
	});
};
