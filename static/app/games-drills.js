/* Pattern Gym · games-drills.js: The drills: Pattern Sprint, Line Up, Fill the Gap, Skeleton Recall, Syntax Snap, Big-O Call, Edge Hunter, Bug Hunt.
   Plain script (no modules): shares one global scope with the other files in index.html's order. */
'use strict';

// ─────────────────────────── GAMES ───────────────────────────
const GAMES = {};

// 1. Pattern Sprint — recognise the pattern from the prompt, fast.
GAMES.sprint = {
  name: 'Pattern Sprint', icon: '⚡', layer: 'Idea', cost: 0.3, defaultN: 12,
  desc: 'A problem as an interviewer says it. Name the pattern before the timer runs out, then see the key move.',
  pool: () => C.sprint,
  render(el, s, done, { clock }) {
    const secs = S.settings.sprintSeconds;
    const usedPatterns = [...new Set(C.sprint.map(x => x.pattern))].filter(p => p !== s.pattern);
    const opts = shuffle([s.pattern, ...SRS.distractors(s.pattern, usedPatterns, 3)]);   // the patterns it's mistaken for
    el.innerHTML = `<div class="card">
      <div class="muted small row"><span title="Right answers in a row">🔥 <span class="combo">${GAMES.sprint.combo || 0}</span> in a row</span></div>
      <div class="prompt">${esc(s.prompt)}</div>
      <div class="timebar"><i style="width:100%"></i></div>
      <div class="options">${opts.map((p, k) => `<button data-p="${p}"><kbd>${k + 1}</kbd> ${esc(PAT(p).name)}</button>`).join('')}</div>
      <div id="rev"></div></div>`;
    const bar = $('.timebar > i', el), noLimit = !!S.settings.sprintNoLimit;
    if (noLimit) bar.parentElement.hidden = true;
    const t0 = Date.now(); let answered = false;
    const iv = setInterval(() => { if (noLimit) { clock.textContent = ((Date.now() - t0) / 1000).toFixed(1); return; } const left = 1 - (Date.now() - t0) / 1000 / secs; bar.style.width = Math.max(0, left * 100) + '%';
      clock.textContent = Math.max(0, secs - (Date.now() - t0) / 1000).toFixed(1); if (left <= 0) answer(null); }, 100);
    onRound(() => clearInterval(iv));
    const answer = p => {
      if (answered) return; answered = true; clearInterval(iv);
      const secsTaken = (Date.now() - t0) / 1000;
      const valid = [s.pattern, ...(s.also || []).map(a => a.pattern)];   // other approaches that also solve it
      const right = valid.includes(p);
      $$('.options button', el).forEach(b => { b.disabled = true; if (valid.includes(b.dataset.p)) b.classList.add('right'); else if (b.dataset.p === p) b.classList.add('wrong'); });
      const q = !right ? 0 : secsTaken > secs * 0.6 ? 1 : 2;
      GAMES.sprint.combo = right ? (GAMES.sprint.combo || 0) + 1 : 0;
      $('#rev', el).innerHTML = `<div class="reveal"><b>${esc(s.title)}</b> → ${patternTag(s.pattern)}<br>
        <span>Key move: ${esc(s.move)}</span>
        ${s.also ? `<div class="also small">${right && p !== s.pattern ? '✓ Yours works too: ' : 'Also works: '}${s.also.map(a => `${patternTag(a.pattern)} ${esc(a.name)}`).join(' · ')}</div>` : ''}
        <div class="muted small">${p === null ? 'Time up.' : right ? `${secsTaken.toFixed(1)}s` : 'Not quite.'}
        ${right && q === 1 ? ' Correct but slow, so counted as shaky.' : ''}</div></div>
        <div class="row" style="margin-top:12px"><button class="primary" id="nx" data-key="n">Next <kbd>Enter</kbd></button></div>`;
      const go = () => { document.removeEventListener('keydown', k2); done(q); };
      const k2 = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
      setTimeout(() => document.addEventListener('keydown', k2), 150); onRound(() => document.removeEventListener('keydown', k2));
      $('#nx', el).onclick = go;
    };
    el.addEventListener('click', e => { const b = e.target.closest('.options button'); if (b) answer(b.dataset.p); });
    const k = e => { if (!answered && singleKeysOn() && !isTyping(e.target) && ['1', '2', '3', '4'].includes(e.key)) answer(opts[+e.key - 1]); };
    document.addEventListener('keydown', k); onRound(() => document.removeEventListener('keydown', k));
  },
};

