# Push manifests — V18.3 BOSS WORD SETS (to be executed when Anh is awake)

DO NOT PUSH while Anh is asleep. Approval cards expire while he sleeps.
This manifest is the exact record for the push + draft PR to be executed
when Anh is awake. **Nothing in this manifest has been pushed yet.**
No merge, no direct main edit, no force-push, no history rewrite.

## V18.3 BOSS WORD SETS — manifest (completed 2026-11-19, build agent)

Method: the file list is derived from the build itself (`build_v38.py`
touches exactly these files) and cross-checked against the packaged ZIP
`Korean_English_Vocab_Farm_V18_3_Boss_Word_Sets.zip` (diffed against
the V18.2 ZIP by name + CRC after packaging — see the verification note
at the end).
Changed code/index (3) + new (11) = 14 paths.

- Base branch: `main` @ `393958be`
  (PR #18 merge — main now contains the full V17/V18 stack + the 40
  V17/V18 PNGs; **PR #19 (V18.2, branch `muse/scope-banner-fix-v182`)
  is still open and unmerged at the time of this build — verify the
  base is unmoved before branching, and rebase the target branch name
  below onto whatever main is then; if Anh merges PR #19 first, the
  V38 branch must be created from the NEW main, not 393958be**)
- Target branch (NOT yet created): `muse/boss-word-sets-v183`
- Draft PR base: `main`
- Build (FINAL, run 3): `out/index.html` sha256
  `6b953ac1577b97ced538b3f92ff4d4af42e907e1be4b36e5e874e553eb4e6106`
  (2,372,032 B; V18.2 base was `fe0ba353…`, 2,361,084 B).
- Final ZIP: `Korean_English_Vocab_Farm_V18_3_Boss_Word_Sets.zip`
  (sha256 + file count recorded in the delivery report; verify against
  the file before pushing).
- Paths (14, ZIP-relative = repo-layout names; bare `*.js` = `src/*.js`
  in the repo layout):
  1. index.html
  2. v38.js (new — layer V38, version marker only)
  3. v38.css (new — layer V38, picker mobile rules)
  4. v17.js (R-V38-V17-EXPORTS: topics/lessons/topicName/scopeName)
  5. v22.js (R-V38-V22-SCOPENAME + HELPERS + PICKER + APPLY + EXPORTS)
  6. build_v38.py (new)
  7. package_v38.py (new)
  8. README_V18_3_BOSS_WORD_SETS.md (new)
  9. CHANGELOG_V18_2_to_V18_3.md (new)
  10. SMOKE_TEST_V18_3_2026-11-19.md (new)
  11. tools/v38/test38.js (new)
  12. tools/v38/verify-v38c.js (new)
  13. tools/v38/repro-v38.js (new)
  14. tools/v38/PUSH_MANIFESTS.md (new — this file)
- Sync bases to verify before pushing (V18.2 ZIP sizes): index.html 2,361,084 B; v17.js 31,868; v22.js 35,261. New paths (v38.*, build/package_v38.py, the 3 docs, tools/v38/*) must be absent from the base branch before the push.
- `firebase-config.js` is NEVER pushed (the repo holds Anh's real config; the ZIP ships the placeholder).
