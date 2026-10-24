<script lang="ts">
	import { AIRPORTS } from '#lib/airline.ts';
	let { data } = $props();
	const codes = Object.keys(AIRPORTS).sort((a, b) => AIRPORTS[a]!.localeCompare(AIRPORTS[b]!));
</script>

<h1 class="mb-1 text-2xl font-bold">Where to next?</h1>
<p class="mb-5 text-muted">Prices are per person and include taxes and fees.</p>
<form method="GET" action="/flights" class="card grid max-w-2xl gap-4 sm:grid-cols-2" role="search" aria-label="Search flights">
	<fieldset class="flex gap-5 sm:col-span-2">
		<legend class="sr-only">Trip</legend>
		<label class="flex items-center gap-2"><input type="radio" name="trip" value="round" checked /> Round trip</label>
		<label class="flex items-center gap-2"><input type="radio" name="trip" value="one" /> One-way</label>
	</fieldset>
	<div>
		<label class="label" for="from">From</label>
		<select class="field" id="from" name="from" required>
			<option value="">Choose an airport</option>
			{#each codes as c (c)}<option value={c}>{AIRPORTS[c]} ({c})</option>{/each}
		</select>
	</div>
	<div>
		<label class="label" for="to">To</label>
		<select class="field" id="to" name="to" required>
			<option value="">Choose an airport</option>
			{#each codes as c (c)}<option value={c}>{AIRPORTS[c]} ({c})</option>{/each}
		</select>
	</div>
	<label class="label">Depart <input class="field" type="date" name="date" min={data.today} defaultValue={data.today} required /></label>
	<label class="label">Return <span class="font-normal text-muted">(round trip)</span> <input class="field" type="date" name="return" min={data.today} /></label>
	<button class="btn sm:col-span-2">Search flights</button>
</form>
