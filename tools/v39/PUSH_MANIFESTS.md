# Push manifests — V18.4 KOREAN BOSSES (to be executed when Anh is awake)

DO NOT PUSH while Anh is asleep. Approval cards expire while he sleeps.
This manifest is the exact record for the push + draft PR to be executed
when Anh is awake. **Nothing in this manifest has been pushed yet.**
No merge, no direct main edit, no force-push, no history rewrite.

## V18.4 KOREAN BOSSES — manifest (completed 2026-11-19, build agent)

Method: the file list is derived from the build itself (`build_v39.py`
touches exactly these files) and cross-checked against the packaged ZIP
`Korean_English_Vocab_Farm_V18_4_Korean_Bosses.zip` (diffed against
the V18.3 ZIP by name + CRC after packaging — see the verification note
at the end).
Changed code/index (4) + new (11) = 15 paths.

- Base branch: `main` @ `d30c0488`
  (merge of PR #19, V18.2, by Anh. **PR #20 (V18.3, branch
  `muse/boss-word-sets-v183`) is still open and unmerged at the time of
  this build — verify the base is unmoved before branching, and rebase
  the target branch name below onto whatever main is then; if Anh merges
  PR #20 first, the V39 branch must be created from the NEW main, not
  d30c0488**)
- Target branch (NOT yet created): `muse/korean-bosses-v184`
- Draft PR base: `main`
- Build (FINAL, run 4): `out/index.html` sha256
  `af3fee2961531da00e06ca6cbb01d25692cb326cd30e3b33288eb51837c938d5`
  (2,377,535 B; V18.3 base was `6b953ac1…`, 2,372,032 B).
- Final ZIP: `Korean_English_Vocab_Farm_V18_4_Korean_Bosses.zip`
  sha256 `09ad0ce854bd5ac623b3f560cdc8d7fb10faaab8a98ee01dafe83aeaed623b5e`
  (77,444,620 B, 732 entries; packaged 2026-11-20 ~07:04 +07 after Chrome run 3 passed 9/9; docs-only re-packaged after §7 was filled — verify against the file before pushing).
- Paths (15, ZIP-relative = repo-layout names; bare `*.js` = `src/*.js`
  in the repo layout):
  1. index.html
  2. v18.js (R-V39-V18-KOCOUNT + BANNER + MARKKO + CALL-TRUE + CALL-FALSE + COMMENT)
  3. v18_data.js (R-V39-V18DATA-LANG: 20 bosses `lang:'en'` → `lang:'both'`)
  4. v19.js (R-V39-V19-MARKKO19 + CALL-CA + CALL-TRUE + CALL-FALSE + COMMENT)
  5. v39.js (new — layer V39, version marker only)
  6. v39.css (new — layer V39, pick-screen 44px buttons, banner box-sizing)
  7. build_v39.py (new)
  8. package_v39.py (new)
  9. README_V18_4_KOREAN_BOSSES.md (new)
  10. CHANGELOG_V18_3_to_V18_4.md (new)
  11. SMOKE_TEST_V18_4_2026-11-19.md (new)
  12. tools/v39/test39.js (new)
  13. tools/v39/verify-v39c.js (new)
  14. tools/v39/repro-v39.js (new)
  15. tools/v39/PUSH_MANIFESTS.md (new — this file)
- Sync bases to verify before pushing (V18.3 sizes): index.html 2,372,032 B; v18.js 41,233; v18_data.js 20,635; v19.js 43,184. New paths (v39.*, build/package_v39.py, the 3 docs, tools/v39/*) must be absent from the base branch before the push.
- `firebase-config.js` is NEVER pushed (the repo holds Anh's real config; the ZIP ships the placeholder).

- Verification note (ZIP-vs-ZIP diff against the V18.3 ZIP, by name + CRC, run 2026-11-20 ~07:05 +07):
  V18.3 721 entries → V18.4 732 entries. ADDED (11): CHANGELOG_V18_3_to_V18_4.md, README_V18_4_KOREAN_BOSSES.md, SMOKE_TEST_V18_4_2026-11-19.md, build_v39.py, package_v39.py, tools/v39/PUSH_MANIFESTS.md, tools/v39/repro-v39.js, tools/v39/test39.js, tools/v39/verify-v39c.js, v39.css, v39.js. REMOVED (0). CHANGED (6): index.html, v18.js, v18_data.js, v19.js (the 4 code/index changes) + SMOKE_TEST_V18_3_2026-11-19.md and tools/v38/PUSH_MANIFESTS.md (docs-only updates from the V18.3 delivery — their §7/manifest hashes were filled after the V18.3 ZIP was built, so the out/ copies differ from the V18.3 ZIP copies). Exactly the 15 manifest paths; no other file changed. ZIP↔out index.html byte-identical (af3fee29…).
