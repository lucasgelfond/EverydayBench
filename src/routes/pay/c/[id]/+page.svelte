<script lang="ts">
	import CardFields from '#lib/ui/CardFields.svelte';
	import { money } from '#lib/time.ts';
	let { data, form } = $props();
	// The payment method is in the URL (?method=express), so switching works before or without JavaScript.
	const method = $derived(form?.tab ?? data.method);
	const sentTo = $derived(form?.tab === 'express' ? form.email : data.sent);
</script>

<svelte:head><title>Pay {data.merchant} — Tallypay</title></svelte:head>
<main class="mx-auto grid max-w-3xl gap-8 px-4 py-10 md:grid-cols-2">
	<section>
		<p class="text-sm text-muted">Pay {data.merchant}</p>
		<p class="mt-1 text-3xl font-bold">{money(data.amountCents)}</p>
		<p class="mt-3">{data.description}</p>
		<p class="mt-8 text-xs text-muted">Powered by <strong class="text-brand">Tallypay</strong></p>
	</section>
	<section class="card">
		<nav aria-label="Payment method" class="mb-4 grid grid-cols-2 gap-1 rounded-site bg-current/5 p-1 text-center text-sm">
			<a href="?method=card" aria-current={method === 'card' ? 'page' : undefined} class="rounded-site py-1.5 {method === 'card' ? 'bg-surface font-semibold shadow-sm' : ''}">Card</a>
			<a href="?method=express" aria-current={method === 'express' ? 'page' : undefined} class="rounded-site py-1.5 {method === 'express' ? 'bg-surface font-semibold shadow-sm' : ''}">Tallypay Express</a>
		</nav>
		{#if method === 'card'}
			<form method="POST" action="?/card" class="space-y-4">
					<CardFields values={form?.tab === 'card' ? (form.values ?? {}) : {}} />
					{#if form?.tab === 'card' && form.error}<p class="text-sm font-semibold text-red-600" role="alert">{form.error}</p>{/if}
					<button class="btn w-full">Pay {money(data.amountCents)}</button>
				</form>
		{:else}
			{#if sentTo}
					<form method="POST" action="?/express" class="space-y-4">
						<p class="text-sm" role="status">If {sentTo} has a Tallypay Express card, we sent a 6-digit code to it.</p>
						<input type="hidden" name="email" value={sentTo} />
						<label class="label">Verification code <input class="field tracking-widest" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required /></label>
						{#if form?.error}<p class="text-sm font-semibold text-red-600" role="alert">{form?.error}</p>{/if}
						<button class="btn w-full">Pay {money(data.amountCents)}</button>
						<p class="text-center text-sm"><a class="underline" href="?method=express">Use a different email</a></p>
					</form>
				{:else}
					<form method="POST" action="?/code" class="space-y-4">
						<p class="text-sm text-muted">Pay with the card saved to your Tallypay Express account. We'll email you a code.</p>
						<label class="label">Email <input class="field" name="email" type="email" autocomplete="email" required defaultValue={data.email} /></label>
						<button class="btn w-full">Send code</button>
					</form>
				{/if}
		{/if}
	</section>
</main>
