<script lang="ts">
	// One cabin of the aircraft, front at the top. Every open seat is a link that picks it in the URL, so it works without
	// JavaScript, and reads as "Row 12, seat A, window, available" (with its price, when it has one).
	import { EXIT_ROWS, seatKind, type Cabin } from '#lib/airline.ts';
	import { money } from '#lib/time.ts';

	let {
		cabin,
		taken,
		selected,
		fee,
		href
	}: {
		cabin: Cabin;
		taken: string[];
		selected: string | null;
		// What a seat costs to pick (0: free).
		fee: (seat: string) => number;
		href: (seat: string | null) => string;
	} = $props();

	const held = $derived(new Set(taken));
	const rows = $derived(Array.from({ length: cabin.last - cabin.first + 1 }, (_, i) => cabin.first + i));
	const letters = $derived([...cabin.letters]);
	// The aisle runs between C and D.
	const aisleAfter = 'C';
</script>

<div class="overflow-x-auto" role="group" aria-label="{cabin.name} seat map">
	<p class="mb-2 text-center text-xs tracking-widest text-muted uppercase">Front of plane</p>
	<div class="mx-auto w-max space-y-1">
		<div class="flex items-center gap-1 text-center text-xs font-semibold text-muted" aria-hidden="true">
			<span class="w-7"></span>
			{#each letters as l (l)}<span class="w-8">{l}</span>{#if l === aisleAfter}<span class="w-6"></span>{/if}{/each}
		</div>
		{#each rows as row (row)}
			<div class="flex items-center gap-1">
				<span class="w-7 text-center text-xs font-semibold text-muted" aria-hidden="true">{row}</span>
				{#each letters as l (l)}
					{@const seat = `${row}${l}`}
					{@const kind = seatKind(seat)}
					{#if held.has(seat)}
						<span class="grid size-8 place-items-center rounded-md bg-current/15 text-[10px] opacity-50" role="img" aria-label="Row {row}, seat {l}, {kind}, unavailable">×</span>
					{:else}
						{@const on = selected === seat}
						{@const cost = fee(seat)}
						<a
							href={href(on ? null : seat)}
							data-sveltekit-noscroll
							data-sveltekit-replacestate
							aria-label="Row {row}, seat {l}, {kind}, {on ? 'selected' : cost ? money(cost) : 'available'}"
							class="grid size-8 place-items-center rounded-md text-[10px] font-semibold {on ? 'bg-brand text-brand-ink' : cost ? 'bg-amber-400/25 ring-1 ring-amber-600/60 hover:bg-brand/40' : 'bg-current/5 ring-1 ring-current/40 hover:bg-brand/40'}"
							>{cost && !on ? '$' : l}</a
						>
					{/if}
					{#if l === aisleAfter}<span class="w-6" aria-hidden="true"></span>{/if}
				{/each}
				{#if EXIT_ROWS.includes(row)}<span class="ml-1 text-[10px] font-semibold text-muted uppercase">Exit</span>{/if}
			</div>
		{/each}
	</div>
	<ul class="mt-4 flex flex-wrap justify-center gap-5 text-xs" aria-label="Legend">
		<li class="flex items-center gap-1.5"><span class="size-4 rounded bg-current/5 ring-1 ring-current/40"></span>Available</li>
		<li class="flex items-center gap-1.5"><span class="size-4 rounded bg-amber-400/25 ring-1 ring-amber-600/60"></span>Extra cost</li>
		<li class="flex items-center gap-1.5"><span class="size-4 rounded bg-brand"></span>Selected</li>
		<li class="flex items-center gap-1.5"><span class="size-4 rounded bg-current/15"></span>Unavailable</li>
	</ul>
</div>
