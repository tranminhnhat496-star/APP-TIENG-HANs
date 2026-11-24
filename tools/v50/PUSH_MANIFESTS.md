# PUSH_MANIFESTS — V19.5 Round-5 Bug Fixes (19.5.0, layer V50)

**Base:** main @ `47b48089f3` (V19.4 on main via PR #34 merge; PR #33 `.nojekyll` included).
**Suggested branch:** `muse/round5-bug-fixes-v195`
**ZIP:** `Korean_English_Vocab_Farm_V19_5_Round5_Bug_Fixes.zip` — sha256 TBD (filled after packaging), size TBD, entries TBD.
**Built `out/index.html`:** sha256 `6241e4a0758cd0cd4fd801dd251298a62b35930feb82376536e5b4c0dee0739e`, 2,528,803 B.
**ZIP↔out byte-identity:** **verified** — the ZIP's `index.html` is byte-identical to `out/index.html`, checked by `package_v50.py` and re-verified independently after publishing.

## Files to push (16 paths — flat repo-root layout, same as all V18.x/V19.x pushes)

### CHANGED (5)
- `index.html` — V19.5 title + v18/v19/v27/v48 embedded blocks re-synced + `v50` style / `v50js` injected last
- `v18.js` — F-1: `stopSpeak()` at the top of `startFight()` + monotonic `_speakSeq50` token
- `v19.js` — same F-1 fix as v18.js
- `v27.js` — C-R5-2: due-less words read "Đến hạn hôm nay" (prioOf + classifyEN/classifyKO guards)
- `v48.js` — C-R5-3: Forge score tracked (FS.score accumulation, scoreTotal/bestScore persist, end-screen + intro lines)

### ADDED (11)
- `v50.js` — `window.__v50={version:'19.5.0'}` (version marker only)
- `v50.css` — C-R5-4 44px touch-target rules (KO Hub + chooser "Để sau")
- `build_v50.py` — build script (base gate on V19.4 hash `0b9139ef…`)
- `package_v50.py` — packager (.part-safe)
- `README_V19_5_ROUND5_BUG_FIXES.md`
- `CHANGELOG_V19_4_to_V19_5.md`
- `SMOKE_TEST_V19_5_2026-11-23.md`
- `tools/v50/test50.js` — Node vm suite: **181 PASS / 0 FAIL / 7 SKIP, ×3 runs**
- `tools/v50/verify-v50c.js` — real-Chrome gates: **81/81 PASS, ×2 runs**, 0 console errors/warnings/dialogs
- `tools/v50/repro-v50.js` — vm repro on pristine V19.4: **28/28 defects reproduced**
- `tools/v50/PUSH_MANIFESTS.md` — this file

### NOT pushed (deliberate)
- `SMOKE_TEST_V19_4_2026-11-22.md` + `tools/v49/PUSH_MANIFESTS.md` — pre-existing V49 doc drift (their ZIP hash/size lines were filled into the workspace copies after package_v49.py ran; the copies inside the V19.4 ZIP record the previous packaging's hash). The new ZIP carries the filled versions, which is correct — and this manifest excludes these two files from the push, per the V46/V47/V48/V49 precedent.
- `tools/v50/backup-v19.4/` — pristine V19.4 backup (build input, not deliverable)
- `tools/v50/backup-v19.4-build/` — pre-fix src files + build record (build input)
- `tools/v50/logs/` + `tools/v50/shots/` — gate logs + screenshots (evidence, kept in the workspace)
- `tools/v50/review-*.md` + `tools/v50/p*.js` + `tools/v50/probe.js` + `tools/v50/review-a-v49-probe*.js` — round-5 review reports + probes (evidence, kept in the workspace)
- `firebase-config.js` — NEVER pushed (the repo holds Anh's real config; the ZIP ships the placeholder).

## Verification (evidence)
- `test50.js`: 181/0/7 ×3 on the final built `out/`.
- `verify-v50c.js`: 81/81 ×2 in real Chrome 157; 0 console errors/warnings/dialogs. On pristine V19.4 the same driver scores 63/80 (the 17 failures are exactly the 4 fix-gates + the V19.5 title/marker checks).
- Rebuild-from-scratch reproduces `out/index.html` byte-identically (`6241e4a0…`).
- ZIP↔out byte-identical (checked by the packager).
- out-vs-V19.4 diff: CHANGED 7 (5 real + 2 drift, drift excluded above), ADDED 11 (the list above), REMOVED 0.

## Honest gaps
- Real-microphone end-to-end NOT verified (headless Chrome has no mic; all speech gates use a controllable stub). Needs Anh's real-phone test.
- Live Firebase login/sync untested, as in every version.
- C-R5-1 (MAJOR, boss grammar/sentence XP) NOT in this build — needs a director decision.