// 2. Line Up — Parsons problem: put the shuffled solution lines in order.
GAMES.lineup = {
  name: 'Line Up', icon: '🧩', layer: 'Structure', cost: 1.5, defaultN: 4,
  desc: 'The real solution, lines shuffled (indentation kept as a hint). Put them in order. Checked against real tests.',
  pool: () => C.problems,
  render(el, p, done, { clock }) {
    const lines = p.solution.split('\n').filter(t => t.trim()).map((t, i) => ({ t, i }));
    const byId = Object.fromEntries(lines.map(l => [l.i, l]));
    let pool = shuffle(lines), built = [], tries = 0, hint = false, finished = false;
    let cur = { list: 'pool', pos: 0 }, focusAfterDraw = false;  // keyboard cursor (roving focus)
    const timer = startTimer(clock, 0, null, { countUp: true });
    el.innerHTML = `<div class="card"><div class="row"><h2 class="h3">${esc(p.title)}</h2><span class="tag ${p.diff}">${p.diff}</span>
      <span class="spacer"></span><button class="ghost" id="hint" data-key="h">Show pattern <kbd>H</kbd></button></div>
      <p>${esc(p.statement)}</p><div id="hintbox" aria-live="polite"></div>
      <p class="muted small kbd-tip">Drag lines, or use the keyboard: <kbd>↑</kbd><kbd>↓</kbd> move between lines, <kbd>←</kbd><kbd>→</kbd> switch column,
        <kbd>Enter</kbd> moves a line across, <kbd>Alt</kbd>+<kbd>↑</kbd><kbd>↓</kbd> reorders.</p>
      <div class="parsons">
        <div><div class="muted small" id="pool-lbl">Shuffled lines</div><div class="lines" id="pool" role="listbox" aria-labelledby="pool-lbl"></div></div>
        <div><div class="muted small" id="built-lbl">Your solution, top to bottom</div><div class="lines" id="built" role="listbox" aria-labelledby="built-lbl"></div></div></div>
      <div class="row" style="margin-top:12px"><button class="primary" id="check" data-key="r">Run tests <kbd>Ctrl+Enter</kbd></button>
      <button class="ghost" id="giveup"></button><span id="moveon"></span><span class="spacer"></span><span class="muted small" id="cnt"></span></div>
      <div id="ans" hidden></div><div id="out" aria-live="polite"></div></div>`;
    const list = name => name === 'pool' ? pool : built;
    const draw = () => {
      const row = (l, k, name) => `<div class="ln" role="option" data-id="${l.i}" tabindex="${cur.list === name && cur.pos === k ? 0 : -1}">${name === 'built' ? `<span class="num">${k + 1}</span>` : ''}${hlOn() ? highlightLine(l.t) : esc(l.t)}</div>`;
      $('#pool', el).innerHTML = pool.map((l, k) => row(l, k, 'pool')).join('') || '<div class="muted small empty">All lines placed. Run the tests.</div>';
      $('#built', el).innerHTML = built.map((l, k) => row(l, k, 'built')).join('') || '<div class="muted small empty">Drag or press Enter on a line to start. The function signature usually goes first.</div>';
      for (const name of ['pool', 'built']) if (!list(name).length) $('#' + name, el).tabIndex = cur.list === name ? 0 : -1; else $('#' + name, el).removeAttribute('tabindex');
      $('#cnt', el).textContent = `${built.length}/${lines.length} lines`;
      if (focusAfterDraw) { focusAfterDraw = false; ($(`#${cur.list} .ln[tabindex="0"]`, el) || $('#' + cur.list, el)).focus(); }
    };
    const clampCur = () => { const n = list(cur.list).length; cur.pos = Math.max(0, Math.min(cur.pos, n - 1)); };
    const moveAcross = (name, k) => {
      const [l] = list(name).splice(k, 1); if (!l) return;
      (name === 'pool' ? built : pool).push(l);
      cur = { list: name, pos: k }; if (!list(name).length) cur = { list: name === 'pool' ? 'built' : 'pool', pos: (name === 'pool' ? built : pool).length - 1 };
      clampCur(); focusAfterDraw = true; draw();
    };
    // click = move across (kept from before; drag is the other way in)
    for (const name of ['pool', 'built']) $('#' + name, el).addEventListener('click', e => {
      const d = e.target.closest('.ln'); if (!d || d._dragged) return;
      moveAcross(name, list(name).findIndex(l => l.i === +d.dataset.id));
    });
    // keyboard
    el.querySelector('.parsons').addEventListener('keydown', e => {
      const d = e.target.closest('.ln, .lines'); if (!d) return;
      const name = e.target.closest('.lines').id, arr = list(name);
      const k = d.classList.contains('ln') ? arr.findIndex(l => l.i === +d.dataset.id) : 0;
      const go = (lst, pos) => { e.preventDefault(); cur = { list: lst, pos }; clampCur(); focusAfterDraw = true; draw(); };
      if (e.altKey && name === 'built' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        const j = k + (e.key === 'ArrowUp' ? -1 : 1); if (j < 0 || j >= arr.length) return e.preventDefault();
        [arr[k], arr[j]] = [arr[j], arr[k]]; return go('built', j);
      }
      if (e.key === 'ArrowDown') return go(name, k + 1);
      if (e.key === 'ArrowUp') return go(name, k - 1);
      if (e.key === 'Home') return go(name, 0);
      if (e.key === 'End') return go(name, arr.length - 1);
      if (e.key === 'ArrowRight' && name === 'pool') return go('built', Math.min(k, built.length - 1));
      if (e.key === 'ArrowLeft' && name === 'built') return go('pool', Math.min(k, pool.length - 1));
      if ((e.key === 'Enter' && !e.ctrlKey && !e.metaKey) || e.key === ' ') { e.preventDefault(); if (arr.length) moveAcross(name, k); }
    });
    // drag and drop (mouse + touch) via SortableJS; the DOM order is read back into pool / built
    if (window.Sortable) {
      const sync = () => {
        const ids = id => [...$('#' + id, el).querySelectorAll('.ln')].map(d => byId[+d.dataset.id]);
        pool = ids('pool'); built = ids('built'); draw();
      };
      for (const id of ['pool', 'built']) Sortable.create($('#' + id, el), {
        group: 'lineup', draggable: '.ln', animation: 120, delayOnTouchOnly: true, delay: 140,
        ghostClass: 'ln-ghost', chosenClass: 'ln-chosen', onEnd: e => { e.item._dragged = true; setTimeout(() => (e.item._dragged = false), 0); sync(); },
      });
    }
    $('#hint', el).onclick = () => { hint = true; $('#hintbox', el).innerHTML = `<div class="reveal">${patternTag(p.pattern)} ${esc(p.insight)}</div>`; };
    const ans = answerToggle($('#giveup', el), $('#ans', el),
      () => `<pre class="code">${esc(p.solution)}</pre><p>${esc(p.insight)}</p>`,
      () => { if (!finished) $('#moveon', el).append(missedBar(done)); });
    const check = async () => {
      if (finished) return;
      if (pool.length) { toast(`Place all lines first (${pool.length} left)`); return; }
      tries++;
      const r = await runTests(p, built.map(l => l.t).join('\n'), { hidden: false });
      $('#out', el).innerHTML = resultsHtml(r);
      if (r.ok) {
        finished = true; timer.stop();
        if (ans.seen) { $('#moveon', el).innerHTML = ''; $('#out', el).append(missedBar(done, true)); }
        else $('#out', el).append(gradeButtons(done, tries === 1 && !hint ? 2 : 1));
      } else {
        const firstWrong = built.findIndex((l, k) => l.t.trim() !== lines[k].t.trim());
        if (firstWrong >= 0) $('#out', el).insertAdjacentHTML('beforeend', `<p class="muted small">Hint: the first line that differs from the reference is line ${firstWrong + 1}.</p>`);
      }
    };
    $('#check', el).onclick = check;
    const k = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); check(); } };
    document.addEventListener('keydown', k); onRound(() => document.removeEventListener('keydown', k));
    focusAfterDraw = true; draw();
  },
};

