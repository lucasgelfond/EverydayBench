<script lang="ts">
	// A card form whose fields carry the standard autocomplete names, so password managers and agents' vaults fill it.
	let { values = {} }: { values?: Record<string, string> } = $props();
</script>

<fieldset class="grid grid-cols-6 gap-3">
	<legend class="mb-2 font-semibold">Card details</legend>
	<label class="label col-span-6">Name on card <input class="field" name="name" autocomplete="cc-name" defaultValue={values.name ?? ''} /></label>
	<label class="label col-span-6">Card number <input class="field" name="number" inputmode="numeric" autocomplete="cc-number" placeholder="1234 1234 1234 1234" defaultValue={values.number ?? ''} /></label>
	<label class="label col-span-2">Expires <input class="field" name="exp" autocomplete="cc-exp" placeholder="MM/YY" defaultValue={values.exp ?? ''} /></label>
	<label class="label col-span-2">Security code <input class="field" name="cvc" inputmode="numeric" autocomplete="cc-csc" placeholder="CVC" /></label>
	<label class="label col-span-2">Billing ZIP <input class="field" name="zip" inputmode="numeric" autocomplete="postal-code" defaultValue={values.zip ?? ''} /></label>
</fieldset>
