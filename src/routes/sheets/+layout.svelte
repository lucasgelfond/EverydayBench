<script lang="ts">
	let { data, children } = $props();
</script>

<svelte:head><title>Gridwhistle</title></svelte:head>
<header class="border-b border-current/10 bg-surface">
	<div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
		<a href="/" class="text-lg font-bold text-brand">Gridwhistle</a>
		<span class="flex-1"></span>
		<span class="text-sm text-muted">{data.owner.email}</span>
	</div>
</header>
<main class="mx-auto max-w-6xl px-4 py-6">{@render children()}</main>
