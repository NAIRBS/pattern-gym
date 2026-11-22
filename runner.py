"""Executes user code against a test spec. Invoked by server.py in a subprocess.

Spec kinds:
  function : {"fn", "cases": [{"args": [...], "expected": ...}], "arg_types", "ret_type", "compare", "inplace"}
  design   : {"cls", "cases": [{"ops": [...], "args": [[...]], "expected": [...]}]}
  snippet  : {"setup": str, "check": str}   (user code runs after setup; check is an expression that must be True)
Any spec may add "blank": true (blank-page mode): no prelude, so imports and ListNode/TreeNode are the code's own.
Whatever the code prints is returned as result["stdout"].
  script   : {"cases": [{"stdin": str, "expected": str?, "compare": mode?, "files": {name: text}?, "outfile": name?}]}
             a whole program, run once per case with stdin as its input; what it prints (or writes to
             outfile) is returned, and compared with expected when given. No prelude: imports are yours.
"""
import json
import sys
import time
import traceback

PRELUDE = """
import sys as _sys
_sys.setrecursionlimit(20000)
from typing import *
import collections, heapq, math, bisect, itertools, functools, string
from collections import *
from heapq import *
from functools import *
from itertools import *

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
"""


def _node_class(ns, name, fields):
    if name not in ns:
        raise NameError(f"{name} isn't defined. On a blank page you write it yourself: class {name} with {fields}")
    return ns[name]


def to_linked(ns, arr):
    dummy = _node_class(ns, "ListNode", "val and next")()
    cur = dummy
    for v in arr:
        cur.next = _node_class(ns, "ListNode", "val and next")(v)
        cur = cur.next
    return dummy.next


def from_linked(node, limit=10000):
    out = []
    while node is not None and len(out) < limit:
        out.append(node.val)
        node = node.next
    return out


def to_tree(ns, arr):
    if not arr or arr[0] is None:
        return None
    T = _node_class(ns, "TreeNode", "val, left and right")
    root = T(arr[0])
    q, i = [root], 1
    while q and i < len(arr):
        node = q.pop(0)
        if i < len(arr) and arr[i] is not None:
            node.left = T(arr[i]); q.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = T(arr[i]); q.append(node.right)
        i += 1
    return root


def from_tree(root):
    out, q = [], [root]
    while q:
        n = q.pop(0)
        if n is None:
            out.append(None)
        else:
            out.append(n.val)
            q.append(n.left)
            q.append(n.right)
    while out and out[-1] is None:
        out.pop()
    return out


def convert_in(ns, t, v):
    if t == "linked":
        return to_linked(ns, v)
    if t == "linked_many":
        return [to_linked(ns, a) for a in v]
    if t == "linked_cycle":  # v = [values, pos]; tail links to index pos (-1 = no cycle)
        vals, pos = v
        head = to_linked(ns, vals)
        if pos >= 0 and head:
            nodes, cur = [], head
            while cur:
                nodes.append(cur)
                cur = cur.next
            nodes[-1].next = nodes[pos]
        return head
    if t == "tree":
        return to_tree(ns, v)
    return json.loads(json.dumps(v))  # deep copy


def convert_out(t, v):
    if t == "linked":
        return from_linked(v)
    if t == "tree":
        return from_tree(v)
    if isinstance(v, tuple):
        return list(v)
    return v


def norm(v):
    if isinstance(v, tuple):
        return [norm(x) for x in v]
    if isinstance(v, list):
        return [norm(x) for x in v]
    return v


def same(got, exp, mode):
    got = norm(got)
    if mode == "unordered":
        try:
            return sorted(got) == sorted(exp)
        except TypeError:
            return False
    if mode == "unordered_nested":
        try:
            return sorted(sorted(x) for x in got) == sorted(sorted(x) for x in exp)
        except TypeError:
            return False
    if mode == "float":
        return abs(got - exp) < 1e-5
    return got == exp


def short(v, n=200):
    s = json.dumps(v) if not isinstance(v, str) else repr(v)
    return s if len(s) <= n else s[:n] + "..."


def get_callable(ns, name):
    if "Solution" in ns and hasattr(ns["Solution"], name):
        return getattr(ns["Solution"](), name)
    if name in ns and callable(ns[name]):
        return ns[name]
    raise NameError(f"Couldn't find function '{name}' (as a top-level def or a Solution method)")


def call_one(ns, spec, kind, args):
    """Run one input through a function or design class in namespace ns; return the normalised output.
    Used for the hidden large tests, on both the reference and your code, so they're treated identically."""
    if kind == "design":
        ops, a = args
        cls = ns.get(spec["cls"])
        if cls is None:
            raise NameError(f"Class '{spec['cls']}' not defined")
        obj, out = None, []
        for op, x in zip(ops, a):
            if op == spec["cls"]:
                obj = cls(*x)
                out.append(None)
            else:
                out.append(norm(getattr(obj, op)(*x)))
        return out
    fn = get_callable(ns, spec["fn"])
    types = spec.get("arg_types") or [None] * len(args)
    conv = [convert_in(ns, t, v) for t, v in zip(types, args)]
    ret = fn(*conv)
    if spec.get("inplace") is not None:
        i = spec["inplace"]
        return norm(convert_out(types[i], conv[i]))
    return norm(convert_out(spec.get("ret_type"), ret))


