# V16 — Smart Learning (Học Thông Minh)

**Version:** 16.0.0 · **Layer:** V27 (`src/v27.js` + `src/v27.css`, loads LAST)
**Base:** V15.3 (commit `f099a2ff`, branch `main`) · **Build:** `build_v16.py` (run once on a fresh V15.3 `out/`)
**Package:** `Korean_English_Vocab_Farm_V16_Smart_Learning.zip`

V16 adds **Học Thông Minh** (Smart Learning): one overlay that watches how you answer
— in normal modes, boss fights and Smart sessions — and turns that into a dashboard,
a weak-words list and a daily plan. No rebuild of the game, no loss of progress:
the Korean game, farm, XP/gems, bosses, pets and the `hanvocab.v1` save all survive
intact. Login stays optional; Firebase sync/login are unchanged and still NOT
live-tested (see `FIREBASE_SETUP.md`).

## How to open it

- **English side:** open the English Hub (or look at the top language bar) and tap
  **🧠 Học thông minh**.
- **Korean side:** on any Korean view, tap the **🧠 Học thông minh** tab next to
  "Bản Đồ Boss" / "Thú Cưng".
- Inside the overlay, switch language with the **🇬🇧 Tiếng Anh / 🇰🇷 Tiếng Hàn**
  toggle. The toggle is V27-local — it never changes your main learning language.

## The three tabs

1. **Bảng điều khiển (Dashboard)** — words learned, due today, weak words, Smart
   streak, 7-day accuracy, recent study minutes, mastery progress, weekly progress,
   plus a "Gợi ý học thông minh" banner (e.g. "bạn có 12 từ đến hạn và 5 từ yếu").
   Every number traces to a real store; anything with no data yet says
   **"chưa có dữ liệu"** instead of inventing a number.
2. **Từ yếu (Weak Words)** — search + filters (Tất cả / Từ yếu / Đến hạn / Mới /
   Đang học / Đã thuộc). Each row shows the word, meaning, part of speech/level
   (EN) or romanization/group (KO), wrong/right counts, last review date (or
   "chưa có dữ liệu"), box as stars (box N/5), a status badge, a 🔊 listen button
   and an **Ôn ngay** button that starts a weak-words session with that word first.
3. **Kế hoạch ngày (Daily Plan)** — pick 5 / 10 / 15 minutes or a custom time.
   The word count is a **labelled estimate** (~2 words/minute), not a promise.
   The plan takes at most 5 new + 10 due + 5 weak words (max 30). If the selected
   library set has fewer words than the plan needs, V27 says so plainly — it never
   silently fills the plan with words from outside the set. Goals for the day:
   complete the plan, ≥80% accuracy, consolidate ≥5 weak words.

## How Smart Practice works

- **English:** multiple choice (EN→VI and VI→EN), type-the-word, listening and
  flashcard self-rate. Each answer goes through the existing `mark15` SRS, so
  boxes, due dates, XP, farm watering and pet XP behave exactly as in normal modes.
- **Korean:** multiple choice (Hangul→meaning and meaning→Hangul), listening and
  self-rate. **No Hangul keyboard typing in v1** (same as the V11.1 boss mode).
  Each answer updates the card's box/due with the same interval table as the
  Korean modes, plus the usual +5/+1 XP and the card's wrong counter.
- Words answered wrong are **re-asked at the end of the same session**. The summary
  shows correct/wrong, XP, real measured minutes, words improved, words still weak
  and the next review date.

## What V27 records (new key `S.v7.en27`)

- **English:** only what the game lacked — per-word last-answer time, consecutive
  wrong/right counts. Right/wrong/box already lived in `S.v7.en` and are read live.
- **Korean:** right/wrong/consecutive counts + last-answer time, **observed by V27
  only** (Smart sessions + the three EN hooks). The UI labels these counts
  "từ khi dùng Học thông minh" where the distinction matters, because old Korean
  history cannot be reconstructed — only `box`, `due` and the sticky wrong counter
  `w` existed before V16, so pre-V16 weakness is estimated from those.
