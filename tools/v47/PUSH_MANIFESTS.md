# PUSH MANIFESTS — V19.2 Duplicate Senses (layer V47, 19.2.0)

**Manifest base: main @ `f4518288dd` (PR #29 merged — V19.0.1 on main).**
**Suggested branch: `muse/duplicate-senses-v192`.**
**Do NOT merge automatically — Anh merges PRs himself. No force-push, no direct main edits, no history rewrite.**

File lists below are the exact ADDED / CHANGED / REMOVED sets from the
out-vs-pristine diff (`out/` rebuilt V19.2 vs `tools/v47/backup-v19.0.1/`,
the hash-verified pristine V19.0.1 tree), verified against the ZIP
contents after packaging (`Korean_English_Vocab_Farm_V19_2_Duplicate_Senses.zip`).

## ADDED (10 files)

- `v47.js` — new layer (`window.__v47={version:'19.2.0'}`, `splitDuplicateSenses`, `labelOf`).
- `build_v47.py` — build script (gates on the V19.0.1 base hash, refuses if the layer is present, applies the devoted deletion at build time).
- `package_v47.py` — packager for this ZIP.
- `README_V19_2_DUPLICATE_SENSES.md`
- `CHANGELOG_V19_0_1_to_V19_2.md`
- `SMOKE_TEST_V19_2_2026-11-21.md`
- `tools/v47/test47.js` — Node vm suite (182 PASS / 0 FAIL / 7 SKIP, ×3 runs on the build).
- `tools/v47/verify-v47c.js` — real-Chrome 157 gates (50 verdicts, ×2 runs).
- `tools/v47/repro-v47.js` — repro-first probe on the pristine base, re-run on the build.
- `tools/v47/PUSH_MANIFESTS.md` — this file.

## CHANGED (10 files)

- `index.html` — the five edited embedded blocks re-synced wholesale (`v15js`, `v17js`, `v18js`, `v19js`, `v27js`), `v47js` injected last before `</body>`, devoted no-938 row deleted from the inline `v17data` block; title now "V19.2 — Duplicate Senses". sha256 `0aff5cebb7474535c3d7f635b289aaffe81d4f023d0bc64d798ae25fb918037f`, 2,457,229 B.
- `v15.js` — pickPool headword dedupe, distractors guard ×2 (base + in-scope pool), buildWords hook call, sense labels in MC / Speed / Review / boss meaning-mode prompts.
- `v17.js` — `wordCard()` uses `labelOf(w)`.
- `v18.js` — distractorsEN guard ×2, boss meaning-mode prompt label.
- `v19.js` — distractorsEN guard ×2, boss meaning-mode prompt label.
- `v27.js` — distractorsEN guard ×3 (base + in-scope + `rest` fallback), mc-ev prompt label.
- `v17_a1a2.js` — devoted no-938 row deleted.
- `v17_a1a2.json` — devoted no-938 row deleted (999 → 998 rows).
- `SMOKE_TEST_V19_0_1_2026-11-21.md` — NOT a V47 change: pre-existing drift — the V19.0.1 ZIP hash/size/counts (`f16f6ce5…`, 77,967,485 B, 808 files) were filled into the workspace-root copy after `package_v46.py` ran; the pristine backup predates the fill. The new ZIP carries the filled version.
- `tools/v46/PUSH_MANIFESTS.md` — NOT a V47 change: same pre-existing drift (V19.0.1 ZIP hash/size/counts filled in after packaging; the copy of that manifest inside the V19.0.1 ZIP predates the fill).

## REMOVED (none)

- No files removed. The devoted merge deletes one data row, not a file.

## NOT in this push (stays out of the ZIP)

- `tools/v47/backup-v19.0.1/` (pristine V19.0.1 build input), `tools/v47/backup-v19.0.1-build/` (pre-fix build inputs), `tools/v47/logs/`, `tools/v47/shots/`, `tools/v47/review-A-v46.md`, `tools/v47/review-B-regress.md`, `tools/v47/verify-v47a.js`, `tools/v47/verify-v47b.js` (round-4 review artifacts, not this build's).
- Superseded draft PR #28 is still open and needs Anh to close it (PR #29 replaced it) — unrelated to this push.

## Verification summary (see `SMOKE_TEST_V19_2_2026-11-21.md` for the full record)

- `test47.js`: 182 PASS / 0 FAIL / 7 SKIP (Chrome-only) ×3 runs on the build + ×1 on the packaged ZIP.
- `verify-v47c.js` (real Chrome 157): 50/50 PASS ×2 runs, 0 console errors/warnings/dialogs.
- Rebuild-from-scratch reproduces `out/index.html` byte-identically (sha256 `0aff5ceb…`).
- Migration effects (honest): WORDS 4,889 → 4,892; FAMILY 100 → 99; `a1a2Total` 999 → 998; per-topic learned now needs each sense mastered separately (already-claimed rewards stay claimed).
