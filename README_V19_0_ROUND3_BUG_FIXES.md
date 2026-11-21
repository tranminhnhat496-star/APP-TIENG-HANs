# Korean & English Vocab Farm — V19.0 ROUND-3 BUG FIXES

**Version 19.0.0 — layer V45 (loads LAST). Base: V18.9 (Legendary Freeze Fix). Date: 2026-11-21.**

V19.0 is a bug-fix build only, from the round-3 review (reviews A/B/C in `tools/v45/`). No new features, no schema change, no new save key. It fixes the four confirmed round-3 findings (C-R3-1, C-R3-2, C-R3-4, NEW-1) plus the `.v34weakchip` list-row contrast fix Claude directed as DO, and three small pass-C leads that reproduced with evidence. Every fix was reproduced first on the pristine V18.9 base (Node vm `tools/v45/repro-v45.js`: **30/30 bugs reproduced**; Chrome driver `tools/v45/verify-v45c.js` on pristine: **15/39 PASS**, every fix gate FAILing as expected), then verified after the fix.

**Honest testing note:** verified by `build_v45.py` (base-hash gate, exact-match anchors, marker order, `node --check`), by the vm suite `test45.js` (**249 PASS / 0 FAIL / 7 SKIP, ×2 runs** on the final built `out/`, including a before/after Legendary pool-identity proof against the pristine V18.9 build) and by real-Chrome gates `verify-v45c.js` (**39/39 PASS, ×2 runs**, 0 console errors/warnings/dialogs) in Chrome 157. Anh's real-phone test remains the final word for layout and touch. Firebase login/sync is untested live, as in every version — run `FIREBASE_SETUP.md`.

## What V19.0 fixes

### 1. C-R3-1 MAJOR — never-learned words counted as "cần ôn"

Every due counter used `(due||0)<=now` with no box filter, so a fresh player was told **4,889 words "need review today"**, the Review tab could never show "no words due", and Review sessions taught brand-new words under the "review" label. BT words attaching on Library visit inflated it further (4,889 → 5,361). Smart Learning already did it correctly (`box>=1&&box<=4&&due<=now`, `src/v27.js` classifyEN/KO) — that is now the reference definition everywhere.

Fix (14 sites in 6 files): due now means **box 1–4 AND due<=now** — `counts15()`, `dueTodayCount()`, `reviewHTML`/`reviewStart`, `wordsFiltered` onlyDue + BT status filters (`src/v15.js`), `statsOf`/`filterWords` (`src/v17.js`), `unitStats`/`filterEntries` (`src/v22.js`), `statsOf` (`src/v25.js`), dashboard `dueN` EN + KO (`src/v27.js`), `statsForList` (`src/v34.js`). Box 5 (mastered) is deliberately EXCLUDED: mastered words are "đã thuộc" (shown separately); V27 classifies them MASTERED even past due, and the dashboard `dueN` now uses the same 1–4 range so all counters agree. The choice is documented in a comment above `counts15()`.

