"""In-person interview support content."""

CLARIFY_GENERIC = [
    "What are the input size limits? (tells you the target complexity)",
    "Can the input be empty / null? What should I return then?",
    "Are there duplicates? Negatives? Zeros?",
    "Is the input sorted? Can I modify it in place?",
    "Is there always exactly one valid answer? What if none exists?",
    "Does order of the output matter?",
    "Integer range / overflow concerns? Characters ASCII or Unicode?",
    "Should I optimise for time or for space?",
]

THINK_ALOUD = [
    "Restate the problem in your own words + confirm with a tiny example.",
    "Ask 2-3 clarifying questions (size, empty, duplicates, sorted?).",
    "Say the brute force and its complexity out loud first.",
    "Name the bottleneck: 'the slow part is re-scanning X'.",
    "Name the pattern + why it fits ('sorted + pair -> two pointers').",
    "State the plan in 3-5 steps BEFORE coding. Get a nod.",
    "Narrate while coding: what each block is for, not every keystroke.",
    "Dry-run your code on the example, line by line, out loud.",
    "Test edge cases: empty, one element, all same, negatives.",
    "State final time + space complexity and the trade-off.",
]

RUBRIC = [
    {"id": "clarify", "name": "Clarified", "desc": "Asked about constraints, edge inputs and expected output before coding."},
    {"id": "plan", "name": "Planned out loud", "desc": "Brute force -> bottleneck -> pattern, with a step plan before coding."},
    {"id": "code", "name": "Clean code", "desc": "Readable names, no thrashing, structure matched the plan."},
    {"id": "test", "name": "Tested", "desc": "Dry-ran an example and checked edge cases without being asked."},
    {"id": "complexity", "name": "Complexity", "desc": "Stated correct time and space and could justify them."},
    {"id": "comms", "name": "Communication", "desc": "Kept talking; silence never lasted more than ~20 seconds."},
]

COMPLEXITIES = [
    "O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(n³)", "O(2^n)", "O(n!)",
    "O(k)", "O(n log k)", "O(n·k)", "O(m·n)", "O(V + E)", "O(E log V)", "O(n·2^n)",
    "O(n·n!)", "O(h)", "O(√n)", "O(n·m)", "O(n·amount)",
]
