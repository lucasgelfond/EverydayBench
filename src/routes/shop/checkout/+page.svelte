<script lang="ts">
	import CardFields from '#lib/ui/CardFields.svelte';
	import { money } from '#lib/time.ts';
	let { data, form } = $props();
	// Defaults: the first saved address and card, the default tip. The page's data doesn't change while it's open.
	let address = $state((() => (data.addresses[0] ? `saved:${data.addresses[0].id}` : 'new'))());
	let payment = $state((() => (data.cards[0] ? `saved:${data.cards[0].id}` : 'card'))());
	let tip = $state((() => data.defaultTip)());
	const delivery = $derived(data.tips.length > 0);
	const tipCents = $derived(Math.round((data.costs.subtotalCents * tip) / 100));
	const total = $derived(data.costs.subtotalCents + data.costs.shippingCents + data.costs.serviceCents + data.costs.taxCents + (delivery ? tipCents : 0));
	const v: Record<string, string> = $derived(form?.values ?? {});
</script>

<h1 class="mb-4 text-2xl font-bold">Checkout</h1>
<div class="grid gap-5 md:grid-cols-[1fr_18rem]">
	<form method="POST" class="card space-y-5">
		{#if data.account}
			<p class="text-sm">Signed in as <strong>{data.account.name}</strong> ({data.account.email})</p>
		{:else}
			<p class="text-sm">Have an account? <a class="font-semibold underline" href="/account/sign-in?next=/checkout">{data.words.signIn}</a> to use your saved address and card, or check out as a guest.</p>
		{/if}
		<label class="label">Email for your receipt <input class="field" name="email" type="email" autocomplete="email" required defaultValue={v.email ?? data.account?.email ?? ''} /></label>
		<fieldset class="space-y-2">
			<legend class="mb-1 font-semibold">{delivery ? 'Deliver to' : 'Ship to'}</legend>
			{#each data.addresses as a (a.id)}
				<label class="flex items-center gap-3 rounded-site p-3 ring-1 ring-current/20"><input type="radio" name="address" value="saved:{a.id}" bind:group={address} /> {a.name}, {a.line1}, {a.city} {a.zip}</label>
			{/each}
			<label class="flex items-center gap-3 rounded-site p-3 ring-1 ring-current/20"><input type="radio" name="address" value="new" bind:group={address} /> {data.addresses.length ? 'A different address' : 'Enter an address'}</label>
		</fieldset>
		{#if address === 'new'}
			<fieldset class="grid grid-cols-6 gap-3">
				<legend class="mb-2 font-semibold">Address</legend>
				<label class="label col-span-6">Full name <input class="field" name="shipName" autocomplete="shipping name" defaultValue={v.shipName ?? ''} /></label>
				<label class="label col-span-6">Street address <input class="field" name="line1" autocomplete="shipping address-line1" defaultValue={v.line1 ?? ''} /></label>
				<label class="label col-span-4">City <input class="field" name="city" autocomplete="shipping address-level2" defaultValue={v.city ?? ''} /></label>
				<label class="label col-span-2">ZIP code <input class="field" name="shipZip" inputmode="numeric" autocomplete="shipping postal-code" defaultValue={v.shipZip ?? ''} /></label>
			</fieldset>
		{/if}
		<fieldset class="space-y-2">
			<legend class="mb-1 font-semibold">Payment</legend>
			{#each data.cards as c (c.id)}
				<label class="flex items-center gap-3 rounded-site p-3 ring-1 ring-current/20"><input type="radio" name="payment" value="saved:{c.id}" bind:group={payment} /> {c.brand} ending in {c.last4} <span class="text-sm text-muted">exp {String(c.expMonth).padStart(2, '0')}/{String(c.expYear).slice(2)}</span></label>
			{/each}
			<label class="flex items-center gap-3 rounded-site p-3 ring-1 ring-current/20"><input type="radio" name="payment" value="card" bind:group={payment} /> {data.cards.length ? 'Use a different card' : 'Credit or debit card'}</label>
		</fieldset>
		{#if payment === 'card'}<CardFields values={v} />{/if}
		{#if delivery}
			<fieldset>
				<legend class="mb-2 font-semibold">Tip your courier</legend>
				<div class="flex flex-wrap gap-2">
					{#each data.tips as t (t)}
						<label class="flex items-center gap-2 rounded-site px-3 py-2 ring-1 ring-current/20"><input type="radio" name="tip" value={t} bind:group={tip} /> {t ? `${t}% (${money(Math.round((data.costs.subtotalCents * t) / 100))})` : 'No tip'}</label>
					{/each}
				</div>
			</fieldset>
		{/if}
		{#if form?.error}<p class="font-semibold text-red-600" role="alert">{form.error}</p>{/if}
		<button class="btn w-full">{data.words.placeOrder} · {money(total)}</button>
	</form>
	<aside class="card h-fit text-sm" aria-label="Order summary">
		<h2 class="mb-2 font-semibold">{data.merchant ?? 'Order summary'}</h2>
		<ul class="space-y-1">
			{#each data.lines as l (l.id)}<li class="flex justify-between gap-3"><span>{l.quantity} × {l.name}</span><span>{money(l.priceCents * l.quantity)}</span></li>{/each}
		</ul>
		<dl class="mt-3 space-y-1 border-t border-current/10 pt-3">
			<div class="flex justify-between"><dt>Subtotal</dt><dd>{money(data.costs.subtotalCents)}</dd></div>
			<div class="flex justify-between"><dt>{delivery ? 'Delivery fee' : 'Shipping'}</dt><dd>{data.costs.shippingCents ? money(data.costs.shippingCents) : 'Free'}</dd></div>
			{#if delivery}<div class="flex justify-between"><dt>Service fee</dt><dd>{money(data.costs.serviceCents)}</dd></div>{/if}
			<div class="flex justify-between"><dt>Estimated tax</dt><dd>{money(data.costs.taxCents)}</dd></div>
			{#if delivery}<div class="flex justify-between"><dt>Tip</dt><dd>{money(tipCents)}</dd></div>{/if}
			<div class="flex justify-between font-semibold"><dt>Total</dt><dd>{money(total)}</dd></div>
		</dl>
	</aside>
</div>
