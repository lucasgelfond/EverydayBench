<script lang="ts">
	import { clock, longDate } from '#lib/time.ts';
	let { data } = $props();
	const e = $derived(data.e);
	const when = $derived(
		e.allDay
			? e.start === e.end
				? `${longDate(e.start)}, all day`
				: `${longDate(e.start)} – ${longDate(e.end)}, all day`
			: `${longDate(e.start.slice(0, 10))}, ${clock(e.start)} – ${clock(e.end)}`
	);
</script>

{#if data.saved}<p role="status" class="mb-3 rounded-site bg-brand/10 px-4 py-2 text-sm">Event saved.</p>{/if}
<article class="card mx-auto max-w-lg space-y-2">
	<h1 class="text-xl font-bold">{e.title}</h1>
	<p>{when}</p>
	{#if e.location}<p class="text-muted">📍 {e.location}</p>{/if}
	{#if e.notes}<p class="whitespace-pre-wrap">{e.notes}</p>{/if}
	<div class="flex gap-3 pt-3">
		<a class="btn-quiet" href="/?date={e.start.slice(0, 10)}">Back to the week</a>
		<form method="POST" action="?/delete"><button class="btn-quiet text-red-700">Delete event</button></form>
	</div>
</article>
