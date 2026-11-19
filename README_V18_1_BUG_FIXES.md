# Korean & English Vocab Farm — V18.1 BUG FIXES

**Version 18.1.0 — layer V36 (loads LAST). Base: V18.0 (Skyroot Sanctuary). Date: 2026-11-19.**

V18.1 fixes verified real bugs in the two newest layers (V34/V35) and their integration points — no new features, no new content, no new art, no reward/stat/region-gate changes, no save-schema change, no new localStorage key. Every fix below was verified by reading the exact code and by a test before it was included; anything that could not be verified is listed under "Deliberately NOT fixed" instead of being fixed blind.

## What V18.1 fixes

### SEVERE — V17-2: team-skill lethal blow left the fight unresolved
- **Evidence:** `castSkillInFight()` (`src/v23.js:759-773`) reduces the boss HP but never resolves the fight; `healBoss()` (`src/v19.js:447-450`, `src/v18.js:421-424`) guards only `F.over`, not `hp<=0`, so a later boss heal (rebirth / burn / regen / vampiric / golem P2) resurrects a 0-HP boss — the player could LOSE a fight already won by damage. Only completing all 3 Knowledge Counterattack questions resolved it.
- **Fix:** new `resolveLethal(Ff)` in v18 + v19 (identity check `Ff!==F`, clears the timer + `ultActive`, sets `hp=0, over='win'`, calls `winReward()`, `save18/19()`, `renderFight()`), exported in `__v18._test` / `__v19._test`; `castSkillInFight()` calls it after HP reduction (v19 first, then v18); `healBoss` now also guards `F.hp<=0`. An additive override was provably impossible (callers use closure-local functions); a `pickCorrect` hack would have polluted SRS/stars.
- **Verified:** live V19 fireking fight, pet skill → `over='win'`, HP 0, win recorded, first-win XP exactly the boss reward (70), second cast pays 0; 0-HP + wrong answer does not resurrect; control (HP 100 + wrong) still heals +8. (test36 §172, Chrome gate V36-C.)

### SEVERE — B-36-1: V36's own Break-bar wrapper recursed until the fight renderer crashed
- **Evidence:** found by the V34 probe on the first V18.1 build — the wrapper read the stock bar through `origBar()` = `window.__v34.breakBarHTML` AT CALL TIME, but by then the property IS the wrapper, so every non-blocked boss recursed until "Maximum call stack size exceeded".
- **Fix:** the stock bar is captured ONCE at wrap time into `_orig` and the wrapper calls the captured reference, never the live property (`src/v36.js`). Verified by the probe passing §4 20/0 afterwards and by test36 §F14 (mixed-mode fall-through to the live 1/3 meter).

### MAJOR — V17-1: `bossWinCount()` undercounted flat V18 wins; unicorn/phoenix avatars unreachable
- **Evidence:** `bossWinCount()` (`src/v21.js:111-122`) read only nested V19 records; countable ceiling was 56 (10 en15 + 0 en18 + 46 en19), so unicorn (60) and phoenix (70) avatars could never unlock (dragon 50 was reachable).
- **Fix:** direct replacement at 2 sites (`bossWinCount` + `summarizeSave:160`) with the V33 expression `r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)`; a `{wins:3}`-only record counts once. An additive override was provably ineffective (callers use closure-local bare `stats()`/`summarizeSave()`).
- **Verified:** seeded 10 old + 25 flat + 21 nested = 56, `summarizeSave.bossWins` 56; 70 wins → phoenix reachable. (test36 §171, Chrome gate V36-F.)

### MAJOR — V17-3: Speaking Practice paid double XP (+15 while the UI says +5)
- **Evidence:** `gain15(5)` + `mark15(...)` at `src/v15.js:1122-1123` — a fresh word gained +15 XP while the UI claimed +5. Listen / match controls pass at exactly mark15-only; builder / grammar / read are gain15-only; `speakSelf` is gain15(2)-only — all clean, unchanged.
- **Fix:** direct one-line removal of the `gain15(5)`; the result message now shows the actual XP from `mark15`'s return value (`_sxp36`).
- **Verified:** fresh-word ΔXP === live-measured mark15 return; message shows actual XP; no +15; wrong transcript → 0 XP, 'Chưa khớp'. (test36 §173.)

