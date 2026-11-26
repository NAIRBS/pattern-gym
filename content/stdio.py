"""Program style (stdin/stdout) versions of the function problems, for CoderPad mode.

stdio_for(problem) turns a problem's test cases into text input and expected output, the way HackerRank-style
judges give them, with a plain-English description of the format and a reference program (the reference
solution plus a driver that reads stdin and prints). Returns None when the problem doesn't fit a text format
(design classes, custom harnesses, extra classes, dicts, nested lists deeper than 2).

Text format, one argument after another:
  number or word        one line
  true/false            one line, lowercase
  list of numbers       a line with n, then a line with the n values separated by spaces
  list of words         the same; or n lines, one word each, when a word can contain a space or be empty
  grid / list of lists  a line with R, then R lines, one row each, values separated by spaces
  linked list           like a list of numbers
  several linked lists  a line with k, then k lines, one list's values each
  linked list + cycle   n, the values, then pos (the index the tail links back to, -1 for none)
  tree                  one line, level order, `null` for a missing child
Output: a number/word on one line, true/false lowercase, a list of numbers on one line, a list of words one per
line, a grid one row per line, a tree in level order with `null`, `null` for None.
validate.py runs every reference program against every case.
"""
import json
import re

HEADER = """import sys
from typing import *
from collections import *
from heapq import *
import heapq, math, bisect, itertools, functools, string
from functools import cache, lru_cache, reduce
from itertools import *
sys.setrecursionlimit(20000)
"""
LISTNODE = """
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
"""
TREENODE = """
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
"""


def _scalar(v):
    if isinstance(v, bool):
        return "bool"
    if isinstance(v, int):
        return "int"
    if isinstance(v, float):
        return "float"
    if isinstance(v, str):
        return "str"
    return None


def _kind(values, special=None):
    """The text kind for one argument (or the return value), from all its values across the cases."""
    if special in ("tree", "linked", "linked_many", "linked_cycle"):
        return special
    kinds = set()
    for v in values:
        if v is None:
            kinds.add("none")
        elif _scalar(v):
            kinds.add(_scalar(v))
        elif isinstance(v, list):
            if all(_scalar(x) in ("int", "float") and not isinstance(x, bool) for x in v):
                kinds.add("list_num")
            elif all(isinstance(x, str) for x in v):
                kinds.add("list_str_lines" if any(x == "" or " " in x for x in v) else "list_str")
            elif all(isinstance(x, bool) for x in v):
                kinds.add("list_bool")
            elif all(isinstance(x, list) and all(_scalar(y) in ("int", "float") and not isinstance(y, bool) for y in x) for x in v) and any(v):
                kinds.add("grid_num")
            elif all(isinstance(x, list) and all(isinstance(y, str) and y and " " not in y for y in x) for x in v) and any(v):
                kinds.add("grid_str")
            elif all(isinstance(x, list) and not x for x in v):
                kinds.add("grid_empty")
            else:
                return None
        else:
            return None
    if "none" in kinds:
        return None
    if kinds == {"int", "float"}:
        return "float"
    if "grid_empty" in kinds:   # a list of empty rows fits either grid kind
        kinds.discard("grid_empty")
        if not kinds:
            return "grid_num"
    if len(kinds) == 1:
        return kinds.pop()
    # an empty list looks like a list of numbers; let the other list kind win
    lists = kinds & {"list_num", "list_str", "list_str_lines", "list_bool", "grid_num", "grid_str"}
    if lists == kinds and "list_num" in kinds and len(kinds) == 2:
        return (kinds - {"list_num"}).pop()
    if kinds == {"list_str", "list_str_lines"}:
        return "list_str_lines"
    return None


def _all_ints(values):
    def walk(v):
        if isinstance(v, list):
            return all(walk(x) for x in v)
        return v is None or (isinstance(v, int) and not isinstance(v, bool))
    return all(walk(v) for v in values)


