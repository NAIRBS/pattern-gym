/* Pattern Gym · shared.js: Pieces the games and Study share: the problem panel, results, grading, CoderPad mode.
   Plain script (no modules): shares one global scope with the other files in index.html's order. */
'use strict';

// ─────────────────────────── shared game pieces ───────────────────────────
// Pattern colours are tuned for the dark theme; in light mode they are mixed toward the text colour so they stay readable.
const pc = c => `color-mix(in srgb, ${c} var(--pc-mix), var(--text))`;
const PAT = id => C.patterns.find(p => p.id === id) || { name: id, color: '#888' };
const PROB = id => C.everyProblem.find(p => p.id === id);
// Out-links. LeetCode slugs were checked against LeetCode's API; the video link is a YouTube search,
// which stays right even if a video moves. { video: false } leaves the explanation out (cold solves).
// ── Problem description, laid out like LeetCode's: statement, numbered examples (as Python), constraints ──
// The statement and examples are this app's own; the official page (full limits, follow-ups) is one click away.
function pyLit(v) {
  if (v === null || v === undefined) return 'None';
  if (v === true) return 'True'; if (v === false) return 'False';
  if (Array.isArray(v)) return '[' + v.map(pyLit).join(', ') + ']';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'object') return '{' + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ': ' + pyLit(x)).join(', ') + '}';
  return String(v);
}
function pyType(vals, special) {
  if (special === 'tree') return 'Optional[TreeNode]';
  if (special && special.startsWith('linked')) return special === 'linked_many' ? 'list[Optional[ListNode]]' : 'Optional[ListNode]';
  const one = v => {
    if (v === null) return 'None'; if (typeof v === 'boolean') return 'bool';
    if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float';
    if (typeof v === 'string') return 'str';
    if (Array.isArray(v)) { const xs = v.filter(x => x !== null); return `list[${xs.length ? one(xs.sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length)[0]) : 'int'}]`; }
    return 'dict';
  };
  const ts = [...new Set(vals.map(one))].filter(t => t !== 'None');
  const best = ts.sort((a, b) => b.length - a.length)[0] || 'None';
  return vals.some(v => v === null) && best !== 'None' ? `Optional[${best}]` : best;
}
function paramNames(p) {
  const m = /def\s+\w+\(([^)]*)\)/.exec(p.starter || '');
  return m ? m[1].split(',').map(s => s.split(/[:=]/)[0].trim()).filter(s => s && s !== 'self') : [];
}
function exampleOut(p, c) {
  const t = p.tests;
  if (t.harness && typeof c.expected === 'string' && /^[A-Z]+$/.test(c.expected)) return c.expected === 'VALID' ? 'any valid order' : 'no valid answer (return an empty result)';
  if (t.harness && p.id === 'longest_palindrome') return `a palindrome of length ${c.expected}`;
  return pyLit(c.expected);
}
function problemPanel(p, { title = true, mystery = false } = {}) {
  const t = p.tests, names = paramNames(p);
  const code = s => `<code>${esc(s)}</code>`;
  // parameter names in the statement get code formatting, as on LeetCode
  let stmt = esc(p.statement);
  for (const n of names) stmt = stmt.replace(new RegExp(`(^|[\\s(,“"'])(${n})(?=[\\s.,;:)?!”"']|$)`, 'g'), '$1<code>$2</code>');
  let sig = '', examples = [];
  if (t.kind === 'design') {
    const ops = [...new Set(t.cases.flatMap(c => c.ops.slice(1)))];
    sig = `class ${t.cls}:  ${ops.map(o => o + '()').join(' · ')}`;
    examples = t.cases.slice(0, 2).map(c => ({
      input: [pyLit(c.ops), pyLit(c.args)], output: pyLit(c.expected) }));
  } else {
    const types = names.map((n, i) => pyType(t.cases.map(c => c.args[i]), t.arg_types?.[i]));
    const inp = Number.isInteger(t.inplace) ? t.inplace : -1;   // modified in place: returns None, the argument is checked
    const ret = inp >= 0 ? 'None' : pyType(t.cases.map(c => c.expected), t.ret_type);
    sig = `def ${t.fn}(${names.map((n, i) => `${n}: ${types[i]}`).join(', ')})${t.harness ? '' : ' -> ' + ret}`;
    const small = t.cases.filter(c => JSON.stringify(c.args).length < 260);
    examples = (small.length ? small : [...t.cases].sort((a, b) => JSON.stringify(a.args).length - JSON.stringify(b.args).length)).slice(0, small.length ? 3 : 1).map(c => ({
      input: c.args.map((a, i) => `${names[i] || 'arg' + (i + 1)} = ${pyLit(a)}`),
      output: inp >= 0 ? `${names[inp]} becomes ${pyLit(c.expected)}` : exampleOut(p, c) }));
  }
  const lc = !mystery && p.lc;
  const lcLink = lc ? `<a class="lc-link" href="https://leetcode.com/problems/${p.lc.slug}/" target="_blank" rel="noopener"
      title="${p.twist_of ? 'The closest problem on LeetCode' : 'The official problem on LeetCode'}${p.lc.paid ? ' (Premium)' : ''}">${p.twist_of ? 'Similar: ' : ''}LeetCode ${p.lc.num}. ${esc(p.lc.title)}${p.lc.paid ? ' 🔒' : ''} ↗</a>` : '';
  const cons = [
    `Signature: ${code(sig)}`,
    t.perf ? `A hidden test runs at <b>${esc(t.perf.size)}</b>. Correct code that is too slow fails it, as on LeetCode.`
      : 'Inputs here are small; only correctness is checked.',
    ...(t.arg_types || []).includes('tree') ? ['Trees are written level by level, with <code>None</code> for a missing child.'] : [],
    ...(t.arg_types || []).some(a => a && a.startsWith('linked')) ? ['Linked lists are written as the list of their values.'] : [],
    lc ? `Exact limits and follow-ups are on the ${p.twist_of ? 'closest' : 'official'} problem: ${lcLink}` : '',
  ].filter(Boolean);
  return `<article class="pdesc">
    ${title ? `<header class="pdesc-head"><h2>${mystery ? '🎲 Mystery problem' : esc(p.title)}</h2>
      <div class="pdesc-meta"><span class="tag ${p.diff}">${p.diff}</span>${p.twist_of && !mystery ? '<span class="tag twist">twist</span>' : ''}
      ${lcLink}</div></header>` : lcLink ? `<div class="pdesc-meta">${lcLink}</div>` : ''}
    <p class="statement">${stmt}</p>
    ${examples.map((e, i) => `<h3 class="pdesc-h">Example ${i + 1}</h3><div class="pex">
      <div><span class="pex-k">Input</span><code>${e.input.map(esc).join('<br>')}</code></div>
      <div><span class="pex-k">Output</span><code>${esc(e.output)}</code></div></div>`).join('')}
    <h3 class="pdesc-h">Constraints</h3><ul class="pcons">${cons.map(c => `<li>${c}</li>`).join('')}</ul>
    ${p.clarify?.length ? `<details class="pmore"><summary>Questions to ask the interviewer</summary><ul>${p.clarify.map(q => `<li>${esc(q)}</li>`).join('')}</ul></details>` : ''}
  </article>`;
}
// LeetCode chip for a problem row (problem lists, course rows, pattern tables). LeetCode's number is the only
// number the app shows: it's the one people search for.
const lcChip = p => p?.lc ? `<a class="ext pext" href="https://leetcode.com/problems/${p.lc.slug}/" target="_blank" rel="noopener"
  title="${p.twist_of ? 'Closest LeetCode problem' : 'Open on LeetCode'}${p.lc.paid ? ' (Premium)' : ''}" aria-label="LeetCode ${p.lc.num}: ${esc(p.lc.title)}">LC ${p.lc.num}${p.lc.paid ? ' 🔒' : ''} ↗</a>` : '';

