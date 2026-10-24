<script lang="ts">
	import CardFields from '#lib/ui/CardFields.svelte';
	import { airport, fareName } from '#lib/airline.ts';
	import { clock, longDate, money } from '#lib/time.ts';
	let { data, form } = $props();
	let payment = $state((() => (data.cards[0] ? `saved:${data.cards[0].id}` : 'card'))());
	const v = $derived(form?.values);
	const name = $derived((data.account?.name ?? '').split(' '));
</script>

<h1 class="mb-4 text-2xl font-bold">Who’s flying, and how you’ll pay</h1>
<div class="grid gap-5 md:grid-cols-[1fr_20rem]">
	<form method="POST" class="card space-y-5">
		{#if data.account}
			<p class="text-sm">Signed in as <strong>{data.account.name}</strong> ({data.account.email})</p>
		{:else}
			<p class="text-sm">Have an account? <a class="font-semibold underline" href="/account/sign-in?next={encodeURIComponent(data.back)}">{data.words.signIn}</a> to use a saved card, or book as a guest.</p>
		{/if}
		<fieldset class="grid gap-3 sm:grid-cols-2">
			<legend class="mb-1 font-semibold">Passenger, as on their ID</legend>
			<label class="label">First name <input class="field" name="first" autocomplete="given-name" required defaultValue={v?.first ?? name[0] ?? ''} /></label>
			<label class="label">Last name <input class="field" name="last" autocomplete="family-name" required defaultValue={v?.last ?? name.slice(1).join(' ')} /></label>
			<label class="label">Date of birth <input class="field" name="birth" autocomplete="bday" placeholder="MM/DD/YYYY" required defaultValue={v?.birth ?? ''} /></label>
			<label class="label">Email for your trip <input class="field" name="email" type="email" autocomplete="email" required defaultValue={v?.email ?? data.account?.email ?? ''} /></label>
		</fieldset>
		<fieldset class="space-y-2">
			<legend class="mb-1 font-semibold">Payment</legend>
			{#each data.cards as c (c.id)}
				<label class="flex items-center gap-3 rounded-site p-3 ring-1 ring-current/20"><input type="radio" name="payment" value="saved:{c.id}" bind:group={payment} /> {c.brand} ending in {c.last4} <span class="text-sm text-muted">exp {String(c.expMonth).padStart(2, '0')}/{String(c.expYear).slice(2)}</span></label>
			{/each}
			<label class="flex items-center gap-3 rounded-site p-3 ring-1 ring-current/20"><input type="radio" name="payment" value="card" bind:group={payment} /> {data.cards.length ? 'Use a different card' : 'Credit or debit card'}</label>
		</fieldset>
		{#if payment === 'card'}<CardFields values={v ?? {}} />{/if}
		{#if form?.error}<p class="font-semibold text-red-600" role="alert">{form.error}</p>{/if}
		<button class="btn w-full">{data.words.purchase} · {money(data.totalCents)}</button>
	</form>
	<aside class="card h-fit space-y-3 text-sm" aria-label="Your trip">
		{#each data.legs as l (l.i)}
			<div>
				<h2 class="font-semibold">{airport(l.flight.origin)} → {airport(l.flight.destination)}</h2>
				<p>{l.flight.number} · {longDate(l.flight.departsAt.slice(0, 10))}, {clock(l.flight.departsAt)}</p>
				<p>{fareName(l.fare)}: {money(l.cents)}</p>
				<p>Seat: {l.seat ?? 'not chosen'}{l.seatFee ? ` (${money(l.seatFee)})` : ''}</p>
			</div>
		{/each}
		<p class="border-t border-current/10 pt-3 font-semibold">Total: {money(data.totalCents)}</p>
	</aside>
</div>
