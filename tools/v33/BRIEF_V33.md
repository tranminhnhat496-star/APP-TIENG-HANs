# V17.0 CHRONO KINGDOM — Coordinator brief for the implementation agent (V33)

Read by the coordinator from source on 2026-11-19. All line numbers are
against the V16.4 base (out/index.html sha256 c3639bc7…, 2,068,255 B).
Verify every anchor yourself before using it — do not trust this brief
blindly if source disagrees.

## Base / layer
- Base: V16.4 out/ (hash above). build_v33.py must gate on it and refuse
  if v33 present. Model build_v33.py on build_v32.py (EPERM-safe helpers,
  _assemble_index, exact-match asserts, marker-order checks, node --check).
  Model package_v33.py on package_v32.py. Layer V33 (17.0.0): src/v33.js +
  src/v33.css + src/v33_data.js, loads LAST (style id="v33", script
  id="v33js", before </body>).
- Version number: 17.0.0 is TAKEN by this build. The unshipped V30
  Vocabulary World draft also used 17.0.0 but never shipped; record the
  supersession in CHANGELOG_V16_4_to_V17_0.md. Do NOT delete
  v17-design.md. Do NOT run build_v17.py / build_v31.py / build_v32.py.

## Bosses (8, ids v17_*, data in src/v33_data.js as window.__V33_DATA)
- Sandglass Wisp, Pendulum Knight, Secondhand Specter, Gearwing Mantis,
  Time Rift Hound, Calendar Oracle, Paradox Titan, GEAR GOLEM (final).
- ChatGPT's numbers (Lv 71–78, HP 18,000–50,000) are NOT on game scale.
  Adapted scale continuing the V19 progression (V19 max lv 60 / hp 600):
  lv 61–68, hp 620–750, def 7–8, diff B2, mode mixed/mc/type/listen/
  speed/grammar per boss. Final: GEAR GOLEM lv 68, hp 750, def 8.
  Document the exact mapping table in the changelog.
- Elements: NO new element. Map ChatGPT's elements onto the real V19 EL
  (src/v19_data.js:12): Sand→earth, Metal→earth, Dark→dark,
  Electric→thunder, Void→cosmic, Light→light, Time→cosmic. Document.
- Skill ids MUST come from the V19 palette (v19_data.js header):
  elem: burn/freeze/chain/veil/cleanse/regen/heal/gale/shield/rift;
  tact: tshield/theal/ttimer/tveil/tenrage; pass: bulwark/vampiric/
  swift/thorns. Boss record shape mirrors v19_data.js B(): id, n, vi,
  img 'assets/bosses/v17/<id>.png', zone 'chrono', el, rarity, lv, hp,
  def, mode, diff, lang 'both', skills{ basic/elem/tact/pass/ult },
  reward{ xp, gems, item, title? }. Rewards on V19 scale (xp 165–220,
  gems 4–6, first-win once per language, replay +10 XP via UCE).
- GEAR GOLEM special (real, guarded, never fake): 3 defense gears =
  90-HP gear shield at fight start (UCE shield mechanic; v19.js
  startFight sets shield 30 only for elem 'shield' — special-case the
  golem to 90). 2 fight phases: P1 normal, P2 awakening at ≤50% HP;
  NO P3 Knowledge Counterattack for this boss (deliberate adaptation,
  document it). Time-reversal heal: on a WRONG answer in P2, the golem
  heals +10 HP (capped at maxHp) — implement as a guarded branch in the
  UCE wrong-answer path, keyed on F.boss.id==='v17_geargolem'. Verify
  the exact answer()/phase code in v19.js before writing the replacement.

## UCE reuse wiring (guarded build_v33.py replacements, exact-match)
- v19.js fight(id) (line ~343): `var b=D19().byId(id);if(!b)return;` →
  fall through to `__V33_DATA.byId(id)` when D19 misses.
- v19.js bossUnlocked19 (~86): same fall-through; zoneOpen('chrono')
  returns true (zone not in D19().zones → i=-1 → `if(i<=0)return true`),
  so the region gate is V33's own 70-win gate, not zoneOpen. Sequential
  unlock inside Chrono: each boss needs the previous one won in that
  language (mirror zoneBosses/isWon19 logic with a V33 boss list).
