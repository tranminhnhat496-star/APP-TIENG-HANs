# Changelog — V18.2 → V18.3 (Boss Word Sets)

**V18.3.0 — layer V38 (loads LAST). Base: V18.2 (Scope Banner Fix). Date: 2026-11-19.**

Picker-only release: the "Bộ từ đánh boss" picker now offers every Library set, not only Basic Tactics. No new content, no new art, no reward/stat/SRS/region-gate changes, no save-schema change, no new localStorage key. The fix was reproduced first on the pristine V18.2 base in real Chrome 157, then verified by `tools/v38/test38.js` (Node vm) + `tools/v38/verify-v38c.js` (Chrome gates V38-A–F).

## The 6 build replacements (`build_v38.py`)

### V17 — export the Library's data + naming (1)
- `R-V38-V17-EXPORTS`: `window.__v17` gains `topics:topics, lessons:lessons, topicName:topicName, scopeName:scopeName` (`v17.js`, in the export object). The picker reuses the Library's own 19 topics / 136 lessons / set lists and its `scopeName()` instead of duplicating them.

### V22 — picker + naming + apply (5)
- `R-V38-V22-SCOPENAME`: `scopeName22()` (`v22.js`) now delegates to `__v17.scopeName()` when available (`try{var v17=V17();if(v17&&v17.scopeName){var n=v17.scopeName(sc);if(n)return n}}catch(e){}`), falling back to the local BT formatter when `__v17` is unavailable. The old primary path (`if(sc.lib!=='bt')return 'Bộ từ khác'`) is now only the guarded fallback for a scope this picker cannot produce.
- `R-V38-V22-HELPERS`: new helpers inserted before the picker comment — `bossLibs()` (7 lib entries), `bossLibOf(sc)`, `bossTopics()` / `bossLessons()` / `bossChronoSets()` / `bossSkyrootSets()` / `bossTopicName(id)` (all thin `__v17` wrappers with `try/catch` fallbacks), `bossSubHTML(lib,sc)` (the per-lib sub-selection area), `bossLibChange()` (re-renders the sub area on lib change, toggles the BT-only controls), `bossSubPick(el)` (single-select chip toggle, re-pick falls back to "Tất cả"), `bossSelectedSub(attr)` (the currently-on single-select chip's `data-t` / `data-s`).
- `R-V38-V22-PICKER`: `bossScopeHTML()` rebuilt — lib dropdown has 7 options (Tất cả từ vựng, A1–A2, Oxford 3000, Chrono Kingdom, Skyroot Sanctuary, BT all, BT units) with `onchange="__v22.bossLibChange()"`; sub area is `<div id="v22bs-sub">` + `bossSubHTML(lib,sc)`; type/status selects live in `<span id="v22bs-ts">` and the pick-all buttons in `<div id="v22bs-pickall">`, both `display:none` unless BT is selected. The "Đang chọn" line uses `scopeName22()` for the current scope.
- `R-V38-V22-APPLY`: `applyBossScope()` builds the exact scope per lib (a1a2 `{topic?}`, oxford `{lesson?}`, chrono/skyroot `{set?}`, bt `{unit?,type?,status?}` unchanged), omitting the sub-field for "Toàn bộ". Non-BT scopes call `done()` immediately — they no longer wait for the BT download, and clearing (`lib===''`) no longer waits either.
- `R-V38-V22-EXPORTS`: `window.__v22` gains `scopeName22:scopeName22, bossLibChange:bossLibChange, bossSubPick:bossSubPick, bossSubHTML:bossSubHTML, bossSelectedSub:bossSelectedSub`.

### Layer files
- `src/v38.js` (new, version marker `18.3.0` only) + `src/v38.css` (new, 44px minimum on the new sub-selection controls, wrap, no 360px overflow). Injected last, before `</body>`; `v38` is the last style/script marker.

### Build notes (two failed runs before the successful one — both build-script/test bugs, no app bug)
- **Run 1 failed at marker order:** `v37.css`'s own comment contains the literal string `"</body>"` ("both injected last, before `</body>`"), which sits inside the `<style id="v37">` block — `find(b"</body>")` injected V38 in the middle of the v37 style block (v38js before v37js, v38 `<script>` inert inside `<style>` text). Fixed in `build_v38.py` with `rfind(b"</body>")` + a guard asserting the injection point is after `v37js`. The pristine base was restored from `tools/v38/backup-v18.2/` and the build re-run. (Future builds: any layer CSS comment containing `"</body>"` poisons a `find()` injection point — always use `rfind`.)
- **Run 2 failed at a step-5 assert:** the Oxford option is runtime-rendered from `bossLibs()` data, so the literal `<option value="oxford">Oxford 3000</option>` never appears in the built file. Fixed the assert to the data literal `{v:'oxford',n:'Oxford 3000'}`. The assembled bytes were already correct (same hash as run 3).
- **Run 3 SUCCEEDED** (`6b953ac1…`, 2,372,032 B).

### Not changed
- Scope engine, fight engines, SRS, vocabulary data, art, Firebase, save schema — all untouched. `__v15.clearScope` untouched. BT picker behaviour unchanged (same chips, same type/status defaults — the "" type/status options still carry no `selected` attribute, exactly as in V18.2; the browser defaults to the first option).

## Verification
- `tools/v38/repro-v38.js` on the pristine V18.2 base (hash `fe0ba353…`): R1 lib dropdown BT-only, R2 chips BT-only, R3 Oxford scope shown as "Bộ từ khác". 0 console errors.
- `tools/v38/test38.js`: **210 PASS / 0 FAIL / 6 SKIP (of 216)** ×3 clean runs — §0 static (71), §L page load (16), §38A picker data (36), §38B applyBossScope (15), §38C scopeName22 (28), §38D round-trip (23), §38E BT unchanged (4), §R V18.2 regression (14), §V save schema (3), §C Chrome-only (6 SKIP).
- `tools/v38/verify-v38c.js` (real Chrome 157): gates V38-A–F all PASS ×3 runs — picker on Bosses tab + Boss Map; fight pools exactly the picked set (Oxford 12: 25/25, "behind"; A1–A2 Education: 20/20, "campus"; Chrono Time: 60/60, "lunchtime"; BT Units 2+5: 66/66, "short"); Library round-trip; 360px no overflow, all controls 44px; **0 console errors / 0 warnings / 0 dialogs**.
- Built `out/index.html`: sha256 `6b953ac1577b97ced538b3f92ff4d4af42e907e1be4b36e5e874e553eb4e6106`, 2,372,032 B (V18.2: `fe0ba353…`, 2,361,084 B). Title: "V18.3 — Boss Word Sets". Marker order: v38 last (styles + scripts); `TOTAL_BOSSES` still 86; no new save key.
