<script lang="ts">
	let { data, form } = $props();
</script>

<form method="POST" class="card mx-auto max-w-lg space-y-4">
	<h1 class="text-xl font-bold">New event</h1>
	<label class="label">Title <input class="field" name="title" required defaultValue={form?.title ?? ''} /></label>
	<label class="label">Date <input class="field" name="date" type="date" required defaultValue={form?.date ?? data.date} /></label>
	<label class="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="allDay" defaultChecked={form?.allDay ?? false} /> All day</label>
	<fieldset class="grid grid-cols-2 gap-3">
		<legend class="label mb-1">Time (for events that aren’t all day)</legend>
		<label class="label">Starts <input class="field" name="startTime" type="time" defaultValue={form?.startTime ?? ''} /></label>
		<label class="label">Ends <input class="field" name="endTime" type="time" defaultValue={form?.endTime ?? ''} /></label>
	</fieldset>
	<label class="label">Last day (for all-day events over several days) <input class="field" name="endDate" type="date" defaultValue={form?.endDate ?? ''} /></label>
	<label class="label">Location <input class="field" name="location" defaultValue={form?.location ?? ''} /></label>
	<label class="label">Notes <textarea class="field" name="notes" defaultValue={form?.notes ?? ''}></textarea></label>
	{#if form?.error}<p class="text-sm font-semibold text-red-600" role="alert">{form.error}</p>{/if}
	<button class="btn">Save event</button>
</form>
