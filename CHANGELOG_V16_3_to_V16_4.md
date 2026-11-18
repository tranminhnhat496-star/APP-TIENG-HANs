# Changelog — V16.3 → V16.4 Data Safety

**Version 16.4.0 — layer V32 (loads LAST). Date: 2026-11-19.**
**Base: pristine V16.3** (`out/index.html` sha256
`4378dc22b10a6c0aefd95c032f005b6cd9ef9f8f88899f48a4bd06c78d04d3a6`,
2,040,471 B, layers through V31). V28/V29/V30 never landed — V32 is
the first layer after V31. Build: `build_v32.py` (gates on the V16.3
hash, refuses if v32 markers exist). Package: `package_v32.py` →
`Korean_English_Vocab_Farm_V16_4_Data_Safety.zip`.

No save migration. Same `hanvocab.v1` key. No schema/key renamed. No
new localStorage key and no new Firestore path in V16.4 (the monitor
only reads keys V12/V16/V16.3 already wrote). Firebase config in the
ZIP is the placeholder (the repo's real config was never touched).

## Added — storage monitor (Claude Top-5 #2)
- New layer V32 (`src/v32.js` + `src/v32.css`, `window.__v32`,
  version 16.4.0, injected LAST before `</body>`).
- `__v32` public API (exact contract in `PLAN_V32.md` §1.1):
  `status()`, `computeStorage()`, `checkBudget()`, `cleanupSafe()`,
  `monitorHTML()`, plus `_test` probes (`byteLen`, `levelFor`,
  `classifyKey`, `listStorageKeys`, `prunePlan`, `saveWrapped`,
  `flushWrapped`).
- Budget `BUDGET_BYTES = 5 * 1024 * 1024` (5,242,880). `byteLen` is the
  UTF-8 length via the `encodeURIComponent` trick (works in Node vm;
  no binary-blob constructor is used anywhere in the layer). Levels:
  pct < 70 `ok`, 70 ≤ pct < 90 `warn`, pct ≥ 90 `critical`.
- Key classification: `hanvocab.v1` → `save` (never deletable);
  `hanvocab.v16.backup-history` → `history`;
  `hanvocab.v16.last-verified-cloud` → `verified`;
  `hanvocab.v12.preimport-/pre-download-/conflict-local-/conflict-cloud-/pre-merge-/pre-rollback-`
  → `snapshots`; `hanvocab.v11-backup` → `protected` (listed, never
  deletable); any other `hanvocab.*` → `other` (listed, never deletable
  by cleanup); non-`hanvocab.*` keys are ignored entirely.
- Monitor section (`#v32monitor`): appended to the V31 Data Management
  panel by wrapping `__v20.dataPanelHTML` a second time (on top of
  V31's wrap, `__v32` marker, idempotent) and to the Account Center
  backup tab by V32's own MutationObserver on `#v21mcontent` (insert
  after `#v31acct`, V31 pattern; armed on `__v21.openAccount` wrap,
  disarmed on close). Values are computed live in `monitorHTML()`,
  never cached; after a cleanup the section re-renders in place via
  `refreshMonitor()`.
- Warning surfaces: monitor section (always when the panel is open),
  dismissible floating badge (bottom-right, above the bottom tab bar,
  z-index 1100 — below the V20 modal 1200 and V31 1400; 44 px touch
  target; hidden for the rest of the session once dismissed; shows
  only at warn/critical, never on a fresh page at ok), and
  `console.warn('[V32] …')`.
- Checks run after every save, after `__v20.flush`, after
  `__v31.recordBackupEvent`, every 30 s (interval `unref()`-ed so it
  never holds a Node vm harness open), and on `visibilitychange` to
  visible.

## Added — safe cleanup
- `cleanupSafe()` asks `confirm()` first (Vietnamese text naming
  exactly what will be deleted); `confirm() === false` → returns
  `{ok:false, reason:'cancelled'}` and deletes NOTHING. The `_test`
  probe accepts an explicit `confirmFn` override so the vm harness
  can test both paths without a global `confirm`.
- Deletes ONLY: snapshot keys older than the newest 5 (newest by
  numeric suffix) and backup-history entries older than the newest 10
  (history array rewritten, keeping the newest 10). `prunePlan()` is
  pure (no writes) and returns the exact deletion list first.
- NEVER deletes `hanvocab.v1`, `hanvocab.v11-backup`,
  `hanvocab.v16.last-verified-cloud`, `hanvocab.v12.meta`, any
  `other`/`protected` key, or any non-`hanvocab.*` key. Never deletes
  data to make room.
- Returns `{ok:true, freedBytes, deletedKeys, keptSnapshots,
  historyKept}` and records the result via
  `__v31.recordBackupEvent('cleanup', …)` when `__v31` exists (the
  V31 `KIND_LABEL` falls back to the raw kind string — acceptable).

## Added — pre-save guard
- V32 wraps the global `save` ONLY because it was verified in source
  to be a plain window function (V6 HTML:947 `function save(){...}`
  at top level in the classic `<script>` opened at line 877; V20
  `init20()` at `src/v20.js:417` runs once at V20 load and had already
  wrapped it into a debounced `requestSave()` wrapper marked `__v20`;
  V20's `flush()` calls its captured original save, not `window.save`,
  so the V32 wrap cannot re-enter `flush()`). The wrapper is
  idempotent (`__v32` marker), calls the original FIRST, then
  schedules `checkBudget()` after 900 ms (past the V20 800 ms
  debounce). It never blocks, delays, or alters the save. It copies
  the `__v20` marker onto itself so a hypothetical later `wrapSave()`
  call sees `__v20` and returns instead of capturing this wrapper.
- `__v20.flush` wrapped (idempotent) → check after flush;
  `__v31.recordBackupEvent` wrapped (idempotent) → check after.

## Changed — the ONE build replacement (R-V32-VER)
- `validateSave` (`src/v20_sync.js`, `SAVE_VERSION=12`) now rejects a
  save whose `v7.meta.saveVersion` is present and is not 12:
  `errs.push('bad-version:'+obj.v7.meta.saveVersion)`, added right
  after the `bad-v7` check, applied to `src/`, `out/*.js` and the
  inlined block with exact-count asserts. Absent `saveVersion`
  (pre-V12 saves have no `meta`) is accepted; 12 is accepted.
  **Preventive hardening, not a fix for an observed bug** — no
  bad-version save has ever been observed.

## Fixed — post-build fixes (2026-11-19, `tools/v32/fix_b32.py`)

Applied to `src/v32.js` + `src/v21.js`, mirrored to `out/*.js` and to
the inlined blocks in `out/index.html` with exact-count asserts.
`build_v32.py` was NOT re-run (it refuses on the moved base hash);
its docstring records both fixes. Post-fix `out/index.html` sha256
`c3639bc7cec58d10125fa0c5bada0d3ed04c9bfe23a6581fec8b40b2e54fda0a`,
2,068,255 B (+886 B over the pre-fix build).

- **B-32-2 (panel rendered `#v31panel` ×2 + `#v32monitor` ×2):**
  each layer's `wrapDataPanel` guarded idempotence with only its own
  marker, and both layers re-init on `DOMContentLoaded`, so V31
  re-wrapped V32's wrapper and every render doubled the sections.
  Fix (V32-only, `v31.js` untouched): the V32 wrappers now carry
  BOTH markers (`__v31` + `__v32`). Verification showed the overlap
  is THREE functions, not one — V31 also wraps
  `__v21.openAccount` / `__v21.closeAccount`, and V32 wraps the same
  two — so all three V32 wrappers got the dual marker (V32's other
  wraps do not overlap: global `save`, `__v20.flush`,
  `__v31.recordBackupEvent`). Verified: `test32.js` §8 44/0/0 (was
  43/1/0) and real Chrome V32-A `#v31panel` ×1 + `#v32monitor` ×1 on
  first render and after re-render.
- **B-32-3 (V16.3 F-02 fix incomplete on account-switch):** the
  F-02c/d flush guards in `src/v21.js` sat AFTER
  `writeVerified(SAVE_KEY, …)`, so the flush wrote stale in-memory
  `S` over the just-switched bytes (real Chrome: 3/3 lost, XP 1005
  instead of the switched guest XP 9201–9203). Fix: the guard (text
  unchanged, still ×2 in `v21.js`) moved to the FIRST statement of
  `activateAccount()` and `activateGuest()`, before `parkSlot()` and
  `readSlot()`. Note: the R-F-02c/d replacement text lives in
  `build_v31.py`, not `build_v32.py` — there was no F-02 text in
  `build_v32.py` to change, so the corrected placement is recorded
  in its docstring instead. Verified in real Chrome: account→guest
  0/3 lost (switched XP 9201–9203, account home holds the flushed
  1005), guest→account 0/3 lost (9301–9303, guest home holds 1005).
- **D-32-2 (driver setup bug, fixed in `verify-v32c.js`, not a
  product bug):** the V32-D account-switch gate seeded the session
  as guest and planted the target bytes in the guest home — a
  guest→guest "switch". `activateGuest()` then legitimately parks
  the live slot (which IS the guest's save) into the guest home,
  overwriting the planted bytes, so no correct implementation could
  pass (probe: slot 1005, guest home 1005 after the switch). The
  gate now seeds the session as an account (the real `signOut21`
  flow) and also asserts the account home holds the flushed 1005.

## Preserved (verified by the build gates)
- All V31 fixes intact in the built file (F-01 merge branch,
  F-01-en18 flat V18 wins, F-03a/b, F-13a/b, F-14, F-15, F-02a–d,
  F-16, F-11, F-12, C1a/b/c, C6/C6b/C6c, C9 `importFile(imp)`) —
  re-asserted in `package_v32.py` from the verbatim V31 fragment list.
- Old layer versions intact: 13.0.0, 15.0.0, 15.1.0, 15.2.0, 15.3.0,
  16.0.0, 16.3.0. Marker order ends v32 (styles + scripts). KO tabs
  line unchanged (`v23kotab` ×1, `v32kotab` 0×). No V28/V29/V30
  markers. No out-of-scope markers (`v21emailbtn`, `_esc21`,
  `armV27Obs`, `rearmObserver`, `_speakXp`, `V29 (F-05)`).

## Build notes (honest)
- `build_v32.py` was run exactly once. It completed steps 1–4 (base
  verified, R-V32-VER applied to `src/v20_sync.js` + mirrored to
  `out/`, title changed, V32 injected last) and then died at its own
  step-5 assert: the assert expected `bad-version` ×1 in the built
  file, but the true count is ×2 — one guard in `validateSave` plus
  one mention in the `v32.js` header comment ("rejected with
  bad-version:<n>"). That was a bug in the build script's assert, not
  in the build. The script was NOT re-run (it now refuses: the base
  hash moved and `__v32` exists). Step 5 was completed by hand:
  `node --check` on `src/v32.js`, `src/v20_sync.js`, `out/v32.js`,
  `out/v20_sync.js` (all OK), `build_v32.py` copied into `out/`, and
  every step-5 assert re-run as a read-only script
  (`/tmp/verify_v32_step5.py`, ALL PASS — see the smoke test §0). The
  assert is fixed in `build_v32.py` (and the matching assert in
  `package_v32.py`) to expect ×2 with the guard text ×1.
- Built `out/index.html` sha256 (pre-fix)
  `cde193493a77bcd73ad9b204c092942d41a9b45f13beab84cc1652f9a212a1be`,
  2,067,369 B (base V16.3: 2,040,471 B, +26,898 B for the V32 layer +
  the one-line guard). After the B-32-2/B-32-3 fixes
  (`tools/v32/fix_b32.py`): sha256
  `c3639bc7cec58d10125fa0c5bada0d3ed04c9bfe23a6581fec8b40b2e54fda0a`,
  2,068,255 B (+886 B).

## Out of scope (not built)
- Claude #3/#4/#5; V17-1/V17-2/V17-3; F-04/F-05/F-07/F-09/F-10;
  V17-4 typo; M1/M2; V9 word fixes; V14.1; PR #7 follow-ups; F-12
  full-wipe question (still pending Anh). No V28/V29/V30 files.

## Still not tested (honest)
- `tools/v32/test32.js` Node vm suite — **run: 185 PASS / 0 FAIL /
  8 SKIP, twice on the build + once on the final packaged ZIP**
  (per-section counts in the smoke test §1). The §9 SKIPs are the vm
  harness's scope limit only: the §9 gates were run for real in
  Chrome (§7 of the smoke test), all passing, 0 console errors.
- Live Firebase sync/login — Anh must run the `FIREBASE_SETUP.md`
  checklist; unconfigured, the game is fully offline and says so.
