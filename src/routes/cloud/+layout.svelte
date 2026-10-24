<script lang="ts">
	let { data, children } = $props();
</script>

<svelte:head><title>{data.site.name} console</title></svelte:head>

<header class="border-b border-current/10 bg-surface">
	<div class="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
		<a href="/" class="text-lg font-bold text-brand">☁ {data.site.name}</a>
		{#if data.account}
			<nav aria-label="Console" class="flex flex-1 gap-5 text-sm">
				<a href="/">Servers</a>
				<a href="/billing">Billing</a>
				<a href="/plan">Plan</a>
				<span class="flex-1"></span>
				<span class="text-muted">{data.account.email}</span>
				<form method="POST" action="/account/sign-out"><button class="underline">Sign out</button></form>
			</nav>
		{/if}
	</div>
</header>
<main class="mx-auto max-w-5xl px-4 py-6">{@render children()}</main>
<footer class="mx-auto max-w-5xl px-4 py-8 text-xs text-muted">{data.site.name} · {data.site.tagline}</footer>
