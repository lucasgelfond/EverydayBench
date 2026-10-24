<script lang="ts">
	let { data, form } = $props();
	const v = $derived(form?.values);
</script>

<form method="POST" class="card mx-auto max-w-xl space-y-5">
	<h1 class="text-2xl font-bold">Request maintenance</h1>
	<p class="text-sm text-muted">For emergencies (flooding, gas smell, no heat below 55°F), call the 24-hour line: 555-0199.</p>
	<label class="label">Category
		<select class="field" name="category" required>
			<option value="">Choose a category</option>
			{#each Object.entries(data.categories) as [id, name] (id)}<option value={id} selected={v?.category === id}>{name}</option>{/each}
		</select>
	</label>
	<label class="label">Where in your apartment
		<select class="field" name="location" required>
			<option value="">Choose a room</option>
			{#each data.locations as l (l)}<option selected={v?.location === l}>{l}</option>{/each}
		</select>
	</label>
	<label class="label">What’s wrong? <textarea class="field" name="description" rows="4" required minlength="10" defaultValue={v?.description ?? ''}></textarea></label>
	<fieldset>
		<legend class="label">May our staff enter if you’re not home?</legend>
		<label class="mr-4"><input type="radio" name="enter" value="yes" checked={v?.enter === true} /> Yes</label>
		<label><input type="radio" name="enter" value="no" checked={v?.enter === false} /> No, schedule with me first</label>
	</fieldset>
	<fieldset>
		<legend class="label">Are there pets in the apartment?</legend>
		<label class="mr-4"><input type="radio" name="pets" value="yes" checked={v?.pets === true} /> Yes</label>
		<label><input type="radio" name="pets" value="no" checked={v?.pets === false} /> No</label>
	</fieldset>
	{#if form?.error}<p class="text-sm font-semibold text-red-600" role="alert">{form.error}</p>{/if}
	<button class="btn w-full">Submit request</button>
</form>
