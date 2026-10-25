<script lang="ts">
	import { longDate, money } from '#lib/time.ts';

	let { data } = $props();
	const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const monthName = (m: string) => `${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;
	const signed = (cents: number) => (cents < 0 ? `−${money(-cents)}` : `+${money(cents)}`);
</script>

<p class="mb-2 text-sm"><a class="text-brand hover:underline" href="/">← Accounts</a></p>
<h1 class="text-xl font-bold">{data.account.name} ••{data.account.last4}</h1>
<nav aria-label="Statement month" class="my-4 flex items-center gap-4">
	<a class="btn-quiet text-sm" href="?month={data.prev}">← {monthName(data.prev)}</a>
	<h2 class="text-lg font-semibold">{monthName(data.month)}</h2>
	{#if data.next}<a class="btn-quiet text-sm" href="?month={data.next}">{monthName(data.next)} →</a>{/if}
</nav>
{#if data.rows.length}
	<table class="w-full border-collapse overflow-hidden rounded-site bg-surface text-sm ring-1 ring-current/10">
		<thead class="bg-current/5 text-left">
			<tr><th class="px-3 py-2">Date</th><th class="px-3 py-2">Description</th><th class="px-3 py-2">Status</th><th class="px-3 py-2 text-right">Amount</th></tr>
		</thead>
		<tbody>
			{#each data.rows as t (t.id)}
				<tr class="border-t border-current/10">
					<td class="px-3 py-2 whitespace-nowrap">{longDate(t.date)}</td>
					<td class="px-3 py-2">{t.description}</td>
					<td class="px-3 py-2 text-muted">{t.status === 'pending' ? 'Pending' : 'Posted'}</td>
					<td class="px-3 py-2 text-right font-mono {t.amountCents < 0 ? '' : 'text-green-700'}">{signed(t.amountCents)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{:else}
	<p class="text-muted">No transactions this month.</p>
{/if}
