<script lang="ts">
	let { token, form }: { token: string; form?: { done?: string; error?: string } | null } = $props();
</script>

<div class="card mx-auto max-w-sm space-y-4">
	<h1 class="text-xl font-bold">Choose a new password</h1>
	{#if form?.done}
		<p role="status">Your password was changed. <a class="font-semibold underline" href="/account/sign-in">Sign in</a> with your new password.</p>
	{:else}
		<form method="POST" class="space-y-4">
			<input type="hidden" name="token" value={token} />
			<label class="label">New password <input class="field" name="password" type="password" autocomplete="new-password" minlength="8" required /></label>
			<label class="label">Confirm new password <input class="field" name="confirm" type="password" autocomplete="new-password" minlength="8" required /></label>
			{#if form?.error}<p class="text-sm font-semibold text-red-600" role="alert">{form.error}</p>{/if}
			<button class="btn w-full">Change password</button>
		</form>
	{/if}
</div>
