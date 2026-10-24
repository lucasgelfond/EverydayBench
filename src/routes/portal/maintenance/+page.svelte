<script lang="ts">
	import { longDate } from '#lib/time.ts';
	let { data } = $props();
</script>

<div class="mb-4 flex items-center justify-between">
	<h1 class="text-2xl font-bold">Maintenance requests</h1>
	<a class="btn" href="/maintenance/new">New request</a>
</div>
{#if data.filed}<p role="status" class="card mb-4">Request <strong class="font-mono">{data.filed}</strong> submitted. We’ll be in touch to schedule it.</p>{/if}
<ul class="space-y-3">
	{#each data.requests as r (r.code)}
		<li class="card text-sm">
			<p class="font-semibold"><span class="font-mono">{r.code}</span> · {data.categories[r.category as keyof typeof data.categories]} · {r.location}</p>
			<p>{r.description}</p>
			<p class="text-muted">Submitted {longDate(r.createdAt.slice(0, 10))} · {r.code === data.filed ? 'Open' : 'Completed'}</p>
		</li>
	{:else}<li class="text-muted">No requests yet.</li>{/each}
</ul>
