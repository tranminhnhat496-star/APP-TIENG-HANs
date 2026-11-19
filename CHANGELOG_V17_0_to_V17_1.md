# Changelog — V17.0 → V17.1 (CHRONO COMPLETE)

**Version 17.1.0 — layer V34 (loads LAST). Base: V17.0 (Chrono Kingdom).
Date: 2026-11-19.**

Base verified before building: pristine V17.0 `out/index.html` sha256
`b04179cf05aca77295ac27f40b3aef9f46f6edab80a3e15489d428dc80a7951f`
(2,190,956 B). Built `out/index.html` sha256
`0b766dad766e25e4ee7a16317af16f9866f29d1cf593336544134d2d7171ee2f`
(2,214,045 B).

## Added

### 1) Chrono Vocabulary Integration — Library 5th group (V17 + V25 + V15)
- `v17.js`: `chronoWords()` (240 words, `lib` includes `'chrono'`) and
  `chronoSets()` grouper over `w.chronoSet` (4 × 60, fixed order time /
  space / machines / change); group block in `libraryHTML()` after
  Oxford; `lessonHTML()` branch for `V.lib==='chrono' && V.set` reusing
  `wordCard()` / `filterWords()` / pager; `set` added to `V` state,
  `currentScope()`, `scopeName()` (set labels: Time & Calendar / Space &
  Astronomy / Machines & Engineering / Change & Sequence), `rewardFor()`
  (chrono per-set +50 XP / +2 gems; `chrono:all` +200 XP / +5 gems —
  same scale as A1–A2, once-only via `en17.claimed`); topicCard-style
  set cards; `V.set` resets in `openLesson` / `openLib` / `openTopic` /
  `goHome`.
- `v25.js`: `groupKey()` / `groupStats()` gain a `chrono` branch — the
  group header shows a real progress bar from the same box/due data.
- `v15.js`: `wordsFiltered()` and `inScope15()` gain `sc.set` support
  (`sc.kind==='lib' && sc.lib==='chrono'` checks `w.chronoSet` against
  `sc.set`, mirroring the `sc.topic` / `sc.lesson` branches).
- `v19.js` / `v18.js`: the `sc2` fallback copies `set` too, so a
  too-small Chrono scope still relaxes correctly instead of dropping
  the set.
- No new data file: the 240 words were already loaded by V17.0.

### 2) SRS Integration — verified, no code needed
- Runtime probe confirms `mark15()` on a `v33_` word enrols it (box 1,
  right 1, interval 1, due in the future), it appears in review when
  due, and Smart `classifyEN` / plan universe include it. No enrolment
  code was added. No new rewards (single-XP-channel rule).

### 3) Vocabulary Analytics — derived only, never stored (V34)
- `__v34.setStats(set)` / `__v34.chronoAnalytics()` /
  `__v34.koChronoStats()`: per Chrono set + group total, computed live
  from SRS data — learned (box ≥ 1), not yet learned (box 0 / absent),
  mastered (box ≥ 5), due now, retention = Σright / (Σright + Σwrong)
  (`—` when 0 attempts). Shown as a stat line on each set card + a
  group summary row in the Library Chrono group.
- Exposed via `__v34` for the Smart overlay. **Library-only link:** no
  Smart-overlay button was added — `v27.js` has no clean UI hook (its
  overlay HTML is built internally with no extension point). Documented
  here instead of faked.
- **KO Chrono honest empty state:** there are no Korean Chrono words
  (`ko` is display-only; no `S.cards` entries, no KO Chrono word list).
  The KO analytics area shows: “Chưa có từ Chrono tiếng Hàn — từ Chrono
  hiện chỉ có bản tiếng Anh (kèm nghĩa tiếng Hàn hiển thị)”. No invented
  words, no fake zeros presented as real progress.

### 4) Boss Weakness System — all 78 bosses (V34 + hooks in V15/V18/V19)
- `src/v34_data.js` (`__V34_DATA`): the full weakness table below, set
  labels, A1–A2 Vietnamese labels, KO empty-state note.
