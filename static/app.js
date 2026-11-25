/* Pattern Gym - daily LeetCode pattern drills.
   Vanilla JS, no build step. Runs against server.py locally, or as static files (see loadContent). */
'use strict';

// ─────────────────────────── utilities ───────────────────────────
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
// Smooth scrolling only when the reader hasn't asked for reduced motion.
const scrollMotion = () => matchMedia('(prefers-reduced-motion: no-preference)').matches ? 'smooth' : 'auto';
const fmtTime = s => `${Math.floor(Math.max(0, s) / 60)}:${pad(Math.floor(Math.max(0, s) % 60))}`;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1600); }
async function api(path, body) {
  const r = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}
// Two modes, picked at boot:
//  - server: `python server.py` is running. Content, code runs and progress go through /api/*.
//  - static: hosted as plain files (GitHub Pages). Content from content.json (built by build_static.py),
//    code runs in the browser (Pyodide worker), progress in this browser's localStorage.
// URLs are relative so the static build works under a sub-path like /pattern-gym/.
let SERVER = false;
async function loadContent() {
  try { const c = await api('/api/content'); SERVER = true; return c; }
  catch (e) { SERVER = false; return api('content.json'); }
}

// ── progress storage ──
const LS_KEY = 'pattern-gym-state';
async function loadState() {
  if (SERVER) return api('/api/state');
  try { navigator.storage?.persist?.(); } catch (e) { /* best effort: asks the browser not to evict our data */ }
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { return {}; }
}
function persist() {
  if (SERVER) return api('/api/state', S).catch(() => toast('Couldn’t save progress (is server.py running?)'));
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { toast('Couldn’t save progress in this browser'); }
}

// ── running code ──
let pyWorker = null, pyReady = null, pyLoaded = false;
function startPy() {
  pyLoaded = false;
  pyWorker = new Worker('py-worker.js');
  pyReady = new Promise((resolve, reject) => {
    pyWorker.onmessage = e => e.data.ready ? (pyLoaded = true, resolve()) : reject(new Error(e.data.error));
    pyWorker.onerror = e => reject(new Error(e.message || 'worker failed to start'));
  });
  pyReady.catch(() => {});
}
async function runPy(code, spec, timeoutMs) {
  if (!pyWorker) startPy();
  if (!pyLoaded) toast('Loading Python in your browser (first run only)...');
  try { await pyReady; }
  catch (e) { pyWorker.terminate(); pyWorker = null; return { ok: false, results: [], error: `Couldn’t load Python in the browser (${e.message}). Check your connection and try again.` }; }
  const w = pyWorker;
  return new Promise(resolve => {
    let progress = null;
    const t = setTimeout(() => {
      w.terminate(); startPy();  // the only way to stop an infinite loop in a worker
      resolve(progress ? slowResult(progress, timeoutMs / 1000)
        : { ok: false, results: [], error: `Time limit exceeded (${timeoutMs / 1000}s). Infinite loop or too slow?` });
    }, timeoutMs);
    w.onmessage = e => {
      if (e.data.progress) { progress = e.data.progress; return; }
      clearTimeout(t); if (e.data.fatal) { w.terminate(); startPy(); } resolve(e.data.result);
    };
    w.postMessage({ code, spec });
  });
}
// Same message as server.py's timeout_result: the visible examples passed, a large hidden test timed out.
function slowResult(pr, secs) {
  return { ok: false, slow: true, error: `Correct on every example, but too slow on ${pr.perf.charAt(0).toLowerCase() + pr.perf.slice(1)}. Look for repeated work, like an inner loop or recomputing the same thing, and aim for the target complexity.`,
    results: [{ pass: true, input: `All ${pr.visible} examples passed` }, { pass: false, hidden: true, input: pr.perf, error: `Too slow: still running after ${secs} s` }] };
}
// Hidden large tests run after the examples (OA, cold solve, mock). Line Up and Fill the Gap skip them:
// there the structure is the reference's, so they would only add waiting time.
// blank: CoderPad mode, nothing pre-imported or predefined (runner's "blank" spec flag)
const runTests = (p, code, { hidden = true, blank = false } = {}) => {
  let spec = hidden ? p.tests : { ...p.tests, perf: undefined };
  if (blank) spec = { ...spec, blank: true };
  return SERVER ? api('/api/run', { id: p.id, code, hidden, blank }) : runPy(code, spec, 6000);
};
const runSyntax = (s, code) => SERVER ? api('/api/syntax', { id: s.id, code })
  : runPy(code, { kind: 'snippet', setup: s.setup, check: s.check }, 4000);
// A whole program (Python tab): run once per case on its stdin; returns what it printed for each.
const runScript = (code, cases) => SERVER ? api('/api/script', { code, cases })
  : runPy(code, { kind: 'script', cases }, 4000);

// Code editor: a plain textarea plus
//  - optional syntax colours: a highlighted copy sits behind the transparent text, kept in sync on every change
//    (no autocomplete; the toggle sits on the editor itself and is remembered in Settings)
//  - Python-friendly indentation: Tab / Shift+Tab indent or dedent the line or every selected line,
//    Backspace in leading spaces deletes back to the previous 4-space stop, Enter keeps the indent
//    (+4 after ':' , -4 after return/break/continue/pass/raise), pasted tabs become 4 spaces.
//    Edits go through insertText so Ctrl+Z still works.
const hlOn = () => S?.settings?.highlight !== false;
function edInsert(ta, text, s, e) {
  ta.focus(); ta.setSelectionRange(s, e);
  let ok = false; try { ok = document.execCommand('insertText', false, text); } catch (er) {}
  if (!ok || ta.value.slice(s, s + text.length) !== text) { ta.setRangeText(text, s, e, 'end'); ta.dispatchEvent(new Event('input', { bubbles: true })); }
}
function enhanceEditor(ta, { onSubmit, autoIndent = true } = {}) {
  ta.spellcheck = false; ta.setAttribute('wrap', 'off'); ta.setAttribute('autocapitalize', 'off'); ta.setAttribute('autocomplete', 'off');
  // wrap: toolbar + colour layer behind the textarea
  const wrap = document.createElement('div'); wrap.className = 'ed';
  wrap.innerHTML = `<div class="ed-bar"><label class="ed-toggle"><input type="checkbox" ${hlOn() ? 'checked' : ''}> Syntax colours</label>
    <span class="ed-hint muted">Tab indents · Shift+Tab dedents · Esc leaves</span></div><div class="ed-area"><pre class="ed-hl" aria-hidden="true"></pre></div>`;
  if (ta.classList.contains('snap')) wrap.classList.add('snap');
  ta.replaceWith(wrap); $('.ed-area', wrap).append(ta);
  const layer = $('.ed-hl', wrap), box = $('input', wrap);
  const paint = () => {
    wrap.classList.toggle('hl-on', hlOn());
    if (hlOn()) layer.innerHTML = highlightCode(ta.value) + '\n ';   // trailing line keeps heights equal
    layer.scrollTop = ta.scrollTop; layer.scrollLeft = ta.scrollLeft;
  };
  ta._paint = paint;
  ta.addEventListener('input', paint);
  ta.addEventListener('scroll', () => { layer.scrollTop = ta.scrollTop; layer.scrollLeft = ta.scrollLeft; });
  box.addEventListener('change', () => { S.settings.highlight = box.checked; save(); repaintCode(); toast(box.checked ? 'Syntax colours on' : 'Syntax colours off'); });
  // value set from code (starter, notes) after this call: paint on the next frame too
  setTimeout(paint, 0); paint();

  const lineStart = (v, i) => v.lastIndexOf('\n', i - 1) + 1;
  const lineEnd = (v, i) => { const j = v.indexOf('\n', i); return j < 0 ? v.length : j; };
  ta.addEventListener('paste', e => {
    const t = e.clipboardData?.getData('text'); if (t == null || !t.includes('\t')) return;
    e.preventDefault(); edInsert(ta, t.replace(/\t/g, '    '), ta.selectionStart, ta.selectionEnd);
  });
  ta.addEventListener('keydown', e => {
    const { selectionStart: s, selectionEnd: en, value: v } = ta;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSubmit && onSubmit(); return; }
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      const multi = v.slice(s, en).includes('\n');
      if (!e.shiftKey && !multi) {                       // soft tab to the next 4-space stop
        const col = s - lineStart(v, s); edInsert(ta, ' '.repeat(4 - (col % 4)), s, en); return;
      }
      const a = lineStart(v, s), b = lineEnd(v, en > s && v[en - 1] === '\n' ? en - 1 : en);
      const lines = v.slice(a, b).split('\n');
      const out = lines.map(l => e.shiftKey ? l.replace(/^ {1,4}/, '') : (l.length ? '    ' + l : l));
      const firstShift = (out[0].length - lines[0].length);
      edInsert(ta, out.join('\n'), a, b);
      if (multi) ta.setSelectionRange(a, a + out.join('\n').length);
      else ta.setSelectionRange(Math.max(a, s + firstShift), Math.max(a, s + firstShift));
      return;
    }
    if (e.key === 'Backspace' && s === en && s > 0) {   // in leading spaces: back to the previous 4-space stop
      const a = lineStart(v, s), before = v.slice(a, s);
      if (before.length && /^ +$/.test(before)) { e.preventDefault(); const to = a + Math.floor((before.length - 1) / 4) * 4; edInsert(ta, '', to, s); return; }
    }
    if (e.key === 'Enter' && autoIndent && !e.shiftKey) {
      e.preventDefault();
      const line = v.slice(lineStart(v, s), s);
      let ind = line.match(/^ */)[0];
      const code = line.replace(/#.*$/, '');   // a colon inside a comment does not open a block
      if (/:\s*$/.test(code)) ind += '    ';
      else if (/^\s*(return|break|continue|pass|raise)\b/.test(line)) ind = ind.slice(4);
      edInsert(ta, '\n' + ind, s, en);
    }
  });
}
// One-line inputs that hold code (Fill the Gap's gaps): the same colour layer as the editor, behind a
// transparent input. The layer's text slides with the input's horizontal scroll.
function hlInput(inp) {
  const box = document.createElement('span'); box.className = 'hin';
  box.style.marginLeft = inp.style.marginLeft; inp.style.marginLeft = '';
  box.innerHTML = '<span class="hin-hl" aria-hidden="true"><span></span></span>';
  inp.replaceWith(box); box.append(inp);
  const layer = $('.hin-hl > span', box);
  const paint = () => {
    box.classList.toggle('hl-on', hlOn());
    if (hlOn()) layer.innerHTML = highlightLine(inp.value) || '';
    layer.style.transform = `translateX(${-inp.scrollLeft}px)`;
  };
  inp._paint = paint;
  ['input', 'scroll', 'keyup', 'click', 'select', 'focus'].forEach(ev => inp.addEventListener(ev, paint));
  paint();
}
// Read-only code blocks (<pre class="code">, and inline <code class="hlc">) follow the same colour setting.
function paintPre(pre) {
  if (pre.dataset.src == null) pre.dataset.src = pre.textContent;
  const src = pre.dataset.src, keys = new Set((pre.dataset.keys || '').split(',').filter(Boolean).map(Number));
  const on = hlOn();
  if (pre.dataset.painted === String(on)) return;
  pre.dataset.painted = String(on);
  pre.innerHTML = src.split('\n').map((l, i) => { const inner = on ? highlightLine(l) : esc(l); return keys.has(i) ? `<span class="hl">${inner}</span>` : inner; }).join('\n');
}
function repaintCode() {
  $$('#app pre.code, .modal pre.code, #app code.hlc').forEach(pre => { if (!pre.closest('.ed')) { delete pre.dataset.painted; paintPre(pre); } });
  $$('.ed').forEach(w => { const t = $('textarea', w); t?._paint?.(); const b = $('.ed-toggle input', w); if (b) b.checked = hlOn(); });
  $$('.hin input').forEach(i => i._paint?.());
}

// ─────────────────────────── state ───────────────────────────
let C = null;           // content from server
let S = null;           // persisted state
const DEFAULTS = {
  settings: { interviewDate: null, minutes: 30, newPerDay: 4, sprintSeconds: 15, sprintNoLimit: false, edgeSeconds: 60, singleKeys: true, highlight: true,
              focus: { talk: true, clarify: true, complexity: true, noide: true } },
  items: {}, xp: 0, streak: { count: 0, last: null, best: 0 }, days: {}, mocks: [], plan: null,
  study: { lessons: {}, walks: {}, attempts: {} },
};
let saveTimer = null;
// settingsAt = when settings last changed here; sync uses it to pick the newest settings across devices.
let settingsSeen = null;
function markSettingsSeen() { settingsSeen = JSON.stringify(S.settings); }
function save() {
  const sj = JSON.stringify(S.settings);
  if (settingsSeen !== null && sj !== settingsSeen) S.settingsAt = Date.now();
  settingsSeen = sj;
  clearTimeout(saveTimer); saveTimer = setTimeout(() => { saveTimer = null; persist(); }, 300);
  renderHud(); Cloud.schedule();
}
addEventListener('pagehide', () => { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; persist(); } });
// Fill in anything missing (older saves, imported backups) from DEFAULTS.
function normalizeState(raw) {
  const s = Object.assign(structuredClone(DEFAULTS), raw && typeof raw === 'object' ? raw : {});
  s.settings = Object.assign(structuredClone(DEFAULTS.settings), s.settings || {});
  s.settings.focus = Object.assign({}, DEFAULTS.settings.focus, s.settings.focus || {});
  s.study = Object.assign({ lessons: {}, walks: {}, attempts: {} }, s.study || {});
  return s;
}
function dayRec(d = today()) { return S.days[d] ||= { xp: 0, rounds: 0, newBy: {} }; }

// urgency
function daysLeft() { const d = S.settings.interviewDate; return d ? daysBetween(today(), d) : null; }
function urgency() {
  const n = daysLeft();
  if (n === null || n < 0) return { mode: 'steady', label: 'No interview set', cap: 120 };
  if (n <= 14) return { mode: 'urgent', label: n === 0 ? 'Interview today' : `${n}d to interview`, cap: Math.max(1, Math.floor(n / 2)) };
  if (n <= 45) return { mode: 'focused', label: `${n}d to interview`, cap: Math.max(3, Math.floor(n / 2)) };
  return { mode: 'steady', label: `${n}d to interview`, cap: 120 };
}

// ─────────────────────────── spaced repetition ───────────────────────────
// box 0..7. good: box+1, next due after INTERVALS[box-1] days (capped by urgency). shaky: back in 1-2 days. fail: box 0, tomorrow.
const INTERVALS = [1, 3, 7, 14, 30, 60, 120];
const LEVEL_NAMES = ['New', 'Seen', 'Learning', 'Learning', 'Solid', 'Solid', 'Locked', 'Locked', 'Locked'];
const XP = { sprint: 2, syntax: 3, bigo: 3, edge: 4, lineup: 6, fill: 8, skeleton: 6, bughunt: 8, oa: 30, mock: 45 };
function item(game, id) { return S.items[game + ':' + id]; }
function review(game, id, q) {
  const k = game + ':' + id, t = today();
  let it = S.items[k];
  if (!it) { it = S.items[k] = { box: 0, reps: 0, lapses: 0, first: t }; const d = dayRec(); d.newBy[game] = (d.newBy[game] || 0) + 1; }
  schedule(it, q);
  const gained = q === 2 ? XP[game] : q === 1 ? Math.ceil(XP[game] / 2) : 1;
  addXP(gained);
  return gained;
}
function schedule(it, q) {
  const t = today();
  it.reps++; it.last = t; it.lastQ = q;
  if (q === 0) { it.box = 0; it.lapses++; it.due = addDays(t, 1); }
  else if (q === 1) { it.box = Math.max(1, it.box); it.due = addDays(t, it.box >= 3 ? 2 : 1); }
  else { it.box = Math.min(7, it.box + 1); it.due = addDays(t, Math.min(INTERVALS[it.box - 1], urgency().cap)); }
}
function addXP(n) {
  S.xp += n; const d = dayRec(); d.xp += n; d.rounds++;
  const t = today();
  if (S.streak.last !== t) {
    S.streak.count = S.streak.last === addDays(t, -1) ? S.streak.count + 1 : 1;
    S.streak.last = t; S.streak.best = Math.max(S.streak.best || 0, S.streak.count);
    toast(`🔥 ${S.streak.count}-day streak`);
  }
  save();
}
const level = xp => Math.floor(Math.sqrt(xp / 40)) + 1;
const levelFloor = l => 40 * (l - 1) ** 2;

// The Study path. Each course comes after what it builds on (Recursion before trees, Backtracking and DP;
// Heap before Dijkstra; Stack before Monotonic Stack), and within that, the patterns that come up most come first.
// New items in the games are interleaved in this order too.
const STUDY_ORDER = ['hashmap', 'prefix', 'two_pointers', 'sliding_window', 'stack', 'binary_search', 'linked_list', 'recursion',
  'tree_dfs', 'tree_bfs', 'backtracking', 'grid_graph', 'heap', 'intervals', 'greedy', 'dp_1d', 'mono_stack', 'topo_sort',
  'union_find', 'dp_2d', 'trie', 'shortest_path', 'bit', 'matrix_math'];
const DIFF = { Easy: 0, Medium: 1, Hard: 2 };

// Round-robin across patterns so new material is interleaved, not blocked by topic.
function interleave(objs) {
  const by = {};
  for (const o of objs) (by[o.pattern] ||= []).push(o);
  for (const k in by) by[k].sort((a, b) => (DIFF[a.diff] ?? 1) - (DIFF[b.diff] ?? 1) || a.num - b.num);
  const order = STUDY_ORDER.filter(p => by[p]).concat(Object.keys(by).filter(p => !STUDY_ORDER.includes(p)));
  const out = []; let added = true;
  while (added) { added = false; for (const p of order) if (by[p].length) { out.push(by[p].shift()); added = true; } }
  return out;
}

// Choose n items for a game: due first, then new (daily budget), then the soonest-due as extra practice.
function chooseItems(game, n, patternFilter) {
  const g = GAMES[game], t = today();
  const pool = g.pool().filter(o => !patternFilter || o.pattern === patternFilter);
  const due = pool.filter(o => { const it = item(game, o.id); return it && it.due <= t; })
    .sort((a, b) => item(game, a.id).due.localeCompare(item(game, b.id).due) || item(game, a.id).box - item(game, b.id).box);
  const budget = Math.max(0, S.settings.newPerDay * (game === 'sprint' ? 3 : 1) - (dayRec().newBy[game] || 0));
  let fresh = interleave(pool.filter(o => !item(game, o.id)));
  // New material from patterns you've studied comes first: you can't spot or build a pattern you haven't met.
  if (fresh.some(o => o.pattern)) { const known = fresh.filter(o => !o.pattern || lessonDone(o.pattern)); if (known.length) fresh = known.concat(fresh.filter(o => !known.includes(o))); }
  if (g.gate) { const gated = fresh.filter(g.gate); fresh = gated.length >= Math.min(n, budget) ? gated : gated.concat(fresh.filter(o => !g.gate(o))); }
  let q = due.slice(0, n);
  if (q.length < n) q = q.concat(fresh.slice(0, Math.min(n - q.length, Math.max(budget, due.length ? 0 : Math.min(n, 2)))));
  if (q.length < n) {
    const ahead = pool.filter(o => item(game, o.id) && !q.includes(o)).sort((a, b) => item(game, a.id).due.localeCompare(item(game, b.id).due));
    q = q.concat(ahead.slice(0, n - q.length));
  }
  if (q.length < n) q = q.concat(fresh.filter(o => !q.includes(o)).slice(0, n - q.length));
  if (game === 'oa') q = rotate(q, pool);
  return game === 'sprint' || game === 'syntax' ? shuffle(q) : q;
}
// Review rotation for full solves. Re-solving the same problem tests your memory of its answer; a different
// problem of the same pattern tests the pattern. A due problem you passed last time is swapped for the sibling
// you've solved least, and grading it reschedules both. One you failed last time comes back as itself.
function rotate(q, pool) {
  const t = today(), taken = new Set(q.map(o => o.id));
  return q.map(o => {
    const it = item('oa', o.id);
    if (!it || it.due > t || !it.lastQ) return o;
    const sib = pool.filter(y => y.pattern === o.pattern && !taken.has(y.id) && (item('oa', y.id)?.reps || 0) < it.reps)
      .sort((a, b) => (item('oa', a.id)?.reps || 0) - (item('oa', b.id)?.reps || 0) || DIFF[a.diff] - DIFF[b.diff])[0];
    if (!sib) return o;
    taken.add(sib.id);
    return { ...sib, _dueFor: o.id };
  });
}
const dueCount = game => GAMES[game].pool().filter(o => { const it = item(game, o.id); return it && it.due <= today(); }).length;

