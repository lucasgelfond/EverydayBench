<script lang="ts">
	import LocationSearch from '#lib/ui/LocationSearch.svelte';
	let { data } = $props();
</script>

<section class="card mb-8">
	<h1 class="mb-1 text-2xl font-bold">{data.site.tagline}</h1>
	<div class="mt-4 max-w-md"><LocationSearch theaters={data.theaters} label={data.words.findTheater} /></div>
</section>

<h2 class="mb-3 text-lg font-semibold">{data.words.nowPlaying}</h2>
<ul class="grid grid-cols-2 gap-4 sm:grid-cols-4">
	{#each data.films as f (f.id)}
		<li class="card flex flex-col gap-1">
			<a href="/movies/{f.id}" class="font-semibold hover:underline">{f.title}</a>
			<span class="text-sm text-muted">{f.rating} · {Math.floor(f.minutes / 60)}h {f.minutes % 60}m · {f.genre}</span>
		</li>
	{/each}
</ul>
