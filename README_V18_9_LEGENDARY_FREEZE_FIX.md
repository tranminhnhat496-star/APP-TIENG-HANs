# Korean & English Vocab Farm — V18.9 LEGENDARY FREEZE FIX

**Version 18.9.0 — layer V44 (loads LAST). Base: V18.8 (Boss-Fight Readability). Date: 2026-11-21.**

V18.9 answers Anh's live report: tapping "Khiêu chiến" on a Legendary boss freezes the game. The fix is a two-line hoist inside the V18 fight engine: `legDiff()` moves OUT of the per-item filters in `wordPool()` and `grammarPool()` and is computed ONCE per pool build instead of once per word / once per grammar item. Each `legDiff()` call runs `V15().counts()`, a full scan of the ~4,889-word WORDS array — so a Legendary fight start did ~4,889 full scans synchronously on the main thread (~3.7–7.8 s) before the first question rendered. After the fix the same tap starts the fight in ~10 ms. Same level list, same pool membership, same difficulty, same questions — no fight logic, reward, XP, SRS, pet, farm, gate, unlock or save logic touched; no new bosses, words, art, or save key.

**Scope note:** this is a targeted performance fix for the Legendary fight start only. It does NOT fix the latent `legDiff()` mastered-read bug found during verification (see below) — fixing that read would CHANGE Legendary pools for players with ≥200 mastered words, so it stays a pending decision for Anh. It is also NOT a resumption of the stopped V28 Boss UI project.

**Honest testing note:** verified by `build_v44.py` (base-hash gate, exact-match anchors, marker order, `node --check`), by the jsdom suite `test44.js` (**132 PASS / 0 FAIL / 7 SKIP, ×3 runs** on the built `out/`, including a before/after pool-identity proof against the pristine V18.8 build) and by real-Chrome gates `verify-v44c.js` (**27/27 PASS, ×2 runs**, 0 console errors/warnings/dialogs) measuring real tap-to-question times in Chrome 157. Anh's real-phone test remains the final word for layout and touch. Firebase login/sync is untested live, as in every version — run `FIREBASE_SETUP.md`.

## Root cause (reproduced in real Chrome, not guessed)

`legDiff()` (`src/v18.js:254`) reads `V15().counts().mastered`. `counts` is a GETTER (`get counts(){return counts15()}` at `src/v15.js:1787`) and `counts15()` (`src/v15.js:460-470`) is a full scan of the whole WORDS array on EVERY call. `wordPool()` (`src/v18.js:275`) called `legDiff()` once PER WORD inside its filter for Legendary bosses (`b.arena==='leg'`), and `grammarPool()` (`src/v18.js:284`) once per grammar item — ~4,889 words × a ~4,889-word scan ≈ 25M iterations, plus 48 grammar items × the same scan, all synchronously on the main thread. `nextQ()` (`src/v18.js:432`) builds both pools once per fight, on the FIRST question, so the freeze lands exactly on fight start, after the EN/KO pick screen. `openArena` and `bossUnlocked` never call `legDiff`, so opening the arena is fine — the freeze is on fight start only. The V22 scope branch in `wordPool` returns early when a Library scope is active, so the freeze hits the default no-scope case.

Measured on the pristine V18.8 base in real Chrome 157 (`tools/v44/repro/logs/r44-results.json`):

| Measurement | Before (V18.8) | After (V18.9) |
|---|---|---|
| Real UI click 🇬🇧 Tiếng Anh (Legendary, Hắc Long Nham Hỏa) | **3,679.5 ms** blocked (run 1: 3,649.1 ms) | **9.8–11.2 ms** |
| Direct `fight()` start, mastered 250 | **7,660.6 ms** | **3.4–3.8 ms** |
| Direct `fight()` start, mastered 700 | **7,309.9 ms** | **3.3–7.0 ms** |
| "Khiêu chiến" click (language pick render) | 5.5 ms (never the freeze) | 7.0 ms |
| Challenge fight start (control, non-Legendary) | 6.2 ms | 2.4 ms |
| One `counts()` scan (WORDS = 4,889) | ~3.8 ms | — (called once now) |
| Grammar filter replay (48 items × `legDiff()`) | 123.9 ms (2.58 ms per call) | — (called once now) |

