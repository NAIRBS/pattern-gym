// ── Python tab: an intro to Python for coding problems, with code that runs and quizzes that run it ──
// Content is C.python (content/python_course.py). Each lesson has a runnable example; its tasks are
// Predict (type what the code prints, then it runs) or Write (a program, run on each case's stdin).
// Finished tasks are remembered in this browser only (pg-py-done); nothing here touches reviews or XP.
'use strict';

const PY_KEY = 'pg-py-done';
const pyDone = () => { try { return JSON.parse(localStorage.getItem(PY_KEY) || '{}'); } catch (e) { return {}; } };
const pyMark = id => { const d = pyDone(); d[id] = 1; try { localStorage.setItem(PY_KEY, JSON.stringify(d)); } catch (e) {} };
// Same rule as runner._norm_out: trailing spaces on a line and trailing blank lines don't count.
const pyNorm = s => String(s ?? '').replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n').map(l => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
// `code`, **bold** and *italic*; stars inside code spans stay literal (print(*nums)).
// Code spans are swapped for placeholders first, so bold can wrap one: **Find the `for`**.
function pyMd(s) {
  const codes = [];
  const t = esc(String(s ?? '').replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`))
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*([^*\s][^*]*?)\*/g, '<i>$1</i>');
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[+i])}</code>`);
}
function pyBody(lines) {
  let h = '', list = [];
  const flush = () => { if (list.length) h += `<ul>${list.map(x => `<li>${pyMd(x)}</li>`).join('')}</ul>`; list = []; };
  for (const l of lines) { if (l.startsWith('- ')) list.push(l.slice(2)); else { flush(); h += `<p>${pyMd(l)}</p>`; } }
  flush(); return h;
}
const pyRows = s => Math.min(24, Math.max(3, String(s).split('\n').length + 1));
const pyTasks = sec => sec.lessons.flatMap(l => l.tasks);
// "Where you'll see it": reference-solution lines that use this lesson's idiom.
function pySeen(les) {
  if (!les.find) return '';
  let re; try { re = new RegExp(les.find); } catch (e) { return ''; }
  const hits = [];
  for (const p of C.problems) for (const l of p.solution.split('\n')) if (re.test(l)) hits.push([p, l.trim()]);
  if (!hits.length) return '';
  const shown = hits.slice(0, 6);
  return `<div class="py-seen"><h3 class="cs-h">Where you’ll see it in the solutions</h3><ul>
    ${shown.map(([p, l]) => `<li><a href="#/cheatsheet/solutions?q=${encodeURIComponent(p.title.toLowerCase())}">${esc(p.title)}</a><pre class="code cs-one">${esc(l)}</pre></li>`).join('')}</ul>
    ${hits.length > shown.length ? `<p class="muted small">and ${hits.length - shown.length} more line${hits.length - shown.length > 1 ? 's' : ''}</p>` : ''}</div>`;
}
// One case's result: input, what it printed, what was expected.
function pyCase(x, k, n) {
  const head = n > 1 ? `Test ${k + 1}` : x.expected != null ? 'Result' : 'Output';
  const box = (label, v, cls = '') => `<div class="py-io"><span class="muted small">${label}</span><pre class="py-out ${cls}">${v === '' ? '<span class="muted">(nothing)</span>' : esc(v)}</pre></div>`;
  return `<div class="py-case ${x.expected == null ? '' : x.pass ? 'pass' : 'fail'}">
    ${x.expected != null ? `<b>${x.pass ? '✓' : '✗'} ${head}</b>` : ''}
    <div class="py-ios">${x.stdin ? box('Input', x.stdin.replace(/\n$/, '')) : ''}
    ${box(x.expected != null ? 'Your output' : 'Printed', pyNorm(x.got))}
    ${x.expected != null && !x.pass ? box('Expected', pyNorm(x.expected)) : ''}</div>
    ${x.error ? `<div class="err">${esc(x.error)}</div>` : ''}</div>`;
}

