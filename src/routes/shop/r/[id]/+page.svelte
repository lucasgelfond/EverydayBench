<script lang="ts">
	import { money } from '#lib/time.ts';
	let { data } = $props();
	const m = $derived(data.merchant);
</script>

<a href="/" class="text-sm text-muted hover:underline">← All restaurants</a>
<h1 class="mt-2 text-3xl font-bold">{m.name}</h1>
<p class="mb-4 text-muted">{m.cuisine} · {(m.rating / 10).toFixed(1)} ★ ({m.reviews.toLocaleString('en-US')}) · {m.etaMinutes} min · {money(m.deliveryFeeCents)} delivery fee</p>
{#if data.added}
	<p role="status" class="card mb-4 flex flex-wrap items-center justify-between gap-3">
		<span>Added {data.added} to your order.{data.fresh ? ' Your earlier items from another restaurant were removed: an order comes from one restaurant.' : ''}</span>
		<a class="btn" href="/cart">{data.words.cart} ({data.inCart})</a>
	</p>
{/if}
{#each data.sections as s (s.name)}
	<section class="mb-6">
		<h2 class="mb-2 text-lg font-semibold">{s.name}</h2>
		<ul class="grid gap-3 sm:grid-cols-2">
			{#each s.items as d (d.id)}
				<li class="card flex items-start justify-between gap-3">
					<div>
						<h3 class="font-semibold">{d.name}</h3>
						<p class="text-sm text-muted">{d.description}</p>
						<p class="mt-1 font-semibold">{money(d.priceCents)}</p>
					</div>
					<form method="POST" action="?/add">
						<input type="hidden" name="product" value={d.id} />
						<button class="btn shrink-0 whitespace-nowrap" aria-label="{data.words.addToCart}: {d.name}, {money(d.priceCents)}">+ Add</button>
					</form>
				</li>
			{/each}
		</ul>
	</section>
{/each}
