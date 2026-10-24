<script lang="ts">
	import { money } from '#lib/time.ts';
	let { data } = $props();
</script>

<h1 class="mb-4 text-2xl font-bold">Wishlist</h1>
<ul class="space-y-3" aria-label="Saved homes">
	{#each data.homes as h (h.id)}
		<li class="card flex items-center gap-4">
			<div class="flex-1">
				<a class="font-semibold hover:underline" href="/homes/{h.id}">{h.title}</a>
				<p class="text-sm text-muted">{h.kind} in {h.area}, {h.city} · {money(h.nightlyCents)} night</p>
			</div>
			<form method="POST" action="?/unsave"><input type="hidden" name="home" value={h.id} /><button class="btn-quiet text-sm" aria-label="Remove {h.title} from wishlist">Remove</button></form>
		</li>
	{:else}
		<li class="text-muted">Nothing saved yet. Tap ♡ on a home to save it.</li>
	{/each}
</ul>
