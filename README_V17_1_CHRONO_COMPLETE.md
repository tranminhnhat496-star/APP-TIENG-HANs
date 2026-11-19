# Korean & English Vocab Farm — V17.1 CHRONO COMPLETE

**Version 17.1.0 — layer V34 (loads LAST). Base: V17.0 (Chrono Kingdom). Date: 2026-11-19.**

V17.0 shipped the Chrono Kingdom region (8 bosses, 240 B2 words, 6 quests)
but left the new words half-integrated: they were not in the Vocabulary
Library, SRS/Smart treated them only incidentally, there was no analytics
view, bosses had no weakness system, and a Chrono session could silently
replace a live Smart session. V17.1 finishes the integration. Nothing else
changes: no new currency, no energy system, no migration, no feature
removed, no save schema/key renamed, **no new localStorage key at all**
(fight state lives on `F`/`B` only, per fight), no new art, no new hub
buttons.

## What V17.1 adds

### 1) Chrono Vocabulary in the Library — 5th group
- The Library gains a **Chrono Kingdom** group after Oxford: 4 set cards
  (Time & Calendar / Space & Astronomy / Machines & Engineering /
  Change & Sequence, 60 words each), a group summary row, and the honest
  KO note (see §3).
- Per-set lesson view reuses the existing `wordCard()` / `filterWords()` /
  pager: search, POS filter, status filter, favorites, and flashcards all
  work on the group. Scope `{kind:'lib', lib:'chrono', set}` drives modes,
  SRS review, and boss fights exactly like the A1–A2/Oxford scopes.
- Rewards (same scale as A1–A2, once-only via `en17.claimed`): per set
  **+50 XP / +2 💎** when the whole set is learned, **+200 XP / +5 💎**
  for all 240 words.
- The group header gets a real progress bar (V25 `groupKey()` /
  `groupStats()` now understand `chrono`, counting the same box/due data
  as the other groups).

### 2) SRS — verified, nothing missing
- Runtime probe confirms: `mark15()` on a `v33_` word enrols it
  (box 1, right 1, interval 1, due in the future), it appears in review
  when due, Smart `classifyEN` and the plan universe include it. No
  enrolment code was needed and none was added. No new rewards here
  (single-XP-channel rule — only the Library rewards in §1 pay XP).

### 3) Vocabulary Analytics — derived only, never stored
- Per Chrono set + group total, computed live from SRS data: learned
  (box ≥ 1), not yet learned (box 0 / absent), mastered (box ≥ 5), due
  now, and retention = Σright / (Σright + Σwrong) over the set's words
  (shown as `—` when there are 0 attempts). Shown as a stat line on each
  set card + a group summary row in the Library Chrono group.
- The same stats are exposed via `__v34.chronoAnalytics()` /
  `__v34.setStats(set)` / `__v34.koChronoStats()` for the Smart overlay.
  **Library-only link:** `v27.js` has no clean UI hook (its overlay HTML
  is built internally with no extension point), so no Smart-overlay button
  was added; the functions are exposed for future use.
- **KO Chrono — honest empty state.** There are no Korean Chrono words:
  the `ko` field on Chrono words is display-only (no `S.cards` entries,
  no KO Chrono word list). The KO analytics area says so plainly:
  “Chưa có từ Chrono tiếng Hàn — từ Chrono hiện chỉ có bản tiếng Anh
  (kèm nghĩa tiếng Hàn hiển thị)”. No invented words, no fake zeros
  presented as real progress.

### 4) Boss Weakness System — all 78 bosses, real and observable
- Every boss has a weakness topic. On a correct answer with a weakness
  word, the Break meter fills +1; at 3/3 the hit deals bonus damage
  `breakBonus(maxHp) = clamp(round(maxHp × 0.10), 10, 50)` and the meter
  resets, with a `💥 BREAK!` banner. Wrong answers never drain the meter
  (v1). The bonus is added **before** the shield-halving step, so all
  existing def / shield / pet math is reused untouched.
- Pool bias: in `nextQ()` / `nextBossQ()`, for vocab modes only, while the
  meter is not full and weakness words exist in the pool, the question
  word is drawn from weakness words with p ≈ 0.5 (verified ≈ 0.5 over
  400 draws). Non-word modes and KO cards never match the word predicate.
