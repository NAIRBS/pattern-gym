/* Pattern Gym · study-solve.js: Study screens: walkthrough, guided problem, cold solve.
   Plain script (no modules): shares one global scope with the other files in index.html's order. */
'use strict';

// Walkthrough: the approach applied to one problem, from the naive brute force to the final answer.
function studyWalk(app, pid, probId, params) {
  const p = PROB(probId); if (!p) return studyCourse(app, pid);
  const role = roleOf(p), L = PAT(p.pattern).lesson || {};
  if ((role === 'solo' || role === 'transfer') && !attempted(p.id) && params.peek !== '1') {
    app.innerHTML = `<div class="study"><a href="#/study/${p.pattern}" class="crumb">← ${esc(PAT(p.pattern).name)}</a>
      <div class="gate card"><h1>${esc(p.title)}</h1>
        <p>Try this one cold first. An explanation lands much better after you’ve struggled with the problem yourself, and once you’ve read it,
          this stops being a problem you haven’t seen.</p>
        <div class="row"><a class="btn primary" href="#/study/solve/${p.id}" data-key="c">Solve it cold${etaIn(solveMin(p))} <kbd>C</kbd></a>
          <a class="btn ghost" href="#/study/${p.pattern}/${p.id}?peek=1" data-key="w">Show the walkthrough anyway${etaIn(walkMin(p))} <kbd>W</kbd></a></div></div></div>`;
    return;
  }
  const list = [...sortedProblems(p.pattern), ...C.twists.filter(t => t.pattern === p.pattern)], i = list.findIndex(x => x.id === p.id), prev = list[i - 1], next = list[i + 1];
  const finalO = firstBigO(p.time) || p.time;
  // No O(...) in the brute sentence: either it says exponential, or the obvious way costs the same as the final one.
  const bruteO = firstBigO(p.brute) || (/exponential|\^|n!/i.test(p.brute) ? 'exponential' : finalO);
  const sameCost = bruteO.replace(/\s/g, '') === finalO.replace(/\s/g, '');
  const cues = cuesIn(p);
  const guided = role === 'guided';
  const steps = [
    { t: 'Understand it', think: 'In one sentence: what goes in, what comes out? What would you ask before writing any code?',
      b: `<div class="two"><div><b>Questions worth asking</b><ul>${(p.clarify.length ? p.clarify : ['Standard constraints; nothing tricky.']).map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>
        <div><b>Inputs that could break a first attempt</b><ul>${p.edges.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div></div>` },
    { t: 'Solve a tiny example by hand', think: 'Work the first example on paper. What did you actually do, step by step?',
      b: `${exampleHtml(p)}<p>Whatever your hands did is a valid first algorithm, and it’s almost always the brute force. Write those steps down before thinking about speed.</p>` },
    { t: 'Brute force', think: 'What’s the most obvious correct way, ignoring speed? What does it cost?',
      b: `<p>${esc(p.brute)}</p>${p.brute_code ? `<pre class="code">${esc(p.brute_code)}</pre><p class="muted small">This is correct and passes every test. It’s just slow. Getting here first is a real result in an interview: say it, give its cost, then improve it.</p>` : ''}`, meter: 'brute' },
    { t: 'Find the repeated work', think: 'Look at the brute force. What does it recompute or rescan over and over?',
      b: `<p>${esc(L.why || p.brute)}</p>` },
    { t: 'Pick the tool that removes it', think: 'Which words in the statement hint at the tool? Which pattern removes that repeated work?',
      b: `<p>${patternTag(p.pattern)}${cues.length ? ` <span class="muted small">Cues in this statement: ${cues.map(c => `<mark>${esc(c)}</mark>`).join(' ')}</span>` : ''}</p>
        <p class="insight">${esc(p.insight)}</p>${altPatterns(p).length ? `<p class="muted small">Not the only tool that works here: the last step shows another way and when you'd pick it.</p>` : ''}` },
    { t: 'Plan in plain words', think: guided ? 'Write your plan in the box before revealing: what you keep, what each step does, when you stop.'
        : 'Say the steps out loud: what do you keep, what happens at each step, when do you stop?',
      b: `<ol class="plan">${p.plan.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` },
    { t: 'Code it', think: guided ? 'Write the code yourself first, then come back and compare.' : 'Picture the code from the plan before you look.',
      pre: guided ? `<div class="row"><a class="btn" href="#/play/fill?problem=${p.id}" data-key="f">✍️ Write the key lines${etaIn(gameMin('fill'))} <kbd>F</kbd></a><a class="btn" href="#/study/solve/${p.id}" data-key="c">💻 Write it all, cold${etaIn(solveMin(p))} <kbd>C</kbd></a></div>` : '',
      b: `${p.brute_code ? `<div class="two code-pair"><div><div class="muted small">Brute force · ${esc(bruteO)}</div><pre class="code">${esc(p.brute_code)}</pre></div>
          <div><div class="muted small">Final · ${esc(finalO)}</div>${codeWithKeys(p)}</div></div>` : codeWithKeys(p)}
        <p class="muted small"><span class="hl-chip">Highlighted</span> lines are specific to this problem. The rest is the
          <a href="#/study/${p.pattern}">${esc(PAT(p.pattern).name)}</a> skeleton.</p>`, meter: 'final' },
    { t: 'Test it', think: 'Which input would most likely break this? Trace it through the code. Then state time and space.',
      b: `<p>⚠️ ${esc(p.catch)}</p><p class="mono">Time ${esc(p.time)} · Space ${esc(p.space)}</p>` },
    ...(p.also?.length ? [{ t: 'Another way?', think: 'Is there a different approach? What would it cost, and when would you pick it over this one?',
      b: altsHtml(p) }] : []),
  ];
  let open = 0; const guesses = {};
  app.innerHTML = `<div class="study walk"><a href="#/study/${p.pattern}" class="crumb">← ${esc(PAT(p.pattern).name)}</a>
    <div class="walk-head"><h1>${esc(p.title)}</h1><span class="tag ${p.diff}">${p.diff}</span>${eta(walkMin(p), '', { title: 'Reading every step, plus about 45 seconds to answer each one yourself first' })}${extLinks(p)}</div>
    <div class="card statement-card"><p class="statement">${esc(p.statement)}</p></div>
    <div class="meter" id="meter" aria-live="polite"></div>
    <p class="muted small">Answer each step yourself first (type it, or say it out loud), then reveal. <kbd>Space</kbd> reveals the next step;
      in the box, <kbd>Ctrl</kbd>+<kbd>Enter</kbd> does.</p>
    <ol class="ladder" id="steps"></ol><div id="end"></div></div>`;
  const meter = () => {
    const reached = open > 6 ? 'final' : open > 2 ? 'brute' : null;
    const w = reached === 'final' ? bigORank(finalO) : bigORank(bruteO);
    $('#meter', app).innerHTML = reached ? `<span class="meter-label">${reached === 'final' ? (sameCost ? 'Same time as the brute force:' : `From ${esc(bruteO)} down to`) : 'Brute force runs in'} <b>${esc(reached === 'final' ? finalO : bruteO)}</b></span>
      <span class="meter-bar"><i style="width:${Math.round(w / 7 * 100)}%" class="${reached}"></i></span>` : '';
  };
  const draw = () => {
    $('#steps', app).innerHTML = steps.map((s, k) => k < open
      ? `<li class="rung done"><div class="rung-h"><span class="n">${k + 1}</span>${esc(s.t)}</div>
          ${guesses[k] ? `<div class="you-said"><span class="muted small">You said</span><div>${esc(guesses[k])}</div></div>` : ''}<div class="rung-b">${s.b}</div></li>`
      : k === open ? `<li class="rung current"><div class="rung-h"><span class="n">${k + 1}</span>${esc(s.t)}</div>
          <div class="rung-b"><p class="think">${esc(s.think)}</p>${s.pre || ''}
            <textarea id="guess" rows="${k >= 5 ? 4 : 2}" placeholder="Your answer (optional)" aria-label="Your answer for: ${esc(s.t)}"></textarea>
            <div class="row"><button class="primary" id="rev" data-key=" ">Reveal <kbd>Space</kbd></button></div></div></li>`
      : `<li class="rung locked"><div class="rung-h"><span class="n">${k + 1}</span>${esc(s.t)}</div></li>`).join('');
    meter();
    const reveal = () => { const g = $('#guess', app); if (g?.value.trim()) guesses[open] = g.value.trim(); open++; draw(); $('.rung.current', app)?.scrollIntoView({ block: 'nearest', behavior: scrollMotion() }); };
    $('#rev', app) && ($('#rev', app).onclick = reveal);
    $('#guess', app)?.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); reveal(); } });
    if (open >= steps.length) {
      $('#end', app).innerHTML = `<div class="card end-card"><h2>Now make it stick</h2>
        <p class="muted">Understanding fades within a day unless you use it. Rebuild it from memory now:</p>
        <div class="row"><a class="btn primary" href="#/study/solve/${p.id}" data-key="c">💻 Solve it cold${etaIn(solveMin(p))} <kbd>C</kbd></a><a class="btn" href="#/play/fill?problem=${p.id}" data-key="f">✍️ Fill the Gap${etaIn(gameMin('fill'))} <kbd>F</kbd></a>
          <a class="btn" href="#/play/lineup?problem=${p.id}" data-key="l">🧩 Line Up${etaIn(gameMin('lineup'))} <kbd>L</kbd></a><span class="spacer"></span>
          <button class="${walked(p.id) ? 'ghost' : 'good'}" id="und" data-key="n">${walked(p.id) ? '✓ Done' : '✓ Mark as done'} <kbd>N</kbd></button></div></div>
        <div class="row" style="margin-top:14px">${prev ? `<a class="btn ghost" href="#/study/${pid}/${prev.id}" data-key="[">← ${esc(prev.title)} <kbd>[</kbd></a>` : ''}<span class="spacer"></span>
          <a class="btn" href="#/study/${p.pattern}" data-key="b">Back to ${esc(PAT(p.pattern).name)} <kbd>B</kbd></a></div>`;
      $('#und', app).onclick = () => {
        if (!walked(p.id)) { S.study.walks[p.id] = today(); addXP(4); toast('+4 XP'); save(); }
        location.hash = `#/study/${p.pattern}`;
      };
    }
  };
  draw();
}

