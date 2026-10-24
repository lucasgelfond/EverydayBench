import { defineConfig } from '@playwright/test';

// Browser tests drive the real sites at *.everydaybench.test (mapped to this machine) and grade each run with its task.
export default defineConfig({
	testDir: 'tests/e2e',
	timeout: 60_000,
	fullyParallel: true,
	reporter: [['list']],
	use: {
		launchOptions: { args: ['--host-resolver-rules=MAP *.everydaybench.test 127.0.0.1'] },
		trace: 'retain-on-failure'
	},
	// A production build: no first-request compiles racing the tests, and the code as it runs. An already-running
	// server on :8700 (pnpm dev while working) is used instead.
	webServer: { command: 'pnpm build && pnpm start', url: 'http://127.0.0.1:8700', reuseExistingServer: true, timeout: 180_000 }
});
