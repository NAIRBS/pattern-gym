"""Content loader. Each module exposes a list; load_all() returns one JSON-able dict."""
from .patterns import PATTERNS
from .problems import PROBLEMS as _P0
from .problems_a import PROBLEMS_A
from .problems_b import PROBLEMS_B
from .problems_c import PROBLEMS_C
from .problems_twist import PROBLEMS_TWIST, PERF_TWIST
PROBLEMS = sorted(_P0 + PROBLEMS_A + PROBLEMS_B + PROBLEMS_C + PROBLEMS_TWIST, key=lambda p: p["num"])
from .sprint import SPRINT
from .syntax import SYNTAX
from .interview import CLARIFY_GENERIC, THINK_ALOUD, RUBRIC, COMPLEXITIES
from .study_patterns import LESSONS, METHOD, INPUT_SIZE
from .study_problems import WALK
from .study_brute import BRUTE
from .perf import PERF
from .links import LEETCODE
PERF = {**PERF, **PERF_TWIST}


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
        problems.append(p)
    patterns = []
    for pt in PATTERNS:
        pt = dict(pt)
        pt["skeleton"] = pt["skeleton"].strip("\n")
        lesson = LESSONS.get(pt["id"], {})
        pt["lesson"] = {**lesson, "build": [list(x) for x in lesson.get("build", [])]}
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
    }
