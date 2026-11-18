# V16.4 Data Safety — Plan (layer V32, version 16.4.0)

**Base:** V16.3 (`out/index.html` sha256
`4378dc22b10a6c0aefd95c032f005b6cd9ef9f8f88899f48a4bd06c78d04d3a6`,
2,040,471 B, layers through V31). **Branch:** `muse/data-safety-v164`
from `muse/fix-backup-restore` @ `39052dffc9f22d56b6a670c2c43daf15ea994058`;
draft PR base = `muse/fix-backup-restore` (stacked).

**Scope (Claude Top-5 #1 + #2 ONLY):** automated data/sync regression
suite + localStorage monitor. Claude #3 (daily-start + review boss),
#4 (review-debt cap + welcome-back), #5 (bulk KO import) are OUT OF
SCOPE — follow-ups only, do not build them.

**Chrome status (2026-11-19 00:55):** Chrome 157 still will not launch.
`/tmp/webgl-policy.txt` contains exactly `hatch-webgl-all-origins-v1\n`
(verified by `od -c`), yet every launch fails with
`Hatch WebGL domain policy is required for browser startup`
(`chrome_main_delegate.cc:1283`). This is a NEW failure mode on top of
the SIGTRAP deaths since 2026-11-18 ~14:46. Stage `verify-v32c.js`
(CDP driver) and do NOT claim Chrome tests ran.

## 1. What V32 is

Additive layer only (`src/v32.js` + `src/v32.css`, `window.__v32`,
loads LAST). No save schema/key change, no migration, no feature
removed, no new currency. One guarded build replacement (R-V32-VER,
§2) — everything else is runtime wrapping of exported layer APIs,
the proven V31 pattern.

### 1.1 `__v32` public API (the test agent will code against this exact contract)

```
window.__v32 = {
  version: '16.4.0',
  status(),                 // {version, budgetBytes, totalBytes, pct, level:'ok'|'warn'|'critical',
                            //  keys:[{key, bytes, kind}], historyBytes, snapshotBytes,
                            //  saveVersion, versionKnown, lastCheckAt, lastCleanup:{at,freedBytes,deletedKeys}|null}
  computeStorage(),         // {totalBytes, budgetBytes, pct, level, keys:[{key,bytes,kind}], byKind:{save,history,snapshots,verified,other}}
  checkBudget(),            // recompute + surface warnings; returns the computeStorage() object
  cleanupSafe(),            // confirm() first; prunes per §1.3; returns {ok, freedBytes, deletedKeys[], keptSnapshots}
  monitorHTML(),            // the monitor section HTML (per-key rows, progress bar, thresholds, cleanup button)
  _test: { status, computeStorage, checkBudget, cleanupSafe, monitorHTML,
           byteLen, levelFor, classifyKey, listStorageKeys, prunePlan,
           saveWrapped: () => boolean, flushWrapped: () => boolean }
}
```

### 1.2 Storage monitor (Claude #2) — behaviour, exact

- **Budget:** `BUDGET_BYTES = 5 * 1024 * 1024` (5,242,880). Label it
  "ước tính" (estimated): Chrome's quota accounting differs from
  UTF-8 byte counts, so the monitor is a conservative early warning,
  not a quota meter. `byteLen(s)` = UTF-8 byte length via the
  `encodeURIComponent` trick (works in Node vm too; never use `Blob`
  in the layer — it does not exist in vm).
- **Levels:** `levelFor(pct)`: pct < 70 → `'ok'`; 70 ≤ pct < 90 →
  `'warn'` (amber); pct ≥ 90 → `'critical'` (red). `pct` = total /
  budget * 100, one decimal in the UI.
- **Key classification (`classifyKey`):**
  - `hanvocab.v1` → kind `'save'` (the live save — NEVER deletable)
  - `hanvocab.v16.backup-history` → `'history'`
  - `hanvocab.v16.last-verified-cloud` → `'verified'`
  - `hanvocab.v12.preimport-*`, `pre-download-*`, `conflict-local-*`,
    `conflict-cloud-*`, `pre-merge-*`, `pre-rollback-*` → `'snapshot'`
  - `hanvocab.v11-backup` → `'protected'` (listed, NEVER deletable)
  - any other `hanvocab.*` key → `'other'` (listed, NEVER deletable
    by cleanup; the monitor must not offer to delete what it cannot
    classify — unknown keys are shown with "không xóa được từ đây")
  - non-`hanvocab.*` keys are ignored entirely (not the game's data).
- **Monitor section** (appended to the V31 panel + Account Center
  backup tab — see §1.4): per-key rows (key label, bytes, KB, kind),
  total vs budget with a progress bar (width = min(pct,100)%, colour
  by level), threshold text ("Cảnh báo ở 70% — nên dọn dẹp bản sao
  lưu cũ", "Nguy hiểm ở 90% — có nguy cơ không lưu được"), the live
  save version (`S.v7.meta.saveVersion`, or "không rõ" when absent)
  with `versionKnown` (true iff absent or === 12), and the cleanup
  button + last-cleanup result (time, bytes freed, keys deleted).
- **Cleanup (`cleanupSafe`, §1.3):**
  - Requires `confirm()` (Vietnamese text naming exactly what will
    be deleted). `confirm() === false` → return `{ok:false,
    reason:'cancelled'}` and delete NOTHING. The `_test` probe must
    accept an explicit `confirmFn` override so the vm harness can
    test both paths without a global `confirm`.
  - Deletes ONLY: snapshot keys older than the newest 5 snapshots
    (newest determined by the numeric suffix; `hanvocab.v11-backup`
    has no suffix and is never counted), and backup-history entries
    older than the newest 10 (rewrite the history array, keeping the
    newest 10 — never more than V31's cap of 20 is touched).
  - NEVER deletes: `hanvocab.v1`, `hanvocab.v11-backup`,
    `hanvocab.v16.last-verified-cloud`, `hanvocab.v12.meta`, any
    `'other'`/`'protected'` key, any non-`hanvocab.*` key.
  - Returns `{ok:true, freedBytes, deletedKeys:[...],
    keptSnapshots:N, historyKept:M}` and records the result via
    `__v31.recordBackupEvent('cleanup', freedBytes, '', '',
    true, 'Dọn dẹp an toàn: …')` when `__v31` exists (guarded; the
    V31 `KIND_LABEL` falls back to the raw kind string — acceptable).
  - `prunePlan()` (pure, no writes) returns the exact deletion list
    the cleanup would perform — the vm suite tests the plan first,
    then the execution.
- **Pre-save guard:** V32 wraps the global `save` ONLY if it is a
  plain window property function (V6 HTML:947 declares
  `function save(){...}` at top level — VERIFY in source before
  wrapping; if it is not a window function, skip the wrap and rely
  on the interval + flush wrap). The wrapper is idempotent
  (`__v32` marker), try/catch around everything, calls the original
  FIRST, then schedules `checkBudget()` after 900 ms (past the V20
  800 ms debounce) so the measured size is post-flush. It NEVER
  blocks, delays, or alters the save, and NEVER deletes data to make
  room. In parallel: wrap `__v20.flush` (idempotent) → check after
  flush; wrap `__v31.recordBackupEvent` → check after; 30 s interval
  while the page is open; `visibilitychange` → visible → check.
  When the level is `warn`/`critical`, `checkBudget()` surfaces the
  warning in THREE places: (1) the monitor section (always, when the
  panel is open), (2) a small dismissible floating badge
  (bottom-right, above the bottom tab bar, z-index 1100 — BELOW the
  V20 modal 1200 and V31 1400 so it never covers a modal; 44 px
  touch target; hidden for the rest of the session once dismissed),
  (3) `console.warn('[V32] …')`. The badge shows only at
  `warn`/`critical` and never on a fresh page at `ok`.

### 1.3 Panel integration (no edits to v31.js — runtime wrapping only)

- Wrap `window.__v20.dataPanelHTML` a second time (on top of V31's
  wrap; guard with `__v32` marker, idempotent): call the wrapped
  function, then append `monitorHTML()` inside the panel's last
  `</div>` the same way V31 does. The monitor section id is
  `v32monitor`.
- Account Center: V32's own MutationObserver on `#v21mcontent`
  (V31 pattern): when `#v31acct` exists and no `#v32monitor`
  follows it, insert the monitor section after it. Idempotent,
  guarded by id check. Arm on `__v21.openAccount` wrap (same as
  V31) and disarm on close.
- The monitor section re-renders its numbers on every panel render
  (values are computed live in `monitorHTML()`, never cached).
  After a cleanup, re-render by re-invoking the panel render path if
  available (call the wrapped `dataPanelHTML` again is NOT safe —
  instead, update the `#v32monitor` DOM node in place via
  `refreshMonitor()`).

### 1.4 Style

Reuse the V24/V25/V26 tokens already in `v31.css`
(`--ui-text-primary`, `--ui-text-secondary`, `--ui-title-gold`,
`--ui-bg-panel`, `--ui-border`, `--ui-btn-min-height`, `--ui-warning`,
`--ui-danger`, `--ui-radius`). V32 CSS: `.v32section`, `.v32card`,
`.v32bar` (progress track), `.v32barfill` (ok/warn/critical colours),
`.v32badge` (floating warning), `.v32keyrow`. WCAG AA contrast,
44 px touch targets, no horizontal scroll at 360–430 px. No emoji as
the main graphic.

## 2. The ONE build replacement (R-V32-VER)

`validateSave` (`src/v20_sync.js`, SAVE_VERSION=12) checks structure
only — it has NO version check. A save from an incompatible future
version would be silently accepted. Add, right after the `bad-v7`
check:

```js
  if(obj.v7&&obj.v7.meta&&obj.v7.meta.saveVersion!==undefined&&obj.v7.meta.saveVersion!==SAVE_VERSION) errs.push('bad-version:'+obj.v7.meta.saveVersion);
```

Rules: absent `meta.saveVersion` → accepted (pre-V12 saves have no
meta); present and === 12 → accepted; present and anything else →
rejected with `bad-version:<n>`. This is PREVENTIVE hardening, not a
fix for an observed bug — say so in the changelog. Apply to `src/`,
`out/*.js` and the inlined block with exact-count asserts, V31-style.
No other replacements. Assert in build: replacement ×1 in all three
copies; `bad-version` ×1 in the built file; no other V32 replacement
text anywhere.

## 3. Build (build_v32.py, modelled on build_v31.py)

- Gate: base `out/index.html` sha256 MUST equal
  `4378dc22b10a6c0aefd95c032f005b6cd9ef9f8f88899f48a4bd06c78d04d3a6`
  (2,040,471 B); title must be the V16.3 title ×1; `id="v31"` /
  `id="v31js"` present; `id="v32"` / `__v32` / `id="v28"` / `id="v29"`
  / `id="v30"` absent — REFUSE otherwise. (V28/V29/V30 never landed;
  their markers must stay absent.)
- Validate `src/v32.js` / `src/v32.css`: no `</script>` in the JS;
  `VERSION='16.4.0'` + `__v32` present; no `window.S` in
  comment-stripped source; no `v32kotab`; CSS contains the tokens
  above + `.v32section` + `.v32bar`.
- Title: old = V16.3 title, new =
  `<title>Korean &amp; English Vocab Farm V16.4 — Data Safety — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>`.
- Inject `<style id="v32">` + `<script id="v32js">` before `</body>`,
  LAST. Assert marker order ends v32 (styles + scripts), old
  versions intact (13.0.0, 15.0.0, 15.1.0, 15.2.0, 15.3.0, 16.0.0,
  16.3.0), KO tabs line unchanged (`v23kotab` ×1, `v32kotab` 0×),
  `node --check` on v32.js + v20_sync.js.
- EPERM-safe helpers: copy the `_cfr` / `_wsmall` /
  `_write_text_epersafe` / `_assemble_index` helpers from
  build_v31.py verbatim (the host has intermittent EPERM write
  waves; never use a plain `open().write()` for the build).
- NEVER re-run build_v31.py (or any older build script) on the
  finished V16.3 build — it would move v31 after v32 / add blank
  lines. Run build_v32.py EXACTLY ONCE on the verified V16.3 out/.
  If the EPERM wave kills the run, assemble by hand with the file
  tools exactly as V16.3 did (SMOKE_TEST_V16_3 §0) and verify with
  the script's own step-5 asserts as a read-only script — and say
  so honestly in the smoke test.

## 4. Package (package_v32.py, modelled on package_v31.py)

Output: `Korean_English_Vocab_Farm_V16_4_Data_Safety.zip`. Same DOCS
list as package_v31.py + `README_V16_4_DATA_SAFETY.md`,
`CHANGELOG_V16_3_to_V16_4.md`, `SMOKE_TEST_V16_4_2026-11-19.md`.
Copy `tools/v32/` (minus `shots/`) into the ZIP. Asserts: index.html,
v32.js/v32.css, build_v32.py, package_v32.py, test32.js in ZIP;
v32 markers last; v31 in-scope fragments still present (reuse the
package_v31.py `IN_SCOPE_FRAGMENTS` list verbatim); out-of-scope
markers absent; KO entry check (0× v32kotab, 1× injectDataBtn label);
V10 30 PNGs, V11 30 PNGs, pets 41 PNGs; title is V16.4;
`firebase-config.js` in the ZIP must be the placeholder (never the
repo's real config).

## 5. Test suite (test32.js — Node vm, modelled on test31.js)

Extend the test31 harness pattern (same `makeLS` / `makeDocument` /
`makeCtx` / `loadFile` / `baseSave` scaffolding; do NOT rewrite it
from scratch). New file `tools/v32/test32.js`, usage
`node tools/v32/test32.js [DIR]` (default `out/`; ZIP run = extract
and pass the dir). Exit 0 = all runnable checks pass; skips reported,
never counted as passes. Run TWICE on the build + ONCE on the
packaged ZIP; record exact counts per section per run.

Sections (each check is a real assertion on a real seeded save unless
marked static):
- **§0 static — build integrity:** title V16.4; `__v32` + `16.4.0`;
  old versions intact (13.0.0 … 16.3.0); style/script markers end
  v32; no v28/v29/v30/v32kotab markers; KO entry ×1; `R-V32-VER`
  fragment present; `bad-version` present in built html; v31
  in-scope fragments still present (spot-check ≥ 6, incl. the F-01
  merge branch and the C9 `importFile(imp)`).
- **§1 merge regressions (vm, real v20_sync.js):** reuse the test31
  §1 A/B fixtures and assertions verbatim as the regression lock-in
  (A 5/5 + B 5/5 words, 2/2 sessions, XP/gems MAX never summed,
  pets/quests union, due earlier, flat V18 wins survive win/wins/at,
  nested V19 en+ko survive, no input mutation, merged validates).
  PLUS: en27 `days` per-day MAX; en27 `streak` n MAX; en23 `mats`
  MAX; en17 `fav` union.
- **§2 F-02 flush guards (vm + static):** static: guards present in
  v15.js (backupImport), v20.js (importFile), v21.js (account/guest
  activation ×2) — same asserts as test31 §8. Behavioural
  simulation (NEW): a model V20 debounce (`dirty` flag, 800 ms
  timer, `beforeunload` flush) wired to V31's REAL `restoreRaw`
  (fake `__v20.flush` = model flush): (i) WITHOUT the guard
  (restore that only does setItem) the pending flush overwrites the
  restored bytes after `beforeunload` — the race is reproduced in
  the model; (ii) WITH the guard (real `restoreRaw`, which flushes
  first) the restored bytes survive `beforeunload` + a second
  reload — 3 trials, 0 lost. The model is labelled as a simulation
  of the debounce ordering, NOT the real V20 engine (the real-engine
  gate stays Chrome-only, staged in verify-v32c.js).
- **§3 restore/import validation (vm):** via `__v20sync.validateSave`
  + V31 `restoreRaw` (mock `confirm`): malformed JSON → rejected;
  missing `cards` → rejected; bad card (`{id:'x'}`) → rejected;
  `bad-version` (meta.saveVersion 99 / 11 / 13) → rejected, and
  `bad-version:99` in errors; saveVersion 12 → accepted; saveVersion
  absent → accepted; oversized payload (> 10 MB string) → rejected
  (`file-too-large`); `__proto__` pollution → rejected and
  `({}).polluted` stays undefined; valid full save → accepted and
  applied; restore with `confirm() === false` → `{ok:false,
  reason:'cancelled'}` and bytes unchanged (the confirmation step
  is REQUIRED — assert it is present in the flow, not bypassed).
  Never executes imported JSON: assert a payload containing
  `{"__proto__":…}` and a payload whose string contains
  `";evil();//` is parsed as data only (no side effect — assert a
  sentinel global is untouched).
- **§4 pre-restore snapshot + undo + history cap (vm):** restoreRaw
  writes a `hanvocab.v12.preimport-*` snapshot BEFORE the write;
  undo restores the EXACT pre-restore bytes (byte-identical, not
  just XP); a second undo toggles back; 25 history events →
  history length 20 with the OLDEST pruned first (the oldest
  remaining entry is the 6th recorded); `hanvocab.v11-backup` is
  never deleted by any V32/V31 path under test.
- **§5 export completeness (vm):** build a full seeded save with
  every `S.v7` subkey (en/en15/en16/en17/en18/en19/en22/en23/en27)
  + top-level fields (cards, xp, gems, own, opt, rem, decks);
  JSON round-trip (stringify → parse → validateSave) preserves
  every subkey (assert each key present and each seeded marker
  intact: one pet, one en18 win, one en27 session, one BT quest
  star, two SRS words); the round-tripped bytes are identical to
  the original string.
- **§6 conflict behaviour (vm, mock adapter):** reuse test31 §2
  (en27-only local raises conflict, local bytes preserved,
  conflict snapshots written). PLUS: an older backup (cloud copy
  with lower XP and older updatedAt) never silently overwrites a
  newer local save — `syncNow` returns conflict (not download) and
  local bytes are byte-identical afterwards.
- **§7 cloud read-back verify (vm, mock adapter):** reuse test31 §6
  (upload → read-back → verified, `lastVerifiedCloudAt` set;
  offline `syncNow` → `{ok:false, reason:'offline'}`).
- **§8 monitor (vm, real v32.js):** load v32.js in a vm ctx with
  fakes (`__v31` with status/readHistory/listSystemSnapshots,
  `__v20` with flush, `__v20sync` with validateSave) and a seeded
  localStorage (keys of KNOWN sizes: hanvocab.v1 = 1000 B,
  history = 200 B, two preimport snapshots 300 B + 500 B,
  v11-backup = 400 B, last-verified-cloud = 50 B, one unrelated
  key = 999 B): per-key bytes exact; total = sum of hanvocab.*
  only (unrelated key excluded); pct exact to 0.1; level ok/warn/
  critical at the 70%/90% boundaries (seed totals just below/above
  each threshold); `prunePlan()` lists exactly the deletable keys
  (oldest snapshots beyond newest 5; history beyond newest 10)
  and NEVER lists hanvocab.v1 / v11-backup / last-verified-cloud /
  other keys; `cleanupSafe` with confirm=false deletes nothing;
  with confirm=true deletes exactly the plan and returns the exact
  freed bytes; `hanvocab.v11-backup` survives cleanup; pre-save
  guard: wrap a fake global `save`, call it with the total just
  under 90% then grow past 90% → warning flag set, data untouched,
  original save still called exactly once per call.
- **§9 Chrome-only (SKIP, never PASS):** real file restore
  round-trip; offline/online backup; reload persistence after
  monitor cleanup; 0 JS errors; monitor UI at 360/390/430 with no
  overflow; F-02 real-engine race (3× per path); C9 real-File
  restore; V16.3 regression (Smart overlay, Pet Hub, v18 fight,
  Library, login, backup panel). Each SKIP names the reason
  (Chrome will not launch — see header).

**Chrome driver:** stage `tools/v32/verify-v32c.js` (CDP, modelled
on `tools/v31/verify-v31c.js`) for the §9 gates + the F-02
real-engine race + the §7-scenario re-runs. Do NOT run it if Chrome
will not launch — record the exact launch error instead.

**Regression (no V16.3 breakage):** the vm suite must also assert
the V31 panel still wraps idempotently and `__v31.status()` still
reports 16.3.0 after V32 loads (load order v31 then v32 in the vm
ctx). Chrome regression stays a §9 SKIP unless Chrome launches.

## 6. Docs

- `README_V16_4_DATA_SAFETY.md`, `CHANGELOG_V16_3_to_V16_4.md`,
  `SMOKE_TEST_V16_4_2026-11-19.md` (exact per-section counts for
  run 1 / run 2 / ZIP run; what was NOT tested and why).
- Append V16.4 sections to `CHANGED_FILES.md` +
  `GITHUB_DESKTOP_GUIDE.md` (workspace copies; package_v32.py copies
  them into out/ at packaging time, like v31).

## 7. GitHub (coordinator does this AFTER tests pass)

- Read `/opt/hatch/connectors/github/references/snapshot-push.md`
  first. Branch `muse/data-safety-v164` FROM
  `muse/fix-backup-restore` @ `39052dffc9f22d56b6a670c2c43daf15ea994058`
  (verify the base branch head with `list_commits` first; if it
  moved, STOP and reconcile — do not branch from a stale SHA).
  Verify per-path sync bases on the base branch (new paths absent;
  modified paths matching V16.3 bytes) before pushing.
- Push text files only (≤ 2000 files, ≤ 16 MiB); `firebase-config.js`
  NEVER pushed. Record the confirmed SHA in
  `~/workspace/v7build/out.muse-github-snapshot-sync.json` (append,
  keep earlier entries). Draft PR, base `muse/fix-backup-restore`,
  no auto-merge. ZIP is a chat attachment, never pushed.

## 8. Out of scope — do NOT build

Claude #3/#4/#5; V17-1/V17-2/V17-3; F-04/F-05/F-07/F-09/F-10;
V17-4 typo; M1/M2; V9 word fixes; V14.1; PR #7 follow-ups; F-12
full-wipe question (still pending Anh). No V28/V29/V30 files.