// mastery per pattern: average box over that pattern's items across games (0..1)
function mastery(patternId) {
  const parts = [];
  for (const s of C.sprint.filter(s => s.pattern === patternId)) parts.push(item('sprint', s.id)?.box || 0);
  for (const p of C.problems.filter(p => p.pattern === patternId))
    for (const g of ['lineup', 'fill', 'oa', 'bigo']) parts.push(item(g, p.id)?.box || 0);
  parts.push(item('skeleton', patternId)?.box || 0);
  if (!parts.length) return 0;
  return parts.reduce((a, b) => a + Math.min(b, 5), 0) / (parts.length * 5);
}
function problemLevel(pid) {
  const b = ['lineup', 'fill', 'oa'].map(g => item(g, pid)?.box || 0);
  const score = b[0] * 0.5 + b[1] + b[2] * 1.5;
  return score >= 9 ? 4 : score >= 5 ? 3 : score >= 2 ? 2 : score > 0 ? 1 : 0;
}
const dots = (n, of = 4) => `<span class="dots">${Array.from({ length: of }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;

// ─────────────────────────── time estimates ───────────────────────────
// Every page and activity says roughly how long it takes. Reading: 200 words a minute for prose and
// 5 seconds a line for code. Doing: each game's minutes per question (your own pace once you've done
// a few), and the 15 / 25 / 40 minute budgets OA Mode gives Easy / Medium / Hard problems.
const READ_WPM = 200, CODE_LINE_SECS = 5;
const SOLVE_MIN = { Easy: 15, Medium: 25, Hard: 40 };
const solveMin = p => SOLVE_MIN[p?.diff] || SOLVE_MIN.Medium;
const ETA_NOTE = 'Estimated time: reading at 200 words a minute and code at 5 seconds a line. Games switch to your own pace after a few rounds.';
function fmtMin(m) {
  if (!(m >= 1)) return 'under 1 min';
  if (m >= 600) return `${Math.round(m / 60)} h`;
  const r = m < 10 ? Math.round(m) : m < 60 ? Math.max(10, Math.round(m / 5) * 5) : Math.round(m / 10) * 10;
  if (r < 60) return `${r} min`;
  return `${Math.floor(r / 60)} h${r % 60 ? ` ${r % 60} min` : ''}`;
}
const CLOCK = '<svg class="eta-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
// A time chip: eta(12, 'read') → "⏱ 12 min read". Screen readers hear "About 12 min read".
function eta(min, what = '', { title = ETA_NOTE, cls = '' } = {}) {
  return `<span class="eta${cls ? ' ' + cls : ''}" title="${esc(title)}">${CLOCK}${min >= 1 ? '<span class="sr">About </span>' : ''}${fmtMin(min)}${what ? ' ' + esc(what) : ''}</span>`;
}
// The same, small and inline, for inside buttons and links.
const etaIn = min => ` <span class="eta-in"><span class="sr">, ${min >= 1 ? 'about ' : ''}</span>${fmtMin(min)}</span>`;
// Reading time of an element or an HTML string. Controls, hidden parts and editor overlays don't count.
const READ_SKIP = 'button, kbd, select, script, style, svg, .eta, .eta-in, [aria-hidden="true"], [hidden], .sr, .ed-bar, [role=tablist], .crumb, .keybar';
function readStats(node, acc) {
  for (const n of node.childNodes) {
    if (n.nodeType === 3) acc.words += (n.nodeValue.match(/[\p{L}\p{N}]\S*/gu) || []).length;
    else if (n.nodeType === 1 && !n.matches(READ_SKIP)) {
      if (n.matches('pre, textarea, .ex')) acc.lines += String(n.dataset.src ?? (n.tagName === 'TEXTAREA' ? n.value : n.textContent)).split('\n').filter(l => l.trim()).length;
      else readStats(n, acc);
    }
  }
  return acc;
}
function readMin(src) {
  let el = src;
  if (typeof src === 'string') { const t = document.createElement('template'); t.innerHTML = src; el = t.content; }
  const { words, lines } = readStats(el, { words: 0, lines: 0 });
  return words / READ_WPM + lines * CODE_LINE_SECS / 60;
}
// Minutes per question in a game: your measured pace after 3 questions, else the game's own estimate.
function defaultGameMin(game) {
  if (game === 'sprint') return (S.settings.sprintNoLimit ? 20 : S.settings.sprintSeconds) / 60 + 0.25;
  if (game === 'edge') return (S.settings.edgeSeconds || 120) / 60 + 0.75;
  if (game === 'oa') return SOLVE_MIN.Medium;
  return GAMES[game]?.cost || 1;
}
const PACED = new Set(['sprint', 'syntax', 'bigo', 'edge', 'lineup', 'fill', 'skeleton', 'bughunt']);
function gameMin(game) {
  const p = S.pace?.[game];
  return PACED.has(game) && p && p.n >= 3 ? p.m : defaultGameMin(game);
}
const ownPace = game => PACED.has(game) && (S.pace?.[game]?.n || 0) >= 3;
const roundMin = (game, n) => n * gameMin(game);
const paceNote = game => ownPace(game) ? `Your pace: about ${fmtMin(gameMin(game))} a question, measured from your last rounds.` : ETA_NOTE;
function recordPace(game, mins) {
  if (!PACED.has(game) || !(mins > 0)) return;
  const d = defaultGameMin(game), m = clamp(mins, d * 0.25, d * 3);   // walked away, or clicked straight through: cap it
  const p = (S.pace ||= {})[game];
  S.pace[game] = p ? { m: Math.round((p.m * 0.7 + m * 0.3) * 100) / 100, n: p.n + 1 } : { m: Math.round(m * 100) / 100, n: 1 };
}

// ─────────────────────────── daily plan ───────────────────────────
// Day one: no lesson learned and no game played except Syntax Snap. The plan is then the first lesson (on the
// Today page) and a Python warm-up; the other games practise patterns, so they start after the first lesson.
const firstDay = () => !studyOrder().some(p => lessonDone(p.id)) && !Object.keys(S.items).some(k => !k.startsWith('syntax:'));
function buildPlan() {
  const M = S.settings.minutes, f = S.settings.focus, u = urgency();
  const blocks = [];
  const add = (game, n) => n > 0 && blocks.push({ game, target: n, done: 0 });
  if (firstDay()) { add('syntax', clamp(Math.round(M / 6), 3, 8)); return { date: today(), minutes: M, firstDay: true, blocks }; }
  let used = 0;
  const sprintN = clamp(Math.round(M * 0.12 / 0.3), 8, 25); add('sprint', sprintN); used += sprintN * 0.3;
  const synN = clamp(Math.round(M * 0.06 / 0.6), 3, 8); add('syntax', synN); used += synN * 0.6;
  if (f.complexity) { const n = clamp(Math.round(M * 0.06 / 0.5), 3, 8); add('bigo', n); used += n * 0.5; }
  if (f.clarify) { const n = clamp(Math.round(M * 0.05 / 1.5), 1, 4); add('edge', n); used += n * 1.5; }
  const wantsMock = (f.talk || f.noide) && (M >= 70 || (u.mode === 'urgent' && M >= 55));
  if (wantsMock) { add('mock', 1); used += 35; }
  if (M - used >= 30) { add('oa', 1); used += 20; }
  const rest = Math.max(4, M - used);
  add('lineup', clamp(Math.round(rest * 0.4 / 1.5), 1, 10));
  add('fill', clamp(Math.round(rest * 0.45 / 3), 1, 8));
  add('skeleton', clamp(Math.round(rest * 0.15 / 2), 1, 3));
  const order = ['sprint', 'syntax', 'lineup', 'skeleton', 'fill', 'bigo', 'edge', 'oa', 'mock'];
  blocks.sort((a, b) => order.indexOf(a.game) - order.indexOf(b.game));
  fitPlan(blocks, M);
  return { date: today(), minutes: M, blocks };
}
// Trim the plan until its estimated time fits the minutes you set: shorten the longest block first, then drop
// the optional ones (Mock, OA, Edge Hunter, Big-O Call). Uses the same estimates the page shows.
function fitPlan(blocks, M) {
  const total = () => blocks.reduce((a, b) => a + roundMin(b.game, b.target), 0);
  const shrinkable = ['lineup', 'fill', 'sprint', 'skeleton', 'bigo', 'syntax', 'edge'];
  while (total() > M + 0.5) {
    const b = blocks.filter(b => shrinkable.includes(b.game) && b.target > 1).sort((x, y) => gameMin(y.game) - gameMin(x.game))[0];
    if (b) { b.target--; continue; }
    const drop = ['mock', 'oa', 'edge', 'bigo', 'skeleton'].map(g => blocks.findIndex(x => x.game === g)).find(i => i >= 0);
    if (drop === undefined || blocks.length <= 2) break;
    blocks.splice(drop, 1);
  }
}
function currentPlan() {
  if (!S.plan || S.plan.date !== today() || S.plan.minutes !== S.settings.minutes || !!S.plan.firstDay !== firstDay()) {
    const old = S.plan && S.plan.date === today() ? S.plan.blocks : [];
    S.plan = buildPlan();
    for (const b of S.plan.blocks) { const o = old.find(x => x.game === b.game); if (o) b.done = Math.min(o.done, b.target); }
    save();
  }
  return S.plan;
}
function planTick(game) {
  const p = currentPlan(); const b = p.blocks.find(b => b.game === game);
  if (b && b.done < b.target) { b.done++; if (b.done === b.target) toast(`✅ ${GAMES[game].name} done for today`); save(); }
}

// ─────────────────────────── HUD + router ───────────────────────────
function renderHud() {
  if (!S) return;
  document.body.classList.toggle('keys-off', !singleKeysOn());
  const l = level(S.xp), u = urgency();
  const into = S.xp - levelFloor(l), span = levelFloor(l + 1) - levelFloor(l);
  $('#hud').innerHTML = `
    <span class="pill ${u.mode}" title="Set in Settings">${esc(u.label)}</span>
    <span class="pill" title="Streak (best ${S.streak.best || 0})">🔥 ${S.streak.last === today() || S.streak.last === addDays(today(), -1) ? S.streak.count : 0}</span>
    <span class="pill hud-lv" title="${into}/${span} XP to next level">Lv ${l} · ${S.xp} XP</span>${Cloud.pill()}`;
}
const ROUTES = {};
// Brand new here: no attempts, no XP, and the Starter Guide never opened.
function isNewcomer() {
  let seen = false; try { seen = localStorage.getItem('pg-guide-seen') === '1'; } catch (e) {}
  return !seen && !S.xp && !Object.keys(S.study.attempts).length;
}
let cleanup = [];
function onLeave(fn) { cleanup.push(fn); }
function route() {
  cleanup.forEach(f => { try { f(); } catch (e) {} }); cleanup = [];
  if (!location.hash && isNewcomer()) { location.replace('#/guide'); return; }   // fires hashchange → route()
  const [path, qs] = (location.hash.slice(1) || '/today').split('?');
  const parts = path.split('/').filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  $$('nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === parts[0] || (parts[0] === 'play' && a.dataset.nav === 'games')));
  const app = $('#app'); app.innerHTML = '';
  (ROUTES[parts[0]] || ROUTES.today)(app, parts.slice(1), params);
  paintReadTimes(app);
  $$('nav a').forEach(a => a.classList.contains('active') ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  const h1 = $('#app h1');
  document.title = (h1 ? h1.textContent.replace(/\s+/g, ' ').trim() + ' · ' : '') + 'Pattern Gym';
  if (h1 && !app.contains(document.activeElement)) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
// Reading-time chips: [data-read-of="section"] shows the reading time of its enclosing section, #page-eta the
// whole page's. A page that shows no time anywhere gets its reading time under its heading.
function paintReadTimes(app) {
  for (const el of $$('[data-read-of]', app)) { const box = el.closest(el.dataset.readOf); if (box) el.innerHTML = eta(readMin(box), 'read'); }
  const pe = $('#page-eta', app); if (pe) pe.outerHTML = eta(readMin(app), 'read');
  if (!$('.eta', app)) {
    const h1 = $('h1', app);
    if (h1 && !h1.closest('.gamehead')) h1.insertAdjacentHTML('afterend', `<p class="eta-row page-eta">${eta(readMin(app), 'read')}</p>`);
  }
}
// Skip link: a button (a "#main" link would fight the hash router), moves focus into the page.
document.getElementById('skip')?.addEventListener('click', () => $('#app').focus());

// ─────────────────────────── keyboard ───────────────────────────
// Single keys work whenever you're not typing; Esc leaves a text box so they work again.
// "g" then a letter jumps to a page. Buttons opt in with data-key="x" (shown as <kbd>X</kbd>).
const NAV_KEYS = { t: ['today', 'Today'], s: ['study', 'Study'], g: ['games', 'Games'], p: ['problems', 'Problems'],
  a: ['patterns', 'Patterns'], y: ['python', 'Python'], c: ['cheatsheet', 'Cheatsheet'], u: ['guide', 'Starter Guide'], x: ['stats', 'Stats'], ',': ['settings', 'Settings'] };
const KEY_HELP = [
  ['Anywhere', [['?', 'This list'], ['/', 'Search problems'], ['g then t s g p a y c u x ,', 'Go to Today, Study, Games, Problems, Patterns, Python, Cheatsheet, Starter Guide, Stats, Settings'],
    ['E', 'Jump into the code editor / answer box'], ['Esc', 'Leave the editor (then single keys work)'], ['Q', 'Exit the game'], ['Tab', 'Next control']]],
  ['In a game', [['Ctrl+Enter', 'Run / check / score'], ['R', 'Run / check (when not typing)'], ['H', 'Hint'], ['A', 'Show / hide the answer'],
    ['N', 'Next question / next game when a round ends'], ['R', 'Another round (end of a round)'], ['[', 'Previous question (undoes its grade)'], ['1 2 3', 'Grade: Blanked / Shaky / Nailed'], ['1-4', 'Pick an option (Sprint, Big-O)']]],
  ['Line Up', [['↑ ↓', 'Move between lines'], ['← →', 'Switch column'], ['Enter / Space', 'Move the line to the other column'], ['Alt+↑ ↓', 'Reorder a line in your solution']]],
  ['Study', [['C', 'Continue with your next step'], ['M', 'Start a mystery problem (mixed practice)'], ['Space', 'Reveal the next step / skeleton line'],
    ['Ctrl+Enter', 'Reveal, while typing your guess'], ['C F L', 'After a walkthrough: solve cold, Fill the Gap, Line Up'], ['W', 'See the walkthrough'],
    ['[ ]', 'Previous / next pattern or problem'], ['B', 'Back to the course']]],
  ['Pages', [['S', 'Today: start / continue the plan'], ['L', 'Today: open today’s lesson'], ['1-9', 'Today: start a practice block · Games: play a game · Course: start a drill'],
    ['↑ ↓', 'Move through any list (path, problems, patterns); Enter opens'], ['R', 'Pattern: recall its skeleton · Settings: restore a backup'],
    ['B', 'Settings: download a backup'], ['I', 'Settings: sign in']]],
  ['Problems', [['/', 'Jump to the search box'], ['Esc', 'Clear the search, press again to leave the box'], ['↓ ↑', 'Move through the results'], ['Enter', 'Solve the selected problem']]],
];
function showKeys() {
  let dlg = document.getElementById('keys-dialog');
  if (!dlg) {
    dlg = document.createElement('dialog'); dlg.id = 'keys-dialog'; dlg.className = 'modal'; dlg.setAttribute('aria-labelledby', 'keys-title');
    dlg.innerHTML = `<form method="dialog" class="dlg-x"><button class="ghost" aria-label="Close">✕</button></form><h3 id="keys-title">Keyboard shortcuts</h3>
      ${KEY_HELP.map(([h, rows]) => `<h4>${h}</h4><table class="keys">${rows.map(([k, d]) => `<tr><td>${k.split(' ').map(x => `<kbd>${esc(x)}</kbd>`).join(' ')}</td><td>${esc(d)}</td></tr>`).join('')}</table>`).join('')}`;
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    document.body.append(dlg);
  }
  dlg.showModal();
}
// Leaving mid-round: any control with data-exit-confirm="<what is lost>" asks first.
// Q (or Enter on Quit) confirms; Esc, a click outside, or "Keep going" stays.
function confirmQuit(msg) {
  return new Promise(resolve => {
    let dlg = document.getElementById('quit-dialog');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'quit-dialog'; dlg.className = 'modal quit';
      dlg.setAttribute('aria-labelledby', 'quit-title'); dlg.setAttribute('aria-describedby', 'quit-msg');
      dlg.innerHTML = `<h3 id="quit-title">Quit now?</h3><p id="quit-msg" class="muted"></p>
        <div class="row quit-actions"><button type="button" class="primary" data-a="stay">Keep going <kbd>Esc</kbd></button>
        <button type="button" class="danger" data-a="quit">Quit <kbd>Q</kbd></button></div>`;
      dlg.addEventListener('click', e => {
        if (e.target === dlg) dlg.close('stay');
        const a = e.target.closest('[data-a]'); if (a) dlg.close(a.dataset.a);
      });
      dlg.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'q' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); dlg.close('quit'); } });
      document.body.append(dlg);
    }
    $('#quit-msg', dlg).textContent = msg;
    dlg.returnValue = '';
    dlg.onclose = () => { dlg.onclose = null; resolve(dlg.returnValue === 'quit'); setTimeout(paintKeybar, 0); };
    dlg.showModal(); $('[data-a="stay"]', dlg).focus();
  });
}
document.addEventListener('click', e => {
  const el = e.target.closest?.('[data-exit-confirm]');
  if (!el || el._quitOk) return;
  e.preventDefault(); e.stopImmediatePropagation();
  confirmQuit(el.dataset.exitConfirm).then(ok => { if (ok) { el._quitOk = true; el.click(); el._quitOk = false; } });
}, true);
let gAt = 0;
document.addEventListener('keydown', e => {
  if (e.defaultPrevented) return;
  if (isTyping(e.target)) { if (e.key === 'Escape' && !e.target.closest('dialog')) { e.target.blur(); setTimeout(paintEdBtn, 0); } return; }
  if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
  if (!singleKeysOn() && e.key.length === 1) return;
  if (e.key === 'Escape' && inEditor()) { document.activeElement.blur(); paintEdBtn(); return; }  // Line Up lines
  if (gAt && Date.now() - gAt < 1500 && NAV_KEYS[e.key]) { gAt = 0; disarmG(); e.preventDefault(); location.hash = '#/' + NAV_KEYS[e.key][0]; return; }
  gAt = 0; disarmG();
  if (e.key === 'g') { gAt = Date.now(); armG(); return; }
  if (e.key === '?') { e.preventDefault(); showKeys(); return; }
  if (e.key === '/') { e.preventDefault(); if (location.hash.startsWith('#/problems')) $('#q')?.focus(); else location.hash = '#/problems'; return; }
  if (e.key === 'e' && focusEditor()) { e.preventDefault(); setTimeout(paintEdBtn, 0); return; }
  if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key) && navListKey(e)) return;
  if (e.key === ' ' && e.target.closest?.('button, a, summary, [role=option], [role=listbox]')) return;  // Space already clicks a focused control
  const b = $$('#app [data-key], header [data-key]').find(b => b.dataset.key === e.key.toLowerCase() && b.offsetParent && !b.disabled);
  if (b) { e.preventDefault(); b.click(); }
});
document.querySelector('[data-help]')?.addEventListener('click', showKeys);
let gTimer = null;
function armG() { document.body.classList.add('g-armed'); clearTimeout(gTimer); gTimer = setTimeout(() => { gAt = 0; disarmG(); }, 1500); paintEdBtn(); }
function disarmG() { if (!document.body.classList.contains('g-armed')) return; document.body.classList.remove('g-armed'); clearTimeout(gTimer); paintEdBtn(); }
// Lists: ↑/↓ move between items (←/→ too in grids); the first ↓ on a page enters its first list.
function navListKey(e) {
  const items = l => $$('[data-item]', l).filter(i => i.offsetParent);
  const cur = document.activeElement?.closest?.('[data-navlist]');
  if (cur && document.activeElement.matches('[data-item]')) {
    const grid = cur.dataset.navlist === 'grid', list = items(cur), k = list.indexOf(document.activeElement);
    let j;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const cols = grid ? (list.filter(i => i.offsetTop === list[0].offsetTop).length || 1) : 1;
      j = k + (e.key === 'ArrowDown' ? cols : -cols);
    } else if (grid) j = k + (e.key === 'ArrowRight' ? 1 : -1);
    else return false;
    e.preventDefault(); list[Math.max(0, Math.min(list.length - 1, j))]?.focus(); return true;
  }
  if (e.key !== 'ArrowDown' || document.activeElement?.closest?.('#app a, #app button, #app summary')) return false;
  const first = $$('#app [data-navlist]').map(items).find(l => l.length)?.[0];
  if (!first) return false;
  e.preventDefault(); first.focus(); return true;
}

// Editor toggle: E jumps into the page's main editor (code box, gap inputs, Line Up lines), Esc leaves it.
const EDITOR_SEL = '#app textarea:not([readonly]), #app .fill input:not([readonly]), #app .lines .ln[tabindex="0"], #app .lines[tabindex="0"]';
let lastEditor = null;
const editorOnPage = () => $$(EDITOR_SEL).filter(x => x.offsetParent);
function focusEditor() {
  const list = editorOnPage().sort((a, b) => b.classList.contains('code') - a.classList.contains('code')); if (!list.length) return false;
  const target = lastEditor && list.includes(lastEditor) ? lastEditor : list[0];
  target.focus(); return true;
}
const inEditor = () => !!document.activeElement?.closest?.('#app') && document.activeElement.matches(EDITOR_SEL.replaceAll('#app ', ''));

// Key bar: always on screen (desktop), lists exactly the keys that work on this screen right now.
// Every chip is also clickable, so it doubles as a button and teaches the key at the same time.
const keybar = document.createElement('nav');
keybar.id = 'keybar'; keybar.setAttribute('aria-label', 'Keyboard shortcuts for this screen');
document.body.append(keybar);
let introSeen = false; try { introSeen = localStorage.getItem('pg-keybar-intro') === '1'; } catch (e) {}
const keyName = k => ({ ' ': 'Space', '[': '[', ',': ',' }[k] || k.toUpperCase());
const chipLabel = el => {
  const c = (el.querySelector('.btn') || el).cloneNode(true); c.querySelectorAll('kbd').forEach(k => k.remove());
  const t = c.textContent.replace(/[←→✓💻✍️🧩⚡🦴🎲]/gu, '').replace(/\s+/g, ' ').trim();
  return t.length > 24 ? t.slice(0, 23) + '…' : t;
};
let kbTargets = [];
function paintKeybar() {
  const chips = []; kbTargets = [];
  const off = !singleKeysOn();
  const add = (keys, label, act, cls = '') => { if (off && keys[0].length === 1 && !'↑↓←→'.includes(keys[0])) return; kbTargets.push(act); chips.push(`<button type="button" class="kchip ${cls}" data-k="${kbTargets.length - 1}" tabindex="-1">${keys.map(k => `<kbd>${esc(k)}</kbd>`).join('')}<span>${esc(label)}</span></button>`); };
  if (editorOnPage().length) {
    if (inEditor()) add(['Esc'], 'leave the editor', () => document.activeElement.blur(), 'on');
    else add(['E'], 'go to the editor', () => focusEditor());
  }
  if (inEditor()) add(['Ctrl', 'Enter'], 'run / check', () => $('#app [data-key="r"]:not([disabled])')?.click());
  const ae = document.activeElement, typing = isTyping(ae) && !inEditor();
  if (document.body.classList.contains('g-armed')) {
    for (const [k, [route, name]] of Object.entries(NAV_KEYS)) add([keyName(k)], name, () => { disarmG(); location.hash = '#/' + route; }, 'on');
    keybar.innerHTML = chips.join(''); return;
  }
  if (typing) {
    const search = ae.type === 'search' || ae.id === 'q';
    add(['Esc'], search && ae.value ? 'clear the search' : search ? 'leave the search box' : 'leave the text box',
      () => { if (search && ae.value) { ae.value = ''; ae.dispatchEvent(new Event('input')); } else ae.blur(); }, 'on');
    if (search) { add(['↓'], 'into the results', () => {}); add(['Enter'], 'open the first result', () => {}); }
  }
  const seen = new Set(), groups = {};
  for (const b of $$('#app [data-key]')) {
    const k = b.dataset.key;
    if (seen.has(k) || !b.offsetParent || b.disabled || ((inEditor() || typing) && k !== 'q')) continue;
    seen.add(k);
    if (b.dataset.kgroup) { (groups[b.dataset.kgroup] ||= []).push(k); continue; }
    add([keyName(k)], chipLabel(b), () => b.click());
  }
  for (const [label, ks] of Object.entries(groups)) add(ks.length > 1 ? [ks[0], '–', ks[ks.length - 1]] : ks, label, () => {});
  if (!inEditor() && !typing && $$('#app [data-navlist] [data-item]').some(i => i.offsetParent)) add(['↑', '↓'], 'move through the list, Enter opens', () => {});
  if (!inEditor()) {
    if ($$('#app .gradebar [data-q]').some(b => b.offsetParent && !b.disabled)) add(['1', '2', '3'], 'grade: blanked / shaky / nailed', () => {});
    if ($$('#app .options button').some(b => b.offsetParent && !b.disabled)) add(['1', '–', '4'], 'pick an option', () => {});
    if ($('#app .parsons')) add(['↑', '↓', 'Enter'], 'move and place lines', () => {}, 'wide');
  }
  if (!inEditor() && !typing) {
    add(['G'], 'then a tab’s letter to change page', () => armG());
    add(['/'], 'search problems', () => { location.hash = '#/problems'; });
  }
  add(['?'], 'all shortcuts', () => showKeys());
  if (off) chips.push('<span class="kintro">Single-key shortcuts are off. Turn them on in Settings.</span>');
  keybar.innerHTML = (introSeen ? '' : `<span class="kintro">New here? Everything works from the keyboard. These are the keys for this screen.
      <button type="button" class="kintro-x" aria-label="Got it, hide this tip">Got it</button></span>`) + chips.join('');
}
keybar.addEventListener('mousedown', e => e.preventDefault());   // keep focus where it is
keybar.addEventListener('click', e => {
  if (e.target.closest('.kintro-x')) { introSeen = true; try { localStorage.setItem('pg-keybar-intro', '1'); } catch (er) {} paintKeybar(); return; }
  const c = e.target.closest('.kchip'); if (c) { kbTargets[+c.dataset.k]?.(); setTimeout(paintKeybar, 0); }
});
const paintEdBtn = () => { clearTimeout(paintEdBtn._t); paintEdBtn._t = setTimeout(paintKeybar, 30); };
document.addEventListener('focusin', e => { if (e.target.matches?.(EDITOR_SEL.replaceAll('#app ', '')) && e.target.closest('#app')) lastEditor = e.target; paintEdBtn(); });
document.addEventListener('focusout', () => setTimeout(paintEdBtn, 0));
window.addEventListener('hashchange', () => { lastEditor = null; setTimeout(paintEdBtn, 50); });
let preTimer = null;
new MutationObserver(() => { clearTimeout(preTimer); preTimer = setTimeout(() => $$('#app pre.code, #app code.hlc').forEach(pre => { if (!pre.closest('.ed') && pre.dataset.painted == null) paintPre(pre); }), 0); })
  .observe(document.getElementById('app'), { childList: true, subtree: true });
new MutationObserver(() => paintEdBtn()).observe(document.getElementById('app'), { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'hidden'] });

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
// LeetCode chip for a problem row (problem lists, course rows, pattern tables).
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
  if (mode === 'prog') return runScript(code, p.stdio.cases);
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

// ─────────────────────────── GAMES ───────────────────────────
const GAMES = {};

// 1. Pattern Sprint — recognise the pattern from the prompt, fast.
GAMES.sprint = {
  name: 'Pattern Sprint', icon: '⚡', layer: 'Idea', cost: 0.3, defaultN: 12,
  desc: 'A problem as an interviewer says it. Name the pattern before the timer runs out, then see the key move.',
  pool: () => C.sprint,
  render(el, s, done, { clock }) {
    const secs = S.settings.sprintSeconds;
    const usedPatterns = [...new Set(C.sprint.map(x => x.pattern))].filter(p => p !== s.pattern);
    const opts = shuffle([s.pattern, ...pick(usedPatterns, 3)]);
    el.innerHTML = `<div class="card">
      <div class="muted small">#${s.num} · combo <span class="combo">${GAMES.sprint.combo || 0}</span></div>
      <div class="prompt">${esc(s.prompt)}</div>
      <div class="timebar"><i style="width:100%"></i></div>
      <div class="options">${opts.map((p, k) => `<button data-p="${p}"><kbd>${k + 1}</kbd> ${esc(PAT(p).name)}</button>`).join('')}</div>
      <div id="rev"></div></div>`;
    const bar = $('.timebar > i', el), noLimit = !!S.settings.sprintNoLimit;
    if (noLimit) bar.parentElement.hidden = true;
    const t0 = Date.now(); let answered = false;
    const iv = setInterval(() => { if (noLimit) { clock.textContent = ((Date.now() - t0) / 1000).toFixed(1); return; } const left = 1 - (Date.now() - t0) / 1000 / secs; bar.style.width = Math.max(0, left * 100) + '%';
      clock.textContent = Math.max(0, secs - (Date.now() - t0) / 1000).toFixed(1); if (left <= 0) answer(null); }, 100);
    onRound(() => clearInterval(iv));
    const answer = p => {
      if (answered) return; answered = true; clearInterval(iv);
      const secsTaken = (Date.now() - t0) / 1000;
      const valid = [s.pattern, ...(s.also || []).map(a => a.pattern)];   // other approaches that also solve it
      const right = valid.includes(p);
      $$('.options button', el).forEach(b => { b.disabled = true; if (valid.includes(b.dataset.p)) b.classList.add('right'); else if (b.dataset.p === p) b.classList.add('wrong'); });
      const q = !right ? 0 : secsTaken > secs * 0.6 ? 1 : 2;
      GAMES.sprint.combo = right ? (GAMES.sprint.combo || 0) + 1 : 0;
      $('#rev', el).innerHTML = `<div class="reveal"><b>${esc(s.title)}</b> → ${patternTag(s.pattern)}<br>
        <span>Key move: ${esc(s.move)}</span>
        ${s.also ? `<div class="also small">${right && p !== s.pattern ? '✓ Yours works too: ' : 'Also works: '}${s.also.map(a => `${patternTag(a.pattern)} ${esc(a.name)}`).join(' · ')}</div>` : ''}
        <div class="muted small">${p === null ? 'Time up.' : right ? `${secsTaken.toFixed(1)}s` : 'Not quite.'}
        ${right && q === 1 ? ' Correct but slow, so counted as shaky.' : ''}</div></div>
        <div class="row" style="margin-top:12px"><button class="primary" id="nx" data-key="n">Next <kbd>Enter</kbd></button></div>`;
      const go = () => { document.removeEventListener('keydown', k2); done(q); };
      const k2 = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
      setTimeout(() => document.addEventListener('keydown', k2), 150); onRound(() => document.removeEventListener('keydown', k2));
      $('#nx', el).onclick = go;
    };
    el.addEventListener('click', e => { const b = e.target.closest('.options button'); if (b) answer(b.dataset.p); });
    const k = e => { if (!answered && singleKeysOn() && !isTyping(e.target) && ['1', '2', '3', '4'].includes(e.key)) answer(opts[+e.key - 1]); };
    document.addEventListener('keydown', k); onRound(() => document.removeEventListener('keydown', k));
  },
};

// 2. Line Up — Parsons problem: put the shuffled solution lines in order.
GAMES.lineup = {
  name: 'Line Up', icon: '🧩', layer: 'Structure', cost: 1.5, defaultN: 4,
  desc: 'The real solution, lines shuffled (indentation kept as a hint). Put them in order. Checked against real tests.',
  pool: () => C.problems,
  render(el, p, done, { clock }) {
    const lines = p.solution.split('\n').filter(t => t.trim()).map((t, i) => ({ t, i }));
    const byId = Object.fromEntries(lines.map(l => [l.i, l]));
    let pool = shuffle(lines), built = [], tries = 0, hint = false, finished = false;
    let cur = { list: 'pool', pos: 0 }, focusAfterDraw = false;  // keyboard cursor (roving focus)
    const timer = startTimer(clock, 0, null, { countUp: true });
    el.innerHTML = `<div class="card"><div class="row"><h2 class="h3">${esc(p.title)}</h2><span class="tag ${p.diff}">${p.diff}</span>
      <span class="spacer"></span><button class="ghost" id="hint" data-key="h">Show pattern <kbd>H</kbd></button></div>
      <p>${esc(p.statement)}</p><div id="hintbox" aria-live="polite"></div>
      <p class="muted small kbd-tip">Drag lines, or use the keyboard: <kbd>↑</kbd><kbd>↓</kbd> move between lines, <kbd>←</kbd><kbd>→</kbd> switch column,
        <kbd>Enter</kbd> moves a line across, <kbd>Alt</kbd>+<kbd>↑</kbd><kbd>↓</kbd> reorders.</p>
      <div class="parsons">
        <div><div class="muted small" id="pool-lbl">Shuffled lines</div><div class="lines" id="pool" role="listbox" aria-labelledby="pool-lbl"></div></div>
        <div><div class="muted small" id="built-lbl">Your solution, top to bottom</div><div class="lines" id="built" role="listbox" aria-labelledby="built-lbl"></div></div></div>
      <div class="row" style="margin-top:12px"><button class="primary" id="check" data-key="r">Run tests <kbd>Ctrl+Enter</kbd></button>
      <button class="ghost" id="giveup"></button><span id="moveon"></span><span class="spacer"></span><span class="muted small" id="cnt"></span></div>
      <div id="ans" hidden></div><div id="out" aria-live="polite"></div></div>`;
    const list = name => name === 'pool' ? pool : built;
    const draw = () => {
      const row = (l, k, name) => `<div class="ln" role="option" data-id="${l.i}" tabindex="${cur.list === name && cur.pos === k ? 0 : -1}">${name === 'built' ? `<span class="num">${k + 1}</span>` : ''}${hlOn() ? highlightLine(l.t) : esc(l.t)}</div>`;
      $('#pool', el).innerHTML = pool.map((l, k) => row(l, k, 'pool')).join('') || '<div class="muted small empty">All lines placed. Run the tests.</div>';
      $('#built', el).innerHTML = built.map((l, k) => row(l, k, 'built')).join('') || '<div class="muted small empty">Drag or press Enter on a line to start. The function signature usually goes first.</div>';
      for (const name of ['pool', 'built']) if (!list(name).length) $('#' + name, el).tabIndex = cur.list === name ? 0 : -1; else $('#' + name, el).removeAttribute('tabindex');
      $('#cnt', el).textContent = `${built.length}/${lines.length} lines`;
      if (focusAfterDraw) { focusAfterDraw = false; ($(`#${cur.list} .ln[tabindex="0"]`, el) || $('#' + cur.list, el)).focus(); }
    };
    const clampCur = () => { const n = list(cur.list).length; cur.pos = Math.max(0, Math.min(cur.pos, n - 1)); };
    const moveAcross = (name, k) => {
      const [l] = list(name).splice(k, 1); if (!l) return;
      (name === 'pool' ? built : pool).push(l);
      cur = { list: name, pos: k }; if (!list(name).length) cur = { list: name === 'pool' ? 'built' : 'pool', pos: (name === 'pool' ? built : pool).length - 1 };
      clampCur(); focusAfterDraw = true; draw();
    };
    // click = move across (kept from before; drag is the other way in)
    for (const name of ['pool', 'built']) $('#' + name, el).addEventListener('click', e => {
      const d = e.target.closest('.ln'); if (!d || d._dragged) return;
      moveAcross(name, list(name).findIndex(l => l.i === +d.dataset.id));
    });
    // keyboard
    el.querySelector('.parsons').addEventListener('keydown', e => {
      const d = e.target.closest('.ln, .lines'); if (!d) return;
      const name = e.target.closest('.lines').id, arr = list(name);
      const k = d.classList.contains('ln') ? arr.findIndex(l => l.i === +d.dataset.id) : 0;
      const go = (lst, pos) => { e.preventDefault(); cur = { list: lst, pos }; clampCur(); focusAfterDraw = true; draw(); };
      if (e.altKey && name === 'built' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        const j = k + (e.key === 'ArrowUp' ? -1 : 1); if (j < 0 || j >= arr.length) return e.preventDefault();
        [arr[k], arr[j]] = [arr[j], arr[k]]; return go('built', j);
      }
      if (e.key === 'ArrowDown') return go(name, k + 1);
      if (e.key === 'ArrowUp') return go(name, k - 1);
      if (e.key === 'Home') return go(name, 0);
      if (e.key === 'End') return go(name, arr.length - 1);
      if (e.key === 'ArrowRight' && name === 'pool') return go('built', Math.min(k, built.length - 1));
      if (e.key === 'ArrowLeft' && name === 'built') return go('pool', Math.min(k, pool.length - 1));
      if ((e.key === 'Enter' && !e.ctrlKey && !e.metaKey) || e.key === ' ') { e.preventDefault(); if (arr.length) moveAcross(name, k); }
    });
    // drag and drop (mouse + touch) via SortableJS; the DOM order is read back into pool / built
    if (window.Sortable) {
      const sync = () => {
        const ids = id => [...$('#' + id, el).querySelectorAll('.ln')].map(d => byId[+d.dataset.id]);
        pool = ids('pool'); built = ids('built'); draw();
      };
      for (const id of ['pool', 'built']) Sortable.create($('#' + id, el), {
        group: 'lineup', draggable: '.ln', animation: 120, delayOnTouchOnly: true, delay: 140,
        ghostClass: 'ln-ghost', chosenClass: 'ln-chosen', onEnd: e => { e.item._dragged = true; setTimeout(() => (e.item._dragged = false), 0); sync(); },
      });
    }
    $('#hint', el).onclick = () => { hint = true; $('#hintbox', el).innerHTML = `<div class="reveal">${patternTag(p.pattern)} ${esc(p.insight)}</div>`; };
    const ans = answerToggle($('#giveup', el), $('#ans', el),
      () => `<pre class="code">${esc(p.solution)}</pre><p>${esc(p.insight)}</p>`,
      () => { if (!finished) $('#moveon', el).append(missedBar(done)); });
    const check = async () => {
      if (finished) return;
      if (pool.length) { toast(`Place all lines first (${pool.length} left)`); return; }
      tries++;
      const r = await runTests(p, built.map(l => l.t).join('\n'), { hidden: false });
      $('#out', el).innerHTML = resultsHtml(r);
      if (r.ok) {
        finished = true; timer.stop();
        if (ans.seen) { $('#moveon', el).innerHTML = ''; $('#out', el).append(missedBar(done, true)); }
        else $('#out', el).append(gradeButtons(done, tries === 1 && !hint ? 2 : 1));
      } else {
        const firstWrong = built.findIndex((l, k) => l.t.trim() !== lines[k].t.trim());
        if (firstWrong >= 0) $('#out', el).insertAdjacentHTML('beforeend', `<p class="muted small">Hint: the first line that differs from the reference is line ${firstWrong + 1}.</p>`);
      }
    };
    $('#check', el).onclick = check;
    const k = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); check(); } };
    document.addEventListener('keydown', k); onRound(() => document.removeEventListener('keydown', k));
    focusAfterDraw = true; draw();
  },
};

