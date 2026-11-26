/* Pattern Gym · pages.js: Pages: Today, Games, Problems, Patterns, Stats, Settings.
   Plain script (no modules): shares one global scope with the other files in index.html's order. */
'use strict';

// ─────────────────────────── pages ───────────────────────────
ROUTES.today = app => {
  const plan = currentPlan(), u = urgency(), day1 = !!plan.firstDay, ns = nextStudy(), cp = checkpointDue();
  const cr = crunch(), crOff = !cr && S.settings.crunch === 'off' && crunch(true), pool = mixedPool();
  const total = plan.blocks.reduce((a, b) => a + b.target, 0), doneN = plan.blocks.reduce((a, b) => a + b.done, 0);
  const pct = total ? Math.round(doneN / total * 100) : 0;
  const nextBlock = plan.blocks.find(b => b.done < b.target);
  // Weakest patterns: only ones you've studied or practised, so the list means something.
  const weakest = studyOrder().filter(p => lessonDone(p.id) || mastery(p.id) > 0).map(p => ({ p, m: mastery(p.id) })).sort((a, b) => a.m - b.m).slice(0, 3);
  const blockMin = b => roundMin(b.game, Math.max(0, b.target - b.done));
  const leftMin = plan.blocks.reduce((a, b) => a + blockMin(b), 0) + (day1 && ns ? ns.min : 0);
  // Crunch mode: what it is, the short list, and a way out.
  const crunchCard = () => cr ? `<section class="card crunch" aria-labelledby="crunch-h"><div class="row"><h2 class="h3" id="crunch-h">⏳ Crunch mode</h2>
      <span class="tag">${daysLeft()} day${daysLeft() === 1 ? '' : 's'} × ${S.settings.minutes} min ≈ ${fmtMin(cr.budget)}</span></div>
      <p class="small">The full path needs about ${fmtMin(cr.pathLeft)}, more than you have. Until the interview: the most-asked patterns only, each as its lesson plus one problem solved cold, and half of each day on Sprint and Fill the Gap.</p>
      <div class="crunch-list">${cr.list.map(id => { const p = PAT(id), ok = crunchCovered(id);
        return `<a href="#/study/${id}" class="crunch-pat${ok ? ' done' : ''}">${ok ? '✓ ' : ''}<span style="color:${pc(p.color)}">${esc(p.name)}</span></a>`; }).join('')}</div>
      <button type="button" class="ghost small" id="crunch-off">Use the full path instead</button></section>`
    : crOff ? `<p class="muted small">Crunch mode is off: the plan follows the full Study path even though it won’t fit before your interview. <button type="button" class="linkish" id="crunch-on">Turn crunch mode back on</button></p>` : '';
  const lessonCard = () => {
    if (ns?.crunch) return `<a class="card block" href="${ns.href}" style="color:inherit" data-key="l"><div class="icon">⏳</div>
      <div style="flex:1"><div class="row"><b>${esc(ns.label)}</b><span class="tag">Crunch</span></div>
      <div class="muted small" style="color:${pc(ns.pattern.color)}">${esc(ns.pattern.name)}</div>
      <div class="row eta-row">${eta(ns.min)}</div></div><span class="btn block-go primary">${esc(ns.verb)} <kbd>L</kbd></span></a>`;
    if (ns?.primer) return `<a class="card block" href="${ns.href}" style="color:inherit" data-key="l"><div class="icon">⏱️</div>
      <div style="flex:1"><div class="row"><b>Before your first lesson: Big-O basics</b><span class="tag">Study</span></div>
      <div class="muted small">What “O(n)” means, how to work out what your code costs, and the Python operations that are slower than they look. Every lesson after this assumes it.</div>
      <div class="row eta-row">${eta(ns.min, 'read')}</div></div><span class="btn block-go primary">Start <kbd>L</kbd></span></a>`;
    const nl = nextLesson(); if (!nl) return '';
    return `<a class="card block" href="#/study/${nl.id}" style="color:inherit" data-key="l"><div class="icon">📖</div>
      <div style="flex:1"><div class="row"><b>Today's lesson: <span style="color:${pc(nl.color)}">${esc(nl.name)}</span></b><span class="tag">Study</span></div>
      <div class="muted small">Read the lesson, then take the worked example from the brute force to the final answer.${day1 ? '' : ' The games below keep it alive.'}</div>
      <div class="row eta-row">${eta(lessonMin(nl.id), 'lesson')}${courseOf(nl.id).learn ? eta(walkMin(courseOf(nl.id).learn), 'worked example') : ''}${eta(courseMins(nl.id).left, 'left in the whole course')}</div></div>
      <div class="mono" title="Lessons learned">${studyOrder().filter(p => lessonDone(p.id)).length}/${studyOrder().length}</div><span class="btn block-go${day1 ? ' primary' : ''}">Open lesson <kbd>L</kbd></span></a>`;
  };
  const startBtn = (day1 || ns?.crunch) && ns ?`<a class="btn primary" href="${ns.href}" data-key="s">▶ ${esc(ns.verb)} <kbd>S</kbd></a>`
    : nextBlock ? `<a class="btn primary" href="#/play/${nextBlock.game}?plan=1" data-key="s">▶ ${pct ? 'Continue' : 'Start'}: ${GAMES[nextBlock.game].name} <kbd>S</kbd></a>`
    : `<a class="btn primary" href="#/games" data-key="s">Extra practice <kbd>S</kbd></a>`;
  app.innerHTML = `
    <div class="hero"><div class="ring" style="--p:${pct}"><div>${pct}%</div></div>
      <div><h1>${pct === 100 ? 'Done for today 🎉' : 'Today’s session'}</h1>
      <p class="muted">${S.settings.minutes} min plan · <b>${esc(u.label)}</b>${u.mode === 'urgent' ? ' · urgent mode: reviews are packed closer together' : ''}</p>
      ${leftMin ? `<p class="hero-eta">${eta(leftMin, day1 ? 'for today: your first lesson and a warm-up' : pct ? 'left today' : 'for today’s practice', { cls: 'pill' })}</p>` : ''}
      <div class="row">${startBtn}
      <a class="btn ghost" href="#/settings" data-key="d">Adjust time / date <kbd>D</kbd></a></div></div></div>
    ${Object.keys(S.study.attempts).length < 3 ? `<a class="guide-cta" href="#/guide" data-key="u"><span class="guide-cta-i" aria-hidden="true">🧭</span>
      <span><b>New here? Read the Starter Guide</b><span class="muted">How the app fits together, the 8-week plan, and what to do when you’re stuck. Start here takes about ${fmtMin(guideTabMin('start'))} to read.</span></span>
      <span class="btn">Open <kbd>U</kbd></span></a>` : ''}
    ${crunchCard()}
    ${cp || ns?.primer || nextLesson() || ns?.crunch || pool.length ? `<h2>Learn</h2>` : ''}
    ${cp ? `<a class="card block checkpoint" href="#/study/mixed" style="color:inherit" data-key="m"><div class="icon">🎲</div>
      <div style="flex:1"><div class="row"><b>Checkpoint: a mystery problem</b><span class="tag">Study</span></div>
      <div class="muted small">You’ve learned ${cp.n} patterns. Solve one problem from any of them with its name and pattern hidden: telling which pattern it is from the statement alone is what an interview tests.</div>
      <div class="row eta-row">${eta(SOLVE_MIN.Medium)}</div></div><span class="btn block-go primary">Start <kbd>M</kbd></span></a>` : ''}
    ${lessonCard()}
    ${comboDue() ? `<a class="card block" href="#/study/mixed?combo=1" style="color:inherit" data-key="b"><div class="icon">🧩</div>
      <div style="flex:1"><div class="row"><b>This week’s combined problem</b><span class="tag">2 patterns</span></div>
      <div class="muted small">A problem that needs two of the patterns you’ve learned at once, as real interviews often do. Names hidden.</div>
      <div class="row eta-row">${eta(SOLVE_MIN.Medium)}</div></div><span class="btn block-go">Start <kbd>B</kbd></span></a>` : ''}
    ${!cp && pool.length ? `<a class="card block" href="#/study/mixed" style="color:inherit" data-key="m"><div class="icon">🎲</div>
      <div style="flex:1"><div class="row"><b>Mystery problem</b><span class="tag">Mixed</span></div>
      <div class="muted small">One problem from the patterns you’ve learned, name and pattern hidden. Real interviews don’t say which pattern; this is where you practise telling them apart.</div>
      <div class="row eta-row">${eta(SOLVE_MIN.Medium)}</div></div><span class="btn block-go">Start <kbd>M</kbd></span></a>` : ''}
    <h2>Practice</h2>
    ${day1 ? '<p class="muted small">The daily plan adds the other games after your first lesson, since they drill patterns you haven’t met yet. For today: the lesson above, then a Python warm-up. (Any game is still open from Games.)</p>'
      : `<p class="muted small quick">Only 10 minutes? <a href="#/play/sprint?n=12">⚡ Pattern Sprint ×12</a>, then <a href="#/play/fill?n=2">✍️ Fill the Gap ×2</a>: the two drills that keep the most patterns fresh per minute.</p>`}
    <div class="grid">${plan.blocks.map((b, bi) => { const g = GAMES[b.game]; const d = dueCount(b.game);
      return `<a class="card block ${b.done >= b.target ? 'done' : ''}" href="#/play/${b.game}?plan=1" style="color:inherit" ${bi < 9 ? `data-key="${bi + 1}" data-kgroup="start a practice block"` : ''}>
        <div class="icon">${g.icon}</div><div style="flex:1"><div class="row"><b>${g.name}</b><span class="tag">${g.layer}</span>
        ${d ? `<span class="tag" style="color:var(--accent)">${d} due</span>` : ''}<span class="spacer"></span>${b.done < b.target ? eta(blockMin(b), b.done ? 'left' : '', { title: paceNote(b.game) }) : eta(roundMin(b.game, b.target), 'a round', { title: paceNote(b.game) })}</div>
        <div class="muted small">${esc(g.desc)}</div><div class="bar"><i style="width:${b.done / b.target * 100}%"></i></div></div>
        <div class="mono">${b.done}/${b.target}</div><span class="btn block-go ${b.done >= b.target ? 'ghost' : b === nextBlock && !day1 ? 'primary' : ''}">${b.done >= b.target ? 'Again' : b.done ? 'Continue' : 'Start'}${bi < 9 ? ` <kbd>${bi + 1}</kbd>` : ''}</span></a>`; }).join('')}</div>
    ${weakest.length ? `<h2>Weakest patterns you’ve studied</h2>
    <div class="grid g3" data-navlist>${weakest.map(({ p, m }) => `<a class="card" href="#/patterns/${p.id}" style="color:inherit" data-item><b style="color:${pc(p.color)}">${esc(p.name)}</b>
      <div class="muted small">${Math.round(m * 100)}% mastery</div><div class="small">${p.triggers.slice(0, 2).map(esc).join(' · ')}</div>
      ${p.lesson ? `<div class="eta-row">${courseMins(p.id).left ? eta(courseMins(p.id).left, 'left in its course') : eta(gameMin('sprint') * 8, 'to drill it')}</div>` : ''}</a>`).join('')}</div>` : ''}`;
  const setCrunch = v => { S.settings.crunch = v; S.plan = null; save(); route(); };
  $('#crunch-off', app)?.addEventListener('click', () => setCrunch('off'));
  $('#crunch-on', app)?.addEventListener('click', () => setCrunch('auto'));
};

