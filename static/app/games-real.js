/* Pattern Gym · games-real.js: The real thing: OA Mode and Mock Interview.
   Plain script (no modules): shares one global scope with the other files in index.html's order. */
'use strict';

// 8. OA Mode — write the whole thing from a blank editor against the clock.
GAMES.oa = {
  name: 'OA Mode', icon: '💻', layer: 'Full solve', cost: 20, defaultN: 1,
  desc: 'Online-assessment conditions: a statement, a signature, a timer and a run button. No hints unless you give up. Switch the editor to a blank page (function or stdin program) to practise CoderPad and HackerRank conditions.',
  pool: () => C.problems,
  gate: p => (item('fill', p.id)?.box || 0) >= 1,
  render(el, p, done, { clock }) {
    const mins = { Easy: 15, Medium: 25, Hard: 40 }[p.diff] || 25;
    let submits = 0, finished = false;
    let mode = padMode(p); const drafts = {};
    const W = workspace(el, {
      p, code: padStarter(p, mode), prog: mode === 'prog', lang: padBar(p),
      tabs: [
        { id: 'desc', label: 'Description', key: 'd', html: `${problemPanel(p)}<div id="fmt"></div>` },
        { id: 'sol', label: 'Solution', html: `<p class="muted small">Stuck? Opening the solution records this problem as missed, so it comes back soon.</p>
          <div class="row"><button type="button" class="ghost" id="give"></button></div><div id="moveon"></div><div id="sol" hidden></div>` },
      ],
      onRun: async () => W.show(await padRun(p, mode, W.ed.value, { hidden: false }), { submit: false, prog: mode === 'prog' }),
      onSubmit: async () => submit(),
    });
    const ed = W.ed; ed.focus();
    ed.selectionStart = ed.selectionEnd = ed.value.length - (mode === 'leetcode' ? 1 : 0);
    const showFmt = () => { $('#fmt', el).innerHTML = mode === 'prog' ? padFormat(p) : ''; };
    showFmt();
    $('#pad', el).onchange = e => {
      drafts[mode] = ed.value; mode = e.target.value; S.settings.pad = mode; save();
      ed.value = drafts[mode] ?? padStarter(p, mode); showFmt(); W.setCases(mode === 'prog'); ed.focus();
    };
    const timer = startTimer(clock, mins * 60, () => toast('⏰ Time budget used: finish up or look at the solution'));
    const sol = answerToggle($('#give', el), $('#sol', el),
      () => `<div class="reveal">${patternTag(p.pattern)} ${esc(p.insight)}<br><span class="muted">Catch: ${esc(p.catch)}</span></div><pre class="code">${esc(padSolution(p, mode))}</pre>${extLinks(p)}`,
      () => { if (!finished) $('#moveon', el).append(missedBar(done)); }, 'solution');
    const finish = q => {
      finished = true; const t = timer.stop();
      W.after.insertAdjacentHTML('beforeend', `<p class="muted small">Time: ${fmtTime(t)} · submissions: ${submits}</p>`);
      if (sol.seen) { $('#moveon', el).innerHTML = ''; W.after.append(missedBar(done, true)); } else W.after.append(gradeButtons(done, q));
    };
    async function submit() {
      if (finished) return; submits++; W.rc(`${submits} submission${submits > 1 ? 's' : ''}`);
      const r = await padRun(p, mode, ed.value);
      W.show(r, { submit: true, prog: mode === 'prog' });
      if (r.ok) finish(timer.elapsed() <= mins * 60 && submits <= 2 ? 2 : 1);
    }
  },
};

