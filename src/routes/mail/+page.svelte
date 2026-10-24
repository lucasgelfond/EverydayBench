<script lang="ts">
	import { clock, shortDate } from '#lib/time.ts';
	let { data } = $props();
</script>

{#if data.q}<p class="mb-2 text-sm text-muted">Results for “{data.q}”</p>{/if}
<ul class="divide-y divide-current/10 rounded-site bg-surface ring-1 ring-current/10" aria-label="Messages">
	{#each data.messages as m (m.id)}
		<li>
			<a href="/m/{m.id}" class="flex gap-4 px-4 py-3 hover:bg-brand/5 {m.read ? '' : 'font-semibold'}">
				<span class="w-40 shrink-0 truncate">{m.fromName}</span>
				<span class="min-w-0 flex-1 truncate">{m.subject} <span class="font-normal text-muted">— {m.body.slice(0, 80)}</span></span>
				<span class="shrink-0 text-sm font-normal text-muted">{shortDate(m.sentAt.slice(0, 10))}, {clock(m.sentAt)}</span>
			</a>
		</li>
	{:else}
		<li class="px-4 py-6 text-muted">No messages.</li>
	{/each}
</ul>
