# Korean & English Vocab Farm — V19.2 Duplicate Senses (C-R3-3)

**Version 19.2.0 — layer V47 (loads LAST). Base: V19.0.1 (layer V46, 19.0.1). Date: 2026-11-21.**

V19.2 is a **data-correctness** build: it implements the C-R3-3 duplicate-headword fix decided by Claude on 2026-11-21 14:45 (keep both rows for `sluggish`, `orange`, `trip` — distinct senses; merge `devoted` into one row). Until now, one WORDS record carried two senses: mastering `orange` once counted as learned in both FRUIT AND VEGETABLES and COLORS AND SHAPES, and quizzes could show the two senses as competing options. Each sense now has its own record, its own SRS history, and its own Library card — and a question can never offer both senses as options.

**Honest testing note:** verified by `build_v47.py` (base-hash gate on the V19.0.1 hash `d3d27cda…`, exact-match anchors, marker order, `node --check`), by the vm suite `test47.js` (**182 PASS / 0 FAIL / 7 SKIP** on the final built `out/` in runs 2 and 3 — run 1 was 180/2/7 with two test-harness bugs since fixed; see `SMOKE_TEST_V19_2_2026-11-21.md` for the per-run counts, including a before/after EN-XP proof against the pristine V19.0.1 build) and by real-Chrome gates `verify-v47c.js` (**50/50 PASS, ×2 runs**, 0 console errors/warnings/dialogs) in Chrome 157. Anh's real-phone test remains the final word for layout and touch. Firebase login/sync is untested live, as in every version — run `FIREBASE_SETUP.md`.

## Gameplay impact — read this first

- **Three words now have two cards each, one per sense.** `sluggish` (BODY PARTS: "uể oải, lờ đờ" vs EMOTIONS AND FEELINGS: "lờ đờ, chậm chạp"), `orange` (FRUIT AND VEGETABLES: "quả cam" vs COLORS AND SHAPES: "màu cam"), `trip` (CLOTHES AND ACCESSORIES: "ngáng chân, vấp ngã" vs FAMILY: "cuộc du ngoạn, dạo chơi"). Each card shows its sense in brackets — e.g. `orange (COLORS AND SHAPES)` — so the two cards are distinguishable in the Library. The primary card keeps the bare headword (`orange` in FRUIT AND VEGETABLES).
- **Per-topic progress is now per sense.** Mastering `orange` as a fruit no longer counts it as learned as a colour: each topic's "learned" count and reward gate now needs its own sense mastered. Already-claimed topic rewards stay claimed — nothing is un-claimed. The FAMILY topic now has 99 words (was 100) and its reward gates at 99.
- **`devoted` is now one word.** The near-identical FAMILY sense ("tận tâm, tận tụy") was merged into the CHARACTERISTICS row ("hết lòng, tận tâm, tận tụy"); the A1–A2 library goes 999 → 998 rows. If you had already learned `devoted`, your progress is untouched (same record id `w1320`).
- **Quizzes can no longer show both senses as competing options.** In MC, Speed, Review, boss meaning-mode questions, Smart Learning, and Matching, the two senses of one headword never appear together — the options are always distinct words. (Typing, listening, and speaking prompts were deliberately left unlabelled: the prompt itself — a Vietnamese meaning, an audio cue, or a spoken word — already distinguishes the sense, and the twin is excluded from the options, so scoring is safe.)
- Nothing else changes: no boss stats, HP, skills, rewards, or fight mechanics; no new bosses, art, or currencies; no save-schema change; no new localStorage key. WORDS total goes 4,889 → 4,892 (the three new twin records).

## What V19.2 changes

### 1. Twin records — one WORDS record per sense (`src/v47.js`, new layer)

At the end of `buildWords()` (after the V17b/V22/V33/V35 attach blocks and the V16 override loop), `__v47.splitDuplicateSenses(WORDS, BYID)` runs. For each kept pair it finds the single existing WORDS record by headword, restricts it to its first topic (the second topic is dropped from `a1a2Topics`/`a1a2NoMap`/`a1a2No`, and the second sense is removed from `extra[]`), and appends a twin record with a stable id (`a1a2_680` sluggish, `a1a2_806` orange, `a1a2_912` trip) carrying the second sense (`vi`, `ipa`, `pos` read from the library data at runtime — nothing invented), `lv:'A1-A2'`, `lib:['a1a2']`, and `sense` = the twin topic name. The twin has NO `extra`, NO `oxLessons`, NO Oxford attach. The primary keeps its Oxford attach, `oxLessons`, `oxOrdMap`, `lib`, and level untouched — the `orange` primary keeps `t:'fruits'`, `lv:'A1'`.

The twins are WORDS-only records: they are NEVER pushed into `__v14.ENWORDS` (the V14 question code is closure-private and there is no `src/v14.js`, so the ENWORDS route was judged NOT SAFE in the feasibility review — the BT precedent proves WORDS records need not come from ENWORDS). V14 modes therefore still see one row per headword, as before.

SRS is id-keyed everywhere, so each twin starts fresh (box 0) while the primary keeps its full history. An existing save with `box['w18']===5` loads with the primary mastered and the twin new — verified live in the test suite.

### 2. Distractor guard — headword-based, in all four question functions

