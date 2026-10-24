<script lang="ts">
	import { airport } from '#lib/airline.ts';
	import { clock, longDate } from '#lib/time.ts';
	let { data } = $props();
	const [y, m] = $derived(data.today.split('-').map(Number) as [number, number]);
</script>

<h1 class="text-2xl font-bold">{data.me.name}</h1>
<p class="mb-5 text-muted">{data.me.email}</p>
<section class="card mb-4">
	<h2 class="mb-2 font-semibold">Your trips</h2>
	{#if data.trips.length}
		<ul class="space-y-2 text-sm">
			{#each data.trips as t (t.code)}
				<li>
					<a class="font-mono font-semibold underline" href="/trips/{t.code}">{t.code}</a>:
					{#each t.legs as l, i (l.flight.id)}{i ? '; ' : ''}{l.flight.number} {airport(l.flight.origin)} → {airport(l.flight.destination)}, {longDate(l.flight.departsAt.slice(0, 10))} {clock(l.flight.departsAt)}{/each}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm">No trips yet.</p>
	{/if}
</section>
<section class="card mb-4">
	<h2 class="mb-2 font-semibold">Saved cards</h2>
	<ul class="space-y-1 text-sm">
		{#each data.cards as c (c.id)}
			{@const old = c.expYear < y || (c.expYear === y && c.expMonth < m)}
			<li>{c.brand} ending in {c.last4}, {old ? 'expired' : 'expires'} {String(c.expMonth).padStart(2, '0')}/{String(c.expYear).slice(2)}</li>
		{/each}
	</ul>
</section>
<form method="POST" action="/account/sign-out"><button class="btn-quiet">Sign out</button></form>
