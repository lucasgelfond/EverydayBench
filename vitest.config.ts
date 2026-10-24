import { defineConfig } from 'vitest/config';

// Unit tests use their own seeds and runs, so they never touch a dev server's.
export default defineConfig({
	test: {
		include: ['tests/unit/**/*.test.ts'],
		env: { EVERYDAYBENCH_SEEDS: '.test/seeds', EVERYDAYBENCH_DATA: '.test/runs' },
		fileParallelism: false,
		// Grading snapshots every site of a run (~2 s, mostly the chains' sold seats); tests grade several attempts.
		testTimeout: 60_000
	}
});
