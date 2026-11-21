# Changelog — V19.0 (Round-3 Bug Fixes) → V19.0.1 (Legendary Difficulty + Korean Boss XP)

**Version 19.0.1 — layer V46. Base: V19.0 (layer V45, 19.0.0). Date: 2026-11-21.**
**out/index.html sha256 `d3d27cdab865befb1aaa495856b561f34520f9607dcdfdeb025a661b765de271`, 2,449,080 B** (base V19.0: `d5fb0ddcd12a314b0f72a8191ec23b0fa4d04b923aa3dd53404e0ddad8e441bb`, 2,433,827 B).

Balance build, not a bug-fix round — directed by Claude (2026-11-21 09:40, all three decisions "DO"). Two gameplay changes: Legendary difficulty now really scales with mastered words, and correct Korean boss answers now pay XP on the same schedule as English. The weakness table was redesigned in the same version so the blocked-boss count does not grow. No new bosses, art, words, or rewards. No schema change, no new save key, no new localStorage key. Every change was reproduced first on the pristine V19.0 base (`tools/v46/repro-v46.js`: legDiff always `['A2','B1']` at mastered 700, KO correct answers pay 0 XP in both engines; `tools/v46/verify-v46c.js` on pristine: 23/52 PASS, every fix gate FAILing as expected).

## Added

### Layer files
- `src/v46.js` (new): `window.__v46={version:'19.0.1'}` + the one shared boss-answer XP function `awardBossAnswerXP(o)` + `koXpKey(cardId)`. No other logic.
- `src/v46_data.js` (new): `window.__V46_DATA.weakExplicit` — 23 static per-boss weakness overrides (see below). No words, IPA, or meanings invented; all labels already exist in `__V34_DATA.a1a2Labels`.
- `out/v46.js`, `out/v46_data.js`, `out/build_v46.py` (build script shipped for reproducibility); title now "V19.0.1 — Legendary Difficulty + Korean Boss XP".

## Changed in this revision

### 1. Legendary difficulty scaling — legDiff read fixed, thresholds EXACTLY unchanged (`src/v18.js:254`)
- Before: `legDiff()` read `V15().counts().mastered`, but `V15().counts` is a getter (`src/v15.js:1787`) — the call threw `TypeError`, the `try/catch` swallowed it, `m` stayed 0, and `legDiff()` ALWAYS returned `['A2','B1']`. Legendary difficulty never scaled despite the arena card promising "Độ khó câu hỏi tăng theo tiến trình học của bạn". Live Legendary fight pool at mastered 700: A2 300 / B1 250, pool 550, no B2.
- After: `V15().counts.mastered` (getter read, no call), with a `typeof c.mastered==='number'` check; thresholds unchanged (`<200 → ['A2','B1']`, `<600 → ['B1']`, else `['B2']`); failure logs `console.warn('[V46 legDiff] mastered read failed, falling back to A2/B1:', …)` and falls back to `['A2','B1']` — visible, never silent. The V44 hoist (called once per pool build) is preserved. `legDiff()` is exposed via `__v18._test.legDiff()`; v19's `wordPool` has no leg branch (v19 never fights leg bosses) — no change there.
- Measured in real Chrome 157 (live fights): mastered 0 → A2 300 + B1 250 (550); 199 → same; **200 → B1-only 250**; 599 → B1-only 250; **600 → B2-only 630**; 700 → B2-only 630. Grammar pools: 24 (A2 12 + B1 12) → 12 (B1) → 12 (B2). Fight start at mastered 600: **8.8 ms** (V18.9 freeze fix intact). Full Legendary fights to wins at 200 (10 steps, +215 XP) and 600 (10 steps, +215 XP); real UI start 21.9/5.6 ms.
- Gameplay impact (intended): players with ≥200 mastered words will face harder Legendary questions — B1-only, then B2-only at ≥600. Players below 200 see no change.

### 2. Weakness-table redesign — 23 overrides, blocked bosses 26 → 15 (`src/v46_data.js`, `src/v34.js` `weakFor`)
- Before: 26 blocked bosses (15 mode-blocked + 13 pool-blocked − 2 overlap). Fixing legDiff alone would have grown it to 36 (the extra 10 being exactly the Legendary bosses, whose old weaknesses — clothes-and-accessories B1, fruit-and-vegetables B2 — have no B1/B2 words in the A1–A2 topic pool).
- After: `weakFor` consults `__V46_DATA.weakExplicit` FIRST (after the KO-deck rule, before the v34/v35 tables). All 23 overrides use only the 4 topics that have words at ALL THREE Legendary bands — education (B1 19 / B2 13 in-pool), nature (20/14), travel (17/12), emotions-and-feelings (7/7). The other 63 bosses' weaknesses are byte-identical to V19.0. No boss stats/HP/skills/rewards/fight mechanics changed.
  - Legendary (10): firedragon → emotions-and-feelings; icewolf → travel; thunderlion → education; seaoctopus → nature; titan → travel; phoenix → emotions-and-feelings; voidghost → emotions-and-feelings; godturtle → nature; ninetails → travel; ancienttree → nature.
  - Zone bosses (5): seadragon, sharkking → nature; timemachine, golem, goldephant → travel.
  - English/Elemental (8): owl, wizard, fox, dict → education; tiger, king → travel; octopus, fairy → nature.
