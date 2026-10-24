<script lang="ts">
	import { longDate } from '#lib/time.ts';
	let { data } = $props();
</script>

<h1 class="mb-4 text-2xl font-bold">Trips</h1>
<ul class="space-y-3">
	{#each data.trips as { s, h } (s.code)}
		<li class="card"><a class="font-semibold hover:underline" href="/trips/{s.code}">{h.title}, {h.city}</a><p class="text-sm text-muted">{longDate(s.checkIn)} – {longDate(s.checkOut)} · {s.code}</p></li>
	{:else}
		<li class="text-muted">No trips booked yet.</li>
	{/each}
</ul>
