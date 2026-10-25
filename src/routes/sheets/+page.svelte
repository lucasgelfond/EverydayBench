<script lang="ts">
	import { longDate } from '#lib/time.ts';

	let { data, form } = $props();
</script>

<div class="grid gap-6 md:grid-cols-[1fr_20rem]">
	<section>
		<h1 class="mb-3 text-xl font-bold">Your spreadsheets</h1>
		<ul class="divide-y divide-current/10 rounded-site bg-surface ring-1 ring-current/10">
			{#each data.workbooks as w (w.id)}
				<li class="flex items-baseline gap-3 px-4 py-3">
					<a class="font-semibold text-brand hover:underline" href="/w/{w.id}">{w.title}</a>
					<span class="text-sm text-muted">{w.sheets.join(', ')}</span>
					<span class="flex-1"></span>
					<span class="text-sm text-muted">Created {longDate(w.createdAt.slice(0, 10))}</span>
				</li>
			{/each}
		</ul>
	</section>
	<form method="POST" class="card h-fit space-y-3">
		<h2 class="font-bold">New spreadsheet</h2>
		<label class="label">Name <input class="field" name="title" placeholder="Untitled spreadsheet" defaultValue={form?.title ?? ''} /></label>
		{#if form?.error}<p class="text-sm font-semibold text-red-600" role="alert">{form.error}</p>{/if}
		<button class="btn">Create spreadsheet</button>
	</form>
</div>