- Measured (recomputed live, all 86 bosses, at mastered 0/200/600/700): **pool-blocked 0** (was 13, would-be 23), **distinct blocked 15** (mode only, was 26). Meter fillability in real Chrome: `v10_dict` (previously pool-blocked) fills 3/3 + BREAK fires (11 weakness hits / 40 answers); Legendary `v10_firedragon` fills + BREAKs at 200 (6 hits) and 600 (10 hits). `v10_owl` (read mode) still asks no word questions — mode-blocked by design, fight still runs.
- The 15 remaining blocked bosses are all mode-blocked (grammar/read/builder modes ask no word questions): `dragon`, `owl`, `spider`, `v10_dragon`, `v10_fox`, `v10_owl`, `v10_panda`, `v10_spider`, `v10_turtle`, `v11_heavenknight`, `v11_lightdeer`, `v11_pandamaster`, `v11_phoenix`, `v17_oracle`, `v18_crystal_treant`. Unchanged from V19.0.

### 3. Korean boss XP — one shared XP function, both engines (`src/v46.js`, `src/v18.js`, `src/v19.js`)
- Before (C-R2-1): correct KO answers paid 0 XP while EN paid up to +10 for identical effort, in both engines. First-win (+50 XP/+1 gem v18, +70/+2 v19 fireking) and replay (+10 XP) rewards already worked.
- After: `window.__v46.awardBossAnswerXP(o)` — one rule for both languages, called by `mark18`/`markKO` (v18) and `mark19`/`markKO19` (v19). Rule: **+10** on a counting correct answer (EN: box rose, once per word per 10 min via the shared `xpAt` cooldown; KO: first correct on a card, cooldown key `'ko:'+cardId` in the SAME `xpAt` map EN uses — KO ids are random 10-char strings, no collision risk, and the `ko:` prefix namespaces them); **+5 more** at streak multiples of 5; **0** on wrong (streak resets). KO uses its own streak counter `koStreak` (new optional field on the EN state, defaulted `||0` — no schema change, same pattern as `koStats`). Daily counters and history updated identically to the old code. EN keeps its original inline XP block as a **fallback-only** branch (runs only if `__v46` failed to load); KO falls back to the old behaviour (0 XP) in that case. First-win/replay rewards do NOT go through this function and are unchanged. Note: v18 first-win is PER BOSS (shared across languages); v19 first-win is PER LANGUAGE (pre-existing difference, unchanged).
- Measured in real Chrome 157: v18 KO 8 correct → **+85 XP** (10,10,10,10,15,10,10,10); v19 KO 8 correct → **+85 XP**; KO wrong → **0 XP**, koStreak 0. First-win: v18 EN +50/+1, v18 KO +50/+1; v19 EN +70/+2, v19 KO +70/+2. Replay +10 XP in both languages, both engines.
- EN XP unchanged (proven twice): Node vm seeded fights pristine vs new — identical totals in both engines (§46D); real Chrome seeded fights (seed 46, same fresh state) — byte-identical per-answer sequences pristine vs new: v18 `[10,10,10,10,15,10,10,10]` = 85 XP, v19 `[10,10,10,10,15,0,10,10]` = 75 XP (the 0 is a repeated word inside the fight hitting the 10-min cooldown — same in both builds).
- Bug found and fixed during verification (test46 §46C unit test): the shared function's daily rollover reassigned `o.daily` instead of mutating it in place, which would have orphaned the caller's `en15().daily` object on rollover days (daily counters stuck at 0). Fixed to in-place reset; history was unaffected (it mutates the map object). Rebuilt after the fix (new hash above); the vm suite passes 124/0/8 on the rebuilt build.

## Not changed (deliberately)

- No boss stats, HP, skills, rewards, or fight mechanics. No new bosses, art, words, IPA, or meanings. No new currency or reward. No duplicate rewards.
- No save-schema change, no new localStorage key. `koStreak` is optional with a `||0` default; old saves load it as 0. No migration needed.
- No change to the V18.9 freeze fix, the V45 due-count fix, or any other layer. All old layers intact (v31–v45 present and checked in the ZIP).
- V19.1 (Sentence Forge etc.) is a separate follow-up — not started here.
- The 15 mode-blocked bosses are NOT "fixed" — changing their mode would change fight mechanics, out of scope for a balance change.
- One test-harness finding, not a product bug: the v20 save manager flushes dirty state on `beforeunload`, so a plain `localStorage.clear()` + reload in a test driver re-saves the old state on unload. The Chrome driver (`verify-v46c.js`) now flushes first (`__v20.flush()`, dirty=false), then clears, then reloads, and verifies the save is actually fresh. The product behaviour (flush on close) is intended and unchanged.
- V19.0.1 also ships the V19.0.0 content unchanged (V45 due-count fix, corrupt-save quarantine, snapshot uniqueness, topic-icon guard, weakchip contrast) — see `CHANGELOG_V18_9_to_V19_0.md`.
