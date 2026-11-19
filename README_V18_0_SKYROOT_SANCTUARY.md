# Korean & English Vocab Farm — V18.0 SKYROOT SANCTUARY

**Version 18.0.0 — layer V35 (loads LAST). Base: V17.1 (Chrono Complete). Date: 2026-11-19.**

V17.1 finished the Chrono Kingdom integration. V18.0 opens the next region: Skyroot Sanctuary — floating islands, an ancient forest, cloud waterfalls and a wind temple — with 8 new bosses, 3 new pets, 240 new words and 6 new story quests. Everything follows the V17.0 Chrono pattern (same layer shape, same engines, same save discipline): no new currency, no energy system, no migration, no feature removed, no save schema/key renamed, **one new lazy localStorage key only** (`S.v7.en35`; boss wins stay in `en19`, as in V17.0).

## What V18.0 adds

### 1) Skyroot Sanctuary region — 8 bosses
- **Gate:** Skyroot opens only after **GEAR GOLEM** (`v17_geargolem`, the Chrono final boss) is defeated **in that language** — the Chrono region must be complete first. The locked overlay shows the real GEAR GOLEM status per language plus the corrected total win count (reused from `__v33.correctedWinCount` — never reimplemented, never the buggy `bossWinCount()`).
- **Bosses** (V19 Universal Combat Engine, no new engine; stats as given by ChatGPT, on game scale):

| Boss | Vietnamese | Lv | HP | Element | Mode |
|---|---|---|---|---|---|
| Breeze Lynx | Linh Miêu Gió Nhẹ | 69 | 760 | Wind (Gió) | speed |
| Thornwing Stag | Hươu Sừng Gai | 70 | 770 | Plant → Nature (Thiên nhiên) | mc |
| Cloud Serpent | Xà Mây | 71 | 785 | Water (Nước) | listen |
| Moss Colossus | Khổng Lồ Rêu Xanh | 72 | 795 | Earth (Đất) | type |
| Tempest Harpy | Ưng Nữ Bão Tố | 73 | 810 | Thunder (Sấm) | speed |
| Crystal Treant | Cổ Thụ Pha Lê | 74 | 820 | Crystal → Cosmic (Vũ trụ) | grammar |
| Aurora Griffin | Sư Điểu Cực Quang | 75 | 835 | Light (Ánh sáng) | mixed |
| Skyroot Empress | Nữ Hoàng Thiên Căn | 76 | 850 | Nature (Thiên nhiên) | mixed |

