# Changelog — V19.0.1 (Legendary Difficulty + Korean Boss XP) → V19.2 (Duplicate Senses)

**Version 19.2.0 — layer V47. Base: V19.0.1 (layer V46, 19.0.1). Date: 2026-11-21.**
**out/index.html sha256 `0aff5cebb7474535c3d7f635b289aaffe81d4f023d0bc64d798ae25fb918037f`, 2,457,229 B** (base V19.0.1: `d3d27cdab865befb1aaa495856b561f34520f9607dcdfdeb025a661b765de271`, 2,449,080 B).

Data-correctness build implementing the C-R3-3 duplicate-headword fix (Claude's decision 2026-11-21 14:45: keep both rows for `sluggish`, `orange`, `trip` — distinct senses; merge `devoted` into one row). Each kept sense is now its own WORDS record with its own SRS history and Library card; quizzes can no longer offer both senses as competing options. No new bosses, art, words (beyond the three twin records), or rewards. No schema change, no new save key, no new localStorage key. Every change was reproduced first on the pristine V19.0.1 base (`tools/v47/repro-v47.js`: WORDS 4,889, each pair exactly 1 record with the second sense in `extra[]`, `a1a2Total` 999 vs deduped 995, mastering `orange` once counted as learned in both FRUIT and COLORS).

## Added

### Layer files
- `src/v47.js` (new): `window.__v47={version:'19.2.0'}` + `splitDuplicateSenses(WORDS, BYID)` + `labelOf(w)` + `PAIRS` + `_test:{problems, made}`. No `window.S`, no localStorage, no other logic.
- `out/v47.js`, `out/build_v47.py` (build script shipped for reproducibility); title now "V19.2 — Duplicate Senses".

## Changed in this revision

### 1. Twin records — one WORDS record per sense (`src/v47.js`, hook in `src/v15.js` `buildWords()`)

- Design choice: the split is a hook call at the END of `buildWords()` (after the V17b/V22/V33/V35 attach blocks and the V16 override loop), NOT a wrapper on the exported `__v15.buildWords` — because `buildWords()` is also called through its closure from init15/add/delete/reset/attachBT and the V33/V35 ensureData paths, which a wrapper would miss. `buildWords()` resets WORDS each call, so the split is naturally idempotent.
- For each pair, the single existing WORDS record is found by headword (assert exactly one) and restricted to its first topic: `a1a2Topics=[firstTopic]`, `a1a2Topic=firstTopic`, the second topic dropped from `a1a2NoMap`, `a1a2No=firstNo`; the second sense removed from `extra[]` (entry with `src==='a1a2'` and the twin `vi`). The primary keeps its Oxford extra, `oxLessons`, `oxOrdMap`, `lib`, and level — the `orange` primary keeps `t:'fruits'`, `lv:'A1'`.
- The twin is appended with a stable id and the second sense read from the library data at runtime (no gloss invented or hard-coded):

| Pair | Primary (kept) | Twin (new) |
|---|---|---|
| `sluggish` | `w1371`, BODY PARTS no 403, "uể oải, lờ đờ" | `a1a2_680`, EMOTIONS AND FEELINGS, "lờ đờ, chậm chạp" |
| `orange` | `w18`, FRUIT AND VEGETABLES no 313, "quả cam" | `a1a2_806`, COLORS AND SHAPES, "màu cam" |
| `trip` | `w1469`, CLOTHES AND ACCESSORIES no 530, "ngáng chân, vấp ngã" | `a1a2_912`, FAMILY, "cuộc du ngoạn, dạo chơi" |

- Twin record shape: `{id:'a1a2_'+twinNo, t:twinTopicId, en, vi:twinVi, ipa:twinIpa, pos:twinPos, ex:'', exvi:'', lv:'A1-A2', custom:false, lib:['a1a2'], a1a2Topics:[twinTopicId], a1a2Topic:twinTopicId, a1a2TopicName:twinTopicName, a1a2NoMap:{[twinTopicId]:twinNo}, a1a2No:twinNo, sense:twinTopicName}` — NO `extra`, NO `oxLessons`, NO Oxford attach.
- Twins are WORDS-only: NEVER pushed into `__v14.ENWORDS` (V14 question code is closure-private, no `src/v14.js` — the ENWORDS route was judged NOT SAFE; the BT precedent proves WORDS records need not come from ENWORDS). V14 modes still see one row per headword.
- Verified: each pair exactly 2 records with the exact ids above; `counts15().total===4892`; the WORDS id set differs from pristine V19.0.1 by exactly the 3 twin ids; no new `w+digits` id; `__v14.ENWORDS` has no second-sense row. SRS is id-keyed, so each twin starts fresh while the primary keeps its history (mark15 on a twin moves only the twin's box; an existing save with `box['w18']===5` loads primary mastered + twin new).

### 2. Distractor guard — headword-based, 9 sites (`src/v15.js`, `src/v18.js`, `src/v19.js`, `src/v27.js`)

- `(x.en||'').toLowerCase()!==(w.en||'').toLowerCase()` added to the filter in `distractors` (v15), `distractorsEN` (v18, v19, v27) — base pool AND in-scope replacement pool, plus v27's `rest` fallback (9 sites, verified statically by exact count). Headword-based, not id-based: two records with the same English text would otherwise produce two identical "orange" buttons.
- `pickPool()` (v15) dedupes its return list by lowercased `en` (covers Matching's identical EN tiles).
- Property-tested (seeded): 500 Review draws per direction per pair (3,000), 500 Smart mc-ev draws per direction per pair (3,000), 100 Smart listen draws per direction per pair (600), 500 Match sessions, 60 pair-Q observations per scope × 6 scopes per boss engine (360 per engine) — 0 violations everywhere.
- Honest limit (documented in `test47.js`): the distractor pools pre-filter by topic/level, so only `sluggish`'s mate (shared level `A1-A2`) is a live distractor candidate on every draw. The `orange` (A1 vs A1-A2) and `trip` (OX vs A1-A2) mates are already excluded by that older filter, so their draws assert the no-same-en invariant while the guard itself is proven tight on `sluggish` plus statically (×9 sites).

### 3. Sense labels — display only (`src/v47.js` `labelOf`, used in `src/v17.js`, `src/v15.js`, `src/v18.js`, `src/v19.js`, `src/v27.js`)

- `labelOf(w)` returns `w.en + ' (' + sense + ')'` when the record has a `sense`, else the bare headword. Used in `wordCard()` (required — the two Library cards must be distinguishable) and in the MC / Speed / Review / boss meaning-mode prompts and the Smart Learning mc-ev prompt (5 call sites + definition).
- Deliberately NOT labelled: speak-mode prompts and v27 flash prompts (the Vietnamese meaning is shown alongside, already distinguishable), type prompts (the prompt IS the Vietnamese meaning), listen prompts ("Nghe" — options are guard-protected), Match tiles (`pickPool` dedup prevents both twins in one session). `w.en` is never changed: typing, speaking, search, and export still use the bare headword.
- Side-effect fix: the COLORS group was mislabelled "FRUIT AND VEGETABLES" in the Library (because `orange`'s `a1a2TopicName` named the COLORS group). It now correctly reads "COLORS AND SHAPES".

### 4. Devoted merge — data only (`data/v17_a1a2.json`, `src/v17_a1a2.js`, inline `v17data`)

- The no-938 row (`devoted`, FAMILY, "tận tâm, tận tụy") was deleted from all four places at build time (anchor-based deletion, same precedent as `build_v41.py`). Asserted: `"no": 938` absent, `"no": 351` present exactly once (kept row: CHARACTERISTICS, "hết lòng, tận tâm, tận tụy", id `w1320`). The three kept second senses stay in the data files untouched.

## Not changed (deliberately)

- No boss stats, HP, skills, rewards, or fight mechanics. No new bosses, art, or currencies. No duplicate rewards.
- No save-schema change, no new localStorage key, no new top-level `S.v7` key. No migration needed.
- `pushV17IntoV14` / `pushDataIntoV14`, the inline `v14js` block, `counts15` / `legDiff` thresholds, reward amounts, and every Vietnamese gloss untouched.
- V19.1 (Sentence Forge etc.) is a separate follow-up — not started here.
- Regression held: legDiff thresholds + live Legendary pools 550/250/630 + grammar 24/12/12; KO XP 8 correct = +85 both engines; EN XP sequences byte-identical to pristine V19.0.1 (seeded fights, both engines); V19.0 C-R3-1/C-R3-2/C-R3-4/NEW-1/weakchip spot-checks all pass.

## Migration effects (honest)

- WORDS total 4,889 → 4,892; FAMILY 100 → 99 words; `a1a2Total` 999 → 998.
- Per-topic "learned" now needs each sense mastered separately. Already-claimed topic rewards stay claimed. A topic that showed complete on a single mastered sense (e.g. COLORS after learning fruit-orange) now shows one word still to learn until the twin is learned.
- SRS history is per record id: primaries keep boxes/due dates; twins start at box 0. No data is lost and no migration is needed.
