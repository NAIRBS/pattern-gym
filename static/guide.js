// The Starter Guide: one page that says what to do each day, which outside resource is best for what,
// and where to look when stuck. Loaded after app.js; uses its helpers (esc, md, ROUTES, C).
'use strict';

const GUIDE_RULES = [
  ['Learn patterns, not problems.', 'About 20 patterns cover almost every interview question. Once you can name the pattern, the problem is mostly translation.'],
  ['Attempt before you read.', 'Struggle with a problem cold for 25 to 40 minutes before any explanation. Reading first feels faster and teaches far less.'],
  ['Re-solve what you failed.', 'A problem you read the answer to isn’t learned until you write it from a blank editor a day or more later. The Today plan schedules this for you.'],
  ['Say the cost before you code.', 'Brute force and its Big-O first, then what work it repeats, then the tool that removes it. Interviewers grade that reasoning.'],
  ['Practise out loud, under a clock.', 'Knowing the answer and producing it in 30 minutes while talking are different skills. Train the second one too.'],
];

// [when, title, in this app, elsewhere, start week, end week]  (weeks 0-8; drawn as a timeline)
const GUIDE_PLAN = [
  ['Days 1–3', 'Python fluency',
    'Syntax Snap until Counter, defaultdict, heapq, deque, sort keys and slicing come without thinking. Set your interview date in Settings so the plan paces itself.',
    'The Python cheat sheet on the Study tab; LeetCode’s editor, to get used to its class-based signatures.', 0, 0.43],
  ['Weeks 1–4', 'Patterns',
    'One Study course every day or two, in the path order: the idea, the worked example, guided problems, solo problems cold, then the transfer check. Do the Today plan’s reviews every day.',
    'After each cold solve, submit the same problem on LeetCode (the link is on the problem). Watch the NeetCode video only after a real attempt.', 0.43, 4],
  ['Weeks 3–8', 'Volume',
    'Keep the daily reviews. OA Mode on problems the plan brings back.',
    'Grind 75 (or the NeetCode 150) on LeetCode with a timer: 25 min for Easy, 40 for Medium. Log each miss and re-solve it here later.', 2, 8],
  ['From week 4', 'Talking',
    'Mock Interview once a week: clarify, plan out loud, code, state complexity, test.',
    'Peer mocks on Pramp, paid mocks on interviewing.io, and its public recordings. Behavioural answers and your resume from the Tech Interview Handbook a week before you apply.', 3, 8],
  ['Weeks 6–8', 'Speed and pressure',
    'Mixed practice (names hidden) and OA Mode with the hidden large tests on.',
    'A LeetCode weekly contest every week. With Premium, the company-tagged lists for your target companies in the last two weeks.', 5, 8],
];

