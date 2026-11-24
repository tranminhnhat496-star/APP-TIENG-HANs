# Korean & English Vocab Farm — V19.5 Round-5 Bug Fixes (Sửa 4 lỗi từ vòng rà lỗi 5)

**Version 19.5.0 — layer V50 (loads LAST). Base: V19.4 (layer V49, 19.4.0). Date: 2026-11-23.**

Round 5 ("rà lỗi" toàn bộ game, 2026-11-22) found 4 confirmed defects in V19.4. V19.5 fixes exactly those 4 — nothing else. The 5th finding, C-R5-1 (MAJOR: boss grammar/sentence correct answers pay 0 XP), is NOT in this build: it needs a director decision (Claude), and is recorded as pending in the changelog. OBS-1 (stale Counterattack question re-asked untimed) is recorded as a lead, also not fixed here.

**Honest testing note:** verified by `build_v50.py` (base-hash gate on the V19.4 hash `0b9139ef…`, exact-match anchors, marker order, `node --check`), by the vm suite `test50.js` (**181 PASS / 0 FAIL / 7 SKIP, ×3 runs** on the final built `out/`) and by real-Chrome gates `verify-v50c.js` (**81/81 PASS, ×2 runs**) in Chrome 157, with **0 console errors, 0 warnings, 0 JS dialogs**. Every defect was proved first on the pristine V19.4 base, in Node vm (`tools/v50/repro-v50.js`, **28/28 reproduced**) and in real Chrome (`tools/v50/verify-v50c.js` run on the pristine backup dir, **63/80** — the 17 failures are exactly the 4 fix-gates + the V19.5 title/marker checks). Speech gates use a controllable stubbed SpeechRecognition (no real mic in headless Chrome) — a real-mic test on Anh's phone is still needed, as for V19.4. Firebase login/sync is untested live, as in every version — run `FIREBASE_SETUP.md`.

## Gameplay impact — read this first

- **F-1 (High): a stale speech result can no longer answer a later question.** In V19.4, restarting a boss fight while the mic was still live left the old recognition running; the new fight reset its token to 0, so the next "Nói" tap reused token 1 — the exact token the orphaned recognition had captured — and its late transcript was scored against the new question (proved live: old "lecture" answered new "progress", HP 130→104; same via hub navigation and in the v19 engine). Now `startFight()` calls `stopSpeak()` FIRST in both engines, aborting the old recognition before the new fight object is created, and the token is monotonically increasing across fights (1, 3, 5, …), so an orphaned result can never pass the token guard even if it fires. `next()`/`close()` were already guarded and are unchanged. The player-visible change: restarting a fight mid-speech no longer risks a wrong answer or a free correct answer from the old mic session.
- **C-R5-2 (Minor): the Smart Learning weak list no longer shows "Đến hạn 20779 ngày".** Learned words with no due date used to show days-since-epoch (20,779 days) because the overdue computation defaulted a missing due date to 0. They now read **"Đến hạn hôm nay"** with overdue 0. No due dates are invented and no `en15().due` values are backfilled — a word with a real due date still shows its real lateness ("Đến hạn 3 ngày"). Side effect, honest and intended: the phantom +30 priority those words used to get is gone, so they rank lower in the top-100 weak list (they are still listed under the "Đến hạn" filter).
- **C-R5-3 (Minor): Sentence Forge "Điểm" is now actually tracked.** The intro promised "Điểm = số từ × hệ số độ khó" and each correct answer showed "+21 điểm", but no score was ever stored or shown. Now each session accumulates its score, the session total and the best single-session score are persisted in the existing `S.v7.en48.forge` subkey (`scoreTotal`, `bestScore` — no new save key, no XP/SRS change), and the session-end screen shows **"Điểm buổi: X điểm · Điểm cao nhất: Y điểm"**; the Forge intro shows the best score too. A later, worse session adds to the total but never lowers the best.
- **C-R5-4 (Minor): KO Hub buttons are now real 44px touch targets at 360px.** All 11 sub-44px buttons on the KO home now measure ≥ 44px (header 34px → 44px, "Người chơi" 40px → 44px, tab/row buttons 42px → 44px), with no horizontal overflow at 320–430px and no other layout change. Two follow-ups found by the Chrome gate on a fresh profile are fixed in the same layer: the base `:root #sk,:root #sn` rule beats a bare `#sk,#sn` on specificity, so the header rule mirrors the base selector; and the first-run farm chooser "Để sau" link (17px) gets the same 44px.
- **Rewards, XP, SRS, pets, bosses and the save schema are unchanged** except the Forge score fields above (which add no XP). No new save key. The v15 speak mode, the v48 Dojo and the v49 boss-mic fix are untouched except regression checks.

