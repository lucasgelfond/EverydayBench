<script lang="ts">
	import SeatMap from '#lib/ui/SeatMap.svelte';
	import { bySeat, clock, longDate, money } from '#lib/time.ts';
	let { data, form } = $props();
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
{:else}
	<form method="POST" action="?/checkout" class="card max-w-md space-y-4">
		<p>General admission: seating is first come, first served. {money(data.show.priceCents)} per ticket.{#if data.show.left !== null && data.show.left < 20}<strong> Only {data.show.left} left.</strong>{/if}</p>
		<label class="label" for="quantity">Tickets</label>
		<div>
			<select id="quantity" name="quantity" class="field">
				{#each Array.from({ length: Math.min(10, data.show.left ?? 10) }, (_, i) => i + 1) as n (n)}<option value={n}>{n}</option>{/each}
			</select>
		</div>
		<label class="label">Email for your tickets <input class="field" name="email" type="email" autocomplete="email" required /></label>
		{#if form?.error}<p class="text-sm font-semibold text-red-600" role="alert">{form.error}</p>{/if}
		<button class="btn">{data.words.continue}</button>
	</form>
{/if}
