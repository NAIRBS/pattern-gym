// Tests for static/highlight.js.  Run:  node tests/highlight.test.js
'use strict';
const assert = require('assert');
const path = require('path');
const { highlightLine, highlightCode } = require(path.join(__dirname, '..', 'static', 'highlight.js'));
const C = require(path.join(__dirname, '..', 'static', 'content.json'));

const unhtml = s => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
let n = 0;
const has = (line, cls, text) => { assert.ok(highlightLine(line).includes(`<span class="${cls}">${text}</span>`), `${line} should mark ${text} as ${cls}: ${highlightLine(line)}`); n++; };

has('def twoSum(nums, target):', 'tk-k', 'def');
has('def twoSum(nums, target):', 'tk-f', 'twoSum');
has('class Trie:', 'tk-f', 'Trie');
has('    for i, x in enumerate(nums):', 'tk-k', 'for');
has('    for i, x in enumerate(nums):', 'tk-b', 'enumerate');
has('        return [seen[need], i]', 'tk-k', 'return');
has("    s = 'a#b'  # not a comment inside the string", 'tk-s', "&#39;a#b&#39;");
has("    s = 'a#b'  # not a comment inside the string", 'tk-c', '# not a comment inside the string');
has('    x = 10 ** 9 + 7', 'tk-n', '10');
has('    if x != None and y >= 0:', 'tk-k', 'None');
has('    q = deque([root])', 'tk-b', 'deque');
has('    lo, hi = 0, len(nums) - 1', 'tk-b', 'len');
// identifiers that contain a keyword are not keywords
assert.ok(!highlightLine('    format_in = 1').includes('tk-k'), 'format_in is not a keyword'); n++;
// HTML in code is escaped
assert.ok(highlightLine('if a < b and c > d:').includes('&lt;') && !highlightLine('if a < b:').includes('<b'), 'escapes < and >'); n++;

// the text never changes: every reference solution and brute-force version round-trips exactly
let lines = 0;
for (const p of C.problems) for (const src of [p.solution, p.brute_code || '']) {
  assert.strictEqual(unhtml(highlightCode(src)), src, `round-trip failed for ${p.id}`); lines += src.split('\n').length;
}
for (const pt of C.patterns) assert.strictEqual(unhtml(highlightCode(pt.skeleton)), pt.skeleton, `round-trip failed for ${pt.id}`);
n++;
console.log(`${n} highlight tests passed (${lines} lines round-tripped)`);
