<script lang="ts">
	import { clock } from '#lib/time.ts';
	let { data } = $props();
</script>

<section class="card mx-auto max-w-xl space-y-5">
	<h1 class="text-2xl font-bold">Reserve a table</h1>
	<form method="GET" class="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
		<label class="label">Guests
			<select class="field" name="party">{#each data.options.parties as o (o.value)}<option value={o.value} selected={o.value === data.party}>{o.label}</option>{/each}</select>
		</label>
		<label class="label">Day
			<select class="field" name="date">{#each data.options.dates as o (o.value)}<option value={o.value} selected={o.value === data.date}>{o.label}</option>{/each}</select>
		</label>
		<button class="btn self-end">Check availability</button>
	</form>
	{#if data.times}
		{#if data.times.length}
			<form method="GET" action="/reserve/details" class="space-y-4">
				<input type="hidden" name="party" value={data.party} />
				<fieldset>
					<legend class="mb-2 font-semibold">Available times</legend>
					<div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
						{#each data.times as t, i (t)}
							<label class="flex items-center gap-2 rounded-site p-2 ring-1 ring-current/20"><input type="radio" name="at" value={t} required checked={i === 0} /> {clock(t)}</label>
						{/each}
					</div>
				</fieldset>
				<button class="btn w-full">Continue</button>
			</form>
		{:else}
			<p role="status">We're fully booked that day for {data.party}. Please try another day.</p>
		{/if}
	{/if}
</section>
