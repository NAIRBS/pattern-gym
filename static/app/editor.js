/* Pattern Gym · editor.js: the code editor, the one-line code inputs and read-only code blocks.
   Plain script (no modules): shares one global scope with the other files in index.html's order. */
'use strict';

/* The code editor: a real <textarea> (so typing, IME, screen readers and mobile keyboards just work) with
   layers drawn behind it, the way CodeMirror and Monaco look but without a library:
     .ed-gutter  line numbers (true numbers, counting folded lines) and fold markers
     .ed-deco    current line, indent guides, matching bracket, other uses of the word under the caret
     .ed-hl      the syntax-coloured copy of the text (the textarea's own text is transparent)
   What it does:
     - Python indentation: Tab / Shift+Tab, Enter keeps the indent (+4 after ':', -4 after return/break/...),
       Backspace in leading spaces goes back one 4-space stop, pasted tabs become spaces, Home goes to the code
     - Brackets and quotes close themselves; typing the closer steps over it; Backspace deletes an empty pair
     - Suggestions as you type (Ctrl+Space to ask): your own names, keywords, built-ins, methods after "."
     - Ctrl+/ comments lines; Alt+↑/↓ moves them; Shift+Alt+↑/↓ copies them; Ctrl+Shift+K deletes them
     - Folding: Ctrl+Shift+[ folds the block at the caret, Ctrl+Shift+] unfolds (or click the gutter arrow)
     - Its own undo history (Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z), because folding changes the textarea's text
   Folded lines are taken out of the textarea and kept aside; ta.value (what every caller reads) is
   overridden on this element to give the whole text back, so callers never see folding. */
const hlOn = () => S?.settings?.highlight !== false;
const ED_NATIVE = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
const ED_KW = ('False None True and as assert break class continue def del elif else except finally for from global if import ' +
  'in is lambda nonlocal not or pass raise return try while with yield').split(' ');
const ED_BI = ('abs all any bin bool chr dict divmod enumerate filter float frozenset hash int isinstance iter len list map max ' +
  'min next ord pow print range reversed round set sorted str sum tuple zip self heapq heappush heappop heapify heappushpop ' +
  'heapreplace nlargest nsmallest deque defaultdict Counter OrderedDict bisect bisect_left bisect_right insort math inf ' +
  'collections itertools functools lru_cache cache accumulate permutations combinations product gcd sqrt floor ceil input').split(' ');
const ED_METHODS = ('append appendleft pop popleft extend insert remove index count sort reverse copy clear get items keys values ' +
  'setdefault update add discard union intersection difference issubset join split strip lstrip rstrip lower upper isalnum ' +
  'isalpha isdigit isspace startswith endswith replace find rfind most_common val next left right').split(' ');
