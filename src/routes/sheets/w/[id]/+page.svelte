<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { address, letter } from '#lib/sheet.ts';

	let { data, form } = $props();

	const key = (r: number, c: number) => `${r}:${c}`;
	// A cell's name for screen readers and agents: "Cell B3, Amount" (its column's header, from row 1).
	const nameOf = (r: number, c: number) => {
		const header = r > 1 ? data.cells[key(1, c)]?.shown : undefined;
		return `Cell ${address(r, c)}${header ? `, ${header}` : ''}`;
	};
	const action = (name: string) => `?sheet=${data.sheet.id}&/${name}`;

	let status = $state('');

	// With JavaScript, cells save as they're typed (and Enter moves down, and a pasted block of rows fills the cells from
	// here), as in any online spreadsheet; without it, the Save button saves them all.
	async function post(name: string, body: FormData) {
		status = 'Saving…';
		const res = await fetch(action(name), { method: 'POST', body, headers: { 'x-sveltekit-action': 'true' } });
		const result = (await res.json()) as { type: string };
		status = result.type === 'success' ? 'All changes saved' : 'Couldn’t save. Try again.';
		return result.type === 'success';
	}

	function grid(node: HTMLFormElement) {
		const timers = new Map<string, ReturnType<typeof setTimeout>>();
		const saveCell = (input: HTMLInputElement, refresh: boolean) => {
			clearTimeout(timers.get(input.name));
			timers.delete(input.name);
			const body = new FormData();
			body.set(input.name, input.value);
			return post('save', body).then((ok) => {
				if (ok && refresh) return invalidateAll();
			});
		};
		const isCell = (t: EventTarget | null): t is HTMLInputElement => t instanceof HTMLInputElement && /^c\d+_\d+$/.test(t.name);
		const onInput = (e: Event) => {
			if (!isCell(e.target)) return;
			const input = e.target;
			clearTimeout(timers.get(input.name));
			timers.set(input.name, setTimeout(() => saveCell(input, false), 500));
		};
		const onChange = (e: Event) => isCell(e.target) && saveCell(e.target, true);
		const onKey = (e: KeyboardEvent) => {
			if (!isCell(e.target) || e.key !== 'Enter') return;
			e.preventDefault();
			const [r, c] = e.target.name.slice(1).split('_').map(Number) as [number, number];
			saveCell(e.target, true);
			node.querySelector<HTMLInputElement>(`[name="c${r + 1}_${c}"]`)?.focus();
		};
		const onPaste = (e: ClipboardEvent) => {
			const text = e.clipboardData?.getData('text/plain') ?? '';
			if (!isCell(e.target) || !/[\t\n]/.test(text.replace(/\n$/, ''))) return;
			e.preventDefault();
			const [r, c] = e.target.name.slice(1).split('_').map(Number) as [number, number];
			const body = new FormData();
			body.set('at', address(r, c));
			body.set('text', text);
			post('paste', body).then((ok) => {
				if (ok) return invalidateAll();
			});
		};
		node.addEventListener('input', onInput);
		node.addEventListener('change', onChange);
		node.addEventListener('keydown', onKey);
		node.addEventListener('paste', onPaste);
		return { destroy: () => timers.forEach((t) => clearTimeout(t)) };
	}

	const firstEmptyRow = $derived.by(() => {
		let last = 0;
		for (const k of Object.keys(data.cells)) last = Math.max(last, Number(k.split(':')[0]));
		return last + 1;
	});
</script>

<svelte:head><title>{data.workbook.title} — Gridwhistle</title></svelte:head>

