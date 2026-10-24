<script lang="ts">
	let { data, children } = $props();
</script>

<svelte:head><title>Daybrella — {data.owner.name}</title></svelte:head>
<header class="border-b border-current/10 bg-surface">
	<div class="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
		<a href="/" class="text-lg font-bold text-brand">Daybrella</a>
		<span class="flex-1"></span>
		<a href="/new" class="btn">New event</a>
		<span class="text-sm text-muted">{data.owner.email}</span>
	</div>
</header>
<main class="mx-auto max-w-5xl px-4 py-6">{@render children()}</main>
