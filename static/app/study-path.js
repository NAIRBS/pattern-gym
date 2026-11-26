/* Pattern Gym · study-path.js: Study: the course model, what comes next, crunch mode, checkpoints, mixed practice.
   Plain script (no modules): shares one global scope with the other files in index.html's order. */
'use strict';

// ─────────────────────────── STUDY ───────────────────────────
// Attempt-first course per pattern: the idea → one worked example (brute force → final answer) →
// guided problems → solo problems solved cold before any explanation. Mixed practice then hides the
// title and pattern, the closest thing here to a question you have never seen.
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const studyOrder = () => STUDY_ORDER.map(PAT).filter(p => p.lesson);
const lessonDone = id => !!S.study.lessons[id];
const walked = id => !!S.study.walks[id];
const attempted = id => !!S.study.attempts[id];
const walksDone = pid => C.problems.filter(p => p.pattern === pid && walked(p.id)).length;
const nextLesson = () => studyOrder().find(p => !lessonDone(p.id));
const sortedProblems = pid => C.problems.filter(p => p.pattern === pid).sort((a, b) => DIFF[a.diff] - DIFF[b.diff] || a.num - b.num);
const firstSentence = s => (String(s).match(/^.*?[.!?](\s|$)/) || [s])[0].trim();

// The approach for any problem. Walkthroughs follow it; the cold-solve coach asks it in order.
const APPROACH = [
  { t: 'Understand it', d: 'Say what goes in and what comes out. Ask about empty input, duplicates, negatives, size.' },
  { t: 'Solve a tiny example by hand', d: 'Whatever your hands did, step by step, is your first algorithm.' },
  { t: 'Brute force', d: 'The most obvious correct way, ignoring speed. Say its cost out loud.' },
  { t: 'Find the repeated work', d: 'What does the brute force recompute or rescan, over and over?' },
  { t: 'Pick the tool that removes it', d: 'Remember what you saw: hash map. Sorted: two pointers or binary search. A contiguous range: sliding window. Overlapping subproblems: DP. Every choice: backtracking.' },
  { t: 'Plan in plain words', d: 'What you keep, what each step does to it, when you stop, what you return.' },
  { t: 'Code it from the plan', d: 'Translate the plan line by line. Don’t improvise new logic while typing.' },
  { t: 'Test it', d: 'Run the example by hand through your code, then the edge cases. State time and space.' },
];

