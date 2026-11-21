# PUSH MANIFESTS — V19.0.1 Legendary Difficulty + Korean Boss XP (layer V46, 19.0.1)

**DO NOT PUSH from this document alone — it is a manifest for a future GitHub push, to be executed by the parent agent / Anh. No push, merge, or main edit has been done by the V19.0.1 build.**

- **Repo:** `tranminhnhat496-star/APP-TIENG-HANs`
- **Base for the push:** main @ `2f1bbc42c8` (merge of PR #25, V18.8).
- **PR #26 (V18.9, branch `muse/legendary-freeze-fix-v189` @ `743ad6f3`) was still OPEN when this manifest was written.** At push time, branch from the NEW main if Anh has merged PR #26 first (same rule as V18.9's and V19.0's manifests). If PR #26 is merged, the base becomes the new main; the V46 diff below is still the exact file set (V18.9's files are already in main then, V19.0's are NOT — V19.0 was never pushed either; if Anh merges PRs in order, push V19.0 first, then V19.0.1 on top of it).
- **Suggested branch:** `muse/legdiff-koxp-v1901`
- **Suggested PR:** draft PR, base `main`, title `V19.0.1 Legendary Difficulty + Korean Boss XP (layer V46)`.
- **Do NOT auto-merge. Do NOT edit main directly. Do NOT force-push. Do NOT rewrite history.** Anh merges PRs himself.
- **Do NOT touch `firebase-config.js`** (the repo's real config; the ZIP ships the placeholder only).

## ZIP (filled after packaging)

- **ZIP file:** `Korean_English_Vocab_Farm_V19_0_1_LegDiff_KO_XP.zip`
- **ZIP sha256 / size / file count:** _to be filled after `package_v46.py` runs — see the packager output._
- **out/index.html sha256 `d3d27cdab865befb1aaa495856b561f34520f9607dcdfdeb025a661b765de271`, 2,449,080 B** (base V19.0: `d5fb0ddcd12a314b0f72a8191ec23b0fa4d04b923aa3dd53404e0ddad8e441bb`, 2,433,827 B).

## Files to push (from `~/workspace/v7build/out/` + docs at the repo root)

Derived from an out-vs-pristine sha256 diff (`out/` vs `tools/v46/pristine-v19.0-out/`), verified by `package_v46.py` at packaging time: the V46 build changed exactly 4 files and added exactly the V46 set below; nothing removed; every other file is byte-identical to V19.0. The V19.0.1 ZIP is the content of the push.

### ADDED (13)

- `out/v46.js`, `out/v46_data.js` (new layer files — `window.__v46` shared XP function + `window.__V46_DATA` 23 weakness overrides)
- `out/build_v46.py`, `out/package_v46.py` (build/package scripts, shipped in `out/`)
- `README_V19_0_1_LEGDIFF_KO_XP.md`, `CHANGELOG_V19_0_to_V19_0_1.md`, `SMOKE_TEST_V19_0_1_2026-11-21.md` (docs at the workspace root; the ZIP copies them into `out/` too, as with V45)
- `tools/v46/test46.js`, `tools/v46/verify-v46c.js`, `tools/v46/repro-v46.js`, `tools/v46/analyze.js`, `tools/v46/PUSH_MANIFESTS.md` (this manifest; the test scripts are inside the ZIP — finished BEFORE packaging)

### CHANGED (4)

- `out/index.html` (sha256 `d3d27cdab865befb1aaa495856b561f34520f9607dcdfdeb025a661b765de271`, 2,449,080 B — title swap + V46 layer injection only)
- `out/v18.js` (legDiff getter-read fix with logged fallback; `en18()` `koStreak` default; mark18/markKO call the shared XP function, EN inline block kept as fallback-only)
- `out/v19.js` (same pattern: `en19()` `koStreak` default; mark19/markKO19 call the shared XP function, EN inline block kept as fallback-only)
- `out/v34.js` (`weakFor` consults `__V46_DATA.weakExplicit` first, after the KO-deck rule)

### REMOVED (0)

- Nothing removed. All other `out/` files unchanged from V19.0 (including all art under `assets/` and all vocabulary data, and all tools/v37–v45 files shipped by earlier packagers).
- Docs-only updates to previous versions' files are NOT pushed (V18.5 precedent); none apply here — the only docs in the diff are the three new V19.0.1 docs above.
- `tools/v46/backup-v19.0/`, `tools/v46/pristine-v19.0-out/`, `tools/v46/logs/`, `tools/v46/shots/`, and the dev probes (`probe-fight.js`, `probe-meter.js`) are NOT in the ZIP and are NOT pushed.
