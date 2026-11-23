/* Light / Dark / System theme. Loaded in <head> before the stylesheet paints, so a chosen theme never
   flashes the other one first. 'system' (the default) clears the choice and follows the OS.
   The choice is kept per browser (pg-theme) and other open tabs follow it straight away. */
'use strict';
(function () {
  const KEY = 'pg-theme';
  const BG = { light: '#f5f3ee', dark: '#15171c' };
  function apply(value) {
    const root = document.documentElement;
    if (value === 'light' || value === 'dark') root.dataset.theme = value; else delete root.dataset.theme;
    // The browser's own toolbar colour: fixed to the chosen theme, or back to the two media-matched tags.
    for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
      if (!m.dataset.media) m.dataset.media = m.media;
      if (value === 'light' || value === 'dark') { m.media = ''; m.content = BG[value]; }
      else { m.media = m.dataset.media; m.content = /dark/.test(m.dataset.media) ? BG.dark : BG.light; }
    }
  }
  function get() { try { return localStorage.getItem(KEY) || 'system'; } catch (e) { return 'system'; } }
  function set(value) {
    try { if (value === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, value); } catch (e) {}
    apply(value);
  }
  window.PGTheme = { get, set };
  apply(get());
  addEventListener('storage', e => { if (e.key === KEY) apply(e.newValue || 'system'); });
  // theme-color tags come after this script in <head>; fix them up once they exist.
  document.addEventListener('DOMContentLoaded', () => apply(get()));
})();