- UI: one Break bar row directly under the HP bar in each fight renderer
  (V19 / V18 / V15), reusing the hpbar track pattern; the weakness topic
  name is also shown on the boss card (Collection for V18/V15, zone
  detail for V19). New CSS classes only in `v34.css` (`--ui-*` tokens,
  WCAG AA, 44 px targets, no overflow at 360–430 px).
- KO fights: weakness = the selected Korean deck — any correct KO answer
  fills +1 while `S.deck` is set. With no deck selected the meter is
  hidden/disabled for that fight (honest, never fake).
- **Honest blocked state.** If the fight's word pool contains zero
  weakness words, the bar shows “💥 Điểm yếu ngoài phạm vi ôn tập — đổi
  phạm vi để dùng” and the meter never fills. This happens in two cases:
  (a) a Library scope is active whose words exclude the weakness;
  (b) 12 bosses whose difficulty filter alone excludes it — see
  “Known limit” below. Changing the Library scope can bring the
  weakness into the pool (scope overrides the diff filter in
  `wordPool`), so the message is actionable, not decorative.

#### Full weakness table
| Bosses | Weakness |
|---|---|
| Chrono 8 (explicit) | `v17_sandwisp` → Chrono / Time & Calendar; `v17_pendulum` → Chrono / Machines & Engineering; `v17_specter` → Chrono / Time & Calendar; `v17_mantis` → Chrono / Machines & Engineering; `v17_hound` → Chrono / Space & Astronomy; `v17_oracle` → Chrono / Time & Calendar; `v17_titan` → Chrono / Change & Sequence; `v17_geargolem` → Chrono / Machines & Engineering |
| V19 map, zone z1 | A1–A2 topic `family` |
| V19 map, zone z2 | A1–A2 topic `emotions-and-feelings` |
| V19 map, zone z3 | A1–A2 topic `body-movements` |
| V19 map, zone z4 | A1–A2 topic `characteristics` |
| V19 map, zone z5 | A1–A2 topic `education` |
| V19 map, zone z6 | A1–A2 topic `animals` |
| V19 map, zone z7 | A1–A2 topic `nature` |
| V19 map, zone z8 | A1–A2 topic `vehicles` |
| V19 map, zone z9 | A1–A2 topic `travel` |
| V19 map, zone z10 | Chrono / Change & Sequence |
| V18 English arena, per difficulty | A1 → `food-and-drinks`; A2 → `house-and-home`; B1 → `clothes-and-accessories`; B2 → `fruit-and-vegetables` |
| V18 Elemental arena, per element | fire → `cooking-verbs`; ice → `colors-and-shapes`; nature → `fruit-and-vegetables`; water → `food-and-drinks`; wind → `travel`; earth → `house-and-home`; dark → `emotions-and-feelings`; light → `school-objects`; thunder → `body-movements` |
| V18 Legendary arena | Same per-difficulty mapping as the English arena |
| V15 original 10 | One shared topic, `t:'time'` (32 real V15 words match) |

Predicates on the question word (`F.cur.w`): chrono → `w.chronoSet ===
key`; a1a2 → `(w.a1a2Topics || []).indexOf(key) >= 0` (accepts both the
stored `'a1_<slug>'` form and the bare slug, plus `w.t === key`);
`t` → `w.t === key`. Resolution order in `__v34.weakFor(boss, lang)`:
explicit boss id → Chrono zone → z10 → zone map → Elemental element →
English/Legendary difficulty → `t:'time'` default for the V15 originals.
KO fights return kind `ko` for any boss.

### 5) Smart mid-flight guard
- `launchSession()` in `v33.js` now calls guarded `__v27.endEarly()`
  before `v.startSession(...)`. A live Smart session is finished-and-
  recorded (partial session kept honestly, no plan bonus — `doneAll` is
  false mid-flight) instead of silently replaced. `endEarly()` was
  verified a no-op when no session is live.

## Known limit — 12 bosses whose weakness can never appear (data, not code)
The A1–A2 basic topics (`animals`, `vehicles`, `clothes-and-accessories`,
`fruit-and-vegetables`, `food-and-drinks`) have **no B1/B2-level words**:
every word carrying those topics is A1/A2-level (verified by counting
words per topic × level in the runtime probe). The 12 B1/B2-diff bosses
whose weakness is one of those topics therefore have 0 weakness words in
their difficulty-filtered fight pool, and their Break meter shows the
honest blocked message and never fills:

