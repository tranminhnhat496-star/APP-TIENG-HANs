# Changelog — V16 → V16.3 Backup & Restore Fix

**Version 16.3.0 — layer V31 (loads LAST). Date: 2026-11-18.**
**Base: pristine V16** (`out/index.html` sha256
`c59da3366e10e1a909dbc527c08832c9a39dd0cfaf8d810fbd840abff9303ebe`,
1,993,653 B, layers through V27). V28 never landed and V29 was never
applied — V31 is the first layer after V27. Build: `build_v31.py`
(gates on the V16 hash, refuses if v31 markers exist). Package:
`package_v31.py` → `Korean_English_Vocab_Farm_V16_3_Backup_Restore_Fix.zip`.

No save migration. Same `hanvocab.v1` key. No schema/key renamed.
New keys are V31-only: `hanvocab.v16.backup-history` (cap 20) and
`hanvocab.v16.last-verified-cloud`. Firebase config in the ZIP is the
placeholder (the repo's real config was never touched).

## Fixed — real bugs (each runtime-reproduced on V16 first)

### F-01 — Cloud merge silently dropped the older device's progress (SEVERE)
- **Root cause:** `mergeSaves` (`v20_sync.js`) had no merge branch for
  `S.v7.en`, `en22`, `en23`, `en27` — the newer side won the whole
  subkey. Baseline R4 (2026-11-18): A's 5 SRS words **0/5 kept**,
  A's Smart session **1/1 dropped**; merged save still validated, so
  the loss was silent.
- **Fix (R-F-01a/R-F-01b, R-F-03a/R-F-03b, R-F-01-en16):** per-subkey
  merge — EN SRS per-word MAX (`box`/`right`/`wrong`/`xpAt`), union
  for `review`/`done`/bosses/pets/quests/Smart sessions, per-day MAX
  for Smart `days`, local-first fill for `en16.map`/`overrides` and
  `en17.claimed`, earlier `due` wins, `en15`/`en17` unions, XP/gems
  MAX (never summed). Verified: A 5/5 + B 5/5 words, 2/2 sessions
  (`test31.js` §1; Chrome R4 re-run staged in `verify-v31c.js`).
- **Same family, found during the build (R-V31-F01-en18, not in the
  staged plan):** `mergeBossMaps` (`v20_sync.js:120`) only read the
  nested `{en,ko}` records that V19 writes (`v19.js:44-46`) — V18
  writes FLAT records `{win:1,wins:1,at,item}` (`v18.js:496`), so a
  two-device merge kept the boss id as an empty `{}` and **silently
  dropped every English Challenge Arena win** (the staged plan had
  assumed the en18/en19 branch was already correct). Fixed by
  merging flat records directly (win OR, wins MAX, `at` latest,
  `item` kept); nested V19 records are handled exactly as before.
  Covered by `test31.js` §1 (flat wins on both sides survive).

### F-02 — Stale in-memory save overwrote a just-restored/switched save (SEVERE)
- **Root cause:** the 800 ms V20 debounce + `beforeunload` flush wrote
  the old in-memory `S` over freshly restored bytes. Baseline R1:
  V20 import **3/3 lost**, account switch **3/3 lost**, EN-Hub **1/3
  lost** (restored XP 9101/9201 → 1005 after reload).
- **Fix (R-F-02a/b/c/d):** `flush()` before every direct write —
  EN-Hub backup restore (`v15.js`), V20 `importFile` (`v20.js`),
  account activation and guest activation (`v21.js`).
  Regression gate: same 3×-per-path protocol, must be 0/3 lost
  (Chrome driver staged; vm harness asserts the guards statically).

### F-13 — Sync downloaded the cloud copy over a live local save (MAJOR)
- **Root cause:** `hasProgress` (`v20_sync.js`) did not check en27
  sessions/days, en23 pets, en22 quests, or flat V18/V19 wins, so an
  en27-only local save counted as "no progress" and `syncNow`
  downloaded the cloud copy. Baseline R5: local XP 0→999, whole local
  bytes replaced, no conflict raised.
- **Fix (R-F-13a/b):** `hasProgress` now counts en27 sessions/days,
  en23 pets, en22 quests and flat wins (`r.win`/`r.wins`). The same
  fixture now raises `conflict` and preserves both sides.

### F-14 — Conflict `localTime` had no fallback (MINOR)
- **Root cause:** `engine.conflict.localTime` used `m.lastSavedAt||0`
  only, so an unset `lastSavedAt` made the local side look epoch-old.
- **Fix (R-F-14):** falls back to `v7.meta.migratedAt`, then
  `en15.created`.

### F-11 — Smart answers written into the never-persisted `_mem` fallback
- **Root cause:** when `S` is absent, `en27()` (`v27.js:56-70`)
  returns module-level `_mem`, and `recordAnswer` wrote `last`/`cw`/`cr`
  into it — never persisted; the same exposure existed for the
  `claimed` guards in `claimPlanBonus`/`claimStreak7`.
- **Fix (R-V31-F11 + V31 wrapper):** `recordAnswer` no-ops with
  `console.warn('[V31] recordAnswer dropped… (F-11)')` when `S` is
  absent (NOT a `_mem` flush — a flush could write stale, half-counted
  data into a live save). The V31 layer wraps the exported
  `__v27.recordAnswer` and `_test.claimPlanBonus`/`claimStreak7` the
  same way (defense-in-depth; the wrapper alone cannot reach the
  closure-local call at `v27.js:509`, which is why the build
  replacement is primary).

### F-12 — `resetEN` left Smart Learning data behind
- **Root cause:** `resetEN` (`v15.js:1625-1628`) deleted `S.v7.en` and
  `S.v7.en15` but not `S.v7.en27` — reset words stayed in the weak-word
  list and Smart history.
- **Fix (R-V31-F12, EN-side-only — PENDING ANH'S CONFIRMATION):**
  clears only `en27.en.last/cw/cr`, before `save15()`, guarded for a
  missing/malformed `en27`. `ko`, `days`, `sessions`, `streak`,
  `claimed`, `plan`, `uiLang` are kept (they are KO-side, cross-language
  aggregates, reward guards or UI state — wiping them would exceed
  `resetEN`'s existing EN-only scope and break its own confirm text).
  Known consequence: after an EN reset the Smart Dashboard may still
  show past EN `days`/`sessions` aggregates and today's plan-claimed
  guard; the weak-word list itself is clean. If Anh wants the full
  `en27` wipe, that is a one-line change to R-V31-F12.

### C9 — Account Center restore always failed (NEW, backup-specific)
- **Root cause:** `v21.js:816-828` passed a `File` to
  `__v20.importFile(f)`, which expects an input element (`.files[0]`),
  so it returned immediately; then `.then()` on its `undefined`
  return threw, and the `catch` showed "Không khôi phục được file." —
  for every file, including valid ones.
- **Fix (R-V31-C9):** passes the input element (`imp`) and reports
  "Đang khôi phục — trang sẽ tải lại nếu file hợp lệ." (a *started*
  claim, not a success claim).

### C6 — Conflict summary undercounted boss wins
- **Root cause:** `conflictHTML.sum()` (`v20.js:324`) used the flat-V18
  bug predicate (`r.en.win`/`r.ko.win` only — same as V17-1), so flat
  `{win:1}` records counted as 0 in the per-side summaries the player
  uses to choose.
- **Fix (R-V31-C6):** predicate is now
  `r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)`. Merge copy
  updated (R-V31-C6b/c) to state the true post-fix rules. (The same
  predicate in `v21.js` `bossWinCount`/`summarizeSave` is V17-1 — out
  of scope, untouched.)

### C1 — Export could be one flush stale; filename lied about the version
- **Root cause:** `backupExport` (`v15.js:1607-1610`) read raw
  localStorage directly (up to one 800 ms flush behind in-memory `S`)
  and wrote `korean-vocab-farm-backup-v7.json` for a V16 save.
- **Fix (R-V31-C1a/b):** flushes first, filename is now
  `korean-vocab-farm-backup-v16.3.json`. Export is byte-identical to
  the post-flush save (baseline R6: 4,907 B identical on V16).

### C4 — Cloud "success" without verification; premature export message
- **Root cause:** upload success was `adapter.save()` resolving, with
  no read-back; the Account Center export button set "Đã tải file sao
  lưu." immediately after starting the download.
- **Fix (D.5 option b — V31-side post-sync check, additive):**
  `__v31.verifyCloudBackup()` re-loads the cloud doc via a fresh
  `syncNow({auto:true})` and requires `already-synced` with the local
  hash unchanged; the verified time is stored and shown. The V31
  section never shows "Đã sao lưu lên đám mây" until a check has
  passed. Export message (R-V31-C1c) now says the download *started*.

## New in V31 (layer `v31.js` / `v31.css`, version 16.3.0)

- **Backup & Restore UI redesign** in the Data Management panel
  (runtime wrap of exported `__v20.dataPanelHTML` — the proven V20
  wrap pattern; idempotent) and in the Account Center backup tab
  (MutationObserver decorator — V27 pattern; `accountContentHTML` is
  closure-local, not exported). **No KO tab button** — KO already
  reaches the panel via `injectDataBtn`; the KO tabs line is byte-
  unchanged (asserted by the build).
- **Last Backup split into three labelled rows** (C3): last local save
  (verified, `lastSavedAt`), last cloud sync (`lastSyncAt`), last
  **verified** cloud backup (new). Backup Size shows real bytes + the
  900 KB cloud cap with a warning (not a block) above it.
- **Backup History (C7, new):** `hanvocab.v16.backup-history`, cap 20
  (timestamp + kind + size + hash + result). Populated on export,
  verified cloud upload, restore and merge/conflict. Pre-existing
  system snapshots are enumerated read-only and restorable when valid;
  `hanvocab.v11-backup` is never deleted by V31.
- **Pre-restore snapshot before EVERY restore (C8)** + **undo-restore**:
  every restore writes `hanvocab.v12.preimport-<ms>` first and records
  it; "Hoàn tác lần khôi phục này" restores the newest snapshot (itself
  snapshotted first, so undo toggles).
- **Post-merge report (C6):** counts kept from each side (EN words,
  pets, quests, Smart sessions, boss wins) and the fields resolved
  last-write-wins by design (`en23.team`/`hatch`, `en27.plan`/
  `uiLang` — newer side wins).
- **Retry-on-reconnect visibility:** the existing `onOnline` retry is
  kept; the panel shows "đang chờ mạng — sẽ tự đồng bộ khi có mạng"
  when `engine.pending` is true, plus a manual retry.
- Style: V24/V25/V26 tokens, WCAG AA discipline, 44 px touch targets,
  no horizontal scroll at 360–430 px, own z-index 1400 (documented
  stack: `.v20modal` 1200 < V31 1400 < `#v21account` 9998 /
  `#v21auth` 9999; no other layer's z-index touched).

## Corrections to the audit (measured in the baseline)

- **F-16 does NOT reproduce through the UI:** `init20()` already wraps
  `__v15.backupImport` with the validated `importFile` (v20.js:427-431),
  so the live EN-Hub path already validates + snapshots + confirms.
  The wrap is kept in place; R-F-16 hardens only the standalone
  function.
- **F-15's "depth 5" claim is off by one:** `scan()` checks `last`'s
  keys at depth 4, so `validateSave` already rejected
  `bad-key:__proto__` and no pollution path was demonstrated. Raising
  the depth to 6 is harmless hardening — done here (R-F-15).
- **F-12's scope is a judgment call (EN-side-only)** — flagged here and
  in the PR body as pending Anh's confirmation.

## Hardening only

- **F-15** scan depth 4→6 (see correction above).
- **F-16** standalone `backupImport` validation + snapshot (R-F-16;
  the live path was already safe).

## Out of scope (not built; belong to the stopped AUTO/V28 projects)

R-V17-3 (speak double-pay), R-F-09a/b (duplicate ids), R-F-10a/b/c
(Escape listener), R-F-05a/c + R-F-07a/b/c (observers), R-V17-2b
alternatives, F-04 icons, V17-4 typo, M1/M2, V17-1/V17-2. No V28/V29
files were created; no out-of-scope replacement text is present in
the build (asserted by `build_v31.py` and `package_v31.py`).

## Known limits

- Live Firebase login/sync **not tested** (mock adapter only; no live
  project in this environment). Run the `FIREBASE_SETUP.md` live
  checklist before claiming cloud backup works.
- Auto-syncs are not read-back-verified by V31 (they bypass the
  wrapped export); they become verified on the next manual sync. The
  pre-existing V20 toast "Đã đồng bộ lên đám mây." still fires on
  `adapter.save()` resolve; the V31 panel is the authoritative
  verified-backup indicator.
- Chrome testing was **BLOCKED** (Chrome 157 fails to launch with
  `Trace/breakpoint trap` since 2026-11-18 ~14:46; host EPERM write
  waves). Verified instead with the Node vm harness (`test31.js`,
  exact counts in `SMOKE_TEST_V16_3_2026-11-18.md`); the Chrome driver
  (`verify-v31c.js`) is staged for a rerun once Chrome launches.
- Logout does not upload first (unchanged V13 behaviour); the panel
  shows the last-sync time instead of claiming a logout backup.

## Replacements applied (24 total)

14 staged in-scope: R-F-01a (comment renamed V29→V31), R-F-01b,
R-F-03a, R-F-03b, R-F-01-en16, R-F-13a, R-F-13b, R-F-14, R-F-15,
R-F-02a, R-F-02b, R-F-02c, R-F-02d, R-F-16.
10 new V31: R-V31-F11, R-V31-F12, R-V31-C9, R-V31-C6, R-V31-C1a,
R-V31-C1b, R-V31-C1c, R-V31-C6b, R-V31-C6c, R-V31-F01-en18.
Each verified ×1 in `src/` AND ×1 in `out/index.html` before applying,
and ×1 in all three copies (`src/`, `out/*.js`, built `index.html`)
afterwards (see `SMOKE_TEST_V16_3_2026-11-18.md`).
