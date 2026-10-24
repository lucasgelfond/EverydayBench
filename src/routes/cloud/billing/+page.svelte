<script lang="ts">
	import { longDate, money } from '#lib/time.ts';
	let { data, form } = $props();
</script>

<h1 class="mb-4 text-2xl font-bold">Billing</h1>
{#if data.added}<p role="status" class="card mb-4">Credit added. Receipt <strong class="font-mono">{data.added}</strong>.</p>{/if}
<div class="grid gap-5 md:grid-cols-2">
	<section class="card">
		<h2 class="text-sm text-muted">Credit balance</h2>
		<p class="text-3xl font-bold">{money(data.balanceCents)}</p>
		<h3 class="mt-4 mb-1 font-semibold">History</h3>
		<ul class="space-y-1 text-sm">
			{#each data.credits as c (c.code)}<li>{longDate(c.createdAt.slice(0, 10))} · +{money(c.amountCents)} · <span class="font-mono">{c.code}</span></li>{/each}
		</ul>
	</section>
	<form method="POST" class="card space-y-4">
		<h2 class="font-semibold">Add credit</h2>
		<fieldset>
			<legend class="label mb-1">Amount</legend>
			<div class="flex flex-wrap gap-2">
				{#each data.amounts as a (a)}<label class="btn-quiet"><input type="radio" name="amount" value={a} required /> {money(a * 100)}</label>{/each}
			</div>
		</fieldset>
		<fieldset>
			<legend class="label mb-1">Pay with</legend>
			{#each data.cards as c, i (c.id)}<label class="flex items-center gap-2"><input type="radio" name="card" value={c.id} checked={i === 0} /> {c.brand} ending in {c.last4}</label>{/each}
		</fieldset>
		{#if form?.error}<p class="text-sm font-semibold text-red-600" role="alert">{form.error}</p>{/if}
		<button class="btn w-full">Add credit</button>
	</form>
</div>
