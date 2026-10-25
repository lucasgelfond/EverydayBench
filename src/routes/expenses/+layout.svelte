<script lang="ts">
	let { data, children } = $props();
</script>

<svelte:head><title>{data.site.name}</title></svelte:head>

<header class="bg-brand text-brand-ink">
	<div class="mx-auto flex max-w-4xl items-center gap-6 px-4 py-4">
		<a href="/" class="text-lg font-bold">{data.site.name}</a>
		<nav aria-label="Expenses" class="flex flex-1 items-center gap-5 text-sm">
			{#if data.account}
				<a href="/">Your claims</a>
				<a href="/claims/new">New claim</a>
				<span class="flex-1"></span>
				<span>{data.account.name}</span>
				<form method="POST" action="/account/sign-out"><button class="underline">Sign out</button></form>
			{:else}
				<span class="flex-1"></span>
				<a href="/account/sign-in">Sign in</a>
			{/if}
		</nav>
	</div>
</header>
<main class="mx-auto max-w-4xl px-4 py-6">{@render children()}</main>
<footer class="mx-auto max-w-4xl px-4 py-8 text-xs text-muted">{data.site.tagline} · Questions: finance@gullwing.test</footer>
