<script lang="ts">
	let { form } = $props();
</script>

<p class="text-sm text-muted">Step 1 of 4</p>
<h1 class="mb-4 text-2xl font-bold">Can you renew online?</h1>
<form method="POST" class="card max-w-2xl space-y-3">
	<p>Check each that’s true of your most recent passport:</p>
	<label class="flex gap-2"><input type="checkbox" name="undamaged" /> It isn’t damaged, and I have it with me.</label>
	<label class="flex gap-2"><input type="checkbox" name="recent" /> It was issued in the last 15 years.</label>
	<label class="flex gap-2"><input type="checkbox" name="adult" /> I was 16 or older when it was issued.</label>
	{#if form?.error}<p class="font-semibold text-red-700" role="alert">{form.error}</p>{/if}
	<button class="btn">Continue</button>
</form>
