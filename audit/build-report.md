# Build Reproducibility Audit — Vocab Farm V15.3

- **Repo / commit audited:** `tranminhnhat496-star/APP-TIENG-HANs`, main `f099a2ffccbc3818ee212e4ef3286a4147199e54`
- **Fresh clone inspected:** `/home/hatch/workspace/v7build/audit/clone` (HEAD verified `f099a2ff`, 2026-11-18)
- **Working machine examined:** `/home/hatch/workspace/v7build/` (`src/`, `data/`, `out/`, build/package scripts, ZIPs)
- **Method:** read-only. Every comparison below is a SHA-256 (or git-blob-SHA) comparison of file bytes. **No build script was run** — anything that would need a run to prove is marked "UNVERIFIED — needs a run" rather than asserted.
- **Date:** 2026-11-18

## 1. Verdict

**Can `index.html` on main be rebuilt from a fresh clone alone today? NO.**

The chain fails at the first step in a fresh clone, for three independent reasons:

1. **All full-build scripts (`build_v8.py` … `build_v15.py`) require three inputs that do not exist in the clone:** `--src /tmp/v6` (default), `ROOT/data/` and `ROOT/src/` (`ROOT` = the script's own directory). In a fresh clone there is no `/tmp/v6`, no `src/`, no `data/`. Each script asserts on the first missing file and exits.
2. **The packaging scripts do not exist in the clone at all.** All 13 `package_*.py` live only in `~/workspace/v7build/` on this machine.
3. **The layer scripts (`build_v15ui.py`, `build_v15lib.py`, `build_v15nav.py`) require `out/` to already contain the previous version's build.** Only `build_v15ui.py` auto-runs its predecessor (via subprocess); `build_v15lib.py` / `build_v15nav.py` exit 1 if the previous layer is missing.

**The good news: recovery is ~99% complete already.** Almost everything the chain reads already exists in the repo byte-for-byte (see §5). The only content that exists *only* on this machine and is actually needed is 4 small files (`data/batch-*.json`, 215 KB). Everything else missing is either redundant, orphaned, or reconstitutable from the clone itself. The fix is small — see §7–§8.

Acceptance value for any future rebuild (file SHA-256 of the deployed `index.html`):

```
10492d46871f89de956bcdc5612720ba91a4df625d7db1e421bb96e9bdacb7f2  index.html (1,930,157 bytes)
```

(The clone's `index.html` and this machine's `out/index.html` hash identically to the above, confirming the clone is faithful.)

## 2. How the build chain actually works

```
V6 source tree (/tmp/v6, 226 files)
   │  Korean_Vocab_Farm_V6_Bilingual.html  (already the build.py OUTPUT: v7–v14 inlined + patches)
   ▼
build_v8.py   ──► out/ = copy of /tmp/v6 tree + index.html (V6 + v15 + v16)
build_v9.py   ──► same, + v17
build_v10.py  ──► same, + v18   (v7build only, NOT in the clone)
build_v11.py  ──► same, + v18 + v19
build_v11_1.py──► same, + Korean-tabs Boss Map line
build_v12.py  ──► same, + v20 (save/sync) + firebase-config.js / firestore.rules
build_v13.py  ──► same, + v21 (login) + avatars
build_v14.py  ──► same, + v22 (Basic Tactics)
build_v15.py  ──► same, + v23 (pets)            ← last FULL build; out/ = V15
   │  (each full build DELETES out/ first: shutil.rmtree(out), then copytree(src, out))
   ▼
build_v15ui.py  ──► out/index.html + v24 layer   (V15.1; auto-runs build_v15.py if out/ isn't V15)
build_v15lib.py ──► out/index.html + v25 layer   (V15.2; exits 1 if v24js missing)
build_v15nav.py ──► out/index.html + v26 layer   (V15.3; exits 1 if v25js missing)
   ▼
package_v15*.py ──► <Version>.zip from out/ + docs (validates ZIP contents + index.html markers)
```

Key facts about the chain:

- **Layers v7–v26 are functional layers, not versioned copies.** Each script appends one layer inline (`<style id="vNN">` + `<script id="vNNjs">` before `</body>`) and also writes the same source as a standalone `vNN.js` / `vNN.css` file next to `index.html`. The standalone files are the layer *sources*; `index.html` is the assembled *artifact*.
- **The V6 base is already a build output.** `Korean_Vocab_Farm_V6_Bilingual.html` (in the repo root and in the V6 ZIP) already contains layers v7–v14 inlined, plus `build.py`'s patches (see §5.4). The full-build scripts treat it as opaque input: they only assert `id="v14js"` is present and that no `v15js`…`v19js` is present yet.
- **The V11.1 Korean-tabs line is the only surgical edit to the V6 base** after `build.py`: one appended button in the Korean tabs rendering, asserted present by `build_v11_1.py` and later scripts.
- **The deployed `index.html` loads two files by reference, not inline:** `<script id="v20cfg" src="firebase-config.js">` and `<script id="v16xlsx" src="vendor/xlsx-0.18.5.full.min.js">`. Everything else (v7–v26, all vocab data) is inlined. One more file is fetched at runtime: `basic_tactics_vocabulary.json` (lazy, by `v22.js`).
- **`build_v15nav.py` contains host-specific write workarounds** (`os.copy_file_range` with a 540-second EPERM-retry deadline, tmp-file + rename assembly) because `write()` was EPERM-flaky on this host during the V15.3 incident. On a normal machine/CI these are harmless but unnecessary; do not remove them until the rebuild is proven elsewhere.
- **`build_v15ui.py` is the only layer script that chains automatically** (subprocess-runs `build_v15.py` when `out/` is not a V15 build). `build_v15lib.py` / `build_v15nav.py` just print "run … first" and return 1.

## 3. Per-script input / output / validation tables

`ROOT` = the directory containing the script (= `~/workspace/v7build/` on this machine; = repo root in a fresh clone). `HERE` = same as `ROOT` in all these scripts. `src` = `--src` argument, default `/tmp/v6`.

### 3.1 Full-build scripts (each rebuilds `index.html` from the V6 base)

All of them share this common core — inputs: `src/Korean_Vocab_Farm_V6_Bilingual.html`; `ROOT/data/batch-*.json` (via `load_words()`); `ROOT/src/v15_data.js`, `v15.js`, `v15.css`; `ROOT/samples/` (must be a non-empty dir); `HERE/gen_samples.js`. Common outputs: `out/` = whole `src` tree copied + `index.html` + `v15*.js/css` + `v15_words.json` (the `load_words()` output) + `build_vN.py` + `gen_samples.js` copies. Common validations: `id="v14js"` present in the V6 HTML; no later layer ids present yet; `≥1000` EN words, every word has `en`/`vi`/`ipa`; no `</script>` inside any inlined layer; non-empty layers.

| Script (in clone?) | Extra inputs (beyond common core) | Extra outputs in `out/` | Extra validations |
|---|---|---|---|
| `build.py` — YES (also in V6 ZIP) | `HERE/../V6/Korean_Vocab_Farm_V6.html` (**dead path — exists nowhere**); `HERE/v7..v14.css/js` | 7 HTML files (`V5_Ultimate` … `V6_Bilingual`) in script dir | Every patch replacement asserted with exact occurrence counts; migration anchor asserted; `EFF.splice` regex asserted once |
| `build_v7.py` — NO (v7build only) | — (v15 only) | — | — |
| `build_v8.py` — YES | `ROOT/src/v16.js`, `v16.css`, `vendor/xlsx-0.18.5.full.min.js` | `v16.js/css`, `vendor/xlsx-0.18.5.full.min.js` | vendor file is SheetJS (`XLSX` present); `__v16` exposed |
| `build_v9.py` — YES | `ROOT/data/v17_a1a2.json`, `v17_oxford.json`, `v17_review.json`; `ROOT/src/v17_a1a2.js`, `v17_oxford.js`, `v17.js`, `v17.css` | `v17*.js/css`, `v17_a1a2.json`, `v17_oxford.json`, `v17_review.json` | A1–A2 = 1000, Oxford = 3396, topics = 19, max lesson = 136, all words have `en`/`vi`; `__V17_A1A2`, `__V17_OXFORD`, `__v17` present; `v15.js` contains `pushV17IntoV14` + `library` |
| `build_v10.py` — NO (v7build only) | `ROOT/src/v18_data.js`, `v18.js`, `v18.css`, `src/bosses/v10_*.png` (30) + `manifest.json` | `v18*.js/css`, `assets/bosses/v10/` (30 PNGs + manifest) | 30 `v10_` ids, unique, no collision with the 10 old boss ids, 10 per arena, all 30 PNGs exist |
| `build_v11.py` — YES | `ROOT/src/v19_data.js`, `v19.js`, `v19.css`, `src/bosses11/v11_*.png` (30) + `manifest_v11.json`; `HERE/tools/split_bosses_v11.py`; `HERE/build_v11.py` | `v19*.js/css`, `assets/bosses/v11/` (30 PNGs + manifest), `tools/split_bosses_v11.py`, `build_v11.py` | 30 `v11_` ids (`B('v11_…')`), unique, no collisions, 10 zones × 3 bosses, all 30 PNGs exist; `__V18_BOSSES`, `__v18`, `collection`, `arenasHTML`; `__V19_DATA`, `__v19`, `map`, `zoneDetail`, `resolveUltimate`; `version:'11.0.0'` in `v15.js` |
| `build_v11_1.py` — YES | Same as v11 | Same as v11, plus `build_v11_1.py` copy | Same as v11, plus: Korean-tabs line present in V6 HTML (asserted, then replaced with the Boss Map button); `version:'11.1.0'` in `v15.js` AND `v19.js`; `openMapFor` in `v19.js` |
| `build_v12.py` — YES | `ROOT/src/v20.js`, `v20_sync.js`, `v20.css`; `HERE/firebase-config.js`, `firestore.rules`, `FIREBASE_SETUP.md`; `HERE/build_v12.py` | `v20*.js/css`, `firebase-config.js`, `firestore.rules`, `FIREBASE_SETUP.md` | `__v20sync`, `__v20`, `runMigration`, `mergeSaves`; `version:'12.0.0'` in `v15.js`, `v19.js`, `v20.js` |
| `build_v13.py` — YES | `ROOT/src/v21.js`, `v21.css`, `src/avatars/*.png` (10), `src/mascot-chick.png`; `HERE/build_v13.py` | `v21.js/css`, `assets/avatars/` (10 PNGs), `assets/mascot-chick.png` | Exactly 10 avatar PNGs, one per avatar id; mascot exists; `__v21`, `activateAccount`, `AVATARS`; `version:'13.0.0'` in `v15.js`, `v19.js`, `v20_sync.js` |
| `build_v14.py` — YES | `ROOT/data/v22_basictactics.json`, `v22_basictactics_report.json`; `ROOT/src/v22.js`, `v22.css`; `HERE/build_v14.py` | `v22.js/css`, `basic_tactics_vocabulary.json` AND `v22_basictactics.json` (same content, written twice), `v22_basictactics_report.json` | BT stats `{units:24, words:513, phrases:306, total:819}`; units 1–24 in order; every entry has `en`/`vi`/`id`, `type` ∈ {word, phrase}; 819 unique ids; `attachBT` in `v15.js`; `__v22`, `groupHTML`, `openQuest`, `bossScopeHTML`; `basic_tactics_vocabulary.json` URL referenced in `v22.js`; `version:'14.0.0'` in `v15.js`, `v18.js`, `v19.js`, `v22.js` |
| `build_v15.py` — YES | `ROOT/src/v23_data.js`, `v23.js`, `v23.css`, `src/pets15/*_s[123].png` (36), `src/pets15/eggs/egg_*.png` (5); `HERE/build_v15.py` | `v23*.js/css`, `assets/pets/v15/` (36 pet PNGs), `assets/pets/v15/eggs/` (5 egg PNGs) | `__V23_DATA`, `__v23`, `battleStart`/`onFightCorrect`/`battleBarHTML`, `startHatch`/`claimHatch`/`evolvePet`; 12 species, unique; 36 pet PNGs, 5 egg PNGs, one per species×stage and per element; **every pet/egg PNG must have an alpha channel (PNG color type 4 or 6)** |

### 3.2 Layer scripts (each adds one layer to an existing `out/`)

| Script (in clone?) | Inputs | Outputs | Key validations |
|---|---|---|---|
| `build_v15ui.py` — YES | `out/index.html` (must contain `id="v23js"`; if not, auto-runs `build_v15.py` via subprocess); `ROOT/src/v24.css`, `v24.js`; `HERE/build_v15ui.py` | `out/index.html` (V24 injected before `</body>`, title → V15.1), `out/v24.css`, `out/v24.js`, `out/build_v15ui.py` | `v24.js`: `__v24`, `15.1.0`, `MutationObserver`, `v18fight`, `modeBest`, `save15`. `v24.css`: tokens `--ui-text-primary/--ui-text-secondary/--ui-title-gold/--ui-bg-panel/--ui-border/--ui-success/--ui-warning/--ui-danger/--ui-btn-green`, `.v15big.ko` + `animation:none`, `#2E7D32`, `.v23bar-fight` + `color:#FFF8E1`, `1600px`. Old layers version-pinned (`version:'15.0.0'` in v15/v18/v19/v23; `10.0.0` v17; `12.0.0` v20; `14.0.0` v22). Post-inject markers asserted. Idempotent (strips a previous V24 first). |
| `build_v15lib.py` — YES | `out/index.html` (must contain `id="v24js"`; **else prints a message and returns 1 — no auto-build**); `ROOT/src/v25.css`, `v25.js`; `HERE/build_v15lib.py` | `out/index.html` (V25 injected, title → V15.2), `out/v25.css`, `out/v25.js`, `out/build_v15lib.py` | `v25.js`: `__v25`, `15.2.0`, `MutationObserver`, `statusOf`, `groupStats`, `v25btn-review`/`v25btn-view`, search-input `type`. `v25.css`: tokens `--lib-frame/--lib-panel/--lib-ink/--lib-mute/--lib-line/--lib-green/--lib-purple/--lib-warn/--lib-gold`, `#247A46`, `#6845A8`, `#B45309`, `.v25status`, `.v25group-progress`, `.v17group-head` + `#292044`, `.v22type.wd` + `#166534`, `.v15fc-b`. Old versions pinned + `VERSION='15.1.0'`. Idempotent strip. |
| `build_v15nav.py` — YES | `out/index.html` (must contain `id="v25js"`; **else returns 1 — no auto-build**); `ROOT/src/v26.css`, `v26.js`; `HERE/build_v15nav.py` | `out/index.html` via `_assemble_index` (copy_file_range assembly, tmp-file + rename, EPERM retry up to 9 min), `out/v26.css`, `out/v26.js`, `out/build_v15nav.py` | `v26.js`: `__v26`, `15.3.0`, `MutationObserver`, `sessionStorage` + `v26.petTab`, `--nav-head-h` + `syncHeadH`, `v26hero` + `Bạn chưa có thú cưng`, `Xóa bộ lọc` + `Không tìm thấy thú cưng phù hợp`. `v26.css`: tokens `--nav-bg/--nav-frame/--nav-input/--nav-text/--nav-gold/--nav-line/--nav-active/--nav-btn2`, `#201535`, `#F7BE38`, `#6845A8`, `#v23hub{z-index:960}`, `#v23toast{z-index:970}`, `.v23tabs{flex-wrap:nowrap`, `.v15tabs{flex-wrap:nowrap`, `repeat(3,minmax(0,1fr))`, `.v26hero`, `.v26nomatch`, `.v7hud{position:static}`, `padding-bottom:calc(118px`, `safe-area-inset-top/bottom`. Old versions pinned + `VERSION='15.1.0'` + `VERSION='15.2.0'`. Re-reads the assembled file and re-asserts markers. Idempotent strip. |

### 3.3 Packaging scripts (NOT in the clone — only in `~/workspace/v7build/`)

All 13 `package_*.py` (`v7`, `v8`, `v9`, `v10`, `v11`, `v11_1`, `v12`, `v13`, `v14`, `v15`, `v15ui`, `v15lib`, `v15nav`) share one shape:

- **Inputs:** `HERE/out/index.html` (asserted to exist — "run build_vN.py first"); a `DOCS` list of Markdown files in `HERE` (each asserted to exist, then copied into `out/`); for `v15ui`/`v15lib`/`v15nav`, also `HERE/tools/v15ui|v15lib|v15nav` (asserted to exist, copied into `out/tools/`, excluding `shots-before`/`shots-after`).
- **Outputs:** `HERE/<Version>.zip` (ZIP_DEFLATED, level 6), rebuilt from scratch (old ZIP unlinked first).
- **Validations (after writing):** re-opens the ZIP and asserts `index.html` at root; layer files present (`vNN.js`/`vNN.css`/`build_vNN.py`); exactly 30 V10 boss PNGs, 30 V11 boss PNGs, 41 pet PNGs (36 forms + 5 eggs); `tools/v15*/test*.js` present (ui/lib/nav); layer markers present in `index.html` **in the right order** (`rfind` checks: each new layer after the previous); version strings present; title string present; layer-specific tokens present (e.g. `v15nav`: `--nav-bg`, `.v26hero`, `#v23hub{z-index:960}`). `package_v15.py` additionally asserts V18/V19/V20/V23 markers, `src="firebase-config.js"`, and that the title no longer says V13/V14.

### 3.4 Helper scripts (context, not on the critical path)

- `validate_words.py` (v7build only, NOT in clone): validates `ROOT/data/batch-*.json` (exact counts 300/300/250/150, no duplicates within/across batches or vs V14's 96 words, required fields, IPA shape `/…/`, pos/topic/level vocab, example contains the word). Reads `V14 = /tmp/v6/v14.js`. Exit 0 only if everything passes. Not called by any build script.
- `gen_samples.js` (in clone): regenerates `samples/` (CSV/XLSX/JSON import samples). **Requires `/tmp/v8vendor/node_modules/xlsx`** (hard absolute path) — that directory does not exist on this machine or in the clone. Only needed if `samples/` is missing; the builds only assert `samples/` is non-empty.
- `tools/split_bosses_v11.py` (in clone, `tools/`): the V11 poster splitter; copied into `out/tools/` by the builds. Not executed by any build.

## 4. What the clone contains vs what the chain needs

Clone inventory (HEAD `f099a2ff`): 126 root entries; **no `src/`**, **no `data/`**, **no `out/`**, **no `.github/`**, **no `package_*.py`**, **no `build_v7.py` / `build_v10.py`**. Present and needed: `build.py`, `build_v8/v9/v11/v11_1/v12/v13/v14/v15/v15ui/v15lib/v15nav.py`; all standalone layer files `v7..v26` (`.js`/`.css` at root) + `v15_data.js`, `v17_a1a2.js`, `v17_oxford.js`, `v18_data.js`, `v19_data.js`, `v23_data.js`; all vocab JSONs (`v15_words.json`, `v17_a1a2.json`, `v17_oxford.json`, `v17_review.json`, `basic_tactics_vocabulary.json`, `v22_basictactics.json`, `v22_basictactics_report.json`); `assets/` (318 files); `vendor/xlsx-0.18.5.full.min.js`; `samples/` (5 files); `gen_samples.js`; `firebase-config.js` (1,539 bytes — **the configured one**: contains `apiKey` and `projectId` fields, not a placeholder); `firestore.rules`; `FIREBASE_SETUP.md`; `tools/split_bosses_v11.py` + `tools/v15ui|v15lib|v15nav/` harnesses; `Korean_Vocab_Farm_V6_Bilingual.html` (309,519 bytes); all docs/changelogs/smoke tests.

Machine inventory: `src/` = 159 files, 34,824,343 bytes; `data/` = 17 files, 1,304,859 bytes; `out/` = the V15.3 build (513 files); 13 `package_*.py` (74,631 bytes total incl. `build_v7.py`, `build_v10.py`, `validate_words.py`); the V6 source ZIP at `~/workspace/user/files/Korean_Vocab_Farm_V6_Bilingual_0_3fju.zip` (20,006,452 bytes, still present); `/tmp/v6` **does not exist** (wiped with /tmp); `/tmp/v8vendor` does not exist; `~/workspace/V6` does not exist.

## 5. Byte-comparison evidence (all SHA-256, read-only)

### 5.1 `src/` (machine) vs the clone — 146 match, 0 differ, 13 without counterpart

Every file the build scripts actually read from `src/` has a byte-identical counterpart in the repo:

| `src/` file | Repo counterpart | Result |
|---|---|---|
| `v15.css/js`, `v15_data.js`, `v16.css/js`, `v17.css/js`, `v17_a1a2.js`, `v17_oxford.js`, `v18.css/js`, `v18_data.js`, `v19.css/js`, `v19_data.js`, `v20.css/js`, `v20_sync.js`, `v21.css/js`, `v22.css/js`, `v23.css/js`, `v23_data.js`, `v24.css/js`, `v25.css/js`, `v26.css/js` (31 files) | Same name at repo root | **MATCH (all 31)** |
| `vendor/xlsx-0.18.5.full.min.js` | `vendor/xlsx-0.18.5.full.min.js` | **MATCH** |
| `avatars/*.png` (10) | `assets/avatars/*.png` | **MATCH (all 10)** |
| `mascot-chick.png` | `assets/mascot-chick.png` | **MATCH** |
| `bosses/v10_*.png` (30) + `bosses/manifest.json` | `assets/bosses/v10/*.png` + `manifest.json` | **MATCH (all 31)** |
| `bosses11/v11_*.png` (30) + `bosses11/manifest_v11.json` | `assets/bosses/v11/*.png` + `manifest.json` | **MATCH (all 31)** |
| `pets15/*_s[123].png` (36) + `pets15/eggs/egg_*.png` (5) | `assets/pets/v15/*.png` + `assets/pets/v15/eggs/*.png` | **MATCH (all 41)** |

No counterpart in the repo (13 files) — **none of them is read by any build script**:

- `bosses/contact_{en,el,leg}_{dark,white}.png` (6) and `bosses11/contact_r{1,2,3}_{dark,white}.png` (6): poster contact sheets. The build scripts glob only `v10_*.png` / `v11_*.png`. (Whether the runtime references them is audit task 1/2's question, not this one.)
- `media-generation-mascot-chick-1794904546.json`: an image-generation log, not a build input.

### 5.2 `data/` (machine) vs the clone — 5 match, 12 without counterpart

| `data/` file | Repo counterpart | Result |
|---|---|---|
| `v17_a1a2.json` (227,926 B), `v17_oxford.json` (631,029 B), `v17_review.json` (97,117 B), `v22_basictactics.json` (108,981 B), `v22_basictactics_report.json` (10,504 B) | Same name at repo root | **MATCH (all 5)** |
| `batch-a1.json` (50,957 B, 300 words), `batch-a2.json` (54,897 B, 300), `batch-b1.json` (67,605 B, 250), `batch-b2.json` (41,372 B, 150) — **total 214,831 B, 1,000 words** | **NONE** | Only on this machine |
| `bt_meta.js` (2,158 B) | None as a file — **but its content is embedded verbatim in `v22.js`** (`BT_META` array, verified exact-substring match) | Redundant |
| `forbidden.json` (8,807 B), `replace-a2.json` / `replace-a2-words.json`, `replace-b1.json` / `replace-b1-words.json`, `replace-b2.json` / `replace-b2-words.json` (7 files, ~12 KB) | None | **No script reads them.** A grep over all `*.py`/`*.js` in `~/workspace/v7build/` (excluding `out/` and `audit/`) finds zero references. Orphaned V7 word-prep artifacts. |

### 5.3 The V6 tree is fully recoverable from the clone

The uploaded V6 ZIP (`Korean_Vocab_Farm_V6_Bilingual_0_3fju.zip`, 226 files) was compared file-by-file against the clone: **226/226 match byte-for-byte, 0 differ, 0 missing.** That covers `Korean_Vocab_Farm_V6_Bilingual.html`, `README_V6_Bilingual.md`, `build.py`, `v7..v14.css/js`, `split_icons.py`, `split_decor.py`, `process_bosses.py`, and 204 `assets/` files. The clone's `assets/` has 114 additional files beyond the V6 ZIP (bosses v10/v11, pets v15, avatars, mascot, etc.).

Consequence: `/tmp/v6` can be reconstituted exactly from a fresh clone (copy the 226 V6 files out of the checkout). The V6 ZIP in `~/workspace/user/files/` is a second copy, but it is **not in the repo** and must not be relied on as the only copy.

### 5.4 Inline layers in `index.html` vs standalone root files — reconstructible, with one subtlety

Checked by extracting each `<style id="vNN">` / `<script id="vNNjs">` block from the clone's `index.html` and comparing (whitespace-stripped) with the standalone root file:

- **v9–v26 (CSS and JS), all MATCH.** The standalone root files are the exact layer sources.
- **`v18data` == `v18_data.js`, `v19data` == `v19_data.js`** (exact).
- **`v15data` = `v15_data.js` + generated words JSON; the inline words JSON equals `v15_words.json`** (1,000 words, JSON-equal). So the `v15data` block is reconstructible from repo files without the batch files — but the build scripts as written regenerate it from `batch-*.json`.
- **`v17data` = `v17_a1a2.js` + `"\n"` + `v17_oxford.js` + `"\n"`** (exact, all 713,683 chars).
- **v7.js / v8.js DIFFER — by design, and only in one place each.** The standalone root `v7.js`/`v8.js` are the *unpatched* originals; the inline versions in `index.html` (and in `Korean_Vocab_Farm_V6_Bilingual.html`) carry `build.py`'s `patch_new_decor` art re-pointing:
  - `v7.js`: 1 substitution — `assets/decor/sakura.svg` → `assets/decor/cherry_blossom.png` (GEM_ITEMS g1).
  - `v8.js`: 5 substitutions — `tree.svg` → `ancient_tree.png`, `maple.svg` → `autumn_tree.png`, `sakura.svg` → `cherry_blossom.png`, `butterflies.svg` → `butterflies.png` (×2).
  
  **This does not block a rebuild**: the build chain's input for these layers is the V6 HTML file, which already contains the patched inline blocks. It does mean the root `v7.js`/`v8.js` must never be used as rebuild inputs for the v7/v8 layers — the V6 HTML file is their source of truth. (The old `.svg` files the standalone versions reference no longer exist in the repo; the `.png` replacements do.)
- `index.html` carries 23 `id="vNjs"` markers (`v3js`, `v4js`, `v5js` from the V6 base itself, plus `v7js`–`v26js`), title `V15.3 — Mobile Navigation Fix`, 1,930,157 bytes.

### 5.5 Small diffs that do not affect the build

- `samples/`: the clone's `english-sample.csv` (612 B) and `korean-sample.csv` (397 B) differ by 5 bytes each from this machine's copies (617 B / 402 B) — trailing-newline/line-ending level. The `.xlsx` and `.json` samples are identical in size. Builds only assert `samples/` is non-empty, so this is cosmetic; note it before any future regeneration.
- ZIP vs clone: the clone has 4 files the V15.3 ZIP lacks (`SMOKE_TEST_V8_2026-11-17.md`, `SMOKE_TEST_V9_2026-11-17.md`, `build_v8.py`, `build_v9.py` — present on main from earlier deploys, not in the ZIP's copy lists). The ZIP has 2 files the clone lacks (`probe-b.txt`, `tools/v15nav/pw/pw-core.tgz` — junk from `out/` at packaging time, correctly excluded from the push).

## 6. Missing-input list (exact)

What is absent from a fresh clone, per script that needs it:

| Missing input | Needed by | Size / notes | Status |
|---|---|---|---|
| `/tmp/v6` (the V6 tree, 226 files) | `build_v7.py`–`build_v15.py` (`--src`, default `/tmp/v6`) | 226 files; **reconstitutable from the clone itself** (§5.3) — no new content needed, but no script does this today | Recoverable from clone |
| `src/` (159 files, 34.8 MB) | `build_v8.py`–`build_v15.py`, `build_v15ui/lib/nav.py` | **146/159 files already in the repo byte-identical** (§5.1); the other 13 are not build inputs | Recoverable by re-pointing, not by re-committing |
| `data/batch-a1.json`, `batch-a2.json`, `batch-b1.json`, `batch-b2.json` | `build_v7.py`–`build_v15.py` (`load_words()`), `validate_words.py` | 214,831 B total; **only on this machine**; derived output `v15_words.json` IS in the repo and equals `load_words()` output | **Must be committed (or the loader changed)** |
| `data/` other files (`v17_*.json`, `v22_*.json`) | `build_v9.py`–`build_v15.py` | Already in the repo byte-identical (§5.2) | Recoverable by re-pointing |
| `package_*.py` (13 files) | Packaging step (no build script calls them) | 74,631 B total (with `build_v7.py`, `build_v10.py`, `validate_words.py`); only in `~/workspace/v7build/` | Must be committed to reproduce ZIPs |
| `build_v7.py`, `build_v10.py` | Nothing in the V15.3 chain calls them | Superseded full-build scripts; only in `~/workspace/v7build/` | Commit for history or declare legacy |
| `validate_words.py` | Nothing calls it (manual validation) | Reads `data/batch-*.json` + `/tmp/v6/v14.js` | Commit with the batches, or drop |
| `gen_samples.js` dependency `/tmp/v8vendor/node_modules/xlsx` | `gen_samples.js` only (sample regeneration) | Does not exist anywhere; builds don't run it | Dead unless samples are regenerated |
| `build.py` input `../V6/Korean_Vocab_Farm_V6.html` | `build.py` only (legacy V6 builder) | Exists nowhere (no `V6/` dir in repo or on this machine) | Dead input; `build.py` cannot run as-is |
| `out/` (previous build) | `build_v15ui/lib/nav.py` | Must contain the previous version's `index.html` | Produced by running the chain in order |

## 7. Minimal set to commit (or otherwise recover) for reproducibility

**Irreplaceable content — commit first, before anything else:**

1. `data/batch-a1.json`, `data/batch-a2.json`, `data/batch-b1.json`, `data/batch-b2.json` (214,831 B). The only build input whose content exists nowhere else in a usable form. (Their processed form `v15_words.json` is in the repo, but the scripts as written require the batches.)

**Tooling — commit (small, no duplication):**

2. All 13 `package_*.py` (ZIP reproduction + their assertions are the packaging contract).
3. `build_v7.py`, `build_v10.py`, `validate_words.py` (history/validation; 3 small files — or explicitly declare them legacy in BUILD.md and leave them on this machine, but do not delete them until that decision is recorded).
4. New: `tools/setup-v6.sh` — reconstitutes `/tmp/v6` from the checkout (copies the 226 V6 files: `Korean_Vocab_Farm_V6_Bilingual.html`, `README_V6_Bilingual.md`, `build.py`, `v7..v14.css/js`, `split_*.py`, `process_bosses.py`, `assets/` subset). Must verify by hash against the V6 ZIP list.
5. New: `BUILD.md`, `tools/smoke.py`, `.github/workflows/pr-smoke.yml` (sketches in §9–§11).

**Do NOT commit wholesale:**

- `src/` as a directory (34.8 MB, 159 files). 146 of its files are already in the repo byte-identical under different paths; committing it would duplicate ~35 MB, including 41 pet PNGs, 60 boss PNGs and 10 avatar PNGs already in `assets/`.
- `data/` as a directory. 5 of its 17 files are already in the repo; `bt_meta.js` is embedded in `v22.js`; `forbidden.json`/`replace-*.json` are orphaned (no references); only the 4 batch files are needed.
- `src/bosses*/contact_*.png`, `src/media-generation-*.json`: not build inputs; leave on this machine pending audit task 1/2's runtime verdict.

**Code change required (not just files):** the scripts resolve `src/` and `data/` relative to their own directory (`ROOT = HERE`). In a fresh clone those directories will not exist even after committing the batch files. Two options:

- **Option A (recommended): patch the scripts to read from the repo layout.** Small, reviewable change to `build_v8.py`–`build_v15.py` (+ `v15ui`/`v15lib`/`v15nav.py`): resolve each layer source to its repo counterpart using the verified mapping (§5.1/§5.2), and resolve the V6 tree to the `setup-v6.sh` output (or to the checkout itself). Acceptance test: run the full chain in a clean checkout and require the rebuilt `index.html` to hash exactly `10492d46871f89de956bcdc5612720ba91a4df625d7db1e421bb96e9bdacb7f2` (UNVERIFIED — needs a run; see §12).
- **Option B (no code change): commit `src/` and `data/` as real directories.** Works with the scripts as written, but duplicates ~36 MB and creates two sources of truth for the same bytes (they will drift). Only choose this if the repo owner prefers zero script changes.

Either way, `build.py`'s dead input (`../V6/Korean_Vocab_Farm_V6.html`) should be left alone until the V6 base is re-derived or the script is declared legacy — it is not on the V15.3 rebuild path.

## 8. Recovery-first plan (in order — before deleting any legacy script or old HTML)

0. **Freeze.** No deletions, no history rewrites. This audit is the baseline.
1. **Commit the irreplaceable content** to the cleanup branch: the 4 `data/batch-*.json` files (+ `validate_words.py`). Verify by re-running `validate_words.py` (it needs `/tmp/v6/v14.js` — available after step 2).
2. **Add `tools/setup-v6.sh`** that reconstitutes `/tmp/v6` from the checkout; verify the 226 files hash-identical to the V6 ZIP list.
3. **Decide A vs B (§7) in PR review; implement the chosen path.** If A, patch the scripts' input resolution and keep the mapping table (§5.1/§5.2) as a comment in the patch.
4. **Prove the rebuild.** In a clean checkout (or container), run the full chain (§10) and require byte-identical `index.html` (SHA-256 `10492d46…`) plus identical `out/` file list vs the V15.3 ZIP (513 entries). **UNVERIFIED — needs a run; this audit did not run any build.**
5. **Add `BUILD.md`, `tools/smoke.py`, `.github/workflows/pr-smoke.yml`** (sketches below) and make CI green on the PR.
6. **Only then** consider deleting legacy scripts (`build.py`'s dead path, `build_v7.py`/`build_v10.py` if declared legacy) or the old V6 HTML — each deletion in its own small commit, citing this report's manifest evidence, and never before the rebuild proof in step 4.
7. **Throughout: do not touch** `firebase-config.js` (the configured one on main), `firestore.rules`, any localStorage key, or any game data file. The rebuild must not change runtime behaviour.

## 9. BUILD.md sketch (to be added at repo root)

```markdown
# BUILD.md — Korean & English Vocab Farm

## Prerequisites
- Python 3.8+ (stdlib only; no pip packages). Linux or macOS
  (`build_v15nav.py` uses `os.copy_file_range`; on other OSes it falls
  back to the in-memory path only if patched — see note below).
- Node.js only if you need to regenerate `samples/` (`gen_samples.js`
  requires a local `xlsx` install; not needed for a normal build).
- No network access, no secrets, no API keys. `firebase-config.js`
  is already in the repo (the configured project file); the build
  copies it into `out/` unchanged.

## 0. Reconstitute the V6 source tree (once per clean checkout)
./tools/setup-v6.sh
# Copies the 226 V6 files out of this checkout into /tmp/v6 and
# verifies them (sha256) against the manifest in tools/v6-manifest.txt.
# /tmp/v6 is git-ignored and never committed.

## 1. Full build (V15) — from the V6 base
python3 build_v15.py [--src /tmp/v6] [--out out]
# Asserts: V6 HTML has id="v14js"; >=1000 EN words; A1-A2=1000,
# Oxford=3396/136 lessons; 30+30 boss PNGs; 10 avatars; 36+5 pet PNGs
# (all with alpha); BT stats 24 units / 819 entries.

## 2. Layer builds, in order (each needs the previous out/)
python3 build_v15ui.py   # + v24 → V15.1
python3 build_v15lib.py  # + v25 → V15.2
python3 build_v15nav.py  # + v26 → V15.3

## 3. Package
python3 package_v15nav.py
# Writes Korean_English_Vocab_Farm_V15_Mobile_Navigation_Fix.zip
# and asserts ZIP contents + index.html markers.

## 4. Verify
python3 tools/smoke.py out
# Expected: index.html sha256
#   10492d46871f89de956bcdc5612720ba91a4df625d7db1e421bb96e9bdacb7f2
# (V15.3, main f099a2ff). Any other hash = the build drifted; stop.
```

Note for the BUILD.md author: `build_v15nav.py`'s EPERM workarounds were written for this host's flaky filesystem; on CI they are inert (plain `copy_file_range` succeeds immediately). Do not remove them in the same PR as the rebuild proof.

## 10. Smoke-test sketch (`tools/smoke.py`, stdlib only, `python3 tools/smoke.py [out-dir]`)

Checks (exit non-zero with the first failing check named; exit 0 only if all pass):

1. `index.html` exists; size > 1,000,000 bytes; title contains `V15.3`.
2. Layer markers present and in order: `id="v7js"` … `id="v26js"` (20 markers), plus `id="v15data"`, `id="v17data"`, `id="v18data"`, `id="v19data"`; `__v24`/`__v25`/`__v26` present; `VERSION='15.1.0'` and `VERSION='15.2.0'` present; `version:'15.0.0'` present.
3. Referenced external files exist: `firebase-config.js` (non-empty, contains the literal field names `apiKey` and `projectId` — never print values), `vendor/xlsx-0.18.5.full.min.js` (contains `XLSX`), `basic_tactics_vocabulary.json`.
4. Vocab JSONs parse and have expected counts: `v15_words.json` = 1000; `v17_a1a2.json` = 1000, 19 distinct `topic` values; `v17_oxford.json` = 3396, max `lesson` = 136; `basic_tactics_vocabulary.json` has `stats == {units:24, words:513, phrases:306, total:819}` and 819 unique entry `id`s; `v22_basictactics.json` is byte-identical to it.
5. Assets exist with expected counts: `assets/bosses/v10/*.png` = 30, `assets/bosses/v11/*.png` = 30, `assets/pets/v15/*.png` = 36, `assets/pets/v15/eggs/*.png` = 5, `assets/avatars/*.png` = 10, `assets/mascot-chick.png` = 1. (Optionally: every pet/egg PNG has an alpha channel — same header check `build_v15.py` uses.)
6. No `</script>` inside any inlined layer block (re-scan `index.html` the way the builders assert).
7. Optional `--expect-sha256 <hex>`: compare `index.html` SHA-256 to the recorded value (default: the V15.3 value in §1).

## 11. CI sketch (`.github/workflows/pr-smoke.yml` — PR-only, no deploy, no secrets)

```yaml
name: PR smoke test
on:
  pull_request:
    branches: [main]        # runs ONLY on pull requests; never on push to main
permissions:
  contents: read            # no write permission at all
jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - name: Smoke test the deployed tree
        run: python3 tools/smoke.py .
        # Checks layer markers, vocab JSON counts, required assets,
        # firebase-config.js presence (fields only, never values).
        # No build, no deploy, no auto-merge, no secrets.
  # Future (after §8 step 4 proves the rebuild): a second job that runs
  # tools/setup-v6.sh + the full build chain and asserts the rebuilt
  # index.html SHA-256 equals the recorded value. Not enabled until
  # the rebuild proof exists — enabling it now would fail on main.
```

## 12. Risks, unknowns, and what this audit did NOT verify

- **The rebuild was not run.** Everything in §7–§11 is a plan + sketches. The claim "the rebuild will be byte-identical" is a hypothesis supported by the hash evidence, not a proven fact. The single most important follow-up is step 4 of §8.
- **`build.py`'s original V6 base is gone.** Its input `../V6/Korean_Vocab_Farm_V6.html` exists nowhere. This only matters if someone wants to re-derive the V6 Bilingual HTML from scratch (e.g. to change the `patch_new_decor` decisions). The *output* survives and is the chain input, so V15.3 reproduction does not need it — but the pre-V6 history is unrecoverable from the repo.
- **v7.js/v8.js standalone files are unpatched** (§5.4). Any future script that reads the root `v7.js`/`v8.js` as layer inputs would silently ship the old `.svg` art paths. The V6 HTML file must stay the source of truth for those two layers; consider a comment in BUILD.md and/or an assertion in the smoke test that the inline blocks contain `cherry_blossom.png` / `ancient_tree.png` / `autumn_tree.png` / `butterflies.png`.
- **Samples CSVs differ by 5 bytes** between the clone and this machine (§5.5). Cosmetic, but the next `samples/` regeneration should be diffed before committing.
- **`firebase-config.js` on main is the live configured file** (contains a real `apiKey`/`projectId`). The build copies it verbatim into `out/`. That is current practice and out of this audit's scope, but any future move to a placeholder + CI secret would change the build — flag for the repo owner, do not change unilaterally.
- **Host-specific fragility:** `build_v15nav.py`'s EPERM retry logic (up to 9 minutes) and `build_v15ui.py`'s subprocess auto-chain are behaviours of this machine's history, not of the repo. A clean CI run is the only way to know the chain behaves on a normal host.
- **`/tmp` is wiped between sessions on this host.** `/tmp/v6` and `/tmp/v8vendor` are already gone; that is exactly why the setup step (§9 step 0) must live in the repo, not in a person's shell history.
- **Not covered by this task:** runtime asset references (audit task 1), GitHub Pages/CI/cache behaviour (audit task 2), and the final cleanup manifest (audit task 4). In particular, the 12 `contact_*.png` files and the 7 orphaned `data/` files must not be deleted on the strength of this report alone — this report only proves they are not *build* inputs.
