<script lang="ts">
	import DateStrip from '#lib/ui/DateStrip.svelte';
	import Showtimes from '#lib/ui/Showtimes.svelte';
	import { longDate } from '#lib/time.ts';
	let { data } = $props();
	const q = (date: string, area: string) => `?date=${date}${area ? `&area=${encodeURIComponent(area)}` : ''}`;
</script>

<h1 class="text-2xl font-bold">{data.film.title}</h1>
<p class="text-sm text-muted">{data.film.rating} · {data.film.minutes} min · {data.film.genre}</p>
<p class="mt-2 mb-5 max-w-2xl">{data.film.synopsis}</p>
<DateStrip days={data.days} selected={data.date} href={(d) => q(d, data.area)} />
<nav aria-label="Areas" class="mt-3 flex flex-wrap gap-2 text-sm">
	{#each ['', ...data.areas] as a (a)}
		<a href={q(data.date, a)} data-sveltekit-noscroll aria-current={a === data.area ? 'true' : undefined} class="rounded-site px-3 py-1 {a === data.area ? 'bg-brand text-brand-ink' : 'ring-1 ring-current/20'}">{a || 'All areas'}</a>
	{/each}
</nav>
<h2 class="mt-5 mb-3 font-semibold">{longDate(data.date)}</h2>
{#each data.theaters as { theater, shows } (theater.id)}
	<article class="card mb-3">
		<h3 class="font-semibold"><a href="/theaters/{theater.id}" class="hover:underline">{theater.name}</a></h3>
		<p class="mb-3 text-sm text-muted">{theater.area} · {theater.address}</p>
		<Showtimes {shows} layout={data.site.layout.showtimes} />
	</article>
{:else}
	<p class="card text-muted">No showtimes for this movie {data.area ? `in ${data.area} ` : ''}on this day.</p>
{/each}