- **Element mapping** (onto the real V19 `EL` in `src/v19_data.js`): Wind→wind, Plant→nature, Water→water, Earth→earth, Thunder→thunder, **Crystal→cosmic** (no `crystal` key exists in the V19 EL; crystal refracted light maps to cosmic — V33 precedent Time→cosmic), Light→light, Nature→nature. No parallel element system.
- **Skills** use only the V19 palette (elem: burn/freeze/chain/veil/cleanse/regen/heal/gale/shield/rift; tact: tshield/theal/ttimer/tveil/tenrage; pass: bulwark/vampiric/swift/thorns). No boss-specific combat branches (no golem-style shield/heal).
- **Sequential unlock** inside Skyroot + the gate; wins land in `en19` (verified — no `en35.bosses` key is ever created; the V17.0 changelog's false `en33.bosses` line is corrected in this release, see CHANGELOG).
- **Region completion:** win all 8 bosses in one language → **+150 XP, +5 💎, title “Chúa Tể Thiên Căn”**, once per language, claimed-guarded in `en35.regionClaimed`.
- **Boss total is now 86** (10 + 30 + 30 + 8 Chrono + 8 Skyroot). Entry from both hubs: EN Hub decorator button “🌿 Skyroot Sanctuary” + KO tab button `v35kotab` (build-time, after `v33kotab`).

### 2) 240 Skyroot words — Library 6th group, from day one
- **4 sets × 60:** Climate & Environment (Khí hậu & Môi trường), Science & Innovation (Khoa học & Đổi mới), Society & Culture (Xã hội & Văn hóa), Mind & Character (Tâm trí & Tính cách). Level B2. Ids `v35_<slug>`.
- **120 EN-led + 120 KO-led** (30 + 30 per set). The `led` field is kept in `src/v35_data.js`; in the shared `WORDS` array every record still carries an English headword with a Korean translation (V33 treatment) — **no KO deck entries are created**. The Library group says so honestly: KO-led Skyroot words are learned through the selected Korean deck (boss fights / Smart Learning); in the shared store they appear with an English headword.
- The Library gains a **Skyroot Sanctuary group** (after Chrono): 4 set cards with real progress bars, group summary, search / POS filter / status filter / favorites / flashcards via the shared `wordCard()` / `filterWords()` / pager. Scope `{kind:'lib', lib:'skyroot', set}` drives modes, SRS review, and boss fights exactly like the Chrono scope.
- **Rewards** (same scale as Chrono, once-only via `en17.claimed`): per set **+50 XP / +2 💎**, all 240 words **+200 XP / +5 💎**.
- **SRS:** no enrolment code — `mark15()` already enrols any `WORDS` id (verified for Chrono in V17.1; same path for `v35_`). POS is normalised long→short at the merge point (V34-BUG-1 lesson applied from day one), so the Library POS filter works on Skyroot words.

### 3) 6 story quests (V27 engine, reused)
Lost Sky Islands (Đảo Trời Đã Mất) · Wind Temple (Đền Gió) · Ancient Roots (Rễ Cây Cổ Thụ) · Crystal Guardians (Người Gác Pha Lê) · Sky Beast Trials (Thử Thách Thú Trời) · Empress Awakening (Nữ Hoàng Thức Tỉnh). Each is a V27 session of 12–14 real Skyroot words (lists pairwise disjoint); completion needs **≥ 80% accuracy**; reward **+20 XP** first clear, **+10 XP** extra at ≥ 90%, final quest **+1 💎** — all claimed-guarded in `en35.quests`. A below-threshold run consumes the attempt but does not mark the quest done (V33 B-33-1 lesson). The Smart mid-flight guard (`__v27.endEarly()`) is in `v35.js` `launchSession()` from day one (V34 lesson).

### 4) 3 new pets × 3 stages + 3 eggs
- **Cloud Fox (Cáo Mây, Wind)** — active “Gió Lốc Cáo Mây” (dmg 30), passive “Bão Gió” (storm 8), ult “Lốc Xoáy Thiên Căn” (dmg 60).
- **Sprout Owl (Cú Mầm, Nature)** — active “Hồi Phục Mầm Xanh” (heal 70), passive “Trí Tuệ Cú Mầm” (wisdom 1), ult “Ánh Sáng Tri Thức” (heal 140).
- **Storm Ram (Cừu Bão, Thunder)** — active “Khiên Bão” (shield 80), passive “Sấm Bão” (storm 8), ult “Sấm Sét Thiên Căn” (dmg 60).
- ChatGPT gave no skill descriptions; the skills above are defined from each species' theme using **existing v23 skill types only** — all real and observable in V18/V19 combat (`teamBattle` / `castTeamSkill` / `onFightCorrect`).
- Eggs: Trứng Mây 1200 coins / 120 min · Trứng Mầm 1000 / 120 · Trứng Bão 2000 / 240. Evolution uses the element's stone + feather/fruit/coins per `PET_EVO_COST` — no new materials.
- **Wind element:** `wind` did not exist in v23 `PET_ELEMENTS` / `PET_MATERIALS`, so the build adds it explicitly (`R-V35-V23DATA-WIND` / `R-V35-V23DATA-STONE`: `wind:{n:'Gió',icon:'🌪️',color:'#8FE3C0'}` + `stone_wind` “Tinh Thể Gió”) — an extension of the existing map, not a parallel system. Without it, `D.elements[sp.el].icon` would throw for the fox and its evolution stone would not exist.
- **Pet art lives under `assets/pets/v18/`** (8 boss PNGs under `assets/bosses/v18/`, 9 stage + 3 egg PNGs under `assets/pets/v18/`), unlike V33's MOVE decision (Chrono pets live under `assets/pets/v15/` because `v23.js` hardcodes that prefix). `v23.js` `stageImg()` / `eggImgHTML()` are extended by the build to resolve the `v18/` prefix (`R-V35-V23-STAGEIMG` / `R-V35-V23-EGGIMG`). No duplicate bytes.
- **Collection milestone:** 54 forms (45 + 9) → **+70 💎, title “Bậc Thầy Thiên Căn”**, once, via `registerPets()`.

### 5) Boss Weakness — all 8 Skyroot bosses fillable
- Weakness table in `__V35_DATA.weakExplicit`, V34 format (`{kind:'skyroot', key:<set>}`), 2 bosses per set: climate → Breeze Lynx, Tempest Harpy; science → Cloud Serpent, Crystal Treant; society → Thornwing Stag, Aurora Griffin; mind → Moss Colossus, Skyroot Empress.
- `v34.js` `weakFor` / `weakMatch` / `weakName` are extended by the build to understand kind `skyroot` (`w.skyrootSet === key`); zone `skyroot` falls back to `{kind:'skyroot', key:'climate'}`. KO fights keep the deck-based weakness (`{kind:'ko'}`).
- **Every Break meter is fillable:** each set holds 60 B2 words, all in the boss-fight pool (V17.1 lesson — 12 Chrono-era bosses have unfillable meters because their weakness topics hold no B2 words; not repeated here). Verified statically in the build (60 words per set).

## Save & sync
- **New lazy key `S.v7.en35`** (created on first Skyroot use; no migration): `{quests:{qid:{done,claimed,acc,at}}, regionClaimed:{en,ko}, pending:{}, created}`. Boss wins stay in `en19`. Worst case < 10 KB.
- **Cloud merge** (`v20_sync.js`, mirrors the en33 branch): quests union MAX (done/claimed/acc/at), regionClaimed union per-language MAX, created MIN, pending dropped, XP/gems never summed. `hasProgress` returns true for en35 quest or region-claim data.
- No change to `hanvocab.v1`, XP/gold/gems, Firebase Auth/Sync, login, or any existing save key.

## What did NOT change
- Korean game, farm, XP/gold/diamonds, all 78 earlier bosses, pets, Smart Learning, SRS, Library groups 1–5, Firebase — untouched except the 29 guarded build replacements listed in the changelog.
- No new currency, no energy system, no Time Echo / Rift equivalent (not in the V18.0 scope — Skyroot has quests only).
- No boss-specific combat branches; no new engine of any kind.

## Files
- New layer: `src/v35.js`, `src/v35.css`, `src/v35_data.js` (generated by `tools/v35/gen_v35_data.py` from `data/v35_words.json`).
- Build: `build_v35.py` (gates on the V17.1 hash, refuses if v35 present, pre-passes every anchor before mutating), `package_v35.py`.
- Art: `assets/bosses/v18/` (8 PNGs) + `assets/pets/v18/` (12 PNGs), byte-identical to `tools/v35/assets-staging/`.
- Docs: this README, `CHANGELOG_V17_1_to_V18_0.md`, `SMOKE_TEST_V18_0_2026-11-19.md`; V18.0 sections appended to `CHANGED_FILES.md` + `GITHUB_DESKTOP_GUIDE.md`.

## Known limits & what still needs Anh's live test
- **Firebase sync/login is NOT tested live** — run the `FIREBASE_SETUP.md` checklist (same as every version). Unconfigured, the game says so and guest play is full.
- **Live browser / real phone / speech / first-open checks are NOT done in this environment** — Anh to test on GitHub Pages (touch, safe-area, Safari). The jsdom suite for V35 is the test agent's job (`tools/v35/test35.js` — not written yet; `__v35._test` probes are exposed for it).
- **KO-led words:** 120 Skyroot words are KO-led in the source, but the shared store carries them as English-headword records (V33 treatment). No KO deck entries are created; KO learning of Skyroot words goes through the selected Korean deck. This is documented in the Library group note, not hidden.
- **Crystal→cosmic** is a mapping decision (no `crystal` key in the V19 element map); the boss chip shows “🌀 Vũ trụ”.
- **Nothing pushed to GitHub.** Push manifest: `tools/v35/PUSH_MANIFESTS.md` section (b) — base branch `muse/chrono-complete-v171` (to exist after the V17.1 push), target `muse/skyroot-sanctuary-v180`. **Snapshot-push is text-files-only, so the 20 PNG assets cannot go in the snapshot push** — the art needs another push route as a follow-up (flagged in the manifest).

## Update guide (GitHub Desktop)
Same as V17.1 (see `GITHUB_DESKTOP_GUIDE.md`, V18.0 section): copy the new/changed files from the ZIP into the repo working copy, commit `Upgrade to V18.0: Skyroot Sanctuary`, push to branch `muse/skyroot-sanctuary-v180`, open a Draft PR against `muse/chrono-complete-v171` (stacked — no merge into `main`, no force-push). Never push `firebase-config.js`. Player data is unaffected (same `hanvocab.v1` key; one new lazy key `en35`).