// 9. Mock Interview — the in-person loop: clarify → plan aloud → code without running → test → complexity → rubric.
GAMES.mock = {
  name: 'Mock Interview', icon: '🎤', layer: 'In-person', cost: 35, defaultN: 1, focus: 'talk',
  desc: 'Full in-person simulation in phases. You talk out loud (record yourself if you like), code with no run button, then self-score on a real rubric.',
  pool: () => C.problems.filter(p => p.diff !== 'Easy' || C.problems.length < 10),
  gate: p => (item('fill', p.id)?.box || 0) >= 1 || (item('lineup', p.id)?.box || 0) >= 2,
  render(el, p, done, { clock }) {
    const phases = [
      { id: 'clarify', name: 'Clarify', mins: 3 }, { id: 'plan', name: 'Plan aloud', mins: 5 },
      { id: 'code', name: 'Code (no run)', mins: 20 }, { id: 'test', name: 'Dry-run & test', mins: 4 }, { id: 'score', name: 'Score', mins: 0 }];
    let ph = 0, timer = null, timerPhase = -1, storeCur = null; const notes = { mode: padMode(p) }; let rec = null, chunks = [], audioUrl = null;
    const draw = () => {
      if (timer && timerPhase !== ph) timer.stop();
      const P = phases[ph];
      const head = `<div class="phase">${phases.map((x, i) => `<span class="${i === ph ? 'on' : i < ph ? 'done' : ''}">${i + 1}. ${x.name}</span>`).join('')}</div>`;
      const side = `<div class="card"><h2 class="h3">Say it out loud</h2><ol class="small" style="padding-left:18px;margin:0">${C.think_aloud.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
        ${S.settings.focus.talk ? `<div class="row" style="margin-top:12px"><button id="rec" data-key="v">${rec ? '⏹ Stop recording' : '🎙 Record myself'} <kbd>V</kbd></button></div>
        ${audioUrl ? `<audio controls src="${audioUrl}" style="width:100%;margin-top:8px"></audio>` : ''}` : ''}</div>`;
      let main = `<div class="card">${problemPanel(p)}`;
      if (P.id === 'clarify') main += `<p class="muted">Before solving: ask your questions. Type them as you say them.</p><textarea id="n" style="min-height:140px" aria-label="Your clarifying questions">${esc(notes.clarify || '')}</textarea>`;
      if (P.id === 'plan') main += `<details open><summary>Answers to typical clarifying questions</summary><ul class="small">${p.clarify.map(c => `<li>${esc(c)}</li>`).join('') || '<li>Standard constraints.</li>'}</ul></details>
        <p class="muted">Say: brute force + its cost → the bottleneck → the pattern → 3-5 step plan. Commit to a complexity.</p>
        <textarea id="n" style="min-height:150px" placeholder="Brute force: ...&#10;Bottleneck: ...&#10;Pattern: ...&#10;Plan: 1) ... 2) ...">${esc(notes.plan || '')}</textarea>
        <div class="row" style="margin-top:8px">Time <select id="ct">${C.complexities.map(c => `<option ${notes.ct === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
        Space <select id="cs">${C.complexities.map(c => `<option ${notes.cs === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>`;
      if (P.id === 'code') main += `${notes.mode === 'prog' ? padFormat(p) : ''}<div class="row"><p class="muted" style="margin:0">Whiteboard rules: no run button, no auto-indent. Narrate what each block is for.</p><span class="spacer"></span>${padBar(p, 'mpad')}</div>
        <textarea class="code" id="n" aria-label="Your code">${esc(notes.code ?? padStarter(p, notes.mode))}</textarea>`;
      if (P.id === 'test') main += `<p class="muted">Trace your code on the example and 2 edge cases, out loud. Fix bugs you find. Still no running.</p>
        <textarea class="code" id="n" aria-label="Your code">${esc(notes.code)}</textarea><textarea id="n2" style="min-height:80px;margin-top:8px" placeholder="Dry-run notes / edge cases tested">${esc(notes.test || '')}</textarea>`;
      if (P.id === 'score') main += `<div id="res"><p class="muted">Running your final code…</p></div><h2 class="h3" style="margin-top:12px">Score yourself (1 = weak, 4 = strong)</h2>
        <table>${C.rubric.map(r => `<tr><td><b>${esc(r.name)}</b><div class="muted small">${esc(r.desc)}</div></td><td style="white-space:nowrap">${[1, 2, 3, 4].map(v =>
          `<label style="margin-right:6px"><input type="radio" name="${r.id}" value="${v}"> ${v}</label>`).join('')}</td></tr>`).join('')}</table>
        <div class="row" style="margin-top:12px"><button class="primary" id="save" data-key="s">Save mock <kbd>S</kbd></button></div>`;
      if (P.id !== 'score') main += `<div class="row" style="margin-top:10px"><button class="primary" id="nextp" data-key="n">Next phase <kbd>N</kbd></button><span class="muted small">Suggested ${P.mins} min</span></div>`;
      main += '</div>';
      el.innerHTML = head + `<div class="side"><div>${main}</div>${side}</div>`;
      const n = $('#n', el);
      if (n) { if (P.id === 'code' || P.id === 'test') enhanceEditor(n, { autoIndent: false }); n.focus(); }
      if (P.mins && timerPhase !== ph) { timer = startTimer(clock, P.mins * 60, () => toast(`⏰ ${P.name}: time to move on`)); timerPhase = ph; }
      const store = storeCur = () => {
        if (P.id === 'clarify') notes.clarify = n.value;
        if (P.id === 'plan') { notes.plan = n.value; notes.ct = $('#ct', el).value; notes.cs = $('#cs', el).value; }
        if (P.id === 'code') notes.code = n.value;
        if (P.id === 'test') { notes.code = n.value; notes.test = $('#n2', el).value; }
      };
      $('#nextp', el) && ($('#nextp', el).onclick = () => { store(); ph++; draw(); });
      $('#mpad', el) && ($('#mpad', el).onchange = e => { store(); const was = notes.mode; notes.mode = S.settings.pad = e.target.value; save();
        if (!notes.code || notes.code === padStarter(p, was)) notes.code = undefined; draw(); });
      $('#rec', el) && ($('#rec', el).onclick = toggleRec);
      if (P.id === 'score') scorePhase();
    };
    const toggleRec = async () => {
      storeCur && storeCur();
      if (rec) { rec.stop(); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunks = []; rec = new MediaRecorder(stream);
        rec.ondataavailable = e => chunks.push(e.data);
        rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); audioUrl = URL.createObjectURL(new Blob(chunks)); rec = null; draw(); toast('Recording saved below (this session only)'); };
        rec.start(); draw(); toast('🎙 Recording: narrate everything');
      } catch (e) { toast('Microphone unavailable'); }
    };
    onRound(() => rec && rec.stop());
    const scorePhase = async () => {
      const r = await padRun(p, notes.mode, notes.code || '');
      const okT = notes.ct === p.time, okS = notes.cs === p.space;
      $('#res', el).innerHTML = padResultsHtml(notes.mode, r) + `<div class="reveal">You said time <b>${esc(notes.ct)}</b> ${okT ? '✓' : '✗'}, space <b>${esc(notes.cs)}</b> ${okS ? '✓' : '✗'}.
        Reference: ${esc(p.time)} / ${esc(p.space)}.<br>${patternTag(p.pattern)} ${esc(p.insight)}</div>
        <details><summary>Reference solution</summary><pre class="code">${esc(padSolution(p, notes.mode))}</pre></details>`;
      $('#save', el).onclick = () => {
        const scores = {}; let missing = false;
        for (const rb of C.rubric) { const v = $(`input[name="${rb.id}"]:checked`, el); if (!v) missing = true; else scores[rb.id] = +v.value; }
        if (missing) { toast('Score every row first'); return; }
        const avg = Object.values(scores).reduce((a, b) => a + b, 0) / C.rubric.length;
        S.mocks.push({ date: today(), problem: p.id, passed: !!r.ok, scores, avg: +avg.toFixed(2), complexity: okT && okS });
        done(r.ok && avg >= 3 ? 2 : r.ok || avg >= 2.5 ? 1 : 0);
      };
    };
    draw();
  },
};
