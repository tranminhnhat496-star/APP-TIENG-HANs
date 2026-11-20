# Changelog — V18.4 → V18.5 (Bug Fixes II)

**V18.5.0 — layer V40 (loads LAST). Base: V18.4 (Korean Bosses). Date: 2026-11-20.**

Second bug-fix release, from Anh's "RÀ LỖI" review (2026-11-20 16:14): three parallel review passes (V39 regressions, the known-unfixed list from V18.1, a whole-game systematic scan) produced 26 findings; each suspected bug was reproduced first on the pristine V18.4 base in real Chrome 157 (or with a Node vm proof for pure-logic bugs). **12 confirmed, safe bugs fixed here; 9 findings need Anh's decision and are NOT fixed** (see README §"Not fixed / still open"). No new bosses, words, art, rewards, or schema changes. Verified by `tools/v40/test40.js` (Node vm, 200/0/8 ×3) + `tools/v40/verify-v40c.js` (Chrome gates V40-A–I, 69 verdicts PASS ×3, 0 console errors).

## The 20 build replacements (`build_v40.py`)

### Save / sync (2)
- `R-V40-V20-KO16` (C-01 SEVERE): new `ko16` merge branch in `mergeSaves` before the default newer-wins line — `levels` merged per-key MAX via `maxMap` (mirrors the `en` branch); other ko16 keys fill-if-missing.
- `R-V40-V20-PLAN` (C-07): the `m27.plan` line replaced by a per-language merge IIFE — same-day plans union `ids`/`doneIds` and OR the goals (complete recomputed from coverage); otherwise newer-wins per language.

### Combat — team skills vs shields (3)
- `R-V40-V23-SHIELD` (C-02 MAJOR): in `castSkillInFight`, skill damage now goes through the shield-halving step (`dealt=max(1,ceil(dmg/2))`, `F.shield=max(0,F.shield-dealt)`); the toast is corrected when the shield cuts it (damage number replaced + "(Khiên boss chặn một nửa.)"); the owning engine's `checkPhase()` is called after non-lethal skill damage (map bosses `b.zone` → V19, arenas → V18). The V36 lethal-resolution block is untouched and still runs after.
- `R-V40-V18-CHECKPHASE` / `R-V40-V19-CHECKPHASE`: `checkPhase:checkPhase` added to both `_test` exports (V36 `resolveLethal` precedent).

### BT lazy data (3)
- `R-V40-V15-STARTMODE` (B-8 MAJOR): `startMode` guard — BT scope active and `window.__V22_BT` unset → loading state "Đang tải bộ từ Basic Tactics…", `ensureData().then(...)` re-starts the mode, guarded on `HUB.mode===id && HUB.tab==='learn'`; honest error state on rejection.
- `R-V40-V15-REVIEWSTART` (B-8 MAJOR): same guard in `reviewStart`, with a `pop15` loading notice.
- `R-V40-V15-LEARNHTML` (B-8 MAJOR): fire-and-forget `ensureData()` prefetch in `learnHTML` when a BT scope is active (memoised via `DATA`/`DATA_P`, `.catch` swallowed).

### KO warning banner (4)
- `R-V40-V18-KOWARN` / `R-V40-V19-KOWARN` (A-F2 + A-N1): `startFight` computes the KO count once into `_kc40` and stores the warning in `F.koWarn` (`F.banner=F.koWarn='⚠️ Bạn mới có '+_kc40+'/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ.'`). The two V39 banner fragments (`koCount18()<8`, `F.banner='⚠️ Bạn mới có '+koCount18()`) are INTENTIONALLY superseded — the count is computed once now.
- `R-V40-V18-NEXT` / `R-V40-V19-NEXT` (A-F2): `next()` restores `F.banner=F.koWarn||null` instead of null.

### Break bar, Collection, scope relaxation (5)
- `R-V40-V34-BREAKLABEL` (A-F1): the `breakBarHTML()` KO-branch line only — "bộ từ tiếng Hàn đã chọn" → "từ tiếng Hàn của bạn". `weakChipHTML`'s `<span class="v34weakchip">…` line is a different string and stays.
- `R-V40-V18-COLLDETAIL` (C-04): `collDetail` reads the en19 record when `b.zone` is set (sum `en.wins + ko.wins`); old-arena stays null.
- `R-V40-V18-ARENASBTN` (C-05): arenas button → `(' +allBosses().length+ ' boss)`.
- `R-V40-V18-COLLHEAD` (C-05): collection subtitle appends `+(tot19>70?' + 8 boss Chrono Kingdom (V17) và 8 boss Skyroot Sanctuary (V18)':'')`.
- `R-V40-V18-SC2` / `R-V40-V19-SC2` (C-06): `sc2` gains `topic:sc.topic,lesson:sc.lesson` in both `wordPool`s; comment updated (relaxation drops only `status`).

### Smart Learning + picker (2)
- `R-V40-V27-FINISH` (C-10): the `acc80`/`weak5` assignments moved inside the `if(!partial){...}` guard in `finishSession`.
- `R-V40-V22-APPLY` (C-12): `if(lib==='units'&&!units.length){pop22('Chọn ít nhất 1 Unit.');return}` at the top of the BT branch in `applyBossScope`.

