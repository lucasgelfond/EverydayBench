<script lang="ts">
	import SeatMap from '#lib/ui/SeatMap.svelte';
	import { bySeat, clock, longDate, money } from '#lib/time.ts';
	let { data } = $props();
	const date = $derived(data.show.startsAt.slice(0, 10));
	const seatQuery = (seats: string[]) => (seats.length ? `?seats=${seats.join(',')}` : '?');
</script>

<a href="/theaters/{data.theater.id}?date={date}" class="text-sm text-muted hover:underline">← {data.theater.name}</a>
<h1 class="mt-2 text-2xl font-bold">{data.film.title}</h1>
<p class="mb-5 text-muted">{longDate(date)} · {clock(data.show.startsAt)} · {data.show.format} · {data.theater.name}{data.room ? ` · ${data.room.name}` : ''}</p>

{#if data.room}
	<section class="card">
		<h2 class="mb-2 font-semibold">{data.words.seatsHeading}</h2>
		<SeatMap room={data.room} sold={data.sold} selected={data.seats} max={data.max} screen={data.site.layout.screen} screenLabel={data.words.screen} href={seatQuery} />
	</section>
	<section class="card mt-4 flex flex-wrap items-center justify-between gap-3" aria-live="polite">
		<p>
			{#if data.seats.length}
				<strong>{data.seats.length} seat{data.seats.length > 1 ? 's' : ''}:</strong> {[...data.seats].sort(bySeat).join(', ')} · {money(data.show.priceCents * data.seats.length)} before fees
			{:else}
				Choose up to {data.max} seats. {money(data.show.priceCents)} each.
			{/if}
		</p>
		{#if data.seats.length}
			<a class="btn" href="/checkout?showtime={data.show.id}&seats={[...data.seats].sort(bySeat).join(',')}">{data.words.continue}</a>
		{:else}
			<span class="btn opacity-40" aria-disabled="true">{data.words.continue}</span>
		{/if}
	</section>
{/if}
