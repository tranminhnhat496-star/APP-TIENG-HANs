# Korean & English Vocab Farm — V19.0.1 Legendary Difficulty + Korean Boss XP

**Version 19.0.1 — layer V46 (loads LAST). Base: V19.0 (layer V45, 19.0.0). Date: 2026-11-21.**

V19.0.1 is a **balance** build, not a bug-fix round — directed by Claude (all three decisions "DO", 2026-11-21 09:40) and built on top of V19.0. It makes two gameplay changes that were previously broken or unfair: Legendary difficulty now really scales with the player's mastered-word count, and correct Korean answers in boss fights now pay XP on the same schedule as English. Both changes were reproduced first on the pristine V19.0 base (Node vm `tools/v46/repro-v46.js`: legDiff always `['A2','B1']` at mastered 700, KO correct answers pay 0 XP in both engines; Chrome driver `tools/v46/verify-v46c.js` on pristine: **23/52 PASS**, every fix gate FAILing as expected), then verified after the change.

**Honest testing note:** verified by `build_v46.py` (base-hash gate on the V19.0 hash `d5fb0ddc…`, exact-match anchors, marker order, `node --check`), by the vm suite `test46.js` (**124 PASS / 0 FAIL / 8 SKIP, ×2 runs** on the final built `out/`, including a before/after EN-XP proof against the pristine V19.0 build) and by real-Chrome gates `verify-v46c.js` (**52/52 PASS, ×2 runs**, 0 console errors/warnings/dialogs) in Chrome 157. Anh's real-phone test remains the final word for layout and touch. Firebase login/sync is untested live, as in every version — run `FIREBASE_SETUP.md`.

## Gameplay impact — read this first

