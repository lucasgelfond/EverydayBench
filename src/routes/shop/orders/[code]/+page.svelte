<script lang="ts">
	import { money } from '#lib/time.ts';
	let { data } = $props();
	const o = $derived(data.order);
</script>

<section class="card max-w-xl">
	<p class="text-sm font-semibold text-brand">Order placed</p>
	<h1 class="mt-1 text-2xl font-bold">{data.merchant ? `${data.merchant.name} (${data.merchant.area}) is preparing your order` : 'Thanks for your order'}</h1>
	<p class="mt-3 text-lg">Order number: <strong class="font-mono tracking-wider">{o.code}</strong></p>
	<ul class="mt-4 space-y-1 text-sm">
		{#each o.lines as l (l.product)}<li class="flex justify-between gap-3"><span>{l.quantity} × {l.name}</span><span>{money(l.priceCents * l.quantity)}</span></li>{/each}
	</ul>
	<dl class="mt-4 grid grid-cols-[9rem_1fr] gap-y-1 border-t border-current/10 pt-3 text-sm">
		<dt class="text-muted">{data.merchant ? 'Delivering to' : 'Shipping to'}</dt><dd>{o.shipTo}</dd>
		{#if data.merchant}<dt class="text-muted">Arrives in</dt><dd>about {data.merchant.etaMinutes} minutes</dd>{/if}
		<dt class="text-muted">Total</dt><dd>{money(o.totalCents)} (card ending in {o.cardLast4}){o.tipCents ? `, including a ${money(o.tipCents)} tip` : ''}</dd>
		<dt class="text-muted">Receipt sent to</dt><dd>{o.email}</dd>
	</dl>
</section>
