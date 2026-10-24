<script lang="ts">
	import { clock, longDate, money } from '#lib/time.ts';
	let { data } = $props();
	const o = $derived(data.order);
</script>

<section class="card max-w-xl">
	<p class="text-sm font-semibold text-brand">Order confirmed</p>
	<h1 class="mt-1 text-2xl font-bold">You're going to {data.film}</h1>
	<p class="mt-3 text-lg">Confirmation number: <strong class="font-mono tracking-wider">{o.code}</strong></p>
	<dl class="mt-4 grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
		<dt class="text-muted">When</dt><dd>{longDate(data.startsAt.slice(0, 10))}, {clock(data.startsAt)} ({data.format})</dd>
		<dt class="text-muted">Where</dt><dd>{data.theater.name}{data.room ? `, ${data.room}` : ''}</dd>
		<dt class="text-muted">{o.seats.length ? 'Seats' : 'Tickets'}</dt><dd>{o.seats.length ? o.seats.join(', ') : `${o.quantity} general admission`}</dd>
		<dt class="text-muted">Total</dt><dd>{money(o.totalCents)} (card ending in {o.cardLast4})</dd>
		<dt class="text-muted">Sent to</dt><dd>{o.email}</dd>
	</dl>
</section>
