<script lang="ts">
	import type { FullAutoFill } from 'svelte/elements';
	let { data, form } = $props();
	const v = $derived<Record<string, string | undefined>>(form?.values ?? data.draft);
	const e = $derived<Record<string, string | undefined>>(form?.errors ?? {});
</script>

{#snippet field(name: string, label: string, type = 'text', hint = '', autocomplete: FullAutoFill = 'off')}
	<label class="label">{label}
		{#if hint}<span class="block text-xs font-normal text-muted">{hint}</span>{/if}
		<input class="field" {name} {type} {autocomplete} defaultValue={v[name] ?? ''} aria-invalid={e[name] ? 'true' : undefined} />
		{#if e[name]}<span class="block text-sm font-semibold text-red-700">{e[name]}</span>{/if}
	</label>
{/snippet}

<p class="text-sm text-muted">Step 2 of 4</p>
<h1 class="mb-4 text-2xl font-bold">Your details</h1>
<form method="POST" class="card max-w-2xl space-y-5">
	<fieldset class="space-y-3">
		<legend class="mb-1 text-lg font-semibold">About you</legend>
		{@render field('fullName', 'Full name', 'text', 'As it appears on your current passport', 'name')}
		{@render field('dateOfBirth', 'Date of birth', 'date', '', 'bday')}
		{@render field('ssn', 'Social Security number (optional)', 'text', 'Not required to renew. If you leave it blank, we may ask for it by mail.')}
	</fieldset>
	<fieldset class="space-y-3">
		<legend class="mb-1 text-lg font-semibold">Your current passport</legend>
		{@render field('passportNumber', 'Passport number', 'text', '9 characters, on the photo page')}
		{@render field('issuedOn', 'Date issued', 'date')}
	</fieldset>
	<fieldset class="space-y-3">
		<legend class="mb-1 text-lg font-semibold">Contact and mailing address</legend>
		{@render field('email', 'Email', 'email', 'We’ll send your receipt here', 'email')}
		{@render field('phone', 'Phone', 'tel', '', 'tel')}
		{@render field('street', 'Street address', 'text', 'Where we’ll mail your new passport', 'street-address')}
		<div class="grid grid-cols-2 gap-3">
			{@render field('city', 'City', 'text', '', 'address-level2')}
			{@render field('zip', 'ZIP code', 'text', '', 'postal-code')}
		</div>
	</fieldset>
	<button class="btn">Continue to review</button>
</form>
