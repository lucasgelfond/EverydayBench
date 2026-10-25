<script lang="ts">
	let { data, form } = $props();
	const rows = $derived(form?.rows ?? []);
</script>

<form method="POST" class="card space-y-5">
	<h1 class="text-2xl font-bold">New expense claim</h1>
	<label class="label">What’s it for? <input class="field" name="purpose" placeholder="e.g. Client visit, Halden, Feb 5–6" defaultValue={form?.purpose ?? ''} /></label>
	<p class="text-sm text-muted">One line per receipt. Leave extra lines empty. Tips aren’t reimbursable: enter the total minus any tip.</p>
	<table class="w-full text-sm">
		<thead class="text-left"><tr><th>Date</th><th>Merchant</th><th>Category</th><th>Amount ($)</th></tr></thead>
		<tbody>
			{#each Array.from({ length: data.lines }, (_, i) => i) as i (i)}
				<tr>
					<td><input class="field" type="date" name="date{i}" aria-label="Line {i + 1} date" defaultValue={rows[i]?.date ?? ''} /></td>
					<td><input class="field" name="merchant{i}" aria-label="Line {i + 1} merchant" defaultValue={rows[i]?.merchant ?? ''} /></td>
					<td>
						<select class="field" name="category{i}" aria-label="Line {i + 1} category">
							<option value="">—</option>
							{#each Object.entries(data.categories) as [id, name] (id)}<option value={id} selected={rows[i]?.category === id}>{name}</option>{/each}
						</select>
					</td>
					<td><input class="field" name="amount{i}" inputmode="decimal" aria-label="Line {i + 1} amount" defaultValue={rows[i]?.amount ?? ''} /></td>
				</tr>
			{/each}
		</tbody>
	</table>
	{#if form?.error}<p class="text-sm font-semibold text-red-600" role="alert">{form.error}</p>{/if}
	<button class="btn w-full">Submit claim</button>
</form>
