# Push manifests — V18.5 BUG FIXES II (to be executed when Anh is awake)

DO NOT PUSH while Anh is asleep. Approval cards expire while he sleeps.
This manifest is the exact record for the push + draft PR to be executed
when Anh is awake. **Nothing in this manifest has been pushed yet.**
No merge, no direct main edit, no force-push, no history rewrite.

## V18.5 BUG FIXES II — manifest (completed 2026-11-20, build agent)

Method: the file list is derived from the build itself (`build_v40.py`
touches exactly these files) and cross-checked against the packaged ZIP
`Korean_English_Vocab_Farm_V18_5_Bug_Fixes_II.zip` (diffed against
the V18.4 ZIP by name + CRC after packaging — see the verification note
at the end).
Changed code/index (9) + new (12) = 21 paths.

- Base branch: `main` @ `6ca57453` — **PR #21 (V18.4) is still OPEN at the time this manifest was written (2026-11-20), so main is still the merge of PR #20.** Re-verify the base before branching at push time: if Anh has merged PR #21 by then, branch V18.5 from the NEW main instead (same pattern as the V18.3/V18.4 pushes — the V40 build was made on the V18.4 code, so its parent must contain V18.4). The V40 branch MUST be created from a main that contains V18.4, never from the pre-V18.4 main.
- Target branch (NOT yet created): `muse/bug-fixes-ii-v185`
- Draft PR base: `main`
- Build (FINAL, run 3): `out/index.html` sha256
  `9a2fdd741d8027dd3e95a5bcae64a4e8989bd726bcb74fe74f49f29a0e779827`
  (2,390,555 B; V18.4 base was `af3fee29…`, 2,377,535 B).
- Final ZIP: `Korean_English_Vocab_Farm_V18_5_Bug_Fixes_II.zip`
  sha256 `40864b865a0b4a1d7d0763e5dba64d2e64234b7ecee1766fdbf635e5f3e9f3a6`
  (77,537,107 B, 744 entries) — first package, 2026-11-20 ~10:05 +07, after test40 200/0/8 ×3 + Chrome gates 69/69 ×3.
  Docs-only re-package after this manifest was filled: sha256
  **TO BE FILLED after the re-package** — verify against the file before pushing.
  The build (`out/index.html` `9a2fdd74…`) is identical in every package.
- Paths (21, ZIP-relative = repo-layout names; bare `*.js` = `src/*.js`
  in the repo layout):
  1. index.html
  2. v15.js (R-V40-V15-STARTMODE + REVIEWSTART + LEARNHTML: B-8 BT guards)
  3. v18.js (R-V40-V18-CHECKPHASE + KOWARN + NEXT + COLLDETAIL + ARENASBTN + COLLHEAD + SC2: C-02 checkPhase, A-F2/A-N1 koWarn, C-04/C-05, C-06)
  4. v19.js (R-V40-V19-CHECKPHASE + KOWARN + NEXT + SC2: same as v18 minus Collection)
  5. v20_sync.js (R-V40-V20-KO16 + PLAN: C-01 ko16 merge, C-07 plan merge)
  6. v22.js (R-V40-V22-APPLY: C-12 refuse empty Units)
  7. v23.js (R-V40-V23-SHIELD: C-02 shield-halving + toast + checkPhase call)
  8. v27.js (R-V40-V27-FINISH: C-10 partial-session goals)
  9. v34.js (R-V40-V34-BREAKLABEL: A-F1 label)
  10. v40.js (new — layer V40, version marker only)
  11. v40.css (new — layer V40, comment-only)
  12. build_v40.py (new)
  13. package_v40.py (new)
  14. README_V18_5_BUG_FIXES_II.md (new)
  15. CHANGELOG_V18_4_to_V18_5.md (new)
  16. SMOKE_TEST_V18_5_2026-11-20.md (new)
  17. tools/v40/test40.js (new)
  18. tools/v40/verify-v40c.js (new)
  19. tools/v40/repro-v40.js (new)
  20. tools/v40/repro-v40b.js (new)
  21. tools/v40/PUSH_MANIFESTS.md (new — this file)
- Sync bases to verify before pushing (V18.4 sizes, from the V18.4 ZIP): index.html 2,377,535 B; v15.js 106,448; v18.js 42,391; v19.js 43,647; v20_sync.js 41,070; v22.js 42,432; v23.js 48,299; v27.js 55,404; v34.js 11,377. New paths (v40.*, build/package_v40.py, the 3 docs, tools/v40/*) must be absent from the base branch before the push.
- `firebase-config.js` is NEVER pushed (the repo holds Anh's real config; the ZIP ships the placeholder).

- Verification note (ZIP-vs-ZIP diff against the V18.4 ZIP, by name + CRC, run 2026-11-20 ~10:05 +07):
  V18.4 732 entries → V18.5 744 entries. ADDED (12): CHANGELOG_V18_4_to_V18_5.md, README_V18_5_BUG_FIXES_II.md, SMOKE_TEST_V18_5_2026-11-20.md, build_v40.py, package_v40.py, tools/v40/PUSH_MANIFESTS.md, tools/v40/repro-v40.js, tools/v40/repro-v40b.js, tools/v40/test40.js, tools/v40/verify-v40c.js, v40.css, v40.js. REMOVED (0). CHANGED (11): index.html, v15.js, v18.js, v19.js, v20_sync.js, v22.js, v23.js, v27.js, v34.js (the 9 code/index changes) + SMOKE_TEST_V18_4_2026-11-19.md and tools/v39/PUSH_MANIFESTS.md (docs-only updates from the V18.4 delivery — their §7/manifest hashes were filled after the V18.4 ZIP was built, so the out/ copies differ from the V18.4 ZIP copies). Exactly the 21 manifest paths; no other file changed. ZIP↔out index.html byte-identical (9a2fdd74…).
  After the docs-only re-package (manifest filled): re-diffed — only tools/v40/PUSH_MANIFESTS.md changed; ZIP↔out index.html still byte-identical (9a2fdd74…).
