"""The Python tab: an intro to Python for coding problems, with code you can run and quizzes that run.

Sections cover what USACO Guide's "General" prerequisites cover for Python (running code, data types,
input and output, expected knowledge, fast I/O) plus the dense idioms the reference solutions use.

Lesson fields
  body   : paragraphs; a line starting with "- " is a bullet. `code` and **bold** are styled.
  code   : runnable example (editable on the page). stdin / files / outfile feed it.
  read   : [(piece, what it means)] - how to read a dense line left to right.
  loop   : the same thing written out the long way.
  find   : regex; every reference-solution line it matches is listed under "Where you'll see it".
  tasks  : Predict (read the code, type what it prints; the page runs it to check) or
           Write (write a program; it's run on each case's stdin and the output compared).
validate.py runs every example, checks every Predict answer and every Write solution.
"""


def Pr(code, answer, why, stdin=""):
    return {"kind": "predict", "code": code.strip("\n"), "answer": answer, "why": why, "stdin": stdin}


def Wr(prompt, starter, solution, cases, files=None, outfile=None):
    cs = []
    for c in cases:
        stdin, expected = c[0], c[1]
        d = {"stdin": stdin, "expected": expected}
        if len(c) > 2:
            d["files"] = c[2]
        if outfile:
            d["outfile"] = outfile
        cs.append(d)
    return {"kind": "write", "prompt": prompt, "starter": starter.strip("\n") + "\n", "solution": solution.strip("\n"), "cases": cs}


def L(id, title, body, code, stdin="", read=(), loop="", find="", tasks=(), files=None, outfile=None):
    d = {"id": id, "title": title, "body": [b.strip() for b in body], "code": code.strip("\n"), "stdin": stdin,
         "read": [list(r) for r in read], "loop": loop.strip("\n"), "find": find, "tasks": []}
    if files:
        d["files"], d["outfile"] = files, outfile
    for k, t in enumerate(tasks):
        d["tasks"].append({**t, "id": f"{id}-{k + 1}"})
    return d


def S(id, title, intro, lessons):
    return {"id": id, "title": title, "intro": intro, "lessons": lessons}