- `__v34.weakFor(boss, lang)` — explicit id first, then Chrono zone,
  z10, zone map, Elemental element, English/Legendary difficulty,
  `t:'time'` default for the V15 originals. `__v34.weakMatch(w, weak)`
  predicate. `__v34.breakBonus(maxHp)` = clamp(round(maxHp × 0.10),
  10, 50). `__v34.breakBarHTML(F)` + `__v34.weakName(weak)` +
  `__v34.weakChipHTML(boss, lang)` for display.
- Hooks (guarded `window.__v34` + try/catch) in each `answer()` path —
  correct branch only, after the V19 Counterattack early-return, bonus
  added **before** the shield-halving step: `v19.js answer()` (:489),
  `v18.js answer()` (:434), `v15.js bossAnswer()` (:1389). Meter:
  weakness hit → `brk` +1; at 3/3 on a correct answer → bonus damage,
  `brk` resets, `💥 BREAK!` banner. Wrong answers never drain (v1).
- Init in each `startFight` (`v19.js:349`, `v18.js:345`,
  `v15.js:1251`): `F.weak` / `B.weak`, `brk=0`, `brkMax=3`. Per-fight
  state on `F`/`B` only — no new localStorage key, no schema change,
  no migration.
- Pool bias in each `nextQ()` / `nextBossQ()` (`v19.js:378`,
  `v18.js:371`, `v15.js:1265`): vocab modes only, meter not full,
  weakness words in pool → draw from weakness words with p ≈ 0.5.
- UI: Break bar row directly under the HP bar in each `renderFight()`
  (`v19.js:648-678`, `v18.js:557-581`, `v15.js:1294-1311`) + weakness
  chip on boss cards (V18 Collection card + detail, V19 zone detail,
  V15 boss list). New CSS classes only in `src/v34.css`.
- KO fights: weakness = selected Korean deck; any correct KO answer
  fills +1 while `S.deck` is set; no deck → meter hidden/disabled.
- Honest blocked state (`__v34.scopeBlocked`, live from the actual
  pool): zero weakness words in the pool → bar shows “💥 Điểm yếu ngoài
  phạm vi ôn tập — đổi phạm vi để dùng”, meter never fills.

#### Full weakness table
| Bosses | Weakness |
|---|---|
| `v17_sandwisp` | Chrono / Time & Calendar |
| `v17_pendulum` | Chrono / Machines & Engineering |
| `v17_specter` | Chrono / Time & Calendar |
| `v17_mantis` | Chrono / Machines & Engineering |
| `v17_hound` | Chrono / Space & Astronomy |
| `v17_oracle` | Chrono / Time & Calendar |
| `v17_titan` | Chrono / Change & Sequence |
| `v17_geargolem` | Chrono / Machines & Engineering |
| V19 z1 | A1–A2 `family` |
| V19 z2 | A1–A2 `emotions-and-feelings` |
| V19 z3 | A1–A2 `body-movements` |
| V19 z4 | A1–A2 `characteristics` |
| V19 z5 | A1–A2 `education` |
| V19 z6 | A1–A2 `animals` |
| V19 z7 | A1–A2 `nature` |
| V19 z8 | A1–A2 `vehicles` |
| V19 z9 | A1–A2 `travel` |
| V19 z10 | Chrono / Change & Sequence |
| V18 English arena A1 | A1–A2 `food-and-drinks` |
| V18 English arena A2 | A1–A2 `house-and-home` |
| V18 English arena B1 | A1–A2 `clothes-and-accessories` |
| V18 English arena B2 | A1–A2 `fruit-and-vegetables` |
| V18 Elemental fire | A1–A2 `cooking-verbs` |
| V18 Elemental ice | A1–A2 `colors-and-shapes` |
| V18 Elemental nature | A1–A2 `fruit-and-vegetables` |
| V18 Elemental water | A1–A2 `food-and-drinks` |
| V18 Elemental wind | A1–A2 `travel` |
| V18 Elemental earth | A1–A2 `house-and-home` |
| V18 Elemental dark | A1–A2 `emotions-and-feelings` |
| V18 Elemental light | A1–A2 `school-objects` |
| V18 Elemental thunder | A1–A2 `body-movements` |
| V18 Legendary arena | Same per-difficulty mapping as the English arena |
| V15 original 10 | Shared topic `t:'time'` (32 real V15 words) |