// [time, step, what, minutes (sizes the bar)]
const GUIDE_DAY = [
  ['10–20 min', 'Reviews', 'Today’s plan, top to bottom. Due items first; they’re what you’re about to forget.', 15],
  ['25–45 min', 'One new problem, cold', 'A Study cold solve, a mystery problem, or the next Grind 75 problem on LeetCode. Timer on.', 35],
  ['10–15 min', 'Close the loop', 'If you missed it: read the walkthrough or watch the video, close it, and write the solution from a blank editor.', 12],
  ['2 min', 'One line', 'Write down the signal you should have spotted (“sorted input + pair → two pointers”). That sentence is the thing you’re really learning.', 3],
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

// Who does what: 2 = yes, 1 = partly, 0 = no. Columns match GUIDE_CAPS.
const GUIDE_CAPS = ['Problems + judge', 'Explanations', 'Videos', 'Study path', 'Real people', 'Behavioural, resume', 'Contests'];
const GUIDE_MATRIX = {
  'Pattern Gym (here)':        ['Free', [2, 2, 0, 2, 0, 0, 0]],
  'LeetCode':                  ['Free / Premium', [2, 1, 0, 1, 0, 0, 2]],
  'NeetCode':                  ['Free / Pro', [1, 2, 2, 2, 0, 0, 0]],
  'Tech Interview Handbook':   ['Free', [0, 1, 0, 2, 0, 2, 0]],
  'USACO Guide':               ['Free', [1, 2, 1, 2, 0, 0, 1]],
  'AlgoMonster / Grokking':    ['Paid', [1, 2, 0, 2, 0, 0, 0]],
  'interviewing.io and Pramp': ['Paid / Free', [0, 0, 1, 0, 2, 1, 0]],
  'Contest sites':             ['Free', [2, 1, 0, 0, 0, 0, 2]],
};
const GUIDE_TABS = [['start', 'Start here'], ['plan', '8-week plan'], ['day', 'Daily routine'], ['stuck', 'When stuck'], ['where', 'Where to look'], ['resources', 'Resources']];

ROUTES.guide = (app, [tab]) => {
  if (!GUIDE_TABS.some(([id]) => id === tab)) tab = 'start';
  try { localStorage.setItem('pg-guide-seen', '1'); } catch (e) {}
  const nP = C.problems.length, nT = C.twists.length, nPat = C.patterns.length;
  const link = ([label, href]) => href.startsWith('#') ? `<a class="gchip in" href="${href}">${esc(label)}</a>`
    : `<a class="gchip" href="${href}" target="_blank" rel="noopener">${esc(label)} <span aria-hidden="true">↗</span></a>`;
  const mark = v => v === 2 ? '<span class="gm yes" role="img" aria-label="Yes">●</span>' : v === 1 ? '<span class="gm part" role="img" aria-label="Partly">◐</span>' : '<span class="gm no" role="img" aria-label="No">–</span>';
  const resUrl = n => (GUIDE_RES.find(r => r[0] === n) || [])[1];
  const body = {
    start: () => `
      <section><h2>Your first three steps</h2>
        <ol class="gsteps">
          <li><a class="card" href="#/settings"><span class="gn">1</span><b>Set your interview date</b><span class="muted">The daily plan paces itself to it. No date is fine too.</span><span class="go">Settings →</span></a></li>
          <li><a class="card" href="#/play/syntax"><span class="gn">2</span><b>Warm up your Python</b><span class="muted">A few rounds of Syntax Snap: Counter, heapq, deque, slicing.</span><span class="go">Syntax Snap →</span></a></li>
          <li><a class="card" href="#/study"><span class="gn">3</span><b>Start the first course</b><span class="muted">Then come back to Today every day for your plan and reviews.</span><span class="go">Study →</span></a></li>
        </ol></section>
      <section><h2>Five rules</h2>
        <ol class="grules">${GUIDE_RULES.map(([b, t], i) => `<li><span class="gn">${i + 1}</span><div><b>${esc(b)}</b><p class="muted">${esc(t)}</p></div></li>`).join('')}</ol></section>
      <section><h2>What this app covers</h2>
        <div class="gtwo">
          <div class="card"><h3>Here</h3><ul>
            <li>${nPat} pattern courses, from the idea to problems you solve cold, then a twist you haven’t seen.</li>
            <li>${nP} NeetCode 150 problems and ${nT} twists, with real tests and large hidden tests.</li>
            <li>Short drills for each layer: spotting the pattern, structure, syntax, complexity, edge cases.</li>
            <li>Spaced reviews that bring each pattern back just before you’d forget it.</li></ul></div>
          <div class="card"><h3>Elsewhere</h3><ul>
            <li>Volume: LeetCode has thousands of problems; ${nP + nT} is a core.</li>
            <li>Languages other than Python.</li>
            <li>Contests, company-tagged lists and practice with real people.</li>
            <li>Behavioural interviews, resumes, offers, system design.</li></ul>
            <a href="#/guide/resources">See which resource does what →</a></div>
        </div></section>`,
    plan: () => `
      <section><p class="muted">About 8 weeks at 60–90 minutes a day. Phases overlap on purpose. With 4 weeks, halve each phase; with less, the Today plan switches to urgent mode.</p>
        <div class="gantt" role="img" aria-label="Timeline: Python fluency days 1 to 3, patterns weeks 1 to 4, volume weeks 3 to 8, talking from week 4, speed and pressure weeks 6 to 8">
          <div class="gantt-row gantt-head"><span></span><div class="gantt-track">${Array.from({ length: 8 }, (_, w) => `<span>W${w + 1}</span>`).join('')}</div></div>
          ${GUIDE_PLAN.map(([w, t, , , a, b], i) => `<div class="gantt-row"><span class="gantt-label">${esc(t)}</span><div class="gantt-track">
            <i class="gantt-bar c${i}${b - a < 1 ? ' narrow' : ''}" style="left:${a / 8 * 100}%;width:${(b - a) / 8 * 100}%"><span>${esc(w)}</span></i></div></div>`).join('')}
        </div></section>
      <section><table class="gtbl"><thead><tr><th>Phase</th><th>In Pattern Gym</th><th>Elsewhere</th></tr></thead><tbody>
        ${GUIDE_PLAN.map(([w, t, here, out], i) => `<tr><td data-label="Phase"><span class="gdot c${i}"></span><b>${esc(t)}</b><div class="muted small mono">${esc(w)}</div></td>
          <td data-label="In Pattern Gym">${esc(here)}</td><td data-label="Elsewhere">${esc(out)}</td></tr>`).join('')}
      </tbody></table></section>`,
    day: () => `
      <section><p class="muted">60–90 minutes, in this order: reviews first, because they protect what you already know.</p>
        <div class="daybar" aria-hidden="true">${GUIDE_DAY.map(([t, w, , m], i) => `<span class="c${i}" style="flex:${m}"><b>${esc(w)}</b><i>${esc(t)}</i></span>`).join('')}</div>
        <ol class="gday">${GUIDE_DAY.map(([t, w, d], i) => `<li class="card"><span class="gn c${i}">${i + 1}</span><div><div class="gday-h"><b>${esc(w)}</b><span class="mono small muted">${esc(t)}</span></div><p class="muted">${esc(d)}</p></div></li>`).join('')}</ol>
        <div class="row" style="margin-top:16px"><a class="btn primary" href="#/today" data-key="t">Open today’s plan <kbd>T</kbd></a>
          <a class="btn" href="#/study" data-key="s">Study <kbd>S</kbd></a></div></section>`,
    stuck: () => `
      <section><p class="muted">A clock for one problem. Move to the next step only when its time is up.</p>
        <ol class="gladder">${GUIDE_STUCK.map(([t, d], i) => `<li><span class="gladder-t mono">${esc(t)}</span><span class="gladder-dot c${i}"></span><p>${esc(d)}</p></li>`).join('')}</ol>
        <p class="muted small">The cold-solve page has these hints built in, in this order. Copying an answer you haven’t understood never counts as solving it.</p></section>`,
    where: () => `
      <section><table class="gtbl where"><thead><tr><th>If…</th><th>Go to</th></tr></thead><tbody>
        ${GUIDE_WHERE.map(([q, ls]) => `<tr><td data-label="If…"><b>${esc(q)}</b></td><td data-label="Go to"><div class="gchips">${ls.map(link).join('')}</div></td></tr>`).join('')}
      </tbody></table>
      <p class="muted small" style="margin-top:12px"><span class="gchip in" aria-hidden="true">Green</span> links stay in this app; the others open LeetCode, NeetCode and so on in a new tab.</p></section>`,
    resources: () => `
      <section><h2>Who does what</h2>
        <div class="gscroll"><table class="gmatrix"><thead><tr><th>Resource</th><th>Cost</th>${GUIDE_CAPS.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>
          ${Object.entries(GUIDE_MATRIX).map(([n, [cost, v]]) => `<tr class="${n.startsWith('Pattern Gym') ? 'self' : ''}"><th scope="row">${resUrl(n) ? `<a href="${resUrl(n)}" target="_blank" rel="noopener">${esc(n)} ↗</a>` : esc(n)}</th>
            <td class="small">${esc(cost)}</td>${v.map(x => `<td>${mark(x)}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div>
        <p class="muted small">${mark(2)} yes · ${mark(1)} partly · ${mark(0)} no</p></section>
      <section><h2>How to use each</h2>
        <table class="gtbl"><thead><tr><th>Resource</th><th>Best at</th><th>How to use it</th></tr></thead><tbody>
          ${GUIDE_RES.map(([n, url, cost, best, how]) => `<tr><td data-label="Resource"><a href="${url}" target="_blank" rel="noopener"><b>${esc(n)}</b> ↗</a><div class="muted small">${esc(cost)}</div></td>
            <td data-label="Best at">${esc(best)}</td><td data-label="How to use it">${esc(how)}</td></tr>`).join('')}
        </tbody></table></section>`,
  };
  app.innerHTML = `<div class="guide">
    <div class="study-head"><h1>Starter Guide</h1>
      <p class="lede">Everything you need to get good at coding interviews quickly: what to do each day, where to look when you’re stuck,
        and which outside resource is best for what.</p></div>
    <div class="gtabs" role="tablist" aria-label="Guide sections">${GUIDE_TABS.map(([id, label], i) =>
      `<a role="tab" href="#/guide/${id}" aria-selected="${id === tab}" tabindex="${id === tab ? 0 : -1}" class="${id === tab ? 'on' : ''}"
        data-key="${i + 1}" data-kgroup="switch section">${esc(label)} <kbd>${i + 1}</kbd></a>`).join('')}</div>
    <div role="tabpanel" aria-label="${esc(GUIDE_TABS.find(([id]) => id === tab)[1])}" class="gpanel">${body[tab]()}</div>
  </div>`;
  const tabs = $$('.gtabs [role=tab]', app);
  $('.gtabs', app).addEventListener('keydown', e => {
    const k = tabs.indexOf(document.activeElement); if (k < 0) return;
    const j = e.key === 'ArrowRight' ? k + 1 : e.key === 'ArrowLeft' ? k - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
    if (j === null) return; e.preventDefault(); e.stopPropagation(); tabs[(j + tabs.length) % tabs.length].focus();
  });
};
