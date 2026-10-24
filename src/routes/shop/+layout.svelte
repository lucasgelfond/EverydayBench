<script lang="ts">
	let { data, children } = $props();
	const centered = $derived(data.site.layout.header === 'centered');
	const store = $derived(data.site.kind === 'store');
</script>

<svelte:head><title>{data.site.name}</title></svelte:head>

<header class="bg-brand text-brand-ink">
	<div class="mx-auto flex max-w-5xl items-center gap-5 px-4 py-3 {centered ? 'flex-col' : ''}">
		<a href="/" class="text-xl font-bold tracking-tight">{data.site.name}</a>
		{#if store}
			<form action="/search" role="search" class="flex flex-1 gap-2 {centered ? 'w-full max-w-xl' : ''}">
				<label class="sr-only" for="q">Search {data.site.name}</label>
				<input id="q" name="q" class="field !mt-0 flex-1" placeholder="Search {data.site.name}" />
				<button class="btn-quiet border-brand-ink/40">Search</button>
			</form>
		{:else}
			<span class="flex-1"></span>
		{/if}
		<nav aria-label="Account" class="flex items-center gap-5 text-sm">
			{#if data.account}
				<a href="/account">Hi, {data.account.split(' ')[0]}</a>
			{:else}
				<a href="/account/sign-in">{data.words.signIn}</a>
			{/if}
			<a href="/cart" class="font-semibold">{data.words.cart} ({data.inCart})</a>
		</nav>
	</div>
</header>

<main class="mx-auto max-w-5xl px-4 py-6">
	{@render children()}
</main>

<footer class="mx-auto max-w-5xl px-4 py-8 text-xs text-muted">{data.site.name} · {data.site.tagline}</footer>
