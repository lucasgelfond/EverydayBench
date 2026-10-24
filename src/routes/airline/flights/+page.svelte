<script lang="ts">
	import { airport, duration, fareName } from '#lib/airline.ts';
	import { clock, longDate, money } from '#lib/time.ts';
	let { data } = $props();
	const table = $derived(data.site.layout.flights === 'table');
	const stops = (via: string | null) => (via ? `1 stop (${via})` : 'Nonstop');
	// An arrival the next day, as airlines mark it.
	const arrives = (f: { departsAt: string; arrivesAt: string }) => `${clock(f.arrivesAt)}${f.arrivesAt.slice(0, 10) > f.departsAt.slice(0, 10) ? ' +1 day' : ''}`;
</script>

{#if !data.ok}
	<p class="card max-w-xl" role="alert">{data.problem} <a class="underline" href="/">Search again</a></p>
{:else}
	<p class="text-sm text-muted">{data.returning ? 'Step 2 of 2: return' : data.round ? 'Step 1 of 2: departure' : 'One-way'}</p>
	<h1 class="mt-1 text-2xl font-bold">{airport(data.from)} to {airport(data.to)}</h1>
	<nav aria-label="Dates" class="mt-2 mb-5 flex items-center gap-4">
		{#if data.earlier}<a class="btn-quiet" href={data.earlier}>← Day before</a>{/if}
		<strong>{longDate(data.date)}</strong>
		<a class="btn-quiet" href={data.later}>Day after →</a>
		<a class="ml-auto text-sm underline" href="/">New search</a>
	</nav>
	{#if data.picked}
		<p class="card mb-4 text-sm">Departing: <strong>{data.picked.number}</strong>, {longDate(data.picked.departsAt.slice(0, 10))} at {clock(data.picked.departsAt)}, {fareName(data.picked.fare)}.</p>
	{/if}
	{#if !data.flights.length}
		<p class="card">No flights left on this day. Try another date.</p>
	{:else if table}
		<div class="card overflow-x-auto p-0">
			<table class="w-full text-sm">
				<caption class="sr-only">Flights on {longDate(data.date)}</caption>
				<thead>
					<tr class="text-left text-muted">
						<th class="p-3">Flight</th>
						{#each data.flights[0]!.fares as fare (fare.id)}<th class="p-3">{fare.name}</th>{/each}
					</tr>
				</thead>
				<tbody>
					{#each data.flights as f (f.id)}
						<tr class="border-t border-current/10">
							<th scope="row" class="p-3 text-left font-normal">
								<strong>{clock(f.departsAt)} – {arrives(f)}</strong><br />
								<span class="text-muted">{f.number} · {duration(f.minutes)} · {stops(f.via)}</span>
							</th>
							{#each f.fares as fare (fare.id)}
								<td class="p-3"><a class="btn-quiet" href={fare.href} aria-label="{fare.name}, {money(fare.cents)}, {f.number} at {clock(f.departsAt)}">{money(fare.cents)}</a></td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<ul class="space-y-3">
			{#each data.flights as f (f.id)}
				<li>
					<article class="card" aria-label="{f.number} at {clock(f.departsAt)}">
						<div class="flex flex-wrap items-baseline gap-x-4">
							<h2 class="text-lg font-bold">{clock(f.departsAt)} → {arrives(f)}</h2>
							<p class="text-sm text-muted">{f.number} · {duration(f.minutes)} · {stops(f.via)}</p>
						</div>
						<div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
							{#each f.fares as fare (fare.id)}
								<a class="btn-quiet flex-col items-start" href={fare.href} aria-label="{fare.name}, {money(fare.cents)}, {f.number} at {clock(f.departsAt)}">
									<span class="text-xs text-muted">{fare.name}</span><strong>{money(fare.cents)}</strong>
								</a>
							{/each}
						</div>
					</article>
				</li>
			{/each}
		</ul>
	{/if}
{/if}
