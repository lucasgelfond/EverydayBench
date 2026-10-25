<script lang="ts">
	import { longDate, money } from '#lib/time.ts';
	let { data } = $props();
</script>

<div class="grid gap-5 md:grid-cols-[1fr_16rem]">
	<section class="space-y-4">
		{#if data.account}
			<div class="flex items-center justify-between">
				<h1 class="text-2xl font-bold">Your claims</h1>
				<a class="btn" href="/claims/new">New claim</a>
			</div>
			{#if data.filed}<p role="status" class="card">Claim <strong class="font-mono">{data.filed}</strong> submitted. It’s with your manager for approval.</p>{/if}
			{#each data.claims as c (c.code)}
				<article class="card text-sm">
					<h2 class="font-semibold"><span class="font-mono">{c.code}</span> · {c.purpose}</h2>
					<p class="text-muted">Submitted {longDate(c.createdAt.slice(0, 10))} · {c.status === 'paid' ? 'Paid' : 'Awaiting approval'} · {money(c.totalCents)}</p>
					<table class="mt-2 w-full">
						<thead class="text-left text-muted"><tr><th>Date</th><th>Merchant</th><th>Category</th><th class="text-right">Amount</th></tr></thead>
						<tbody>
							{#each c.lines as l (l.line)}<tr><td>{longDate(l.date)}</td><td>{l.merchant}</td><td>{data.categories[l.category as keyof typeof data.categories]}</td><td class="text-right">{money(l.amountCents)}</td></tr>{/each}
						</tbody>
					</table>
				</article>
			{:else}<p class="text-muted">No claims yet.</p>{/each}
		{:else}
			<h1 class="text-2xl font-bold">Expenses</h1>
			<p>Sign in to submit an expense claim and see your claims.</p>
			<a class="btn" href="/account/sign-in">Sign in</a>
		{/if}
	</section>
	<aside class="card h-fit space-y-2 text-sm">
		<h2 class="font-semibold">Expense policy</h2>
		<ul class="list-disc space-y-1 pl-4">
			<li>One claim per trip or project, with one line per receipt.</li>
			<li>Tips aren’t reimbursable: enter the receipt’s total minus any tip.</li>
			<li>Personal purchases can’t be claimed, even on a work trip.</li>
		</ul>
	</aside>
</div>
