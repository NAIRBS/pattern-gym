/* Runs user code in the browser with Pyodide (static hosting, no server.py).
   Loads the same runner.py the local server uses (copied next to this file by build_static.py).
   The page terminates and recreates this worker on timeout, which is what stops infinite loops. */
'use strict';
const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
importScripts(PYODIDE + 'pyodide.js');

let runJson = null;

(async () => {
  try {
    const py = await loadPyodide({ indexURL: PYODIDE });
    py.setStdout({ batched: () => {} });  // user print() output isn't shown, same as local mode
    py.setStderr({ batched: () => {} });
    const res = await fetch('runner.py');
    if (!res.ok) throw new Error(`runner.py: HTTP ${res.status}`);
    const ns = py.toPy({ __name__: 'runner' });  // not __main__, so runner.main() doesn't fire
    py.runPython(await res.text(), { globals: ns });
    runJson = ns.get('run_json');
    postMessage({ ready: true });
  } catch (e) {
    postMessage({ ready: false, error: String(e && e.message || e) });
  }
})();

onmessage = e => {
  const { code, spec } = e.data;
  try {
    postMessage({ result: JSON.parse(runJson(JSON.stringify({ code, spec }))) });
  } catch (err) {
    // Python exceptions are caught inside runner.run(); anything reaching here (e.g. a stack
    // overflow from very deep recursion) can leave the interpreter broken, so ask for a fresh worker.
    const msg = String(err && err.message || err).split('\n').filter(Boolean).pop() || 'Python crashed';
    postMessage({ fatal: true, result: { ok: false, results: [], error: 'Crashed: ' + msg + '. Very deep recursion?' } });
  }
};
