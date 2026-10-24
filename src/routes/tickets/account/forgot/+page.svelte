<script lang="ts">
	let { form } = $props();
</script>

<div class="card mx-auto max-w-sm space-y-4">
	<h1 class="text-xl font-bold">Reset your password</h1>
	{#if form?.sent}
		<p role="status">If an account exists for <strong>{form.sent}</strong>, we've emailed a link to reset its password. It expires in 60 minutes.</p>
	{:else}
		<form method="POST" class="space-y-4">
			<label class="label">Email <input class="field" name="email" type="email" autocomplete="email" required /></label>
			<button class="btn w-full">Email me a reset link</button>
		</form>
	{/if}
</div>
