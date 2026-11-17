"""Executes user code against a test spec. Invoked by server.py in a subprocess.

Spec kinds:
  function : {"fn", "cases": [{"args": [...], "expected": ...}], "arg_types", "ret_type", "compare", "inplace"}
  design   : {"cls", "cases": [{"ops": [...], "args": [[...]], "expected": [...]}]}
  snippet  : {"setup": str, "check": str}   (user code runs after setup; check is an expression that must be True)
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


def to_linked(ns, arr):
    dummy = ns["ListNode"]()
    cur = dummy
    for v in arr:
        cur.next = ns["ListNode"](v)
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
    T = ns["TreeNode"]
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


def run(code, spec):
    """Run code against spec and return the result dict. Also used in the browser (Pyodide worker)."""
    ns = {"__name__": "__solution__"}
    result = {"ok": False, "results": [], "error": None}
    try:
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
                cls = ns.get(spec["cls"])
                if cls is None:
                    raise NameError(f"Class '{spec['cls']}' not defined")
                obj, got = None, []
                for op, a in zip(case["ops"], case["args"]):
                    if op == spec["cls"]:
                        obj = cls(*a)
                        got.append(None)
                    else:
                        got.append(norm(getattr(obj, op)(*a)))
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
                fn = get_callable(ns, spec["fn"])
                types = spec.get("arg_types") or [None] * len(case["args"])
                args = [convert_in(ns, t, v) for t, v in zip(types, case["args"])]
                ret = fn(*args)
                if spec.get("inplace") is not None:
                    i = spec["inplace"]
                    ret = args[i]
                    got = convert_out(types[i], ret)
                else:
                    got = convert_out(spec.get("ret_type"), ret)
                r["input"] = ", ".join(short(a, 120) for a in case["args"])
                r["got"], r["expected"] = short(norm(got)), short(case["expected"])
                r["pass"] = same(got, case["expected"], spec.get("compare"))
        except Exception as e:
            tb = traceback.extract_tb(e.__traceback__)
            line = next((fr.lineno for fr in reversed(tb) if fr.filename == "<your code>"), None)
            r["error"] = f"{type(e).__name__}: {e}" + (f" (line {line})" if line else "")
        all_ok &= r["pass"]
        result["results"].append(r)
    result["ok"] = all_ok
    result["ms"] = round((time.perf_counter() - t0) * 1000, 1)
    return result


def run_json(payload):
    """Browser entry point: JSON {code, spec} in, JSON result out."""
    data = json.loads(payload)
    return json.dumps(run(data["code"], data["spec"]))


def main():
    with open(sys.argv[1], encoding="utf-8") as f:
        data = json.load(f)
    print(json.dumps(run(data["code"], data["spec"])))


if __name__ == "__main__":
    main()
