# Next steps: host on GitHub Pages with Supabase accounts

Status (2026-11-17): the app works locally (`python server.py`, port 8787). Nothing below is built yet.
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
6. **Backup:** Settings gets working Export AND Import (Import is missing today).

## Build plan

1. **Static content:** Actions step runs `python -c "from content import load_all; ..."` to write
   `static/content.json`. Frontend loads `/api/content` if available (local mode) else `content.json`.
2. **Browser runner:** port `runner.py` logic into a Worker that loads Pyodide (pin an exact version from
   cdn.jsdelivr.net) and runs the same spec kinds: function, design, snippet, harness, prelude,
   arg types linked / tree / linked_many / linked_cycle, inplace, compare modes.
   Re-run every reference solution through it in the browser to confirm all 150 pass.
3. **Storage layer:** one `store` module with `load()`/`save()`; backends: local server (`/api/state`),
   browser storage, Supabase. Mode chosen automatically.
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
5. **Deploy workflow:** `.github/workflows/pages.yml`: checkout, setup-python, `python validate.py`,
   build content.json, upload `static/` as the Pages artifact, deploy.
6. **Test:** login, offline use, two-device merge, timeout handling, all games, Study tab.

## Owner's to-dos (can't be done for them)

- Sign in to GitHub; make the repo public (or have Pro) and enable Pages (source: GitHub Actions).
- Create a free Supabase account + project; copy the project URL and anon key into the app config.
- Optional: enable GitHub/Google login providers in Supabase.

## Later ideas

Leaderboards / shared streaks if friends use it; Gist sync as a no-account alternative.
