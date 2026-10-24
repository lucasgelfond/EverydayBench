<script lang="ts">
	let { data, form } = $props();
</script>

<form method="POST" class="card mx-auto max-w-sm space-y-4">
	<h1 class="text-xl font-bold">{data.words.signIn}</h1>
	<label class="label">Email <input class="field" name="email" type="email" autocomplete="username" required defaultValue={form?.email ?? ''} /></label>
	<label class="label">Password <input class="field" name="password" type="password" autocomplete="current-password" required /></label>
	{#if form?.error}<p class="text-sm font-semibold text-red-600" role="alert">{form.error}</p>{/if}
	<button class="btn w-full">{data.words.signIn}</button>
	<p class="text-center text-sm"><a class="underline" href="/account/forgot">Forgot your password?</a></p>
</form>
