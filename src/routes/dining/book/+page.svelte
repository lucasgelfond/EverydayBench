<script lang="ts">
	import ReservationForm from '#lib/ui/ReservationForm.svelte';
	import { clock, day, longDate } from '#lib/time.ts';
	let { data, form } = $props();
</script>

<div class="grid gap-5 md:grid-cols-[1fr_18rem]">
	<section class="card">
		<h1 class="mb-4 text-2xl font-bold">Complete your reservation</h1>
		{#if data.open || form?.error}
			<ReservationForm occasions={data.occasions} values={form?.values} error={form?.error} submit={data.words.reserve} />
		{:else}
			<p role="alert">Sorry, that table is no longer available. <a class="underline" href="/r/{data.restaurant.id}?date={day(data.at)}&party={data.party}">Pick another time</a></p>
		{/if}
	</section>
	<aside class="card h-fit text-sm">
		<h2 class="mb-1 font-semibold">{data.restaurant.name}</h2>
		<p>{longDate(day(data.at))} at {clock(data.at)}</p>
		<p>Party of {data.party}</p>
		<p class="mt-2 text-muted">{data.restaurant.address}, {data.restaurant.area}</p>
		{#if data.restaurant.fee}<p class="mt-2 font-semibold">{data.restaurant.fee}</p>{/if}
	</aside>
</div>
