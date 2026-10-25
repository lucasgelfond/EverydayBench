# Adapters

EverydayBench's tasks are defined once (`tasks/<family>/<name>/`: `prompt.md` and `eval.json`) and served by the control
port, which starts a run and grades it. A harness needs only a thin adapter on top of that; every task works in all of
them.

| Harness | Adapter | Logins and cards | The owner's later texts |
|---|---|---|---|
| [biscotti](https://github.com/lucasgelfond/biscotti) | `tests/bench/everydaybench.ts` there | its vault | `tell_task` |
| [BrowserGym](https://github.com/ServiceNow/BrowserGym) | `browsergym/` | in the goal | chat messages from the user |
| [Inspect](https://inspect.aisi.org.uk) | `inspect/` | in the prompt | not supported: those 4 tasks are left out by default |

In both, the agent's browser reaches EverydayBench's sites and nothing else: not the control port (which has the
answers) and not the live web.

## BrowserGym

```sh
docker build -t everydaybench . && docker run -p 8700:8700 -p 127.0.0.1:8701:8701 everydaybench
pip install -e adapters/browsergym
```

```python
import gymnasium as gym, everydaybench_browsergym
everydaybench_browsergym.register()  # browsergym/everydaybench.<family>.<name>, one per task
env = gym.make("browsergym/everydaybench.airline.skyhollow-one-way")
```

The episode ends at the agent's next message to the user after the user's last one, graded as its report (reward 1 for
a pass; the full grade is in `info["task_info"]`). The browser reaches the sites through a small proxy the adapter runs,
since BrowserGym doesn't take Chromium flags.

## Inspect

```sh
docker build -t everydaybench .
pip install -e adapters/inspect
inspect eval everydaybench_inspect/everydaybench --model openai/gpt-5 -T tasks=airline,dining
```

Each sample gets its own Docker sandbox: Chromium through Playwright MCP, and EverydayBench on a network with no way out
(`compose.yaml`, one hostname alias per site). The agent is Inspect's ReAct loop with the browser's tools; its submitted
answer is graded as its report.
