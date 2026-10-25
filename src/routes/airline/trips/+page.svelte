<script lang="ts">
	let { data } = $props();
</script>

<form method="GET" class="card mx-auto max-w-sm space-y-4">
	<h1 class="text-xl font-bold">Manage a trip</h1>
	<p class="text-sm text-muted">Request a refund or cancel a trip.</p>
	{#if data.missing}<p class="text-sm font-semibold text-red-600" role="alert">We couldn’t find a trip with that confirmation code and last name.</p>{/if}
	<label class="label">Confirmation code <input class="field font-mono uppercase" name="code" autocomplete="off" required defaultValue={data.code} /></label>
	<label class="label">Last name <input class="field" name="last" autocomplete="family-name" required defaultValue={data.last} /></label>
	<button class="btn w-full">Find my trip</button>
</form>