## What V18.9 adds

### 1. The fix (`src/v18.js`, two hoists + `src/v44.js` marker, loaded LAST)

- `wordPool()`: `var lv=b.arena==='leg'?legDiff():null;` before the filter; the filter now tests `if(lv.indexOf(w.lv)<0)return false`. The per-word `var lv=legDiff();` line is gone.
- `grammarPool()`: same hoist; the filter now tests `lv.indexOf(x.lv)>=0`. The per-item `legDiff().indexOf(x.lv)` call is gone.
- `src/v44.js` (1,206 chars): version marker only — `window.__v44={version:'18.9.0'}`. No logic, no `localStorage`, no `window.S`. No `v44.css` — there is no visual change.
- `legDiff()` itself (definition + thresholds `<200 → A2/B1`, `<600 → B1`, else `B2`) is byte-identical. No other fight logic, reward, XP, SRS, pet or save change.

### 2. Proof the Legendary pool is UNCHANGED

The pool was captured (sorted word + grammar ids) on the OLD build and the NEW build, at mastered = 0 / 250 / 700, in Node vm (`test44.js` §44A) and in real Chrome (`verify-v44c.js` V44-A3/A5):

| Mastered | Words | Grammar | Word levels | Grammar levels | Old vs new ids |
|---|---|---|---|---|---|
| 0 | 550 | 24 | A2 300 / B1 250 | A2 12 / B1 12 | identical |
| 250 | 550 | 24 | A2 300 / B1 250 | A2 12 / B1 12 | identical |
| 700 | 550 | 24 | A2 300 / B1 250 | A2 12 / B1 12 | identical |

Same levels AND same membership at all three mastered counts — the hoist cannot change what the player fights.

### 3. Build + test evidence (shipped in the ZIP)

- `build_v44.py` — base-hash gate (pristine V18.8 `3ad47dbf…`), exact-match replacements of the two pre-fix blocks, title swap, `v44js` injection last before `</body>`; refuses unless the base is pristine V18.8. `package_v44.py` — same pattern as V43; `test44.js` + `verify-v44c.js` + `repro-v44.js` are inside the ZIP (finished BEFORE packaging).
- `tools/v44/test44.js` — **132 PASS / 0 FAIL / 7 SKIP (of 139), ×3 runs** on the built `out/`. Sections: §0 51/0/0, §L 8/0/0, §44A 34/0/0 (pool identity OLD vs NEW at mastered 0/250/700), §44B 14/0/0 (Legendary EN + KO fights in vm, C-02 shield halving, V19 Counterattack 3/3), §44F 12/0/0 (V43 fight render still holds), §44R 10/0/0, §V 3/0/0, §C 7 skips (Chrome-only).
- `tools/v44/verify-v44c.js` — **27/27 PASS, ×2 runs**, real Chrome 157, 0 console errors/warnings/dialogs. Gates: A Legendary start prompt + pool identity at 0/250/700; B full Legendary fight to a WIN (9–10 rounds, phases P1→P2→P3, 5 hearts, XP 20→235); C Challenge + Elemental fights; D V19 map fight; E C-02 shield halving (HP 150→125, shield 30→5) + Counterattack 3/3; F 360px prompt start, no overflow (scrollW 360); G 0 console errors/warnings/dialogs.
- `tools/v44/repro-v44.js` — the before-state record on pristine V18.8 (the freeze numbers in the table above, plus the OLD pool snapshots).

## Not changed