- B2 — `v11_seadragon`, `v11_sharkking` (animals); `v11_timemachine`,
  `v11_golem`, `v11_goldephant` (vehicles); `v10_dict`, `v10_king`,
  `v10_fairy` (fruit-and-vegetables)
- B1 — `v10_tiger`, `v10_wizard` (clothes-and-accessories);
  `v10_fox` (fruit-and-vegetables); `v10_octopus` (food-and-drinks)

The other 66 bosses fill normally. The spec's weakness table is kept
exactly as specified — changing it (e.g. giving B1/B2 bosses different
weaknesses) is a design decision for Anh, not a silent fix. A topic-
synonym extension was considered and rejected: it would fix only 1 of
the 12 (`v10_octopus`, via V15 topic `food` — 15 B1 words) while
deviating from the specified predicate, and the other 11 have zero
B1/B2 words under any equivalent topic.

## Bug found and fixed during implementation (B-34-1)
- **B-34-1 — `scopeBlocked()` only fired with a Library scope active.**
  As first built, the blocked bar appeared only when a scope was active,
  so the 12 bosses above showed a `0/3` meter that could never fill
  with no explanation. Fixed in `src/v34.js`: `scopeBlocked()` now
  returns true whenever the fight's actual pool holds zero weakness
  words, scope or not. `breakDmg()` / `weakPick()` consult the same
  check, so the meter can never fill when blocked. Fixed via restore +
  re-run of `build_v34.py` (never patched in place); probe re-run
  106/106 ×3.

## Correction to the V17.0 changelog (noted, file not edited)
- `CHANGELOG_V16_4_to_V17_0.md` documents `en33` as containing a
  `bosses` key. That is false: source `en33()` (`src/v33.js:97-110`)
  has no `bosses` key — Chrono boss wins live in `en19`, exactly like
  V11 bosses. The V17.0 changelog file itself was NOT edited.

## What did not change
- Save key `hanvocab.v1` and every player datum (XP/level, gold,
  diamonds, inventory, pets, boss progress, vocabulary, SRS history,
  Firebase accounts). No migration, no new key.
- All layers V6–V33 keep their versions (13.0.0…17.0.0 intact in the
  built file); V34 is 17.1.0 and loads LAST.
- Firebase Auth/Sync code untouched. Live Firebase login/sync is still
  NOT tested — Anh must run the `FIREBASE_SETUP.md` checklist before
  claiming it works; unconfigured, the game plays fully offline and
  says so.

## Files
- New layer: `src/v34.js` (10,945 B), `src/v34.css` (1,226 B),
  `src/v34_data.js` (3,701 B) — mirrored to `out/`, inlined LAST in
  `out/index.html` (2,214,045 B, sha256
  `0b766dad766e25e4ee7a16317af16f9866f29d1cf593336544134d2d7171ee2f`).
- Build: `build_v34.py` (36 replacements: V17 ×13, V25 ×2, V15 ×7,
  V19 ×6, V18 ×7, V33 ×1). Package: `package_v34.py` (run by the
  coordinator after tests).
- Probe: `tools/v34/probe_v34.js` — **106 PASS / 0 FAIL / 0 SKIP,
  ×3 runs** (Node vm, real inline scripts from `out/index.html`).
- Restore: `tools/v34_restore_v17.py` (pristine V17.0 from the V17.0
  ZIP, proved by re-applying replacements); anchor checker
  `tools/v34_check_anchors.py`.

## Update guide
Same as V17.0 (see `GITHUB_DESKTOP_GUIDE.md`, section “Cập nhật lên
V17.1”): unzip, overwrite/add the files from the ZIP (`index.html`,
`v34.js`, `v34.css`, `v34_data.js`, `v17.js`, `v25.js`, `v15.js`,
`v19.js`, `v18.js`, `v33.js`, `build_v34.py`, `package_v34.py`, docs),
**never** overwrite the repo's `firebase-config.js` with the ZIP
placeholder, commit `Upgrade to V17.1: Chrono Complete`, push via a
draft PR (no direct `main` edits, no merge, no force-push). Player data
is untouched (same `hanvocab.v1` key, no new key, no migration).
