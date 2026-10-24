<script lang="ts">
	import { money } from '#lib/time.ts';
	let { data } = $props();
</script>

<h1 class="text-2xl font-bold">{data.me.name}</h1>
<p class="mb-5 text-muted">{data.me.email}</p>
<section class="card mb-4">
	<h2 class="mb-2 font-semibold">Your orders</h2>
	{#each data.orders as o (o.code)}
		<p><a class="font-mono underline" href="/orders/{o.code}">{o.code}</a> · {o.items} · {money(o.totalCents)}</p>
	{:else}<p class="text-muted">No orders yet.</p>{/each}
</section>
<section class="card mb-4">
	<h2 class="mb-2 font-semibold">Addresses</h2>
	{#each data.addresses as a (a.id)}<p>{a.text}</p>{:else}<p class="text-muted">No saved addresses.</p>{/each}
</section>
<section class="card mb-4">
	<h2 class="mb-2 font-semibold">Payment methods</h2>
	{#each data.cards as c (c.last4)}<p>{c.brand} ending in {c.last4}</p>{:else}<p class="text-muted">No saved cards.</p>{/each}
</section>
<form method="POST" action="/account/sign-out"><button class="btn-quiet">Sign out</button></form>
