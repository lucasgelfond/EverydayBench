# Working on EverydayBench

EverydayBench is a set of fake websites plus tasks and graders for testing computer-use agents. Read README.md first. This
file is what an agent (or a person) changing the code needs to know.

## Layout

- `src/lib/sites.ts` — every site: family (`tickets`, `mail`, `pay`), kind, name, skin (CSS variables, wording,
  layout variants). Sites are served by hostname (`src/hooks.ts` reroutes `lumiscope.everydaybench.test/x` to `routes/tickets/x`).
- `src/lib/server/schema.ts` — the tables (Drizzle). Each site has its own SQLite database per run.
- `src/lib/server/actions/` — **every write a site makes**, as typed functions. Pages call these; graders replay them.
- `src/lib/server/catalog.ts` — reads for ticket pages. `runs.ts` — runs on disk (`runs/<id>/<site>.db`), the run clock.
- `src/lib/server/evals/` — task schema (`task.ts`), action registry for setups and reference solutions
  (`registry.ts`), assertions (`assertions.ts`), grading (`evaluate.ts`).
- `src/routes/<family>/` — pages. `src/lib/ui/` — shared components (seat map, date strip, card fields, search).
- `scripts/seed.ts` — builds `seeds/<scenario>/*.db` from code. `control/` — the harness API (Hono). `server.ts` —
  production entry. `tasks/` — tasks (`prompt.md` + `eval.json` each). `tests/unit` (Vitest), `tests/e2e` (Playwright).

## Rules that keep the benchmark honest

1. **Writes only through actions.** A page never writes to a database directly. Reads that look like writes to a grader
   (marking mail read) are listed in `DEFAULT_IGNORE`.
2. **Nothing is written until a consequential step**: seat picks, sign-ins and form progress live in URLs and signed
   cookies, so "no unexpected writes" means something.
3. **Determinism.** Anything a site makes up (codes, tokens, ids) comes from `rand.ts` seeded by the run's seed and what
   it's for, never `Math.random()` or wall-clock time. Times come from the run's clock (`ctx.now()`), never `new Date()`.
4. **Server first.** Every control must work before JavaScript loads and when text is filled programmatically (agents
   fill inputs; they don't always type keys). Prefer links and forms over client-only widgets; when a widget library is
   needed, use one (Bits UI) rather than rolling your own, and test it in Playwright's headless shell.
5. **Siblings stay in step.** Sibling sites differ only in skin. A change to a family's flow changes every sibling, and
   `tests/e2e/parity.spec.ts` must still pass.
6. **Accessible names.** Agents read accessibility trees: every control has a real label or name ("Row G, seat 9,
   available").

## Adding a task

1. Make `tasks/<family>/<name>/` with two files. `prompt.md` is what the agent gets: front matter (`start`, `policy`,
   `known`) and the ticket in the owner's words; it can be reworded without touching grading. `eval.json` is the
   deterministic part: `sites`, the scenario and clock (`initial`), a reference solution (actions from `registry.ts`),
   assertions and required answer facts (`evaluation`), `tags`.
2. Pick concrete things from the seeds (query `seeds/<scenario>/*.db`) so the task has one right outcome, or grade an
   open choice with assertions (`basis: ["ASSERT", "ANSWER"]`, plus `writes_only`).
3. `pnpm test` checks the reference replays deterministically. Add a golden path to `tests/e2e/` that does the task
   through the UI and asserts `grade(...).pass`.

Tasks should come from real errands: when the owner asks their agent for something new, add the EverydayBench equivalent here
(made-up sites and names, the same flow and difficulty), so it can be benchmarked and improved on.

## Adding a site

Add it to `SITES`; if it's a new family, add its tables to `FAMILY_TABLES`, its actions, routes under
`src/routes/<family>/`, and seed data in `scripts/seed.ts`. Then screenshots (`node scripts/screenshots.ts`) and the
README's table.

## Commands

`pnpm seed`, `pnpm dev` (sites :8700), `pnpm control` (:8701), `pnpm check` (types), `pnpm test`, `pnpm test:e2e`,
`pnpm build && pnpm start` (production, both ports). Style: tight TypeScript, comments that say why, no `any`.
