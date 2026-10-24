<script lang="ts">
	import { airport, fareName } from '#lib/airline.ts';
	import { clock, longDate, money } from '#lib/time.ts';
	let { data } = $props();
	const t = $derived(data.trip);
</script>

<section class="card max-w-xl">
	<p class="text-sm font-semibold text-brand">Trip booked</p>
	<h1 class="mt-1 text-2xl font-bold">You’re going to {airport(t.legs[0]!.flight.destination)}</h1>
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
	<p class="mt-4"><a class="btn-quiet" href="/check-in/trip?code={t.code}&last={encodeURIComponent(t.last)}">Check in</a></p>
</section>
