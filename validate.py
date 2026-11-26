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

# combined problems (content/combos.py): real problem, real second pattern, not the main one
from content.combos import COMBOS as _COMBOS
_pids = {pt["id"] for pt in c["patterns"]}; _probs = {p["id"]: p for p in c["problems"]}
for _id, (_w, _how) in _COMBOS.items():
    if _id not in _probs or _w not in _pids or _probs[_id]["pattern"] == _w or not _how:
        bad += 1; print("COMBO", _id, _w)

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

# Python tab: every example runs cleanly, every Predict answer matches, every Write solution passes,
# and every "Where you'll see it" pattern finds at least one line in the reference solutions.
import re as _re
from runner import _norm_out
_sol_lines = [l for p in c["problems"] for l in p["solution"].split("\n")] + [l for pt in c["patterns"] for l in pt["skeleton"].split("\n")]
_ids, n_py = set(), 0
for sec in c["python"]:
    for les in sec["lessons"]:
        case = {"stdin": les["stdin"]}
        if les.get("files"):
            case.update(files=les["files"], outfile=les["outfile"])
        r = run_code(les["code"], {"kind": "script", "cases": [case]}, timeout=4)
        if not r["ok"]:
            bad += 1
            print("PY EXAMPLE FAIL", les["id"], r.get("error") or r["results"][0].get("error"))
        if les["find"] and not any(_re.search(les["find"], l) for l in _sol_lines):
            bad += 1
            print("PY FIND MATCHES NOTHING", les["id"], les["find"])
        for t in les["tasks"]:
            n_py += 1
            if t["id"] in _ids:
                bad += 1
                print("PY DUPLICATE TASK", t["id"])
            _ids.add(t["id"])
            if t["kind"] == "predict":
                r = run_code(t["code"], {"kind": "script", "cases": [{"stdin": t["stdin"], "expected": t["answer"]}]}, timeout=4)
            else:
                r = run_code(t["solution"], {"kind": "script", "cases": t["cases"]}, timeout=4)
            if not r["ok"]:
                bad += 1
                print("PY TASK FAIL", t["id"], r.get("error"), [(x.get("got"), x.get("expected"), x.get("error")) for x in r["results"] if not x["pass"]][:2])

# CoderPad program style: the reference program (solution + stdin driver) prints every expected output.
from content.stdio import reference_program
for p in c["problems"]:
    if p.get("stdio"):
        r = run_code(reference_program(p["solution"], p["stdio"]), {"kind": "script", "cases": p["stdio"]["cases"]}, timeout=6)
        if not r["ok"]:
            bad += 1
            print("STDIO FAIL", p["id"], r.get("error"), [(x.get("got"), x.get("expected"), x.get("error")) for x in r["results"] if not x["pass"]][:1])

# Bug Hunt: every planted bug matches its line in the reference and makes the visible tests fail.
from content.bug_hunt import apply as _apply_bug, BUG_KINDS
for p in c["problems"]:
    for b in p.get("bugs", []):
        lines = p["solution"].split("\n")
        if b["kind"] not in BUG_KINDS or b["line"] >= len(lines) or lines[b["line"]] != b["fixed"]:
            bad += 1
            print("BUG STALE", b["id"], "the solution changed: run python make_bugs.py")
            continue
        r = run_code(_apply_bug(p["solution"], b), {k: v for k, v in p["tests"].items() if k != "perf"}, timeout=4)
        if r.get("ok"):
            bad += 1
            print("BUG PASSES", b["id"], "the planted bug doesn't fail any test")

for p in c["problems"]:
    if not p["brute"] or len(p["plan"]) < 2:
        print("NO WALKTHROUGH", p["id"]); bad += 1
for pt in c["patterns"]:
    L = pt["lesson"]
    if not (L.get("why") and L.get("build") and L.get("bugs") and L.get("not_this")):
        print("INCOMPLETE LESSON", pt["id"]); bad += 1

    if not (L.get("primer") or {}).get("text"):
        print("NO PRIMER", pt["id"]); bad += 1
    # a course order must list exactly the pattern's non-twist problems
    if pt.get("course"):
        want = {p["id"] for p in c["problems"] if p["pattern"] == pt["id"] and not p.get("twist_of")}
        got = pt["course"]["order"]
        if set(got) != want or len(got) != len(set(got)):
            print("COURSE ORDER", pt["id"], "missing", sorted(want - set(got)), "unknown", sorted(set(got) - want)); bad += 1
        for k in pt["course"].get("notes", {}):
            if k not in want:
                print("COURSE NOTE", pt["id"], k); bad += 1
if not c.get("bigo_primer"):
    print("NO BIG-O PRIMER"); bad += 1

# other valid approaches: every field filled, a real pattern, and any code passes the problem's tests
from content.alternatives import ALTERNATIVES
for pid, alts in ALTERNATIVES.items():
    p = next((x for x in c["problems"] if x["id"] == pid), None)
    if not p:
        print("ALT UNKNOWN PROBLEM", pid); bad += 1; continue
    for a in alts:
        if a["pattern"] and a["pattern"] not in pids:
            print("ALT UNKNOWN PATTERN", pid, a["pattern"]); bad += 1
        if not all(a[k] for k in ("name", "how", "time", "space", "when")):
            print("ALT INCOMPLETE", pid, a["name"]); bad += 1
        if a["code"]:
            r = run_code(a["code"], {k: v for k, v in p["tests"].items() if k != "perf"})
            if not r["ok"]:
                bad += 1
                print("ALT FAIL", pid, a["name"], r.get("error"), [x for x in r["results"] if not x["pass"]][:1])

ids = [p["id"] for p in c["problems"]]
if len(ids) != len(set(ids)):
    print("DUPLICATE IDS"); bad += 1
# twist problems: each points at a real problem of the same pattern
byid = {p["id"]: p for p in c["problems"]}
for p in c["problems"]:
    t = p.get("twist_of")
    if t and (t not in byid or byid[t]["pattern"] != p["pattern"] or byid[t].get("twist_of")):
        print("BAD TWIST_OF", p["id"], t); bad += 1

print(f"{len(c['problems'])} problems, {len(c['sprint'])} sprint, {len(c['syntax'])} syntax, "
      f"{len(c['patterns'])} patterns -> {'ALL OK' if not bad else str(bad) + ' problem(s)'}")
sys.exit(1 if bad else 0)