- **Legendary Boss Arena gets harder as you learn (this is the arena card's promise, now true).** Before, every Legendary fight drew from the same 550 A2+B1 words no matter how much you had mastered. Now: **<200 mastered words → A2+B1 (550 words, unchanged)**; **200–599 → B1-only (250 words)**; **≥600 → B2-only (630 words)**. If you have already mastered ≥200 words, Legendary questions will be noticeably harder the next time you fight — that is the intended change, not a regression. Grammar pools follow the same bands (24 → 12 → 12 questions).
- **Korean boss answers now pay XP.** A correct Korean answer in a boss fight now pays the same as an English one (+10 first time on a card, +5 more every 5th correct in a row). Before, it paid 0 while English paid up to +10 for identical effort. Your existing XP is untouched; future KO fights simply earn more.
- **Blocked bosses go down, not up: 26 → 15.** The weakness redesign (below) means no boss is pool-blocked any more. The 15 remaining blocked bosses are all **mode-blocked by design** (grammar/reading/builder modes — those fights ask no word questions, so the weakness meter can never fill). Their fights still run; only the Break meter is unreachable.
- Nothing else changes: no boss stats, HP, skills, rewards, or fight mechanics; no new bosses, art, words, or currencies; no save-schema change; no new localStorage key. First-win (+50 XP/+1 gem v18, +70/+2 v19 fireking) and replay (+10 XP) rewards are unchanged.

## What V19.0.1 changes

### 1. Legendary difficulty scaling (legDiff) — the read is fixed, thresholds unchanged

Root cause (confirmed in source): `legDiff()` (`src/v18.js:254`) read `V15().counts().mastered`, but `V15().counts` is a **getter** (`src/v15.js:1787`), so the call threw `TypeError`, the `try/catch` swallowed it, `m` stayed 0, and `legDiff()` ALWAYS returned `['A2','B1']`. Legendary difficulty never scaled despite the arena card promising "Độ khó câu hỏi tăng theo tiến trình học của bạn".

Fix (`src/v18.js`): read the getter WITHOUT calling it — `V15().counts.mastered`, with a type check (`typeof c.mastered==='number'`); thresholds EXACTLY unchanged (`<200 → ['A2','B1']`, `<600 → ['B1']`, else `['B2']`); the error-swallowing `try/catch` is replaced with a `console.warn('[V46 legDiff] mastered read failed, falling back to A2/B1:', …)` plus a logged fallback to `['A2','B1']` — a failure is now visible, never silent. The V44 hoist (called once per pool build in `wordPool()`/`grammarPool()`) is preserved, so the V18.9 freeze fix still holds: Legendary fight start **8.8 ms** at mastered 600 in real Chrome (was 3,679.5 ms before V18.9).

Measured in real Chrome 157 (live fights, exact level lists + counts): mastered 0 → A2 300 + B1 250 (550 words); 199 → same; **200 → B1-only 250**; 599 → B1-only 250; **600 → B2-only 630**; 700 → B2-only 630. Grammar pools: 24 (A2 12 + B1 12) → 12 (B1) → 12 (B2). Full Legendary fights to wins at mastered 200 (10 steps, +215 XP) and 600 (10 steps, +215 XP), real UI start ("Khiêu chiến" + Tiếng Anh) 21.9/5.6 ms.

### 2. Weakness-table redesign — same version, derived from real data

Fixing legDiff alone would have grown the blocked-boss count 26 → 36 (the extra 10 being exactly the Legendary bosses, whose old weaknesses — clothes-and-accessories for B1, fruit-and-vegetables for B2 — have no B1/B2 words in the A1–A2 topic pool). So the weakness table was redesigned in the SAME version, from the real word data (which topics have B1/B2 words) — no words, IPA, or meanings invented.

Rule: a boss's weakness must be a topic that has words in EVERY band its pool can draw from. Only 4 A1–A2 topics have words at all three Legendary bands (B1-only and B2-only counts in brackets): **education (19/13), nature (20/14), travel (17/12), emotions-and-feelings (7/7)**. All 23 redesigned weaknesses use only these four topics (`src/v46_data.js`, `window.__V46_DATA.weakExplicit`; `src/v34.js` `weakFor` consults it first, after the KO-deck rule, before the v34/v35 tables). The other 63 bosses' weaknesses are byte-identical to V19.0.

| Bosses | Old weakness | New weakness |
|---|---|---|
| `v10_firedragon` | clothes-and-accessories (B1) | emotions-and-feelings |
| `v10_icewolf` | clothes-and-accessories (B1) | travel |
| `v10_thunderlion` | fruit-and-vegetables (B2) | education |
| `v10_seaoctopus` | fruit-and-vegetables (B2) | nature |
| `v10_titan` | fruit-and-vegetables (B2) | travel |
| `v10_phoenix` | fruit-and-vegetables (B2) | emotions-and-feelings |
| `v10_voidghost` | fruit-and-vegetables (B2) | emotions-and-feelings |
| `v10_godturtle` | fruit-and-vegetables (B2) | nature |
| `v10_ninetails` | fruit-and-vegetables (B2) | travel |
| `v10_ancienttree` | fruit-and-vegetables (B2) | nature |
| `v11_seadragon`, `v11_sharkking` (zone 6, B2) | animals (via zoneWeak) | nature |
| `v11_timemachine`, `v11_golem`, `v11_goldephant` (zone 8, B2) | vehicles (via zoneWeak) | travel |
| `v10_owl`, `v10_wizard`, `v10_fox`, `v10_dict` | clothes / fruit (via diffWeak/elWeak) | education |
| `v10_tiger`, `v10_king` | clothes / fruit (via diffWeak) | travel |
| `v10_octopus`, `v10_fairy` | food-and-drinks / fruit (via elWeak/diffWeak) | nature |

Result (recomputed live, all 86 bosses, at mastered 0/200/600/700): **pool-blocked 0** (was 13, would-be 23 with legDiff alone), **distinct blocked 15** (mode only, was 26). Weakness-meter fillability verified in real Chrome: previously pool-blocked `v10_dict` (EN, B2) fills to 3/3 and BREAK fires (11 weakness hits in 40 answers, weakness "Giáo dục"); Legendary `v10_firedragon` fills + BREAKs at mastered 200 (6 hits) and 600 (10 hits), weakness "Cảm xúc". Mode-blocked `v10_owl` (read mode) still asks no word questions — the meter is unreachable by design, and the fight still runs.

### 3. Korean boss XP (C-R2-1) — one shared XP function for both languages

Correct KO answers paid 0 XP while EN paid up to +10 (box-up + streak) for identical effort, in BOTH engines (`v18 markKO` vs `mark18`; `v19 markKO19` vs `mark19`). First-win and replay rewards already worked and are unchanged.

Fix: one shared function, `window.__v46.awardBossAnswerXP(o)` (`src/v46.js`, version 19.0.1), called by all four mark functions (`mark18`/`markKO` in `src/v18.js`, `mark19`/`markKO19` in `src/v19.js`). The rule, identical for both languages: **+10** on a correct answer that counts (EN: the word's box rose, once per word per 10 min via the shared `xpAt` cooldown; KO: first correct on a card, cooldown key `'ko:'+cardId` in the SAME `xpAt` map EN uses — KO card ids are random 10-char strings and cannot collide with EN word ids, and the `ko:` prefix namespaces them anyway); **+5 more** when the streak hits a multiple of 5; **0** on a wrong answer (and the streak resets). KO has no SRS box, so a correct KO answer counts as a box-up; KO uses its own streak counter `koStreak` (new optional field on the EN state, defaulted `||0` — no save-schema change, same pattern as `koStats`). Daily counters (`daily.correct/wrong/xp`) and history (`hist`) are updated identically to the old code. EN keeps its original inline XP block as a **fallback-only** branch that runs only if `__v46` failed to load; KO falls back to the old behaviour (0 XP) in that case.

Measured (real Chrome 157, live fights): v18 KO 8 correct → **+85 XP** (per-answer rule holds on all 8: 10,10,10,10,15,10,10,10 — the +5 lands on the 5th answer); v19 KO 8 correct → **+85 XP**; KO wrong answers → **0 XP**, koStreak stays 0. First-win: v18 EN +50 XP/+1 gem, v18 KO +50/+1 (same); v19 EN +70/+2, v19 KO +70/+2 (same). Replay: +10 XP in both languages, both engines.

EN XP is unchanged — proven two ways: (a) Node vm seeded fights on pristine V19.0 vs V19.0.1 give identical totals in both engines (§46D: the seeded 8-answer v18 and v19 fight deltas match exactly, pristine vs new); (b) real Chrome seeded fights (same seed 46, same fresh state) give **byte-identical per-answer sequences** on pristine vs new: v18 `[10,10,10,10,15,10,10,10]` = 85 XP, v19 `[10,10,10,10,15,0,10,10]` = 75 XP (the 0 is a repeated word inside the fight hitting the 10-min cooldown — same in both builds).

## Not changed (deliberately)

- No boss stats, HP, skills, rewards, or fight mechanics — only weakness topics and the legDiff read.
- No new bosses, art, words, IPA, or meanings. No new currency or reward. No duplicate rewards: first-win/replay do NOT go through the shared per-answer function.
- No save-schema change, no new localStorage key. `koStreak` is an optional field with a `||0` default; old saves load it as 0. No migration needed.
- No change to the V18.9 freeze fix (legDiff still hoisted once per pool build), the V45 due-count fix, or any other layer. All old layers intact (v31–v45 present and checked in the ZIP).
- V19.1 (Sentence Forge etc.) is a separate follow-up — not started here.
- The 15 mode-blocked bosses are NOT "fixed" — their modes (grammar/read/builder) ask no word questions by design, so their weakness meters cannot fill. Changing their mode would change fight mechanics, which is out of scope for a balance change. Their fights still run and pay XP normally.
- One test-harness finding, not a product bug: the v20 save manager flushes dirty state on `beforeunload`, so a plain `localStorage.clear()` + reload in a test driver re-saves the old state on unload. The Chrome driver (`verify-v46c.js`) now flushes first (`__v20.flush()`, dirty=false), then clears, then reloads, and verifies the save is actually fresh. The product behaviour (flush on close) is intended and unchanged.
