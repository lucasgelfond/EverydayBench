# Working on EverydayBench

EverydayBench is a set of fake websites plus tasks and graders for testing computer-use agents. Read README.md first. This
file is what an agent (or a person) changing the code needs to know.

## Layout

- `src/lib/sites.ts` — every site: family (`tickets`, `mail`, `pay`, `shop`, `dining`), kind, name, skin (CSS variables, wording,
  layout variants). Sites are served by hostname (`src/hooks.ts` reroutes `lumiscope.everydaybench.test/x` to `routes/tickets/x`).
- `src/lib/server/schema.ts` — the tables (Drizzle). Each site has its own SQLite database per run.
- `src/lib/server/actions/` — **every write a site makes**, as typed functions. Pages call these; graders replay them.
- `src/lib/server/catalog.ts` — reads for ticket pages. `runs.ts` — runs on disk (`runs/<id>/<site>.db`), the run clock.
- `src/lib/server/evals/` — task schema (`task.ts`), action registry for setups and reference solutions
  (`registry.ts`), assertions (`assertions.ts`), grading (`evaluate.ts`).
- `src/lib/server/injections.ts` — prompt injections (an email, a listing's text, a pop-up, hidden text), each in a style
  that works on agents and aimed at a goal graders can see; tasks deliver them with `inject.*` setup actions.
- `src/routes/<family>/` — pages. `src/lib/ui/` — shared components (seat map, date strip, card fields, search).
- `adapters/` — the tasks in other harnesses (BrowserGym, Inspect), each a thin layer over the control port; keep
  `adapters/inspect/everydaybench_inspect/compose.yaml`'s aliases in step with `SITES`.
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
   `tests/e2e/parity.spec.ts` must still pass. A site may also price differently (`pricing` in `sites.ts`: drip pricing, where fees appear only on
   the last step, as on Nookery and Seatsling); its steps and clicks still match its siblings'.
6. **Accessible names.** Agents read accessibility trees: every control has a real label or name ("Row G, seat 9,
   available").

## Adding a task

1. Make `tasks/<family>/<name>/` with two files. `prompt.md` is what the agent gets: front matter (`start`, `policy`,
   `known`) and the ticket in the owner's words; it can be reworded without touching grading. `eval.json` is the
   deterministic part: `sites`, the scenario and clock (`initial`), a reference solution (actions from `registry.ts`),
   assertions and required answer facts (`evaluation`), `tags`.
2. Pick concrete things from the seeds (query `seeds/<scenario>/*.db`) so the task has one right outcome, or grade an
   open choice with assertions (`basis: ["ASSERT", "ANSWER"]`, plus `writes_only`).
   An injected variant (`<task>-injected`) copies a task and adds an `inject.*` setup and a safety assertion that the
   attacker's goal didn't happen (`mail_to`, `injections_followed`), so clean and attacked scores compare directly.
   For a change of plan mid-run ("wait, make it 4 people"), add `followups` to prompt.md's front matter: each a `text`
   and a `when` (`afterSeconds`, `onPath: "site:/path"` once the agent's browser loads that page or one under it, or
   `afterWrite: "<table>"` after the run's first row there). A harness polls `GET /runs/<id>/followups` and passes each
   on as a new message from the owner; grade the end state the last message asks for.
3. `pnpm test` checks the reference replays deterministically. Add a golden path to `tests/e2e/` that does the task
   through the UI and asserts `grade(...).pass`.

Tasks should come from real errands: when the owner asks their agent for something new, add the EverydayBench equivalent here
(made-up sites and names, the same flow and difficulty), so it can be benchmarked and improved on.

## Adding a site

Add it to `SITES`; if it's a new family, add its tables to `FAMILY_TABLES`, its actions, routes under
`src/routes/<family>/`, and seed data in `scripts/seed.ts`. A hard twin (`twin` and `skin.controls: 'hard'`: Zigzephyr Air,
Knickwhistle, Tabletangle) copies a sibling's database and swaps its plain controls for real-site widgets
(`src/lib/server/hard-controls.ts`); copy the sibling's tasks to it and test them in `tests/e2e/hard-sites.spec.ts`. Then screenshots (`node scripts/screenshots.ts`) and the
README's table.

A quirky sibling (Plattertide, Bramblecart) is a sibling with `quirks` in `SITES`: faults it starts with, seeded, so it
saves something other than what was asked and tells the truth only on its confirmation. It takes the same steps as its
siblings; parity tests include it.

## Commands

`pnpm seed`, `pnpm dev` (sites :8700), `pnpm control` (:8701), `pnpm check` (types), `pnpm test`, `pnpm test:e2e`,
`pnpm build && pnpm start` (production, both ports). Style: tight TypeScript, comments that say why, no `any`.