// Full solves first: OA Mode and Mock Interview are the closest thing to the real interview.
const GAME_ORDER = () => ['oa', 'mock', ...Object.keys(GAMES).filter(id => id !== 'oa' && id !== 'mock')];
ROUTES.games = app => {
  const card = (id, gi) => { const g = GAMES[id]; return `<div class="card"><div class="row"><span style="font-size:26px">${g.icon}</span><h2 class="h3" style="margin:0">${g.name}</h2>
      <span class="tag">${g.layer}</span><span class="spacer"></span>${dueCount(id) ? `<span class="tag" style="color:var(--accent)">${dueCount(id)} due</span>` : ''}</div>
      <p class="muted small">${esc(g.desc)}</p><div class="row"><a class="btn primary" href="#/play/${id}?n=${g.defaultN}" data-key="${(gi + 1) % 10}" data-kgroup="play a game">Play ${g.defaultN > 1 ? g.defaultN + ' rounds' : ''} <kbd>${(gi + 1) % 10}</kbd></a>
      ${g.defaultN > 1 ? `<a class="btn ghost" href="#/play/${id}?n=${g.defaultN * 2}" aria-label="Play ${g.defaultN * 2} rounds, about ${fmtMin(roundMin(id, g.defaultN * 2))}">or ${g.defaultN * 2}</a>` : ''}
      <span class="spacer"></span>${eta(roundMin(id, g.defaultN), g.defaultN > 1 ? `for ${g.defaultN}` : '', { title: id === 'oa' ? 'OA Mode gives 15, 25 or 40 minutes by difficulty' : paceNote(id) })}</div></div>`; };
  const order = GAME_ORDER();
  app.innerHTML = `<h1>Games</h1><p class="muted">Today picks these for you. Here you can play any of them.</p>
    <h2>The real thing</h2><p class="muted small">A whole problem, blank editor, against the clock: the closest thing to the interview.</p>
    <div class="grid g2">${order.slice(0, 2).map((id, gi) => card(id, gi)).join('')}</div>
    <h2>Drills</h2><p class="muted small">Each trains one skill: the pattern, the structure, the Python, the cost, the edge cases.</p>
    <div class="grid g2">${order.slice(2).map((id, gi) => card(id, gi + 2)).join('')}</div>`;
};

