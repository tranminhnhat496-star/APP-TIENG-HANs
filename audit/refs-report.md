# Runtime Reference Audit — Korean & English Vocab Farm V15.3

- **Repo:** `tranminhnhat496-star/APP-TIENG-HANs`, branch `main`, commit `f099a2ffccbc3818ee212e4ef3286a4147199e54`
- **Clone audited:** `/home/hatch/workspace/v7build/audit/clone` (fresh clone; `git status` clean after the audit — nothing modified)
- **Date:** 2026-11-18. **Scope:** read-only static scan. No build script was run, no file was deleted or modified.
- **Outputs:** this report + [`manifest.csv`](sandbox://workspace/v7build/audit/manifest.csv) (383 rows: `path,size_bytes,sha256,verdict,evidence`).
- **Working scripts (kept for reproducibility):** `audit/scan.py`, `audit/gen_manifest.py` (the manifest generator; re-runnable against the clone).

## 0. TL;DR

| | Files | Bytes |
|---|---|---|
| In manifest scope | 383 | 46,964,518 (~44.8 MiB) |
| **KEEP** | 309 | 45,216,737 |
| **CANDIDATE** (no reference found) | 70 | 1,720,946 (~1.64 MiB) |
| **UNKNOWN** (keep; do not delete) | 4 | 26,835 |

- The runtime is effectively **one file**: `index.html` (1,930,157 B) contains the whole game inline — the V6 base plus layers v3–v26. Its only same-origin external dependencies are `vendor/xlsx-0.18.5.full.min.js`, `firebase-config.js`, and one lazy JSON fetch (`basic_tactics_vocabulary.json`). Everything else (Google Fonts, Firebase SDKs) is a third-party CDN.
- Of the 318 files under `assets/`, **247 are referenced at runtime and 71 are not** (64 `_old_svg/` + 7 others). The 64 `_old_svg/` files (872,563 B) have **zero** references anywhere — code, build scripts, or docs.
- The only exact duplicate content in scope is `basic_tactics_vocabulary.json` == `v22_basictactics.json` (same sha256, 108,981 B).
- **Three dangling references found (code points at files that do not exist):** `assets/icons/v6/flame.png` (v14.js:295), `assets/icons/v6/bubble.png` and `assets/icons/v6/shop.png` (v15_data.js topic icons), `assets/icons/v6/moon.png` (v12.js N11). These are 404s in live code paths, not files to delete.
- Root `v7.js`/`v8.js` have **drifted from the deployed inline copies**: the root files still reference `assets/decor/sakura.svg|tree.svg|maple.svg|butterflies.svg` (nonexistent), while `index.html` has the corrected `.png` paths — `build.py` applies those replacements when patching the V6 base. The root files are therefore stale in exactly those lines.
- No service worker, no `importScripts`, no other `fetch`/`XMLHttpRequest` in the runtime besides the BT lazy load (v22.js) and the Firebase SDK loader (v20_sync.js, gstatic CDN).

## 1. Method

**Corpus searched (the runtime code):** `index.html` (1,930,157 B, incl. all inline `<script>`/`<style>`) + every root `*.js` (28 files, incl. `firebase-config.js`, `gen_samples.js`) + every root `*.css` (20 files). Total 3,511,008 bytes.

**Searches performed per file:**
1. **Literal match** — the relative path (`assets/...`, `samples/...`, `vendor/...`) as a quoted string, plus CSS `url(...)` references, in the corpus.
2. **Basename match** — the bare filename as a quoted string (covers bare-filename map values such as the `v9.js` icon maps), **only when the basename is unique across the repo** (this guard matters: `assets/buildings/barn.png` vs `assets/icons/v6/barn.png` share a basename; the naive match would have falsely kept the icons copy).
3. **Dynamic-pattern match** — for paths built by string concatenation / template literals, the generating code was located and the *value domain* enumerated from the data files (boss IDs in `v18_data.js`/`v19_data.js`, pet stages/eggs in `v23_data.js`, avatar IDs in `v21.js`, decor IDs in `v10.js`, crops in `v7.js`/`v15.js`, icon names in `v9.js`/`v12.js`/`v13.js`/`v14.js`/`v15.js`/`v15_data.js`). A file is KEEP under a dynamic pattern only if its exact generated path is in the enumerated domain. The full pattern catalogue is §4.
4. **Build-script / docs check** — every root `*.py` and `*.md` was grepped for each unresolved filename (`_old_svg`, `manifest.json`, `ICON_MAP.json`, all `*.json` data files, `samples/`, `vendor/`, `Korean_Vocab_Farm_V6_Bilingual`).
5. **Hash duplicates** — sha256 over all 383 in-scope files.

**Verdict definitions (as tasked):**
- **KEEP** — referenced at runtime (literal or proven dynamic pattern), loaded by `index.html`, protected (`firebase-config.js`, `firestore.rules`), or the only in-repo copy of data a build script needs (see §5).
- **CANDIDATE** — no reference found by any search above; the evidence column states exactly what was searched.
- **UNKNOWN** — matched only by a loose/ambiguous pattern, referenced only from docs/comments, or undecidable. Kept; do not recommend deletion.

**What a static scan cannot prove (caveats):**
- Paths built from **user data at runtime** (e.g. a filename typed/pasted by the user, or read from a save file) would not appear in the code. The save format was inspected: pets store species IDs, bosses store boss IDs, decks store word IDs — all covered by the enumerated domains above. User-uploaded decks (Smart Import) carry no asset paths.
- Paths built from **data files** are covered only insofar as the data files themselves were enumerated (v18/v19/v23_data, topic/mode icon fields). If a future data edit adds a new icon/boss/pet ID, its asset becomes referenced without a code change — the cleanup PR must re-run this scan after any data change.
- **CSS `url()` inside `index.html`'s inline `<style>` blocks** was scanned as part of the corpus; the root `*.css` files are byte-identical to those blocks (§3), so no CSS reference was missed that way.
- This audit says nothing about whether a referenced asset is actually *reachable in the UI* (dead code paths) — only that the code can request it. Reachability would need a browser run.
- `tools/` (test harnesses, screenshots, logs) is **outside** the manifest scope per the task; only the duplicate-log note in §6 touches it.

## 2. `index.html` — static references (task §1)

`index.html` is 1,930,157 bytes. It is the built artifact: the V6 base HTML plus layers v3–v26 inlined.

| Reference kind | Count | Detail |
|---|---|---|
| `<script src>` (external) | 2 | `vendor/xlsx-0.18.5.full.min.js`, `firebase-config.js` |
| `<link href>` | 2 | Both Google Fonts: `https://fonts.googleapis.com` (preconnect) and the `css2?family=Be+Vietnam+Pro…&family=Noto+Sans+KR…&family=Jua&display=swap` stylesheet |
| `<img src>` | 37 | Mostly template literals in inline JS, e.g. `assets/bosses/${b.art}.png`, `assets/crops/`, `assets/decor/`, `assets/icons/v6/`, `assets/avatars/`, `assets/pets/v15/eggs/`, `assets/maps/boss_world_map.jpg`, `assets/mascot-chick.png` (×5), `${A}fx/rays.svg`, `${A}mascot/jump.png`, `${A}icons/chest.svg` |
| Inline `<script>` blocks (no `src`) | 31 | Layers v3–v26, each with an `id="vNNjs"` / `id="vNNdata"` marker (plus `v20sync`) |
| Inline `<style>` blocks | 25 | Layers v3–v26, each with an `id="vNN"` marker |
| CSS `url(...)` (inline styles) | 15 distinct | `assets/fx/claw.svg`, `assets/fx/slash.svg`, `assets/icons/coin.svg`, `assets/icons/heart.svg`, `assets/icons/learn.svg`, `assets/icons/v6/book.png`, `assets/icons/v6/coin.png`, `assets/icons/v6/health.png`, `assets/mascot/idle.png`, `assets/scene/farm_top.png`, `assets/scene/fence_tile.png`, `assets/scene/grass_tile.png`, `assets/scene/meadow.png`, `assets/scene/path_tile.png`, `assets/scene/soil_tile.png` |
| `fetch` / `XMLHttpRequest` | 1 site | `v22.js` lazy BT load (fetch + XHR fallback) — see §5(a) |
| Dynamic `<script>` creation | 1 site | `v20_sync.js:236` — Firebase SDK loader (gstatic CDN, §2.1) |
| `importScripts` / workers | 0 | None anywhere in the corpus |
| `<audio>` / `.mp3` / `.wav` / `.ogg` | 0 | No audio files referenced (the `.wav` grep hits were the skill name `wave`; speech uses `speechSynthesis`) |

### 2.1 External (non-repo) dependencies at runtime

- **Google Fonts** — `fonts.googleapis.com` (Be Vietnam Pro, Noto Sans KR, Jua). Render-blocking stylesheet link.
- **Firebase SDKs** — loaded lazily only when configured: `https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js`, `firebase-auth-compat.js`, `firebase-firestore-compat.js` (`v20_sync.js:229-234` `SDK_URLS`, loaded by `loadScript()` at `v20_sync.js:236`).
- Nothing else. No other CDN, no analytics, no service worker.

### 2.2 What is inlined vs external

- **Inlined in `index.html`:** the entire V6 game + layers v7–v26 (JS) and v7–v26 (CSS). Verified by extracting every `<script id="vNNjs">` / `<style id="vNN">` block and comparing with the root files:
  - All 20 CSS files are **byte-identical** to their inline `<style>` blocks.
  - All JS layer files are **byte-identical** to their inline `<script>` blocks, **except `v7.js` (1 line) and `v8.js` (5 lines)** — see §6.2.
  - Data files: `v18_data.js`, `v19_data.js`, `v20_sync.js`, `v23_data.js` are byte-identical inline. The `v15data` block is `v15_data.js` + the embedded WORDS array (generated from `v15_words.json`). The `v17data` block is `v17_a1a2.js` + `v17_oxford.js` concatenated.
- **External (loaded by `index.html`):** only `vendor/xlsx-0.18.5.full.min.js` and `firebase-config.js`.
- **Consequence for the manifest:** the root `v*.js`/`v*.css` files are **not loaded at runtime** — the runtime reads the inline copies. They are KEEP as the in-repo source record of the inlined layers (the build reads the real sources from `src/`, which is **not** committed — see the build audit, task 2). Deleting a root layer file would not break the deployed game, but would destroy the only in-repo readable copy of that layer.

## 3. Summary counts per directory

Manifest scope = `assets/**` (318) + root `*.js`/`*.css`/`*.json`/`*.html` (58) + `vendor/**` (1) + `samples/**` (5) + `firestore.rules` (1 extra row, protected) = **383 files, 46,964,518 B**.

| Directory | Files | Bytes | KEEP | CANDIDATE | UNKNOWN |
|---|---|---|---|---|---|
| `(root)` | 59 | 5,245,638 | 57 | 1 | 1 |
| `assets/avatars` | 10 | 627,851 | 10 | 0 | 0 |
| `assets/bosses` | 89 | 17,669,163 | 80 | 7 | 2 |
| `assets/buildings` | 11 | 1,860,957 | 3 | 8 | 0 |
| `assets/crops` | 57 | 1,479,435 | 27 | 30 | 0 |
| `assets/decor` | 12 | 3,513,486 | 12 | 0 | 0 |
| `assets/fx` | 6 | 33,624 | 5 | 1 | 0 |
| `assets/icons` | 48 | 2,233,449 | 46 | 1 | 1 |
| `assets/maps` | 1 | 385,123 | 1 | 0 | 0 |
| `assets/mascot` | 12 | 1,120,148 | 6 | 6 | 0 |
| `assets/mascot-chick.png` | 1 | 541,240 | 1 | 0 | 0 |
| `assets/pets` | 53 | 9,472,903 | 47 | 6 | 0 |
| `assets/scene` | 18 | 1,861,458 | 9 | 9 | 0 |
| `samples` | 5 | 38,316 | 4 | 1 | 0 |
| `vendor` | 1 | 881,727 | 1 | 0 | 0 |
| **Total** | **383** | **46,964,518** | **309** | **70** | **4** |

**CANDIDATE breakdown (70 files, 1,720,946 B):**
- `assets/**/_old_svg/` — 64 files, 872,563 B (exactly the baseline figure in the issue).
- `assets/buildings/coop.png` (408,189 B), `assets/buildings/mailbox.png` (222,493 B).
- `assets/fx/burst.svg` (7,969 B).
- `assets/icons/v6/barn.png` (100,354 B).
- `samples/korean-sample.csv` (397 B).
- `v22_basictactics.json` (108,981 B) — byte-identical duplicate of `basic_tactics_vocabulary.json`.

**UNKNOWN (4 files, 26,835 B — keep, do not delete):**
- `assets/bosses/v10/manifest.json` (5,800 B), `assets/bosses/v11/manifest.json` (5,621 B) — unique per-boss cutout provenance (rembg model + crop box + size + solid_frac); no code reference, docs-referenced.
- `assets/icons/v6/ICON_MAP.json` (4,910 B) — referenced only by the comment in `v9.js:2` and `README_V6_Bilingual.md`; the live maps are embedded in `v9.js`.
- `v22_basictactics_report.json` (10,504 B) — unique BT extraction QA detail (duplicates/flags); build output, docs-referenced.

## 4. Dynamic-pattern catalogue (with code locations)

These are the patterns that generate asset paths at runtime. Each was verified by enumerating its value domain from the data files and checking every file in the target directory against it.

| # | Pattern (generated path) | Generating code | Domain enumerated from | Covers |
|---|---|---|---|---|
| D1 | `assets/bosses/v10/<id>.png` | literal `img:` field in `v18_data.js` (30 entries) | `v18_data.js:53-90` | 30/30 files |
| D2 | `assets/bosses/v11/<id>.png` | `IMG(id) = 'assets/bosses/v11/'+id+'.png'` (`v19_data.js:25`) | `B('v11_…')` × 30 in `v19_data.js` | 30/30 files |
| D3 | `assets/bosses/<art>.png` | `'assets/bosses/'+b.art+'.png'` (`v13.js:134,142,231`); also literal `img:` in `v18_data.js` old-boss list and `art:` in `v7.js` U-bosses, `img:` in `v15.js` bosses | V6 inline B array (`index.html:1475-1480`: F1 `f1_nam`, F4 `f4_treant`, N1–N12 `v6_root…v6_hac, thunder_tiger, coral_queen, astral_raven, crystal_beetle_king`); `v18_data.js:98-103` old bosses; `v7.js:129-135`; `v15.js:1201-1206` | 20/20 files in `assets/bosses/` |
| D4 | `assets/pets/v15/<stage>.png` | `stageImg()`: `'assets/pets/v15/'+sp.stages[st].img` (`v23.js:55`) | `v23_data.js:39-116` (12 species × 3 stages) | 36/36 files |
| D5 | `assets/pets/v15/eggs/<egg>.png` | `'assets/pets/v15/eggs/'+egg.img` (`v23.js:384`); also `v26.js:85` hardcodes `egg_fire.png` | `v23_data.js:122-127` (5 eggs) | 5/5 files |
| D6 | `assets/avatars/<id>.png` | `'assets/avatars/'+a.id+'.png'` (`v21.js:316,330,638,845,849,857,874`) | `v21.js:24-33` AVATARS (10 ids) | 10/10 files |
| D7 | `assets/mascot/<state>.png` | preload `['idle','happy','hello','jump','sad','sleep'].forEach(n => i.src='assets/mascot/'+n+'.png')` (`index.html:1442`, V6 inline code) | the literal list itself | 6/6 files |
| D8 | `assets/decor/<id>.png` | `'assets/decor/'+x.id+'.png'` (`v10.js:74,95,102,140,189,208`) | `v10.js:22-33` DECOR (12 ids) | 12/12 files |
| D9 | `assets/crops/<crop>_<0-4>.png` + `assets/crops/wilt.svg` / `pest.svg` | `'assets/crops/'+crop+'_'+stage+'.png'` (`v7.js:90`, `v15.js:1122`); wilt/pest via V6 `garden()`: `src='crops/wilt'/'crops/pest'` then `img()` appends `.svg` (ext rule at `index.html:1386`: `crops/<crop>_` → `.png`, else `.svg`) | `CROPS=['carrot','tomato','wheat','strawberry','sunflower']` (`v7.js:81`, `v15.js:1079`), stages 0–4 | 27/27 files |
| D10 | `assets/scene/<name>.png` | `mk('scene/<name>.png', …)` in the V4 scene builder (`index.html` V6 inline code); `mk()` prepends `A='assets/'` and `onerror` removes the node (`index.html:1383-1386`); plus CSS `url(assets/scene/grass_tile.png)` (`v8.css:12`) | literal call sites: `farm_top, fence_tile, grass_tile, meadow, path_tile, soil_tile, bird, cloud, sun` | 9/9 files |
| D11 | `assets/buildings/<name>.png` | literal `img:'assets/buildings/barn.png'` etc. in `v15.js` shop items; `well.png`/`windmill.png` in V6 scene code (`index.html` img-src list) | literal references only | 3/5 files (`coop.png`, `mailbox.png` unreferenced) |
| D12 | `assets/fx/<name>.svg` | CSS `url()` (`claw.svg`, `slash.svg`); `${A}fx/rays.svg` (img src); `burst()` default `src='fx/spark.svg'` (`index.html:1390`); `A+'fx/zzz.svg'` (`index.html:1404`); `mk()` prepends `A='assets/'` | literal call sites | 5/6 files (`burst.svg` unreferenced — note the function is *named* `burst` but loads `spark.svg`) |
| D13 | `assets/icons/<name>.svg` | V3 art map `M` (`index.html:1327`: emoji → `icons/learn|book|shop|trophy|bell|save|speaker|heart|heart_off|unknown|medal|medal_off`, extension `.svg` appended by `img()`); `v9.js` SRC swap map keys | literal keys | 16/16 files |
| D14 | `assets/icons/v6/<name>` | (a) `v9.js` SRC map (old icon → new file) and EMOJI map (emoji → file) — values are bare filenames, path built as `A+file` with `A='assets/icons/v6/'` (`v9.js:14`); (b) `icon15(name)` (`v15.js:27`) called with mode `ic:` values (`v15.js`) and `enIcon(name)` (`v14.js:280`) called with topic `icon:` values (`v14.js`, `v15_data.js`) and literals (`book.png`, `listen.png`, `coin.png`, `gem.png`, `flame.png`); (c) `'assets/icons/v6/'+f.icon` (`v12.js:72`) and `+rg.icon` (`v13.js:132,134`); (d) CSS `url()` (`v9.css:21-23`); (e) literals | Union of: v9 SRC+EMOJI values (26 files), v14 topic icons (12), v15 mode `ic:` (8), v15_data topic icons (10), v12 `icon:` (4), v13 `icon:` (7), literals | 30/31 image files (`barn.png` unreferenced); `ICON_MAP.json` not loaded (see §5) |
| D15 | `assets/pets/<animal>.png` | V3 art map `M` (`index.html:1327`: `🐔→pets/hen` etc., `.png` appended by `img()`) | `cow, dog, hen, horse, pig, sheep` | 6/6 files |
| D16 | `assets/mascot-chick.png`, `assets/maps/boss_world_map.jpg` | literals (`v21.js:338,354,370,404,727`; `v13.js:156`) | literal | 1/1 each |

## 5. Answers to the five specific questions

### (a) `basic_tactics_vocabulary.json` vs `v22_basictactics.json` — which is loaded at runtime?

**Only `basic_tactics_vocabulary.json` is loaded at runtime.** `v22.js:39` defines `dataURL()` returning exactly `'basic_tactics_vocabulary.json'`; it is fetched lazily on first Library/BT use with an XHR fallback (`v22.js:65,75`; same code inline at `index.html:11369,11379`). The file must sit next to `index.html` — it is the one JSON the game fetches over the network, and it will fail on `file://` (documented V14 caveat).

`v22_basictactics.json` has **zero** references in the code corpus. It is a build artifact: `build_v14.py:182` / `build_v15.py:181` read `data/v22_basictactics.json` (from `data_dir`, not the repo root) and write **both** `out/basic_tactics_vocabulary.json` and `out/v22_basictactics.json` (`build_v14.py:430-433`). The two files are byte-identical (same sha256). Verdict: **CANDIDATE** — deleting it loses zero unique bytes.

### (b) Which `.json`/`.js` data files are loaded by fetch vs embedded in `index.html`?

| File | Runtime loading | Build role |
|---|---|---|
| `basic_tactics_vocabulary.json` (108,981 B) | **fetch** (lazy, `v22.js`) | Written by build from `data/v22_basictactics.json` |
| `v22_basictactics.json` (108,981 B) | Not loaded (0 refs) | Build output copy; byte-identical to the above |
| `v22_basictactics_report.json` (10,504 B) | Not loaded (0 refs) | Build output copy of `data/v22_basictactics_report.json`; QA detail |
| `v15_words.json` (238,821 B) | Not fetched; data **embedded** in `index.html` (`v15data` block = `v15_data.js` + WORDS array) | Build output: `build_v15.py` merges `data/batch-*.json` (`load_words`, `build_v15.py:78-100`) and writes this file; the only in-repo copy of the merged 1,000-word list |
| `v17_a1a2.json` (227,926 B), `v17_oxford.json` (631,029 B) | Not fetched; data **embedded** as `v17_a1a2.js` + `v17_oxford.js` (concatenated into the `v17data` block) | Build inputs read from `data/` for validation (`build_v15.py:133-134`); root copies are the only in-repo instances |
| `v17_review.json` (97,117 B) | Not loaded (0 refs) | Build reads `data/v17_review.json` and writes a copy to `out/` (`build_v15.py:414-416`); the review data is **not** used to patch words — it is copied as a record |
| `v15_data.js`, `v18_data.js`, `v19_data.js`, `v23_data.js`, `v17_a1a2.js`, `v17_oxford.js` | Not loaded as files; **embedded** (byte-identical inline blocks, §2.2) | Build reads the real sources from `src/` (not committed) and inlines them; root files are the in-repo copies |
| `vendor/xlsx-0.18.5.full.min.js` (881,727 B) | **`<script src>`** in `index.html` | Copied from `src/vendor/` by the build |

Note: the root `*.json` data files are all build **outputs** written to `out/` — none is read back by any build script from the repo root. They are KEEP anyway because `data/` is not committed, so the root copies are the only in-repo instances of that data. Deleting them before the build audit (task 2) establishes `data/` as source-of-truth would destroy the rebuild inputs. The exception is `v22_basictactics.json`, which is fully redundant (identical bytes to a kept file).

### (c) Are files under `assets/**/_old_svg/` referenced anywhere?

**No.** Zero hits for the string `_old_svg` in:
- the code corpus (`index.html` + all root `*.js`/`*.css`),
- all root `*.py` (build scripts),
- all root `*.md` (docs/guides).

All 64 files (872,563 B) are superseded SVG art whose PNG successors are the live art (e.g. `_old_svg/dokkaebi.svg` → `assets/bosses/dokkaebi.png`; `_old_svg/carrot_0.svg` → `assets/crops/carrot_0.png`). Note the `_old_svg/crops/` set also contains `corn_*`, `eggplant_*`, `potato_*` — crops that are **not** in the current `CROPS` list (carrot/tomato/wheat/strawberry/sunflower) — and there is no `_old_svg` for `wheat_*`. Verdict: **CANDIDATE** (all 64).

### (d) Is `Korean_Vocab_Farm_V6_Bilingual.html` referenced?

**Not at runtime** (0 hits in the code corpus) and **not as a build input from the repo root**. The build reads it from `--src` (default `/tmp/v6`) — `build_v15.py:114` reads `<src>/Korean_Vocab_Farm_V6_Bilingual.html` — and `build.py:245` *writes* it as an output (the V6 Bilingual artifact built from `../V6/Korean_Vocab_Farm_V6.html`). Verdict: **KEEP** — it is the only in-repo copy of the V6 base artifact that the whole build chain starts from. Per the issue, the recovery strategy for the missing `src/`/`data/` must be decided before any legacy source is removed.

### (e) Is anything under `samples/` or `vendor/` referenced at runtime?

- **`vendor/`:** yes — `vendor/xlsx-0.18.5.full.min.js` is loaded by `<script src>` in `index.html` (Smart Import, SheetJS 0.18.5). KEEP.
- **`samples/`:** 4 of 5 files are referenced, as download links in the Smart Import UI (`v16.js:776-779`, same inline in `index.html:6428-6431`): `english-sample.xlsx`, `korean-sample.xlsx`, `english-sample.csv`, `vocab-sample.json`. **`samples/korean-sample.csv` is NOT referenced anywhere** (0 hits in code, build scripts, and docs) — the link list has no Korean-CSV entry. The file *is* generated by `gen_samples.js:49` (`writeCsv('korean-sample.csv', …)`), so it is trivially regenerable. Verdict: 4 KEEP, `korean-sample.csv` **CANDIDATE**.

## 6. Other findings (not verdicts, but the cleanup PR needs them)

### 6.1 Dangling references — code points at files that do not exist (404s in live paths)

| Missing file | Referenced from | Context |
|---|---|---|
| `assets/icons/v6/flame.png` | `v14.js:295` (same inline `index.html:3161`) | `enIcon('flame.png')` in the English stats header. The directory has `flame.svg`, not `flame.png`. No `onerror` fallback on the `<img>`. |
| `assets/icons/v6/bubble.png` | `v15_data.js` topic `{id:'communication', icon:'bubble.png'}` | Rendered via `enIcon(t.icon)` (`v14.js`). No such file. |
| `assets/icons/v6/shop.png` | `v15_data.js` topic `{id:'shopping', icon:'shop.png'}` | Same path. No such file. |
| `assets/icons/v6/moon.png` | `v12.js:20` boss N11 `{icon:'moon.png'}` | Rendered via `'assets/icons/v6/'+f.icon` (`v12.js:72`). Directory has `moon.svg`, not `moon.png`. |

These are deductions from static analysis (file absent + `<img>` without fallback), not browser-observed 404s. The likely fixes are one-word changes (`flame.png`→`flame.svg`, `moon.png`→`moon.svg`, `bubble.png`/`shop.png`→ an existing icon) — but that is a code fix, not a cleanup deletion, and it is out of this audit's scope.

### 6.2 Root `v7.js` / `v8.js` drifted from the deployed inline copies

- `v7.js` line 237 (root) still says `img:'assets/decor/sakura.svg'`; the inline `v7js` block in `index.html:1764` says `img:'assets/decor/cherry_blossom.png'`. One differing line.
- `v8.js` lines 38–39, 40, 46–47 (root) reference `tree.svg`, `maple.svg`, `sakura.svg`, `butterflies.svg`; the inline `v8js` block uses `ancient_tree.png`, `autumn_tree.png`, `cherry_blossom.png`, `butterflies.png`. Five differing lines.
- Cause: `build.py` (the V6→V7 build) applies those exact string replacements when patching the V6 base (`build.py:72-76`), and the inline blocks in `index.html` descend from that patched base — while the root `v7.js`/`v8.js` files are the unpatched layer sources. All other JS layer files and all 20 CSS files are byte-identical to their inline blocks.
- Consequence: the root files are **not** a byte-faithful source of what is deployed for v7/v8. Any future rebuild from the root files alone would reintroduce the broken `.svg` references unless `build.py`'s replacements are re-applied. This belongs in the build audit (task 2).

### 6.3 Duplicate content

- **In scope (383 files):** exactly one duplicate group — `basic_tactics_vocabulary.json` == `v22_basictactics.json` (sha256 `4362ef85…`, 108,981 B).
- **Out of scope (`tools/`, noted only because the issue mentioned it):** `tools/v15ui/test24-run2.log` == `test24-run3.log` == `test24-zip.log` (identical md5 `c6c6b25d…`, 3,197 B each). The `test25*` logs are all distinct. No action proposed here; `tools/` is outside the manifest scope.

### 6.4 What the scan did *not* find

- No service worker, no `importScripts`, no Web Workers.
- No other `fetch`/`XMLHttpRequest` besides v22 (BT data) and the Firebase SDK loader.
- No audio files referenced; speech uses `speechSynthesis`.
- No references to `assets/**/_old_svg/` from any file in the repo (code, build scripts, docs).
- The `tools/` directory is not referenced by the runtime (test harnesses drive the built page through CDP; they do not load repo assets directly). `tools/` is outside the manifest scope.

## 7. Per-file evidence

See [`manifest.csv`](sandbox://workspace/v7build/audit/manifest.csv). Every row carries the verdict and the exact evidence: the literal reference, the dynamic pattern with its generating code location, the build-script provenance, or the precise statement of the searches that found nothing. Files marked CANDIDATE list the searches performed (code corpus literal + basename + dynamic patterns + root `*.py`/`*.md` grep); files marked UNKNOWN state why the decision was deferred.
