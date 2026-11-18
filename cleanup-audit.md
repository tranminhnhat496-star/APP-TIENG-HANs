# Cleanup Audit — Korean & English Vocab Farm V15.3

- **Repo:** `tranminhnhat496-star/APP-TIENG-HANs`, branch `main`, commit `f099a2ffccbc3818ee212e4ef3286a4147199e54`
  ("Upgrade to V15.3: Mobile Responsive & Pet Navigation Fix")
- **Issue:** [#6 — Audit & plan safe repository cleanup + performance optimization (no main changes)](https://github.com/tranminhnhat496-star/APP-TIENG-HANs/issues/6)
- **Date:** 2026-11-18
- **Status: READ-ONLY AUDIT. Nothing was deleted, moved, or modified in this PR.**
  This PR contains only this report and the evidence files under `audit/`.
  Every deletion/move below is a **proposal for owner approval** — no file
  is removed until the owner approves the corresponding batch.
- **Method:** four parallel read-only sub-audits on a fresh clone
  (`audit/clone`, HEAD verified `f099a2ff`; `git status` clean after each):
  (1) runtime reference scan, (2) duplicates / docs / logs / legacy scripts,
  (3) build reproducibility, (4) GitHub Pages / Firebase / performance.
  Evidence: `audit/manifest.csv` (unified, one row per tracked file),
  `audit/refs-report.md`, `audit/dup-docs-report.md`,
  `audit/build-report.md`, `audit/perf-report.md`.
- **Protected throughout (never touched by any proposal):**
  `firebase-config.js`, `firestore.rules`, the `hanvocab.v1` localStorage key,
  Firestore paths/schema/rules, XP/level/items/boss/pet/word/import logic,
  login and cloud sync.

## 0. TL;DR

| | Files | Bytes |
|---|---|---|
| HEAD tree (baseline, verified) | 515 | 47,933,563 (~45.7 MiB) |
| **KEEP** | 364 | 45,697,890 |
| **CANDIDATE** | 130 | 2,131,662 (~2.03 MiB) |
| **UNKNOWN** (keep; owner decision needed) | 21 | 104,011 |

**Proposed cleanup, if all batches below are approved:**

| Batch | Action | Files | Tree bytes saved |
|---|---|---|---|
| A — Low: tools one-offs, debug/probe/incident scripts, empty logs | Delete | 13 | 16,281 |
| B — Low: historical docs | Move to `docs/archive/` | 41 | 0 (move only) |
| C — Medium: unreferenced assets (`_old_svg/`, 2 buildings, 1 FX, 1 icon, 1 sample) | Delete | 69 | 1,611,965 |
| D — Medium: legacy scripts + duplicate vocab JSON | Delete | 7 | 152,607 |
| **Total if all approved** | | **89 deleted + 41 moved** | **1,780,853** |
| After-state | 426 files | 46,152,710 (~44.0 MiB) | |

**What cleanup does NOT change:** runtime page weight. The first load is
~5.30 MiB (35 requests, local cold cache, 390px — §6); none of the 89
delete-candidates is fetched at runtime, so transferred bytes before/after
are the same until a High-risk optimization (lazy-loading, minification,
image optimization) lands in a separate PR with its own regression tests.

**Biggest finding:** the build is **not reproducible from a fresh clone**
(§5) — `src/`, `data/`, all `package_*.py`, and the V6 source tree are
missing from the repo. Recovery is ~99% complete by hash evidence, and the
only truly irreplaceable content is 4 small files (`data/batch-*.json`,
215 KB). Fixing reproducibility must come **before** deleting any legacy
script or old HTML (recovery-first, §7).

**Corrections to the issue's premises** (found by the audit, §8):
- 7 "legacy" scripts are **live build inputs**, not dead code —
  `build_v15.py` copies them into `out/` on every build.
- `Korean_Vocab_Farm_V6_Bilingual.html` is **KEEP** — the live deploy
  guide's "roll back to V6" procedure depends on it.
- Only **4 duplicate groups** exist (123,962 extra tree bytes), not a
  widespread duplication problem.
- The tree is ~45.7 MiB but the first-load page weight is ~5.3 MiB —
  boss/pet art is lazy, not fetched on load.

## 1. Baseline — verified independently

All figures below were re-computed from the clone with
`git ls-files` + `git cat-file --batch-check` (not copied from the issue):

| Metric | Value |
|---|---|
| Tracked files (HEAD tree) | **515** |
| Sum of blob sizes over tree entries (the issue's metric) | **47,933,563 B (~45.7 MiB)** |
| Sum over unique blobs (510 blobs; 5 entries are duplicates) | 47,809,601 B |
| `assets/` | 318 files, 40,798,837 B (~38.9 MiB) |
| `index.html` | 1,930,157 B (~1.84 MiB), sha256 `10492d46871f89de956bcdc5612720ba91a4df625d7db1e421bb96e9bdacb7f2` |
| `assets/bosses/` | ~17.67 MB (89 files) |
| `assets/pets/` | ~9.47 MB (53 files) |
| `assets/decor/` | ~3.51 MB (12 files) |
| `assets/**/_old_svg/` | 64 files, 872,563 B |
| Root `*.md` docs | 48 files, 483,129 B |
| `build*.py` at root | 12 files, ~193 KB |
| `Korean_Vocab_Farm_V6_Bilingual.html` | 309,519 B |
| `.github/workflows/` | **absent — no CI at all** |

The 123,962 B gap between the two totals is exactly the 4 duplicate groups
(§3): git already dedupes identical blobs in storage, so deleting a duplicate
entry shrinks the tree sum but not history (history is never rewritten).

## 2. Runtime — the app is effectively one file

- `index.html` (1,930,157 B) contains the whole game inline: the V6 base
  plus layers v3–v26 (31 inline `<script>` blocks = 1,755,327 B of JS,
  25 inline `<style>` blocks = 172,161 B of CSS).
- Its only same-origin external dependencies: `vendor/xlsx-0.18.5.full.min.js`
  (SheetJS 0.18.5, `<script src>`) and `firebase-config.js`
  (`<script src>`), plus **one** lazy JSON fetch:
  `basic_tactics_vocabulary.json` (`v22.js`, fetch with XHR fallback).
  Third-party CDNs: Google Fonts, Firebase SDKs (`gstatic.com`).
  No workers, no other fetch/XHR, no audio files (speech uses
  `speechSynthesis`).
- Root `v*.js` (1.45 MB) / `v*.css` (134 KB) are **reference copies, not
  fetched at runtime** — but they are KEEP as the only in-repo readable copy
  of each layer (the real build sources live in uncommitted `src/` — §5).
- Dynamic asset paths were resolved by enumerating each pattern's value
  domain from the data files (16 patterns D1–D16 in `refs-report.md` §4):
  boss PNGs from `v18_data.js`/`v19_data.js` (30+30), pet stages/eggs from
  `v23_data.js` (36+5), avatars from `v21.js` (10), decor/crops/scene/icons
  from their ID lists. A file counts as KEEP under a dynamic pattern only if
  its exact generated path is in the enumerated domain.
- **Answers:** (a) only `basic_tactics_vocabulary.json` is fetched;
  `v22_basictactics.json` is a build-only duplicate. (b) All word data is
  embedded in `index.html` (`v15data` = `v15_data.js` + WORDS;
  `v17data` = `v17_a1a2.js` + `v17_oxford.js`); `v15_words.json` /
  `v17_*.json` / `v17_review.json` are build inputs/outputs, never fetched.
  (c) `_old_svg/`: zero references anywhere (code, build scripts, docs).
  (d) `Korean_Vocab_Farm_V6_Bilingual.html`: no runtime reference, but KEEP
  as the only in-repo copy of the V6 base (and the deploy guide's V6
  rollback target). (e) `vendor/`: yes (SheetJS). `samples/`: 4 of 5 linked
  from `v16.js:776-779`; `samples/korean-sample.csv` is **not** linked.
- **Dangling references (404s in live code, static deduction — not
  browser-observed):** `assets/icons/v6/flame.png` (`v14.js:295`),
  `bubble.png` + `shop.png` (`v15_data.js` topic icons), `moon.png`
  (`v12.js` boss N11). `flame.svg` / `moon.svg` exist — likely one-word
  fixes, but that is a **code fix, not cleanup**, and belongs in a separate
  PR.
- **Root `v7.js` / `v8.js` drifted from the deployed inline copies:** the
  root files still reference nonexistent `sakura.svg` / `tree.svg` /
  `maple.svg` / `butterflies.svg`; `index.html` has the corrected `.png`
  paths (applied by `build.py`'s `patch_new_decor`). All other JS layers and
  all 20 CSS files are byte-identical to their inline blocks. The V6 HTML
  file — not the root `v7.js`/`v8.js` — is the source of truth for those two
  layers.

## 3. Duplicates — only 4 groups

| # | Files (identical content) | Size each | Extra tree bytes |
|---|---|---|---|
| 1 | `basic_tactics_vocabulary.json` = `v22_basictactics.json` | 108,981 | 108,981 |
| 2 | `tools/v15nav/test26-run2.log` = `test26-zip.log` | 8,587 | 8,587 |
| 3 | `tools/v15ui/test24-run2.log` = `test24-run3.log` = `test24-zip.log` | 3,197 | 6,394 |
| 4 | `tools/v15nav/pw/get-browser.log` = `get-browser2.log` | 0 | 0 |
| **Total** | | | **123,962** |

Group 1 is created by the build itself: `build_v15.py` reads
`data/v22_basictactics.json` and writes both files from the same object.
Runtime fetches only `basic_tactics_vocabulary.json`. Deleting the root copy
requires restoring `data/` first (it is the only in-repo copy under the
build-source name) and stopping the build from writing the twin.

## 4. Docs, logs, scripts — inventory and verdicts

Full per-file evidence: `audit/manifest.csv` (515 rows) and
`audit/dup-docs-report.md`.

- **Docs (48 files, 483,129 B):** 7 KEEP at root (`CHANGED_FILES.md`,
  `GITHUB_DESKTOP_GUIDE.md`, `FIREBASE_SETUP.md`, the V15.3 trio
  `README_V15_3_MOBILE_NAV.md` / `CHANGELOG_V15_2_to_V15_3.md` /
  `SMOKE_TEST_V15_3_2026-11-17.md`, `REVIEW_LIST_V14.md` — the last records
  the unresolved V9 word fixes still awaiting the owner's decision).
  41 files (350,809 B) are **archive-move candidates** (`docs/archive/`,
  do NOT delete): referenced only by `CHANGED_FILES.md` historical listings,
  guide historical sections, or code comments. Moving them saves 0 tree bytes
  and breaks "see X.md" pointers (stale-pointer cleanup needed if moved).
- **Test logs + baselines (21 files, 145,661 B):** harness entry points,
  setups, and `baseline*.json` are KEEP. Logs that are the only raw record of
  a test run are UNKNOWN (keep). Byte-identical twins with no doc reference
  are delete-candidates (§7, batch A).
- **Samples (5 files, 38,316 B):** 4 KEEP (runtime download links);
  `samples/korean-sample.csv` is CANDIDATE (no link; regenerable by
  `gen_samples.js:49`).
- **Build scripts (17 files, 213,104 B):** 7 "legacy" scripts are **live
  build inputs** — `build_v15.py` copies `build_v11.py`, `build_v11_1.py`,
  `build_v12.py`, `build_v13.py`, `build_v14.py`, `gen_samples.js`, and
  `tools/split_bosses_v11.py` into `out/` on every build; deleting any breaks
  `build_v15.py`. Truly unreferenced: `build.py`, `build_v8.py`,
  `build_v9.py`, `process_bosses.py`, `split_decor.py`, `split_icons.py`
  (doc listings only) — batch D.
- **`package_*.py`: absent from the clone.** No packaging script is
  committed; the ZIP chain exists only in the author workspace.

## 5. Build reproducibility — NO, not from a fresh clone

Full analysis: `audit/build-report.md`.

The chain fails in a fresh clone for three independent reasons: (1) all
full-build scripts require `/tmp/v6`, `src/`, and `data/` — none exist in
the clone; (2) all 13 `package_*.py` exist only on the author machine;
(3) the layer scripts need `out/` to already hold the previous version's
build. `/tmp/v6` is already gone from the author machine, and `build.py`'s
input (`../V6/Korean_Vocab_Farm_V6.html`) exists nowhere.

**Recovery is ~99% complete by hash evidence:**
- V6 tree: **226/226 files in the clone match the uploaded V6 ZIP
  byte-for-byte** — `/tmp/v6` can be reconstituted from the clone itself.
- `src/` vs clone: **146 match, 0 differ.** Every file the scripts actually
  read (all v15–v26 JS/CSS, SheetJS, 60 boss PNGs, 41 pet PNGs, 10 avatars,
  manifests) already exists in the repo byte-identical. The 13 files without
  counterparts (12 poster contact sheets, 1 generation log) are read by no
  build script.
- `data/` vs clone: **5 match.** The 12 without counterparts include the 4
  `batch-*.json` files — the **only truly irreplaceable content** (214 KB).
  `bt_meta.js` is embedded verbatim in `v22.js`; `forbidden.json` /
  `replace-*.json` are referenced by zero scripts (orphaned).
- Inline layers v9–v26 in `index.html` are byte-identical to the standalone
  root files; `v15data` = `v15_data.js` + `v15_words.json` (1,000 words,
  JSON-equal); `v17data` = `v17_a1a2.js` + `v17_oxford.js` exactly.
  (One subtlety: root `v7.js`/`v8.js` are the unpatched originals — §2.)

**Minimal recovery set (commit first, before any deletion):**
1. `data/batch-a1.json`, `batch-a2.json`, `batch-b1.json`, `batch-b2.json`
   (214,831 B) — the only build input whose content exists nowhere else in a
   usable form.
2. All 13 `package_*.py` (+ `build_v7.py`, `build_v10.py`,
   `validate_words.py` for history/validation).
3. New: `tools/setup-v6.sh` (reconstitute `/tmp/v6` from the checkout,
   hash-verified), `BUILD.md`, `tools/smoke.py`, `.github/workflows/pr-smoke.yml`
   (sketches in `build-report.md` §9–§11).
4. **Do NOT commit `src/` wholesale** (34.8 MB, mostly duplicate PNGs) —
   instead patch the scripts to resolve inputs from the repo layout using the
   verified mapping (Option A, recommended), or commit `src/` + `data/` as
   real directories and accept ~36 MB of duplication and two sources of
   truth (Option B).
5. **Acceptance test (not yet run — this audit ran no build):** run the full
   chain in a clean checkout and require the rebuilt `index.html` to hash
   exactly `10492d46871f89de956bcdc5612720ba91a4df625d7db1e421bb96e9bdacb7f2`.
   The byte-identical rebuild is a hypothesis supported by hash evidence,
   not a proven fact.

## 6. Performance baseline — measured, local only

Full report: `audit/perf-report.md` (raw: `audit/perf-local.json`,
`audit/perf-live.json`, `audit/perf-measure.js`, `audit/shot-local-390.png`).

- **GitHub Pages:** live site returns HTTP 200 and serves the V15.3
  `index.html` **byte-for-byte identical to the clone** (sha256 match,
  checked 2026-11-17 19:22 UTC via curl). `Cache-Control: max-age=600`.
- **CI:** none exists; no workflow to run.
- **Firebase:** `firebase-config.js` (1,549 B) holds a **real** project
  config (all 7 keys present, no placeholders; no values are reproduced in
  any report). `firestore.rules`: `/players/{uid}` owner-only read/write
  (`request.auth.uid == userId`), writes validated (`saveVersion` int,
  `updatedAt` int, `data` map), everything else denied. No other credential
  files exist in the tree.
- **First load, cold cache, local HTTP server, 390×844, Chrome 157
  (clean run 4; run 3 agrees within ~50 ms on LCP):**

| Metric | Value |
|---|---|
| Requests sent | **35** (33 finished / 2 failed — both external, environmental, see below) |
| **Transferred bytes** | **5,555,044 B (5.30 MiB)** |
| — document (`index.html`) | 1,930,347 B (34.8%) |
| — images | 2,740,513 B (49.3%) |
| — scripts | 883,664 B (15.9%) |
| `domContentLoaded` / `load` | 698 ms / 820 ms |
| First contentful paint | 296 ms |
| **LCP** | **928 ms** (IMG; repeat run 876 ms) |
| **CLS** | **0.0806** (1 deterministic shift, identical across runs) |
| ScriptDuration | ~0.23 s; JS heap 26.8 MB |

- **Largest runtime assets actually requested (top 10):** SheetJS 882 KB
  (loaded on every first load, only needed for import); `mascot-chick.png`
  542 KB; all 5 mascot moods ~1.15 MB eagerly loaded. **Boss/pet art is not
  requested on first load** — it loads only when those screens open. That is
  the concrete difference between the ~45.7 MiB tree and the ~5.3 MiB load.
- **Live Pages measurement was NOT obtained.** This sandbox's headless
  Chrome cannot reach the internet (egress-proxy tunnel failure:
  `ERR_TUNNEL_CONNECTION_FAILED` for `github.io`, Google Fonts, and the
  Firebase SDK). `curl` reaches Pages fine (HTTP 200, bytes match), so this
  is environmental, not a repo defect. Consequences: the numbers above are
  **no-webfont, offline** figures (0 webfonts loaded, `window.firebase`
  undefined — the app still rendered fully). No live transfer, LCP, or CLS
  number is claimed. No real-phone, throttled-network, Safari, cached
  repeat-visit, Firebase login/sync, or interaction measurement was done.
  `V8CompileDuration ≈ 1 ms` is reported but unverified (see perf-report §6).

## 7. Proposed cleanup plan (owner approval required per batch)

**Ordering rule (from the issue + §5):** recovery first. Batches A–D below
assume the §5 recovery set is committed first (or at least the 4
`batch-*.json` files), because batch D touches build-adjacent files and the
`v22` duplicate is entangled with the missing `data/` source of truth.
Each batch is its own small PR/commit series with a re-run of the reference
scan + `tools/smoke.py` (once it exists) before merge. No batch touches
`main` directly; no auto-merge; no history rewrite.

### Batch A — Low: tools one-offs, debug/probe/incident scripts, empty logs
**Delete 13 files, 16,281 B.** All proven unreferenced (basename + stem
search across all 293 text files in the clone; findings recorded in the
smoke-test docs they came from).

| File | Bytes | Why safe |
|---|---|---|
| `tools/v15lib/dbg25b.js`, `dbg25c.js`, `dbg25d.js` | 2,921 / 2,901 / 1,693 | Debug one-offs from V15.2; zero references; not required by `test25.js` |
| `tools/v15nav/probe-langbar2.js`, `probe-langbar3.js` | 1,669 / 1,518 | One-off probes from the V15.3 langbar diagnosis; finding recorded in `SMOKE_TEST_V15_3` |
| `tools/v15nav/pw/get-browser.mjs`, `pw/package.json` | 2,625 / 216 | Playwright fallback downloader; documented MOOT (download never completed; system Chrome works); hardcodes an absolute workspace path |
| `tools/v15nav/pw/get-browser.log`, `get-browser2.log` | 0 / 0 | Empty failed-download artifacts |
| `tools/v15nav/restore_index.py` | 2,249 | Incident-recovery script from the 2026-11-18 EPERM incident; ran 170+ failed attempts and was killed — the actual recovery was a plain `cp` |
| `tools/v15ui/setups/sleep3s.js` | 45 | Trivial sleep helper; zero references |
| `tools/v15nav/baseline26.log`, `shots26.log` | 95 / 349 | Console logs; the real records are `baseline26.json` (KEEP) and the smoke-test doc |

### Batch B — Low: historical docs → `docs/archive/`
**Move 41 files, 350,809 B, 0 tree bytes saved.** List in
`dup-docs-report.md` §3b (all pre-V15.3 `README_*`, `CHANGELOG_*`,
`SMOKE_TEST_*`, `ASSET_REPORT_*`, `REPORT_*` except the 7 KEEP-at-root files
in §4). Deleting them instead would save 350,809 tree bytes but is **not
recommended** — they are the version history. Moving requires a
stale-pointer pass: `CHANGED_FILES.md` and code comments contain "see X.md"
pointers that must be updated to the new paths (or left as historical text
with a note). The V15.1/V15.2 docs are the most recent history — lowest
priority to move.

### Batch C — Medium: unreferenced assets
**Delete 69 files, 1,611,965 B.** All proven unreferenced by the runtime scan
(literal + basename + dynamic-pattern + build-script/doc grep; see
`refs-report.md` §4 for the pattern catalogue).

| Group | Files | Bytes |
|---|---|---|
| `assets/**/_old_svg/` (all subdirs) | 64 | 872,563 |
| `assets/buildings/coop.png`, `mailbox.png` | 2 | 630,682 |
| `assets/fx/burst.svg` | 1 | 7,969 |
| `assets/icons/v6/barn.png` | 1 | 100,354 |
| `samples/korean-sample.csv` | 1 | 397 |

Notes: the `_old_svg/` set includes `corn_*`, `eggplant_*`, `potato_*`
crops that are not in the current `CROPS` list — superseded art, not a live
crop set. `burst.svg` is unreferenced even though a function is *named*
`burst` — it loads `spark.svg`. `korean-sample.csv` is regenerable by
`gen_samples.js:49`.

### Batch D — Medium: legacy scripts + duplicate vocab JSON
**Delete 7 files, 152,607 B.**

| File | Bytes | Prerequisite / note |
|---|---|---|
| `build.py` | 18,218 | V6 base builder; doc listings + code comments only. Its input (`../V6/Korean_Vocab_Farm_V6.html`) exists nowhere — dead input, but do not delete until the V6-base recovery (§5) is decided, since its `patch_new_decor` replacements are the reason root `v7.js`/`v8.js` differ from the deployed inline copies |
| `build_v8.py`, `build_v9.py` | 6,520 / 9,611 | Superseded builds; doc listings only; not copied by `build_v15.py` |
| `process_bosses.py`, `split_decor.py`, `split_icons.py` | 2,521 / 3,323 / 3,433 | V6 asset-prep scripts; doc listings only; not executed by the current chain |
| `v22_basictactics.json` | 108,981 | **Requires:** restore `data/` from it (or from its runtime twin) first, then stop `build_v15.py` from writing the twin — otherwise the next build recreates it |

### Not proposed (High risk — separate PRs with baselines + regression tests)
Modularizing/minifying the 1.93 MB `index.html`, consolidating v7–v26,
optimizing boss/pet PNGs (or WebP), lazy-loading SheetJS (882 KB on every
first load) and the 5 mascot moods (~1.15 MB eager), cache/service-worker
tweaks. None of these is in this audit's scope; each needs the §6 baseline,
visual/functional regression tests, and its own PR.

### UNKNOWN — keep, owner decision needed (21 files, 104,011 B)
- `assets/bosses/v10/manifest.json`, `assets/bosses/v11/manifest.json`
  (unique rembg cutout provenance), `assets/icons/v6/ICON_MAP.json`
  (comment/docs-only), `v22_basictactics_report.json` (unique BT QA detail).
- 17 test/debug logs and probes (`tools/v15lib/dbg25.js`, `dbg25e.js`,
  `test25-run1/2/4.log`, `test25-zip2/3.log`, `test25-run3.log`,
  `test25-zip.log`, `tools/v15nav/probe-langbar.js`, `shots26-after.js`,
  `test26-run1/2.log`, `test26-zip.log`, `tools/v15ui/test24-run2/3.log`,
  `test24-zip.log`) — each is the only raw record of a test run and/or is
  named in a smoke-test doc. See `manifest.csv` (verdict UNKNOWN) for the
  per-file reason.

## 8. Corrections to the sub-audits (found during consolidation)

The consolidator re-checked the sub-audits' claims against the clone and
found three errors, all corrected in the unified `audit/manifest.csv`
(515 rows, exact cover of `git ls-files`, total 47,933,563 B):

1. **`samples/korean-sample.csv` — dup-docs said KEEP (runtime link). Wrong.**
   `v16.js:776-779` links only `korean-sample.xlsx` (Excel Hàn); the CSV has
   no runtime link anywhere (only doc mentions + `gen_samples.js:49`
   generates it). Unified verdict: **CANDIDATE** (refs verdict stands).
2. **`tools/v15lib/test25-run3.log` and `test25-zip.log` — dup-docs said
   CANDIDATE as byte-identical duplicates of `test25-run2.log`. Wrong.**
   Their sha256 values differ (`4a07a304…` and `420395b8…` vs `60885eae…`
   for run2); the `97800e25…` hash cited in that report belongs to the
   **test24** logs, not test25. Both files are the only raw record of a run.
   Unified verdict: **UNKNOWN**. This also corrects the delete-candidate
   subtotal: 178,136 B → **168,888 B** for the dup-docs-only list; the
   unified delete total in §0/§7 (1,780,853 B) already reflects the
   correction.
3. **Duplicate-group counting:** the only true duplicate groups are the 4 in
   §3. The test25 logs are all distinct contents.

## 9. What this PR does NOT do / what was NOT verified

- **No file was deleted, moved, or modified.** No commit in this PR changes
  `main` or any game file.
- **No rebuild was run.** The byte-identical rebuild (§5) is a hypothesis
  supported by hash evidence; the acceptance test is a future clean-checkout
  run.
- **No live Pages performance numbers** (sandbox Chrome cannot reach the
  internet; §6). No real-phone, throttled-network, Safari, cached
  repeat-visit, or interaction measurements.
- **No Firebase login / cloud-sync test.** The SDK never loaded in this
  sandbox; no login, sync, or Firestore round-trip was exercised, and no
  user data was touched. The acceptance criteria's staging check for login,
  sync, hubs, libraries, Boss Map, Pet Hub, and Farming still needs a
  real-device pass after any cleanup batch lands.
- **No browser reachability test for dynamic assets.** The reference scan is
  static: it proves code *can* request a file, not that every referenced
  asset is reachable in the UI. Batch C should be followed by a browser pass
  over Boss Map, Pet Hub, Farm, and all modes (or a re-run of the existing
  `test24/25/26.js` harnesses) before merge.
- **No CI was run** (none exists). The PR-only workflow is a sketch
  (`build-report.md` §11), not a committed file — adding it belongs to the
  recovery PR, after the smoke test exists.

## 10. Risks & rollback

- **Risk: a "CANDIDATE" file is actually referenced by a path the static
  scan cannot see** (user-data-built paths, future data edits). Mitigation:
  batches are small and ordered; each batch re-runs the reference scan and
  the existing test harnesses before merge; UNKNOWN files are never deleted.
- **Risk: deleting a legacy script breaks a future rebuild.** Mitigation:
  recovery-first ordering (§7); `build.py`'s `patch_new_decor` note in
  batch D; the rebuild acceptance hash (`10492d46…`) gates the recovery PR.
- **Risk: moving docs breaks "see X.md" pointers.** Mitigation: batch B
  includes the stale-pointer pass; moving (not deleting) keeps every blob
  reachable.
- **Risk: `v22_basictactics.json` deletion loses the build-source copy.**
  Mitigation: restore `data/` first (batch D prerequisite).
- **Rollback:** every batch is a normal commit on a branch — revert the
  commit. No history rewrite, no force-push, no `main` change in this PR.
  The game itself is untouched by this PR, so there is no player-data risk:
  no localStorage key, Firestore path/schema/rule, Firebase config, or game
  data file is modified by any proposal here.
- **Known pre-existing issues found (not caused by this audit, not fixed
  here):** 4 dangling icon references (404s in live code, §2); root
  `v7.js`/`v8.js` drift (§2); CLS 0.0806 is close to the 0.1 threshold
  (§6); Pages `Cache-Control: max-age=600` means deploys take minutes to
  propagate.

## 11. Review checklist for the owner

Please approve / reject / comment per item (a comment on this PR or on
#6 is enough — nothing is deleted until you say so):

- [ ] Batch A (13 files, 16,281 B delete) — approve?
- [ ] Batch B (41 docs → `docs/archive/`) — approve? (0 bytes saved)
- [ ] Batch C (69 files, 1,611,965 B delete) — approve?
- [ ] Batch D (7 files, 152,607 B delete) — approve? (note the `v22` + `build.py` prerequisites)
- [ ] UNKNOWN files (21 files, 104,011 B) — any to delete, or all kept?
- [ ] Build recovery: Option A (patch scripts to repo layout) or Option B
      (commit `src/` + `data/` wholesale, ~36 MB duplicated)?
- [ ] Commit the 4 `data/batch-*.json` files first (irreplaceable content)?
- [ ] Add `BUILD.md` + `tools/smoke.py` + PR-only CI workflow (sketches in
      `build-report.md` §9–§11)?

## Appendix — evidence files in this PR

| File | Contents |
|---|---|
| `cleanup-audit.md` (this file) | Consolidated report + proposed plan |
| `audit/manifest.csv` | Unified manifest: all 515 tracked files, one row each (`path,size_bytes,sha256,verdict,evidence,source`) — supersedes the two per-task CSVs below, with the §8 corrections applied |
| `audit/manifest-refs.csv` | Runtime-scan manifest (383 rows) as produced by sub-audit 1 |
| `audit/manifest-dup-docs.csv` | Duplicates/docs/logs manifest (141 rows) as produced by sub-audit 2 (contains the two test25 rows corrected in §8 — see the unified manifest for the corrected verdicts) |
| `audit/refs-report.md` | Runtime reference scan (method, dynamic-pattern catalogue D1–D16, dangling refs) |
| `audit/dup-docs-report.md` | Duplicates / docs / logs / legacy scripts inventory |
| `audit/build-report.md` | Build reproducibility: per-script tables, hash evidence, recovery plan, BUILD.md / smoke-test / CI sketches |
| `audit/perf-report.md` | Pages / Firebase / performance baseline + honest "not measured" section |
| `audit/perf-local.json`, `audit/perf-live.json` | Raw CDP measurement captures (local clean run 4; live attempt) |
| `audit/perf-measure.js` | CDP measurement script (re-runnable) |
| `audit/scan.py`, `audit/gen_manifest.py`, `audit/unify_manifest.py` | Reference-scan + manifest scripts (re-runnable against a clone) |

Note: the load screenshot `shot-local-390.png` is local evidence only and
is not committed (binary file, kept in the author workspace).