### 5) Smart mid-flight guard (V33, 1 replacement)
- `launchSession()` calls guarded `__v27.endEarly()` before
  `v.startSession(...)`. A live Smart session is finished-and-recorded
  (partial session kept honestly, no plan bonus — `doneAll` false
  mid-flight) instead of silently replaced. Verified `endEarly()` is a
  no-op with no live session, and a live 2-word session ended early is
  recorded.

## Fixed
- **B-34-1 — `scopeBlocked()` only fired with a Library scope active.**
  As first built, the blocked bar appeared only when a scope was active,
  so the 12 bosses in the known limit below showed a `0/3` meter that
  could never fill, with no explanation. Fixed in `src/v34.js`:
  `scopeBlocked()` now returns true whenever the fight's actual pool
  holds zero weakness words, scope or not. Found by the runtime probe
  (live `v11_seadragon` fight); fixed via restore + re-run of
  `build_v34.py`, never patched in place.
- Two build-script bugs during development (fixed in the script, never
  in the output): `R-V34-V17-LESSON` had one `}` too many;
  `R-V34-V15-CARD` anchor ended mid-string-literal. Both caught by
  `node --check` before any delivery.

## Known limit — 12 bosses whose weakness can never appear (data, not code)
The A1–A2 basic topics have no B1/B2-level words (verified by counting
words per topic × level in the runtime probe: e.g. V15-topic `animals`
A1 26 / A2 16 / B1 0 / B2 0; `food` is the only one with B1 words, 15).
The 12 B1/B2-diff bosses whose weakness is one of those topics have 0
weakness words in their difficulty-filtered fight pool; their Break
meter shows the honest blocked message and never fills (66 of 78
bosses fill normally):
- B2: `v11_seadragon`, `v11_sharkking` (animals); `v11_timemachine`,
  `v11_golem`, `v11_goldephant` (vehicles); `v10_dict`, `v10_king`,
  `v10_fairy` (fruit-and-vegetables)
- B1: `v10_tiger`, `v10_wizard` (clothes-and-accessories); `v10_fox`
  (fruit-and-vegetables); `v10_octopus` (food-and-drinks)
The spec's weakness table is kept exactly as specified. A topic-synonym
extension was considered and rejected: it would fix only 1 of the 12
(`v10_octopus`, via V15 topic `food`) while deviating from the specified
predicate. Changing the table is a design decision for Anh.

## Correction to the V17.0 changelog (noted here; V17.0 file NOT edited)
- `CHANGELOG_V16_4_to_V17_0.md` documents `en33` as containing a
  `bosses` key. **False.** Source `en33()` (`src/v33.js:97-110`) has no
  `bosses` key — Chrono boss wins live in `en19`, exactly like V11
  bosses. Do not assume `en33.bosses` exists.

## Not changed / not done
- No new localStorage key, no schema change, no migration. Save key
  `hanvocab.v1` untouched; all player data preserved.
- No new art, no new hub/KO buttons, no new entry points.
- Smart overlay link is Library-only (no clean hook in `v27.js` UI;
  `__v34` analytics functions exposed for future use). No fake button
  was added.
- V33 Chrono overlay boss card was NOT hooked (Collection + fight UI
  cover Chrono bosses).
- Firebase Auth/Sync untouched; live Firebase still NOT tested.
- V18.0 (Skyroot Sanctuary) not started.