def run_perf(ns, spec, kind, visible, progress=None):
    """Hidden large tests (spec["perf"]): inputs from a seeded generator, expected answers from the
    reference solution. Returns result rows; stops at the first failure."""
    import copy
    import random
    perf = spec["perf"]
    gen = {}
    exec(PRELUDE, gen)
    exec(perf["gen"], gen)
    cases = gen["make"](random.Random(perf.get("seed", 7)))
    ref = {"__name__": "__reference__"}
    exec(PRELUDE, ref)
    if spec.get("prelude"):
        exec(spec["prelude"], ref)
    exec(perf["ref"], ref)
    rows, total = [], 0.0
    for k, args in enumerate(cases):
        label = f"Large hidden test {k + 1} of {len(cases)}" + (f" ({perf['size']})" if perf.get("size") else "")
        if progress:   # lets a time-out still say which test was too slow
            progress(json.dumps({"perf": label, "visible": visible}))
        want = call_one(ref, spec, kind, copy.deepcopy(args))
        t = time.perf_counter()
        try:
            got = call_one(ns, spec, kind, copy.deepcopy(args))
        except Exception as e:
            tb = traceback.extract_tb(e.__traceback__)
            line = next((fr.lineno for fr in reversed(tb) if fr.filename == "<your code>"), None)
            rows.append({"pass": False, "input": label, "hidden": True,
                         "error": f"{type(e).__name__}: {e}" + (f" (line {line})" if line else "")})
            break
        ms = (time.perf_counter() - t) * 1000
        total += ms
        ok = got == want if kind == "design" else same(got, want, spec.get("compare"))
        row = {"pass": ok, "input": f"{label}: {ms:.0f} ms", "hidden": True}
        if not ok:
            row.update(got=short(got, 120), expected=short(want, 120))
        rows.append(row)
        if not ok:
            break
    return rows, round(total, 1)


def _norm_out(s):
    """Trailing spaces on each line and trailing blank lines don't count (most judges agree)."""
    return "\n".join(l.rstrip() for l in s.replace("\r\n", "\n").rstrip("\n").split("\n")).rstrip("\n")


def _same_out(got, want, mode):
    """Compare printed output. mode: None (exact, after _norm_out), "unordered" (the same tokens in any order),
    "unordered_nested" (the same lines in any order, each line's tokens in any order), "float" (within 1e-5)."""
    if mode == "unordered":
        return sorted(got.split()) == sorted(want.split())
    if mode == "unordered_nested":
        rows = lambda s: sorted(" ".join(sorted(l.split())) for l in _norm_out(s).split("\n") if l.strip())
        return rows(got) == rows(want)
    if mode == "float":
        try:
            a, b = [float(x) for x in got.split()], [float(x) for x in want.split()]
        except ValueError:
            return False
        return len(a) == len(b) and all(abs(x - y) < 1e-5 for x, y in zip(a, b))
    return _norm_out(got) == _norm_out(want)


def _err_line(e):
    tb = traceback.extract_tb(e.__traceback__)
    line = next((fr.lineno for fr in reversed(tb) if fr.filename == "<your code>"), None)
    return f"{type(e).__name__}: {e}" + (f" (line {line})" if line else "")


def run_script(code, spec):
    import contextlib
    import io
    import os
    import tempfile
    result = {"ok": False, "results": [], "error": None}
    try:
        compiled = compile(code, "<your code>", "exec")
    except SyntaxError as e:
        result["error"] = f"SyntaxError: {e.msg} (line {e.lineno})"
        return result
    all_ok = True
    for case in spec.get("cases") or [{"stdin": ""}]:
        row = {"stdin": case.get("stdin", ""), "pass": False}
        here, tmp = os.getcwd(), None
        if case.get("files") or case.get("outfile"):   # file I/O exercises get a fresh folder
            tmp = tempfile.mkdtemp()
            os.chdir(tmp)
            for name, text in (case.get("files") or {}).items():
                with open(name, "w", encoding="utf-8") as f:
                    f.write(text)
        out, real_in, real_out = io.StringIO(), sys.stdin, sys.stdout
        sys.stdin = io.StringIO(case.get("stdin", ""))
        err = None
        t0 = time.perf_counter()
        try:
            with contextlib.redirect_stdout(out):
                exec(compiled, {"__name__": "__main__"})
                if sys.stdout is not out:        # the program pointed sys.stdout at a file: flush it
                    try:
                        sys.stdout.flush()
                        sys.stdout.close()
                    except Exception:
                        pass
        except SystemExit:
            pass
        except EOFError as e:
            err = _err_line(e) + " (input() ran out of input lines)"
        except Exception as e:
            err = _err_line(e)
        finally:
            sys.stdin, sys.stdout = real_in, real_out
        row["ms"] = round((time.perf_counter() - t0) * 1000, 1)
        got = out.getvalue()
        if case.get("outfile"):
            try:
                with open(case["outfile"], encoding="utf-8") as f:
                    got = f.read()
            except OSError:
                err = err or f"Your program didn't create {case['outfile']}"
        if tmp:
            os.chdir(here)
        row["got"] = got[:20000] + ("\n... (output cut at 20,000 characters)" if len(got) > 20000 else "")
        if err:
            row["error"] = err
        if "expected" in case:
            row["expected"] = case["expected"]
            row["pass"] = not err and _same_out(got, case["expected"], case.get("compare"))
        else:
            row["pass"] = not err
        all_ok &= row["pass"]
        result["results"].append(row)
    result["ok"] = all_ok
    return result


