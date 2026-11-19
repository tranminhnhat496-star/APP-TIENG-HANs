# Korean & English Vocab Farm — V18.3 BOSS WORD SETS

**Version 18.3.0 — layer V38 (loads LAST). Base: V18.2 (Scope Banner Fix). Date: 2026-11-19.**

V18.3 fixes one user-reported bug — the "Bộ từ đánh boss" picker only showed Basic Tactics — by extending it to every Library set. Boss fights can now use A1–A2 topics, Oxford 3000 lessons, Chrono Kingdom sets and Skyroot Sanctuary sets, with the fight question pool verified to be exactly the picked set. No new features beyond the picker, no new content, no new art, no reward/stat/SRS/region-gate changes, no save-schema change, no new localStorage key. The fix was verified by reproducing the bug first on the pristine V18.2 base in real Chrome 157, then by a Node vm suite and Chrome gates on the fixed build; anything not verified is listed under "Not fixed / still open" instead of being fixed blind.

## What V18.3 fixes

### The boss word-set picker only showed one word set (reported by Anh, 2026-11-19)

- **Evidence:** the "🎧 Bộ từ đánh boss" picker (`bossScopeHTML()`, `src/v22.js:527`) is shown on the Bosses tab arena view (`src/v18.js:120`) and the Boss Map zone view (`src/v19.js:195`), English fights only. Its first dropdown `#v22bs-lib` had only 3 options — "" (Tất cả từ vựng), "all" (Basic Tactics — Toàn bộ 24 Units), "units" (Basic Tactics — Chọn Units…) — the chips row always showed BT Units 1–24, and `applyBossScope()` only ever built `{kind:'lib', lib:'bt', unit?, type?, status?}`. `scopeName22()` even returned the placeholder 'Bộ từ khác' for any non-BT scope, proving the display path never expected other libs here.
- **The engine already supported the other sets:** `inScope15` / `wordsFiltered` (`src/v15.js`) honor `{kind:'lib', lib:'a1a2', topic}`, `{lib:'oxford', lesson}`, `{lib:'chrono', set}`, `{lib:'skyroot', set}` (wired for modes/SRS/boss in V17/V17.1/V18.0), and the Library's own "Học ngay" buttons already set those scopes. Only this picker could not produce them. So the fix is confined to the picker UI in `v22.js` (plus `scopeName22`): no changes to the scope engine, fight engines, SRS, or data.
- **Fix (6 guarded build replacements in `build_v38.py`; a runtime layer cannot reach these closure-local functions):**
  - `R-V38-V17-EXPORTS` — `window.__v17` gains `topics` / `lessons` / `topicName` / `scopeName` exports, so `v22.js` reuses the Library's own data and naming instead of duplicating the 19 topics / 136 lessons.
  - `R-V38-V22-SCOPENAME` — `scopeName22()` delegates to `__v17.scopeName()` (fallback: the old BT formatter when `__v17` is unavailable), so every scope the picker can produce has a proper name; 'Bộ từ khác' only remains as a guarded fallback for a scope this picker cannot produce.
  - `R-V38-V22-HELPERS` — new `bossLibs` / `bossLibOf` / `bossTopics` / `bossLessons` / `bossChronoSets` / `bossSkyrootSets` / `bossTopicName` / `bossSubHTML` / `bossLibChange` / `bossSubPick` / `bossSelectedSub` helpers before the picker comment.
  - `R-V38-V22-PICKER` — `bossScopeHTML()` rebuilt: lib dropdown gains A1–A2, Oxford 3000, Chrono Kingdom, Skyroot Sanctuary; the sub-selection area re-renders per lib (19 topic chips / Oxford lesson `<select>` / 4 Chrono set chips / 4 Skyroot set chips / BT 24 Unit chips); type + status dropdowns and the pick-all buttons show ONLY for BT, because the engine honors `sc.type` / `sc.status` only for BT (`btMap` + the `if(sc.lib==='bt')` block in `inScope15` / `wordsFiltered`).
  - `R-V38-V22-APPLY` — `applyBossScope()` builds the exact scope per lib: a1a2 `{kind:'lib',lib:'a1a2',topic?}`, oxford `{lib:'oxford',lesson?}`, chrono/skyroot `{lib:'chrono'|'skyroot',set?}`, bt unchanged `{lib:'bt',unit?,type?,status?}` — omitting the sub-field for "Toàn bộ", exactly like the Library's `learnScopeKey` / `reviewScopeKey` do. Non-BT scopes apply immediately; clearing no longer waits for the BT download either.
  - `R-V38-V22-EXPORTS` — `window.__v22` gains `scopeName22` / `bossLibChange` / `bossSubPick` / `bossSubHTML` / `bossSelectedSub` exports.
- **Verified:**
  - Reproduced first on the pristine V18.2 base in real Chrome 157 (`tools/v38/repro-v38.js`): lib dropdown has ONLY BT options; chips row shows BT Units 1–24 only; an Oxford scope displays as "Bộ từ khác". 0 console errors.
  - Fixed build, same flows (`tools/v38/verify-v38c.js`, gates V38-A–F): the picker shows all 7 lib options on the Bosses tab AND the Boss Map; picking Oxford Bài 12 / A1–A2 Education / Chrono Time / BT Units 2+5 via real clicks sets the exact scope, "Đang chọn" names it, and the started boss fight's word pool is EXACTLY the picked set (Oxford 12: 25/25 words, first question "behind"; A1–A2 Education: 20/20, "campus"; Chrono Time: 60/60, "lunchtime"; BT Units 2+5: 66/66, "short") — pool length equals the expected set size, every pool word is in the set, the current question word is in the set and matches the displayed question.
  - Round-trip: a scope set from the Library (Oxford Bài 12 via "Học ngay") shows as Oxford / Bài 12 selected when the Bosses tab picker opens; "Tất cả từ vựng" clears the scope.
  - Mobile (gate V38-F, 360px): no horizontal overflow (`scrollWidth` 360), every picker control 44px (lib select, lesson select, type/status selects, chips, Áp dụng button).
  - Node vm suite `tools/v38/test38.js`: **210 PASS / 0 FAIL / 6 SKIP (of 216)** — including `applyBossScope` scope objects per lib (whole-set and sub-selected), `scopeName22` names for every produced scope (never 'Bộ từ khác'), BT round-trip identical to V18.2, and the `bossSubPick` single-select toggle.
  - 0 console errors / 0 warnings / 0 dialogs in every Chrome run.

