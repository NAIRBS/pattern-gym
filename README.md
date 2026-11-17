# Pattern Gym

Daily drills for LeetCode-style OAs and in-person interviews (Python). Use it in the browser, or run it locally.

| | Online (GitHub Pages) | Local (`server.py`) |
|---|---|---|
| Open | https://nairbs.github.io/pattern-gym/ | http://localhost:8787 |
| Needs | A browser | Python 3.10+ (standard library only) |
| Your code runs | In your browser (Pyodide) | On your machine (`runner.py` subprocess) |
| Progress saved in | That browser's local storage | `progress.json` next to `server.py` |
| Moving progress by hand | Settings → Download backup, then Restore from backup | Copy `progress.json`, or the same buttons |
| Sync across devices | Sign in (Settings → Account & sync) | Same, if the Supabase redirect URLs allow localhost |

## Accounts and sync (optional)

Sign in under **Settings → Account & sync**: enter your email, then open the link it sends **in the same browser**.
Signed in, progress is still saved on the device first, then synced to Supabase (on load, a few seconds after each
change, and when you come back online). Progress from different devices is **combined, never overwritten**: each
drill keeps its most recent review, XP and daily totals take the higher value, lessons and mock interviews are
combined, and the most recently changed settings win. Only **Restore from backup** and **Reset** replace the
cloud copy, and they ask first. The "☁" pill in the header shows sync status.

Without signing in everything works as before, and **Download backup / Restore from backup** still move progress by hand.
The Supabase project URL and publishable key are in `static/config.js` (public by design; row-level security keeps
each user to their own row). Empty them to turn sync off.

## Online

Just open the link. The first time you press Run, the browser downloads Python (about 10 MB, a few seconds); after that it's
cached. Clearing site data for the page erases progress, so download a backup now and then.

## Local

Double-click `start.bat` (Windows), or:

```bash
git clone https://github.com/NAIRBS/pattern-gym.git
cd pattern-gym
python server.py        # Mac/Linux: python3 server.py
```

Then open http://localhost:8787. Get updates later with `git pull`. Different port: `PORT=9000 python3 server.py`
(Windows: `set PORT=9000` first). `progress.json` is **not** committed; it's per machine.

## Deploying

`.github/workflows/pages.yml` deploys on every push to `main` (or a manual run from the Actions tab): it runs
`validate.py`, then `build_static.py`, and publishes `static/`. If validation fails, nothing is deployed.
One-time setup: the repo must be public (or GitHub Pro), and **Settings → Pages → Source** must be **GitHub Actions**.

The app picks its mode by itself: if `/api/content` answers, it uses `server.py`; otherwise it loads `content.json`
and runs code in the browser. To try the static build locally:
`python build_static.py` then `python -m http.server -d static 8000` and open http://localhost:8000.

## Study tab

Learn before you drill: **The Method** (problem → pseudocode in 4 questions, input-size → complexity table), a **lesson per pattern** (why it exists, how to spot it, the skeleton built line by line with the reason for each line, bugs to avoid), and a **step-by-step walkthrough for all 150 problems** (clarify → brute force → pattern → pseudocode plan → code with problem-specific lines highlighted → catch → complexity). Each lesson links straight into drills filtered to that pattern.

## The ladder

| Layer | Game | What it trains |
|---|---|---|
| Idea | ⚡ Pattern Sprint | Problem statement → pattern, under a timer (all 150 NeetCode problems) |
| Structure | 🧩 Line Up | Put a shuffled real solution back in order: drag, click or keyboard (checked by running tests) |
| Structure | 🦴 Skeleton Recall | Write a pattern's reusable template from memory, with a 3-step hint ladder and a part-by-part check |
| Structure → Code | ✍️ Fill the Gap | Write the 2-4 key lines that make the skeleton solve *this* problem |
| Syntax | 🐍 Syntax Snap | One-line Python idioms, executed and checked |
| Full solve | 💻 OA Mode | Blank editor, timer, run button: OA conditions |
| In-person | ⏱️ Big-O Call | Call time/space complexity of a solution |
| In-person | 🔍 Edge Hunter | 60 s to list clarifying questions and edge cases, scored automatically against the expected list |
| In-person | 🎤 Mock Interview | Clarify → plan aloud → code with no run button → dry-run → rubric self-score, optional voice recording |

**Problems page:** search all 150 and solve any of them against the real tests, or open it in Line Up / Fill the Gap.

**Answers and going back:** Show answer toggles (show, hide, keep working), but seeing it once records the round as missed. **← Previous** reopens the last question and undoes the grade you gave it.

**Keyboard:** press `?` for the list. `g` then a letter changes page, `/` searches problems, `Esc` leaves a text box, `R` run, `H` hint, `A` answer, `N` next, `[` previous, `1 2 3` grade.

Everything is spaced repetition: nailed items come back after 1, 3, 7, 14, 30... days; blanked ones come back tomorrow.
Setting an interview date within 14 days switches to urgent mode, which caps intervals so everything gets reps before the day.

## Files

- `server.py`: local web server, code runner endpoint, progress saving (`progress.json`)
- `runner.py`: runs your code against tests. Locally in a separate process (6 s timeout); online the same file runs in
  the browser
- `static/`: the whole frontend (`index.html`, `app.js`, `style.css`); this folder is what gets published
- `.github/workflows/pages.yml`: the GitHub Pages deploy
- `content/`: patterns (skeletons), sprint deck, syntax cards, and all 150 NeetCode problems with solutions + tests
  (`problems.py`, `problems_a.py`, `problems_b.py`, `problems_c.py`)
- `build_static.py`: writes `static/content.json` and copies `runner.py` into `static/` for static hosting
- `static/py-worker.js`: runs `runner.py` in the browser with Pyodide when there's no server
- `validate.py`: checks every reference solution passes its tests. Run it after adding content (the deploy runs it too).
- `static/sync.js`, `static/merge.js`, `static/config.js`: sign-in, cloud sync, and the merge rules
  (tested by `node tests/merge.test.js`)
- `docs/NEXT_STEPS.md`: architecture decisions, what's done, and the remaining setup

## Adding a problem

Append a `P(...)` entry to any `content/problems*.py` file. Mark key lines with `  # <<` (those become Fill-the-Gap blanks), then run `python validate.py`.

Test specs support plain functions, design classes (`D(...)`), linked lists / trees (`arg_types`), in-place mutation (`inplace=`),
custom node classes (`prelude=`), and a `harness=` for round-trips or problems with several valid answers.
