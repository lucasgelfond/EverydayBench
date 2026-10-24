<script lang="ts">
	import { clock, longDate } from '#lib/time.ts';
	let { data } = $props();
	// Text with its web addresses as links.
	const parts = $derived(data.m.body.split(/(https?:\/\/[^\s]+)/g));
</script>

<div class="flex items-center justify-between">
	<a href="/" class="text-sm text-muted hover:underline">← Inbox</a>
	{#if data.m.fromAddr !== data.owner.email}<a class="btn-quiet text-sm" href="/compose?to={encodeURIComponent(data.m.fromAddr)}&subject={encodeURIComponent(data.m.subject.startsWith('Re:') ? data.m.subject : `Re: ${data.m.subject}`)}">Reply</a>{/if}
</div>
<article class="card mt-2">
	<h1 class="text-xl font-bold">{data.m.subject}</h1>
	<p class="mt-1 text-sm text-muted"><strong class="text-ink">{data.m.fromName}</strong> &lt;{data.m.fromAddr}&gt; to {data.m.toAddr} · {longDate(data.m.sentAt.slice(0, 10))}, {clock(data.m.sentAt)}</p>
	<div class="mt-4 whitespace-pre-wrap">{#each parts as p, i (i)}{#if /^https?:\/\//.test(p)}<a class="break-all text-brand underline" href={p}>{p}</a>{:else}{p}{/if}{/each}</div>
</article>
