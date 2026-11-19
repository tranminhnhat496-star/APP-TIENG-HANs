# Changelog — V18.0 → V18.1 (Bug Fixes)

**V18.1.0 — layer V36 (loads LAST). Base: V18.0 (Skyroot Sanctuary). Date: 2026-11-19.**

Bug-fix release only: no new features, no new content, no new art, no reward/stat/region-gate changes, no save-schema change, no new localStorage key. All fixes were verified by reading the exact code and by a test (`tools/v36/test36.js` + `tools/v36/verify-v36c.js`) before inclusion.

## The 30 build replacements (`build_v36.py`)

### V21 — boss-win counting (2)
- `R-V171-A`: `bossWinCount()` (`v21.js:111-122`) now counts flat V18 wins with the V33 expression `r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)` (V17-1; countable ceiling was 56, unicorn 60 / phoenix 70 unreachable).
- `R-V171-B`: same expression in `summarizeSave()` (`v21.js:160`).

### V15 — Speaking double-pay (1)
- `R-V173-SPEAK`: `speak` removes the `gain15(5)` at `v15.js:1122-1123`; the result message now shows the actual XP from `mark15`'s return value (`_sxp36`). (V17-3; was +15 XP while the UI said +5.)

### V18 / V19 — wind evolution stones (2)
- `R-WIND-18` / `R-WIND-19`: the element→stone map in `winReward()` gains `wind:'stone_wind'` (Breeze Lynx — and the V11 wind boss Stormeagle — dropped no stones on first win).

### V21 — duplicate id + Escape listener (4)
- `R-F09A`: the welcome button id `v21email` → `v21emailbtn` (`v21.js:350`); `R-F09B`: its binding at `:460`. (F-09; the button collided with the email inputs at `:366/:383/:402`.)
- `R-F10A`: the anonymous `{once:true}` Escape handler at `v21.js:754` becomes the named handler `_esc21`; `R-F10B`: `closeAccount()` (`v21.js:740`) removes it, and `wireAccount()` defensively removes any existing `_esc21` before re-adding. (F-10.)

