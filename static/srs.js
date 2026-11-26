/* Scheduling and planning rules, as pure functions: no DOM, no global state.
   Loaded by the page (window.SRS) and by tests/srs.test.js (node). the app passes in today's date,
   the content and your progress; nothing here reads them itself.

   - urgency(daysLeft)              how hard to pack reviews, from the days left to the interview
   - schedule(item, q, today, cap)  the Leitner-box update after a grade (0 blanked, 1 shaky, 2 nailed)
   - interleave(objs, order)        round-robin new material across patterns, easiest first
   - distractors(right, pool, n)    wrong options for "which pattern?", from the patterns it's confused with
   - crunch({...})                  whether the days left can cover the Study path, and if not, what to study
*/
'use strict';
(function (root) {
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return ymd(d); };

  // box 0..7. Nailed: up a box, next due after INTERVALS[box - 1] days, never later than `cap` days.
  // Shaky: at least box 1, back in 1-2 days. Blanked: box 0, a lapse, back tomorrow.
  const INTERVALS = [1, 3, 7, 14, 30, 60, 120];

  function urgency(n) {
    if (n === null || n === undefined || n < 0) return { mode: 'steady', label: 'No interview set', cap: 120 };
    if (n <= 14) return { mode: 'urgent', label: n === 0 ? 'Interview today' : `${n}d to interview`, cap: Math.max(1, Math.floor(n / 2)) };
    if (n <= 45) return { mode: 'focused', label: `${n}d to interview`, cap: Math.max(3, Math.floor(n / 2)) };
    return { mode: 'steady', label: `${n}d to interview`, cap: 120 };
  }

  function schedule(it, q, t, cap = 120) {
    it.reps = (it.reps || 0) + 1; it.last = t; it.lastQ = q; it.box = it.box || 0;
    if (q === 0) { it.box = 0; it.lapses = (it.lapses || 0) + 1; it.due = addDays(t, 1); }
    else if (q === 1) { it.box = Math.max(1, it.box); it.due = addDays(t, it.box >= 3 ? 2 : 1); }
    else { it.box = Math.min(7, it.box + 1); it.due = addDays(t, Math.min(INTERVALS[it.box - 1], cap)); }
    return it;
  }

  const DIFF = { Easy: 0, Medium: 1, Hard: 2 };
  // Round-robin across patterns (in `order`, then any others), each pattern's items easiest first.
  function interleave(objs, order) {
    const by = {};
    for (const o of objs) (by[o.pattern] ||= []).push(o);
    for (const k in by) by[k].sort((a, b) => (DIFF[a.diff] ?? 1) - (DIFF[b.diff] ?? 1) || a.num - b.num);
    const keys = order.filter(p => by[p]).concat(Object.keys(by).filter(p => !order.includes(p)));
    const out = []; let added = true;
    while (added) { added = false; for (const p of keys) if (by[p].length) { out.push(by[p].shift()); added = true; } }
    return out;
  }

  // The patterns each one is most often mistaken for. A "which pattern?" question is only worth asking
  // when the wrong options are plausible: Sliding Window against Two Pointers and Prefix Sum, not against Trie.
  const CONFUSABLE = {
    hashmap: ['two_pointers', 'prefix', 'sliding_window', 'trie'],
    prefix: ['sliding_window', 'hashmap', 'dp_1d', 'two_pointers'],
    two_pointers: ['sliding_window', 'binary_search', 'hashmap', 'greedy'],
    sliding_window: ['two_pointers', 'prefix', 'mono_stack', 'hashmap'],
    stack: ['mono_stack', 'recursion', 'linked_list', 'tree_dfs'],
    mono_stack: ['stack', 'sliding_window', 'heap', 'two_pointers'],
    binary_search: ['two_pointers', 'greedy', 'heap', 'prefix'],
    linked_list: ['two_pointers', 'stack', 'recursion', 'hashmap'],
    recursion: ['backtracking', 'tree_dfs', 'dp_1d', 'stack'],
    tree_dfs: ['tree_bfs', 'recursion', 'backtracking', 'grid_graph'],
    tree_bfs: ['tree_dfs', 'grid_graph', 'shortest_path', 'heap'],
    backtracking: ['dp_1d', 'recursion', 'tree_dfs', 'greedy', 'bit'],
    grid_graph: ['tree_bfs', 'union_find', 'shortest_path', 'dp_2d', 'topo_sort'],
    heap: ['binary_search', 'intervals', 'greedy', 'mono_stack', 'shortest_path'],
    intervals: ['greedy', 'heap', 'prefix', 'two_pointers'],
    greedy: ['dp_1d', 'intervals', 'heap', 'two_pointers'],
    dp_1d: ['greedy', 'backtracking', 'recursion', 'prefix'],
    dp_2d: ['dp_1d', 'backtracking', 'grid_graph', 'two_pointers'],
    topo_sort: ['grid_graph', 'union_find', 'tree_bfs', 'shortest_path'],
    union_find: ['grid_graph', 'topo_sort', 'tree_bfs'],
    shortest_path: ['tree_bfs', 'heap', 'grid_graph', 'topo_sort'],
    trie: ['hashmap', 'backtracking', 'tree_dfs'],
    bit: ['hashmap', 'matrix_math', 'backtracking'],
    matrix_math: ['grid_graph', 'two_pointers', 'bit'],
  };
  const shuffled = (a, rand) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // n wrong options for `right`, taken from `pool` (pattern ids): its confusable neighbours first, then any others.
  function distractors(right, pool, n = 3, rand = Math.random) {
    const others = pool.filter(p => p !== right);
    const near = shuffled((CONFUSABLE[right] || []).filter(p => others.includes(p)), rand);
    const rest = shuffled(others.filter(p => !near.includes(p)), rand);
    return near.concat(rest).slice(0, n);
  }

  // Interview prep in the time you actually have. When days × daily minutes can't cover what's left of the
  // path, study the most-asked patterns only: the idea, then one problem solved cold. Half of each day goes
  // to that; the other half to the games.
  // CRUNCH_ORDER: most interview-frequent first, prerequisites kept before what needs them.
  const CRUNCH_ORDER = ['hashmap', 'two_pointers', 'sliding_window', 'binary_search', 'stack', 'linked_list', 'recursion',
    'tree_dfs', 'tree_bfs', 'grid_graph', 'heap', 'intervals', 'backtracking', 'dp_1d', 'greedy', 'prefix', 'topo_sort',
    'mono_stack', 'dp_2d', 'union_find', 'trie', 'shortest_path', 'bit', 'matrix_math'];
  // daysLeft, minutes: from Settings. pathLeft: minutes left on the whole Study path.
  // costs: { patternId: minutes for its lesson + one cold solve } for patterns not yet covered; done: ids already covered.
  function crunch({ daysLeft, minutes, pathLeft, costs, done = [] }) {
    if (daysLeft === null || daysLeft === undefined || daysLeft < 0) return null;
    const budget = Math.max(0, daysLeft) * minutes;
    if (budget >= pathLeft) return null;
    let study = budget / 2;
    const list = [];
    for (const id of CRUNCH_ORDER) {
      if (done.includes(id)) { list.push(id); continue; }
      if (!(id in costs)) continue;
      // In order, so a pattern never comes without what it builds on; stop at the first that doesn't fit (but always offer 3).
      if (study < costs[id] && list.filter(x => !done.includes(x)).length >= 3) break;
      list.push(id); study -= costs[id];
    }
    return { budget, pathLeft, list };
  }

  const SRS = { INTERVALS, CONFUSABLE, CRUNCH_ORDER, addDays, urgency, schedule, interleave, distractors, crunch };
  root.SRS = SRS;
  if (typeof module !== 'undefined') module.exports = SRS;
})(typeof window !== 'undefined' ? window : globalThis);
