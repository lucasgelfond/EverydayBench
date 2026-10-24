<script lang="ts">
	import { SITES } from '#lib/sites.ts';
</script>

<svelte:head><title>EverydayBench</title></svelte:head>
<main class="mx-auto max-w-xl px-4 py-10 font-sans">
	<h1 class="text-2xl font-bold">EverydayBench</h1>
	<p class="mb-4 text-sm opacity-70">Sites are served by hostname, e.g. <code>lumiscope.everydaybench.test</code>.</p>
	<ul class="space-y-1">
		{#each Object.values(SITES) as s (s.id)}<li><code>{s.id}</code> — {s.name} ({s.family}{s.kind ? `, ${s.kind}` : ''})</li>{/each}
	</ul>
</main>
