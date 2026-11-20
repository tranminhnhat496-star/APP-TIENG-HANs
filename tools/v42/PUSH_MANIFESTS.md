# PUSH MANIFESTS — V18.7 Unlock Shortcuts (layer V42, 18.7.0)

**DO NOT PUSH from this document alone — it is a manifest for a future GitHub push, to be executed by the parent agent / Anh. No push, merge, or main edit has been done by the V18.7 build.**

- **Repo:** `tranminhnhat496-star/APP-TIENG-HANs`
- **Base for the push:** main @ `b37a750f` (merge of PR #22, V18.5).
- **PR #23 (V18.6, branch `muse/bug-fixes-iii-v186` @ `23cc16d1`) was still OPEN when this manifest was written.** At push time, branch from the NEW main if Anh has merged PR #23 first (same rule as V18.6's manifest).
- **Suggested branch:** `muse/unlock-shortcuts-v187`
- **Suggested PR:** draft PR, base `main`, title `V18.7 Unlock Shortcuts (layer V42)`.
- **Do NOT auto-merge. Do NOT edit main directly. Do NOT force-push. Do NOT rewrite history.** Anh merges PRs himself.
- **Do NOT touch `firebase-config.js`** (the repo's real config; the ZIP ships the placeholder only).

## Files to push (from `~/workspace/v7build/out/` + docs at the repo root)

Derived from a ZIP-vs-ZIP diff by name + CRC32: `Korean_English_Vocab_Farm_V18_7_Unlock_Shortcuts.zip` (763 files) vs `Korean_English_Vocab_Farm_V18_6_Bug_Fixes_III.zip` (755 files). The V18.7 ZIP is the content of the push.

### ADDED (8)

- `v42.js`, `v42.css` (new layer files)
- `build_v42.py`, `package_v42.py` (build/package scripts, shipped in `out/`)
- `README_V18_7_UNLOCK_SHORTCUTS.md`, `CHANGELOG_V18_6_to_V18_7.md`, `SMOKE_TEST_V18_7_2026-11-20.md` (docs at the workspace root; the ZIP copies them into `out/` too, as with V41)
- `tools/v42/PUSH_MANIFESTS.md` (this manifest)

### CHANGED (3)

- `out/index.html` (sha256 `9d4a113b72898718c3f1fbb184652a90a58b86a1696353117afadd7f239a9dd2`, 2,412,801 B)
- `out/v33.js`, `out/v35.js` (patched — one gate-card line each)

### REMOVED (0)

- Nothing removed. All other `out/` files unchanged from V18.6 (including all art under `assets/`).
- Docs-only updates to previous versions' files are NOT pushed (V18.5 precedent); none apply here — the only docs in the diff are the three new V18.7 docs above.

## Pre-push checklist

- [ ] PR #23 (V18.6) merged by Anh? If yes, rebase/branch from the new main; if no, branch from main @ `b37a750f` and note the dependency in the PR body.
- [x] Pristine V18.6 backup complete in `tools/v42/backup-v18.6/` (5 files, hash-verified: `out__index.html` = `f0576130…`, `src__v33.js` = `out__v33.js`, `src__v35.js` = `out__v35.js`; out/ files sourced from the hash-verified pristine copy `tools/v42/pristine-v18.6-out/`).
- [ ] jsdom suite (`tools/v42/test42.js`) + real-Chrome gates — run by the separate test worker after the build lands; report the verdicts before or after the push.
- [ ] Anh's real-phone test after deploy (GitHub Pages), as always.

## Fixed in this revision — the Skyroot/70-gate false line (was the flagged known limit)

- **Skyroot shortcut while the 70-win Chrono gate is closed now points at the Chrono shortcut.** `__v33.bossUnlocked` returns `false` for all Chrono bosses until 70 wins, so at 13/86 wins the old overlay showed the false "Đã thắng đủ 8 boss Chrono…" line. `skyrootTarget()` now falls back to `chronoTarget(lang)` (`viaChrono:true`) while the gate is closed, and `goSkyroot()` launches it through the shared `launchChronoTarget` pool routing. The null line is now the honest "Không tìm thấy boss nào có thể đánh ngay — hãy đóng và mở lại Thánh Địa để cập nhật." (defensive-only).
