/* Pattern Gym · core.js: Utilities, progress storage, and the client that runs Python (server or Pyodide worker).
   Plain script (no modules): shares one global scope with the other files in index.html's order. */
'use strict';


// ─────────────────────────── utilities ───────────────────────────
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
// Smooth scrolling only when the reader hasn't asked for reduced motion.
const scrollMotion = () => matchMedia('(prefers-reduced-motion: no-preference)').matches ? 'smooth' : 'auto';
const fmtTime = s => `${Math.floor(Math.max(0, s) / 60)}:${pad(Math.floor(Math.max(0, s) % 60))}`;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1600); }
async function api(path, body) {
  const r = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}
// Two modes, picked at boot:
//  - server: `python server.py` is running. Content, code runs and progress go through /api/*.
//  - static: hosted as plain files (GitHub Pages). Content from content.json (built by build_static.py),
//    code runs in the browser (Pyodide worker), progress in this browser's localStorage.
// URLs are relative so the static build works under a sub-path like /pattern-gym/.
let SERVER = false;
async function loadContent() {
  try { const c = await api('/api/content'); SERVER = true; return c; }
  catch (e) { SERVER = false; return api('content.json'); }
}

// ── progress storage ──
const LS_KEY = 'pattern-gym-state';
async function loadState() {
  if (SERVER) return api('/api/state');
  try { navigator.storage?.persist?.(); } catch (e) { /* best effort: asks the browser not to evict our data */ }
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { return {}; }
}
function persist() {
  if (SERVER) return api('/api/state', S).catch(() => toast('Couldn’t save progress (is server.py running?)'));
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { toast('Couldn’t save progress in this browser'); }
}

// ── running code ──
let pyWorker = null, pyReady = null, pyLoaded = false;
function startPy() {
  pyLoaded = false;
  pyWorker = new Worker('py-worker.js');
  pyReady = new Promise((resolve, reject) => {
    pyWorker.onmessage = e => e.data.ready ? (pyLoaded = true, resolve()) : reject(new Error(e.data.error));
    pyWorker.onerror = e => reject(new Error(e.message || 'worker failed to start'));
  });
  pyReady.catch(() => {});
}
async function runPy(code, spec, timeoutMs) {
  if (!pyWorker) startPy();
  if (!pyLoaded) toast('Loading Python in your browser (first run only)...');
  try { await pyReady; }
  catch (e) { pyWorker.terminate(); pyWorker = null; return { ok: false, results: [], error: `Couldn’t load Python in the browser (${e.message}). Check your connection and try again.` }; }
  const w = pyWorker;
  return new Promise(resolve => {
    let progress = null;
    const t = setTimeout(() => {
      w.terminate(); startPy();  // the only way to stop an infinite loop in a worker
      resolve(progress ? slowResult(progress, timeoutMs / 1000)
        : { ok: false, results: [], error: `Time limit exceeded (${timeoutMs / 1000}s). Infinite loop or too slow?` });
    }, timeoutMs);
    w.onmessage = e => {
      if (e.data.progress) { progress = e.data.progress; return; }
      clearTimeout(t); if (e.data.fatal) { w.terminate(); startPy(); } resolve(e.data.result);
    };
    w.postMessage({ code, spec });
  });
}
// Same message as server.py's timeout_result: the visible examples passed, a large hidden test timed out.
function slowResult(pr, secs) {
  return { ok: false, slow: true, error: `Correct on every example, but too slow on ${pr.perf.charAt(0).toLowerCase() + pr.perf.slice(1)}. Look for repeated work, like an inner loop or recomputing the same thing, and aim for the target complexity.`,
    results: [{ pass: true, input: `All ${pr.visible} examples passed` }, { pass: false, hidden: true, input: pr.perf, error: `Too slow: still running after ${secs} s` }] };
}
// Hidden large tests run after the examples (OA, cold solve, mock). Line Up and Fill the Gap skip them:
// there the structure is the reference's, so they would only add waiting time.
// blank: CoderPad mode, nothing pre-imported or predefined (runner's "blank" spec flag)
const runTests = (p, code, { hidden = true, blank = false } = {}) => {
  let spec = hidden ? p.tests : { ...p.tests, perf: undefined };
  if (blank) spec = { ...spec, blank: true };
  return SERVER ? api('/api/run', { id: p.id, code, hidden, blank }) : runPy(code, spec, 6000);
};
const runSyntax = (s, code) => SERVER ? api('/api/syntax', { id: s.id, code })
  : runPy(code, { kind: 'snippet', setup: s.setup, check: s.check }, 4000);
// A whole program (Python tab): run once per case on its stdin; returns what it printed for each.
const runScript = (code, cases) => SERVER ? api('/api/script', { code, cases })
  : runPy(code, { kind: 'script', cases }, 4000);
