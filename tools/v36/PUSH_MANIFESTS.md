# Push manifests — V18.1 BUG FIXES (to be executed when Anh is awake)

DO NOT PUSH while Anh is asleep. Approval cards expire while he sleeps.
This manifest is the exact record for the push + draft PR to be executed
when Anh is awake. **Nothing in this manifest has been pushed yet.**

## V18.1 BUG FIXES — manifest (completed 2026-11-19, build agent)

Method: the file list is derived from the build itself (`build_v36.py`
touches exactly these files) and cross-checked against the packaged ZIP
`Korean_English_Vocab_Farm_V18_1_Bug_Fixes.zip` (diffed against the V18.0
ZIP by name + CRC after packaging — see the verification note at the end).
Changed code/index (13) + new (11) + updated docs (2) = 26 paths.

- Base branch: `muse/skyroot-sanctuary-v180` @ `d354d015`
  (V18.0 draft PR #14 head; verify unmoved before branching)
- Target branch (NOT yet created): `muse/bug-fixes-v181`
- Draft PR base: `muse/skyroot-sanctuary-v180` (stacked; PR #14 unmerged)
- Build (FINAL, run 9, after B-36-2): `out/index.html` sha256
  `eabcccc2e4b8b86eeca807698cd0a3d5575b267bec03ff395de080da9d082a39`
  (2,358,811 B; run 8 was `4e557ac5…`, 2,358,030 B; run 6 was
  `d398e3fa…`, 2,357,317 B).
- Final ZIP: `Korean_English_Vocab_Farm_V18_1_Bug_Fixes.zip` (sha256 + file
  count recorded in the delivery report; verify against the file before
  pushing).
- Paths (26, ZIP-relative = repo-layout names; bare `*.js` = `src/*.js`
  in the repo layout, except v12.js/v14.js which live only in out/ +
  inlined index.html and are pushed as root files, as in V18.0):
  1. index.html
  2. v36.js (new — layer V36)
  3. v36.css (new — layer V36)
  4. v12.js (R-F04B moon.svg)
  5. v14.js (R-F04A flame.svg)
  6. v15.js (R-V173-SPEAK)
  7. v17_a1a2.js (V17-4 typo 54×)
  8. v18.js (R-WIND-18, R-V172C/D/F, R-F16A1/A2, R-F17A)
  9. v19.js (R-WIND-19, R-V172A/B/G, R-F17B)
  10. v21.js (R-V171-A/B, R-F09A/B, R-F10A/B)
  11. v23.js (R-V172E)
  12. v27.js (R-F13A–E)
  13. v33.js (R-F13F)
  14. v35.js (R-V35COPY, R-F13G)
  15. build_v36.py (new)
  16. package_v36.py (new)
  17. README_V18_1_BUG_FIXES.md (new)
  18. CHANGELOG_V18_0_to_V18_1.md (new)
  19. SMOKE_TEST_V18_1_2026-11-19.md (new)
  20. CHANGED_FILES.md (updated — V18.1 section appended)
  21. GITHUB_DESKTOP_GUIDE.md (updated — V18.1 section appended)
  22. tools/v36/test36.js (new)
  23. tools/v36/verify-v36c.js (new)
  24. tools/v36/probe_toast.js (new)
  25. tools/v36/PUSH_MANIFESTS.md (new — this file)
  26. tools/v34/probe_v34.js (probe-model fix: Oxford branch now applies
      the diff filter; expected unfillable list 12 → 13)
- Sync bases to verify before pushing (V18.0 ZIP sizes): index.html
  2,347,000 B; v12.js 5,583; v14.js 44,629; v15.js 106,404;
  v17_a1a2.js 204,126; v18.js 39,764; v19.js 42,320; v21.js 54,652;
  v23.js 47,713; v27.js 54,615; v33.js 30,001; v35.js 24,971;
  tools/v34/probe_v34.js 37,691. New paths (v36.*, build/package_v36.py,
  V18.1 docs, tools/v36/*) must be absent on the base branch.
- firebase-config.js is NEVER pushed.
- NOT in this push: `data/v17_a1a2.json` (the typo fix there keeps the
  work-dir source in sync; `data/` is not in the deployed tree or the
  ZIP — the deployed copies are `v17_a1a2.js` + inlined index.html).
  NOT in this push: `tools/v36/backup-v18.0/` (V18.0 base backup, build
  input), `tools/v36/logs/` (test-run logs), `tools/v36/shots/`
  (Chrome screenshots).
- NOT part of V18.1 at all: the 20 V18.0 PNG assets
  (`assets/bosses/v18/` 8 + `assets/pets/v18/` 12) — they ship unchanged
  from the V18.0 tree inside the ZIP, but their GitHub push route is a
  separate decision still awaiting Anh (the snapshot push is text-only).

## Verification note (completed after packaging, 2026-11-19)
- Diffed the V18.0 ZIP (688 entries) against the V18.1 ZIP (699 entries)
  by name + CRC: **16 changed, 11 added, 0 removed.**
  - Changed (16): the 13 code/index files above + `CHANGED_FILES.md` +
    `GITHUB_DESKTOP_GUIDE.md` (the 2 updated docs) + `SMOKE_TEST_V18_0_2026-11-19.md`
    (one line only: the V18.0 ZIP hash/size line, corrected to the final
    V18.0 re-package `578a91a0…` / 53,937,448 B — a docs-only correction
    from the V18.0 re-package, not a V18.1 change).
  - Added (11): `v36.js`, `v36.css`, `build_v36.py`, `package_v36.py`,
    `README_V18_1_BUG_FIXES.md`, `CHANGELOG_V18_0_to_V18_1.md`,
    `SMOKE_TEST_V18_1_2026-11-19.md`, `tools/v36/test36.js`,
    `tools/v36/verify-v36c.js`, `tools/v36/probe_toast.js`,
    `tools/v36/PUSH_MANIFESTS.md`.
  - Removed: none. The diff matches the 26-path list above exactly
    (13 + 11 + 2), plus the one-line SMOKE_TEST_V18_0 correction.
- V18.1 ZIP: `Korean_English_Vocab_Farm_V18_1_Bug_Fixes.zip`,
  54,022,333 B (51.5 MB), 699 entries, sha256
  `52c391fc4ee3e48c93548a2c223f6f138646ef2260781a790d242d4eafce0a9b`
  (verified after packaging; the packager was run twice and the hash was
  re-verified on the file on disk).