// 3. Fill the Gap — the key lines are blank; write them.
GAMES.fill = {
  name: 'Fill the Gap', icon: '✍️', layer: 'Structure → Code', cost: 3, defaultN: 3,
  desc: 'The skeleton is given. The 2-4 lines that make it THIS problem are blank. Write them; real tests decide.',
  pool: () => C.problems,
  gate: p => (item('lineup', p.id)?.box || 0) >= 1,
  render(el, p, done, { clock }) {
    const lines = p.solution.split('\n');
    // Fading: once you've finished this pattern's course, the loop and return lines (the skeleton) are blank too,
    // so you recall the structure instead of reading it. "Show them" fills them back in and counts as a hint.
    const shape = new Set(courseProgress(p.pattern).complete
      ? lines.map((l, i) => i).filter(i => !p.key_lines.includes(i) && /^\s+(for|while)\b|^\s+return\b/.test(lines[i])) : []);
    const key = new Set([...p.key_lines, ...shape]);
    let tries = 0, hint = false, finished = false;
    const timer = startTimer(clock, 0, null, { countUp: true });
    let gapNo = 0;
    el.innerHTML = `<div class="card"><div class="row"><h2 class="h3">${esc(p.title)}</h2><span class="tag ${p.diff}">${p.diff}</span>
      ${patternTag(p.pattern)}<span class="spacer"></span><button class="ghost" id="hint" data-key="h">Hint <kbd>H</kbd></button></div>
      <p>${esc(p.statement)}</p><div id="hintbox" aria-live="polite"></div>
      ${shape.size ? `<p class="muted small fade-note">You’ve finished the ${esc(PAT(p.pattern).name)} course, so the loop and return lines are blank too: write the skeleton from memory.
        <button type="button" class="ghost small" id="unfade">Show them (counts as a hint)</button></p>` : ''}
      <div class="fill">${lines.map((l, i) => {
        if (!key.has(i)) return `<div class="l">${(hlOn() ? highlightLine(l) : esc(l)) || ' '}</div>`;
        const ind = l.match(/^ */)[0]; gapNo++;
        return `<div class="l in"><input type="text" data-i="${i}" autocomplete="off" spellcheck="false" placeholder="gap ${gapNo}" aria-label="Gap ${gapNo}" style="margin-left:${ind.length}ch"></div>
          <div class="l gap-ans" data-for="${i}" hidden style="padding-left:${ind.length}ch"></div>`;
      }).join('')}</div>
      <div class="row" style="margin-top:12px"><button class="primary" id="check" data-key="r">Run tests <kbd>Ctrl+Enter</kbd></button>
      <button class="ghost" id="giveup"></button><span id="moveon"></span></div><div id="out" aria-live="polite"></div></div>`;
    const inputs = $$('.fill input', el);
    inputs.forEach(hlInput);
    inputs[0]?.focus();
    inputs.forEach((inp, k) => inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.ctrlKey) { e.preventDefault(); (inputs[k + 1] || inp).focus(); }
      if (e.key === 'Enter' && e.ctrlKey) check();
    }));
    $('#hint', el).onclick = () => { hint = true; $('#hintbox', el).innerHTML = `<div class="reveal">${esc(p.insight)}<br><span class="muted">Catch: ${esc(p.catch)}</span></div>`; };
    if (shape.size) $('#unfade', el).onclick = e => {
      hint = true; e.currentTarget.remove();
      shape.forEach(i => { const inp = el.querySelector(`input[data-i="${i}"]`); inp.value = lines[i].trim(); inp.readOnly = true; inp.dispatchEvent(new Event('input')); });
    };
    const same = (a, b) => a.replace(/\s+/g, '') === b.replace(/\s+/g, '');
    // Show answer: each gap's answer appears right under it (your text stays), with ✓ when yours already matches.
    const ans = answerToggle($('#giveup', el), null, open => {
      $$('.gap-ans', el).forEach(div => {
        const want = lines[+div.dataset.for].trim(), mine = $(`input[data-i="${div.dataset.for}"]`, el).value.trim();
        div.hidden = !open;
        div.innerHTML = `<span class="gap-tag">${same(mine, want) ? '✓ yours matches' : 'answer'}</span> ${hlOn() ? highlightLine(want) : esc(want)}`;
        div.classList.toggle('ok', same(mine, want));
      });
      if (open) $('#hintbox', el).innerHTML = `<div class="reveal">${esc(p.insight)}<br><span class="muted">Catch: ${esc(p.catch)}</span></div>`;
    }, () => { if (!finished) $('#moveon', el).append(missedBar(done)); }, 'answers');
    const check = async () => {
      if (finished) return; tries++;
      const code = lines.map((l, i) => key.has(i) ? l.match(/^ */)[0] + el.querySelector(`input[data-i="${i}"]`).value.trim() : l).join('\n');
      const r = await runTests(p, code, { hidden: false });
      $('#out', el).innerHTML = resultsHtml(r);
      if (r.ok) {
        finished = true; timer.stop();
        if (ans.seen) { $('#moveon', el).innerHTML = ''; $('#out', el).append(missedBar(done, true)); }
        else $('#out', el).append(gradeButtons(done, tries === 1 && !hint ? 2 : 1));
      }
    };
    $('#check', el).onclick = check;
  },
};

