<script lang="ts">
	let { data, form } = $props();
</script>

<form method="POST" class="card space-y-4">
	<h1 class="text-xl font-bold">New message</h1>
	<label class="label">To <input class="field" name="to" type="text" autocomplete="off" placeholder="name@example.com" required defaultValue={form?.to ?? data.to} /></label>
	<p class="-mt-2 text-xs text-muted">Separate several addresses with commas. Find addresses in <a class="underline" href="/contacts">Contacts</a>.</p>
	<label class="label">Subject <input class="field" name="subject" type="text" defaultValue={form?.subject ?? data.subject} /></label>
	<label class="label">Message <textarea class="field min-h-48" name="body" defaultValue={form?.body ?? ''}></textarea></label>
	{#if form?.error}<p class="text-sm font-semibold text-red-600" role="alert">{form.error}</p>{/if}
	<button class="btn">Send</button>
</form>
