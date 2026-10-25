<script lang="ts">
	import { airport, CREDIT_MONTHS, fareName, refundable } from '#lib/airline.ts';
	import { clock, longDate, money } from '#lib/time.ts';
	let { data, form } = $props();
	const t = $derived(data.trip);
	const fares = $derived(t.legs.map((l) => l.fare));
	const keeps = $derived(fares.find((f) => !refundable([f])));
</script>

<section class="card max-w-xl">
	<p class="text-sm font-semibold text-brand">{t.canceled ? 'Trip canceled' : 'Trip booked'}</p>
	<h1 class="mt-1 text-2xl font-bold">{t.canceled ? 'Your trip' : 'You’re going'} to {airport(t.legs[0]!.flight.destination)}</h1>
	<p class="mt-3 text-lg">Confirmation code: <strong class="font-mono tracking-wider">{t.code}</strong></p>
	<p class="mt-1 text-sm">Passenger: {t.first} {t.last}</p>
	<ul class="mt-4 space-y-3 text-sm">
		{#each t.legs as l (l.flight.id)}
			<li>
				<strong>{l.flight.number}</strong> {airport(l.flight.origin)} → {airport(l.flight.destination)}<br />
				{longDate(l.flight.departsAt.slice(0, 10))}, {clock(l.flight.departsAt)} – {clock(l.flight.arrivesAt)} · {fareName(l.fare)} · Seat {l.seat ?? 'assigned at check-in'}
			</li>
		{/each}
	</ul>
	<p class="mt-4 text-sm">Total: {money(t.totalCents)} (card ending in {t.cardLast4}). Sent to {t.email}.</p>
	{#if !t.canceled}
		<p class="mt-4"><a class="btn-quiet" href="/check-in/trip?code={t.code}&last={encodeURIComponent(t.last)}">Check in</a></p>
	{/if}
</section>

<section class="card mt-4 max-w-xl space-y-3 text-sm" aria-labelledby="manage">
	<h2 id="manage" class="text-lg font-semibold">Manage trip</h2>
	{#if t.refund}
		<p role="status">
			Refund request <strong class="font-mono">{t.refund.code}</strong>:
			{t.refund.status === 'approved' ? `approved. ${money(t.refund.amountCents)} back to your card ending in ${t.cardLast4}.` : `denied. ${fareName(keeps ?? fares[0]!)} fares are nonrefundable.`}
		</p>
	{/if}
	{#if t.credit}
		<p role="status">
			Canceled for travel credit <strong class="font-mono">{t.credit.code}</strong>: {money(t.credit.amountCents)}, use by {longDate(t.credit.expiresOn)}.
		</p>
	{/if}
	{#if !t.canceled && !data.started}
		<p>
			{#if keeps}
				{fareName(keeps)} fares are nonrefundable. You can cancel this trip for a travel credit of {money(t.totalCents)}, good for {CREDIT_MONTHS} months.
			{:else}
				This fare is refundable to your card.
			{/if}
		</p>
		{#if form?.error}<p role="alert" class="font-semibold text-red-600">{form.error}</p>{/if}
		{#if data.confirming}
			<form method="POST" action="?/cancel" class="space-y-2 rounded border border-red-300 p-3">
				<p><strong>Cancel trip {t.code} for a {money(t.totalCents)} travel credit?</strong> Your seats are released, and this can’t be undone.</p>
				<button class="btn">Yes, cancel my trip</button>
				<a class="btn-quiet" href="/trips/{t.code}">Keep my trip</a>
			</form>
		{:else}
			<div class="flex flex-wrap gap-3">
				{#if !t.refund}
					<form method="POST" action="?/refund"><button class="btn-quiet">Request a refund</button></form>
				{/if}
				<a class="btn-quiet" href="/trips/{t.code}?cancel">Cancel for travel credit</a>
			</div>
		{/if}
	{:else if !t.refund && !t.credit}
		<p>This trip has already started, so it can’t be changed online.</p>
	{/if}
</section>
