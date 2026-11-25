# PUSH_MANIFESTS — V19.6 Sentence Forge Auto, REBASED onto V19.5.1 (19.6.0, layer V51)

**Base:** main @ `949ad7bc` **AFTER PR #36 (V19.5.1) merges** — the push itself waits for that merge. Do NOT branch from the pre-merge main.
**Suggested branch:** `muse/sentence-forge-auto-v196`
**ZIP:** `Korean_English_Vocab_Farm_V19_6_Sentence_Forge_Auto.zip` — sha256 `c20a99247422914a40d7db9096ba370c6519662ed6173f75b5c6121ce1dd38e9`, 79,267,115 B (75.60 MB), 874 files.
**Built `out/index.html`:** sha256 `48555ddfd1ab7c9e8a55fba8cc1eb804ee27b09f665a45a4f5c54e80bb807a8b`, 2,556,928 B.
**ZIP↔out byte-identity:** **verified** — the ZIP's `index.html` is byte-identical to `out/index.html`, checked by `package_v51r.py` and re-verified independently after publishing.
**Rebase:** this V19.6 is layer V51 applied onto the V19.5.1 base (NOT the V19.4 base of the original 2026-11-22/23 build, ZIP `8168b236…`, superseded). The 6 V51 edits in `src/v48.js` (7 sites) were re-derived against the newer shared file, which carries V50 score tracking + V52 TTS; `src/v51.js`/`src/v51.css` are byte-identical to the original. `v51` loads before `v52` (v52 stays last).

## Files to push (13 paths — flat repo-root layout, same as all V18.x/V19.x pushes)

### CHANGED (2)
- `index.html` — V19.6 title + v48 embedded block re-synced + `v51` style/script injected before `v52js` (v52 last)
- `v48.js` — V51 Forge Auto: `forgeAuto` flag (default + fallback + `setFlag` list), KO deck-preference hook, EN genPool hook, pre-session scope/count line, in-session badge line. V50 score code + V52 Dojo delegation untouched.

### ADDED (11)
- `v51.js` — `window.__v51={version:'19.6.0'}` — genPool/genItem (scope/learned targets, EX-EXTEND + POS templates, honest bank fallback, KO deck preference)
- `v51.css` — `.v51gen` badge (white on #1e3a5f, 11.50:1)
- `build_v51r.py` — rebase build script (base gate on V19.5.1 hash `2bc0726d…`)
- `package_v51r.py` — packager (.part-safe)
- `README_V19_6_SENTENCE_FORGE_AUTO.md`
- `CHANGELOG_V19_5_1_to_V19_6.md`
- `SMOKE_TEST_V19_6_2026-11-25.md`
- `tools/v51/test51.js` — Node vm suite: **97 PASS / 0 FAIL / 5 SKIP, ×3 runs** (incl. new §R rebase-regression checks)
- `tools/v51/verify-v51c.js` — real-Chrome gates: **61/61 PASS, ×2 clean runs**, 0 console errors/warnings/dialogs (incl. new G9 rebase-regression gate)
- `tools/v51/repro-v51.js` — vm repro on pristine V19.5.1: **5/5 defects reproduced**
- `tools/v51/PUSH_MANIFESTS.md` — this file

### NOT pushed (deliberate)
- `SMOKE_TEST_V19_5_1_2026-11-24.md` + `tools/v52/PUSH_MANIFESTS.md` — unchanged vs the pristine V19.5.1 backup (no drift in this version: the backup already holds the filled V19.5.1 copies), so they are not part of this change set at all.
- Note on this version's own docs: the copies of `SMOKE_TEST_V19_6_2026-11-25.md` + `tools/v51/PUSH_MANIFESTS.md` inside the ZIP record `TBD` for the ZIP hash/size (filled into the workspace copies after `package_v51r.py` ran); the push takes the filled workspace versions, per the V46–V52 precedent.
- `tools/v51/backup-v19.5.1/` — pristine V19.5.1 backup (build input, not deliverable)
- `tools/v51/backup-v19.5.1-build/` — pre-fix src files + build record (build input)
- `tools/v51/logs/` + `tools/v51/shots/` — gate logs + screenshots (evidence, kept in the workspace)
- `firebase-config.js` — NEVER pushed (the repo holds Anh's real config; the ZIP ships the placeholder).

## Verification (evidence)
- `test51.js`: 97/0/5 ×3 on the final built `out/`; re-run on the packaged ZIP: **97/0/5**.
- `verify-v51c.js`: 61/61 ×2 clean runs in real Chrome 157; 0 console errors/warnings/dialogs.
- Rebuild-from-scratch reproduces `out/index.html` byte-identically (`48555ddf…`, 2,556,928 B).
- ZIP↔out byte-identical (checked by the packager).
- out-vs-V19.5.1 diff: CHANGED 2 (`index.html`, `v48.js`), ADDED 11 (the lists above), REMOVED 0. No doc drift in this version.

## Honest gaps
- Real Android TTS end-to-end NOT verified (headless Chrome has no voices and no audio; all TTS gates use a controllable stubbed `speechSynthesis`). Needs Anh's real Android phone test.
- Real-microphone end-to-end NOT verified (headless Chrome has no mic; all speech gates use a controllable stub). Needs Anh's real-phone test.
- Live Firebase login/sync untested, as in every version.
- KO correct answers do not advance the EN streak (pre-existing V19.5 behaviour, unchanged).
