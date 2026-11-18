# Korean & English Vocab Farm — V16.3 Backup & Restore Fix

**Version 16.3.0 — layer V31 (loads LAST). Base: V16 (Smart Learning).**

This release fixes the backup, restore and cloud-sync paths found by the
V16.3 Stage A audit (`tools/v31/PLAN_V31.md`, `tools/v31/VERIFY_V31_BASELINE.md`).
It is an **additive layer only**: the Korean game, farm, XP/gold/diamonds,
bosses, pets, vocabulary and the `hanvocab.v1` save are preserved. No save
schema or key was renamed; no existing feature was removed or disabled.

## What was broken (root causes, all runtime-reproduced on V16)

| # | Bug | Evidence on V16 |
|---|---|---|
| F-01 | Cloud merge was whole-subkey last-write-wins: the older device lost 100% of its EN SRS words and 100% of its Smart sessions | Baseline R4: A's 5 words 0/5 kept, sessions 1/1 dropped |
| F-02 | Stale in-memory `S` overwrote a just-restored/switched save (800 ms debounce + `beforeunload` flush) | Baseline R1: V20 import 3/3 lost, account switch 3/3 lost, EN-Hub 1/3 lost |
| F-13 | `hasProgress` ignored Smart/pet/quest progress and flat V18 boss wins, so sync **downloaded** the cloud copy over a live local save instead of raising a conflict | Baseline R5: en27-only local → `downloaded`, XP 0→999 |
| F-14 | Conflict `localTime` had no fallback when `lastSavedAt` was unset | Source: `v20_sync.js` conflict creation |
| F-15 | `validateSave` scan depth (hardening; see correction below) | Source: `v20_sync.js` scan |
| F-16 | Standalone `backupImport` had no validation/snapshot (the live EN-Hub path was already safe — see correction) | Source: `v15.js:1611` |
| F-11 | `recordAnswer` wrote into the never-persisted `_mem` fallback when `S` was absent | Source: `v27.js:56-70,160-179` |
| F-12 | `resetEN` deleted `en`/`en15` but left `en27` Smart data behind | Source: `v15.js:1625-1628` |
| C1 | Export read raw localStorage (could be one flush stale) and the file was still named `backup-v7.json` | Source: `v15.js:1607-1610` |
| C4 | Cloud "success" had no read-back verification; the Account Center export button claimed success before the download | Source: `v20_sync.js` upload branches, `v21.js:813` |
| C6 | Conflict summary counted boss wins with the flat-V18 bug (same predicate as V17-1) | Source: `v20.js:324` `sum()` |
| C9 | Account Center restore **always failed**: it passed a `File` to `importFile`, which expects an input element, then called `.then()` on its `undefined` return | Source: `v21.js:816-828` |

## What V16.3 changes

**Build replacements (applied to `src/` and the inlined blocks in
`index.html`, each verified ×1 in both copies):**
- **F-01/F-03/en16 merge branches** (`v20_sync.js`): per-word MAX for EN
  SRS (`box`/`right`/`wrong`/`xpAt`), union for `review`/`done`/bosses/
  pets/quests/Smart sessions, per-day MAX for Smart `days`, local-first
  fill for `en16.map`/`overrides` and `en17.claimed`, earlier `due` wins,
  XP/gems MAX (never summed).
- **F-01-en18** (`v20_sync.js`, found during the build): `mergeBossMaps`
  only read nested `{en,ko}` V19 records, so a merge silently dropped
  every flat V18 boss win — now merged directly (win OR, wins MAX).
- **F-13** (`v20_sync.js`): `hasProgress` now counts en27 sessions/days,
  en23 pets, en22 quests and flat V18/V19 wins (`r.win`/`r.wins`).
- **F-14**: conflict `localTime` falls back to `v7.meta.migratedAt`, then
  `en15.created`.
- **F-15**: scan depth 4→6 (hardening — see correction below).
- **F-16**: standalone `backupImport` validates with `validateSave` and
  snapshots before writing.
- **F-11** (`v27.js`): `recordAnswer` no-ops with `console.warn` when `S`
  is absent; V31 also wraps the exported `__v27.recordAnswer` and the
  `_test.claimPlanBonus`/`claimStreak7` claim paths the same way.
