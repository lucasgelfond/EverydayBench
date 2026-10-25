import { error, fail, redirect } from '@sveltejs/kit';
import { addTab, paste, renameTab, renameWorkbook, setCells, type CellEdit } from '#lib/server/actions/sheets.ts';
import { evaluate, rawCells, shown, tabsOf, workbookById } from '#lib/server/sheet.ts';
import { MAX_COLS, MAX_ROWS } from '#lib/sheet.ts';

// The sheet open in a workbook: ?sheet=<id>, or the first.
function opened(locals: App.Locals, id: string, url: URL) {
	const workbook = workbookById(locals.ctx, id);
	if (!workbook) error(404, 'No such spreadsheet');
	const sheets = tabsOf(locals.ctx, id);
	const sheet = sheets.find((t) => String(t.id) === url.searchParams.get('sheet')) ?? sheets[0]!;
	return { workbook, sheets, sheet };
}

export const load = ({ locals, params, url }) => {
	const { workbook, sheets, sheet } = opened(locals, params.id, url);
	const raw = rawCells(locals.ctx, sheet.id);
	const values = evaluate(raw);
	let lastRow = 0;
	let lastCol = 0;
	for (const k of raw.keys()) {
		const [r, c] = k.split(':').map(Number) as [number, number];
		lastRow = Math.max(lastRow, r);
		lastCol = Math.max(lastCol, c);
	}
	// Room to type past what's there: more rows on request (?rows=), a couple of columns.
	const more = Number(url.searchParams.get('rows')) || 0;
	const rows = Math.min(MAX_ROWS, Math.max(lastRow + 8, 25, more));
	const cols = Math.min(MAX_COLS, Math.max(lastCol + 2, 8));
	const cells: Record<string, { raw: string; shown: string }> = {};
	for (const [k, v] of raw) cells[k] = { raw: v, shown: shown(values.get(k) ?? '') };
	return { workbook, sheets, sheet, rows, cols, cells };
};

const edits = (f: FormData): CellEdit[] =>
	[...f.entries()].flatMap(([k, v]) => {
		const m = /^c(\d+)_(\d+)$/.exec(k);
		return m ? [{ row: Number(m[1]), col: Number(m[2]), value: String(v).trim() }] : [];
	});

export const actions = {
	// Every cell in the form (the Save button), or one (saved as it's typed).
	save: async ({ locals, params, request, url }) => {
		const { sheet } = opened(locals, params.id, url);
		const r = setCells(locals.ctx, sheet.id, edits(await request.formData()));
		if (!r.ok) return fail(400, { error: r.error });
		return { saved: r.changed };
	},
	paste: async ({ locals, params, request, url }) => {
		const { sheet } = opened(locals, params.id, url);
		const f = await request.formData();
		const r = paste(locals.ctx, sheet.id, String(f.get('at') ?? 'A1'), String(f.get('text') ?? ''));
		if (!r.ok) return fail(400, { pasteError: r.error, at: String(f.get('at') ?? ''), text: String(f.get('text') ?? '') });
		return { saved: r.changed };
	},
	addSheet: async ({ locals, params, request }) => {
		const r = addTab(locals.ctx, params.id, String((await request.formData()).get('name') ?? ''));
		if (!r.ok) return fail(400, { sheetError: r.error });
		redirect(303, `/w/${params.id}?sheet=${r.tab}`);
	},
	renameSheet: async ({ locals, params, request, url }) => {
		const { sheet } = opened(locals, params.id, url);
		const r = renameTab(locals.ctx, sheet.id, String((await request.formData()).get('name') ?? ''));
		if (!r.ok) return fail(400, { sheetError: r.error });
		return { renamed: true };
	},
	renameBook: async ({ locals, params, request }) => {
		const r = renameWorkbook(locals.ctx, params.id, String((await request.formData()).get('title') ?? ''));
		if (!r.ok) return fail(400, { titleError: r.error });
		return { renamed: true };
	}
};
