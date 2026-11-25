# Korean & English Vocab Farm — V19.6 Sentence Forge Auto (tự động tạo câu từ bộ từ)

**Version 19.6.0 — layer V51. Base: V19.5.1 (19.5.1, layer V52). Date: 2026-11-25.**

**REBASE — read this first:** this V19.6 is the REBASED build: layer V51 applied onto the V19.5.1 base in the shared tree (`~/workspace/v7build/`), so **V19.6 = V19.5.1 + Forge Auto**. The original V19.6 (built 2026-11-22/23 in the private tree `~/workspace/forge-v51-work/` on the V19.4 base; ZIP sha256 `8168b236…`) is **SUPERSEDED — do not use or push it**. The rebase was required because V19.5 (layer V50) and V19.5.1 (layer V52) shipped after the original V19.6 was built: the shared `src/v48.js` is newer — it carries V50 Forge score tracking (`FS.score`, `scoreTotal`/`bestScore`) and V52 Android TTS (Dojo `speakText` delegates to `__v52`). All 6 V51 edits were re-derived against that newer file (see below); nothing from the private tree's V19.4-era `src/` was copied over.

**Honest testing note:** verified by `build_v51r.py` (base-hash gate on the V19.5.1 hash `2bc0726d…`, exact-match anchors, marker order, `node --check`), by the vm suite `test51.js` (**97 PASS / 0 FAIL / 5 SKIP, ×3 runs** on the final built `out/`) and by real-Chrome gates `verify-v51c.js` (**61/61 PASS, ×2 clean runs**) in Chrome 157, with **0 console errors, 0 warnings, 0 JS dialogs**. The defects were proved first on the pristine V19.5.1 base in Node vm (`tools/v51/repro-v51.js`, **5/5 reproduced**). The Chrome gates also regression-check the V19.5.1 behaviours on the rebased build (C-R5-1 mixed-fight XP + the `__v52` TTS helper with stubbed voices — new gate G9, 23 verdicts). **Real Android TTS audio end-to-end is NOT verified in headless Chrome (no voices, no audio) and needs Anh's real Android phone test**. Firebase login/sync is untested live, as in every version — run `FIREBASE_SETUP.md`.

## What V19.6 changes

Sentence Forge used to draw ONLY from the fixed 40-sentence `__V15_DATA.builder` bank (EN) / the player's own `card.e` examples (KO) — the same 40 sentences every session, whatever word set the player was studying. V19.6 (layer V51) makes Forge **auto-generate sentences from the active word set**:

- **`genPool()` — words from the active scope.** Priority: learned words in the scope → learned words anywhere → unlearned words in the scope. Pool capped at 12, session takes 5. The scope is the Library set/topic/lesson the player chose (`en15().scope` via `V15().wordsFiltered()`): A1–A2 topic, Oxford lesson, Chrono set, Skyroot set, Basic Tactics units, "Từ vựng của tôi"… whatever is active. With no scope, the pool is the player's learned words.
- **`genItem()` — sentences built from the word's REAL data only.** Two paths: **EX-EXTEND** (the word's real `ex` example kept verbatim, extended by level) or **POS templates** (noun / verb / adjective). Difficulty scales by level: A1 short simple, A2 + time/place, B1 + because-clause, B2 + which-clause. Deterministic (same word → same sentence).
- **Honest skip, never fabricated.** Multi-word headwords, capitals, modal/aux/linking/tone verbs, attributive-only adjectives — and any word lacking the data a template needs — fall back to the 40-sentence bank. No sentence is ever invented from nothing.
- **KO prefers the selected deck.** When a KO deck is selected (`S.deck`), its cards come first in the KO pool; the sentences themselves stay verbatim `card.e` (no Korean is ever generated or invented).
- **Flag `forgeAuto`** in `S.v7.en48.flags` (default ON, kill-switch via `window.__v48.setFlag('forgeAuto', false)`). Flag off → exact old behaviour: the pure 40-bank pool, no badge, no generated count.
- **UI:** the pre-session card shows the scope name + generated count ("📚 Bộ từ: … · Câu tạo tự động từ bộ từ (N câu)"); each generated question shows a **"Câu tạo tự động"** badge with the scope name + keyword (word + Vietnamese meaning). The badge is white on #1e3a5f (11.50:1, WCAG AA, light + dark).
- **No scoring/XP/SRS/pet/save-schema change; no new save key.** Forge scoring (+2/correct, +10 session bonus ≥4/5) is untouched; generated items go through the same `forgeCheck`/`forgeNext` path as bank items.

