<script lang="ts">
	import TableSearch from '#lib/ui/TableSearch.svelte';
	import RestaurantMeta from '#lib/ui/RestaurantMeta.svelte';
	import { clock } from '#lib/time.ts';
	let { data } = $props();
	const grid = $derived(data.site.layout.results === 'grid');
	const book = (id: string, at: string) => `/book?r=${id}&at=${encodeURIComponent(at)}&party=${data.values.party}`;
	const day = (id: string) => `/r/${id}?date=${data.values.date}&party=${data.values.party}`;
</script>

<section class="card mb-6"><TableSearch options={data.options} values={data.values} areas={data.areas} cuisines={data.cuisines} submit={data.words.findTable} /></section>

<h1 class="mb-3 text-lg font-semibold">{data.results.length} restaurant{data.results.length === 1 ? '' : 's'}</h1>
<ul class={grid ? 'grid gap-4 sm:grid-cols-2' : 'space-y-4'}>
	{#each data.results as { restaurant: r, times } (r.id)}
		<li>
			<article class="card" aria-labelledby="r-{r.id}">
				<h2 id="r-{r.id}" class="text-lg font-semibold"><a href={day(r.id)} class="hover:underline">{r.name}</a></h2>
				<RestaurantMeta restaurant={r} />
				<p class="mt-1 text-sm">{r.blurb}</p>
				{#if times.length}
					<ul class="mt-3 flex flex-wrap gap-2" aria-label="Open times at {r.name}">
						{#each times as t (t)}<li><a class="btn px-3 py-1 text-sm" href={book(r.id, t)}>{clock(t)}</a></li>{/each}
					</ul>
				{:else}
					<p class="mt-3 text-sm text-muted">No tables within 90 minutes of {clock(`${data.values.date}T${data.values.time}`)}. <a class="underline" href={day(r.id)}>See all times</a></p>
				{/if}
			</article>
		</li>
	{/each}
</ul>
