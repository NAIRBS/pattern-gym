"""Sanity-check all content: every reference solution must pass its tests,
every syntax answer must pass its check, every pattern id must exist.

Run:  python validate.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from content import load_all  # noqa: E402
from server import run_code  # noqa: E402

c = load_all()
pids = {p["id"] for p in c["patterns"]}
bad = 0

for p in c["problems"]:
    if p["pattern"] not in pids:
        print("UNKNOWN PATTERN", p["id"], p["pattern"]); bad += 1
    if not p["key_lines"]:
        print("NO KEY LINES", p["id"]); bad += 1
    visible = {k: v for k, v in p["tests"].items() if k != "perf"}   # correctness here; speed is checked below
    r = run_code(p["solution"], visible)
    if not r["ok"]:
        bad += 1
        print("FAIL", p["id"], r.get("error"), [x for x in r["results"] if not x["pass"]][:2])
    # starter must at least compile
    import re
    st = re.sub(r":\n    (\n|$)", r":\n    pass\n", p["starter"])
    try:
        compile(st, p["id"], "exec")
    except SyntaxError as e:
        print("STARTER", p["id"], e); bad += 1

    # the naive version shown in the Study walkthrough must be correct too (just slow)
    if p.get("brute_code"):
        rb = run_code(p["brute_code"], visible)
        if not rb["ok"]:
            bad += 1
            print("BRUTE FAIL", p["id"], rb.get("error"), [x for x in rb["results"] if not x["pass"]][:2])
        # the walkthrough labels the code and the meter with the first O(...) in the brute sentence
        # (app.js firstBigO), so it must have one with balanced brackets
        b = p.get("brute", "")
        i = b.find("O(")
        depth, closed = 0, False
        for ch in b[i + 1:] if i >= 0 else "":
            depth += (ch == "(") - (ch == ")")
            if depth == 0:
                closed = True
                break
        if not closed:
            bad += 1
            print("BRUTE COST", p["id"], "brute sentence needs an O(...) cost:", b)

# hidden large tests: the reference must pass them quickly, and a quadratic-or-worse brute force must not
import concurrent.futures as _cf
_PERF_REF_MS = 1500   # CPython; the browser (Pyodide) is ~2-3x slower and gets 6 s
perf_probs = [p for p in c["problems"] if p["tests"].get("perf")]
for p in perf_probs:
    r = run_code(p["solution"], p["tests"])
    if not r["ok"]:
        bad += 1
        print("PERF REF FAIL", p["id"], r.get("error"), [x for x in r["results"] if not x["pass"]][:1])
    elif r.get("perf_ms", 0) > _PERF_REF_MS:
        bad += 1
        print("PERF REF SLOW", p["id"], f"{r['perf_ms']} ms > {_PERF_REF_MS} ms")
def _brute(p):
    return p["id"], run_code(p["brute_code"], p["tests"])
with _cf.ThreadPoolExecutor(max_workers=6) as pool:
    for pid, r in pool.map(_brute, [p for p in perf_probs if p.get("brute_code")]):
        if r["ok"]:
            bad += 1
            print("PERF WEAK", pid, "the brute force passes the hidden tests, so they don't test speed")

for s in c["sprint"]:
    if s["pattern"] not in pids:
        print("SPRINT PATTERN", s["num"], s["pattern"]); bad += 1

for s in c["syntax"]:
    r = run_code(s["answer"], {"kind": "snippet", "setup": s["setup"], "check": s["check"]})
    if not r["ok"]:
        bad += 1
        print("SYNTAX FAIL", s["id"], r.get("error"))

for p in c["problems"]:
    if not p["brute"] or len(p["plan"]) < 2:
        print("NO WALKTHROUGH", p["id"]); bad += 1
for pt in c["patterns"]:
    L = pt["lesson"]
    if not (L.get("why") and L.get("build") and L.get("bugs") and L.get("not_this")):
        print("INCOMPLETE LESSON", pt["id"]); bad += 1

ids = [p["id"] for p in c["problems"]]
if len(ids) != len(set(ids)):
    print("DUPLICATE IDS"); bad += 1

print(f"{len(c['problems'])} problems, {len(c['sprint'])} sprint, {len(c['syntax'])} syntax, "
      f"{len(c['patterns'])} patterns -> {'ALL OK' if not bad else str(bad) + ' problem(s)'}")
sys.exit(1 if bad else 0)