ROUTES.play = (app, [game], params) => {
  const g = GAMES[game]; if (!g) return ROUTES.games(app);
  let n = +params.n || g.defaultN;
  if (params.plan) { const b = currentPlan().blocks.find(b => b.game === game); if (b) n = Math.max(1, b.target - b.done) || g.defaultN; }
  if (params.problem) { // play a specific problem
    const p = PROBLEM_OR_ITEM(game, params.problem);
    if (p) return runFixed(app, game, p);
  }
  runSession(app, game, n, !!params.plan, params.pattern);
};
function PROBLEM_OR_ITEM(game, id) {
  const pool = GAMES[game].pool();
  // A named problem opens even outside the game's usual pool (Mock skips Easy ones; twists live apart)
  return pool.find(o => o.id === id) || (pool[0]?.solution ? C.everyProblem.find(o => o.id === id) : null);
}
function runFixed(app, game, o) {
  const g = GAMES[game]; const shell = document.createElement('div'); app.append(shell);
  const back = () => history.length > 1 ? history.back() : (location.hash = `#/patterns/${o.pattern}`);
  const mins = game === 'oa' ? solveMin(o) : gameMin(game);
  shell.innerHTML = `<div class="gamehead"><button class="ghost" id="bk" data-key="q" title="Exit (Q)" data-exit-confirm="Your answer to this problem is not saved and won’t count toward your reviews.">← Exit <kbd>Q</kbd></button><h1>${g.icon} ${g.name}</h1><span class="spacer"></span>
    ${eta(mins, '', { title: game === 'oa' ? 'The time budget OA Mode gives this difficulty' : paceNote(game) })}<span class="timer" id="clock"></span></div><div id="b"></div>`;
  $('#bk', shell).onclick = back;
  const shownAt = Date.now();
  g.render($('#b', shell), o, q => { recordPace(game, (Date.now() - shownAt) / 60000); const x = review(game, o.id, q); toast(`+${x} XP`); back(); }, { clock: $('#clock', shell) });
}

