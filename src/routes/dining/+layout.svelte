<script lang="ts">
	let { data, children } = $props();
	const centered = $derived(data.site.layout.header === 'centered');
</script>

<svelte:head><title>{data.site.name}</title></svelte:head>

<header class="bg-brand text-brand-ink">
	<div class="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 {centered ? 'flex-col' : ''}">
		<a href="/" class="text-xl font-bold tracking-tight">{data.site.name}</a>
		<nav aria-label="Main" class="flex flex-1 items-center gap-5 text-sm {centered ? 'justify-center' : ''}">
			{#if data.site.kind === 'restaurant'}
				<a href="/">Menu</a>
				<a href="/reserve">Reservations</a>
			{:else}
				<a href="/search">Restaurants</a>
			{/if}
		</nav>
	</div>
</header>

<main class="mx-auto max-w-5xl px-4 py-6">
	{@render children()}
</main>

<footer class="mx-auto max-w-5xl px-4 py-8 text-xs text-muted">{data.site.name} · {data.site.tagline}</footer>
