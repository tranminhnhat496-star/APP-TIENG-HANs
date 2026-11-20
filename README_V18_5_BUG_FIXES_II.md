# Korean & English Vocab Farm — V18.5 BUG FIXES II

**Version 18.5.0 — layer V40 (loads LAST). Base: V18.4 (Korean Bosses). Date: 2026-11-20.**

V18.5 is the second bug-fix release, built from Anh's "RÀ LỖI" (scan for bugs) on 2026-11-20 16:14. The review ran in three parallel passes (V39 regressions, the known-unfixed list from V18.1, a whole-game systematic scan) — 26 findings total — then every suspected bug was reproduced first on the pristine V18.4 base in real Chrome 157 (or with a Node vm proof for pure-logic bugs) before any fix was written. **12 confirmed, safe bugs are fixed here. 9 findings need Anh's decision and are NOT fixed — they are listed under "Not fixed / still open" with the exact question to answer.** No new bosses, no new words, no new art, no reward/stat/SRS/region-gate changes beyond the fixes themselves, no save-schema change, no new localStorage key. Anything not verified is listed instead of being fixed blind.

## What V18.5 fixes

### 1. C-01 (SEVERE) — Safe-merge silently dropped the whole `ko16` subkey

- **Evidence:** `mergeSaves` (`src/v20_sync.js:164-360`) has a merge branch for every other subkey but NO `ko16` branch, so it fell to the newer-wins default. `ko16 = {levels:{}}` (Smart Import, v16) holds per-card Korean levels of imported words. Node vm proof: local `{cardA:3, cardB:2}` + cloud `{cardA:1, cardC:5}` (cloud newer) → merged `{cardA:1, cardC:5}` — cardB lost, cardA downgraded 3→1. That is silent player-data loss on any two-device sync where the cloud save is newer.
- **Fix (1 build replacement, `R-V40-V20-KO16`):** a `ko16` branch before the default line, merging `levels` per-key MAX (mirroring the `en` branch); other ko16 keys fill-if-missing.
- **Verified:** Node suite `tools/v40/test40.js` §40A — cloud-newer keeps MAX 3 / cardB survives / cardC present; local-newer symmetric; one-sided ko16 adopted whole. Chrome gates unaffected (merge is pure logic; the Chrome driver covers the UI-facing fixes).

### 2. C-02 (MAJOR) — Pet team-skill damage bypassed the boss shield entirely

- **Evidence:** `castSkillInFight` (`src/v23.js:764`) subtracted `r.dmg` straight from HP; normal answers halve through the shield (`src/v18.js:487`, `src/v19.js:540`: `dealt=max(1,ceil(dmg/2))`, `F.shield=max(0,F.shield-dealt)`). Team-skill damage up to ~120 (ultimate 60 + 2×Lv) vs GEAR GOLEM's 90-HP shield. Also, a non-lethal team skill never re-ran `checkPhase()`, so a boss dropped below 50%/20% stayed in its old phase until the next answered question. Reproduced on the pristine V18.4 base (`tools/v40/repro-v40.js` R2): v10_panda fight (shield 30, HP 150), dragon st=1 lv=10 team (activeVal 50), energy 10 → `castSkillInFight()` → HP 150→100 (full 50), shield stays 30. 0 console errors.
- **Fix (3 build replacements, `R-V40-V23-SHIELD` + `R-V40-V18-CHECKPHASE` + `R-V40-V19-CHECKPHASE`):** skill damage now goes through the same shield-halving step (map bosses → the V19 `checkPhase`, arenas → the V18 one); the toast is corrected when the shield cuts it (damage number replaced + "(Khiên boss chặn một nửa.)"); `checkPhase()` is called after non-lethal skill damage and exposed on both `_test` exports (V36 `resolveLethal` precedent).
- **Verified:** Node suite §40C — panda: HP 150→125, shield 30→5, toast "Gây 25 sát thương" + "Khiên boss chặn một nửa.", fight still open; Legendary leg[0]: skill drops HP below 50% → phase 2 at once with the phase-2 banner; lethal skill (25 dealt vs 20 HP) resolves as a win. Chrome gate V40-B — same numbers live, toast text read from the painted `.pp` element: "✨ Hơi Thở Lửa! Gây 25 sát thương cho boss. (Khiên boss chặn một nửa.)"; Legendary Hắc Long Nham Hỏa (maxHp 220) → phase 2 + "⚡ Hắc Long Nham Hỏa cường hóa! Giai đoạn 2 — Hỏa Ngục!".

