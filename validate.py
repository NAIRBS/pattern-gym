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
    r = run_code(p["solution"], p["tests"])
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
        rb = run_code(p["brute_code"], p["tests"])
        if not rb["ok"]:
            bad += 1
            print("BRUTE FAIL", p["id"], rb.get("error"), [x for x in rb["results"] if not x["pass"]][:2])

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