### MAJOR — F13: abandoned Smart sessions recorded as finished (V34 regression)
- **Evidence:** `endEarly()` (`src/v27.js:564-568`, both branches call `finishSession()`) wrote a full session record; quests completed (`q_clock` done after 9/9 correct when abandoned, +30 XP paid) and the plan bonus paid for unfinished plans (+20 XP; `noteAnswer` marks words done on ANY answer, right or wrong, `v27.js:492`; `claimPlanBonus` key `plan:en:<date>`). The V34 mid-flight guard itself is kept — only the recording is fixed.
- **Fix:** `finishSession(partial)` — a partial record sets `rec.partial=true` and skips the plan bonus, the streak-7 gem, and the `goals.complete` assignment (keeps `acc80`/`weak5` from real answers); `endEarly()` computes done-ness phase-aware (`reask`: `idx>=list.length`; `main`: `idx>=list.length && !reask.length`) and calls `finishSession(!done)`; `findSession` skips `rec.partial` in BOTH `v33.js:227` and `v35.js:217` (v35 has its own identical copy).
- **Verified:** plan built (5 ids), 2 answered, `endEarly` → `rec.partial=true`, no plan bonus, no streak-7 gem; control full session → bonus paid once; quest `q_temple` partial 9/14 → state `'active'`, `findSession` skips it; full quest → `'done'`, claim pays once, 2nd blocked. (test36 §F13, Chrome gate V36-D.)

### MAJOR — F16a: V18 KO fights never read the selected Korean deck
- **Evidence:** `koPool()` (`src/v18.js:279-283`) never reads `S.deck`, and `distractorsKO` is unscoped; V19 shows an unfillable KO meter when the selected deck has <8 cards (falls back to EN questions, `v19.js:365` banner, but KO meter 0/3 shown).
- **Fix:** direct edit mirroring the v19 `koCardsRaw` deck scoping in v18 `koPool`/`distractorsKO` + additive V36 wrapper for the V19 deck<8 case (detectable via `F.pools.ko.length<8`). The true KO-dead condition is the KO POOL (selected deck when it holds ≥8 cards, else all cards) having <8 cards — with a 3-card deck the fight still asks KO questions from all cards and the meter can fill; the wrapper message quotes the pool count ("Bạn mới có N/8 thẻ tiếng Hàn…"), matching the game's own `startFight` banner.
- **Verified:** live v18 KO fight with deck A: KO questions, all 4 distractors from deck A, live meter shown; 3-card deck falls back to all cards, KO questions still asked, NOT blocked; <8 total cards → EN questions + honest '5/8' blocked bar. (test36 §F16a.)

### MINOR — Wind bosses dropped no evolution stones
- **Evidence:** the element→stone map in `winReward()` (`src/v19.js:583`, `src/v18.js:507`) has no `wind` key, so Breeze Lynx granted no stones on first win; `stone_wind` was only buyable (200 XP each). This also fixes the pre-existing V11 wind boss Stormeagle.
- **Fix:** direct replacement adding `wind:'stone_wind'` to the map in both files.
- **Verified:** unicorn control: `stone_light` +2, no `stone_wind`; Breeze Lynx first win after a seeded GEAR GOLEM win → `stone_wind` +2. (test36 §WIND.)

### MINOR — Skyroot pet eggs buyable before the region gate opens
- **Evidence:** the V35 overlay text says the region (bosses, quests, Time Echo/Rift equivalent "and Skyroot pets") is locked until GEAR GOLEM is defeated, but `registerPets()` is unconditional in both V33 and V35 — eggs are buyable while the region is locked. Bosses and quests are properly gated.
- **Fix:** corrected the V35 overlay copy (removed "và thú Skyroot") — the consistent fix, since V33's Chrono overlay lists only bosses/quests/Time Echo/Rift as locked. No gating change.
- **Verified:** overlay text no longer promises locked pets; pet shop behaviour unchanged.

