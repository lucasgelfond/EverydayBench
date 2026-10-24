<script lang="ts">
	import ProductList from '#lib/ui/ProductList.svelte';
	let { data } = $props();
	const q = (category: string) => `?${new URLSearchParams({ ...(data.q && { q: data.q }), ...(category && { category }) })}`;
</script>

<h1 class="mb-1 text-xl font-bold">{data.q ? `Results for “${data.q}”` : data.category || 'All products'}</h1>
<p class="mb-4 text-sm text-muted">{data.results.length} result{data.results.length === 1 ? '' : 's'}</p>
<nav aria-label="Departments" class="mb-4 flex flex-wrap gap-2 text-sm">
	{#each ['', ...data.categories] as c (c)}
		<a href={q(c)} aria-current={c === data.category ? 'true' : undefined} class="rounded-site px-3 py-1 {c === data.category ? 'bg-brand text-brand-ink' : 'bg-surface ring-1 ring-current/15'}">{c || 'All departments'}</a>
	{/each}
</nav>
<ProductList items={data.results} layout={data.site.layout.catalog} />