<div class="mb-4 flex flex-wrap items-center gap-3">
	<a class="text-sm text-brand hover:underline" href="/">← All spreadsheets</a>
	<form method="POST" action={action('renameBook')} class="flex items-center gap-2">
		<input class="rounded-site border border-transparent bg-transparent px-2 py-1 text-xl font-bold hover:border-current/20" name="title" aria-label="Spreadsheet name" defaultValue={data.workbook.title} />
		<button class="btn-quiet text-sm">Rename</button>
	</form>
	{#if form?.titleError}<p class="text-sm font-semibold text-red-600" role="alert">{form.titleError}</p>{/if}
</div>

<nav aria-label="Sheets" class="mb-3 flex flex-wrap items-center gap-2">
	{#each data.sheets as s (s.id)}
		<a
			href="?sheet={s.id}"
			aria-current={s.id === data.sheet.id ? 'page' : undefined}
			class="rounded-site px-3 py-1.5 text-sm {s.id === data.sheet.id ? 'bg-brand font-semibold text-brand-ink' : 'ring-1 ring-current/15 hover:bg-current/5'}">{s.name}</a
		>
	{/each}
	<form method="POST" action={action('addSheet')} class="flex items-center gap-1">
		<input class="w-36 rounded-site border border-current/20 bg-surface px-2 py-1 text-sm" name="name" aria-label="New sheet name" placeholder="New sheet name" />
		<button class="btn-quiet text-sm">Add sheet</button>
	</form>
	<form method="POST" action={action('renameSheet')} class="ml-auto flex items-center gap-1">
		<input class="w-36 rounded-site border border-current/20 bg-surface px-2 py-1 text-sm" name="name" aria-label="Sheet name" defaultValue={data.sheet.name} />
		<button class="btn-quiet text-sm">Rename sheet</button>
	</form>
</nav>
{#if form?.sheetError}<p class="mb-3 text-sm font-semibold text-red-600" role="alert">{form.sheetError}</p>{/if}

<details class="mb-3 rounded-site bg-surface p-3 ring-1 ring-current/10" open={Boolean(form?.pasteError)}>
	<summary class="cursor-pointer text-sm font-semibold">Paste rows</summary>
	<form method="POST" action={action('paste')} class="mt-3 space-y-2">
		<label class="label">Rows to paste (columns separated by tabs, one row per line) <textarea class="field font-mono text-sm" name="text" rows="5" defaultValue={form?.text ?? ''}></textarea></label>
		<div class="flex items-end gap-2">
			<label class="label">Start at cell <input class="field w-24" name="at" defaultValue={form?.at || `A${firstEmptyRow}`} /></label>
			<button class="btn">Paste</button>
		</div>
		{#if form?.pasteError}<p class="text-sm font-semibold text-red-600" role="alert">{form.pasteError}</p>{/if}
	</form>
</details>

<form method="POST" action={action('save')} use:grid>
	<div class="mb-2 flex items-center gap-3">
		<button class="btn">Save</button>
		<p role="status" class="text-sm text-muted">{status || (form?.saved !== undefined ? 'All changes saved' : '')}</p>
		{#if form?.error}<p class="text-sm font-semibold text-red-600" role="alert">{form.error}</p>{/if}
	</div>
	<div class="overflow-x-auto rounded-site bg-surface ring-1 ring-current/15">
		<table class="border-collapse text-sm" aria-label="{data.sheet.name} cells">
			<thead>
				<tr>
					<th class="w-10 border border-current/10 bg-current/5"></th>
					{#each { length: data.cols } as _, c (c)}
						<th scope="col" class="min-w-32 border border-current/10 bg-current/5 px-2 py-1 font-medium text-muted">{letter(c + 1)}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each { length: data.rows } as _, r (r)}
					<tr>
						<th scope="row" class="border border-current/10 bg-current/5 px-2 font-medium text-muted">{r + 1}</th>
						{#each { length: data.cols } as _, c (c)}
							{@const cell = data.cells[key(r + 1, c + 1)]}
							<td class="border border-current/10 p-0 align-top">
								<input
									class="block w-full min-w-32 bg-transparent px-2 py-1 outline-none focus:ring-2 focus:ring-brand focus:ring-inset {r === 0 ? 'font-semibold' : ''}"
									name="c{r + 1}_{c + 1}"
									aria-label={nameOf(r + 1, c + 1)}
									value={cell?.raw ?? ''}
									aria-describedby={cell?.raw.startsWith('=') ? `result-${address(r + 1, c + 1)}` : undefined}
								/>
								<!-- A formula's result, under it (and read out with the cell). -->
								{#if cell?.raw.startsWith('=')}<small id="result-{address(r + 1, c + 1)}" class="block px-2 pb-1 text-xs text-muted">= {cell.shown}</small>{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="mt-2 text-sm"><a class="text-brand hover:underline" href="?sheet={data.sheet.id}&rows={data.rows + 25}">Show 25 more rows</a></p>
</form>
