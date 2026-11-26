/* Pattern Gym · boot.js: Boot: load content and progress, then draw the first page. Loaded last.
   Plain script (no modules): shares one global scope with the other files in index.html's order. */
'use strict';

// ─────────────────────────── boot ───────────────────────────
(async () => {
  try {
    C = await loadContent();
    // Twist problems (one per pattern) stay out of the games and the course lessons: they are the transfer check.
    C.twists = C.problems.filter(p => p.twist_of);
    C.problems = C.problems.filter(p => !p.twist_of);
    C.everyProblem = [...C.problems, ...C.twists];
    S = normalizeState(await loadState());
  } catch (e) { $('#app').innerHTML = '<div class="card">Can’t load content. Locally, is <code>python server.py</code> running? For static hosting, run <code>python build_static.py</code> first.</div>'; return; }
  markSettingsSeen();
  renderHud(); route();
  Cloud.init().catch(e => console.warn('sync init failed', e));
  if (!SERVER) setTimeout(() => { if (!pyWorker) startPy(); }, 1500);  // warm up Python so the first Run is quick
})();
