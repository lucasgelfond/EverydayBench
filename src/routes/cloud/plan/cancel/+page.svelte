<script lang="ts">
	import { longDate, money } from '#lib/time.ts';
	let { data, form } = $props();
</script>

<div class="card mx-auto max-w-lg space-y-4">
	{#if data.step === 1}
		<h1 class="text-2xl font-bold">Wait — keep {data.plan.plan} for half price?</h1>
		<p>Stay on {data.plan.plan} and pay <strong>{money(data.plan.priceCents / 2)}/month</strong> for the next 3 months. Your servers, backups and settings stay exactly as they are.</p>
		<form method="POST" action="?/discount"><button class="btn w-full">Yes, give me 50% off</button></form>
		<p class="text-center text-sm"><a class="text-muted underline" href="?step=2">No thanks, continue canceling</a></p>
	{:else if data.step === 2}
		<h1 class="text-2xl font-bold">Need a break instead?</h1>
		<p>Pause your plan for up to 3 months. You won’t be billed while it’s paused, and everything picks up where you left off.</p>
		<form method="POST" action="?/pause"><button class="btn w-full">Pause my plan</button></form>
		<p class="text-center text-sm"><a class="text-muted underline" href="?step=3">No, I still want to cancel</a></p>
	{:else}
		<h1 class="text-2xl font-bold">Cancel {data.plan.plan}?</h1>
		<p>Your plan stays active until {longDate(data.plan.renewsAt.slice(0, 10))}. After that you won’t be charged, and features like daily backups and priority support stop.</p>
		<div class="flex gap-3">
			<a class="btn flex-1" href="/plan">Keep my plan</a>
			<form method="POST" action="?/cancel" class="flex-1"><button class="btn-quiet w-full">Cancel my plan</button></form>
		</div>
	{/if}
	{#if form?.error}<p class="text-sm font-semibold text-red-600" role="alert">{form.error}</p>{/if}
</div>
