/* Tiny Python syntax highlighter: one line at a time, no dependencies.
   Colours keywords, built-ins, strings, numbers, comments and the name after def/class.
   Never changes the text: highlight(s) with the tags stripped is exactly s (tests/highlight.test.js). */
'use strict';
(function (root) {
  const KW = new Set(('False None True and as assert async await break class continue def del elif else except finally for from ' +
    'global if import in is lambda nonlocal not or pass raise return try while with yield').split(' '));
  const BI = new Set(('abs all any bin bool chr dict divmod enumerate filter float frozenset getattr hasattr hash hex int isinstance ' +
    'iter len list map max min next object ord pow print range repr reversed round set setattr sorted str sum super tuple type zip ' +
    'self cls heapq heappush heappop heapify heapreplace nlargest nsmallest deque defaultdict Counter OrderedDict bisect ' +
    'bisect_left bisect_right insort math inf collections itertools functools lru_cache cache').split(' '));
  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // order matters: comment, string, number, word, anything else (one char at a time)
  const TOKEN = /(#.*$)|((?:[rbfu]{1,2})?(?:'(?:\\.|[^'\\])*'?|"(?:\\.|[^"\\])*"?))|(\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b)|([A-Za-z_]\w*)|([\s\S])/g;

  function highlight(line) {
    let out = '', m, afterDef = false;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(line))) {
      const [t, com, str, num, word] = m;
      if (com) out += `<span class="tk-c">${esc(com)}</span>`;
      else if (str) out += `<span class="tk-s">${esc(str)}</span>`;
      else if (num) out += `<span class="tk-n">${esc(num)}</span>`;
      else if (word) {
        if (afterDef) { out += `<span class="tk-f">${esc(word)}</span>`; afterDef = false; continue; }
        if (KW.has(word)) { out += `<span class="tk-k">${esc(word)}</span>`; afterDef = word === 'def' || word === 'class'; continue; }
        out += BI.has(word) ? `<span class="tk-b">${esc(word)}</span>` : esc(word);
      } else out += esc(t);
      if (!/^\s$/.test(t)) afterDef = false;   // anything but a space ends "def <name>"
    }
    return out;
  }
  const highlightCode = text => String(text).split('\n').map(highlight).join('\n');

  root.highlightLine = highlight;
  root.highlightCode = highlightCode;
  if (typeof module !== 'undefined') module.exports = { highlightLine: highlight, highlightCode };
})(typeof window !== 'undefined' ? window : globalThis);
