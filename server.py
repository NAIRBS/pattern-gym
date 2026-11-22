"""Pattern Gym - local server.

Run:  python server.py       then open http://localhost:8787
Standard library only. Serves the UI, runs your code against tests,
and stores progress in progress.json next to this file.
"""
import json
import os
import subprocess
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(ROOT, "static")
PROGRESS = os.path.join(ROOT, "progress.json")
PORT = int(os.environ.get("PORT", "8787"))

sys.path.insert(0, ROOT)
from content import load_all  # noqa: E402

CONTENT = load_all()
PROBLEMS = {p["id"]: p for p in CONTENT["problems"]}
SYNTAX = {c["id"]: c for c in CONTENT["syntax"]}

MIME = {".html": "text/html", ".css": "text/css", ".js": "application/javascript",
        ".json": "application/json", ".svg": "image/svg+xml", ".ico": "image/x-icon"}


def run_code(code, tests_spec, timeout=6):
    """Run user code against a test spec in a separate Python process."""
    payload = json.dumps({"code": code, "spec": tests_spec})
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        f.write(payload)
        path = f.name
    try:
        proc = subprocess.run(
            [sys.executable, "-I", os.path.join(ROOT, "runner.py"), path],
            capture_output=True, text=True, timeout=timeout, cwd=tempfile.gettempdir(),
        )
        out = proc.stdout.strip().splitlines()
        if not out:
            return {"ok": False, "error": (proc.stderr or "No output from runner")[-2000:], "results": []}
        return json.loads(out[-1])
    except subprocess.TimeoutExpired as e:
        return timeout_result(e.stdout, timeout)
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


def timeout_result(stdout, timeout):
    """A run hit the time limit. If the runner had reached the hidden large tests, every visible example
    passed and the code is simply too slow; say which test it was."""
    out = stdout.decode("utf-8", "replace") if isinstance(stdout, bytes) else (stdout or "")
    last = None
    for line in out.splitlines():
        if line.startswith("PROGRESS "):
            last = line[len("PROGRESS "):]
    if last:
        info = json.loads(last)
        return {"ok": False, "slow": True, "results": [
            {"pass": True, "input": f"All {info.get('visible', 0)} examples passed"},
            {"pass": False, "input": info["perf"], "hidden": True,
             "error": f"Too slow: still running after {timeout} s"}],
            "error": f"Correct on every example, but too slow on {info['perf'][0].lower() + info['perf'][1:]}. "
                     "Look for repeated work, like an inner loop or recomputing the same thing, and aim for the target complexity."}
    return {"ok": False, "error": f"Time limit exceeded ({timeout}s). Infinite loop or too slow?", "results": []}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):  # quieter console
        if "/api/" in (args[0] if args else ""):
            sys.stderr.write("%s\n" % (args[0],))

    def _send(self, code, body, ctype="application/json"):
        data = body if isinstance(body, bytes) else json.dumps(body).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype + "; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"{}")

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/content":
            return self._send(200, CONTENT)
        if path == "/api/state":
            if os.path.exists(PROGRESS):
                with open(PROGRESS, encoding="utf-8") as f:
                    return self._send(200, json.load(f))
            return self._send(200, {})
        if path == "/":
            path = "/index.html"
        fp = os.path.normpath(os.path.join(STATIC, path.lstrip("/")))
        if not fp.startswith(STATIC) or not os.path.isfile(fp):
            return self._send(404, {"error": "not found"})
        with open(fp, "rb") as f:
            self._send(200, f.read(), MIME.get(os.path.splitext(fp)[1], "application/octet-stream"))

    def do_POST(self):
        path = self.path.split("?")[0]
        try:
            body = self._body()
        except Exception:
            return self._send(400, {"error": "bad json"})
        if path == "/api/state":
            tmp = PROGRESS + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(body, f)
            os.replace(tmp, PROGRESS)
            return self._send(200, {"ok": True})
        if path == "/api/run":
            p = PROBLEMS.get(body.get("id"))
            if not p:
                return self._send(404, {"error": "unknown problem"})
            spec = p["tests"] if body.get("hidden", True) else {k: v for k, v in p["tests"].items() if k != "perf"}
            if body.get("blank"):   # blank-page mode: nothing pre-imported or predefined
                spec = {**spec, "blank": True}
            return self._send(200, run_code(body.get("code", ""), spec))
        if path == "/api/syntax":
            c = SYNTAX.get(body.get("id"))
            if not c:
                return self._send(404, {"error": "unknown card"})
            spec = {"kind": "snippet", "setup": c["setup"], "check": c["check"]}
            return self._send(200, run_code(body.get("code", ""), spec, timeout=4))
        if path == "/api/script":   # Python tab: run a whole program on the given stdin (local only)
            cases = [{k: c[k] for k in ("stdin", "expected", "compare", "files", "outfile") if k in c} for c in body.get("cases", [])][:20]
            return self._send(200, run_code(body.get("code", ""), {"kind": "script", "cases": cases}, timeout=4))
        return self._send(404, {"error": "not found"})


if __name__ == "__main__":
    n = len(CONTENT["problems"])
    print(f"Pattern Gym: {n} coded problems, {len(CONTENT['sprint'])} sprint cards, "
          f"{len(CONTENT['syntax'])} syntax cards, {len(CONTENT['patterns'])} skeletons")
    print(f"Open http://localhost:{PORT}   (Ctrl+C to stop)")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
