# Cleanup audit 2/4 — Duplicates, docs/logs, legacy scripts
Repo: `tranminhnhat496-star/APP-TIENG-HANs` @ `f099a2ff` (V15.3, main).
Clone audited: `/home/hatch/workspace/v7build/audit/clone` (fresh clone, read-only — nothing in the clone or the repo was modified).
Method: sha256 + git blob SHA for all 515 tracked files; basename fixed-string search across all 293 text files in the clone (index.html, root *.js/*.css, *.py, *.md, tools/**, *.json). Matches inside code comments are flagged as comment-only — a comment saying "see X.md" is NOT a live dependency. Stem search (no extension) was run for every zero-hit file to catch `require("./name")` style references.
Companion file: `dup-docs.csv` — one row per inventoried file (141 rows).

## 0. Baseline + `.github/workflows/`
- HEAD tree: **515 files, 47,933,563 bytes (~45.7 MiB)** (sum of Git tree blob sizes, per the issue baseline).
- `.github/workflows/`: **absent** — confirmed, `ls .github/workflows/` returns "No such file or directory". No CI exists in the repo.
- `package_*.py`: **absent from the clone** — no packaging script is committed. The ZIP packaging chain (`package_v15*.py`) exists only in the author workspace, not in the repo. (Step-2 finding.)

## 1. Exact duplicates (content hash)
4 groups, 9 files, 123,962 bytes of extra tree entries. Git already dedupes identical blobs in storage, so deleting a duplicate entry saves tree bytes (the issue's metric: sum of blob sizes over tree entries) but does NOT shrink history — history is never rewritten in this cleanup.

| # | Files (identical content) | Size each | Extra tree bytes | Verdict |
|---|---|---|---|---|
| 1 | `basic_tactics_vocabulary.json` = `v22_basictactics.json` | 108,981 | 108,981 | runtime file KEEP; root copy CANDIDATE |
| 2 | `tools/v15nav/test26-run2.log` = `tools/v15nav/test26-zip.log` | 8,587 | 8,587 | both UNKNOWN (both named in docs) |
| 3 | `tools/v15ui/test24-run2.log` = `test24-run3.log` = `test24-zip.log` | 3,197 | 6,394 | all three UNKNOWN (all named in docs) |
| 4 | `tools/v15nav/pw/get-browser.log` = `get-browser2.log` | 0 | 0 | both CANDIDATE (both empty) |

Group 1 detail: the duplicate is **created by the build itself**. `build_v15.py` reads `data/v22_basictactics.json`, validates the 819 entries, then writes BOTH `out/basic_tactics_vocabulary.json` and `out/v22_basictactics.json` from the same object (`json.dumps(bt, indent=1)`). At runtime only `basic_tactics_vocabulary.json` is fetched (lazy fetch in `v22.js`); the root `v22_basictactics.json` is never read from the root path by any script — it is only listed in docs. Dedupe therefore means: delete the root `v22_basictactics.json` AND stop writing it in `build_v15.py` (or keep writing it and accept the twin). Caveat: `data/` is not committed, so the root copy is currently the only in-repo copy under the build-source name — restore `data/` from it (or from the runtime twin) before deleting.

## 2. Category totals (inventoried files only)

| Category | Files | Bytes |
|---|---:|---:|
| Docs (`*.md` at root) | 48 | 483,129 |
| Test logs + baseline files (`tools/**`, incl. `baseline*.js`) | 21 | 145,661 |
| Samples (`samples/**`) | 5 | 38,316 |
| Build scripts, legacy + current (17 files, incl. `tools/split_bosses_v11.py`) | 17 | 213,104 |
| Tools harness, other (`tools/**` .js/.mjs/.py) | 47 | 130,401 |
| Duplicate data pair (BT JSON, runtime + root copy) | 2 | 217,962 |
| `Korean_Vocab_Farm_V6_Bilingual.html` | 1 | 309,519 |
| **Inventoried total** | **141** | **1,538,092** |

Verdict totals over inventoried files: KEEP 63 files (941,219 B), CANDIDATE 63 files (528,945 B), UNKNOWN 15 files (67,928 B).

> Precision note on "bytes saved": deleting a CANDIDATE file removes its tree entry, so the HEAD-tree byte sum (the issue metric) drops by that file's size. Moving a doc to `docs/archive/` saves **0** tree bytes — same blobs, same entry count, only the path changes. Git history is untouched either way.

## 3. Docs (48 files)

### 3a. KEEP at root (7)
- `CHANGED_FILES.md` (43,380 B) — Master change index for all versions; referenced by GITHUB_DESKTOP_GUIDE.md and in build-script comments.
- `CHANGELOG_V15_2_to_V15_3.md` (8,911 B) — Current-version (V15.3) changelog.
- `FIREBASE_SETUP.md` (13,399 B) — Live Firebase setup guide; copied into out/ by build_v15.py; named in user-facing UI text inside index.html.
- `GITHUB_DESKTOP_GUIDE.md` (44,681 B) — Live deploy/rollback guide (V15.3 section is the current procedure).
- `README_V15_3_MOBILE_NAV.md` (9,658 B) — Current-version (V15.3) readme.
- `REVIEW_LIST_V14.md` (2,869 B) — Records UNRESOLVED items (V9 word fixes "gram"->"gam", "pomegranate"->"qua lựu"; BT headwords) still awaiting the owner decision; referenced by README_V14_BASIC_TACTICS.md, REPORT_BASIC_TACTICS.md, CHANGELOG_V13_to_V14.md.
- `SMOKE_TEST_V15_3_2026-11-17.md` (9,422 B) — Current-version (V15.3) test report.

### 3b. CANDIDATE — archive to `docs/archive/`, do NOT delete (41)
Evidence for all of them: referenced ONLY by `CHANGED_FILES.md` historical file lists and/or `GITHUB_DESKTOP_GUIDE.md` historical version sections and/or code comments ("see X.md"). Not read by any build script, not loaded at runtime. `CHANGED_FILES.md` mentions all 47 other docs — it is an append-only history log, so a listing there is provenance, not a live dependency. `GITHUB_DESKTOP_GUIDE.md` mentions 12 docs, all in historical version sections (V6–V9, V15.2), none in the live V15.3 procedure.
Moving them breaks the "see X.md" pointers in code comments and in `CHANGED_FILES.md` (stale-pointer cleanup needed if moved). The V15.1 / V15.2 docs are the most recent history — lowest priority to move.

| File | Bytes |
|---|---:|
| `ASSET_REPORT_V10.md` | 6,159 |
| `ASSET_REPORT_V11.md` | 5,456 |
| `ASSET_REPORT_V15.md` | 4,810 |
| `CHANGELOG_V10_to_V11.md` | 7,445 |
| `CHANGELOG_V11_1_to_V12.md` | 9,383 |
| `CHANGELOG_V11_to_V11_1.md` | 5,073 |
| `CHANGELOG_V12_to_V13.md` | 11,179 |
| `CHANGELOG_V13_to_V14.md` | 11,191 |
| `CHANGELOG_V14_to_V15.md` | 9,433 |
| `CHANGELOG_V15_1_to_V15_2.md` | 6,814 |
| `CHANGELOG_V15_to_V15_1.md` | 5,880 |
| `CHANGELOG_V6_to_V7.md` | 3,317 |
| `CHANGELOG_V7_to_V8.md` | 4,304 |
| `CHANGELOG_V8_to_V9.md` | 8,016 |
| `CHANGELOG_V9_to_V10.md` | 5,038 |
| `README_V10_BOSSES.md` | 9,633 |
| `README_V11_1_KOREAN_BOSS_MAP.md` | 5,238 |
| `README_V11_BOSS_ADVENTURE.md` | 15,495 |
| `README_V12_SAVE_SYNC.md` | 6,235 |
| `README_V13_LOGIN_ACCOUNT.md` | 8,623 |
| `README_V14_BASIC_TACTICS.md` | 5,642 |
| `README_V15_1_UI.md` | 8,345 |
| `README_V15_2_LIBRARY.md` | 12,708 |
| `README_V15_PETS.md` | 11,304 |
| `README_V6_Bilingual.md` | 39,845 |
| `README_V7.md` | 5,800 |
| `README_V8_IMPORT.md` | 7,598 |
| `README_V9_LIBRARY.md` | 6,265 |
| `REPORT_BASIC_TACTICS.md` | 5,436 |
| `REPORT_PDF_EXTRACTION.md` | 9,470 |
| `SMOKE_TEST_V10_2026-11-17.md` | 6,520 |
| `SMOKE_TEST_V11_1_2026-11-17.md` | 6,774 |
| `SMOKE_TEST_V11_2026-11-17.md` | 6,895 |
| `SMOKE_TEST_V12_2026-11-17.md` | 8,403 |
| `SMOKE_TEST_V13_2026-11-17.md` | 8,843 |
| `SMOKE_TEST_V14_2026-11-17.md` | 12,716 |
| `SMOKE_TEST_V15_1_2026-11-17.md` | 8,470 |
| `SMOKE_TEST_V15_2026-11-17.md` | 8,185 |
| `SMOKE_TEST_V15_2_2026-11-17.md` | 11,237 |
| `SMOKE_TEST_V8_2026-11-17.md` | 5,084 |
| `SMOKE_TEST_V9_2026-11-17.md` | 6,547 |
| **Subtotal (archive move; 0 tree bytes saved by moving)** | **350,809** |

## 4. Test logs + baselines

| File | Bytes | Verdict | Why |
|---|---:|---|---|
| `tools/v15lib/baseline25.js` | 2,925 | KEEP | Test-harness entry point. Referenced by the matching SMOKE_TEST doc as the test procedure and/or required by other harness files. Referenced by — doc … |
| `tools/v15lib/baseline25.json` | 4,311 | KEEP | Baseline data for the V15.2 audit; written by baseline25.js, read by the audit harness; named in SMOKE_TEST_V15_2 docs. |
| `tools/v15lib/test25-run1.log` | 5,004 | UNKNOWN | No doc reference. Only raw record of test25 run 1; SMOKE_TEST_V15_2_2026-11-17.md summarizes the counts (103/103) but the log is the raw evidence. |
| `tools/v15lib/test25-run2.log` | 5,104 | UNKNOWN | One of three byte-identical copies (sha256 97800e25...); no doc reference. Kept copy if the group is deduped (see the two CANDIDATE twins). |
| `tools/v15lib/test25-run3.log` | 4,622 | CANDIDATE | Byte-identical duplicate of test25-run2.log (sha256 97800e25...). No doc reference to this filename. Deleting saves 3,197 tree bytes; identical … |
| `tools/v15lib/test25-run4.log` | 4,519 | UNKNOWN | Named in SMOKE_TEST_V15_2_2026-11-17.md. Only raw record of run 4. |
| `tools/v15lib/test25-zip.log` | 4,626 | CANDIDATE | Byte-identical duplicate of test25-run2.log (sha256 97800e25...). No doc reference to this filename. Deleting saves 3,197 tree bytes; identical … |
| `tools/v15lib/test25-zip2.log` | 4,602 | UNKNOWN | No doc reference. Only raw record of a ZIP re-run; SMOKE_TEST_V15_2 summarizes counts only. |
| `tools/v15lib/test25-zip3.log` | 4,524 | UNKNOWN | Named in SMOKE_TEST_V15_2_2026-11-17.md. Only raw record of a ZIP run. |
| `tools/v15nav/baseline26.js` | 2,755 | KEEP | Test-harness entry point. Referenced by the matching SMOKE_TEST doc as the test procedure and/or required by other harness files. Referenced by — … |
| `tools/v15nav/baseline26.json` | 66,086 | KEEP | Baseline data for the V15.3 audit (8 viewports); written by baseline26.js; named in SMOKE_TEST_V15_3_2026-11-17.md, README_V15_3_MOBILE_NAV.md and in … |
| `tools/v15nav/baseline26.log` | 95 | CANDIDATE | 95-byte console log of the baseline run; the record itself is baseline26.json (KEEP). No basename reference anywhere (only the stem "baseline26" in … |
| `tools/v15nav/pw/get-browser.log` | 0 | CANDIDATE | 0 bytes, empty. Failed Playwright-download artifact (documented as moot in SMOKE_TEST_V15_3_2026-11-17.md — system Chrome works, fallback never … |
| `tools/v15nav/pw/get-browser2.log` | 0 | CANDIDATE | 0 bytes, empty. Same as get-browser.log; not even stem-referenced anywhere. |
| `tools/v15nav/shots26.log` | 349 | CANDIDATE | 349-byte console log of the screenshot runs; the results are the .png files (not committed) and the smoke-test doc. No basename reference anywhere. … |
| `tools/v15nav/test26-run1.log` | 9,374 | UNKNOWN | Named in SMOKE_TEST_V15_3_2026-11-17.md as run 1 (204/214, the run that found the langbar bug). Only raw record of that run; the .md summarizes the … |
| `tools/v15nav/test26-run2.log` | 8,587 | UNKNOWN | Byte-identical twins (sha256 a820365b...; 2 x 8,587 B). Both filenames are named in SMOKE_TEST_V15_3_2026-11-17.md (run 2 on out/; run 3 on the … |
| `tools/v15nav/test26-zip.log` | 8,587 | UNKNOWN | Byte-identical twins (sha256 a820365b...; 2 x 8,587 B). Both filenames are named in SMOKE_TEST_V15_3_2026-11-17.md (run 2 on out/; run 3 on the … |
| `tools/v15ui/test24-run2.log` | 3,197 | UNKNOWN | Byte-identical to its two twins (sha256 97800e25...; 3 copies x 3,197 B). BUT all three filenames are named in README_V15_1_UI.md / … |
| `tools/v15ui/test24-run3.log` | 3,197 | UNKNOWN | Byte-identical to its two twins (sha256 97800e25...; 3 copies x 3,197 B). BUT all three filenames are named in README_V15_1_UI.md / … |
| `tools/v15ui/test24-zip.log` | 3,197 | UNKNOWN | Byte-identical to its two twins (sha256 97800e25...; 3 copies x 3,197 B). BUT all three filenames are named in README_V15_1_UI.md / … |

Rule applied: a log is UNKNOWN when it is the only raw record of a test run (the `.md` smoke test summarizes counts only). A log is CANDIDATE only when its content survives elsewhere (byte-identical twin, or the `.json` baseline is the real record, or the file is empty).

## 5. Samples (5 files) — all KEEP
- `samples/english-sample.csv` (612 B) — runtime download link in `index.html`/`v16.js` (Smart Import samples).
- `samples/english-sample.xlsx` (18,327 B) — runtime download link in `index.html`/`v16.js` (Smart Import samples).
- `samples/korean-sample.csv` (397 B) — runtime download link in `index.html`/`v16.js` (Smart Import samples).
- `samples/korean-sample.xlsx` (17,660 B) — runtime download link in `index.html`/`v16.js` (Smart Import samples).
- `samples/vocab-sample.json` (1,320 B) — runtime download link in `index.html`/`v16.js` (Smart Import samples).

## 6. Build / legacy scripts (17 files)

Key correction to the issue premise: **seven "legacy" scripts are live build inputs, not dead code.** `build_v15.py` copies these from the repo root into `out/` on every build (verified lines 447–498): `build_v11.py`, `build_v11_1.py`, `build_v12.py`, `build_v13.py`, `build_v14.py`, `gen_samples.js`, `tools/split_bosses_v11.py` (plus `firebase-config.js`, `firestore.rules`, `FIREBASE_SETUP.md`). Deleting any of them breaks `build_v15.py` with a `FileNotFoundError` on `read_text`. They are KEEP.

| File | Bytes | Verdict | Why |
|---|---:|---|---|
| `build.py` | 18,218 | CANDIDATE | V6 base build script. Referenced only by CHANGED_FILES.md and README_V6_Bilingual.md listings, plus code comments in v11/v12/v13.js ("see build.py … |
| `build_v11.py` | 16,436 | KEEP | Live build input: build_v15.py copies it from the repo root into out/ on every V15 build. Referenced by — build script (.py): build_v11_1.py, build_v12.py, … |
| `build_v11_1.py` | 18,488 | KEEP | Live build input: build_v15.py copies it into out/. Referenced by — build script (.py): build_v12.py, build_v13.py, build_v14.py, build_v15.py; doc (.md): … |
| `build_v12.py` | 20,174 | KEEP | Live build input: build_v15.py copies it into out/. Referenced by — build script (.py): build_v13.py, build_v14.py, build_v15.py; doc (.md): CHANGED_FILES.md, … |
| `build_v13.py` | 22,644 | KEEP | Live build input: build_v15.py copies it into out/. Referenced by — build script (.py): build_v14.py, build_v15.py; doc (.md): CHANGED_FILES.md, … |
| `build_v14.py` | 27,180 | KEEP | Live build input: build_v15.py copies it into out/. Referenced by — build script (.py): build_v15.py; doc (.md): CHANGED_FILES.md, CHANGELOG_V13_to_V14.md, … |
| `build_v15.py` | 30,813 | KEEP | Base of the current build chain (build_v15.py -> build_v15ui.py -> build_v15lib.py -> build_v15nav.py). Reads /tmp/v6 + ROOT/src + ROOT/data (absent from the … |
| `build_v15lib.py` | 6,151 | KEEP | Current chain link (adds V25 / V15.2); requires V15.1 output in out/. Referenced by — build script (.py): build_v15nav.py; doc (.md): CHANGED_FILES.md, … |
| `build_v15nav.py` | 11,787 | KEEP | Current chain link (adds V26 / V15.3); requires V15.2 output in out/. Referenced by — doc (.md): CHANGED_FILES.md, GITHUB_DESKTOP_GUIDE.md, … |
| `build_v15ui.py` | 5,575 | KEEP | Current chain link (adds V24 / V15.1); requires V15 output in out/. Referenced by — build script (.py): build_v15lib.py; doc (.md): CHANGED_FILES.md, … |
| `build_v8.py` | 6,520 | CANDIDATE | Referenced only by CHANGED_FILES.md and GITHUB_DESKTOP_GUIDE.md historical file lists. NOT copied by build_v15.py, NOT referenced by any current script. … |
| `build_v9.py` | 9,611 | CANDIDATE | Same as build_v8.py: doc listings only, not copied by build_v15.py, not referenced by any current script. Referenced by — doc (.md): CHANGED_FILES.md, … |
| `gen_samples.js` | 3,250 | KEEP | Live build input: build_v15.py copies it into out/; also the generator of samples/ (referenced by build_v8..v15 asserts). Referenced by — build script (.py): … |
| `process_bosses.py` | 2,521 | CANDIDATE | V6 boss-asset prep. Referenced only by CHANGED_FILES.md and README_V6_Bilingual.md. Not executed by the current chain. Referenced by — doc (.md): … |
| `split_decor.py` | 3,323 | CANDIDATE | V6 decor-asset prep. Referenced only by CHANGED_FILES.md. Not executed by the current chain. Referenced by — doc (.md): CHANGED_FILES.md. |
| `split_icons.py` | 3,433 | CANDIDATE | V6 icon-asset prep. Referenced only by CHANGED_FILES.md. Not executed by the current chain. Referenced by — doc (.md): CHANGED_FILES.md. |
| `tools/split_bosses_v11.py` | 6,980 | KEEP | Live build input: build_v15.py copies it into out/tools/; provenance tool for the 30 V11 boss PNGs (ASSET_REPORT_V11.md). Referenced by — build script (.py): … |

## 7. `Korean_Vocab_Farm_V6_Bilingual.html` (309,519 B) — KEEP
No runtime reference; the build scripts read the `src/` copy, not this root file. But the live deploy guide depends on it: `GITHUB_DESKTOP_GUIDE.md` "Quay lại V6 (nếu cần)" instructs the owner to rename this file to `index.html` to roll back, and `CHANGED_FILES.md` says it is kept "để đối chiếu". It is also the only in-repo copy of the V6 source. Removing it requires retiring/updating that rollback procedure first — so it is KEEP, not a candidate, under this audit's evidence rules.

## 8. Other non-runtime files

| File | Bytes | Verdict | Why |
|---|---:|---|---|
| `tools/split_bosses_v11.py` | 6,980 | KEEP | Live build input: build_v15.py copies it into out/tools/; provenance tool for the 30 V11 boss PNGs (ASSET_REPORT_V11.md). Referenced by — build … |
| `tools/v15lib/audit-lib.js` | 6,062 | KEEP | Test-harness entry point. Referenced by the matching SMOKE_TEST doc as the test procedure and/or required by other harness files. Referenced by — doc … |
| `tools/v15lib/dbg25.js` | 1,264 | UNKNOWN | Debug one-off from V15.2 work. Stem "dbg25" appears in SMOKE_TEST_V15_2_2026-11-17.md and CHANGED_FILES.md (a debug step is mentioned), but no script … |
| `tools/v15lib/dbg25b.js` | 2,921 | CANDIDATE | Debug one-off from V15.2 work. Zero references — basename AND stem searched across all text files, no hit in any doc, script, or harness. Not … |
| `tools/v15lib/dbg25c.js` | 2,901 | CANDIDATE | Debug one-off from V15.2 work. Zero references — basename AND stem searched across all text files, no hit in any doc, script, or harness. Not … |
| `tools/v15lib/dbg25d.js` | 1,693 | CANDIDATE | Debug one-off from V15.2 work. Zero references — basename AND stem searched across all text files, no hit in any doc, script, or harness. Not … |
| `tools/v15lib/dbg25e.js` | 2,320 | UNKNOWN | Debug one-off from V15.2 work. Stem named once in SMOKE_TEST_V15_2_2026-11-17.md; no script requires it. Ambiguous. |
| `tools/v15lib/setups/lib-btunit.js` | 725 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15lib/baseline25.js, … |
| `tools/v15lib/setups/lib-flash.js` | 318 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15lib/baseline25.js, … |
| `tools/v15lib/setups/lib-lesson.js` | 337 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15lib/baseline25.js, … |
| `tools/v15lib/setups/lib-quest.js` | 133 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15lib/baseline25.js, … |
| `tools/v15lib/setups/lib-topic.js` | 341 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15lib/baseline25.js, … |
| `tools/v15lib/setups/lib-vocab.js` | 618 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15lib/baseline25.js, … |
| `tools/v15lib/setups/mark-lib.js` | 1,573 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15lib/baseline25.js, … |
| `tools/v15lib/shots25.js` | 2,717 | KEEP | Test-harness entry point. Referenced by the matching SMOKE_TEST doc as the test procedure and/or required by other harness files. Referenced by — doc … |
| `tools/v15lib/test25.js` | 29,586 | KEEP | Test-harness entry point. Referenced by the matching SMOKE_TEST doc as the test procedure and/or required by other harness files. Referenced by — doc … |
| `tools/v15nav/audit-nav.js` | 5,710 | KEEP | Test-harness entry point. Referenced by the matching SMOKE_TEST doc as the test procedure and/or required by other harness files. Referenced by — doc … |
| `tools/v15nav/probe-langbar.js` | 1,447 | UNKNOWN | One-off probe from the V15.3 langbar diagnosis. Stem named in SMOKE_TEST_V15_3_2026-11-17.md (the probe story); no script requires it. Ambiguous. |
| `tools/v15nav/probe-langbar2.js` | 1,669 | CANDIDATE | One-off probe from the V15.3 langbar diagnosis. Zero references — basename AND stem searched, no hit in any doc, script, or harness. The finding is … |
| `tools/v15nav/probe-langbar3.js` | 1,518 | CANDIDATE | One-off probe from the V15.3 langbar diagnosis. Zero references — basename AND stem searched, no hit in any doc, script, or harness. The finding is … |
| `tools/v15nav/pw/get-browser.mjs` | 2,625 | CANDIDATE | Playwright fallback downloader. Documented as MOOT in SMOKE_TEST_V15_3_2026-11-17.md (the download never completed; system Chrome works). Hardcodes … |
| `tools/v15nav/pw/package.json` | 216 | CANDIDATE | Scaffolding for the never-completed Playwright fallback (get-browser.mjs). No reference to this file by basename anywhere; nothing requires it. |
| `tools/v15nav/restore_index.py` | 2,249 | CANDIDATE | Incident-recovery script from the 2026-11-18 EPERM incident. It ran 170+ failed attempts and was killed; the actual recovery was a plain `cp` … |
| `tools/v15nav/setups/pet-empty.js` | 480 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — doc (.md): CHANGED_FILES.md, … |
| `tools/v15nav/setups/pet-full.js` | 776 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — doc (.md): CHANGED_FILES.md, … |
| `tools/v15nav/shots26-after.js` | 3,005 | UNKNOWN | After-screenshots script for V15.3 (paired with shots26.js, which IS named in the smoke-test doc). This file itself is named nowhere (basename and … |
| `tools/v15nav/shots26.js` | 3,001 | KEEP | Test-harness entry point. Referenced by the matching SMOKE_TEST doc as the test procedure and/or required by other harness files. Referenced by — doc … |
| `tools/v15nav/test26.js` | 16,354 | KEEP | Test-harness entry point. Referenced by the matching SMOKE_TEST doc as the test procedure and/or required by other harness files. Referenced by — doc … |
| `tools/v15ui/audit.js` | 5,003 | KEEP | Test-harness entry point. Referenced by the matching SMOKE_TEST doc as the test procedure and/or required by other harness files. Referenced by — doc … |
| `tools/v15ui/batch.js` | 2,024 | KEEP | Test-harness entry point. Referenced by the matching SMOKE_TEST doc as the test procedure and/or required by other harness files. Referenced by — doc … |
| `tools/v15ui/cdp.js` | 5,575 | KEEP | Test-harness entry point. Referenced by the matching SMOKE_TEST doc as the test procedure and/or required by other harness files. Referenced by — doc … |
| `tools/v15ui/setups/account.js` | 28 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15ui/batch.js, … |
| `tools/v15ui/setups/battle.js` | 587 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15ui/batch.js, … |
| `tools/v15ui/setups/bossmap.js` | 31 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15ui/batch.js, … |
| `tools/v15ui/setups/chooser-seed.js` | 346 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15ui/test24.js. |
| `tools/v15ui/setups/clear.js` | 22 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15ui/test24.js. |
| `tools/v15ui/setups/enhub.js` | 24 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15ui/batch.js, … |
| `tools/v15ui/setups/evo.js` | 447 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15ui/batch.js, … |
| `tools/v15ui/setups/flash.js` | 57 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15lib/baseline25.js, … |
| `tools/v15ui/setups/library.js` | 53 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15ui/batch.js, … |
| `tools/v15ui/setups/login.js` | 32 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15ui/batch.js, … |
| `tools/v15ui/setups/pethub.js` | 321 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15ui/batch.js, … |
| `tools/v15ui/setups/pets.js` | 471 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15ui/batch.js, … |
| `tools/v15ui/setups/seed.js` | 346 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15lib/baseline25.js, … |
| `tools/v15ui/setups/sleep3s.js` | 45 | CANDIDATE | Trivial helper (sleep). Zero references — basename AND stem searched, no hit in any doc, script, or harness (no test requires it). |
| `tools/v15ui/setups/team.js` | 321 | KEEP | Test-harness setup fixture, required by the matching test*.js / shots*.js harness. Referenced by — tools harness: tools/v15ui/batch.js, … |
| `tools/v15ui/shot.js` | 1,120 | KEEP | Test-harness entry point. Referenced by the matching SMOKE_TEST doc as the test procedure and/or required by other harness files. Referenced by — doc … |
| `tools/v15ui/test24.js` | 20,989 | KEEP | Test-harness entry point. Referenced by the matching SMOKE_TEST doc as the test procedure and/or required by other harness files. Referenced by — doc … |

Harness entry points (`test24/25/26.js`, `shots25/26.js`, `audit*.js`, `baseline*.js`, `cdp.js`, `batch.js`, `shot.js`, all `setups/*.js`) are KEEP: named by the matching SMOKE_TEST doc as the test procedure and/or required by sibling harness files.

Not in the repo (local `out/` only, excluded from the V15.3 push — nothing to clean here): `probe-b.txt` (5 bytes, "test") and `tools/v15nav/pw/pw-core.tgz` (0 bytes, empty Playwright placeholder).

## 9. Low-risk cleanup candidate list (delete — not move)
These are the files this audit proves unreferenced (or duplicated with content surviving elsewhere). Nothing here was deleted — owner approval required first, per the issue.

| File | Bytes | Evidence |
|---|---:|---|
| `build.py` | 18,218 | V6 base build script. Referenced only by CHANGED_FILES.md and README_V6_Bilingual.md listings, plus code comments in v11/v12/v13.js ("see build.py patch_new_decor") that document … |
| `build_v8.py` | 6,520 | Referenced only by CHANGED_FILES.md and GITHUB_DESKTOP_GUIDE.md historical file lists. NOT copied by build_v15.py, NOT referenced by any current script. Superseded V8 build … |
| `build_v9.py` | 9,611 | Same as build_v8.py: doc listings only, not copied by build_v15.py, not referenced by any current script. Referenced by — doc (.md): CHANGED_FILES.md, GITHUB_DESKTOP_GUIDE.md. |
| `process_bosses.py` | 2,521 | V6 boss-asset prep. Referenced only by CHANGED_FILES.md and README_V6_Bilingual.md. Not executed by the current chain. Referenced by — doc (.md): CHANGED_FILES.md, … |
| `split_decor.py` | 3,323 | V6 decor-asset prep. Referenced only by CHANGED_FILES.md. Not executed by the current chain. Referenced by — doc (.md): CHANGED_FILES.md. |
| `split_icons.py` | 3,433 | V6 icon-asset prep. Referenced only by CHANGED_FILES.md. Not executed by the current chain. Referenced by — doc (.md): CHANGED_FILES.md. |
| `tools/v15lib/dbg25b.js` | 2,921 | Debug one-off from V15.2 work. Zero references — basename AND stem searched across all text files, no hit in any doc, script, or harness. Not required by test25.js. |
| `tools/v15lib/dbg25c.js` | 2,901 | Debug one-off from V15.2 work. Zero references — basename AND stem searched across all text files, no hit in any doc, script, or harness. Not required by test25.js. |
| `tools/v15lib/dbg25d.js` | 1,693 | Debug one-off from V15.2 work. Zero references — basename AND stem searched across all text files, no hit in any doc, script, or harness. Not required by test25.js. |
| `tools/v15lib/test25-run3.log` | 4,622 | Byte-identical duplicate of test25-run2.log (sha256 97800e25...). No doc reference to this filename. Deleting saves 3,197 tree bytes; identical content survives in test25-run2.log. |
| `tools/v15lib/test25-zip.log` | 4,626 | Byte-identical duplicate of test25-run2.log (sha256 97800e25...). No doc reference to this filename. Deleting saves 3,197 tree bytes; identical content survives in test25-run2.log. |
| `tools/v15nav/baseline26.log` | 95 | 95-byte console log of the baseline run; the record itself is baseline26.json (KEEP). No basename reference anywhere (only the stem "baseline26" in docs/harness). Deleting saves … |
| `tools/v15nav/probe-langbar2.js` | 1,669 | One-off probe from the V15.3 langbar diagnosis. Zero references — basename AND stem searched, no hit in any doc, script, or harness. The finding is recorded in … |
| `tools/v15nav/probe-langbar3.js` | 1,518 | One-off probe from the V15.3 langbar diagnosis. Zero references — basename AND stem searched, no hit in any doc, script, or harness. The finding is recorded in … |
| `tools/v15nav/pw/get-browser.log` | 0 | 0 bytes, empty. Failed Playwright-download artifact (documented as moot in SMOKE_TEST_V15_3_2026-11-17.md — system Chrome works, fallback never completed). No reference to this … |
| `tools/v15nav/pw/get-browser.mjs` | 2,625 | Playwright fallback downloader. Documented as MOOT in SMOKE_TEST_V15_3_2026-11-17.md (the download never completed; system Chrome works). Hardcodes an absolute workspace path … |
| `tools/v15nav/pw/get-browser2.log` | 0 | 0 bytes, empty. Same as get-browser.log; not even stem-referenced anywhere. |
| `tools/v15nav/pw/package.json` | 216 | Scaffolding for the never-completed Playwright fallback (get-browser.mjs). No reference to this file by basename anywhere; nothing requires it. |
| `tools/v15nav/restore_index.py` | 2,249 | Incident-recovery script from the 2026-11-18 EPERM incident. It ran 170+ failed attempts and was killed; the actual recovery was a plain `cp` (documented in … |
| `tools/v15nav/shots26.log` | 349 | 349-byte console log of the screenshot runs; the results are the .png files (not committed) and the smoke-test doc. No basename reference anywhere. Deleting saves 349 tree bytes. |
| `tools/v15ui/setups/sleep3s.js` | 45 | Trivial helper (sleep). Zero references — basename AND stem searched, no hit in any doc, script, or harness (no test requires it). |
| `v22_basictactics.json` | 108,981 | No runtime read of this root path (v22.js fetches basic_tactics_vocabulary.json instead). build_v15.py READS data/v22_basictactics.json (data/ is NOT in the repo) and WRITES this … |
| **Subtotal if all deleted** | **178,136** | tree bytes |

Plus the 41 docs in §3b as **archive-move** candidates (0 tree bytes saved by moving; deleting them instead would save 350,809 tree bytes, but that is NOT recommended — they are the version history).

## 10. UNKNOWN — needs an owner call (do not delete)
- `tools/v15lib/dbg25.js` (1,264 B) — Debug one-off from V15.2 work. Stem "dbg25" appears in SMOKE_TEST_V15_2_2026-11-17.md and CHANGED_FILES.md (a debug step is mentioned), but no script requires it and the doc does not name the file as …
- `tools/v15lib/dbg25e.js` (2,320 B) — Debug one-off from V15.2 work. Stem named once in SMOKE_TEST_V15_2_2026-11-17.md; no script requires it. Ambiguous.
- `tools/v15lib/test25-run1.log` (5,004 B) — No doc reference. Only raw record of test25 run 1; SMOKE_TEST_V15_2_2026-11-17.md summarizes the counts (103/103) but the log is the raw evidence.
- `tools/v15lib/test25-run2.log` (5,104 B) — One of three byte-identical copies (sha256 97800e25...); no doc reference. Kept copy if the group is deduped (see the two CANDIDATE twins).
- `tools/v15lib/test25-run4.log` (4,519 B) — Named in SMOKE_TEST_V15_2_2026-11-17.md. Only raw record of run 4.
- `tools/v15lib/test25-zip2.log` (4,602 B) — No doc reference. Only raw record of a ZIP re-run; SMOKE_TEST_V15_2 summarizes counts only.
- `tools/v15lib/test25-zip3.log` (4,524 B) — Named in SMOKE_TEST_V15_2_2026-11-17.md. Only raw record of a ZIP run.
- `tools/v15nav/probe-langbar.js` (1,447 B) — One-off probe from the V15.3 langbar diagnosis. Stem named in SMOKE_TEST_V15_3_2026-11-17.md (the probe story); no script requires it. Ambiguous.
- `tools/v15nav/shots26-after.js` (3,005 B) — After-screenshots script for V15.3 (paired with shots26.js, which IS named in the smoke-test doc). This file itself is named nowhere (basename and stem: zero hits), but it is the after-half of the …
- `tools/v15nav/test26-run1.log` (9,374 B) — Named in SMOKE_TEST_V15_3_2026-11-17.md as run 1 (204/214, the run that found the langbar bug). Only raw record of that run; the .md summarizes the counts.
- `tools/v15nav/test26-run2.log` (8,587 B) — Byte-identical twins (sha256 a820365b...; 2 x 8,587 B). Both filenames are named in SMOKE_TEST_V15_3_2026-11-17.md (run 2 on out/; run 3 on the packaged ZIP) and test26-zip.log also in …
- `tools/v15nav/test26-zip.log` (8,587 B) — Byte-identical twins (sha256 a820365b...; 2 x 8,587 B). Both filenames are named in SMOKE_TEST_V15_3_2026-11-17.md (run 2 on out/; run 3 on the packaged ZIP) and test26-zip.log also in …
- `tools/v15ui/test24-run2.log` (3,197 B) — Byte-identical to its two twins (sha256 97800e25...; 3 copies x 3,197 B). BUT all three filenames are named in README_V15_1_UI.md / SMOKE_TEST_V15_1_2026-11-17.md as the records of runs 2, 3 and the …
- `tools/v15ui/test24-run3.log` (3,197 B) — Byte-identical to its two twins (sha256 97800e25...; 3 copies x 3,197 B). BUT all three filenames are named in README_V15_1_UI.md / SMOKE_TEST_V15_1_2026-11-17.md as the records of runs 2, 3 and the …
- `tools/v15ui/test24-zip.log` (3,197 B) — Byte-identical to its two twins (sha256 97800e25...; 3 copies x 3,197 B). BUT all three filenames are named in README_V15_1_UI.md / SMOKE_TEST_V15_1_2026-11-17.md as the records of runs 2, 3 and the …

## 11. Findings for Step 2 (reproducible build)
- `build_v15.py` needs `/tmp/v6` (default `--src`), `ROOT/src/` (`v18_data.js`, `v19_data.js`, `v23*.js`, boss/pet PNGs, manifests) and `ROOT/data/` (`batch-*.json`, `v17_a1a2.json`, `v17_oxford.json`, `v22_basictactics.json`, `v22_basictactics_report.json`) — none of which is in the repo. A clean checkout cannot run any build script.
- `build_v15ui.py` / `build_v15lib.py` / `build_v15nav.py` need `out/` to already contain the previous version's build; they do not need `src/`/`data/` directly.
- `package_*.py` is not committed at all.
- `tools/v15nav/pw/get-browser.mjs` hardcodes an absolute workspace path; it is also documented as moot.
- The duplicate BT JSON is a symptom of the missing `data/` source of truth: the build regenerates both copies from `data/`, and the repo keeps both outputs while keeping neither input.

## 12. Out of scope for this task (noted, not verdict-ed)
- `assets/**/_old_svg/` (64 files, ~872 KB): task 1's territory.
- Runtime assets and `vendor/xlsx-0.18.5.full.min.js`: task 1's territory (runtime reference analysis).
- `v22_basictactics_report.json`: build input copy from `data/`; no duplicate found; not in this task's categories.

## 13. Honesty notes
- "Referenced by CHANGED_FILES.md" is treated as historical listing, not a live dependency — that file mentions all 47 other docs.
- "Referenced by index.html / root js" for docs means a code comment ("see X.md") inside inline JS, except `FIREBASE_SETUP.md`, which is named in user-facing UI text. Comment pointers are not functional dependencies.
- No file was deleted or modified. No browser test was run. No CI exists to run.
