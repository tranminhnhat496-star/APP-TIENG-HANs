# Changelog — V16.4 → V17.0 CHRONO KINGDOM

**Version 17.0.0 — layer V33 (loads LAST). Date: 2026-11-19.**
**Base: pristine V16.4** (`out/index.html` sha256
`c3639bc7cec58d10125fa0c5bada0d3ed04c9bfe23a6581fec8b40b2e54fda0a`,
2,068,255 B, layers through V32). V28/V29/V30 never landed — V33 is
the first layer after V32. Build: `build_v33.py` (gates on the V16.4
hash, refuses if v33 markers exist). Package: `package_v33.py` →
`Korean_English_Vocab_Farm_V17_0_Chrono_Kingdom.zip`.

**17.0.0 is taken from the unshipped V30 Vocabulary World draft**
(design doc `v17-design.md`, never shipped, kept as reference — NOT
deleted). This build takes the number for CHRONO KINGDOM.

No save migration. Same `hanvocab.v1` key. No schema/key renamed.
One new lazy key `S.v7.en33` (created on first Chrono use; no
migration). No new currency, no energy system, no outfit system.
Firebase config in the ZIP is the placeholder (the repo's real config
was never touched).

## Added — Chrono Kingdom region (layer V33)
- New layer V33 (`src/v33.js` + `src/v33.css` + `src/v33_data.js`,
  `window.__v33`, version 17.0.0, injected LAST before `</body>`).
- `__v33` public API: `openChrono`, `closeChrono`, `setLang`,
  `en33`, `gateOpen`, `correctedWinCount`, `winBreakdown`,
  `bossUnlocked`, `fightBoss`, `isWon`, `stars`, `claimRegion`,
  `regionWon`, `startQuest`, `claimQuest`, `questState`,
  `checkCompletions`, `echoList`, `startEcho`, `startRift`,
  `claimRift`, `riftUnlocked`, `attachChrono`, `registerPets`,
  `openPetShop`, plus `_test` probes (same names + `overlayHTML`,
  `riftRewardFor`, `findSession`, `CHRONO_IDS`, `GATE_TOTAL`).
- **70-win gate:** `GATE_TOTAL=70`; `correctedWinCount()` counts
  en15 `bosses` keys + en18 bosses with a flat `{win}`/`{wins}` or a
  nested `en`/`ko` win + en19 bosses with a nested `en`/`ko` win
  (each boss counted once). The global `bossWinCount()` still
  undercounts flat V18 wins and was deliberately NOT changed — the
  correction is V33-local. Locked overlay shows real `x/70` +
  breakdown (en15/10, en18/30, en19/30). Bosses unlock sequentially
  per language inside the region.
- **Entry:** English Hub — MutationObserver decorator adds one
  `⏳ Chrono Kingdom` button to the hub header (`.v15hub-headbtns`)
  and one to the language bar (`#v15langbar .v15lb-in`), guarded +
  idempotent; Korean Hub — build-time button `v33kotab` appended
  after `v27kotab` (strip ONLY the trailing `';'`).
  Overlay `#v33hub`, z-index 1500, `--ui-*` tokens, WCAG AA, 44 px
  targets, no overflow at 360–430 px.
- **8 bosses** (`__V33_DATA.bosses`, ids `v17_*`, zone `'chrono'`,
  lang `'both'`, diff B2, lv 61–68, hp 620–750, def 7–8, rewards
  +165…+220 XP / +4…+6 💎; Titan carries “Kẻ Vượt Thời Gian”,
  Golem carries “Vua Thời Gian”). Elements mapped onto the V19
  element list only; skills only from the V19 palette (elem
  burn/freeze/chain/veil/cleanse/regen/heal/gale/shield/rift; tact
  tshield/theal/ttimer/tveil/tenrage; pass
  bulwark/vampiric/swift/thorns). Boss art: 8 PNGs in
  `assets/bosses/v17/`.
- **GEAR GOLEM (final boss) mechanics** — real guarded code in
  `v19.js`, not display text: 90-HP gear shield at fight start
  (`R-V33-V19-SHIELD`); 2 phases only, no P3 Knowledge
  Counterattack (`R-V33-V19-PHASE`); time-reversal heal +10 HP on
  every wrong answer in phase 2 (`R-V33-V19-HEAL`); phase text
  renders `/2` for the golem (`R-V33-V19-PHASETXT`).
