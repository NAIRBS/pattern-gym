// ── Cheatsheet: every question the games ask, with its answer, on one page to read ──
// Nothing here is graded or scheduled; it reads the same content the games draw from.
const CHEAT_TABS = [
  ['sprint', '⚡ Spot the pattern', 'Pattern Sprint'],
  ['skeletons', '🦴 Skeletons', 'Skeleton Recall'],
  ['syntax', '🐍 Python syntax', 'Syntax Snap'],
  ['solutions', '🧩 Solutions', 'Line Up · Fill the Gap · OA Mode · Mock Interview'],
  ['bigo', '⏱️ Big-O', 'Big-O Call'],
  ['edges', '🔍 Edge cases', 'Edge Hunter'],
  ['costs', '📊 Costs', ''],
  ['method', '🧭 Method', ''],
];
const CHEAT_NOUN = { sprint: 'questions', syntax: 'questions', skeletons: 'patterns', costs: 'entries', method: 'entries' };
const cheatCx = s => s === '—' ? '<span class="muted">—</span>' : `<span class="mono cs-cx">${esc(s)}</span>`;
const cheatMd = s => esc(s || '').replace(/`([^`]+)`/g, '<code>$1</code>');
const cheatOrder = () => new Map(C.patterns.map((p, i) => [p.id, i]));
// Problems grouped by pattern, in course order, numbered as in the games.
function cheatGroups(list) {
  const ord = cheatOrder(), by = new Map();
  for (const x of [...list].sort((a, b) => (ord.get(a.pattern) ?? 99) - (ord.get(b.pattern) ?? 99) || a.num - b.num)) {
    if (!by.has(x.pattern)) by.set(x.pattern, []); by.get(x.pattern).push(x);
  }
  return [...by];
}
const cheatHead = (pid, n) => { const p = PAT(pid);
  return `<h2 class="cs-group" data-p="${esc(pid)}"><span class="gdot" style="background:${p.color}"></span>${esc(p.name)} <span class="muted small">${n}</span></h2>`; };
const cheatKey = (...xs) => esc(xs.flat().filter(Boolean).join(' ').toLowerCase());

ROUTES.cheatsheet = (app, [tab], params) => {
  if (!CHEAT_TABS.some(([id]) => id === tab)) tab = 'sprint';
  let hide = false; try { hide = localStorage.getItem('pg-cheat-hide') === '1'; } catch (e) {}
  const P = C.problems;
  const body = {
    // One flat list in game order: grouping by pattern would give the answer away when answers are hidden.
    sprint: () => `<p class="muted">The interviewer’s wording on the left; the pattern it points to and the move that solves it on the right.</p>
      ${[['', [...C.sprint].sort((a, b) => a.num - b.num)]].map(([pid, xs]) => `<section class="cs-sec" data-p="">
        <table class="gtbl cs-tbl"><thead><tr><th>They say</th><th>Pattern and key move</th></tr></thead><tbody>
        ${xs.map(s => `<tr class="cs-item" data-p="${esc(s.pattern)}" data-s="${cheatKey(s.title, s.prompt, s.move, PAT(s.pattern).name)}">
          <td data-label="They say"><b>${esc(s.title)}</b> ${lcChip(P.find(x => x.title === s.title || x.lc?.title === s.title))}<div>${cheatMd(s.prompt)}</div></td>
          <td data-label="Pattern and key move"><div class="ans">${patternTag(s.pattern)}<div>${cheatMd(s.move)}</div></div></td></tr>`).join('')}
        </tbody></table></section>`).join('')}`,
    skeletons: () => `<p class="muted">Each pattern’s reusable template, when to reach for it, and the questions that turn it into a specific solution.</p>
      ${C.patterns.map(p => { const L = p.lesson || {};
        return `<section class="card cs-item cs-skel" data-p="${esc(p.id)}" data-s="${cheatKey(p.name, p.triggers, p.fill, L.why)}">
          <h2 class="h3"><span class="gdot" style="background:${p.color}"></span>${esc(p.name)} <a class="small" href="#/patterns/${p.id}">Pattern page →</a></h2>
          <div class="cs-cols"><div>
            <h3 class="cs-h">Reach for it when</h3><ul>${(p.triggers || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
            ${L.why ? `<h3 class="cs-h">Why it works</h3><p>${esc(L.why)}</p>` : ''}
            ${L.not_this?.length ? `<h3 class="cs-h">Not this pattern if</h3><ul>${L.not_this.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
            <h3 class="cs-h">To fill it in, answer</h3><ol>${(p.fill || []).map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>
          <div class="ans"><h3 class="cs-h">Skeleton</h3><pre class="code">${esc(p.skeleton)}</pre></div></div></section>`; }).join('')}`,
    syntax: () => {
      const by = new Map(); for (const s of C.syntax) { if (!by.has(s.topic)) by.set(s.topic, []); by.get(s.topic).push(s); }
      return `<p class="muted">One-line idioms. The setup shows what the variables hold.</p>
      ${[...by].map(([t, xs]) => `<section class="cs-sec" data-p="">
        <h2 class="cs-group">${esc(t)} <span class="muted small">${xs.length}</span></h2>
        <table class="gtbl cs-tbl"><thead><tr><th>Task</th><th>Answer</th></tr></thead><tbody>
        ${xs.map(s => `<tr class="cs-item" data-s="${cheatKey(t, s.prompt, s.answer)}">
          <td data-label="Task">${cheatMd(s.prompt)}${s.setup ? `<div class="muted small cs-setup">Given <code class="hlc">${esc(s.setup)}</code></div>` : ''}</td>
          <td data-label="Answer"><div class="ans"><pre class="code cs-one">${esc(s.answer)}</pre></div></td></tr>`).join('')}
        </tbody></table></section>`).join('')}`;
    },
    solutions: () => `<p class="muted">The reference solution for every problem. <span class="hl-chip">Highlighted lines</span> are the ones Fill the Gap blanks out.</p>
      ${cheatGroups(P).map(([pid, xs]) => `<section class="cs-sec" data-p="${esc(pid)}">${cheatHead(pid, xs.length)}
        ${xs.map(p => `<article class="card cs-item cs-sol" data-s="${cheatKey(p.title, p.statement, p.insight, p.catch, p.lc?.num && 'lc ' + p.lc.num)}">
          <div class="row"><h3 class="h3">${p.num}. ${esc(p.title)}</h3><span class="tag ${p.diff}">${p.diff}</span>${lcChip(p)}
            <span class="spacer"></span><a class="small" href="#/play/oa?problem=${p.id}">Solve it →</a></div>
          <p>${esc(p.statement)}</p>
          <div class="ans"><p class="cs-idea"><b>Key idea:</b> ${esc(p.insight)}${p.catch ? ` <b>Watch out:</b> ${esc(p.catch)}` : ''}</p>
            <pre class="code" data-keys="${(p.key_lines || []).join(',')}">${esc(p.solution)}</pre>
            <p class="muted small">Time <b class="mono">${esc(p.time)}</b> · Space <b class="mono">${esc(p.space)}</b></p></div></article>`).join('')}
        </section>`).join('')}`,
    bigo: () => `<p class="muted">The complexity to say out loud for each reference solution, and the reason behind it.</p>
      ${cheatGroups(P).map(([pid, xs]) => `<section class="cs-sec" data-p="${esc(pid)}">${cheatHead(pid, xs.length)}
        <table class="gtbl cs-tbl cs-bigo"><thead><tr><th>Problem</th><th>Time</th><th>Space</th><th>Why</th></tr></thead><tbody>
        ${xs.map(p => `<tr class="cs-item" data-s="${cheatKey(p.title, p.time, p.space, p.insight)}">
          <td data-label="Problem"><b>${esc(p.title)}</b> ${lcChip(p)}</td>
          <td data-label="Time"><span class="ans mono">${esc(p.time)}</span></td><td data-label="Space"><span class="ans mono">${esc(p.space)}</span></td>
          <td data-label="Why"><span class="ans">${esc(p.insight)}</span></td></tr>`).join('')}
        </tbody></table></section>`).join('')}`,
    edges: () => `<p class="muted">What to ask before coding, and the inputs that break careless solutions.</p>
      ${cheatGroups(P).map(([pid, xs]) => `<section class="cs-sec" data-p="${esc(pid)}">${cheatHead(pid, xs.length)}
        <table class="gtbl cs-tbl"><thead><tr><th>Problem</th><th>Ask the interviewer</th><th>Edge cases</th></tr></thead><tbody>
        ${xs.map(p => `<tr class="cs-item" data-s="${cheatKey(p.title, p.clarify, p.edges)}">
          <td data-label="Problem"><b>${esc(p.title)}</b> ${lcChip(p)}</td>
          <td data-label="Ask the interviewer"><ul class="ans">${(p.clarify || []).map(q => `<li>${esc(q)}</li>`).join('')}</ul></td>
          <td data-label="Edge cases"><ul class="ans">${(p.edges || []).map(q => `<li>${esc(q)}</li>`).join('')}</ul></td></tr>`).join('')}
        </tbody></table></section>`).join('')}`,
    costs: () => { const R = C.references;
      return `<p class="muted">What each tool costs, so you can pick the one that makes your most frequent operation cheap. Average case.</p>
      <section class="cs-sec" data-p=""><h2 class="cs-group">Read the constraints first</h2>
        <p class="muted small">The input size tells you the runtime you need. Python manages roughly 10⁷ simple steps a second.</p>
        <table class="gtbl cs-tbl cs-cost"><thead><tr><th>Input size</th><th>Aim for</th><th>Usually means</th></tr></thead><tbody>
        ${C.input_size.map(r => `<tr class="cs-item" data-s="${cheatKey(r)}"><td data-label="Input size" class="mono">${esc(r[0])}</td>
          <td data-label="Aim for"><span class="ans">${cheatCx(r[1])}</span></td><td data-label="Usually means"><span class="ans">${esc(r[2])}</span></td></tr>`).join('')}</tbody></table></section>
      <section class="cs-sec" data-p=""><h2 class="cs-group">Data structures</h2>
        <table class="gtbl cs-tbl cs-cost"><thead><tr><th>Structure</th><th>Access</th><th>Search</th><th>Insert</th><th>Delete</th><th>Notes</th></tr></thead><tbody>
        ${R.ds_costs.map(r => `<tr class="cs-item" data-s="${cheatKey(r)}"><td data-label="Structure"><b>${esc(r[0])}</b></td>
          ${['Access', 'Search', 'Insert', 'Delete'].map((h, i) => `<td data-label="${h}"><span class="ans">${cheatCx(r[i + 1])}</span></td>`).join('')}
          <td data-label="Notes" class="small">${cheatMd(r[5])}</td></tr>`).join('')}</tbody></table></section>
      <section class="cs-sec" data-p=""><h2 class="cs-group">Algorithms</h2>
        <p class="muted small">V = vertices, E = edges, k = the value range, m = the second input's length.</p>
        <table class="gtbl cs-tbl cs-cost"><thead><tr><th>Algorithm</th><th>Time</th><th>Extra space</th><th>Notes</th></tr></thead><tbody>
        ${R.algo_costs.map(r => `<tr class="cs-item" data-s="${cheatKey(r)}"><td data-label="Algorithm"><b>${esc(r[0])}</b></td>
          <td data-label="Time"><span class="ans">${cheatCx(r[1])}</span></td><td data-label="Extra space"><span class="ans">${cheatCx(r[2])}</span></td>
          <td data-label="Notes" class="small">${cheatMd(r[3])}</td></tr>`).join('')}</tbody></table></section>`; },
    method: () => { const R = C.references;
      return `<p class="muted">How to go from a problem you’ve never seen to a tested program, in an online assessment or live on a blank page. Say each step out loud in a live interview. The Study tab’s <a href="#/study">four questions from problem to pseudocode</a> fit inside steps 2 to 5.</p>
      <section class="cs-sec" data-p=""><h2 class="cs-group">The seven steps</h2>
        <ol class="cs-steps">${R.steps.map(([t, d], i) => `<li class="card cs-item" data-s="${cheatKey(t, d)}"><span class="gn">${i + 1}</span><div><b>${esc(t)}</b><div class="ans">${cheatMd(d)}</div></div></li>`).join('')}</ol></section>
      <section class="cs-sec" data-p=""><h2 class="cs-group">When the brute force is too slow</h2>
        <p class="muted small">Start with the first three: bottlenecks, unnecessary work and duplicated work. Then try the others.</p>
        <table class="gtbl cs-tbl"><thead><tr><th>Technique</th><th>What to do</th></tr></thead><tbody>
        ${R.optimize.map(([t, d]) => `<tr class="cs-item" data-s="${cheatKey(t, d)}"><td data-label="Technique"><b>${esc(t)}</b></td><td data-label="What to do"><span class="ans">${cheatMd(d)}</span></td></tr>`).join('')}
        </tbody></table></section>`; },
  };
  const cur = CHEAT_TABS.find(([id]) => id === tab);
  const usesPattern = !['syntax', 'costs', 'method'].includes(tab);
  app.innerHTML = `<div class="guide cheat${hide ? ' quiz' : ''}">
    <div class="guide-head"><h1>Cheatsheet</h1>
      <p class="lede">Every question from the games with its answer, to read through without playing, plus what each data structure and algorithm costs and the interview method. Nothing here counts toward your reviews.</p></div>
    <div class="gtabs" role="tablist" aria-label="Cheatsheet sections">${CHEAT_TABS.map(([id, label], i) =>
      `<a role="tab" href="#/cheatsheet/${id}" aria-selected="${id === tab}" tabindex="${id === tab ? 0 : -1}" class="${id === tab ? 'on' : ''}"
        data-key="${i + 1}" data-kgroup="switch section">${esc(label)} <kbd>${i + 1}</kbd></a>`).join('')}</div>
    <div class="cs-bar">
      ${cur[2] ? `<span class="muted small">From <b>${esc(cur[2])}</b></span>` : ''}<span class="spacer"></span>
      <div class="sfield compact"><svg class="sicon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>
        <input type="search" id="cs-q" placeholder="Filter this section" aria-label="Filter this section" autocomplete="off" spellcheck="false" value="${esc(params.q || '')}"></div>
      ${usesPattern ? `<select id="cs-p" aria-label="Pattern"><option value="">All patterns</option>${C.patterns.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>` : ''}
      <button type="button" class="ghost" id="cs-hide" data-key="h" aria-pressed="${hide}">${hide ? 'Show answers' : 'Hide answers'} <kbd>H</kbd></button>
      <button type="button" class="ghost" id="cs-print" data-key="p">Print <kbd>P</kbd></button>
    </div>
    <p class="muted small cs-meta"><span id="cs-count" aria-live="polite"></span><span id="cs-eta"></span></p>
    <div role="tabpanel" aria-label="${esc(cur[1])}" class="gpanel cs-panel">${body[tab]()}</div>
  </div>`;
  const root = $('.cheat', app), q = $('#cs-q', app), ps = $('#cs-p', app), count = $('#cs-count', app);
  const items = $$('.cs-item', app), total = items.length;
  const filter = () => {
    const words = q.value.toLowerCase().split(/\s+/).filter(Boolean), pat = ps?.value || '';
    let n = 0;
    for (const it of items) {
      const p = it.dataset.p ?? it.closest('[data-p]')?.dataset.p ?? '';
      const ok = (!pat || p === pat) && words.every(w => it.dataset.s.includes(w));
      it.hidden = !ok; if (ok) n++;
    }
    for (const s of $$('.cs-sec', app)) s.hidden = !$$('.cs-item', s).some(i => !i.hidden);
    count.textContent = n === total ? `${total} ${CHEAT_NOUN[tab] || 'problems'}` : `Showing ${n} of ${total}`;
    $('#cs-eta', app).innerHTML = n ? eta(readMin($('.cs-panel', app)), n === total ? 'to read this section' : 'to read these') : '';
  };
  q.addEventListener('input', filter); ps?.addEventListener('change', filter); filter();
  $('#cs-hide', app).onclick = e => {
    hide = !root.classList.toggle('quiz') ? false : true;
    $$('.ans.shown', app).forEach(a => a.classList.remove('shown'));
    e.currentTarget.innerHTML = `${hide ? 'Show answers' : 'Hide answers'} <kbd>H</kbd>`; e.currentTarget.setAttribute('aria-pressed', hide);
    try { localStorage.setItem('pg-cheat-hide', hide ? '1' : '0'); } catch (er) {}
    markAns(); paintKeybar();
  };
  // With answers hidden, click (or Enter on) an answer to reveal just that one.
  app.addEventListener('click', e => { const a = e.target.closest('.quiz .ans'); if (a && !e.target.closest('a')) a.classList.toggle('shown'); });
  // Hidden answers become buttons (Tab reaches them, Enter reveals); shown answers are plain text again.
  const markAns = () => $$('.ans', app).forEach(a => { if (hide) { a.tabIndex = 0; a.setAttribute('role', 'button'); a.title = 'Reveal'; }
    else { a.removeAttribute('tabindex'); a.removeAttribute('role'); a.removeAttribute('title'); } });
  markAns();
  app.addEventListener('keydown', e => { const a = e.target.closest?.('.quiz .ans'); if (a && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); a.classList.toggle('shown'); } });
  $('#cs-print', app).onclick = () => window.print();
  const tabs = $$('.gtabs [role=tab]', app);
  $('.gtabs', app).addEventListener('keydown', e => {
    const k = tabs.indexOf(document.activeElement); if (k < 0) return;
    const j = e.key === 'ArrowRight' ? k + 1 : e.key === 'ArrowLeft' ? k - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
    if (j === null) return; e.preventDefault(); e.stopPropagation(); tabs[(j + tabs.length) % tabs.length].focus();
  });
};
