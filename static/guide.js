// The grind guide: one page that says what to do each day, which outside resource is best for what,
// and where to look when stuck. Loaded after app.js; uses its helpers (esc, md, ROUTES, C).
'use strict';

const GUIDE_RULES = [
  ['Learn patterns, not problems.', 'About 20 patterns cover almost every interview question. Once you can name the pattern, the problem is mostly translation.'],
  ['Attempt before you read.', 'Struggle with a problem cold for 25 to 40 minutes before any explanation. Reading first feels faster and teaches far less.'],
  ['Re-solve what you failed.', 'A problem you read the answer to isn’t learned until you write it from a blank editor a day or more later. The Today plan schedules this for you.'],
  ['Say the cost before you code.', 'Brute force and its Big-O first, then what work it repeats, then the tool that removes it. Interviewers grade that reasoning.'],
  ['Practise out loud, under a clock.', 'Knowing the answer and producing it in 30 minutes while talking are different skills. Train the second one too.'],
];

// [weeks, title, here, elsewhere]
const GUIDE_PLAN = [
  ['Days 1–3', 'Python fluency',
    'Syntax Snap until Counter, defaultdict, heapq, deque, sort keys and slicing come without thinking. Set your interview date in Settings so the plan paces itself.',
    'The Python cheat sheet on the Study tab; LeetCode’s editor, to get used to its class-based signatures.'],
  ['Weeks 1–4', 'Patterns',
    'One Study course every day or two, in the path order: the idea, the worked example, guided problems, solo problems cold, then the transfer check. Do the Today plan’s reviews every day.',
    'After each cold solve, submit the same problem on LeetCode (the link is on the problem) to meet its judge and hidden tests. Watch the NeetCode video only after a real attempt.'],
  ['Weeks 3–8', 'Volume',
    'Keep the daily reviews. OA Mode on problems the plan brings back.',
    'Work through Grind 75 (or the NeetCode 150) on LeetCode with a timer: 25 min for Easy, 40 for Medium. Log each miss and re-solve it here later.'],
  ['Weeks 6–8', 'Speed and pressure',
    'Mixed practice (names hidden) and OA Mode with the hidden large tests on.',
    'A LeetCode weekly contest every week. If you have Premium, the company-tagged lists for your target companies in the last two weeks.'],
  ['From week 4', 'Talking',
    'Mock Interview once a week: clarify, plan out loud, code, state complexity, test.',
    'Peer mocks on Pramp, paid mocks with engineers on interviewing.io, and its public recordings. Behavioural answers and your resume from the Tech Interview Handbook a week before you apply.'],
];

const GUIDE_DAY = [
  ['10–20 min', 'Reviews', 'Today’s plan, top to bottom. Due items first; they’re what you’re about to forget.'],
  ['25–45 min', 'One new problem, cold', 'A Study cold solve, a mystery problem, or the next Grind 75 problem on LeetCode. Timer on.'],
  ['10–15 min', 'Close the loop', 'If you missed it: read the walkthrough or watch the video, close it, and write the solution from a blank editor.'],
  ['2 min', 'One line', 'Write down the signal you should have spotted (“sorted input + pair → two pointers”). That sentence is the thing you’re really learning.'],
];

const GUIDE_STUCK = [
  ['0–5 min', 'Restate the problem, solve a tiny example by hand, ask about empty input, duplicates, negatives and size.'],
  ['5–15 min', 'Write the brute force and its cost. Find the work it repeats.'],
  ['15–25 min', 'Hint 1, then hint 2: the brute force, then the tool. Try again with each.'],
  ['25–40 min', 'Hint 3, the plan. Code it from the plan.'],
  ['40+ min', 'Read the walkthrough or watch the video. It’s recorded as missed and comes back tomorrow, when you write it again from scratch.'],
];

