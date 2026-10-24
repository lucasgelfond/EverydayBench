// The control port on its own (beside `vite dev`, which serves the sites while developing).
import { serve } from '@hono/node-server';
import { control } from './app.ts';

const port = Number(process.env.EVERYDAYBENCH_CONTROL_PORT ?? 8701);
serve({ fetch: control.fetch, port, hostname: process.env.EVERYDAYBENCH_CONTROL_HOST ?? '127.0.0.1' }, () => console.log(`EverydayBench control on :${port}`));
