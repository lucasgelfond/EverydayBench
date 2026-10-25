<script lang="ts">
	import CardFields from '#lib/ui/CardFields.svelte';
	import { clock, longDate, money } from '#lib/time.ts';
	let { data, form } = $props();
	// The first saved card by default; the page's data doesn't change while it's open.
	let payment = $state((() => (data.cards[0] ? `saved:${data.cards[0].id}` : 'card'))());
</script>

<h1 class="mb-4 text-2xl font-bold">Checkout</h1>
<div class="grid gap-5 md:grid-cols-[1fr_18rem]">
	<form method="POST" class="card space-y-5">
		{#if data.account}
			<p class="text-sm">Signed in as <strong>{data.account.name}</strong> ({data.account.email})</p>
		{:else}
			<p class="text-sm">Have an account? <a class="font-semibold underline" href="/account/sign-in?next={encodeURIComponent(data.back)}">{data.words.signIn}</a> to use a saved card, or check out as a guest.</p>
		{/if}
		<label class="label">Email for your tickets <input class="field" name="email" type="email" autocomplete="email" required defaultValue={form?.values?.email ?? data.account?.email ?? ''} /></label>
		<fieldset class="space-y-2">
			<legend class="mb-1 font-semibold">Payment</legend>
			{#each data.cards as c (c.id)}
				<label class="flex items-center gap-3 rounded-site p-3 ring-1 ring-current/20"><input type="radio" name="payment" value="saved:{c.id}" bind:group={payment} /> {c.brand} ending in {c.last4} <span class="text-sm text-muted">exp {String(c.expMonth).padStart(2, '0')}/{String(c.expYear).slice(2)}</span></label>
			{/each}
			<label class="flex items-center gap-3 rounded-site p-3 ring-1 ring-current/20"><input type="radio" name="payment" value="card" bind:group={payment} /> {data.cards.length ? 'Use a different card' : 'Credit or debit card'}</label>
		</fieldset>
		{#if payment === 'card'}<CardFields values={form?.values ?? {}} />{/if}
		{#if form?.error}<p class="font-semibold text-red-600" role="alert">{form.error}</p>{/if}
		<button class="btn w-full">{data.words.purchase} · {money(data.totalCents)}</button>
	</form>
	<aside class="card h-fit text-sm">
		<h2 class="mb-2 font-semibold">{data.film}</h2>
		<p>{longDate(data.show.startsAt.slice(0, 10))}, {clock(data.show.startsAt)}</p>
		<p>{data.theater} · {data.room}</p>
		<p class="mt-2">Seats: <strong>{data.seats.join(', ')}</strong></p>
		<dl class="mt-3 space-y-1 border-t border-current/10 pt-3">
			<div class="flex justify-between"><dt>Tickets ({data.seats.length})</dt><dd>{money(data.subtotalCents)}</dd></div>
			{#each data.lines as l (l.label)}<div class="flex justify-between"><dt>{l.label}</dt><dd>{money(l.cents)}</dd></div>{/each}
			<div class="flex justify-between font-semibold"><dt>Total</dt><dd>{money(data.totalCents)}</dd></div>
		</dl>
	</aside>
</div>