- **F-12** (`v15.js`): `resetEN` now also clears `en27.en.last/cw/cr`
  (**EN-side-only interpretation — pending Anh's confirmation**, see
  below). `ko`, `days`, `sessions`, `streak`, `claimed`, `plan`,
  `uiLang` are kept.
- **C1** (`v15.js`): export flushes first, filename is now
  `korean-vocab-farm-backup-v16.3.json`.
- **C4** (`v21.js`): export message now says the download *started*,
  not that it finished.
- **C6** (`v20.js`): conflict summary counts flat V18/V19 wins; merge
  copy now states the true post-fix rules (in the panel and in the
  Account Center).
- **C9** (`v21.js`): Account Center restore passes the input element to
  `importFile` and reports "restoring…" instead of calling `.then()` on
  `undefined`.

**New V31 layer (`src/v31.js` + `src/v31.css`, `window.__v31`):**
- **Backup & Restore UI redesign** in the Data Management panel
  (runtime wrap of `__v20.dataPanelHTML`) and in the Account Center
  backup tab (MutationObserver decorator). Shows, all real values:
  Cloud Backup Status, Last Backup (three separate rows — last local
  save, last cloud sync, last **verified** cloud backup — never
  conflated), Backup Size (real bytes + 900 KB cloud cap), Backup
  History, Restore, Export, Sync Status. Cloud controls are disabled
  with "Chưa cấu hình Firebase" when unconfigured and "Đăng nhập để
  bật đồng bộ đám mây" for guests.
- **Backup History (new):** key `hanvocab.v16.backup-history`, capped at
  20 entries (timestamp + kind + size + hash + result). Pre-existing
  system snapshots (`hanvocab.v12.preimport-*`, `pre-download-*`,
  `conflict-*`, `pre-merge-*`, `pre-rollback-*`, `hanvocab.v11-backup`)
  are enumerated read-only and offered for restore when valid.
- **Pre-restore snapshot before EVERY restore** (same
  `hanvocab.v12.preimport-<ms>` pattern) plus **Hoàn tác lần khôi phục
  này** (undo restores the newest pre-restore snapshot; the undo is
  itself snapshotted, so it toggles).
- **Cloud read-back verification:** after an upload, V31 re-loads the
  cloud doc and requires `already-synced` with the local hash unchanged
  before it ever shows "Đã sao lưu lên đám mây". A later manual sync
  returning `already-synced` is itself a read-back confirmation. The
  verified time is stored in `hanvocab.v16.last-verified-cloud`.
- **Post-merge report:** after a merge, the panel shows counts kept from
  each side (EN words, pets, quests, Smart sessions, boss wins) and
  names the fields resolved last-write-wins by design (`en23.team`,
  `en23.hatch`, `en27.plan`, `en27.uiLang` — newer side wins).
- **Conflict choice is unchanged** (keep current / restore old / merge)
  — V31 only adds the report and the corrected copy. Conflicts are
  never auto-picked.
