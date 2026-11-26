/* Pattern Gym · study-pages.js: Study screens: router, Big-O primer, home, course page.
   Plain script (no modules): shares one global scope with the other files in index.html's order. */
'use strict';

ROUTES.study = (app, [a, b], params) => {
  if (a === 'bigo') return studyBigO(app);
  if (a === 'solve' && b) return studySolve(app, b, params);
  if (a === 'guided' && b) return studyGuided(app, b);
  if (a === 'mixed') {
    const combo = params.combo === '1', pool = combo ? comboPool() : mixedPool(); if (!pool.length) return studyHome(app);
    const fresh = pool.filter(p => !attempted(p.id)), freshTwists = fresh.filter(p => p.twist_of);   // unseen twists are the truest test
    const pick = shuffle(freshTwists.length ? freshTwists : fresh.length ? fresh : pool)[0];
    location.replace(location.pathname + location.search + `#/study/solve/${pick.id}?mixed=1${combo ? '&combo=1' : ''}`);
    return;
  }
  if (a && b) return studyWalk(app, a, b, params);
  if (a) return studyCourse(app, a);
  studyHome(app);
};

// **bold** and `code` inside plain text (primers).
const inlineMd = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code class="hlc">$1</code>');
// Lines of prose: each line is a paragraph, and a run of lines starting "- " becomes one bulleted list.
function proseHtml(lines) {
  let h = '', list = [];
  const flush = () => { if (list.length) h += `<ul>${list.map(x => `<li>${inlineMd(x)}</li>`).join('')}</ul>`; list = []; };
  for (const l of lines) { if (l.startsWith('- ')) list.push(l.slice(2)); else { flush(); h += `<p>${inlineMd(l)}</p>`; } }
  flush(); return h;
}
function bigoHtml() {
  return C.bigo_primer.map(sec => `<section class="stage"><h2>${esc(sec.title)}</h2><div class="prose">${proseHtml(sec.paras)}</div>
    ${sec.title.startsWith('Read the constraints') ? `<table><tr><th>Constraint</th><th>Aim for</th><th>Usually means</th></tr>${C.input_size.map(r => `<tr><td class="mono">${esc(r[0])}</td><td class="mono">${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</table>` : ''}</section>`).join('');
}
const bigoMin = () => readMin(bigoHtml()) + C.bigo_check.length * 0.5;   // plus ~30 s to answer each check question
function studyBigO(app) {
  const first = studyOrder()[0];
  app.innerHTML = `<div class="study course"><a href="#/study" class="crumb">← Study</a>
    <div class="course-head"><h1>Big-O basics</h1>
      <p class="lede">Every lesson, walkthrough and interview talks about what code costs. This is the background they assume: read it once before your first course.</p>
      <p class="eta-row">${eta(bigoMin(), 'to read and check yourself')}</p></div>
    ${bigoHtml()}
    <section class="stage"><h2>Check yourself</h2><p class="muted">Answer each in your head, then open it.</p>
      ${C.bigo_check.map(([q, a]) => `<details class="check"><summary>${inlineMd(q)}</summary><p>${inlineMd(a)}</p></details>`).join('')}
      <p class="small">More: <a href="https://usaco.guide/bronze/time-comp" target="_blank" rel="noopener">Time complexity on the USACO Guide ↗</a> · the <a href="#/cheatsheet">Cheatsheet</a> has the cost of every Python operation.</p></section>
    <div class="row" style="margin-top:20px"><button class="${lessonDone('bigo') ? 'ghost' : 'good'}" id="mark" data-key="l">${lessonDone('bigo') ? 'Mark as not read' : '✓ Got it'} <kbd>L</kbd></button>
      <span class="spacer"></span><a class="btn primary" href="#/study/${first.id}" data-key="]">First course: ${esc(first.name)} → <kbd>]</kbd></a></div></div>`;
  $('#mark', app).onclick = () => {
    if (lessonDone('bigo')) { delete S.study.lessons.bigo; save(); studyBigO((app.innerHTML = '', app)); return; }
    S.study.lessons.bigo = today(); addXP(10); toast('⏱️ Big-O done +10 XP'); save(); location.hash = `#/study/${first.id}`;
  };
}

