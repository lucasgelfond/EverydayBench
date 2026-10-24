<script lang="ts">
	import { shortDate } from '../time.ts';

	// The next seven days; each a link, so the choice lives in the URL (?date=).
	let { days, selected, href }: { days: string[]; selected: string; href: (date: string) => string } = $props();
</script>

<nav aria-label="Dates" class="flex gap-2 overflow-x-auto pb-1">
	{#each days as d, i (d)}
		<a
			href={href(d)}
			data-sveltekit-noscroll
			aria-current={d === selected ? 'date' : undefined}
			class="shrink-0 rounded-site border px-3 py-2 text-center text-sm {d === selected ? 'border-brand bg-brand text-brand-ink' : 'border-current/20 hover:border-brand'}"
		>
			<span class="block font-semibold">{i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : shortDate(d).split(' ')[0]}</span>
			<span class="block text-xs opacity-80">{shortDate(d)}</span>
		</a>
	{/each}
</nav>
