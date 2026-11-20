# PUSH MANIFESTS — V18.8 Boss-Fight Readability (layer V43, 18.8.0)

**DO NOT PUSH from this document alone — it is a manifest for a future GitHub push, to be executed by the parent agent / Anh. No push, merge, or main edit has been done by the V18.8 build.**

- **Repo:** `tranminhnhat496-star/APP-TIENG-HANs`
- **Base for the push:** main @ `a9cc18ae` (merge of PR #23, V18.6).
- **PR #24 (V18.7, branch `muse/unlock-shortcuts-v187` @ `137c8d3c`) was still OPEN when this manifest was written.** At push time, branch from the NEW main if Anh has merged PR #24 first (same rule as V18.7's manifest).
- **Suggested branch:** `muse/boss-fight-readability-v188`
- **Suggested PR:** draft PR, base `main`, title `V18.8 Boss-Fight Readability (layer V43)`.
- **Do NOT auto-merge. Do NOT edit main directly. Do NOT force-push. Do NOT rewrite history.** Anh merges PRs himself.
- **Do NOT touch `firebase-config.js`** (the repo's real config; the ZIP ships the placeholder only).

## Files to push (from `~/workspace/v7build/out/` + docs at the repo root)

Derived from a ZIP-vs-ZIP diff by name + CRC32: `Korean_English_Vocab_Farm_V18_8_Boss_Fight_Readability.zip` (774 files) vs `Korean_English_Vocab_Farm_V18_7_Unlock_Shortcuts.zip` (763 files). The V18.8 ZIP is the content of the push.

### ADDED (11)

- `v43.js`, `v43.css` (new layer files — CSS-only fix, no logic)
- `build_v43.py`, `package_v43.py` (build/package scripts, shipped in `out/`)
- `README_V18_8_BOSS_FIGHT_READABILITY.md`, `CHANGELOG_V18_7_to_V18_8.md`, `SMOKE_TEST_V18_8_2026-11-21.md` (docs at the workspace root; the ZIP copies them into `out/` too, as with V42)
- `tools/v43/test43.js`, `tools/v43/verify-v43c.js`, `tools/v43/repro-v43.js`, `tools/v43/PUSH_MANIFESTS.md` (this manifest; the test scripts are inside the ZIP this time — finished BEFORE packaging)

### CHANGED (1)

- `out/index.html` (sha256 `3ad47dbf82fb2d5e508ff13b2d441ad63c061690361d18fd113c84f4466ee73b`, 2,421,418 B — title swap + V43 layer injection only; NO `src/` replacements)

### REMOVED (0)

- Nothing removed. All other `out/` files unchanged from V18.7 (including all art under `assets/` and all vocabulary data).
- Docs-only updates to previous versions' files are NOT pushed (V18.5 precedent); none apply here — the only docs in the diff are the three new V18.8 docs above.

## Pre-push checklist

- [ ] PR #24 (V18.7) merged by Anh? If yes, rebase/branch from the new main; if no, branch from main @ `a9cc18ae` and note the dependency in the PR body.
- [x] Pristine V18.7 backup complete in `tools/v43/backup-v18.7/` (hash-verified: `out__index.html` = `9d4a113b…`; out/ files sourced from the hash-verified pristine copy `tools/v43/pristine-v18.7-out/`).
- [x] jsdom suite (`tools/v43/test43.js`) — **141 PASS / 0 FAIL / 8 SKIP, ×3 runs** on the built `out/`.
- [x] Real-Chrome gates (`tools/v43/verify-v43c.js`) — **26/26 PASS, ×3 runs**, 0 console errors/warnings/dialogs.
- [ ] Anh's real-phone test after deploy (GitHub Pages), as always.

## What this version fixes (for the PR body)

Anh's laptop screenshot: the boss-fight question card was nearly unreadable — dark text on a dark card. Root cause: the V19 fight panel is fixed dark (`.v19qcard` #241b42) but its text inherited the light theme's dark ink/mute (qword 1.22:1, boss name 1.12:1). V43 is a CSS-only layer that sets explicit light text on the dark fight cards (qword now 16.02:1, mute 8.69:1, options 14.03:1, disabled pet-skill button 5.87:1), plus the V18 warn/feedback/chip/break-bar failures in the light theme. No fight logic, reward, XP, SRS, pet, farm or save change; no other screen touched (V28 Boss UI stays stopped).
