<script lang="ts">
	import { airport } from '#lib/airline.ts';
	import { clock, longDate } from '#lib/time.ts';
	let { data } = $props();
	const p = $derived(data.p);
	// A barcode-like pattern from the pass (decoration: the pass's facts are in the text).
	const cells = $derived(Array.from({ length: 21 * 21 }, (_, i) => (p.pass.charCodeAt(i % p.pass.length) * (i + 7)) % 3 === 0));
</script>

<article class="card mx-auto max-w-md" aria-label="Boarding pass">
	<p class="text-sm font-semibold text-brand">Boarding pass</p>
	<h1 class="mt-1 text-2xl font-bold">{p.flight.origin} → {p.flight.destination}</h1>
	<p class="text-sm text-muted">{airport(p.flight.origin)} to {airport(p.flight.destination)}</p>
	<dl class="mt-4 grid grid-cols-2 gap-y-2 text-sm">
		<dt class="text-muted">Passenger</dt><dd>{p.trip.first} {p.trip.last}</dd>
		<dt class="text-muted">Flight</dt><dd>{p.flight.number}</dd>
		<dt class="text-muted">Date</dt><dd>{longDate(p.flight.departsAt.slice(0, 10))}</dd>
		<dt class="text-muted">Departs</dt><dd>{clock(p.flight.departsAt)}</dd>
		<dt class="text-muted">Boards</dt><dd>{clock(p.boards)}</dd>
		<dt class="text-muted">Gate</dt><dd>{p.gate}</dd>
		<dt class="text-muted">Group</dt><dd>{p.group}</dd>
		<dt class="text-muted">Seat</dt><dd class="text-lg font-bold">{p.seat}</dd>
		<dt class="text-muted">Confirmation</dt><dd class="font-mono">{p.trip.code}</dd>
	</dl>
	<div class="mx-auto mt-5 grid w-max grid-cols-[repeat(21,0.5rem)]" aria-hidden="true">
		{#each cells as on, i (i)}<span class="size-2 {on ? 'bg-ink' : ''}"></span>{/each}
	</div>
	<p class="mt-5 text-center"><a class="btn-quiet" href="/boarding-pass/{p.pass}.pkpass">Add to Apple Wallet</a></p>
</article>