Review with 0 truly-due words now shows the honest empty state — `Không có từ nào cần ôn hôm nay.` — and does NOT fall back to all words (`pickPool`'s silent fallback to ALL words is the trap that hid this bug; `reviewStart` never used `pickPool`, but the empty list could never occur while box-0 words counted as due).

Measured: fresh save `counts15().due` **4,889 → 0** (total still 4,889); seeded 10 box-2 future-due words → due 0; seeded 3 truly-due (box 2, due past) + 5 box-5 past-due → due **exactly 3**; after BT attach total 5,371, due **still 0**. The English Hub head, the langbar, and the Review tab all read 0 on a fresh save; a Review session on the seeded state opens on a box-2 word (`dog`/`cat`), 3 questions (`câu 1/3`), never a new word.

### 2. C-R3-2 SEVERE — corrupt / card-less save silently destroyed on first boot

Seeding `{corrupt-json-{{{` (or valid JSON without `cards`, xp 9999) and reloading booted a fresh sample and the original bytes were gone from localStorage — no warning, no backup holding them (`hanvocab.v11-backup` held the fresh sample). Root cause: `load()` (`out/index.html:925`) fell back to a fresh sample on any parse failure / missing cards, and boot-time `dailyLogin()`→`save()` overwrote storage.

Fix (data-safety, V16.3 priority): on parse failure (`bad-json`) or missing `cards` (`no-cards`), `load()` **quarantines the raw bytes FIRST** under `hanvocab.v12.corrupt-<ms>-<random>` (unique key, never overwritten by a later boot) and sets `window.__V45_CORRUPT`; the new `src/v45.js` layer (runs last) shows the honest warning — `⚠️ Không đọc được bản lưu cũ (file hỏng / thiếu dữ liệu thẻ) — đã giữ bản gốc tại <key>. Bắt đầu với dữ liệu mới; khôi phục từ Sao lưu nếu cần.` — for 8 seconds, not a fake success. First boot (no save stored) is never quarantined. Valid saves boot exactly as before (xp 9999 kept, no quarantine key, no flag).

Implementation note found during verification: the V6 `toast()` lives inside the `v7js` closure and is NOT a global, so the first version of the layer fell back to `pop15` — a `.pp` that vanishes after 1.1 s. `v45.js` now has a `_warn45` helper: use the global `toast()` when it exists, else build the same `.v7toast` div directly (same class, same 8 s life), else `pop15`. Verified in real Chrome: the warning appears as a `.v7toast` and stays visible (probe `tools/v45/probe-toast.js` timeline).

### 3. C-R3-4 MINOR — pre-restore snapshot keys collide in the same millisecond

`snapshotCurrent()` keyed `hanvocab.v12.preimport-<Date.now()>`; two snapshots in the same ms overwrote each other (first snapshot lost). Fix (`src/v31.js`): the key is now `preimport-<ms>-<counter>-<random>`; the leading ms number is kept so `newestPreRestoreKey()`'s `parseInt` still resolves. Verified under faked identical `Date.now()`: two snapshots get distinct keys and both survive with their own contents (xp 20 vs 1111). Note: under frozen time the resolver returns the first-created key (strict `>` on equal ms) — a tie-break by insertion, no data loss; in real time the ms differ and the newest wins.

### 4. NEW-1 MINOR — 20 topic icons render as `assets/icons/v6/undefined`

`pushV17IntoV14()` (`src/v15.js:296-297`) builds the 19 A1–A2 topics + Oxford with no `icon` field, and `topicsHTML()` called `enIcon(t.icon)` with no fallback — 20 of 52 cards on the legacy EN → Chủ đề tab showed a broken-image glyph. Fix (minimal, NO art choice): `enIcon()` (index-only, V6 core) emits **no `<img>` when there is no icon**. No icon is invented or assigned — that choice stays open. The BT topic (53rd card after attach, also icon-less) is covered by the same guard. Verified in real Chrome: 52 cards, 0 `undefined` icon URLs, 32 `<img>` icons (the icon-ful topics + 2 header icons), 20 empty icon slots; after BT attach 53 cards, still 0 `undefined`. Only the two known missing files remain broken (`shop.png` / `bubble.png`, pass-B item #6, unchanged).

### 5. `.v34weakchip` in boss LIST rows — CSS-only contrast fix (Claude-directed DO)

Same low-contrast problem V18.8 fixed on the fight screen, but in the boss LIST rows (Collection + zone cards via `__v34.weakChipHTML`). Fix (`src/v45.css`, new layer, CSS only — no logic change): explicit dark-amber text/border on a pale amber wash in the light theme (the V18.8 fight colours); gold text kept in the dark theme, following the V43 theme pattern (dark override inside `@media (prefers-color-scheme:dark)` with `:not([data-theme="light"])`, plus `:root[data-theme="dark"]` — a bare `:not()` outside the media query would wrongly match a light theme with no `data-theme` attribute). The V43 fight-screen rules stay more specific and are untouched.

Measured in real Chrome 157 (worst chip per view): bosses-hub light **5.54:1** (was 1.33:1), dark **8.69:1**; Collection (86 chips) light **5.54:1**, dark **8.69:1**; V19 zone z1 light **9.64:1**, dark **9.64:1** — all WCAG AA, at 1280 / 1366 / 360. Exception found by the Chrome gate (run 1): the V19 zone cards (`.v19zboss`) have a HARDCODED dark background (`#241b42`, `v19.css:44`) in BOTH themes, so the light dark-amber text failed there (2.41:1). The zone cards keep GOLD text in both themes (`.v19zboss .v34weakchip` rule); the other list surfaces (`.v15boss` rows, `.v18coll` cards, `.v18detail`) use the themed `--sf` surface, light in the light theme, so the base rule is correct for them.

### 6. Pass-C leads fixed with evidence

- `restoreRaw()` (`src/v31.js`): size-check now runs BEFORE `JSON.parse` — a >10 MB file was parsed into memory first and only then refused as `file-too-large`. Oversize invalid JSON now returns `file-too-large` (not `bad-json`); small invalid JSON still returns `bad-json`.
- `speedHatch()` (`src/v23.js`): remaining-time check now runs BEFORE spending gems — a ready hatch still charged 5 gems. A ready hatch now refuses (`Trứng đã ấp xong — nhận thú cưng ngay!`) and spends 0 gems.
- `deleteHistoryEntry(at)` (`src/v31.js`): deletes ONE entry, not every entry sharing the timestamp — two same-ms history entries are no longer both deleted.

## Not changed (deliberately)

- **C-R3-3**: A1–A2 raw data has 4 duplicate headwords with DISTINCT senses (`sluggish` 403 vs 680, `orange` 313 fruit vs 806 colour, `trip` 530 verb vs 912 noun, `devoted` 351 vs 938). Dedup loses one real sense each for `orange`/`trip` — DECISION, do not drop rows.
- **legDiff scaling + weakness table + KO boss 0 XP**: Claude decided all three DO (2026-11-21 09:40), but they go into the SEPARATE follow-up **V19.0.1 (layer V46) AFTER V19.0** — NOT folded into this build. `legDiff()`'s definition and thresholds are byte-identical; the markKO/markKO19 comment is untouched. (The latent getter bug stays: `legDiff()` always returns `['A2','B1']`; Legendary difficulty never scales — see "Known limits".)
- All other 13 pass-B decision items (F-12, farm +35/+25, bubble/shop icons, C-03, C-08, "Từ vựng của tôi" picker, `.v20modal`, F-05/F-07, C-09, F4 may/May + side×2) — unchanged, no safe fix.
- Unreproduced leads (validateSave depth-6 scan, `dayNo()` timezone edge, `farmBuy` silent return, Chrono overlay DOM leftover) — not fixed, listed in the changelog.
- No fight logic, reward, XP, SRS, word pool contents, pet, farm, gate, unlock or save logic touched. No new bosses, words, art, or save key. `hanvocab.v1` still the only save key; no `en45` key; no new localStorage key.

## Build + test evidence (shipped in the ZIP)

- `build_v45.py` — base-hash gate (pristine V18.9 `1c409217…`), wholesale sync of each edited embedded script block with its src file (asserted byte-identical), exact-match index-only replacements for `load()` and `enIcon()`, title swap, `v45` style + `v45js` injection LAST before `</body>`; refuses unless the base is pristine V18.9. `package_v45.py` — same pattern as V44; `test45.js` + `verify-v45c.js` + `repro-v45.js` + `probe-toast.js` are inside the ZIP (finished BEFORE packaging).
- `tools/v45/test45.js` — **249 PASS / 0 FAIL / 7 SKIP (of 256), ×2 runs** on the final built `out/`. Sections: §0 107/0/0, §L 9/0/0, §45A 14/0/0 (due counts fresh 0 / seeded 3 / BT attach still 0), §45B 7/0/0 (honest empty Review state, session on a truly-due word), §45C 12/0/0 (quarantine byte-exact bad-json + no-cards, valid save untouched), §45D 5/0/0 (snapshot uniqueness), §45E 7/0/0 (Topics render: 52 cards, 0 undefined, 20 empty slots), §45F 9/0/0 (static weakchip ratios), §45L 6/0/0 (3 leads), §44A 34/0/0 (Legendary pool identity OLD V18.9 vs NEW V19.0 at mastered 0/250/700 — 550 words A2 300/B1 250 + 24 grammar A2 12/B1 12, identical sorted ids), §44B 14/0/0 (Legendary EN + KO fights in vm, C-02 shield halving, V19 Counterattack 3/3), §44F 12/0/0, §44R 10/0/0, §V 3/0/0, §C 7 skips (Chrome-only).
- `tools/v45/verify-v45c.js` — **39/39 PASS, ×2 runs**, real Chrome 157, **0 console errors, 0 warnings, 0 dialogs**. Gates: G0 boot clean; G1 fresh due 0 (counts + langbar + hub head); G2 seeded 0/3 truly-due + honest empty Review state + session on a box≥1 word; G3 corrupt/card-less quarantine byte-exact + warning toast + valid save (xp 9999 kept); G4 snapshot uniqueness; G5 Topics 0 undefined icons (52 cards, 53rd BT card covered); G6 weakchip contrast light+dark at 1280/1366/360 (worst 5.54 light / 8.69–9.64 dark); G7 regressions (Legendary direct fight 13.5 ms run 2 / 9.9 ms run 3, real UI clicks 20.1/3.8 ms and 8.1/7.8 ms; C-02 shield halving HP 150→125, shield 30→5; V19 Counterattack 3/3; A-F2 KO<8 banner; B-8 BT flashcards 771 words); G8 0 console errors/warnings/dialogs.
- `tools/v45/repro-v45.js` — the before-state record on pristine V18.9 (30/30 bugs reproduced in Node vm); `tools/v45/verify-v45c.js` on pristine: 15/39 PASS, every fix gate FAILing as expected.
- `out/index.html` sha256 `d5fb0ddcd12a314b0f72a8191ec23b0fa4d04b923aa3dd53404e0ddad8e441bb`, 2,433,827 B (base V18.9: `1c409217a6511839fb2a5dfdcffda33c2adc6101116480f7d5f3b1b9229f0bdd`, 2,423,227 B).

## Known limits / findings

- NEW finding, NOT fixed here (needs the V19.0.1 decision, already DO by Claude): `legDiff()` never actually reads the mastered count — `V15().counts` is a getter, so `V15().counts().mastered` throws, the try/catch swallows it, and `legDiff()` always returns `['A2','B1']`. Legendary difficulty never scales with progress. Fixing the read would change pools for players with ≥200 mastered words (B1-only, then B2-only ≥600). See CHANGELOG.
- Firebase login/sync untested live, as in every version — run `FIREBASE_SETUP.md`.
- Real-phone test still needed (layout/touch), as always.
