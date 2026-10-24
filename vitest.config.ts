import { defineConfig } from 'vitest/config';

// Unit tests use their own seeds and runs, so they never touch a dev server's.
export default defineConfig({
	test: {
		include: ['tests/unit/**/*.test.ts'],
		env: { EVERYDAYBENCH_SEEDS: '.test/seeds', EVERYDAYBENCH_DATA: '.test/runs' },
		fileParallelism: false
	}
});