// 3. Fill the Gap — the key lines are blank; write them.
GAMES.fill = {
  name: 'Fill the Gap', icon: '✍️', layer: 'Structure → Code', cost: 3, defaultN: 3,
  desc: 'The skeleton is given. The 2-4 lines that make it THIS problem are blank. Write them; real tests decide.',
  pool: () => C.problems,
  gate: p => (item('lineup', p.id)?.box || 0) >= 1,
  render(el, p, done, { clock }) {
    const lines = p.solution.split('\n');
    // Fading: once you've finished this pattern's course, the loop and return lines (the skeleton) are blank too,
    // so you recall the structure instead of reading it. "Show them" fills them back in and counts as a hint.
    const shape = new Set(courseProgress(p.pattern).complete
      ? lines.map((l, i) => i).filter(i => !p.key_lines.includes(i) && /^\s+(for|while)\b|^\s+return\b/.test(lines[i])) : []);
    const key = new Set([...p.key_lines, ...shape]);
    let tries = 0, hint = false, finished = false;
    const timer = startTimer(clock, 0, null, { countUp: true });
    let gapNo = 0;
    el.innerHTML = `<div class="card"><div class="row"><h2 class="h3">${esc(p.title)}</h2><span class="tag ${p.diff}">${p.diff}</span>
      ${patternTag(p.pattern)}<span class="spacer"></span><button class="ghost" id="hint" data-key="h">Hint <kbd>H</kbd></button></div>
      <p>${esc(p.statement)}</p><div id="hintbox" aria-live="polite"></div>
      ${shape.size ? `<p class="muted small fade-note">You’ve finished the ${esc(PAT(p.pattern).name)} course, so the loop and return lines are blank too: write the skeleton from memory.
        <button type="button" class="ghost small" id="unfade">Show them (counts as a hint)</button></p>` : ''}
      <div class="fill">${lines.map((l, i) => {
        if (!key.has(i)) return `<div class="l">${(hlOn() ? highlightLine(l) : esc(l)) || ' '}</div>`;
        const ind = l.match(/^ */)[0]; gapNo++;
        return `<div class="l in"><input type="text" data-i="${i}" autocomplete="off" spellcheck="false" placeholder="gap ${gapNo}" aria-label="Gap ${gapNo}" style="margin-left:${ind.length}ch"></div>
          <div class="l gap-ans" data-for="${i}" hidden style="padding-left:${ind.length}ch"></div>`;
      }).join('')}</div>
      <div class="row" style="margin-top:12px"><button class="primary" id="check" data-key="r">Run tests <kbd>Ctrl+Enter</kbd></button>
      <button class="ghost" id="giveup"></button><span id="moveon"></span></div><div id="out" aria-live="polite"></div></div>`;
    const inputs = $$('.fill input', el);
    inputs.forEach(hlInput);
    inputs[0]?.focus();
    inputs.forEach((inp, k) => inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.ctrlKey) { e.preventDefault(); (inputs[k + 1] || inp).focus(); }
      if (e.key === 'Enter' && e.ctrlKey) check();
    }));
    $('#hint', el).onclick = () => { hint = true; $('#hintbox', el).innerHTML = `<div class="reveal">${esc(p.insight)}<br><span class="muted">Catch: ${esc(p.catch)}</span></div>`; };
    if (shape.size) $('#unfade', el).onclick = e => {
      hint = true; e.currentTarget.remove();
      shape.forEach(i => { const inp = el.querySelector(`input[data-i="${i}"]`); inp.value = lines[i].trim(); inp.readOnly = true; inp.dispatchEvent(new Event('input')); });
    };
    const same = (a, b) => a.replace(/\s+/g, '') === b.replace(/\s+/g, '');
    // Show answer: each gap's answer appears right under it (your text stays), with ✓ when yours already matches.
    const ans = answerToggle($('#giveup', el), null, open => {
      $$('.gap-ans', el).forEach(div => {
        const want = lines[+div.dataset.for].trim(), mine = $(`input[data-i="${div.dataset.for}"]`, el).value.trim();
        div.hidden = !open;
        div.innerHTML = `<span class="gap-tag">${same(mine, want) ? '✓ yours matches' : 'answer'}</span> ${hlOn() ? highlightLine(want) : esc(want)}`;
        div.classList.toggle('ok', same(mine, want));
      });
      if (open) $('#hintbox', el).innerHTML = `<div class="reveal">${esc(p.insight)}<br><span class="muted">Catch: ${esc(p.catch)}</span></div>`;
    }, () => { if (!finished) $('#moveon', el).append(missedBar(done)); }, 'answers');
    const check = async () => {
      if (finished) return; tries++;
      const code = lines.map((l, i) => key.has(i) ? l.match(/^ */)[0] + el.querySelector(`input[data-i="${i}"]`).value.trim() : l).join('\n');
      const r = await runTests(p, code, { hidden: false });
      $('#out', el).innerHTML = resultsHtml(r);
      if (r.ok) {
        finished = true; timer.stop();
        if (ans.seen) { $('#moveon', el).innerHTML = ''; $('#out', el).append(missedBar(done, true)); }
        else $('#out', el).append(gradeButtons(done, tries === 1 && !hint ? 2 : 1));
      }
    };
    $('#check', el).onclick = check;
  },
};

