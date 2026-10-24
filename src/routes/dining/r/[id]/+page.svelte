<script lang="ts">
	import RestaurantMeta from '#lib/ui/RestaurantMeta.svelte';
	import { clock } from '#lib/time.ts';
	let { data } = $props();
	const r = $derived(data.restaurant);
</script>

<article class="card space-y-4">
	<header>
		<h1 class="text-2xl font-bold">{r.name}</h1>
		<RestaurantMeta restaurant={r} />
		<p class="mt-1">{r.blurb}</p>
		<p class="text-sm text-muted">{r.address}</p>
	</header>
	<form method="GET" class="flex flex-wrap items-end gap-3">
		<label class="label">Date
			<select class="field" name="date">{#each data.options.dates as o (o.value)}<option value={o.value} selected={o.value === data.values.date}>{o.label}</option>{/each}</select>
		</label>
		<label class="label">Party size
			<select class="field" name="party">{#each data.options.parties as o (o.value)}<option value={o.value} selected={o.value === data.values.party}>{o.label}</option>{/each}</select>
		</label>
		<button class="btn-quiet">Show times</button>
	</form>
	<section>
		<h2 class="mb-2 font-semibold">Open times</h2>
		{#if data.times.length}
			<ul class="flex flex-wrap gap-2" aria-label="Open times at {r.name}">
				{#each data.times as t (t)}<li><a class="btn px-3 py-1 text-sm" href="/book?r={r.id}&at={encodeURIComponent(t)}&party={data.values.party}">{clock(t)}</a></li>{/each}
			</ul>
		{:else}
			<p class="text-muted">No tables left that day for a party of {data.values.party}.</p>
		{/if}
	</section>
</article>
