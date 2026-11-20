# Korean & English Vocab Farm — V18.4 KOREAN BOSSES

**Version 18.4.0 — layer V39 (loads LAST). Base: V18.3 (Boss Word Sets). Date: 2026-11-19.**

V18.4 fixes one user-reported bug — "phần bosses ko có tiếng Hàn, fix lỗi" (Anh, 2026-11-19 22:24, with a screenshot of the boss word-set picker): the bosses section had no Korean. Three gaps were reproduced first on the pristine V18.3 base in real Chrome 157, then fixed; a fourth suspected gap (Chrono/Skyroot overlays) was verified to already work and left untouched. No new bosses, no new words, no new art, no reward/stat/SRS/region-gate changes, no save-schema change, no new localStorage key. Anything not verified is listed under "Not fixed / still open" instead of being fixed blind.

## What V18.4 fixes

### 1. 20 of 30 V18 bosses never offered Korean (reported by Anh)

- **Evidence:** boss data in `src/v18_data.js` — English Challenge Arena 10 bosses `lang:'en'`, Elemental Arena 10 `lang:'both'`, Legendary Arena 10 `lang:'en'`. Only `lang:'both'` bosses reach the EN/KO pick screen (`fight()` → `showLangPick()` when `b.lang==='both'`); the other 20 start English fights directly. Reproduced on the pristine V18.3 base (`tools/v39/repro-v39.js`): R1 Challenge boss card says "Ngôn ngữ: Tiếng Anh" and `fight('v10_slime')` starts an EN fight immediately (F.lang `'en'`, question word "goat", no pick screen); R2 Legendary boss (unlocked by seeding 5 Elemental wins) the same (question word "umbrella"). 0 console errors.
- **The fight engine already supported KO for any boss:** `nextQ()` maps grammar/builder/read/speak modes to Korean multiple-choice when `F.lang==='ko'`. So the fix is confined to the data flag, not the engine.
- **Fix (1 build replacement in `build_v39.py`, `R-V39-V18DATA-LANG`):** in `src/v18_data.js`, `lang:'en'` → `lang:'both'` on exactly the 20 lines with `arena:'en'` or `arena:'leg'` (line-scoped flip). The old arena (10 bosses) keeps `lang:'en'` — it redirects to the V6 boss flow; verified still working, not changed. The boss card language line updates automatically via the existing ternary in `v18.js:206` ("Anh / Hàn (chọn trước trận)").
- **Verified:**
  - Node vm suite `tools/v39/test39.js` §39A: all 30 V18-data bosses (Challenge + Elemental + Legendary; old arena excluded) have `lang:'both'`; `v18_data.js` differs from the pristine backup ONLY in lang values (deep-compare, lang excluded); pick screen appears for slime/dragon/legendary with F null; grammar-mode KO fight maps to mc (`qmode 'mc'`, `cur.k` set).
  - Chrome gates V39-A/V39-B (`tools/v39/verify-v39c.js`): every sampled boss (slime, dragon, unicorn, firedragon) shows the EN/KO pick screen + "Anh / Hàn" card line; KO fights ask Korean questions only — 3/3 unicorn questions Hangul ("바다"/"꽃"/"밥") + `· 🇰🇷 Tiếng Hàn` header, dragon grammar→mc ("책"); Break meter fills on weakness hits (`weakKind 'ko'`, `brk` increments on correct KO answers with a deck selected).
  - KO wins are recorded FLAT (`{win:1,wins:1,at,item}`, no en/ko sub-record) — a KO win counts exactly like an EN win today, by design (see "does NOT change"). Unicorn first KO win in 6 answers: xp 20→110 (+90), gems 3→5 (+2), stone 0→1, item 'Unicorn Horn'; replay wins 2, xp +10 only (110→120), gems +0, stones still 1. Unlock chains unchanged (`bossUnlocked`/`arenaWins` never assume EN).
  - Rewards/titles/XP unchanged: damage per correct answer still `12 + combo*2` (crit ×2 on every 5th combo + 10% random); first-win reward table untouched.

### 2. V18 KO fights with <8 Korean cards silently fell back to English

- **Evidence:** both engines fall back to English questions when the KO pool has <8 cards, but only V19 showed a warning. Reproduced on the pristine V18.3 base with a seeded 5-card save: R3 V18 KO fight asks English ("stairs"), `F.banner` null, no `.v18banner` — silent; R4 the same save in a V19 map fight DOES show the banner ("⚠️ Bạn mới có 5/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ.", `.v19banner` present).
- **Fix (2 build replacements, `R-V39-V18-KOCOUNT` + `R-V39-V18-BANNER`):** new `koCount18()` (= `koPool().length`) and a `startFight` banner in `v18.js` mirroring V19's wording exactly ("⚠️ Bạn mới có X/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ."). The fight is NOT blocked (V19 precedent: banner + English fallback, not a block).
- **Verified:** Chrome gate V39-D — 5-card KO fight: V18 shows the exact 5/8 banner + `.v18banner` + English fallback (qword "root"); V19 parity (qword "whale"). A 20-card KO fight has no banner + `cur.k`; an EN fight never banners. Node suite §39B: banner set iff lang ko and pool <8; no banner iff ≥8 or lang en.