## Replacement list (build_v34.py — 36 total)
| Label | File | What it does |
|---|---|---|
| R-V34-V17-STATE | v17.js | `set` in `V` state |
| R-V34-V17-DATA | v17.js | `chronoWords()` / `chronoSets()` / `chronoSetName()` / `chronoSetCard()` / `chronoGroupHTML()` after `oxWords()` |
| R-V34-V17-SCOPE | v17.js | `currentScope()` chrono branch |
| R-V34-V17-SCNAME | v17.js | `scopeName()` chrono branch |
| R-V34-V17-REWARD | v17.js | `rewardFor()` chrono per-set +50/+2, `chrono:all` +200/+5 |
| R-V34-V17-GROUP | v17.js | Chrono group block in `libraryHTML()` (before BT comment) |
| R-V34-V17-LESSON | v17.js | `lessonHTML()` chrono branches |
| R-V34-V17-WHERE | v17.js | `wordCard` where-line |
| R-V34-V17-ACTIONS | v17.js | `openSet` / `learnSet` / `reviewSet` |
| R-V34-V17-EXPORTS | v17.js | `__v17` exports extended |
| R-V34-V17-GOHOME | v17.js | `V.set` reset in `goHome` |
| R-V34-V17-OPENLIB | v17.js | `V.set` reset in `openLib` |
| R-V34-V17-OPENTOPIC | v17.js | `V.set` reset in `openTopic` (also `openLesson`) |
| R-V34-V25-KEY | v25.js | `groupKey()` chrono branch |
| R-V34-V25-STATS | v25.js | `groupStats()` chrono branch |
| R-V34-V15-INSCOPE | v15.js | `sc.set` in `inScope15()` |
| R-V34-V15-WORDFILT | v15.js | `sc.set` in `wordsFiltered()` |
| R-V34-V15-INIT | v15.js | `bossFight` init `B.weak` / `brk` / `brkMax` |
| R-V34-V15-BIAS | v15.js | `weakPick` bias in `nextBossQ()` (speak + mc branches) |
| R-V34-V15-BREAK | v15.js | `breakDmg` before `B.hp -= dmg` in `bossAnswer()` |
| R-V34-V15-BAR | v15.js | Break bar in `renderBossFight()` |
| R-V34-V15-CARD | v15.js | Weak chip in `bossesHTML()` |
| R-V34-V19-SC2 | v19.js | `sc2` gains `set:sc.set` |
| R-V34-V19-INIT | v19.js | `startFight` init `F.weak` / `brk` / `brkMax` |
| R-V34-V19-BIAS | v19.js | `weakPick` bias in `nextQ()` (speak + else branches) |
| R-V34-V19-BREAK | v19.js | `breakDmg` before `var dealt = dmg;` in `answer()` |
| R-V34-V19-BAR | v19.js | Break bar in `renderFight()` |
| R-V34-V19-ZONECHIP | v19.js | Weak chip in zone-detail boss row |
| R-V34-V18-SC2 | v18.js | `sc2` gains `set:sc.set` |
| R-V34-V18-INIT | v18.js | `startFight` init `F.weak` / `brk` / `brkMax` |
| R-V34-V18-BIAS | v18.js | `weakPick` bias in `nextQ()` (speak + else branches) |
| R-V34-V18-BREAK | v18.js | `breakDmg` before `var dealt = dmg;` in `answer()` |
| R-V34-V18-BAR | v18.js | Break bar in `renderFight()` |
| R-V34-V18-COLLCARD | v18.js | Weak chip in Collection card |
| R-V34-V18-COLLDETAIL | v18.js | Weak chip in Collection detail |
| R-V34-V33-GUARD | v33.js | Guarded `__v27.endEarly()` at the top of `launchSession()` |

All 36 anchors were exact-match asserted (fail on missing / duplicated /
already applied) before any file was touched. `node --check` passes on
`v34.js`, `v34_data.js` and every touched src file. Marker order
verified: V34 layer LAST, `v34data` before `v34js`; old versions
13.0.0–17.0.0 intact; V31/V32/V33 fragments re-asserted; out-of-scope
markers absent.