### MINOR — BREAK banner overstates the bonus on shielded bosses
- **Evidence:** the banner quotes the full +50 while the shield halves it to ~+26 (GEAR GOLEM's 90 shield). `breakBonus` itself and the pre-shield placement are correct and unchanged.
- **Fix:** direct banner wording change in `v18.js`/`v19.js` `answer()` (the banner now quotes the post-shield amount).
- **Verified:** `v10_slime` HP 70, def 0, breakBonus 10, base dmg 14; shielded: banner '+5 sát thương!', HP lost 12; unshielded control: banner '+10', HP lost 24. (test36 §F17.)

### MINOR — F-06: Smart overlay (990) below the V15/V20 modals; toasts buried
- **Evidence:** `#v27hub` was z-990 (v27.css), below `.v15modal` (1000) and `.v20modal` (1200); the toast was at 970 (`#v23toast` in v26.css), below Smart.
- **Fix (V36 CSS only):** `#v27hub` → 1600, `#v23toast` → 1700.
- **B-36-2 (found by the Chrome gates):** the `#v23toast` rule alone does NOT fix the live toasts. `#v23toast` is only created by `toast23()` when `__v15.pop15` is unavailable — in the full game pop15 exists, so `#v23toast` never appears. The toasts the user actually sees are `.pp` (V6 pop, z-60, the path `pop15`/`toast23` take) and `.v7toast` (V7 toast, z-95, login gift and V7 flows). Both were still buried under Smart/the hubs. Raised to 1700 in `src/v36.css`, same as `#v23toast`.
- **Verified (Chrome gate V36-A):** Smart computed z-index 1600; `.v15modal` 1000 / `.v20modal` 1200 in the live stylesheets; live `.pp` after `pop15('TEST TOAST 36')` exists with computed z-index 1700; the toast-live screenshot shows the yellow "TEST TOAST 36" text at top 34% (visual grounding point 466,326) above the Smart overlay. `#v21account` (Account Center, z-9998) is intentionally above everything, by design.

### MINOR — F-09: duplicate id `v21email` (11 duplicates)
- **Evidence:** the welcome button (`v21.js:350`) and the email inputs in the login/register/forgot branches (`v21.js:366/:383/:402`) share the id `v21email`.
- **Fix:** direct rename of the button to `v21emailbtn` at `:350` + its binding at `:460`.
- **Verified:** no duplicate ids in the live DOM across boot + welcome + login + register + forgot views; `#v21emailbtn` count 1 on the welcome view, `#v21email` count 1 on the login form. (test36 §F09F10, Chrome gate V36-E.)

### MINOR — F-10: Escape listener accumulates
- **Evidence:** an anonymous `{once:true}` keydown handler at `v21.js:754` is added on every `openAccount()` and never removed on ✕/backdrop close.
- **Fix:** direct named handler `_esc21` + `removeEventListener` in `closeAccount()`; `wireAccount()` defensively removes any existing `_esc21` before re-adding.
- **Verified:** open/close Account Center ×3, keydown handler list returns to 0, Escape dispatch closes it, 2nd Escape is a harmless no-op, reopen + Escape still works once. (test36 §F09F10, Chrome gate V36-E.)

### MINOR — M1: filter-row overflow at 360px
- **Evidence:** the `.v15sel` selects in `.v15filters` had no shrink limit, so a long option list forced the row wider than the viewport.
- **Fix (V36 CSS only):** `.v15learn-head>*{min-width:0}`, `.v15filters{min-width:0;width:100%}`, `.v15filters .v15sel{flex:1 1 140px;min-width:0;max-width:100%}`, `.v17filters .v15sel{max-width:100%;min-width:0}`.
- **Verified:** at 360px the Library/ learn filter row scrollWidth == clientWidth (328 == 328), document scrollWidth == innerWidth (360 == 360). (Chrome gate V36-B.)

### MINOR — M2: six hub controls below 44px touch targets
- **Evidence:** `.v15x` 32px (>640px), `.v15lb-btn` ~33px, `.v15lb-hub` ~31px, `.v15pill` ~30px, `.v15sel` ~35px, `.v15back` ~19px. (Tab buttons were already 44px via v24.css:101 — not touched.)
- **Fix (V36 CSS only):** `min-height:44px` on all six (`.v15x` also gets `min-width:44px`).
- **Verified:** all six measure exactly 44px in the live layout (learn view: `.v15x`/`.v15pill`/`.v15sel`; mode header: `.v15back`; library view: `.v15lb-btn`/`.v15lb-hub`). (Chrome gate V36-B.)

### MINOR — V17-4: typo "NGHỀNGHIỆP"
- **Evidence:** 54 occurrences in each of 4 copies: `src/v17_a1a2.js`, `data/v17_a1a2.json`, `out/v17_a1a2.js`, inlined `index.html` v17data block (JOBS topic label).
- **Fix:** build-time replacement (54× in all 4 files) + this changelog line. Not a runtime patch.
- **Verified:** 0 occurrences remain in the built file; 54× fixed in each of the 4 files. (test36 §0.)

### V36 wrapper — blocked Break meter (mode-blocked + KO-deck<8 bosses)
- **Evidence:** 15 grammar/read/builder-only bosses show a 0/3 Break meter that can never fill (`breakDmg` needs `cur.w`, never set for those modes): V15 dragon/spider/owl; V18 v10_dragon/v10_spider/v10_panda/v10_turtle; V19 v11_phoenix/v11_heavenknight/v11_lightdeer/v11_pandamaster; V33 v17_oracle; V35 v18_crystal_treant; plus v10_owl (read) and v10_fox (grammar) — the V17.1 "exactly 13" list missed them. No table change (the weakness table is a pending design decision for Anh).
- **Fix:** additive V36 wrapper on `__v34.breakBarHTML` (mode in grammar/read/builder → honest blocked message; KO `F.pools.ko.length<8` → honest blocked message quoting the pool count). The wrapper reads `F.boss.mode`, so it catches all 15 without a list. The original bar is saved as `__v34._breakBarHTML_orig`; `wrapped` flag exposed on `__v36`.
- **Verified:** computed mode-blocked set exactly the 15, pool-blocked exactly the 13 (see below); fillable controls clean; mixed-mode falls through to the live 1/3 meter; live `v10_owl` fight shows the honest blocked bar; live slime NOT scope-blocked. (test36 §F14.)

### Corrected counts — the V17.1 "exactly 12 unfillable" list was wrong
- **Evidence:** the V34 probe's `poolOf` model dropped the diff filter for Oxford bosses (`tools/v34/probe_v34.js:328`); the real pool for `v10_owl` is Oxford ∩ B1 = 149 words, 0 clothes matches.
- **True counts (verified by the fixed probe and by test36): pool-blocked = 13** (`v10_dict`, `v10_fairy`, `v10_fox`, `v10_king`, `v10_octopus`, `v10_owl`, `v10_tiger`, `v10_wizard`, `v11_goldephant`, `v11_golem`, `v11_seadragon`, `v11_sharkking`, `v11_timemachine`); **mode-blocked = 15** (see above); overlap is only `v10_fox` + `v10_owl` → **distinct blocked = 26 of 86; 60 fill normally**.
- **Fix:** doc/count correction + probe model fix only (the probe now applies the diff filter; its expected list is 12 → 13 with an explanatory comment). No product-code change — in-game behaviour was already correct (honest blocked message). The weakness TABLE itself is unchanged (pending design decision for Anh).

## Deliberately NOT fixed (with reasons)

- **Farm harvest +35 XP vs claimed +25** (`v15.js:1236-1239`, `mark15` + `gain15(25)`): may be intentional harvest-reward design (the +25 harvest reward stacking on the SRS award). Needs Anh's decision — do NOT silently remove.
- **bubble.png / shop.png icons** (F-04, 2 of 4): need Anh's art words. (flame.svg / moon.svg ARE fixed — those files exist in `assets/icons/v6/`.)
- **Weakness TABLE** (13 pool-blocked + 15 mode-blocked = 26 distinct blocked of 86): design decision for Anh, unanswered. Only the list/count and the probe were corrected; the table is unchanged.
- **`legDiff()` counts-getter bug** (pre-existing, `V15().counts()` is a getter, not a function, `v18.js:244` — Legendary pools always `['A2','B1']`): out of scope — fixing it would change Legendary difficulty.
- **V20-modal stacking trap** (accepted known behaviour): `.v20modal` lives inside the `.v15hub` z-950 stacking context, so it still renders below `#v27hub` even at 1200; reachable by closing Smart first. Moving the node is structural, not a bug fix.
- **F-05 / F-07 observers** (3 permanent body-level MutationObservers + observer lifecycle): out of scope; need live perf measurement.
- **F-12 resetEN scope** (EN reset: vocabulary/SRS only vs also wipe Smart Learning): needs Anh's decision.
- **`v10_owl` pool-blocked status**: doc/probe fix only — in-game behaviour already correct (honest blocked message).

## What V18.1 does NOT change
- No region-open condition, reward, or boss stat changed. No new currency, no energy system, no new localStorage key, no schema/key rename, no migration. No feature removed. No UI is fake. No vocabulary/IPA/meaning invented. `firebase-config.js` untouched (the ZIP ships the placeholder; the repo's real config is never touched).
- The 20 V18.0 PNG assets (`assets/bosses/v18/` + `assets/pets/v18/`) are NOT part of this release — they are still awaiting Anh's push-route choice.

## Tests
- `tools/v36/test36.js` (Node vm, no Chrome needed): **172 PASS / 0 FAIL / 8 SKIP (of 180) ×4 runs** (3 required + 1 confirmation, identical). The 8 skips are Chrome-only gates. Covers: build hash, all fixes above (live fights, live sessions, live DOM), V17.0/V18.0 regression (Chrono gate 70, Skyroot gate, BREAK clamp, V31/V35 fragments), save schema (no new localStorage key — keys seen: `hanvocab.v1`, `hanvocab.v11-backup`, `hanvocab.v13.guestid`).
- `tools/v36/verify-v36c.js` (real Chrome 157, CDP): gates V36-A–G all PASS, **0 console errors, 0 warnings, 0 dialogs**. F-06 layering (Smart 1600 above modals, toasts 1700 above Smart — live `.pp` z-index 1700 + toast-live screenshot, visual grounding point 466,326), M1 360px no overflow, M2 six controls 44px, V17-2 live lethal-skill fight, F13 live partial session, F09 no duplicate ids + F10 Escape, V17-1 avatar thresholds, V17-3 speak mode renders, V18.0 regression spot-check.
- Build history: runs 1–5 failed on pre-pass/verification asserts (each caught by the script's own checks; the tree was restored from `tools/v36/backup-v18.0/` and the base hash re-verified before re-running); run 6 succeeded; run 7 corrected the KO message wording; run 8 fixed B-36-1; **run 9 (final) fixed B-36-2** — `out/index.html` sha256 `eabcccc2e4b8b86eeca807698cd0a3d5575b267bec03ff395de080da9d082a39`, 2,358,811 B.
- **Not tested:** live Firebase (code complete, never tested against a real project — Anh must run the FIREBASE_SETUP.md live checklist), real phone / touch / Safari, speech by ear, first-open with an existing player save.

## How to use (GitHub Pages)
Unzip and deploy the contents to GitHub Pages exactly as V18.0 (see `GITHUB_DESKTOP_GUIDE.md`). Player data is preserved: the save key is still `hanvocab.v1`, and V18.1 is an additive layer — existing XP, gems, bosses, pets, SRS and Smart Learning progress load unchanged.
