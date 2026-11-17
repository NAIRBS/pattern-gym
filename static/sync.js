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
    return `<a class="pill cloud ${status}" href="#/settings" title="${esc(title)}">${esc(label)}</a>`;
  }

  function drawAccount(card) {
    if (!client) { card.hidden = true; return; }
    card.hidden = false;
    if (!user) {
      card.innerHTML = `<h3>Account &amp; sync</h3>
        <p class="muted small">Sign in to keep your progress in sync across devices. We email you a sign-in link; open it
        in this same browser. No password.</p>
        <form class="row" id="signin"><input type="email" id="email" required placeholder="you@example.com" autocomplete="email" style="flex:1;min-width:200px">
        <button class="primary" type="submit">Email me a sign-in link</button></form>`;
      card.querySelector('#signin').onsubmit = async e => {
        e.preventDefault();
        const btn = card.querySelector('button'), email = card.querySelector('#email').value.trim();
        btn.disabled = true;
        try { await signIn(email); card.querySelector('p').textContent = `Check ${email} for a sign-in link, then open it in this browser.`; }
        catch (err) { toast('Couldn’t send the link: ' + (err.message || err)); }
        btn.disabled = false;
      };
      return;
    }
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
    init, sync, schedule, overwrite, pill, drawAccount,
    get signedIn() { return !!user; },
    get enabled() { return !!client; },
  };
})();