// Guided: you make each decision and it's checked straight away (a completion problem), instead of comparing
// your own answer with a written explanation. 1) which pattern  2) how fast it can be  3) the key lines, run against the tests.
function studyGuided(app, id) {
  const p = PROB(id); if (!p) return studyHome(app);
  const pat = PAT(p.pattern), L = pat.lesson || {};
  // Wrong options are the patterns this one is mistaken for; an alternative may be among them, and it counts as right.
  const pOpts = shuffle([pat, ...SRS.distractors(p.pattern, studyOrder().map(x => x.id), 3).map(PAT)]);
  const cOpts = shuffle([p.time, ...pick(C.complexities.filter(c => c !== p.time), 3)]);
  const got = {};
  app.innerHTML = `<div class="study guided"><a href="#/study/${p.pattern}" class="crumb">← Back to the course</a>
    <div class="walk-head"><h1>${esc(p.title)}</h1><span class="tag ${p.diff}">${p.diff}</span>${eta(guidedMin(p), '', { title: 'Reading the statement, two quick picks, then writing the key lines' })}${extLinks(p, { video: false })}</div>
    <p class="muted">Three decisions, each checked as you make it. Then compare with the full approach.</p>
    <div class="card pcard statement-card">${problemPanel(p, { title: false })}</div>
    <ol class="ladder" id="gsteps"></ol><div id="gend"></div></div>`;
  const list = $('#gsteps', app);
  const rung = (k, title) => { list.insertAdjacentHTML('beforeend', `<li class="rung current" id="g${k}"><div class="rung-h"><span class="n">${k}</span>${esc(title)}</div><div class="rung-b"></div></li>`);
    const li = $('#g' + k, app); li.scrollIntoView({ block: 'nearest', behavior: scrollMotion() }); return $('.rung-b', li); };
  const done = k => { const li = $('#g' + k, app); li.classList.remove('current'); li.classList.add('done'); };
  const choose = (body, prompt, opts, label, right, after) => {
    body.innerHTML = `<p class="think">${prompt}</p><div class="options">${opts.map((o, k) =>
      `<button type="button" data-v="${esc(o.id || o)}" data-key="${k + 1}" data-kgroup="pick an answer"><kbd>${k + 1}</kbd> ${esc(label(o))}</button>`).join('')}</div><div class="gfb" aria-live="polite"></div>`;
    body.querySelector('.options').onclick = e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      const valid = [].concat(right), ok = valid.includes(b.dataset.v);   // right: one answer, or several that all work
      $$('.options button', body).forEach(x => { x.disabled = true; x.removeAttribute('data-key'); if (valid.includes(x.dataset.v)) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
      after(ok, $('.gfb', body), b.dataset.v);
    };
  };
  const step1 = rung(1, 'Which pattern fits?');
  choose(step1, 'Read the statement. Which tool removes the slow part of the obvious solution? The options are patterns that are easy to mix up.', pOpts, x => x.name, [pat.id, ...altPatterns(p)], (ok, fb, v) => {
    got.pattern = ok;
    const cues = cuesIn(p), alt = (p.also || []).find(a => a.pattern === v && v !== pat.id);
    fb.innerHTML = `<div class="reveal">${alt ? `✓ That works too: ${esc(alt.name)}, ${esc(alt.time)}. This course uses ${patternTag(pat.id)}:` : ok ? '✓ Right.' : `Not quite. It's ${patternTag(pat.id)}.`} ${esc(p.insight)}
      ${cues.length ? `<div class="muted small">Cues in the statement: ${cues.map(c => `<mark>${esc(c)}</mark>`).join(' ')}</div>` : `<div class="muted small">Reach for it when: ${esc(pat.triggers[0])}</div>`}</div>`;
    done(1);
    const step2 = rung(2, 'How fast can it be?');
    choose(step2, `The obvious way: ${esc(p.brute)} What time complexity should the final solution reach?`, cOpts, c => c, p.time, (ok2, fb2) => {
      got.time = ok2;
      fb2.innerHTML = `<div class="reveal">${ok2 ? '✓ Right.' : `Not quite. It's <b>${esc(p.time)}</b>.`} ${esc(firstSentence(L.why || ''))}</div>`;
      done(2);
      const step3 = rung(3, 'Write the key lines');
      step3.innerHTML = `<p class="think">The skeleton is filled in. Write the lines that make it solve this problem; the real tests decide.</p><span id="gclock" hidden></span><div id="gfill"></div>`;
      GAMES.fill.render($('#gfill', app), p, q => {
        review('fill', p.id, q); got.code = q;
        if (!walked(p.id)) { S.study.walks[p.id] = today(); save(); }
        done(3);
        const mark = v => v ? '✓' : '✗';
        $('#gend', app).innerHTML = `<div class="card end-card"><h2>Done</h2>
          <p>Pattern ${mark(got.pattern)} · Speed ${mark(got.time)} · Code ${q > 0 ? '✓ passed' : '✗ needed the answer'}</p>
          <p class="muted">Now read the full approach for this problem and see where your thinking differed.</p>
          <div class="row"><a class="btn primary" href="#/study/${p.pattern}/${p.id}?peek=1" data-key="w">Full approach${etaIn(walkMin(p))} <kbd>W</kbd></a>
            <a class="btn" href="#/study/${p.pattern}" data-key="n">Back to the course <kbd>N</kbd></a></div></div>`;
        $('#gend', app).scrollIntoView({ block: 'nearest', behavior: scrollMotion() });
      }, { clock: $('#gclock', app) });
    });
  });
}

// Solve cold: the LeetCode-style workspace (workspace.js) with three problem tabs: the description, an approach
// coach (one step at a time, its own notes) and a hint ladder. Mixed practice hides the title and pattern until you're done.
// Run checks the examples; Submit adds the large hidden tests and is the graded attempt.
function studySolve(app, probId, params) {
  const p = PROB(probId); if (!p) return studyHome(app);
  const mystery = params.mixed === '1';
  const coachFirst = Object.keys(S.study.attempts).length < 6;   // the coach fades: pointed out for your first few cold solves
  const back = mystery ? '#/study' : `#/study/${p.pattern}`;
  let hints = 0, submits = 0, finished = false;
  const hintList = [
    () => `<b>Start with the brute force.</b> ${esc(p.brute)}`,
    () => `<b>The tool:</b> ${patternTag(p.pattern)} ${esc(firstSentence(PAT(p.pattern).lesson?.why || p.insight))}`,
    () => `<b>The plan:</b><ol class="plan">${p.plan.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`,
  ];
  app.innerHTML = `<div class="study solve">
    <div class="gamehead"><a class="btn ghost" href="${back}" data-key="q" id="exit" data-exit-confirm="The code in your editor is not saved, and this attempt won’t be graded.">← Exit <kbd>Q</kbd></a>
      <h1>${mystery ? '🎲 Mystery problem' : esc(p.title)}</h1><span class="tag ${p.diff}">${p.diff}</span>
      ${mystery ? '<span class="muted small">Name and pattern hidden: work out the approach from the statement.</span>' : ''}
      <span class="spacer"></span>${eta(solveMin(p), '', { title: `The time budget for a ${p.diff} problem, as in an online assessment` })}<span class="timer" id="clock"></span></div>
    <div id="ws"></div></div>`;
  const W = workspace($('#ws', app), {
    p, code: p.starter,
    tabs: [
      { id: 'desc', label: 'Description', key: 'd', html: `${coachFirst ? `<p class="ws-tip">New to cold solves? The <b>Coach</b> tab takes you through the approach one step at a time, before you code. <button type="button" class="linkish" data-goto="coach">Open the coach</button></p>` : ''}${problemPanel(p, { title: false, mystery })}` },
      { id: 'coach', label: 'Coach', key: 'c', html: '<section class="coach" id="coach" aria-label="Approach coach"></section>' },
      { id: 'hints', label: 'Hints', html: `<p class="muted small">Three hints, each a bigger nudge: the brute force, the tool, then the plan. Using the plan records this problem as missed.</p>
        <div id="hintbox" aria-live="polite"></div>
        <div class="row" style="margin-top:10px"><button type="button" class="ghost" id="hint" data-key="h">Hint 1 of 3 <kbd>H</kbd></button>
        <button type="button" class="ghost" id="give" data-key="a">Give up: show the walkthrough <kbd>A</kbd></button></div>` },
    ],
    onRun: async () => { markAttempt(); W.show(await runTests(p, W.ed.value, { hidden: false }), { submit: false }); },
    onSubmit: async () => submit(),
  });
  const ed = W.ed;
  ed.focus(); ed.selectionStart = ed.selectionEnd = ed.value.length - 1;
  const timer = startTimer($('#clock', app), 0, null, { countUp: true });
  // Approach coach: one step at a time with its own notes box.
  const coach = $('#coach', app); const notes = []; let ci = 0;
  const drawCoach = () => {
    const a = APPROACH[ci];
    coach.innerHTML = `<div class="coach-head"><b>Approach coach</b><span class="muted small">Step ${ci + 1} of 6, optional</span></div>
      <ol class="coach-steps">${APPROACH.slice(0, 6).map((x, k) => `<li><button type="button" class="${k === ci ? 'on' : notes[k] ? 'done' : ''}" data-ci="${k}"
        title="${esc(x.t)}" aria-label="Step ${k + 1}: ${esc(x.t)}" ${k === ci ? 'aria-current="step"' : ''}>${k + 1}</button></li>`).join('')}</ol>
      <label class="coach-body" for="cn"><b>${esc(a.t)}</b><span class="muted small">${esc(a.d)}</span></label>
      <textarea id="cn" rows="3" placeholder="Your notes for this step (optional)">${esc(notes[ci] || '')}</textarea>
      <div class="row coach-nav"><button type="button" class="ghost" id="cprev" data-key="[" ${ci ? '' : 'disabled'}>Back <kbd>[</kbd></button><span class="spacer"></span>
        <button type="button" id="cnext" data-key="]">${ci < 5 ? 'Next step' : 'Done, write the code'} <kbd>]</kbd></button></div>`;
    const ta = $('#cn', coach); ta.oninput = () => { notes[ci] = ta.value; };
    const go = k => { ci = k; drawCoach(); $('#cn', coach).focus(); };
    $$('[data-ci]', coach).forEach(b => b.onclick = () => go(+b.dataset.ci));
    $('#cprev', coach).onclick = () => go(ci - 1);
    $('#cnext', coach).onclick = () => (ci < 5 ? go(ci + 1) : (W.setView('code'), ed.focus()));
  };
  drawCoach();
  const markAttempt = () => {
    const cp = mystery && checkpointDue(); if (cp) { S.study.lessons['checkpoint:' + cp.k] = today(); save(); }
    if (!attempted(p.id)) { S.study.attempts[p.id] = today(); save(); }
  };
  const twistNote = p.twist_of ? ` It’s a twist on <a href="#/study/${p.pattern}/${p.twist_of}">${esc(PROB(p.twist_of)?.title || p.twist_of)}</a>.` : '';
  const comboNote = p.combo ? ` It needs two patterns: ${patternTag(p.pattern)} and ${patternTag(p.combo.with)}. ${esc(p.combo.how)}` : '';
  const reveal = () => mystery ? `<div class="reveal">It was <b>${esc(p.title)}</b>, ${p.combo ? 'a combined problem.' : `a ${patternTag(p.pattern)} problem.`}${comboNote}${twistNote}</div>`
    : twistNote || comboNote ? `<div class="reveal">${(comboNote + twistNote).trim()}</div>` : '';
  const after = () => {
    $('#exit', app)?.removeAttribute('data-exit-confirm');   // graded: nothing left to lose
    W.after.insertAdjacentHTML('beforeend', `${reveal()}<div class="row" style="margin-top:8px">
      <a class="btn" href="#/study/${p.pattern}/${p.id}" data-key="w">See the approach, brute force to final <kbd>W</kbd></a>${extLinks(p)}
      ${mystery ? `<a class="btn primary" href="#/study/mixed${params.combo === '1' ? '?combo=1' : ''}" data-key="n">Next mystery <kbd>N</kbd></a>` : `<a class="btn primary" href="${back}" data-key="n">Back to the course <kbd>N</kbd></a>`}</div>`);
  };
  $('#hint', app).onclick = () => {
    if (hints >= hintList.length || finished) return;
    W.tab('hints');
    $('#hintbox', app).insertAdjacentHTML('beforeend', `<div class="reveal small">${hintList[hints]()}</div>`);
    hints++;
    const b = $('#hint', app); if (hints >= hintList.length) { b.disabled = true; b.textContent = 'No more hints'; } else b.innerHTML = `Hint ${hints + 1} of 3 <kbd>H</kbd>`;
  };
  async function submit() {
    if (finished) return; submits++; markAttempt();
    W.rc(`${submits} submission${submits > 1 ? 's' : ''}`);
    const r = await runTests(p, ed.value);
    W.show(r, { submit: true });
    if (!r.ok) return;
    finished = true; timer.stop();
    const cap = hints === 0 ? 2 : hints === 1 ? 1 : 0;
    if (cap === 0) { review('oa', p.id, 0); W.after.insertAdjacentHTML('beforeend', '<p class="muted small">Solved with the plan as a hint, so it’s recorded as missed and comes back soon.</p>'); return after(); }
    const bar = gradeButtons(q => { review('oa', p.id, q); bar.remove(); after(); }, submits <= 2 && hints === 0 ? 2 : 1);
    bar.querySelectorAll('button').forEach(b => { if (+b.dataset.q > cap) b.disabled = true; });
    W.after.append(bar);
  }
  $('#give', app).onclick = () => {
    if (!finished) { finished = true; timer.stop(); markAttempt(); review('oa', p.id, 0); }
    location.hash = `#/study/${p.pattern}/${p.id}`;
  };
}