### 3. KO boss answers never reached Smart Learning

- **Evidence:** `v18.js` `markKO(ok)` and `v19.js` `markKO19(ok)` only touched `koStats`; the `__v27.recordAnswer('ko',...)` call was missing (v19.js even documented "KO answers only touch en19.koStats"). `recordAnswer(lang,id,ok,mode)` in `src/v27.js:160` FULLY supports `'ko'` (right/wrong/cw/cr/last). Reproduced on the pristine V18.3 base: R5 — 3 KO questions answered correctly in a V19 map fight (card ids ko_r1, ko_r12, ko_r17), and `en27().ko` has no records for those ids (0 right keys, 0 wrong keys) — Smart Learning blind to KO.
- **Fix (6 build replacements: V18 MARKKO + CALL-TRUE + CALL-FALSE; V19 MARKKO19 + CALL-CA + CALL-TRUE + CALL-FALSE; plus stale-comment updates):** `markKO(ok)` → `markKO(ok,k)` in v18.js and `markKO19(ok)` → `markKO19(ok,k)` in v19.js, passing `F.cur.k` at every call site (normal answers + the Knowledge Counterattack path), each calling `__v27.recordAnswer('ko', k.id, ok, 'boss18'|'boss19')` guarded try/catch before save18()/save19(). The stale v19.js header comment is updated (no more "KO answers only touch en19.koStats").
- **Verified:**
  - Node suite §39C/§39D with a recordAnswer spy: exactly one call per answer with the right (lang, id, ok, mode) — `(ko, id, true/false, boss18|boss19)`; EN answers go to `(en, id, true, boss18)` only and never pollute `en27().ko`; no double-recording (`mark18`/`mark19` only fire for `F.cur.w`, `markKO`/`markKO19` only for `F.cur.k`); the V19 Knowledge Counterattack path records `(ko, id, true, boss19)`.
  - Chrome gate V39-E: 5 fought ids (ko_r8/ko_r13/ko_r2/ko_r19/ko_r12) all show `en27().ko.right` 1 + `last`, live AND after reload; `en27().en` unpolluted.
  - Chrome gate V39-F: EN fights unchanged — Challenge boss EN fight qword "salad", no banner, `weakKind 'a1a2'`; word ids w15/w251 each `en.cr` 1 + `last`, no ko record.

### 4. Chrono/Skyroot overlays — verified already working, NO fix needed

- **Evidence:** `fightBoss(id)` in `v33.js:169` and `v35.js:158` already calls `v.setLang(lang)` (the overlay's `ST.lang`) BEFORE `v.fight(id)`. Chrome gate V39-G confirmed live: with gates seeded (70 wins for Chrono, GEAR GOLEM ko win for Skyroot), the Skyroot first boss (v18_breeze_lynx, HP 760) and Chrono first boss (v17_sandwisp, HP 620) both fight in Korean from the KO overlay (lang ko + `cur.k` + Hangul qwords "차"/"별"). Region gates (GEAR GOLEM per-language) untouched.

## What V18.4 does NOT change

- **V18 wins stay FLAT.** A KO win in a V18 arena records `{win, wins, at, item}` exactly like an EN win; there is deliberately NO per-language V18 win record in this release (that would be a save-schema change). V19 wins were already per-language and are unchanged.
- **Old arena (10 bosses) stays `lang:'en'.** It redirects to the V6 boss flow; verified still working, not changed.
- No change to the fight engines' damage/reward/XP tables, unlock chains, region gates (Chrono 70-win gate, Skyroot GEAR GOLEM gate), SRS, or any vocabulary data. No new art. No new save key, no schema change, no new localStorage key. `src/v39.js` is a version marker only (`18.4.0`); `src/v39.css` only guarantees the pick-screen buttons keep the 44px / no-overflow mobile rules.
- The KO pool source is unchanged: `koCardsRaw()`/`koPool()` read the player's own Korean cards `S.cards` (filtered `h && m`), deck-scoped when `S.deck` holds ≥8 usable cards, else all cards. Fresh save = 20 seed cards, so koCount is normally ≥8 and the <8 banner is the exception path, not the norm.

## Not fixed / still open

- **"Từ vựng của tôi" is NOT in the boss word-set picker** (V18.3 known limit, unchanged here): custom words have NO `lib` field, so no `{kind:'lib'}` scope can select them — needs a real scope design + Anh's decision.
- **Weakness-table redesign for the 26 blocked bosses** (V17.1/V18.1 known limit): 26/86 bosses have weakness meters that can never fill; changing the table is a design decision for Anh, unanswered.
- **Still open from earlier versions:** F-12 reset-EN scope question; farm harvest +35 XP vs +25; `bubble.png` / `shop.png` icons (need Anh's words); the two V9 word fixes ('gram' → "gam", 'pomegranate' → "quả lựu"); V14.1 Developing Tactics; V16 Q1/Q2/Q4; V17 Q3/Q4/Q7/Q8; regex-fix apply decision; live Firebase login/sync untested in every version (Anh must run the `FIREBASE_SETUP.md` checklist); Anh's real-phone test of the current main.
