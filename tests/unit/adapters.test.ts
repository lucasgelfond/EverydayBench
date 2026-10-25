import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { DOMAIN, SITES } from '../../src/lib/sites';

test("Inspect's sandbox reaches every site by its name", () => {
	const compose = readFileSync('adapters/inspect/everydaybench_inspect/compose.yaml', 'utf8');
	const aliases = [...compose.matchAll(/^\s+- ([\w-]+)\.everydaybench\.test$/gm)].map((m) => m[1]).sort();

	expect(DOMAIN).toBe('everydaybench.test');
	expect(aliases).toEqual(Object.keys(SITES).sort());
});

test('a prompt for a harness without a vault has the logins and card, and one with an empty browser names the start page', async () => {
	const { loadTasks, promptFor } = await import('../../src/lib/server/evals/task');
	const tasks = loadTasks();
	const login = tasks.get('cloud/two-top-ups')!;
	const card = [...tasks.values()].find((t) => t.known.card_number)!;

	expect(promptFor(login)).not.toContain('bucket-brigade-43');
	expect(promptFor(login, { known: true })).toContain('- Cloudpail login: email sam@mailmoss.test, password bucket-brigade-43');
	expect(promptFor(card, { known: true })).toContain(`- My card: name Sam Rivera, number ${card.known.card_number}`);
	expect(promptFor(login)).toContain('Cloudpail is open in the browser.');
	expect(promptFor(login, { start: 'http://cloudpail.everydaybench.test:8700/?everydaybench_run=r1' })).toContain('Start at http://cloudpail.everydaybench.test:8700/?everydaybench_run=r1 (Cloudpail).');
});
