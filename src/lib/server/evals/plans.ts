// Checks across sites, for errands that span several (a trip: flights, a stay, dinner and the calendar entries for
// them): each site's own assertions can't see whether the parts agree with each other.

import { flightById } from '../actions/airline.ts';
import { added, CONFIRMATIONS, defineAssertions, type Seen } from './assertions.ts';
import { addMinutes, day } from '../../time.ts';

// The run's one reservation on any dining site, if it made exactly one.
const reservation = (made: Seen['made']) => {
	const rs = made.filter((d) => d.table === 'reservations').flatMap((d) => d.extra);
	return rs.length === 1 ? rs[0]! : undefined;
};

defineAssertions({
	// Every confirmation the run got (orders, stays, reservations, trips…) is in the report: what's missing.
	codes_reported: (_ctx, _a, { made, report }) => {
		const codes = made.filter((d) => CONFIRMATIONS.has(d.table) || d.table === 'trips').flatMap((d) => d.extra.map((r) => String(r.code)));
		return [...new Set(codes)].filter((c) => !report.toUpperCase().includes(c.toUpperCase()));
	},

	// The calendar has an event starting when the run's one reservation does.
	event_for_reservation: (_ctx, _a, { made }) => {
		const r = reservation(made);
		return !!r && added(made, 'events', 'daybrella').some((e) => e.start === r.starts_at);
	},

	// A round trip's parts agree, as problems found (none when they do): one trip there and back on `airline`, a stay from
	// the day the outbound lands to the day the return leaves, dinner the night of landing at least
	// `after_landing_minutes` after it, and (with `calendar`) an event starting at each flight's departure and at dinner.
	trip_plan: (ctx, a, { made }) => {
		const site = String(a.airline);
		const flights = added(made, 'legs', site)
			.map((l) => flightById(ctx, site, String(l.flight)))
			.filter((f) => !!f)
			.sort((x, y) => x.departsAt.localeCompare(y.departsAt));
		const problems: string[] = [];
		if (added(made, 'trips', site).length !== 1 || flights.length !== 2) return [`not one round trip on ${site}`];
		const [out, back] = flights as [NonNullable<(typeof flights)[0]>, NonNullable<(typeof flights)[0]>];
		const stays = added(made, 'stays', 'roostable');
		if (stays.length !== 1) problems.push('not one stay');
		else {
			if (stays[0]!.check_in !== day(out.arrivesAt)) problems.push('the stay starts on another day than the flight lands');
			if (stays[0]!.check_out !== day(back.departsAt)) problems.push('the stay ends on another day than the return leaves');
		}
		const dinner = reservation(made);
		if (!dinner) problems.push('not one dinner reservation');
		else {
			if (day(String(dinner.starts_at)) !== day(out.arrivesAt)) problems.push('dinner is on another day than the flight lands');
			if (String(dinner.starts_at) < addMinutes(out.arrivesAt, Number(a.after_landing_minutes ?? 0))) problems.push('dinner is too soon after landing');
		}
		if (a.calendar) {
			const starts = new Set(added(made, 'events', 'daybrella').map((e) => String(e.start)));
			if (!starts.has(out.departsAt)) problems.push('no calendar event for the flight there');
			if (!starts.has(back.departsAt)) problems.push('no calendar event for the flight back');
			if (dinner && !starts.has(String(dinner.starts_at))) problems.push('no calendar event for dinner');
		}
		return problems;
	}
});
