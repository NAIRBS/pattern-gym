// Tests for static/merge.js.  Run:  node tests/merge.test.js
'use strict';
const assert = require('assert');
const path = require('path');
const { mergeState } = require(path.join(__dirname, '..', 'static', 'merge.js'));

const base = () => ({
  settings: { minutes: 30, interviewDate: '2026-12-01' }, settingsAt: 0,
  items: {}, xp: 0, streak: { count: 0, last: null, best: 0 }, days: {}, mocks: [], plan: null,
  study: { lessons: {}, walks: {} },
});
let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok -', name); };

test('items: later review wins, then more reps', () => {
  const a = base(), b = base();
  a.items['oa:x'] = { box: 1, reps: 1, last: '2026-11-10' };
  b.items['oa:x'] = { box: 3, reps: 4, last: '2026-11-12' };
  a.items['fill:y'] = { box: 2, reps: 5, last: '2026-11-12' };
  b.items['fill:y'] = { box: 1, reps: 2, last: '2026-11-12' };
  b.items['lineup:z'] = { box: 1, reps: 1, last: '2026-11-01' };
  const m = mergeState(a, b);
  assert.strictEqual(m.items['oa:x'].box, 3);
  assert.strictEqual(m.items['fill:y'].reps, 5);
  assert.ok(m.items['lineup:z'], 'item only on one side is kept');
});

test('xp max, days per-field max, newBy per game', () => {
  const a = base(), b = base();
  a.xp = 100; b.xp = 80;
  a.days['2026-11-16'] = { xp: 10, rounds: 2, newBy: { oa: 1 } };
  b.days['2026-11-16'] = { xp: 25, rounds: 1, newBy: { oa: 0, fill: 2 } };
  b.days['2026-11-15'] = { xp: 5, rounds: 1, newBy: {} };
  const m = mergeState(a, b);
  assert.strictEqual(m.xp, 100);
  assert.deepStrictEqual(m.days['2026-11-16'], { xp: 25, rounds: 2, newBy: { oa: 1, fill: 2 } });
  assert.ok(m.days['2026-11-15']);
});

test('streak recomputed from active days, best kept', () => {
  const a = base(), b = base();
  a.days['2026-11-14'] = { xp: 5, rounds: 1, newBy: {} };
  a.days['2026-11-15'] = { xp: 5, rounds: 1, newBy: {} };
  b.days['2026-11-16'] = { xp: 5, rounds: 1, newBy: {} };
  b.days['2026-11-17'] = { xp: 5, rounds: 1, newBy: {} };
  a.streak = { count: 2, last: '2026-11-15', best: 9 };
  b.streak = { count: 2, last: '2026-11-17', best: 2 };
  const m = mergeState(a, b);
  assert.deepStrictEqual(m.streak, { count: 4, last: '2026-11-17', best: 9 });
});

test('streak breaks on a gap; zero-xp days do not count', () => {
  const a = base();
  a.days['2026-11-10'] = { xp: 5 }; a.days['2026-11-12'] = { xp: 5 }; a.days['2026-11-13'] = { xp: 0 };
  const m = mergeState(a, base());
  assert.deepStrictEqual(m.streak, { count: 1, last: '2026-11-12', best: 1 });
});

test('mocks union by date+problem; study union keeps earliest date', () => {
  const a = base(), b = base();
  a.mocks = [{ date: '2026-11-10', problem: 'p1', avg: 3 }];
  b.mocks = [{ date: '2026-11-10', problem: 'p1', avg: 3 }, { date: '2026-11-09', problem: 'p2', avg: 2 }];
  a.study.walks = { p1: '2026-11-10' }; b.study.walks = { p1: '2026-11-08', p2: '2026-11-09' };
  b.study.lessons = { hashmap: '2026-11-01' };
  const m = mergeState(a, b);
  assert.deepStrictEqual(m.mocks.map(x => x.problem), ['p2', 'p1']);
  assert.deepStrictEqual(m.study.walks, { p1: '2026-11-08', p2: '2026-11-09' });
  assert.deepStrictEqual(m.study.lessons, { hashmap: '2026-11-01' });
});

test('settings: later settingsAt wins; fresh device does not clobber', () => {
  const a = base(), b = base();
  a.settings = { minutes: 30 }; a.settingsAt = 0;          // new device, defaults
  b.settings = { minutes: 90 }; b.settingsAt = 1700000000000;
  assert.strictEqual(mergeState(a, b).settings.minutes, 90);
  a.settingsAt = 1800000000000;
  const m = mergeState(a, b);
  assert.strictEqual(m.settings.minutes, 30);
  assert.strictEqual(m.settingsAt, 1800000000000);
});

test('plan: same day keeps max done per game; later day wins', () => {
  const a = base(), b = base();
  a.plan = { date: '2026-11-17', minutes: 30, blocks: [{ game: 'sprint', target: 10, done: 4 }, { game: 'oa', target: 1, done: 0 }] };
  b.plan = { date: '2026-11-17', minutes: 30, blocks: [{ game: 'sprint', target: 10, done: 7 }, { game: 'oa', target: 1, done: 1 }] };
  assert.deepStrictEqual(mergeState(a, b).plan.blocks.map(x => x.done), [7, 1]);
  b.plan.date = '2026-11-16';
  assert.strictEqual(mergeState(a, b).plan.date, '2026-11-17');
  assert.strictEqual(mergeState(base(), b).plan.date, '2026-11-16');
});

test('merge is symmetric for the data that matters, and idempotent', () => {
  const a = base(), b = base();
  a.items['oa:x'] = { box: 2, reps: 2, last: '2026-11-11' }; b.items['oa:y'] = { box: 1, reps: 1, last: '2026-11-12' };
  a.days['2026-11-11'] = { xp: 30, rounds: 1, newBy: { oa: 1 } }; b.days['2026-11-12'] = { xp: 6, rounds: 2, newBy: {} };
  a.xp = 30; b.xp = 6;
  const ab = mergeState(a, b), ba = mergeState(b, a);
  for (const k of ['items', 'days', 'xp', 'streak', 'study', 'mocks']) assert.deepStrictEqual(ab[k], ba[k], k);
  assert.deepStrictEqual(mergeState(ab, ab), ab);
});

test('missing side returns the other', () => {
  const a = base();
  assert.strictEqual(mergeState(a, null), a);
  assert.strictEqual(mergeState(undefined, a), a);
});

console.log(`\n${n} tests passed`);
test('study attempts are unioned too', () => {
  const a = base(), b = base();
  a.study.attempts = { two_sum: '2026-11-10' }; b.study.attempts = { three_sum: '2026-11-11', two_sum: '2026-11-09' };
  assert.deepStrictEqual(mergeState(a, b).study.attempts, { two_sum: '2026-11-09', three_sum: '2026-11-11' });
});
console.log('attempts test passed');
