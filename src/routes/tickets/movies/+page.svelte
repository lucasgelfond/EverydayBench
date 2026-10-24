<script lang="ts">
	let { data } = $props();
</script>

<h1 class="mb-4 text-2xl font-bold">{data.words.nowPlaying}</h1>
<ul class="grid gap-3 sm:grid-cols-2">
	{#each data.films as f (f.id)}
		<li class="card">
			<a href="/movies/{f.id}" class="text-lg font-semibold hover:underline">{f.title}</a>
			<p class="text-sm text-muted">{f.rating} · {f.minutes} min · {f.genre}</p>
			<p class="mt-2 text-sm">{f.synopsis}</p>
		</li>
	{/each}
</ul>
