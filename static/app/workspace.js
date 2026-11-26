/* Pattern Gym · workspace.js: the solve screen, laid out like LeetCode's.
   Plain script (no modules): shares one global scope with the other files in index.html's order.

   ┌ Description | Coach | Hints ┐┃┌ </> Code ─────────────── ↺ ⤢ ┐
   │ the problem                   │┃│ editor                          │
   │                               │┃├━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┤
   │                               │┃│ Testcase | Test Result  ▶Run Submit │
   └───────────────────────────────┘┃└─────────────────────────────────┘
   Both dividers drag with the mouse and move with the arrow keys; their positions are remembered in this
   browser. Run checks the examples; Submit adds the large hidden tests and is what gets graded.
   On phones the two halves become a Problem / Code switch. */

let wsPrefs = {}; try { wsPrefs = JSON.parse(localStorage.getItem('pg-ws') || '{}') || {}; } catch (e) {}
const wsSavePrefs = () => { try { localStorage.setItem('pg-ws', JSON.stringify(wsPrefs)); } catch (e) {} };

// The example cases, as LeetCode's Testcase tab shows them: one value per parameter.
function wsCases(p, prog) {
  if (prog && p.stdio) return p.stdio.cases.slice(0, 3).map(c => [['stdin', c.stdin.replace(/\n$/, '')]]);
  const t = p.tests;
  if (t.kind === 'design') return t.cases.slice(0, 3).map(c => [['operations', pyLit(c.ops)], ['arguments', pyLit(c.args)]]);
  const names = paramNames(p);
  return t.cases.filter(c => JSON.stringify(c.args).length < 400).slice(0, 3)
    .map(c => c.args.map((a, i) => [names[i] || 'arg' + (i + 1), pyLit(a)]));
}
function wsCasesHtml(p, prog) {
  const cs = wsCases(p, prog);
  if (!cs.length) return '<p class="muted small">The examples are too large to show here.</p>';
  return `<div class="case-pills" role="group" aria-label="Examples">${cs.map((_, i) => `<button type="button" class="case-pill" data-case="${i}" aria-pressed="${i === 0}">Case ${i + 1}</button>`).join('')}</div>
    ${cs.map((c, i) => `<div class="case-body" data-cbody="${i}" ${i ? 'hidden' : ''}>${c.map(([k, v]) => `<div class="ws-io"><span class="ws-k">${esc(k)} =</span><pre>${esc(v)}</pre></div>`).join('')}</div>`).join('')}`;
}
// One run's results: a verdict, a pill per case (failing first opened), and that case's input / output / expected.
function wsResultHtml(r, { submit = false, prog = false } = {}) {
  if (!r) return '';
  const rs = r.results || [], vis = rs.filter(x => !x.hidden), hid = rs.filter(x => x.hidden);
  const passed = vis.filter(x => x.pass).length;
  let status, cls = 'bad';
  if (r.ok) { status = submit ? 'Accepted' : 'Examples pass'; cls = 'good'; }
  else if (r.error && !rs.length) status = /SyntaxError|IndentationError|TabError/.test(r.error) ? 'Compile Error' : 'Runtime Error';
  else if (r.slow || (vis.every(x => x.pass) && hid.some(x => !x.pass && /slow|time/i.test(x.error || '')))) status = 'Time Limit Exceeded';
  else if (vis.some(x => !x.pass && x.error)) status = 'Runtime Error';
  else status = 'Wrong Answer';
  const meta = [vis.length ? `${passed} / ${vis.length} examples` : '', hid.length ? `${hid.filter(x => x.pass).length} / ${hid.length} large hidden` : '',
    r.ms != null ? `${r.ms} ms` : ''].filter(Boolean).join(' · ');
  const first = Math.max(0, vis.findIndex(x => !x.pass));
  const pre = (k, v, c = '') => `<div class="ws-io"><span class="ws-k">${k}</span><pre class="${c}">${v === '' ? '<span class="muted">(nothing)</span>' : esc(v)}</pre></div>`;
  return `<div class="ws-status ${cls}" role="status"><b>${status}</b><span class="muted small">${meta}</span></div>
    ${r.error ? `<pre class="ws-err">${esc(r.error)}</pre>` : ''}
    ${rs.length ? `<div class="case-pills" role="group" aria-label="Test cases">${vis.map((x, i) => `<button type="button" class="case-pill ${x.pass ? 'ok' : 'no'}" data-case="${i}" aria-pressed="${i === first}"><span aria-hidden="true">${x.pass ? '✓' : '✗'}</span> Case ${i + 1}<span class="sr">${x.pass ? ' passed' : ' failed'}</span></button>`).join('')}
      ${hid.map(x => `<span class="case-pill hid ${x.pass ? 'ok' : 'no'}" title="${esc(x.input || '')}"><span aria-hidden="true">${x.pass ? '✓' : '✗'}</span> Large test<span class="sr">${x.pass ? ' passed' : ' failed'}</span></span>`).join('')}</div>` : ''}
    ${vis.map((x, i) => `<div class="case-body" data-cbody="${i}" ${i === first ? '' : 'hidden'}>
      ${x.expected == null && x.got == null && !x.stdin ? `<p class="muted small">${esc(x.input || '')}</p>` : `${pre('Input', prog ? (x.stdin || '').replace(/\n$/, '') : x.input || '')}
      ${x.error ? `<pre class="ws-err">${esc(x.error)}</pre>` : pre(prog ? 'You printed' : 'Output', (x.got ?? '').replace?.(/\n$/, '') ?? String(x.got), x.pass ? '' : 'no')}
      ${pre('Expected', x.expected ?? '')}`}</div>`).join('')}
    ${hid.filter(x => !x.pass && x.error).map(x => `<p class="ws-hidnote"><b>${esc(x.input || 'Large test')}:</b> ${esc(x.error)}</p>`).join('')}
    ${r.stdout ? pre('Stdout', r.stdout.replace(/\n$/, '')) : ''}`;
}
// Case pills inside a panel switch which case body shows.
function wsWirePills(panel) {
  panel.addEventListener('click', e => {
    const b = e.target.closest('button.case-pill'); if (!b) return;
    $$('button.case-pill', panel).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $$('[data-cbody]', panel).forEach(x => { x.hidden = x.dataset.cbody !== b.dataset.case; });
  });
}
// Tabs with the ARIA tabs pattern: arrow keys move between tabs, Home / End jump.
function wsTabs(list, onPick) {
  const tabs = () => $$('[role=tab]', list);
  const pick = (t, focus) => { tabs().forEach(x => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; }); onPick(t); if (focus) t.focus(); };
  list.addEventListener('click', e => { const t = e.target.closest('[role=tab]'); if (t) pick(t); });
  list.addEventListener('keydown', e => {
    const ts = tabs(), i = ts.indexOf(document.activeElement); if (i < 0) return;
    const j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? ts.length - 1 : null;
    if (j == null) return; e.preventDefault(); e.stopPropagation(); pick(ts[(j + ts.length) % ts.length], true);
  });
  return pick;
}