function extLinks(p, { video = true } = {}) {
  const out = [];
  if (p.lc) out.push(`<a class="ext" href="https://leetcode.com/problems/${p.lc.slug}/" target="_blank" rel="noopener"
    title="${p.twist_of ? 'The closest problem on LeetCode' : 'This problem on LeetCode'}${p.lc.paid ? ' (LeetCode Premium)' : ''}">${p.twist_of ? 'Similar: ' : ''}LeetCode ${p.lc.num}${p.lc.paid ? ' 🔒' : ''} ↗</a>`);
  if (video && p.lc && !p.twist_of) out.push(`<a class="ext" href="https://www.youtube.com/results?search_query=${encodeURIComponent('neetcode ' + p.lc.title)}"
    target="_blank" rel="noopener" title="NeetCode's video explanation (YouTube search)">NeetCode video ↗</a>`);
  return out.length ? `<span class="exts">${out.join('')}</span>` : '';
}
function patternTag(id) { const p = PAT(id); return `<span class="tag" style="color:${pc(p.color)}">${esc(p.name)}</span>`; }
function resultsHtml(r) {
  if (!r) return '';
  let h = '';
  if (r.error) h += `<div class="err">${esc(r.error)}</div>`;
  for (const x of r.results || []) {
    // hidden tests are too big to print: just say what went wrong
    const detail = x.hidden ? (x.error ? '\n   ' + esc(x.error) : '')
      : `${x.expected != null ? `\n   expected ${esc(x.expected)}` : ''}${x.got != null ? `\n   got      ${esc(x.got)}` : ''}${x.error ? '\n   ' + esc(x.error) : ''}`;
    h += `<div class="res ${x.pass ? '' : 'fail'}">${x.pass ? '✓' : '✗'} ${esc(x.input || '')}${x.pass ? '' : detail}</div>`;
  }
  const hidden = (r.results || []).filter(x => x.hidden).length, shown = (r.results || []).length - hidden;
  if (r.ok) h = `<div class="res">✓ All ${shown} example${shown === 1 ? '' : 's'} passed${hidden ? ` and ${hidden} large hidden test${hidden === 1 ? '' : 's'} (fast enough)` : ''}${r.ms != null ? ` · ${r.ms} ms` : ''}${hidden && r.perf_ms != null ? `, hidden tests ${Math.round(r.perf_ms)} ms` : ''}</div>`;
  if (r.stdout) h += `<div class="py-io printed"><span class="muted small">What your code printed</span><pre class="py-out">${esc(r.stdout.replace(/\n$/, ''))}</pre></div>`;
  return `<div class="results">${h}</div>`;
}
// ── CoderPad mode ──
// 'leetcode': starter code, imports and ListNode/TreeNode given (the default).
// 'fn': blank page, function style. Nothing is predefined; the tests still call your function.
// 'prog': blank page, program style. Read stdin, print the answer; checked like a HackerRank OA.
const PAD_MODES = [['leetcode', 'LeetCode (starter given)'], ['fn', 'Blank page: function'], ['prog', 'Blank page: program (stdin)']];
const padMode = p => { const m = S.settings.pad || 'leetcode'; return m === 'prog' && !p.stdio ? 'fn' : m; };
function padBar(p, id = 'pad') {
  const cur = padMode(p);
  return `<label class="pad-bar"><span class="muted small">Editor</span><select id="${id}" aria-label="Editor mode">${PAD_MODES.map(([v, l]) =>
    `<option value="${v}" ${v === cur ? 'selected' : ''} ${v === 'prog' && !p.stdio ? 'disabled' : ''}>${esc(l)}${v === 'prog' && !p.stdio ? ' (not for this problem)' : ''}</option>`).join('')}</select></label>`;
}
function padStarter(p, mode) {
  if (mode === 'fn') return `# Blank page: nothing is imported or defined for you.\n# Write the imports, any helper class (ListNode, TreeNode), def ${p.tests.fn || p.tests.cls}(...), and tests that print.\n\n`;
  if (mode === 'prog') return `# Blank page, program style: read the input from stdin and print the answer.\n# The input and output format is under the problem statement.\n\n`;
  return p.starter;
}
// The input/output format for program style, with the first test as a sample.
function padFormat(p) {
  const s = p.stdio; if (!s) return '';
  const c = s.cases[0];
  return `<section class="pad-format"><h3 class="pdesc-h">Input (stdin)</h3><ol>${s.input.map(x => `<li>${pyMdLite(x)}</li>`).join('')}</ol>
    <h3 class="pdesc-h">Output (stdout)</h3><p>${pyMdLite(s.output)}.</p>
    <div class="pad-sample"><div><span class="pex-k">Sample input</span><pre class="py-out">${esc(c.stdin.replace(/\n$/, ''))}</pre></div>
    <div><span class="pex-k">Sample output</span><pre class="py-out">${esc(c.expected) || '<span class="muted">(empty)</span>'}</pre></div></div></section>`;
}
const pyMdLite = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
// Same text as content/stdio.py reference_program().
function padReference(p) {
  const L = C.stdio_lib, s = p.stdio;
  const classes = s.needs.filter(k => k === 'ListNode' || k === 'TreeNode').map(k => L[k]);
  const helpers = s.needs.filter(k => k !== 'ListNode' && k !== 'TreeNode').map(k => L[k]);
  return [L.header, ...classes, p.solution, L.read, ...helpers, s.driver].join('\n\n') + '\n';
}
// A complete blank-page answer in function style: imports, the node classes it uses, the solution.
function padFnSolution(p) {
  const L = C.stdio_lib, types = p.tests.arg_types || [], uses = [...types, p.tests.ret_type].filter(Boolean).join(' ');
  return [L.header.replace('sys.setrecursionlimit(20000)', '').trim(), ...(/linked/.test(uses) ? [L.ListNode] : []), ...(/tree/.test(uses) ? [L.TreeNode] : []), p.solution].join('\n\n') + '\n';
}
const padSolution = (p, mode) => mode === 'prog' ? padReference(p) : mode === 'fn' ? padFnSolution(p) : p.solution;
async function padRun(p, mode, code, opts = {}) {
  if (mode === 'prog') return runScript(code, opts.hidden === false ? p.stdio.cases.slice(0, 3) : p.stdio.cases);   // Run: the first three
  return runTests(p, code, { ...opts, blank: mode === 'fn' });
}
// Results for program style: each failing test with its input, what was expected and what was printed.
function scriptResultsHtml(r) {
  if (!r) return '';
  if (r.error && !r.results?.length) return `<div class="results"><div class="err">${esc(r.error)}</div></div>`;
  const rs = r.results || [];
  if (r.ok) return `<div class="results"><div class="res">✓ All ${rs.length} tests pass (program style checks correctness only)</div></div>`;
  const box = (k, v) => `<div class="py-io"><span class="muted small">${k}</span><pre class="py-out">${v === '' ? '<span class="muted">(nothing)</span>' : esc(v)}</pre></div>`;
  const bad = rs.map((x, i) => [x, i]).filter(([x]) => !x.pass);
  return `<div class="results"><div class="res fail">✗ ${bad.length} of ${rs.length} tests fail</div>
    ${bad.slice(0, 3).map(([x, i]) => `<div class="py-case fail"><b>Test ${i + 1}</b><div class="py-ios">${box('Input', x.stdin.replace(/\n$/, ''))}${box('Expected', x.expected)}${box('You printed', (x.got || '').replace(/\n$/, ''))}</div>
      ${x.error ? `<div class="err">${esc(x.error)}</div>` : ''}</div>`).join('')}
    ${bad.length > 3 ? `<p class="muted small">and ${bad.length - 3} more failing</p>` : ''}</div>`;
}
const padResultsHtml = (mode, r) => mode === 'prog' ? scriptResultsHtml(r) : resultsHtml(r);
function gradeButtons(onGrade, suggested) {
  const el = document.createElement('div');
  el.className = 'gradebar';
  el.innerHTML = `<span class="muted small" style="align-self:center">How did that feel?</span>
    <button class="bad" data-q="0">Blanked <kbd>1</kbd></button><button class="shaky" data-q="1">Shaky <kbd>2</kbd></button>
    <button class="good" data-q="2">Nailed it <kbd>3</kbd></button>`;
  if (suggested != null) el.querySelector(`[data-q="${suggested}"]`).style.outline = '2px solid var(--text)';
  let used = false;
  const go = q => { if (used) return; used = true; onGrade(q); };
  el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) go(+b.dataset.q); });
  const key = e => {
    if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey || !singleKeysOn() || !['1', '2', '3'].includes(e.key)) return;
    if (!el.querySelector(`[data-q="${+e.key - 1}"]`).disabled) go(+e.key - 1);
  };
  document.addEventListener('keydown', key); onRound(() => document.removeEventListener('keydown', key));
  setTimeout(() => el.querySelector(`[data-q="${suggested ?? 2}"]`)?.focus({ preventScroll: true }), 0);
  return el;
}

