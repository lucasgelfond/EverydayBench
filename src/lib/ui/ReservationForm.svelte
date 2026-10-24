<script lang="ts">
	// Who the table is for: the last step of every booking flow, posted to the page's own action.
	let { occasions, values = {}, error, submit }: { occasions: Record<string, string>; values?: Record<string, string>; error?: string; submit: string } = $props();
</script>

<form method="POST" class="space-y-4">
	<label class="label">Name for the reservation <input class="field" name="name" autocomplete="name" required defaultValue={values.name ?? ''} /></label>
	<label class="label">Email <input class="field" name="email" type="email" autocomplete="email" required defaultValue={values.email ?? ''} /></label>
	<label class="label">Phone (optional) <input class="field" name="phone" type="tel" autocomplete="tel" defaultValue={values.phone ?? ''} /></label>
	<label class="label">Occasion
		<select class="field" name="occasion">{#each Object.entries(occasions) as [v, label] (v)}<option value={v} selected={v === (values.occasion ?? '')}>{label}</option>{/each}</select>
	</label>
	<label class="label">Special requests (optional) <textarea class="field" name="notes" rows="3">{values.notes ?? ''}</textarea></label>
	{#if error}<p class="font-semibold text-red-600" role="alert">{error}</p>{/if}
	<button class="btn w-full">{submit}</button>
</form>
