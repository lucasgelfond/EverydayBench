// Spreadsheet addresses, for the server and the pages: columns are letters from A (1) to Z (26), cells "B3".

export const MAX_COLS = 26;
export const MAX_ROWS = 500;

export const letter = (col: number) => String.fromCharCode(64 + col);
export const address = (row: number, col: number) => `${letter(col)}${row}`;

// "b3" -> { row: 3, col: 2 }, or undefined past Z or row 500.
export function parseAddress(a: string) {
	const m = /^\s*\$?([A-Za-z])\$?(\d{1,3})\s*$/.exec(a);
	if (!m) return undefined;
	const col = m[1]!.toUpperCase().charCodeAt(0) - 64;
	const row = Number(m[2]);
	return row >= 1 && row <= MAX_ROWS ? { row, col } : undefined;
}

// Tab-separated rows (what copying from a spreadsheet gives), as a grid of strings; a trailing newline adds no row.
export const parseTsv = (text: string) =>
	text
		.replace(/\r\n?/g, '\n')
		.replace(/\n$/, '')
		.split('\n')
		.map((line) => line.split('\t'));
