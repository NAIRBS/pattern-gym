/* Pattern Gym · shell.js: Header HUD, hash router and the keyboard layer (key bar, shortcuts, G + letter).
   Plain script (no modules): shares one global scope with the other files in index.html's order. */
'use strict';

// ─────────────────────────── HUD + router ───────────────────────────
function renderHud() {
  if (!S) return;
  document.body.classList.toggle('keys-off', !singleKeysOn());
  const l = level(S.xp), u = urgency();
  const into = S.xp - levelFloor(l), span = levelFloor(l + 1) - levelFloor(l);
  $('#hud').innerHTML = `
    <span class="pill ${u.mode}" title="Set in Settings">${esc(u.label)}</span>
    <span class="pill" title="Streak (best ${S.streak.best || 0})">🔥 ${S.streak.last === today() || S.streak.last === addDays(today(), -1) ? S.streak.count : 0}</span>
    <span class="pill hud-lv" title="${into}/${span} XP to next level">Lv ${l} · ${S.xp} XP</span>${Cloud.pill()}`;
}
const ROUTES = {};
// Brand new here: no attempts, no XP, and the Starter Guide never opened.
function isNewcomer() {
  let seen = false; try { seen = localStorage.getItem('pg-guide-seen') === '1'; } catch (e) {}
  return !seen && !S.xp && !Object.keys(S.study.attempts).length;
}
let cleanup = [];
function onLeave(fn) { cleanup.push(fn); }
function route() {
  cleanup.forEach(f => { try { f(); } catch (e) {} }); cleanup = [];
  if (!location.hash && isNewcomer()) { location.replace('#/guide'); return; }   // fires hashchange → route()
  const [path, qs] = (location.hash.slice(1) || '/today').split('?');
  const parts = path.split('/').filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  $$('nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === parts[0] || (parts[0] === 'play' && a.dataset.nav === 'games')));
  const app = $('#app'); app.innerHTML = '';
  (ROUTES[parts[0]] || ROUTES.today)(app, parts.slice(1), params);
  paintReadTimes(app);
  $$('nav a').forEach(a => a.classList.contains('active') ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  const h1 = $('#app h1');
  document.title = (h1 ? h1.textContent.replace(/\s+/g, ' ').trim() + ' · ' : '') + 'Pattern Gym';
  if (h1 && !app.contains(document.activeElement)) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
// Phones: the first four tabs show, the rest sit behind "More" (the current tab always shows).
document.querySelector('.nav-more')?.addEventListener('click', e => {
  const nav = e.currentTarget.closest('nav'), open = nav.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', open); e.currentTarget.textContent = open ? 'Less' : 'More';
});
window.addEventListener('hashchange', () => { const nav = $('header nav'); nav?.classList.remove('open'); const m = $('.nav-more'); if (m) { m.setAttribute('aria-expanded', 'false'); m.textContent = 'More'; } });
// Reading-time chips: [data-read-of="section"] shows the reading time of its enclosing section, #page-eta the
// whole page's. A page that shows no time anywhere gets its reading time under its heading.
function paintReadTimes(app) {
  for (const el of $$('[data-read-of]', app)) { const box = el.closest(el.dataset.readOf); if (box) el.innerHTML = eta(readMin(box), 'read'); }
  const pe = $('#page-eta', app); if (pe) pe.outerHTML = eta(readMin(app), 'read');
  if (!$('.eta', app)) {
    const h1 = $('h1', app);
    if (h1 && !h1.closest('.gamehead')) h1.insertAdjacentHTML('afterend', `<p class="eta-row page-eta">${eta(readMin(app), 'read')}</p>`);
  }
}
// Skip link: a button (a "#main" link would fight the hash router), moves focus into the page.
document.getElementById('skip')?.addEventListener('click', () => $('#app').focus());

// ─────────────────────────── keyboard ───────────────────────────
// Single keys work whenever you're not typing; Esc leaves a text box so they work again.
// "g" then a letter jumps to a page. Buttons opt in with data-key="x" (shown as <kbd>X</kbd>).
const NAV_KEYS = { t: ['today', 'Today'], s: ['study', 'Study'], g: ['games', 'Games'], p: ['problems', 'Problems'],
  a: ['patterns', 'Patterns'], y: ['python', 'Python'], c: ['cheatsheet', 'Cheatsheet'], u: ['guide', 'Starter Guide'], x: ['stats', 'Stats'], ',': ['settings', 'Settings'] };
const KEY_HELP = [
  ['Anywhere', [['?', 'This list'], ['/', 'Search problems'], ['g then t s g p a y c u x ,', 'Go to Today, Study, Games, Problems, Patterns, Python, Cheatsheet, Starter Guide, Stats, Settings'],
    ['E', 'Jump into the code editor / answer box'], ['Esc', 'Leave the editor (then single keys work)'], ['Q', 'Exit the game'], ['Tab', 'Next control']]],
  ['In a game', [['Ctrl+Enter', 'Run / check / score'], ['R', 'Run / check (when not typing)'], ['H', 'Hint'], ['A', 'Show / hide the answer'],
    ['N', 'Next question / next game when a round ends'], ['R', 'Another round (end of a round)'], ['[', 'Previous question (undoes its grade)'], ['1 2 3', 'Grade: Blanked / Shaky / Nailed'], ['1-4', 'Pick an option (Sprint, Big-O)']]],
  ['Line Up', [['↑ ↓', 'Move between lines'], ['← →', 'Switch column'], ['Enter / Space', 'Move the line to the other column'], ['Alt+↑ ↓', 'Reorder a line in your solution']]],
  ['Study', [['C', 'Continue with your next step'], ['M', 'Start a mystery problem (mixed practice)'], ['Space', 'Reveal the next step / skeleton line'],
    ['Ctrl+Enter', 'Reveal, while typing your guess'], ['C F L', 'After a walkthrough: solve cold, Fill the Gap, Line Up'], ['W', 'See the walkthrough'],
    ['[ ]', 'Previous / next pattern or problem'], ['B', 'Back to the course']]],
  ['Pages', [['S', 'Today: start / continue the plan'], ['L', 'Today: open today’s lesson'], ['1-9', 'Today: start a practice block · Games: play a game · Course: start a drill'],
    ['↑ ↓', 'Move through any list (path, problems, patterns); Enter opens'], ['R', 'Pattern: recall its skeleton · Settings: restore a backup'],
    ['B', 'Settings: download a backup'], ['I', 'Settings: sign in']]],
  ['Problems', [['/', 'Jump to the search box'], ['Esc', 'Clear the search, press again to leave the box'], ['↓ ↑', 'Move through the results'], ['Enter', 'Solve the selected problem']]],
];
function showKeys() {
  let dlg = document.getElementById('keys-dialog');
  if (!dlg) {
    dlg = document.createElement('dialog'); dlg.id = 'keys-dialog'; dlg.className = 'modal'; dlg.setAttribute('aria-labelledby', 'keys-title');
    dlg.innerHTML = `<form method="dialog" class="dlg-x"><button class="ghost" aria-label="Close">✕</button></form><h3 id="keys-title">Keyboard shortcuts</h3>
      ${KEY_HELP.map(([h, rows]) => `<h4>${h}</h4><table class="keys">${rows.map(([k, d]) => `<tr><td>${k.split(' ').map(x => `<kbd>${esc(x)}</kbd>`).join(' ')}</td><td>${esc(d)}</td></tr>`).join('')}</table>`).join('')}`;
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    document.body.append(dlg);
  }
  dlg.showModal();
}
// Ask before something you can't easily take back. Resolves true only for the risky choice.
// Its key (or Enter on it) confirms; Esc, a click outside, or the safe button cancels, which has focus first.
function confirmBox({ title, msg, yes, yesKey, no = 'Cancel' }) {
  return new Promise(resolve => {
    let dlg = document.getElementById('confirm-dialog');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'confirm-dialog'; dlg.className = 'modal quit';
      dlg.setAttribute('aria-labelledby', 'confirm-title'); dlg.setAttribute('aria-describedby', 'confirm-msg');
      dlg.innerHTML = `<h3 id="confirm-title"></h3><p id="confirm-msg" class="muted"></p>
        <div class="row quit-actions"><button type="button" class="primary" data-a="no"></button>
        <button type="button" class="danger" data-a="yes"></button></div>`;
      // Answer straight away rather than waiting for the close event, which a background tab can hold back.
      const answer = v => { const done = dlg._done; dlg._done = null; if (dlg.open) dlg.close(v); done?.(v === 'yes'); setTimeout(paintKeybar, 0); };
      dlg.addEventListener('click', e => {
        if (e.target === dlg) answer('no');
        const a = e.target.closest('[data-a]'); if (a) answer(a.dataset.a);
      });
      dlg.addEventListener('keydown', e => {
        if (e.key.toLowerCase() === dlg.dataset.key && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); answer('yes'); }
      });
      dlg.addEventListener('cancel', e => { e.preventDefault(); answer('no'); });   // Esc
      dlg.addEventListener('close', () => answer('no'));                            // closed any other way
      document.body.append(dlg);
    }
    $('#confirm-title', dlg).textContent = title;
    $('#confirm-msg', dlg).textContent = msg;
    $('[data-a="no"]', dlg).innerHTML = `${esc(no)} <kbd>Esc</kbd>`;
    $('[data-a="yes"]', dlg).innerHTML = `${esc(yes)} <kbd>${yesKey.toUpperCase()}</kbd>`;
    dlg.dataset.key = yesKey.toLowerCase();
    dlg._done = resolve;
    dlg.showModal(); $('[data-a="no"]', dlg).focus();
  });
}
// Leaving mid-round: any control with data-exit-confirm="<what is lost>" asks first.
const confirmQuit = msg => confirmBox({ title: 'Quit now?', msg, yes: 'Quit', yesKey: 'q', no: 'Keep going' });
document.addEventListener('click', e => {
  const el = e.target.closest?.('[data-exit-confirm]');
  if (!el || el._quitOk) return;
  e.preventDefault(); e.stopImmediatePropagation();
  confirmQuit(el.dataset.exitConfirm).then(ok => { if (ok) { el._quitOk = true; el.click(); el._quitOk = false; } });
}, true);
let gAt = 0;
document.addEventListener('keydown', e => {
  if (e.defaultPrevented) return;
  if (isTyping(e.target)) { if (e.key === 'Escape' && !e.target.closest('dialog')) { e.target.blur(); setTimeout(paintEdBtn, 0); } return; }
  if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
  if (!singleKeysOn() && e.key.length === 1) return;
  if (e.key === 'Escape' && inEditor()) { document.activeElement.blur(); paintEdBtn(); return; }  // Line Up lines
  if (gAt && Date.now() - gAt < 1500 && NAV_KEYS[e.key]) { gAt = 0; disarmG(); e.preventDefault(); location.hash = '#/' + NAV_KEYS[e.key][0]; return; }
  gAt = 0; disarmG();
  if (e.key === 'g') { gAt = Date.now(); armG(); return; }
  if (e.key === '?') { e.preventDefault(); showKeys(); return; }
  if (e.key === '/') { e.preventDefault(); if (location.hash.startsWith('#/problems')) $('#q')?.focus(); else location.hash = '#/problems'; return; }
  if (e.key === 'e' && focusEditor()) { e.preventDefault(); setTimeout(paintEdBtn, 0); return; }
  if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key) && navListKey(e)) return;
  if (e.key === ' ' && e.target.closest?.('button, a, summary, [role=option], [role=listbox]')) return;  // Space already clicks a focused control
  const b = $$('#app [data-key], header [data-key]').find(b => b.dataset.key === e.key.toLowerCase() && b.offsetParent && !b.disabled);
  if (b) { e.preventDefault(); b.click(); }
});
document.querySelector('[data-help]')?.addEventListener('click', showKeys);
let gTimer = null;
function armG() { document.body.classList.add('g-armed'); clearTimeout(gTimer); gTimer = setTimeout(() => { gAt = 0; disarmG(); }, 1500); paintEdBtn(); }
function disarmG() { if (!document.body.classList.contains('g-armed')) return; document.body.classList.remove('g-armed'); clearTimeout(gTimer); paintEdBtn(); }
// Lists: ↑/↓ move between items (←/→ too in grids); the first ↓ on a page enters its first list.
function navListKey(e) {
  const items = l => $$('[data-item]', l).filter(i => i.offsetParent);
  const cur = document.activeElement?.closest?.('[data-navlist]');
  if (cur && document.activeElement.matches('[data-item]')) {
    const grid = cur.dataset.navlist === 'grid', list = items(cur), k = list.indexOf(document.activeElement);
    let j;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const cols = grid ? (list.filter(i => i.offsetTop === list[0].offsetTop).length || 1) : 1;
      j = k + (e.key === 'ArrowDown' ? cols : -cols);
    } else if (grid) j = k + (e.key === 'ArrowRight' ? 1 : -1);
    else return false;
    e.preventDefault(); list[Math.max(0, Math.min(list.length - 1, j))]?.focus(); return true;
  }
  if (e.key !== 'ArrowDown' || document.activeElement?.closest?.('#app a, #app button, #app summary')) return false;
  const first = $$('#app [data-navlist]').map(items).find(l => l.length)?.[0];
  if (!first) return false;
  e.preventDefault(); first.focus(); return true;
}