function workspace(el, { p, tabs, code = '', lang, prog = false, edOpts = {}, onRun, onSubmit, submitLabel = 'Submit' }) {
  el.innerHTML = `<div class="ws" data-view="problem">
    <div class="ws-switch" role="tablist" aria-label="Show"><button type="button" role="tab" data-view="problem" aria-selected="true">Problem</button><button type="button" role="tab" data-view="code" aria-selected="false" tabindex="-1">Code</button></div>
    <section class="ws-left pane" aria-label="Problem">
      <div class="pane-tabs" role="tablist" aria-label="Problem panels">${tabs.map((t, i) => `<button type="button" role="tab" id="wst-${t.id}" aria-controls="wsp-${t.id}" aria-selected="${i === 0}" tabindex="${i ? -1 : 0}" data-tab="${t.id}"${t.key ? ` data-key="${t.key}"` : ''}>${t.label}${t.key ? ` <kbd>${t.key.toUpperCase()}</kbd>` : ''}</button>`).join('')}</div>
      ${tabs.map((t, i) => `<div class="pane-body" role="tabpanel" id="wsp-${t.id}" aria-labelledby="wst-${t.id}" tabindex="0" ${i ? 'hidden' : ''}>${t.html}</div>`).join('')}
    </section>
    <div class="ws-split" role="separator" aria-orientation="vertical" tabindex="0" aria-label="Resize the problem and code panels (← →)" aria-valuemin="25" aria-valuemax="70"></div>
    <section class="ws-right" aria-label="Code and tests">
      <div class="ws-code"><textarea class="code" id="ed" aria-label="Your solution"></textarea></div>
      <div class="ws-split-h" role="separator" aria-orientation="horizontal" tabindex="0" aria-label="Resize the code and test panels (↑ ↓)"></div>
      <section class="ws-console pane" aria-label="Tests">
        <div class="pane-tabs"><span role="tablist" aria-label="Test panels" class="ws-ctabs"><button type="button" role="tab" data-ctab="cases" aria-selected="true">Testcase</button><button type="button" role="tab" data-ctab="result" aria-selected="false" tabindex="-1">Test Result</button></span>
          <span class="spacer"></span><span class="muted small ws-rc" aria-live="polite"></span>
          ${onRun ? `<button type="button" class="ws-btn" id="ws-run" data-key="r" title="Run the examples only (Ctrl+' in the editor)"><span aria-hidden="true">▶</span> Run <kbd>R</kbd></button>` : ''}
          <button type="button" class="primary ws-btn" id="ws-submit" data-key="s" title="Examples plus the large hidden tests: this one is graded (Ctrl+Enter in the editor)">${submitLabel} <kbd>S</kbd></button></div>
        <div class="pane-body" data-cpanel="cases">${wsCasesHtml(p, prog)}</div>
        <div class="pane-body" data-cpanel="result" hidden><p class="muted small">Run checks the examples. Submit also runs the large hidden tests and grades the attempt.</p></div>
        <div class="ws-after"></div>
      </section>
    </section></div>`;
  const ws = $('.ws', el), left = $('.ws-left', el), right = $('.ws-right', el), con = $('.ws-console', el);
  const ed = $('#ed', el); ed.value = code;
  let busy = false;
  const setBusy = on => { busy = on; $$('.ws-btn', el).forEach(b => { b.disabled = on; }); con.classList.toggle('busy', on); };
  const wrapRun = fn => async () => {
    if (busy || !fn) return;
    setBusy(true); pickC($('[data-ctab=result]', con)); setView('code');
    $('[data-cpanel=result]', con).innerHTML = `<p class="ws-running" role="status"><span class="spin" aria-hidden="true"></span> Running…</p>`;
    try { await fn(); } catch (e) { $('[data-cpanel=result]', con).innerHTML = `<pre class="ws-err">${esc(String(e?.message || e))}</pre>`; }
    finally { setBusy(false); }
  };
  const doRun = wrapRun(onRun), doSubmit = wrapRun(onSubmit);
  enhanceEditor(ed, { ...edOpts, lang, onSubmit: doSubmit, onRun: onRun ? doRun : undefined });
  $('#ws-run', el) && ($('#ws-run', el).onclick = doRun);
  $('#ws-submit', el).onclick = doSubmit;

  // problem tabs
  const pickTab = wsTabs($('.pane-tabs', left), t => $$('[role=tabpanel]', left).forEach(x => { x.hidden = x.id !== t.getAttribute('aria-controls'); }));
  const tab = id => pickTab($(`[data-tab="${id}"]`, left));
  left.addEventListener('click', e => { const g = e.target.closest('[data-goto]'); if (g) tab(g.dataset.goto); });
  // console tabs
  const pickC = wsTabs($('.ws-ctabs', con), t => $$('[data-cpanel]', con).forEach(x => { x.hidden = x.dataset.cpanel !== t.dataset.ctab; }));
  $$('[data-cpanel]', con).forEach(wsWirePills);
  // phone: Problem / Code
  const setView = v => { ws.dataset.view = v; $$('.ws-switch [role=tab]', ws).forEach(b => { const on = b.dataset.view === v; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; }); };
  wsTabs($('.ws-switch', ws), t => setView(t.dataset.view));

  // dividers
  const split = $('.ws-split', el), splitH = $('.ws-split-h', el);
  const setLeft = pct => { pct = clamp(pct, 25, 70); ws.style.setProperty('--ws-left', pct + '%'); split.setAttribute('aria-valuenow', String(Math.round(pct))); wsPrefs.left = pct; };
  const setCon = px => { px = clamp(px, 90, Math.max(120, right.clientHeight - 140)); ws.style.setProperty('--ws-con', px + 'px'); wsPrefs.con = px; };
  setLeft(wsPrefs.left ?? 42); ws.style.setProperty('--ws-con', (wsPrefs.con ?? 230) + 'px');
  const drag = (handle, onMove) => handle.addEventListener('pointerdown', e => {
    e.preventDefault(); handle.setPointerCapture(e.pointerId); handle.classList.add('dragging');
    const move = ev => onMove(ev), up = () => { handle.classList.remove('dragging'); handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); wsSavePrefs(); };
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up);
  });
  drag(split, ev => { const r = ws.getBoundingClientRect(); setLeft((ev.clientX - r.left) / r.width * 100); });
  drag(splitH, ev => { const r = right.getBoundingClientRect(); setCon(r.bottom - ev.clientY); });
  split.addEventListener('keydown', e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); e.stopPropagation(); setLeft(wsPrefs.left + (e.key === 'ArrowLeft' ? -4 : 4)); wsSavePrefs(); });
  splitH.addEventListener('keydown', e => { if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return; e.preventDefault(); e.stopPropagation(); setCon((wsPrefs.con ?? 230) + (e.key === 'ArrowUp' ? 30 : -30)); wsSavePrefs(); });

  // fill the window below the header, above the key bar
  const fit = () => {
    if (!ws.isConnected) return;
    if (innerWidth <= 820) { ws.style.height = ''; return; }
    const kb = document.getElementById('keybar'), kbH = kb && !kb.classList.contains('min') && getComputedStyle(kb).display !== 'none' ? kb.offsetHeight : 0;
    ws.style.height = Math.max(460, innerHeight - ws.getBoundingClientRect().top - kbH - 14) + 'px';
  };
  fit(); requestAnimationFrame(fit);
  window.addEventListener('resize', fit); onLeave(() => window.removeEventListener('resize', fit));

  const W = {
    ed, tab, setView,
    after: $('.ws-after', con),
    rc: t => { $('.ws-rc', el).textContent = t; },
    setCases(isProg) { prog = isProg; $('[data-cpanel=cases]', con).innerHTML = wsCasesHtml(p, prog); },
    show(r, opts = {}) {
      const panel = $('[data-cpanel=result]', con);
      panel.innerHTML = wsResultHtml(r, { prog, ...opts }); pickC($('[data-ctab=result]', con)); setView('code');
      announce(r?.ok ? (opts.submit ? 'Accepted' : 'Examples pass') : 'Some tests failed');
    },
  };
  return W;
}
