# PUSH_MANIFESTS — V19.5.1 Round-5 Patch (19.5.1, layer V52)

**Base:** main @ `f149a8048b` (V19.4 on main via PR #34 merge, 2026-11-22 21:10 +07; live site serves V19.4. V19.5 is delivered as a ZIP with its push queued — this patch branches from the NEW main, NOT the V19.5 manifest's `47b48089f3`).
**Suggested branch:** `muse/round5-patch-v1951`
**ZIP:** `Korean_English_Vocab_Farm_V19_5_1_Patch.zip` — sha256 `4e6f4dfbd2588d777f4cef8a80b1f8514ed074ab0209ce090a7ad6795ac5aa52`, 79,189,050 B (75.52 MB), 863 files.
**Built `out/index.html`:** sha256 `2bc0726d643765538cc18da0bc73903604220ef556851afc13c1a3b81f46ad5f`, 2,539,378 B.
**ZIP↔out byte-identity:** **verified** — the ZIP's `index.html` is byte-identical to `out/index.html`, checked by `package_v52.py` and re-verified independently after publishing.

## Files to push (17 paths — flat repo-root layout, same as all V18.x/V19.x pushes)

### CHANGED (7)
- `index.html` — V19.5.1 title + v15/v18/v19/v22/v27/v48 embedded blocks re-synced + `v52js` injected last
- `v15.js` — Android TTS: `speak15` delegates to the shared `__v52` helper (old body kept as fallback)
- `v18.js` — C-R5-1: `mark18(ok,w,qkey)` wordless + `wordlessKey18()`; Android TTS: `speakKO` delegates to `__v52`
- `v19.js` — C-R5-1: `mark19(ok,w,qkey)` wordless + `wordlessKey19()`; Android TTS: `speakKO` delegates to `__v52`
- `v22.js` — Android TTS: `speak22` delegates to `__v52` (keeps `SPOKEN_LOG.push`)
- `v27.js` — Android TTS: `speakKO` delegates to `__v52`
- `v48.js` — Android TTS: Dojo `speakText` delegates to `__v52` (keeps returning a boolean)

### ADDED (10)
- `v52.js` — `window.__v52={version:'19.5.1'}` — the shared speak helper (voice wait + match + honest error)
- `build_v52.py` — build script (base gate on V19.5 hash `6241e4a0…`)
- `package_v52.py` — packager (.part-safe)
- `README_V19_5_1_PATCH.md`
- `CHANGELOG_V19_5_to_V19_5_1.md`
- `SMOKE_TEST_V19_5_1_2026-11-24.md`
- `tools/v52/test52.js` — Node vm suite: **262 PASS / 0 FAIL / 10 SKIP, ×3 runs**
- `tools/v52/verify-v52c.js` — real-Chrome gates: **113/113 PASS, ×2 clean runs**, 0 console errors/warnings/dialogs
- `tools/v52/repro-v52.js` — vm repro on pristine V19.5: **27/27 defects reproduced**
- `tools/v52/PUSH_MANIFESTS.md` — this file

### NOT pushed (deliberate)
- `SMOKE_TEST_V19_5_2026-11-23.md` + `tools/v50/PUSH_MANIFESTS.md` — unchanged vs the pristine V19.5 backup (no drift in this version: the backup already holds the filled V19.5 copies), so they are not part of this change set at all.
- Note on this version's own docs: the copies of `SMOKE_TEST_V19_5_1_2026-11-24.md` + `tools/v52/PUSH_MANIFESTS.md` inside the ZIP record `TBD` for the ZIP hash/size (filled into the workspace copies after `package_v52.py` ran); the push takes the filled workspace versions, per the V46–V50 precedent.
- `tools/v52/backup-v19.5/` — pristine V19.5 backup (build input, not deliverable)
- `tools/v52/backup-v19.5-build/` — pre-fix src files + build record (build input)
- `tools/v52/logs/` + `tools/v52/shots/` — gate logs + screenshots (evidence, kept in the workspace)
- `tools/v52/make_build_v52.py` + `tools/v52/make_test52.py` + `tools/v52/make_verify52c.py` + `tools/v52/make_package52.py` — driver/test/packager generators (reproducibility tooling, kept in the workspace; the generated files are in the ZIP)
- `tools/v52/test52-sections.js` — test-suite section source (kept in the workspace; generated `test52.js` is in the ZIP)
- `firebase-config.js` — NEVER pushed (the repo holds Anh's real config; the ZIP ships the placeholder).

## Verification (evidence)
- `test52.js`: 262/0/10 ×3 on the final built `out/`.
- `verify-v52c.js`: 113/113 ×2 clean runs in real Chrome 157; 0 console errors/warnings/dialogs. (First run 108/113 — 5 G15 gate artefacts, diagnosed and fixed in the gate, not the build; see CHANGELOG.)
- Rebuild-from-scratch reproduces `out/` byte-identically (`2bc0726d…`, all 855 files).
- ZIP↔out byte-identical (checked by the packager).
- out-vs-V19.5 diff: CHANGED 7, ADDED 10 (the lists above), REMOVED 0.

## Honest gaps
- Real Android TTS end-to-end NOT verified (headless Chrome has no voices and no audio; all TTS gates use a controllable stubbed `speechSynthesis`). Needs Anh's real Android phone test.
- Real-microphone end-to-end NOT verified (headless Chrome has no mic; all speech gates use a controllable stub). Needs Anh's real-phone test.
- Live Firebase login/sync untested, as in every version.
- No per-fight XP cap exists in the code — mixed-fight XP rises with the C-R5-1 fix; caps were NOT changed (Claude's decision covers the fix, not a rebalance).
- KO correct answers do not advance the EN streak (pre-existing V19.5 behaviour, unchanged).
