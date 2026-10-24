<script lang="ts">
	import { money } from '../time.ts';

	// Products as a grid of cards or a list of rows; the same links either way.
	let { items, layout = 'grid' }: { items: { id: string; name: string; category: string; priceCents: number; rating: number; reviews: number; inStock: boolean }[]; layout?: 'grid' | 'list' } = $props();
	const stars = (p: { rating: number; reviews: number }) => `${(p.rating / 10).toFixed(1)} out of 5 stars, ${p.reviews.toLocaleString('en-US')} ratings`;
</script>

<ul class={layout === 'grid' ? 'grid grid-cols-2 gap-4 sm:grid-cols-4' : 'divide-y divide-current/10 rounded-site bg-surface ring-1 ring-current/10'}>
	{#each items as p (p.id)}
		<li class={layout === 'grid' ? 'card flex flex-col gap-1' : 'flex items-center justify-between gap-4 px-4 py-3'}>
			<div class="flex flex-col gap-0.5">
				<a href="/p/{p.id}" class="font-semibold hover:underline">{p.name}</a>
				<span class="text-xs text-muted">{p.category} · <span aria-label={stars(p)}>{(p.rating / 10).toFixed(1)} ★ ({p.reviews.toLocaleString('en-US')})</span></span>
			</div>
			<div class={layout === 'grid' ? 'mt-auto' : 'text-right'}>
				<span class="text-lg font-bold">{money(p.priceCents)}</span>
				{#if !p.inStock}<span class="block text-xs font-semibold text-red-600">Out of stock</span>{/if}
			</div>
		</li>
	{:else}
		<li class="text-muted">Nothing matches.</li>
	{/each}
</ul>
