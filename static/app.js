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
    const t = setTimeout(() => {
      w.terminate(); startPy();  // the only way to stop an infinite loop in a worker
      resolve({ ok: false, results: [], error: `Time limit exceeded (${timeoutMs / 1000}s). Infinite loop or too slow?` });
    }, timeoutMs);
    w.onmessage = e => { clearTimeout(t); if (e.data.fatal) { w.terminate(); startPy(); } resolve(e.data.result); };
    w.postMessage({ code, spec });
  });
}
const runTests = (p, code) => SERVER ? api('/api/run', { id: p.id, code }) : runPy(code, p.tests, 6000);
const runSyntax = (s, code) => SERVER ? api('/api/syntax', { id: s.id, code })
  : runPy(code, { kind: 'snippet', setup: s.setup, check: s.check }, 4000);

// Editor niceties: Tab = 4 spaces, Shift+Tab dedent, Enter keeps indent (+4 after ':'), Ctrl+Enter = submit
function enhanceEditor(ta, { onSubmit, autoIndent = true } = {}) {
  ta.spellcheck = false;
  ta.addEventListener('keydown', e => {
    const { selectionStart: s, selectionEnd: en, value: v } = ta;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSubmit && onSubmit(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      if (e.shiftKey) {
        const m = v.slice(ls).match(/^ {1,4}/);
        if (m) { ta.value = v.slice(0, ls) + v.slice(ls + m[0].length); ta.selectionStart = ta.selectionEnd = Math.max(ls, s - m[0].length); }
      } else { ta.setRangeText('    ', s, en, 'end'); }
      return;
    }
    if (e.key === 'Enter' && autoIndent) {
      e.preventDefault();
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      const line = v.slice(ls, s);
      let ind = line.match(/^ */)[0];
      if (/:\s*$/.test(line)) ind += '    ';
      ta.setRangeText('\n' + ind, s, en, 'end');
    }
  });
}