### V12 / V14 — live icon 404s (2, OUT_ONLY — src/ has no v12.js/v14.js)
- `R-F04A`: `v14.js:295` `enIcon('flame.png')` → `'flame.svg'` (the file exists in `assets/icons/v6/`).
- `R-F04B`: `v12.js` `icon:'moon.png'` → `'moon.svg'` (same). (F-04; bubble.png/shop.png NOT fixed — they need Anh's art words.)

### V35 — overlay copy (1)
- `R-V35COPY`: the Skyroot locked overlay no longer claims the pets are locked ("và thú Skyroot" removed) — `registerPets()` is unconditional in V33/V35, so eggs are buyable before the gate opens; bosses/quests are properly gated. Copy fix, not a gating change.

### V27 / V33 / V35 — abandoned sessions recorded as finished (7)
- `R-F13A`: `finishSession(partial)` (`v27.js:521`) — a partial record sets `rec.partial=true` and skips the plan bonus, the streak-7 gem, and the `goals.complete` assignment (keeps `acc80`/`weak5` from real answers).
- `R-F13B`: `endEarly()` (`v27.js:564-568`) computes done-ness phase-aware (`reask`: `idx>=list.length`; `main`: `idx>=list.length && !reask.length`) and calls `finishSession(!done)`.
- `R-F13C` / `R-F13D` / `R-F13E`: the plan-bonus, streak-gem and goals-complete blocks in `finishSession()` are skipped when `partial` is true.
- `R-F13F` (`v33.js:227`) / `R-F13G` (`v35.js:217`): `findSession` skips `rec.partial` records (v35 has its own identical copy). (F13; the V34 mid-flight guard itself is kept.)

### V18 / V19 / V23 — lethal team skill leaves the fight unresolved (7)
- `R-V172A` (`v19.js`) / `R-V172C` (`v18.js`): new `resolveLethal(Ff)` — identity check `Ff!==F`, clears the timer + `ultActive` (v19), sets `hp=0, over='win'`, calls `winReward()`, `save18/19()`, `renderFight()`; exported in `__v18._test` / `__v19._test`.
- `R-V172B` (`v19.js`) / `R-V172D` (`v18.js`): `resolveLethal` omits the `ultActive` line in v18 (v18 has no `ultActive`) and uses `save18()`; v18's `close()` sets `F=null` (stale `_fightF` safe via identity check).
- `R-V172E` (`v23.js`): `castSkillInFight()` calls the resolver after HP reduction (v19 first, then v18).
- `R-V172F` (`v18.js`) / `R-V172G` (`v19.js`): `healBoss` now also guards `F.hp<=0` (a boss heal could resurrect a 0-HP boss and make the player LOSE a fight already won by damage). (V17-2.)

### V18 — KO pool never reads the selected deck (2)
- `R-F16A1` / `R-F16A2`: `koPool()` / `distractorsKO` (`v18.js:279-288`) mirror the v19 `koCardsRaw` deck scoping — the selected deck is used when it holds ≥8 cards, else all cards. (F16a; the V19 deck<8 case is handled by the V36 wrapper, not a replacement.)

### V18 / V19 — BREAK banner overstates the bonus on shielded bosses (2)
- `R-F17A` (`v18.js`) / `R-F17B` (`v19.js`): the `answer()` BREAK banner now quotes the post-shield amount (was the full pre-shield +50 while the shield halved it to ~+26 on GEAR GOLEM). `breakBonus` and the pre-shield placement are unchanged. (F17.)

## The V36 layer itself (`src/v36.js` / `src/v36.css`, loads LAST)
- **Break-bar wrapper** (`v36.js`): wraps `__v34.breakBarHTML` in place (original saved as `__v34._breakBarHTML_orig`, `wrapped` flag on `__v36`). Mode-blocked bosses (grammar/read/builder — 15 of 86) and KO-pool<8 fights get an honest blocked message instead of a 0/3 meter that can never fill. No weakness-table change.
- **B-36-1 (SEVERE, found by the V34 probe on the first V18.1 build):** the wrapper originally read the stock bar through `origBar()` = `window.__v34.breakBarHTML` AT CALL TIME — but by then the property IS the wrapper, so every non-blocked boss recursed until "Maximum call stack size exceeded" and the fight renderer crashed. Fixed by capturing the stock bar ONCE at wrap time into `_orig`.
- **F-06 (CSS):** `#v27hub` 990 → **1600** (above `.v15modal` 1000 / `.v20modal` 1200); `#v23toast` 970 → **1700**.
- **B-36-2 (found by the Chrome gates):** the `#v23toast` rule alone does not fix the live toasts — `#v23toast` is only created when `pop15` is unavailable, which never happens in the full game. The live toasts are `.pp` (V6 pop, z-60, the `pop15`/`toast23` path) and `.v7toast` (V7 toast, z-95). Both raised to **1700** in `v36.css`. (B-36-3, a driver bug in `verify-v36c.js` `shot()` that wrote PNGs through a UTF-8 re-encode and corrupted them, was also fixed — test tooling only, not the game.)
- **M1 (CSS):** `.v15filters` shrink/wrap rules — the filter row no longer overflows at 360px.
- **M2 (CSS):** `min-height:44px` on `.v15x`, `.v15lb-btn`, `.v15lb-hub`, `.v15pill`, `.v15learn-head .v15sel`, `.v15back` (`.v15x` also `min-width:44px`).
- **Blocked-bar style** scoped as `.v34bar.v34blocked` (not bare `.v34blocked` — v34.js:191 already uses that class on its own out-of-scope label).

## Data / doc fixes (build-time, not runtime)
- **V17-4 typo:** `NGHỀNGHIỆP` → `NGHỀ NGHIỆP`, 54 occurrences in each of 4 files (`src/v17_a1a2.js`, `data/v17_a1a2.json`, `out/v17_a1a2.js`, inlined `index.html` v17data block). 0 occurrences remain.
- **V34 probe-model fix** (`tools/v34/probe_v34.js`, mirrored to `out/`): the Oxford branch of `poolOf()` now applies the same diff filter the real `wordPool` applies. Its expected unfillable list is corrected 12 → **13** (adds `v10_owl`; real pool = Oxford ∩ B1 = 149 words, 0 clothes matches). In-game behaviour was already correct — doc/probe fix only.
- **Corrected weakness counts:** pool-blocked **13**, mode-blocked **15**, overlap `v10_fox` + `v10_owl` → distinct blocked **26 of 86** (60 fill normally). The V17.1 "exactly 12 unfillable" claim was wrong. The weakness TABLE is unchanged (pending design decision for Anh).

## Deliberately NOT fixed
- Farm harvest +35 XP vs claimed +25 (`v15.js:1236-1239`) — may be intentional harvest-reward design; needs Anh's decision.
- bubble.png / shop.png icons (F-04) — need Anh's art words.
- Weakness table (26 blocked of 86) — design decision for Anh.
- `legDiff()` counts-getter bug (`v18.js:244`, pre-existing) — would change Legendary difficulty.
- V20-modal stacking trap (`.v20modal` inside the `.v15hub` z-950 stacking context) — accepted known behaviour; reachable by closing Smart first.
- F-05 / F-07 observers — need live perf measurement.
- F-12 resetEN scope — needs Anh's decision.

## Build
- Base verified before building: V18.0 `out/index.html` sha256 `eb7dcbdda825519ec597bb84d4e39e51be6b4be41bbfbe3fd66cc18d78a95568`, 2,347,000 B. `build_v36.py` gates on that hash and refuses if the V36 layer is already present; it backs up every file it touches into `tools/v36/backup-v18.0/` first.
- Runs 1–5 failed on pre-pass/verification asserts (each caught by the script's own checks; the tree was restored from the backup and the base hash re-verified before re-running); run 6 succeeded; run 7 corrected the KO message wording; run 8 fixed B-36-1; **run 9 (final) fixed B-36-2**.
- Final `out/index.html` sha256 `eabcccc2e4b8b86eeca807698cd0a3d5575b267bec03ff395de080da9d082a39`, **2,358,811 B**; title `Korean & English Vocab Farm V18.1 — Bug Fixes — …`; layer V36 injected last (styles + scripts); `v36js` after `v35js`.
- Tests: `tools/v36/test36.js` **172 PASS / 0 FAIL / 8 SKIP (of 180) ×4 runs**; `tools/v36/verify-v36c.js` (real Chrome 157) gates V36-A–G all PASS, 0 console errors, 0 warnings, 0 dialogs.
- **Not tested:** live Firebase, real phone / touch / Safari, speech by ear, first-open with an existing player save.
