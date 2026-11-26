# Cut list: the seven-angle review (Nov 2026)

## Round 1

Everything the review fixes removed, hid or reworded, so each can be checked and rolled back on its own.
Round 1 is commit `43c2416` (`git show 43c2416 -- <file>` shows the exact before and after). Round 2 is below.

### Removed or hidden

| # | What | Where it was | Now | To roll back |
|---|---|---|---|---|
| 1 | Pattern badge on the cold-solve screen | `studySolve` header in `static/app.js` | Not shown: a "cold" solve shouldn't name the tool. The 2nd hint still names it | Re-add `${mystery ? '' : patternTag(p.pattern)}` after the difficulty tag |
| 2 | Pattern name in the guided problem's breadcrumb ("← Sliding Window (variable)") | `studyGuided` in `static/app.js` | "← Back to the course" (it sat right above "Which pattern fits?") | Put `← ${esc(pat.name)}` back in the `.crumb` link |
| 3 | README badges "Python 3.10+" and "No dependencies" | `README.md` top | Only the Deploy badge (both facts are still in the README text) | Restore the two `img.shields.io` lines |
| 4 | Key bar intro "New here? Everything works from the keyboard. These are the keys for this screen." | `paintKeybar` in `static/app.js` | "Keys for this screen:" | Restore the sentence in the `.kintro` span |
| 5 | Games page intro "The ladder goes Idea → Structure → Syntax → Full solve → In-person… or grind any game here." | `ROUTES.games` | A shorter intro, plus "The real thing" and "Drills" headings with one line each | Restore the paragraph |
| 6 | Letter badges under every top tab, always visible | `nav a .navk` in `static/style.css` | Shown only after pressing G (they still light up then) | Set `.navk` back to `opacity: .8`, restore the hover rule and `padding: 4px 8px 12px` on `nav a` |
| 7 | Clock icons in long lists (Problems rows, course rows, Patterns tiles, tables) | `static/style.css` | The time text stays; only the icon is hidden there | Delete the `[data-navlist] .eta-ic, table .eta-ic, …` rule |
| 8 | "Lv · XP" pill on phones | header HUD | Hidden under 820px (still on desktop and in Stats) | Remove `.hud .pill.hud-lv { display: none; }` from the 820px block |
| 9 | "#153"-style numbers on starter problems and twists | walkthrough and guided headers, Sprint cards, the Problems list | NeetCode problems show "NeetCode #16" (in the Problems list, the number with that as its tooltip); problems outside the NeetCode 150 show no number ("·" in the list) | Change `ncNum` to return the number for any `n`, and put `${p.num}` back in the `.pnum` span |
| 10 | Sliding Window lesson opener: "…It works when the window's validity is monotonic…" | `content/study_patterns.py` | Starts from Longest Substring, then explains the grow/shrink rule in plain words | Restore the old `why` string |
| 11 | Binary Search lesson opener: "If you can split the search space with a yes/no question whose answers are monotonic…" | `content/study_patterns.py` | Starts from guessing 1 to 100 with "higher or lower" | Restore the old `why` string |
| 12 | Greedy's headline trigger "max subarray" | `content/patterns.py` | Moved last as "max subarray (drop a run once it goes negative)"; the first trigger is now "can you reach the end / fewest jumps" | Put "max subarray" back first |

### Changed behaviour (nothing removed)

| What | Before | Now |
|---|---|---|
| Sliding Window worked example | Best Time to Buy and Sell Stock | Longest Substring Without Repeating Characters. Best Time is now a guided problem with a note that its trick is "lowest price so far" |
| Mixed practice | Opened after 1 lesson; checkpoint every 4 lessons | Opens after 2 lessons (one pattern has nothing to tell apart); checkpoint every 2. Today also shows a mystery-problem card once it's open |
| "Which pattern?" wrong options (Pattern Sprint, guided step 1) | 3 random patterns | The patterns most often confused with the answer (`CONFUSABLE` in `static/srs.js`) |
| Games page order and number keys | Sprint first (1) … OA (9), Mock (0) | OA Mode (1) and Mock Interview (2) first, under "The real thing"; the drills follow (3–0) |
| Crunch mode (new) | Today always followed the full path | When days left × daily minutes can't cover the path: the most-asked patterns only (lesson + one cold solve), and the games get half the day (Sprint, Fill the Gap, Syntax Snap). "Use the full path instead" on Today turns it off |
| Today's main button in crunch mode | Started the first game | Starts the crunch study step |
| Phone header | All 10 tabs in a row that scrolled sideways | Today, Study, Games, Problems + "More" (the current tab always shows) |
| Key bar | Could wrap onto two lines; no way to hide it | One line (scrolls sideways if needed), with a Hide button that shrinks it to one chip; "1–4 pick an answer" no longer shows twice |
| Stats wording | "Items in rotation", "box", "Avg box" | "Review cards", "level", "Average level", with a paragraph explaining levels |
| Sprint header | "#46 · combo 3" | "NeetCode #46 · 🔥 3 in a row" |
| Games "×24" button | "×24" | "or 24" |
| Scheduling code | Inside `static/app.js` | `static/srs.js`, a pure module with 16 Node tests (`tests/srs.test.js`), run in CI |