## The picker now

| Lib dropdown | Sub-selection | Scope built by Áp dụng | "Đang chọn" shows |
|---|---|---|---|
| Tất cả từ vựng | (none) | scope cleared (`null`) | Tất cả từ vựng |
| A1–A2 Vocabulary | 19 topic chips (+ "Tất cả chủ đề") | `{kind:'lib',lib:'a1a2',topic?}` | `A1–A2 · Education – GIÁO DỤC` / `A1–A2 Vocabulary` |
| Oxford 3000 | lesson `<select>` ("Toàn bộ 136 bài" + Bài 1…136) | `{kind:'lib',lib:'oxford',lesson?}` | `Oxford 3000 · Bài 12` / `Oxford 3000` |
| Chrono Kingdom | 4 set chips (+ "Tất cả 4 bộ") | `{kind:'lib',lib:'chrono',set?}` | `Chrono · Time & Calendar` / `Chrono Kingdom` |
| Skyroot Sanctuary | 4 set chips (+ "Tất cả 4 bộ") | `{kind:'lib',lib:'skyroot',set?}` | `Skyroot · Climate & Environment` / `Skyroot Sanctuary` |
| Basic Tactics — Toàn bộ 24 Units | (no chips; type/status shown) | `{kind:'lib',lib:'bt',type?,status?}` | `Basic Tactics` |
| Basic Tactics — Chọn Units… | 24 Unit chips (multi-select) + type/status + Chọn/Bỏ chọn tất cả | `{kind:'lib',lib:'bt',unit?,type?,status?}` | `Basic Tactics · 2 Units` |

- Type (Từ đơn / Cụm từ) and status (Chưa thuộc / Cần ôn) dropdowns appear ONLY for Basic Tactics: the engine honors them only for BT, so the UI must not promise a filter it ignores. The "Chọn tất cả / Bỏ chọn tất cả" buttons likewise appear only for BT (they operate on the BT Unit chips; for Oxford's `<select>` they are hidden).
- Topic ids are the Library's own ids (e.g. `a1_education`, not `education`); set ids are the Library's own (`time`, `space`, `machines`, `change` / `climate`, `science`, `society`, `mind`). The picker reuses `v17.topics()` / `lessons()` / `chronoSets()` / `skyrootSets()` — no duplicated lists.

## What V18.3 does NOT change

- **"Từ vựng của tôi" is NOT in the picker.** Custom words have NO `lib` field (`v15.js` builds them without one), so no `{kind:'lib'}` scope can select them. Inventing a scope kind for them would be a fake scope. This is a deliberate omission, not an oversight — it needs a real scope design (and Anh's decision) before it can be added.
- No change to the scope engine (`inScope15` / `wordsFiltered`), fight engines (`v18.js` / `v19.js`), SRS, or any vocabulary data. No new art. No reward/stat/pool/region-gate changes.
- The `sc2` fallback in `v18.js` / `v19.js` `wordPool` (which copies only `{kind, lib, unit, type, set}` and drops `topic` / `lesson`) is UNCHANGED — it is unreachable for picker scopes (the smallest picker pool is an Oxford lesson at 25 words, above the 8-word threshold), so changing it would be scope creep; it is documented here as a known limit.
- No new save key, no schema change, no new localStorage key. `src/v38.js` is a version marker only (`18.3.0`); `src/v38.css` only guarantees the new sub-selection area keeps the 44px / wrap / no-overflow mobile rules.

## Not fixed / still open

- **"Từ vựng của tôi" in the boss picker** — needs a real scope kind for custom words (see above); awaiting Anh's decision on the design.
- **The `sc2` fallback gap** (drops `topic` / `lesson`) — documented known limit, unreachable for picker scopes; a fix belongs to a future boss-pool cleanup, not this picker fix.
- **Pre-existing data quirks noticed while testing (NOT introduced by V38, NOT fixed here):** `topicName('education')` returns 'Education – Giáo dục' even though no topic has id `education` (real ids are `a1_education`, …); the topic `a1_colors-and-shapes` is named 'FRUIT AND VEGETABLES' in the V9 data (duplicate of the fruit topic's name). Both are V9 data issues, out of scope for this picker fix.
- **Still open from earlier versions:** F-12 reset-EN scope question; farm harvest +35 XP vs +25; `bubble.png` / `shop.png` icons (need Anh's words); weakness-table redesign for the 26 blocked bosses; the two V9 word fixes ('gram' → "gam", 'pomegranate' → "quả lựu"); V14.1 Developing Tactics; V16 Q1/Q2/Q4; V17 Q3/Q4/Q7/Q8; regex-fix apply decision; live Firebase login/sync untested in every version (Anh must run the `FIREBASE_SETUP.md` checklist); Anh's real-phone test of the current main.
