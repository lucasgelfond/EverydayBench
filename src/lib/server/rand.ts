// Determinism: everything a site makes up (codes, tokens, availability) comes from the run's seed and what it's for, so
// a replay of the same actions makes the same values.

export function hash(...parts: (string | number)[]) {
	let h = 0x811c9dc5;
	for (const ch of parts.join('\u0000')) {
		h ^= ch.codePointAt(0)!;
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

// mulberry32: a small, fast, seeded generator.
export function rng(...seed: (string | number)[]) {
	let a = hash(...seed);
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// A code like "K7Q2MX", from a seed.
export function code(length: number, ...seed: (string | number)[]) {
	const next = rng(...seed);
	return Array.from({ length }, () => ALPHABET[Math.floor(next() * ALPHABET.length)]).join('');
}

export const digits = (length: number, ...seed: (string | number)[]) => {
	const next = rng(...seed);
	return Array.from({ length }, () => Math.floor(next() * 10)).join('');
};