## Round 2: the rest of the review, the editor, split files

Files moved, nothing lost: `static/app.js` is now `static/app/*.js` and `static/style.css` is now `static/css/*.css`
(same code, same cascade order). Before round 2, `git show 43c2416:static/app.js` has the old single file.

### Removed or hidden

| # | What | Where it was | Now | To roll back |
|---|---|---|---|---|
| 13 | NeetCode numbers: "NeetCode #16" in walkthrough, guided and Sprint headers, the number column in the Problems list, the "#" column and "12." prefixes on pattern pages | `ncNum` in `app/shared.js`; `.pnum` in `app/pages.js` | LeetCode numbers only (the LC chips and links already show them) | Restore `ncNum` and its three calls, the `.pnum` span, the `<th>#</th>` column and `${c.num}.` |
| 14 | Time estimates on every row of long lists (Problems, course rows, Patterns tiles, tables) | `css/polish.css` | Times stay on things you start: Today cards, Games cards, the solve header | Change the `[data-navlist] .eta, table .eta, …` rule back to hide only `.eta-ic` |
| 15 | Patterns, Python, Cheatsheet, Guide, Stats, Settings as top tabs on desktop | `css/polish.css` | Behind **More** at every width (the current page always shows; G + letter still jumps straight there) | Move the `nav .nav2` and `.nav-more` rules back inside the `max-width: 820px` block |
| 16 | The box around cards with nothing to click (Stats tiles, info sections) | `css/polish.css` | Plain sections; a box now means you can start or change something | Delete the `#app .card:not(a)…:not(:has(…))` rule |
| 17 | The Guide's 7-row "Which tab is for what" table | `guide.js` | "Where to go": Today, Study, everything else | Restore the seven rows |
| 18 | Emoji as icons in lists: 🧩 ✍️ 💻 🎤 on Problems rows and pattern tables, 📖 on Study course links | `app/pages.js` | Text: Solve, Line Up, Fill, Mock, Study course | Put the emoji back in those links |
| 19 | Bug Hunt's "Python 3 · one bug" line above the editor | `app/games-drills.js` | The editor's own toolbar says Python 3; the intro says one bug | Restore the `.ed-head` line |
| 20 | Nine lesson openers (Stack, Linked List, Backtracking, Topological Sort, Union-Find, Shortest Path, 1D DP, 2D DP, Trie) | `content/study_patterns.py` | Each starts from a concrete example (brackets, reversing 1→2→3, subsets, course schedule, friend groups, driving directions, climbing stairs, "abcde"/"ace", autocomplete) | Restore the old `why` strings from `43c2416` |
| 21 | Longer copy: the Problems, Patterns and Cheatsheet intros, the crunch card paragraph, the Games intro lines, the Stats explanation | `app/pages.js`, `cheatsheet.js` | Each page's first line states its one job, with links to the other two | Restore the paragraphs from `43c2416` |
| 22 | The cold-solve coach's Show/Hide toggle, open by default for the first 6 solves | `app/study-solve.js` | A **Coach** tab (key C); for the first 6 solves a tip on the Description tab points to it | Not a removal of content; restore the old `drawCoach` show/hide if wanted |
| 23 | The editor's hint line "Tab indents · Shift+Tab dedents · Esc leaves" | `app/editor.js` | The editor's status line lists its keys | Restore the `.ed-hint` span |

### Changed behaviour (nothing removed)

| What | Before | Now |
|---|---|---|
| Cold solve and OA Mode layout | Statement card, a textarea and a row of buttons | LeetCode-style workspace: problem tabs, the editor, a Testcase / Test Result console, resizable panels, a Problem / Code switch on phones |
| Run and grading | "Run tests" ran everything and graded the first pass | **Run** checks the examples only (not graded); **Submit** adds the hidden tests and is graded. "Nailed it" is suggested for 2 submissions or fewer (was 3 runs) |
| Editor | Textarea with colours and auto-indent | Line numbers, current line, indent guides, bracket matching, closing pairs, suggestions, comment toggle, move/copy/delete lines, folding, full screen, its own undo. Mock Interview's code step keeps none of the helpers (whiteboard) |
| Keys on the solve screen | R / Ctrl+Enter ran the tests | R = Run, S = Submit; in the editor Ctrl+' runs and Ctrl+Enter submits; D / C switch tabs |
| Combined problems (new) | none | 20 problems tagged with a second pattern; a Study section, a weekly Today card, and the reveal names both patterns |
| Stats (new chart) | none | Cold solves by week: tried and solved without the answer, 8 weeks |
| Day records | xp, rounds, new per game | also `solves: { n, ok }`, merged per field by max |
| Progress rules | Inside the app | `static/progress.js`, 9 Node tests, run in CI |
| A problem's 4 dots | A weighted score of Line Up, Fill and solve levels; one pass of each gave 2 dots and the 4th took about 9 nailed reviews | One dot each for Line Up, Fill and Solve done, the 4th after nailing the full solve 3 times (`Progress.LOCK_SOLVES`). Hovering or a screen reader says what's done and what's next |
| Editor Reset | Reset at once (Ctrl+Z undid it) | Asks first: "Keep my code" (Esc, focused) or "Reset" (R). Nothing is asked when the code is unchanged |
