# Pattern Gym: project context

**Updated 2026-11-18.** If you're Claude starting a new session: read this file, then
`README.md`, then the parts of `static/app.js` you need (it's sectioned with `// ───` banners). Update this
file whenever you change architecture, state shape, conventions or the to-do list.

## Status

- **Live:** https://nairbs.github.io/pattern-gym/ (repo `NAIRBS/pattern-gym` is public; Pages deploys from
  GitHub Actions; the last deploys succeeded).
- **Local:** `python server.py` → http://localhost:8787 (`start.bat` on Windows). Both modes run the same `static/` app.
- **Built:** everything in the original plan (static hosting, in-browser Python, browser storage, Supabase
  sign-in + sync, deploy workflow) plus the Study course redesign, Problems page, keyboard-first UI,
  green theme and a WCAG 2.2 AA pass.
- **Verified by the owner (2026-11-18):** real email sign-in on the live site, sync between devices, and
  the Supabase Auth URL configuration (Site URL + redirect URLs).

## Who it's for and why

- The owner is preparing for coding OAs and in-person technical interviews, in Python.
- **Core difficulty:** turning an idea into pseudocode and then code. Re-solving problems, rewriting solutions
  and "understanding deeply" didn't stick. So the app teaches a repeatable **approach** and drills
  **recognition → structure → syntax → full solve → in-person skills** with spaced repetition.
- Daily time and interview urgency change often, so both are settings (interview date → "urgent mode"
  within 14 days, daily minutes → the Today plan). In-person focus areas are toggles.

## Architecture

| | Online (GitHub Pages) | Local (`server.py`) |
|---|---|---|
| Content | `static/content.json`, built by `build_static.py` | `/api/content`, built from `content/*.py` at startup |
| Running code | `static/py-worker.js`: Pyodide 0.26.4 runs `runner.py` (copied into `static/` by the build) | `/api/run` + `/api/syntax`: `runner.py` in a subprocess |
| Progress | localStorage key `pattern-gym-state` (+ `navigator.storage.persist()`) | `/api/state` → `progress.json` |
| Cloud sync | Optional Supabase (`sync.js`) on top of either | same |

- `app.js` picks the mode automatically (tries `/api/content` first). `index.html` uses **relative** asset
  paths so the site works under `/pattern-gym/`.
- Timeouts: 6 s for tests, 4 s for syntax cards. Online, the worker is **terminated and recreated** on
  timeout or crash (that's what stops infinite loops). Deep recursion surfaces as an error, not a hang.
- **Never run user code on a server.** Multi-user means untrusted code; it runs in each user's browser.
- **Sync** (`static/sync.js`, global `Cloud`): email-link sign-in (PKCE, so the link must be opened in the
  same browser), one row per user in table `progress` (`user_id`, `data` jsonb, `updated_at`) with RLS
  "own row". The cycle is pull → `mergeState(local, cloud)` → save locally → upsert if different. It runs
  on load, on sign-in, 5 s after local changes, on `online`, and when the tab becomes visible.
  `static/config.js` holds the project URL and the publishable key, which are public by design. Never put
  the service_role key in the repo.
- **Merge rules** (`static/merge.js`, pure functions, used by the page and node tests): per SRS item, the
  later `last` wins, then higher `reps`; `xp` max; `days` per-day max; `mocks` union by (date, problem);
  `study.lessons` / `walks` / `attempts` union (earliest date kept); `streak` recomputed from `days`;
  `plan` later date wins (same day: per-game max of `done`); `settings` from the copy with later
  `settingsAt`. Only **Restore from backup** and **Reset** overwrite the cloud copy, and both confirm first.

## Codebase map

```text
server.py          local HTTP server (stdlib): static files, /api/content, /api/run, /api/syntax, /api/state
runner.py          runs code against a test spec; run(code, spec) / run_json() for Pyodide; main() for subprocess
build_static.py    writes static/content.json + copies runner.py into static/ (both gitignored)
validate.py        every reference solution AND brute-force version must pass (and its sentence must give an
                   O(...)); walkthrough/lesson completeness
content/
  problems.py, problems_a/b/c.py   150 problems: statement, insight, catch, complexity, clarify, edges,
                                   solution (key lines marked `  # <<`), tests (F/D helpers)
  patterns.py      23 patterns: triggers, fill questions, skeleton
  study_patterns.py LESSONS per pattern (why, not_this, build line-by-line, bugs), METHOD, INPUT_SIZE
  study_problems.py WALK: per-problem brute-force sentence + pseudocode plan (all 150)
  study_brute.py   BRUTE: runnable naive code (84): worked examples, every DP problem (plain recursion =
                   the memo version minus the cache), and the array/string/search/heap/greedy ones
  sprint.py, syntax.py, interview.py   Sprint cards (150), Syntax Snap cards (34), clarify/talk-track/rubric
static/
  app.js           everything UI: utilities, storage, runner client, SRS, daily plan, router, keyboard,
                   games (GAMES.*), pages (ROUTES.*), Study (courses, walkthroughs, cold solve)
  py-worker.js     Pyodide worker
  sync.js, merge.js, config.js   sign-in + sync
  edge-match.js    Edge Hunter scoring (synonym-normalised token matching; pure, node-tested)
tests/             node tests: merge.test.js, edge-match.test.js
.github/workflows/pages.yml   validate → node tests → build_static → deploy static/ to Pages
```

## Key concepts in `app.js`

- **State `S`** (see `DEFAULTS`): `settings` (interviewDate, minutes, newPerDay, sprintSeconds, sprintNoLimit,
  edgeSeconds, singleKeys, focus{talk,clarify,complexity,noide}), `settingsAt`, `items` (`"game:id"` →
  {box, due, reps, lapses, last, lastQ}), `xp`, `streak`, `days`, `mocks`, `plan`,
  `study` {lessons, walks, attempts}. **Any new field needs a merge rule in `merge.js` plus a test.**
- **SRS:** boxes 0–7, intervals 1/3/7/14/30/60/120 days, capped by urgency. Grades: 0 blanked, 1 shaky, 2 nailed.
- **Routes:** today, study, games, play, problems, patterns, stats, settings (hash router; `onLeave` cleanup).
- **Games** (`GAMES.*`): sprint, lineup (SortableJS drag/drop + keyboard), skeleton (structural check,
  hint ladder), fill, syntax, bigo, edge (auto-scored via edge-match.js), oa, mock.
  "Show answer" toggles but counts as missed; "Previous" reopens the last question and undoes its grade.
- **Study** = one course per pattern, in `PATTERN_PRIORITY` order: **idea** (lesson) → **worked example**
  (first problem, brute force → final, complexity meter) → **guided** (1–2 problems, guess before each
  reveal) → **solo, cold** (`#/study/solve/<id>`: blank editor, approach coach that fades, 3-step hint
  ladder that caps the grade; the walkthrough unlocks only after an attempt). **Mixed practice**
  (`#/study/mixed`) hides the title and pattern. The 8-step `APPROACH` is the spine of all of it.
