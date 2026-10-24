<script lang="ts">
	import { longDate, money } from '#lib/time.ts';
	let { data } = $props();
	const h = $derived(data.h);
	const keep = $derived(data.checkIn ? `&checkIn=${data.checkIn}&checkOut=${data.checkOut}&guests=${data.guests}` : '');
</script>

<a class="text-sm text-muted underline" href="/?city={encodeURIComponent(h.city)}{keep}">← {h.city}</a>
<div class="mt-2 flex items-start justify-between gap-4">
	<div>
		<h1 class="text-2xl font-bold">{h.title}</h1>
		<p class="text-muted">{h.kind} in {h.area}, {h.city} · hosted by {h.host}</p>
	</div>
	<form method="POST" action={data.isSaved ? `?/unsave${keep}` : `?/save${keep}`}>
		<button class="btn-quiet">{data.isSaved ? '♥ Saved to wishlist' : '♡ Save to wishlist'}</button>
	</form>
</div>
<div class="mt-5 grid gap-6 md:grid-cols-[1fr_20rem]">
	<section class="space-y-4">
		<p>{h.guests} guests · {h.bedrooms} {h.bedrooms === 1 ? 'bedroom' : 'bedrooms'} · {h.beds} {h.beds === 1 ? 'bed' : 'beds'} · {h.baths} {h.baths === 1 ? 'bath' : 'baths'}</p>
		<p>★ {(h.rating / 100).toFixed(2)} · {h.reviews} reviews</p>
		<p>{h.description}</p>
		<div>
			<h2 class="mb-1 font-semibold">What this place offers</h2>
			<ul class="grid grid-cols-2 gap-1 text-sm capitalize" aria-label="Amenities">{#each h.amenities as a (a)}<li>✓ {a}</li>{/each}</ul>
		</div>
	</section>
	<form action="/book" class="card h-fit space-y-3">
		<input type="hidden" name="home" value={h.id} />
		<p><strong class="text-xl">{money(h.nightlyCents)}</strong> night</p>
		<label class="label">Check in <input class="field" type="date" name="checkIn" required defaultValue={data.checkIn} /></label>
		<label class="label">Check out <input class="field" type="date" name="checkOut" required defaultValue={data.checkOut} /></label>
		<label class="label">Guests <input class="field" type="number" min="1" max={h.guests} name="guests" defaultValue={data.guests} /></label>
		{#if data.free === false}
			<p role="alert" class="text-sm font-semibold text-red-600">Not available {longDate(data.checkIn)} – {longDate(data.checkOut)}.</p>
		{:else if data.cost}
			<dl class="space-y-1 border-t border-current/10 pt-2 text-sm">
				<div class="flex justify-between"><dt>{money(h.nightlyCents)} × {data.nights} nights</dt><dd>{money(data.cost.subtotal)}</dd></div>
				<div class="flex justify-between"><dt>Cleaning fee</dt><dd>{money(data.cost.cleaning)}</dd></div>
				<div class="flex justify-between"><dt>Service fee</dt><dd>{money(data.cost.service)}</dd></div>
				<div class="flex justify-between font-semibold"><dt>Total</dt><dd>{money(data.cost.total)}</dd></div>
			</dl>
		{/if}
		<button class="btn w-full">Reserve</button>
	</form>
</div>