# ---------- writing values as text ----------
def _w(kind, v):
    if kind in ("int", "float", "str"):
        return [str(v)]
    if kind == "bool":
        return ["true" if v else "false"]
    if kind in ("list_num", "list_str", "linked"):
        return [str(len(v)), " ".join(str(x) for x in v)]
    if kind == "list_bool":
        return [str(len(v)), " ".join("true" if x else "false" for x in v)]
    if kind == "list_str_lines":
        return [str(len(v))] + list(v)
    if kind in ("grid_num", "grid_str"):
        return [str(len(v))] + [" ".join(str(x) for x in row) for row in v]
    if kind == "linked_many":
        return [str(len(v))] + [" ".join(str(x) for x in row) for row in v]
    if kind == "linked_cycle":
        vals, pos = v
        return [str(len(vals)), " ".join(str(x) for x in vals), str(pos)]
    if kind == "tree":
        return [" ".join("null" if x is None else str(x) for x in v) or "null"]
    raise ValueError(kind)


def _out(kind, v):
    """Expected output text for a return value."""
    if v is None:
        return "null"
    if kind in ("int", "str"):
        return str(v)
    if kind == "float":
        return repr(float(v))
    if kind == "bool":
        return "true" if v else "false"
    if kind in ("list_num", "linked"):
        return " ".join(str(x) for x in v)
    if kind == "list_bool":
        return " ".join("true" if x else "false" for x in v)
    if kind in ("list_str", "list_str_lines"):
        return "\n".join(v)
    if kind in ("grid_num", "grid_str"):
        return "\n".join(" ".join(str(x) for x in row) for row in v)
    if kind == "tree":
        return " ".join("null" if x is None else str(x) for x in v)
    raise ValueError(kind)


# ---------- describing the format ----------
def _describe_in(kind, name, num):
    n = f"`{name}`"
    return {
        "int": f"one line: {n}",
        "float": f"one line: {n}",
        "str": f"one line: the string {n} (it may be empty)",
        "bool": f"one line: {n}, `true` or `false`",
        "list_num": f"a line with the length of {n}, then a line with its {num} separated by spaces",
        "list_bool": f"a line with the length of {n}, then a line with its values, `true` or `false`",
        "list_str": f"a line with the length of {n}, then a line with its words separated by spaces",
        "list_str_lines": f"a line with the length of {n}, then one line per string",
        "grid_num": f"a line with the number of rows of {n}, then one line per row, its {num} separated by spaces",
        "grid_str": f"a line with the number of rows of {n}, then one line per row, its strings separated by spaces",
        "linked": f"the linked list {n}: a line with its length, then a line with its values",
        "linked_many": f"a line with the number of linked lists in {n}, then one line per list with its values",
        "linked_cycle": f"the linked list {n}: its length, its values, then `pos`, the index the tail links back to (-1 if none)",
        "tree": f"the tree {n} on one line in level order, with `null` for a missing child",
    }[kind]


def _describe_out(kind):
    return {
        "int": "one line: the number",
        "float": "one line: the number (within 1e-5)",
        "str": "one line: the string",
        "bool": "one line: `true` or `false`",
        "list_num": "one line: the values separated by spaces (an empty line if there are none)",
        "list_bool": "one line: the values, `true` or `false`, separated by spaces",
        "list_str": "one string per line",
        "list_str_lines": "one string per line",
        "grid_num": "one line per row, values separated by spaces (nothing if there are no rows)",
        "grid_str": "one line per row, values separated by spaces (nothing if there are no rows)",
        "linked": "one line: the list's values separated by spaces",
        "tree": "one line: the tree in level order, `null` for a missing child",
    }[kind]


