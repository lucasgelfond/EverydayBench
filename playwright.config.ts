import { defineConfig } from '@playwright/test';

// Browser tests drive the real sites at *.everydaybench.test (mapped to this machine) and grade each run with its task.
// PORT moves the server (and EVERYDAYBENCH_CONTROL_PORT its control port), e.g. for two checkouts testing at once.
const port = Number(process.env.PORT ?? 8700);
process.env.EVERYDAYBENCH_ORIGIN ??= `http://{site}.everydaybench.test:${port}`;
process.env.EVERYDAYBENCH_CONTROL_PORT ??= String(port + 1);

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
	// server on the port (pnpm dev while working) is used instead.
	webServer: { command: 'pnpm build && pnpm start', url: `http://127.0.0.1:${port}`, reuseExistingServer: true, timeout: 180_000 }
});
