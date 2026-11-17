/* Edge Hunter scoring: does one of the learner's lines cover an expected question / edge case?
   Words are normalised (synonyms → one token, plurals dropped, filler words removed), then an
   expected item counts as covered when a line shares enough of its distinctive tokens.
   Pure functions: loaded by the page and by tests/edge-match.test.js (node). */
'use strict';
(function (root) {
  const SYN = {
    empty: 'empty', blank: 'empty', nothing: 'empty', '[]': 'empty', '""': 'empty',
    none: 'null', null: 'null', nil: 'null',
    zero: '0',
    single: 'one', only: 'one', '1': 'one', one: 'one', lone: 'one',
    negative: 'negative', minus: 'negative', neg: 'negative',
    duplicate: 'dup', dup: 'dup', dupe: 'dup', repeat: 'dup', repeated: 'dup', same: 'dup', twice: 'dup',
    large: 'large', huge: 'large', big: 'large', max: 'large', maximum: 'large', overflow: 'large', long: 'large',
    sorted: 'sorted', sort: 'sorted', order: 'sorted', ordered: 'sorted', unsorted: 'sorted',
    cycle: 'cycle', cyclic: 'cycle', loop: 'cycle',
    modify: 'modify', mutate: 'modify', change: 'modify', inplace: 'modify',
    unicode: 'chars', ascii: 'chars', character: 'chars', char: 'chars', letter: 'chars',
    uppercase: 'case', lowercase: 'case', upper: 'case', lower: 'case', capital: 'case',
    space: 'space', whitespace: 'space',
    multiple: 'multiple', several: 'multiple', many: 'multiple',
    head: 'first', first: 'first', start: 'first', beginning: 'first', front: 'first',
    last: 'last', end: 'last', tail: 'last',
    tie: 'tie', equal: 'tie',
    index: 'index', indexed: 'index', indice: 'index',
    disconnected: 'disconnected', isolated: 'disconnected', unreachable: 'disconnected',
    leaf: 'leaf', root: 'root', skewed: 'skewed', unbalanced: 'skewed',
    impossible: 'none-exists', unreachable_target: 'none-exists', exist: 'none-exists', exists: 'none-exists', valid: 'none-exists',
  };
  const STOP = new Set(('the a an is are can be there what if any of in to for with and or at on by do does i we should will it its this that ' +
    'input array list string number value element item given always exactly very case edge just than then when how into from not no ' +
    'all has have more less get return returned answer output result need my me you your so as').split(' '));

  function tokens(text, keepStop = false) {
    const before = String(text).toLowerCase().split('->')[0].replace(/in[- ]place/g, 'inplace').replace(/more than one/g, 'multiple')
      .replace(/length\s*(of\s*)?0|len\s*0|size\s*0/g, 'empty');
    const out = new Set();
    for (let w of before.match(/\[\]|""|-?\d+|[a-z_]+/g) || []) {
      if (/^-\d/.test(w)) { out.add('negative'); w = w.slice(1); }
      if (w.length > 3 && w.endsWith('ies')) w = w.slice(0, -3) + 'y';
      else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
      if ((!keepStop && STOP.has(w)) || (w.length === 1 && /[ai]/.test(w))) continue;
      out.add(SYN[w] || w);
    }
    return out;
  }

  // The learner's line that best covers `expected`, or null.
  function bestEdgeMatch(expected, lines) {
    // an item made only of filler words ("no lists") is matched with the filler kept
    const keep = !tokens(expected).size;
    const want = tokens(expected, keep);
    if (!want.size) return null;
    // single letters are variable names (n, x, k): context, but never enough on their own
    const meaningful = [...want].filter(t => t.length > 1 || /\d/.test(t));
    const need = want.size >= 3 ? 2 : 1;
    let best = null, bestHit = 0;
    for (const line of lines) {
      const got = tokens(line, keep);
      let hit = 0; want.forEach(t => got.has(t) && hit++);
      const real = !meaningful.length || meaningful.some(t => got.has(t));
      if (real && hit >= need && hit > bestHit) { best = line; bestHit = hit; }
    }
    return best;
  }

  root.bestEdgeMatch = bestEdgeMatch;
  root.edgeTokens = tokens;
  if (typeof module !== 'undefined') module.exports = { bestEdgeMatch, tokens };
})(typeof window !== 'undefined' ? window : globalThis);
