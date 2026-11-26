/* Progress rules: XP, levels, the streak, mastery and the cold-solve record.
   Pure functions, no DOM and no clock: the page passes in today's date and your progress.
   Loaded by the page (window.Progress) and by tests/progress.test.js (node). */
'use strict';
(function (root) {
  // XP per game for a "nailed it"; "shaky" earns half (rounded up), a miss still earns 1 for showing up.
  const XP = { sprint: 2, syntax: 3, bigo: 3, edge: 4, lineup: 6, fill: 8, skeleton: 6, bughunt: 8, oa: 30, mock: 45 };
  const xpFor = (game, q) => q === 2 ? XP[game] : q === 1 ? Math.ceil(XP[game] / 2) : 1;
  // Levels get further apart: level L starts at 40·(L−1)² XP.
  const level = xp => Math.floor(Math.sqrt(Math.max(0, xp) / 40)) + 1;
  const levelFloor = l => 40 * (l - 1) ** 2;

  const ymdUTC = d => d.toISOString().slice(0, 10);
  const shift = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymdUTC(d); };

  // The streak after earning XP on day t: same day → unchanged, the day after the last → +1, a gap → 1.
  function nextStreak(streak, t) {
    const s = streak || { count: 0, last: null, best: 0 };
    if (s.last === t) return { ...s };
    const count = s.last === shift(t, -1) ? (s.count || 0) + 1 : 1;
    return { count, last: t, best: Math.max(s.best || 0, count) };
  }

  // A full solve (OA Mode or a cold solve) on a day: n tried, ok solved without the plan hint or the answer.
  function recordSolve(day, q) {
    const d = day || {}; const s = d.solves || { n: 0, ok: 0 };
    return { ...d, solves: { n: s.n + 1, ok: s.ok + (q >= 1 ? 1 : 0) } };
  }
  // The cold-solve record by week, oldest first: [{ start, n, ok }], the last week ending today.
  function weeklySolves(days, t, weeks = 8) {
    const out = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const start = shift(t, -7 * w - 6); let n = 0, ok = 0;
      for (let i = 0; i < 7; i++) { const s = days?.[shift(start, i)]?.solves; if (s) { n += s.n || 0; ok += s.ok || 0; } }
      out.push({ start, n, ok });
    }
    return out;
  }

  // Mastery of a pattern from the levels of its cards (each capped at 5, "locked in"): 0..1.
  const mastery = boxes => boxes.length ? boxes.reduce((a, b) => a + Math.min(b || 0, 5), 0) / (boxes.length * 5) : 0;
  // A problem's dots, 0..4, from the levels of its Line Up, Fill the Gap and full-solve cards: one dot for each of
  // the three done (level 1+, a blank doesn't count), and the 4th once the full solve is nailed LOCK_SOLVES times.
  const LOCK_SOLVES = 3;
  function problemLevel([lineup = 0, fill = 0, solve = 0]) {
    return (lineup > 0) + (fill > 0) + (solve > 0) + (solve >= LOCK_SOLVES ? 1 : 0);
  }

  const Progress = { XP, xpFor, level, levelFloor, nextStreak, recordSolve, weeklySolves, mastery, problemLevel, LOCK_SOLVES };
  root.Progress = Progress;
  if (typeof module !== 'undefined') module.exports = Progress;
})(typeof window !== 'undefined' ? window : globalThis);