const ED_ICON = {
  reset: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v2.8h2.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  full: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  shrink: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M6 2.5V6H2.5M13.5 6H10V2.5M10 13.5V10h3.5M2.5 10H6v3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
let edCount = 0;

// autoIndent: false is Mock Interview's whiteboard: no auto-indent, no closing brackets, no suggestions.
// lang: HTML for the toolbar's language slot (OA Mode puts its editor-mode picker there).
function enhanceEditor(ta, { onSubmit, onRun, autoIndent = true, lang } = {}) {
  if (ta._ed) return ta._ed;
  const id = 'ed' + (++edCount);
  ta.spellcheck = false; ta.setAttribute('wrap', 'off'); ta.setAttribute('autocapitalize', 'off'); ta.setAttribute('autocomplete', 'off');
  ta.setAttribute('aria-autocomplete', 'list'); ta.setAttribute('aria-controls', id + '-ac'); ta.setAttribute('aria-expanded', 'false');
  const runKeys = onRun ? 'Ctrl+&#39; run · Ctrl+Enter submit' : 'Ctrl+Enter run';
  const wrap = document.createElement('div'); wrap.className = 'ed';
  if (ta.classList.contains('snap')) wrap.classList.add('snap');
  wrap.innerHTML = `<div class="ed-bar">
      <span class="ed-title"><span class="ed-ic" aria-hidden="true">&lt;/&gt;</span>Code</span>${lang || '<span class="ed-lang">Python 3</span>'}
      <span class="ed-sp"></span>
      <label class="ed-toggle"><input type="checkbox" ${hlOn() ? 'checked' : ''}> Colours</label>
      <button type="button" class="ed-btn ed-reset" title="Reset to the starting code" aria-label="Reset to the starting code">${ED_ICON.reset}</button>
      <button type="button" class="ed-btn ed-fullbtn" title="Full screen (Esc leaves)" aria-label="Full screen" aria-pressed="false">${ED_ICON.full}</button>
    </div>
    <div class="ed-body">
      <div class="ed-gutter" aria-hidden="true"><div class="ed-gin"></div></div>
      <div class="ed-area"><div class="ed-deco" aria-hidden="true"></div><pre class="ed-hl" aria-hidden="true"></pre>
        <ul class="ed-ac" id="${id}-ac" role="listbox" aria-label="Suggestions" hidden></ul></div>
    </div>
    <div class="ed-status"><span class="ed-pos">Ln 1, Col 1</span><span class="ed-sp"></span>
      <span class="ed-tips">${autoIndent ? `${runKeys} · Ctrl+Space suggest · Ctrl+/ comment · Alt+↑↓ move · Ctrl+Shift+[ fold` : 'Whiteboard: no auto-indent, brackets or suggestions'}</span></div>`;
  ta.replaceWith(wrap);
  const area = $('.ed-area', wrap), layer = $('.ed-hl', wrap), decoEl = $('.ed-deco', wrap), gutter = $('.ed-gutter', wrap),
    gin = $('.ed-gin', wrap), acEl = $('.ed-ac', wrap), posEl = $('.ed-pos', wrap), box = $('.ed-toggle input', wrap);
  area.insertBefore(ta, acEl);

  // ── text, with folding hidden from callers
  const nget = () => ED_NATIVE.get.call(ta);
  const nset = v => ED_NATIVE.set.call(ta, v);
  let folds = [];   // { h: visible line index of the header, lines: the hidden lines }
  const fullText = () => {
    if (!folds.length) return nget();
    const ls = nget().split('\n');
    [...folds].sort((a, b) => b.h - a.h).forEach(f => ls.splice(f.h + 1, 0, ...f.lines));
    return ls.join('\n');
  };
  let starter = null;
  Object.defineProperty(ta, 'value', { configurable: true, get: fullText,
    set(v) { folds = []; nset(v); H.u.length = H.r.length = 0; starter = String(v); acClose(); renderAll(); } });

  const lineStart = (v, i) => v.lastIndexOf('\n', i - 1) + 1;
  const lineEnd = (v, i) => { const j = v.indexOf('\n', i); return j < 0 ? v.length : j; };
  const lineOf = (v, i) => { let n = 0; for (let k = v.indexOf('\n'); k >= 0 && k < i; k = v.indexOf('\n', k + 1)) n++; return n; };
  const indentOf = l => l.match(/^ */)[0].length;
  const codePart = l => l.replace(/(['"])(?:\\.|(?!\1).)*\1/g, '""').replace(/#.*$/, '');
  const foldable = (ls, i) => {
    if (!/:\s*$/.test(codePart(ls[i]))) return false;
    for (let j = i + 1; j < ls.length; j++) if (ls[j].trim()) return indentOf(ls[j]) > indentOf(ls[i]);
    return false;
  };

  // ── undo history (snapshots: the text is small)
  const H = { u: [], r: [], t: 0, type: '' };
  const snap = () => ({ v: nget(), f: folds.map(f => ({ h: f.h, lines: f.lines.slice() })), s: ta.selectionStart, e: ta.selectionEnd });
  const pushH = () => { H.u.push(snap()); if (H.u.length > 400) H.u.shift(); H.r.length = 0; };
  const fire = () => { ta._prog = true; ta.dispatchEvent(new Event('input', { bubbles: true })); ta._prog = false; };
  const restore = x => { nset(x.v); folds = x.f; ta.setSelectionRange(x.s, x.e); fire(); };
  const undo = () => { if (!H.u.length) return; H.r.push(snap()); restore(H.u.pop()); H.type = ''; };
  const redo = () => { if (!H.r.length) return; H.u.push(snap()); restore(H.r.pop()); H.type = ''; };

  // After an edit of oldV's [s, e): keep folds above the edit, shift those below, and open any whose header
  // line was split or joined (its hidden lines go back right after that line).
  function adjustFolds(oldV, s, e) {
    if (!folds.length) return;
    const newV = nget(), S0 = lineOf(oldV, s), E0 = lineOf(oldV, e);
    const delta = newV.split('\n').length - oldV.split('\n').length;
    const keep = [], reopen = [];
    for (const f of folds) {
      if (f.h < S0) keep.push(f);
      else if (f.h > E0) keep.push({ ...f, h: f.h + delta });
      else if (delta === 0 && S0 === E0) keep.push(f);
      else reopen.push(f);
    }
    folds = keep;
    if (!reopen.length) return;
    let v = newV, cs = ta.selectionStart, ce = ta.selectionEnd;
    const at = Math.min(...reopen.map(f => f.h), lineOf(v, cs));
    const ls = v.split('\n'), add = reopen.flatMap(f => f.lines);
    const off = ls.slice(0, at + 1).join('\n').length;
    ls.splice(at + 1, 0, ...add); v = ls.join('\n');
    folds = folds.map(f => f.h > at ? { ...f, h: f.h + add.length } : f);
    const len = add.join('\n').length + 1;
    if (cs > off) cs += len; if (ce > off) ce += len;
    nset(v); ta.setSelectionRange(cs, ce);
  }
  // Every edit the editor makes itself goes through here: one undo step, folds kept right, listeners told.
  function apply(s, e, text, selS = s + text.length, selE = selS, { hist = true } = {}) {
    if (hist) { pushH(); H.type = ''; }
    const oldV = nget();
    ta.setRangeText(text, s, e, 'end'); ta.setSelectionRange(selS, selE);
    adjustFolds(oldV, s, e); fire();
  }

  // ── folding
  function foldAt(i) {
    const ls = nget().split('\n'); if (!ls[i] || !foldable(ls, i) || folds.some(f => f.h === i)) return false;
    const ind = indentOf(ls[i]); let j = i + 1;
    while (j < ls.length && (!ls[j].trim() || indentOf(ls[j]) > ind)) j++;
    while (j > i + 1 && !ls[j - 1].trim()) j--;
    const hidden = [];
    for (let k = i + 1; k < j; k++) { hidden.push(ls[k]); const inner = folds.find(f => f.h === k); if (inner) hidden.push(...inner.lines); }
    const n = j - i - 1;
    folds = folds.filter(f => f.h <= i || f.h >= j).map(f => f.h >= j ? { ...f, h: f.h - n } : f);
    const v = nget(), a = ls.slice(0, i + 1).join('\n').length, b = ls.slice(0, j).join('\n').length;
    const c = ta.selectionStart;
    nset(v.slice(0, a) + v.slice(b)); folds.push({ h: i, lines: hidden });
    const to = c <= a ? c : c >= b ? c - (b - a) : a;
    ta.setSelectionRange(to, to); return true;
  }
  function unfold(f) {
    const ls = nget().split('\n'), off = ls.slice(0, f.h + 1).join('\n').length;
    ls.splice(f.h + 1, 0, ...f.lines);
    folds = folds.filter(x => x !== f).map(x => x.h > f.h ? { ...x, h: x.h + f.lines.length } : x);
    const len = f.lines.join('\n').length + 1; let s = ta.selectionStart, e = ta.selectionEnd;
    if (s > off) s += len; if (e > off) e += len;
    nset(ls.join('\n')); ta.setSelectionRange(s, e);
  }
  const unfoldLines = (a, b) => [...folds].filter(f => f.h >= a && f.h <= b).sort((x, y) => y.h - x.h).forEach(unfold);
  function toggleFold(i, want) {
    const f = folds.find(x => x.h === i);
    if (f && want !== 'fold') { pushH(); H.type = ''; unfold(f); fire(); return true; }
    if (!f && want !== 'unfold') { const snapB = snap(); if (foldAt(i)) { H.u.push(snapB); H.r.length = 0; H.type = ''; fire(); return true; } }
    return false;
  }
  // The block the caret is in: its own line if that opens a block, else the nearest line above with less indent.
  function blockLine() {
    const v = nget(), ls = v.split('\n'); let i = lineOf(v, ta.selectionStart);
    if (foldable(ls, i) || folds.some(f => f.h === i)) return i;
    const ind = ls[i].trim() ? indentOf(ls[i]) : Infinity;
    for (let k = i - 1; k >= 0; k--) if (ls[k].trim() && indentOf(ls[k]) < ind && foldable(ls, k)) return k;
    return -1;
  }

  // ── measuring: one line is one row (no wrapping), the font is monospace
  let M = null;
  const metrics = () => {
    if (M) return M;
    const cs = getComputedStyle(ta), cv = metrics.cv || (metrics.cv = document.createElement('canvas').getContext('2d'));
    cv.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    return (M = { lh: parseFloat(cs.lineHeight) || 21, cw: cv.measureText('M'.repeat(50)).width / 50,
      pt: parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth), pl: parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth) });
  };
  new ResizeObserver(() => { M = null; renderCursor(); }).observe(ta);

  // ── drawing
  let lastLines = [];
  function renderText() {
    wrap.classList.toggle('hl-on', hlOn());
    const ls = nget().split('\n'); lastLines = ls;
    const fm = new Map(folds.map(f => [f.h, f]));
    layer.innerHTML = ls.map((l, i) => (hlOn() ? highlightLine(l) : esc(l)) +
      (fm.has(i) ? `<span class="ed-pill">⋯ ${fm.get(i).lines.length} line${fm.get(i).lines.length > 1 ? 's' : ''}</span>` : '')).join('\n') + '\n ';
    let n = 1;
    gin.innerHTML = ls.map((l, i) => {
      const f = fm.get(i), num = n; n += 1 + (f ? f.lines.length : 0);
      const mark = f ? `<i class="ed-fm folded" data-fold="${i}" title="Unfold"></i>` : foldable(ls, i) ? `<i class="ed-fm" data-fold="${i}" title="Fold"></i>` : '<i></i>';
      return `<div class="ed-ln" data-l="${i}"><span>${num}</span>${mark}</div>`;
    }).join('');
    gutter.style.setProperty('--digits', String(Math.max(2, String(n - 1).length)));
    renderCursor();
  }
  function realLine(i) { let n = i + 1; folds.forEach(f => { if (f.h < i) n += f.lines.length; }); return n; }
  function renderCursor() {
    const m = metrics(), v = nget(), s = ta.selectionStart, e = ta.selectionEnd, st = ta.scrollTop, sl = ta.scrollLeft;
    const ls = lastLines.length ? lastLines : v.split('\n'), starts = [0];
    for (let i = 0; i < ls.length - 1; i++) starts.push(starts[i] + ls[i].length + 1);
    const lc = off => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= off) lo = mid; else hi = mid - 1; } return [lo, off - starts[lo]]; };
    const [cl, cc] = lc(s);
    const parts = [], top = l => m.pt + l * m.lh - st, left = c => m.pl + c * m.cw - sl;
    const boxAt = (off, len, cls) => { const [l, c] = lc(off); parts.push(`<div class="${cls}" style="top:${top(l)}px;left:${left(c)}px;width:${len * m.cw}px;height:${m.lh}px"></div>`); };
    if (s === e && document.activeElement === ta) parts.push(`<div class="ed-active" style="top:${top(cl)}px;height:${m.lh}px"></div>`);
    // indent guides; a blank line takes the smaller indent of its neighbours
    const ind = ls.map(l => l.trim() ? indentOf(l) : -1);
    for (let i = 0, prev = 0; i < ls.length; i++) {
      let w = ind[i];
      if (w < 0) { let nx = 0; for (let j = i + 1; j < ls.length; j++) if (ind[j] >= 0) { nx = ind[j]; break; } w = Math.min(prev, nx); } else prev = w;
      for (let c = 0; c < w; c += 4) parts.push(`<div class="ed-guide" style="top:${top(i)}px;left:${left(c)}px;height:${m.lh}px"></div>`);
    }
    // matching bracket
    if (s === e) {
      const O = '([{', Cl = ')]}';
      const at = Cl.includes(v[s - 1]) || O.includes(v[s - 1]) ? s - 1 : (O.includes(v[s]) || Cl.includes(v[s])) ? s : -1;
      if (at >= 0) {
        const ch = v[at], open = O.includes(ch), want = open ? Cl[O.indexOf(ch)] : O[Cl.indexOf(ch)];
        let d = 0, k = at, hit = -1;
        for (let steps = 0; steps < 20000 && k >= 0 && k < v.length; steps++, k += open ? 1 : -1) {
          if (v[k] === ch) d++; else if (v[k] === want && --d === 0) { hit = k; break; }
        }
        boxAt(at, 1, hit < 0 ? 'ed-bad' : 'ed-match'); if (hit >= 0) boxAt(hit, 1, 'ed-match');
      }
    }
    // other uses of the word under the caret (or of the selected text)
    let word = '';
    if (s === e) { const a = /\w*$/.exec(v.slice(0, s))[0], b = /^\w*/.exec(v.slice(s))[0]; word = a + b; if (!/^[A-Za-z_]\w+$/.test(word) || ED_KW.includes(word)) word = ''; }
    else { const t = v.slice(s, e); if (t.length > 1 && t.length < 60 && !t.includes('\n') && t.trim()) word = t; }
    if (word) {
      const re = s === e ? new RegExp(`\\b${word}\\b`, 'g') : new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const hits = []; let mm; while ((mm = re.exec(v)) && hits.length < 200) { hits.push(mm.index); if (!mm[0].length) re.lastIndex++; }
      if (hits.length > 1) hits.forEach(h => boxAt(h, word.length, 'ed-occ'));
    }
    decoEl.innerHTML = parts.join('');
    layer.scrollTop = st; layer.scrollLeft = sl; gin.style.transform = `translateY(${-st}px)`;
    $$('.ed-ln.cur', gin).forEach(x => x.classList.remove('cur')); gin.children[cl]?.classList.add('cur');
    posEl.textContent = s === e ? `Ln ${realLine(cl)}, Col ${cc + 1}` : `${e - s} selected`;
    if (ac) acPlace();
  }
  const renderAll = () => { M = null; renderText(); };
  ta._paint = renderAll;

  // ── suggestions
  let ac = null;   // { from, items: [{ w, kind }], sel }
  const acClose = () => { if (!ac) return; ac = null; acEl.hidden = true; ta.setAttribute('aria-expanded', 'false'); ta.removeAttribute('aria-activedescendant'); };
  function acItems(v, from, to, prefix, dot) {
    const rest = v.slice(0, from) + v.slice(to), locals = [...new Set(rest.match(/[A-Za-z_]\w*/g) || [])].filter(w => w.length > 1 && !ED_KW.includes(w) && !ED_BI.includes(w));
    const srcs = dot ? [[ED_METHODS, 'method'], [locals, 'name']] : [[locals, 'name'], [ED_KW, 'keyword'], [ED_BI, 'built-in']];
    const seen = new Set(), out = [], p = prefix.toLowerCase();
    srcs.forEach(([list, kind], rank) => list.forEach(w => {
      if (seen.has(w) || w === prefix || !w.toLowerCase().startsWith(p)) return;
      seen.add(w); out.push({ w, kind, rank, exact: w.startsWith(prefix) ? 0 : 1 });
    }));
    return out.sort((a, b) => a.exact - b.exact || a.rank - b.rank || a.w.length - b.w.length || a.w.localeCompare(b.w)).slice(0, 40);
  }
  function acOpen(force) {
    const v = nget(), c = ta.selectionStart; if (ta.selectionEnd !== c) return acClose();
    const before = v.slice(lineStart(v, c), c);
    if (/#/.test(before.replace(/(['"])(?:\\.|(?!\1).)*\1/g, '')) || /^[^'"]*(['"])[^'"]*$/.test(before)) return acClose();   // comment or open string
    const prefix = /[A-Za-z_]\w*$/.exec(before)?.[0] || '', dot = before[before.length - prefix.length - 1] === '.';
    if (!force && !prefix && !dot) return acClose();
    const to = c + /^\w*/.exec(v.slice(c))[0].length;
    const items = acItems(v, c - prefix.length, to, prefix, dot);
    if (!items.length) return acClose();
    const keep = ac && ac.items[ac.sel]?.w;
    ac = { from: c - prefix.length, items, sel: Math.max(0, items.findIndex(x => x.w === keep)) };
    acEl.innerHTML = items.map((x, i) => `<li role="option" id="${id}-o${i}" data-i="${i}"><span class="w"><b>${esc(x.w.slice(0, prefix.length))}</b>${esc(x.w.slice(prefix.length))}</span><span class="k">${x.kind}</span></li>`).join('');
    acEl.hidden = false; ta.setAttribute('aria-expanded', 'true'); acSel(ac.sel); acPlace();
  }
  function acSel(i) {
    ac.sel = (i + ac.items.length) % ac.items.length;
    $$('li', acEl).forEach((li, k) => li.setAttribute('aria-selected', String(k === ac.sel)));
    const li = acEl.children[ac.sel]; li?.scrollIntoView({ block: 'nearest' }); ta.setAttribute('aria-activedescendant', li?.id || '');
  }
  function acPlace() {
    const m = metrics(), v = nget(), l = lineOf(v, ac.from), c = ac.from - lineStart(v, ac.from);
    let y = m.pt + (l + 1) * m.lh - ta.scrollTop + 2;
    const x = Math.max(0, Math.min(m.pl + c * m.cw - ta.scrollLeft - 6, area.clientWidth - 240));
    if (y + 200 > area.clientHeight && y - m.lh - 200 > 0) y = y - m.lh - Math.min(200, acEl.offsetHeight || 200) - 4;
    acEl.style.left = x + 'px'; acEl.style.top = y + 'px';
  }
  function acAccept() {
    const it = ac.items[ac.sel], v = nget(), c = ta.selectionStart, to = c + /^\w*/.exec(v.slice(c))[0].length, from = ac.from;
    acClose(); apply(from, to, it.w);
  }
  acEl.addEventListener('mousedown', e => { const li = e.target.closest('li'); if (!li) return; e.preventDefault(); ac.sel = +li.dataset.i; acAccept(); });

  // ── input
  let pre = null;
  ta.addEventListener('beforeinput', e => {
    if (e.inputType === 'historyUndo') { e.preventDefault(); undo(); return; }
    if (e.inputType === 'historyRedo') { e.preventDefault(); redo(); return; }
    const now = Date.now(), kind = e.inputType === 'insertText' ? (e.data === ' ' ? 'space' : 'ins') : e.inputType.startsWith('delete') ? 'del' : '';
    if (!kind || kind !== H.type || now - H.t > 900) pushH();
    H.type = kind === 'space' ? 'ins' : kind; H.t = now;
    pre = { v: nget(), s: ta.selectionStart, e: ta.selectionEnd };
  });
  ta.addEventListener('input', e => {
    if (!ta._prog && pre) { adjustFolds(pre.v, pre.s, pre.e); pre = null; }
    renderText();
    if (ta._prog) return;
    if (!autoIndent) return;
    if (e.inputType === 'insertText' && /[\w.]/.test(e.data || '')) acOpen(false);
    else if (ac) acOpen(false);
  });
  ['keyup', 'mouseup', 'focus', 'select'].forEach(ev => ta.addEventListener(ev, renderCursor));
  ta.addEventListener('blur', () => { acClose(); renderCursor(); });
  ta.addEventListener('mousedown', () => { acClose(); H.type = ''; });   // moving the caret starts a new undo step
  ta.addEventListener('scroll', renderCursor);
  document.addEventListener('selectionchange', () => { if (document.activeElement === ta) renderCursor(); });
  ta.addEventListener('paste', e => {
    const t = e.clipboardData?.getData('text'); if (t == null || !/\t|\r/.test(t)) return;
    e.preventDefault(); apply(ta.selectionStart, ta.selectionEnd, t.replace(/\r\n?/g, '\n').replace(/\t/g, '    '));
  });
  gutter.addEventListener('mousedown', e => {
    const fm = e.target.closest('[data-fold]'); if (!fm) return;
    e.preventDefault(); toggleFold(+fm.dataset.fold); ta.focus();
  });

  // ── toolbar
  box.addEventListener('change', () => { S.settings.highlight = box.checked; save(); repaintCode(); toast(box.checked ? 'Syntax colours on' : 'Syntax colours off'); });
  $('.ed-reset', wrap).onclick = async () => {
    if (starter == null || fullText() === starter) return ta.focus();
    const ok = await confirmBox({ title: 'Reset your code?', yes: 'Reset', yesKey: 'r', no: 'Keep my code',
      msg: 'This replaces everything in the editor with the starting code. Ctrl+Z in the editor brings yours back.' });
    if (ok) { pushH(); folds = []; nset(starter); ta.setSelectionRange(starter.length, starter.length); fire(); toast('Back to the starting code (Ctrl+Z undoes it)'); }
    ta.focus();
  };
  const fullBtn = $('.ed-fullbtn', wrap);
  const setFull = on => {
    wrap.classList.toggle('full', on); document.body.classList.toggle('ed-fullscreen', on);
    fullBtn.setAttribute('aria-pressed', String(on)); fullBtn.innerHTML = on ? ED_ICON.shrink : ED_ICON.full;
    fullBtn.title = on ? 'Leave full screen (Esc)' : 'Full screen (Esc leaves)'; M = null; renderCursor(); ta.focus();
  };
  fullBtn.onclick = () => setFull(!wrap.classList.contains('full'));

  // ── keys
  const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
  ta.addEventListener('keydown', e => {
    const { selectionStart: s, selectionEnd: en } = ta, v = nget(), ctrl = e.ctrlKey || e.metaKey;
    const stop = () => { e.preventDefault(); e.stopPropagation(); };
    if (ac) {
      if (e.key === 'ArrowDown') return stop(), acSel(ac.sel + 1);
      if (e.key === 'ArrowUp') return stop(), acSel(ac.sel - 1);
      if (e.key === 'PageDown') return stop(), acSel(Math.min(ac.items.length - 1, ac.sel + 7));
      if (e.key === 'PageUp') return stop(), acSel(Math.max(0, ac.sel - 7));
      if ((e.key === 'Enter' && !ctrl && !e.shiftKey) || (e.key === 'Tab' && !e.shiftKey)) return stop(), acAccept();
      if (e.key === 'Escape') return stop(), acClose();
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) acClose();
    }
    if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End' || e.key.startsWith('Page')) H.type = '';
    if (e.key === 'Escape' && wrap.classList.contains('full')) return stop(), setFull(false);
    if (ctrl && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) return stop(), undo();
      if ((k === 'z' && e.shiftKey) || k === 'y') return stop(), redo();
      if (e.key === 'Enter') { e.preventDefault(); return onSubmit && onSubmit(); }
      if (e.key === "'" && onRun) { e.preventDefault(); return onRun(); }
      if (e.code === 'Space') return stop(), autoIndent && acOpen(true);
      if (e.code === 'Slash') return stop(), toggleComment();
      if (e.shiftKey && e.code === 'BracketLeft') { stop(); const i = blockLine(); if (i >= 0) toggleFold(i, 'fold'); return; }
      if (e.shiftKey && e.code === 'BracketRight') { stop(); const i = lineOf(v, s), f = folds.find(x => x.h === i); if (f) toggleFold(i, 'unfold'); else if (folds.length) { pushH(); unfoldLines(0, Infinity); fire(); } return; }
      if (e.shiftKey && k === 'k') return stop(), deleteLines();
      return;
    }
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return stop(), moveLines(e.key === 'ArrowUp' ? -1 : 1, e.shiftKey);
    if (e.altKey || e.metaKey) return;
    if (e.key === 'Tab') return stop(), indentKey(e.shiftKey);
    if (e.key === 'Home' && !e.shiftKey) {
      const a = lineStart(v, s), first = a + indentOf(v.slice(a, lineEnd(v, s)));
      e.preventDefault(); const to = s === first ? a : first; ta.setSelectionRange(to, to); return renderCursor();
    }
    if (e.key === 'Backspace' && s === en && s > 0) {
      if (PAIRS[v[s - 1]] && PAIRS[v[s - 1]] === v[s]) return stop(), apply(s - 1, s + 1, '');
      const a = lineStart(v, s), before = v.slice(a, s);
      if (before.length && /^ +$/.test(before)) { stop(); const to = a + Math.floor((before.length - 1) / 4) * 4; return apply(to, s, ''); }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      if (!autoIndent) return;
      stop();
      const line = v.slice(lineStart(v, s), s); let ind = line.match(/^ */)[0];
      if (/[([{]$/.test(v.slice(0, s)) && PAIRS[v[s - 1]] === v[s]) {   // between a pair: open it up over three lines
        const inner = '\n' + ind + '    ', t = inner + '\n' + ind; return apply(s, en, t, s + inner.length);
      }
      if (/:\s*$/.test(codePart(line)) || /[([{]\s*$/.test(codePart(line))) ind += '    ';
      else if (/^\s*(return|break|continue|pass|raise)\b/.test(line)) ind = ind.slice(4);
      return apply(s, en, '\n' + ind);
    }
    if (e.key.length !== 1 || e.isComposing || !autoIndent) return;
    const ch = e.key, next = v[en] ?? '';
    if ((ch === ')' || ch === ']' || ch === '}') && s === en && next === ch) { e.preventDefault(); ta.setSelectionRange(s + 1, s + 1); return renderCursor(); }
    if (ch === '"' || ch === "'") {
      if (s === en && next === ch) { e.preventDefault(); ta.setSelectionRange(s + 1, s + 1); return renderCursor(); }
      const before = v.slice(lineStart(v, s), s), word = /\w*$/.exec(before)[0];
      if (s !== en) { stop(); return apply(s, en, ch + v.slice(s, en) + ch, s + 1, en + 1); }
      const inString = (before.split(ch).length - 1) % 2 === 1;
      if ((word && !/^(f|r|b|rb|br|fr|rf|u)$/i.test(word)) || inString || /\w/.test(next)) return;
      stop(); return apply(s, en, ch + ch, s + 1);
    }
    if (ch === '(' || ch === '[' || ch === '{') {
      if (s !== en) { stop(); return apply(s, en, ch + v.slice(s, en) + PAIRS[ch], s + 1, en + 1); }
      if (next && !/[\s)\]}:,;]/.test(next)) return;
      stop(); return apply(s, en, ch + PAIRS[ch], s + 1);
    }
  });

  // whole lines under the selection: [a, b) with b at the end of the last line
  const selLines = () => {
    const v = nget(), s = ta.selectionStart, e = ta.selectionEnd;
    const a = lineStart(v, s), b = lineEnd(v, e > s && v[e - 1] === '\n' ? e - 1 : e);
    return { v, s, e, a, b };
  };
  function indentKey(shift) {
    const { v, s, e, a, b } = selLines(), multi = v.slice(s, e).includes('\n');
    if (!shift && !multi) { const col = s - lineStart(v, s); return apply(s, e, ' '.repeat(4 - (col % 4))); }
    const lines = v.slice(a, b).split('\n');
    const out = lines.map(l => shift ? l.replace(/^ {1,4}/, '') : (l.length ? '    ' + l : l)), t = out.join('\n');
    if (multi) return apply(a, b, t, a, a + t.length);
    const to = Math.max(a, s + out[0].length - lines[0].length); apply(a, b, t, to);
  }
  function toggleComment() {
    const { v, s, e, a, b } = selLines(), ls = v.slice(a, b).split('\n'), code = ls.filter(l => l.trim());
    if (!code.length) return;
    const all = code.every(l => /^\s*#/.test(l)), min = Math.min(...code.map(indentOf));
    const out = ls.map(l => !l.trim() ? l : all ? l.replace(/^(\s*)# ?/, '$1') : l.slice(0, min) + '# ' + l.slice(min)), t = out.join('\n');
    if (s !== e) return apply(a, b, t, a, a + t.length);
    apply(a, b, t, Math.max(a, s + t.length - (b - a)));
  }
  function moveLines(dir, copy) {
    pushH(); H.type = '';
    { const { v, s, e } = selLines(); unfoldLines(lineOf(v, s) - 1, lineOf(v, e) + 1); }
    const { v, s, e, a, b } = selLines(), block = v.slice(a, b);
    if (copy) return dir < 0 ? apply(a, a, block + '\n', s, e, { hist: false }) : apply(b, b, '\n' + block, s + block.length + 1, e + block.length + 1, { hist: false });
    if (dir < 0) {
      if (a === 0) return fire();
      const p = lineStart(v, a - 1), prev = v.slice(p, a - 1), d = prev.length + 1;
      return apply(p, b, block + '\n' + prev, s - d, e - d, { hist: false });
    }
    if (b >= v.length) return fire();
    const ne = lineEnd(v, b + 1), next = v.slice(b + 1, ne), d = next.length + 1;
    apply(a, ne, next + '\n' + block, s + d, e + d, { hist: false });
  }
  function deleteLines() {
    pushH(); H.type = '';
    { const { v, s, e } = selLines(); unfoldLines(lineOf(v, s), lineOf(v, e)); }
    const { v, a, b } = selLines();
    if (b < v.length) apply(a, b + 1, '', a, a, { hist: false });
    else if (a > 0) apply(a - 1, b, '', lineStart(v, a - 1), lineStart(v, a - 1), { hist: false });
    else apply(a, b, '', 0, 0, { hist: false });
  }

  setTimeout(() => { if (starter == null) starter = fullText(); renderAll(); }, 0);   // callers often set the value right after this call
  renderAll();
  ta._ed = { wrap, render: renderAll, fold: toggleFold, undo, redo };
  return ta._ed;
}

// One-line inputs that hold code (Fill the Gap's gaps): the same colour layer as the editor, behind a
// transparent input. The layer's text slides with the input's horizontal scroll.
function hlInput(inp) {
  const box = document.createElement('span'); box.className = 'hin';
  box.style.marginLeft = inp.style.marginLeft; inp.style.marginLeft = '';
  box.innerHTML = '<span class="hin-hl" aria-hidden="true"><span></span></span>';
  inp.replaceWith(box); box.append(inp);
  const layer = $('.hin-hl > span', box);
  const paint = () => {
    box.classList.toggle('hl-on', hlOn());
    if (hlOn()) layer.innerHTML = highlightLine(inp.value) || '';
    layer.style.transform = `translateX(${-inp.scrollLeft}px)`;
  };
  inp._paint = paint;
  ['input', 'scroll', 'keyup', 'click', 'select', 'focus'].forEach(ev => inp.addEventListener(ev, paint));
  paint();
}
// Read-only code blocks (<pre class="code">, and inline <code class="hlc">) follow the same colour setting.
function paintPre(pre) {
  if (pre.dataset.src == null) pre.dataset.src = pre.textContent;
  const src = pre.dataset.src, keys = new Set((pre.dataset.keys || '').split(',').filter(Boolean).map(Number));
  const on = hlOn();
  if (pre.dataset.painted === String(on)) return;
  pre.dataset.painted = String(on);
  pre.innerHTML = src.split('\n').map((l, i) => { const inner = on ? highlightLine(l) : esc(l); return keys.has(i) ? `<span class="hl">${inner}</span>` : inner; }).join('\n');
}
function repaintCode() {
  $$('#app pre.code, .modal pre.code, #app code.hlc').forEach(pre => { if (!pre.closest('.ed')) { delete pre.dataset.painted; paintPre(pre); } });
  $$('.ed').forEach(w => { const t = $('textarea', w); t?._paint?.(); const b = $('.ed-toggle input', w); if (b) b.checked = hlOn(); });
  $$('.hin input').forEach(i => i._paint?.());
}