// 4. Skeleton Recall — write the pattern's template from memory.
GAMES.skeleton = {
  name: 'Skeleton Recall', icon: '🦴', layer: 'Structure', cost: 2, defaultN: 2,
  desc: 'Write a pattern’s reusable code template from memory: the state, the loop, the move, the return. Hints step up one at a time; feedback lists exactly what your version is missing.',
  pool: () => C.patterns.map((p, i) => ({ ...p, num: i, diff: 'Medium', pattern: p.id })),
  render(el, pt, done, { clock }) {
    const timer = startTimer(clock, 180, () => toast('⏰ 3 minutes: compare when ready'));
    const exId = STUDY_ORDER.find(id => id !== pt.id && C.patterns.some(x => x.id === id));
    const ex = C.patterns.find(x => x.id === exId);
    const refLines = pt.skeleton.split('\n');
    // hint ladder (progressive: nudge → shape → near-complete). Each step lowers the best grade you can get.
    const hints = [
      { cap: 2, label: 'Nudge', html: () => `<b>Ask yourself:</b><ol>${pt.fill.map(f => `<li>${esc(f)}</li>`).join('')}</ol>` },
      { cap: 1, label: 'Shape', html: () => `<b>The shape</b> (keywords only; ${refLines.length} lines):<pre class="code">${esc(refLines.map(l => {
          const ind = l.match(/^ */)[0], kw = l.trim().match(/^(for|while|if|elif|else|return|def|class|with|try|yield|break|continue)\b/);
          return ind + (kw ? kw[1] + ' …' : '…'); }).join('\n'))}</pre>` },
      { cap: 1, label: 'First lines', html: () => `<b>The first ${Math.ceil(refLines.length / 3)} lines:</b><pre class="code">${esc(refLines.slice(0, Math.ceil(refLines.length / 3)).join('\n'))}</pre>` },
    ];
    let hintLevel = 0;
    el.innerHTML = `<div class="card"><div class="row"><h2 class="h3">Write the ${esc(pt.name)} skeleton</h2><span class="spacer"></span>
        <button class="ghost" id="hint" data-key="h">Hint 1 of 3 <kbd>H</kbd></button></div>
      <div class="brief">
        <p><b>What to write:</b> the template you reuse for <i>every</i> ${esc(pt.name)} problem, not a solution to one problem.
        About ${refLines.length} lines. Use generic names (<code>nums</code>, <code>target</code>, <code>i</code>) and <code>...</code> or a <code># comment</code>
        where a specific problem plugs in its own logic.</p>
        <p class="small"><b>It should show:</b> the state you keep · the loop or recursion · the condition that moves you on · what you return.</p>
        <p class="muted small">Used when: ${pt.triggers.map(esc).join(' · ')}</p>
        ${ex ? `<details><summary class="small">What does a skeleton look like? (example from a different pattern: ${esc(ex.name)})</summary><pre class="code">${esc(ex.skeleton)}</pre></details>` : ''}
      </div>
      <div id="hintbox" aria-live="polite"></div>
      <textarea class="code" id="ed" aria-label="Your skeleton" placeholder="# state you keep&#10;# loop&#10;#     condition that moves you on&#10;# return ..."></textarea>
      <div class="row" style="margin-top:10px"><button class="primary" id="go" data-key="r">Compare <kbd>Ctrl+Enter</kbd></button></div><div id="out" aria-live="polite"></div></div>`;
    const ed = $('#ed', el); enhanceEditor(ed, { onSubmit: () => submit() }); ed.focus();
    $('#hint', el).onclick = () => {
      if (hintLevel >= hints.length) return;
      $('#hintbox', el).insertAdjacentHTML('beforeend', `<div class="reveal small">${hints[hintLevel].html()}</div>`);
      hintLevel++;
      const b = $('#hint', el);
      if (hintLevel >= hints.length) { b.disabled = true; b.innerHTML = 'No more hints'; } else b.innerHTML = `Hint ${hintLevel + 1} of 3 <kbd>H</kbd>`;
      ed.focus();
    };
    // Structural features: what the reference skeleton contains, checked against yours.
    const FEATURES = [
      ['a for loop', /\bfor\b[^\n]*\bin\b/], ['a while loop', /\bwhile\b/], ['a hash map or set', /\{\s*\}|\bdict\(|\bset\(|defaultdict|Counter/],
      ['a deque / queue', /\bdeque\b/], ['a heap', /heapq|heappush|heappop|heapify/], ['a stack (append / pop)', /\.append\(|\.pop\(\)/],
      ['two pointers / bounds', /\b(lo|hi|left|right|l|r|i|j)\s*,\s*(lo|hi|left|right|l|r|i|j)\s*=|\b(lo|hi|left|right)\s*=/],
      ['a midpoint', /\bmid\b\s*=/], ['sorting', /\bsort\(|\bsorted\(/], ['a helper function', /\bdef\b/],
      ['an early exit / condition', /\bif\b/], ['a return', /\breturn\b/], ['a DP table', /\bdp\b|\[\s*0\s*\]\s*\*|\[\s*1\s*\]\s*\*/],
      ['a visited / seen set', /\bvisited\b|\bseen\b/], ['recursion', null],
    ];
    const strip = s => s.replace(/#.*$/gm, '');
    const recursive = code => [...code.matchAll(/\bdef\s+(\w+)/g)].some(m => code.split(m[0])[1]?.includes(m[1] + '('));
    const has = (code, [name, re]) => name === 'recursion' ? recursive(code) : re.test(code);
    let sent = false;
    const submit = () => {
      if (sent) return; sent = true; timer.stop(); ed.readOnly = true;
      const mine = strip(ed.value), ref = strip(pt.skeleton);
      const want = FEATURES.filter(f => has(ref, f));
      const got = want.filter(f => has(mine, f));
      const pct = want.length ? got.length / want.length : 0;
      const lenOk = mine.split('\n').filter(l => l.trim()).length >= Math.ceil(refLines.filter(l => l.trim()).length * 0.6);
      let q = pct >= 0.85 && lenOk ? 2 : pct >= 0.5 ? 1 : 0;
      q = Math.min(q, hintLevel ? hints[hintLevel - 1].cap : 2);
      $('#out', el).innerHTML = `<div class="side" style="margin-top:12px">
        <div><div class="muted small">Reference</div><pre class="code">${esc(pt.skeleton)}</pre></div>
        <div><b>Your skeleton has ${got.length} of ${want.length} parts</b>
          <ul class="checks">${want.map(f => `<li class="${got.includes(f) ? 'ok' : 'miss'}">${got.includes(f) ? '✓' : '✗'} ${esc(f[0])}</li>`).join('')}</ul>
          ${!lenOk ? `<p class="small muted">Yours is much shorter than the reference (${refLines.length} lines). Something is probably missing.</p>` : ''}
          ${hintLevel ? `<p class="small muted">You used ${hintLevel} hint${hintLevel > 1 ? 's' : ''}, so the best grade is ${['Blanked', 'Shaky', 'Nailed'][hints[hintLevel - 1].cap]}.</p>` : ''}
          <p class="muted small">Grade the structure, not variable names. The suggested grade is outlined.</p></div></div>`;
      const maxQ = hintLevel ? hints[hintLevel - 1].cap : 2;
      const bar = gradeButtons(done, q);
      bar.querySelectorAll('button').forEach(b => { if (+b.dataset.q > maxQ) b.disabled = true; });
      $('#out', el).append(bar);
    };
    $('#go', el).onclick = submit;
  },
};

// 5. Syntax Snap — write the Python line; it's executed and checked.
GAMES.syntax = {
  name: 'Syntax Snap', icon: '🐍', layer: 'Syntax', cost: 0.6, defaultN: 5,
  desc: 'One-line Python idioms you need on autopilot: heapq, deque, Counter, sorting keys, slicing. Your code actually runs.',
  pool: () => C.syntax.map((s, i) => ({ ...s, num: i, pattern: s.topic, diff: 'Easy' })),
  render(el, s, done, { clock }) {
    const timer = startTimer(clock, 0, null, { countUp: true });
    let tries = 0, finished = false;
    el.innerHTML = `<div class="card"><div class="muted small">${esc(s.topic)}</div><div class="prompt">${esc(s.prompt)}</div>
      ${s.setup ? `<div class="muted small" style="margin-top:8px">Already defined:</div><pre class="code">${esc(s.setup)}</pre>` : ''}
      <textarea class="code snap" id="ed" placeholder="your code"></textarea>
      <div class="row" style="margin-top:10px"><button class="primary" id="go" data-key="r">Check <kbd>Ctrl+Enter</kbd></button><button class="ghost" id="ans"></button><span id="moveon"></span></div>
      <div id="ansbox" hidden></div><div id="out" aria-live="polite"></div></div>`;
    const ed = $('#ed', el); enhanceEditor(ed, { onSubmit: () => check() }); ed.focus();
    const shown = answerToggle($('#ans', el), $('#ansbox', el), () => `<pre class="code">${esc(s.answer)}</pre>`,
      () => { if (!finished) $('#moveon', el).append(missedBar(done)); });
    const check = async () => {
      if (finished) return; tries++;
      const r = await runSyntax(s, ed.value);
      $('#out', el).innerHTML = r.ok ? `<div class="res">✓ Correct</div><pre class="code">${esc(s.answer)}</pre>` : `<div class="res fail">✗ ${esc(r.error || 'Check failed: ' + s.check)}</div>`;
      if (r.ok) {
        finished = true; timer.stop();
        if (shown.seen) { $('#moveon', el).innerHTML = ''; $('#out', el).append(missedBar(done, true)); }
        else $('#out', el).append(gradeButtons(done, tries === 1 ? 2 : 1));
      }
    };
    $('#go', el).onclick = check;
  },
};

// 6. Big-O Call — pick the time and space complexity of a solution.
GAMES.bigo = {
  name: 'Big-O Call', icon: '⏱️', layer: 'In-person', cost: 0.5, defaultN: 5, focus: 'complexity',
  desc: 'Read a solution and call its time and space complexity, as you will have to say out loud in an interview.',
  pool: () => C.problems,
  render(el, p, done, { clock }) {
    const timer = startTimer(clock, 0, null, { countUp: true });
    const opts = right => shuffle([right, ...pick(C.complexities.filter(c => c !== right), 3)]);
    const to = opts(p.time), so = opts(p.space);
    let pickT = null, pickS = null;
    el.innerHTML = `<div class="card"><div class="row"><h2 class="h3">${esc(p.title)}</h2>${patternTag(p.pattern)}</div>
      <p class="muted small">${esc(p.statement)}</p><pre class="code">${esc(p.solution)}</pre>
      <div class="side"><div><b>Time</b> <span class="muted small">keys 1-4</span><div class="options" id="t">${to.map((c, k) => `<button data-c="${esc(c)}"><kbd>${k + 1}</kbd> ${esc(c)}</button>`).join('')}</div></div>
      <div><b>Space</b> <span class="muted small">(extra, excluding output) · then 1-4</span><div class="options" id="s">${so.map((c, k) => `<button data-c="${esc(c)}"><kbd>${k + 1}</kbd> ${esc(c)}</button>`).join('')}</div></div></div>
      <div id="out" aria-live="polite"></div></div>`;
    const keys = e => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey || !singleKeysOn() || !['1', '2', '3', '4'].includes(e.key)) return;
      if (pickT == null) $$('#t button', el)[+e.key - 1]?.click(); else if (pickS == null) $$('#s button', el)[+e.key - 1]?.click();
    };
    document.addEventListener('keydown', keys); onRound(() => document.removeEventListener('keydown', keys));
    const maybe = () => {
      if (pickT == null || pickS == null) return;
      timer.stop();
      const okT = pickT === p.time, okS = pickS === p.space;
      [['#t', p.time, pickT], ['#s', p.space, pickS]].forEach(([sel, right, mine]) => $$(sel + ' button', el).forEach(b => {
        b.disabled = true; if (b.dataset.c === right) b.classList.add('right'); else if (b.dataset.c === mine) b.classList.add('wrong'); }));
      $('#out', el).innerHTML = `<div class="reveal">Time <b>${esc(p.time)}</b> · Space <b>${esc(p.space)}</b><br>${esc(p.insight)}</div>`;
      const q = okT && okS ? 2 : okT || okS ? 1 : 0;
      const nx = Object.assign(document.createElement('button'), { className: 'primary', innerHTML: 'Next <kbd>N</kbd>' });
      nx.dataset.key = 'n'; nx.style.marginTop = '10px'; nx.onclick = () => done(q);
      $('#out', el).append(nx); nx.focus({ preventScroll: true });
    };
    $('#t', el).onclick = e => { const b = e.target.closest('button'); if (!b || pickT) return; pickT = b.dataset.c; b.style.outline = '2px solid var(--accent)'; maybe(); };
    $('#s', el).onclick = e => { const b = e.target.closest('button'); if (!b || pickS) return; pickS = b.dataset.c; b.style.outline = '2px solid var(--accent)'; maybe(); };
  },
};

// 7. Edge Hunter — list clarifying questions & edge cases, then self-check.
GAMES.edge = {
  name: 'Edge Hunter', icon: '🔍', layer: 'In-person', cost: 1.5, defaultN: 2, focus: 'clarify',
  desc: 'A minute (change it in Settings) to write the clarifying questions and edge cases you would raise, one per line. Scored automatically against the expected list; claiming one it didn’t match counts half.',
  pool: () => C.problems,
  render(el, p, done, { clock }) {
    el.innerHTML = `<div class="card"><div class="row"><h2 class="h3">${esc(p.title)}</h2><span class="tag ${p.diff}">${p.diff}</span></div>
      <p class="prompt" style="font-size:17px">${esc(p.statement)}</p>
      <p class="muted small">One question or edge case per line, specific to this problem (e.g. “what if n is 0?”, not just “edge cases”).</p>
      <textarea id="ed" style="min-height:150px" aria-label="Your questions and edge cases" placeholder="- What if the input is empty?&#10;- Can there be duplicates?&#10;- ..."></textarea>
      <div class="row" style="margin-top:10px"><button class="primary" id="go" data-key="r">Score it <kbd>Ctrl+Enter</kbd></button></div><div id="out" aria-live="polite"></div></div>`;
    const ed = $('#ed', el); ed.focus();
    const lim = S.settings.edgeSeconds ?? 60;
    const timer = lim ? startTimer(clock, lim, () => reveal()) : startTimer(clock, 0, null, { countUp: true });
    let shown = false;
    const reveal = () => {
      if (shown) return; shown = true; timer.stop(); ed.readOnly = true;
      const mineLines = ed.value.split('\n').map(l => l.replace(/^[\s\-*•\d.)]+/, '').trim()).filter(l => l.length > 2);
      const items = [...p.clarify.map(t => ({ t, kind: '❓' })), ...p.edges.map(t => ({ t, kind: '⚠️' }))]
        .map(it => ({ ...it, match: bestEdgeMatch(it.t, mineLines) }));
      const auto = items.filter(it => it.match).length;
      const draw = () => {
        const claimed = items.filter(it => !it.match && it.claimed).length;
        const score = items.length ? (auto + claimed * 0.5) / items.length : 1;
        const q = !mineLines.length ? 0 : score >= 0.75 ? 2 : score >= 0.4 ? 1 : 0;
        $('#out', el).innerHTML = `<h2 class="h3" style="margin-top:14px">You covered ${auto} of ${items.length}${claimed ? ` (+${claimed} claimed, half credit)` : ''}: ${Math.round(score * 100)}%</h2>
          <ul class="checks edge">${items.map((it, i) => `<li class="${it.match ? 'ok' : it.claimed ? 'claim' : 'miss'}">
            <span>${it.match ? '✓' : it.claimed ? '½' : '✗'} ${it.kind} ${esc(it.t)}</span>
            ${it.match ? `<span class="muted small">your line: “${esc(it.match)}”</span>`
              : `<label class="small"><input type="checkbox" data-claim="${i}" ${it.claimed ? 'checked' : ''}> I covered this in other words</label>`}</li>`).join('')}</ul>
          ${!mineLines.length ? '<p class="small" style="color:var(--bad)">Nothing written, so this counts as missed.</p>' : ''}
          <details style="margin-top:8px"><summary>Questions worth asking on any problem</summary><ul>${C.clarify_generic.map(c => `<li>${esc(c)}</li>`).join('')}</ul></details>
          <div class="gradebar"><span class="muted small" style="align-self:center">Grade from your score: <b>${['Blanked', 'Shaky', 'Nailed'][q]}</b></span>
            <button class="primary" id="nx" data-key="n">Next <kbd>N</kbd></button></div>`;
        $$('[data-claim]', el).forEach(c => c.onchange = () => { items[+c.dataset.claim].claimed = c.checked; draw(); });
        $('#nx', el).onclick = () => done(q);
      };
      draw();
      $('#nx', el).focus({ preventScroll: true });
    };
    $('#go', el).onclick = reveal;
    ed.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); reveal(); } });
  },
};