// [question, [[label, href], ...]]  (an href starting with # is inside the app)
const GUIDE_WHERE = [
  ['I don’t recognise the pattern', [['Pattern Sprint', '#/play/sprint'], ['NeetCode roadmap', 'https://neetcode.io/roadmap']]],
  ['I get the idea but can’t write the code', [['Line Up and Fill the Gap', '#/games'], ['Skeleton Recall', '#/play/skeleton']]],
  ['I don’t understand a data structure or algorithm', [['USACO Guide', 'https://usaco.guide'], ['VisuAlgo', 'https://visualgo.net'], ['TIH cheatsheets', 'https://www.techinterviewhandbook.org/algorithms/study-cheatsheet/']]],
  ['I’m stuck on one specific problem', [['The walkthrough here', '#/problems'], ['NeetCode’s video', 'https://www.youtube.com/@NeetCode'], ['LeetCode’s Editorial and Solutions tabs', 'https://leetcode.com/problemset/']]],
  ['My code is right but too slow', [['Input size → target complexity', '#/study'], ['Big-O game', '#/play/bigo'], ['Big-O cheat sheet', 'https://www.bigocheatsheet.com']]],
  ['Which problems should I do?', [['Grind 75', 'https://www.techinterviewhandbook.org/grind75'], ['NeetCode 150', 'https://neetcode.io/practice']]],
  ['I’m preparing for one company', [['LeetCode company tags (Premium)', 'https://leetcode.com/problemset/'], ['TIH company guides', 'https://www.techinterviewhandbook.org']]],
  ['I freeze when I have to talk', [['Mock Interview', '#/play/mock'], ['Pramp', 'https://www.pramp.com'], ['interviewing.io', 'https://interviewing.io']]],
  ['Behavioural, resume, negotiating', [['Tech Interview Handbook', 'https://www.techinterviewhandbook.org']]],
  ['System design', [['System Design Primer', 'https://github.com/donnemartin/system-design-primer']]],
  ['I want to be faster', [['LeetCode contests', 'https://leetcode.com/contest/'], ['AtCoder Beginner Contests', 'https://atcoder.jp'], ['Codeforces', 'https://codeforces.com']]],
];

// name, url, cost, best at, how to use it
const GUIDE_RES = [
  ['LeetCode', 'https://leetcode.com', 'Free; Premium is paid',
    'The real thing. Thousands of problems, the judge companies’ OAs resemble, hidden tests, Editorials and a Solutions tab for every approach, weekly contests, and (Premium) company-tagged lists.',
    'Your main volume. Submit every problem you learn here there too. Use study plans or Grind 75 as the list, contests for speed, company tags at the end.'],
  ['NeetCode', 'https://neetcode.io', 'Free; Pro is paid',
    'The NeetCode 150 roadmap, ordered by pattern, and a clear video for every problem on it. The best explanations for visual learners.',
    'Watch a video after you’ve tried the problem, never before. Use the roadmap to see which patterns build on which.'],
  ['Tech Interview Handbook', 'https://www.techinterviewhandbook.org', 'Free',
    'Grind 75, a problem schedule you size to your weeks and hours. One cheatsheet per topic with corner cases. The best free guides to behavioural interviews, resumes and negotiating offers.',
    'Generate a Grind 75 schedule for your timeline. Read a topic’s cheatsheet before its course here. Read the behavioural and resume guides before you apply.'],
  ['USACO Guide', 'https://usaco.guide', 'Free',
    'A deep, free algorithms curriculum from Bronze to Platinum, with clear modules and graded problem sets. Better than anything else at making a hard topic click.',
    'When a topic doesn’t click (prefix sums, binary search on the answer, union-find, Dijkstra, DP), read its Silver or Gold module. Interviews rarely need Platinum.'],
  ['AlgoMonster / Grokking', 'https://algo.monster', 'Paid',
    'Pattern-first text courses. AlgoMonster’s “which pattern?” flowchart is a good mental model.',
    'Optional. The Study tab here covers the same ground for free; these suit you if you want another author’s explanation of a pattern.'],
  ['interviewing.io and Pramp', 'https://interviewing.io', 'Pramp free; interviewing.io paid',
    'Practice with a real person: Pramp pairs you with peers, interviewing.io with engineers from big companies. interviewing.io also publishes recordings of real mocks.',
    'Watch a few recordings early to see what good looks like. Do human mocks in the last few weeks: nothing else trains the nerves.'],
  ['Contest sites', 'https://atcoder.jp', 'Free',
    'AtCoder Beginner Contests and Codeforces Div. 3/4 build speed and calm under a clock.',
    'Optional, after the patterns. A weekly LeetCode contest is usually enough for interviews.'],
];

