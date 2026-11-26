// Tests for static/srs.js.  Run:  node tests/srs.test.js
'use strict';
const assert = require('assert');
const path = require('path');
const SRS = require(path.join(__dirname, '..', 'static', 'srs.js'));

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok -', name); };
const T = '2026-11-26';

test('urgency: no date, urgent, focused, steady', () => {
  assert.strictEqual(SRS.urgency(null).mode, 'steady');
  assert.strictEqual(SRS.urgency(-3).mode, 'steady');
  assert.deepStrictEqual(SRS.urgency(0), { mode: 'urgent', label: 'Interview today', cap: 1 });
  assert.strictEqual(SRS.urgency(11).cap, 5);
  assert.strictEqual(SRS.urgency(30).mode, 'focused');
  assert.strictEqual(SRS.urgency(30).cap, 15);
  assert.strictEqual(SRS.urgency(90).cap, 120);
});

test('schedule: nailed climbs the boxes on the interval ladder', () => {
  const it = {};
  SRS.schedule(it, 2, T); assert.strictEqual(it.box, 1); assert.strictEqual(it.due, '2026-11-27');
  SRS.schedule(it, 2, T); assert.strictEqual(it.box, 2); assert.strictEqual(it.due, '2026-11-29');
  SRS.schedule(it, 2, T); assert.strictEqual(it.due, '2026-12-03');
  assert.strictEqual(it.reps, 3); assert.strictEqual(it.lastQ, 2); assert.strictEqual(it.last, T);
});

test('schedule: the urgency cap keeps reviews close before an interview', () => {
  const it = { box: 5 };
  SRS.schedule(it, 2, T, 2);
  assert.strictEqual(it.box, 6); assert.strictEqual(it.due, '2026-11-28');
});

test('schedule: box never passes 7', () => {
  const it = { box: 7 };
  SRS.schedule(it, 2, T); assert.strictEqual(it.box, 7);
});

test('schedule: shaky keeps at least box 1, back in 1 or 2 days', () => {
  const a = { box: 0 }; SRS.schedule(a, 1, T); assert.strictEqual(a.box, 1); assert.strictEqual(a.due, '2026-11-27');
  const b = { box: 4 }; SRS.schedule(b, 1, T); assert.strictEqual(b.box, 4); assert.strictEqual(b.due, '2026-11-28');
});

test('schedule: blanked drops to box 0, counts a lapse, back tomorrow', () => {
  const it = { box: 5, lapses: 1 };
  SRS.schedule(it, 0, T);
  assert.strictEqual(it.box, 0); assert.strictEqual(it.lapses, 2); assert.strictEqual(it.due, '2026-11-27');
});

test('schedule: dates roll over months and years', () => {
  const it = { box: 3 }; SRS.schedule(it, 2, '2026-12-25');
  assert.strictEqual(it.due, '2027-01-08');
});

test('interleave: round-robin in path order, easiest first', () => {
  const objs = [
    { id: 'a2', pattern: 'a', diff: 'Hard', num: 1 }, { id: 'a1', pattern: 'a', diff: 'Easy', num: 9 },
    { id: 'b1', pattern: 'b', diff: 'Medium', num: 3 }, { id: 'z1', pattern: 'z', diff: 'Easy', num: 2 },
  ];
  assert.deepStrictEqual(SRS.interleave(objs, ['b', 'a']).map(o => o.id), ['b1', 'a1', 'z1', 'a2']);
});

test('distractors: confusable neighbours first, never the answer, no repeats', () => {
  const pool = Object.keys(SRS.CONFUSABLE);
  for (let k = 0; k < 50; k++) {
    const d = SRS.distractors('sliding_window', pool, 3);
    assert.strictEqual(d.length, 3);
    assert.ok(!d.includes('sliding_window'));
    assert.strictEqual(new Set(d).size, 3);
    d.forEach(x => assert.ok(SRS.CONFUSABLE.sliding_window.includes(x), x));
  }
});

test('distractors: falls back to other patterns when the pool lacks neighbours', () => {
  const d = SRS.distractors('trie', ['trie', 'hashmap', 'heap', 'intervals', 'bit'], 3);
  assert.strictEqual(d.length, 3); assert.ok(d.includes('hashmap')); assert.ok(!d.includes('trie'));
});

test('every confusable entry names a real pattern, and every pattern has entries', () => {
  const ids = new Set(SRS.CRUNCH_ORDER);
  assert.strictEqual(ids.size, 24);
  for (const [k, v] of Object.entries(SRS.CONFUSABLE)) { assert.ok(ids.has(k), k); v.forEach(x => assert.ok(ids.has(x), `${k} -> ${x}`)); }
  for (const id of ids) assert.ok(SRS.CONFUSABLE[id], id);
});

const costs = Object.fromEntries(SRS.CRUNCH_ORDER.map(id => [id, 40]));
test('crunch: off when there is enough time, or no interview date', () => {
  assert.strictEqual(SRS.crunch({ daysLeft: 60, minutes: 60, pathLeft: 3000, costs }), null);
  assert.strictEqual(SRS.crunch({ daysLeft: null, minutes: 30, pathLeft: 3000, costs }), null);
});

test('crunch: 11 days at 30 min picks what half the time covers, most-asked first', () => {
  const c = SRS.crunch({ daysLeft: 11, minutes: 30, pathLeft: 3700, costs });
  assert.strictEqual(c.budget, 330);
  assert.deepStrictEqual(c.list, ['hashmap', 'two_pointers', 'sliding_window', 'binary_search']);   // 165 study min / 40
});

test('crunch: always offers at least 3, even on the day', () => {
  const c = SRS.crunch({ daysLeft: 0, minutes: 30, pathLeft: 3700, costs });
  assert.deepStrictEqual(c.list, ['hashmap', 'two_pointers', 'sliding_window']);
});

test('crunch: patterns already covered stay on the list and cost nothing', () => {
  const c = SRS.crunch({ daysLeft: 2, minutes: 40, pathLeft: 3700, costs: { ...costs, hashmap: undefined }, done: ['hashmap'] });
  assert.strictEqual(c.list[0], 'hashmap');
  assert.strictEqual(c.list.length, 4);   // hashmap + the minimum 3 new
});

test('crunch: stops at the first pattern that does not fit, so prerequisites are never skipped', () => {
  const c = SRS.crunch({ daysLeft: 10, minutes: 30, pathLeft: 3700, costs: { ...costs, binary_search: 500 } });
  assert.deepStrictEqual(c.list, ['hashmap', 'two_pointers', 'sliding_window']);
});

console.log(`\n${n} passed`);
