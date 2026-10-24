<script lang="ts">
	import { longDate, money } from '#lib/time.ts';
	let { data } = $props();
</script>

<section class="card max-w-2xl space-y-3">
	<h1 class="text-2xl font-bold">Application received</h1>
	<p>Receipt number: <strong class="font-mono text-lg">{data.code}</strong></p>
	<p>{data.name} · submitted {longDate(data.createdAt.slice(0, 10))} · fee {money(data.feeCents)} paid with the card ending in {data.last4}.</p>
	<p><strong>Next:</strong> mail your current passport to Kestrel Bay Office of Travel Documents, 1 Civic Plaza, Kestrel Bay 04410, within 10 days. Write your receipt number on the envelope.</p>
</section>
