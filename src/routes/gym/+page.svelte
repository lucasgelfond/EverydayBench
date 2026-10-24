<script lang="ts">
	let { data } = $props();
</script>

<section class="mb-8 rounded-site bg-brand/10 p-8">
	<h1 class="text-3xl font-black">Dive in. Sweat out.</h1>
	<p class="mt-2 text-muted">Yoga, cycling, strength and more at three locations. Classes are free for members.</p>
	<a class="btn mt-4" href="/schedule">See the class schedule</a>
</section>
<h2 class="mb-3 text-lg font-bold">Locations</h2>
<ul class="grid gap-4 md:grid-cols-3">
	{#each data.locations as l (l.id)}
		<li class="card">
			<h3 class="font-semibold">{l.name}</h3>
			<p class="text-sm text-muted">{l.address}</p>
			<a class="mt-2 inline-block text-sm text-brand underline" href="/schedule?location={l.id}">Schedule</a>
		</li>
	{/each}
</ul>