- v19.js winReward (~558): records wins in S.v7.en19.bosses[id][lang]
  — V33 bosses record THERE (no duplicate boss records in en33).
  Zone completion inside winReward is null-safe for zone 'chrono'
  (`var z=D19().zoneById(b.zone); if(z&&...)`), so no crash. V33 adds
  its OWN region-completion reward (all 8 won in one language,
  claimed-guarded, in en33).
- v18.js allBosses() (~29) + challenge(id) (~216): add V33 fall-through
  so the Collection shows 78 bosses. v21.js TOTAL_BOSSES 70 → 78
  (line ~35, guarded replacement).
- V33's own entry: region overlay lists bosses and calls __v19.fight(id)
  after the fall-throughs are in place.

## The 70-win gate (V33-local corrected count — do NOT change shared code)
- bossWinCount() (v21.js:111) UNDERCOUNTS: it tests r.en/r.ko for en18/
  en19, but V18 writes FLAT {win} records → all 30 V18 wins count as 0
  (AUTO finding V17-1). Do NOT edit bossWinCount() — that would change
  avatar unlocks and belongs to the AUTO project. V33 defines its OWN
  corrected count: en15 keys + en18 (flat win OR nested en/ko win) +
  en19 (nested en/ko win). Correct total = 10 + 30 + 30 = 70, so the
  gate opens exactly when the player has won everything. Verify the
  gate opens with all 70 wins seeded (test). Show locked state with
  real progress (x/70) and no fake active buttons.

## Words (240, from the vocabulary child: data/v33_words.json)
- 4 sets × 60 (time/space/machines/change), each with en/ko/vi/ipa/pos/
  ex/exvi. The vocabulary child validates 4×60, 0 dupes vs all existing
  words, blank = missing data.
- Integration follows the BT precedent (v22.js header + v15.js:256
  attachBT): V33 words MUST enter the shared WORDS array so V19
  wordPool, V27 wordById/allENWords and SRS mark15 all see them.
  Implement `attachChrono()` in v33.js (or a guarded v15.js replacement
  if the child judges it cleaner) merging __V33_WORDS into WORDS with
  ids 'v33_<slug>', lib marker 'chrono', lv 'B2' (Chrono bosses are
  diff B2, so wordPool includes them). Do NOT create S.cards entries —
  the ko field is display/learning data only, never pollutes the Korean
  deck. Verify buildWords() in v15.js before choosing the mechanism.
- Library integration is OUT of scope (no 5th Library group in v1);
  document it as a follow-up.

## Pets (3 species × 3 stages + 3 eggs)
- Species (elements MUST be from PET_ELEMENTS in v23_data.js:
  fire/ice/nature/water/thunder/light/dark; stones from PET_MATERIALS):
  Star Deer → nature; Gear Beetle → thunder; Cosmic Unicorn → light.
  (Cosmic maps to stone_light per the v18 stone map, same as V19
  cosmic bosses.)
- Skills MUST use existing types only (v23.js teamBattle ~245 aggregates
  passives: burn, frost/crystal, wisdom, moon/honey/grove, tide, holy,
  rebirth, arcane, storm; actives: dmg/shield/heal). Mapping (document):
  Star Deer — passive 'wisdom' (+1 energy per 3-combo = streak reward,
  real/observable) + active 'heal'; leader XP bonus (+5/10/20% by stage,
  learnXpBonus ~357) applies to ANY leader, so the "+XP" claim is the
  existing leader bonus. Gear Beetle — active 'shield' (Gear Shield) +
  passive 'crystal' (drain reduction). Cosmic Unicorn — passive 'storm'
  (+dmg at combo ≥3 = streak damage) + active 'dmg'.
- Registration: push species into window.__V23_DATA.species and eggs
  into __V23_DATA.eggs at V33 load, guarded + idempotent (skip if id
  present). Egg fields mirror PET_EGGS (id, n, el, price, hatchMin, img,
  d). Suggested prices on scale: star 1200/120min, gear 1000/120min,
  cosmic 2000/240min — document as new values.
