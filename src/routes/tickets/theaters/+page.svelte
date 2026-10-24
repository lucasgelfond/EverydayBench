<script lang="ts">
	let { data } = $props();
	const byArea = $derived(Map.groupBy(data.theaters, (t) => t.area));
</script>

<h1 class="mb-4 text-2xl font-bold">{data.words.findTheater}</h1>
{#if data.q}<p class="mb-3 text-sm text-muted">{data.theaters.length} matching “{data.q}”</p>{/if}
{#each [...byArea].sort(([a], [b]) => a.localeCompare(b)) as [area, list] (area)}
	<section class="mb-5">
		<h2 class="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">{area}</h2>
		<ul class="grid gap-3 sm:grid-cols-2">
			{#each list as t (t.id)}
				<li class="card"><a href="/theaters/{t.id}" class="font-semibold hover:underline">{t.name}</a><p class="text-sm text-muted">{t.address}</p></li>
			{/each}
		</ul>
	</section>
{/each}