// 4. Skeleton Recall — write the pattern's template from memory.
GAMES.skeleton = {
  name: 'Skeleton Recall', icon: '🦴', layer: 'Structure', cost: 2, defaultN: 2,
  desc: 'Write a pattern’s reusable code template from memory: the state, the loop, the move, the return. Hints step up one at a time; feedback lists exactly what your version is missing.',
  pool: () => C.patterns.map((p, i) => ({ ...p, num: i, diff: 'Medium', pattern: p.id })),
  render(el, pt, done, { clock }) {
    const timer = startTimer(clock, 180, () => toast('⏰ 3 minutes: compare when ready'));
    const exId = STUDY_ORDER.find(id => id !== pt.id && C.patterns.some(x => x.id === id));
    const ex = C.patterns.find(x => x.id === exId);
    const refLines = pt.skeleton.split('\n');
    // hint ladder (progressive: nudge → shape → near-complete). Each step lowers the best grade you can get.
    const hints = [
      { cap: 2, label: 'Nudge', html: () => `<b>Ask yourself:</b><ol>${pt.fill.map(f => `<li>${esc(f)}</li>`).join('')}</ol>` },
      { cap: 1, label: 'Shape', html: () => `<b>The shape</b> (keywords only; ${refLines.length} lines):<pre class="code">${esc(refLines.map(l => {
          const ind = l.match(/^ */)[0], kw = l.trim().match(/^(for|while|if|elif|else|return|def|class|with|try|yield|break|continue)\b/);
          return ind + (kw ? kw[1] + ' …' : '…'); }).join('\n'))}</pre>` },
      { cap: 1, label: 'First lines', html: () => `<b>The first ${Math.ceil(refLines.length / 3)} lines:</b><pre class="code">${esc(refLines.slice(0, Math.ceil(refLines.length / 3)).join('\n'))}</pre>` },
    ];
    let hintLevel = 0;
    el.innerHTML = `<div class="card"><div class="row"><h2 class="h3">Write the ${esc(pt.name)} skeleton</h2><span class="spacer"></span>
        <button class="ghost" id="hint" data-key="h">Hint 1 of 3 <kbd>H</kbd></button></div>
      <div class="brief">
        <p><b>What to write:</b> the template you reuse for <i>every</i> ${esc(pt.name)} problem, not a solution to one problem.
        About ${refLines.length} lines. Use generic names (<code>nums</code>, <code>target</code>, <code>i</code>) and <code>...</code> or a <code># comment</code>
        where a specific problem plugs in its own logic.</p>
        <p class="small"><b>It should show:</b> the state you keep · the loop or recursion · the condition that moves you on · what you return.</p>
        <p class="muted small">Used when: ${pt.triggers.map(esc).join(' · ')}</p>
        ${ex ? `<details><summary class="small">What does a skeleton look like? (example from a different pattern: ${esc(ex.name)})</summary><pre class="code">${esc(ex.skeleton)}</pre></details>` : ''}
      </div>
      <div id="hintbox" aria-live="polite"></div>
      <textarea class="code" id="ed" aria-label="Your skeleton" placeholder="# state you keep&#10;# loop&#10;#     condition that moves you on&#10;# return ..."></textarea>
      <div class="row" style="margin-top:10px"><button class="primary" id="go" data-key="r">Compare <kbd>Ctrl+Enter</kbd></button></div><div id="out" aria-live="polite"></div></div>`;
    const ed = $('#ed', el); enhanceEditor(ed, { onSubmit: () => submit() }); ed.focus();
    $('#hint', el).onclick = () => {
      if (hintLevel >= hints.length) return;
      $('#hintbox', el).insertAdjacentHTML('beforeend', `<div class="reveal small">${hints[hintLevel].html()}</div>`);
      hintLevel++;
      const b = $('#hint', el);
      if (hintLevel >= hints.length) { b.disabled = true; b.innerHTML = 'No more hints'; } else b.innerHTML = `Hint ${hintLevel + 1} of 3 <kbd>H</kbd>`;
      ed.focus();
    };
    // Structural features: what the reference skeleton contains, checked against yours.
    const FEATURES = [
      ['a for loop', /\bfor\b[^\n]*\bin\b/], ['a while loop', /\bwhile\b/], ['a hash map or set', /\{\s*\}|\bdict\(|\bset\(|defaultdict|Counter/],
      ['a deque / queue', /\bdeque\b/], ['a heap', /heapq|heappush|heappop|heapify/], ['a stack (append / pop)', /\.append\(|\.pop\(\)/],
      ['two pointers / bounds', /\b(lo|hi|left|right|l|r|i|j)\s*,\s*(lo|hi|left|right|l|r|i|j)\s*=|\b(lo|hi|left|right)\s*=/],
      ['a midpoint', /\bmid\b\s*=/], ['sorting', /\bsort\(|\bsorted\(/], ['a helper function', /\bdef\b/],
      ['an early exit / condition', /\bif\b/], ['a return', /\breturn\b/], ['a DP table', /\bdp\b|\[\s*0\s*\]\s*\*|\[\s*1\s*\]\s*\*/],
      ['a visited / seen set', /\bvisited\b|\bseen\b/], ['recursion', null],
    ];
    const strip = s => s.replace(/#.*$/gm, '');
    const recursive = code => [...code.matchAll(/\bdef\s+(\w+)/g)].some(m => code.split(m[0])[1]?.includes(m[1] + '('));
    const has = (code, [name, re]) => name === 'recursion' ? recursive(code) : re.test(code);
    let sent = false;
    const submit = () => {
      if (sent) return; sent = true; timer.stop(); ed.readOnly = true;
      const mine = strip(ed.value), ref = strip(pt.skeleton);
      const want = FEATURES.filter(f => has(ref, f));
      const got = want.filter(f => has(mine, f));
      const pct = want.length ? got.length / want.length : 0;
      const lenOk = mine.split('\n').filter(l => l.trim()).length >= Math.ceil(refLines.filter(l => l.trim()).length * 0.6);
      let q = pct >= 0.85 && lenOk ? 2 : pct >= 0.5 ? 1 : 0;
      q = Math.min(q, hintLevel ? hints[hintLevel - 1].cap : 2);
      $('#out', el).innerHTML = `<div class="side" style="margin-top:12px">
        <div><div class="muted small">Reference</div><pre class="code">${esc(pt.skeleton)}</pre></div>
        <div><b>Your skeleton has ${got.length} of ${want.length} parts</b>
          <ul class="checks">${want.map(f => `<li class="${got.includes(f) ? 'ok' : 'miss'}">${got.includes(f) ? '✓' : '✗'} ${esc(f[0])}</li>`).join('')}</ul>
          ${!lenOk ? `<p class="small muted">Yours is much shorter than the reference (${refLines.length} lines). Something is probably missing.</p>` : ''}
          ${hintLevel ? `<p class="small muted">You used ${hintLevel} hint${hintLevel > 1 ? 's' : ''}, so the best grade is ${['Blanked', 'Shaky', 'Nailed'][hints[hintLevel - 1].cap]}.</p>` : ''}
          <p class="muted small">Grade the structure, not variable names. The suggested grade is outlined.</p></div></div>`;
      const maxQ = hintLevel ? hints[hintLevel - 1].cap : 2;
      const bar = gradeButtons(done, q);
      bar.querySelectorAll('button').forEach(b => { if (+b.dataset.q > maxQ) b.disabled = true; });
      $('#out', el).append(bar);
    };
    $('#go', el).onclick = submit;
  },
};

// 5. Syntax Snap — write the Python line; it's executed and checked.
GAMES.syntax = {
  name: 'Syntax Snap', icon: '🐍', layer: 'Syntax', cost: 0.6, defaultN: 5,
  desc: 'One-line Python idioms you need on autopilot: heapq, deque, Counter, sorting keys, slicing. Your code actually runs.',
  pool: () => C.syntax.map((s, i) => ({ ...s, num: i, pattern: s.topic, diff: 'Easy' })),
  render(el, s, done, { clock }) {
    const timer = startTimer(clock, 0, null, { countUp: true });
    let tries = 0, finished = false;
    el.innerHTML = `<div class="card"><div class="muted small">${esc(s.topic)}</div><div class="prompt">${esc(s.prompt)}</div>
      ${s.setup ? `<div class="muted small" style="margin-top:8px">Already defined:</div><pre class="code">${esc(s.setup)}</pre>` : ''}
      <textarea class="code snap" id="ed" placeholder="your code"></textarea>
      <div class="row" style="margin-top:10px"><button class="primary" id="go" data-key="r">Check <kbd>Ctrl+Enter</kbd></button><button class="ghost" id="ans"></button><span id="moveon"></span></div>
      <div id="ansbox" hidden></div><div id="out" aria-live="polite"></div></div>`;
    const ed = $('#ed', el); enhanceEditor(ed, { onSubmit: () => check() }); ed.focus();
    const shown = answerToggle($('#ans', el), $('#ansbox', el), () => `<pre class="code">${esc(s.answer)}</pre>`,
      () => { if (!finished) $('#moveon', el).append(missedBar(done)); });
    const check = async () => {
      if (finished) return; tries++;
      const r = await runSyntax(s, ed.value);
      $('#out', el).innerHTML = r.ok ? `<div class="res">✓ Correct</div><pre class="code">${esc(s.answer)}</pre>` : `<div class="res fail">✗ ${esc(r.error || 'Check failed: ' + s.check)}</div>`;
      if (r.ok) {
        finished = true; timer.stop();
        if (shown.seen) { $('#moveon', el).innerHTML = ''; $('#out', el).append(missedBar(done, true)); }
        else $('#out', el).append(gradeButtons(done, tries === 1 ? 2 : 1));
      }
    };
    $('#go', el).onclick = check;
  },
};

// 6. Big-O Call — pick the time and space complexity of a solution.
GAMES.bigo = {
  name: 'Big-O Call', icon: '⏱️', layer: 'In-person', cost: 0.5, defaultN: 5, focus: 'complexity',
  desc: 'Read a solution and call its time and space complexity, as you will have to say out loud in an interview.',
  pool: () => C.problems,
  render(el, p, done, { clock }) {
    const timer = startTimer(clock, 0, null, { countUp: true });
    const opts = right => shuffle([right, ...pick(C.complexities.filter(c => c !== right), 3)]);
    const to = opts(p.time), so = opts(p.space);
    let pickT = null, pickS = null;
    el.innerHTML = `<div class="card"><div class="row"><h2 class="h3">${esc(p.title)}</h2>${patternTag(p.pattern)}</div>
      <p class="muted small">${esc(p.statement)}</p><pre class="code">${esc(p.solution)}</pre>
      <div class="side"><div><b>Time</b> <span class="muted small">keys 1-4</span><div class="options" id="t">${to.map((c, k) => `<button data-c="${esc(c)}"><kbd>${k + 1}</kbd> ${esc(c)}</button>`).join('')}</div></div>
      <div><b>Space</b> <span class="muted small">(extra, excluding output) · then 1-4</span><div class="options" id="s">${so.map((c, k) => `<button data-c="${esc(c)}"><kbd>${k + 1}</kbd> ${esc(c)}</button>`).join('')}</div></div></div>
      <div id="out" aria-live="polite"></div></div>`;
    const keys = e => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey || !singleKeysOn() || !['1', '2', '3', '4'].includes(e.key)) return;
      if (pickT == null) $$('#t button', el)[+e.key - 1]?.click(); else if (pickS == null) $$('#s button', el)[+e.key - 1]?.click();
    };
    document.addEventListener('keydown', keys); onRound(() => document.removeEventListener('keydown', keys));
    const maybe = () => {
      if (pickT == null || pickS == null) return;
      timer.stop();
      const okT = pickT === p.time, okS = pickS === p.space;
      [['#t', p.time, pickT], ['#s', p.space, pickS]].forEach(([sel, right, mine]) => $$(sel + ' button', el).forEach(b => {
        b.disabled = true; if (b.dataset.c === right) b.classList.add('right'); else if (b.dataset.c === mine) b.classList.add('wrong'); }));
      $('#out', el).innerHTML = `<div class="reveal">Time <b>${esc(p.time)}</b> · Space <b>${esc(p.space)}</b><br>${esc(p.insight)}</div>`;
      const q = okT && okS ? 2 : okT || okS ? 1 : 0;
      const nx = Object.assign(document.createElement('button'), { className: 'primary', innerHTML: 'Next <kbd>N</kbd>' });
      nx.dataset.key = 'n'; nx.style.marginTop = '10px'; nx.onclick = () => done(q);
      $('#out', el).append(nx); nx.focus({ preventScroll: true });
    };
    $('#t', el).onclick = e => { const b = e.target.closest('button'); if (!b || pickT) return; pickT = b.dataset.c; b.style.outline = '2px solid var(--accent)'; maybe(); };
    $('#s', el).onclick = e => { const b = e.target.closest('button'); if (!b || pickS) return; pickS = b.dataset.c; b.style.outline = '2px solid var(--accent)'; maybe(); };
  },
};

// 7. Edge Hunter — list clarifying questions & edge cases, then self-check.
GAMES.edge = {
  name: 'Edge Hunter', icon: '🔍', layer: 'In-person', cost: 1.5, defaultN: 2, focus: 'clarify',
  desc: 'A minute (change it in Settings) to write the clarifying questions and edge cases you would raise, one per line. Scored automatically against the expected list; claiming one it didn’t match counts half.',
  pool: () => C.problems,
  render(el, p, done, { clock }) {
    el.innerHTML = `<div class="card"><div class="row"><h2 class="h3">${esc(p.title)}</h2><span class="tag ${p.diff}">${p.diff}</span></div>
      <p class="prompt" style="font-size:17px">${esc(p.statement)}</p>
      <p class="muted small">One question or edge case per line, specific to this problem (e.g. “what if n is 0?”, not just “edge cases”).</p>
      <textarea id="ed" style="min-height:150px" aria-label="Your questions and edge cases" placeholder="- What if the input is empty?&#10;- Can there be duplicates?&#10;- ..."></textarea>
      <div class="row" style="margin-top:10px"><button class="primary" id="go" data-key="r">Score it <kbd>Ctrl+Enter</kbd></button></div><div id="out" aria-live="polite"></div></div>`;
    const ed = $('#ed', el); ed.focus();
    const lim = S.settings.edgeSeconds ?? 60;
    const timer = lim ? startTimer(clock, lim, () => reveal()) : startTimer(clock, 0, null, { countUp: true });
    let shown = false;
    const reveal = () => {
      if (shown) return; shown = true; timer.stop(); ed.readOnly = true;
      const mineLines = ed.value.split('\n').map(l => l.replace(/^[\s\-*•\d.)]+/, '').trim()).filter(l => l.length > 2);
      const items = [...p.clarify.map(t => ({ t, kind: '❓' })), ...p.edges.map(t => ({ t, kind: '⚠️' }))]
        .map(it => ({ ...it, match: bestEdgeMatch(it.t, mineLines) }));
      const auto = items.filter(it => it.match).length;
      const draw = () => {
        const claimed = items.filter(it => !it.match && it.claimed).length;
        const score = items.length ? (auto + claimed * 0.5) / items.length : 1;
        const q = !mineLines.length ? 0 : score >= 0.75 ? 2 : score >= 0.4 ? 1 : 0;
        $('#out', el).innerHTML = `<h2 class="h3" style="margin-top:14px">You covered ${auto} of ${items.length}${claimed ? ` (+${claimed} claimed, half credit)` : ''}: ${Math.round(score * 100)}%</h2>
          <ul class="checks edge">${items.map((it, i) => `<li class="${it.match ? 'ok' : it.claimed ? 'claim' : 'miss'}">
            <span>${it.match ? '✓' : it.claimed ? '½' : '✗'} ${it.kind} ${esc(it.t)}</span>
            ${it.match ? `<span class="muted small">your line: “${esc(it.match)}”</span>`
              : `<label class="small"><input type="checkbox" data-claim="${i}" ${it.claimed ? 'checked' : ''}> I covered this in other words</label>`}</li>`).join('')}</ul>
          ${!mineLines.length ? '<p class="small" style="color:var(--bad)">Nothing written, so this counts as missed.</p>' : ''}
          <details style="margin-top:8px"><summary>Questions worth asking on any problem</summary><ul>${C.clarify_generic.map(c => `<li>${esc(c)}</li>`).join('')}</ul></details>
          <div class="gradebar"><span class="muted small" style="align-self:center">Grade from your score: <b>${['Blanked', 'Shaky', 'Nailed'][q]}</b></span>
            <button class="primary" id="nx" data-key="n">Next <kbd>N</kbd></button></div>`;
        $$('[data-claim]', el).forEach(c => c.onchange = () => { items[+c.dataset.claim].claimed = c.checked; draw(); });
        $('#nx', el).onclick = () => done(q);
      };
      draw();
      $('#nx', el).focus({ preventScroll: true });
    };
    $('#go', el).onclick = reveal;
    ed.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); reveal(); } });
  },
};

// Bug Hunt — a working solution with one planted bug: run it, find the bug, fix it.
const applyBug = (solution, b) => { const ls = solution.split('\n'); if (b.buggy == null) ls.splice(b.line, 1); else ls[b.line] = b.buggy; return ls.join('\n'); };
GAMES.bughunt = {
  name: 'Bug Hunt', icon: '🐞', layer: 'Full solve', cost: 4, defaultN: 3,
  desc: 'A working solution with one realistic bug planted in it: an off-by-one, a shared list, a missing update, a broken guard. Run it, read the failures (and your prints), and fix it.',
  pool: () => C.problems.flatMap(p => (p.bugs || []).map(b => ({ ...b, pattern: p.pattern, num: p.num, diff: p.diff, title: p.title }))),
  render(el, b, done, { clock }) {
    const p = PROB(b.problem), K = C.bug_kinds[b.kind] || ['Bug', '', ''];
    const timer = startTimer(clock, 0, null, { countUp: true });
    let runs = 0, hints = 0, finished = false, shown = false;
    el.innerHTML = `<div class="solve-grid"><div class="solve-left"><div class="card pcard">${problemPanel(p)}</div></div>
      <div class="solve-right"><p class="bh-intro">This solution has <b>one bug</b>. Run it, work out what’s wrong from the failing tests (add <code>print</code>s if it helps), and fix it.</p>
      <div class="ed-head"><span>Python 3</span><span class="spacer"></span><span class="muted">one bug</span></div>
      <textarea class="code" id="ed" aria-label="The buggy solution">${esc(applyBug(p.solution, b))}</textarea>
      <div class="row" style="margin-top:10px"><button class="primary" id="run" data-key="r">Run tests <kbd>Ctrl+Enter</kbd></button>
        <button class="ghost" id="hint" data-key="h">Hint <kbd>H</kbd></button><button class="ghost" id="show" data-key="a">Show the bug <kbd>A</kbd></button>
        <span id="moveon"></span><span class="spacer"></span><span class="muted small" id="rc"></span></div>
      <div id="hints"></div><div id="out" aria-live="polite"></div></div></div>`;
    const ed = $('#ed', el); enhanceEditor(ed, { onSubmit: () => run() });
    const lineNo = b.line + 1, src = p.solution.split('\n');
    const where = b.buggy == null ? `Something is missing right after <code class="hlc">${esc((src[b.line - 1] || '').trim())}</code>.`
      : `Look closely at <code class="hlc">${esc(b.buggy.trim())}</code>.`;
    const reveal = () => `<div class="reveal"><b>${esc(K[0])}.</b> ${b.buggy == null ? `Line ${lineNo} was deleted:` : `Line ${lineNo}:`}
      ${b.buggy == null ? '' : `<pre class="code cs-one bh-bad">${esc(b.buggy.trim())}</pre>should be`}<pre class="code cs-one">${esc(b.fixed.trim())}</pre>
      <p class="small" style="margin:6px 0 0">${pyMdLite(K[2])}</p></div>`;
    $('#hint', el).onclick = () => {
      if (finished || hints >= 2) return; hints++;
      $('#hints', el).insertAdjacentHTML('beforeend', `<p class="bh-hint">💡 ${hints === 1 ? pyMdLite(K[1]) : where}</p>`);
      if (hints >= 2) $('#hint', el).disabled = true;
    };
    $('#show', el).onclick = () => {
      if (shown) return; shown = true; $('#show', el).disabled = true;
      $('#hints', el).insertAdjacentHTML('beforeend', reveal());
      if (!finished) $('#moveon', el).append(missedBar(done));
    };
    const run = async () => {
      if (finished) return; runs++; $('#rc', el).textContent = `${runs} run${runs > 1 ? 's' : ''}`;
      const r = await runTests(p, ed.value, { hidden: false });
      $('#out', el).innerHTML = resultsHtml(r);
      if (r.ok) {
        finished = true; timer.stop();
        if (!shown) $('#out', el).insertAdjacentHTML('beforeend', reveal());
        if (shown) { $('#moveon', el).innerHTML = ''; $('#out', el).append(missedBar(done, true)); }
        else $('#out', el).append(gradeButtons(done, hints === 0 && runs <= 3 ? 2 : 1));
      }
    };
    $('#run', el).onclick = run;
  },
};

// 8. OA Mode — write the whole thing from a blank editor against the clock.
GAMES.oa = {
  name: 'OA Mode', icon: '💻', layer: 'Full solve', cost: 20, defaultN: 1,
  desc: 'Online-assessment conditions: a statement, a signature, a timer and a run button. No hints unless you give up. Switch the editor to a blank page (function or stdin program) to practise CoderPad and HackerRank conditions.',
  pool: () => C.problems,
  gate: p => (item('fill', p.id)?.box || 0) >= 1,
  render(el, p, done, { clock }) {
    const mins = { Easy: 15, Medium: 25, Hard: 40 }[p.diff] || 25;
    let runs = 0, finished = false;
    let mode = padMode(p); const drafts = {};
    el.innerHTML = `<div class="solve-grid"><div class="solve-left"><div class="card pcard">${problemPanel(p)}<div id="fmt"></div></div></div>
      <div class="solve-right"><div class="ed-head"><span>Python 3</span>${padBar(p)}<span class="spacer"></span><span>${mins} min budget</span></div>
      <textarea class="code" id="ed" aria-label="Your solution"></textarea>
      <div class="row" style="margin-top:10px"><button class="primary" id="run" data-key="r">Run tests <kbd>Ctrl+Enter</kbd></button>
      <button class="ghost" id="give"></button><span id="moveon"></span><span class="spacer"></span><span class="muted small" id="rc"></span></div>
      <div id="sol" hidden></div><div id="out" aria-live="polite"></div></div></div>`;
    const ed = $('#ed', el); ed.value = padStarter(p, mode); enhanceEditor(ed, { onSubmit: () => run() }); ed.focus();
    ed.selectionStart = ed.selectionEnd = ed.value.length - (mode === 'leetcode' ? 1 : 0);
    const showFmt = () => { $('#fmt', el).innerHTML = mode === 'prog' ? padFormat(p) : ''; };
    showFmt();
    $('#pad', el).onchange = e => {
      drafts[mode] = ed.value; mode = e.target.value; S.settings.pad = mode; save();
      ed.value = drafts[mode] ?? padStarter(p, mode); ed._paint?.(); showFmt(); $('#out', el).innerHTML = ''; ed.focus();
    };
    const timer = startTimer(clock, mins * 60, () => toast('⏰ Time budget used: finish up or look at the solution'));
    const sol = answerToggle($('#give', el), $('#sol', el),
      () => `<div class="reveal">${patternTag(p.pattern)} ${esc(p.insight)}<br><span class="muted">Catch: ${esc(p.catch)}</span></div><pre class="code">${esc(padSolution(p, mode))}</pre>${extLinks(p)}`,
      () => { if (!finished) $('#moveon', el).append(missedBar(done)); }, 'solution');
    const finish = q => {
      finished = true; const t = timer.stop();
      $('#out', el).insertAdjacentHTML('beforeend', `<p class="muted small">Time: ${fmtTime(t)} · runs: ${runs}</p>`);
      if (sol.seen) { $('#moveon', el).innerHTML = ''; $('#out', el).append(missedBar(done, true)); } else $('#out', el).append(gradeButtons(done, q));
    };
    const run = async () => {
      if (finished) return; runs++; $('#rc', el).textContent = `${runs} run${runs > 1 ? 's' : ''}`;
      const r = await padRun(p, mode, ed.value);
      $('#out', el).innerHTML = padResultsHtml(mode, r);
      if (r.ok) finish(timer.elapsed() <= mins * 60 && runs <= 3 ? 2 : 1);
    };
    $('#run', el).onclick = run;
  },
};

