"""Content loader. Each module exposes a list; load_all() returns one JSON-able dict."""
from .patterns import PATTERNS
from .problems import PROBLEMS as _P0
from .problems_a import PROBLEMS_A
from .problems_b import PROBLEMS_B
from .problems_c import PROBLEMS_C
from .problems_twist import PROBLEMS_TWIST, PERF_TWIST
from .problems_onramp import PROBLEMS_ONRAMP
PROBLEMS = sorted(_P0 + PROBLEMS_A + PROBLEMS_B + PROBLEMS_C + PROBLEMS_TWIST + PROBLEMS_ONRAMP, key=lambda p: p["num"])
from .sprint import SPRINT
from .syntax import SYNTAX
from .interview import CLARIFY_GENERIC, THINK_ALOUD, RUBRIC, COMPLEXITIES
from .study_patterns import LESSONS, METHOD, INPUT_SIZE, PRIMERS, COURSES, BIGO_PRIMER, BIGO_CHECK
from .study_problems import WALK
from .study_brute import BRUTE
from .perf import PERF
from .links import LEETCODE
from .python_course import PYTHON
from .references import DS_COSTS, ALGO_COSTS, STEPS, OPTIMIZE
from .stdio import stdio_for, LIB as STDIO_LIB
from .bug_hunt import BUGS, BUG_KINDS
PERF = {**PERF, **PERF_TWIST}
BUGS_BY_PROBLEM = {}
for _b in BUGS:
    BUGS_BY_PROBLEM.setdefault(_b["problem"], []).append(_b)


def _strip_marks(code):
    return "\n".join(l.replace("  # <<", "").rstrip() for l in code.strip("\n").splitlines())


def _key_lines(code):
    return [i for i, l in enumerate(code.strip("\n").splitlines()) if l.rstrip().endswith("# <<")]


def _starter(code):
    """Signatures only: the first def, or a class with its method defs."""
    lines = code.splitlines()
    if lines[0].startswith("class "):
        out = [lines[0]]
        for l in lines[1:]:
            if l.startswith("    def "):
                out += [l, "        pass", ""]
        return "\n".join(out).rstrip() + "\n"
    defs = [l for l in lines if l.startswith("def ")]  # every top-level function (e.g. encode + decode)
    return "\n\n".join(d + "\n    " for d in defs) + "\n"


def load_all():
    problems = []
    for p in PROBLEMS:
        p = dict(p)
        raw = p["solution"]
        p["key_lines"] = _key_lines(raw)
        p["solution"] = _strip_marks(raw)
        p["starter"] = _starter(p["solution"])
        brute, plan = WALK.get(p["id"], p.pop("walk", ("", [])))   # twist problems carry their own
        p["brute"], p["plan"] = brute, list(plan)
        p["brute_code"] = BRUTE.get(p["id"], p.get("brute_code", ""))
        if p["id"] in LEETCODE:
            slug, num, title, paid = LEETCODE[p["id"]]
            p["lc"] = {"slug": slug, "num": num, "title": title, "paid": paid}
        if p["id"] in PERF:   # hidden large tests: expected answers come from the reference at run time
            size, gen = PERF[p["id"]]
            p["tests"] = {**p["tests"], "perf": {"size": size, "gen": gen.strip("\n"), "ref": p["solution"]}}
        io = stdio_for(p)   # program-style (stdin/stdout) version for CoderPad mode, when the inputs fit a text format
        if io:
            p["stdio"] = io
        if p["id"] in BUGS_BY_PROBLEM:
            p["bugs"] = BUGS_BY_PROBLEM[p["id"]]
        problems.append(p)
    patterns = []
    for pt in PATTERNS:
        pt = dict(pt)
        pt["skeleton"] = pt["skeleton"].strip("\n")
        lesson = LESSONS.get(pt["id"], {})
        pt["lesson"] = {**lesson, "build": [list(x) for x in lesson.get("build", [])]}
        if pt["id"] in PRIMERS:   # "New to this?": what the lesson assumes, and where to read more
            text, more = PRIMERS[pt["id"]]
            pt["lesson"]["primer"] = {"text": text, "more": more}
        if pt["id"] in COURSES:   # the course's problem order (worked example first) and notes
            pt["course"] = {"order": list(COURSES[pt["id"]]["order"]), "notes": dict(COURSES[pt["id"]].get("notes", {}))}
        patterns.append(pt)
    return {
        "patterns": patterns,
        "problems": problems,
        "sprint": SPRINT,
        "syntax": SYNTAX,
        "clarify_generic": CLARIFY_GENERIC,
        "think_aloud": THINK_ALOUD,
        "rubric": RUBRIC,
        "complexities": COMPLEXITIES,
        "method": [{"title": t, "points": pts} for t, pts in METHOD],
        "input_size": [list(r) for r in INPUT_SIZE],
        "bigo_primer": [{"title": t, "paras": list(ps)} for t, ps in BIGO_PRIMER],
        "bigo_check": [list(q) for q in BIGO_CHECK],
        "python": PYTHON,
        "stdio_lib": STDIO_LIB,
        "bug_kinds": BUG_KINDS,
        "references": {
            "ds_costs": [list(r) for r in DS_COSTS],
            "algo_costs": [list(r) for r in ALGO_COSTS],
            "steps": [list(r) for r in STEPS],
            "optimize": [list(r) for r in OPTIMIZE],
        },
    }