- Sessions (max 30), daily aggregates (max 90 days), per-language study-day
  streaks, plan state, claimed rewards. Per-word maps cap at 1,000 entries with
  LRU pruning; a 150 KB guard prunes aggressively and never blocks saving.
  Typical size is under 15 KB.

## Rewards — and the one proposed amount

- XP comes through **exactly one channel per answer** (the normal per-answer XP).
  There is no end-of-round `score × 2` on top of it.
- **Plan completion: +20 XP, once per day per language** (guarded by a claimed flag,
  same pattern as Library rewards). ⚠️ **This amount is a PROPOSAL (design Q4)
  pending Anh's confirmation** — implemented as proposed and flagged here and in
  the changelog; replaying the same plan the same day awards nothing.
- **7-day Smart streak: +1 💎**, once per week per language (also claimed-guarded).
- No new currency. No double XP.

## Classification (transparent, shown as a reason per word)

- **Mới:** never studied. **Đang học:** box 1–3, not failing. **Từ yếu:** more wrong
  than right, or ≥2 consecutive wrong (Korean: also the old `w ≥ 3` "sick plant" rule).
  **Đến hạn:** box 1–4 and due now. **Đã thuộc:** box ≥4, ≥3 correct, no wrong in
  30 days (without V27 history: box 5 with zero wrong — `box = 5` alone is not
  trusted because "Đã thuộc" in the Library sets box 5 by hand).
- Priority: consecutive-wrong ×10 + (wrong−right) ×3 + overdue days (capped 30) +
  1 for new words; mastered words −100 (refreshers only).

## Update guide

1. Back up your save first (Data → Backup/Export in the game, or copy the
   `hanvocab.v1` localStorage value).
2. Replace the game files with the contents of this ZIP (or deploy the ZIP to
   GitHub Pages the same way as V15.3).
3. Your existing save migrates automatically — V27 creates `S.v7.en27` lazily
   with full defaults on first use. No migration step, no new localStorage key.
4. Firebase: no config change. If you use cloud sync, note the deferred Q1 item
   below — Smart history is last-write-wins across devices until the merge branch
   is approved and applied (see `tools/v16/TODO_Q1_merge_branch.md`).

## Known limits / deferred decisions (honest list)

- **Q1 deferred:** no Firebase safe-merge branch for `en27` yet. On a two-device
  safe-merge, the newer device's whole Smart history wins; the older device's is
  dropped. Patch sketch ready in `tools/v16/TODO_Q1_merge_branch.md`.
- **Q2 deferred:** no hook in Korean normal modes yet. Korean weak detection
  improves gradually from the ship date (Smart sessions + `box`/`due`/`w` proxies).
  A `mark()` hook is a possible follow-up.
- **Q4 proposed:** plan-completion +20 XP is a proposed amount, pending confirmation.
- **Q6:** no Hangul typing in KO Smart Practice v1.
- **Tests:** the 12-spec test situations from the design (hook coverage, no double
  XP, claimed anti-duplicate, plan shortfall honesty, BT `ensureData` path, KO
  derive-only accuracy, 150 KB prune guard, jsdom suite twice on the build + once
  on the ZIP, real-Chrome mobile checks) are run by the test agent after this build;
  see `SMOKE_TEST_V16_2026-11-18.md` when it lands. Firebase login/sync still
  NOT live-tested.
- Old Korean history cannot be reconstructed; fresh installs show "chưa có dữ liệu"
  for accuracy, recent minutes, weekly KO progress and last-review dates until V27
  has recorded data.
- The V14 edge case is unchanged: a saved BT scope + Flashcards right after a fresh
  page load shows "no words" until the Library is opened once (V27 itself always
  calls `ensureData()` before building a plan, so Smart plans are not affected).
