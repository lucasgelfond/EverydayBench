<script lang="ts">
	// Type an area or a theater's name; matching theaters show as links below. A plain form underneath: Enter lists the
	// matches on the theaters page, so it works before (or without) JavaScript, and text typed before the page's
	// JavaScript loaded is picked up when it does.
	let { theaters, label }: { theaters: { id: string; name: string; area: string }[]; label: string } = $props();
	let query = $state('');
	let input = $state<HTMLInputElement>();
	const matches = $derived(theaters.filter((t) => `${t.name} ${t.area}`.toLowerCase().includes(query.trim().toLowerCase())));
	$effect(() => {
		if (input?.value && !query) query = input.value;
	});
</script>

<form action="/theaters" role="search">
	<label class="label" for="location">{label}</label>
	<input bind:this={input} id="location" name="q" class="field" autocomplete="off" placeholder="Neighborhood or theater name" aria-controls="location-results" oninput={(e) => (query = e.currentTarget.value)} />
	{#if query.trim()}
		<ul id="location-results" aria-label="Matching theaters" class="mt-2 divide-y divide-current/10 rounded-site bg-surface ring-1 ring-current/15">
			{#each matches as t (t.id)}
				<li><a href="/theaters/{t.id}" class="flex justify-between gap-3 px-3 py-2 hover:bg-brand hover:text-brand-ink"><span class="font-medium">{t.name}</span><span class="text-sm opacity-75">{t.area}</span></a></li>
			{:else}
				<li class="px-3 py-2 text-sm text-muted">No theaters match “{query.trim()}”.</li>
			{/each}
		</ul>
	{/if}
</form>