// Every problem in one searchable list: solve any of them against the real tests.
ROUTES.problems = (app, _, params) => {
  const st = { q: params.q || '', d: '', p: '' };
  app.innerHTML = `<h1>Problems</h1>
    <p class="muted plede"><b>Solve a problem.</b> The NeetCode 150, ${C.problems.filter(p => p.onramp).length} gentler starter problems and ${C.twists.length} twists, each against the real tests. To learn how to spot a pattern, see <a href="#/patterns">Patterns</a>; for a read-through before the interview, the <a href="#/cheatsheet">Cheatsheet</a>.</p>
    <div class="psearch" role="search">
      <div class="sfield">
        <svg class="sicon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>
        <input type="search" id="q" placeholder="Search by name, number or pattern" aria-label="Search problems" autocomplete="off" spellcheck="false" value="${esc(st.q)}">
        <button type="button" class="sclear" id="clear" aria-label="Clear search" hidden>✕</button>
        <kbd class="skbd skbd-idle" aria-hidden="true">/</kbd><kbd class="skbd skbd-esc" aria-hidden="true">Esc</kbd>
      </div>
      <div class="sfilters">
        <div class="dseg" id="seg" role="radiogroup" aria-label="Difficulty"><span class="dseg-pill" aria-hidden="true"></span>
          ${['', 'Easy', 'Medium', 'Hard'].map(d => `<button type="button" role="radio" data-d="${d}" aria-checked="${d === st.d}" tabindex="${d === st.d ? 0 : -1}">${d || 'All'} <span class="dsegn"></span></button>`).join('')}</div>
        <label class="pselect"><span class="sr">Pattern</span>
          <select id="fp"><option value="">Every pattern</option>${studyOrder().map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label>
        <span class="scount" id="cnt" role="status" aria-live="polite"></span>
      </div>
    </div>
    <div class="plist" id="list"></div>`;
  const q = $('#q'), seg = $('#seg'), pill = $('.dseg-pill', seg);
  const norm = s => s.toLowerCase();
  const matches = (p, text) => !text || norm(`${p.num} ${p.title} ${PAT(p.pattern).name}`).includes(text);
  const mark = (s, text) => { if (!text) return esc(s); const i = norm(s).indexOf(text); return i < 0 ? esc(s) : esc(s.slice(0, i)) + `<mark>${esc(s.slice(i, i + text.length))}</mark>` + esc(s.slice(i + text.length)); };
  const placePill = () => { const b = $(`[data-d="${st.d}"]`, seg); pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft - 4}px)`; };
  const draw = () => {
    const text = norm(st.q.trim());
    const base = C.everyProblem.filter(p => (!st.p || p.pattern === st.p) && matches(p, text));
    const rows = base.filter(p => !st.d || p.diff === st.d);
    for (const b of $$('button', seg)) $('.dsegn', b).textContent = base.filter(p => !b.dataset.d || p.diff === b.dataset.d).length;
    $('#cnt').textContent = (rows.length === C.everyProblem.length ? `${rows.length} problems` : `${rows.length} of ${C.everyProblem.length}`)
      + (rows.length ? ` · about ${fmtMin(rows.reduce((a, p) => a + solveMin(p), 0))} to solve` : '');
    $('#clear').hidden = !st.q;
    $('#list').innerHTML = rows.map(p => `<div class="prow">
      <a class="ptitle" href="#/play/oa?problem=${p.id}" title="Solve against the tests"><span>${mark(p.title, text)}</span></a>
      <span class="tag ${p.diff}">${p.diff}</span>${patternTag(p.pattern)}${p.twist_of ? '<span class="tag twist" title="A variation that appears nowhere else in the app">Twist</span>' : ''}<span class="spacer"></span>
      ${p.lc ? `<a class="ext pext" href="https://leetcode.com/problems/${p.lc.slug}/" target="_blank" rel="noopener" tabindex="-1"
        title="${p.twist_of ? 'Closest LeetCode problem' : 'Open on LeetCode'}${p.lc.paid ? ' (Premium)' : ''}" aria-label="LeetCode ${p.lc.num}: ${esc(p.lc.title)}">LC ${p.lc.num}${p.lc.paid ? ' 🔒' : ''}</a>` : ''}
      ${problemDots(p.id)}
      ${eta(solveMin(p), '', { title: `The time budget for a ${p.diff} problem, as in an online assessment`, cls: 'peta' })}
      <a class="btn ghost" href="#/play/lineup?problem=${p.id}" title="Line Up, about ${fmtMin(gameMin('lineup'))}" aria-label="Line Up: ${esc(p.title)}, about ${fmtMin(gameMin('lineup'))}">Line Up</a>
      <a class="btn ghost" href="#/play/fill?problem=${p.id}" title="Fill the Gap, about ${fmtMin(gameMin('fill'))}" aria-label="Fill the Gap: ${esc(p.title)}, about ${fmtMin(gameMin('fill'))}">Fill</a>
      <a class="btn primary" href="#/play/oa?problem=${p.id}" tabindex="-1">Solve</a></div>`).join('')
      || `<div class="pempty"><p>No problem matches${st.q ? ` “${esc(st.q.trim())}”` : ''}${st.d ? ` at ${st.d}` : ''}${st.p ? ` in ${esc(PAT(st.p).name)}` : ''}.</p>
          <button type="button" id="reset">Clear the filters</button></div>`;
    $('#reset') && ($('#reset').onclick = () => { st.q = ''; st.d = ''; st.p = ''; q.value = ''; $('#fp').value = ''; setD(''); q.focus(); });
    placePill();
  };
  const setD = d => {
    st.d = d;
    for (const b of $$('button', seg)) { const on = b.dataset.d === d; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; }
    draw();
  };
  q.addEventListener('input', () => { st.q = q.value; draw(); });
  q.addEventListener('keydown', e => {
    if (e.key === 'Escape' && q.value) { e.preventDefault(); e.stopPropagation(); q.value = ''; st.q = ''; draw(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); $$('#list .ptitle')[0]?.focus(); }
    if (e.key === 'Enter') { e.preventDefault(); $$('#list .ptitle')[0]?.click(); }
  });
  $('#clear').onclick = () => { q.value = ''; st.q = ''; draw(); q.focus(); };
  seg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setD(b.dataset.d); });
  seg.addEventListener('keydown', e => {   // radio group: arrows move the selection
    const bs = $$('button', seg), k = bs.findIndex(b => b.dataset.d === st.d);
    const j = e.key === 'ArrowRight' ? (k + 1) % bs.length : e.key === 'ArrowLeft' ? (k + bs.length - 1) % bs.length : -1;
    if (j >= 0) { e.preventDefault(); setD(bs[j].dataset.d); bs[j].focus(); }
  });
  $('#fp').onchange = e => { st.p = e.target.value; draw(); };
  $('#list').addEventListener('keydown', e => {
    const t = $$('#list .ptitle'), k = t.indexOf(document.activeElement); if (k < 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); t[k + 1]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (k ? t[k - 1] : q).focus(); }
  });
  const ro = new ResizeObserver(placePill); ro.observe(seg); onLeave(() => ro.disconnect());
  draw();
  if (params.focus !== '0') q.focus();
};

// Where you are in a pattern's Study course, in a few words (Patterns tab tiles and pattern pages).
function courseStatus(pid) {
  if (!PAT(pid).lesson) return '';
  const pr = courseProgress(pid);
  if (pr.complete) return '✓ done';
  const done = pr.stages.reduce((a, s) => a + s.done, 0), of = pr.stages.reduce((a, s) => a + s.of, 0);
  return done ? `${done} of ${of} steps` : 'not started';
}

ROUTES.patterns = (app, [pid]) => {
  if (pid) {
    const p = PAT(pid);
    if (!C.patterns.some(x => x.id === pid)) { app.innerHTML = `<a href="#/patterns">← All patterns</a><h1>No pattern called “${esc(pid)}”</h1><p class="muted">Pick one from <a href="#/patterns">Patterns</a>.</p>`; return; }
    const nx = p.lesson ? nextStep(pid) : null;
    const courseCard = p.lesson ? `<div class="card course-link"><div><h2 class="h3">Study course</h2>
        <p class="small muted">Course ${esc(courseStatus(pid))}${nx ? ` · Next: ${esc(nx.label)}` : ''}</p></div>
        <div class="row"><a class="btn primary" href="#/study/${pid}" data-key="s">${courseProgress(pid).complete || !nx || nx.href === `#/study/${pid}` ? 'Open the course' : 'Course page'} <kbd>S</kbd></a>
        ${nx && nx.href !== `#/study/${pid}` ? `<a class="btn" href="${nx.href}" data-key="c">${esc(nx.verb)}${etaIn(nx.min)} <kbd>C</kbd></a>` : ''}</div></div>` : '';
    const probs = C.problems.filter(x => x.pattern === pid);
    const cards = C.sprint.filter(x => x.pattern === pid);
    app.innerHTML = `<a href="#/patterns">← All patterns</a><h1 style="color:${pc(p.color)}">${esc(p.name)}</h1>
      <p class="muted">${Math.round(mastery(pid) * 100)}% mastery</p>
      ${courseCard}
      <div class="row eta-row"><span id="page-eta"></span>${probs.length ? eta(probs.reduce((a, x) => a + solveMin(x), 0), `to solve all ${probs.length}`, { title: 'OA budgets: 15 min Easy, 25 Medium, 40 Hard' }) : ''}</div>
      <div class="side"><div><h2 class="h3">Skeleton</h2><pre class="code">${esc(p.skeleton)}</pre></div>
      <div class="card"><h2 class="h3">Reach for it when</h2><ul>${p.triggers.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      <h2 class="h3">To fill the skeleton, answer</h2><ol>${p.fill.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
      <a class="btn" href="#/play/skeleton?problem=${pid}" data-key="r">🦴 Recall this skeleton${etaIn(gameMin('skeleton'))} <kbd>R</kbd></a></div></div>
      <h2>Coded problems (${probs.length})</h2>
      ${probs.length ? `<table><tr><th>Problem</th><th>Level</th><th>Practise</th></tr>${probs.map(x => `<tr>
        <td>${esc(x.title)} <span class="tag ${x.diff}">${x.diff}</span> ${lcChip(x)} ${eta(solveMin(x))}<details><summary class="small">Insight & solution</summary><p>${esc(x.insight)}</p>
        <p class="muted">Catch: ${esc(x.catch)}</p><pre class="code">${esc(x.solution)}</pre></details></td>
        <td>${problemDots(x.id)} <span class="small muted">${PROBLEM_LEVELS[problemLevel(x.id)]}</span></td>
        <td><div class="row practise"><a href="#/play/oa?problem=${x.id}" title="Solve it in OA Mode">Solve</a><a href="#/play/lineup?problem=${x.id}" title="Put its lines in order">Line Up</a><a href="#/play/fill?problem=${x.id}" title="Write its key lines">Fill</a><a href="#/play/mock?problem=${x.id}" title="Mock Interview">Mock</a></div></td></tr>`).join('')}</table>`
        : '<p class="muted">No coded problems yet. Sprint cards only.</p>'}
      <h2>Sprint cards (${cards.length})</h2><div class="small">${cards.map(c => `<div style="padding:4px 0"><b>${esc(c.title)}</b> ${lcChip(C.problems.find(x => x.title === c.title || x.lc?.title === c.title))}: <span class="muted">${esc(c.move)}</span></div>`).join('')}</div>`;
    return;
  }
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  app.innerHTML = `<h1>Patterns</h1><p class="muted"><b>Spot the pattern.</b> The ${C.patterns.length} patterns in Study order, coloured by how well you know each. Open one for its triggers, template and problems. To solve something now, go to <a href="#/problems">Problems</a>.</p>
    <div class="heat" data-navlist="grid">${studyOrder().map(p => { const m = mastery(p.id), nC = C.sprint.filter(x => x.pattern === p.id).length, cs = courseStatus(p.id);
      return `<div class="tile" style="background:color-mix(in srgb, ${p.color} ${Math.round(8 + m * 60)}%, var(--panel))"><a class="tile-main" href="#/patterns/${p.id}" data-item>
      <b>${Math.round(m * 100)}%</b>${esc(p.name)}<div class="small muted">${plural(C.problems.filter(x => x.pattern === p.id).length, 'problem')}${nC ? ` · ${plural(nC, 'Sprint card')}` : ''}</div>
      <div class="small muted">${CLOCK}<span class="sr">About </span>${fmtMin(C.problems.filter(x => x.pattern === p.id).reduce((a, x) => a + solveMin(x), 0))} to solve them</div></a>
      ${cs ? `<a class="tile-study" href="#/study/${p.id}" aria-label="Study course for ${esc(p.name)}: ${esc(cs)}"><span>Study course →<span class="small muted"> ${esc(cs)}</span></span></a>` : ''}</div>`; }).join('')}</div>`;
};

ROUTES.stats = app => {
  const days = Array.from({ length: 30 }, (_, i) => addDays(today(), i - 29));
  const maxXp = Math.max(1, ...days.map(d => S.days[d]?.xp || 0));
  const items = Object.entries(S.items);
  const byGame = {}; for (const [k, v] of items) { const g = k.split(':')[0]; (byGame[g] ||= []).push(v); }
  const weak = items.filter(([, v]) => v.lapses > 0).sort((a, b) => b[1].lapses - a[1].lapses || a[1].box - b[1].box).slice(0, 10);
  const nameOf = k => { const [g, id] = k.split(':'); const o = GAMES[g]?.pool().find(x => x.id === id); return `${GAMES[g]?.icon || ''} ${esc(o?.title || o?.name || o?.prompt || id)}`; };
  app.innerHTML = `<h1>Stats</h1>
    <p class="muted">Each question you answer becomes a review card, level 0 to 7. Right moves it up and spaces its next review further out (1, 3, 7, 14, 30 days…); a miss sends it back to 0, due tomorrow. Level 5+ is locked in.</p>
    <div class="grid g3">
      <div class="card"><div class="muted small">Level</div><b style="font-size:28px">${level(S.xp)}</b><div class="muted small">${S.xp} XP total</div></div>
      <div class="card"><div class="muted small">Streak</div><b style="font-size:28px">🔥 ${S.streak.count}</b><div class="muted small">best ${S.streak.best || 0}</div></div>
      <div class="card"><div class="muted small">Review cards</div><b style="font-size:28px">${items.length}</b><div class="muted small">${items.filter(([, v]) => v.box >= 5).length} locked in (level 5+)</div></div>
      <div class="card"><div class="muted small">Mock interviews</div><b style="font-size:28px">${S.mocks.length}</b><div class="muted small">${S.mocks.length ? 'avg rubric ' + (S.mocks.reduce((a, m) => a + m.avg, 0) / S.mocks.length).toFixed(1) + '/4' : 'none yet'}</div></div>
    </div>
    ${(() => { const wk = Progress.weeklySolves(S.days, today()), tot = wk.reduce((x, w) => x + w.n, 0), pct = w => Math.round(100 * w.ok / w.n);
      return `<h2>Cold solves by week</h2>
      <p class="muted small">Whole problems from a blank editor (cold solves and OA Mode), solved without the plan hint or the answer. This is the number that tracks interview results. ${tot ? 'Your full history is in Settings → Download backup.' : 'It fills in as you solve.'}</p>
      <div class="wk" role="list" aria-label="Cold-solve rate, last 8 weeks">${wk.map(w => `<div class="wk-col" role="listitem" aria-label="Week from ${w.start}: ${w.n ? `${w.ok} of ${w.n} solved` : 'none tried'}">
        <div class="wk-bar" aria-hidden="true"><i style="height:${w.n ? pct(w) : 0}%"></i></div><b aria-hidden="true">${w.n ? pct(w) + '%' : '–'}</b>
        <span class="muted small" aria-hidden="true">${w.n} tried</span><small class="muted" aria-hidden="true">${w.start.slice(5).replace('-', '/')}</small></div>`).join('')}</div>`; })()}
    <h2>Last 30 days</h2><div class="days">${days.map(d => { const x = S.days[d]?.xp || 0;
      return `<i title="${d}: ${x} XP" style="background:${x ? `color-mix(in srgb, var(--accent) ${Math.round(25 + 75 * x / maxXp)}%, var(--panel2))` : ''}"></i>`; }).join('')}</div>
    <h2>Per game</h2><table><tr><th>Game</th><th>Seen</th><th>Due today</th><th>Average level</th></tr>${Object.entries(GAMES).map(([id, g]) => { const a = byGame[id] || [];
      return `<tr><td>${g.icon} ${g.name}</td><td>${a.length}/${g.pool().length}</td><td>${dueCount(id)}</td><td>${a.length ? (a.reduce((s, v) => s + v.box, 0) / a.length).toFixed(1) : '-'}</td></tr>`; }).join('')}</table>
    <h2>Most-missed items</h2>${weak.length ? `<table><tr><th>Card</th><th>Misses</th><th>Level</th><th>Due</th></tr>${weak.map(([k, v]) => `<tr><td>${nameOf(k)}</td><td>${v.lapses}</td><td>${v.box} · ${LEVEL_NAMES[v.box]}</td><td>${v.due}</td></tr>`).join('')}</table>` : '<p class="muted">Nothing missed yet.</p>'}
    ${S.mocks.length ? `<h2>Mock history</h2><table><tr><th>Date</th><th>Problem</th><th>Tests</th><th>Complexity</th><th>Rubric</th></tr>${S.mocks.slice().reverse().map(m => `<tr><td>${m.date}</td>
      <td>${esc(PROB(m.problem)?.title || m.problem)}</td><td>${m.passed ? '✓' : '✗'}</td><td>${m.complexity ? '✓' : '✗'}</td><td>${m.avg}/4 <span class="muted small">${Object.entries(m.scores).map(([k, v]) => k + ' ' + v).join(' · ')}</span></td></tr>`).join('')}</table>` : ''}`;
};

ROUTES.settings = app => {
  const st = S.settings;
  app.innerHTML = `<h1>Settings</h1><div class="row eta-row">${eta(2, 'to set up', { title: 'Pick a date, a daily time and your focus: about two minutes' })}</div>
    <div class="grid" style="max-width:720px">
    <div class="card"><h2 class="h3">Urgency</h2><p class="muted small">Your next OA or interview. Within 14 days, the app goes into urgent mode and reviews are packed closer together so everything gets a few reps before the date.</p>
      <div class="row"><input type="date" id="date" aria-label="Interview date" value="${st.interviewDate || ''}"><button id="nodate" class="ghost">No date</button>
      ${[7, 14, 30].map(d => `<button class="ghost" data-d="${d}">+${d}d</button>`).join('')}</div></div>
    <div class="card"><h2 class="h3">Daily time: <span id="mv">${st.minutes}</span> min</h2><input type="range" class="slider" id="min" aria-label="Daily time in minutes" min="10" max="120" step="5" value="${st.minutes}">
      <p class="muted small">The daily plan is rebuilt from this. Mock interviews show up at 70+ min (55+ in urgent mode); OA Mode shows up around 45+ min.</p></div>
    <div class="card"><h2 class="h3">In-person focus</h2><p class="muted small">Turning these on adds their drills to the daily plan.</p><div class="checklist">
      ${[['talk', 'Talking while coding (mock interviews, recording)'], ['clarify', 'Clarifying questions & edge cases (Edge Hunter)'],
         ['complexity', 'Complexity analysis (Big-O Call)'], ['noide', 'No-IDE coding & nerves (mock interviews, OA timer)']].map(([k, l]) =>
        `<label><input type="checkbox" data-f="${k}" ${st.focus[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
    <div class="card"><h2 class="h3">New items per day, per game: <span id="nv">${st.newPerDay}</span></h2><input type="range" class="slider" id="new" aria-label="New items per day, per game" min="1" max="12" value="${st.newPerDay}">
      <p class="muted small">Pattern Sprint gets 3× this. Reviews always come first; new items fill the rest.</p></div>
    <div class="card"><h2 class="h3">Time limits</h2>
      <p class="muted small">Timed games train speed. Lengthen or remove a limit whenever you need more time.</p>
      <p class="setrow">Pattern Sprint: <b><span id="sv">${st.sprintSeconds}</span> s</b> per card</p>
      <input type="range" class="slider" id="sec" aria-label="Pattern Sprint seconds per card" min="6" max="30" value="${st.sprintSeconds}" ${st.sprintNoLimit ? 'disabled' : ''}>
      <label class="checkrow"><input type="checkbox" id="sprintnl" ${st.sprintNoLimit ? 'checked' : ''}> No time limit in Pattern Sprint</label>
      <label class="setrow" for="edgesec">Edge Hunter</label>
      <select id="edgesec">${[[60, '60 seconds'], [120, '2 minutes'], [180, '3 minutes'], [0, 'No time limit']].map(([v, l]) => `<option value="${v}" ${(st.edgeSeconds ?? 60) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="card"><fieldset class="theme-pick"><legend><h2 class="h3">Theme</h2></legend>
      ${[['system', 'System', 'follows your device'], ['light', 'Light', ''], ['dark', 'Dark', '']].map(([v, l, d]) =>
        `<label class="checkrow"><input type="radio" name="theme" value="${v}" ${PGTheme.get() === v ? 'checked' : ''}> ${l}${d ? ` <span class="muted small">${d}</span>` : ''}</label>`).join('')}
      <p class="muted small">Kept in this browser. Other open tabs switch too.</p></fieldset></div>
    <div class="card"><h2 class="h3">Keyboard</h2>
      <label class="checkrow"><input type="checkbox" id="singlekeys" ${st.singleKeys !== false ? 'checked' : ''}> Single-key shortcuts (S, A, N, 1–9 and so on)</label>
      <p class="muted small">Turn these off if you use speech input or tend to press keys by accident. Ctrl+Enter, Esc, Enter, Tab and the arrow keys keep working.</p></div>
    <div class="card" id="acct" hidden></div>
    <div class="card"><h2 class="h3">Data</h2><p class="muted small">${SERVER ? 'Progress is saved in progress.json next to server.py'
      : 'Progress is saved in this browser'}${Cloud.signedIn ? ' and synced to your account.' : SERVER ? '.'
      : ' only. Sign in above to sync it, or download a backup and use Restore on the other device.'}</p>
      <div class="row"><button id="export" data-key="b">Download backup <kbd>B</kbd></button><button id="import" data-key="r">Restore from backup <kbd>R</kbd></button>
      <input type="file" id="importfile" aria-label="Backup file to restore" accept=".json,application/json" hidden><button class="bad" id="reset">Reset all progress</button></div></div>
    </div>`;
  const rebuild = () => { if (S.plan) S.plan.minutes = -1; save(); }; // forces rebuild, keeps today's progress
  $('#date').onchange = e => { st.interviewDate = e.target.value || null; rebuild(); toast('Urgency updated'); };
  $('#nodate').onclick = () => { st.interviewDate = null; $('#date').value = ''; rebuild(); toast('No interview date'); };
  $$('[data-d]').forEach(b => b.onclick = () => { st.interviewDate = addDays(today(), +b.dataset.d); $('#date').value = st.interviewDate; rebuild(); toast('Urgency updated'); });
  $('#min').oninput = e => { st.minutes = +e.target.value; $('#mv').textContent = st.minutes; };
  $('#min').onchange = rebuild;
  $('#new').oninput = e => { st.newPerDay = +e.target.value; $('#nv').textContent = st.newPerDay; save(); };
  $('#sec').oninput = e => { st.sprintSeconds = +e.target.value; $('#sv').textContent = st.sprintSeconds; save(); };
  $('#sprintnl').onchange = e => { st.sprintNoLimit = e.target.checked; $('#sec').disabled = e.target.checked; save(); toast(e.target.checked ? 'Pattern Sprint: no time limit' : 'Pattern Sprint: timed'); };
  $('#edgesec').onchange = e => { st.edgeSeconds = +e.target.value; save(); toast('Edge Hunter: ' + e.target.selectedOptions[0].text); };
  $$('input[name=theme]').forEach(r => r.onchange = () => { PGTheme.set(r.value); toast(`Theme: ${{ system: 'follows your device', light: 'light', dark: 'dark' }[r.value]}`); });
  $('#singlekeys').onchange = e => { st.singleKeys = e.target.checked; save(); toast(e.target.checked ? 'Single-key shortcuts on' : 'Single-key shortcuts off'); };
  $$('[data-f]').forEach(c => c.onchange = () => { st.focus[c.dataset.f] = c.checked; rebuild(); });
  $('#export').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' })); a.download = `pattern-gym-${today()}.json`; a.click(); };
  $('#import').onclick = () => $('#importfile').click();
  $('#importfile').onchange = async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    let data;
    try { data = JSON.parse(await f.text()); } catch (err) { toast('That file isn’t valid JSON'); return; }
    if (!data || typeof data !== 'object' || Array.isArray(data) || !('items' in data || 'settings' in data)) { toast('That doesn’t look like a Pattern Gym backup'); return; }
    const where = Cloud.signedIn ? ' here and in your account' : '';
    if (!confirm(`Replace your current progress${where} with this backup? (Download a backup first if you want to keep it.)`)) return;
    S = normalizeState(data); markSettingsSeen(); save(); Cloud.overwrite(); toast('Backup restored'); route();
  };
  $('#reset').onclick = () => {
    const where = Cloud.signedIn ? ' here and in your account' : '';
    if (confirm(`Erase ALL progress, XP and streaks${where}? This cannot be undone.`)) {
      const s = S.settings; S = structuredClone(DEFAULTS); S.settings = s; markSettingsSeen(); save(); Cloud.overwrite(); toast('Progress reset');
    }
  };
  Cloud.drawAccount($('#acct'));
};