### Layer files
- `src/v40.js` (new, version marker `18.5.0` only — its header comment documents all 12 fixes) + `src/v40.css` (new, comment-only, no new UI). Injected last, before `</body>` (rfind + guard — `src/v37.css` contains a literal `"</body>"` in a comment); `v40` is the last style/script marker.

### Build notes (two failed runs before the successful one — all build-script asserts, no app bug)
- **Run 1 failed at step 5:** the V39 fragment `koCount18()<8` is intentionally superseded by V40 (the count is computed once into `_kc40`); the two superseded V39 fragments were removed from the fragment list with a comment. Base restored from `tools/v40/backup-v18.4/` (hash re-verified `af3fee29…`), script fixed, re-run.
- **Run 2 failed at step 5:** the `['en','ko'].forEach(function(lg){` count is 2, not 1 — the pre-existing streak-merge loop just above uses the same shape. Assert fixed to 2 with a comment. Base restored again, re-run.
- **Run 3 SUCCEEDED** (`9a2fdd74…`, 2,390,555 B).

### Not changed
- `legDiff()` deliberately UNCHANGED (counts-getter bug kept — fixing it alone grows the blocked weakness bosses 26→36; needs Anh's decision together with the weakness table). `lang:'both'` 31 / `lang:'en'` 14 unchanged; NGHỀNGHIỆP 0. No new save key, no new localStorage key, no schema change. V39 fragments that survive (banner condition/text superseded — see above): `koCount18()`, both `recordAnswer('ko',…)` calls, all five markKO/markKO19 call sites.

## Verification
- `tools/v40/repro-v40.js` + `repro-v40b.js` on the pristine V18.4 base (hash `af3fee29…`): R1 B-8 REPRO (BT scope + fresh load + Flashcards → "Không có từ nào cho bộ lọc này."); R2 C-02 REPRO (panda shield 30, 50-dmg skill → HP 150→100, shield stays 30); R3 C-12 REPRO (units + 0 chips → scope `{kind:'lib',lib:'bt'}` with NO unit); R4 A-F2 REPRO (5-card KO fight → Q1 banner set, Q2 banner null after `next()`); R5 C-04+C-05 REPRO (arenas button "(40 boss)"; fireking detail no replay count). 0 console errors/warnings/dialogs. (R2/R4 first passes hit driver issues — wrong boss id `v10_icelong` vs real `v10_icedragon`; a reseed-timing artifact from the V20 debounced save flushing on beforeunload — both fixed in the driver, second passes clean.)
- `tools/v40/test40.js`: **200 PASS / 0 FAIL / 8 SKIP (of 208) ×3 clean runs** — §0 static (103), §L page load (9), §40A ko16 merge (6), §40B plan merge (8), §40C shield (8), §40D BT guards (10), §40E koWarn (8), §40F label/counts/copy/sc2 (13), §40G partial sessions (7), §40H picker refuse (3), §40R V18.4 regression (22), §V save schema (3), §C Chrome-only (8 SKIP). (Earlier runs: a crash + 196/4/8 — all 4 FAILs were TEST bugs, not product bugs: the v20_sync diff check used a fragile regex — now a line-multiset diff; `__v22.reset` is `__v22._test.reset`; the learnHTML prefetch test needed `choose('en')` first so the hub shell exists in the vm stub DOM; the arenas-button test used `openArena('en')` instead of `tab('bosses')`; the a1a2 pool assertion assumed `w.t`-purity — `inScope15` also matches via `a1a2Topics`, so the assertion now compares the fallback pool to the direct scoped pool.)
- `tools/v40/verify-v40c.js` (real Chrome 157): **69 verdicts PASS ×3 runs, 0 console errors/warnings/dialogs** — V40-A B-8 (7: loading state caught synchronously, Flashcards started with BT words), V40-B shield (10: HP 125, shield 5, toast "✨ Hơi Thở Lửa! Gây 25 sát thương cho boss. (Khiên boss chặn một nửa.)", Legendary phase 2 at once, lethal win), V40-C picker (10: real clicks, scope unchanged + refuse toast, Unit 2 applies), V40-D banner (8: 5/8 painted at Q1 AND Q2, both engines), V40-E collection (7: "(86 boss)", Chrono/Skyroot subtitle, "(4 lần)" + "(2 lần)"), V40-F break label (4), V40-G duplicate ids (9: every suspect id ≤1 on 8 screens), V40-H 360px (6: overflow 0, controls ≥44px), V40-I regression (8: V37 banner clear, picker round-trip Oxford Bài 12, KO recordAnswer once, Pet Hub). (Run 1: 68/69 — A3 read the loading state 400 ms too late; the local BT fetch resolves faster than that. Driver bug only; the driver also gained a real exit condition — a failed verdict now fails the run. Runs 2–3: 69/69.)
- Built `out/index.html`: sha256 `9a2fdd741d8027dd3e95a5bcae64a4e8989bd726bcb74fe74f49f29a0e779827`, 2,390,555 B (V18.4: `af3fee29…`, 2,377,535 B; +13,020 B). Title: "V18.5 — Bug Fixes II". Marker order: v40 last (styles + scripts); `TOTAL_BOSSES` still 86; no new save key; `legDiff` buggy line asserted still present (deliberately unchanged).
