<script lang="ts">
	import { longDate, money } from '#lib/time.ts';
	let { data, form } = $props();
</script>

<h1 class="mb-4 text-2xl font-bold">Confirm and pay</h1>
<div class="grid gap-6 md:grid-cols-[1fr_20rem]">
	<form method="POST" class="card space-y-4">
		<p>{longDate(data.checkIn)} – {longDate(data.checkOut)} · {data.guests} {data.guests === 1 ? 'guest' : 'guests'}</p>
		{#if !data.free}<p role="alert" class="font-semibold text-red-600">These dates aren’t available any more.</p>{/if}
		<fieldset class="space-y-2">
			<legend class="mb-1 font-semibold">Pay with</legend>
			{#each data.cards as c, i (c.id)}
				<label class="flex items-center gap-3 rounded-site p-3 ring-1 ring-current/20"><input type="radio" name="card" value={c.id} defaultChecked={i === 0} /> {c.brand} ending in {c.last4} <span class="text-sm text-muted">exp {String(c.expMonth).padStart(2, '0')}/{String(c.expYear).slice(2)}</span></label>
			{/each}
		</fieldset>
		{#if form?.error}<p role="alert" class="font-semibold text-red-600">{form.error}</p>{/if}
		<button class="btn w-full">Confirm and pay · {money(data.cost.total)}</button>
	</form>
	<aside class="card h-fit text-sm">
		<h2 class="font-semibold">{data.h.title}</h2>
		<p class="text-muted">{data.h.kind} in {data.h.area}, {data.h.city}</p>
		<dl class="mt-3 space-y-1 border-t border-current/10 pt-3">
			<div class="flex justify-between"><dt>{money(data.h.nightlyCents)} × {data.nights} nights</dt><dd>{money(data.cost.subtotal)}</dd></div>
			{#each data.cost.lines as l (l.label)}<div class="flex justify-between"><dt>{l.label}</dt><dd>{money(l.cents)}</dd></div>{/each}
			<div class="flex justify-between font-semibold"><dt>Total</dt><dd>{money(data.cost.total)}</dd></div>
		</dl>
	</aside>
</div>