function studyHome(app) {
  const order = studyOrder();
  const nx = nextStudy(), cur = nx?.pattern, cp = checkpointDue();
  const studied = order.filter(p => lessonDone(p.id)).length, pool = mixedPool();
  const untried = pool.filter(p => !attempted(p.id)).length;
  const syntaxByTopic = {};
  for (const s of C.syntax) (syntaxByTopic[s.topic] ||= []).push(s);
  app.innerHTML = `<div class="study">
    <div class="study-head"><h1>Study</h1>
      <p class="lede">The course. Start at the top and go in order: each pattern is a short course with the idea, one worked example taken
        from the brute force to the final answer, guided problems, then problems you solve cold before seeing any explanation.</p></div>
    ${nx ? `<a class="continue" href="${nx.href}" data-key="c">
        ${!cur || nx.label.includes(cur.name) ? "" : `<span class="continue-pattern" style="color:${pc(cur.color)}">${esc(cur.name)}</span>`}
        <span class="continue-what">${esc(nx.label)} ${eta(nx.min)}</span>
        <span class="btn primary continue-go">${esc(nx.verb)} <kbd>C</kbd></span></a>`
      : `<div class="continue"><span class="continue-what">Every course is complete. Mixed practice is where you keep sharp now.</span></div>`}
    <section class="mixed ${pool.length ? '' : 'locked'}${cp ? ' due' : ''}">
      <div><h2>Mixed practice${cp ? ' <span class="tag">Checkpoint due</span>' : ''}</h2>
        <p>${pool.length ? `${cp ? `You’ve learned ${cp.n} patterns: time for a checkpoint. ` : ''}A random problem from the ${studied} pattern${studied > 1 ? 's' : ''} you’ve studied, with its name and pattern hidden, so you have to work out the approach yourself.
          ${untried} you haven’t tried yet. A checkpoint comes up after every ${CHECK_EVERY} lessons.`
          : 'Opens after your second lesson. It picks problems from every pattern you’ve studied and hides their names, so you work out the approach yourself, like in a real interview.'}</p></div>
      ${pool.length ? `<a class="btn${cp ? ' primary' : ''}" href="#/study/mixed" data-key="m">Start a mystery problem${etaIn(SOLVE_MIN.Medium)} <kbd>M</kbd></a>` : ''}</section>
    ${(() => { const cps = comboPool(), all = C.problems.filter(p => p.combo).length; return `<section class="mixed ${cps.length ? '' : 'locked'}">
      <div><h2>Combined problems</h2><p>${cps.length ? `${cps.length} of the ${all} problems that need two patterns at once are open: both their lessons are done. Interviews mix patterns like this (a binary search whose check is a greedy pass), so this is the hardest kind of recognition. Name and patterns stay hidden until you're done.`
        : `${all} problems need two patterns at once, like Koko Eating Bananas (Binary Search with a greedy check). Each opens when you've done both of its lessons.`}</p></div>
      ${cps.length ? `<a class="btn" href="#/study/mixed?combo=1" data-key="b">Start a combined problem${etaIn(SOLVE_MIN.Medium)} <kbd>B</kbd></a>` : ''}</section>`; })()}
    <section><h2>The path</h2>
      <p class="muted small">In order: each course builds on the ones before it (Recursion comes before trees, backtracking and DP; Heap before shortest paths).
        The bar under each shows its stages: the idea, worked example, guided, solo. The time is what’s left in each course.</p>
      ${(() => { const t = order.map(p => courseMins(p.id)); const b = bigoMin(); const left = t.reduce((a, x) => a + x.left, 0) + (lessonDone('bigo') ? 0 : b), all = t.reduce((a, x) => a + x.total, 0) + b;
        return `<p class="eta-row">${eta(left, left < all ? `left of ${fmtMin(all)} for the whole path` : 'for the whole path')}</p>`; })()}
      <ol class="path" data-navlist><li><a href="#/study/bigo" class="path-row primer-row${lessonDone('bigo') ? ' complete' : ''}" data-item>
          <span class="path-n">${lessonDone('bigo') ? '✓' : 0}</span>
          <span class="path-name"><b>Big-O basics</b><span class="small muted">before you start: what code costs</span></span>
          <span class="track" aria-hidden="true"><span class="seg"><i style="width:${lessonDone('bigo') ? 100 : 0}%"></i></span></span>
          <span class="path-eta">${lessonDone('bigo') ? '<span class="eta">Done</span>' : eta(bigoMin(), 'read')}</span></a></li>
        ${order.map((p, i) => { const pr = courseProgress(p.id);
        return `<li><a href="#/study/${p.id}" class="path-row${pr.complete ? ' complete' : ''}" data-item>
          <span class="path-n">${pr.complete ? '✓' : i + 1}</span>
          <span class="path-name"><b style="color:${pc(p.color)}">${esc(p.name)}</b><span class="small muted">${esc(p.triggers[0])}</span></span>
          <span class="track" role="img" aria-label="${esc(pr.stages.map(s => `${s.name} ${s.done} of ${s.of}`).join(', '))}">${pr.stages.map(s =>
            `<span class="seg" title="${esc(s.name)}: ${s.done} of ${s.of}"><i style="width:${Math.round(s.done / s.of * 100)}%"></i></span>`).join('')}</span>
          <span class="path-eta">${pr.complete ? '<span class="eta">Done</span>' : eta(courseMins(p.id).left, 'left')}</span></a></li>`; }).join('')}</ol></section>
    <section class="approach"><h2>The approach, for any problem</h2><p class="eta-row" data-read-of="section"></p>
      <p class="muted">When you don’t recognise a problem, walk these steps in order. Every walkthrough follows them and the cold-solve coach asks them.</p>
      <ol class="approach-steps">${APPROACH.map(a => `<li><b>${esc(a.t)}</b><span>${esc(a.d)}</span></li>`).join('')}</ol>
      <details><summary>Input size tells you the target complexity</summary>
        <table style="margin-top:8px"><tr><th>Constraint</th><th>Aim for</th><th>Usually means</th></tr>${C.input_size.map(r => `<tr><td class="mono">${esc(r[0])}</td><td class="mono">${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</table></details>
      ${C.method.length ? `<details><summary>More on turning a problem into pseudocode</summary>${C.method.map(m => `<h3>${esc(m.title)}</h3><ul>${m.points.map(pt => `<li>${md(pt)}</li>`).join('')}</ul>`).join('')}</details>` : ''}</section>
    <section class="refs"><h2>Reference</h2><p class="eta-row" data-read-of="section"></p>
      <p><a href="#/guide">Starter Guide</a>: the 8-week plan, a daily routine, and when to use LeetCode, NeetCode, Grind 75, USACO Guide and mock interviews.</p>
      <details><summary>Python cheat sheet</summary>
        ${Object.entries(syntaxByTopic).map(([t, cards]) => `<h3>${esc(t)}</h3>${cards.map(c => `<div class="small muted" style="margin-top:6px">${esc(c.prompt)}</div><pre class="code" style="margin:4px 0">${esc(c.answer)}</pre>`).join('')}`).join('')}</details>
      <details><summary>What to say out loud in an interview</summary>
        <ol>${C.think_aloud.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
        <h3>Questions to ask on any problem</h3><ul>${C.clarify_generic.map(t => `<li>${esc(t)}</li>`).join('')}</ul></details></section></div>`;
}

function probRow(x, role) {
  if (!x) return '';
  const solo = role === 'solo', locked = solo && !attempted(x.id);
  const done = solo ? attempted(x.id) : walked(x.id);
  const mins = solo ? solveMin(x) : role === 'learn' ? walkMin(x) : guidedMin(x);
  const note = PAT(x.pattern).course?.notes?.[x.id];
  return `<div class="prob-row" data-navrow><span class="prob-title">${esc(x.title)}${note ? `<small class="prob-note">${esc(note)}</small>` : ''}</span><span class="tag ${x.diff}">${x.diff}</span>${lcChip(x)}${eta(mins)}
    <span class="status ${done ? 'done' : 'todo'}">${solo ? (done ? 'tried' : 'not tried') : (done ? 'done' : 'to do')}</span><span class="spacer"></span>
    ${solo ? `<a class="btn ${done ? '' : 'primary'}" href="#/study/solve/${x.id}" data-item>Solve cold</a>
        <a class="btn ghost" href="#/study/${x.pattern}/${x.id}" title="${locked ? 'Unlocks after you try it' : 'See the approach'}">${locked ? '🔒 ' : ''}Walkthrough</a>`
      : `<a class="btn ${done ? '' : 'primary'}" href="${role === 'learn' ? `#/study/${x.pattern}/${x.id}` : `#/study/guided/${x.id}`}" data-item>${role === 'learn' ? 'Brute force to final answer' : 'Work through it'}</a>
        <a class="btn ghost" href="#/study/solve/${x.id}">Solve cold</a>`}</div>`;
}

function studyCourse(app, pid) {
  const p = PAT(pid); const L = p.lesson;
  if (!L) return studyHome(app);
  const order = studyOrder(), idx = order.findIndex(x => x.id === pid);
  const prev = order[idx - 1], next = order[idx + 1];
  const pr = courseProgress(pid), c = pr.c, nx = nextStep(pid);
  let n = 1;
  app.innerHTML = `<div class="study course" data-navlist><div class="row"><a href="#/study" class="crumb">← Study</a><span class="spacer"></span>
      <a class="crumb" href="#/patterns/${pid}">Pattern page: all ${C.problems.filter(x => x.pattern === pid).length} problems and your mastery →</a></div>
    <div class="course-head"><h1 style="color:${pc(p.color)}">${esc(p.name)}</h1>
      <ol class="stepper">${pr.stages.map(s => `<li class="${s.done >= s.of ? 'done' : s.done ? 'part' : ''}"><span>${esc(s.name)}</span><small>${s.done} of ${s.of}</small></li>`).join('')}</ol>
      ${nx ? `<div class="row"><a class="btn primary" href="${nx.href}" data-key="c">${esc(nx.verb)}${etaIn(nx.min)} <kbd>C</kbd></a><span class="muted small">${esc(nx.label)}</span></div>`
        : '<p class="status done">Course complete</p>'}
      ${(() => { const t = courseMins(pid); return `<p class="eta-row">${eta(t.left || t.total, t.left && t.left < t.total ? `left of ${fmtMin(t.total)} for this course` : 'for this course')}</p>`; })()}</div>
    <section class="stage"><h2><span class="n">${n++}</span>The idea ${eta(lessonMin(pid))}</h2>
      <p class="why">${esc(L.why)}</p>
      ${L.primer ? `<details class="primer"${lessonDone(pid) ? '' : ' open'}><summary>New to this? What this lesson assumes you know</summary>
        <div class="prose">${proseHtml(L.primer.text.split('\n'))}</div>${L.primer.more ? `<p class="small"><a href="${esc(L.primer.more)}" target="_blank" rel="noopener">Read it properly on the USACO Guide ↗</a></p>` : ''}</details>` : ''}
      <div class="two"><div><h3>Reach for it when you see</h3><ul>${p.triggers.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
        <div><h3>It’s a different pattern when</h3><ul>${L.not_this.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div></div>
      <h3>The skeleton, and the job of each line</h3>
      <p class="muted small">Every line does one of a handful of jobs. Different people write the same template in different orders, so learn the jobs,
        not the line order. Then rebuild it from memory with <a href="#/play/skeleton?problem=${pid}">Skeleton Recall</a>, which checks the jobs, not the exact lines.</p>
      ${pr.complete ? `<p class="fade-note">You’ve finished this course. Write the skeleton from memory first with
        <a href="#/play/skeleton?problem=${pid}">Skeleton Recall</a>, then open it below to check.</p><details class="faded"><summary>Show the skeleton</summary>` : ''}
      <div class="roles-key">${ROLES.map(r => `<span class="role role-${r.id}">${r.name}</span><span class="muted small">${r.q}</span>`).join('')}</div>
      <div class="build annotated">${L.build.map(([code, why], i, all) => { const r = lineRole(code, all.slice(0, i).some(([c]) => /^\s*(for|while)\b/.test(c)));
        return `<div class="bl"><span class="role role-${r}">${ROLES.find(x => x.id === r).name}</span><code>${hlOn() ? highlightLine(code) : esc(code)}</code><div class="why">${esc(why) || '&nbsp;'}</div></div>`; }).join('')}</div>
      ${pr.complete ? '</details>' : ''}
      <h3>To make it fit a specific problem, answer</h3><ol>${p.fill.map(f => `<li>${esc(f)}</li>`).join('')}</ol>
      <h3>Bugs to avoid</h3><ul>${L.bugs.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
      <div class="row"><button class="${lessonDone(pid) ? 'ghost' : 'good'}" id="mark" data-key="l">${lessonDone(pid) ? 'Mark as not learned' : '✓ I’ve got the idea'} <kbd>L</kbd></button></div></section>
    <section class="stage"><h2><span class="n">${n++}</span>Worked example</h2>
      <p class="muted">One problem taken from the obvious slow answer to the final one, a decision at a time. Type a guess before each reveal.</p>
      ${probRow(c.learn, 'learn')}</section>
    ${c.guided.length ? `<section class="stage"><h2><span class="n">${n++}</span>Guided</h2>
      <p class="muted">You make the decisions and the app checks each one: which pattern, how fast it has to be, then the key lines, run against the real tests.</p>
      ${c.guided.map(x => probRow(x, 'guided')).join('')}</section>` : ''}
    ${c.solo.length ? `<section class="stage"><h2><span class="n">${n++}</span>Solo, cold</h2>
      <p class="muted">Solve these from a blank editor first. Each walkthrough unlocks after a real attempt, so these stay problems you haven’t seen.</p>
      ${c.solo.map(x => probRow(x, 'solo')).join('')}</section>` : ''}
    ${c.transfer ? `<section class="stage"><h2><span class="n">${n++}</span>Transfer check</h2>
      <p class="muted">A twist on ${esc(PROB(c.transfer.twist_of)?.title || 'a problem above')} that appears nowhere else in the app: not in the games, not in a walkthrough.
        Solving it cold is the real sign you’ve learned the pattern and not just these problems.</p>
      ${probRow(c.transfer, 'solo')}</section>` : ''}
    <section class="stage"><h2>Keep it fresh</h2><p class="muted small">Short drills on just this pattern.</p>${drillButtons(pid)}</section>
    <div class="row" style="margin-top:20px">${prev ? `<a class="btn ghost" href="#/study/${prev.id}" data-key="[">← ${esc(prev.name)} <kbd>[</kbd></a>` : ''}<span class="spacer"></span>
      ${next ? `<a class="btn" href="#/study/${next.id}" data-key="]">${esc(next.name)} → <kbd>]</kbd></a>` : ''}</div></div>`;
  $('#mark', app).onclick = () => {
    if (lessonDone(pid)) delete S.study.lessons[pid];
    else { S.study.lessons[pid] = today(); addXP(10); toast('📖 Idea learned +10 XP'); }
    save(); studyCourse((app.innerHTML = '', app), pid);
  };
}

// Other valid approaches (content/alternatives.py): the patterns they use, and how the walkthrough shows them.
const altPatterns = p => [...new Set((p.also || []).map(a => a.pattern).filter(x => x && x !== p.pattern))];
function altsHtml(p) {
  return `<p class="muted small">Interviewers like hearing a second approach and why you'd choose between them. Every one below passes the tests.</p>`
    + p.also.map(a => `<div class="alt"><div class="alt-h">${a.pattern && a.pattern !== p.pattern ? patternTag(a.pattern) : ''}<b>${esc(a.name)}</b>
        <span class="mono small muted">Time ${esc(a.time)} · Space ${esc(a.space)}</span></div>
      <p>${inlineMd(a.how)}</p><p class="muted small"><b>When:</b> ${inlineMd(a.when)}</p>
      ${a.code ? `<details><summary class="small">Show the code</summary><pre class="code">${hlOn() ? highlightCode(a.code) : esc(a.code)}</pre></details>` : ''}</div>`).join('');
}