// The five jobs a line of a template can do. Labelling lines by job is stable across people;
// the exact line order is not, which is why the lesson no longer asks you to guess the next line.
const ROLES = [
  { id: 'setup', name: 'Setup', q: 'the signature or a helper' },
  { id: 'state', name: 'State', q: 'what you keep track of' },
  { id: 'loop', name: 'Loop', q: 'how you walk the input' },
  { id: 'decide', name: 'Decide', q: 'the condition that changes what happens' },
  { id: 'update', name: 'Update', q: 'how the state changes each step' },
  { id: 'answer', name: 'Answer', q: 'what you return or record' },
];
function lineRole(code, afterLoop) {
  const t = code.trim();
  if (/^(return|yield)\b/.test(t) || /^(res|ans|best|result)\b.*(append|=)/.test(t) && afterLoop && /append\(|max\(|min\(/.test(t)) return 'answer';
  if (/^(def|class)\b/.test(t)) return 'setup';
  if (/^(for|while)\b/.test(t)) return 'loop';
  if (/^(if|elif|else)\b/.test(t)) return 'decide';
  return afterLoop ? 'update' : 'state';
}

function courseOf(pid) {
  const order = PAT(pid).course?.order;   // worked example first, then gentle to hard (content/study_patterns.py COURSES)
  const all = order ? order.map(PROB).filter(Boolean) : sortedProblems(pid);
  const nG = all.length >= 5 ? 2 : all.length >= 2 ? 1 : 0;
  return { all, learn: all[0], guided: all.slice(1, 1 + nG), solo: all.slice(1 + nG), transfer: C.twists.find(t => t.pattern === pid) };
}
function roleOf(p) { if (p.twist_of) return 'transfer'; const c = courseOf(p.pattern); return p.id === c.learn?.id ? 'learn' : c.guided.some(x => x.id === p.id) ? 'guided' : 'solo'; }
function courseProgress(pid) {
  const c = courseOf(pid);
  const stages = [
    { name: 'The idea', done: lessonDone(pid) ? 1 : 0, of: 1 },
    { name: 'Worked example', done: c.learn && walked(c.learn.id) ? 1 : 0, of: c.learn ? 1 : 0 },
    { name: 'Guided', done: c.guided.filter(x => walked(x.id)).length, of: c.guided.length },
    { name: 'Solo, cold', done: c.solo.filter(x => attempted(x.id)).length, of: c.solo.length },
    { name: 'Transfer check', done: c.transfer && attempted(c.transfer.id) ? 1 : 0, of: c.transfer ? 1 : 0 },
  ].filter(s => s.of);
  return { c, stages, complete: stages.every(s => s.done >= s.of) };
}
// How long each course stage takes: reading time of what it shows, plus time to think or code.
function lessonMin(pid) {
  const p = PAT(pid), L = p.lesson; if (!L) return 0;
  return readMin(`<p>${esc([L.why, L.primer?.text || '', ...p.triggers, ...L.not_this, ...p.fill, ...L.bugs, ...L.build.map(b => b[1])].join(' '))}</p><pre>${esc(L.build.map(b => b[0]).join('\n'))}</pre>`)
    + L.build.length * 0.5 + 1;   // plus ~30 s to work out each skeleton line's job, and a minute to recap
}
function walkMin(p) {   // read every step, plus about 45 seconds to answer each one (8, or 9 with "Another way?") yourself first
  const L = PAT(p.pattern).lesson || {}, alts = p.also || [];
  return readMin(`<p>${esc([p.statement, ...p.clarify, ...p.edges, p.brute, L.why, p.insight, ...p.plan, p.catch, ...alts.flatMap(a => [a.name, a.how, a.when])].join(' '))}</p><pre>${esc([p.brute_code || '', p.solution].join('\n'))}</pre>`)
    + (alts.length ? 9 : 8) * 0.75;
}
const guidedMin = p => readMin(`<p>${esc(p.statement)}</p>`) + 2 + gameMin('fill');   // two picks, then the key lines
function courseMins(pid) {
  const { c } = courseProgress(pid);
  const parts = [[lessonMin(pid), lessonDone(pid)], ...(c.learn ? [[walkMin(c.learn), walked(c.learn.id)]] : []),
    ...c.guided.map(x => [guidedMin(x), walked(x.id)]), ...c.solo.map(x => [solveMin(x), attempted(x.id)]),
    ...(c.transfer ? [[solveMin(c.transfer), attempted(c.transfer.id)]] : [])];
  return { total: parts.reduce((a, [m]) => a + m, 0), left: parts.reduce((a, [m, d]) => a + (d ? 0 : m), 0) };
}
// The next thing to study anywhere on the path. Before any lesson, that's the Big-O primer.
function nextStudy() {
  if (!lessonDone('bigo') && !studyOrder().some(p => lessonDone(p.id)))
    return { label: 'Big-O basics: what your code costs, and how to say it', href: '#/study/bigo', verb: 'Start with Big-O', min: bigoMin(), primer: true };
  const cr = crunch(), cid = cr?.list.find(id => crunchStep(id));
  if (cid) return { ...crunchStep(cid), pattern: PAT(cid), crunch: true };
  const cur = studyOrder().find(p => nextStep(p.id));
  return cur ? { ...nextStep(cur.id), pattern: cur } : null;
}
// Crunch mode (rules in srs.js): when the days left can't cover what's left of the path, study only the
// most-asked patterns: the lesson, then the worked example's problem solved cold. Today explains it and can turn it off.
const crunchCovered = pid => lessonDone(pid) && courseOf(pid).all.some(x => attempted(x.id));
function crunch(ignoreSetting = false) {
  if (!C || (!ignoreSetting && S.settings.crunch === 'off')) return null;
  const n = daysLeft(); if (n === null || n < 0) return null;
  const order = studyOrder(), done = order.filter(p => crunchCovered(p.id)).map(p => p.id);
  const pathLeft = order.reduce((a, p) => a + courseMins(p.id).left, 0);
  const costs = Object.fromEntries(order.filter(p => !done.includes(p.id)).map(p => [p.id, lessonMin(p.id) + solveMin(courseOf(p.id).learn)]));
  return SRS.crunch({ daysLeft: n, minutes: S.settings.minutes, pathLeft, costs, done });
}
function crunchStep(pid) {
  const p = PAT(pid), x = courseOf(pid).learn;
  if (!lessonDone(pid)) return { label: `Learn the idea behind ${p.name}`, href: `#/study/${pid}`, verb: 'Start the lesson', min: lessonMin(pid) };
  if (x && !crunchCovered(pid)) return { label: `Solve ${x.title} cold, then read its walkthrough`, href: `#/study/solve/${x.id}`, verb: 'Solve it cold', min: solveMin(x) };
  return null;
}
// Checkpoints: after every 2 lessons, one mystery problem (names hidden) from everything learned so far.
// Done when a mystery problem is attempted; recorded in S.study.lessons as 'checkpoint:<k>' so sync merges it.
const CHECK_EVERY = 2;
function checkpointDue() {
  const n = studyOrder().filter(p => lessonDone(p.id)).length, k = Math.floor(n / CHECK_EVERY);
  return k >= 1 && !S.study.lessons['checkpoint:' + k] ? { k, n } : null;
}
function nextStep(pid) {
  const { c } = courseProgress(pid); const p = PAT(pid);
  if (!lessonDone(pid)) return { label: `Learn the idea behind ${p.name}`, href: `#/study/${pid}`, verb: 'Start the lesson', min: lessonMin(pid) };
  if (c.learn && !walked(c.learn.id)) return { label: `Worked example: ${c.learn.title}, from brute force to the final answer`, href: `#/study/${pid}/${c.learn.id}`, verb: 'Open the walkthrough', min: walkMin(c.learn) };
  const g = c.guided.find(x => !walked(x.id)); if (g) return { label: `Guided problem: ${g.title}`, href: `#/study/guided/${g.id}`, verb: 'Work through it', min: guidedMin(g) };
  const s = c.solo.find(x => !attempted(x.id)); if (s) return { label: `Solve ${s.title} cold, before any explanation`, href: `#/study/solve/${s.id}`, verb: 'Solve it cold', min: solveMin(s) };
  if (c.transfer && !attempted(c.transfer.id)) return { label: `Transfer check: ${c.transfer.title}, a twist you haven’t seen anywhere in the app`, href: `#/study/solve/${c.transfer.id}`, verb: 'Take the transfer check', min: solveMin(c.transfer) };
  return null;
}
// Mixed practice: twist, guided and solo problems from patterns you've studied (worked examples are already spoiled).
// It opens at two lessons: with one pattern there is nothing to tell apart.
// Combined problems (content/combos.py): need two patterns, open once both lessons are done. Today offers one a week.
const comboPool = () => C.problems.filter(p => p.combo && lessonDone(p.pattern) && lessonDone(p.combo.with));
const comboDue = () => { const pool = comboPool(); if (!pool.length) return false;
  const last = C.problems.filter(p => p.combo).map(p => S.study.attempts[p.id]).filter(Boolean).sort().pop();
  return !last || daysBetween(last, today()) >= 7; };
const mixedPool = () => { const st = studyOrder().filter(p => lessonDone(p.id)); return st.length < 2 ? [] : st.flatMap(p => { const c = courseOf(p.id); return [...(c.transfer ? [c.transfer] : []), ...c.guided, ...c.solo]; }); };

// Rough size of a complexity, for the shrinking meter in the walkthrough.
function bigORank(s) {
  s = String(s).replace(/\s/g, '');
  if (/2\^|!|k\^n|\^n|expon/i.test(s)) return 7;
  if (/n³|n\^3|²·?[a-zA-Z]/.test(s)) return 6;   // n³, or a squared term times another variable (m²·n², V²·E)
  if (/n²|n\^2|n\*m|m\*n|n·m|m·n|nm\)|mn\)|n\*k|k\*n|n·k|k·n|n·q|q·n|V\*E|E\*V|V·E|E·V/i.test(s)) return 5;
  if (/nlog|log\*n|n\*log|klog|Elog/i.test(s)) return 4;
  if (/^O\(1\)/.test(s)) return 1;
  if (/^O\(log/i.test(s)) return 2;
  return 3;
}
// First O(...) in a sentence, brackets balanced, so O(log(min(m, n))) and O(2^(m+n)) come out whole.
function firstBigO(s) {
  s = String(s);
  const i = s.indexOf('O(');
  if (i < 0) return '';
  for (let j = i + 2, depth = 1; j < s.length; j++) {
    if (s[j] === '(') depth++;
    else if (s[j] === ')' && --depth === 0) return s.slice(i, j + 1);
  }
  return '';
}

function exampleHtml(p) {
  const t = p.tests;
  if (t.kind === 'design') {
    const c = t.cases[0];
    return `<div class="ex">${c.ops.map((op, i) => `${op}(${c.args[i].map(a => JSON.stringify(a)).join(', ')})${c.expected[i] === null ? '' : ' → ' + JSON.stringify(c.expected[i])}`).join('\n')}</div>`;
  }
  return t.cases.slice(0, 2).map(c => {
    let out = JSON.stringify(c.expected);
    if (t.harness && typeof c.expected === 'string' && /^[A-Z]+$/.test(c.expected)) out = c.expected === 'VALID' ? 'any valid answer' : 'impossible → empty';
    else if (t.harness && p.id === 'longest_palindrome') out = `a palindrome of length ${c.expected}`;
    return `<div class="ex">${esc(t.fn)}(${c.args.map(a => esc(JSON.stringify(a))).join(', ')})\n  → ${esc(out)}</div>`;
  }).join('');
}
function codeWithKeys(p) {
  const key = new Set(p.key_lines);
  return `<pre class="code" data-keys="${[...key].join(',')}">${esc(p.solution)}</pre>`;
}
function drillButtons(pid) {
  return `<div class="row">
    <a class="btn" href="#/play/sprint?pattern=${pid}&n=8" data-key="1" data-kgroup="start a drill">⚡ Spot it${etaIn(roundMin('sprint', 8))} <kbd>1</kbd></a>
    <a class="btn" href="#/play/skeleton?problem=${pid}" data-key="2" data-kgroup="start a drill">🦴 Recall the skeleton${etaIn(gameMin('skeleton'))} <kbd>2</kbd></a>
    <a class="btn" href="#/play/lineup?pattern=${pid}&n=3" data-key="3" data-kgroup="start a drill">🧩 Line Up ×3${etaIn(roundMin('lineup', 3))} <kbd>3</kbd></a>
    <a class="btn" href="#/play/fill?pattern=${pid}&n=3" data-key="4" data-kgroup="start a drill">✍️ Fill the Gap ×3${etaIn(roundMin('fill', 3))} <kbd>4</kbd></a></div>`;
}
// Which of the pattern's trigger words appear in this problem's statement (the "cues").
function cuesIn(p) {
  const st = p.statement.toLowerCase();
  const words = new Set(PAT(p.pattern).triggers.join(' ').toLowerCase().match(/[a-z]{4,}/g) || []);
  ['with', 'that', 'need', 'from', 'each', 'have', 'before', 'what', 'when', 'into', 'than', 'only', 'some', 'like'].forEach(w => words.delete(w));
  return [...words].filter(w => st.includes(w)).slice(0, 6);
}