## The 6 re-derived `src/v48.js` edits (7 replacement sites)

Extracted by diffing the private tree's V51 `src/v48.js` against its pristine V19.4 backup, then re-applied to the shared (V19.5.1) `src/v48.js` by exact anchors. The V50 score code and the V52 Dojo delegation on the same lines/regions are untouched (verified by a 3-way diff: shared-new vs private-V51 differs ONLY by V50+V52 hunks; shared-new vs pristine V19.5.1 differs ONLY by these 7 hunks):

1. **E1** (line 110, `defEn48`): `flags:{forge:1,bounty:1,tree:1,dojo:1,boss:1}}}` → `flags:{forge:1,bounty:1,tree:1,dojo:1,boss:1,forgeAuto:1}}}`.
2. **E2** (line 122, `en48()` fallback): `e.flags=e.flags||{forge:1,bounty:1,tree:1,dojo:1,boss:1};` → same with `,forgeAuto:1`.
3. **E3** (line 128, `setFlag`): `var names=['forge','bounty','tree','dojo','boss'];` → `var names=['forge','bounty','tree','dojo','boss','forgeAuto'];`.
4. **E4** (KO, after `var cards=learnedKO();out.learned=cards.length;`): 3-line hook — `try{if(window.__v51&&__v51.koDeckFirst)cards=__v51.koDeckFirst(cards)}catch(e){}`.
5. **E5** (EN, after `out.learned=learnedEN().length;`): 10-line hook — calls `__v51.genPool()` when the flag is on; on success replaces `out.items`/`out.scopeName` and sets `out.genCount`, then `return out`.
6. **E6** (pre-session intro, after the V50 bestScore line): scope/genCount line — "📚 Bộ từ: <b>…</b> · Câu tạo tự động từ bộ từ (N câu) — câu nào không tạo được sẽ lấy từ ngân hàng câu mẫu."
7. **E7** (in-session, before the "Nghĩa:" line): generated badge line — `<span class="v51gen">Câu tạo tự động</span> Bộ từ: … · Từ khóa: <b>word</b> (nghĩa)`.

## Files changed vs V19.5.1

- **CHANGED (2):** `index.html`, `v48.js`
- **ADDED (11):** `v51.js`, `v51.css`, `build_v51r.py`, `package_v51r.py`, `README_V19_6_SENTENCE_FORGE_AUTO.md`, `CHANGELOG_V19_5_1_to_V19_6.md`, `SMOKE_TEST_V19_6_2026-11-25.md`, `tools/v51/test51.js`, `tools/v51/verify-v51c.js`, `tools/v51/repro-v51.js`, `tools/v51/PUSH_MANIFESTS.md`
- **REMOVED (0)**
- **NOT in this build (deliberate):** OBS-1 (stale Counterattack question re-asked untimed, Low lead), the `forgeNext` double-call lead, the KO-streak quirk (KO correct answers pay +10 but do not advance the EN streak — pre-existing, unchanged), and all other pending decision items (C-03, C-08, F-12, farm harvest +35 vs +25, bubble/shop icons, "Từ vựng của tôi", F4 remainder, F-05/F-07 observers, .v20modal, C-09).

## `index.html` injection order

`v51` style + `v51js` script are injected immediately **before** `<script id="v52js">`, so **v52 stays last** — the V19.5.1 load order is preserved (style ids end […, v50, v51]; script ids end […, v50, v51, v52]). `build_v51r.py` asserts this order, plus that all V50 markers (`_speakSeq50`, `FS.score`, `scoreTotal`, `bestScore`, v50js, VERSION 19.5.0) and V52 markers (`__v52`, `mark18(ok,w,qkey)`, `mark19(ok,w,qkey)`, `wordlessKey18/19`, v52js, VERSION 19.5.1) survive.

## How to try it

1. Open the game → English Hub → Sentence Forge (Lò Rèn Câu).
2. Pick a word set first (Library → A1–A2 topic, or Oxford Bài 12) — the pre-session card names the set and the generated count.
3. Play a session: every generated question carries the "Câu tạo tự động" badge with its keyword. Turn the flag off (`window.__v48.setFlag('forgeAuto', false)` in the console, or via the flag UI) and the session is the old 40-bank pool with no badge.