The guard `(x.en||'').toLowerCase()!==(w.en||'').toLowerCase()` was added to the distractor filter in `distractors` (`src/v15.js`), `distractorsEN` (`src/v18.js`, `src/v19.js`, `src/v27.js`) — in the base pool AND the in-scope replacement pool, plus v27's `rest` fallback (9 sites total, verified statically). It is headword-based, not id-based: two records with the same English text would otherwise produce two identical "orange" buttons. `pickPool()` (`src/v15.js`) additionally dedupes its return list by lowercased `en`, which covers Matching's identical EN tiles.

Property-tested with seeded draws: 500 Review draws per twin per direction (primary-as-Q / twin-as-Q) in all 3 pairs, 500 Smart mc-ev draws per direction per pair, 100 Smart listen draws per direction per pair, 500 Match sessions, and 60 pair-Q observations per scope × 6 scopes per boss engine (360 per engine) — 0 violations everywhere. One honest limit, documented in the tests: the distractor pools pre-filter by topic/level, so only `sluggish`'s mate (shared level `A1-A2`) is a live distractor candidate on every draw; the `orange`/`trip` mates are already excluded by that older filter, so their draws assert the no-same-en invariant while the guard itself is proven tight on `sluggish` plus statically (×9 sites).

### 3. Sense labels — display only, never baked into `w.en`

`labelOf(w)` (global, `src/v47.js`) returns `w.en + ' (' + sense + ')'` when the record has a `sense`, else the bare headword. It is used in `wordCard()` (the two Library cards must be distinguishable — required), and in the MC / Speed / Review / boss meaning-mode prompts and the Smart Learning mc-ev prompt. Typing, speaking, listening, and Match prompts are deliberately NOT labelled (see "Gameplay impact" above); `w.en` itself is never changed, so typing, speaking, search, and export all still use the bare headword.

### 4. Devoted merge — data only

The no-938 row (`devoted`, FAMILY, "tận tâm, tận tụy") was deleted from `data/v17_a1a2.json`, `src/v17_a1a2.js`, the `out/` copies, and the inline `v17data` block at build time (anchor-based deletion, same precedent as `build_v41.py`). The kept no-351 row (`devoted`, CHARACTERISTICS, "hết lòng, tận tâm, tận tụy") is untouched, exactly once. The three kept second senses stay in the data files untouched.

## Files changed (vs V19.0.1)

- **Added:** `src/v47.js` (new layer, `window.__v47={version:'19.2.0'}`), `out/v47.js`, `build_v47.py`, `package_v47.py`, `tools/v47/test47.js`, `tools/v47/verify-v47c.js`, `tools/v47/repro-v47.js`, `tools/v47/PUSH_MANIFESTS.md`, this README, `CHANGELOG_V19_0_1_to_V19_2.md`, `SMOKE_TEST_V19_2_2026-11-21.md`.
- **Changed:** `src/v15.js` (pickPool dedupe, distractors guard ×2, buildWords hook, prompt labels ×4), `src/v17.js` (wordCard label), `src/v18.js` (distractorsEN guard ×2, boss prompt label), `src/v19.js` (distractorsEN guard ×2, boss prompt label), `src/v27.js` (distractorsEN guard ×3, mc-ev prompt label), `src/v17_a1a2.js` + `data/v17_a1a2.json` (devoted no-938 deleted), `out/index.html` (the five edited embedded blocks re-synced wholesale, `v47js` injected last, `v17data` devoted row deleted).
- **Removed:** nothing (the devoted merge deletes one data row, not a file).
- **Not touched:** `pushV17IntoV14` / `pushDataIntoV14`, the inline `v14js` block, any `S.v7` shape, `counts15` / `legDiff` thresholds, reward amounts, any Vietnamese gloss.

## Migration effects (honest)

- WORDS total 4,889 → 4,892; FAMILY 100 → 99 words; `a1a2Total` 999 → 998.
- Per-topic "learned" now needs each sense mastered separately. If you had already claimed a topic reward, it stays claimed. If you had mastered `orange` once and the COLORS topic showed as complete, it now shows one word still to learn (the colour sense) until you learn it — the reward, if unclaimed, now requires the twin too.
- SRS history is per record id: primaries keep their boxes/due dates; twins start at box 0. No save migration is needed and no data is lost.
- A side-effect fix: the COLORS group was mislabelled "FRUIT AND VEGETABLES" in the Library (because `orange`'s topic name named the COLORS group). It now correctly reads "COLORS AND SHAPES".

## How to verify after deploying

1. Open the English Library → A1–A2 → COLORS AND SHAPES: two `orange` cards are NOT shown — one `orange (COLORS AND SHAPES)` card ("màu cam") is, and FRUIT AND VEGETABLES shows the bare `orange` ("quả cam"). Same for `sluggish` (EMOTIONS AND FEELINGS vs BODY PARTS) and `trip` (FAMILY vs CLOTHES AND ACCESSORIES).
2. Play a Review or Smart session on the COLORS topic: no question ever offers both orange senses as options.
3. Play Matching on COLORS: no session ever shows both orange tiles.
4. Check the Library home counts: BODY PARTS 25, EMOTIONS AND FEELINGS 119, FRUIT AND VEGETABLES 53, COLORS AND SHAPES 54, CLOTHES AND ACCESSORIES 57, FAMILY 99.
5. Fight a boss in English and Korean: correct answers still pay the V19.0.1 rates (EN up to +10, KO +85 for 8 correct in both engines); Legendary pools still scale 550/250/630 by mastered count.
