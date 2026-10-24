<script lang="ts">
	let { data, children } = $props();
	const centered = $derived(data.site.layout.header === 'centered');
</script>

<svelte:head><title>{data.site.name}</title></svelte:head>

<header class="bg-brand text-brand-ink">
	<div class="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 {centered ? 'flex-col' : ''}">
		<a href="/" class="text-xl font-bold tracking-tight">{data.site.name}</a>
		<nav aria-label="Main" class="flex flex-1 items-center gap-5 text-sm {centered ? 'justify-center' : ''}">
			{#if data.site.kind === 'arthouse'}
				<a href="/">{data.words.nowPlaying}</a>
			{:else}
				<a href="/movies">Movies</a>
				<a href="/theaters">{data.site.kind === 'aggregator' ? 'Theaters' : 'Locations'}</a>
			{/if}
			<span class="flex-1"></span>
			{#if data.site.kind !== 'arthouse'}
				{#if data.account}
					<a href="/account">Hi, {data.account.split(' ')[0]}</a>
				{:else}
					<a href="/account/sign-in">{data.words.signIn}</a>
				{/if}
			{/if}
		</nav>
	</div>
</header>

<main class="mx-auto max-w-5xl px-4 py-6">
	{@render children()}
</main>

<footer class="mx-auto max-w-5xl px-4 py-8 text-xs text-muted">{data.site.name} · {data.site.tagline}</footer>
