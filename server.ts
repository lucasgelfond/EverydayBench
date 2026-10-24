// Production: the sites (the built SvelteKit app) and the control port, in one process.
//   pnpm build && pnpm seed && pnpm start
import { createServer } from 'node:http';
import { serve } from '@hono/node-server';
import { control } from './control/app.ts';

// One server, many hostnames: the adapter can't be given a single ORIGIN, so it takes each request's host and its
// protocol from x-forwarded-proto (set by a TLS proxy in front, or plain http here). It reads these settings on import.
process.env.PROTOCOL_HEADER ??= 'x-forwarded-proto';
process.env.HOST_HEADER ??= 'host';
// @ts-expect-error: the build's handler has no types.
const { handler } = await import('./build/handler.js');

const port = Number(process.env.PORT ?? 8700);
const controlPort = Number(process.env.EVERYDAYBENCH_CONTROL_PORT ?? 8701);
createServer((req, res) => {
	req.headers['x-forwarded-proto'] ??= 'http';
	handler(req, res);
}).listen(port, process.env.HOST ?? '0.0.0.0', () => console.log(`EverydayBench sites on :${port}`));
serve({ fetch: control.fetch, port: controlPort, hostname: process.env.EVERYDAYBENCH_CONTROL_HOST ?? '127.0.0.1' }, () => console.log(`EverydayBench control on :${controlPort}`));
