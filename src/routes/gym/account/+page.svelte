<script lang="ts">
	import { clock, longDate } from '#lib/time.ts';
	let { data } = $props();
</script>

<h1 class="mb-4 text-2xl font-bold">My classes</h1>
<ul class="space-y-2">
	{#each data.booked as c (c.id)}
		<li class="card"><a class="font-semibold hover:underline" href="/classes/{c.id}">{c.name}</a> <span class="text-sm text-muted">· {longDate(c.startsAt.slice(0, 10))}, {clock(c.startsAt)} · {c.instructor}</span></li>
	{:else}
		<li class="text-muted">No classes booked.</li>
	{/each}
</ul>
<form method="POST" action="/account/sign-out" class="mt-6"><button class="btn-quiet">Sign out</button></form>
