<script lang="ts">
	import { clock } from '../time.ts';

	// A film's times at a theater: a grid of buttons or a list with formats and what's left; the same links either way.
	let { shows, layout = 'grid' }: { shows: { id: string; startsAt: string; format: string; left: number }[]; layout?: 'grid' | 'list' } = $props();
</script>

{#if layout === 'list'}
	<ul class="divide-y divide-current/10">
		{#each shows as s (s.id)}
			<li class="flex items-center justify-between py-2">
				<span>{s.format}{s.left === 0 ? ' · Sold out' : s.left < 15 ? ` · ${s.left} left` : ''}</span>
				{#if s.left > 0}<a href="/showtimes/{s.id}" class="btn-quiet font-semibold">{clock(s.startsAt)}</a>{:else}<span class="opacity-50">{clock(s.startsAt)}</span>{/if}
			</li>
		{/each}
	</ul>
{:else}
	<ul class="flex flex-wrap gap-2">
		{#each shows as s (s.id)}
			<li>
				{#if s.left > 0}
					<a href="/showtimes/{s.id}" class="btn-quiet flex-col !items-start" aria-label="{clock(s.startsAt)}, {s.format}{s.left < 15 ? `, ${s.left} seats left` : ''}">
						<span class="font-semibold">{clock(s.startsAt)}</span>
						<span class="text-[11px] opacity-70">{s.format}{s.left < 15 ? ` · ${s.left} left` : ''}</span>
					</a>
				{:else}
					<span class="btn-quiet pointer-events-none opacity-40" aria-label="{clock(s.startsAt)}, sold out">{clock(s.startsAt)} · Sold out</span>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