### 3. B-8 (MAJOR) — BT scope + Flashcards right after a fresh page load showed "no words"

- **Evidence:** the V14 known edge case, re-verified as affecting ALL 10 modes (via `pickPool`, `src/v15.js:651-654`) plus SRS Review (via `inScope15`), not just Flashcards: `wordsFiltered` with a BT scope returns 0 before `ensureData()` attaches the lazy BT JSON, and `pickPool`'s fallback re-applies the scope instead of rescuing it. `grep ensureData src/v15.js` → zero hits. Reproduced on the pristine V18.4 base (repro R1): BT scope + fresh load + Flashcards directly → "Không có từ nào cho bộ lọc này." (`btAttached:false`). Opening the Library once fixed it — which is why it survived since V14.
- **Fix (3 build replacements, `R-V40-V15-STARTMODE` + `R-V40-V15-REVIEWSTART` + `R-V40-V15-LEARNHTML`):** a guard in `startMode` (BT scope active and `window.__V22_BT` unset → loading state "Đang tải bộ từ Basic Tactics…", `ensureData().then(...)` re-starts the mode, guarded on `HUB.mode===id` so a mode switch mid-load can't resurrect the old one) + the same guard in `reviewStart` (with a `pop15` loading notice) + a fire-and-forget `ensureData()` prefetch in `learnHTML` when a BT scope is active (memoised, cheap — so the mode the player picks next usually starts without waiting).
- **Verified:** Node suite §40D — startMode shows the loading state synchronously, then Flashcards starts with BT words after ~800 ms; reviewStart the same; learnHTML prefetch attaches the data; with data attached, startMode starts at once. Chrome gate V40-A — the exact repro flow on a fresh load: scope survives the reload, BT data unattached at first, loading state caught synchronously ("Đang tải bộ từ Basic Tactics…"), Flashcards started with BT words ("teens", Câu 1/20), no "no words".

### 4. A-F2 (MINOR) — the V18/V19 KO warning banner vanished after question 1

- **Evidence:** the V18 <8-card banner was cleared by `next()` (`F.banner=null`, `src/v18.js:574`; same in `v19.js:643`), so it showed only for Q1; `checkPhase()` could also overwrite it mid-fight (Legendary phase change). Reproduced on the pristine V18.4 base (repro R4, second pass — the first pass hit a reseed-timing artifact: a pending V20 debounced save flushed on beforeunload after the localStorage edit; a 1.5 s settle before reload reproduces it cleanly): 5-card KO fight → Q1 banner "⚠️ Bạn mới có 5/8 thẻ tiếng Hàn…" set, after `pickCorrect()` + `next()` Q2 banner null.
- **Fix (4 build replacements, `R-V40-V18-KOWARN` + `R-V40-V19-KOWARN` + `R-V40-V18-NEXT` + `R-V40-V19-NEXT`):** the warning is stored in `F.koWarn` at `startFight`, and `next()` restores `F.banner=F.koWarn||null` instead of null. `checkPhase` is untouched — a phase banner may transiently replace the warning for one question's feedback.
- **Verified:** Node suite §40E — both engines, 5-card fight: banner === koWarn containing '5/8' at Q1 and still there at Q2; 20-card fight: banner null, koWarn null. Chrome gate V40-D — same live, banner element painted at Q1 and Q2 in both engines.

### 5. A-F1 (MINOR) — Break-bar label over-claimed the deck in the deck-fallback case

- **Evidence:** `breakBarHTML()`'s KO branch (`src/v34.js:178-200`) said "bộ từ tiếng Hàn đã chọn" while questions/Break progress come from ALL Korean cards when the selected deck has <8 cards (pool fallback). Damage itself followed the documented pool rule; label only.
- **Fix (1 build replacement, `R-V40-V34-BREAKLABEL`):** the break-bar line only — "bộ từ tiếng Hàn đã chọn" → "từ tiếng Hàn của bạn". The `weakChipHTML` card-level line keeps the old wording (card context, not the fight bar).
- **Verified:** Node suite §40F — `__v34.breakBarHTML(F)` in a KO fight contains the new label; fight HTML too; weakChipHTML untouched. Chrome gate V40-F — the label is painted in a live 20-card KO fight.

### 6. A-N1 (nit) — `koCount18()` evaluated 3× per `startFight`

- **Evidence:** the V39 banner block called `koCount18()` in the condition and twice in the banner string; each call re-shuffles the pool. Harmless, but wasteful and the two banner evaluations could theoretically disagree.
- **Fix (folded into `R-V40-V18-KOWARN` / `R-V40-V19-KOWARN`):** the count is computed once into `_kc40` and reused in the condition + banner string, in both engines.
- **Verified:** Node suite §0 — the old 3×-call banner lines are gone; §40E — the banner still shows the exact count (5/8).

### 7. C-04 (MINOR) — Collection detail never showed replay count for map bosses

- **Evidence:** `collDetail` (`src/v18.js:201-202`) read `en18().bosses[id]` only; map bosses' wins live in `en19().bosses[id]` as `{en:{win,wins},ko:{…}}`. Detail showed "(N lần)" only for V10-arena bosses. Reproduced on the pristine V18.4 base (repro R5): v11_fireking (en19 wins en 3 + ko 1) shows "Trạng thái: ✅ Đã thắng" with NO replay count (`hasCount:false`).
- **Fix (1 build replacement, `R-V40-V18-COLLDETAIL`):** read the record from en19 when `b.zone` is set (sum `en.wins + ko.wins`); old-arena bosses stay null (their wins live in `en15().bosses` as `{win:1,item,at}` with no wins count — there is nothing to sum).
- **Verified:** Node suite §40F — fireking "(4 lần)", slime "(2 lần)", old-arena no count. Chrome gate V40-E — fireking detail painted with "(4 lần)".

### 8. C-05 (MINOR, copy) — arenas button still said "(40 boss)"; Collection header omitted Chrono/Skyroot

- **Evidence:** arenas button (`src/v18.js:93`) hardcoded "(40 boss)" though the Collection holds 86 (`TOTAL_BOSSES=86`); the collection header (also `src/v18.js:172`) said "Boss gốc (10), 30 boss đấu trường (V10) và 30 boss bản đồ (V11)." and omitted Chrono/Skyroot. The header count itself was already live and correct at 86. Reproduced in repro R5 alongside C-04.
- **Fix (2 build replacements, `R-V40-V18-ARENASBTN` + `R-V40-V18-COLLHEAD`):** the button uses the live count via `allBosses().length`; the subtitle appends "+ 8 boss Chrono Kingdom (V17) và 8 boss Skyroot Sanctuary (V18)" when `tot19>70`.
- **Verified:** Node suite §40F + Chrome gate V40-E — button reads "Xem Bộ Sưu Tập Boss (86 boss)", subtitle names both worlds.

### 9. C-06 (MINOR, latent) — `wordPool` scope-relaxation dropped topic/lesson

- **Evidence:** `sc2={kind:'lib',lib:sc.lib,unit:sc.unit,type:sc.type,set:sc.set}` (`src/v18.js:253`, `src/v19.js:253`, identical). If the first `wordsFiltered` returns <8 words, the fallback pool becomes the whole A1–A2 library (995) or whole Oxford (3,393) instead of the chosen topic/lesson. Unreachable with real data today (every topic ≥20 words, every lesson ≥21, every set exactly 60) — but one small topic or a `status` filter change away from a silent wrong-pool fight.
- **Fix (2 build replacements, `R-V40-V18-SC2` + `R-V40-V19-SC2`):** `topic:sc.topic, lesson:sc.lesson` added to `sc2` in both files; comment updated (relaxation now drops only `status`).
- **Verified:** Node suite §40F — with a `wordsFiltered` wrapper forcing the fallback, the sc2 scope keeps topic (a1a2) and lesson (oxford); the fallback pool is exactly the topic pool (54 words — see note below) and exactly the 25 words of Oxford Bài 12. **Note:** the a1a2 topic pool is NOT `w.t`-pure by design — `inScope15` also matches via `a1a2Topics`/`a1a2Topic` (V7 words legitimately belong to the topic; it is named 'FRUIT AND VEGETABLES'). The C-06 assertion compares the fallback pool to the direct scoped pool, not to a `w.t` filter.

### 10. C-07 (MINOR) — Safe-merge took the Smart plan from the newer save for BOTH languages

- **Evidence:** `m27.plan=n27p.plan!==undefined?n27p.plan:(o27p.plan||{en:{},ko:{}})` (`src/v20_sync.js:304-307`). Node vm proof: local plan EN [w1] + KO [k1], cloud (newer) EN [w2] + KO [k2] → merged is EN [w2] + KO [k2]; the local side's plan + `doneIds` gone. (`claimed` is unioned, so no double payment.)
- **Fix (1 build replacement, `R-V40-V20-PLAN`):** merge `plan.en`/`plan.ko` independently; when both sides' plans exist with the same `d`, union `ids`/`doneIds` and OR the goals (recompute `complete` from coverage); otherwise newer-wins per language.
- **Verified:** Node suite §40B — same-day union (EN ids w1+w2, doneIds w1, complete recomputed false, acc80 ORed true; KO ids k1+k2, weak5 ORed true); different-day newer-wins per language; older KO plan survives when the newer save has none.

### 11. C-10 (MINOR) — Partial Smart sessions ticked plan `acc80`/`weak5` goals

- **Evidence:** `finishSession` (`src/v27.js:540-548`): only `complete` and the bonus/streak payouts were guarded by `!partial` (the V36/F13 fix); `acc80`/`weak5` were written unconditionally, including `finishSession(true)` from `endEarly()`. So abandoning a session after 5/5 correct answers ticked both goals.
- **Fix (1 build replacement, `R-V40-V27-FINISH`):** the `acc80`/`weak5` assignments moved inside the `if(!partial){...}` guard.
- **Verified:** Node suite §40G — partial 5/5 session (5 weak words fixed): `rec.partial` true, acc80/weak5/complete all false; complete 10/10 session: acc80 true, complete true, `rec.partial` false.

### 12. C-12 (MINOR) — Picker "Bỏ chọn tất cả" + Áp dụng silently selected the whole BT library

- **Evidence:** `applyBossScope` (`src/v22.js:663-670`): with 0 Unit chips on, `units.length===0` fails the guard, `sc.unit` is never set → scope becomes all of BT, the opposite of what the button promised. Reproduced on the pristine V18.4 base (repro R3): picker lib 'units' → "Bỏ chọn tất cả" → Áp dụng → scope `{kind:'lib',lib:'bt'}` with NO unit (whole BT library).
- **Fix (1 build replacement, `R-V40-V22-APPLY`):** if `lib==='units'` and no Unit chip is on, refuse with `pop22('Chọn ít nhất 1 Unit.')` and return (do not apply).
- **Verified:** Node suite §40H — units + 0 chips: scope unchanged (a1a2 topic kept); 1 chip → BT unit 2; lib 'all' still applies whole BT. Chrome gate V40-C — real clicks: "Bỏ chọn tất cả" → 0 chips on → Áp dụng → scope unchanged + toast "Chọn ít nhất 1 Unit."; Unit 2 chip → Áp dụng → BT unit 2.

## What V18.5 does NOT change

- **No schema change, no new save key, no new localStorage key.** `src/v40.js` is a version marker only (`18.5.0`); `src/v40.css` is comment-only (no new UI). The 8 touched files are `v15.js`, `v18.js`, `v19.js`, `v20_sync.js`, `v22.js`, `v23.js`, `v27.js`, `v34.js` — all by exact-match replacement, 20 replacements total.
- **No reward/XP/SRS/region-gate/damage-table changes** beyond the fixes above. The C-02 fix changes effective team-skill damage ONLY against shielded bosses (the shield was always supposed to halve it — the answers already did); unshielded fights are byte-identical in outcome.
- **No art, no words, no bosses.** TOTAL_BOSSES stays 86. `legDiff()` is deliberately UNCHANGED (see below).

## Not fixed / still open (need Anh's decision)

- **legDiff() + weakness table — must be decided together.** `legDiff()` (`v18.js:244`) never scales Legendary difficulty (`V15().counts` is a getter returning an object, `counts()` throws, caught → always `['A2','B1']`). Fixing it alone grows the pool-blocked weakness bosses 13→23 (distinct blocked 26→36) — the 10 extra are exactly the 10 Legendary bosses. The weakness table (26 blocked bosses: 13 pool-blocked + 15 mode-blocked, exact same id lists as V18.1) is a design decision. Both stay as-is until Anh decides.
- **F-12 reset-EN scope.** `resetEN()` clears vocabulary/SRS only; Smart Learning sessions/days/streak/claimed survive, and — new sub-finding from this review — boss wins (en18/en19/en33) also survive even though the confirm dialog promises "farm, boss" will be deleted. Three sub-questions for Anh: wipe boss wins? wipe en27 fully? fix the dialog/section copy?
- **Farm harvest +35 XP vs +25.** Compositional, not a typo: `mark15` +10 box-up bonus + `gain15(25)`; the banner always says +25. 35 XP only on box-up harvests with an expired 10-min cooldown (40 on a 5-streak). Possibly intentional design — needs Anh's call.
- **bubble.png / shop.png icons.** Live UI in the legacy EN → Chủ đề tab: V14 `topicsHTML()` renders them via `enIcon()` → `assets/icons/v6/shop.png` / `bubble.png`; neither file exists. `ICON_MAP.json` already nominates replacements (`backpack.png`, `speak.png`) — needs Anh's art call.
- **BT Listening Quest pays its first-completion reward at 0% accuracy** (C-03, found in this review): `finishQuest` pays +25 XP/+1 gem on any finish (`claimed1`), 24 units = +600 XP/+24 gems for all-wrong answers. Chrono/Skyroot quests require ≥0.8. Needs Anh: gate `claimed1` on acc ≥ 0.8, or pay only at ≥80%?
- **Pet hatch safe-merge loss** (C-08, found in this review): merge drops the older in-progress hatch with no egg refund (two devices hatching different eggs). Needs a small design decision (refund rule).
- **"Từ vựng của tôi" is NOT in the boss word-set picker** (V18.3 known limit, unchanged): custom words have NO `lib` field, so no `{kind:'lib'}` scope can select them — needs a real scope design + Anh's decision.
- **.v20modal stacking trap** (accepted behaviour): the modal (z-1200) lives inside `.v15hub` (z-950); `#v27hub` (z-1600, body sibling) covers it. Reachable by closing Smart first.
- **F-05/F-07 observers** (fix only if a live perf measurement proves a problem): 16 observers at load, 13 body-level, 0 ever disconnected — worse than audited, because v33/v35 each install TWO (double `init33()`/`init35()`, at load AND on DOMContentLoaded). The double-init guard is a confirmed safe small patch to propose, not shipped unasked.
- **C-09 pet merge per-pet newer-wins:** very narrow (only a conflicting evolution of the same instance id is lost; instance ids are device-local random). No fix proposed.
- **Still open from earlier versions:** the two V9 word fixes ('gram' → "gam", 'pomegranate' → "quả lựu"); V14.1 Developing Tactics; V16 Q1/Q2/Q4; V17 Q3/Q4/Q7/Q8; regex-fix apply decision; PR #7 cleanup batches; live Firebase login/sync untested in every version (Anh must run the `FIREBASE_SETUP.md` checklist); Anh's real-phone test of the current main.

## Verified clean in this review (no fix needed)

- **V39 regressions:** all 30 V18-data bosses `lang:'both'`; banner fires exactly at lang=ko + pool<8 (boundary 8 → no banner); all 5 markKO/markKO19 call sites pass `F.cur.k` incl. counterattack, exactly one `recordAnswer('ko',…)` per answer, no EN pollution; Chrono/Skyroot overlays propagate language; Legendary KO fight survives P1→P3 with Korean questions + P3 wrong costs exactly 2 hearts; BT scope never leaks into the KO pool; Break fills on KO hits; KO win flat + once-only.
- **U-01 duplicate ids (was unconfirmed):** live sweep in Chrome gate V40-G — every suspect id (`v21authmsg`, `v7opts`, `v22bs-chips`, `v21back`, `v21email`, `v21submit`, `v21emailbtn`) appears at most once on each of 8 screens (welcome, login, register, forgot, Bosses tab, arena/picker, boss map, Collection). By trace every duplicate lives in screens that replace each other — confirmed live, no fix needed.
- **U-02 360px overflow (was unconfirmed):** Chrome gate V40-H — Bosses tab, picker, map, Collection at 360px: `scrollWidth` 360, overflow 0, all sampled controls ≥44px. No fix needed.
- **Everything else re-checked clean:** F-01 fixed except `ko16` (now fixed here as C-01); F-02/F-03/F-06/F-10/F-11/F-13/F-14/F-15/F-16 fixed; V17-1/2/3 fixed; counterattack fires once with KO pools; Break clamp/shield order correct; SRS funnels + H1/H2/H3 hooks correct; plan/streak claimed guards intact; scope banner/picker round-trip, POS normalisation, Firebase unconfigured messaging, guest mode, account-switch flush guard, backup history cap 20, 900 KB/10 MB caps, restore/undo all verified. Data spot-checks: A1–A2 1,000/19 topics, Oxford 3,396/136 lessons, Chrono/Skyroot 240 each with zero blank meanings/IPA, BT 819, no duplicate headwords within any set, all quest/rift/weakness ids resolve.

## Tests

- `tools/v40/test40.js` (Node vm): **200 PASS / 0 FAIL / 8 SKIP (of 208) ×3 clean runs** — §0 static (103), §L page load (9), §40A ko16 merge (6), §40B plan merge (8), §40C shield (8), §40D BT guards (10), §40E koWarn (8), §40F label/counts/copy/sc2 (13), §40G partial sessions (7), §40H picker refuse (3), §40R V18.4 regression (22), §V save schema (3), §C Chrome-only (8 SKIP).
- `tools/v40/verify-v40c.js` (real Chrome 157): **69 verdicts PASS ×3 runs, 0 console errors/warnings/dialogs** — V40-A B-8 (7), V40-B shield (10), V40-C picker (10), V40-D banner (8), V40-E collection (7), V40-F break label (4), V40-G duplicate ids (9), V40-H 360px (6), V40-I regression (8). (Run 1: 68/69 — the A3 loading-state read was 400 ms too late; the local BT fetch resolves faster than that. Driver bug only; the fix was working. The driver also gained a real exit condition: a failed verdict now fails the run.)
- `tools/v40/repro-v40.js` + `repro-v40b.js` on the pristine V18.4 base: R1 B-8, R2 C-02, R3 C-12, R4 A-F2, R5 C-04+C-05 — all REPRO, 0 console errors.
