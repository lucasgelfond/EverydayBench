"""EverydayBench's tasks as an Inspect eval.

    docker build -t everydaybench .          # in the EverydayBench repo
    inspect eval everydaybench_inspect/everydaybench --model openai/gpt-5 -T tasks=airline/skyhollow-one-way

Each sample gets its own sandbox (compose.yaml): Chromium through Playwright MCP, and EverydayBench on a network with no
way out. The agent is a ReAct loop with the browser's tools; the answer it submits is graded as its report by
EverydayBench (1 for a pass), with the full grade in the score's metadata. The task's logins and card are in the prompt
(Inspect has no vault). Tasks where the owner texts again mid-run are left out unless `followups=True`: Inspect has no
way to send them, so those runs only see the first message.
"""

import asyncio
import json
import os
import re
from pathlib import Path

from inspect_ai import Task, task
from inspect_ai.agent import AgentPrompt, as_solver, react
from inspect_ai.dataset import MemoryDataset, Sample
from inspect_ai.scorer import Score, Target, accuracy, scorer, stderr
from inspect_ai.solver import Generate, Solver, TaskState, chain, solver
from inspect_ai.tool import mcp_server_sandbox
from inspect_ai.util import sandbox

HERE = Path(__file__).parent
# The tasks: the repo's own (the adapter is installed from a clone, with `pip install -e adapters/inspect`).
TASKS = Path(os.environ.get("EVERYDAYBENCH_TASKS") or HERE.parents[2] / "tasks")

INSTRUCTIONS = """You are a browser agent doing an errand for the owner. Use the browser tools to work on the websites: take a
snapshot to see a page, and act on its elements by ref. Check the result on the page before you finish. When you're done
(or can't go on), submit your report to the owner: what you did and the facts they need (prices, times, confirmation
numbers). Don't pay, book or send anything the request didn't ask for."""


def task_ids(tasks: str | list[str] | None, followups: bool) -> list[str]:
    ids = sorted(str(p.parent.relative_to(TASKS)) for p in TASKS.glob("*/*/prompt.md"))
    if not followups:
        ids = [i for i in ids if not re.search(r"^followups:", (TASKS / i / "prompt.md").read_text(), re.M)]
    if tasks:
        wanted = tasks.split(",") if isinstance(tasks, str) else tasks
        ids = [i for i in ids if any(i == w or i.startswith(w.rstrip("/") + "/") for w in wanted)]
    return ids


async def control(path: str, body: dict | None = None) -> dict:
    """EverydayBench's control port, from inside its own container (it listens on loopback there only)."""
    script = (
        "const [p, b] = process.argv.slice(1);"
        "fetch('http://127.0.0.1:8701' + p, b ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: b } : {})"
        ".then((r) => r.text()).then((t) => process.stdout.write(t))"
    )
    result = await sandbox("everydaybench").exec(["node", "-e", script, path, *([json.dumps(body)] if body is not None else [])])
    if not result.success:
        raise RuntimeError(f"EverydayBench control {path}: {result.stderr}")
    return json.loads(result.stdout)


@solver
def start_run() -> Solver:
    """Starts the sample's run once EverydayBench is up, and makes its prompt (with the start page) the request."""

    async def solve(state: TaskState, generate: Generate) -> TaskState:
        for _ in range(60):
            if (await sandbox("everydaybench").exec(["node", "-e", "fetch('http://127.0.0.1:8701/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"])).success:
                break
            await asyncio.sleep(1)
        run = await control("/runs", {"task": state.sample_id, "known": True, "open": False})
        state.store.set("run", run["run"])
        state.user_prompt.text = run["prompt"]
        return state

    return solve


@scorer(metrics=[accuracy(), stderr()])
def everydaybench_grade():
    async def score(state: TaskState, target: Target) -> Score:
        grade = await control(f"/runs/{state.store.get('run')}/grade", {"report": state.output.completion})
        return Score(value=1 if grade["pass"] else 0, answer=state.output.completion, explanation=json.dumps(grade.get("parts")), metadata={"grade": grade})

    return score


def browser_agent():
    browser = mcp_server_sandbox(name="browser", command="playwright-mcp", args=["--headless", "--isolated", "--no-sandbox", "--browser", "chromium"])
    return react(name="everydaybench", prompt=AgentPrompt(instructions=INSTRUCTIONS), tools=[browser])


@task
def everydaybench(tasks: str | list[str] | None = None, followups: bool = False, message_limit: int = 150) -> Task:
    """EverydayBench: everyday errands on made-up sites, graded on what the sites' databases end up holding.

    Args:
        tasks: task ids or families, comma-separated (e.g. "airline,dining/olive-steps-exact-time"); all by default.
        followups: include tasks where the owner texts again mid-run (Inspect can't send those texts).
        message_limit: the most messages a sample may take.
    """
    samples = [Sample(id=i, input="(set by start_run)", metadata={"family": i.split("/")[0]}) for i in task_ids(tasks, followups)]
    return Task(
        dataset=MemoryDataset(samples, name="everydaybench"),
        solver=chain(start_run(), as_solver(browser_agent())),
        scorer=everydaybench_grade(),
        sandbox=("docker", str(HERE / "compose.yaml")),
        message_limit=message_limit,
    )
