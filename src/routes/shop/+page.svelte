<script lang="ts">
	import ProductList from '#lib/ui/ProductList.svelte';
	import { money } from '#lib/time.ts';
	let { data } = $props();
</script>

{#if data.restaurants}
	<section class="card mb-6">
		<h1 class="mb-3 text-2xl font-bold">{data.site.tagline}</h1>
		<form role="search" class="flex max-w-lg gap-2">
			<label class="sr-only" for="q">Search restaurants and dishes</label>
			<input id="q" name="q" class="field !mt-0 flex-1" placeholder="Search restaurants and dishes" defaultValue={data.q} />
			<button class="btn">Search</button>
		</form>
	</section>
	<h2 class="mb-3 text-lg font-semibold">{data.q ? `Results for “${data.q}”` : 'Restaurants near you'}</h2>
	<ul class="grid gap-4 sm:grid-cols-2">
		{#each data.restaurants as r (r.id)}
			<li class="card">
				<a href="/r/{r.id}" class="text-lg font-semibold hover:underline">{r.name}</a>
				<p class="text-sm text-muted">{r.cuisine} · {(r.rating / 10).toFixed(1)} ★ ({r.reviews.toLocaleString('en-US')}) · {r.etaMinutes} min · {money(r.deliveryFeeCents)} delivery fee</p>
			</li>
		{:else}
			<li class="card text-muted">No restaurants match “{data.q}”.</li>
		{/each}
	</ul>
{:else}
	<nav aria-label="Departments" class="mb-6 flex flex-wrap gap-2 text-sm">
		{#each data.categories ?? [] as c (c)}<a href="/search?category={encodeURIComponent(c)}" class="rounded-site bg-surface px-3 py-1 ring-1 ring-current/15 hover:underline">{c}</a>{/each}
	</nav>
	<h1 class="mb-3 text-xl font-bold">Popular right now</h1>
	<ProductList items={data.popular ?? []} layout={data.site.layout.catalog} />
{/if}
