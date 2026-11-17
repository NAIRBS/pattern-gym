// Tests for static/edge-match.js.  Run:  node tests/edge-match.test.js
'use strict';
const assert = require('assert');
const path = require('path');
const { bestEdgeMatch } = require(path.join(__dirname, '..', 'static', 'edge-match.js'));

let n = 0;
const yes = (expected, lines, why) => { assert.ok(bestEdgeMatch(expected, lines), `should match: ${expected} <- ${JSON.stringify(lines)} (${why || ''})`); n++; };
const no = (expected, lines, why) => { assert.strictEqual(bestEdgeMatch(expected, lines), null, `should NOT match: ${expected} <- ${JSON.stringify(lines)} (${why || ''})`); n++; };

// matches written in other words
yes('empty array -> False', ['what if nums is empty?']);
yes('empty array -> False', ['[] input']);
yes('empty list', ['length 0 list']);
yes('single element -> False', ['only one number']);
yes('single node, no cycle', ['list with one node']);
yes('n = 0', ['what if n is zero']);
yes('negative n', ['n could be negative?']);
yes('Can n be negative?', ['n < 0, i.e. -3']);
yes('duplicates at the very end', ['repeated values']);
yes('cycle back to head', ['loop that returns to the first node']);
yes('Can I modify the list?', ['can I change it in place']);
yes('Nodes 1-indexed?', ['are nodes indexed from 1']);
yes('x = 1 or -1 with huge n', ['x is 1 and n is very large']);

// the old checkbox let anything through; these must not count
no('empty array -> False', ['edge cases']);
no('empty array -> False', ['what about the input?']);
no('n = 0', ['what about negative n']);
no('cycle back to head', ['duplicates']);
no('Is memory constrained (would sorting in place be preferred)?', ['what if it is empty']);
no('duplicates at the very end', []);

// best line is returned
assert.strictEqual(bestEdgeMatch('negative n', ['n is big', 'n negative?']), 'n negative?'); n++;

console.log(`${n} edge-match tests passed`);
yes('no lists', ['what if there are no lists at all']);
yes('no edges -> n', ['graph with no edges']);
no('no edges -> n', ['what if n is large']);
console.log('fallback tests passed');