## What V19.5 changes

### 1. New layer files (`src/v50.js`, `src/v50.css`)

- `window.__v50={version:'19.5.0'}` — a version marker only: no functions, no localStorage, no save calls. Its header comment documents the 4 fixes and the deliberate non-fixes.
- `src/v50.css` — the C-R5-4 rules: `.v7btn{min-height:44px}`, `:root #sk,:root #sn{min-height:44px}`, `#v21avatarbtn{min-height:44px}`, `.v15link{min-height:44px}`, and `@media(max-width:640px){:root .tabs .tab{min-height:44px}}`.

### 2. `startFight()` in both engines (`src/v18.js`, `src/v19.js`)

- `stopSpeak();` is now the first call in `startFight()`, before the new `F` object is created — it aborts the live recognition and bumps the token.
- The new `F` literal starts `speakToken:_speakSeq50` (module-level `var _speakSeq50=0;`, synced from `F.speakToken` inside `stopSpeak()`) instead of `speakToken:0` — the token only ever grows across fights. `next()`/`close()` are untouched.

### 3. Due-less words (`src/v27.js`)

- `prioOf`: `var overdue=(box>0&&due)?Math.max(0,(now-due)/864e5):0;` — a due-less word contributes 0 overdue days (was: days since epoch, capped at +30 priority).
- `classifyEN` + `classifyKO`: `var od=due?Math.floor(Math.max(0,(now-due)/864e5)):0;` with reason `od>0 ? 'Đến hạn '+od+' ngày' : 'Đến hạn hôm nay'`.

### 4. Forge score (`src/v48.js`)

- `defEn48` + the `en48()` fallback forge object gain `scoreTotal:0,bestScore:0` (with `||0` backfills on the `en48()` read path, so existing saves need no migration).
- `forgeCheck()` accumulates `FS.score=(FS.score||0)+sc` and returns the per-answer `score:sc`; `forgeNext()`'s done branch persists `scoreTotal`/`bestScore` and returns `score:FS.score||0`; the end screen shows "Điểm buổi / Điểm cao nhất", and the intro stats line shows "Điểm cao nhất".

## Files changed vs V19.4

- **CHANGED (5):** `index.html`, `v18.js`, `v19.js`, `v27.js`, `v48.js`
- **ADDED (11):** `v50.js`, `v50.css`, `build_v50.py`, `package_v50.py`, `README_V19_5_ROUND5_BUG_FIXES.md`, `CHANGELOG_V19_4_to_V19_5.md`, `SMOKE_TEST_V19_5_2026-11-23.md`, `tools/v50/test50.js`, `tools/v50/verify-v50c.js`, `tools/v50/repro-v50.js`, `tools/v50/PUSH_MANIFESTS.md`
- **REMOVED (0)**
- **NOT in this build (deliberate):** C-R5-1 (MAJOR — needs a director decision), OBS-1 (Low lead), and all other pending decision items (C-03, C-08, F-12, farm harvest +35 vs +25, bubble/shop icons, "Từ vựng của tôi", F4 remainder, F-05/F-07 observers, .v20modal, C-09).