// Bug Hunt — a working solution with one planted bug: run it, find the bug, fix it.
const applyBug = (solution, b) => { const ls = solution.split('\n'); if (b.buggy == null) ls.splice(b.line, 1); else ls[b.line] = b.buggy; return ls.join('\n'); };
GAMES.bughunt = {
  name: 'Bug Hunt', icon: '🐞', layer: 'Full solve', cost: 4, defaultN: 3,
  desc: 'A working solution with one realistic bug planted in it: an off-by-one, a shared list, a missing update, a broken guard. Run it, read the failures (and your prints), and fix it.',
  pool: () => C.problems.flatMap(p => (p.bugs || []).map(b => ({ ...b, pattern: p.pattern, num: p.num, diff: p.diff, title: p.title }))),
  render(el, b, done, { clock }) {
    const p = PROB(b.problem), K = C.bug_kinds[b.kind] || ['Bug', '', ''];
    const timer = startTimer(clock, 0, null, { countUp: true });
    let runs = 0, hints = 0, finished = false, shown = false;
    el.innerHTML = `<div class="solve-grid"><div class="solve-left"><div class="card pcard">${problemPanel(p)}</div></div>
      <div class="solve-right"><p class="bh-intro">This solution has <b>one bug</b>. Run it, work out what’s wrong from the failing tests (add <code>print</code>s if it helps), and fix it.</p>
      <textarea class="code" id="ed" aria-label="The buggy solution">${esc(applyBug(p.solution, b))}</textarea>
      <div class="row" style="margin-top:10px"><button class="primary" id="run" data-key="r">Run tests <kbd>Ctrl+Enter</kbd></button>
        <button class="ghost" id="hint" data-key="h">Hint <kbd>H</kbd></button><button class="ghost" id="show" data-key="a">Show the bug <kbd>A</kbd></button>
        <span id="moveon"></span><span class="spacer"></span><span class="muted small" id="rc"></span></div>
      <div id="hints"></div><div id="out" aria-live="polite"></div></div></div>`;
    const ed = $('#ed', el); enhanceEditor(ed, { onSubmit: () => run() });
    const lineNo = b.line + 1, src = p.solution.split('\n');
    const where = b.buggy == null ? `Something is missing right after <code class="hlc">${esc((src[b.line - 1] || '').trim())}</code>.`
      : `Look closely at <code class="hlc">${esc(b.buggy.trim())}</code>.`;
    const reveal = () => `<div class="reveal"><b>${esc(K[0])}.</b> ${b.buggy == null ? `Line ${lineNo} was deleted:` : `Line ${lineNo}:`}
      ${b.buggy == null ? '' : `<pre class="code cs-one bh-bad">${esc(b.buggy.trim())}</pre>should be`}<pre class="code cs-one">${esc(b.fixed.trim())}</pre>
      <p class="small" style="margin:6px 0 0">${pyMdLite(K[2])}</p></div>`;
    $('#hint', el).onclick = () => {
      if (finished || hints >= 2) return; hints++;
      $('#hints', el).insertAdjacentHTML('beforeend', `<p class="bh-hint">💡 ${hints === 1 ? pyMdLite(K[1]) : where}</p>`);
      if (hints >= 2) $('#hint', el).disabled = true;
    };
    $('#show', el).onclick = () => {
      if (shown) return; shown = true; $('#show', el).disabled = true;
      $('#hints', el).insertAdjacentHTML('beforeend', reveal());
      if (!finished) $('#moveon', el).append(missedBar(done));
    };
    const run = async () => {
      if (finished) return; runs++; $('#rc', el).textContent = `${runs} run${runs > 1 ? 's' : ''}`;
      const r = await runTests(p, ed.value, { hidden: false });
      $('#out', el).innerHTML = resultsHtml(r);
      if (r.ok) {
        finished = true; timer.stop();
        if (!shown) $('#out', el).insertAdjacentHTML('beforeend', reveal());
        if (shown) { $('#moveon', el).innerHTML = ''; $('#out', el).append(missedBar(done, true)); }
        else $('#out', el).append(gradeButtons(done, hints === 0 && runs <= 3 ? 2 : 1));
      }
    };
    $('#run', el).onclick = run;
  },
};