# ---------- the reference driver ----------
def _reader(kind, num):
    conv = "int" if num == "int" else "float"
    return {
        "int": "int(line())",
        "float": "float(line())",
        "str": "line()",
        "bool": "line().strip() == 'true'",
        "list_num": f"read_list({conv})",
        "list_bool": "[t == 'true' for t in read_list(str)]",
        "list_str": "read_list(str)",
        "list_str_lines": "[line() for _ in range(int(line()))]",
        "grid_num": f"[list(map({conv}, line().split())) for _ in range(int(line()))]",
        "grid_str": "[line().split() for _ in range(int(line()))]",
        "linked": "build_list(read_list(int))",
        "linked_many": "[build_list(list(map(int, line().split()))) for _ in range(int(line()))]",
        "linked_cycle": "build_cycle(read_list(int), int(line()))",
        "tree": "build_tree([None if t == 'null' else int(t) for t in line().split()])",
    }[kind]


def _printer(kind):
    return {
        "int": "print(r)",
        "float": "print(r)",
        "str": "print(r)",
        "bool": "print('true' if r else 'false')",
        "list_num": "print(*r)",
        "list_bool": "print(*['true' if x else 'false' for x in r])",
        "list_str": "print('\\n'.join(r))",
        "list_str_lines": "print('\\n'.join(r))",
        "grid_num": "print('\\n'.join(' '.join(map(str, row)) for row in r))",
        "grid_str": "print('\\n'.join(' '.join(map(str, row)) for row in r))",
        "linked": "print(*to_values(r))",
        "tree": "print(' '.join('null' if x is None else str(x) for x in tree_values(r)))",
    }[kind]


HELPERS = {
    "read": """
_lines = sys.stdin.read().split('\\n')
_at = 0
def line():
    global _at
    _at += 1
    return _lines[_at - 1] if _at - 1 < len(_lines) else ''

def read_list(conv):
    n = int(line())
    vals = line().split()
    return [conv(t) for t in vals[:n]]
""",
    "build_list": """
def build_list(vals):
    dummy = tail = ListNode()
    for v in vals:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next
""",
    "build_cycle": """
def build_cycle(vals, pos):
    head = build_list(vals)
    nodes, cur = [], head
    while cur:
        nodes.append(cur)
        cur = cur.next
    if pos >= 0 and nodes:
        nodes[-1].next = nodes[pos]
    return head
""",
    "to_values": """
def to_values(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out
""",
    "build_tree": """
def build_tree(vals):
    if not vals or vals[0] is None:
        return None
    root = TreeNode(vals[0])
    q, i = deque([root]), 1
    while q and i < len(vals):
        node = q.popleft()
        if i < len(vals) and vals[i] is not None:
            node.left = TreeNode(vals[i])
            q.append(node.left)
        i += 1
        if i < len(vals) and vals[i] is not None:
            node.right = TreeNode(vals[i])
            q.append(node.right)
        i += 1
    return root
""",
    "tree_values": """
def tree_values(root):
    out, q = [], deque([root])
    while q:
        node = q.popleft()
        out.append(None if node is None else node.val)
        if node:
            q.append(node.left)
            q.append(node.right)
    while out and out[-1] is None:
        out.pop()
    return out
""",
}


def _params(starter):
    m = re.search(r"def\s+\w+\(([^)]*)\)", starter or "")
    if not m:
        return []
    return [s.split(":")[0].split("=")[0].strip() for s in m.group(1).split(",") if s.strip() and s.strip() != "self"]