- Boss wins stay in `en19` (the V19 UCE `winReward` path);
  sequential unlock inside Chrono is enforced by `__v33.bossUnlocked`
  (called from the v19 replacement for zone `'chrono'`). Region
  completion reward is V33's own: +150 XP, +5 💎, title
  “Chúa Tể Thời Gian” into `en19.titles`, claimed-guarded in
  `en33.regionClaimed` (once per language).
- **240 words** (`__V33_WORDS` / `data/v33_words.json`, 4 sets × 60:
  time / space / machines / change; ids `v33_<slug>`, lib `'chrono'`,
  lv B2; every word has en/ko/vi/ipa/pos/ex/exvi). Merged into the
  shared `WORDS` array by the V33 block inside `buildWords()` (BT
  precedent). The one overlap (`alarm clock`) keeps its original id
  and gains the `chrono` library tag. No `S.cards` entries created.
  Validated by `tools/v33/validate_words.py`: 0 internal dupes, 0
  overlaps vs all 4,891 existing headwords (incl. 306 BT phrases),
  0 blanks.
- **6 story quests** via the V27 engine: ONE guarded replacement
  exports `startSession` on `__v27` (`R-V33-V27-EXP`); quests call
  `__v27.startSession('en', ids, 'quest')`. Completion detection
  scans ALL en27 session records (`findSession`: words cover the
  quest ids, `rec.t >= startedAt`, accuracy ≥ 0.8 — `QUEST_MIN_ACC`).
  Rewards claimed-guarded in `en33.quests`: first clear +20 XP,
  ≥ 90% +10 XP, +1 💎 on Final Countdown only. Quest word lists are
  fixed index slices (see README).
- **Time Echo:** up to 10 words with `en27.en.cw >= 1`, most-wrong
  first, via `startSession('en', ids, 'echo')`; honest empty state
  (“Chưa có từ nào trả lời sai”); no extra bonus (the session pays
  via `mark15`).
- **Chrono Rift:** 3 floors × 7 questions (f1 time 28–34, f2 space
  18–24, f3 machines 22–28 — disjoint from all quest ids), one V27
  session per floor (`kind: 'rift'`); floor N+1 unlocks only if floor
  N accuracy ≥ 0.7; rewards accuracy-scaled once/day/floor in
  `en33.rift` (≥ 0.9 → +40 XP/+2 💎; ≥ 0.7 → +25/+1; else +10 XP).
- **3 pet species × 3 stages + 3 eggs** (Star Deer nature
  wisdom/heal, Gear Beetle thunder shield/crystal, Cosmic Unicorn
  light storm/dmg; eggs star 1200/120 min, gear 1000/120 min,
  cosmic 2000/240 min), registered into live `__V23_DATA` guarded
  + idempotent. Evolution via existing stones/costs. Collection
  ladder extended with a 45-form milestone (+60 💎, title “Bậc Thầy
  Thời Gian”) because the ladder topped out at 36. Pet art lives
  ONLY under `assets/pets/v15/chrono/` + `assets/pets/v15/eggs/`
  (MOVE decision — `v23.js` hardcodes those prefixes; no
  `assets/pets/v17/`, no duplicate bytes in the ZIP).
- **Save `S.v7.en33`** (lazy, no migration):
  `{bosses:{}, quests:{qid:{done,claimed,acc,at}}, rift:{day,best:{},
  claimed:{}}, regionClaimed:{en,ko}, pending:{}, created}`.
  Merge branch + `hasProgress` entry in `v20_sync.js` (see Changed).

## Changed — the 13 build replacements (`build_v33.py`)
- `R-V33-V19-FIGHT`: `fight()` falls through to
  `__V33_DATA.byId(id)` when `D19().byId(id)` is null.
- `R-V33-V19-UNLOCK`: `bossUnlocked19()` falls through to
  `__V33_DATA.byId(id)` and delegates zone `'chrono'` to
  `__v33.bossUnlocked(id,lang)`.