// Per-question cleanup (key listeners, timers), run when the next question renders or the page changes.
let roundCleanup = [];
function onRound(fn) { roundCleanup.push(fn); onLeave(fn); }
function cleanupRound() { roundCleanup.forEach(f => { try { f(); } catch (e) {} }); roundCleanup = []; }
const singleKeysOn = () => S?.settings?.singleKeys !== false;   // WCAG 2.1.4: single-key shortcuts can be turned off in Settings
function announce(msg) { const r = document.getElementById('sr-status'); if (!r) return; r.textContent = ''; setTimeout(() => { r.textContent = msg; }, 60); }
const isTyping = t => !!t?.matches?.('textarea, select, [contenteditable], input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button])');

// Show / hide the answer. Seeing it once marks the round as missed, whatever happens after
// (retrieval practice: looking it up is not recalling it). Returns { seen }.
function answerToggle(btn, panel, render, onFirst, label = 'answer') {
  let open = false, seen = false;
  btn.dataset.key = 'a';
  const paint = () => { btn.innerHTML = `${open ? 'Hide' : 'Show'} ${label} <kbd>A</kbd>`; btn.setAttribute('aria-expanded', open); };
  paint();
  btn.onclick = () => {
    open = !open;
    if (open && !seen) { seen = true; onFirst && onFirst(); }
    if (panel) { panel.hidden = !open; if (open) panel.innerHTML = render(); }
    else render(open);
    paint();
  };
  return { get seen() { return seen; } };
}
// Shown once the answer has been seen: the only way on records a miss.
function missedBar(done, solved) {
  const el = document.createElement('div');
  el.className = 'gradebar missed';
  el.innerHTML = `<span class="muted small" style="align-self:center">${solved ? 'Solved, but after seeing the answer, so it' : 'You looked at the answer, so this'}
    counts as missed and comes back tomorrow.</span><button class="primary" data-key="n">Next <kbd>N</kbd></button>`;
  let used = false;
  el.querySelector('button').onclick = () => { if (used) return; used = true; done(0); };
  return el;
}
function startTimer(el, seconds, onEnd, { countUp = false } = {}) {
  const t0 = Date.now(); let stopped = false;
  const tick = () => {
    if (stopped) return;
    const el2 = (Date.now() - t0) / 1000;
    const left = seconds - el2;
    if (el) { el.textContent = countUp ? fmtTime(el2) : fmtTime(left); el.classList.toggle('low', !countUp && left < seconds * 0.2); }
    if (!countUp && left <= 0) { stopped = true; onEnd && onEnd(); return; }
    setTimeout(tick, 250);
  };
  tick();
  const stop = () => { stopped = true; return (Date.now() - t0) / 1000; };
  onRound(stop);
  return { stop, elapsed: () => (Date.now() - t0) / 1000 };
}

