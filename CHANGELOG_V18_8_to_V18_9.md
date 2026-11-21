# Changelog — V18.8 (Boss-Fight Readability) → V18.9 (Legendary Freeze Fix)

**Version 18.9.0 — layer V44. Base: V18.8 (layer V43, 18.8.0). Date: 2026-11-21.**
**out/index.html sha256 `1c409217a6511839fb2a5dfdcffda33c2adc6101116480f7d5f3b1b9229f0bdd`, 2,423,227 B** (base V18.8: `3ad47dbf82fb2d5e508ff13b2d441ad63c061690361d18fd113c84f4466ee73b`, 2,421,418 B).

Legendary freeze fix, from Anh's live report (tapping "Khiêu chiến" on a Legendary boss freezes the game). Two-line hoist in the V18 fight engine: `legDiff()` computed once per pool build instead of once per item. No schema change, no new save key, no new localStorage key. No new bosses, art, words, or rewards. Pool contents identical (proven OLD vs NEW at mastered 0/250/700).

## Root cause

`legDiff()` (`src/v18.js:254`) reads `V15().counts().mastered`; `counts` is a GETTER (`get counts(){return counts15()}` at `src/v15.js:1787`) and `counts15()` (`src/v15.js:460-470`) is a full scan of the whole WORDS array (~4,889 entries) on EVERY call. `wordPool()` (`src/v18.js:275`) called `legDiff()` once PER WORD inside its filter for Legendary bosses, and `grammarPool()` (`src/v18.js:284`) once per grammar item (48 items) — ~4,889 × ~4,889 ≈ 25M iterations, synchronously on the main thread. `nextQ()` (`src/v18.js:432`) builds both pools once per fight, on the FIRST question, so the freeze lands exactly on fight start, after the EN/KO pick. `openArena`/`bossUnlocked` never call `legDiff`, so opening the arena is fine. The V22 scope branch returns early when a Library scope is active, so the freeze hits the default no-scope case.

Reproduced on the pristine V18.8 base in real Chrome 157 (`tools/v44/repro/logs/r44-results.json`): real UI click 🇬🇧 Tiếng Anh **3,679.5 ms** blocked (run 1: 3,649.1 ms); direct `fight()` starts **7,660.6 ms** (mastered 250) / **7,309.9 ms** (mastered 700). Controls: Challenge fight start 6.2 ms; "Khiêu chiến" click 5.5 ms; one `counts()` scan ~3.8 ms; grammar filter replay 123.9 ms for 48 items (2.58 ms per `legDiff()` call).

## Added

### Layer files
- `src/v44.js` (new, 1,206 chars): `window.__v44={version:'18.9.0'}` (version marker only — no logic, no `localStorage`, no `window.S`). No `v44.css` (no visual change).
- `src/v18.js` (modified, two hoists — the source of truth; the same exact-match replacements are applied to the embedded v18.js in `out/index.html` by `build_v44.py`).
- `out/v44.js` (new); `out/build_v44.py` (build script shipped for reproducibility); title now "V18.9 — Legendary Freeze Fix".

### R-V44-WORDPOOL — `legDiff()` hoisted out of the word filter
- Before: `if(b.arena==='leg'){var lv=legDiff();if(lv.indexOf(w.lv)<0)return false}` inside `words.filter(...)` — one full WORDS scan per word.
- After: `var lv=b.arena==='leg'?legDiff():null;` once before the filter; the filter tests `if(lv.indexOf(w.lv)<0)return false`. Same level list (depends only on the mastered count, which cannot change mid-filter), same pool.

### R-V44-GRAMMARPOOL — `legDiff()` hoisted out of the grammar filter
- Before: `g.filter(function(x){return b.arena==='leg'?legDiff().indexOf(x.lv)>=0:x.lv===b.diff})` — one full WORDS scan per grammar item.
- After: `var lv=b.arena==='leg'?legDiff():null;` once before the filter; the filter tests `lv.indexOf(x.lv)>=0`. Same levels, same pool (24 items: A2 12 / B1 12).

## Fixed in this revision — measured before/after (real Chrome 157)

