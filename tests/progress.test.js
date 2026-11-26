// Tests for static/progress.js.  Run:  node tests/progress.test.js
'use strict';
const assert = require('assert');
const path = require('path');
const P = require(path.join(__dirname, '..', 'static', 'progress.js'));
const { mergeState } = require(path.join(__dirname, '..', 'static', 'merge.js'));

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok -', name); };

test('xp: nailed full, shaky half rounded up, miss 1', () => {
  assert.strictEqual(P.xpFor('oa', 2), 30);
  assert.strictEqual(P.xpFor('sprint', 1), 1);
  assert.strictEqual(P.xpFor('fill', 1), 4);
  assert.strictEqual(P.xpFor('mock', 0), 1);
});

test('levels: 40·(L−1)² XP to reach level L', () => {
  assert.strictEqual(P.level(0), 1);
  assert.strictEqual(P.level(39), 1);
  assert.strictEqual(P.level(40), 2);
  assert.strictEqual(P.level(160), 3);
  assert.strictEqual(P.levelFloor(3), 160);
  for (let xp = 0; xp < 3000; xp += 37) assert.ok(P.levelFloor(P.level(xp)) <= xp && xp < P.levelFloor(P.level(xp) + 1));
});

test('streak: same day unchanged, next day +1, a gap restarts', () => {
  let s = P.nextStreak(null, '2026-11-20');
  assert.deepStrictEqual(s, { count: 1, last: '2026-11-20', best: 1 });
  s = P.nextStreak(s, '2026-11-20'); assert.strictEqual(s.count, 1);
  s = P.nextStreak(s, '2026-11-21'); assert.strictEqual(s.count, 2);
  s = P.nextStreak(s, '2026-11-22'); assert.strictEqual(s.count, 3);
  s = P.nextStreak(s, '2026-11-25'); assert.deepStrictEqual(s, { count: 1, last: '2026-11-25', best: 3 });
});

test('streak crosses month and year ends', () => {
  assert.strictEqual(P.nextStreak({ count: 4, last: '2026-11-30', best: 4 }, '2026-12-01').count, 5);
  assert.strictEqual(P.nextStreak({ count: 4, last: '2026-12-31', best: 4 }, '2027-01-01').count, 5);
});

test('recordSolve: counts tries, and solves without the answer (q ≥ 1)', () => {
  let d = P.recordSolve({ xp: 5, rounds: 1, newBy: {} }, 2);
  d = P.recordSolve(d, 0); d = P.recordSolve(d, 1);
  assert.deepStrictEqual(d.solves, { n: 3, ok: 2 });
  assert.strictEqual(d.xp, 5, 'other day fields kept');
});

test('weeklySolves: 8 weeks ending today, oldest first', () => {
  const days = { '2026-11-26': { solves: { n: 2, ok: 1 } }, '2026-11-20': { solves: { n: 1, ok: 1 } },
    '2026-11-19': { solves: { n: 4, ok: 0 } }, '2026-09-01': { solves: { n: 9, ok: 9 } } };
  const w = P.weeklySolves(days, '2026-11-26');
  assert.strictEqual(w.length, 8);
  assert.deepStrictEqual(w[7], { start: '2026-11-20', n: 3, ok: 2 });
  assert.deepStrictEqual(w[6], { start: '2026-11-13', n: 4, ok: 0 });
  assert.strictEqual(w.reduce((a, x) => a + x.n, 0), 7, 'older than 8 weeks left out');
});

test('mastery: average level capped at 5', () => {
  assert.strictEqual(P.mastery([]), 0);
  assert.strictEqual(P.mastery([5, 7, 0, 0]), 0.5);
});

test('problemLevel: a dot per step done, the 4th after 3 nailed solves', () => {
  assert.strictEqual(P.problemLevel([0, 0, 0]), 0);
  assert.strictEqual(P.problemLevel([1, 0, 0]), 1);
  assert.strictEqual(P.problemLevel([1, 1, 0]), 2);
  assert.strictEqual(P.problemLevel([1, 1, 1]), 3, 'one pass of each: 3 of 4');
  assert.strictEqual(P.problemLevel([1, 1, 2]), 3);
  assert.strictEqual(P.problemLevel([1, 1, 3]), 4, 'locked in');
  assert.strictEqual(P.problemLevel([0, 0, 3]), 2, 'solves alone never fill the steps you skipped');
});

test('sync keeps the larger cold-solve record for a day', () => {
  const base = () => ({ settings: {}, items: {}, xp: 0, streak: {}, days: {}, mocks: [], study: {} });
  const a = base(), b = base();
  a.days['2026-11-26'] = { xp: 30, rounds: 1, newBy: {}, solves: { n: 1, ok: 1 } };
  b.days['2026-11-26'] = { xp: 10, rounds: 2, newBy: {}, solves: { n: 2, ok: 0 } };
  assert.deepStrictEqual(mergeState(a, b).days['2026-11-26'].solves, { n: 2, ok: 1 });
  assert.deepStrictEqual(mergeState(b, a).days['2026-11-26'].solves, { n: 2, ok: 1 });
});

console.log(`\n${n} tests passed`);
