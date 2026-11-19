# Korean & English Vocab Farm — V17.0 CHRONO KINGDOM

**Version 17.0.0 — layer V33 (loads LAST). Base: V16.4 (Data Safety). Date: 2026-11-19.**

**17.0.0 comes from the unshipped V30 Vocabulary World draft** (design
doc `v17-design.md`, never shipped, kept as reference) — this build
takes the number for CHRONO KINGDOM. No V30 file was deleted.

This release adds the final region — **Vương Quốc Thời Gian (Chrono
Kingdom)** — a steampunk time kingdom that unlocks after **70 boss
wins**: 8 new bosses reusing the V19 Universal Combat Engine (no new
engine), 240 new B2 words, 6 story quests through the V27 Smart
Learning engine, Time Echo, Chrono Rift, and 3 new pet species × 3
stages. Nothing else changes: no new currency, no energy system, no
migration, no feature removed, no save schema/key renamed (one new
lazy key `S.v7.en33`).

## What V17.0 adds

### The 70-win gate
- The region opens at exactly **70 boss wins**, counted by a V33-local
  corrected count: 10 old bosses (V15) + 30 V10 arena bosses (V18,
  flat `{win}` records included — the global `bossWinCount()` still
  undercounts those and was deliberately NOT changed) + 30 V11 map
  bosses (V19). The locked overlay shows the real `x/70` progress and
  the real breakdown (e.g. `10/10 · 30/30 · 29/30`), never a fake
  number. Bosses unlock sequentially inside the region (win #1 to
  open #2, and so on), separately per language.
- Entry: **⏳ Chrono Kingdom** button in the English Hub (hub header
  + language bar, added by a MutationObserver decorator) and a
  **⏳ Vương Quốc Thời Gian** tab in the Korean Hub (build-time button
  `v33kotab`, added after `v27kotab`). The overlay is z-index 1500,
  `--ui-*` design tokens, WCAG AA, 44 px targets, no overflow at
  360–430 px.

### 8 Chrono bosses (V19 UCE, game scale)
| Boss | Lv / HP / Def | Hệ | Kỹ năng (V19 palette) | Thưởng lần đầu |
|---|---|---|---|---|
| Tinh Linh Đồng Hồ Cát (`v17_sandwisp`) | 61 / 620 / 7 | earth | veil / tveil / swift | +165 XP, +4 💎 |
| Hiệp Sĩ Quả Lắc (`v17_pendulum`) | 62 / 640 / 7 | earth | shield / tshield / bulwark | +170 XP, +4 💎 |
| Bóng Ma Giây Phút (`v17_specter`) | 63 / 660 / 7 | dark | rift / ttimer / thorns | +175 XP, +4 💎 |
| Bọ Ngựa Bánh Răng (`v17_mantis`) | 64 / 680 / 8 | thunder | gale / tenrage / swift | +180 XP, +5 💎 |
| Chó Săn Vết Nứt (`v17_hound`) | 65 / 700 / 8 | cosmic | chain / tshield / vampiric | +185 XP, +5 💎 |
| Nhà Tiên Tri Lịch (`v17_oracle`) | 66 / 710 / 8 | light | cleanse / theal / bulwark | +190 XP, +5 💎 |
| Titan Nghịch Lý (`v17_titan`) | 67 / 730 / 8 | cosmic | burn / tenrage / thorns | +200 XP, +6 💎, danh hiệu “Kẻ Vượt Thời Gian” |
| Golem Bánh Răng (`v17_geargolem`) | 68 / 750 / 8 | earth | shield / tshield / bulwark | +220 XP, +6 💎, danh hiệu “Vua Thời Gian” |

- Elements are mapped onto the existing V19 element list only
  (Sand→earth, Metal→earth, Dark→dark, Electric→thunder,
  Void→cosmic, Light→light, Time→cosmic). No new element, no new
  skill id — every skill comes from the V19 palette.
- **GEAR GOLEM (final boss) is deliberately different:** a **90-HP
  gear shield** at fight start, only **2 phases** (NO phase-3
  Knowledge Counterattack), and a **time-reversal heal: +10 HP on
  every wrong answer in phase 2**. All three are real guarded
  mechanics in `v19.js`, not display text.
- Boss wins are recorded in `en19` exactly like V11 bosses
  (bilingual mastery + “Bậc Thầy Song Ngữ” work per boss). The
  Collection now shows **78 bosses** (10 + 30 + 30 + 8);
  `TOTAL_BOSSES` is 78.
- Region completion (all 8 won in one language): **+150 XP, +5 💎,
  danh hiệu “Chúa Tể Thời Gian”**, once per language, claimed-guarded.

### 240 Chrono words (B2)
- 4 sets × 60, validated by `tools/v33/validate_words.py` (0 internal
  dupes, 0 overlaps vs all 4,891 existing headwords incl. 306 BT
  phrases, 0 blanks): **Time & Calendar** (`time`), **Space &
  Astronomy** (`space`), **Machines & Engineering** (`machines`),
  **Change & Sequence** (`change`). Every word has EN / KO / VI /
  IPA / POS / example / example-VI. Ids are `v33_<slug>`, `lib:
  'chrono'`, level B2.
- The words enter the shared `WORDS` array through the V33 block
  inside `buildWords()` (same precedent as the BT words). One word
  (`alarm clock`) already existed in the game — it keeps its original
  id and gains the `chrono` library tag instead of a duplicate record.
  No `S.cards` entries are ever created for Chrono words.
- **Library integration is OUT of scope for v1:** Chrono words are
  playable in quests / Echo / Rift / boss fights, but there is no
  5th Library group yet.

### 6 story quests (V27 engine)
| Nhiệm vụ | Từ | Nội dung |
|---|---|---|
| Chiếc Đồng Hồ Vỡ (`q_clock`) | 12 | Time 0–11 |
| Bộ Sưu Tập Bánh Răng (`q_gear`) | 12 | Machines 0–11 |
| Nhà Du Hành Thời Gian (`q_travel`) | 14 | Time 12–17 + Space 0–7 |
| Ký Ức Đã Mất (`q_memory`) | 12 | Change 0–5 + Time 18–23 |
| Thử Thách Người Gác (`q_guardian`) | 12 | Space 8–13 + Machines 12–17 |
| Đếm Ngược Cuối Cùng (`q_final`) | 14 | Time 24–27 + Space 14–17 + Machines 18–21 + Change 6–7 |

- Quests run as real V27 Smart sessions (one guarded replacement
  exports `startSession` on `__v27`; the quest then calls
  `__v27.startSession('en', ids, 'quest')`). Completion is detected
  from the real en27 session records: the session's words must cover
  all quest words **and accuracy must be ≥ 80%** (a 75% run does NOT
  complete — B-33-1, found by `test33.js` §4).
- Rewards come from real stores only, claimed-guarded, once each:
  first clear **+20 XP**, ≥ 90% accuracy an extra **+10 XP**, and the
  final quest adds **+1 💎**.

### Time Echo
- Replays your most-wrong English words (from en27 `cw` records,
  most-wrong first, up to 10) as a V27 session (`kind: 'echo'`).
- Honest empty state: with no wrong-word records it says so
  (“Chưa có từ nào trả lời sai”) and refuses to start. No extra
  bonus — the session pays through the normal `mark15` path.

### Chrono Rift (Khe Nứt Thời Gian)
- 3 floors × 7 questions (floor 1 Time 28–34, floor 2 Space 18–24,
  floor 3 Machines 22–28 — disjoint from all quest word lists).
- Floor N+1 unlocks only when floor N reaches **≥ 70%** accuracy.
- Rewards once per day per floor, accuracy-scaled: ≥ 90% → **+40 XP
  / +2 💎**; ≥ 70% → **+25 XP / +1 💎**; below 70% → **+10 XP**.
  The day rolls over at midnight (local date string), so a new day
  allows claiming again.

### 3 new pet species × 3 stages + 3 eggs (V23, existing types only)
| Loài | Hệ | Kỹ năng | Trứng | Giá / Nở |
|---|---|---|---|---|
| Hươu Sao (`stardeer`) | nature | passive wisdom, active heal | Trứng Sao | 1200 coins / 120 phút |
| Bọ Bánh Răng (`gearbeetle`) | thunder | active shield, passive crystal | Trứng Bánh Răng | 1000 coins / 120 phút |
| Kỳ Lân Vũ Trụ (`cosmicunicorn`) | light | passive storm, active dmg | Trứng Vũ Trụ | 2000 coins / 240 phút |

- Registered into the live `__V23_DATA` species/eggs, guarded +
  idempotent (a second registration adds 0). Evolution uses the
  existing stones/costs (Lv 10 / Lv 20). The 3 new species join the
  normal team-battle aggregation (wisdom / crystal / storm all
  verified live).
- New collection milestone: **45 forms → +60 💎, danh hiệu “Bậc
  Thầy Thời Gian”** (the existing ladder topped out at 36).
- **Pet image paths (MOVE decision):** the art lives ONLY under
  `assets/pets/v15/chrono/<sp>_s{1,2,3}.png` and
  `assets/pets/v15/eggs/chrono_egg_{star,gear,cosmic}.png` — because
  `v23.js` hardcodes the `assets/pets/v15/` + stage subpath and the
  `assets/pets/v15/eggs/` + bare filename. There is NO
  `assets/pets/v17/` anywhere, and no duplicate bytes in the ZIP.

### Save: new lazy key `S.v7.en33`
- Shape: `{bosses:{}, quests:{qid:{done,claimed,acc,at}}, rift:{day,
  best:{}, claimed:{}}, regionClaimed:{en,ko}, pending:{}, created}`.
  Created lazily on first Chrono use; no migration, no existing key
  renamed. Boss wins live in `en19`, not `en33`.
- Sync: new `en33` merge branch in `v20_sync.js` (quests union with
  done/claimed/acc/at MAX, rift best MAX per floor + claimed union
  for the newer day only, regionClaimed per-language MAX, created
  MIN, pending launches dropped as session-local) + a `hasProgress`
  entry so an en33-only local save is never silently downloaded over.
  (B-33-2: the first merge draft used `unionTrue` for
  `regionClaimed` — that helper is local-priority last-writer-wins,
  so a local `{ko:0}` overwrote a cloud `{ko:1}`. Fixed to explicit
  per-language MAX; `unionTrue` itself is unchanged for its other
  1/absent-only call sites.)

## What is NOT in this release (out of scope)
- Library integration (5th group) for Chrono words — v1 has quests /
  Echo / Rift / boss fights only.
- Keyboard Hangul typing in boss fights (V11.1 note: Việt → Hàn is
  still multiple-choice in the UCE).
- Claude #3/#4/#5 follow-ups, V9 word fixes (`gram`, `pomegranate`),
  V14.1 Developing Tactics, PR #7 cleanup batches, F-12 full-wipe
  question (still pending Anh). No V28/V29/V30 files.

## Known limits (honest)
- **Firebase sync/login NOT tested live** — same as V16.4. The ZIP
  ships the placeholder `firebase-config.js`; Anh must run the
  `FIREBASE_SETUP.md` checklist before claiming sync/login works.
  Unconfigured, the game plays fully offline and says so. The en33
  merge branch is tested in the Node vm suite against the real
  `v20_sync.js` (merge/validate/export/conflict), not against a live
  Firestore.
- **Chrome testing:** the CDP driver `tools/v33/verify-v33c.js` is
  staged and run — see `SMOKE_TEST_V17_0_2026-11-19.md` §4 for the
  gates and their verdicts. The `test33.js` Node vm suite ran
  **204 PASS / 0 FAIL / 8 SKIP** (twice on the build + once on the
  packaged ZIP); the 8 SKIPs are the vm harness's scope limit only
  (§9 Chrome-only gates).
- **Launching a Chrono session while a Smart session is mid-flight
  replaces it** — V27 exposes no session accessor to guard against
  that, so the overlay does not block it; the running session's
  answers are still recorded in en27, they just stop rendering.
- The two BRIEF anchors that turned out wrong in source are
  documented in the changelog (V19 phase/phasetxt anchors need
  longer unique context; the V18 challenge anchor also matches
  `collDetail` — both sites got the fall-through, deliberately).

## How to use (player)
1. Win 70 bosses anywhere (old + V10 arena + V11 map — the Chrono
   overlay shows your real `x/70` and the breakdown).
2. Open **⏳ Chrono Kingdom** (English Hub) or the **⏳ Vương Quốc
   Thời Gian** tab (Korean Hub). Fight the 8 bosses in order, in
   either language — winning in both languages earns “Bậc Thầy Song
   Ngữ” per boss.
3. Play the 6 story quests (≥ 80% to complete, ≥ 90% for the bonus),
   Time Echo for your weakest words, and Chrono Rift floors (≥ 70%
   to unlock the next floor; rewards once a day per floor).
4. New pets: buy Trứng Sao / Trứng Bánh Răng / Trứng Vũ Trụ in the
   Pet Shop, hatch, evolve at Lv 10 / Lv 20 with the usual stones.

## Files
| File | Nội dung |
|---|---|
| `src/v33.js`, `src/v33.css`, `src/v33_data.js` | Lớp V33 mới, version 17.0.0, nạp CUỐI (sau V32): gate 70-win, 8 boss, 6 quest, Time Echo, Chrono Rift, 240 từ, 3 loài pet, overlay z-index 1500, token `--ui-*`, 44 px. |
| `build_v33.py` | Script build V17.0: kiểm tra base là V16.4 nguyên vẹn (sha256 `c3639bc7…`), áp dụng đúng 13 replacement (V19 ×6, V18 ×2, V21/V27/V20 ×2, V15 ×1), thêm nút KO `v33kotab`, đổi title, chèn lớp V33 cuối cùng, assert marker/thứ tự/version/KO không đổi/không có marker ngoài phạm vi, `node --check` 8 file. Chạy đúng 1 lần, không chạy lại trên bản đã xong. (Docstring + changelog ghi lại 2 bản sửa B-33-1/B-33-2 sau build đầu.) |
| `package_v33.py` | Script đóng gói ZIP V17.0 + kiểm tra `index.html`, `v33.js`, `v33.css`, `v33_data.js`, `build_v33.py`, `package_v33.py`, `tools/v33/test33.js` trong ZIP; marker V33 cuối cùng; fragment V31 + V33 còn đủ (kèm 2 dòng sửa B-33-1/B-33-2); PNG V10 30 / V11 30 / V17 8 / pet v15 53 (36+5+9+3); không có `assets/pets/v17/`; KO 1× v33kotab; `firebase-config.js` trong ZIP là placeholder. |
| `data/v33_words.json` | 240 từ Chrono (4 set × 60) + `tools/v33/validate_words.py` (0 trùng, 0 thiếu). |
| `tools/v33/` | `BRIEF_V33.md` (brief binding), `gen_v33_data.py`, `validate_words.py`, `fix_v17_transparency.py`, `test33.js` (Node vm suite), `verify-v33c.js` (Chrome CDP driver). |
| `README_V17_0_CHRONO_KINGDOM.md` | Hướng dẫn này. |
| `CHANGELOG_V16_4_to_V17_0.md` | Changelog đầy đủ V16.4 → V17.0. |
| `SMOKE_TEST_V17_0_2026-11-19.md` | Báo cáo kiểm thử V17.0 (build gates; test33 204/0/8 ×3; Chrome driver). |

## Update guide
1. Back up first (recommended): in the running game, English Hub →
   tab **Sao lưu** → **Xuất file sao lưu (.json)** and keep the file
   somewhere safe. Player data lives in each player's browser; updating
   the code on GitHub Pages does **not** delete it.
2. Replace `index.html` and add `v33.js`, `v33.css`, `v33_data.js`,
   `build_v33.py`, `package_v33.py`, the art under `assets/bosses/v17/`
   + `assets/pets/v15/chrono/` + `assets/pets/v15/eggs/chrono_egg_*.png`,
   plus the three V17.0 docs. Keep every older file and `assets/` (the
   ZIP contains everything).
3. Commit + push, wait 1–2 minutes, open the GitHub Pages URL.
4. Check: with a save that has 70 boss wins, open **⏳ Chrono Kingdom**
   — the gate shows `70/70` and the 8 bosses; with fewer wins it shows
   the real `x/70` and no fight buttons.
5. To roll back to V16.4: revert the V17.0 commit in GitHub Desktop.
   Player data is unaffected (V17.0 adds only the lazy `en33` key;
   `v33.js`/`v33.css`/`v33_data.js` left over after a revert can be
   deleted — V16.4 never loads them; the `en33` data in a save is
   inert without the layer).
