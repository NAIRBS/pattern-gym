# Pattern Gym

Daily drills for LeetCode-style OAs and in-person interviews. Runs locally, Python standard library only.

**Start:** double-click `start.bat`, or run `python server.py` and open http://localhost:8787.

## On another computer

Needs Python 3.10+ (nothing else to install).

```bash
git clone <this repo's URL>
cd pattern-gym
python server.py        # Mac/Linux: python3 server.py
```

Then open http://localhost:8787. Get updates later with `git pull`.

Progress is saved in `progress.json`, which is **not** committed (it's per machine). To carry progress over, copy that file
into the folder on the other computer. Different port: `PORT=9000 python3 server.py` (Windows: `set PORT=9000` first).

## Study tab

Learn before you drill: **The Method** (problem → pseudocode in 4 questions, input-size → complexity table), a **lesson per pattern** (why it exists, how to spot it, the skeleton built line by line with the reason for each line, bugs to avoid), and a **step-by-step walkthrough for all 150 problems** (clarify → brute force → pattern → pseudocode plan → code with problem-specific lines highlighted → catch → complexity). Each lesson links straight into drills filtered to that pattern.

## The ladder

| Layer | Game | What it trains |
|---|---|---|
| Idea | ⚡ Pattern Sprint | Problem statement → pattern, under a timer (all 150 NeetCode problems) |
| Structure | 🧩 Line Up | Put a shuffled real solution back in order (checked by running tests) |
| Structure | 🦴 Skeleton Recall | Write a pattern's generic template from memory |
| Structure → Code | ✍️ Fill the Gap | Write the 2-4 key lines that make the skeleton solve *this* problem |
| Syntax | 🐍 Syntax Snap | One-line Python idioms, executed and checked |
| Full solve | 💻 OA Mode | Blank editor, timer, run button: OA conditions |
| In-person | ⏱️ Big-O Call | Call time/space complexity of a solution |
| In-person | 🔍 Edge Hunter | 60 s to list clarifying questions and edge cases |
| In-person | 🎤 Mock Interview | Clarify → plan aloud → code with no run button → dry-run → rubric self-score, optional voice recording |

Everything is spaced repetition: nailed items come back after 1, 3, 7, 14, 30... days; blanked ones come back tomorrow.
Setting an interview date within 14 days switches to urgent mode, which caps intervals so everything gets reps before the day.

## Files

- `server.py`: web server, code runner endpoint, progress saving (`progress.json`)
- `runner.py`: runs your code against tests in a separate process (6 s timeout)
- `content/`: patterns (skeletons), sprint deck, syntax cards, and all 150 NeetCode problems with solutions + tests
  (`problems.py`, `problems_a.py`, `problems_b.py`, `problems_c.py`)
- `validate.py`: checks every reference solution passes its tests. Run it after adding content.

## Adding a problem

Append a `P(...)` entry to any `content/problems*.py` file. Mark key lines with `  # <<` (those become Fill-the-Gap blanks), then run `python validate.py`.

Test specs support plain functions, design classes (`D(...)`), linked lists / trees (`arg_types`), in-place mutation (`inplace=`),
custom node classes (`prelude=`), and a `harness=` for round-trips or problems with several valid answers.