- No fight logic, reward, XP, SRS, word pool contents, pet, farm, gate, unlock or save logic touched. Thresholds, `legDiff` definition, C-R2-1 (KO boss correct answers pay 0 XP), weakness table, F-12 reset scope, farm +35 vs +25 XP, bubble/shop icons, C-03, C-08, "Từ vựng của tôi" picker scope, `.v20modal`, F-05/F-07 observers, V9 word fixes, V14.1, V16 Q1/Q2/Q4, V17 Q3/Q4/Q7/Q8, PR #7 cleanup — all unchanged, as before.
- `out/index.html` sha256 `1c409217a6511839fb2a5dfdcffda33c2adc6101116480f7d5f3b1b9229f0bdd`, 2,423,227 B (base V18.8: `3ad47dbf82fb2d5e508ff13b2d441ad63c061690361d18fd113c84f4466ee73b`, 2,421,418 B).
- Audit: no other per-item `legDiff()`/`counts()` call sites exist in `v18.js` or `v19.js` (v19's `wordPool`/`grammarPool` use `b.diff` directly — clean). The remaining `V15()` calls (`oldWins`, `bossUnlocked`, `wordsFiltered`) run once per call, not per item.

## Known limits / findings (not fixed here — needs Anh's decision)

- **NEW — `legDiff()` never actually reads the mastered count (latent bug, found during verification, DELIBERATELY NOT fixed in V18.9).** `V15().counts` is a GETTER on `__v15`, not a method, so `legDiff()`'s `V15().counts().mastered` throws `TypeError: window.__v15.counts is not a function`; the `try/catch` swallows it, `m` stays 0, and `legDiff()` ALWAYS returns `['A2','B1']` whatever the mastered count is — verified in real Chrome at mastered 0 / 250 / 700 (all `['A2','B1']`, pools byte-identical). The thresholds (`<200 → A2/B1`, `<600 → B1`, else `B2`) are dead code in practice: Legendary difficulty never scales with progress. Fixing the read (`V15().counts.mastered`, no call) would CHANGE Legendary pools for players with ≥200 mastered words (B1-only, then B2-only), so it is a gameplay decision, not a safe bugfix to smuggle into a freeze fix. The hoist preserves the exact current behaviour; the definition is asserted UNCHANGED by `build_v44.py` and `test44.js`.
- **Harness note (not a product bug):** `test44.js` §44A loads the pristine V18.8 build in a second vm context. The harness's `dynIds`/`staticIds` sets are module-level and shared across contexts, so the first context's `init15()` leaks `#v15langbar` into the second context and its `init15()` returns early without `pushDataIntoV14()`/`buildWords()` (WORDS 1,576 instead of 4,889). `loadBuild()` deletes the leaked id before firing `DOMContentLoaded` — documented in the harness. The game itself is unaffected (each real page load has its own DOM).
- **Driver note (not a product bug):** in `verify-v44c.js`, the first run's 360px gate failed because gate B had already WON `v10_firedragon`, so its card shows "Đã thắng ✓" with no "Khiêu chiến" button — the gate now targets `v10_icewolf` (unlocked by that win). The first run also exposed that calling `__v18.fight()`/`openArena()` before `__v15.openHub('bosses')` runs the fight logic with nothing rendered (`#v15body`/`#v18fight` don't exist yet) — the driver now opens the hub first. Neither affects the game.
- **Pre-existing UX (not V18.9):** after a fresh-guest reload the first-run farm chooser modal ("Chọn nông trại của bạn") appears over the Bosses page until the player picks a farm once — visible in the 360px screenshot `v44c-leg-360-first-question.png`. Pre-existing V15 behaviour, not caused by V44.
- Firebase login/sync untested live, as in every version — run `FIREBASE_SETUP.md`.
- Real-phone touch / Safari still needs Anh's real-phone test.

## How to update (deploy)

Same as V18.8: unzip `Korean_English_Vocab_Farm_V18_9_Legendary_Freeze_Fix.zip` over the GitHub Pages deployment (or upload its contents), replacing `index.html` and adding `v44.js` / `build_v44.py` / `package_v44.py`. Player data is untouched — no save migration, no new localStorage key, no Firebase change. Verify on the live page: open the Legendary arena, tap "Khiêu chiến" on any Legendary boss, pick a language — the first question must appear immediately (before V18.9 it froze for ~4–8 s).
