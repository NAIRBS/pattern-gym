"""Bug Hunt: a reference solution with one planted bug. Find it and fix it so the tests pass.

The bugs are the mistakes people really make under pressure. MUTATIONS says how each kind is planted (a regex
on one line, or deleting the line); make_bugs.py tries them on every solution and keeps only bugs that make the
visible tests fail without hanging, and writes them to bug_hunt_data.py. validate.py re-checks every one.
"""
import re

# kind -> (name, hint, why it matters)
BUG_KINDS = {
    "boundary": ("Wrong boundary", "A comparison is one step off: check whether it should include equality (`<` vs `<=`).",
                 "Boundaries decide whether the last element, the middle, or an equal value is handled. Ask: when the two sides are equal, should the loop or branch run?"),
    "off_by_one": ("Off by one", "A `+ 1` or `- 1` is missing or extra: a range end, an index, or a count.",
                   "`range` and slices stop before their end, and lengths are one more than the last index. Check the first and last iteration by hand."),
    "aliasing": ("Shared list", "Two names point at the same list, so changing one changes the other.",
                 "Appending `path` stores a reference that keeps changing; append a copy (`path[:]`). `[[0] * C] * R` repeats one row R times; build each row with a comprehension."),
    "min_max": ("min and max swapped", "A `min` should be a `max`, or the other way round.",
                "Say out loud what you're tracking (the best so far? the smallest?) and check the function matches."),
    "and_or": ("and / or swapped", "A condition joins its parts with the wrong one of `and` / `or`.",
               "Read the condition as a sentence. With guards, `or` stops at the first true part and `and` at the first false one."),
    "bool_return": ("Wrong boolean returned", "A `return True` should be `return False`, or the other way round.",
                    "Trace the case that reaches this return: has the answer really been decided here?"),
    "missing_update": ("Missing update", "A line that updates the state is gone: adding to a set, pushing, counting or moving on.",
                       "Every loop changes some state each step. List what should change and check each change happens."),
    "heap_sign": ("Heap sign", "A value is pushed with the wrong sign. `heapq` is a min-heap.",
                  "To pop the largest first, push the negated value and negate again when popping."),
    "int_div": ("Float division", "`/` always gives a float. Integer division is `//`.",
                "Indexes, midpoints and counts must be integers; `/` gives a float."),
    "wrong_end": ("Wrong end", "The code reads the wrong end of a stack, list or queue.",
                  "A stack's top is `[-1]` and `pop()`. A queue's front is `popleft()`. Check which end each line means."),
    "bad_start": ("Wrong starting value", "A running min, max or total starts at the wrong value.",
                  "A running minimum starts at `float('inf')` and a maximum at `float('-inf')` (or the first element), so the first real value always wins."),
    "scope": ("Missing nonlocal", "An inner function assigns to a variable from the outer function.",
              "Assigning makes a name local to the inner function. `nonlocal name` says it belongs to the outer one."),
}

# (kind, regex, replacement); a None regex means "delete a line matching the replacement pattern"
MUTATIONS = [
    ("boundary", r"(?<![<>=!])<=(?!=)", "<"),
    ("boundary", r"(?<![<>=!-])<(?![<=])", "<="),
    ("boundary", r"(?<![<>=!-])>=(?!=)", ">"),
    ("boundary", r"(?<![<>=!-])>(?![>=])", ">="),
    ("off_by_one", r" \+ 1(?=[\]\),:]| *$)", ""),
    ("off_by_one", r" - 1(?=[\]\),:]| *$)", ""),
    ("off_by_one", r"range\(1, ", "range(0, "),
    ("aliasing", r"\.append\((\w+)\[:\]\)", r".append(\1)"),
    ("aliasing", r"\.append\(list\((\w+)\)\)", r".append(\1)"),
    ("aliasing", r"\[\[([^\[\]]+)\] \* (\w+(?: \+ 1)?) for _ in range\(([^()]+(?:\([^()]*\))?[^()]*)\)\]", r"[[\1] * \2] * (\3)"),
    ("min_max", r"\bmax\(", "min("),
    ("min_max", r"\bmin\(", "max("),
    ("and_or", r" and ", " or "),
    ("and_or", r" or ", " and "),
    ("bool_return", r"return True\b", "return False"),
    ("bool_return", r"return False\b", "return True"),
    ("heap_sign", r"(heappush\(\w+, \(?)-", r"\1"),
    ("int_div", r" // ", " / "),
    ("wrong_end", r"(\w+)\[-1\]", r"\1[0]"),
    ("wrong_end", r"\.popleft\(\)", ".pop()"),
    ("bad_start", r"float\('inf'\)", "0"),
    ("bad_start", r"float\('-inf'\)", "0"),
    ("missing_update", None, r"^\s*\w+(\.\w+)*\.add\(.*\)$"),
    ("missing_update", None, r"^\s*\w+(\[[^\]]+\])? \+= 1$"),
    ("missing_update", None, r"^\s*\w+\.append\(.*\)$"),
    ("scope", None, r"^\s*nonlocal \w+"),
]


def mutants(lines, idx):
    """Every (kind, new_line_or_None) a mutation can make from line idx."""
    line = lines[idx]
    if line.strip().startswith("#") or line.lstrip().startswith("def ") or line.lstrip().startswith("class "):
        return []
    out = []
    for kind, rx, rep in MUTATIONS:
        if rx is None:
            if re.search(rep, line):
                out.append((kind, None))
            continue
        m = re.search(rx, line)
        if m:
            new = line[:m.start()] + m.expand(rep) + line[m.end():]
            if new != line:
                out.append((kind, new))
    return out


def apply(solution, bug):
    lines = solution.split("\n")
    if bug["buggy"] is None:
        del lines[bug["line"]]
    else:
        lines[bug["line"]] = bug["buggy"]
    return "\n".join(lines)


from .bug_hunt_data import BUGS  # noqa: E402  (generated by make_bugs.py)
