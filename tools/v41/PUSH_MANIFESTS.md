# PUSH MANIFESTS — V18.6 Bug Fixes III (layer V41, 18.6.0)

**DO NOT PUSH from this document alone — it is a manifest for a future GitHub push, to be executed by the parent agent / Anh. No push, merge, or main edit has been done by the V18.6 build.**

- **Repo:** `tranminhnhat496-star/APP-TIENG-HANs`
- **Base for the push:** main @ `523061b5` (merge of PR #21, V18.4).
- **PR #22 (V18.5, branch `muse/bug-fixes-ii-v185` @ `b69c1701`) was still OPEN when this manifest was written.** At push time, branch from the NEW main if Anh has merged PR #22 first (same rule as V18.5's manifest).
- **Suggested branch:** `muse/bug-fixes-iii-v186`
- **Suggested PR:** draft PR, base `main`, title `V18.6 Bug Fixes III (layer V41)`.
- **Do NOT auto-merge. Do NOT edit main directly. Do NOT force-push. Do NOT rewrite history.** Anh merges PRs himself.
- **Do NOT touch `firebase-config.js`** (the repo's real config; the ZIP ships the placeholder only).

## Files to push (from `~/workspace/v7build/out/` + docs at the repo root)

The push is the content of the V18.6 ZIP (`Korean_English_Vocab_Farm_V18_6_Bug_Fixes_III.zip`, 744+ files — same tree as V18.5 plus the V41 layer), i.e.:

- `out/index.html` (sha256 `f0576130e6ff53478727319fa54fd5d703d76717b42561c1b29b5c41849697eb`, 2,397,154 B)
- `out/v41.js`, `out/v41.css` (new layer files)
- `out/v15.js`, `out/v19.js`, `out/v20.js`, `out/v17_a1a2.js`, `out/v17_oxford.js` (patched)
- `out/v17_a1a2.json`, `out/v17_oxford.json` (patched, 999 / 3395 rows)
- All other `out/` files unchanged from V18.5 (including all art under `assets/`).
- Docs at the workspace root: `README_V18_6_BUG_FIXES_III.md`, `CHANGELOG_V18_5_to_V18_6.md`, `SMOKE_TEST_V18_6_2026-11-20.md` (the ZIP copies them into `out/` too, as with V40).
- Build/test scripts: `build_v41.py`, `package_v41.py`, `tools/v41/test41.js`, `tools/v41/verify-v41c.js`, `tools/v41/repro-v41.js` (allowlist only — the `backup-v18.5/`, `logs/` and `shots/` directories stay OUT of the push; the backup is build input, not deliverable).

## Pre-push checklist

- [ ] PR #22 (V18.5) merged by Anh? If yes, rebase/branch from the new main; if no, branch from main @ `523061b5` and note the dependency in the PR body.
- [x] Pristine V18.5 backup complete in `tools/v41/backup-v18.5/` (15 files, hash-verified against the V18.5 ZIP: `out__index.html` = `9a2fdd74…`, all 5 `src__*.js` match the ZIP's `out/*.js`, `data__v17_a1a2.json` = ZIP out copy + 54 `NGHỀ NGHIỆP` fixes, 1000 rows).
- [ ] Chrome gates (repro-v41 + verify-v41c) still unrun — re-run where Chrome 157 is alive before or after the push, and report the verdicts.
- [ ] Anh's real-phone test after deploy (GitHub Pages), as always.
