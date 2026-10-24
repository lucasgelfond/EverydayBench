<script lang="ts">
	import { money } from '#lib/time.ts';
	let { data } = $props();
	const d = $derived(data.draft);
	const rows = $derived([
		['Full name', d.fullName],
		['Date of birth', d.dateOfBirth],
		['Social Security number', d.ssn ? `•••-••-${d.ssn.slice(-4)}` : 'Not given'],
		['Passport number', d.passportNumber],
		['Date issued', d.issuedOn],
		['Email', d.email],
		['Phone', d.phone],
		['Mailing address', `${d.street}, ${d.city} ${d.zip}`]
	]);
</script>

<p class="text-sm text-muted">Step 3 of 4</p>
<h1 class="mb-4 text-2xl font-bold">Review your application</h1>
<section class="card max-w-2xl">
	<dl class="grid grid-cols-[12rem_1fr] gap-y-2">
		{#each rows as [k, val] (k)}<dt class="font-semibold">{k}</dt><dd>{val}</dd>{/each}
	</dl>
	<p class="mt-4 text-sm"><a class="underline" href="/renew/details">Edit your details</a></p>
</section>
<p class="mt-6 max-w-2xl">Next, pay the {money(data.feeCents)} renewal fee. Your application is submitted when the fee is paid.</p>
<a class="btn mt-3" href="/renew/pay">Continue to payment</a>
