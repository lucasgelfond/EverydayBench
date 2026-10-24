<script lang="ts">
	let { data, children } = $props();
</script>

<svelte:head><title>{data.site.name} — {data.site.tagline}</title></svelte:head>

<div class="bg-[#f0f0f0] px-4 py-1 text-xs">The City of Kestrel Bay’s online service for travel documents</div>
<header class="bg-brand text-brand-ink">
	<div class="mx-auto flex max-w-4xl items-center gap-6 px-4 py-4">
		<a href="/" class="leading-tight"><span class="block text-xl font-bold">{data.site.name}</span><span class="text-sm">{data.site.tagline}</span></a>
		<nav aria-label="Services" class="ml-auto flex gap-5 text-sm">
			<a href="/renew">Renew a passport</a>
			<a href="/status">Check application status</a>
		</nav>
	</div>
</header>
<main class="mx-auto max-w-4xl px-4 py-8">{@render children()}</main>
<footer class="mx-auto max-w-4xl border-t border-current/10 px-4 py-6 text-xs text-muted">Kestrel Bay Office of Travel Documents · 1 Civic Plaza · Questions: 555-0150</footer>
