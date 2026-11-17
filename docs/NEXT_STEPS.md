# Next steps: host on GitHub Pages with Supabase accounts

Status (2026-11-17): steps 1-5 are built. Supabase project `qrmtkzktkpjsjebeiqqu` exists with the `progress`
table and RLS (verified: anonymous writes are rejected). Sign-in + sync code is in `static/sync.js`, tested
against an in-memory stand-in for Supabase, but a **real email sign-in has not been tested yet** (step 6).
Owner still has to: enable Pages / make the repo public, and set the Supabase Auth URLs (see to-dos).
If you're Claude picking this up in a new session: read this file, README.md, then `static/app.js` and `server.py`.

## Background

- Owner is prepping for coding OAs and in-person technical interviews (Python). Core difficulty: turning an idea
  into pseudocode/code. Daily time and interview urgency vary, which is why both are settings.
- Current architecture: `server.py` (stdlib HTTP server) serves `static/`, exposes `/api/content` (built from
  `content/*.py`), `/api/run` + `/api/syntax` (runs user code via `runner.py` in a subprocess, 6 s timeout),
  and `/api/state` (reads/writes `progress.json`).
- `python validate.py` must print `ALL OK` after any content change.

## Goal

Host the app on GitHub Pages with user accounts, keeping local mode working.

## Decisions already made

1. **Hosting:** GitHub Pages, deployed by a GitHub Actions workflow. Free Pages needs a **public** repo
   (or GitHub Pro for private). Progress never goes in the repo.
2. **Accounts + storage:** Supabase (Postgres + Auth). Login via email magic link; optionally GitHub/Google OAuth.
   Free tier pauses after 7 days of inactivity (one click to resume in the dashboard).
3. **Code execution:** in the browser with **Pyodide** in a Web Worker. Never execute user code on a server
   (multi-user = untrusted code). Terminate + recreate the worker on timeout (6 s) to stop infinite loops.
4. **Offline-first:** browser storage (localStorage/IndexedDB, request `navigator.storage.persist()`) is the
   working copy; Supabase is the cloud copy. Pull on load/login, push debounced (~5 s) after changes.
5. **Merge, never overwrite:** per SRS item keep the one with the later `last` (then higher `reps`);
   `xp` = max; `days` = per-day max; `mocks` = union by (date, problem); `study.lessons`/`walks` = union;
   `streak` recomputed from `days`; `settings` = most recently changed.
6. **Backup:** Settings gets working Export AND Import. ✅ done. "Restore from backup" and "Reset" replace
   progress (and, when signed in, overwrite the cloud copy too) on purpose; everything else merges.

## Build plan

1. **Static content:** ✅ done. `python build_static.py` writes `static/content.json` (gitignored; the
   workflow builds it). Frontend tries `/api/content` (local mode), else relative `content.json`.
   `index.html` uses relative asset paths so it works under `/pattern-gym/`.
2. **Browser runner:** ✅ done. No port needed: `runner.py` now exposes `run(code, spec)` / `run_json()`,
   `build_static.py` copies it into `static/`, and `static/py-worker.js` runs it with Pyodide v0.26.4
   (jsdelivr). `app.js` `runTests()` / `runSyntax()` pick server or worker; on timeout (6 s, 4 s for
   syntax) or a crash the worker is terminated and recreated. Verified in the browser: all 150 reference
   solutions + 34 syntax answers pass; infinite loop → time limit, deep recursion → RecursionError.
3. **Storage layer:** ✅ done. `app.js` `loadState()` / `persist()`: server mode → `/api/state`,
   static mode → localStorage (`pattern-gym-state`) with `navigator.storage.persist()`. Cloud sync sits on
   top of either (`static/sync.js`). Merge rules live in `static/merge.js`, tested by
   `node tests/merge.test.js` (also run by the deploy workflow). `S.settingsAt` is set by `save()` whenever
   settings change, so the newest settings win.
4. **Supabase:** ✅ built. Table + row-level security (already run in the project's SQL editor):
   ```sql
   create table progress (
     user_id uuid primary key references auth.users on delete cascade,
     data jsonb not null default '{}',
     updated_at timestamptz not null default now()
   );
   alter table progress enable row level security;
   create policy "own row" on progress for all
     using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ```
   `static/config.js` holds the project URL + publishable key (safe to publish because of RLS).
   supabase-js 2.118.0 from jsdelivr (UMD). Sign-in: emailed link, PKCE flow, so the link must be opened in the
   same browser that asked for it. The link comes back as `?code=...` (query, not hash, so the hash router is
   untouched); `Cloud.init()` exchanges it and cleans the URL.
   Sync (`Cloud.sync()`): pull row → `mergeState(local, cloud)` → save locally → upsert if different. Runs on
   load, sign-in, 5 s after local changes, on `online`, and when the tab becomes visible. Overlapping calls
   are queued. Races between devices converge on the next sync because merging only ever adds.
   UI: "☁" pill in the header (status; links to Settings) and an "Account & sync" card in Settings.
5. **Deploy workflow:** ✅ done. `.github/workflows/pages.yml` (push to main or manual run): checkout,
   setup-python, `python validate.py`, `node tests/merge.test.js`, `python build_static.py`, upload `static/`, deploy.
6. **Test:** done so far: all 150 solutions in Pyodide, timeouts, local storage, restore, merge unit tests,
   sync against a stand-in client, RLS. **Still to do with a real inbox:** sign in on the live site, sync two
   devices, sign out, offline then back online.

## Owner's to-dos (can't be done for them)

- GitHub: make the repo public (or have Pro); Settings → Pages → Source: GitHub Actions; re-run the deploy.
- Supabase → Authentication → URL Configuration: Site URL `https://nairbs.github.io/pattern-gym/`; add redirect
  URLs `https://nairbs.github.io/pattern-gym/`, `http://localhost:8787/`, `http://localhost:8000/`.
  Without this, sign-in links send you to the wrong address.
- Optional: enable GitHub/Google login providers in Supabase (the app would need buttons for them).
- Free tier: the project pauses after 7 days without use; resume it in the Supabase dashboard if sync shows "☁ !".

## Later ideas

Leaderboards / shared streaks if friends use it; Gist sync as a no-account alternative.
