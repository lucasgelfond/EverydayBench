<script lang="ts">
	import { money } from '#lib/time.ts';

	let { data } = $props();
	const KIND = { checking: 'Checking', savings: 'Savings', credit: 'Credit card' } as const;
</script>

<h1 class="mb-4 text-xl font-bold">Accounts</h1>
<ul class="space-y-3">
	{#each data.accounts as a (a.id)}
		<li class="card flex items-center gap-4">
			<div>
				<a class="font-semibold text-brand hover:underline" href="/a/{a.id}">{a.name} ••{a.last4}</a>
				<p class="text-sm text-muted">{KIND[a.kind]}</p>
			</div>
			<span class="flex-1"></span>
			<div class="text-right">
				<p class="text-lg font-semibold">{a.kind === 'credit' ? money(-a.balanceCents) : money(a.balanceCents)}</p>
				<p class="text-xs text-muted">{a.kind === 'credit' ? 'Current balance owed' : 'Available balance'}</p>
			</div>
		</li>
	{/each}
</ul>
