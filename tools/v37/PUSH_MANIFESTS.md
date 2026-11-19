# Push manifests — V18.2 SCOPE BANNER FIX (to be executed when Anh is awake)

DO NOT PUSH while Anh is asleep. Approval cards expire while he sleeps.
This manifest is the exact record for the push + draft PR to be executed
when Anh is awake. **Nothing in this manifest has been pushed yet.**
No merge, no direct main edit, no force-push, no history rewrite.

## V18.2 SCOPE BANNER FIX — manifest (completed 2026-11-19, build agent)

Method: the file list is derived from the build itself (`build_v37.py`
touches exactly these files) and cross-checked against the packaged ZIP
`Korean_English_Vocab_Farm_V18_2_Scope_Banner_Fix.zip` (diffed against
the V18.1 ZIP by name + CRC after packaging — see the verification note
at the end).
Changed code/index (4) + new (11) = 15 paths.

- Base branch: `main` @ `393958be`
  (PR #18 merge — main now contains the full V17/V18 stack + the 40
  V17/V18 PNGs; verify unmoved before branching)
- Target branch (NOT yet created): `muse/scope-banner-fix-v182`
- Draft PR base: `main`
- Build (FINAL, run 1): `out/index.html` sha256
  `fe0ba353568039b8b4b1ac4df132789e5dd876cce33d756993c12600d7bcb065`
  (2,361,084 B; V18.1 base was `eabcccc2…`, 2,358,811 B).
- Final ZIP: `Korean_English_Vocab_Farm_V18_2_Scope_Banner_Fix.zip`
  (sha256 + file count recorded in the delivery report; verify against
  the file before pushing).
- Paths (15, ZIP-relative = repo-layout names; bare `*.js` = `src/*.js`
  in the repo layout):
  1. index.html
  2. v37.js (new — layer V37, version marker only)
  3. v37.css (new — layer V37, comment only)
  4. v15.js (R-V37-V15-RENDERHUB: renderHub export)
  5. v17.js (R-V37-V17-CLEARSCOPE: renderHub re-render + fallback)
  6. v27.js (R-V37-V27-RENDER + R-V37-V27-BANNER)
  7. build_v37.py (new)
  8. package_v37.py (new)
  9. README_V18_2_SCOPE_BANNER_FIX.md (new)
  10. CHANGELOG_V18_1_to_V18_2.md (new)
  11. SMOKE_TEST_V18_2_2026-11-19.md (new)
  12. tools/v37/test37.js (new)
  13. tools/v37/verify-v37c.js (new)
  14. tools/v37/repro-v37.js (new)
  15. tools/v37/PUSH_MANIFESTS.md (new — this file)
- Sync bases to verify before pushing (V18.1 ZIP sizes, re-packaged
  009c8b15…): index.html 2,358,811 B; v15.js 106,428; v17.js 31,648;
  v27.js 55,347. New paths (v37.*, build/package_v37.py, the 3 docs,
  tools/v37/*) must be absent from the base branch before the push.
- `firebase-config.js` is NEVER pushed (the repo holds Anh's real
  config; the ZIP ships the placeholder).
