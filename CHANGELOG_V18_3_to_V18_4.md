# Changelog — V18.3 → V18.4 (Korean Bosses)

**V18.4.0 — layer V39 (loads LAST). Base: V18.3 (Boss Word Sets). Date: 2026-11-19.**

Korean-bosses release: every V18 boss now offers the EN/KO pick screen, V18 KO fights warn (like V19) when the Korean pool has <8 cards, and KO boss answers now reach Smart Learning. No new bosses, words, art, rewards, or schema changes. The fix was reproduced first on the pristine V18.3 base in real Chrome 157, then verified by `tools/v39/test39.js` (Node vm) + `tools/v39/verify-v39c.js` (Chrome gates V39-A–I).

## The 11 build replacements + data flip (`build_v39.py`)

### V18 data — the pick screen for 20 bosses (1)
- `R-V39-V18DATA-LANG`: in `src/v18_data.js`, `lang:'en'` → `lang:'both'` on exactly the 20 lines with `arena:'en'` (Challenge, 10) or `arena:'leg'` (Legendary, 10). Line-scoped flip; the old arena (10, `arena:'old'`) keeps `lang:'en'`. The boss card language line follows automatically (existing ternary in `v18.js:206`).

### V18 engine — banner + Smart Learning (6)
- `R-V39-V18-KOCOUNT`: new `koCount18()` returning `koPool().length`.
- `R-V39-V18-BANNER`: `startFight` sets `F.banner='⚠️ Bạn mới có '+koCount18()+'/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ.'` when `F.lang==='ko'` and `koCount18()<8` (mirrors V19's wording; fight NOT blocked).
- `R-V39-V18-MARKKO`: `markKO(ok)` → `markKO(ok,k)`; inside, `__v27.recordAnswer('ko', k.id, ok, 'boss18')` guarded try/catch before `save18()`.
- `R-V39-V18-CALL-TRUE` / `R-V39-V18-CALL-FALSE`: the two normal-answer call sites pass `F.cur.k` (`markKO(true,F.cur.k)` / `markKO(false,F.cur.k)`).
- `R-V39-V18-COMMENT`: stale header comment updated (no more "KO answers only touch en18 koStats").

### V19 engine — Smart Learning (5)
- `R-V39-V19-MARKKO19`: `markKO19(ok)` → `markKO19(ok,k)`; inside, `__v27.recordAnswer('ko', k.id, ok, 'boss19')` guarded try/catch before `save19()`.
- `R-V39-V19-CALL-CA`: the Knowledge Counterattack call site passes `F.cur.k` (`markKO19(ok,F.cur.k)`).
- `R-V39-V19-CALL-TRUE` / `R-V39-V19-CALL-FALSE`: the normal-answer call sites pass `F.cur.k`.
- `R-V39-V19-COMMENT`: stale header comment updated (no more "KO answers only touch en19.koStats").

### Chrono/Skyroot overlays — NO change
- Gap 4 investigated, no code fix: `fightBoss()` in `v33.js:169` / `v35.js:158` already calls `v.setLang(lang)` before `v.fight(id)`; verified live in Chrome gate V39-G.

### Layer files
- `src/v39.js` (new, version marker `18.4.0` only — its doc comment must NOT contain the literals `lang:'both'`/`lang:'en'`, see build notes) + `src/v39.css` (new, 44px pick-screen buttons, banner box-sizing). Injected last, before `</body>`; `v39` is the last style/script marker.

### Build notes (three failed runs before the successful one — all build-script/test bugs, no app bug)
- **Run 1 failed at the pre-pass flip assert:** the byte-range helper excludes the newline right after the `<script>` tag, so comparing the inlined block to `"\n"+src+"\n"` was wrong; the correct comparison is `src + "\n"`. Base restored from `tools/v39/backup-v18.3/` (hash re-verified `6b953ac1…`), script fixed, re-run.
- **Run 2 failed at the verification count asserts:** the `v39.js` doc comment contained the literals `lang:'both'`×2 / `lang:'en'`×3, so the whole-file counts came out 33/17 instead of 31/14. Comment reworded to avoid the literals. Base restored again, re-run.
- **Run 3 failed with `NameError: re is not defined`:** the file imports re as `_re`, so the new assert uses `_re.search(..., _re.S)`. Base restored again, re-run.
- **Run 4 SUCCEEDED** (`af3fee29…`, 2,377,535 B).

### Not changed
- V18 wins stay FLAT (deliberate — per-language V18 wins would be a schema change); old arena stays `lang:'en'`; region gates, damage/reward/XP tables, unlock chains, SRS, vocabulary data, art, Firebase, save schema — all untouched.

## Verification
- `tools/v39/repro-v39.js` on the pristine V18.3 base (hash `6b953ac1…`): R0 fresh save has 20 KO cards; R1 Challenge boss card "Ngôn ngữ: Tiếng Anh", EN fight starts with no pick (qword "goat"); R2 Legendary boss same (qword "umbrella"); R3 V18 KO fight with a 5-card seeded save asks English ("stairs") with NO banner; R4 V19 same save shows the 5/8 banner; R5 three KO answers in a V19 map fight leave `en27().ko` empty (Smart Learning blind to KO). 0 console errors/warnings/dialogs.
- `tools/v39/test39.js`: **195 PASS / 0 FAIL / 8 SKIP (of 203)** ×3 clean runs (runs 3, 4, 5) — §0 static (86), §L page load (16), §39A data flip (17), §39B banner (10), §39C V18 recordAnswer + Break + KO win (15), §39D V19 recordAnswer + counterattack + overlays (13), §39E V18.3 regression (20), §R layers (15), §V save schema (3), §C Chrome-only (8 SKIP). (Run 1: 193/2/8 and run 2: 194/1/8 — all 3 FAILs were TEST bugs, not product bugs: the v18data block comparison must be `'\n' + src + '\n'`; the Legendary pick check needed `__v18._test.close()` first because the dragon KO fight still held F; the KO-win koStats assertion used a wrong threshold — win took 3 hits with crit+BREAK, koRight=4.)
- `tools/v39/verify-v39c.js` (real Chrome 157): run 1 — **8/9 PASS, 0 console errors/warnings/dialogs** (V39-A failed on three DRIVER bugs: `document.title` is overridden by the app at runtime, `collDetail()` needs the Collection tab open first, the unicorn pick check ran before the Elemental arena was open — all fixed in the driver); run 2 — V39-A/B/D/E PASS, V39-C failed ONLY because run 2 reused run 1's Chrome profile (dirty state: boot xp 120/gems 5, unicorn already won), V39-F–I uncollected (Chrome died mid-run); run 3 (2026-11-20 07:00 +07, after the host EPERM wave lifted) — **9/9 PASS, 0 console errors/warnings/dialogs** (fresh profile boots xp0=20/gems0=3, settling the run-1 mystery: 20/3 ARE the fresh-save starting values). V39-A PASS (slime/dragon/unicorn/firedragon pick screens + "Anh / Hàn" card line); V39-B PASS (unicorn KO "네"/"사랑"/"먹다" all Hangul, dragon grammar→mc "밥"); V39-C PASS (unicorn first KO win in 6 answers: xp 20→110, gems 3→5, stone 0→1, item 'Unicorn Horn', flat; replay wins 2, xp +10 only); V39-D PASS (5-card: V18 exact 5/8 banner + English fallback "field"; V19 parity "gate"); V39-E PASS (5 ids ko_r13/ko_r18/ko_r19/ko_r5/ko_r15 in `en27().ko`, live AND after reload, `en` unpolluted); V39-F PASS (EN fight "mouth", no banner, w100/w261 in `en` only); V39-G PASS (Skyroot v18_breeze_lynx HP 760 "물", Chrono v17_sandwisp HP 620 "책", both lang ko); V39-H PASS (picker 7/7, Library Oxford + A1–A2, Pet Hub); V39-I PASS (360px: no overflow, pick buttons 44px). Results in `tools/v39/logs/v39c-results.json`.
- Built `out/index.html`: sha256 `af3fee2961531da00e06ca6cbb01d25692cb326cd30e3b33288eb51837c938d5`, 2,377,535 B (V18.3: `6b953ac1…`, 2,372,032 B). Title: "V18.4 — Korean Bosses". Marker order: v39 last (styles + scripts); `TOTAL_BOSSES` still 86; no new save key; `lang:'both'` 31 / `lang:'en'` 14 in the file; v18data block 30 `lang:'both'` / 10 `lang:'en'` (all 10 old-arena).
