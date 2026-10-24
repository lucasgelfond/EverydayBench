<script lang="ts">
	import { money } from '#lib/time.ts';
	let { data, form } = $props();
	const p = $derived(data.product);
</script>

<a href="/search?category={encodeURIComponent(p.category)}" class="text-sm text-muted hover:underline">← {p.category}</a>
<div class="mt-3 grid gap-6 md:grid-cols-[1fr_18rem]">
	<section>
		<h1 class="text-2xl font-bold">{p.name}</h1>
		<p class="mt-1 text-sm text-muted" aria-label="{(p.rating / 10).toFixed(1)} out of 5 stars, {p.reviews.toLocaleString('en-US')} ratings">{(p.rating / 10).toFixed(1)} ★ · {p.reviews.toLocaleString('en-US')} ratings</p>
		<p class="mt-4 max-w-prose">{p.description}</p>
	</section>
	<form method="POST" action="?/add" class="card h-fit space-y-3">
		<p class="text-2xl font-bold">{money(p.priceCents)}</p>
		{#if p.inStock}
			<p class="text-sm font-semibold text-green-700">In stock</p>
			<label class="label">Quantity
				<select name="quantity" class="field">{#each Array.from({ length: data.max }, (_, i) => i + 1) as n (n)}<option value={n}>{n}</option>{/each}</select>
			</label>
			{#if form?.error}<p class="text-sm font-semibold text-red-600" role="alert">{form.error}</p>{/if}
			<button class="btn w-full">{data.words.addToCart}</button>
		{:else}
			<p class="font-semibold text-red-600">Out of stock</p>
			<p class="text-sm text-muted">We don’t know when this item will be back.</p>
		{/if}
	</form>
</div>
