<script lang="ts">
	import { clock, longDate, shortDate } from '#lib/time.ts';
	let { data } = $props();
	const link = (o: { location?: string; date?: string; kind?: string }) => {
		const p = new URLSearchParams({ location: o.location ?? data.location.id, date: o.date ?? data.date });
		const kind = o.kind ?? data.kind;
		if (kind) p.set('kind', kind);
		return `/schedule?${p}`;
	};
</script>

<h1 class="mb-4 text-2xl font-bold">Class schedule</h1>
<nav aria-label="Locations" class="mb-3 flex flex-wrap gap-2">
	{#each data.locations as l (l.id)}
		<a class="rounded-site px-3 py-1.5 text-sm ring-1 ring-current/20 {l.id === data.location.id ? 'bg-brand text-brand-ink' : 'bg-surface'}" href={link({ location: l.id })} aria-current={l.id === data.location.id ? 'page' : undefined}>{l.name}</a>
	{/each}
</nav>
<nav aria-label="Days" class="mb-3 flex flex-wrap gap-2">
	{#each data.days as d, i (d)}
		<a class="rounded-site px-3 py-1.5 text-sm ring-1 ring-current/20 {d === data.date ? 'bg-brand text-brand-ink' : 'bg-surface'}" href={link({ date: d })} aria-current={d === data.date ? 'date' : undefined}>{i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : shortDate(d)}</a>
	{/each}
</nav>
<nav aria-label="Class types" class="mb-5 flex flex-wrap gap-2 text-sm">
	<a class="underline-offset-2 {data.kind ? '' : 'font-bold underline'}" href={link({ kind: '' })}>All classes</a>
	{#each data.kinds as k (k)}<a class="capitalize underline-offset-2 {data.kind === k ? 'font-bold underline' : ''}" href={link({ kind: k })}>{k === 'hiit' ? 'HIIT' : k}</a>{/each}
</nav>
<h2 class="mb-2 font-semibold">{data.location.name} · {longDate(data.date)}</h2>
<table class="w-full overflow-hidden rounded-site bg-surface text-sm ring-1 ring-current/10">
	<thead class="bg-brand/10 text-left"><tr><th class="p-2">Time</th><th class="p-2">Class</th><th class="p-2">Type</th><th class="p-2">Instructor</th><th class="p-2">Room</th><th class="p-2">Spots</th></tr></thead>
	<tbody>
		{#each data.classes as c (c.id)}
			<tr class="border-t border-current/10 {c.startsAt <= data.now ? 'text-muted' : ''}">
				<td class="p-2 whitespace-nowrap">{clock(c.startsAt)}</td>
				<td class="p-2"><a class="font-semibold text-brand hover:underline" href="/classes/{c.id}">{c.name}</a></td>
				<td class="p-2 capitalize">{c.kind === 'hiit' ? 'HIIT' : c.kind}</td>
				<td class="p-2">{c.instructor}</td>
				<td class="p-2">{c.room}</td>
				<td class="p-2">{c.startsAt <= data.now ? 'Started' : c.left > 0 ? `${c.left} left` : 'Full'}</td>
			</tr>
		{:else}
			<tr><td colspan="6" class="p-4 text-muted">No classes.</td></tr>
		{/each}
	</tbody>
</table>
