# PUSH MANIFESTS — V18.9 Legendary Freeze Fix (layer V44, 18.9.0)

**DO NOT PUSH from this document alone — it is a manifest for a future GitHub push, to be executed by the parent agent / Anh. No push, merge, or main edit has been done by the V18.9 build.**

- **Repo:** `tranminhnhat496-star/APP-TIENG-HANs`
- **Base for the push:** main @ `ecc68ff9` (merge of PR #24, V18.7).
- **PR #25 (V18.8, branch `muse/boss-fight-readability-v188` @ `1398a4bf`) was still OPEN when this manifest was written.** At push time, branch from the NEW main if Anh has merged PR #25 first (same rule as V18.8's manifest).
- **Suggested branch:** `muse/legendary-freeze-fix-v189`
- **Suggested PR:** draft PR, base `main`, title `V18.9 Legendary Freeze Fix (layer V44)`.
- **Do NOT auto-merge. Do NOT edit main directly. Do NOT force-push. Do NOT rewrite history.** Anh merges PRs himself.
- **Do NOT touch `firebase-config.js`** (the repo's real config; the ZIP ships the placeholder only).

## Files to push (from `~/workspace/v7build/out/` + docs at the repo root)

Derived from a ZIP-vs-ZIP diff by name + CRC32: `Korean_English_Vocab_Farm_V18_9_Legendary_Freeze_Fix.zip` (784 files) vs `Korean_English_Vocab_Farm_V18_8_Boss_Fight_Readability.zip` (774 files). The V18.9 ZIP is the content of the push.

### ADDED (10)

- `v44.js` (new layer file — version marker only, no logic)
- `build_v44.py`, `package_v44.py` (build/package scripts, shipped in `out/`)
- `README_V18_9_LEGENDARY_FREEZE_FIX.md`, `CHANGELOG_V18_8_to_V18_9.md`, `SMOKE_TEST_V18_9_2026-11-21.md` (docs at the workspace root; the ZIP copies them into `out/` too, as with V43)
- `tools/v44/test44.js`, `tools/v44/verify-v44c.js`, `tools/v44/repro-v44.js`, `tools/v44/PUSH_MANIFESTS.md` (this manifest; the test scripts are inside the ZIP this time — finished BEFORE packaging)

### CHANGED (2)

- `out/index.html` (sha256 `1c409217a6511839fb2a5dfdcffda33c2adc6101116480f7d5f3b1b9229f0bdd`, 2,423,227 B — title swap + two `legDiff()` hoists inside the embedded v18.js + V44 layer injection only; NO other `src/` logic changed)
- `out/v18.js` (same two `legDiff()` hoists as the embedded copy — the standalone file now matches `src/v18.js`; the first package left it stale and it was synced during verification, before any push)

Note: the first package (ZIP sha256 `7a7fd647…`, superseded) left the standalone `out/v18.js` stale; the current ZIP carries the fixed file, so the push carries both the built `out/index.html` and the fixed standalone file.

### REMOVED (0)

- Nothing removed. All other `out/` files unchanged from V18.8 (including all art under `assets/` and all vocabulary data).
- Docs-only updates to previous versions' files are NOT pushed (V18.5 precedent); none apply here — the only docs in the diff are the three new V18.9 docs above.

## Pre-push checklist

- [ ] PR #25 (V18.8) merged by Anh? If yes, rebase/branch from the new main; if no, branch from main @ `ecc68ff9` and note the dependency in the PR body.
- [x] Pristine V18.8 backup complete in `tools/v44/backup-v18.8/` (hash-verified: `out__index.html` = `3ad47dbf…`; out/ files sourced from the hash-verified pristine copy `tools/v44/pristine-v18.8-out/`).
- [x] jsdom suite (`tools/v44/test44.js`) — **132 PASS / 0 FAIL / 7 SKIP, ×3 runs** on the built `out/`.
- [x] Real-Chrome gates (`tools/v44/verify-v44c.js`) — **27/27 PASS, ×2 runs**, 0 console errors/warnings/dialogs.
- [ ] Anh's real-phone test after deploy (GitHub Pages), as always.

## Note for the PR body (copy honestly)

- The freeze is fixed by hoisting `legDiff()` out of the per-item filters; the Legendary pool is proven identical (550 words A2 300/B1 250 + 24 grammar A2 12/B1 12, same ids at mastered 0/250/700).
- NEW finding, NOT fixed in this version (needs Anh's decision): `legDiff()` never actually reads the mastered count — `V15().counts` is a getter, so `V15().counts().mastered` throws, the try/catch swallows it, and `legDiff()` always returns `['A2','B1']`. Legendary difficulty never scales with progress. Fixing the read would change pools for players with ≥200 mastered words. See `README_V18_9_LEGENDARY_FREEZE_FIX.md` → "Known limits / findings".