def run(code, spec, progress=None):
    """Run code against spec and return the result dict. Also used in the browser (Pyodide worker)."""
    if spec.get("kind") == "script":
        return run_script(code, spec)
    import contextlib
    import io
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        result = _run(code, spec, progress)
    printed = out.getvalue()
    if printed:
        result["stdout"] = printed[:20000] + ("\n... (output cut at 20,000 characters)" if len(printed) > 20000 else "")
    return result


def _run(code, spec, progress=None):
    ns = {"__name__": "__solution__"}
    result = {"ok": False, "results": [], "error": None}
    try:
        if not spec.get("blank"):
            exec(PRELUDE, ns)
        if spec.get("prelude"):
            exec(spec["prelude"], ns)
        if spec.get("kind") == "snippet":
            exec(spec.get("setup", ""), ns)
        exec(compile(code, "<your code>", "exec"), ns)
    except Exception:
        result["error"] = "".join(traceback.format_exc(limit=0)).strip()
        return result

    kind = spec.get("kind", "function")
    if kind == "snippet":
        try:
            ok = bool(eval(spec["check"], ns))
            result["ok"] = ok
            result["results"] = [{"pass": ok, "input": spec["check"]}]
        except Exception as e:
            result["error"] = f"{type(e).__name__}: {e}"
        return result

    all_ok = True
    t0 = time.perf_counter()
    for case in spec["cases"]:
        r = {"pass": False}
        try:
            if kind == "design":
                got = call_one(ns, spec, kind, (case["ops"], case["args"]))
                r["input"] = short(case["ops"]) + " " + short(case["args"])
                r["got"], r["expected"] = short(got), short(case["expected"])
                r["pass"] = got == case["expected"]
            elif spec.get("harness"):
                # custom driver: builds inputs, calls fn, returns a comparable value
                fn = get_callable(ns, spec["fn"])
                hg = {"ns": ns, "json": json, "from_linked": from_linked, "from_tree": from_tree,
                      "to_linked": lambda v: to_linked(ns, v), "to_tree": lambda v: to_tree(ns, v),
                      "get": lambda n: get_callable(ns, n)}
                exec(spec["harness"], hg)
                got = norm(hg["harness"](fn, json.loads(json.dumps(case["args"]))))
                r["input"] = ", ".join(short(a, 120) for a in case["args"])
                r["got"], r["expected"] = short(got), short(case["expected"])
                r["pass"] = same(got, case["expected"], spec.get("compare"))
            else:
                got = call_one(ns, spec, kind, case["args"])
                r["input"] = ", ".join(short(a, 120) for a in case["args"])
                r["got"], r["expected"] = short(got), short(case["expected"])
                r["pass"] = same(got, case["expected"], spec.get("compare"))
        except Exception as e:
            tb = traceback.extract_tb(e.__traceback__)
            line = next((fr.lineno for fr in reversed(tb) if fr.filename == "<your code>"), None)
            r["error"] = f"{type(e).__name__}: {e}" + (f" (line {line})" if line else "")
        all_ok &= r["pass"]
        result["results"].append(r)
    result["ms"] = round((time.perf_counter() - t0) * 1000, 1)
    # hidden large tests only once every visible example passes
    if all_ok and spec.get("perf"):
        try:
            rows, perf_ms = run_perf(ns, spec, kind, len(result["results"]), progress)
        except Exception as e:   # a broken generator is our bug, not yours
            rows, perf_ms = [{"pass": False, "input": "Large hidden tests", "error": f"Test setup error: {type(e).__name__}: {e}"}], 0
        result["results"].extend(rows)
        result["perf_ms"] = perf_ms
        all_ok = all(r["pass"] for r in rows)
        if not all_ok:
            result["slow_or_wrong"] = True
    result["ok"] = all_ok
    return result


def run_json(payload, progress=None):
    """Browser entry point: JSON {code, spec} in, JSON result out. progress(str) is a JS callback."""
    data = json.loads(payload)
    return json.dumps(run(data["code"], data["spec"], progress))


def main():
    with open(sys.argv[1], encoding="utf-8") as f:
        data = json.load(f)
    # progress lines let server.py explain a time-out ("too slow on large hidden test 1")
    print(json.dumps(run(data["code"], data["spec"], lambda s: print("PROGRESS " + s, flush=True))))


if __name__ == "__main__":
    main()
