# PUSH_MANIFESTS — V19.4 Boss Mic Fix (19.4.0, layer V49)

**Base:** main @ `6a9e21a7` (V19.3 on main via PR #30 + #31/#32 merges).
**Suggested branch:** `muse/boss-mic-fix-v194`
**ZIP:** `Korean_English_Vocab_Farm_V19_4_Boss_Mic_Fix.zip` — sha256 `a8b1dd28dac6a5e79fc99351891f2a803d3d8a65ccea24b542bb3c7bfd76e223`, 79,017,494 B (75.36 MB), 842 files.
**Built `out/index.html`:** sha256 `0b9139ef154096254edd4748cb8a76abc050cb6d1c00c9e0afb17705906a2d65`, 2,522,575 B.
**ZIP↔out byte-identity:** **verified** — the ZIP's `index.html` is byte-identical to `out/index.html`, checked by `package_v49.py` and re-verified independently after publishing.

## Note on main / PR #33
PR #33 (empty `.nojekyll`, branch `muse/pages-nojekyll`) may merge before this push. If main moves, rebase these same files onto the new main (the PR #28→#29 pattern): the V19.4 files are an additive layer on V19.3 and do not conflict with a one-file `.nojekyll` addition.

## Files to push (15 paths — flat repo-root layout, same as all V18.x/V19.x pushes)

### CHANGED (3)
- `index.html` — V19.4 title + v18/v19 embedded blocks re-synced + `v49` style / `v49js` injected last
- `v18.js` — bossSpeak rewrite + stopSpeak + speakState + nextQ clear + timer guard + speak card + export
- `v19.js` — same 8 edits as v18.js (new stopSpeak/bossSpeak/speakState block is byte-identical)

### ADDED (12)
- `v49.js` — `window.__v49={version:'19.4.0', speakErrMsg}` (per-error Vietnamese messages)
- `v49.css` — `.v49listen` + `.v49err` (solid dark chips, WCAG AA)
- `build_v49.py` — build script (base gate on V19.3 hash `dc971a6c…`)
- `package_v49.py` — packager (.part-safe)
- `README_V19_4_BOSS_MIC_FIX.md`
- `CHANGELOG_V19_3_to_V19_4.md`
- `SMOKE_TEST_V19_4_2026-11-22.md`
- `tools/v49/test49.js` — Node vm suite: **122 PASS / 0 FAIL / 5 SKIP, ×3 runs**
- `tools/v49/verify-v49c.js` — real-Chrome gates: **59/59 PASS, ×2 runs**, 0 console errors/warnings/dialogs
- `tools/v49/repro-v49.js` — vm repro on pristine V19.3: **9/9 defects reproduced**
- `tools/v49/repro-v49c.js` — Chrome repro on pristine V19.3: **7/7 reproduced**
- `tools/v49/PUSH_MANIFESTS.md` — this file

### NOT pushed (deliberate)
- `SMOKE_TEST_V19_3_2026-11-21.md` + `tools/v48/PUSH_MANIFESTS.md` — pre-existing V48 doc drift (their ZIP hash lines were filled after the V19.3 packaging); excluded per the V46/V47/V48 precedent. The ZIP carries the filled versions, which is correct.
- `tools/v49/backup-v19.3/` — pristine V19.3 backup (build input, not deliverable)
- `tools/v49/backup-v19.3-build/` — pre-fix src files + build record (build input)
- `tools/v49/logs/` + `tools/v49/shots/` — gate logs + screenshots (evidence, kept in the workspace)
- `assets/bosses/v18/v18_golem.png` — already on main via PR #18's 40-image set + the golem Desktop push; no new art in V19.4.
- `firebase-config.js` — NEVER pushed (the repo holds Anh's real config; the ZIP ships the placeholder).

## Verification (evidence)
- `test49.js`: 122/0/5 ×3 on the final built `out/`.
- `verify-v49c.js`: 59/59 ×2 in real Chrome 157; 0 console errors/warnings/dialogs.
- Rebuild-from-scratch reproduces `out/index.html` byte-identically (`0b9139ef…`).
- ZIP↔out byte-identical (checked by the packager).
- out-vs-V19.3-ZIP diff: CHANGED 3 (`index.html`, `v18.js`, `v19.js`), ADDED 12 (the list above), REMOVED 0.

## Honest gaps
- Real-microphone end-to-end NOT verified (headless Chrome has no mic; all speech gates use a controllable stub). Needs Anh's real-phone test.
- Live Firebase login/sync untested, as in every version.