PYTHON = [
# ───────────────────────────── 1. Start here ─────────────────────────────
S("start", "▶️ Start here", "How a Python program runs, and the two shapes coding problems come in.", [
L("two_shapes", "Two kinds of problem", [
    "Coding problems come in two shapes, and they want different code.",
    "- **Function problems** (LeetCode, most interviews): you write a function. The input arrives as arguments and you `return` the answer. You never call `input()` or `print()` the answer.",
    "- **Program problems** (USACO, Codeforces, CSES, many online assessments such as HackerRank): you write a whole program. It reads the input as text from *standard input* (stdin) and prints the answer to *standard output* (stdout). The judge compares what you print, character for character.",
    "The rest of this app uses function problems. This tab mostly writes programs, because reading input and printing output is a skill of its own, and because a program is the easiest way to see what a line of Python does: print it.",
    "Press **Run** to run the example. The box under the code is its stdin: change the numbers and run it again.",
], r'''
# Program style: read the input yourself, print the answer
a, b, c = map(int, input().split())
print(a + b + c)

# Function style (LeetCode): the same logic, but arguments in and a return value out
def total(a, b, c):
    return a + b + c
''', stdin="3 4 5\n", tasks=[
    Wr("Read two integers on one line and print their product.",
       "", "a, b = map(int, input().split())\nprint(a * b)",
       [("6 7\n", "42"), ("-3 5\n", "-15"), ("100000 100000\n", "10000000000")]),
]),
L("top_to_bottom", "Programs run top to bottom", [
    "Python runs a file one line at a time, from the top. A variable holds whatever was last assigned to it, so the same name can mean different things at different lines.",
    "`print()` writes its arguments separated by a space and then starts a new line. `#` starts a comment, which Python ignores.",
    "Indentation is part of the syntax: the indented lines under a `for`, `if`, `while` or `def` are its body. Use 4 spaces.",
], r'''
x = 5
print(x, x * 2)     # 5 10
x = x + 1           # x is now 6
print("x is", x)
for i in range(3):
    print("inside the loop", i)
print("after the loop")
''', tasks=[
    Pr(r'''
x = 2
y = x * 3
x = 10
print(x, y)
y = y + x
print(y)
''', "10 6\n16", "`y = x * 3` used the value `x` had then (2). Changing `x` afterwards doesn't change `y`."),
]),
]),

# ───────────────────────────── 2. Data types ─────────────────────────────
S("types", "🔢 Data types", "Numbers, booleans and strings, and the places Python behaves differently from C++ or Java.", [
L("ints", "Integers never overflow", [
    "Python's `int` has no size limit. `2 ** 100` is exact, so you never need the `long long` that C++ and Java solutions use. (Interviewers may still ask what happens at 32 bits, as in Reverse Integer.)",
    "- `/` always gives a float: `7 / 2` is `3.5`. Use `//` for integer division.",
    "- `//` rounds **down** (toward minus infinity), not toward zero: `-7 // 2` is `-4`. `%` follows suit, so `-7 % 2` is `1`, never negative for a positive divisor.",
    "- `divmod(a, b)` returns `(a // b, a % b)` in one go, which is handy for peeling digits off: `n, d = divmod(n, 10)`.",
    "- `**` is power. `pow(a, b, m)` is `a ** b % m`, computed fast.",
    "- `10**9 + 7` is the usual modulus for \"print the answer mod 1e9+7\".",
], r'''
print(7 / 2, 7 // 2, 7 % 2)
print(-7 // 2, -7 % 2, int(-7 / 2))   # floor vs truncate
print(2 ** 100)
n = 1234
n, d = divmod(n, 10)
print(n, d)
print(pow(3, 200, 10**9 + 7))
''', find=r"divmod\(|\*\* ?\d|// ", tasks=[
    Pr(r'''
print(7 // 2, 7 % 2, -7 // 2, -7 % 2)
print(divmod(17, 5))
print(10 / 5)
''', "3 1 -4 1\n(3, 2)\n2.0", "`//` floors, so `-7 // 2` is `-4` (C++ would give `-3`), and then `-7 % 2` must be `1` so that `(-4) * 2 + 1 == -7`. `/` always returns a float, even when it divides evenly."),
    Wr("Read a non-negative integer `n` (it may have 30 digits) and print the sum of its digits.",
       "n = int(input())\n", "n = int(input())\ntotal = 0\nwhile n:\n    n, d = divmod(n, 10)\n    total += d\nprint(total)",
       [("1234\n", "10"), ("0\n", "0"), ("999999999999999999999999999999\n", "270")]),
]),
L("floats", "Floats are approximate", [
    "A `float` is a 64-bit binary number, so most decimals are stored slightly off. `0.1 + 0.2` is `0.30000000000000004`.",
    "- Never compare floats with `==`. Check that they're close: `abs(a - b) < 1e-9`, or `math.isclose(a, b)`.",
    "- `int(x)` cuts toward zero: `int(-2.7)` is `-2`. `math.floor` and `math.ceil` round down and up.",
    "- `round()` rounds halves to the even neighbour: `round(2.5)` is `2`.",
    "- Big integers lose precision as floats. To round a division up, stay in integers: `(a + b - 1) // b` (or `-(-a // b)`). Koko Eating Bananas does exactly this.",
    "- `float('inf')` and `float('-inf')` are bigger and smaller than every number: good starting values for a running minimum or maximum.",
], r'''
print(0.1 + 0.2, 0.1 + 0.2 == 0.3)
print(abs((0.1 + 0.2) - 0.3) < 1e-9)
print(int(-2.7), round(2.5), round(3.5))
a, b = 10**18 + 1, 10**9
print((a + b - 1) // b)            # exact
print(int(a / b) + 1)              # float version: off by one
best = float('inf')
for x in [5, 3, 8]:
    best = min(best, x)
print(best)
''', find=r"float\('-?inf'\)|\+ \w+ - 1\) // ", tasks=[
    Pr(r'''
print(0.1 + 0.2 == 0.3)
print(int(-2.7), round(2.5), round(3.5))
print(f"{2 / 3:.3f}")
''', "False\n-2 2 4\n0.667", "`0.1 + 0.2` is a hair above `0.3`. `int` truncates toward zero, and `round` sends halves to the even number, so 2.5 → 2 but 3.5 → 4."),
    Wr("Read two positive integers `a` and `b` (up to 10^18) and print `a / b` rounded **up**. Don't use floats: they get the third case wrong.",
       "a, b = map(int, input().split())\n", "a, b = map(int, input().split())\nprint((a + b - 1) // b)",
       [("7 2\n", "4"), ("6 3\n", "2"), ("1000000000000000001 1000000000\n", "1000000001")]),
]),
L("bools", "Booleans and truthiness", [
    "`True` and `False` are booleans, and they're also the integers 1 and 0: `True + True` is `2`, and `sum(flags)` counts the `True`s.",
    "Every value is either *truthy* or *falsy* in an `if`. The falsy ones are `0`, `0.0`, `''`, `[]`, `{}`, `set()` and `None`. Everything else is truthy, so `if stack:` means \"if the stack isn't empty\".",
    "`and` and `or` don't return `True`/`False`. They return one of their operands: `a or b` is `a` if `a` is truthy, else `b`; `a and b` is `a` if `a` is falsy, else `b`. They also stop as soon as the answer is known (see *Short-circuit guards* in the one-liners section).",
], r'''
print(True + True, sum([True, False, True]))
for v in [0, 7, "", "0", [], [0], None]:
    print(repr(v), bool(v))
stack = []
if not stack:
    print("empty")
print(0 or "default", 3 and 5)
''', find=r"^\s*(if|while) not \w+:|^\s*while \w+:", tasks=[
    Pr(r'''
print(bool([]), bool([0]), bool(""), bool(" "))
print(0 or "default", 3 and 5, [] and 1)
''', "False True False True\ndefault 5 []", "`[0]` is a non-empty list and `\" \"` a non-empty string, so both are truthy. `0 or ...` moves on to the second operand; `3 and 5` returns the last one it checked; `[] and 1` stops at the falsy `[]` and returns it."),
]),
L("strings", "Strings", [
    "A `str` is an immutable sequence of characters. There's no separate char type: `s[0]` is a string of length 1.",
    "- Index from the end with negatives: `s[-1]` is the last character. Slices `s[a:b]` run from `a` up to but **not including** `b`.",
    "- Strings can't change in place: `s[0] = 'x'` is an error. Build a new one, or work on `list(s)` and `''.join` it back.",
    "- `ord('c')` is the character's code (99) and `chr(99)` goes back. `ord(ch) - ord('a')` turns a lowercase letter into 0–25, the usual index into a 26-slot count array (Group Anagrams).",
    "- Useful methods: `split`, `strip`, `lower`, `upper`, `isdigit`, `isalpha`, `isalnum`, `startswith`, `count`, `find` (−1 if missing), `replace`.",
    "- Adding to a string in a loop copies it every time. Collect pieces in a list and `''.join` them once at the end.",
], r'''
s = "pattern"
print(s[0], s[-1], s[2:5], s[::-1], len(s))
print(ord("c") - ord("a"), chr(ord("a") + 25))
print("a,b,,c".split(","), "  hi  ".strip() + "!")
print("Hello World".lower().split())
chars = list(s)
chars[0] = "P"
print("".join(chars))
''', find=r"\bord\(|\bchr\(|\.isalnum|\.lower\(", tasks=[
    Pr(r'''
s = "pattern"
print(s[0], s[-1], s[2:5], s[::-1])
print(ord("c") - ord("a"), chr(ord("a") + 25))
print("a,b,,c".split(","))
''', "p n tte nrettap\n2 z\n['a', 'b', '', 'c']", "`s[2:5]` is indices 2, 3, 4: `t`, `t`, `e`. Splitting on an explicit `\",\"` keeps the empty string between the two commas; `split()` with no argument would drop empties."),
    Wr("Read a lowercase word and print it with every letter moved one forward in the alphabet (`z` wraps to `a`).",
       "word = input().strip()\n", "word = input().strip()\nprint(''.join(chr((ord(c) - ord('a') + 1) % 26 + ord('a')) for c in word))",
       [("abz\n", "bca"), ("hello\n", "ifmmp"), ("zzz\n", "aaa")]),
]),
]),

# ───────────────────────────── 3. Input & output ─────────────────────────────
S("io", "⌨️ Input & output", "Reading the input the way judges give it, and printing exactly what they expect.", [
L("input_basics", "input() reads one line", [
    "`input()` reads the next line of stdin and returns it as a **string**, without the newline. Convert it yourself: `int(input())`.",
    "Each call reads the next line. If there are no lines left, it raises `EOFError`.",
    "On LeetCode none of this applies: the arguments are already Python values.",
], r'''
name = input()
n = int(input())
print("Hi", name)
print(n * 2)
print(type(name), type(n))
''', stdin="Ada\n21\n", tasks=[
    Wr("Line 1 is a word, line 2 an integer `k`. Print the word `k` times on one line, separated by spaces.",
       "", "w = input()\nk = int(input())\nprint(' '.join([w] * k))",
       [("ab\n3\n", "ab ab ab"), ("x\n1\n", "x")]),
]),
L("one_line_many", "Several numbers on one line", [
    "The most common input line is a few numbers separated by spaces. Read it in one go:",
    "- `n, m = map(int, input().split())` when you know how many there are. The count on the left must match, or you get `ValueError: too many values to unpack`.",
    "- `nums = list(map(int, input().split()))` for a whole list. `[int(x) for x in input().split()]` does the same.",
], r'''
n, m = map(int, input().split())
nums = list(map(int, input().split()))
print(n, m, sum(nums), max(nums))
''', stdin="3 10\n4 1 7\n", read=[
    ("input()", "the line as one string: '4 1 7'"),
    (".split()", "cut on whitespace: ['4', '1', '7'] (still strings)"),
    ("map(int, ...)", "apply int to each piece; lazy, nothing happens until it's used"),
    ("list(...)", "run the map and keep the results: [4, 1, 7]"),
    ("n, m = ...", "unpack: the first value goes into n, the second into m"),
], loop=r'''
line = input()
parts = line.split()
nums = []
for p in parts:
    nums.append(int(p))
''', tasks=[
    Wr("Line 1 is `n`, line 2 has `n` integers. Print the sum of the even ones.",
       "", "n = int(input())\nnums = list(map(int, input().split()))\nprint(sum(x for x in nums if x % 2 == 0))",
       [("5\n1 2 3 4 6\n", "12"), ("3\n1 3 5\n", "0"), ("2\n-4 -3\n", "-4")]),
]),
L("many_lines", "Many lines: lists, pairs and grids", [
    "When the first line says how many lines follow, loop that many times. `_` is the usual name for a loop variable you don't use.",
    "- `pairs = [tuple(map(int, input().split())) for _ in range(n)]` reads `n` lines of pairs.",
    "- A character grid is just a list of strings: `grid = [input() for _ in range(R)]`, then `grid[r][c]`.",
    "- If you need to change cells, store lists instead: `[list(input()) for _ in range(R)]`.",
], r'''
n = int(input())
pairs = [tuple(map(int, input().split())) for _ in range(n)]
pairs.sort()
for a, b in pairs:
    print(a, b)
''', stdin="3\n5 1\n2 9\n2 3\n", tasks=[
    Wr("Line 1 is `R C`. Then come `R` lines of a grid made of `.` and `#`. Print how many `#` there are.",
       "", "R, C = map(int, input().split())\ngrid = [input() for _ in range(R)]\nprint(sum(row.count('#') for row in grid))",
       [("2 3\n.#.\n##.\n", "3"), ("1 1\n.\n", "0"), ("3 2\n##\n##\n##\n", "6")]),
]),
L("fast_input", "Fast input with sys.stdin", [
    "`input()` is slow when there are hundreds of thousands of lines, slow enough to time out on its own. Two faster ways:",
    "- `sys.stdin.readline()` reads one line, like `input()`, but **keeps the trailing newline**. `int()` doesn't mind it, but strings need `.strip()` (or `.rstrip('\\n')`). Many people write `input = sys.stdin.readline` at the top so the rest of the code doesn't change.",
    "- `sys.stdin.read().split()` reads the whole input at once and splits it into tokens, ignoring where the lines break. Then walk the list with an index, or with `next()` on an iterator.",
    "You don't need this for small inputs or for USACO Bronze, but it's the first thing to try if a correct program times out reading 10^5+ lines.",
], r'''
import sys
data = sys.stdin.read().split()   # every token in the whole input
n = int(data[0])
nums = list(map(int, data[1:1 + n]))
print(n, sum(nums))
''', stdin="4\n1 2\n3 4\n", tasks=[
    Pr(r'''
import sys
s = sys.stdin.readline()
print(len(s), len(s.strip()))
print(repr(s))
''', "4 3\n'abc\\n'", "`readline` keeps the `\\n`, so the length is 4. `repr` shows it. This is the classic bug: comparing `s == 'abc'` would be `False`.", stdin="abc\n"),
    Wr("Line 1 is `n`, then `n` lines each hold one integer (in the real problem `n` is 200,000). Print the largest. Read with `sys.stdin`.",
       "import sys\n", "import sys\ndata = sys.stdin.read().split()\nn = int(data[0])\nprint(max(map(int, data[1:n + 1])))",
       [("3\n5\n-2\n9\n", "9"), ("1\n-7\n", "-7")]),
]),
L("print_options", "print, sep, end and join", [
    "`print(a, b, c)` puts a space between its arguments and a newline at the end. Both can be changed: `sep=` sets the separator, `end=` sets what goes after (use `end=''` or `end=' '` to stay on the line).",
    "- `print(*nums)` unpacks the list into separate arguments, so it prints `1 2 3` instead of `[1, 2, 3]`.",
    "- `' '.join(...)` builds the line yourself. Its items must already be strings, so numbers need `map(str, nums)`.",
    "- When there's a lot of output, build one string and print it once: `print('\\n'.join(map(str, answers)))`. Thousands of separate `print` calls are slow.",
    "- Judges usually ignore a trailing newline but not an extra space or a missing line, so match the sample output exactly.",
], r'''
nums = [3, 1, 2]
print(nums)
print(*nums)
print(*nums, sep=",")
print("a", end="")
print("b")
print("\n".join(map(str, nums)))
''', tasks=[
    Pr(r'''
nums = [3, 1, 2]
print(nums)
print(*nums, sep="-")
print("a", end=" ")
print("b")
print(" ".join(map(str, sorted(nums))))
''', "[3, 1, 2]\n3-1-2\na b\n1 2 3", "Printing a list shows its brackets and commas. `*nums` passes 3, 1, 2 as separate arguments, joined by `sep`. `end=\" \"` replaces the newline, so `b` lands on the same line."),
    Wr("Line 1 is `n`, line 2 has `n` integers. Print them sorted from largest to smallest, comma-separated with no spaces.",
       "", "n = int(input())\nnums = sorted(map(int, input().split()), reverse=True)\nprint(','.join(map(str, nums)))",
       [("4\n3 10 -1 3\n", "10,3,3,-1"), ("1\n5\n", "5")]),
]),
L("fstrings", "f-strings", [
    "An f-string is a string with `f` in front. Anything in `{braces}` is evaluated as Python and pasted in: `f\"{x} doubled is {x * 2}\"`.",
    "After a colon you can say how to format it:",
    "- `{pi:.2f}` 2 decimal places · `{x:>5}` right-align in 5 characters · `{x:<5}` left-align · `{x:05d}` pad with zeros",
    "- `{n:,}` thousands separators · `{n:b}` binary · `{n:x}` hex · `{x=}` prints `x=` and the value (handy for debugging)",
    "Encode and Decode Strings builds its encoding with one: `f'{len(s)}#{s}'`.",
], r'''
x, pi = 42, 3.14159
print(f"x={x}, double={x * 2}")
print(f"{pi:.2f}|{x:>5}|{x:<5}|{x:05d}")
print(f"{1234567:,} {5:b} {255:x}")
print(f"{x=}")
''', find=r"\bf['\"]", tasks=[
    Pr(r'''
x, pi = 7, 3.14159
print(f"{x * 3} {pi:.1f}")
print(f"[{x:>3}][{x:<3}][{x:03d}]")
''', "21 3.1\n[  7][7  ][007]", "The expression inside braces is evaluated first (`x * 3`). `>3` and `<3` pad to width 3 on the left or right; `03d` pads with zeros."),
    Wr("Read a name and a score (a decimal number) on one line. Print `name: score` with the score to 1 decimal place.",
       "", "name, score = input().split()\nprint(f\"{name}: {float(score):.1f}\")",
       [("ada 91.27\n", "ada: 91.3"), ("bob 7\n", "bob: 7.0")]),
]),
L("file_io", "File input and output (USACO)", [
    "USACO contests before December 2020 read from a file named after the problem (`paint.in`) and write to another (`paint.out`) instead of stdin and stdout. There are two ways to do it.",
    "- **Redirect**: put `sys.stdin = open('paint.in')` and `sys.stdout = open('paint.out', 'w')` at the top. After that, `input()` and `print()` use the files and the rest of the program doesn't change.",
    "- **Open the files**: `with open('paint.in') as f:` then `f.readline()` or `f.read().split()`. To write, `open(name, 'w')` and `f.write(text)`. `write` adds no newline and only takes a string, so write `f'{ans}\\n'`.",
    "`with` closes the file at the end of its block. An output file that isn't closed (or flushed) may come out empty.",
    "This example reads `paint.in`, which holds `3 4`, and writes `paint.out`. The page shows what ended up in `paint.out`.",
], r'''
with open("paint.in") as fin:
    a, b = map(int, fin.readline().split())

with open("paint.out", "w") as fout:
    fout.write(f"{a + b}\n")      # write() adds no newline: add it yourself
''', files={"paint.in": "3 4\n"}, outfile="paint.out", tasks=[
    Wr("`double.in` holds one integer `n`. Write `2n` to `double.out`. Try the redirect way: point `sys.stdin` and `sys.stdout` at the files, then use `input()` and `print()`.",
       "import sys\n", "import sys\nsys.stdin = open('double.in')\nsys.stdout = open('double.out', 'w')\nprint(int(input()) * 2)",
       [("", "42", {"double.in": "21\n"}), ("", "-10", {"double.in": "-5\n"})], outfile="double.out"),
]),
]),

# ───────────────────────────── 4. Control flow ─────────────────────────────
S("flow", "🔁 Loops & functions", "Branches, loops and functions: everything USACO calls expected knowledge, plus the Python quirks.", [
L("if_elif", "if, elif, else", [
    "`if` runs its block when the condition is truthy. `elif` (else if) checks another condition only when the ones above were false, and `else` catches everything left.",
    "- Comparisons chain: `10 <= n < 20` means `10 <= n and n < 20`.",
    "- `==` compares values; `is` checks for the very same object. Use `is` only for `None`: `if node is None`.",
    "- `in` tests membership: `if ch in 'aeiou'`, `if x in seen`. It's O(1) for sets and dicts, O(n) for lists and strings.",
], r'''
for n in [5, 15, 25]:
    if n < 10:
        print(n, "small")
    elif 10 <= n < 20:
        print(n, "medium")
    else:
        print(n, "large")
ch = "e"
print(ch in "aeiou", ch not in "aeiou")
''', tasks=[
    Wr("Read `n`. For each number from 1 to `n`, print `FizzBuzz` if it's divisible by 15, `Fizz` if by 3, `Buzz` if by 5, otherwise the number. One per line.",
       "n = int(input())\n", "n = int(input())\nfor i in range(1, n + 1):\n    if i % 15 == 0:\n        print('FizzBuzz')\n    elif i % 3 == 0:\n        print('Fizz')\n    elif i % 5 == 0:\n        print('Buzz')\n    else:\n        print(i)",
       [("5\n", "1\n2\nFizz\n4\nBuzz"), ("15\n", "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz")]),
]),
L("range_loops", "for loops and range", [
    "`for x in something:` runs the block once per item of a list, string, set, dict (its keys), range or any other iterable.",
    "`range` makes the integers you'd write a C-style loop for:",
    "- `range(n)` is 0 to n−1 · `range(a, b)` is a to b−1 · `range(a, b, step)` counts by `step`",
    "- `range(n - 1, -1, -1)` counts down from n−1 to 0. The stop value is never included, hence the `-1`. `reversed(range(n))` says the same thing more readably.",
    "Don't change a list while looping over it; loop over a copy (`for x in a[:]`) or build a new list.",
], r'''
print(list(range(5)))
print(list(range(2, 10, 3)))
print(list(range(4, -1, -1)))
for ch in "hey":
    print(ch, end=" ")
print()
for i in reversed(range(3)):
    print(i, end=" ")
''', find=r"range\(\w+( - 1)?, -1, -1\)|reversed\(", tasks=[
    Pr(r'''
print(list(range(5)))
print(list(range(2, 10, 3)))
print(list(range(5, 0, -1)))
print(list(range(3, 3)))
''', "[0, 1, 2, 3, 4]\n[2, 5, 8]\n[5, 4, 3, 2, 1]\n[]", "The stop value is never included: `range(5, 0, -1)` stops before 0, and `range(3, 3)` is empty."),
    Wr("Read `n` and print a right triangle of `*` with `n` rows: 1 star on the first row, `n` on the last.",
       "n = int(input())\n", "n = int(input())\nfor i in range(1, n + 1):\n    print('*' * i)",
       [("3\n", "*\n**\n***"), ("1\n", "*")]),
]),
L("while_break", "while, break, continue, and for-else", [
    "`while cond:` repeats while the condition is truthy. `break` leaves the loop now; `continue` skips to the next round.",
    "A `for` or `while` can have an `else:` block. It runs only if the loop finished **without** a `break`. Read it as \"no break\". It's how you say \"searched everything and didn't find it\" without a flag variable.",
], r'''
n = 6
steps = 0
while n != 1:
    n = n // 2 if n % 2 == 0 else 3 * n + 1
    steps += 1
print("steps:", steps)

for x in [3, 5, 7]:
    if x % 2 == 0:
        print("found even", x)
        break
else:
    print("no even number")
''', tasks=[
    Pr(r'''
for x in [1, 4, 6]:
    if x % 2 == 0:
        print("first even:", x)
        break
else:
    print("none")
for i in range(5):
    if i % 2:
        continue
    print(i, end=" ")
''', "first even: 4\n0 2 4", "The first loop breaks at 4, so its `else` is skipped. In the second, `i % 2` is truthy for odd `i`, so `continue` skips their `print`."),
    Wr("Read `n`. Repeat: if `n` is even halve it, otherwise make it `3n + 1`, until it reaches 1. Print every value on one line, separated by spaces, starting with `n` and ending with 1.",
       "n = int(input())\n", "n = int(input())\nout = [n]\nwhile n != 1:\n    n = n // 2 if n % 2 == 0 else 3 * n + 1\n    out.append(n)\nprint(*out)",
       [("3\n", "3 10 5 16 8 4 2 1"), ("1\n", "1"), ("6\n", "6 3 10 5 16 8 4 2 1")]),
]),
L("functions", "Functions", [
    "`def name(params):` defines a function; `return value` sends a value back and ends it. A function with no `return` returns `None`.",
    "- Return several values as a tuple and unpack them: `return lo, hi` then `a, b = f()`.",
    "- Defaults: `def f(x, k=1):` lets callers leave `k` out.",
    "- **Trap:** a default value is created once, when the function is defined, and shared by every call. A mutable default (`def f(x, seen=[])`) keeps its contents between calls. Use `None` and create the list inside.",
    "LeetCode wraps functions in `class Solution:` with a `self` first parameter. That's only packaging; the code inside is the same.",
], r'''
def min_max(nums):
    return min(nums), max(nums)

lo, hi = min_max([4, 1, 9])
print(lo, hi)

def greet(name, greeting="Hi"):
    return f"{greeting}, {name}"

print(greet("Ada"), greet("Bo", "Hey"))
print(print("inside"))   # print returns None
''', tasks=[
    Pr(r'''
def add(item, bucket=[]):
    bucket.append(item)
    return bucket

print(add(1))
print(add(2))
print(add(3, []))
''', "[1]\n[1, 2]\n[3]", "The default list is made once and reused, so the second call still has the 1 in it. Passing your own list avoids the shared one."),
    Wr("Write `is_prime(n)` and use it: read `n` and print every prime up to `n` on one line, separated by spaces (print an empty line if there are none).",
       "def is_prime(n):\n    pass\n\nn = int(input())\n",
       "def is_prime(n):\n    if n < 2:\n        return False\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            return False\n        i += 1\n    return True\n\nn = int(input())\nprint(*[x for x in range(n + 1) if is_prime(x)])",
       [("10\n", "2 3 5 7"), ("1\n", ""), ("30\n", "2 3 5 7 11 13 17 19 23 29")]),
]),
L("recursion", "Recursion and @cache", [
    "A recursive function calls itself on a smaller input and stops at a **base case**. Every call waits on the stack until the ones it made return.",
    "- Python allows about 1,000 nested calls by default, then raises `RecursionError`. A DFS on a 10^5-node path needs more: `sys.setrecursionlimit(10**6)` (this app's tests already raise it), or rewrite it with an explicit stack.",
    "- `@cache` (from `functools`) remembers each call's result, keyed by its arguments, so repeated calls are free. That turns many exponential recursions into DP. The arguments must be hashable: tuples, not lists.",
], r'''
from functools import cache

@cache
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(80))

def depth(n):
    return 0 if n == 0 else 1 + depth(n - 1)

print(depth(500))
''', find=r"@(lru_)?cache", tasks=[
    Pr(r'''
from functools import cache

calls = 0

@cache
def fib(n):
    global calls
    calls += 1
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(30), calls)
''', "832040 31", "With `@cache` each `fib(k)` for k = 0..30 runs its body once: 31 calls. Without it, `fib(30)` makes about 2.7 million."),
    Wr("Read a word with distinct letters and print all its rearrangements, one per line, in alphabetical order. Write it with recursion (no `itertools`).",
       "word = input().strip()\n",
       "word = input().strip()\nout = []\n\ndef go(prefix, rest):\n    if not rest:\n        out.append(prefix)\n        return\n    for i in range(len(rest)):\n        go(prefix + rest[i], rest[:i] + rest[i + 1:])\n\ngo('', ''.join(sorted(word)))\nprint('\\n'.join(out))",
       [("ab\n", "ab\nba"), ("cab\n", "abc\nacb\nbac\nbca\ncab\ncba")]),
]),
L("scope_nonlocal", "Nested functions and nonlocal", [
    "Interview solutions often define a helper `dfs` inside the main function so it can see the inputs without passing them around.",
    "- An inner function can **read** outer variables freely.",
    "- If it **assigns** to one (`best = ...` or `count += 1`), Python treats that name as a new local variable, and reading it first raises `UnboundLocalError`. `nonlocal best` says \"I mean the outer one\". (`global` does the same for module-level names.)",
    "- Mutating isn't assigning: `res.append(x)` or `seen.add(x)` works without `nonlocal`.",
    "Diameter of Binary Tree and Binary Tree Maximum Path Sum both keep their answer this way.",
], r'''
def count_evens(nums):
    count = 0
    seen = []
    def visit(x):
        nonlocal count      # without this: UnboundLocalError
        if x % 2 == 0:
            count += 1
            seen.append(x)   # mutating: no nonlocal needed
    for x in nums:
        visit(x)
    return count, seen

print(count_evens([1, 2, 4, 7]))
''', find=r"nonlocal", tasks=[
    Pr(r'''
def outer():
    total = 0
    items = []
    def add(x):
        nonlocal total
        total += x
        items.append(x)
    for v in (5, 10):
        add(v)
    return total, items

print(outer())
''', "(15, [5, 10])", "`nonlocal total` lets `add` update the outer `total`; `items.append` needs nothing because it changes the list, not the name. Returning two values gives a tuple."),
]),
]),

# ───────────────────────────── 5. Data structures ─────────────────────────────
S("data", "📦 Lists, dicts, sets", "The built-in containers, how they surprise you, and the collections module.", [
L("lists", "Lists, and the 2D-list trap", [
    "A list is an ordered, changeable sequence. `append` and `pop()` at the end are O(1); `insert(0, x)` and `pop(0)` shift everything and are O(n) (use a `deque` for a queue).",
    "- `x in lst` scans the whole list: O(n). Use a set when you test membership often.",
    "- `b = a` doesn't copy. Both names point at the same list. Copy with `a[:]` or `list(a)`.",
    "- **Trap:** `[[0] * C] * R` makes R references to *one* row, so changing a cell changes it in every row. Make each row separately: `[[0] * C for _ in range(R)]`. `[0] * n` for a flat list is fine, because numbers can't be changed in place.",
], r'''
a = [1, 2, 3]
b = a          # same list
c = a[:]       # a copy
b.append(4)
print(a, c)

bad = [[0] * 3] * 2
bad[0][0] = 9
print(bad)

good = [[0] * 3 for _ in range(2)]
good[0][0] = 9
print(good)
''', find=r"\[[^\]]*\] \* \(?\w+\)?( for _ in)?", tasks=[
    Pr(r'''
row = [0] * 2
grid = [row] * 2
grid[1][0] = 5
print(grid)
x = [1, 2]
y = x
y += [3]
print(x)
''', "[[5, 0], [5, 0]]\n[1, 2, 3]", "`grid` holds the same `row` object twice, so writing through `grid[1]` shows up in `grid[0]` too. `y += [3]` extends the list in place, and `x` is that same list."),
    Wr("Read `R C` and print an R×C table where the cell in row `r`, column `c` (from 0) holds `r * c`. One row per line, numbers separated by spaces.",
       "R, C = map(int, input().split())\n", "R, C = map(int, input().split())\ntable = [[r * c for c in range(C)] for r in range(R)]\nfor row in table:\n    print(*row)",
       [("2 3\n", "0 0 0\n0 1 2"), ("3 3\n", "0 0 0\n0 1 2\n0 2 4")]),
]),
L("slicing", "Slicing", [
    "`a[start:stop:step]` takes a piece of a list or string. Any part can be left out: `start` defaults to the beginning, `stop` to the end, `step` to 1.",
    "- `stop` is excluded: `a[1:4]` is indices 1, 2, 3. `a[i:j]` has `j - i` items.",
    "- Negative indices count from the end: `a[-2:]` is the last two. A negative step walks backwards, so `a[::-1]` is a reversed copy.",
    "- Slices never raise IndexError. Out-of-range bounds are clipped, so `a[4:100]` is fine and `a[10:]` is just `[]`.",
    "- Every slice is a copy, which costs O(length). `s == s[::-1]` is the one-line palindrome check.",
], r'''
a = [0, 1, 2, 3, 4, 5]
print(a[1:4], a[:2], a[-2:], a[::2], a[::-1])
print(a[4:100], a[10:])
s = "racecar"
print(s == s[::-1], s[1:-1])
''', find=r"\[::-1\]|\w\[\w* ?[+-]? ?\d*:\w* ?[+-]? ?\w*\]", tasks=[
    Pr(r'''
a = [0, 1, 2, 3, 4, 5]
print(a[1:4], a[-2:], a[::2])
print(a[::-1][:2], a[4:100], a[10:])
''', "[1, 2, 3] [4, 5] [0, 2, 4]\n[5, 4] [4, 5] []", "`a[::-1][:2]` reverses first, then takes the first two of the reversed copy. Slices past the end are clipped instead of raising an error."),
    Wr("Read a word. Print `YES` if it reads the same backwards, otherwise `NO`.",
       "", "s = input().strip()\nprint('YES' if s == s[::-1] else 'NO')",
       [("racecar\n", "YES"), ("ab\n", "NO"), ("a\n", "YES")]),
]),
L("tuples_unpacking", "Tuples and unpacking", [
    "A tuple is like a list that can't change: `p = (3, 4)`. Because it can't change, it's hashable, so it can be a dict key or a set member. Grid cells are stored as `(r, c)` tuples for this reason.",
    "**Unpacking** assigns the items of any sequence to several names at once: `x, y = p`.",
    "- `a, b = b, a` swaps. The whole right side is built first (as a tuple), then assigned, so `a, b = b, a + b` uses the *old* `a` and `b`.",
    "- `first, *rest = items` puts everything after the first item into the list `rest`.",
    "- It works in `for` loops too: `for r, c in cells:` and `for i, x in enumerate(nums):`.",
], r'''
p = (3, 4)
x, y = p
print(x * y)
a, b = 1, 2
a, b = b, a + b
print(a, b)
first, *rest = [10, 20, 30]
print(first, rest)
seen = {(0, 1), (2, 2)}
print((0, 1) in seen)
''', find=r"^\s*\w+(\[\w+\])?, \w+(\[\w+\])? = ", tasks=[
    Pr(r'''
a, b = 1, 2
a, b = b, a + b
a, b = b, a + b
print(a, b)
x = 1
y = 2
x = y
y = x + y
print(x, y)
''', "3 5\n2 4", "With tuple assignment the right side uses the old values each time: (1, 2) → (2, 3) → (3, 5). Written as two separate lines, the second line already sees the new `x`."),
    Wr("Read `n` and print the first `n` Fibonacci numbers (starting 0 1 1 2 ...) on one line. Use tuple assignment to step.",
       "n = int(input())\n", "n = int(input())\na, b = 0, 1\nout = []\nfor _ in range(n):\n    out.append(a)\n    a, b = b, a + b\nprint(*out)",
       [("6\n", "0 1 1 2 3 5"), ("1\n", "0")]),
]),
L("dicts", "Dictionaries", [
    "A dict maps keys to values with O(1) average lookup. Keys must be hashable (numbers, strings, tuples).",
    "- `d[k]` raises `KeyError` if `k` is missing. `d.get(k, default)` returns the default instead.",
    "- Counting: `count[x] = count.get(x, 0) + 1` (or use `Counter`).",
    "- Loop over `d` for keys, `d.values()` for values, `d.items()` for (key, value) pairs.",
    "- Dicts remember insertion order, so printing one or looping over it goes in the order keys were first added.",
], r'''
count = {}
for ch in "banana":
    count[ch] = count.get(ch, 0) + 1
print(count)
print(count["a"], count.get("z", 0), "n" in count)
for k, v in sorted(count.items()):
    print(k, v)
''', find=r"\.get\(\w+(\[\w+\])?, 0\)|\.items\(\)", tasks=[
    Pr(r'''
d = {}
for w in ["to", "be", "or", "not", "to", "be"]:
    d[w] = d.get(w, 0) + 1
print(d)
print(list(d)[:2], d.get("xyz", -1))
''', "{'to': 2, 'be': 2, 'or': 1, 'not': 1}\n['to', 'be'] -1", "Keys stay in the order they were first added; adding to an existing key doesn't move it. `list(d)` lists the keys."),
    Wr("Read a line of words. Print each distinct word and how many times it appears, in order of first appearance, as `word count`, one per line.",
       "words = input().split()\n", "words = input().split()\ncount = {}\nfor w in words:\n    count[w] = count.get(w, 0) + 1\nfor w, c in count.items():\n    print(w, c)",
       [("a b a c b a\n", "a 3\nb 2\nc 1"), ("x\n", "x 1")]),
]),
L("sets", "Sets", [
    "A set holds unique, hashable values with O(1) average add, remove and `in`. It has no order and no indexing.",
    "- `s.add(x)`, `s.remove(x)` (KeyError if missing), `s.discard(x)` (no error).",
    "- `a & b` intersection · `a | b` union · `a - b` difference · `a ^ b` in exactly one. `|=` and `&=` update in place.",
    "- `set(nums)` removes duplicates (and loses the order). `len(set(nums)) < len(nums)` means there was a duplicate.",
    "- `{}` is an empty **dict**. An empty set is `set()`.",
], r'''
a = {1, 2, 3}
b = {2, 3, 4}
print(sorted(a & b), sorted(a | b), sorted(a - b), sorted(a ^ b))
seen = set()
seen.add((0, 1))
print((0, 1) in seen, (1, 0) in seen)
nums = [3, 1, 3, 2]
print(len(set(nums)) < len(nums))
''', find=r"\w \& \w|\| \{|\|= |= set\(\)", tasks=[
    Pr(r'''
a = {1, 2, 3, 4}
b = {3, 4, 5}
print(sorted(a - b), sorted(b - a), len(a | b))
print(type({}).__name__, type(set()).__name__)
''', "[1, 2] [5] 5\ndict set", "Difference isn't symmetric. `{}` makes an empty dict; only `set()` makes an empty set."),
    Wr("Read two lines of integers. Print the values that appear in both, sorted, separated by spaces, or `none` if there aren't any.",
       "", "a = set(map(int, input().split()))\nb = set(map(int, input().split()))\ncommon = sorted(a & b)\nprint(*common if common else ['none'])",
       [("1 2 3 4\n3 4 5\n", "3 4"), ("1 2\n3\n", "none"), ("5 5 1\n5\n", "5")]),
]),
L("sorting", "Sorting with keys", [
    "`lst.sort()` sorts in place and returns `None`. `sorted(x)` returns a new list from any iterable. Both take `key=` and `reverse=True`.",
    "- `key` is a function applied to each item; items are ordered by its result. `key=len` sorts by length, and `key=lambda iv: iv[0]` sorts intervals by start.",
    "- Return a **tuple** to sort by several things: `key=lambda w: (-cnt[w], w)` is count high to low, then alphabetical. Negating a number flips its order without touching the others.",
    "- Python's sort is stable: items with equal keys keep their original order.",
    "- Lists and tuples compare item by item, so `sorted(pairs)` sorts by the first value, then the second.",
], r'''
words = ["kiwi", "fig", "banana", "apple"]
print(sorted(words))
print(sorted(words, key=len))
print(sorted(words, key=lambda w: (-len(w), w)))
iv = [[3, 1], [1, 5], [2, 2]]
iv.sort(key=lambda p: p[1])
print(iv)
print(sorted([[2, 1], [1, 9], [2, 0]]))
''', find=r"\.sort\(|sorted\(", tasks=[
    Pr(r'''
words = ["bb", "a", "ccc", "dd"]
print(sorted(words, key=len))
print(sorted(words, key=len, reverse=True))
print(sorted(words, key=lambda w: (-len(w), w)))
r = words.sort()
print(r, words)
''', "['a', 'bb', 'dd', 'ccc']\n['ccc', 'bb', 'dd', 'a']\n['ccc', 'bb', 'dd', 'a']\nNone ['a', 'bb', 'ccc', 'dd']", "Stable sort keeps `bb` before `dd`, even with `reverse=True`. `.sort()` returns `None`; the list itself is sorted."),
    Wr("Line 1 is `n`, then `n` lines of `name score`. Print the names from the highest score to the lowest, breaking ties alphabetically, one per line.",
       "", "n = int(input())\nrows = [input().split() for _ in range(n)]\nrows.sort(key=lambda r: (-int(r[1]), r[0]))\nfor name, _ in rows:\n    print(name)",
       [("3\nbo 5\nal 9\ncy 5\n", "al\nbo\ncy"), ("2\nz 1\na 1\n", "a\nz")]),
]),
L("collections_mod", "Counter, defaultdict, deque, heapq", [
    "The `collections` and `heapq` modules cover most interview data structures. The Syntax Snap game drills them one line at a time.",
    "- `Counter(iterable)` counts items. Missing keys read as 0, and `.most_common(k)` gives the top k.",
    "- `defaultdict(list)` creates a missing key's value on first use, so `g[u].append(v)` just works. `defaultdict(int)` and `defaultdict(set)` too.",
    "- `deque` has O(1) `append`, `appendleft`, `pop` and `popleft`: the BFS queue.",
    "- `heapq` keeps a plain list as a min-heap: `heappush`, `heappop` (smallest), `heapify`. For a max-heap, push negated values. Tuples compare by their first item, so push `(priority, item)`.",
], r'''
from collections import Counter, defaultdict, deque
import heapq

c = Counter("mississippi")
print(c["s"], c["z"], c.most_common(2))
g = defaultdict(list)
g["a"].append("b")
print(dict(g))
q = deque([1, 2, 3])
q.appendleft(0)
print(q.popleft(), q.pop(), list(q))
h = [5, 1, 4]
heapq.heapify(h)
print(heapq.heappop(h), heapq.heappop(h))
''', find=r"Counter\(|defaultdict\(|deque\(|heapq\.heappop", tasks=[
    Pr(r'''
import heapq
h = []
for x in [4, 9, 2]:
    heapq.heappush(h, -x)
print(-heapq.heappop(h), h[0])
from collections import Counter
print(Counter("aab") + Counter("bc"))
''', "9 -4\nCounter({'a': 2, 'b': 2, 'c': 1})", "Negating makes the largest value the smallest, so it pops first; `h[0]` is now `-4`. Counters add count by count and print the most common first; `a` and `b` tie at 2 and keep the order they were first seen in."),
    Wr("Read a line of words. Print the most common word; on a tie, the one that appears first.",
       "from collections import Counter\n", "from collections import Counter\nwords = input().split()\nprint(Counter(words).most_common(1)[0][0])",
       [("b a b a c\n", "b"), ("x y z y\n", "y")]),
]),
]),

# ───────────────────────────── 6. Reading one-liners ─────────────────────────────
S("pythonic", "🧠 Reading one-liners", "How to take apart the dense lines in the reference solutions. The trick for almost all of them: find the `for`, and rewrite the line as the loop it stands for.", [
L("listcomp", "List comprehensions", [
    "`[EXPR for X in ITEMS if COND]` builds a list. Read it in this order: **the `for` part first** (what it loops over), then the `if` (which items it keeps), then the expression at the front (what it makes from each one).",
    "It's exactly a loop that appends, written inside out. The `if` part is optional.",
], r'''
nums = [3, -1, 4, -1, 5]
squares = [x * x for x in nums]
positives = [x for x in nums if x > 0]
print(squares)
print(positives)
heap = [-s for s in [2, 7, 4]]     # Last Stone Weight: negate for a max-heap
print(heap)
''', read=[
    ("[", "start a new list"),
    ("x for x in nums", "loop: each item of nums, called x"),
    ("if x > 0", "keep only the items where this is true"),
    ("x (at the front)", "what goes into the list for each kept item"),
], loop=r'''
positives = []
for x in nums:
    if x > 0:
        positives.append(x)
''', find=r"\[[^\[\]]* for [^\[\]]* in [^\[\]]*\]", tasks=[
    Pr(r'''
print([c.upper() for c in "abcb" if c != "b"])
print([len(w) for w in "the quick fox".split()])
print([i * i for i in range(5) if i % 2 == 0])
''', "['A', 'C']\n[3, 5, 3]\n[0, 4, 16]", "Each one: loop, filter, then transform. `\"abcb\"` minus its `b`s is `a`, `c`."),
    Wr("Read a line of integers. Print the ones divisible by 3, each doubled, on one line. Do it with one list comprehension.",
       "nums = list(map(int, input().split()))\n", "nums = list(map(int, input().split()))\nprint(*[x * 2 for x in nums if x % 3 == 0])",
       [("1 3 6 7 9\n", "6 12 18"), ("-3 2\n", "-6")]),
]),
L("if_vs_ternary", "if at the end vs if-else in front", [
    "Two different `if`s show up in comprehensions, and they do different jobs.",
    "- `[x for x in a if x > 0]`: an `if` **after** the `for` is a filter. Items that fail are dropped, so the list can get shorter.",
    "- `[x if x > 0 else 0 for x in a]`: `A if COND else B` **before** the `for` is a conditional expression. Every item is kept, but each becomes A or B. It needs the `else`.",
    "A conditional expression works anywhere a value does, not only in comprehensions: `return '' if best == float('inf') else s[l:r]` (Minimum Window Substring). Read it **middle first**: check the condition, then take the left value if it's true, the right one if not.",
    "Min Stack uses one inside a call: `min(val, self.mins[-1] if self.mins else val)`. If the stack of minimums is empty there's nothing to compare against, so it compares `val` with itself.",
], r'''
a = [3, -2, 0, 5]
print([x if x > 0 else 0 for x in a])   # transform: same length
print([x for x in a if x > 0])          # filter: shorter
print("even" if len(a) % 2 == 0 else "odd")

mins = []
for val in [5, 7, 3, 8]:
    mins.append(min(val, mins[-1] if mins else val))
print(mins)
''', read=[
    ("A if COND else B", "one value: A when COND is true, otherwise B"),
    ("[... for x in a if COND]", "a filter: no else allowed, items that fail disappear"),
    ("mins[-1] if mins else val", "the latest minimum, or val when the list is empty (so mins[-1] never runs on an empty list)"),
], loop=r'''
if mins:
    candidate = mins[-1]
else:
    candidate = val
mins.append(min(val, candidate))
''', find=r"\S+ if .+ else ", tasks=[
    Pr(r'''
a = [4, 9, 1]
print(["big" if x > 3 else "small" for x in a])
print([x for x in a if x > 3])
x = 0
print(10 / x if x else "undefined")
''', "['big', 'big', 'small']\n[4, 9]\nundefined", "The first keeps all three and labels them; the second drops 1. In the last line the condition is checked first, so `10 / x` never runs when `x` is 0."),
]),
L("nested_comp", "Two fors in one comprehension", [
    "A comprehension can have several `for`s. They nest **in the order written**: the first `for` is the outer loop, the next is inside it. Read them left to right as if they were indented one under the other.",
    "So `(area(r, c) for r in range(R) for c in range(C))` visits every cell row by row: r = 0 with every c, then r = 1, and so on.",
    "Don't confuse it with a comprehension *inside* a comprehension: `[[0] * C for _ in range(R)]` or `[[f(r, c) for c in range(C)] for r in range(R)]` makes a list of rows (a 2D list). There the inner comprehension is the expression, and it runs once per row.",
], r'''
print([(r, c) for r in range(2) for c in range(3)])
grid = [[1, 2], [3, 4]]
print([x for row in grid for x in row])                 # flatten
print([[r * 10 + c for c in range(3)] for r in range(2)])  # 2D
words = ["ab", "bc"]
print({c: set() for w in words for c in w})          # Alien Dictionary
''', read=[
    ("for r in range(R)", "outer loop: each row"),
    ("for c in range(C)", "inner loop: each column of that row"),
    ("(r, c) at the front", "what's produced on every inner step"),
    ("[x for row in grid for x in row]", "for each row, for each x in that row: x (flattens)"),
], loop=r'''
out = []
for r in range(2):
    for c in range(3):
        out.append((r, c))
''', find=r" for .+ in .+ for .+ in ", tasks=[
    Pr(r'''
print([a + b for a in "xy" for b in "12"])
print([[a + b for b in "12"] for a in "xy"])
print([(i, j) for i in range(3) for j in range(i)])
''', "['x1', 'x2', 'y1', 'y2']\n[['x1', 'x2'], ['y1', 'y2']]\n[(1, 0), (2, 0), (2, 1)]", "Two `for`s in one comprehension give one flat list; a comprehension inside the expression gives one list per outer item. The inner loop can use the outer variable: `range(i)` is empty when `i` is 0."),
    Wr("Read `R C`, then `R` lines of a grid of `.` and `#`. Print the position `r c` (from 0) of every `#`, row by row, one per line. Collect them with one comprehension that has two `for`s.",
       "R, C = map(int, input().split())\ngrid = [input() for _ in range(R)]\n",
       "R, C = map(int, input().split())\ngrid = [input() for _ in range(R)]\ncells = [(r, c) for r in range(R) for c in range(C) if grid[r][c] == '#']\nfor r, c in cells:\n    print(r, c)",
       [("2 3\n#..\n.##\n", "0 0\n1 1\n1 2"), ("1 2\n..\n", "")]),
]),
L("genexp", "Generator expressions", [
    "Swap the square brackets of a list comprehension for parentheses and you get a **generator expression**. It doesn't build a list: it hands out one value at a time, when asked. That uses O(1) memory, and functions like `any` can stop early.",
    "- When a generator is the **only** argument to a function, its parentheses can share the call's: `sum(x * x for x in nums)`.",
    "- With any other argument it needs its own: `max((area(r, c) for ...), default=0)`. Without them it's a syntax error.",
    "- A generator can be used up only once. A second `sum(gen)` gets nothing and returns 0.",
    "`sum`, `min`, `max`, `any`, `all`, `sorted`, `set`, `tuple`, `deque` and `''.join` all take one. Walls and Gates starts its BFS with `deque((r, c) for r in range(R) for c in range(C) if rooms[r][c] == 0)`: every gate, straight into the queue.",
], r'''
nums = [1, 2, 3, 4]
gen = (x * x for x in nums)
print(gen)              # a generator object, not values
print(sum(gen))
print(sum(gen))         # already used up
print(sum(x * x for x in nums if x % 2 == 0))
print(max((x for x in []), default=0))
''', read=[
    ("(x * x for x in nums)", "a recipe for values, run lazily"),
    ("sum(x for x in nums)", "the call's parentheses double as the generator's"),
    ("max((...), default=0)", "a second argument, so the generator needs its own parentheses"),
], find=r"\w\((?:[^()]|\([^()]*\))* for .* in ", tasks=[
    Pr(r'''
nums = [1, 2, 3, 4]
gen = (x * x for x in nums)
print(sum(gen))
print(sum(gen))
print(sum(x * x for x in nums if x % 2 == 0))
''', "30\n0\n20", "The first `sum` uses up the generator; the second finds it empty. 2² + 4² = 20."),
    Wr("Read a line of integers and print how many are negative. Use `sum` over a generator.",
       "nums = list(map(int, input().split()))\n", "nums = list(map(int, input().split()))\nprint(sum(1 for x in nums if x < 0))",
       [("3 -1 -5 0\n", "2"), ("1 2\n", "0")]),
]),
L("any_all", "any() and all()", [
    "`any(...)` is True if **at least one** value is truthy. `all(...)` is True if **every** value is. Given a generator, they stop at the first value that decides the answer.",
    "So `if any(k in seen for k in keys):` from Valid Sudoku reads: \"if any of these keys is already in `seen`\". It checks the row, column and box keys one by one and stops at the first one found.",
    "- On an empty input, `any` is False (nothing was true) and `all` is True (nothing was false).",
    "- Pass a generator, not a list: `any([f(x) for x in a])` computes every `f(x)` before `any` looks at the first.",
    "Also in: Valid Anagram (`all(v == 0 for v in count.values())`), Word Search (`any(dfs(r, c, 0) for r in range(R) for c in range(C))`), Merge Triplets.",
], r'''
seen = {"5 in row 0", "3 in col 1"}
keys = ["7 in row 0", "3 in col 1", "7 in box 0"]
print(any(k in seen for k in keys))
print(all(k in seen for k in keys))
print(any([]), all([]))
count = {"a": 0, "b": 0}
print(all(v == 0 for v in count.values()))
''', read=[
    ("k in seen", "the test, done for one key: True or False"),
    ("for k in keys", "do the test for each key in turn"),
    ("any(...)", "True as soon as one test is True; False if none is"),
], loop=r'''
found = False
for k in keys:
    if k in seen:
        found = True
        break
if found:
    ...
''', find=r"\b(any|all)\(", tasks=[
    Pr(r'''
def check(x):
    print("checking", x)
    return x > 2

print(any(check(x) for x in [1, 3, 5]))
print(all(check(x) for x in [4, 0, 9]))
''', "checking 1\nchecking 3\nTrue\nchecking 4\nchecking 0\nFalse", "`any` stops at the first True (3), so 5 is never checked. `all` stops at the first False (0), so 9 is never checked."),
    Pr(r'''
print(any(x > 0 for x in []), all(x > 0 for x in []))
print(all(len(w) > 1 for w in ["hi", "ok", "a"]))
''', "False True\nFalse", "An empty `all` is True: there's no item that fails. The last list has `\"a\"`, whose length is 1."),
    Wr("Read a line of words. Print `YES` if every word starts with a capital letter, otherwise `NO`. Use `all`.",
       "words = input().split()\n", "words = input().split()\nprint('YES' if all(w[0].isupper() for w in words) else 'NO')",
       [("Hello World\n", "YES"), ("Hello world\n", "NO")]),
]),
L("join_build", "''.join(...) and building strings", [
    "`SEP.join(items)` glues a sequence of strings together with `SEP` between them. It's a method of the **separator**, which is why it reads backwards: `', '.join(names)`. The empty string `''` as the separator means \"no gap\".",
    "- Every item must be a string. Numbers need `map(str, nums)` or an f-string.",
    "- The argument is often a generator, so `join` and `for` appear in the same parentheses.",
    "Take `return ''.join(f'{len(s)}#{s}' for s in strs)` from Encode and Decode Strings. **Find the `for`**: it loops over each string `s`. Left of it, `f'{len(s)}#{s}'` turns `s` into its length, a `#`, then `s` itself (`'leet'` → `'4#leet'`). `''.join` glues all of those together with nothing between them.",
    "The length prefix is what makes it decodable: read digits up to the `#`, then take exactly that many characters, even if they contain `#` themselves.",
], r'''
strs = ["leet", "co#de", ""]
encoded = "".join(f"{len(s)}#{s}" for s in strs)
print(encoded)
print("-".join(["a", "b", "c"]), ", ".join(map(str, [1, 2, 3])))
board = [["Q", "."], [".", "Q"]]
print(["".join(row) for row in board])     # N-Queens output
''', read=[
    ("for s in strs", "loop: each string"),
    ("f'{len(s)}#{s}'", "make one piece from it: 'leet' becomes '4#leet'"),
    ("''.join(...)", "glue every piece together with '' (nothing) between"),
], loop=r'''
parts = []
for s in strs:
    parts.append(str(len(s)) + "#" + s)
encoded = "".join(parts)
''', find=r"\.join\(", tasks=[
    Pr(r'''
print("".join(["a", "b"]) + "|" + " ".join("abc"))
print("+".join(str(i) for i in range(1, 4)), "=", sum(range(1, 4)))
print(",".join([]) == "")
''', "ab|a b c\n1+2+3 = 6\nTrue", "Joining a string joins its characters, so `\" \".join(\"abc\")` spaces out the letters. Joining nothing gives the empty string."),
    Wr("Decode: the input is one line made by the encoder above (each string as its length, `#`, then the string). Print the original strings, one per line.",
       "s = input()\n",
       "s = input()\ni = 0\nout = []\nwhile i < len(s):\n    j = s.index('#', i)\n    n = int(s[i:j])\n    out.append(s[j + 1:j + 1 + n])\n    i = j + 1 + n\nprint('\\n'.join(out))",
       [("4#leet5#co#de\n", "leet\nco#de"), ("2#ab10###########\n", "ab\n##########")]),
]),
L("sum_count", "sum() over a generator: totals and counts", [
    "`sum(EXPR for x in items)` adds up one value per item. Three uses come up constantly:",
    "- **A total**: Koko Eating Bananas works out the hours at speed `mid` with `sum((p + mid - 1) // mid for p in piles)`. For each pile, `(p + mid - 1) // mid` is p ÷ mid rounded up (the integer ceiling trick from the floats lesson), and `sum` adds those up.",
    "- **A count**: `sum(1 for x in items if COND)` adds 1 per item that passes. Since `True` is 1, `sum(COND for x in items)` counts the same way.",
    "- **Digits**: Happy Number's `sum(int(d) ** 2 for d in str(n))` turns `n` into its digit characters, squares each digit and adds them.",
], r'''
piles = [3, 6, 7, 11]
k = 4
print([(p + k - 1) // k for p in piles])      # hours per pile
print(sum((p + k - 1) // k for p in piles))   # total hours
print(sum(1 for p in piles if p > 5), sum(p > 5 for p in piles))
n = 19
print(sum(int(d) ** 2 for d in str(n)))       # 1 + 81
''', read=[
    ("for p in piles", "each pile"),
    ("(p + mid - 1) // mid", "hours for that pile: p / mid rounded up"),
    ("sum(...)", "add up the hours for every pile"),
], loop=r'''
hours = 0
for p in piles:
    hours += (p + mid - 1) // mid
''', find=r"\bsum\(.* for ", tasks=[
    Pr(r'''
piles = [3, 6, 7, 11]
k = 4
print(sum((p + k - 1) // k for p in piles))
print(sum(p % 2 == 1 for p in piles))
''', "8\n3", "Hours per pile at speed 4: 1, 2, 2, 3. Three piles are odd, and each `True` adds 1."),
    Wr("A number is *happy* if repeatedly replacing it with the sum of its digits' squares reaches 1. (It isn't if it loops forever.) Read `n` and print `YES` if it's happy, otherwise `NO`.",
       "n = int(input())\n", "n = int(input())\nseen = set()\nwhile n != 1 and n not in seen:\n    seen.add(n)\n    n = sum(int(d) ** 2 for d in str(n))\nprint('YES' if n == 1 else 'NO')",
       [("19\n", "YES"), ("2\n", "NO"), ("7\n", "YES")]),
]),
L("min_max", "max() and min() with key= and default=", [
    "`max` and `min` have several forms:",
    "- `max(a, b)`: the larger of two values. `best = max(best, x)` inside a loop keeps a running maximum.",
    "- `max(iterable)`: the largest item. It raises `ValueError` if the iterable is empty, unless you pass `default=`.",
    "- `max(iterable, key=f)`: the item whose `f(item)` is largest (the item itself is returned, not `f(item)`). On a tie, the first one wins.",
    "Now Max Area of Island: `return max((area(r, c) for r in range(R) for c in range(C)), default=0)`. Find the `for`s: every cell `(r, c)`, row by row. For each one, call `area(r, c)` (it floods that island and returns its size, or 0 for water or an already-visited cell). Take the largest of all those, or 0 if there are no cells at all. The generator needs its own parentheses because `default=0` is a second argument.",
], r'''
words = ["fig", "banana", "kiwi"]
print(max(words), max(words, key=len), min(words, key=len))
print(max([], default=0))
grid = [[1, 1, 0],
        [0, 0, 1]]
R, C = len(grid), len(grid[0])
def area(r, c):
    if r < 0 or c < 0 or r >= R or c >= C or grid[r][c] != 1:
        return 0
    grid[r][c] = 0
    return 1 + area(r + 1, c) + area(r - 1, c) + area(r, c + 1) + area(r, c - 1)
print(max((area(r, c) for r in range(R) for c in range(C)), default=0))
''', read=[
    ("for r in range(R) for c in range(C)", "every cell, row by row"),
    ("area(r, c)", "the size of the island starting there (0 if water or already counted)"),
    ("max(( ... ), default=0)", "the biggest of those sizes; 0 if there were none"),
], loop=r'''
best = 0
for r in range(R):
    for c in range(C):
        best = max(best, area(r, c))
return best
''', find=r"\b(max|min)\(.*(key=|default=| for )", tasks=[
    Pr(r'''
words = ["fig", "banana", "kiwi", "cherry"]
print(max(words, key=len), max(len(w) for w in words))
print(min([3, -7, 5], key=abs))
print(max([], default="none"))
''', "banana 6\n3\nnone", "With `key=len` you get the word back; taking the max of the lengths gives the number. `banana` and `cherry` tie at 6 and the first one wins. `key=abs` picks the value nearest zero."),
    Wr("Line 1 is `n`, then `n` lines of `name score`. Print the name with the highest score (the first one listed if there's a tie). Use `max` with `key=`.",
       "n = int(input())\nrows = [input().split() for _ in range(n)]\n", "n = int(input())\nrows = [input().split() for _ in range(n)]\nprint(max(rows, key=lambda r: int(r[1]))[0])",
       [("3\nal 5\nbo 9\ncy 9\n", "bo"), ("1\nzed 0\n", "zed")]),
]),
L("dict_set_comp", "Dict and set comprehensions", [
    "Curly braces work the same way: `{KEY: VALUE for x in items}` builds a dict and `{EXPR for x in items}` builds a set.",
    "- Construct Binary Tree uses `{v: i for i, v in enumerate(inorder)}`: a map from each value to its position, so finding a value's index is O(1) instead of a search.",
    "- Partition Labels uses `{c: i for i, c in enumerate(s)}`. When a key repeats, later items overwrite earlier ones, so this keeps each character's **last** index.",
    "- Partition Equal Subset Sum: `reach |= {r + x for r in reach}`. Build the set of every reachable sum plus `x`, then add those into `reach`. (The comprehension reads the old `reach` completely before `|=` changes it.)",
], r'''
inorder = [9, 3, 15, 20]
print({v: i for i, v in enumerate(inorder)})
s = "abacb"
print({c: i for i, c in enumerate(s)})      # last index wins
reach = {0}
for x in [2, 3]:
    reach |= {r + x for r in reach}
print(sorted(reach))
''', read=[
    ("for i, c in enumerate(s)", "each position i and its character c"),
    ("c: i", "key c, value i; a repeated c overwrites, so the last i stays"),
    ("{ ... }", "with a colon: a dict; without: a set"),
], loop=r'''
last = {}
for i, c in enumerate(s):
    last[c] = i
''', find=r"\{[^{}]*for [^{}]*\}", tasks=[
    Pr(r'''
s = "abacb"
last = {c: i for i, c in enumerate(s)}
print(last)
print({len(w) for w in ["hi", "yo", "hey"]})
''', "{'a': 2, 'b': 4, 'c': 3}\n{2, 3}", "`a` is set to 0, then overwritten with 2; it keeps its first position in the dict's order. The set keeps one copy of each length."),
    Wr("Read a line of words. Print each distinct word and its length as `word length`, sorted by word. Build a dict with a comprehension.",
       "words = input().split()\n", "words = input().split()\nlengths = {w: len(w) for w in words}\nfor w in sorted(lengths):\n    print(w, lengths[w])",
       [("pear fig pear\n", "fig 3\npear 4"), ("b a\n", "a 1\nb 1")]),
]),
L("enumerate_zip", "enumerate() and zip()", [
    "- `enumerate(items)` gives `(index, item)` pairs, so `for i, x in enumerate(nums):` has both. `enumerate(items, start=1)` counts from 1.",
    "- `zip(a, b)` walks two sequences side by side, giving `(a[0], b[0])`, `(a[1], b[1])`, and so on. It stops at the shorter one.",
    "- `zip(a, a[1:])` pairs each item with the next one: every neighbouring pair. Alien Dictionary compares neighbouring words with `for a, b in zip(words, words[1:])`.",
    "- Meeting Rooms unpacks two intervals at once: `for (s1, e1), (s2, e2) in zip(intervals, intervals[1:])`. Each step yields a pair of intervals, and the brackets in the loop target split each interval into its start and end.",
    "- Car Fleet's `sorted(zip(position, speed), reverse=True)` makes `(position, speed)` pairs and sorts them by position, nearest the target first.",
    "- `zip(*grid)` gives the columns of a grid (it's a transpose).",
], r'''
a = [10, 20, 30]
for i, x in enumerate(a, start=1):
    print(i, x)
print(list(zip(a, a[1:])))
iv = [[1, 3], [2, 6], [8, 9]]
for (s1, e1), (s2, e2) in zip(iv, iv[1:]):
    print(f"{e1} > {s2}?", e1 > s2)
print(sorted(zip([10, 8, 0], [2, 4, 1]), reverse=True))
print(list(zip(*[[1, 2], [3, 4]])))
''', read=[
    ("zip(iv, iv[1:])", "pairs (interval 0, interval 1), (interval 1, interval 2), ..."),
    ("(s1, e1), (s2, e2)", "unpack the pair, then unpack each interval inside it"),
], loop=r'''
for k in range(len(iv) - 1):
    s1, e1 = iv[k]
    s2, e2 = iv[k + 1]
''', find=r"enumerate\(|zip\(", tasks=[
    Pr(r'''
names = ["ann", "bob", "cy"]
ages = [30, 25]
print(list(zip(names, ages)))
print([f"{i}:{n}" for i, n in enumerate(names)])
print([b - a for a, b in zip([1, 4, 9], [4, 9, 16])])
''', "[('ann', 30), ('bob', 25)]\n['0:ann', '1:bob', '2:cy']\n[3, 5, 7]", "`zip` stops at the shorter list, so `cy` is dropped. `enumerate` starts at 0."),
    Wr("Read a line of integers. Print how many times a number is larger than the one just before it. Use `zip(nums, nums[1:])`.",
       "nums = list(map(int, input().split()))\n", "nums = list(map(int, input().split()))\nprint(sum(b > a for a, b in zip(nums, nums[1:])))",
       [("1 3 2 5 6\n", "3"), ("5\n", "0"), ("3 3 3\n", "0")]),
]),
L("lambda_keys", "lambda, sort keys and heap tuples", [
    "`lambda x: EXPR` is a small unnamed function that returns `EXPR`. You'll mostly see it as a `key=`: `intervals.sort(key=lambda x: x[0])` sorts intervals by their first item.",
    "Heaps can't take a key, so solutions put the sort key first in a tuple:",
    "- `heapq.heappush(heap, (dist, node))`: tuples compare by their first item, so the smallest distance pops first.",
    "- Merge k Sorted Lists pushes `(node.val, i, node)`. The index `i` breaks ties between equal values, so Python never has to compare two `ListNode`s (which would raise `TypeError`).",
    "- Max-heaps by negation: `[-s for s in stones]`, or `(-c, w)` in Top K Frequent Words to get the highest count first and, on equal counts, alphabetical order.",
], r'''
import heapq
count = {"apple": 3, "kiwi": 3, "fig": 1}
heap = [(-c, w) for w, c in count.items()]
heapq.heapify(heap)
print([heapq.heappop(heap)[1] for _ in range(2)])
f = lambda x: x * 2 + 1
print(f(5), sorted([3, -4, 1], key=abs))
iv = [[5, 6], [1, 3], [2, 4]]
iv.sort(key=lambda x: x[0])
print(iv)
''', read=[
    ("lambda x: x[0]", "a function: given x, return x[0]"),
    ("(-c, w)", "sort by count high to low, then word alphabetically"),
    ("heapq.heappop(heap)[1]", "pop the smallest tuple and keep its second item (the word)"),
], loop=r'''
def first(x):
    return x[0]
iv.sort(key=first)
''', find=r"lambda|heappush\(\w+, \(|\(-[a-z]\w*, ", tasks=[
    Pr(r'''
import heapq
h = []
for name, pri in [("b", 2), ("a", 2), ("c", 1)]:
    heapq.heappush(h, (pri, name))
print([heapq.heappop(h) for _ in range(3)])
print(sorted(["b2", "a10", "c1"], key=lambda s: int(s[1:])))
''', "[(1, 'c'), (2, 'a'), (2, 'b')]\n['c1', 'b2', 'a10']", "Equal priorities fall back to the second item, so `a` comes before `b`. The key turns `\"a10\"` into 10, so it sorts last."),
    Wr("Line 1 is `n`, then `n` lines of intervals `start end`. Print them sorted by end, then by start, one per line.",
       "n = int(input())\nivs = [list(map(int, input().split())) for _ in range(n)]\n", "n = int(input())\nivs = [list(map(int, input().split())) for _ in range(n)]\nivs.sort(key=lambda x: (x[1], x[0]))\nfor s, e in ivs:\n    print(s, e)",
       [("3\n1 5\n2 3\n0 5\n", "2 3\n0 5\n1 5")]),
]),
L("short_circuit", "Short-circuit guards", [
    "`and` stops at the first falsy operand and `or` stops at the first truthy one. Solutions rely on this to keep a check from running when it would crash.",
    "- `if not stack or stack[-1] != pairs[ch]:` (Valid Parentheses). If the stack is empty, `not stack` is True and Python never evaluates `stack[-1]`, which would raise IndexError. Swap the two sides and it crashes on `)`.",
    "- `while stack and stack[-1][1] > h:` (Largest Rectangle): stop when the stack is empty, and only then look at the top.",
    "- `if r < 0 or c < 0 or r >= R or c >= C or grid[r][c] != '1': return` (Number of Islands and every grid DFS): the bounds come first, so `grid[r][c]` is read only for a cell that exists. A negative index wouldn't crash; it would quietly wrap to the other side of the grid, which is worse.",
    "- `x or default` gives `x` unless it's falsy. Careful: 0 and `''` are falsy too.",
], r'''
pairs = {")": "("}
for s in ["()", ")"]:
    stack = []
    ok = True
    for ch in s:
        if ch == "(":
            stack.append(ch)
        elif not stack or stack[-1] != pairs[ch]:
            ok = False
            break
        else:
            stack.pop()
    print(s, ok and not stack)
grid = ["1."]
r, c = 0, 5
print(c >= len(grid[0]) or grid[r][c] != "1")
''', read=[
    ("not stack", "True when the stack is empty: then stop, the whole `or` is True"),
    ("or stack[-1] != pairs[ch]", "only reached when the stack has something on top"),
], loop=r'''
if not stack:
    bad = True
elif stack[-1] != pairs[ch]:
    bad = True
''', find=r"not \w+ or |while \w+ and \w+\[-1\]|\w+ < 0 or ", tasks=[
    Pr(r'''
def side(x):
    print("ran", x)
    return x

print(side(0) and side(1))
print(side(2) or side(3))
print(side([]) or side(5))
''', "ran 0\n0\nran 2\n2\nran []\nran 5\n5", "`0 and ...` stops at 0 and returns it, so `side(1)` never runs. `2 or ...` stops at 2. `[]` is falsy, so `or` has to run `side(5)`, and returns 5."),
]),
L("chained", "Chained comparisons and direction loops", [
    "`0 <= nr < R` means `0 <= nr and nr < R`: is the row inside the grid? Python lets comparisons chain like in maths, evaluating the middle value once.",
    "Grid BFS and DFS loop over the four neighbours with a tuple of offsets:",
    "- `for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):` then `nr, nc = r + dr, c + dc` and `if 0 <= nr < R and 0 <= nc < C and ...`.",
    "- Word Search squeezes that into one line: `found = any(dfs(r + dr, c + dc, i + 1) for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)))`. Read it as: try each of the four directions, and stop at the first one where the rest of the word can be found.",
], r'''
R, C = 3, 4
r, c = 0, 3
for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
    nr, nc = r + dr, c + dc
    inside = 0 <= nr < R and 0 <= nc < C
    print((nr, nc), "inside" if inside else "outside")
''', read=[
    ("for dr, dc in ((1, 0), ...)", "each direction as a (row step, column step) pair"),
    ("0 <= nr < R", "nr is a valid row index"),
], loop=r'''
if 0 <= nr and nr < R and 0 <= nc and nc < C:
    ...
''', find=r"\d <=? \w+ <=? \w+", tasks=[
    Pr(r'''
R, C = 3, 4
for r, c in [(0, 0), (2, 4), (-1, 1), (2, 3)]:
    print(0 <= r < R and 0 <= c < C, end=" ")
print()
print(1 < 2 < 3, 3 > 2 > 2, 1 < 3 > 2)
''', "True False False True\nTrue False True", "(2, 4): column 4 isn't below 4. `3 > 2 > 2` is `3 > 2 and 2 > 2`. `1 < 3 > 2` is legal and means `1 < 3 and 3 > 2`."),
    Wr("Read `R C`, then a cell `r c`. Print each neighbour of the cell that's inside the grid, in the order down, up, right, left, as `r c`, one per line.",
       "R, C = map(int, input().split())\nr, c = map(int, input().split())\n",
       "R, C = map(int, input().split())\nr, c = map(int, input().split())\nfor dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n    nr, nc = r + dr, c + dc\n    if 0 <= nr < R and 0 <= nc < C:\n        print(nr, nc)",
       [("3 3\n0 0\n", "1 0\n0 1"), ("3 3\n1 1\n", "2 1\n0 1\n1 2\n1 0")]),
]),
L("unpack_loops", "Unpacking inside loops and comprehensions", [
    "Anywhere a loop assigns a variable, it can unpack instead. `_` marks a slot you don't need.",
    "- `_, i, node = heapq.heappop(heap)` (Merge k Lists): pop a `(value, index, node)` tuple, ignore the value.",
    "- `return [t for _, t in heapq.nlargest(10, heap)]` (Design Twitter): each item is `(time, tweet_id)`; keep only the id.",
    "- `return [[x, y] for _, x, y in heap]` (K Closest Points): drop the distance, rebuild each point.",
    "- `carry, d = divmod(v, 10)` (Add Two Numbers): the tens go to `carry`, the ones digit to `d`.",
    "- `a, b = a ^ b, (a & b) << 1` (Sum of Two Integers): both new values come from the old `a` and `b`.",
], r'''
import heapq
heap = [(5, "x", 1), (2, "y", 9)]
print([[a, b] for _, a, b in heap])
tweets = [(3, 101), (9, 205), (1, 7)]
print([t for _, t in heapq.nlargest(2, tweets)])
carry, d = divmod(17, 10)
print(carry, d)
a, b = 5, 3
a, b = a ^ b, (a & b) << 1
print(a, b)
''', read=[
    ("for _, t in ...", "each item is a pair: ignore the first part, call the second t"),
    ("heapq.nlargest(10, heap)", "the 10 largest items, largest first"),
], loop=r'''
out = []
for item in heapq.nlargest(10, heap):
    time, t = item
    out.append(t)
return out
''', find=r"for _, |_, \w+(, \w+)? = ", tasks=[
    Pr(r'''
pts = [(25, 3, 4), (2, 1, 1)]
print([[x, y] for _, x, y in sorted(pts)])
q, r = divmod(-7, 2)
print(q, r)
''', "[[1, 1], [3, 4]]\n-4 1", "`sorted` orders the tuples by distance first, then the comprehension drops it. `divmod` floors like `//`, so -7 → (-4, 1)."),
]),
L("setdefault_trie", "setdefault: walking down a trie", [
    "`d.setdefault(k, default)` returns `d[k]` if `k` is there. If it isn't, it first stores `d[k] = default`, then returns that.",
    "Implement Trie walks down nested dicts with `cur = cur.setdefault(ch, {})`. Each step either finds the child dict for `ch` or creates an empty one, then moves into it. After the loop, `cur` is the node for the whole word, and the solution marks it with `cur['$'] = True` (any key that isn't a letter works).",
], r'''
root = {}
for word in ["cat", "car"]:
    cur = root
    for ch in word:
        cur = cur.setdefault(ch, {})
    cur["$"] = True
print(root)
print(list(root["c"]["a"]))
''', read=[
    ("cur.setdefault(ch, {})", "the child for ch, created empty if it's missing"),
    ("cur = ...", "step down into that child"),
], loop=r'''
if ch not in cur:
    cur[ch] = {}
cur = cur[ch]
''', find=r"setdefault", tasks=[
    Pr(r'''
d = {}
x = d.setdefault("a", [])
x.append(1)
d.setdefault("a", []).append(2)
print(d)
print(d.setdefault("b", 0), d.setdefault("b", 5))
''', "{'a': [1, 2]}\n0 0", "The first call creates the list and returns it, so `x` *is* `d['a']`; the second finds that same list. Once `\"b\"` exists, `setdefault` ignores its default (5) and returns the stored 0."),
    Wr("Line 1 is a list of words, line 2 a prefix. Build a trie with `setdefault`, then print `YES` if some word starts with the prefix, otherwise `NO`.",
       "words = input().split()\nprefix = input().strip()\n",
       "words = input().split()\nprefix = input().strip()\nroot = {}\nfor w in words:\n    cur = root\n    for ch in w:\n        cur = cur.setdefault(ch, {})\n    cur['$'] = True\ncur = root\nfor ch in prefix:\n    if ch not in cur:\n        print('NO')\n        break\n    cur = cur[ch]\nelse:\n    print('YES')",
       [("apple app bat\nap\n", "YES"), ("apple bat\nbe\n", "NO")]),
]),
L("iter_next", "iter() and next(): a shared cursor", [
    "`it = iter(values)` makes an iterator, a cursor over the values. Each `next(it)` returns the next value and moves the cursor on. When nothing is left, `next(it)` raises `StopIteration` (or returns its second argument, `next(it, default)`).",
    "Construct Binary Tree and Serialize Tree use one cursor shared by every recursive call. Each call takes the next value with `next(vals)`, builds its node, then builds its left subtree, which consumes as many values as that subtree needs, then the right. No index has to be passed around or returned.",
    "Order matters: the left subtree must be built before the right, because it takes its values first.",
], r'''
vals = iter("1,2,#,#,3,#,#".split(","))

def build():
    v = next(vals)
    if v == "#":
        return None
    left = build()        # consumes the whole left subtree first
    right = build()
    return (int(v), left, right)

print(build())
''', read=[
    ("iter(data.split(','))", "a cursor over the tokens"),
    ("next(vals)", "take the next token; every call shares the same cursor"),
], find=r"\bnext\(|\biter\(", tasks=[
    Pr(r'''
vals = iter("1,2,#,3".split(","))
print(next(vals), next(vals))
print(list(vals))
print(next(vals, "done"))
''', "1 2\n['#', '3']\ndone", "`list(vals)` takes everything that's left, so the cursor is at the end and `next` returns the default."),
    Wr("The input is a binary tree in preorder, comma-separated, with `#` for an empty child (as in Serialize Tree). Print the tree's height: the number of nodes on the longest root-to-leaf path. An empty tree has height 0.",
       "vals = iter(input().strip().split(','))\n",
       "vals = iter(input().strip().split(','))\n\ndef height():\n    v = next(vals)\n    if v == '#':\n        return 0\n    left = height()\n    right = height()\n    return 1 + max(left, right)\n\nprint(height())",
       [("1,2,#,#,3,#,#\n", "2"), ("1,#,2,#,3,#,#\n", "3"), ("#\n", "0")]),
]),
L("bits", "Bit tricks", [
    "Integers are bits, and a few operators work on them directly:",
    "- `n & 1` is the lowest bit: 1 if `n` is odd. `n >> 1` shifts right (halves, rounding down) and `n << 1` shifts left (doubles).",
    "- `n & (n - 1)` clears the lowest set bit. Repeat it until `n` is 0 and you've counted the 1 bits (Number of 1 Bits).",
    "- `x & -x` keeps only the lowest set bit (Single Number III).",
    "- `a ^ b` is XOR. `x ^ x` is 0 and `x ^ 0` is `x`, so XOR-ing every number together cancels the pairs and leaves the one without a partner (Single Number).",
    "- `bin(n)` shows the bits as a string: `bin(12)` is `'0b1100'`.",
    "Counting Bits uses `dp[i] = dp[i >> 1] + (i & 1)`: `i` has the same bits as `i >> 1`, plus its lowest bit.",
], r'''
n = 12
print(bin(n), n & 1, n >> 1, n << 1)
print(bin(n & (n - 1)), bin(n & -n))
print(5 ^ 3 ^ 5)
count, m = 0, n
while m:
    m &= m - 1
    count += 1
print(count, bin(n).count("1"))
''', find=r"\w & 1\b|& \(\w+ - 1\)|& -\w|\^=? |>>|<<", tasks=[
    Pr(r'''
n = 10
print(n & 1, n >> 1, n << 2, n & (n - 1), n & -n)
print(6 ^ 6, 6 ^ 0, 1 ^ 2 ^ 1)
''', "0 5 40 8 2\n0 6 2", "10 is 0b1010. Clearing its lowest set bit leaves 0b1000 = 8, and that lowest bit on its own is 0b10 = 2."),
    Wr("Read a line of integers where every value appears exactly twice except one. Print the one that appears once, using XOR.",
       "nums = list(map(int, input().split()))\n", "nums = list(map(int, input().split()))\nres = 0\nfor x in nums:\n    res ^= x\nprint(res)",
       [("4 1 2 1 2\n", "4"), ("7\n", "7"), ("-3 5 5\n", "-3")]),
]),
]),
]