ROUTES.guide = app => {
  const nP = C.problems.length, nT = C.twists.length, nPat = C.patterns.length;
  const link = ([label, href]) => href.startsWith('#') ? `<a href="${href}">${esc(label)}</a>` : `<a href="${href}" target="_blank" rel="noopener">${esc(label)} ↗</a>`;
  app.innerHTML = `<div class="guide">
    <div class="study-head"><h1>The grind guide</h1>
      <p class="lede">Everything you need to get good at coding interviews quickly: what to do each day, which outside resource is best for what,
        and where to look when you’re stuck. This app is one piece of it. The rest is below, with what each is best at.</p></div>

    <section><h2>The short version</h2><ol class="rules">${GUIDE_RULES.map(([b, t]) => `<li><b>${esc(b)}</b> ${esc(t)}</li>`).join('')}</ol></section>

    <section><h2>The plan</h2>
      <p class="muted small">For about 8 weeks at 60–90 minutes a day. With 4 weeks, halve each phase and do Grind 75’s shortest schedule; with less, see the Today plan’s urgent mode.</p>
      <ol class="phases">${GUIDE_PLAN.map(([w, t, here, out]) => `<li><div class="ph-when">${esc(w)}</div><div><h3>${esc(t)}</h3>
        <p><span class="ph-k">Here</span>${esc(here)}</p><p><span class="ph-k">Elsewhere</span>${esc(out)}</p></div></li>`).join('')}</ol></section>

    <section><h2>A day</h2>
      <table class="gtable"><tbody>${GUIDE_DAY.map(([t, w, d]) => `<tr><td class="mono nowrap">${esc(t)}</td><td><b>${esc(w)}</b><br><span class="muted">${esc(d)}</span></td></tr>`).join('')}</tbody></table>
      <div class="row" style="margin-top:12px"><a class="btn primary" href="#/today" data-key="t">Open today’s plan <kbd>T</kbd></a>
        <a class="btn" href="#/study" data-key="s">Study <kbd>S</kbd></a></div></section>

    <section><h2>When you’re stuck on a problem</h2>
      <table class="gtable"><tbody>${GUIDE_STUCK.map(([t, d]) => `<tr><td class="mono nowrap">${esc(t)}</td><td>${esc(d)}</td></tr>`).join('')}</tbody></table>
      <p class="muted small">The cold-solve page has these hints built in, in this order. Copying an answer you haven’t understood never counts as solving it.</p></section>

    <section><h2>Where to look</h2>
      <table class="gtable where"><tbody>${GUIDE_WHERE.map(([q, ls]) => `<tr><td>${esc(q)}</td><td>${ls.map(link).join(' · ')}</td></tr>`).join('')}</tbody></table></section>

    <section><h2>The resources, and what each is best at</h2>
      <div class="res-grid">${GUIDE_RES.map(([n, url, cost, best, how]) => `<article class="gres card">
        <div class="res-head"><h3><a href="${url}" target="_blank" rel="noopener">${esc(n)} ↗</a></h3><span class="tag">${esc(cost)}</span></div>
        <p>${esc(best)}</p><p class="muted"><b>How to use it:</b> ${esc(how)}</p></article>`).join('')}</div></section>

    <section><h2>What this app does, and what it leaves to the others</h2>
      <div class="two"><div><h3>Here</h3><ul>
        <li>${nPat} pattern courses that go from the idea to problems you solve cold, then a twist you haven’t seen.</li>
        <li>${nP} NeetCode 150 problems and ${nT} twists, run in your browser against real tests, including large hidden tests that fail correct but slow code.</li>
        <li>Short drills for each layer of a solution: spotting the pattern, structure, syntax, complexity, edge cases.</li>
        <li>Spaced repetition that brings each problem back just before you’d forget it, and swaps in a sibling problem so you review the pattern, not one answer.</li></ul></div>
      <div><h3>Elsewhere</h3><ul>
        <li>Volume and breadth: LeetCode has thousands of problems; ${nP + nT} is a core, not the whole field.</li>
        <li>Languages other than Python.</li>
        <li>Contests, company-tagged lists and real people: LeetCode, Pramp, interviewing.io.</li>
        <li>Behavioural interviews, resumes, offers and system design: the Tech Interview Handbook and the System Design Primer.</li></ul></div></div></section>
  </div>`;
};
