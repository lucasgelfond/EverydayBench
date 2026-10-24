<script lang="ts">
	let { data } = $props();
</script>

<div class="grid gap-5 md:grid-cols-[1fr_16rem]">
	<section class="card space-y-3">
		<h1 class="text-2xl font-bold">Notices</h1>
		<article><h2 class="font-semibold">Water shut-off, Thursday 10 AM–noon</h2><p class="text-sm text-muted">Riser work on floors 3–5. Please don’t run dishwashers or washing machines.</p></article>
		<article><h2 class="font-semibold">Package room hours</h2><p class="text-sm text-muted">The package room is open 7 AM–10 PM daily. Bring your fob.</p></article>
	</section>
	<aside class="card h-fit space-y-2 text-sm">
		{#if data.account}
			<a class="btn w-full" href="/maintenance/new">Request maintenance</a>
			<a class="block text-center underline" href="/maintenance">Your requests</a>
		{:else}
			<p>Residents: sign in to request maintenance and see your requests.</p>
			<a class="btn w-full" href="/account/sign-in">Resident sign-in</a>
		{/if}
	</aside>
</div>
