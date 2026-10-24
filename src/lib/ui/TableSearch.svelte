<script lang="ts">
	// A reservations site's search: a plain GET form, so it works before JavaScript and when filled by a script.
	type Option = { value: string | number; label: string };
	let {
		options,
		values,
		areas,
		cuisines,
		submit
	}: {
		options: { dates: Option[]; times: Option[]; parties: Option[] };
		values: { date: string; time: string; party: number; area: string; cuisine: string };
		areas: string[];
		cuisines: string[];
		submit: string;
	} = $props();
</script>

<form method="GET" action="/search" role="search" class="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
	<label class="label">Date
		<select class="field" name="date">{#each options.dates as o (o.value)}<option value={o.value} selected={o.value === values.date}>{o.label}</option>{/each}</select>
	</label>
	<label class="label">Time
		<select class="field" name="time">{#each options.times as o (o.value)}<option value={o.value} selected={o.value === values.time}>{o.label}</option>{/each}</select>
	</label>
	<label class="label">Party size
		<select class="field" name="party">{#each options.parties as o (o.value)}<option value={o.value} selected={o.value === values.party}>{o.label}</option>{/each}</select>
	</label>
	<label class="label">Neighborhood
		<select class="field" name="area"><option value="">Anywhere</option>{#each areas as a (a)}<option value={a} selected={a === values.area}>{a}</option>{/each}</select>
	</label>
	<label class="label">Cuisine
		<select class="field" name="cuisine"><option value="">Any cuisine</option>{#each cuisines as c (c)}<option value={c} selected={c === values.cuisine}>{c}</option>{/each}</select>
	</label>
	<button class="btn self-end">{submit}</button>
</form>
