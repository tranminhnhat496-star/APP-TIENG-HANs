# PUSH MANIFESTS — V19.0 Round-3 Bug Fixes (layer V45, 19.0.0)

**DO NOT PUSH from this document alone — it is a manifest for a future GitHub push, to be executed by the parent agent / Anh. No push, merge, or main edit has been done by the V19.0 build.**

- **Repo:** `tranminhnhat496-star/APP-TIENG-HANs`
- **Base for the push:** main @ `2f1bbc42c8` (merge of PR #25, V18.8).
- **PR #26 (V18.9, branch `muse/legendary-freeze-fix-v189` @ `743ad6f3`) was still OPEN when this manifest was written.** At push time, branch from the NEW main if Anh has merged PR #26 first (same rule as V18.9's manifest).
- **Suggested branch:** `muse/round3-bug-fixes-v190`
- **Suggested PR:** draft PR, base `main`, title `V19.0 Round-3 Bug Fixes (layer V45)`.
- **Do NOT auto-merge. Do NOT edit main directly. Do NOT force-push. Do NOT rewrite history.** Anh merges PRs himself.
- **Do NOT touch `firebase-config.js`** (the repo's real config; the ZIP ships the placeholder only).

## Files to push (from `~/workspace/v7build/out/` + docs at the repo root)

Derived from an out-vs-pristine diff by name + sha256: `out/` (787 files) vs `tools/v45/pristine-v18.9-out/` (784 files), plus the new docs and `tools/v45/` files. Verified against the ZIP-vs-ZIP diff after packaging (see `SMOKE_TEST_V19_0_2026-11-21.md`): `Korean_English_Vocab_Farm_V19_0_Round3_Bug_Fixes.zip` vs `Korean_English_Vocab_Farm_V18_9_Legendary_Freeze_Fix.zip` (784 files). The V19.0 ZIP is the content of the push.

### ADDED (12)

- `out/v45.js`, `out/v45.css` (new layer files — version marker + corrupt-save warning display + weakchip list-row contrast)
- `out/build_v45.py`, `out/package_v45.py` (build/package scripts, shipped in `out/`)
- `README_V19_0_ROUND3_BUG_FIXES.md`, `CHANGELOG_V18_9_to_V19_0.md`, `SMOKE_TEST_V19_0_2026-11-21.md` (docs at the workspace root; the ZIP copies them into `out/` too, as with V44)
- `tools/v45/test45.js`, `tools/v45/verify-v45c.js`, `tools/v45/repro-v45.js`, `tools/v45/probe-toast.js`, `tools/v45/PUSH_MANIFESTS.md` (this manifest; the test scripts are inside the ZIP this time — finished BEFORE packaging)

### CHANGED (9)

- `out/index.html` (sha256 `d5fb0ddcd12a314b0f72a8191ec23b0fa4d04b923aa3dd53404e0ddad8e441bb`, 2,433,827 B — title swap + the 14-site due-definition change across the embedded v15/v17/v22/v25/v27/v34 + index-only `load()` quarantine + `enIcon()` guard + the v31/v23 lead fixes + V45 layer injection only)
- `out/v15.js` (7 sites: counts15, dueTodayCount, reviewHTML, reviewStart, wordsFiltered onlyDue + BT status filters — all due = box 1–4 AND due<=now)
- `out/v17.js` (statsOf, filterWords — due = box 1–4)
- `out/v22.js` (unitStats, filterEntries — due = box 1–4)
- `out/v25.js` (statsOf — due = box 1–4)
- `out/v27.js` (dashboard dueN EN + KO — due = box 1–4)
- `out/v34.js` (statsForList — due = box 1–4)
- `out/v31.js` (snapshotCurrent unique keys; restoreRaw size-check first; deleteHistoryEntry single-delete)
- `out/v23.js` (speedHatch ready-hatch check before the gem spend)

### REMOVED (0)

- Nothing removed. All other `out/` files unchanged from V18.9 (including all art under `assets/` and all vocabulary data).
- Docs-only updates to previous versions' files are NOT pushed (V18.5 precedent); none apply here — the only docs in the diff are the three new V19.0 docs above.

## Pre-push checklist

- [ ] PR #26 (V18.9) merged by Anh? If yes, rebase/branch from the new main; if no, branch from main @ `2f1bbc42c8` and note the dependency in the PR body.
- [x] Pristine V18.9 backup complete in `tools/v45/backup-v18.9/` (hash-verified: `out__index.html` = `1c409217…`; out/ files sourced from the hash-verified pristine copy `tools/v45/pristine-v18.9-out/`).
- [x] vm suite (`tools/v45/test45.js`) — **249 PASS / 0 FAIL / 7 SKIP, ×2 runs** on the final built `out/`.
- [x] Real-Chrome gates (`tools/v45/verify-v45c.js`) — **39/39 PASS, ×2 runs**, 0 console errors/warnings/dialogs.
- [ ] Anh's real-phone test after deploy (GitHub Pages), as always.

## Note for the PR body (copy honestly)

- Bug-fix build only (round-3 review): never-learned words no longer count as "due" (fresh save 4,889 → 0); corrupt/card-less saves are quarantined byte-exact with an honest 8 s warning instead of being silently destroyed; pre-restore snapshot keys are unique; the 20 topic icons no longer render as `assets/icons/v6/undefined`; `.v34weakchip` list rows pass WCAG AA in light + dark (worst 5.54 light / 8.69–9.64 dark, 1280/1366/360).
- NOT in this build (by design): legDiff scaling + weakness table + KO boss 0 XP — Claude decided DO, but they go into the separate follow-up V19.0.1 (layer V46) after V19.0. C-R3-3 duplicate headwords (4 pairs, distinct senses) deliberately NOT deduped. See `README_V19_0_ROUND3_BUG_FIXES.md` → "Not changed".
