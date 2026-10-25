import { fail, redirect } from '@sveltejs/kit';
import { airport, CHAT_TOPICS, WIFI_PROBLEMS, type WifiProblem } from '#lib/airline.ts';
import { findTrip, flownLeg, requestCallback } from '#lib/server/actions/airline.ts';
import { clearDraft, readDraft, writeDraft } from '#lib/server/session.ts';
import { longDate } from '#lib/time.ts';

// The support chat: a scripted assistant, one question at a time. The conversation so far is a signed cookie (nothing
// is written until it promises a call); the transcript is rebuilt from it on every page.
const key = (site: string) => `${site}_chat`;
type Line = { who: 'bot' | 'me'; text: string };
type Ask = 'topic' | 'trip' | 'problem' | 'phone' | 'none';

export const load = ({ locals, cookies }) => {
	const ctx = locals.ctx;
	const site = locals.site!;
	const d = readDraft(cookies, ctx.run.id, key(site.id));
	const lines: Line[] = [{ who: 'bot', text: `Hi, I’m the ${site.name} assistant. What can I help you with today?` }];
	const say = (who: Line['who'], text: string) => lines.push({ who, text });
	const done = (ask: Ask) => ({ lines, ask });
	if (!d.topic) return done('topic');
	say('me', CHAT_TOPICS[d.topic as keyof typeof CHAT_TOPICS]);
	if (d.topic !== 'wifi') {
		say('bot', 'I can only help with Wi-Fi and entertainment here for now. For anything else, go to My trips.');
		return done('none');
	}
	say('bot', 'Sorry the Wi-Fi let you down. What’s your confirmation code and last name?');
	if (!d.code) return done('trip');
	say('me', `${d.code}, ${d.last}`);
	const leg = flownLeg(ctx, findTrip(ctx, site.id, d.code, d.last ?? '')!)!;
	const f = leg.flight;
	say('bot', `Found it: ${f.number}, ${airport(f.origin)} to ${airport(f.destination)} on ${longDate(f.departsAt.slice(0, 10))}. What happened?`);
	if (!d.problem) return done('problem');
	say('me', WIFI_PROBLEMS[d.problem as WifiProblem]);
	say('bot', 'I’m sorry about that. Wi-Fi refunds are handled by our onboard services team, and they’ll want to call you. What number should they call?');
	if (!d.phone) return done('phone');
	say('me', d.phone);
	say('bot', `Thanks. Someone from onboard services will call you at ${d.phone} within 3 business days about a refund. Is there anything else I can help with?`);
	return done('none');
};

export const actions = {
	say: async ({ locals, cookies, request }) => {
		const ctx = locals.ctx;
		const site = locals.site!.id;
		const d = readDraft(cookies, ctx.run.id, key(site));
		const f = await request.formData();
		const v = (k: string) => String(f.get(k) ?? '').trim();
		if (!d.topic) {
			if (!(v('topic') in CHAT_TOPICS)) return fail(400, { error: 'Choose one of the options.' });
			d.topic = v('topic');
		} else if (!d.code) {
			const t = findTrip(ctx, site, v('code'), v('last'));
			if (!t) return fail(400, { error: 'I couldn’t find a trip with that confirmation code and last name. Could you check them?' });
			if (!flownLeg(ctx, t)) return fail(400, { error: 'That trip hasn’t flown yet, so there’s no Wi-Fi to refund.' });
			d.code = t.code;
			d.last = t.last;
		} else if (!d.problem) {
			if (!(v('problem') in WIFI_PROBLEMS)) return fail(400, { error: 'Choose one of the options.' });
			d.problem = v('problem');
		} else if (!d.phone) {
			const r = requestCallback(ctx, { site, code: d.code, last: d.last ?? '', problem: d.problem, phone: v('phone') });
			if (!r.ok) return fail(400, { error: r.error });
			d.phone = r.phone;
		}
		writeDraft(cookies, ctx.run.id, key(site), d);
		redirect(303, '/support');
	},
	restart: ({ cookies, locals }) => {
		clearDraft(cookies, key(locals.site!.id));
		redirect(303, '/support');
	}
};
