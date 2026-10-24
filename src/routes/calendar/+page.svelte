<script lang="ts">
	import { clock, longDate, shortDate } from '#lib/time.ts';
	let { data } = $props();
</script>

<div class="mb-4 flex items-center gap-3">
	<a class="btn-quiet" href="/?date={data.prev}">← Previous week</a>
	<a class="btn-quiet" href="/">Today</a>
	<a class="btn-quiet" href="/?date={data.next}">Next week →</a>
	<h1 class="ml-2 text-lg font-bold">Week of {longDate(data.days[0]!.date)}</h1>
</div>
<div class="grid gap-3 md:grid-cols-7">
	{#each data.days as d (d.date)}
		<section class="card min-h-40 p-3 {d.date === data.today ? 'ring-2 ring-brand' : ''}" aria-label={longDate(d.date)}>
			<h2 class="mb-2 text-sm font-semibold">{shortDate(d.date)}{d.date === data.today ? ' · Today' : ''}</h2>
			<ul class="space-y-1 text-sm">
				{#each d.events as e (e.id)}
					<li>
						<a class="block rounded-site bg-brand/10 px-2 py-1 hover:bg-brand/20" href="/e/{e.id}">
							{#if e.allDay}<span class="font-semibold">All day</span>{:else}<span class="font-semibold">{clock(e.start)}</span>{/if}
							{e.title}
						</a>
					</li>
				{/each}
			</ul>
			<a class="mt-2 inline-block text-xs text-muted underline" href="/new?date={d.date}" aria-label="New event on {longDate(d.date)}">+ Add</a>
		</section>
	{/each}
</div>