| Measurement | Before (V18.8) | After (V18.9) |
|---|---|---|
| Real UI click 🇬🇧 Tiếng Anh (Legendary) | 3,679.5 ms | **9.8–11.2 ms** |
| Direct `fight()`, mastered 250 | 7,660.6 ms | **3.4–3.8 ms** |
| Direct `fight()`, mastered 700 | 7,309.9 ms | **3.3–7.0 ms** |
| 360px Legendary start (real UI clicks) | (frozen — same path) | **13.3 ms**, no overflow (scrollW 360) |

Full Legendary fight to a WIN now reachable: Hắc Long Nham Hỏa, EN, all-correct, 9–10 rounds, phases P1→P2→P3, 5 hearts kept, XP 20→235 (+215: +160 first-win reward + per-answer XP).

## Verification (all on the final build)

- `tools/v44/test44.js` — **132 PASS / 0 FAIL / 7 SKIP (of 139), ×3 runs** on the built `out/`. Sections: §0 51/0/0, §L 8/0/0, §44A 34/0/0 (pool identity OLD V18.8 vs NEW V18.9 at mastered 0/250/700 — same levels, same sorted ids), §44B 14/0/0 (Legendary EN + KO fights in vm, C-02 shield halving, V19 Counterattack 3/3), §44F 12/0/0, §44R 10/0/0, §V 3/0/0, §C 7 skips (Chrome-only).
- `tools/v44/verify-v44c.js` — **27/27 PASS, ×2 runs**, real Chrome 157, **0 console errors, 0 warnings, 0 dialogs**. Gates: A Legendary start prompt + pool identity at 0/250/700; B full Legendary fight to a WIN; C Challenge + Elemental fights; D V19 map fight; E C-02 shield halving (HP 150→125, shield 30→5) + Counterattack 3/3; F 360px prompt start, no overflow; G 0 console errors/warnings/dialogs.
- `tools/v44/repro-v44.js` — before-state record on pristine V18.8 (the freeze numbers above, plus the OLD pool snapshots at mastered 0/250/700).
- Pool identity (vm + Chrome): 550 words (A2 300 / B1 250) + 24 grammar (A2 12 / B1 12), identical sorted ids OLD vs NEW at mastered 0, 250 and 700.
- Harness/driver issues found during verification (harness only, not the game): the shared-`dynIds` leak across vm contexts in `test44.js` §44A (fixed in the harness — see README); the verify driver's first run failed 8 gates because the hub wasn't opened before `fight()`/`openArena()` and because gate B had already won `v10_firedragon` (360px gate now targets `v10_icewolf`) — fixed in the driver, re-run clean 27/27 ×2.

## Not changed

- No fight logic, reward, XP, SRS, word pool contents, pet, farm, gate, unlock or save logic touched. `legDiff` definition + thresholds (`<200 → A2/B1`, `<600 → B1`, else `B2`) byte-identical. C-R2-1 (KO boss 0 XP), weakness table, F-12, farm +35 vs +25, bubble/shop icons, C-03, C-08, "Từ vựng của tôi" picker, `.v20modal`, F-05/F-07, V9 word fixes, V14.1, V16 Q1/Q2/Q4, V17 Q3/Q4/Q7/Q8, PR #7 cleanup — all unchanged.
- Audit: no other per-item `legDiff()`/`counts()` call sites in `v18.js` or `v19.js` (v19's pools use `b.diff` directly — clean). Remaining `V15()` calls (`oldWins`, `bossUnlocked`, `wordsFiltered`) run once per call, not per item.

## NEW finding — NOT fixed here (needs Anh's decision)

**`legDiff()` never actually reads the mastered count.** `V15().counts` is a GETTER on `__v15`, not a method, so `legDiff()`'s `V15().counts().mastered` throws `TypeError: window.__v15.counts is not a function`; the `try/catch` swallows it, `m` stays 0, and `legDiff()` ALWAYS returns `['A2','B1']` whatever the mastered count is — verified in real Chrome at mastered 0 / 250 / 700 (all `['A2','B1']`, pools byte-identical). The thresholds are dead code in practice: Legendary difficulty never scales with progress. Fixing the read (`V15().counts.mastered`, no call) would CHANGE Legendary pools for players with ≥200 mastered words (B1-only, then B2-only), so it is a gameplay decision for Anh, not a safe bugfix to smuggle into a freeze fix. The hoist preserves the exact current behaviour; the definition is asserted UNCHANGED by `build_v44.py` and `test44.js`.