// Editor toggle: E jumps into the page's main editor (code box, gap inputs, Line Up lines), Esc leaves it.
const EDITOR_SEL = '#app textarea:not([readonly]), #app .fill input:not([readonly]), #app .lines .ln[tabindex="0"], #app .lines[tabindex="0"]';
let lastEditor = null;
const editorOnPage = () => $$(EDITOR_SEL).filter(x => x.offsetParent);
function focusEditor() {
  const list = editorOnPage().sort((a, b) => b.classList.contains('code') - a.classList.contains('code')); if (!list.length) return false;
  const target = lastEditor && list.includes(lastEditor) ? lastEditor : list[0];
  target.focus(); return true;
}
const inEditor = () => !!document.activeElement?.closest?.('#app') && document.activeElement.matches(EDITOR_SEL.replaceAll('#app ', ''));

// Key bar: always on screen (desktop), lists exactly the keys that work on this screen right now.
// Every chip is also clickable, so it doubles as a button and teaches the key at the same time.
const keybar = document.createElement('nav');
keybar.id = 'keybar'; keybar.setAttribute('aria-label', 'Keyboard shortcuts for this screen');
document.body.append(keybar);
let introSeen = false; try { introSeen = localStorage.getItem('pg-keybar-intro') === '1'; } catch (e) {}
let kbMin = false; try { kbMin = localStorage.getItem('pg-keybar-min') === '1'; } catch (e) {}
const keyName = k => ({ ' ': 'Space', '[': '[', ',': ',' }[k] || k.toUpperCase());
const chipLabel = el => {
  const c = (el.querySelector('.btn') || el).cloneNode(true); c.querySelectorAll('kbd').forEach(k => k.remove());
  const t = c.textContent.replace(/[←→✓💻✍️🧩⚡🦴🎲▶]/gu, '').replace(/\s+/g, ' ').trim();
  return t.length > 24 ? t.slice(0, 23) + '…' : t;
};
let kbTargets = [];
function paintKeybar() {
  const chips = []; kbTargets = [];
  const off = !singleKeysOn();
  const add = (keys, label, act, cls = '') => { if (off && keys[0].length === 1 && !'↑↓←→'.includes(keys[0])) return; kbTargets.push(act); chips.push(`<button type="button" class="kchip ${cls}" data-k="${kbTargets.length - 1}" tabindex="-1">${keys.map(k => `<kbd>${esc(k)}</kbd>`).join('')}<span>${esc(label)}</span></button>`); };
  if (editorOnPage().length) {
    if (inEditor()) add(['Esc'], 'leave the editor', () => document.activeElement.blur(), 'on');
    else add(['E'], 'go to the editor', () => focusEditor());
  }
  if (inEditor() && $('#ws-submit')) {   // the solve workspace: Run (examples) and Submit (graded)
    if ($('#ws-run')) add(['Ctrl', "'"], 'run the examples', () => $('#ws-run:not([disabled])')?.click());
    add(['Ctrl', 'Enter'], 'submit', () => $('#ws-submit:not([disabled])')?.click());
  } else if (inEditor()) add(['Ctrl', 'Enter'], 'run / check', () => $('#app [data-key="r"]:not([disabled])')?.click());
  const ae = document.activeElement, typing = isTyping(ae) && !inEditor();
  if (document.body.classList.contains('g-armed')) {
    for (const [k, [route, name]] of Object.entries(NAV_KEYS)) add([keyName(k)], name, () => { disarmG(); location.hash = '#/' + route; }, 'on');
    keybar.innerHTML = chips.join(''); return;
  }
  if (typing) {
    const search = ae.type === 'search' || ae.id === 'q';
    add(['Esc'], search && ae.value ? 'clear the search' : search ? 'leave the search box' : 'leave the text box',
      () => { if (search && ae.value) { ae.value = ''; ae.dispatchEvent(new Event('input')); } else ae.blur(); }, 'on');
    if (search) { add(['↓'], 'into the results', () => {}); add(['Enter'], 'open the first result', () => {}); }
  }
  const seen = new Set(), groups = {};
  for (const b of $$('#app [data-key]')) {
    const k = b.dataset.key;
    if (seen.has(k) || !b.offsetParent || b.disabled || ((inEditor() || typing) && k !== 'q')) continue;
    seen.add(k);
    if (b.dataset.kgroup) { (groups[b.dataset.kgroup] ||= []).push(k); continue; }
    add([keyName(k)], chipLabel(b), () => b.click());
  }
  for (const [label, ks] of Object.entries(groups)) add(ks.length > 1 ? [ks[0], '–', ks[ks.length - 1]] : ks, label, () => {});
  if (!inEditor() && !typing && $$('#app [data-navlist] [data-item]').some(i => i.offsetParent)) add(['↑', '↓'], 'move through the list, Enter opens', () => {});
  if (!inEditor()) {
    if ($$('#app .gradebar [data-q]').some(b => b.offsetParent && !b.disabled)) add(['1', '2', '3'], 'grade: blanked / shaky / nailed', () => {});
    if ($$('#app .options button').some(b => b.offsetParent && !b.disabled) && !Object.values(groups).some(ks => ks.includes('1'))) add(['1', '–', '4'], 'pick an option', () => {});
    if ($('#app .parsons')) add(['↑', '↓', 'Enter'], 'move and place lines', () => {}, 'wide');
  }
  if (!inEditor() && !typing) {
    add(['G'], 'then a tab’s letter to change page', () => armG());
    add(['/'], 'search problems', () => { location.hash = '#/problems'; });
  }
  add(['?'], 'all shortcuts', () => showKeys());
  if (off) chips.push('<span class="kintro">Single-key shortcuts are off. Turn them on in Settings.</span>');
  keybar.classList.toggle('min', kbMin);
  if (kbMin) { keybar.innerHTML = '<button type="button" class="kchip kb-toggle" aria-label="Show the keyboard bar"><kbd>⌨</kbd><span>keys</span></button>'; return; }
  keybar.innerHTML = (introSeen ? '' : `<span class="kintro">Keys for this screen:
      <button type="button" class="kintro-x" aria-label="Got it, hide this tip">Got it</button></span>`) + chips.join('')
    + '<button type="button" class="kchip kb-toggle" aria-label="Hide the keyboard bar" title="Hide this bar (? still lists every key)"><span>Hide</span></button>';
}
keybar.addEventListener('mousedown', e => e.preventDefault());   // keep focus where it is
keybar.addEventListener('click', e => {
  if (e.target.closest('.kintro-x')) { introSeen = true; try { localStorage.setItem('pg-keybar-intro', '1'); } catch (er) {} paintKeybar(); return; }
  if (e.target.closest('.kb-toggle')) { kbMin = !kbMin; try { localStorage.setItem('pg-keybar-min', kbMin ? '1' : '0'); } catch (er) {} paintKeybar(); return; }
  const c = e.target.closest('.kchip'); if (c) { kbTargets[+c.dataset.k]?.(); setTimeout(paintKeybar, 0); }
});
const paintEdBtn = () => { clearTimeout(paintEdBtn._t); paintEdBtn._t = setTimeout(paintKeybar, 30); };
document.addEventListener('focusin', e => { if (e.target.matches?.(EDITOR_SEL.replaceAll('#app ', '')) && e.target.closest('#app')) lastEditor = e.target; paintEdBtn(); });
document.addEventListener('focusout', () => setTimeout(paintEdBtn, 0));
window.addEventListener('hashchange', () => { lastEditor = null; setTimeout(paintEdBtn, 50); });
let preTimer = null;
new MutationObserver(() => { clearTimeout(preTimer); preTimer = setTimeout(() => $$('#app pre.code, #app code.hlc').forEach(pre => { if (!pre.closest('.ed') && pre.dataset.painted == null) paintPre(pre); }), 0); })
  .observe(document.getElementById('app'), { childList: true, subtree: true });
new MutationObserver(() => paintEdBtn()).observe(document.getElementById('app'), { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'hidden'] });