- IMAGE PATHS (hardcoded in v23.js — verify): stageImg (~55) does
  'assets/pets/v15/' + stages[].img (subpath allowed, e.g.
  'chrono/stardeer_s1.png'); egg rendering (~384) does
  'assets/pets/v15/eggs/' + egg.img (bare filename only). Decide:
  MOVE (not copy) the 12 pet PNGs from assets/pets/v17/ to
  assets/pets/v15/chrono/*.png + assets/pets/v15/eggs/chrono_egg_*.png,
  OR use relative-path img values — document the choice; no duplicate
  bytes in the ZIP. Boss PNGs stay in assets/bosses/v17/.
- Evolution uses the element's stone + feather/fruit/coins per
  PET_EVO_COST — no new materials. Check PET_COLLECTION_REWARDS
  milestones (forms 6/12/…) — 9 new forms take the total to 45; extend
  milestones only if the existing ladder tops out below 45, else
  document.

## Quests (6, via V27 engine — reuse, no duplicate quest system)
- The Broken Clock, Gear Collection, Time Traveler, Lost Memories,
  Guardian Challenge, Final Countdown. Each quest = a fixed Chrono word
  id list (10–14 ids, from the 240, split across the 4 sets by theme).
- PROBLEM (verified): startSession(lang, ids, kind) (v27.js:428) is NOT
  exported on window.__v27 (export at ~1080 lists startPlan/startWeak/
  startWeakWord only). Add ONE guarded replacement in build_v33.py:
  add `startSession:startSession,` to the __v27 export. Then quests
  call `__v27.startSession(lang, ids, 'quest')`.
- Completion + rewards: finishSession (~521) writes a session rec into
  en27.sessions (fields t/lang/total/correct/wrong/xp/mins/weakFixed/
  words — NO kind field) and only pays a bonus for kind 'plan'. V33
  must implement its OWN completion detection: before launching, record
  {questId, ids, startedAt, sessionsLen}; on overlay open (or a V33
  check function), inspect the newest en27 session rec — if rec.t >=
  startedAt and rec.words covers the quest ids (rec.words holds the
  first 30 ids) with accuracy ≥ 0.8 → quest complete → claim button
  grants the reward ONCE (claimed-guarded in en33.quests). Rewards only
  from real stores (XP via gain15, gems via S.v7.gems, pet mats via
  en23.mats). No duplicate rewards. Verify this mechanism in source;
  if a cleaner hook exists, use it and document why.
- Quest reward scale (new, on V27/V30 scale — document): first clear
  +20 XP, 3★/≥90% +10 XP, +1 gem on Final Countdown only. (Chrono
  quests are endgame; slightly above V30's +15/+10.)

## Time Echo
- Backed by V27 wrong-word records: recordAnswer (v27.js:160) keeps
  en27.en.cw[id] (consecutive wrong, EN) and en27.ko.cw[id] (KO).
  Time Echo = a challenge session of up to 10 words with cw ≥ 1
  (most-wrong first), launched via the exported startSession with kind
  'echo'. Words answered correctly clear from the Echo list naturally
  (recordAnswer deletes cw on correct). If the Echo list is empty, show
  an honest empty state ("Chưa có từ nào trả lời sai") — never fake
  questions. Reward: +5 XP per correct answer via mark15 (the session
  already pays through mark15), no extra bonus.

## Chrono Rift
- 3 floors × 7 questions, one V27 session per floor (kind 'rift'),
  floor N+1 unlocks only if floor N accuracy ≥ 0.7. Limited answers:
  7 questions per floor, no reask (the session's reask phase still
  runs — document that reask counts toward the floor total, or pass
  ids such that the floor is exactly 7 questions and accuracy is
  correct/total of the session rec). Rewards accuracy-scaled, once per
  day per floor, claimed-guarded in en33.rift: acc ≥0.9 → +40 XP/+2
  gems, ≥0.7 → +25 XP/+1 gem, else +10 XP. State in en33.rift
  {day, floor, claimed:{}}.

## Save schema (new key S.v7.en33 — lazy creation, no migration)
- en33 = {bosses:{}, quests:{qid:{done:0|1, claimed:0|1, at}}, rift:{day, floor, claimed:{}},
  echo:{}, regionClaimed:{en:0|1, ko:0|1}, created}. Boss wins stay in
  en19 (UCE). Worst case < 20 KB.
- MERGE: add an en33 branch to mergeSaves() in src/v20_sync.js (follow
  the en27 branch pattern ~282: unions for claimed flags, per-day MAX,
  XP MAX never summed). Also add en33 to hasProgress() (~76-79 pattern)
  so sync never downloads cloud over live Chrono progress. Both via
  guarded build_v33.py replacements (exact-match asserts).

## Entry points / UI
- Region entry from BOTH hubs: EN decorator (MutationObserver, V27
  precedent) + KO build-time button (V11.1/V27 precedent — strip ONLY
  the trailing ';'). Region overlay (V33): locked state with real x/70
  progress; unlocked: boss list (8, with win/stars per language),
  quests (6, with state), Time Echo, Chrono Rift. z-index 1500 (above
  V31 1400; V32 badge is 1100, V20 modal 1200).
- WCAG AA, V24/V25/V26 tokens (--ui-*), 44px targets, no overflow at
  360–430px. No new currency, no energy system, no outfit system.

## Tests (tools/v33/test33.js, Node vm, model on tools/v32/test32.js)
- Cover: gate (corrected count incl. flat V18 wins; gate closed at 69,
  open at 70), boss stats on game scale (lv 61–68, hp 620–750), pet
  skills (teamBattle aggregation with the 3 new species; leader XP
  bonus), quest rewards claimed-guarded + completion detection via
  session recs, Time Echo (cw records → list; empty state), Chrono Rift
  (floor gating, accuracy-scaled rewards, once/day), word counts/dedupe
  (load data/v33_words.json + v33_data.js: 4×60, 0 dupes vs existing),
  merge en33, validation/snapshot/export/conflict (regression of V31/
  V32). Run TWICE on build + ONCE on packaged ZIP, exact counts.
- tools/v33/verify-v33c.js CDP driver (model on verify-v32c.js) for
  Chrome gates IF Chrome launches — probe first; if dead, stage the
  driver and say so honestly. CHROME PROBE 2026-11-19 (coordinator):
  Chrome 157.0.8103.81 LAUNCHES and answers /json/version when started
  with the cdp.js recipe (--headless --no-sandbox --disable-gpu
  --disable-dev-shm-usage --disable-features=LocalNetworkAccessChecks,
  PrivateNetworkAccessChecks --user-data-dir=... --remote-debugging-
  port=... --hatch-webgl-allowed-domains-file=/tmp/webgl-policy.txt
  --hatch-webgl-allowed-domains-sha256=<sha>). A bare
  --headless=new --dump-dom run WITHOUT the policy switches fails with
  "Hatch WebGL domain policy is required" — that is a probe error, not
  a dead Chrome. Use tools/v15ui/cdp.js ensureChrome() as-is.

## Docs / packaging / GitHub
- Docs: README_V17_0_CHRONO_KINGDOM.md, CHANGELOG_V16_4_to_V17_0.md,
  SMOKE_TEST_V17_0_2026-11-19.md; append V17.0 sections to
  CHANGED_FILES.md + GITHUB_DESKTOP_GUIDE.md.
- package_v33.py → ZIP Korean_English_Vocab_Farm_V17_0_Chrono_Kingdom.zip.
- Branch muse/chrono-kingdom-v17 FROM muse/data-safety-v164 @
  323fad360a63ef4de88ef4051d9497810a40bc9d (verify head unmoved first).
  Push text files only (snapshot-push: ≤16 MiB, no binaries). Draft PR,
  base muse/data-safety-v164 (stacked; PR #9/#10 unmerged).
  firebase-config.js NEVER pushed. No merge, no main, no force-push.