ROUTES.python = (app, [tab]) => {
  const secs = C.python || [];
  let sec = secs.find(s => s.id === tab) || secs[0];
  const done = pyDone();
  const count = s => { const t = pyTasks(s); return [t.filter(x => done[x.id]).length, t.length]; };
  const allT = secs.flatMap(pyTasks), allDone = allT.filter(t => done[t.id]).length;

  const example = les => `<div class="py-ex" data-les="${les.id}">
      <h3 class="cs-h">Try it${les.outfile ? ` <span class="muted">(${esc(Object.keys(les.files).join(', '))} is provided)</span>` : ''}</h3>
      <textarea class="code py-ed" rows="${pyRows(les.code)}" aria-label="Example code, editable">${esc(les.code)}</textarea>
      ${les.stdin ? `<label class="py-stdin"><span class="muted small">Input (stdin)</span><textarea class="code py-in" rows="${pyRows(les.stdin) - 1}" spellcheck="false" aria-label="Input for the example">${esc(les.stdin.replace(/\n$/, ''))}</textarea></label>` : ''}
      <div class="row"><button class="primary py-run">Run <kbd>Ctrl+Enter</kbd></button><button class="ghost py-reset">Reset</button></div>
      <div class="py-res" aria-live="polite"></div></div>`;
  const task = t => t.kind === 'predict' ? `
      <div class="py-task" data-t="${t.id}"><div class="py-task-h"><span class="tag py-pr">Predict</span><b>What does this print?</b><span class="py-ok" ${done[t.id] ? '' : 'hidden'}>✓ Done</span></div>
        <pre class="code">${esc(t.code)}</pre>
        ${t.stdin ? `<div class="muted small">Its input is <code>${esc(t.stdin.replace(/\n$/, '').replace(/\n/g, '⏎'))}</code></div>` : ''}
        <textarea class="code py-guess" rows="${Math.max(2, t.answer.split('\n').length + 1)}" spellcheck="false" placeholder="Type the exact output, one line per printed line" aria-label="Your prediction"></textarea>
        <div class="row"><button class="primary py-check">Check by running it <kbd>Ctrl+Enter</kbd></button><button class="ghost py-show">Show the answer</button></div>
        <div class="py-res" aria-live="polite"></div></div>` : `
      <div class="py-task" data-t="${t.id}"><div class="py-task-h"><span class="tag py-wr">Write</span><b>Your turn</b><span class="py-ok" ${done[t.id] ? '' : 'hidden'}>✓ Done</span></div>
        <p>${pyMd(t.prompt)}</p>
        ${t.cases[0].stdin ? `<div class="py-io"><span class="muted small">Sample input</span><pre class="py-out">${esc(t.cases[0].stdin.replace(/\n$/, ''))}</pre></div>` : ''}
        <textarea class="code py-ed" rows="${pyRows(t.starter) + 4}" aria-label="Your program">${esc(t.starter)}</textarea>
        <div class="row"><button class="primary py-check">Check <kbd>Ctrl+Enter</kbd></button><button class="ghost py-try">Run on the sample</button><button class="ghost py-show">Show a solution</button>
          <span class="muted small">${t.cases.length} test${t.cases.length > 1 ? 's' : ''}</span></div>
        <div class="py-sol" hidden><pre class="code">${esc(t.solution)}</pre></div>
        <div class="py-res" aria-live="polite"></div></div>`;
  const lesson = (les, i) => `<article class="card py-les" id="py-${les.id}">
      <h2 class="h3"><span class="py-n">${i + 1}</span>${esc(les.title)}</h2>
      <div class="py-body">${pyBody(les.body)}</div>
      ${les.read.length ? `<h3 class="cs-h">How to read it</h3><table class="gtbl py-read"><tbody>${les.read.map(([a, b]) => `<tr><td><code class="hlc">${esc(a)}</code></td><td>${pyMd(b)}</td></tr>`).join('')}</tbody></table>` : ''}
      ${les.loop ? `<h3 class="cs-h">The same thing, written out</h3><pre class="code">${esc(les.loop)}</pre>` : ''}
      ${example(les)}
      ${pySeen(les)}
      ${les.tasks.length ? `<h3 class="cs-h">Quiz yourself</h3>${les.tasks.map(task).join('')}` : ''}
    </article>`;

  app.innerHTML = `<div class="guide py">
    <div class="guide-head"><h1>Python</h1>
      <p class="lede">The Python you need for online assessments and for live interviews on a blank page: writing the whole program yourself, reading input and printing output, the data types and containers, and how to read the dense one-liners in the solutions. Every example runs, and every quiz is checked by running the code.</p>
      <p class="muted small">${allDone} of ${allT.length} quiz questions done. Progress is kept in this browser only and doesn’t affect your reviews. The input and output material follows the <a href="https://usaco.guide/general/input-output?lang=py" target="_blank" rel="noopener">USACO Guide ↗</a>.</p></div>
    <div class="gtabs" role="tablist" aria-label="Python sections">${secs.map((s, i) => { const [d, n] = count(s);
      return `<a role="tab" href="#/python/${s.id}" aria-selected="${s === sec}" tabindex="${s === sec ? 0 : -1}" class="${s === sec ? 'on' : ''}"
        data-key="${i + 1}" data-kgroup="switch section">${esc(s.title)} <span class="py-cnt${d === n && n ? ' all' : ''}">${d}/${n}</span> <kbd>${i + 1}</kbd></a>`; }).join('')}</div>
    <div role="tabpanel" aria-label="${esc(sec.title)}" class="gpanel">
      <p class="py-intro">${pyMd(sec.intro)}</p>
      <nav class="py-toc" aria-label="Lessons in this section">${sec.lessons.map((l, i) => `<button type="button" class="gchip in" data-go="${l.id}">${i + 1}. ${esc(l.title)}</button>`).join('')}</nav>
      ${sec.lessons.map(lesson).join('')}
      ${secs[secs.indexOf(sec) + 1] ? `<p class="py-next"><a class="btn" href="#/python/${secs[secs.indexOf(sec) + 1].id}" data-key="n">Next: ${esc(secs[secs.indexOf(sec) + 1].title)} → <kbd>N</kbd></a></p>` : ''}
    </div></div>`;

  const L = Object.fromEntries(sec.lessons.map(l => [l.id, l]));
  const T = Object.fromEntries(sec.lessons.flatMap(l => l.tasks).map(t => [t.id, t]));
  $$('.py-toc [data-go]', app).forEach(b => b.onclick = () => $('#py-' + b.dataset.go, app)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  const busy = async (btn, fn) => { if (btn.disabled) return; btn.disabled = true; try { await fn(); } finally { btn.disabled = false; } };
  const finish = box => { const id = box.dataset.t; if (!done[id]) { done[id] = 1; pyMark(id); } $('.py-ok', box).hidden = false; };

  // Examples: edit and run.
  for (const box of $$('.py-ex', app)) {
    const les = L[box.dataset.les], ed = $('.py-ed', box), inp = $('.py-in', box), out = $('.py-res', box), btn = $('.py-run', box);
    const run = () => busy(btn, async () => {
      out.innerHTML = '<p class="muted small">Running…</p>';
      const c = { stdin: inp ? inp.value + '\n' : '' };
      if (les.files) Object.assign(c, { files: les.files, outfile: les.outfile });
      const r = await runScript(ed.value, [c]);
      const x = r.results?.[0];
      out.innerHTML = !x ? `<div class="err">${esc(r.error || 'Couldn’t run it')}</div>`
        : `${les.outfile ? `<div class="py-io"><span class="muted small">${esc(les.outfile)} now contains</span><pre class="py-out">${esc(pyNorm(x.got)) || '<span class="muted">(empty)</span>'}</pre></div>` : `<div class="py-io"><span class="muted small">Printed</span><pre class="py-out">${x.got ? esc(pyNorm(x.got)) : '<span class="muted">(nothing)</span>'}</pre></div>`}
           ${x.error ? `<div class="err">${esc(x.error)}</div>` : ''}`;
    });
    enhanceEditor(ed, { onSubmit: run });
    inp?.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); } });
    btn.onclick = run;
    $('.py-reset', box).onclick = () => { ed.value = les.code; ed._paint?.(); if (inp) inp.value = les.stdin.replace(/\n$/, ''); out.innerHTML = ''; };
  }

  // Quizzes.
  for (const box of $$('.py-task', app)) {
    const t = T[box.dataset.t], out = $('.py-res', box), chk = $('.py-check', box);
    if (t.kind === 'predict') {
      const g = $('.py-guess', box);
      const reveal = (actual, mine) => {
        const a = pyNorm(actual).split('\n'), m = mine == null ? null : pyNorm(mine).split('\n');
        const lines = a.map((l, i) => `<span class="${m && m[i] !== l ? 'py-diff' : ''}">${esc(l) || ' '}</span>`).join('\n');
        return `<div class="py-io"><span class="muted small">It prints</span><pre class="py-out">${lines}</pre></div><p class="py-why">${pyMd(t.why)}</p>`;
      };
      const check = () => busy(chk, async () => {
        if (!g.value.trim()) { g.focus(); toast('Type what you think it prints first'); return; }
        out.innerHTML = '<p class="muted small">Running it…</p>';
        const r = await runScript(t.code, [{ stdin: t.stdin }]);
        const actual = r.results?.[0] && !r.results[0].error ? r.results[0].got : t.answer;   // offline: the stored answer
        const ok = pyNorm(g.value) === pyNorm(actual);
        out.innerHTML = `<div class="res ${ok ? '' : 'fail'}">${ok ? '✓ Exactly right' : '✗ Not quite. The lines that differ are marked.'}</div>${reveal(actual, g.value)}`;
        if (ok) finish(box);
      });
      chk.onclick = check;
      g.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); check(); } });
      $('.py-show', box).onclick = () => { out.innerHTML = reveal(t.answer, null); };
    } else {
      const ed = $('.py-ed', box);
      const check = () => busy(chk, async () => {
        out.innerHTML = '<p class="muted small">Running your program on every test…</p>';
        const r = await runScript(ed.value, t.cases);
        if (r.error && !r.results?.length) { out.innerHTML = `<div class="err">${esc(r.error)}</div>`; return; }
        const rs = r.results || [];
        out.innerHTML = `<div class="res ${r.ok ? '' : 'fail'}">${r.ok ? `✓ All ${rs.length} tests pass` : `✗ ${rs.filter(x => !x.pass).length} of ${rs.length} tests fail`}</div>
          ${rs.map((x, k) => (!r.ok || k === 0) ? pyCase(x, k, rs.length) : '').join('')}`;
        if (r.ok) finish(box);
      });
      enhanceEditor(ed, { onSubmit: check });
      chk.onclick = check;
      $('.py-try', box).onclick = e => busy(e.currentTarget, async () => {
        const c = { ...t.cases[0] }; delete c.expected;
        const r = await runScript(ed.value, [c]);
        out.innerHTML = r.results?.[0] ? pyCase(r.results[0], 0, 1) : `<div class="err">${esc(r.error || 'Couldn’t run it')}</div>`;
      });
      $('.py-show', box).onclick = e => { const s = $('.py-sol', box); s.hidden = !s.hidden; e.currentTarget.textContent = s.hidden ? 'Show a solution' : 'Hide the solution'; };
    }
  }

  const tabs = $$('.gtabs [role=tab]', app);
  $('.gtabs', app).addEventListener('keydown', e => {
    const k = tabs.indexOf(document.activeElement); if (k < 0) return;
    const j = e.key === 'ArrowRight' ? k + 1 : e.key === 'ArrowLeft' ? k - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
    if (j === null) return; e.preventDefault(); e.stopPropagation(); tabs[(j + tabs.length) % tabs.length].focus();
  });
  if (typeof startPy === 'function' && !SERVER && !pyWorker) startPy();   // warm up Python while they read
};
