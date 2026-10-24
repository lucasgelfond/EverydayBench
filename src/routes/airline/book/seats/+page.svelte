<script lang="ts">
	import AirSeatMap from '#lib/ui/AirSeatMap.svelte';
	import { airport, bookingSeatFee, fareName, FARES } from '#lib/airline.ts';
	import { clock, longDate, money } from '#lib/time.ts';
	let { data } = $props();
	const withSeat = (i: number, seat: string | null) => {
		const q = new URLSearchParams(data.query);
		if (seat) q.set(`s${i}`, seat);
		else q.delete(`s${i}`);
		return `?${q}`;
	};
</script>

<h1 class="mb-1 text-2xl font-bold">Choose your seats</h1>
<p class="mb-5 text-muted">Optional: skip it and Basic Economy seats are assigned at check-in.</p>
{#each data.legs as leg (leg.i)}
	<section class="card mb-4" aria-labelledby="leg-{leg.i}">
		<h2 id="leg-{leg.i}" class="font-semibold">{leg.i ? 'Return' : 'Departure'}: {airport(leg.flight.origin)} to {airport(leg.flight.destination)}</h2>
		<p class="mb-3 text-sm text-muted">
			{leg.flight.number} · {longDate(leg.flight.departsAt.slice(0, 10))} · {clock(leg.flight.departsAt)} · {fareName(leg.fare)} ({money(leg.cents)}). {FARES.find((f) => f.id === leg.fare)?.note}.
		</p>
		<p class="mb-3" aria-live="polite">Seat: <strong>{leg.seat ?? 'none chosen'}</strong>{#if leg.seat && bookingSeatFee(leg.fare)} · seat fee {money(bookingSeatFee(leg.fare))}{/if}</p>
		<AirSeatMap cabin={leg.cabin} taken={leg.taken} selected={leg.seat} fee={() => bookingSeatFee(leg.fare)} href={(seat) => withSeat(leg.i, seat)} />
	</section>
{/each}
<a class="btn" href="/book/checkout?{data.query}">{data.words.continue}</a>