def stdio_for(p):
    t = p["tests"]
    if t.get("kind", "function") != "function" or t.get("harness") or t.get("prelude"):
        return None
    cases = t["cases"]
    names = _params(p["starter"])
    nargs = len(cases[0]["args"])
    if len(names) != nargs:
        names = [f"arg{i + 1}" for i in range(nargs)]
    types = t.get("arg_types") or [None] * nargs
    in_kinds = [_kind([c["args"][i] for c in cases], types[i]) for i in range(nargs)]
    if None in in_kinds:
        return None
    nums = ["int" if _all_ints([c["args"][i] for c in cases]) else "float" for i in range(nargs)]
    inplace = t.get("inplace")
    if inplace is not None:
        out_kind = in_kinds[inplace]
        if out_kind in ("linked_many", "linked_cycle"):
            return None
    else:
        exp = [c["expected"] for c in cases]
        out_kind = _kind([e for e in exp if e is not None] or [0], t.get("ret_type"))
        if out_kind is None or out_kind in ("linked_many", "linked_cycle"):
            return None
    # strings that span lines can't go on one line
    for i, k in enumerate(in_kinds):
        if k == "str" and any("\n" in c["args"][i] for c in cases):
            return None
    compare = t.get("compare")
    if compare == "unordered" and out_kind in ("grid_num", "grid_str"):
        compare = "unordered_nested"
    try:
        io_cases = []
        for c in cases:
            lines = []
            for k, v in zip(in_kinds, c["args"]):
                lines += _w(k, v)
            want = c["expected"]
            io_cases.append({"stdin": "\n".join(lines) + "\n", "expected": _out(out_kind, want), **({"compare": compare} if compare else {})})
    except (ValueError, TypeError):
        return None

    # reference program: header, node classes, the solution, helpers, the driver
    needs = set()
    for k in in_kinds + [out_kind]:
        if k in ("linked", "linked_many", "linked_cycle"):
            needs |= {"ListNode", "build_list"}
        if k == "linked_cycle":
            needs.add("build_cycle")
        if k == "tree":
            needs |= {"TreeNode", "build_tree"}
    if out_kind == "linked":
        needs.add("to_values")
    if out_kind == "tree":
        needs.add("tree_values")
    fn = t["fn"]
    call = f"Solution().{fn}" if re.search(r"^class Solution", p["solution"], re.M) else fn
    driver = [f"{n} = {_reader(k, num)}" for n, k, num in zip(names, in_kinds, nums)]
    if inplace is not None:
        driver.append(f"{call}({', '.join(names)})")
        driver.append(f"r = {names[inplace]}")
    else:
        driver.append(f"r = {call}({', '.join(names)})")
    if out_kind in ("linked", "tree"):   # an empty list or tree is None: it prints as an empty line
        driver.append(_printer(out_kind))
    else:
        driver.append("if r is None:\n    print('null')\nelse:\n    " + _printer(out_kind))
    fmt_in = [f"{_describe_in(k, n, 'numbers' if num == 'float' else 'integers')}" for n, k, num in zip(names, in_kinds, nums)]
    if inplace is not None:
        fmt_out = f"`{names[inplace]}` after your function changes it: {_describe_out(out_kind)}"
    else:
        fmt_out = _describe_out(out_kind) + ("; `null` when there's no answer" if any(c["expected"] is None for c in cases) else "")
    if compare in ("unordered", "unordered_nested"):
        fmt_out += ". Any order is accepted"
    order = ["ListNode", "TreeNode", "build_list", "build_cycle", "to_values", "build_tree", "tree_values"]
    return {"input": fmt_in, "output": fmt_out, "cases": io_cases, "needs": [h for h in order if h in needs], "driver": "\n".join(driver)}


# The pieces a reference program is built from (sent to the page once, as C.stdio_lib).
LIB = {"header": HEADER.strip("\n"), "ListNode": LISTNODE.strip("\n"), "TreeNode": TREENODE.strip("\n"),
       **{k: v.strip("\n") for k, v in HELPERS.items()}}


def reference_program(solution, s):
    """Header, node classes, the solution, the input reader, helpers, then the driver.
    static/app/shared.js (padReference) builds exactly the same text from C.stdio_lib."""
    classes = [LIB[k] for k in s["needs"] if k in ("ListNode", "TreeNode")]
    helpers = [LIB[k] for k in s["needs"] if k not in ("ListNode", "TreeNode")]
    return "\n\n".join([LIB["header"], *classes, solution.strip("\n"), LIB["read"], *helpers, s["driver"]]) + "\n"
