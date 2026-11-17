/* Combine two copies of Pattern Gym progress (e.g. this browser + the cloud) without losing either side.
   Pure function, no DOM: loaded by the page and by tests/merge.test.js (node).

   Rules (docs/NEXT_STEPS.md):
   - items:   per drill, the one reviewed later (`last`, a date), then the one with more reps
   - xp:      max
   - days:    per day, max of xp / rounds / new-per-game
   - mocks:   union by (date, problem)
   - study:   union (earliest date kept)
   - streak:  recomputed from days; best = max
   - plan:    later date wins; same day → per-game max of `done`
   - settings: the copy with the later `settingsAt` (ms timestamp) wins
*/
'use strict';
(function (root) {
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const ymdUTC = d => d.toISOString().slice(0, 10);
  const prevDay = s => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return ymdUTC(d); };

  function pickItem(x, y) {
    if (!x) return y; if (!y) return x;
    const lx = x.last || '', ly = y.last || '';
    if (lx !== ly) return lx > ly ? x : y;
    return (y.reps || 0) > (x.reps || 0) ? y : x;
  }

  function mergeDay(x, y) {
    if (!x) return y; if (!y) return x;
    const newBy = { ...(x.newBy || {}) };
    for (const [g, n] of Object.entries(y.newBy || {})) newBy[g] = Math.max(newBy[g] || 0, n);
    return { ...x, ...y, xp: Math.max(x.xp || 0, y.xp || 0), rounds: Math.max(x.rounds || 0, y.rounds || 0), newBy };
  }

  function unionDates(x = {}, y = {}) {
    const out = { ...x };
    for (const [k, d] of Object.entries(y)) out[k] = out[k] && out[k] < d ? out[k] : d;
    return out;
  }

  // Streak from the days that earned XP: the run ending on the most recent active day.
  function streakFromDays(days, oldA = {}, oldB = {}) {
    const active = Object.keys(days).filter(d => (days[d]?.xp || 0) > 0).sort();
    let best = Math.max(oldA.best || 0, oldB.best || 0), run = 0, prev = null;
    for (const d of active) { run = prev && prevDay(d) === prev ? run + 1 : 1; prev = d; best = Math.max(best, run); }
    if (!active.length) {  // no day log (very old saves): keep whichever streak is newer
      const a = oldA.last || '', b = oldB.last || '';
      return { count: 0, last: null, ...(a >= b ? oldA : oldB), best };
    }
    return { count: run, last: prev, best };
  }

  function mergePlan(x, y) {
    if (!x) return y || null; if (!y) return x;
    if (x.date !== y.date) return x.date > y.date ? x : y;
    const base = (x.minutes === y.minutes) ? x : (x.blocks.length >= y.blocks.length ? x : y);
    const other = base === x ? y : x;
    return { ...base, blocks: base.blocks.map(b => {
      const o = other.blocks.find(ob => ob.game === b.game);
      return o ? { ...b, done: Math.min(b.target, Math.max(b.done, o.done)) } : b;
    }) };
  }

  function mergeState(a, b) {
    if (!isObj(b)) return a; if (!isObj(a)) return b;
    const items = { ...(a.items || {}) };
    for (const [k, it] of Object.entries(b.items || {})) items[k] = pickItem(items[k], it);

    const days = { ...(a.days || {}) };
    for (const [d, rec] of Object.entries(b.days || {})) days[d] = mergeDay(days[d], rec);

    const seen = new Set(), mocks = [];
    for (const m of [...(a.mocks || []), ...(b.mocks || [])]) {
      const k = m.date + '|' + m.problem;
      if (!seen.has(k)) { seen.add(k); mocks.push(m); }
    }
    mocks.sort((m, n) => (m.date || '').localeCompare(n.date || ''));

    const sa = a.settingsAt || 0, sb = b.settingsAt || 0;
    return {
      ...b, ...a,
      settings: sb > sa ? b.settings : a.settings,
      settingsAt: Math.max(sa, sb),
      items, days, mocks,
      xp: Math.max(a.xp || 0, b.xp || 0),
      streak: streakFromDays(days, a.streak, b.streak),
      plan: mergePlan(a.plan, b.plan),
      study: {
        lessons: unionDates(a.study?.lessons, b.study?.lessons),
        walks: unionDates(a.study?.walks, b.study?.walks),
      },
    };
  }

  root.mergeState = mergeState;
  if (typeof module !== 'undefined') module.exports = { mergeState };
})(typeof window !== 'undefined' ? window : globalThis);
