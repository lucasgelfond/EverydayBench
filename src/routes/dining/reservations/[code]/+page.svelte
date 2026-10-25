<script lang="ts">
	import { clock, day, longDate } from '#lib/time.ts';
	let { data, form } = $props();
	const r = $derived(data.reservation);
</script>

<section class="card mx-auto max-w-xl space-y-3">
	<h1 class="text-2xl font-bold">{r.canceled ? 'Reservation canceled' : 'Reservation confirmed'}</h1>
	<p>Confirmation number: <strong class="font-mono">{r.code}</strong></p>
	<p><strong>{data.restaurant.name}</strong>, {data.restaurant.address} ({data.restaurant.area})</p>
	<p>{longDate(day(r.at))} at {clock(r.at)}, party of {r.party}</p>
	<p>Under {r.name}. A confirmation was sent to {r.email}.</p>
	{#if r.occasion !== 'None'}<p>Occasion: {r.occasion}</p>{/if}
	{#if r.notes}<p>Requests: {r.notes}</p>{/if}
	{#if form?.error}<p class="font-semibold text-red-600" role="alert">{form.error}</p>{/if}
	{#if !r.canceled && r.upcoming}
		<form method="POST" action="?/cancel" class="border-t pt-3">
			<button class="btn-quiet">Cancel reservation</button>
		</form>
	{/if}
</section>