// Generic session runner: shows n rounds of a game, grades each, then a summary.
function runSession(app, game, n, fromPlan, filter) {
  const g = GAMES[game];
  const queue = chooseItems(game, n, filter);
  const exitHref = filter ? `#/study/${filter}` : fromPlan ? '#/today' : '#/games';
  if (!queue.length) { app.innerHTML = `<div class="card">Nothing to practise here yet.</div>`; return; }
  let i = 0; const tally = [0, 0, 0]; let xpGained = 0;
  const hist = [];  // per question: everything review() changed, so "Previous" can undo it
  const shell = document.createElement('div');
  app.append(shell);
  const next = () => {
    cleanupRound();
    shell.innerHTML = '';
    if (i >= queue.length) return summary();
    const head = document.createElement('div');
    head.className = 'gamehead';
    const lost = i ? `Your grades for the ${i} question${i > 1 ? 's' : ''} you finished are saved, but question ${i + 1} and the rest of the round are not.`
      : 'Nothing from this round has been saved yet. Your answer to this question will be lost.';
    head.innerHTML = `<a href="${exitHref}" class="btn ghost" data-key="q" title="Exit (Q)" data-exit-confirm="${esc(lost)}">← Exit <kbd>Q</kbd></a>
      <button class="ghost" id="prev" data-key="[" ${i ? '' : 'disabled'} title="Go back to the previous question (its grade is undone)">← Previous <kbd>[</kbd></button>
      <h1>${g.icon} ${g.name}</h1>${filter ? ` ${patternTag(filter)}` : ''}
      <div class="progress"><i style="width:${i / queue.length * 100}%"></i></div><span class="muted">${i + 1}/${queue.length}</span>
      ${eta((queue.length - i) * (game === 'oa' ? solveMin(queue[i]) : gameMin(game)), 'left', { title: game === 'oa' ? 'The time budget OA Mode gives this difficulty' : paceNote(game) })}
      <span class="timer" id="clock"></span>`;
    const body = document.createElement('div');
    shell.append(head, body);
    if (queue[i]._dueFor) head.insertAdjacentHTML('afterend', `<p class="rotated muted small">Review: <b>${esc(PROB(queue[i]._dueFor)?.title || '')}</b> is due.
      This is a different ${esc(PAT(queue[i].pattern).name)} problem in its place, so you practise the pattern instead of remembering one answer.</p>`);
    $('#prev', head).onclick = () => {
      if (!i) return;
      i--; const h = hist[i];
      if (h.before === undefined) delete S.items[h.k]; else S.items[h.k] = h.before;
      if (h.dueFor) S.items[h.dueFor.k] = h.dueFor.before;
      S.days[h.d] = h.dayBefore; S.xp = h.xpBefore; S.streak = h.streakBefore; S.plan = h.planBefore;
      tally[h.q]--; xpGained -= h.gained; save();
      toast(`Back to question ${i + 1}: your earlier grade was undone`);
      next();
    };
    const o = queue[i], shownAt = Date.now();
    g.render(body, o, q => {
      recordPace(game, (Date.now() - shownAt) / 60000);
      const k = game + ':' + o.id, d = today();
      const snap = { k, d, q, before: S.items[k] ? structuredClone(S.items[k]) : undefined,
        dayBefore: S.days[d] ? structuredClone(S.days[d]) : { xp: 0, rounds: 0, newBy: {} },
        xpBefore: S.xp, streakBefore: structuredClone(S.streak), planBefore: S.plan ? structuredClone(S.plan) : null };
      snap.gained = review(game, o.id, q);
      if (o._dueFor) {   // a rotated review: the problem it stood in for moves on with the same grade
        const kx = game + ':' + o._dueFor;
        snap.dueFor = { k: kx, before: structuredClone(S.items[kx]) };
        schedule(S.items[kx], q); save();
      }
      if (fromPlan) planTick(game);
      hist[i] = snap; tally[q]++; xpGained += snap.gained;
      i++; next();
    }, { clock: $('#clock', head) });
  };
  const summary = () => {
    const p = currentPlan(); const nextBlock = p.blocks.find(b => b.done < b.target);
    shell.innerHTML = `<div class="card center" style="padding:30px">
      <div style="font-size:44px">${tally[2] >= tally[0] ? '🏆' : '💪'}</div>
      <h1>${g.name} complete</h1>
      <p class="muted">Nailed ${tally[2]} · Shaky ${tally[1]} · Blanked ${tally[0]} · +${xpGained} XP</p>
      <p class="small muted">Blanked and shaky items come back tomorrow. Nailed ones space out further each time.</p>
      <div class="row" style="justify-content:center;margin-top:14px">
        ${fromPlan && nextBlock ? `<a class="btn primary" href="#/play/${nextBlock.game}?plan=1" data-key="n">Next: ${GAMES[nextBlock.game].icon} ${GAMES[nextBlock.game].name} → <kbd>N</kbd></a>` : ''}
        <a class="btn ${fromPlan && nextBlock ? '' : 'primary'}" href="#/play/${game}?n=${n}${filter ? '&pattern=' + filter : ''}&r=${Math.random().toString(36).slice(2, 6)}" data-key="r">Another round <kbd>R</kbd></a>
        <a class="btn ghost" href="${filter ? exitHref : '#/today'}" data-key="q">${filter ? 'Back to lesson' : 'Today'} <kbd>Q</kbd></a></div></div>`;
    shell.querySelector('.btn.primary')?.focus({ preventScroll: true });  // Enter works too
  };
  next();
}
