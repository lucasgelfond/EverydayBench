<script lang="ts">
	import { clock, shortDate } from '#lib/time.ts';
	let { data } = $props();
</script>

{#if data.sent}<p role="status" class="mb-3 rounded-site bg-brand/10 px-4 py-2 text-sm">Message sent.</p>{/if}
<ul class="divide-y divide-current/10 rounded-site bg-surface ring-1 ring-current/10" aria-label="Sent messages">
	{#each data.messages as m (m.id)}
		<li>
			<a href="/m/{m.id}" class="flex gap-4 px-4 py-3 hover:bg-brand/5">
				<span class="w-40 shrink-0 truncate">To: {m.toAddr}</span>
				<span class="min-w-0 flex-1 truncate">{m.subject || '(no subject)'} <span class="text-muted">— {m.body.slice(0, 80)}</span></span>
				<span class="shrink-0 text-sm text-muted">{shortDate(m.sentAt.slice(0, 10))}, {clock(m.sentAt)}</span>
			</a>
		</li>
	{:else}
		<li class="px-4 py-6 text-muted">Nothing sent yet.</li>
	{/each}
</ul>
