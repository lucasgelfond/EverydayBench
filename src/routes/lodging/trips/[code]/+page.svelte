<script lang="ts">
	import { longDate, money } from '#lib/time.ts';
	let { data } = $props();
</script>

<article class="card mx-auto max-w-lg space-y-2">
	<p class="text-sm font-semibold text-brand">Reservation confirmed</p>
	<h1 class="text-2xl font-bold">{data.h.title}</h1>
	<p>Confirmation code: <strong class="font-mono">{data.s.code}</strong></p>
	<p>{longDate(data.s.checkIn)} – {longDate(data.s.checkOut)} · {data.s.guests} {data.s.guests === 1 ? 'guest' : 'guests'}</p>
	<p>{data.h.area}, {data.h.city} · hosted by {data.h.host}</p>
	<p>Total paid: {money(data.s.totalCents)} (card ending in {data.s.cardLast4})</p>
</article>
