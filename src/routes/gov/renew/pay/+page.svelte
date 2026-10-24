<script lang="ts">
	import CardFields from '#lib/ui/CardFields.svelte';
	import { money } from '#lib/time.ts';
	let { data, form } = $props();
</script>

<p class="text-sm text-muted">Step 4 of 4</p>
<h1 class="mb-4 text-2xl font-bold">Pay the renewal fee</h1>
<form method="POST" class="card max-w-xl space-y-5">
	<p>Passport renewal for <strong>{data.name}</strong>: <strong>{money(data.feeCents)}</strong></p>
	<CardFields values={form?.values ?? {}} />
	{#if form?.error}<p class="font-semibold text-red-700" role="alert">{form.error}</p>{/if}
	<button class="btn w-full">Pay {money(data.feeCents)} and submit</button>
</form>