// 9. Mock Interview — the in-person loop: clarify → plan aloud → code without running → test → complexity → rubric.
GAMES.mock = {
  name: 'Mock Interview', icon: '🎤', layer: 'In-person', cost: 35, defaultN: 1, focus: 'talk',
  desc: 'Full in-person simulation in phases. You talk out loud (record yourself if you like), code with no run button, then self-score on a real rubric.',
  pool: () => C.problems.filter(p => p.diff !== 'Easy' || C.problems.length < 10),
  gate: p => (item('fill', p.id)?.box || 0) >= 1 || (item('lineup', p.id)?.box || 0) >= 2,
  render(el, p, done, { clock }) {
    const phases = [
      { id: 'clarify', name: 'Clarify', mins: 3 }, { id: 'plan', name: 'Plan aloud', mins: 5 },
      { id: 'code', name: 'Code (no run)', mins: 20 }, { id: 'test', name: 'Dry-run & test', mins: 4 }, { id: 'score', name: 'Score', mins: 0 }];
    let ph = 0, timer = null, timerPhase = -1, storeCur = null; const notes = { mode: padMode(p) }; let rec = null, chunks = [], audioUrl = null;
    const draw = () => {
      if (timer && timerPhase !== ph) timer.stop();
      const P = phases[ph];
      const head = `<div class="phase">${phases.map((x, i) => `<span class="${i === ph ? 'on' : i < ph ? 'done' : ''}">${i + 1}. ${x.name}</span>`).join('')}</div>`;
      const side = `<div class="card"><h2 class="h3">Say it out loud</h2><ol class="small" style="padding-left:18px;margin:0">${C.think_aloud.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
        ${S.settings.focus.talk ? `<div class="row" style="margin-top:12px"><button id="rec" data-key="v">${rec ? '⏹ Stop recording' : '🎙 Record myself'} <kbd>V</kbd></button></div>
        ${audioUrl ? `<audio controls src="${audioUrl}" style="width:100%;margin-top:8px"></audio>` : ''}` : ''}</div>`;
      let main = `<div class="card">${problemPanel(p)}`;
      if (P.id === 'clarify') main += `<p class="muted">Before solving: ask your questions. Type them as you say them.</p><textarea id="n" style="min-height:140px" aria-label="Your clarifying questions">${esc(notes.clarify || '')}</textarea>`;
      if (P.id === 'plan') main += `<details open><summary>Answers to typical clarifying questions</summary><ul class="small">${p.clarify.map(c => `<li>${esc(c)}</li>`).join('') || '<li>Standard constraints.</li>'}</ul></details>
        <p class="muted">Say: brute force + its cost → the bottleneck → the pattern → 3-5 step plan. Commit to a complexity.</p>
        <textarea id="n" style="min-height:150px" placeholder="Brute force: ...&#10;Bottleneck: ...&#10;Pattern: ...&#10;Plan: 1) ... 2) ...">${esc(notes.plan || '')}</textarea>
        <div class="row" style="margin-top:8px">Time <select id="ct">${C.complexities.map(c => `<option ${notes.ct === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
        Space <select id="cs">${C.complexities.map(c => `<option ${notes.cs === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>`;
      if (P.id === 'code') main += `${notes.mode === 'prog' ? padFormat(p) : ''}<div class="row"><p class="muted" style="margin:0">Whiteboard rules: no run button, no auto-indent. Narrate what each block is for.</p><span class="spacer"></span>${padBar(p, 'mpad')}</div>
        <textarea class="code" id="n" aria-label="Your code">${esc(notes.code ?? padStarter(p, notes.mode))}</textarea>`;
      if (P.id === 'test') main += `<p class="muted">Trace your code on the example and 2 edge cases, out loud. Fix bugs you find. Still no running.</p>
        <textarea class="code" id="n" aria-label="Your code">${esc(notes.code)}</textarea><textarea id="n2" style="min-height:80px;margin-top:8px" placeholder="Dry-run notes / edge cases tested">${esc(notes.test || '')}</textarea>`;
      if (P.id === 'score') main += `<div id="res"><p class="muted">Running your final code…</p></div><h2 class="h3" style="margin-top:12px">Score yourself (1 = weak, 4 = strong)</h2>
        <table>${C.rubric.map(r => `<tr><td><b>${esc(r.name)}</b><div class="muted small">${esc(r.desc)}</div></td><td style="white-space:nowrap">${[1, 2, 3, 4].map(v =>
          `<label style="margin-right:6px"><input type="radio" name="${r.id}" value="${v}"> ${v}</label>`).join('')}</td></tr>`).join('')}</table>
        <div class="row" style="margin-top:12px"><button class="primary" id="save" data-key="s">Save mock <kbd>S</kbd></button></div>`;
      if (P.id !== 'score') main += `<div class="row" style="margin-top:10px"><button class="primary" id="nextp" data-key="n">Next phase <kbd>N</kbd></button><span class="muted small">Suggested ${P.mins} min</span></div>`;
      main += '</div>';
      el.innerHTML = head + `<div class="side"><div>${main}</div>${side}</div>`;
      const n = $('#n', el);
      if (n) { if (P.id === 'code' || P.id === 'test') enhanceEditor(n, { autoIndent: false }); n.focus(); }
      if (P.mins && timerPhase !== ph) { timer = startTimer(clock, P.mins * 60, () => toast(`⏰ ${P.name}: time to move on`)); timerPhase = ph; }
      const store = storeCur = () => {
        if (P.id === 'clarify') notes.clarify = n.value;
        if (P.id === 'plan') { notes.plan = n.value; notes.ct = $('#ct', el).value; notes.cs = $('#cs', el).value; }
        if (P.id === 'code') notes.code = n.value;
        if (P.id === 'test') { notes.code = n.value; notes.test = $('#n2', el).value; }
      };
      $('#nextp', el) && ($('#nextp', el).onclick = () => { store(); ph++; draw(); });
      $('#mpad', el) && ($('#mpad', el).onchange = e => { store(); const was = notes.mode; notes.mode = S.settings.pad = e.target.value; save();
        if (!notes.code || notes.code === padStarter(p, was)) notes.code = undefined; draw(); });
      $('#rec', el) && ($('#rec', el).onclick = toggleRec);
      if (P.id === 'score') scorePhase();
    };
    const toggleRec = async () => {
      storeCur && storeCur();
      if (rec) { rec.stop(); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunks = []; rec = new MediaRecorder(stream);
        rec.ondataavailable = e => chunks.push(e.data);
        rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); audioUrl = URL.createObjectURL(new Blob(chunks)); rec = null; draw(); toast('Recording saved below (this session only)'); };
        rec.start(); draw(); toast('🎙 Recording: narrate everything');
      } catch (e) { toast('Microphone unavailable'); }
    };
    onRound(() => rec && rec.stop());
    const scorePhase = async () => {
      const r = await padRun(p, notes.mode, notes.code || '');
      const okT = notes.ct === p.time, okS = notes.cs === p.space;
      $('#res', el).innerHTML = padResultsHtml(notes.mode, r) + `<div class="reveal">You said time <b>${esc(notes.ct)}</b> ${okT ? '✓' : '✗'}, space <b>${esc(notes.cs)}</b> ${okS ? '✓' : '✗'}.
        Reference: ${esc(p.time)} / ${esc(p.space)}.<br>${patternTag(p.pattern)} ${esc(p.insight)}</div>
        <details><summary>Reference solution</summary><pre class="code">${esc(padSolution(p, notes.mode))}</pre></details>`;
      $('#save', el).onclick = () => {
        const scores = {}; let missing = false;
        for (const rb of C.rubric) { const v = $(`input[name="${rb.id}"]:checked`, el); if (!v) missing = true; else scores[rb.id] = +v.value; }
        if (missing) { toast('Score every row first'); return; }
        const avg = Object.values(scores).reduce((a, b) => a + b, 0) / C.rubric.length;
        S.mocks.push({ date: today(), problem: p.id, passed: !!r.ok, scores, avg: +avg.toFixed(2), complexity: okT && okS });
        done(r.ok && avg >= 3 ? 2 : r.ok || avg >= 2.5 ? 1 : 0);
      };
    };
    draw();
  },
};

// ─────────────────────────── pages ───────────────────────────
ROUTES.today = app => {
  const plan = currentPlan(), u = urgency(), day1 = !!plan.firstDay, ns = nextStudy(), cp = checkpointDue();
  const total = plan.blocks.reduce((a, b) => a + b.target, 0), doneN = plan.blocks.reduce((a, b) => a + b.done, 0);
  const pct = total ? Math.round(doneN / total * 100) : 0;
  const nextBlock = plan.blocks.find(b => b.done < b.target);
  // Weakest patterns: only ones you've studied or practised, so the list means something.
  const weakest = studyOrder().filter(p => lessonDone(p.id) || mastery(p.id) > 0).map(p => ({ p, m: mastery(p.id) })).sort((a, b) => a.m - b.m).slice(0, 3);
  const blockMin = b => roundMin(b.game, Math.max(0, b.target - b.done));
  const leftMin = plan.blocks.reduce((a, b) => a + blockMin(b), 0) + (day1 && ns ? ns.min : 0);
  const lessonCard = () => {
    if (ns?.primer) return `<a class="card block" href="${ns.href}" style="color:inherit" data-key="l"><div class="icon">⏱️</div>
      <div style="flex:1"><div class="row"><b>Before your first lesson: Big-O basics</b><span class="tag">Study</span></div>
      <div class="muted small">What “O(n)” means, how to work out what your code costs, and the Python operations that are slower than they look. Every lesson after this assumes it.</div>
      <div class="row eta-row">${eta(ns.min, 'read')}</div></div><span class="btn block-go primary">Start <kbd>L</kbd></span></a>`;
    const nl = nextLesson(); if (!nl) return '';
    return `<a class="card block" href="#/study/${nl.id}" style="color:inherit" data-key="l"><div class="icon">📖</div>
      <div style="flex:1"><div class="row"><b>Today's lesson: <span style="color:${pc(nl.color)}">${esc(nl.name)}</span></b><span class="tag">Study</span></div>
      <div class="muted small">Read the lesson, then take the worked example from the brute force to the final answer.${day1 ? '' : ' The games below keep it alive.'}</div>
      <div class="row eta-row">${eta(lessonMin(nl.id), 'lesson')}${courseOf(nl.id).learn ? eta(walkMin(courseOf(nl.id).learn), 'worked example') : ''}${eta(courseMins(nl.id).left, 'left in the whole course')}</div></div>
      <div class="mono" title="Lessons learned">${studyOrder().filter(p => lessonDone(p.id)).length}/${studyOrder().length}</div><span class="btn block-go${day1 ? ' primary' : ''}">Open lesson <kbd>L</kbd></span></a>`;
  };
  const startBtn = day1 && ns ? `<a class="btn primary" href="${ns.href}" data-key="s">▶ ${esc(ns.verb)} <kbd>S</kbd></a>`
    : nextBlock ? `<a class="btn primary" href="#/play/${nextBlock.game}?plan=1" data-key="s">▶ ${pct ? 'Continue' : 'Start'}: ${GAMES[nextBlock.game].name} <kbd>S</kbd></a>`
    : `<a class="btn primary" href="#/games" data-key="s">Extra practice <kbd>S</kbd></a>`;
  app.innerHTML = `
    <div class="hero"><div class="ring" style="--p:${pct}"><div>${pct}%</div></div>
      <div><h1>${pct === 100 ? 'Done for today 🎉' : 'Today’s session'}</h1>
      <p class="muted">${S.settings.minutes} min plan · <b>${esc(u.label)}</b>${u.mode === 'urgent' ? ' · urgent mode: reviews are packed closer together' : ''}</p>
      ${leftMin ? `<p class="hero-eta">${eta(leftMin, day1 ? 'for today: your first lesson and a warm-up' : pct ? 'left today' : 'for today’s practice', { cls: 'pill' })}</p>` : ''}
      <div class="row">${startBtn}
      <a class="btn ghost" href="#/settings" data-key="d">Adjust time / date <kbd>D</kbd></a></div></div></div>
    ${Object.keys(S.study.attempts).length < 3 ? `<a class="guide-cta" href="#/guide" data-key="u"><span class="guide-cta-i" aria-hidden="true">🧭</span>
      <span><b>New here? Read the Starter Guide</b><span class="muted">How the app fits together, the 8-week plan, and what to do when you’re stuck. Start here takes about ${fmtMin(guideTabMin('start'))} to read.</span></span>
      <span class="btn">Open <kbd>U</kbd></span></a>` : ''}
    ${cp || ns?.primer || nextLesson() ? `<h2>Learn</h2>` : ''}
    ${cp ? `<a class="card block checkpoint" href="#/study/mixed" style="color:inherit" data-key="m"><div class="icon">🎲</div>
      <div style="flex:1"><div class="row"><b>Checkpoint: a mystery problem</b><span class="tag">Study</span></div>
      <div class="muted small">You’ve learned ${cp.n} patterns. Solve one problem from any of them with its name and pattern hidden: telling which pattern it is from the statement alone is what an interview tests.</div>
      <div class="row eta-row">${eta(SOLVE_MIN.Medium)}</div></div><span class="btn block-go primary">Start <kbd>M</kbd></span></a>` : ''}
    ${lessonCard()}
    <h2>Practice</h2>
    ${day1 ? '<p class="muted small">The other games practise patterns, so they open after your first lesson. For today: the lesson above, then a Python warm-up.</p>' : ''}
    <div class="grid">${plan.blocks.map((b, bi) => { const g = GAMES[b.game]; const d = dueCount(b.game);
      return `<a class="card block ${b.done >= b.target ? 'done' : ''}" href="#/play/${b.game}?plan=1" style="color:inherit" ${bi < 9 ? `data-key="${bi + 1}" data-kgroup="start a practice block"` : ''}>
        <div class="icon">${g.icon}</div><div style="flex:1"><div class="row"><b>${g.name}</b><span class="tag">${g.layer}</span>
        ${d ? `<span class="tag" style="color:var(--accent)">${d} due</span>` : ''}<span class="spacer"></span>${b.done < b.target ? eta(blockMin(b), b.done ? 'left' : '', { title: paceNote(b.game) }) : eta(roundMin(b.game, b.target), 'a round', { title: paceNote(b.game) })}</div>
        <div class="muted small">${esc(g.desc)}</div><div class="bar"><i style="width:${b.done / b.target * 100}%"></i></div></div>
        <div class="mono">${b.done}/${b.target}</div><span class="btn block-go ${b.done >= b.target ? 'ghost' : b === nextBlock && !day1 ? 'primary' : ''}">${b.done >= b.target ? 'Again' : b.done ? 'Continue' : 'Start'}${bi < 9 ? ` <kbd>${bi + 1}</kbd>` : ''}</span></a>`; }).join('')}</div>
    ${weakest.length ? `<h2>Weakest patterns you’ve studied</h2>
    <div class="grid g3" data-navlist>${weakest.map(({ p, m }) => `<a class="card" href="#/patterns/${p.id}" style="color:inherit" data-item><b style="color:${pc(p.color)}">${esc(p.name)}</b>
      <div class="muted small">${Math.round(m * 100)}% mastery</div><div class="small">${p.triggers.slice(0, 2).map(esc).join(' · ')}</div>
      ${p.lesson ? `<div class="eta-row">${courseMins(p.id).left ? eta(courseMins(p.id).left, 'left in its course') : eta(gameMin('sprint') * 8, 'to drill it')}</div>` : ''}</a>`).join('')}</div>` : ''}`;
};

ROUTES.games = app => {
  app.innerHTML = `<h1>Games</h1><p class="muted">The ladder goes Idea → Structure → Syntax → Full solve → In-person. Each game brings new problems from the patterns you’ve studied first. Use the daily plan, or grind any game here.</p>
    <div class="grid g2">${Object.entries(GAMES).map(([id, g], gi) => `<div class="card"><div class="row"><span style="font-size:26px">${g.icon}</span><h2 class="h3" style="margin:0">${g.name}</h2>
      <span class="tag">${g.layer}</span><span class="spacer"></span>${dueCount(id) ? `<span class="tag" style="color:var(--accent)">${dueCount(id)} due</span>` : ''}</div>
      <p class="muted small">${esc(g.desc)}</p><div class="row"><a class="btn primary" href="#/play/${id}?n=${g.defaultN}" data-key="${(gi + 1) % 10}" data-kgroup="play a game">Play ${g.defaultN > 1 ? g.defaultN + ' rounds' : ''} <kbd>${(gi + 1) % 10}</kbd></a>
      ${g.defaultN > 1 ? `<a class="btn ghost" href="#/play/${id}?n=${g.defaultN * 2}" aria-label="Play ${g.defaultN * 2} rounds, about ${fmtMin(roundMin(id, g.defaultN * 2))}">×${g.defaultN * 2}</a>` : ''}
      <span class="spacer"></span>${eta(roundMin(id, g.defaultN), g.defaultN > 1 ? `for ${g.defaultN}` : '', { title: id === 'oa' ? 'OA Mode gives 15, 25 or 40 minutes by difficulty' : paceNote(id) })}</div></div>`).join('')}</div>`;
};

ROUTES.play = (app, [game], params) => {
  const g = GAMES[game]; if (!g) return ROUTES.games(app);
  let n = +params.n || g.defaultN;
  if (params.plan) { const b = currentPlan().blocks.find(b => b.game === game); if (b) n = Math.max(1, b.target - b.done) || g.defaultN; }
  if (params.problem) { // play a specific problem
    const p = PROBLEM_OR_ITEM(game, params.problem);
    if (p) return runFixed(app, game, p);
  }
  runSession(app, game, n, !!params.plan, params.pattern);
};
function PROBLEM_OR_ITEM(game, id) {
  const pool = GAMES[game].pool();
  // A named problem opens even outside the game's usual pool (Mock skips Easy ones; twists live apart)
  return pool.find(o => o.id === id) || (pool[0]?.solution ? C.everyProblem.find(o => o.id === id) : null);
}
function runFixed(app, game, o) {
  const g = GAMES[game]; const shell = document.createElement('div'); app.append(shell);
  const back = () => history.length > 1 ? history.back() : (location.hash = `#/patterns/${o.pattern}`);
  const mins = game === 'oa' ? solveMin(o) : gameMin(game);
  shell.innerHTML = `<div class="gamehead"><button class="ghost" id="bk" data-key="q" title="Exit (Q)" data-exit-confirm="Your answer to this problem is not saved and won’t count toward your reviews.">← Exit <kbd>Q</kbd></button><h1>${g.icon} ${g.name}</h1><span class="spacer"></span>
    ${eta(mins, '', { title: game === 'oa' ? 'The time budget OA Mode gives this difficulty' : paceNote(game) })}<span class="timer" id="clock"></span></div><div id="b"></div>`;
  $('#bk', shell).onclick = back;
  const shownAt = Date.now();
  g.render($('#b', shell), o, q => { recordPace(game, (Date.now() - shownAt) / 60000); const x = review(game, o.id, q); toast(`+${x} XP`); back(); }, { clock: $('#clock', shell) });
}

// Every problem in one searchable list: solve any of them against the real tests.
ROUTES.problems = (app, _, params) => {
  const st = { q: params.q || '', d: '', p: '' };
  app.innerHTML = `<h1>Problems</h1>
    <p class="muted plede">The ${C.problems.filter(p => !p.onramp).length} problems of the NeetCode 150, ${C.problems.filter(p => p.onramp).length} starter problems that open some courses gently, and ${C.twists.length} twists that appear nowhere else. These are the main list: <b>Solve</b> any of them from a blank editor against the real tests, or drill one with Line Up 🧩 or Fill the Gap ✍️.</p>
    <div class="psearch" role="search">
      <div class="sfield">
        <svg class="sicon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>
        <input type="search" id="q" placeholder="Search by name, number or pattern" aria-label="Search problems" autocomplete="off" spellcheck="false" value="${esc(st.q)}">
        <button type="button" class="sclear" id="clear" aria-label="Clear search" hidden>✕</button>
        <kbd class="skbd skbd-idle" aria-hidden="true">/</kbd><kbd class="skbd skbd-esc" aria-hidden="true">Esc</kbd>
      </div>
      <div class="sfilters">
        <div class="dseg" id="seg" role="radiogroup" aria-label="Difficulty"><span class="dseg-pill" aria-hidden="true"></span>
          ${['', 'Easy', 'Medium', 'Hard'].map(d => `<button type="button" role="radio" data-d="${d}" aria-checked="${d === st.d}" tabindex="${d === st.d ? 0 : -1}">${d || 'All'} <span class="dsegn"></span></button>`).join('')}</div>
        <label class="pselect"><span class="sr">Pattern</span>
          <select id="fp"><option value="">Every pattern</option>${studyOrder().map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label>
        <span class="scount" id="cnt" role="status" aria-live="polite"></span>
      </div>
    </div>
    <div class="plist" id="list"></div>`;
  const q = $('#q'), seg = $('#seg'), pill = $('.dseg-pill', seg);
  const norm = s => s.toLowerCase();
  const matches = (p, text) => !text || norm(`${p.num} ${p.title} ${PAT(p.pattern).name}`).includes(text);
  const mark = (s, text) => { if (!text) return esc(s); const i = norm(s).indexOf(text); return i < 0 ? esc(s) : esc(s.slice(0, i)) + `<mark>${esc(s.slice(i, i + text.length))}</mark>` + esc(s.slice(i + text.length)); };
  const placePill = () => { const b = $(`[data-d="${st.d}"]`, seg); pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft - 4}px)`; };
  const draw = () => {
    const text = norm(st.q.trim());
    const base = C.everyProblem.filter(p => (!st.p || p.pattern === st.p) && matches(p, text));
    const rows = base.filter(p => !st.d || p.diff === st.d);
    for (const b of $$('button', seg)) $('.dsegn', b).textContent = base.filter(p => !b.dataset.d || p.diff === b.dataset.d).length;
    $('#cnt').textContent = (rows.length === C.everyProblem.length ? `${rows.length} problems` : `${rows.length} of ${C.everyProblem.length}`)
      + (rows.length ? ` · about ${fmtMin(rows.reduce((a, p) => a + solveMin(p), 0))} to solve` : '');
    $('#clear').hidden = !st.q;
    $('#list').innerHTML = rows.map(p => `<div class="prow"><span class="muted pnum">${p.num}</span>
      <a class="ptitle" href="#/play/oa?problem=${p.id}" title="Solve against the tests"><span>${mark(p.title, text)}</span></a>
      <span class="tag ${p.diff}">${p.diff}</span>${patternTag(p.pattern)}${p.twist_of ? '<span class="tag twist" title="A variation that appears nowhere else in the app">Twist</span>' : ''}<span class="spacer"></span>
      ${p.lc ? `<a class="ext pext" href="https://leetcode.com/problems/${p.lc.slug}/" target="_blank" rel="noopener" tabindex="-1"
        title="${p.twist_of ? 'Closest LeetCode problem' : 'Open on LeetCode'}${p.lc.paid ? ' (Premium)' : ''}" aria-label="LeetCode ${p.lc.num}: ${esc(p.lc.title)}">LC ${p.lc.num}${p.lc.paid ? ' 🔒' : ''}</a>` : ''}
      <span title="How well you know it">${dots(problemLevel(p.id))}</span>
      ${eta(solveMin(p), '', { title: `The time budget for a ${p.diff} problem, as in an online assessment`, cls: 'peta' })}
      <a class="btn ghost" href="#/play/lineup?problem=${p.id}" title="Line Up, about ${fmtMin(gameMin('lineup'))}" aria-label="Line Up: ${esc(p.title)}, about ${fmtMin(gameMin('lineup'))}">🧩</a>
      <a class="btn ghost" href="#/play/fill?problem=${p.id}" title="Fill the Gap, about ${fmtMin(gameMin('fill'))}" aria-label="Fill the Gap: ${esc(p.title)}, about ${fmtMin(gameMin('fill'))}">✍️</a>
      <a class="btn primary" href="#/play/oa?problem=${p.id}" tabindex="-1">Solve</a></div>`).join('')
      || `<div class="pempty"><p>No problem matches${st.q ? ` “${esc(st.q.trim())}”` : ''}${st.d ? ` at ${st.d}` : ''}${st.p ? ` in ${esc(PAT(st.p).name)}` : ''}.</p>
          <button type="button" id="reset">Clear the filters</button></div>`;
    $('#reset') && ($('#reset').onclick = () => { st.q = ''; st.d = ''; st.p = ''; q.value = ''; $('#fp').value = ''; setD(''); q.focus(); });
    placePill();
  };
  const setD = d => {
    st.d = d;
    for (const b of $$('button', seg)) { const on = b.dataset.d === d; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; }
    draw();
  };
  q.addEventListener('input', () => { st.q = q.value; draw(); });
  q.addEventListener('keydown', e => {
    if (e.key === 'Escape' && q.value) { e.preventDefault(); e.stopPropagation(); q.value = ''; st.q = ''; draw(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); $$('#list .ptitle')[0]?.focus(); }
    if (e.key === 'Enter') { e.preventDefault(); $$('#list .ptitle')[0]?.click(); }
  });
  $('#clear').onclick = () => { q.value = ''; st.q = ''; draw(); q.focus(); };
  seg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setD(b.dataset.d); });
  seg.addEventListener('keydown', e => {   // radio group: arrows move the selection
    const bs = $$('button', seg), k = bs.findIndex(b => b.dataset.d === st.d);
    const j = e.key === 'ArrowRight' ? (k + 1) % bs.length : e.key === 'ArrowLeft' ? (k + bs.length - 1) % bs.length : -1;
    if (j >= 0) { e.preventDefault(); setD(bs[j].dataset.d); bs[j].focus(); }
  });
  $('#fp').onchange = e => { st.p = e.target.value; draw(); };
  $('#list').addEventListener('keydown', e => {
    const t = $$('#list .ptitle'), k = t.indexOf(document.activeElement); if (k < 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); t[k + 1]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (k ? t[k - 1] : q).focus(); }
  });
  const ro = new ResizeObserver(placePill); ro.observe(seg); onLeave(() => ro.disconnect());
  draw();
  if (params.focus !== '0') q.focus();
};

// Where you are in a pattern's Study course, in a few words (Patterns tab tiles and pattern pages).
function courseStatus(pid) {
  if (!PAT(pid).lesson) return '';
  const pr = courseProgress(pid);
  if (pr.complete) return '✓ done';
  const done = pr.stages.reduce((a, s) => a + s.done, 0), of = pr.stages.reduce((a, s) => a + s.of, 0);
  return done ? `${done} of ${of} steps` : 'not started';
}

ROUTES.patterns = (app, [pid]) => {
  if (pid) {
    const p = PAT(pid);
    const nx = p.lesson ? nextStep(pid) : null;
    const courseCard = p.lesson ? `<div class="card course-link"><div><h2 class="h3">📖 Study course</h2>
        <p class="small muted">Course ${esc(courseStatus(pid))}${nx ? ` · Next: ${esc(nx.label)}` : ''}</p></div>
        <div class="row"><a class="btn primary" href="#/study/${pid}" data-key="s">${courseProgress(pid).complete || !nx || nx.href === `#/study/${pid}` ? 'Open the course' : 'Course page'} <kbd>S</kbd></a>
        ${nx && nx.href !== `#/study/${pid}` ? `<a class="btn" href="${nx.href}" data-key="c">${esc(nx.verb)}${etaIn(nx.min)} <kbd>C</kbd></a>` : ''}</div></div>` : '';
    const probs = C.problems.filter(x => x.pattern === pid);
    const cards = C.sprint.filter(x => x.pattern === pid);
    app.innerHTML = `<a href="#/patterns">← All patterns</a><h1 style="color:${pc(p.color)}">${esc(p.name)}</h1>
      <p class="muted">${Math.round(mastery(pid) * 100)}% mastery</p>
      ${courseCard}
      <div class="row eta-row"><span id="page-eta"></span>${probs.length ? eta(probs.reduce((a, x) => a + solveMin(x), 0), `to solve all ${probs.length}`, { title: 'OA budgets: 15 min Easy, 25 Medium, 40 Hard' }) : ''}</div>
      <div class="side"><div><h2 class="h3">Skeleton</h2><pre class="code">${esc(p.skeleton)}</pre></div>
      <div class="card"><h2 class="h3">Reach for it when</h2><ul>${p.triggers.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      <h2 class="h3">To fill the skeleton, answer</h2><ol>${p.fill.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
      <a class="btn" href="#/play/skeleton?problem=${pid}" data-key="r">🦴 Recall this skeleton${etaIn(gameMin('skeleton'))} <kbd>R</kbd></a></div></div>
      <h2>Coded problems (${probs.length})</h2>
      ${probs.length ? `<table><tr><th>#</th><th>Problem</th><th>Level</th><th>Practise</th></tr>${probs.map(x => `<tr><td>${x.num}</td>
        <td>${esc(x.title)} <span class="tag ${x.diff}">${x.diff}</span> ${lcChip(x)} ${eta(solveMin(x))}<details><summary class="small">Insight & solution</summary><p>${esc(x.insight)}</p>
        <p class="muted">Catch: ${esc(x.catch)}</p><pre class="code">${esc(x.solution)}</pre></details></td>
        <td>${dots(problemLevel(x.id))} <span class="small muted">${LEVEL_NAMES[[0, 1, 2, 4, 6][problemLevel(x.id)]]}</span></td>
        <td><div class="row practise"><a href="#/play/lineup?problem=${x.id}" title="Line Up" aria-label="Line Up">🧩</a><a href="#/play/fill?problem=${x.id}" title="Fill the Gap" aria-label="Fill the Gap">✍️</a><a href="#/play/oa?problem=${x.id}" title="OA Mode" aria-label="OA Mode">💻</a><a href="#/play/mock?problem=${x.id}" title="Mock Interview" aria-label="Mock Interview">🎤</a></div></td></tr>`).join('')}</table>`
        : '<p class="muted">No coded problems yet. Sprint cards only.</p>'}
      <h2>Sprint cards (${cards.length})</h2><div class="small">${cards.map(c => `<div style="padding:4px 0"><b>${c.num}. ${esc(c.title)}</b> ${lcChip(C.problems.find(x => x.title === c.title || x.lc?.title === c.title))}: <span class="muted">${esc(c.move)}</span></div>`).join('')}</div>`;
    return;
  }
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  app.innerHTML = `<h1>Patterns</h1><p class="muted">The ${C.patterns.length} patterns behind the NeetCode 150, in the Study path’s order. Each tile shows how well you know it across every game; open one for its template and all of its problems, or go straight to its <a href="#/study">Study</a> course.</p>
    <div class="heat" data-navlist="grid">${studyOrder().map(p => { const m = mastery(p.id), nC = C.sprint.filter(x => x.pattern === p.id).length, cs = courseStatus(p.id);
      return `<div class="tile" style="background:color-mix(in srgb, ${p.color} ${Math.round(8 + m * 60)}%, var(--panel))"><a class="tile-main" href="#/patterns/${p.id}" data-item>
      <b>${Math.round(m * 100)}%</b>${esc(p.name)}<div class="small muted">${plural(C.problems.filter(x => x.pattern === p.id).length, 'problem')}${nC ? ` · ${plural(nC, 'Sprint card')}` : ''}</div>
      <div class="small muted">${CLOCK}<span class="sr">About </span>${fmtMin(C.problems.filter(x => x.pattern === p.id).reduce((a, x) => a + solveMin(x), 0))} to solve them</div></a>
      ${cs ? `<a class="tile-study" href="#/study/${p.id}" aria-label="Study course for ${esc(p.name)}: ${esc(cs)}"><span>📖 Study course →<span class="small muted"> ${esc(cs)}</span></span></a>` : ''}</div>`; }).join('')}</div>`;
};

ROUTES.stats = app => {
  const days = Array.from({ length: 30 }, (_, i) => addDays(today(), i - 29));
  const maxXp = Math.max(1, ...days.map(d => S.days[d]?.xp || 0));
  const items = Object.entries(S.items);
  const byGame = {}; for (const [k, v] of items) { const g = k.split(':')[0]; (byGame[g] ||= []).push(v); }
  const weak = items.filter(([, v]) => v.lapses > 0).sort((a, b) => b[1].lapses - a[1].lapses || a[1].box - b[1].box).slice(0, 10);
  const nameOf = k => { const [g, id] = k.split(':'); const o = GAMES[g]?.pool().find(x => x.id === id); return `${GAMES[g]?.icon || ''} ${esc(o?.title || o?.name || o?.prompt || id)}`; };
  app.innerHTML = `<h1>Stats</h1>
    <div class="grid g3">
      <div class="card"><div class="muted small">Level</div><b style="font-size:28px">${level(S.xp)}</b><div class="muted small">${S.xp} XP total</div></div>
      <div class="card"><div class="muted small">Streak</div><b style="font-size:28px">🔥 ${S.streak.count}</b><div class="muted small">best ${S.streak.best || 0}</div></div>
      <div class="card"><div class="muted small">Items in rotation</div><b style="font-size:28px">${items.length}</b><div class="muted small">${items.filter(([, v]) => v.box >= 5).length} locked in (box ≥ 5)</div></div>
      <div class="card"><div class="muted small">Mock interviews</div><b style="font-size:28px">${S.mocks.length}</b><div class="muted small">${S.mocks.length ? 'avg rubric ' + (S.mocks.reduce((a, m) => a + m.avg, 0) / S.mocks.length).toFixed(1) + '/4' : 'none yet'}</div></div>
    </div>
    <h2>Last 30 days</h2><div class="days">${days.map(d => { const x = S.days[d]?.xp || 0;
      return `<i title="${d}: ${x} XP" style="background:${x ? `color-mix(in srgb, var(--accent) ${Math.round(25 + 75 * x / maxXp)}%, var(--panel2))` : ''}"></i>`; }).join('')}</div>
    <h2>Per game</h2><table><tr><th>Game</th><th>Seen</th><th>Due today</th><th>Avg box</th></tr>${Object.entries(GAMES).map(([id, g]) => { const a = byGame[id] || [];
      return `<tr><td>${g.icon} ${g.name}</td><td>${a.length}/${g.pool().length}</td><td>${dueCount(id)}</td><td>${a.length ? (a.reduce((s, v) => s + v.box, 0) / a.length).toFixed(1) : '-'}</td></tr>`; }).join('')}</table>
    <h2>Most-missed items</h2>${weak.length ? `<table><tr><th>Item</th><th>Misses</th><th>Box</th><th>Due</th></tr>${weak.map(([k, v]) => `<tr><td>${nameOf(k)}</td><td>${v.lapses}</td><td>${v.box}</td><td>${v.due}</td></tr>`).join('')}</table>` : '<p class="muted">Nothing missed yet.</p>'}
    ${S.mocks.length ? `<h2>Mock history</h2><table><tr><th>Date</th><th>Problem</th><th>Tests</th><th>Complexity</th><th>Rubric</th></tr>${S.mocks.slice().reverse().map(m => `<tr><td>${m.date}</td>
      <td>${esc(PROB(m.problem)?.title || m.problem)}</td><td>${m.passed ? '✓' : '✗'}</td><td>${m.complexity ? '✓' : '✗'}</td><td>${m.avg}/4 <span class="muted small">${Object.entries(m.scores).map(([k, v]) => k + ' ' + v).join(' · ')}</span></td></tr>`).join('')}</table>` : ''}`;
};

ROUTES.settings = app => {
  const st = S.settings;
  app.innerHTML = `<h1>Settings</h1><div class="row eta-row">${eta(2, 'to set up', { title: 'Pick a date, a daily time and your focus: about two minutes' })}</div>
    <div class="grid" style="max-width:720px">
    <div class="card"><h2 class="h3">Urgency</h2><p class="muted small">Your next OA or interview. Within 14 days, the app goes into urgent mode and reviews are packed closer together so everything gets a few reps before the date.</p>
      <div class="row"><input type="date" id="date" aria-label="Interview date" value="${st.interviewDate || ''}"><button id="nodate" class="ghost">No date</button>
      ${[7, 14, 30].map(d => `<button class="ghost" data-d="${d}">+${d}d</button>`).join('')}</div></div>
    <div class="card"><h2 class="h3">Daily time: <span id="mv">${st.minutes}</span> min</h2><input type="range" class="slider" id="min" aria-label="Daily time in minutes" min="10" max="120" step="5" value="${st.minutes}">
      <p class="muted small">The daily plan is rebuilt from this. Mock interviews show up at 70+ min (55+ in urgent mode); OA Mode shows up around 45+ min.</p></div>
    <div class="card"><h2 class="h3">In-person focus</h2><p class="muted small">Turning these on adds their drills to the daily plan.</p><div class="checklist">
      ${[['talk', 'Talking while coding (mock interviews, recording)'], ['clarify', 'Clarifying questions & edge cases (Edge Hunter)'],
         ['complexity', 'Complexity analysis (Big-O Call)'], ['noide', 'No-IDE coding & nerves (mock interviews, OA timer)']].map(([k, l]) =>
        `<label><input type="checkbox" data-f="${k}" ${st.focus[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
    <div class="card"><h2 class="h3">New items per day, per game: <span id="nv">${st.newPerDay}</span></h2><input type="range" class="slider" id="new" aria-label="New items per day, per game" min="1" max="12" value="${st.newPerDay}">
      <p class="muted small">Pattern Sprint gets 3× this. Reviews always come first; new items fill the rest.</p></div>
    <div class="card"><h2 class="h3">Time limits</h2>
      <p class="muted small">Timed games train speed. Lengthen or remove a limit whenever you need more time.</p>
      <p class="setrow">Pattern Sprint: <b><span id="sv">${st.sprintSeconds}</span> s</b> per card</p>
      <input type="range" class="slider" id="sec" aria-label="Pattern Sprint seconds per card" min="6" max="30" value="${st.sprintSeconds}" ${st.sprintNoLimit ? 'disabled' : ''}>
      <label class="checkrow"><input type="checkbox" id="sprintnl" ${st.sprintNoLimit ? 'checked' : ''}> No time limit in Pattern Sprint</label>
      <label class="setrow" for="edgesec">Edge Hunter</label>
      <select id="edgesec">${[[60, '60 seconds'], [120, '2 minutes'], [180, '3 minutes'], [0, 'No time limit']].map(([v, l]) => `<option value="${v}" ${(st.edgeSeconds ?? 60) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="card"><fieldset class="theme-pick"><legend><h2 class="h3">Theme</h2></legend>
      ${[['system', 'System', 'follows your device'], ['light', 'Light', ''], ['dark', 'Dark', '']].map(([v, l, d]) =>
        `<label class="checkrow"><input type="radio" name="theme" value="${v}" ${PGTheme.get() === v ? 'checked' : ''}> ${l}${d ? ` <span class="muted small">${d}</span>` : ''}</label>`).join('')}
      <p class="muted small">Kept in this browser. Other open tabs switch too.</p></fieldset></div>
    <div class="card"><h2 class="h3">Keyboard</h2>
      <label class="checkrow"><input type="checkbox" id="singlekeys" ${st.singleKeys !== false ? 'checked' : ''}> Single-key shortcuts (S, A, N, 1–9 and so on)</label>
      <p class="muted small">Turn these off if you use speech input or tend to press keys by accident. Ctrl+Enter, Esc, Enter, Tab and the arrow keys keep working.</p></div>
    <div class="card" id="acct" hidden></div>
    <div class="card"><h2 class="h3">Data</h2><p class="muted small">${SERVER ? 'Progress is saved in progress.json next to server.py'
      : 'Progress is saved in this browser'}${Cloud.signedIn ? ' and synced to your account.' : SERVER ? '.'
      : ' only. Sign in above to sync it, or download a backup and use Restore on the other device.'}</p>
      <div class="row"><button id="export" data-key="b">Download backup <kbd>B</kbd></button><button id="import" data-key="r">Restore from backup <kbd>R</kbd></button>
      <input type="file" id="importfile" aria-label="Backup file to restore" accept=".json,application/json" hidden><button class="bad" id="reset">Reset all progress</button></div></div>
    </div>`;
  const rebuild = () => { if (S.plan) S.plan.minutes = -1; save(); }; // forces rebuild, keeps today's progress
  $('#date').onchange = e => { st.interviewDate = e.target.value || null; rebuild(); toast('Urgency updated'); };
  $('#nodate').onclick = () => { st.interviewDate = null; $('#date').value = ''; rebuild(); toast('No interview date'); };
  $$('[data-d]').forEach(b => b.onclick = () => { st.interviewDate = addDays(today(), +b.dataset.d); $('#date').value = st.interviewDate; rebuild(); toast('Urgency updated'); });
  $('#min').oninput = e => { st.minutes = +e.target.value; $('#mv').textContent = st.minutes; };
  $('#min').onchange = rebuild;
  $('#new').oninput = e => { st.newPerDay = +e.target.value; $('#nv').textContent = st.newPerDay; save(); };
  $('#sec').oninput = e => { st.sprintSeconds = +e.target.value; $('#sv').textContent = st.sprintSeconds; save(); };
  $('#sprintnl').onchange = e => { st.sprintNoLimit = e.target.checked; $('#sec').disabled = e.target.checked; save(); toast(e.target.checked ? 'Pattern Sprint: no time limit' : 'Pattern Sprint: timed'); };
  $('#edgesec').onchange = e => { st.edgeSeconds = +e.target.value; save(); toast('Edge Hunter: ' + e.target.selectedOptions[0].text); };
  $$('input[name=theme]').forEach(r => r.onchange = () => { PGTheme.set(r.value); toast(`Theme: ${{ system: 'follows your device', light: 'light', dark: 'dark' }[r.value]}`); });
  $('#singlekeys').onchange = e => { st.singleKeys = e.target.checked; save(); toast(e.target.checked ? 'Single-key shortcuts on' : 'Single-key shortcuts off'); };
  $$('[data-f]').forEach(c => c.onchange = () => { st.focus[c.dataset.f] = c.checked; rebuild(); });
  $('#export').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' })); a.download = `pattern-gym-${today()}.json`; a.click(); };
  $('#import').onclick = () => $('#importfile').click();
  $('#importfile').onchange = async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    let data;
    try { data = JSON.parse(await f.text()); } catch (err) { toast('That file isn’t valid JSON'); return; }
    if (!data || typeof data !== 'object' || Array.isArray(data) || !('items' in data || 'settings' in data)) { toast('That doesn’t look like a Pattern Gym backup'); return; }
    const where = Cloud.signedIn ? ' here and in your account' : '';
    if (!confirm(`Replace your current progress${where} with this backup? (Download a backup first if you want to keep it.)`)) return;
    S = normalizeState(data); markSettingsSeen(); save(); Cloud.overwrite(); toast('Backup restored'); route();
  };
  $('#reset').onclick = () => {
    const where = Cloud.signedIn ? ' here and in your account' : '';
    if (confirm(`Erase ALL progress, XP and streaks${where}? This cannot be undone.`)) {
      const s = S.settings; S = structuredClone(DEFAULTS); S.settings = s; markSettingsSeen(); save(); Cloud.overwrite(); toast('Progress reset');
    }
  };
  Cloud.drawAccount($('#acct'));
};

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
  const cur = studyOrder().find(p => nextStep(p.id));
  return cur ? { ...nextStep(cur.id), pattern: cur } : null;
}
// Checkpoints: after every 4 lessons, one mystery problem (names hidden) from everything learned so far.
// Done when a mystery problem is attempted; recorded in S.study.lessons as 'checkpoint:<k>' so sync merges it.
const CHECK_EVERY = 4;
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
const mixedPool = () => studyOrder().filter(p => lessonDone(p.id)).flatMap(p => { const c = courseOf(p.id); return [...(c.transfer ? [c.transfer] : []), ...c.guided, ...c.solo]; });

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

ROUTES.study = (app, [a, b], params) => {
  if (a === 'bigo') return studyBigO(app);
  if (a === 'solve' && b) return studySolve(app, b, params);
  if (a === 'guided' && b) return studyGuided(app, b);
  if (a === 'mixed') {
    const pool = mixedPool(); if (!pool.length) return studyHome(app);
    const fresh = pool.filter(p => !attempted(p.id)), freshTwists = fresh.filter(p => p.twist_of);   // unseen twists are the truest test
    const pick = shuffle(freshTwists.length ? freshTwists : fresh.length ? fresh : pool)[0];
    location.replace(location.pathname + location.search + `#/study/solve/${pick.id}?mixed=1`);
    return;
  }
  if (a && b) return studyWalk(app, a, b, params);
  if (a) return studyCourse(app, a);
  studyHome(app);
};

// **bold** and `code` inside plain text (primers).
const inlineMd = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code class="hlc">$1</code>');
// Lines of prose: each line is a paragraph, and a run of lines starting "- " becomes one bulleted list.
function proseHtml(lines) {
  let h = '', list = [];
  const flush = () => { if (list.length) h += `<ul>${list.map(x => `<li>${inlineMd(x)}</li>`).join('')}</ul>`; list = []; };
  for (const l of lines) { if (l.startsWith('- ')) list.push(l.slice(2)); else { flush(); h += `<p>${inlineMd(l)}</p>`; } }
  flush(); return h;
}
function bigoHtml() {
  return C.bigo_primer.map(sec => `<section class="stage"><h2>${esc(sec.title)}</h2><div class="prose">${proseHtml(sec.paras)}</div>
    ${sec.title.startsWith('Read the constraints') ? `<table><tr><th>Constraint</th><th>Aim for</th><th>Usually means</th></tr>${C.input_size.map(r => `<tr><td class="mono">${esc(r[0])}</td><td class="mono">${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</table>` : ''}</section>`).join('');
}
const bigoMin = () => readMin(bigoHtml()) + C.bigo_check.length * 0.5;   // plus ~30 s to answer each check question
function studyBigO(app) {
  const first = studyOrder()[0];
  app.innerHTML = `<div class="study course"><a href="#/study" class="crumb">← Study</a>
    <div class="course-head"><h1>Big-O basics</h1>
      <p class="lede">Every lesson, walkthrough and interview talks about what code costs. This is the background they assume: read it once before your first course.</p>
      <p class="eta-row">${eta(bigoMin(), 'to read and check yourself')}</p></div>
    ${bigoHtml()}
    <section class="stage"><h2>Check yourself</h2><p class="muted">Answer each in your head, then open it.</p>
      ${C.bigo_check.map(([q, a]) => `<details class="check"><summary>${inlineMd(q)}</summary><p>${inlineMd(a)}</p></details>`).join('')}
      <p class="small">More: <a href="https://usaco.guide/bronze/time-comp" target="_blank" rel="noopener">Time complexity on the USACO Guide ↗</a> · the <a href="#/cheatsheet">Cheatsheet</a> has the cost of every Python operation.</p></section>
    <div class="row" style="margin-top:20px"><button class="${lessonDone('bigo') ? 'ghost' : 'good'}" id="mark" data-key="l">${lessonDone('bigo') ? 'Mark as not read' : '✓ Got it'} <kbd>L</kbd></button>
      <span class="spacer"></span><a class="btn primary" href="#/study/${first.id}" data-key="]">First course: ${esc(first.name)} → <kbd>]</kbd></a></div></div>`;
  $('#mark', app).onclick = () => {
    if (lessonDone('bigo')) { delete S.study.lessons.bigo; save(); studyBigO((app.innerHTML = '', app)); return; }
    S.study.lessons.bigo = today(); addXP(10); toast('⏱️ Big-O done +10 XP'); save(); location.hash = `#/study/${first.id}`;
  };
}

function studyHome(app) {
  const order = studyOrder();
  const nx = nextStudy(), cur = nx?.pattern, cp = checkpointDue();
  const studied = order.filter(p => lessonDone(p.id)).length, pool = mixedPool();
  const untried = pool.filter(p => !attempted(p.id)).length;
  const syntaxByTopic = {};
  for (const s of C.syntax) (syntaxByTopic[s.topic] ||= []).push(s);
  app.innerHTML = `<div class="study">
    <div class="study-head"><h1>Study</h1>
      <p class="lede">The course. Start at the top and go in order: each pattern is a short course with the idea, one worked example taken
        from the brute force to the final answer, guided problems, then problems you solve cold before seeing any explanation.</p></div>
    ${nx ? `<a class="continue" href="${nx.href}" data-key="c">
        ${!cur || nx.label.includes(cur.name) ? "" : `<span class="continue-pattern" style="color:${pc(cur.color)}">${esc(cur.name)}</span>`}
        <span class="continue-what">${esc(nx.label)} ${eta(nx.min)}</span>
        <span class="btn primary continue-go">${esc(nx.verb)} <kbd>C</kbd></span></a>`
      : `<div class="continue"><span class="continue-what">Every course is complete. Mixed practice is where you keep sharp now.</span></div>`}
    <section class="mixed ${pool.length ? '' : 'locked'}${cp ? ' due' : ''}">
      <div><h2>Mixed practice${cp ? ' <span class="tag">Checkpoint due</span>' : ''}</h2>
        <p>${studied ? `${cp ? `You’ve learned ${cp.n} patterns: time for a checkpoint. ` : ''}A random problem from the ${studied} pattern${studied > 1 ? 's' : ''} you’ve studied, with its name and pattern hidden, so you have to work out the approach yourself.
          ${untried} you haven’t tried yet. A checkpoint comes up after every ${CHECK_EVERY} lessons.`
          : 'Opens after your first lesson. It picks problems from every pattern you’ve studied and hides their names, so you work out the approach yourself, like in a real interview.'}</p></div>
      ${pool.length ? `<a class="btn${cp ? ' primary' : ''}" href="#/study/mixed" data-key="m">Start a mystery problem${etaIn(SOLVE_MIN.Medium)} <kbd>M</kbd></a>` : ''}</section>
    <section><h2>The path</h2>
      <p class="muted small">In order: each course builds on the ones before it (Recursion comes before trees, backtracking and DP; Heap before shortest paths).
        The bar under each shows its stages: the idea, worked example, guided, solo. The time is what’s left in each course.</p>
      ${(() => { const t = order.map(p => courseMins(p.id)); const b = bigoMin(); const left = t.reduce((a, x) => a + x.left, 0) + (lessonDone('bigo') ? 0 : b), all = t.reduce((a, x) => a + x.total, 0) + b;
        return `<p class="eta-row">${eta(left, left < all ? `left of ${fmtMin(all)} for the whole path` : 'for the whole path')}</p>`; })()}
      <ol class="path" data-navlist><li><a href="#/study/bigo" class="path-row primer-row${lessonDone('bigo') ? ' complete' : ''}" data-item>
          <span class="path-n">${lessonDone('bigo') ? '✓' : 0}</span>
          <span class="path-name"><b>Big-O basics</b><span class="small muted">before you start: what code costs</span></span>
          <span class="track" aria-hidden="true"><span class="seg"><i style="width:${lessonDone('bigo') ? 100 : 0}%"></i></span></span>
          <span class="path-eta">${lessonDone('bigo') ? '<span class="eta">Done</span>' : eta(bigoMin(), 'read')}</span></a></li>
        ${order.map((p, i) => { const pr = courseProgress(p.id);
        return `<li><a href="#/study/${p.id}" class="path-row${pr.complete ? ' complete' : ''}" data-item>
          <span class="path-n">${pr.complete ? '✓' : i + 1}</span>
          <span class="path-name"><b style="color:${pc(p.color)}">${esc(p.name)}</b><span class="small muted">${esc(p.triggers[0])}</span></span>
          <span class="track" role="img" aria-label="${esc(pr.stages.map(s => `${s.name} ${s.done} of ${s.of}`).join(', '))}">${pr.stages.map(s =>
            `<span class="seg" title="${esc(s.name)}: ${s.done} of ${s.of}"><i style="width:${Math.round(s.done / s.of * 100)}%"></i></span>`).join('')}</span>
          <span class="path-eta">${pr.complete ? '<span class="eta">Done</span>' : eta(courseMins(p.id).left, 'left')}</span></a></li>`; }).join('')}</ol></section>
    <section class="approach"><h2>The approach, for any problem</h2><p class="eta-row" data-read-of="section"></p>
      <p class="muted">When you don’t recognise a problem, walk these steps in order. Every walkthrough follows them and the cold-solve coach asks them.</p>
      <ol class="approach-steps">${APPROACH.map(a => `<li><b>${esc(a.t)}</b><span>${esc(a.d)}</span></li>`).join('')}</ol>
      <details><summary>Input size tells you the target complexity</summary>
        <table style="margin-top:8px"><tr><th>Constraint</th><th>Aim for</th><th>Usually means</th></tr>${C.input_size.map(r => `<tr><td class="mono">${esc(r[0])}</td><td class="mono">${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</table></details>
      ${C.method.length ? `<details><summary>More on turning a problem into pseudocode</summary>${C.method.map(m => `<h3>${esc(m.title)}</h3><ul>${m.points.map(pt => `<li>${md(pt)}</li>`).join('')}</ul>`).join('')}</details>` : ''}</section>
    <section class="refs"><h2>Reference</h2><p class="eta-row" data-read-of="section"></p>
      <p><a href="#/guide">Starter Guide</a>: the 8-week plan, a daily routine, and when to use LeetCode, NeetCode, Grind 75, USACO Guide and mock interviews.</p>
      <details><summary>Python cheat sheet</summary>
        ${Object.entries(syntaxByTopic).map(([t, cards]) => `<h3>${esc(t)}</h3>${cards.map(c => `<div class="small muted" style="margin-top:6px">${esc(c.prompt)}</div><pre class="code" style="margin:4px 0">${esc(c.answer)}</pre>`).join('')}`).join('')}</details>
      <details><summary>What to say out loud in an interview</summary>
        <ol>${C.think_aloud.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
        <h3>Questions to ask on any problem</h3><ul>${C.clarify_generic.map(t => `<li>${esc(t)}</li>`).join('')}</ul></details></section></div>`;
}

function probRow(x, role) {
  if (!x) return '';
  const solo = role === 'solo', locked = solo && !attempted(x.id);
  const done = solo ? attempted(x.id) : walked(x.id);
  const mins = solo ? solveMin(x) : role === 'learn' ? walkMin(x) : guidedMin(x);
  const note = PAT(x.pattern).course?.notes?.[x.id];
  return `<div class="prob-row" data-navrow><span class="prob-title">${esc(x.title)}${note ? `<small class="prob-note">${esc(note)}</small>` : ''}</span><span class="tag ${x.diff}">${x.diff}</span>${lcChip(x)}${eta(mins)}
    <span class="status ${done ? 'done' : 'todo'}">${solo ? (done ? 'tried' : 'not tried') : (done ? 'done' : 'to do')}</span><span class="spacer"></span>
    ${solo ? `<a class="btn ${done ? '' : 'primary'}" href="#/study/solve/${x.id}" data-item>Solve cold</a>
        <a class="btn ghost" href="#/study/${x.pattern}/${x.id}" title="${locked ? 'Unlocks after you try it' : 'See the approach'}">${locked ? '🔒 ' : ''}Walkthrough</a>`
      : `<a class="btn ${done ? '' : 'primary'}" href="${role === 'learn' ? `#/study/${x.pattern}/${x.id}` : `#/study/guided/${x.id}`}" data-item>${role === 'learn' ? 'Brute force to final answer' : 'Work through it'}</a>
        <a class="btn ghost" href="#/study/solve/${x.id}">Solve cold</a>`}</div>`;
}

function studyCourse(app, pid) {
  const p = PAT(pid); const L = p.lesson;
  if (!L) return studyHome(app);
  const order = studyOrder(), idx = order.findIndex(x => x.id === pid);
  const prev = order[idx - 1], next = order[idx + 1];
  const pr = courseProgress(pid), c = pr.c, nx = nextStep(pid);
  let n = 1;
  app.innerHTML = `<div class="study course" data-navlist><div class="row"><a href="#/study" class="crumb">← Study</a><span class="spacer"></span>
      <a class="crumb" href="#/patterns/${pid}">Pattern page: all ${C.problems.filter(x => x.pattern === pid).length} problems and your mastery →</a></div>
    <div class="course-head"><h1 style="color:${pc(p.color)}">${esc(p.name)}</h1>
      <ol class="stepper">${pr.stages.map(s => `<li class="${s.done >= s.of ? 'done' : s.done ? 'part' : ''}"><span>${esc(s.name)}</span><small>${s.done} of ${s.of}</small></li>`).join('')}</ol>
      ${nx ? `<div class="row"><a class="btn primary" href="${nx.href}" data-key="c">${esc(nx.verb)}${etaIn(nx.min)} <kbd>C</kbd></a><span class="muted small">${esc(nx.label)}</span></div>`
        : '<p class="status done">Course complete</p>'}
      ${(() => { const t = courseMins(pid); return `<p class="eta-row">${eta(t.left || t.total, t.left && t.left < t.total ? `left of ${fmtMin(t.total)} for this course` : 'for this course')}</p>`; })()}</div>
    <section class="stage"><h2><span class="n">${n++}</span>The idea ${eta(lessonMin(pid))}</h2>
      <p class="why">${esc(L.why)}</p>
      ${L.primer ? `<details class="primer"${lessonDone(pid) ? '' : ' open'}><summary>New to this? What this lesson assumes you know</summary>
        <div class="prose">${proseHtml(L.primer.text.split('\n'))}</div>${L.primer.more ? `<p class="small"><a href="${esc(L.primer.more)}" target="_blank" rel="noopener">Read it properly on the USACO Guide ↗</a></p>` : ''}</details>` : ''}
      <div class="two"><div><h3>Reach for it when you see</h3><ul>${p.triggers.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
        <div><h3>It’s a different pattern when</h3><ul>${L.not_this.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div></div>
      <h3>The skeleton, and the job of each line</h3>
      <p class="muted small">Every line does one of a handful of jobs. Different people write the same template in different orders, so learn the jobs,
        not the line order. Then rebuild it from memory with <a href="#/play/skeleton?problem=${pid}">Skeleton Recall</a>, which checks the jobs, not the exact lines.</p>
      ${pr.complete ? `<p class="fade-note">You’ve finished this course. Write the skeleton from memory first with
        <a href="#/play/skeleton?problem=${pid}">Skeleton Recall</a>, then open it below to check.</p><details class="faded"><summary>Show the skeleton</summary>` : ''}
      <div class="roles-key">${ROLES.map(r => `<span class="role role-${r.id}">${r.name}</span><span class="muted small">${r.q}</span>`).join('')}</div>
      <div class="build annotated">${L.build.map(([code, why], i, all) => { const r = lineRole(code, all.slice(0, i).some(([c]) => /^\s*(for|while)\b/.test(c)));
        return `<div class="bl"><span class="role role-${r}">${ROLES.find(x => x.id === r).name}</span><code>${hlOn() ? highlightLine(code) : esc(code)}</code><div class="why">${esc(why) || '&nbsp;'}</div></div>`; }).join('')}</div>
      ${pr.complete ? '</details>' : ''}
      <h3>To make it fit a specific problem, answer</h3><ol>${p.fill.map(f => `<li>${esc(f)}</li>`).join('')}</ol>
      <h3>Bugs to avoid</h3><ul>${L.bugs.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
      <div class="row"><button class="${lessonDone(pid) ? 'ghost' : 'good'}" id="mark" data-key="l">${lessonDone(pid) ? 'Mark as not learned' : '✓ I’ve got the idea'} <kbd>L</kbd></button></div></section>
    <section class="stage"><h2><span class="n">${n++}</span>Worked example</h2>
      <p class="muted">One problem taken from the obvious slow answer to the final one, a decision at a time. Type a guess before each reveal.</p>
      ${probRow(c.learn, 'learn')}</section>
    ${c.guided.length ? `<section class="stage"><h2><span class="n">${n++}</span>Guided</h2>
      <p class="muted">You make the decisions and the app checks each one: which pattern, how fast it has to be, then the key lines, run against the real tests.</p>
      ${c.guided.map(x => probRow(x, 'guided')).join('')}</section>` : ''}
    ${c.solo.length ? `<section class="stage"><h2><span class="n">${n++}</span>Solo, cold</h2>
      <p class="muted">Solve these from a blank editor first. Each walkthrough unlocks after a real attempt, so these stay problems you haven’t seen.</p>
      ${c.solo.map(x => probRow(x, 'solo')).join('')}</section>` : ''}
    ${c.transfer ? `<section class="stage"><h2><span class="n">${n++}</span>Transfer check</h2>
      <p class="muted">A twist on ${esc(PROB(c.transfer.twist_of)?.title || 'a problem above')} that appears nowhere else in the app: not in the games, not in a walkthrough.
        Solving it cold is the real sign you’ve learned the pattern and not just these problems.</p>
      ${probRow(c.transfer, 'solo')}</section>` : ''}
    <section class="stage"><h2>Keep it fresh</h2><p class="muted small">Short drills on just this pattern.</p>${drillButtons(pid)}</section>
    <div class="row" style="margin-top:20px">${prev ? `<a class="btn ghost" href="#/study/${prev.id}" data-key="[">← ${esc(prev.name)} <kbd>[</kbd></a>` : ''}<span class="spacer"></span>
      ${next ? `<a class="btn" href="#/study/${next.id}" data-key="]">${esc(next.name)} → <kbd>]</kbd></a>` : ''}</div></div>`;
  $('#mark', app).onclick = () => {
    if (lessonDone(pid)) delete S.study.lessons[pid];
    else { S.study.lessons[pid] = today(); addXP(10); toast('📖 Idea learned +10 XP'); }
    save(); studyCourse((app.innerHTML = '', app), pid);
  };
}

// Other valid approaches (content/alternatives.py): the patterns they use, and how the walkthrough shows them.
const altPatterns = p => [...new Set((p.also || []).map(a => a.pattern).filter(x => x && x !== p.pattern))];
function altsHtml(p) {
  return `<p class="muted small">Interviewers like hearing a second approach and why you'd choose between them. Every one below passes the tests.</p>`
    + p.also.map(a => `<div class="alt"><div class="alt-h">${a.pattern && a.pattern !== p.pattern ? patternTag(a.pattern) : ''}<b>${esc(a.name)}</b>
        <span class="mono small muted">Time ${esc(a.time)} · Space ${esc(a.space)}</span></div>
      <p>${inlineMd(a.how)}</p><p class="muted small"><b>When:</b> ${inlineMd(a.when)}</p>
      ${a.code ? `<details><summary class="small">Show the code</summary><pre class="code">${hlOn() ? highlightCode(a.code) : esc(a.code)}</pre></details>` : ''}</div>`).join('');
}

// Walkthrough: the approach applied to one problem, from the naive brute force to the final answer.
function studyWalk(app, pid, probId, params) {
  const p = PROB(probId); if (!p) return studyCourse(app, pid);
  const role = roleOf(p), L = PAT(p.pattern).lesson || {};
  if ((role === 'solo' || role === 'transfer') && !attempted(p.id) && params.peek !== '1') {
    app.innerHTML = `<div class="study"><a href="#/study/${p.pattern}" class="crumb">← ${esc(PAT(p.pattern).name)}</a>
      <div class="gate card"><h1>${esc(p.title)}</h1>
        <p>Try this one cold first. An explanation lands much better after you’ve struggled with the problem yourself, and once you’ve read it,
          this stops being a problem you haven’t seen.</p>
        <div class="row"><a class="btn primary" href="#/study/solve/${p.id}" data-key="c">Solve it cold${etaIn(solveMin(p))} <kbd>C</kbd></a>
          <a class="btn ghost" href="#/study/${p.pattern}/${p.id}?peek=1" data-key="w">Show the walkthrough anyway${etaIn(walkMin(p))} <kbd>W</kbd></a></div></div></div>`;
    return;
  }
  const list = [...sortedProblems(p.pattern), ...C.twists.filter(t => t.pattern === p.pattern)], i = list.findIndex(x => x.id === p.id), prev = list[i - 1], next = list[i + 1];
  const finalO = firstBigO(p.time) || p.time;
  // No O(...) in the brute sentence: either it says exponential, or the obvious way costs the same as the final one.
  const bruteO = firstBigO(p.brute) || (/exponential|\^|n!/i.test(p.brute) ? 'exponential' : finalO);
  const sameCost = bruteO.replace(/\s/g, '') === finalO.replace(/\s/g, '');
  const cues = cuesIn(p);
  const guided = role === 'guided';
  const steps = [
    { t: 'Understand it', think: 'In one sentence: what goes in, what comes out? What would you ask before writing any code?',
      b: `<div class="two"><div><b>Questions worth asking</b><ul>${(p.clarify.length ? p.clarify : ['Standard constraints; nothing tricky.']).map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>
        <div><b>Inputs that could break a first attempt</b><ul>${p.edges.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div></div>` },
    { t: 'Solve a tiny example by hand', think: 'Work the first example on paper. What did you actually do, step by step?',
      b: `${exampleHtml(p)}<p>Whatever your hands did is a valid first algorithm, and it’s almost always the brute force. Write those steps down before thinking about speed.</p>` },
    { t: 'Brute force', think: 'What’s the most obvious correct way, ignoring speed? What does it cost?',
      b: `<p>${esc(p.brute)}</p>${p.brute_code ? `<pre class="code">${esc(p.brute_code)}</pre><p class="muted small">This is correct and passes every test. It’s just slow. Getting here first is a real result in an interview: say it, give its cost, then improve it.</p>` : ''}`, meter: 'brute' },
    { t: 'Find the repeated work', think: 'Look at the brute force. What does it recompute or rescan over and over?',
      b: `<p>${esc(L.why || p.brute)}</p>` },
    { t: 'Pick the tool that removes it', think: 'Which words in the statement hint at the tool? Which pattern removes that repeated work?',
      b: `<p>${patternTag(p.pattern)}${cues.length ? ` <span class="muted small">Cues in this statement: ${cues.map(c => `<mark>${esc(c)}</mark>`).join(' ')}</span>` : ''}</p>
        <p class="insight">${esc(p.insight)}</p>${altPatterns(p).length ? `<p class="muted small">Not the only tool that works here: the last step shows another way and when you'd pick it.</p>` : ''}` },
    { t: 'Plan in plain words', think: guided ? 'Write your plan in the box before revealing: what you keep, what each step does, when you stop.'
        : 'Say the steps out loud: what do you keep, what happens at each step, when do you stop?',
      b: `<ol class="plan">${p.plan.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` },
    { t: 'Code it', think: guided ? 'Write the code yourself first, then come back and compare.' : 'Picture the code from the plan before you look.',
      pre: guided ? `<div class="row"><a class="btn" href="#/play/fill?problem=${p.id}" data-key="f">✍️ Write the key lines${etaIn(gameMin('fill'))} <kbd>F</kbd></a><a class="btn" href="#/study/solve/${p.id}" data-key="c">💻 Write it all, cold${etaIn(solveMin(p))} <kbd>C</kbd></a></div>` : '',
      b: `${p.brute_code ? `<div class="two code-pair"><div><div class="muted small">Brute force · ${esc(bruteO)}</div><pre class="code">${esc(p.brute_code)}</pre></div>
          <div><div class="muted small">Final · ${esc(finalO)}</div>${codeWithKeys(p)}</div></div>` : codeWithKeys(p)}
        <p class="muted small"><span class="hl-chip">Highlighted</span> lines are specific to this problem. The rest is the
          <a href="#/study/${p.pattern}">${esc(PAT(p.pattern).name)}</a> skeleton.</p>`, meter: 'final' },
    { t: 'Test it', think: 'Which input would most likely break this? Trace it through the code. Then state time and space.',
      b: `<p>⚠️ ${esc(p.catch)}</p><p class="mono">Time ${esc(p.time)} · Space ${esc(p.space)}</p>` },
    ...(p.also?.length ? [{ t: 'Another way?', think: 'Is there a different approach? What would it cost, and when would you pick it over this one?',
      b: altsHtml(p) }] : []),
  ];
  let open = 0; const guesses = {};
  app.innerHTML = `<div class="study walk"><a href="#/study/${p.pattern}" class="crumb">← ${esc(PAT(p.pattern).name)}</a>
    <div class="walk-head"><h1>${esc(p.title)}</h1><span class="tag ${p.diff}">${p.diff}</span><span class="muted">#${p.num}</span>${eta(walkMin(p), '', { title: 'Reading every step, plus about 45 seconds to answer each one yourself first' })}${extLinks(p)}</div>
    <div class="card statement-card"><p class="statement">${esc(p.statement)}</p></div>
    <div class="meter" id="meter" aria-live="polite"></div>
    <p class="muted small">Answer each step yourself first (type it, or say it out loud), then reveal. <kbd>Space</kbd> reveals the next step;
      in the box, <kbd>Ctrl</kbd>+<kbd>Enter</kbd> does.</p>
    <ol class="ladder" id="steps"></ol><div id="end"></div></div>`;
  const meter = () => {
    const reached = open > 6 ? 'final' : open > 2 ? 'brute' : null;
    const w = reached === 'final' ? bigORank(finalO) : bigORank(bruteO);
    $('#meter', app).innerHTML = reached ? `<span class="meter-label">${reached === 'final' ? (sameCost ? 'Same time as the brute force:' : `From ${esc(bruteO)} down to`) : 'Brute force runs in'} <b>${esc(reached === 'final' ? finalO : bruteO)}</b></span>
      <span class="meter-bar"><i style="width:${Math.round(w / 7 * 100)}%" class="${reached}"></i></span>` : '';
  };
  const draw = () => {
    $('#steps', app).innerHTML = steps.map((s, k) => k < open
      ? `<li class="rung done"><div class="rung-h"><span class="n">${k + 1}</span>${esc(s.t)}</div>
          ${guesses[k] ? `<div class="you-said"><span class="muted small">You said</span><div>${esc(guesses[k])}</div></div>` : ''}<div class="rung-b">${s.b}</div></li>`
      : k === open ? `<li class="rung current"><div class="rung-h"><span class="n">${k + 1}</span>${esc(s.t)}</div>
          <div class="rung-b"><p class="think">${esc(s.think)}</p>${s.pre || ''}
            <textarea id="guess" rows="${k >= 5 ? 4 : 2}" placeholder="Your answer (optional)" aria-label="Your answer for: ${esc(s.t)}"></textarea>
            <div class="row"><button class="primary" id="rev" data-key=" ">Reveal <kbd>Space</kbd></button></div></div></li>`
      : `<li class="rung locked"><div class="rung-h"><span class="n">${k + 1}</span>${esc(s.t)}</div></li>`).join('');
    meter();
    const reveal = () => { const g = $('#guess', app); if (g?.value.trim()) guesses[open] = g.value.trim(); open++; draw(); $('.rung.current', app)?.scrollIntoView({ block: 'nearest', behavior: scrollMotion() }); };
    $('#rev', app) && ($('#rev', app).onclick = reveal);
    $('#guess', app)?.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); reveal(); } });
    if (open >= steps.length) {
      $('#end', app).innerHTML = `<div class="card end-card"><h2>Now make it stick</h2>
        <p class="muted">Understanding fades within a day unless you use it. Rebuild it from memory now:</p>
        <div class="row"><a class="btn primary" href="#/study/solve/${p.id}" data-key="c">💻 Solve it cold${etaIn(solveMin(p))} <kbd>C</kbd></a><a class="btn" href="#/play/fill?problem=${p.id}" data-key="f">✍️ Fill the Gap${etaIn(gameMin('fill'))} <kbd>F</kbd></a>
          <a class="btn" href="#/play/lineup?problem=${p.id}" data-key="l">🧩 Line Up${etaIn(gameMin('lineup'))} <kbd>L</kbd></a><span class="spacer"></span>
          <button class="${walked(p.id) ? 'ghost' : 'good'}" id="und" data-key="n">${walked(p.id) ? '✓ Done' : '✓ Mark as done'} <kbd>N</kbd></button></div></div>
        <div class="row" style="margin-top:14px">${prev ? `<a class="btn ghost" href="#/study/${pid}/${prev.id}" data-key="[">← ${esc(prev.title)} <kbd>[</kbd></a>` : ''}<span class="spacer"></span>
          <a class="btn" href="#/study/${p.pattern}" data-key="b">Back to ${esc(PAT(p.pattern).name)} <kbd>B</kbd></a></div>`;
      $('#und', app).onclick = () => {
        if (!walked(p.id)) { S.study.walks[p.id] = today(); addXP(4); toast('+4 XP'); save(); }
        location.hash = `#/study/${p.pattern}`;
      };
    }
  };
  draw();
}

// Guided: you make each decision and it's checked straight away (a completion problem), instead of comparing
// your own answer with a written explanation. 1) which pattern  2) how fast it can be  3) the key lines, run against the tests.
function studyGuided(app, id) {
  const p = PROB(id); if (!p) return studyHome(app);
  const pat = PAT(p.pattern), L = pat.lesson || {};
  const pOpts = shuffle([pat, ...pick(studyOrder().filter(x => x.id !== p.pattern), 3)]);   // an alternative may be among them: it counts as right
  const cOpts = shuffle([p.time, ...pick(C.complexities.filter(c => c !== p.time), 3)]);
  const got = {};
  app.innerHTML = `<div class="study guided"><a href="#/study/${p.pattern}" class="crumb">← ${esc(pat.name)}</a>
    <div class="walk-head"><h1>${esc(p.title)}</h1><span class="tag ${p.diff}">${p.diff}</span><span class="muted">#${p.num}</span>${eta(guidedMin(p), '', { title: 'Reading the statement, two quick picks, then writing the key lines' })}${extLinks(p, { video: false })}</div>
    <p class="muted">Three decisions, each checked as you make it. Then compare with the full approach.</p>
    <div class="card pcard statement-card">${problemPanel(p, { title: false })}</div>
    <ol class="ladder" id="gsteps"></ol><div id="gend"></div></div>`;
  const list = $('#gsteps', app);
  const rung = (k, title) => { list.insertAdjacentHTML('beforeend', `<li class="rung current" id="g${k}"><div class="rung-h"><span class="n">${k}</span>${esc(title)}</div><div class="rung-b"></div></li>`);
    const li = $('#g' + k, app); li.scrollIntoView({ block: 'nearest', behavior: scrollMotion() }); return $('.rung-b', li); };
  const done = k => { const li = $('#g' + k, app); li.classList.remove('current'); li.classList.add('done'); };
  const choose = (body, prompt, opts, label, right, after) => {
    body.innerHTML = `<p class="think">${prompt}</p><div class="options">${opts.map((o, k) =>
      `<button type="button" data-v="${esc(o.id || o)}" data-key="${k + 1}" data-kgroup="pick an answer"><kbd>${k + 1}</kbd> ${esc(label(o))}</button>`).join('')}</div><div class="gfb" aria-live="polite"></div>`;
    body.querySelector('.options').onclick = e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      const valid = [].concat(right), ok = valid.includes(b.dataset.v);   // right: one answer, or several that all work
      $$('.options button', body).forEach(x => { x.disabled = true; x.removeAttribute('data-key'); if (valid.includes(x.dataset.v)) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
      after(ok, $('.gfb', body), b.dataset.v);
    };
  };
  const step1 = rung(1, 'Which pattern fits?');
  choose(step1, 'Read the statement. Which tool removes the slow part of the obvious solution?', pOpts, x => x.name, [pat.id, ...altPatterns(p)], (ok, fb, v) => {
    got.pattern = ok;
    const cues = cuesIn(p), alt = (p.also || []).find(a => a.pattern === v && v !== pat.id);
    fb.innerHTML = `<div class="reveal">${alt ? `✓ That works too: ${esc(alt.name)}, ${esc(alt.time)}. This course uses ${patternTag(pat.id)}:` : ok ? '✓ Right.' : `Not quite. It's ${patternTag(pat.id)}.`} ${esc(p.insight)}
      ${cues.length ? `<div class="muted small">Cues in the statement: ${cues.map(c => `<mark>${esc(c)}</mark>`).join(' ')}</div>` : `<div class="muted small">Reach for it when: ${esc(pat.triggers[0])}</div>`}</div>`;
    done(1);
    const step2 = rung(2, 'How fast can it be?');
    choose(step2, `The obvious way: ${esc(p.brute)} What time complexity should the final solution reach?`, cOpts, c => c, p.time, (ok2, fb2) => {
      got.time = ok2;
      fb2.innerHTML = `<div class="reveal">${ok2 ? '✓ Right.' : `Not quite. It's <b>${esc(p.time)}</b>.`} ${esc(firstSentence(L.why || ''))}</div>`;
      done(2);
      const step3 = rung(3, 'Write the key lines');
      step3.innerHTML = `<p class="think">The skeleton is filled in. Write the lines that make it solve this problem; the real tests decide.</p><span id="gclock" hidden></span><div id="gfill"></div>`;
      GAMES.fill.render($('#gfill', app), p, q => {
        review('fill', p.id, q); got.code = q;
        if (!walked(p.id)) { S.study.walks[p.id] = today(); save(); }
        done(3);
        const mark = v => v ? '✓' : '✗';
        $('#gend', app).innerHTML = `<div class="card end-card"><h2>Done</h2>
          <p>Pattern ${mark(got.pattern)} · Speed ${mark(got.time)} · Code ${q > 0 ? '✓ passed' : '✗ needed the answer'}</p>
          <p class="muted">Now read the full approach for this problem and see where your thinking differed.</p>
          <div class="row"><a class="btn primary" href="#/study/${p.pattern}/${p.id}?peek=1" data-key="w">Full approach${etaIn(walkMin(p))} <kbd>W</kbd></a>
            <a class="btn" href="#/study/${p.pattern}" data-key="n">Back to the course <kbd>N</kbd></a></div></div>`;
        $('#gend', app).scrollIntoView({ block: 'nearest', behavior: scrollMotion() });
      }, { clock: $('#gclock', app) });
    });
  });
}

// Solve cold: statement + blank editor, an optional approach coach that fades with practice,
// and a hint ladder. Mixed practice hides the title and pattern until you're done.
function studySolve(app, probId, params) {
  const p = PROB(probId); if (!p) return studyHome(app);
  const mystery = params.mixed === '1';
  const coachOpen = Object.keys(S.study.attempts).length < 6;   // the coach fades: open for your first few cold solves
  const back = mystery ? '#/study' : `#/study/${p.pattern}`;
  let hints = 0, runs = 0, finished = false;
  const hintList = [
    () => `<b>Start with the brute force.</b> ${esc(p.brute)}`,
    () => `<b>The tool:</b> ${patternTag(p.pattern)} ${esc(firstSentence(PAT(p.pattern).lesson?.why || p.insight))}`,
    () => `<b>The plan:</b><ol class="plan">${p.plan.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`,
  ];
  app.innerHTML = `<div class="study solve">
    <div class="gamehead"><a class="btn ghost" href="${back}" data-key="q" id="exit" data-exit-confirm="The code in your editor is not saved, and this attempt won’t be graded.">← Exit <kbd>Q</kbd></a>
      <h1>${mystery ? '🎲 Mystery problem' : esc(p.title)}</h1><span class="tag ${p.diff}">${p.diff}</span>${mystery ? '' : patternTag(p.pattern)}
      <span class="spacer"></span>${eta(solveMin(p), '', { title: `The time budget for a ${p.diff} problem, as in an online assessment` })}<span class="timer" id="clock"></span></div>
    ${mystery ? '<p class="muted small">The name and pattern are hidden. Work out the approach from the statement alone.</p>' : ''}
    <div class="solve-grid">
      <div class="solve-left">
        <div class="card pcard">${problemPanel(p, { title: false, mystery })}</div>
        <section class="coach card" id="coach" aria-label="Approach coach"></section>
        <div id="hintbox" aria-live="polite"></div>
      </div>
      <div class="solve-right">
        <textarea class="code" id="ed" aria-label="Your solution"></textarea>
        <div class="row" style="margin-top:10px"><button class="primary" id="run" data-key="r">Run tests <kbd>Ctrl+Enter</kbd></button>
          <button class="ghost" id="hint" data-key="h">Hint 1 of 3 <kbd>H</kbd></button>
          <button class="ghost" id="give" data-key="a">Show the walkthrough <kbd>A</kbd></button>
          <span class="spacer"></span><span class="muted small" id="rc"></span></div>
        <div id="out" aria-live="polite"></div></div></div></div>`;
  const ed = $('#ed', app); ed.value = p.starter; enhanceEditor(ed, { onSubmit: () => run() });
  ed.focus(); ed.selectionStart = ed.selectionEnd = ed.value.length - 1;
  const timer = startTimer($('#clock', app), 0, null, { countUp: true });
  // Approach coach: one step at a time with its own notes box. Open for your first few cold solves, then tucked away.
  const coach = $('#coach', app); const notes = []; let ci = 0, coachShown = coachOpen;
  const drawCoach = () => {
    if (!coachShown) {
      coach.innerHTML = `<div class="coach-head"><b>Approach coach</b><span class="muted small">6 steps, optional</span><span class="spacer"></span>
        <button type="button" class="ghost" id="cshow" aria-expanded="false" data-key="c">Show <kbd>C</kbd></button></div>`;
      $('#cshow', coach).onclick = () => { coachShown = true; drawCoach(); $('#cn', coach).focus(); };
      return;
    }
    const a = APPROACH[ci];
    coach.innerHTML = `<div class="coach-head"><b>Approach coach</b><span class="muted small">Step ${ci + 1} of 6</span><span class="spacer"></span>
        <button type="button" class="ghost" id="chide" aria-expanded="true" data-key="c">Hide <kbd>C</kbd></button></div>
      <ol class="coach-steps">${APPROACH.slice(0, 6).map((x, k) => `<li><button type="button" class="${k === ci ? 'on' : notes[k] ? 'done' : ''}" data-ci="${k}"
        title="${esc(x.t)}" aria-label="Step ${k + 1}: ${esc(x.t)}" ${k === ci ? 'aria-current="step"' : ''}>${k + 1}</button></li>`).join('')}</ol>
      <label class="coach-body" for="cn"><b>${esc(a.t)}</b><span class="muted small">${esc(a.d)}</span></label>
      <textarea id="cn" rows="3" placeholder="Your notes for this step (optional)">${esc(notes[ci] || '')}</textarea>
      <div class="row coach-nav"><button type="button" class="ghost" id="cprev" data-key="[" ${ci ? '' : 'disabled'}>Back <kbd>[</kbd></button><span class="spacer"></span>
        <button type="button" id="cnext" data-key="]">${ci < 5 ? 'Next step' : 'Done, write the code'} <kbd>]</kbd></button></div>`;
    const ta = $('#cn', coach); ta.oninput = () => { notes[ci] = ta.value; };
    const go = k => { ci = k; drawCoach(); $('#cn', coach).focus(); };
    $$('[data-ci]', coach).forEach(b => b.onclick = () => go(+b.dataset.ci));
    $('#cprev', coach).onclick = () => go(ci - 1);
    $('#cnext', coach).onclick = () => (ci < 5 ? go(ci + 1) : ed.focus());
    $('#chide', coach).onclick = () => { coachShown = false; drawCoach(); };
  };
  drawCoach();
  const markAttempt = () => {
    const cp = mystery && checkpointDue(); if (cp) { S.study.lessons['checkpoint:' + cp.k] = today(); save(); }
    if (!attempted(p.id)) { S.study.attempts[p.id] = today(); save(); }
  };
  const twistNote = p.twist_of ? ` It’s a twist on <a href="#/study/${p.pattern}/${p.twist_of}">${esc(PROB(p.twist_of)?.title || p.twist_of)}</a>.` : '';
  const reveal = () => mystery ? `<div class="reveal">It was <b>${esc(p.title)}</b>, a ${patternTag(p.pattern)} problem.${twistNote}</div>`
    : twistNote ? `<div class="reveal">${twistNote.trim()}</div>` : '';
  const after = () => {
    $('#exit', app)?.removeAttribute('data-exit-confirm');   // graded: nothing left to lose
    $('#out', app).insertAdjacentHTML('beforeend', `${reveal()}<div class="row" style="margin-top:10px">
      <a class="btn" href="#/study/${p.pattern}/${p.id}" data-key="w">See the approach, brute force to final <kbd>W</kbd></a>${extLinks(p)}
      ${mystery ? `<a class="btn primary" href="#/study/mixed" data-key="n">Next mystery <kbd>N</kbd></a>` : `<a class="btn primary" href="${back}" data-key="n">Back to the course <kbd>N</kbd></a>`}</div>`);
  };
  $('#hint', app).onclick = () => {
    if (hints >= hintList.length || finished) return;
    $('#hintbox', app).insertAdjacentHTML('beforeend', `<div class="reveal small">${hintList[hints]()}</div>`);
    hints++;
    const b = $('#hint', app); if (hints >= hintList.length) { b.disabled = true; b.textContent = 'No more hints'; } else b.innerHTML = `Hint ${hints + 1} of 3 <kbd>H</kbd>`;
  };
  const run = async () => {
    if (finished) return; runs++; markAttempt();
    $('#rc', app).textContent = `${runs} run${runs > 1 ? 's' : ''}`;
    const r = await runTests(p, ed.value);
    $('#out', app).innerHTML = resultsHtml(r);
    if (!r.ok) return;
    finished = true; timer.stop();
    const cap = hints === 0 ? 2 : hints === 1 ? 1 : 0;
    if (cap === 0) { review('oa', p.id, 0); $('#out', app).insertAdjacentHTML('beforeend', '<p class="muted small">Solved with the plan as a hint, so it’s recorded as missed and comes back soon.</p>'); return after(); }
    const bar = gradeButtons(q => { review('oa', p.id, q); bar.remove(); after(); }, runs <= 3 && hints === 0 ? 2 : 1);
    bar.querySelectorAll('button').forEach(b => { if (+b.dataset.q > cap) b.disabled = true; });
    $('#out', app).append(bar);
  };
  $('#run', app).onclick = run;
  $('#give', app).onclick = () => {
    if (!finished) { finished = true; timer.stop(); markAttempt(); review('oa', p.id, 0); }
    location.hash = `#/study/${p.pattern}/${p.id}`;
  };
}

// ─────────────────────────── boot ───────────────────────────
(async () => {
  try {
    C = await loadContent();
    // Twist problems (one per pattern) stay out of the games and the course lessons: they are the transfer check.
    C.twists = C.problems.filter(p => p.twist_of);
    C.problems = C.problems.filter(p => !p.twist_of);
    C.everyProblem = [...C.problems, ...C.twists];
    S = normalizeState(await loadState());
  } catch (e) { $('#app').innerHTML = '<div class="card">Can’t load content. Locally, is <code>python server.py</code> running? For static hosting, run <code>python build_static.py</code> first.</div>'; return; }
  markSettingsSeen();
  renderHud(); route();
  Cloud.init().catch(e => console.warn('sync init failed', e));
  if (!SERVER) setTimeout(() => { if (!pyWorker) startPy(); }, 1500);  // warm up Python so the first Run is quick
})();