- **Keyboard:** `?` sheet, `G`+letter navigation, `/` search, `E`/`Esc` editor in/out, `Q` exit, number keys
  for options, and a bottom **key bar** listing the keys valid on the current screen. Controls declare
  keys with `data-key` and must **print their key on themselves**. Settings → Keyboard can turn
  single-key shortcuts off (WCAG 2.1.4).

## Conventions (keep these)

- After any content change: `python validate.py` prints `ALL OK`. After merge/edge changes:
  `node tests/merge.test.js && node tests/edge-match.test.js`. The deploy workflow enforces both.
  In the node tests, the "N passed" summary must stay the last line; add new tests above it.
- Adding a problem: append `P(...)`, mark key lines with `  # <<`, run validate. Test-spec features: design
  classes `D(...)`, `arg_types` (linked, tree, linked_many, linked_cycle), `inplace=`, `prelude=`,
  `harness=` (round-trips / several valid answers), `compare=` (unordered, unordered_nested, float).
- Accessibility is a requirement, not polish: AA contrast in both themes, 44 px targets, visible focus,
  aria-live for results/toasts/sync, page titles from the heading, adjustable or no time limits,
  `prefers-reduced-motion`.
- Pin exact CDN versions (supabase-js 2.118.0, Pyodide 0.26.4, SortableJS 1.15.2).
- Progress never goes in the repo (`progress.json` is gitignored).

## Open to-dos

1. Supabase free tier pauses after 7 days without use. If sync shows "☁ !", resume the project in the dashboard.
   Supabase Auth URLs (already set): Site URL `https://nairbs.github.io/pattern-gym/`; redirect URLs that
   URL, `http://localhost:8787/`, `http://localhost:8000/`. Update them if the site address ever changes.
2. Brute-force code (`content/study_brute.py`) is **done where it teaches** (84 problems). The rest are
   left without code on purpose: graphs, trees, linked lists, backtracking and bit/math tricks (the
   "brute force" is the same traversal or a trivial non-answer), plus Valid Sudoku, Encode/Decode, Eval
   RPN, Car Fleet, Merge Intervals, Non-overlapping Intervals, Merge Triplets, Task Scheduler, Twitter,
   Spiral Matrix and the "convert to int" problems. Their walkthroughs say so in the one-line `brute`
   text. If code is ever added, the `brute` sentence in `study_problems.py` must describe that code and
   contain an `O(...)` (validate checks this; the code label and the meter read it).

Done 2026-11-18:
- Node test summary lines moved to the end of each file (the count was short).
- Brute-force code for the 21 remaining DP problems. Their `brute` sentences and 9 older ones were
  rewritten to match the code shown and give a cost.
- The walkthrough's complexity meter used to say "Brute force runs in O(n²)" whenever the sentence had no
  `O(...)` (47 problems, including "No brute force" ones). It now shows "exponential" when the sentence
  says so, otherwise the final cost with "Same time as the brute force".
- Brute-force code for 40 array/string/search/heap/greedy/interval/matrix problems (nested loops,
  rescans, sort-everything); 11 sentences rewritten to match.
- `firstBigO` balances brackets (`O(log(min(m, n)))` used to be cut off); `bigORank` knows `n·k`, `n·q`,
  `V·E`. No walkthrough's meter shows the brute force cheaper than the final version.
- `.two` grid columns are `minmax(0, 1fr)`, so long code lines scroll inside their block instead of
  widening the page.

## Later ideas

- GitHub / Google sign-in buttons (providers must be enabled in Supabase first).
- Leaderboards or shared streaks if friends use it.
- Gist sync as a no-account alternative.
