/* Pattern Gym · boot.js: Boot: load content and progress, then draw the first page. Loaded last.
   Plain script (no modules): shares one global scope with the other files in index.html's order. */
'use strict';

// ─────────────────────────── loading screen ───────────────────────────
// index.html shows it before any script runs; here it gets its steps, a tip, a slow-load note and a retry.
const BOOT_TIPS = [
  'Say the brute force out loud first, then improve it.',
  'Before you code, run your idea on the example by hand.',
  'Stuck? Ask what sorting, a hash map or two pointers would give you.',
  'Check the edges: empty input, one element, duplicates, negatives.',
  'State the time and space complexity before you’re asked.',
  'collections.Counter and defaultdict save you lines in Python.',
  'heapq is a min-heap. Push negatives to get a max-heap.',
  'Python’s recursion limit is about 1000. Deep inputs need your own stack.',
  'Name the pattern before you write a line. That’s half the problem.',
];
const bootStep = msg => { const el = document.getElementById('boot-step'); if (el) el.textContent = msg; };
function bootTip() {
  const el = document.getElementById('boot-tip'); if (!el) return;
  el.innerHTML = `<b>Tip</b> ${esc(BOOT_TIPS[Math.floor(Math.random() * BOOT_TIPS.length)])}`; el.hidden = false;
}
function bootFailed(e) {
  console.error('boot failed', e);
  const app = $('#app'); app.removeAttribute('aria-busy');
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  app.innerHTML = `<div class="boot boot-err"><span class="logo boot-logo" aria-hidden="true">{}</span>
    <h1 class="boot-title">Couldn’t load Pattern Gym</h1>
    <p class="muted">${navigator.onLine === false ? 'You seem to be offline. Reconnect, then try again.' : 'The problems didn’t arrive. Check your connection and try again.'}
      Your progress is safe: it’s saved in this browser.</p>
    <button type="button" class="primary" id="boot-retry">Try again <kbd>Enter</kbd></button>
    ${local ? `<details class="small muted"><summary>Running it yourself?</summary><p>Start <code>python server.py</code>, or for static
      hosting run <code>python build_static.py</code> first. Error: ${esc(e?.message || String(e))}</p></details>` : ''}</div>`;
  const btn = $('#boot-retry'); btn.onclick = () => location.reload(); btn.focus();
}

// ─────────────────────────── boot ───────────────────────────
(async () => {
  bootTip();
  const slow = setTimeout(() => bootStep('Still loading. A slow connection can take a few more seconds…'), 8000);
  try {
    bootStep('Loading the problems and patterns…');
    C = await loadContent();
    // Twist problems (one per pattern) stay out of the games and the course lessons: they are the transfer check.
    C.twists = C.problems.filter(p => p.twist_of);
    C.problems = C.problems.filter(p => !p.twist_of);
    C.everyProblem = [...C.problems, ...C.twists];
    bootStep('Loading your progress…');
    S = normalizeState(await loadState());
  } catch (e) { clearTimeout(slow); return bootFailed(e); }
  clearTimeout(slow);
  markSettingsSeen();
  renderHud(); route();
  $('#app').removeAttribute('aria-busy');
  Cloud.init().catch(e => console.warn('sync init failed', e));
  if (!SERVER) setTimeout(() => { if (!pyWorker) startPy(); }, 1500);  // warm up Python so the first Run is quick
})();
