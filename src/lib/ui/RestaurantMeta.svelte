<script lang="ts">
	// A restaurant's rating, cuisine, neighborhood and price, as listings show them.
	let { restaurant: r }: { restaurant: { rating: number; reviews: number; cuisine: string; area: string; price: number } } = $props();
</script>

<p class="text-sm text-muted">
	<span aria-label="Rated {r.rating.toFixed(1)} out of 5 from {r.reviews} reviews">★ {r.rating.toFixed(1)} ({r.reviews})</span>
	· {r.cuisine} · {r.area} · <span aria-label="Price {r.price} of 4">{'$'.repeat(r.price)}</span>
</p>
