# Next steps: host on GitHub Pages with Supabase accounts

Status (2026-11-17): steps 1, 2, 3 (browser storage part), 5 and Import are done: the app deploys to
GitHub Pages and works there without accounts (progress in browser storage, backup/restore in Settings).
Remaining: Supabase accounts + sync (step 4, and the Supabase backend of step 3), then the step 6 tests.
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
6. **Backup:** Settings gets working Export AND Import. ✅ done ("Restore from backup"; replaces, doesn't merge yet).

## Build plan

1. **Static content:** ✅ done. `python build_static.py` writes `static/content.json` (gitignored; the
   workflow builds it). Frontend tries `/api/content` (local mode), else relative `content.json`.
   `index.html` uses relative asset paths so it works under `/pattern-gym/`.
2. **Browser runner:** ✅ done. No port needed: `runner.py` now exposes `run(code, spec)` / `run_json()`,
   `build_static.py` copies it into `static/`, and `static/py-worker.js` runs it with Pyodide v0.26.4
   (jsdelivr). `app.js` `runTests()` / `runSyntax()` pick server or worker; on timeout (6 s, 4 s for
   syntax) or a crash the worker is terminated and recreated. Verified in the browser: all 150 reference
   solutions + 34 syntax answers pass; infinite loop → time limit, deep recursion → RecursionError.
3. **Storage layer:** partly done. `app.js` `loadState()` / `persist()`: server mode → `/api/state`,
   static mode → localStorage (`pattern-gym-state`) with `navigator.storage.persist()`.
   Still to add: the Supabase backend with the merge rules above.
4. **Supabase:** table + row-level security (paste in the SQL editor):
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
   Frontend uses supabase-js (pinned version) with the project URL + anon key (safe to publish because of RLS).
   Sign-in screen: magic link; add OAuth providers if enabled in the dashboard.
   Set the Supabase Auth "Site URL" / redirect URLs to the Pages URL and http://localhost:8787.
5. **Deploy workflow:** ✅ done. `.github/workflows/pages.yml` (push to main or manual run): checkout, setup-python, `python validate.py`,
   build content.json, upload `static/` as the Pages artifact, deploy.
6. **Test:** login, offline use, two-device merge, timeout handling, all games, Study tab.

## Owner's to-dos (can't be done for them)

- Sign in to GitHub; make the repo public (or have Pro) and enable Pages (source: GitHub Actions).
- Create a free Supabase account + project; copy the project URL and anon key into the app config.
- Optional: enable GitHub/Google login providers in Supabase.

## Later ideas

Leaderboards / shared streaks if friends use it; Gist sync as a no-account alternative.
