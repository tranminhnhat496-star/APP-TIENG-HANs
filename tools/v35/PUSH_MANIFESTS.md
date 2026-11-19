# Push manifests — V17.1 (re-derived) and V18.0 (to be completed)

DO NOT PUSH while Anh is asleep. Approval cards expire while he sleeps
(V17.1 push was already blocked this way). These manifests are the exact
record for the pushes + draft PRs to be executed when Anh is awake.

## (a) V17.1 CHRONO COMPLETE — manifest (re-derived 2026-11-19)

Method: diffed the packaged ZIPs
Korean_English_Vocab_Farm_V17_0_Chrono_Kingdom.zip (636 files) vs
Korean_English_Vocab_Farm_V17_1_Chrono_Complete.zip (652 files) by name +
CRC. Added (16) + changed (9) = 25 files; the 4 files under
tools/v34/logs/ are test-run logs and are NOT pushed; the 2 probe scripts
ARE pushed. Result: 21 paths. Cross-check: identical to the list the V17.1
coordinator staged (the /tmp file was NOT relied on — the ZIP diff was
done first and matches it line for line).

- Base branch: `muse/chrono-kingdom-v17` @ `0296db65`
  (V17.0 draft PR #12 head; verify unmoved before branching)
- Target branch (NOT yet created): `muse/chrono-complete-v171`
- Draft PR base: `muse/chrono-kingdom-v17` (stacked; PR #12 unmerged)
- Paths (21, repo-layout names; bare `*.js` = `src/*.js`):
  1. index.html
  2. v34.js
  3. v34.css
  4. v34_data.js
  5. v15.js
  6. v17.js
  7. v18.js
  8. v19.js
  9. v25.js
  10. v33.js
  11. build_v34.py
  12. package_v34.py
  13. README_V17_1_CHRONO_COMPLETE.md
  14. CHANGELOG_V17_0_to_V17_1.md
  15. SMOKE_TEST_V17_1_2026-11-19.md
  16. CHANGED_FILES.md
  17. GITHUB_DESKTOP_GUIDE.md
  18. tools/v34/test34.js
  19. tools/v34/verify-v34c.js
  20. tools/v34/probe_v34.js
  21. tools/v34/probe-v34c-hosts.js
- Sync bases to verify before pushing (V17.0 ZIP sizes): index.html
  2,190,956 B; v15.js 103,830; v17.js 23,110; v18.js 38,881; v19.js 41,432;
  v25.js 9,834; v33.js 29,648. New paths (v34.*, build/package_v34.py,
  V17.1 docs, tools/v34/*) must be absent on the base branch.
- firebase-config.js is NEVER pushed.

## (b) V18.0 SKYROOT SANCTUARY — manifest (completed 2026-11-19, build agent)

- Base branch (to exist first): `muse/chrono-complete-v171` (created by
  the V17.1 push above)
- Target branch (NOT yet created): `muse/skyroot-sanctuary-v180`
- Draft PR base: `muse/chrono-complete-v171` (stacked)
- Build (FINAL, after test-agent fix B-35-2): `out/index.html` sha256
  `eb7dcbdda825519ec597bb84d4e39e51be6b4be41bbfbe3fd66cc18d78a95568`
  (2,347,000 B; pre-fix hash was
  `e43281fb7087470c3d79d043d4ce46bce3c3e5de58e8fa2ca9b28736c5fb0b68`,
  2,346,937 B). Final ZIP (re-packaged 2026-11-19 after the B-35-2
  build-script correction in `build_v35.py`, the `out/v19.js` re-sync,
  and CHANGELOG/SMOKE_TEST updates; `out/index.html` unchanged):
  `Korean_English_Vocab_Farm_V18_0_Skyroot_Sanctuary.zip`, 53,936,785 B,
  sha256 `6e7f17120ab71bc2448b153a2cce7c2b38895425831298c7785f458ea29b1fb4`,
  688 entries; its `index.html` matches `out/index.html` byte-for-byte.
  Test suite: test35.js 282 PASS / 0 FAIL / 9 SKIP ×3 runs (2× build +
  1× packaged ZIP, identical) + final confirmation run on this
  re-packaged ZIP (282/0/9, identical); Chrome gates V35-A–G all PASS,
  0 console errors. From-scratch rebuild proof:
  `tools/v35/rebuild-proof/rebuild_v35.py` rebuilds `index.html`
  BYTE-IDENTICAL to shipped (2,347,000 B) from pristine V17.1.
- Paths (33 text files changed/added by V35; repo-layout names;
  bare `*.js` = `src/*.js`):
  1. index.html
  2. v35.js
  3. v35.css
  4. v35_data.js
  5. v15.js
  6. v17.js
  7. v18.js
  8. v19.js
  9. v20_sync.js
  10. v21.js
  11. v23.js
  12. v23_data.js
  13. v25.js
  14. v34.js
  15. build_v35.py
  16. package_v35.py
  17. README_V18_0_SKYROOT_SANCTUARY.md
  18. CHANGELOG_V17_1_to_V18_0.md
  19. CHANGELOG_V16_4_to_V17_0.md (doc fix only: `en33.bosses` line corrected)
  20. SMOKE_TEST_V18_0_2026-11-19.md
  21. CHANGED_FILES.md
  22. GITHUB_DESKTOP_GUIDE.md
  23. tools/v35/gen_v35_data.py
  24. tools/v35/validate_words35.py
  25. tools/v35/build_v35_json.py
  26. tools/v35/author_records.py
  27. tools/v35/VALIDATION_V35_WORDS.md
  28. tools/v35/ASSET_REPORT_V18.md
  29. tools/v35/PUSH_MANIFESTS.md (this file)
  30. tools/v35/test35.js (landed by test agent; in final ZIP)
  31. tools/v35/verify-v35c.js (landed by test agent; Chrome CDP driver)
  32. tools/v35/fix_b35.py (landed by test agent; B-35-2 fix script)
  33. tools/v35/rebuild-proof/rebuild_v35.py (coordinator; from-scratch
      rebuild proof — rebuilds index.html byte-identical from V17.1)
  (Items 31–33 are NOT in the ZIP allowlist — workspace-side only;
  include them explicitly in the push. Item 30 IS in the final ZIP.)
  (Items 24–28 predate the layer build — word/art prep by the earlier
  V35-words work — and are listed because `package_v35.py` ships them
  in the ZIP allowlist; items 1–23 + 29 are the layer/build changes.)
- Sync bases to verify before pushing (V17.1 ZIP sizes, uncompressed;
  the V17.1 ZIP's index.html sha256 is `3cdb824d…`, the pristine V17.1
  base hash): index.html 2,214,197; v15.js 104,825; v17.js 27,445;
  v18.js 39,597; v19.js 42,100; v20_sync.js 39,379; v21.js 54,634;
  v23.js 47,585; v23_data.js 14,371; v25.js 10,043; v34.js 10,945.
  New paths (v35.*, build/package_v35.py, V18.0 docs, tools/v35/*)
  must be absent on the base branch (verified absent from the V17.1 ZIP).
- firebase-config.js is NEVER pushed.
- ART — CANNOT GO IN THE SNAPSHOT PUSH (text-files-only): the 20 PNG
  assets below are part of V18.0 but need another push route as a
  follow-up (flagged for the coordinator — do NOT silently drop them):
  - assets/bosses/v18/ (8): v18_breeze_lynx, v18_thornwing_stag,
    v18_cloud_serpent, v18_moss_colossus, v18_tempest_harpy,
    v18_crystal_treant, v18_aurora_griffin, v18_skyroot_empress
  - assets/pets/v18/ (12): v18_cloudfx_s1/s2/s3, v18_sproutowl_s1/s2/s3,
    v18_stormram_s1/s2/s3, v18_egg_cloud, v18_egg_sprout, v18_egg_storm
  All 20 are byte-identical to tools/v35/assets-staging/ (sha256-verified
  in build_v35.py). Without them the V18.0 deploy shows broken boss/pet
  images — the snapshot push alone is NOT a complete V18.0 deploy.
