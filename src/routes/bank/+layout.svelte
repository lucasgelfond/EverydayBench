<script lang="ts">
	let { data, children } = $props();
</script>

<svelte:head><title>Thriftwell Bank</title></svelte:head>
<header class="bg-brand text-brand-ink">
	<div class="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
		<a href="/" class="text-lg font-bold tracking-wide">Thriftwell Bank</a>
		<span class="flex-1"></span>
		<span class="text-sm opacity-90">Signed in as {data.owner.name}</span>
	</div>
</header>
<main class="mx-auto max-w-4xl px-4 py-6">{@render children()}</main>
