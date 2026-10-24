<script lang="ts">
	import DateStrip from '#lib/ui/DateStrip.svelte';
	import Showtimes from '#lib/ui/Showtimes.svelte';
	import { longDate } from '#lib/time.ts';
	let { data } = $props();
</script>

<h1 class="text-2xl font-bold">{data.theater.name}</h1>
<p class="mb-4 text-sm text-muted">{data.theater.address} · {data.theater.area}{data.theater.seating === 'general' ? ' · General admission' : ''}</p>
<DateStrip days={data.days} selected={data.date} href={(d) => `?date=${d}`} />
<h2 class="mt-5 mb-3 font-semibold">{longDate(data.date)}</h2>
{#each data.schedule as { film, shows } (film.id)}
	<article class="card mb-3">
		<h3 class="text-lg font-semibold"><a href="/movies/{film.id}" class="hover:underline">{film.title}</a></h3>
		<p class="mb-3 text-sm text-muted">{film.rating} · {film.minutes} min · {film.genre}</p>
		<Showtimes {shows} layout={data.site.layout.showtimes} />
	</article>
{:else}
	<p class="card text-muted">No more showtimes on this day.</p>
{/each}
