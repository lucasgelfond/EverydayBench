"""EverydayBench's tasks as BrowserGym environments, one per task: browsergym/everydaybench.<family>.<name>.

EverydayBench (its Docker image, with the control port on loopback) must be running:

    docker run -p 8700:8700 -p 127.0.0.1:8701:8701 everydaybench

    import gymnasium as gym, everydaybench_browsergym
    everydaybench_browsergym.register()
    env = gym.make("browsergym/everydaybench.airline.skyhollow-business-difference")

The task's logins and card are in the goal (BrowserGym has no vault). The owner's later texts arrive as chat messages
from the user. The episode ends at the agent's next message to the user after the last of the user's, which is graded
as its report: reward 1 for a pass, 0 otherwise, with the full grade in the info.
"""

import http.client
import json
import os
import threading
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from browsergym.core.registration import register_task
from browsergym.core.task import AbstractBrowserTask

# The control port (never the agent's browser), and the server the sites' names (*.everydaybench.test) stand for.
CONTROL = os.environ.get("EVERYDAYBENCH_CONTROL", "http://127.0.0.1:8701")
SERVER = os.environ.get("EVERYDAYBENCH_SERVER", "127.0.0.1")
DOMAIN = "everydaybench.test"


def control(path: str, body: dict | None = None, method: str | None = None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(f"{CONTROL}{path}", data=data, method=method or ("POST" if data else "GET"), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as res:
        text = res.read().decode()
    return json.loads(text) if text else None


class Proxy(BaseHTTPRequestHandler):
    """The browser's proxy: a site's request goes to the server as it is, under the site's own name (BrowserGym doesn't
    take Chromium flags, so the names can't be mapped to the server there); anything else is refused."""

    def relay(self):
        url = urlparse(self.path)
        if not (url.hostname or "").endswith(f".{DOMAIN}"):
            return self.send_error(403, "EverydayBench's sites only")
        body = self.rfile.read(int(self.headers.get("Content-Length") or 0))
        conn = http.client.HTTPConnection(SERVER, url.port or 80, timeout=60)
        headers = {k: v for k, v in self.headers.items() if k.lower() not in ("proxy-connection", "connection", "keep-alive")}
        conn.request(self.command, url._replace(scheme="", netloc="").geturl() or "/", body=body or None, headers=headers)
        res = conn.getresponse()
        data = res.read()
        self.send_response(res.status, res.reason)
        for k, v in res.getheaders():
            if k.lower() not in ("transfer-encoding", "connection", "content-length"):
                self.send_header(k, v)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
        conn.close()

    do_GET = do_POST = do_PUT = do_PATCH = do_DELETE = do_HEAD = do_OPTIONS = relay

    def log_message(self, *args):
        pass


_proxy = None


def proxy() -> str:
    global _proxy
    if not _proxy:
        _proxy = ThreadingHTTPServer(("127.0.0.1", 0), Proxy)
        threading.Thread(target=_proxy.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{_proxy.server_address[1]}"


def only_sites(route) -> None:
    """The agent's browser reaches EverydayBench's sites and nothing else: not the control port (which has the answers;
    Chromium sends loopback around a proxy) and not the live web."""
    if (urlparse(route.request.url).hostname or "").endswith(f".{DOMAIN}"):
        route.continue_()
    else:
        route.abort()


class EverydayBenchTask(AbstractBrowserTask):
    @classmethod
    def get_task_id(cls):
        return "everydaybench"

    def __init__(self, seed: int, task: str) -> None:
        super().__init__(seed)
        self.task = task
        self.run = None
        self.followups = 0
        self.viewport = {"width": 1280, "height": 800}
        # EverydayBench's pages don't need BrowserGym's default slow motion.
        self.slow_mo = 0

    def setup(self, page):
        run = control("/runs", {"task": self.task, "known": True})
        self.run, self.followups = run["run"], run["followups"]
        page.context.route("**/*", only_sites)
        page.goto(run["start"])
        return run["prompt"], {"run": self.run}

    def validate(self, page, chat_messages):
        # The owner's texts now due, passed on as the user's next message.
        due = control(f"/runs/{self.run}/followups") if self.followups else []
        if due:
            return 0.0, False, "\n\n".join(d["text"] for d in due), {}
        # Done once the agent has answered the user's latest message.
        roles = [m["role"] for m in chat_messages]
        last_user = max((i for i, r in enumerate(roles) if r == "user"), default=-1)
        answers = [m["message"] for m in chat_messages[last_user + 1 :] if m["role"] == "assistant"]
        if last_user < 0 or not answers:
            return 0.0, False, "", {}
        grade = control(f"/runs/{self.run}/grade", {"report": answers[-1]})
        return float(grade["pass"]), True, "", {"grade": grade}

    def teardown(self) -> None:
        if self.run and not os.environ.get("EVERYDAYBENCH_KEEP_RUNS"):
            control(f"/runs/{self.run}", method="DELETE")


def env_id(task: str) -> str:
    return f"everydaybench.{task.replace('/', '.')}"


def register() -> list[str]:
    """Registers every EverydayBench task (from the running server) as browsergym/everydaybench.<family>.<name>."""
    ids = []
    for t in control("/tasks"):
        register_task(env_id(t["id"]), EverydayBenchTask, task_kwargs={"task": t["id"]}, kwargs={"pw_context_kwargs": {"proxy": {"server": proxy()}}})
        ids.append(f"browsergym/{env_id(t['id'])}")
    return ids
