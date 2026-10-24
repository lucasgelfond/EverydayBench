<script lang="ts">
	// Every seat is a link that toggles it in the URL (?seats=G9,G10): it works without JavaScript, and each has a name
	// an accessibility tree reads ("Row G, seat 9, available"). Row A is nearest the screen, wherever the screen is drawn.
	let {
		room,
		sold,
		selected,
		max,
		screen = 'top',
		screenLabel,
		href
	}: {
		room: { rows: number; cols: number; gaps: string[]; aisles: number[] };
		sold: string[];
		selected: string[];
		max: number;
		screen?: 'top' | 'bottom';
		screenLabel: string;
		href: (seats: string[]) => string;
	} = $props();

	const rows = $derived.by(() => {
		const all = Array.from({ length: room.rows }, (_, r) => String.fromCharCode(65 + r));
		return screen === 'top' ? all : all.reverse();
	});
	const taken = $derived(new Set(sold));
	const toggle = (seat: string) => (selected.includes(seat) ? selected.filter((s) => s !== seat) : [...selected, seat]);
</script>

{#snippet screenBar()}
	<div class="mx-auto my-3 w-3/4 rounded-full bg-current/15 py-1 text-center text-xs tracking-[0.3em] uppercase">{screenLabel}</div>
{/snippet}

<div class="overflow-x-auto" role="group" aria-label="Seat map">
	{#if screen === 'top'}{@render screenBar()}{/if}
	<div class="mx-auto w-max space-y-1.5">
		{#each rows as row (row)}
			<div class="flex items-center gap-1">
				<span class="w-5 text-center text-xs font-semibold opacity-60" aria-hidden="true">{row}</span>
				{#each Array.from({ length: room.cols }, (_, i) => i + 1) as n (n)}
					{@const seat = `${row}${n}`}
					{#if room.gaps.includes(seat)}
						<span class="size-7" aria-hidden="true"></span>
					{:else if taken.has(seat)}
						<span class="grid size-7 place-items-center rounded-t-lg bg-current/15 text-[10px] opacity-50" role="img" aria-label="Row {row}, seat {n}, unavailable">×</span>
					{:else}
						{@const on = selected.includes(seat)}
						{@const full = !on && selected.length >= max}
						<a
							href={full ? undefined : href(toggle(seat))}
							data-sveltekit-noscroll
							data-sveltekit-replacestate
							aria-label="Row {row}, seat {n}, {on ? 'selected' : 'available'}"
							aria-disabled={full || undefined}
							class="grid size-7 place-items-center rounded-t-lg text-[10px] font-semibold {on ? 'bg-brand text-brand-ink' : 'bg-current/5 ring-1 ring-current/40 hover:bg-brand/40'} {full ? 'pointer-events-none opacity-40' : ''}"
							>{n}</a
						>
					{/if}
					{#if room.aisles.includes(n)}<span class="w-4" aria-hidden="true"></span>{/if}
				{/each}
				<span class="w-5 text-center text-xs font-semibold opacity-60" aria-hidden="true">{row}</span>
			</div>
		{/each}
	</div>
	{#if screen === 'bottom'}{@render screenBar()}{/if}
	<ul class="mt-4 flex justify-center gap-5 text-xs" aria-label="Legend">
		<li class="flex items-center gap-1.5"><span class="size-4 rounded-t-md bg-current/5 ring-1 ring-current/40"></span>Available</li>
		<li class="flex items-center gap-1.5"><span class="size-4 rounded-t-md bg-brand"></span>Selected</li>
		<li class="flex items-center gap-1.5"><span class="size-4 rounded-t-md bg-current/15"></span>Unavailable</li>
	</ul>
</div>
