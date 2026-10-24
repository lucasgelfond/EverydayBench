<script lang="ts">
	import { longDate, money } from '#lib/time.ts';
	let { data } = $props();
	const MESSAGES: Record<string, string> = { canceled: 'Your plan is canceled.', discount: 'Your discount is applied.', pause: 'Your plan is paused.' };
</script>

<h1 class="mb-4 text-2xl font-bold">Plan</h1>
{#if data.done}<p role="status" class="card mb-4">{MESSAGES[data.done]}</p>{/if}
<section class="card max-w-lg space-y-2">
	<p class="text-xl font-semibold">{data.plan.plan} · {money(data.plan.priceCents)}/month</p>
	{#if data.plan.discount}<p class="text-sm text-muted">{data.plan.discount}</p>{/if}
	{#if data.plan.status === 'active'}
		<p>Renews {longDate(data.plan.renewsAt.slice(0, 10))}.</p>
		<p class="pt-2 text-sm"><a class="text-muted underline" href="/plan/cancel">Cancel plan</a></p>
	{:else if data.plan.status === 'paused'}
		<p>Paused. Billing resumes in 3 months.</p>
	{:else}
		<p>Canceled. Active until {longDate(data.plan.renewsAt.slice(0, 10))}.</p>
	{/if}
</section>
