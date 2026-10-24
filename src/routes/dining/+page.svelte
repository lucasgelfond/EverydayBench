<script lang="ts">
	import TableSearch from '#lib/ui/TableSearch.svelte';
	import RestaurantMeta from '#lib/ui/RestaurantMeta.svelte';
	let { data } = $props();
</script>

{#if data.restaurant}
	<section class="card mb-6">
		<h1 class="text-3xl font-bold">{data.restaurant.name}</h1>
		<p class="mt-2 text-lg">{data.restaurant.blurb}</p>
		<p class="mt-2 text-sm text-muted">{data.restaurant.address}, {data.restaurant.area}. Lunch daily 11:30 to 2; dinner nightly from 5.</p>
		<a class="btn mt-4" href="/reserve">Reserve a table</a>
	</section>
	<section class="card">
		<h2 class="mb-3 text-xl font-semibold">Menu</h2>
		<ul class="space-y-2">
			<li><strong>Tagliatelle al ragù</strong> · slow-cooked beef and pork, Parmigiano</li>
			<li><strong>Cacio e pepe</strong> · tonnarelli, pecorino, black pepper</li>
			<li><strong>Branzino al forno</strong> · wood-fired, salsa verde</li>
			<li><strong>Tiramisù</strong> · made each morning</li>
		</ul>
		<p class="mt-3 text-sm text-muted">Parties of more than six: please call us at (555) 014-2290.</p>
	</section>
{:else if data.options}
	<section class="card mb-8">
		<h1 class="mb-4 text-2xl font-bold">{data.site.tagline}</h1>
		<TableSearch options={data.options} values={data.values} areas={data.areas} cuisines={data.cuisines} submit={data.words.findTable} />
	</section>
	<h2 class="mb-3 text-lg font-semibold">Top rated</h2>
	<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.popular as r (r.id)}
			<li class="card">
				<a href="/r/{r.id}" class="font-semibold hover:underline">{r.name}</a>
				<RestaurantMeta restaurant={r} />
			</li>
		{/each}
	</ul>
{/if}
