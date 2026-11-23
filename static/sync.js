/* Optional cloud sync with Supabase (sign in with an emailed link).
   The local copy (localStorage or progress.json) is always the working copy; this keeps one row per user in the
   `progress` table and combines both sides with mergeState() (merge.js). Without config.js values or without
   network, the app simply works locally.
   Uses globals from app.js at call time: S, normalizeState, persist, renderHud, route, toast. */
'use strict';
const Cloud = (() => {
  const cfg = window.PG_CONFIG || {};
  let client = null, user = null, status = 'off', lastSync = null, lastError = null;
  let running = null, again = false, pushTimer = null;
  const PUSH_DELAY = 5000;

  function set(s, err) {
    if ((s === 'error' || s === 'offline') && s !== status && typeof announce === 'function') announce(s === 'error' ? 'Sync problem. Progress is still saved on this device.' : 'Offline. Progress will sync when you are back online.');
    status = s; lastError = err || null;
    try { renderHud(); } catch (e) { /* app not booted yet */ }
    const card = document.getElementById('acct');
    if (card) drawAccount(card);
  }

  function cleanUrl() {
    const q = new URLSearchParams(location.search);
    const err = q.get('error_description');
    if (q.has('code') || err) history.replaceState(null, '', location.pathname + location.hash);
    if (err) toast('Sign-in link failed: ' + err);
  }

  async function init() {
    if (!cfg.supabaseUrl || !cfg.supabaseKey) return;
    if (!window.supabase) { set('offline', 'Couldn’t load the sync library (offline?)'); return; }
    client = supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    let session = null;
    try { ({ data: { session } } = await client.auth.getSession()); }  // also finishes a sign-in link (?code=...)
    catch (e) { lastError = e.message; }
    cleanUrl();
    user = session?.user || null;
    client.auth.onAuthStateChange((event, s) => {
      const u = s?.user || null;
      if ((u && u.id) === (user && user.id)) return;
      user = u;
      // Don't call Supabase inside this callback (it can deadlock); defer.
      setTimeout(() => { if (user) { toast('Signed in as ' + user.email); sync(); } else set('signedout'); }, 0);
    });
    set(user ? 'idle' : 'signedout');
    addEventListener('online', () => sync());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });
    if (user) sync();
  }

  // Replace the contents of S in place (keeps references held by open pages) and save locally.
  function apply(merged) {
    if (JSON.stringify(merged) === JSON.stringify(S)) return false;
    for (const k of Object.keys(S)) if (!(k in merged)) delete S[k];
    Object.assign(S, merged);
    markSettingsSeen();
    persist(); renderHud();
    if (!location.hash.startsWith('#/play')) route();  // don't yank the page away mid-drill
    return true;
  }

  // Pull the cloud copy, combine with ours, save locally, push the result.
  function sync() {
    if (!client || !user) return Promise.resolve();
    clearTimeout(pushTimer); pushTimer = null;
    if (running) { again = true; return running; }
    running = (async () => {
      set('syncing');
      try {
        const { data, error } = await client.from('progress').select('data').eq('user_id', user.id).maybeSingle();
        if (error) throw error;
        const remote = data && data.data;
        const merged = normalizeState(remote ? mergeState(S, remote) : S);
        apply(merged);
        if (!remote || JSON.stringify(normalizeState(remote)) !== JSON.stringify(S)) await push();
        lastSync = new Date(); set('synced');
      } catch (e) {
        set(navigator.onLine === false ? 'offline' : 'error', e.message || String(e));
      }
    })();
    return running.finally(() => { running = null; if (again) { again = false; sync(); } });
  }

  async function push() {
    const { error } = await client.from('progress')
      .upsert({ user_id: user.id, data: S, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  // After a local change: sync once things go quiet.
  function schedule() {
    if (!client || !user) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(sync, PUSH_DELAY);
  }

  // Restore / reset: make the cloud match this copy instead of combining with it.
  async function overwrite() {
    if (!client || !user) return;
    clearTimeout(pushTimer);
    try { set('syncing'); await push(); lastSync = new Date(); set('synced'); }
    catch (e) { set('error', e.message || String(e)); }
  }

  async function signIn(email) {
    const { error } = await client.auth.signInWithOtp({
      email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true },
    });
    if (error) throw error;
  }

  async function signOut() {
    clearTimeout(pushTimer);
    await client.auth.signOut();
    user = null; set('signedout');
  }

  // ── UI: header pill + Settings card ──
  function pill() {
    if (!client) return '';
    const t = lastSync ? 'Last synced ' + lastSync.toLocaleTimeString() : '';
    const map = {
      signedout: ['☁ Sign in', 'Sign in to sync progress across devices'],
      idle: ['☁', 'Signed in'], syncing: ['☁ …', 'Syncing'], synced: ['☁ ✓', t],
      offline: ['☁ offline', 'Offline: progress is saved here and syncs when you’re back online'],
      error: ['☁ !', 'Sync problem: ' + (lastError || '') + '. Progress is still saved here.'],
    };
    const [label, title] = map[status] || ['☁', ''];
    if (status === 'signedout')
      return `<button type="button" class="pill cloud signedout" data-signin data-key="i" title="${esc(title)} (I)">${esc(label)} <kbd>I</kbd></button>`;
    return `<a class="pill cloud ${status}" href="#/settings" title="${esc(title)}">${esc(label)}</a>`;
  }

  // Sign-in dialog: opens over the current page (header pill or the Settings card).
  function openSignIn() {
    if (!client) return;
    let dlg = document.getElementById('signin-dialog');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'signin-dialog';
      dlg.setAttribute('aria-labelledby', 'signin-title');
      document.body.append(dlg);
      // Click outside = close. Checks the dialog's box, so a click on its own padding doesn't close it.
      dlg.addEventListener('click', e => {
        if (e.target !== dlg) return;
        const r = dlg.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
      });
    }
    dlg.innerHTML = `<form method="dialog" class="dlg-x"><button class="ghost" aria-label="Close">✕</button></form>
      <h3 id="signin-title">Sign in to sync</h3>
      <p class="muted small">Keep your progress in sync across devices. We’ll email you a sign-in link: open it in
      <b>this same browser</b>. No password.</p>
      <form id="signin-form">
        <label class="small" for="signin-email">Email <span aria-hidden="true">*</span><span class="sr">(required)</span></label>
        <input type="email" id="signin-email" name="email" required autocomplete="email" inputmode="email" spellcheck="false" autocapitalize="off"
          aria-describedby="signin-err">
        <p class="small signin-err" id="signin-err" aria-live="polite"></p>
        <button class="primary" type="submit">Email me a sign-in link</button>
      </form>
      <p class="small" id="signin-msg" role="status"></p>`;
    const form = dlg.querySelector('#signin-form'), msg = dlg.querySelector('#signin-msg');
    const input = form.querySelector('#signin-email'), errBox = form.querySelector('#signin-err');
    const ERR_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M8 4v5M8 11.5v.5" stroke="var(--panel)" stroke-width="1.6" stroke-linecap="round"/></svg>';
    // One message per failure, shown and announced next to the field; the slot keeps its height so nothing jumps.
    const problem = () => input.validity.valueMissing ? 'Enter your email address.'
      : input.validity.typeMismatch ? 'That doesn’t look like an email address. It needs an @ and a domain, like name@example.com.' : '';
    const showErr = text => {
      errBox.innerHTML = text ? `${ERR_ICON}<span><span class="sr">Error: </span>${esc(text)}</span>` : '';
      input.setAttribute('aria-invalid', text ? 'true' : 'false');
    };
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') showErr(problem()); });
    form.noValidate = true;   // our messages instead of the browser's tooltip
    form.onsubmit = async e => {
      e.preventDefault();
      const bad = problem(); showErr(bad);
      if (bad) { input.focus(); return; }
      const btn = form.querySelector('button'), email = input.value.trim();
      btn.disabled = true; msg.textContent = 'Sending…'; msg.style.color = '';
      try {
        await signIn(email);
        form.hidden = true;
        msg.innerHTML = `✉️ Check <b>${esc(email)}</b> for a sign-in link, then open it in this browser. You can close this.`;
      } catch (err) {
        msg.textContent = 'Couldn’t send the link: ' + (err.message || err); msg.style.color = 'var(--bad)';
      }
      btn.disabled = false;
    };
    dlg.showModal();
    dlg.querySelector('#signin-email').focus();
  }
  document.addEventListener('click', e => {
    if (e.target.closest('[data-signin]')) { e.preventDefault(); openSignIn(); }
  });

  function drawAccount(card) {
    if (!client) { card.hidden = true; return; }
    card.hidden = false;
    if (!user) {
      card.innerHTML = `<h3>Account &amp; sync</h3>
        <p class="muted small">Sign in to keep your progress in sync across devices. No password: we email you a link.</p>
        <button class="primary" type="button" data-signin data-key="i">Sign in <kbd>I</kbd></button>`;
      return;
    }
    document.getElementById('signin-dialog')?.close();
    const when = lastSync ? 'Last synced ' + lastSync.toLocaleString() : status === 'syncing' ? 'Syncing…' : 'Not synced yet';
    card.innerHTML = `<h3>Account &amp; sync</h3>
      <p>Signed in as <b>${esc(user.email)}</b></p>
      <p class="muted small">${esc(when)}${status === 'error' ? ' · <span style="color:var(--bad)">' + esc(lastError || 'sync failed') + '</span>' : ''}
      ${status === 'offline' ? ' · offline, will sync when you’re back online' : ''}</p>
      <p class="muted small">Progress from every signed-in device is combined, never overwritten. Signing out keeps this browser’s copy.</p>
      <div class="row"><button id="syncnow">Sync now</button><button class="ghost" id="signout">Sign out</button></div>`;
    card.querySelector('#syncnow').onclick = () => sync();
    card.querySelector('#signout').onclick = async () => { await signOut(); toast('Signed out'); };
  }

  return {
    init, sync, schedule, overwrite, pill, drawAccount, openSignIn,
    get signedIn() { return !!user; },
    get enabled() { return !!client; },
  };
})();
