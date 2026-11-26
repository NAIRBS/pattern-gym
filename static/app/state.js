/* Pattern Gym · state.js: Saved state, spaced review, time estimates and the daily plan.
   Plain script (no modules): shares one global scope with the other files in index.html's order. */
'use strict';

// ─────────────────────────── state ───────────────────────────
let C = null;           // content from server
let S = null;           // persisted state
const DEFAULTS = {
  settings: { interviewDate: null, minutes: 30, newPerDay: 4, sprintSeconds: 15, sprintNoLimit: false, crunch: 'auto', edgeSeconds: 60, singleKeys: true, highlight: true,
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
const urgency = () => SRS.urgency(daysLeft());   // the rules live in srs.js, with tests

// ─────────────────────────── spaced repetition ───────────────────────────
// Each answered question is a card in a box 0..7 (shown as a level). The box rules are in srs.js.
const LEVEL_NAMES = ['New', 'Seen', 'Learning', 'Learning', 'Solid', 'Solid', 'Locked', 'Locked', 'Locked'];
// XP, levels, streak, mastery and the cold-solve record: the rules live in progress.js, with tests.
function item(game, id) { return S.items[game + ':' + id]; }
function review(game, id, q) {
  const k = game + ':' + id, t = today();
  let it = S.items[k];
  if (!it) { it = S.items[k] = { box: 0, reps: 0, lapses: 0, first: t }; const d = dayRec(); d.newBy[game] = (d.newBy[game] || 0) + 1; }
  schedule(it, q);
  if (game === 'oa') S.days[t] = Progress.recordSolve(dayRec(), q);   // the weekly cold-solve chart on Stats
  const gained = Progress.xpFor(game, q);
  addXP(gained);
  return gained;
}
const schedule = (it, q) => SRS.schedule(it, q, today(), urgency().cap);
function addXP(n) {
  S.xp += n; const d = dayRec(); d.xp += n; d.rounds++;
  const t = today();
  if (S.streak.last !== t) { S.streak = Progress.nextStreak(S.streak, t); toast(`🔥 ${S.streak.count}-day streak`); }
  save();
}
const level = Progress.level, levelFloor = Progress.levelFloor;

// The Study path. Each course comes after what it builds on (Recursion before trees, Backtracking and DP;
// Heap before Dijkstra; Stack before Monotonic Stack), and within that, the patterns that come up most come first.
// New items in the games are interleaved in this order too.
const STUDY_ORDER = ['hashmap', 'prefix', 'two_pointers', 'sliding_window', 'stack', 'binary_search', 'linked_list', 'recursion',
  'tree_dfs', 'tree_bfs', 'backtracking', 'grid_graph', 'heap', 'intervals', 'greedy', 'dp_1d', 'mono_stack', 'topo_sort',
  'union_find', 'dp_2d', 'trie', 'shortest_path', 'bit', 'matrix_math'];
const DIFF = { Easy: 0, Medium: 1, Hard: 2 };

// Round-robin across patterns so new material is interleaved, not blocked by topic.
const interleave = objs => SRS.interleave(objs, STUDY_ORDER);

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
  return Progress.mastery(parts);
}
const problemLevel = pid => Progress.problemLevel(['lineup', 'fill', 'oa'].map(g => item(g, pid)?.box || 0));
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
  if (crunch()) {   // half the day is the crunch lesson or cold solve; the other half keeps patterns alive
    const half = Math.max(8, M / 2);
    add('sprint', clamp(Math.round(half * 0.35 / 0.3), 6, 20)); add('fill', clamp(Math.round(half * 0.5 / 3), 1, 5)); add('syntax', 3);
    fitPlan(blocks, half);
    return { date: today(), minutes: M, crunch: true, blocks };
  }
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
  if (!S.plan || S.plan.date !== today() || S.plan.minutes !== S.settings.minutes || !!S.plan.firstDay !== firstDay() || !!S.plan.crunch !== !!crunch()) {
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
