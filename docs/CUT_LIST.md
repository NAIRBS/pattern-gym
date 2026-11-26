# Cut list: the seven-angle review (Nov 2026)

Everything the review fixes removed, hid or reworded, so each can be checked and rolled back on its own.
All of it is in one commit; `git show <that commit> -- <file>` shows the exact before and after.

## Removed or hidden

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

## Changed behaviour (nothing removed)

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