// ─────────────────────────── state ───────────────────────────
let C = null;           // content from server
let S = null;           // persisted state
const DEFAULTS = {
  settings: { interviewDate: addDays(today(), 14), minutes: 30, newPerDay: 4, sprintSeconds: 15,
              focus: { talk: true, clarify: true, complexity: true, noide: true } },
  items: {}, xp: 0, streak: { count: 0, last: null, best: 0 }, days: {}, mocks: [], plan: null,
  study: { lessons: {}, walks: {} },
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
  s.study = Object.assign({ lessons: {}, walks: {} }, s.study || {});
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
const XP = { sprint: 2, syntax: 3, bigo: 3, edge: 4, lineup: 6, fill: 8, skeleton: 6, oa: 30, mock: 45 };
function item(game, id) { return S.items[game + ':' + id]; }
function review(game, id, q) {
  const k = game + ':' + id, t = today();
  let it = S.items[k];
  if (!it) { it = S.items[k] = { box: 0, reps: 0, lapses: 0, first: t }; const d = dayRec(); d.newBy[game] = (d.newBy[game] || 0) + 1; }
  it.reps++; it.last = t; it.lastQ = q;
  if (q === 0) { it.box = 0; it.lapses++; it.due = addDays(t, 1); }
  else if (q === 1) { it.box = Math.max(1, it.box); it.due = addDays(t, it.box >= 3 ? 2 : 1); }
  else { it.box = Math.min(7, it.box + 1); it.due = addDays(t, Math.min(INTERVALS[it.box - 1], urgency().cap)); }
  const gained = q === 2 ? XP[game] : q === 1 ? Math.ceil(XP[game] / 2) : 1;
  addXP(gained);
  return gained;
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

// Priority = pattern frequency in OAs/interviews, then difficulty
const PATTERN_PRIORITY = ['hashmap', 'two_pointers', 'sliding_window', 'binary_search', 'tree_dfs', 'grid_graph', 'dp_1d', 'heap',
  'intervals', 'stack', 'linked_list', 'backtracking', 'tree_bfs', 'mono_stack', 'prefix', 'greedy', 'topo_sort', 'dp_2d',
  'union_find', 'trie', 'shortest_path', 'bit', 'matrix_math'];
const DIFF = { Easy: 0, Medium: 1, Hard: 2 };

// Round-robin across patterns so new material is interleaved, not blocked by topic.
function interleave(objs) {
  const by = {};
  for (const o of objs) (by[o.pattern] ||= []).push(o);
  for (const k in by) by[k].sort((a, b) => (DIFF[a.diff] ?? 1) - (DIFF[b.diff] ?? 1) || a.num - b.num);
  const order = PATTERN_PRIORITY.filter(p => by[p]).concat(Object.keys(by).filter(p => !PATTERN_PRIORITY.includes(p)));
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
  if (g.gate) { const gated = fresh.filter(g.gate); fresh = gated.length >= Math.min(n, budget) ? gated : gated.concat(fresh.filter(o => !g.gate(o))); }
  let q = due.slice(0, n);
  if (q.length < n) q = q.concat(fresh.slice(0, Math.min(n - q.length, Math.max(budget, due.length ? 0 : Math.min(n, 2)))));
  if (q.length < n) {
    const ahead = pool.filter(o => item(game, o.id) && !q.includes(o)).sort((a, b) => item(game, a.id).due.localeCompare(item(game, b.id).due));
    q = q.concat(ahead.slice(0, n - q.length));
  }
  if (q.length < n) q = q.concat(fresh.filter(o => !q.includes(o)).slice(0, n - q.length));
  return game === 'sprint' || game === 'syntax' ? shuffle(q) : q;
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

// ─────────────────────────── daily plan ───────────────────────────
function buildPlan() {
  const M = S.settings.minutes, f = S.settings.focus, u = urgency();
  const blocks = [];
  const add = (game, n) => n > 0 && blocks.push({ game, target: n, done: 0 });
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
  return { date: today(), minutes: M, blocks };
}
function currentPlan() {
  if (!S.plan || S.plan.date !== today() || S.plan.minutes !== S.settings.minutes) {
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
  const l = level(S.xp), u = urgency();
  const into = S.xp - levelFloor(l), span = levelFloor(l + 1) - levelFloor(l);
  $('#hud').innerHTML = `
    <span class="pill ${u.mode}" title="Set in Settings">${esc(u.label)}</span>
    <span class="pill" title="Streak (best ${S.streak.best || 0})">🔥 ${S.streak.last === today() || S.streak.last === addDays(today(), -1) ? S.streak.count : 0}</span>
    <span class="pill" title="${into}/${span} XP to next level">Lv ${l} · ${S.xp} XP</span>${Cloud.pill()}`;
}
const ROUTES = {};
let cleanup = [];
function onLeave(fn) { cleanup.push(fn); }
function route() {
  cleanup.forEach(f => { try { f(); } catch (e) {} }); cleanup = [];
  const [path, qs] = (location.hash.slice(1) || '/today').split('?');
  const parts = path.split('/').filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  $$('nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === parts[0] || (parts[0] === 'play' && a.dataset.nav === 'games')));
  const app = $('#app'); app.innerHTML = '';
  (ROUTES[parts[0]] || ROUTES.today)(app, parts.slice(1), params);
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

// ─────────────────────────── shared game pieces ───────────────────────────
const PAT = id => C.patterns.find(p => p.id === id) || { name: id, color: '#888' };
const PROB = id => C.problems.find(p => p.id === id);
function patternTag(id) { const p = PAT(id); return `<span class="tag" style="color:${p.color}">${esc(p.name)}</span>`; }
function resultsHtml(r) {
  if (!r) return '';
  let h = '';
  if (r.error) h += `<div class="err">${esc(r.error)}</div>`;
  for (const x of r.results || []) {
    h += `<div class="res ${x.pass ? '' : 'fail'}">${x.pass ? '✓' : '✗'} ${esc(x.input || '')}${x.pass ? '' :
      `\n   expected ${esc(x.expected ?? '')}\n   got      ${esc(x.got ?? '')}${x.error ? '\n   ' + esc(x.error) : ''}`}</div>`;
  }
  if (r.ok) h = `<div class="res">✓ All ${r.results.length} tests passed${r.ms != null ? ` (${r.ms} ms)` : ''}</div>`;
  return `<div class="results">${h}</div>`;
}
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
  const key = e => { if (e.target.matches('input,textarea')) return; if (['1', '2', '3'].includes(e.key)) go(+e.key - 1); };
  document.addEventListener('keydown', key); onLeave(() => document.removeEventListener('keydown', key));
  el._cleanup = () => document.removeEventListener('keydown', key);
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
  onLeave(stop);
  return { stop, elapsed: () => (Date.now() - t0) / 1000 };
}

// Generic session runner: shows n rounds of a game, grades each, then a summary.
function runSession(app, game, n, fromPlan, filter) {
  const g = GAMES[game];
  const queue = chooseItems(game, n, filter);
  const exitHref = filter ? `#/study/${filter}` : fromPlan ? '#/today' : '#/games';
  if (!queue.length) { app.innerHTML = `<div class="card">Nothing to practise here yet.</div>`; return; }
  let i = 0; const tally = [0, 0, 0]; let xpGained = 0;
  const shell = document.createElement('div');
  app.append(shell);
  const next = () => {
    shell.innerHTML = '';
    if (i >= queue.length) return summary();
    const head = document.createElement('div');
    head.className = 'gamehead';
    head.innerHTML = `<a href="${exitHref}" class="btn ghost">← Exit</a><b>${g.icon} ${g.name}</b>${filter ? ` ${patternTag(filter)}` : ''}
      <div class="progress"><i style="width:${i / queue.length * 100}%"></i></div><span class="muted">${i + 1}/${queue.length}</span>
      <span class="timer" id="clock"></span>`;
    const body = document.createElement('div');
    shell.append(head, body);
    const o = queue[i];
    g.render(body, o, q => {
      tally[q]++; xpGained += review(game, o.id, q);
      if (fromPlan) planTick(game);
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
        ${fromPlan && nextBlock ? `<a class="btn primary" href="#/play/${nextBlock.game}?plan=1">Next: ${GAMES[nextBlock.game].icon} ${GAMES[nextBlock.game].name} →</a>` : ''}
        <a class="btn" href="#/play/${game}?n=${n}${filter ? '&pattern=' + filter : ''}&r=${Math.random().toString(36).slice(2, 6)}">Another round</a>
        <a class="btn ghost" href="${filter ? exitHref : '#/today'}">${filter ? 'Back to lesson' : 'Today'}</a></div></div>`;
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
    const bar = $('.timebar > i', el);
    const t0 = Date.now(); let answered = false;
    const iv = setInterval(() => { const left = 1 - (Date.now() - t0) / 1000 / secs; bar.style.width = Math.max(0, left * 100) + '%';
      clock.textContent = Math.max(0, secs - (Date.now() - t0) / 1000).toFixed(1); if (left <= 0) answer(null); }, 100);
    onLeave(() => clearInterval(iv));
    const answer = p => {
      if (answered) return; answered = true; clearInterval(iv);
      const secsTaken = (Date.now() - t0) / 1000;
      const right = p === s.pattern;
      $$('.options button', el).forEach(b => { b.disabled = true; if (b.dataset.p === s.pattern) b.classList.add('right'); else if (b.dataset.p === p) b.classList.add('wrong'); });
      const q = !right ? 0 : secsTaken > secs * 0.6 ? 1 : 2;
      GAMES.sprint.combo = right ? (GAMES.sprint.combo || 0) + 1 : 0;
      $('#rev', el).innerHTML = `<div class="reveal"><b>${esc(s.title)}</b> → ${patternTag(s.pattern)}<br>
        <span>Key move: ${esc(s.move)}</span><div class="muted small">${p === null ? 'Time up.' : right ? `${secsTaken.toFixed(1)}s` : 'Not quite.'}
        ${right && q === 1 ? ' Correct but slow, so counted as shaky.' : ''}</div></div>
        <div class="row" style="margin-top:12px"><button class="primary" id="nx">Next <kbd>Enter</kbd></button></div>`;
      const go = () => { document.removeEventListener('keydown', k2); done(q); };
      const k2 = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
      setTimeout(() => document.addEventListener('keydown', k2), 150); onLeave(() => document.removeEventListener('keydown', k2));
      $('#nx', el).onclick = go;
    };
    el.addEventListener('click', e => { const b = e.target.closest('.options button'); if (b) answer(b.dataset.p); });
    const k = e => { if (!answered && ['1', '2', '3', '4'].includes(e.key)) answer(opts[+e.key - 1]); };
    document.addEventListener('keydown', k); onLeave(() => document.removeEventListener('keydown', k));
  },
};

// 2. Line Up — Parsons problem: put the shuffled solution lines in order.
GAMES.lineup = {
  name: 'Line Up', icon: '🧩', layer: 'Structure', cost: 1.5, defaultN: 4,
  desc: 'The real solution, lines shuffled (indentation kept as a hint). Put them in order. Checked against real tests.',
  pool: () => C.problems,
  render(el, p, done, { clock }) {
    const lines = p.solution.split('\n').filter(t => t.trim()).map((t, i) => ({ t, i }));
    let pool = shuffle(lines), built = [], tries = 0, hint = false;
    const timer = startTimer(clock, 0, null, { countUp: true });
    el.innerHTML = `<div class="card"><div class="row"><h3>${esc(p.title)}</h3><span class="tag ${p.diff}">${p.diff}</span>
      <span class="spacer"></span><button class="ghost" id="hint">Show pattern</button></div>
      <p>${esc(p.statement)}</p><div id="hintbox"></div>
      <div class="parsons"><div><div class="muted small">Shuffled lines: click to add</div><div class="lines" id="pool"></div></div>
      <div><div class="muted small">Your solution: click a line to send it back</div><div class="lines" id="built"></div></div></div>
      <div class="row" style="margin-top:12px"><button class="primary" id="check">Run tests <kbd>Ctrl+Enter</kbd></button>
      <button class="ghost" id="giveup">Show answer</button><span class="spacer"></span><span class="muted small" id="cnt"></span></div>
      <div id="out"></div></div>`;
    const draw = () => {
      $('#pool', el).innerHTML = pool.map((l, k) => `<div class="ln" data-k="${k}">${esc(l.t)}</div>`).join('');
      $('#built', el).innerHTML = built.map((l, k) => `<div class="ln" data-k="${k}"><span class="num">${k + 1}</span>${esc(l.t)}</div>`).join('') || '<div class="muted small" style="padding:8px">Start with the function signature.</div>';
      $('#cnt', el).textContent = `${built.length}/${lines.length} lines`;
    };
    $('#pool', el).onclick = e => { const d = e.target.closest('.ln'); if (!d) return; built.push(pool.splice(+d.dataset.k, 1)[0]); draw(); };
    $('#built', el).onclick = e => { const d = e.target.closest('.ln'); if (!d) return; pool.push(built.splice(+d.dataset.k, 1)[0]); draw(); };
    $('#hint', el).onclick = () => { hint = true; $('#hintbox', el).innerHTML = `<div class="reveal">${patternTag(p.pattern)} ${esc(p.insight)}</div>`; };
    const finish = q => { timer.stop(); el.querySelector('#out').append(gradeButtons(done, q)); };
    let finished = false;
    const check = async () => {
      if (finished) return;
      if (pool.length) { toast(`Place all lines first (${pool.length} left)`); return; }
      tries++;
      const r = await runTests(p, built.map(l => l.t).join('\n'));
      $('#out', el).innerHTML = resultsHtml(r);
      if (r.ok) { finished = true; finish(tries === 1 && !hint ? 2 : 1); }
      else {
        const firstWrong = built.findIndex((l, k) => l.t.trim() !== lines[k].t.trim());
        if (firstWrong >= 0) $('#out', el).insertAdjacentHTML('beforeend', `<p class="muted small">Hint: the first line that differs from the reference is line ${firstWrong + 1}.</p>`);
      }
    };
    $('#check', el).onclick = check;
    $('#giveup', el).onclick = () => { if (finished) return; finished = true; $('#out', el).innerHTML = `<pre class="code">${esc(p.solution)}</pre><p>${esc(p.insight)}</p>`; finish(0); };
    const k = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) check(); };
    document.addEventListener('keydown', k); onLeave(() => document.removeEventListener('keydown', k));
    draw();
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
    const key = new Set(p.key_lines);
    let tries = 0, hint = false, finished = false;
    const timer = startTimer(clock, 0, null, { countUp: true });
    el.innerHTML = `<div class="card"><div class="row"><h3>${esc(p.title)}</h3><span class="tag ${p.diff}">${p.diff}</span>
      ${patternTag(p.pattern)}<span class="spacer"></span><button class="ghost" id="hint">Hint</button></div>
      <p>${esc(p.statement)}</p><div id="hintbox"></div>
      <div class="fill">${lines.map((l, i) => {
        if (!key.has(i)) return `<div class="l">${esc(l) || ' '}</div>`;
        const ind = l.match(/^ */)[0];
        return `<div class="l"><input type="text" data-i="${i}" autocomplete="off" spellcheck="false" placeholder="key line" style="margin-left:${ind.length}ch"></div>`;
      }).join('')}</div>
      <div class="row" style="margin-top:12px"><button class="primary" id="check">Run tests <kbd>Ctrl+Enter</kbd></button>
      <button class="ghost" id="giveup">Show answer</button></div><div id="out"></div></div>`;
    const inputs = $$('input', el);
    inputs[0]?.focus();
    inputs.forEach((inp, k) => inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.ctrlKey) { e.preventDefault(); (inputs[k + 1] || inp).focus(); }
      if (e.key === 'Enter' && e.ctrlKey) check();
    }));
    $('#hint', el).onclick = () => { hint = true; $('#hintbox', el).innerHTML = `<div class="reveal">${esc(p.insight)}<br><span class="muted">Catch: ${esc(p.catch)}</span></div>`; };
    const finish = q => { timer.stop(); $('#out', el).append(gradeButtons(done, q)); };
    const check = async () => {
      if (finished) return; tries++;
      const code = lines.map((l, i) => key.has(i) ? l.match(/^ */)[0] + el.querySelector(`input[data-i="${i}"]`).value.trim() : l).join('\n');
      const r = await runTests(p, code);
      $('#out', el).innerHTML = resultsHtml(r);
      if (r.ok) { finished = true; finish(tries === 1 && !hint ? 2 : 1); }
    };
    $('#check', el).onclick = check;
    $('#giveup', el).onclick = () => {
      if (finished) return; finished = true;
      inputs.forEach(inp => { const want = lines[+inp.dataset.i].trim(); if (inp.value.trim() !== want) { inp.title = 'You wrote: ' + inp.value; inp.value = want; inp.style.borderColor = 'var(--bad)'; } });
      $('#out', el).innerHTML = `<div class="reveal">${esc(p.insight)}<br><span class="muted">Catch: ${esc(p.catch)}</span></div>`;
      finish(0);
    };
  },
};

// 4. Skeleton Recall — write the pattern's template from memory.
GAMES.skeleton = {
  name: 'Skeleton Recall', icon: '🦴', layer: 'Structure', cost: 2, defaultN: 2,
  desc: 'Given only the pattern name, write its generic template from memory. Compare with the reference and grade yourself honestly.',
  pool: () => C.patterns.map((p, i) => ({ ...p, num: i, diff: 'Medium', pattern: p.id })),
  render(el, pt, done, { clock }) {
    const timer = startTimer(clock, 120, () => submit());
    el.innerHTML = `<div class="card"><h3>${esc(pt.name)}</h3>
      <p class="muted small">Used when: ${pt.triggers.map(esc).join(' · ')}</p>
      <textarea class="code" id="ed" placeholder="# write the skeleton: loop shape, state, the condition, return"></textarea>
      <div class="row" style="margin-top:10px"><button class="primary" id="go">Compare <kbd>Ctrl+Enter</kbd></button></div><div id="out"></div></div>`;
    const ed = $('#ed', el); enhanceEditor(ed, { onSubmit: () => submit() }); ed.focus();
    let sent = false;
    const submit = () => {
      if (sent) return; sent = true; timer.stop(); ed.readOnly = true;
      const norm = s => s.split('\n').map(l => l.replace(/#.*$/, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
      const mine = norm(ed.value), ref = norm(pt.skeleton);
      const tok = s => new Set(s.join(' ').split(/[^\w]+/).filter(w => w.length > 1));
      const a = tok(mine), b = tok(ref); let hit = 0; b.forEach(w => a.has(w) && hit++);
      const pct = b.size ? Math.round(hit / b.size * 100) : 0;
      $('#out', el).innerHTML = `<div class="side" style="margin-top:12px"><div><div class="muted small">Reference</div><pre class="code">${esc(pt.skeleton)}</pre></div>
        <div><div class="muted small">Fill-in questions</div><ul>${pt.fill.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
        <p>Keyword overlap: <b>${pct}%</b></p><p class="muted small">Grade the structure (loop shape, state, condition, return), not the variable names.</p></div></div>`;
      $('#out', el).append(gradeButtons(done, pct >= 70 ? 2 : pct >= 40 ? 1 : 0));
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
      <textarea class="code" id="ed" style="min-height:90px" placeholder="your code"></textarea>
      <div class="row" style="margin-top:10px"><button class="primary" id="go">Check <kbd>Ctrl+Enter</kbd></button><button class="ghost" id="ans">Show answer</button></div>
      <div id="out"></div></div>`;
    const ed = $('#ed', el); enhanceEditor(ed, { onSubmit: () => check() }); ed.focus();
    const finish = q => { finished = true; timer.stop(); $('#out', el).append(gradeButtons(done, q)); };
    const check = async () => {
      if (finished) return; tries++;
      const r = await runSyntax(s, ed.value);
      $('#out', el).innerHTML = r.ok ? `<div class="res">✓ Correct</div><pre class="code">${esc(s.answer)}</pre>` : `<div class="res fail">✗ ${esc(r.error || 'Check failed: ' + s.check)}</div>`;
      if (r.ok) finish(tries === 1 ? 2 : 1);
    };
    $('#go', el).onclick = check;
    $('#ans', el).onclick = () => { if (finished) return; $('#out', el).innerHTML = `<pre class="code">${esc(s.answer)}</pre>`; finish(0); };
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
    el.innerHTML = `<div class="card"><div class="row"><h3>${esc(p.title)}</h3>${patternTag(p.pattern)}</div>
      <p class="muted small">${esc(p.statement)}</p><pre class="code">${esc(p.solution)}</pre>
      <div class="side"><div><b>Time</b><div class="options" id="t">${to.map(c => `<button data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
      <div><b>Space</b> <span class="muted small">(extra, excluding output)</span><div class="options" id="s">${so.map(c => `<button data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div></div></div>
      <div id="out"></div></div>`;
    const maybe = () => {
      if (pickT == null || pickS == null) return;
      timer.stop();
      const okT = pickT === p.time, okS = pickS === p.space;
      [['#t', p.time, pickT], ['#s', p.space, pickS]].forEach(([sel, right, mine]) => $$(sel + ' button', el).forEach(b => {
        b.disabled = true; if (b.dataset.c === right) b.classList.add('right'); else if (b.dataset.c === mine) b.classList.add('wrong'); }));
      $('#out', el).innerHTML = `<div class="reveal">Time <b>${esc(p.time)}</b> · Space <b>${esc(p.space)}</b><br>${esc(p.insight)}</div>`;
      const q = okT && okS ? 2 : okT || okS ? 1 : 0;
      const nx = Object.assign(document.createElement('button'), { className: 'primary', textContent: 'Next' });
      nx.style.marginTop = '10px'; nx.onclick = () => done(q);
      $('#out', el).append(nx);
    };
    $('#t', el).onclick = e => { const b = e.target.closest('button'); if (!b || pickT) return; pickT = b.dataset.c; b.style.outline = '2px solid var(--accent)'; maybe(); };
    $('#s', el).onclick = e => { const b = e.target.closest('button'); if (!b || pickS) return; pickS = b.dataset.c; b.style.outline = '2px solid var(--accent)'; maybe(); };
  },
};

// 7. Edge Hunter — list clarifying questions & edge cases, then self-check.
GAMES.edge = {
  name: 'Edge Hunter', icon: '🔍', layer: 'In-person', cost: 1.5, defaultN: 2, focus: 'clarify',
  desc: 'You have 60 seconds to write the clarifying questions and edge cases you would raise. Then tick off what you covered.',
  pool: () => C.problems,
  render(el, p, done, { clock }) {
    el.innerHTML = `<div class="card"><div class="row"><h3>${esc(p.title)}</h3><span class="tag ${p.diff}">${p.diff}</span></div>
      <p class="prompt" style="font-size:17px">${esc(p.statement)}</p>
      <textarea id="ed" style="min-height:150px" placeholder="- What if the input is empty?&#10;- Can there be duplicates?&#10;- ..."></textarea>
      <div class="row" style="margin-top:10px"><button class="primary" id="go">Reveal checklist <kbd>Ctrl+Enter</kbd></button></div><div id="out"></div></div>`;
    const ed = $('#ed', el); ed.focus();
    const timer = startTimer(clock, 60, () => reveal());
    let shown = false;
    const reveal = () => {
      if (shown) return; shown = true; timer.stop(); ed.readOnly = true;
      const specific = [...p.clarify.map(c => '❓ ' + c), ...p.edges.map(c => '⚠️ ' + c)];
      $('#out', el).innerHTML = `<h3 style="margin-top:14px">Tick what you covered</h3><div class="checklist">${specific.map((c, i) =>
        `<label><input type="checkbox" data-i="${i}"> ${esc(c)}</label>`).join('')}</div>
        <details style="margin-top:8px"><summary>Generic questions worth asking on any problem</summary><ul>${C.clarify_generic.map(c => `<li>${esc(c)}</li>`).join('')}</ul></details>
        <div class="row" style="margin-top:12px"><button class="primary" id="score">Score it</button></div>`;
      $('#score', el).onclick = () => {
        const got = $$('.checklist input:checked', el).length, pct = specific.length ? got / specific.length : 1;
        $('#score', el).disabled = true;
        $('#out', el).append(gradeButtons(done, pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0));
      };
    };
    $('#go', el).onclick = reveal;
    ed.addEventListener('keydown', e => { if (e.key === 'Enter' && e.ctrlKey) reveal(); });
  },
};

// 8. OA Mode — write the whole thing from a blank editor against the clock.
GAMES.oa = {
  name: 'OA Mode', icon: '💻', layer: 'Full solve', cost: 20, defaultN: 1,
  desc: 'Online-assessment conditions: a statement, a signature, a timer and a run button. No hints unless you give up.',
  pool: () => C.problems,
  gate: p => (item('fill', p.id)?.box || 0) >= 1,
  render(el, p, done, { clock }) {
    const mins = { Easy: 15, Medium: 25, Hard: 40 }[p.diff] || 25;
    let runs = 0, finished = false;
    el.innerHTML = `<div class="card"><div class="row"><h3>${esc(p.title)}</h3><span class="tag ${p.diff}">${p.diff}</span>
      <span class="muted small">${mins} min budget</span></div><p class="prompt" style="font-size:16px">${esc(p.statement)}</p>
      <textarea class="code" id="ed"></textarea>
      <div class="row" style="margin-top:10px"><button class="primary" id="run">Run tests <kbd>Ctrl+Enter</kbd></button>
      <button class="ghost" id="give">Give up & study</button><span class="spacer"></span><span class="muted small" id="rc"></span></div><div id="out"></div></div>`;
    const ed = $('#ed', el); ed.value = p.starter; enhanceEditor(ed, { onSubmit: () => run() }); ed.focus();
    ed.selectionStart = ed.selectionEnd = ed.value.length - 1;
    const timer = startTimer(clock, mins * 60, () => toast('⏰ Time budget used: finish up or give up'));
    const finish = q => { finished = true; const t = timer.stop(); $('#out', el).insertAdjacentHTML('beforeend', `<p class="muted small">Time: ${fmtTime(t)} · runs: ${runs}</p>`); $('#out', el).append(gradeButtons(done, q)); };
    const run = async () => {
      if (finished) return; runs++; $('#rc', el).textContent = `${runs} run${runs > 1 ? 's' : ''}`;
      const r = await runTests(p, ed.value);
      $('#out', el).innerHTML = resultsHtml(r);
      if (r.ok) finish(timer.elapsed() <= mins * 60 && runs <= 3 ? 2 : 1);
    };
    $('#run', el).onclick = run;
    $('#give', el).onclick = () => { if (finished) return; $('#out', el).innerHTML = `<div class="reveal">${patternTag(p.pattern)} ${esc(p.insight)}<br><span class="muted">Catch: ${esc(p.catch)}</span></div><pre class="code">${esc(p.solution)}</pre>`; finish(0); };
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
    let ph = 0, timer = null, timerPhase = -1, storeCur = null; const notes = {}; let rec = null, chunks = [], audioUrl = null;
    const draw = () => {
      if (timer && timerPhase !== ph) timer.stop();
      const P = phases[ph];
      const head = `<div class="phase">${phases.map((x, i) => `<span class="${i === ph ? 'on' : i < ph ? 'done' : ''}">${i + 1}. ${x.name}</span>`).join('')}</div>`;
      const side = `<div class="card"><h3>Say it out loud</h3><ol class="small" style="padding-left:18px;margin:0">${C.think_aloud.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
        ${S.settings.focus.talk ? `<div class="row" style="margin-top:12px"><button id="rec">${rec ? '⏹ Stop recording' : '🎙 Record myself'}</button></div>
        ${audioUrl ? `<audio controls src="${audioUrl}" style="width:100%;margin-top:8px"></audio>` : ''}` : ''}</div>`;
      let main = `<div class="card"><div class="row"><h3>${esc(p.title)}</h3><span class="tag ${p.diff}">${p.diff}</span></div><p class="prompt" style="font-size:16px">${esc(p.statement)}</p>`;
      if (P.id === 'clarify') main += `<p class="muted">Before solving: ask your questions. Type them as you say them.</p><textarea id="n" style="min-height:140px">${esc(notes.clarify || '')}</textarea>`;
      if (P.id === 'plan') main += `<details open><summary>Answers to typical clarifying questions</summary><ul class="small">${p.clarify.map(c => `<li>${esc(c)}</li>`).join('') || '<li>Standard constraints.</li>'}</ul></details>
        <p class="muted">Say: brute force + its cost → the bottleneck → the pattern → 3-5 step plan. Commit to a complexity.</p>
        <textarea id="n" style="min-height:150px" placeholder="Brute force: ...&#10;Bottleneck: ...&#10;Pattern: ...&#10;Plan: 1) ... 2) ...">${esc(notes.plan || '')}</textarea>
        <div class="row" style="margin-top:8px">Time <select id="ct">${C.complexities.map(c => `<option ${notes.ct === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
        Space <select id="cs">${C.complexities.map(c => `<option ${notes.cs === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>`;
      if (P.id === 'code') main += `<p class="muted">Whiteboard rules: no run button, no auto-indent. Narrate what each block is for.</p><textarea class="code" id="n">${esc(notes.code || p.starter)}</textarea>`;
      if (P.id === 'test') main += `<p class="muted">Trace your code on the example and 2 edge cases, out loud. Fix bugs you find. Still no running.</p>
        <textarea class="code" id="n">${esc(notes.code)}</textarea><textarea id="n2" style="min-height:80px;margin-top:8px" placeholder="Dry-run notes / edge cases tested">${esc(notes.test || '')}</textarea>`;
      if (P.id === 'score') main += `<div id="res"><p class="muted">Running your final code…</p></div><h3 style="margin-top:12px">Score yourself (1 = weak, 4 = strong)</h3>
        <table>${C.rubric.map(r => `<tr><td><b>${esc(r.name)}</b><div class="muted small">${esc(r.desc)}</div></td><td style="white-space:nowrap">${[1, 2, 3, 4].map(v =>
          `<label style="margin-right:6px"><input type="radio" name="${r.id}" value="${v}"> ${v}</label>`).join('')}</td></tr>`).join('')}</table>
        <div class="row" style="margin-top:12px"><button class="primary" id="save">Save mock</button></div>`;
      if (P.id !== 'score') main += `<div class="row" style="margin-top:10px"><button class="primary" id="nextp">Next phase →</button><span class="muted small">Suggested ${P.mins} min</span></div>`;
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
    onLeave(() => rec && rec.stop());
    const scorePhase = async () => {
      const r = await runTests(p, notes.code || '');
      const okT = notes.ct === p.time, okS = notes.cs === p.space;
      $('#res', el).innerHTML = resultsHtml(r) + `<div class="reveal">You said time <b>${esc(notes.ct)}</b> ${okT ? '✓' : '✗'}, space <b>${esc(notes.cs)}</b> ${okS ? '✓' : '✗'}.
        Reference: ${esc(p.time)} / ${esc(p.space)}.<br>${patternTag(p.pattern)} ${esc(p.insight)}</div>
        <details><summary>Reference solution</summary><pre class="code">${esc(p.solution)}</pre></details>`;
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
  const plan = currentPlan(), u = urgency();
  const total = plan.blocks.reduce((a, b) => a + b.target, 0), doneN = plan.blocks.reduce((a, b) => a + b.done, 0);
  const pct = total ? Math.round(doneN / total * 100) : 0;
  const nextBlock = plan.blocks.find(b => b.done < b.target);
  const weakest = C.patterns.map(p => ({ p, m: mastery(p.id) })).sort((a, b) => a.m - b.m).slice(0, 3);
  app.innerHTML = `
    <div class="hero"><div class="ring" style="--p:${pct}"><div>${pct}%</div></div>
      <div><h1>${pct === 100 ? 'Done for today 🎉' : 'Today’s session'}</h1>
      <p class="muted">${S.settings.minutes} min plan · <b>${esc(u.label)}</b>${u.mode === 'urgent' ? ' · urgent mode: reviews are packed closer together' : ''}</p>
      <div class="row">${nextBlock ? `<a class="btn primary" href="#/play/${nextBlock.game}?plan=1">▶ ${pct ? 'Continue' : 'Start'}: ${GAMES[nextBlock.game].name}</a>` : `<a class="btn primary" href="#/games">Extra practice</a>`}
      <a class="btn ghost" href="#/settings">Adjust time / date</a></div></div></div>
    ${(() => { const nl = nextLesson(); return nl ? `<h2>Learn</h2><a class="card block" href="#/study/${nl.id}" style="color:inherit"><div class="icon">📖</div>
      <div style="flex:1"><div class="row"><b>Today's lesson: <span style="color:${nl.color}">${esc(nl.name)}</span></b><span class="tag">Study</span></div>
      <div class="muted small">~10 min: read the lesson, build the skeleton line by line, walk through 2 problems. Then the games below keep it alive.</div></div>
      <div class="mono">${studyOrder().filter(p => lessonDone(p.id)).length}/${studyOrder().length}</div></a>` : ''; })()}
    <h2>Practice</h2>
    <div class="grid">${plan.blocks.map(b => { const g = GAMES[b.game]; const d = dueCount(b.game);
      return `<a class="card block ${b.done >= b.target ? 'done' : ''}" href="#/play/${b.game}?plan=1" style="color:inherit">
        <div class="icon">${g.icon}</div><div style="flex:1"><div class="row"><b>${g.name}</b><span class="tag">${g.layer}</span>
        ${d ? `<span class="tag" style="color:var(--accent)">${d} due</span>` : ''}</div>
        <div class="muted small">${esc(g.desc)}</div><div class="bar"><i style="width:${b.done / b.target * 100}%"></i></div></div>
        <div class="mono">${b.done}/${b.target}</div></a>`; }).join('')}</div>
    <h2>Weakest patterns right now</h2>
    <div class="grid g3">${weakest.map(({ p, m }) => `<a class="card" href="#/patterns/${p.id}" style="color:inherit"><b style="color:${p.color}">${esc(p.name)}</b>
      <div class="muted small">${Math.round(m * 100)}% mastery</div><div class="small">${p.triggers.slice(0, 2).map(esc).join(' · ')}</div></a>`).join('')}</div>`;
};

ROUTES.games = app => {
  app.innerHTML = `<h1>Games</h1><p class="muted">The ladder goes Idea → Structure → Syntax → Full solve → In-person. Use the daily plan, or grind any game here.</p>
    <div class="grid g2">${Object.entries(GAMES).map(([id, g]) => `<div class="card"><div class="row"><span style="font-size:26px">${g.icon}</span><h3 style="margin:0">${g.name}</h3>
      <span class="tag">${g.layer}</span><span class="spacer"></span>${dueCount(id) ? `<span class="tag" style="color:var(--accent)">${dueCount(id)} due</span>` : ''}</div>
      <p class="muted small">${esc(g.desc)}</p><div class="row"><a class="btn primary" href="#/play/${id}?n=${g.defaultN}">Play ${g.defaultN > 1 ? g.defaultN + ' rounds' : ''}</a>
      ${g.defaultN > 1 ? `<a class="btn ghost" href="#/play/${id}?n=${g.defaultN * 2}">×${g.defaultN * 2}</a>` : ''}</div></div>`).join('')}</div>`;
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
function PROBLEM_OR_ITEM(game, id) { return GAMES[game].pool().find(o => o.id === id); }
function runFixed(app, game, o) {
  const g = GAMES[game]; const shell = document.createElement('div'); app.append(shell);
  const back = () => history.length > 1 ? history.back() : (location.hash = `#/patterns/${o.pattern}`);
  shell.innerHTML = `<div class="gamehead"><button class="ghost" id="bk">← Back</button><b>${g.icon} ${g.name}</b><span class="spacer"></span><span class="timer" id="clock"></span></div><div id="b"></div>`;
  $('#bk', shell).onclick = back;
  g.render($('#b', shell), o, q => { const x = review(game, o.id, q); toast(`+${x} XP`); back(); }, { clock: $('#clock', shell) });
}

ROUTES.patterns = (app, [pid]) => {
  if (pid) {
    const p = PAT(pid);
    const probs = C.problems.filter(x => x.pattern === pid);
    const cards = C.sprint.filter(x => x.pattern === pid);
    app.innerHTML = `<a href="#/patterns">← All patterns</a><h1 style="color:${p.color}">${esc(p.name)}</h1>
      <p class="muted">${Math.round(mastery(pid) * 100)}% mastery</p>
      <div class="side"><div><h3>Skeleton</h3><pre class="code">${esc(p.skeleton)}</pre></div>
      <div class="card"><h3>Reach for it when</h3><ul>${p.triggers.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      <h3>To fill the skeleton, answer</h3><ol>${p.fill.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
      <a class="btn" href="#/play/skeleton?problem=${pid}">🦴 Recall this skeleton</a></div></div>
      <h2>Coded problems (${probs.length})</h2>
      ${probs.length ? `<table><tr><th>#</th><th>Problem</th><th>Level</th><th>Practise</th></tr>${probs.map(x => `<tr><td>${x.num}</td>
        <td>${esc(x.title)} <span class="tag ${x.diff}">${x.diff}</span><details><summary class="small">Insight & solution</summary><p>${esc(x.insight)}</p>
        <p class="muted">Catch: ${esc(x.catch)}</p><pre class="code">${esc(x.solution)}</pre></details></td>
        <td>${dots(problemLevel(x.id))} <span class="small muted">${LEVEL_NAMES[[0, 1, 2, 4, 6][problemLevel(x.id)]]}</span></td>
        <td class="row"><a href="#/play/lineup?problem=${x.id}">🧩</a><a href="#/play/fill?problem=${x.id}">✍️</a><a href="#/play/oa?problem=${x.id}">💻</a><a href="#/play/mock?problem=${x.id}">🎤</a></td></tr>`).join('')}</table>`
        : '<p class="muted">No coded problems yet. Sprint cards only.</p>'}
      <h2>Sprint cards (${cards.length})</h2><div class="small">${cards.map(c => `<div style="padding:4px 0"><b>${c.num}. ${esc(c.title)}</b>: <span class="muted">${esc(c.move)}</span></div>`).join('')}</div>`;
    return;
  }
  app.innerHTML = `<h1>Patterns</h1><p class="muted">The ~20 shapes behind the NeetCode 150. Each tile shows how well you know it across every game.</p>
    <div class="heat">${C.patterns.map(p => { const m = mastery(p.id);
      return `<a href="#/patterns/${p.id}" style="background:color-mix(in srgb, ${p.color} ${Math.round(8 + m * 60)}%, var(--panel))">
      <b>${Math.round(m * 100)}%</b>${esc(p.name)}<div class="small muted">${C.problems.filter(x => x.pattern === p.id).length} coded · ${C.sprint.filter(x => x.pattern === p.id).length} cards</div></a>`; }).join('')}</div>`;
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
  app.innerHTML = `<h1>Settings</h1>
    <div class="grid" style="max-width:720px">
    <div class="card"><h3>Urgency</h3><p class="muted small">Your next OA or interview. Within 14 days, the app goes into urgent mode and reviews are packed closer together so everything gets a few reps before the date.</p>
      <div class="row"><input type="date" id="date" value="${st.interviewDate || ''}"><button id="nodate" class="ghost">No date</button>
      ${[7, 14, 30].map(d => `<button class="ghost" data-d="${d}">+${d}d</button>`).join('')}</div></div>
    <div class="card"><h3>Daily time: <span id="mv">${st.minutes}</span> min</h3><input type="range" class="slider" id="min" min="10" max="120" step="5" value="${st.minutes}">
      <p class="muted small">The daily plan is rebuilt from this. Mock interviews show up at 70+ min (55+ in urgent mode); OA Mode shows up around 45+ min.</p></div>
    <div class="card"><h3>In-person focus</h3><p class="muted small">Turning these on adds their drills to the daily plan.</p><div class="checklist">
      ${[['talk', 'Talking while coding (mock interviews, recording)'], ['clarify', 'Clarifying questions & edge cases (Edge Hunter)'],
         ['complexity', 'Complexity analysis (Big-O Call)'], ['noide', 'No-IDE coding & nerves (mock interviews, OA timer)']].map(([k, l]) =>
        `<label><input type="checkbox" data-f="${k}" ${st.focus[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
    <div class="card"><h3>New items per day, per game: <span id="nv">${st.newPerDay}</span></h3><input type="range" class="slider" id="new" min="1" max="12" value="${st.newPerDay}">
      <p class="muted small">Pattern Sprint gets 3× this. Reviews always come first; new items fill the rest.</p></div>
    <div class="card"><h3>Sprint timer: <span id="sv">${st.sprintSeconds}</span>s</h3><input type="range" class="slider" id="sec" min="6" max="30" value="${st.sprintSeconds}"></div>
    <div class="card" id="acct" hidden></div>
    <div class="card"><h3>Data</h3><p class="muted small">${SERVER ? 'Progress is saved in progress.json next to server.py'
      : 'Progress is saved in this browser'}${Cloud.signedIn ? ' and synced to your account.' : SERVER ? '.'
      : ' only. Sign in above to sync it, or download a backup and use Restore on the other device.'}</p>
      <div class="row"><button id="export">Download backup</button><button id="import">Restore from backup</button>
      <input type="file" id="importfile" accept=".json,application/json" hidden><button class="bad" id="reset">Reset all progress</button></div></div>
    </div>`;
  const rebuild = () => { if (S.plan) S.plan.minutes = -1; save(); }; // forces rebuild, keeps today's progress
  $('#date').onchange = e => { st.interviewDate = e.target.value || null; rebuild(); toast('Urgency updated'); };
  $('#nodate').onclick = () => { st.interviewDate = null; $('#date').value = ''; rebuild(); toast('No interview date'); };
  $$('[data-d]').forEach(b => b.onclick = () => { st.interviewDate = addDays(today(), +b.dataset.d); $('#date').value = st.interviewDate; rebuild(); toast('Urgency updated'); });
  $('#min').oninput = e => { st.minutes = +e.target.value; $('#mv').textContent = st.minutes; };
  $('#min').onchange = rebuild;
  $('#new').oninput = e => { st.newPerDay = +e.target.value; $('#nv').textContent = st.newPerDay; save(); };
  $('#sec').oninput = e => { st.sprintSeconds = +e.target.value; $('#sv').textContent = st.sprintSeconds; save(); };
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
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const studyOrder = () => PATTERN_PRIORITY.map(PAT).filter(p => p.lesson);
const lessonDone = id => !!S.study.lessons[id];
const walksDone = pid => C.problems.filter(p => p.pattern === pid && S.study.walks[p.id]).length;
const nextLesson = () => studyOrder().find(p => !lessonDone(p.id));
const sortedProblems = pid => C.problems.filter(p => p.pattern === pid).sort((a, b) => DIFF[a.diff] - DIFF[b.diff] || a.num - b.num);

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
  return `<pre class="code">${p.solution.split('\n').map((l, i) => key.has(i) ? `<span class="hl">${esc(l)}</span>` : esc(l)).join('\n')}</pre>`;
}
function drillButtons(pid) {
  return `<div class="row">
    <a class="btn" href="#/play/sprint?pattern=${pid}&n=8">⚡ Spot it (Sprint)</a>
    <a class="btn" href="#/play/skeleton?problem=${pid}">🦴 Recall the skeleton</a>
    <a class="btn" href="#/play/lineup?pattern=${pid}&n=3">🧩 Line Up ×3</a>
    <a class="btn" href="#/play/fill?pattern=${pid}&n=3">✍️ Fill the Gap ×3</a></div>`;
}

ROUTES.study = (app, [pid, probId]) => {
  if (pid && probId) return studyWalk(app, pid, probId);
  if (pid) return studyLesson(app, pid);
  const order = studyOrder(), done = order.filter(p => lessonDone(p.id)).length;
  const nl = nextLesson();
  const syntaxByTopic = {};
  for (const s of C.syntax) (syntaxByTopic[s.topic] ||= []).push(s);
  app.innerHTML = `<h1>Study</h1>
    <p class="muted">Learn a pattern here first, then let the games make it stick. ${done}/${order.length} lessons done · ${Object.keys(S.study.walks).length}/${C.problems.length} walkthroughs.</p>
    ${nl ? `<div class="card" style="border-color:var(--accent)"><div class="row"><span style="font-size:26px">📖</span><div style="flex:1"><div class="muted small">Next lesson</div>
      <b style="font-size:18px;color:${nl.color}">${esc(nl.name)}</b><div class="small muted">${esc(nl.lesson.why.split('. ')[0])}.</div></div>
      <a class="btn primary" href="#/study/${nl.id}">Start lesson →</a></div></div>` : ''}
    <h2>Start here: the method</h2>
    <div class="grid g2">${C.method.map((m, i) => `<details class="card" ${i === 0 && !done ? 'open' : ''}><summary style="color:var(--text);font-size:16px">${esc(m.title)}</summary>
      <ul>${m.points.map(pt => `<li style="margin:6px 0">${md(pt)}</li>`).join('')}</ul></details>`).join('')}
      <details class="card"><summary style="color:var(--text);font-size:16px">Input size → target complexity</summary>
      <table style="margin-top:8px"><tr><th>Constraint</th><th>Aim for</th><th>Usually means</th></tr>${C.input_size.map(r => `<tr><td class="mono">${esc(r[0])}</td><td class="mono">${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</table></details></div>
    <h2>Learning path</h2>
    <p class="muted small">Ordered by how often each pattern shows up in OAs and interviews.</p>
    <div class="grid path">${order.map((p, i) => { const probs = C.problems.filter(x => x.pattern === p.id).length;
      return `<a class="card" href="#/study/${p.id}"><span class="idx">${i + 1}</span><div style="flex:1"><b style="color:${p.color}">${esc(p.name)}</b>
        <div class="small muted">${p.triggers.slice(0, 2).map(esc).join(' · ')}</div></div>
        <span class="small muted">${walksDone(p.id)}/${probs} walkthroughs</span><span class="small muted">${Math.round(mastery(p.id) * 100)}% mastery</span>
        <span class="status ${lessonDone(p.id) ? 'done' : 'todo'}">${lessonDone(p.id) ? '✓ studied' : 'not yet'}</span></a>`; }).join('')}</div>
    <h2>Reference</h2>
    <div class="grid g2">
      <details class="card"><summary style="color:var(--text);font-size:16px">🐍 Python cheat sheet</summary>
        ${Object.entries(syntaxByTopic).map(([t, cards]) => `<h3 style="margin-top:12px">${esc(t)}</h3>${cards.map(c => `<div class="small muted" style="margin-top:6px">${esc(c.prompt)}</div><pre class="code" style="margin:4px 0">${esc(c.answer)}</pre>`).join('')}`).join('')}</details>
      <details class="card"><summary style="color:var(--text);font-size:16px">🎤 Interview talk track</summary>
        <ol>${C.think_aloud.map(t => `<li style="margin:5px 0">${esc(t)}</li>`).join('')}</ol>
        <h3>Questions to ask on any problem</h3><ul>${C.clarify_generic.map(t => `<li>${esc(t)}</li>`).join('')}</ul></details>
    </div>`;
};

function studyLesson(app, pid) {
  const p = PAT(pid); const L = p.lesson;
  if (!L) return ROUTES.study(app, []);
  const order = studyOrder(), idx = order.findIndex(x => x.id === pid);
  const prev = order[idx - 1], next = order[idx + 1];
  const probs = sortedProblems(pid);
  app.innerHTML = `<div class="lesson"><a href="#/study">← Study</a>
    <div class="row" style="margin-top:6px"><h1 style="color:${p.color}">${esc(p.name)}</h1><span class="spacer"></span>
      <span class="status ${lessonDone(pid) ? 'done' : 'todo'}" id="st">${lessonDone(pid) ? '✓ studied' : 'not yet studied'}</span></div>
    <section><h2><span class="n">1</span>Why it exists</h2><p style="font-size:16px">${esc(L.why)}</p></section>
    <section><h2><span class="n">2</span>Spot it</h2><div class="grid g2">
      <div class="card"><h3>Reach for it when you see</h3><ul>${p.triggers.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
      <div class="card"><h3>Don't confuse it with</h3><ul>${L.not_this.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div></div></section>
    <section><h2><span class="n">3</span>Build the skeleton, one line at a time</h2>
      <p class="muted small">Before each reveal, guess what the next line must do. Press <kbd>Space</kbd> or click Next.</p>
      <div class="build" id="build"></div>
      <div class="row" style="margin-top:10px"><button class="primary" id="nextl">Next line</button><button class="ghost" id="all">Show all</button><button class="ghost" id="reset">Restart</button></div></section>
    <section><h2><span class="n">4</span>To fill the blanks, answer these</h2><ol>${p.fill.map(f => `<li style="margin:4px 0">${esc(f)}</li>`).join('')}</ol>
      <p class="muted small">This is the bridge from "I know the pattern" to code: every problem below is this skeleton plus these answers.</p></section>
    <section><h2><span class="n">5</span>Bugs to avoid</h2><ul>${L.bugs.map(b => `<li>${esc(b)}</li>`).join('')}</ul></section>
    <section><h2><span class="n">6</span>Worked examples (${probs.length})</h2>
      <p class="muted small">Start with the first two. Each walkthrough reveals the thinking one step at a time.</p>
      <div class="grid">${probs.map(x => `<a class="card row" href="#/study/${pid}/${x.id}" style="color:var(--text)"><b>${esc(x.title)}</b>
        <span class="tag ${x.diff}">${x.diff}</span><span class="spacer"></span><span class="status ${S.study.walks[x.id] ? 'done' : 'todo'}">${S.study.walks[x.id] ? '✓ understood' : 'walk through →'}</span></a>`).join('')}</div></section>
    <section><h2><span class="n">7</span>Lock it in</h2><p class="muted small">Drill only this pattern right after studying it.</p>${drillButtons(pid)}
      <div class="row" style="margin-top:14px"><button class="${lessonDone(pid) ? 'ghost' : 'good'}" id="mark">${lessonDone(pid) ? 'Mark as not studied' : '✓ Mark lesson studied'}</button></div></section>
    <div class="row" style="margin-top:20px">${prev ? `<a class="btn ghost" href="#/study/${prev.id}">← ${esc(prev.name)}</a>` : ''}<span class="spacer"></span>
      ${next ? `<a class="btn" href="#/study/${next.id}">${esc(next.name)} →</a>` : ''}</div></div>`;
  let shown = 0;
  const draw = () => {
    $('#build', app).innerHTML = L.build.slice(0, shown).map(([code, why], i) =>
      `<div class="bl ${i === shown - 1 ? 'cur' : ''}"><code>${esc(code)}</code><div class="why">${esc(why)}</div></div>`).join('') +
      (shown < L.build.length ? `<div class="bl"><code class="muted">${shown === 0 ? '# press Next to start' : '# next line: what must happen now?'}</code><div></div></div>` : '');
    $('#nextl', app).disabled = shown >= L.build.length;
  };
  $('#nextl', app).onclick = () => { shown = Math.min(L.build.length, shown + 1); draw(); };
  $('#all', app).onclick = () => { shown = L.build.length; draw(); };
  $('#reset', app).onclick = () => { shown = 0; draw(); };
  const key = e => { if (e.key === ' ' && !e.target.matches('input,textarea,button,a')) { e.preventDefault(); $('#nextl', app).click(); } };
  document.addEventListener('keydown', key); onLeave(() => document.removeEventListener('keydown', key));
  $('#mark', app).onclick = () => {
    if (lessonDone(pid)) delete S.study.lessons[pid];
    else { S.study.lessons[pid] = today(); addXP(10); toast('📖 Lesson studied +10 XP'); }
    save(); studyLesson((app.innerHTML = '', app), pid);
  };
  draw();
}

function studyWalk(app, pid, probId) {
  const p = PROB(probId); if (!p) return studyLesson(app, pid);
  const list = sortedProblems(p.pattern), i = list.findIndex(x => x.id === p.id);
  const prev = list[i - 1], next = list[i + 1];
  const steps = [
    { t: 'Clarify first', think: 'What would you ask the interviewer? What inputs could break a naive solution?',
      b: `<div class="grid g2"><div><b>Ask</b><ul>${(p.clarify.length ? p.clarify : ['Standard constraints; nothing tricky.']).map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>
          <div><b>Edge cases</b><ul>${p.edges.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div></div>` },
    { t: 'Brute force', think: 'What is the most obvious way to solve it, and how slow is it?', b: `<p>${esc(p.brute)}</p>` },
    { t: 'The pattern & key insight', think: 'Which pattern removes the slow part? Why?', b: `<p>${patternTag(p.pattern)}</p><p style="font-size:16px">${esc(p.insight)}</p>` },
    { t: 'Pseudocode plan', think: 'Say the steps out loud: what do you track, what happens each step, when do you stop?',
      b: `<ol class="plan">${p.plan.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` },
    { t: 'Code', think: 'Try writing it in your head (or on paper) from the plan first.',
      b: `${codeWithKeys(p)}<p class="muted small"><span style="background:color-mix(in srgb, var(--accent) 22%, transparent);padding:0 6px;border-radius:3px">Highlighted</span> = the lines specific to this problem. Everything else is the <a href="#/study/${p.pattern}">${esc(PAT(p.pattern).name)}</a> skeleton.</p>` },
    { t: 'The catch', think: 'Where would a first attempt go wrong?', b: `<p>⚠️ ${esc(p.catch)}</p>` },
    { t: 'Complexity', think: 'State time and space, and why.', b: `<p class="mono" style="font-size:16px">Time ${esc(p.time)} · Space ${esc(p.space)}</p>` },
  ];
  let open = 0;
  app.innerHTML = `<a href="#/study/${p.pattern}">← ${esc(PAT(p.pattern).name)} lesson</a>
    <div class="row" style="margin-top:6px"><h1>${esc(p.title)}</h1><span class="tag ${p.diff}">${p.diff}</span><span class="muted">#${p.num}</span></div>
    <div class="card"><p style="font-size:16px;margin-top:0">${esc(p.statement)}</p><div class="muted small">Examples</div>${exampleHtml(p)}</div>
    <p class="muted small" style="margin-top:14px">Each step: think of your answer (ideally say it out loud), THEN reveal. <kbd>Space</kbd> reveals the next step.</p>
    <div id="steps"></div><div id="end"></div>`;
  const draw = () => {
    $('#steps', app).innerHTML = steps.map((s, k) => k < open
      ? `<div class="step"><div class="sh"><span class="status done">${k + 1}</span>${esc(s.t)}</div><div class="sb">${s.b}</div></div>`
      : `<div class="step locked"><div class="sh"><span class="status todo">${k + 1}</span>${esc(s.t)}<span class="spacer"></span>${k === open ? '<button class="primary" id="rev">Reveal</button>' : ''}</div>
         ${k === open ? `<div class="sb"><div class="think">🤔 ${esc(s.think)}</div></div>` : ''}</div>`).join('');
    const rb = $('#rev', app); if (rb) rb.onclick = () => { open++; draw(); };
    if (open >= steps.length) {
      $('#end', app).innerHTML = `<div class="card" style="margin-top:14px"><h3>Now make it stick</h3>
        <p class="muted small">Understanding fades in a day unless you retrieve it. Do one of these right now:</p>
        <div class="row"><a class="btn" href="#/play/lineup?problem=${p.id}">🧩 Line Up</a><a class="btn" href="#/play/fill?problem=${p.id}">✍️ Fill the Gap</a>
        <a class="btn" href="#/play/oa?problem=${p.id}">💻 Write it from scratch</a><span class="spacer"></span>
        <button class="${S.study.walks[p.id] ? 'ghost' : 'good'}" id="und">${S.study.walks[p.id] ? '✓ Understood' : '✓ Mark understood'}</button></div></div>
        <div class="row" style="margin-top:14px">${prev ? `<a class="btn ghost" href="#/study/${pid}/${prev.id}">← ${esc(prev.title)}</a>` : ''}<span class="spacer"></span>
        ${next ? `<a class="btn" href="#/study/${pid}/${next.id}">${esc(next.title)} →</a>` : `<a class="btn" href="#/study/${pid}">Back to lesson</a>`}</div>`;
      $('#und', app).onclick = () => { if (!S.study.walks[p.id]) { S.study.walks[p.id] = today(); addXP(4); toast('+4 XP'); save(); } $('#und', app).textContent = '✓ Understood'; $('#und', app).className = 'ghost'; };
    }
  };
  const key = e => { if (e.key === ' ' && !e.target.matches('input,textarea,button,a') && open < steps.length) { e.preventDefault(); open++; draw(); } };
  document.addEventListener('keydown', key); onLeave(() => document.removeEventListener('keydown', key));
  draw();
}

// ─────────────────────────── boot ───────────────────────────
(async () => {
  try {
    C = await loadContent();
    S = normalizeState(await loadState());
  } catch (e) { $('#app').innerHTML = '<div class="card">Can’t load content. Locally, is <code>python server.py</code> running? For static hosting, run <code>python build_static.py</code> first.</div>'; return; }
  markSettingsSeen();
  renderHud(); route();
  Cloud.init().catch(e => console.warn('sync init failed', e));
  if (!SERVER) setTimeout(() => { if (!pyWorker) startPy(); }, 1500);  // warm up Python so the first Run is quick
})();
