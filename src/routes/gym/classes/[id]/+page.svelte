<script lang="ts">
	import { clock, longDate } from '#lib/time.ts';
	let { data, form } = $props();
	const c = $derived(data.c);
</script>

<a class="text-sm text-muted underline" href="/schedule?location={c.location}&date={c.startsAt.slice(0, 10)}">← Schedule</a>
<article class="card mt-2 max-w-xl space-y-2">
	{#if data.just}<p role="status" class="rounded-site bg-brand/10 px-3 py-2 text-sm font-semibold">You’re booked. A confirmation is on its way to your email.</p>{/if}
	<h1 class="text-2xl font-bold">{c.name}</h1>
	<p>{longDate(c.startsAt.slice(0, 10))}, {clock(c.startsAt)} · {c.minutes} min</p>
	<p>With {c.instructor} · {data.location.name}, {c.room}</p>
	<p class="text-sm text-muted">{data.left > 0 ? `${data.left} spots left` : 'Full'}</p>
	{#if form?.error}<p role="alert" class="font-semibold text-red-600">{form.error}</p>{/if}
	{#if data.started}
		<p class="text-muted">This class has started.</p>
	{:else if data.booked}
		<p class="font-semibold">You’re booked into this class.</p>
		<form method="POST" action="?/cancel"><button class="btn-quiet">Cancel my spot</button></form>
	{:else if !data.signedIn}
		<a class="btn" href="/account/sign-in?next=/classes/{c.id}">Sign in to book</a>
	{:else}
		<form method="POST" action="?/book"><button class="btn" disabled={data.left < 1}>Book this class</button></form>
	{/if}
</article>
