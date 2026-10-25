<script lang="ts">
	import { money } from '#lib/time.ts';
	let { data, form } = $props();
	const delivery = $derived(data.site.kind === 'delivery');
</script>

<h1 class="mb-4 text-2xl font-bold">{data.words.cart}</h1>
{#if data.added}<p role="status" class="card mb-4 font-semibold text-green-700">Added to {data.words.cart.toLowerCase()}: {data.added}</p>{/if}
{#if form?.error}<p role="alert" class="mb-3 font-semibold text-red-600">{form.error}</p>{/if}
{#if data.lines.length}
	{#if data.merchant}<p class="mb-3">From <a class="font-semibold underline" href="/r/{data.merchant.id}">{data.merchant.name}</a> ({data.merchant.area})</p>{/if}
	<ul class="card divide-y divide-current/10" aria-label="Items">
		{#each data.lines as l (l.id)}
			<li class="flex flex-wrap items-center justify-between gap-3 py-3">
				<div>
					{#if delivery}<span class="font-semibold">{l.name}</span>{:else}<a href="/p/{l.id}" class="font-semibold hover:underline">{l.name}</a>{/if}
					<span class="block text-sm text-muted">{money(l.priceCents)} each{l.inStock ? '' : ' · Out of stock'}</span>
				</div>
				<form method="POST" action="?/update" class="flex items-center gap-2">
					<input type="hidden" name="product" value={l.id} />
					<label class="text-sm">Quantity of {l.name}
						<select name="quantity" class="field !mt-0 inline-block w-20">{#each Array.from({ length: data.max + 1 }, (_, i) => i) as n (n)}<option value={n} selected={n === l.quantity}>{n}</option>{/each}</select>
					</label>
					<button class="btn-quiet text-sm">Update</button>
				</form>
				<form method="POST" action="?/update">
					<input type="hidden" name="product" value={l.id} />
					<input type="hidden" name="quantity" value="0" />
					<button class="btn-quiet text-sm" aria-label="Remove {l.name}">Remove</button>
				</form>
				<span class="w-20 text-right font-semibold">{money(l.priceCents * l.quantity)}</span>
			</li>
		{/each}
	</ul>
	<div class="mt-4 flex items-center justify-end gap-4">
		<p>Subtotal ({data.lines.reduce((n, l) => n + l.quantity, 0)} items): <strong>{money(data.subtotalCents)}</strong></p>
		<a class="btn" href="/checkout">{data.words.checkout}</a>
	</div>
{:else}
	<p class="card text-muted">Your {data.words.cart.toLowerCase()} is empty. <a class="underline" href="/">Keep shopping</a></p>
{/if}