- **Retry-on-reconnect:** the existing `onOnline` retry is kept; V31
  only shows the queued state honestly ("Đang chờ mạng — sẽ tự đồng bộ
  khi có mạng") plus a manual retry button.

## Corrections to the audit (measured, not assumed)

- **F-16 does NOT reproduce through the UI on V16:** `init20()` already
  wraps `__v15.backupImport` with the validated `importFile`, so the live
  EN-Hub path already validates + snapshots + confirms. The wrap is kept
  in place; R-F-16 hardens only the standalone function.
- **F-15's "depth 5" claim is off by one:** `scan()` checks `last`'s keys
  at depth 4, so `validateSave` already rejected `bad-key:__proto__` and
  no pollution path was demonstrated. Raising the depth to 6 is harmless
  hardening, done here.
- **F-12 is a judgment call (EN-side-only):** the wipe clears only the
  EN-side `en27.en` maps. After an EN reset the Smart Dashboard may
  still show past EN `days`/`sessions` aggregates and a surviving
  plan-claimed guard for today; the weak-word list itself is clean.
  **Pending Anh's confirmation** — if he wants the full `en27` wipe,
  that is a one-line change to R-V31-F12.

## What is NOT in this release (out of scope, belongs to the stopped AUTO/V28 projects)

Speak double-pay (V17-3), duplicate ids (F-09), Escape listener (F-10),
observer scoping/lifecycle (F-05/F-07), V17-1/V17-2 counting and
team-skill lethal blow, F-04 icons, V17-4 typo, M1/M2. They are listed
as unhandled in the test report. V28 never landed and V29 was never
applied — V31 is the first layer after V27.

## Known limits (honest)

- **Live Firebase was NOT tested** (no live project exists in this
  environment; the build ships the placeholder `firebase-config.js`).
  Sync/login are verified with a mock adapter only. Anh must run the
  `FIREBASE_SETUP.md` live checklist (Step 6 + V13.3) before claiming
  cloud backup works. Unconfigured, the game is fully offline and says so.
- **Auto-syncs are not read-back-verified by V31** (they call the
  closure-local engine directly, bypassing the wrapped export). They
  become verified on the next manual sync. The pre-existing V20 toast
  "Đã đồng bộ lên đám mây." still fires on `adapter.save()` resolve;
  the V31 panel is the authoritative verified-backup indicator.
- **Chrome testing was BLOCKED** in this environment (Chrome 157 dies
  at launch with `Trace/breakpoint trap` since 2026-11-18 ~14:46; the
  host also shows intermittent EPERM write waves). The §7 scenarios
  were verified with the Node vm harness (`tools/v31/test31.js`) and
  static asserts; the Chrome driver (`tools/v31/verify-v31c.js`) is
  staged and ready to run once Chrome launches again. See
  `SMOKE_TEST_V16_3_2026-11-18.md` for exact pass counts and what
  remains untested.
- Logout does **not** upload first (unchanged V13 behaviour): local
  changes since the last auto-sync are preserved locally in the parked
  home key, but the cloud copy can be stale until the next sign-in
  syncs. The panel shows the last-sync time; do not claim "logout
  backed up your data to the cloud".

## How to use (player)

- **EN Hub → tab 💾 Dữ liệu**: the new "Sao lưu & khôi phục — V16.3"
  section is at the bottom of the Quản lý dữ liệu panel. Same section
  appears in **Trung tâm tài khoản → Sao lưu & Khôi phục** (from the
  Korean Hub too — the KO Data view button opens the same panel).
- **Xuất file sao lưu (.json)**: downloads the whole save (post-flush).
- **Khôi phục từ file**: pick a `.json` backup (validated, snapshot
  taken first, confirm before overwrite).
- **Lịch sử sao lưu / Bản sao lưu hệ thống đã giữ lại**: restore any
  entry; **Hoàn tác lần khôi phục này** undoes the latest restore.
- **Đồng bộ ngay**: manual sync; the panel shows "đang xác minh…" and
  then the verified time. If it says "chưa được xác minh — thử lại",
  press it again.

## Files

- `index.html` (V16.3, layer V31 last), `v31.js`, `v31.css`
- `build_v31.py`, `package_v31.py` (build + packaging, with asserts)
- `tools/v31/test31.js` (Node vm harness), `tools/v31/verify-v31c.js`
  (Chrome CDP driver, staged), `tools/v31/PLAN_V31.md`,
  `tools/v31/VERIFY_V31_BASELINE.md`
- `README_V16_3_BACKUP_FIX.md` (this file),
  `CHANGELOG_V16_to_V16_3.md`, `SMOKE_TEST_V16_3_2026-11-18.md`,
  `FIREBASE_SETUP.md` (unchanged — live checklist still required)

## Update guide

Deploy the ZIP to GitHub Pages exactly as V16 (unzip over the site
root, or replace `index.html` + the `v31.*` files + the patched
`v15.js`/`v20.js`/`v20_sync.js`/`v21.js`/`v27.js` — the build script
keeps `src/`, `out/*.js` and the inlined blocks in agreement).
Player data is preserved: same `hanvocab.v1` key, no migration, no
re-login needed. New keys are V31-only: `hanvocab.v16.backup-history`
and `hanvocab.v16.last-verified-cloud`. If anything looks wrong after
the update, the pre-restore snapshots in the Backup History list are
the way back.