- `R-V33-V19-SHIELD`: golem shield 90 (else elem-shield 30).
- `R-V33-V19-PHASE`: P3 Knowledge Counterattack skipped for the
  golem (2 phases only).
- `R-V33-V19-HEAL`: wrong answer in P2 heals the golem +10 HP
  (“GEAR GOLEM hồi 10 HP”).
- `R-V33-V19-PHASETXT`: phase text `/2` for the golem, `/3`
  otherwise.
- `R-V33-V18-ALL`: `allBosses()` appends `__V33_DATA.bosses`.
- `R-V33-V18-CH` (×2): `challenge()` AND `collDetail()` fall
  through to `__V33_DATA.byId(id)`.
- `R-V33-V21-TOTAL`: `TOTAL_BOSSES` 70 → 78.
- `R-V33-V27-EXP`: `startSession` exported on `__v27`.
- `R-V33-V20-HAS`: `hasProgress` returns true for en33 quest or
  regionClaimed progress.
- `R-V33-V20-MERGE`: en33 merge branch (quests union MAX,
  rift best MAX + claimed union for the newer day only,
  regionClaimed per-language MAX — B-33-2 fix, see below,
  created MIN, pending dropped).
- `R-V33-V15-BUILDWORDS`: V33 block inside `buildWords()` merges
  `__V33_WORDS` into `WORDS` (BT precedent).
- KO tabs line: `v33kotab` button appended after `v27kotab`
  (only the trailing `';'` stripped); `v27kotab`/`v23kotab` still ×1.
- Title: `… Vocab Farm V17.0 — Chrono Kingdom …`. Layer V33
  injected LAST (`<style id="v33">`, `<script id="v33data">`,
  `<script id="v33js">` before `</body>`).

## Fixed — post-first-build bugs (2026-11-19)
Both found by `tools/v33/test33.js` on the first build; fixed by
restoring the pristine V16.4 base from
`Korean_English_Vocab_Farm_V16_4_Data_Safety.zip` (index.html sha256
back to `c3639bc7…`, 6 mutated src files restored) and re-running
`build_v33.py` with the fixes in place. The first build's
`out/index.html` was discarded, never shipped.

- **B-33-1 (PRODUCT BUG — quest completion had no accuracy
  threshold):** `checkCompletions()` marked a quest done whenever
  any matching session existed, regardless of accuracy — a 75%
  run completed `q_gear` and became claimable (+20 XP), although
  the overlay text promises “≥ 80%”. Root cause: the quest branch
  never compared `hit.acc` to a threshold (the rift branch records
  best accuracy, so it was unaffected). Fix: new constant
  `QUEST_MIN_ACC=0.8` in `src/v33.js`; the quest branch now marks
  done only when `hit.acc >= QUEST_MIN_ACC`. A below-threshold run
  still consumes its pending attempt (deleted, as before) so the
  player retries with a fresh `startQuest`, whose `startedAt`
  excludes the old session rec. Verified: `test33.js` §4 — the
  0.75 run is NOT done and NOT claimable; the 1.0 run completes
  and claims +30 XP.
- **B-33-2 (PRODUCT BUG — en33 merge lost regionClaimed):**
  the first merge draft used `unionTrue(l33.regionClaimed,
  c33.regionClaimed)`. `unionTrue` (pre-existing V20 helper) is
  local-priority last-writer-wins per key — it copies cloud first,
  then local overwrites — so a local `{ko:0}` overwrote a cloud
  `{ko:1}` and the KO region completion was lost on merge. (Its
  other call sites only ever hold 1/absent values, so they are
  unaffected; `unionTrue` itself is unchanged.) Fix: the en33
  branch now unions `regionClaimed` with an explicit per-language
  MAX — `{en:Math.max(rcL.en||0,rcC.en||0),ko:Math.max(rcL.ko||0,
  rcC.ko||0)}` — recorded in `build_v33.py`'s replacement text so
  the rebuild applies it. Verified: `test33.js` §8 — merge of
  `{en:1,ko:0}` + `{en:0,ko:1}` now yields `{en:1,ko:1}`.

