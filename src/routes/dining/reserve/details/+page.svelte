<script lang="ts">
	import ReservationForm from '#lib/ui/ReservationForm.svelte';
	import { clock, day, longDate } from '#lib/time.ts';
	let { data, form } = $props();
</script>

<section class="card mx-auto max-w-xl space-y-4">
	<h1 class="text-2xl font-bold">Your details</h1>
	<p>Table for {data.party} on {longDate(day(data.at))} at {clock(data.at)}. <a class="underline" href="/reserve?party={data.party}&date={day(data.at)}">Change</a></p>
	{#if data.restaurant.fee}<p class="font-semibold">{data.restaurant.fee}</p>{/if}
	{#if data.open || form?.error}
		<ReservationForm occasions={data.occasions} values={form?.values} error={form?.error} submit={data.words.reserve} />
	{:else}
		<p role="alert">Sorry, that time was just taken. <a class="underline" href="/reserve?party={data.party}&date={day(data.at)}">Choose another</a></p>
	{/if}
</section>
