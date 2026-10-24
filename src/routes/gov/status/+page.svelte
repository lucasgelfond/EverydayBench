<script lang="ts">
	let { form } = $props();
</script>

<h1 class="mb-4 text-2xl font-bold">Check application status</h1>
<form method="POST" class="card max-w-md space-y-4">
	<label class="label">Receipt number <input class="field" name="code" required /></label>
	<label class="label">Date of birth <input class="field" name="dateOfBirth" type="date" required /></label>
	<button class="btn">Check status</button>
	{#if form?.found}<p role="status">Application <strong class="font-mono">{form.found.code}</strong> for {form.found.name}: received, in review.</p>{/if}
	{#if form?.missing}<p role="status">We couldn’t find an application with that receipt number and date of birth.</p>{/if}
</form>