## BRIEF anchors that turned out wrong in source
(Found while verifying `tools/v33/BRIEF_V33.md` against the source
before building; the build used the corrected forms.)
- **V19 phase / phasetxt anchors need longer unique context:**
  the short forms also match `v18.js` — `if(F.phase===2&&
  F.hp<=F.maxHp*0.2){` occurs 2× in `index.html`, and
  `'Giai đoạn '+F.phase+'/3'` occurs 2×. Resolved with longer
  anchors (the Berserk comment line for PHASE; the full `v19phase`
  line for PHASETXT).
- **V18 challenge anchor occurs 2×:** `challenge()` AND
  `collDetail()` share the boss-lookup line, so the fall-through
  was applied at BOTH sites (the one deliberate count-2
  replacement, R-V33-V18-CH) instead of only `challenge()`.

## Preserved (verified by the build gates)
- All V31 fixes intact in the built file (F-01 merge branch,
  F-01-en18 flat V18 wins, F-03a/b, F-13a/b, F-14, F-15, F-02a–d,
  F-16, F-11, F-12, C1a/b/c, C6/C6b/C6c, C9 `importFile(imp)`) —
  re-asserted in `package_v33.py` from the verbatim V31 fragment
  list. V32 R-V32-VER guard intact (`bad-version` ×2: guard + v32.js
  header mention).
- Old layer versions intact: 13.0.0, 15.0.0, 15.1.0, 15.2.0, 15.3.0,
  16.0.0, 16.3.0, 16.4.0. Marker order ends v33 (styles + scripts),
  v33data before v33js. KO tabs line: `v33kotab` ×1,
  `v27kotab` ×1, `v23kotab` ×1. No V28/V29/V30 markers. No
  out-of-scope markers (`v21emailbtn`, `_esc21`, `armV27Obs`,
  `rearmObserver`, `_speakXp`, `V29 (F-05)`).
- Pet art MOVE: no `assets/pets/v17/` in the source tree or the ZIP;
  pet PNGs exist only under `assets/pets/v15/chrono/` (9) +
  `assets/pets/v15/eggs/chrono_egg_*.png` (3).

## Build notes (honest)
- `build_v33.py` was run twice in total. The FIRST run succeeded
  (all 13 replacements, node --check OK on 8 files) but
  `test33.js` then found B-33-1 + B-33-2 (see above). The build was
  NOT patched in place: the pristine V16.4 base was restored from
  the V16.4 ZIP (index.html sha256 `c3639bc7…`, 6 mutated src files
  restored, V33 artifacts removed from `out/`) and `build_v33.py`
  was re-run with both fixes in place (B-33-1 in `src/v33.js`,
  B-33-2 in the script's replacement text). The second run completed
  cleanly; its `out/index.html` sha256 is
  `b04179cf05aca77295ac27f40b3aef9f46f6edab80a3e15489d428dc80a7951f`,
  2,190,956 B (+122,701 B over V16.4: the V33 layer + 13
  replacements + KO button + title).
- One failed build run mid-session had already mutated `src/` (6
  files) and `out/index.html` before failing verification; those
  files were restored byte-identical from the V16.4 ZIP before the
  successful first run (same restore procedure as above).
- `build_v33.py` asserts `VERSION='17.0.0'` in `v33.js` and
  `version:'17.0.0'` in `v33_data.js` (the data file uses the
  lowercase key).

## Out of scope (not built)
- Library integration (5th group) for Chrono words; keyboard
  Hangul typing in boss fights; Claude #3/#4/#5; V9 word fixes;
  V14.1; PR #7 follow-ups; F-12 full-wipe question (still pending
  Anh). No V28/V29/V30 files.

## Still not tested (honest)
- `tools/v33/test33.js` Node vm suite — **run: 204 PASS / 0 FAIL /
  8 SKIP, twice on the build + once on the final packaged ZIP**
  (per-section counts in the smoke test §1). The §9 SKIPs are the vm
  harness's scope limit only: the §9 gates were run for real in
  Chrome (smoke test §4), all passing, 0 console errors.
- Live Firebase sync/login — Anh must run the `FIREBASE_SETUP.md`
  checklist; unconfigured, the game is fully offline and says so.
  The en33 merge branch is tested against the real `v20_sync.js`
  in the vm suite, not against a live Firestore.
