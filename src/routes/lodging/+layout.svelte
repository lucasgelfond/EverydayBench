<script lang="ts">
	let { data, children } = $props();
</script>

<svelte:head><title>{data.site.name}</title></svelte:head>
<header class="border-b border-current/10">
	<div class="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
		<a href="/" class="text-xl font-extrabold tracking-tight text-brand">{data.site.name.toLowerCase()}</a>
		<span class="flex-1"></span>
		<nav aria-label="Account" class="flex items-center gap-5 text-sm">
			<a href="/wishlist">Wishlist{data.saved ? ` (${data.saved})` : ''}</a>
			<a href="/trips">Trips</a>
			<span class="text-muted">Signed in as {data.owner.name}</span>
		</nav>
	</div>
</header>
<main class="mx-auto max-w-6xl px-4 py-6">{@render children()}</main>
