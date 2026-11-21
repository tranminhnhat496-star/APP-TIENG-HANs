# Changelog — V18.9 (Legendary Freeze Fix) → V19.0 (Round-3 Bug Fixes)

**Version 19.0.0 — layer V45. Base: V18.9 (layer V44, 18.9.0). Date: 2026-11-21.**
**out/index.html sha256 `d5fb0ddcd12a314b0f72a8191ec23b0fa4d04b923aa3dd53404e0ddad8e441bb`, 2,433,827 B** (base V18.9: `1c409217a6511839fb2a5dfdcffda33c2adc6101116480f7d5f3b1b9229f0bdd`, 2,423,227 B).

Bug-fix build only, from the round-3 review (reviews A/B/C in `tools/v45/`). No new features, no schema change, no new save key, no new localStorage key. No new bosses, art, words, or rewards. Every fix was reproduced first on the pristine V18.9 base (`tools/v45/repro-v45.js`: 30/30 bugs reproduced in Node vm; `tools/v45/verify-v45c.js` on pristine: 15/39 PASS, every fix gate FAILing as expected).

## Added

### Layer files
- `src/v45.js` (new): `window.__v45={version:'19.0.0'}` + the C-R3-2 quarantine warning display (`_warn45` helper — see below). No logic beyond the warning, no `localStorage`, no `window.S`.
- `src/v45.css` (new): `.v34weakchip` list-row contrast rules (light #7A5B00 + dark gold + the `.v19zboss` gold rule). No other visual change.
- `out/v45.js`, `out/v45.css`, `out/build_v45.py` (build script shipped for reproducibility); title now "V19.0 — Round-3 Bug Fixes".

## Fixed in this revision

### C-R3-1 MAJOR — never-learned words counted as "cần ôn" (due = box 1–4 AND due<=now)
- Before: every due counter used `(due||0)<=now` with no box filter — fresh save `counts15().due` = 4,889 = total; seeded 0 truly-due → due 4,879, all box-0; Review sessions taught brand-new words; BT attach inflated due 4,889 → 5,361.
- After: due means box 1–4 AND due<=now at all 14 sites (`src/v15.js` counts15, dueTodayCount, reviewHTML, reviewStart, wordsFiltered onlyDue + BT status filters; `src/v17.js` statsOf, filterWords; `src/v22.js` unitStats, filterEntries; `src/v25.js` statsOf; `src/v27.js` dashboard dueN EN + KO; `src/v34.js` statsForList). Box 5 (mastered) deliberately excluded — documented above `counts15()`; matches Smart Learning's REVIEW definition (`src/v27.js` classifyEN/KO).
- Review with 0 truly-due words shows the honest empty state (`Không có từ nào cần ôn hôm nay.`) — no silent fallback to all words.
- Measured (Node vm + real Chrome 157): fresh due **4,889 → 0**; seeded 3 truly-due → due **exactly 3**; BT attach total 5,371, due **still 0**; Review session opens on a box-2 word, 3 questions (`câu 1/3`).

### C-R3-2 SEVERE — corrupt / card-less save silently destroyed on first boot
- Before: `load()` returned a fresh sample on any parse failure / missing `cards`, and boot-time `dailyLogin()`→`save()` overwrote the original bytes — no warning, no backup holding them.
- After: `load()` (index-only replacement, V6 core — same build pattern as V41's `load()` fix) quarantines the raw bytes FIRST under `hanvocab.v12.corrupt-<ms>-<random>` and sets `window.__V45_CORRUPT` (`bad-json` vs `no-cards`); `src/v45.js` shows the honest 8 s warning naming the quarantine key. First boot (no save stored) is never quarantined. Valid saves boot normally (xp 9999 kept, no quarantine key, no flag).
- Verified byte-exact in Node vm and real Chrome: corrupt bytes `{corrupt-json-{{{` and card-less bytes `{"xp":9999,...}` both survive boot in their own quarantine keys; the warning toast appears as a `.v7toast` and stays visible.
- Implementation note: the V6 `toast()` lives inside the `v7js` closure and is NOT a global — the first version of the layer fell back to `pop15` (a `.pp` that vanishes after 1.1 s, found by `tools/v45/probe-toast.js`). `v45.js` now has `_warn45`: global `toast()` when it exists, else build the same `.v7toast` div directly (same class, same 8 s life), else `pop15`.

### C-R3-4 MINOR — pre-restore snapshot keys collide in the same millisecond
- Before: `snapshotCurrent()` keyed `hanvocab.v12.preimport-<Date.now()>` — two snapshots in the same ms overwrote each other.
- After (`src/v31.js`): key is `preimport-<ms>-<counter>-<random>`; the leading ms number is kept so `newestPreRestoreKey()`'s `parseInt` still resolves. Verified under faked identical `Date.now()`: distinct keys, both snapshots survive (xp 20 vs 1111). Note: under frozen time the resolver returns the first-created key (strict `>` on equal ms) — tie-break by insertion, no data loss; in real time the ms differ and the newest wins.

### NEW-1 MINOR — 20 topic icons render as `assets/icons/v6/undefined`
- Before: 20 of 52 cards on the legacy EN → Chủ đề tab had `<img src="assets/icons/v6/undefined">` (19 A1–A2 topics + Oxford have no `icon` field; `topicsHTML()` called `enIcon(t.icon)` with no fallback).
- After: `enIcon()` (index-only, V6 core) emits no `<img>` when there is no icon. No icon invented or assigned. Verified in real Chrome: 52 cards, 0 `undefined` URLs, 32 `<img>` icons, 20 empty icon slots; BT attach (53rd card, also icon-less) covered. Only the two known missing files remain broken (`shop.png` / `bubble.png`, pass-B item #6).

### `.v34weakchip` in boss LIST rows — CSS-only contrast fix (Claude-directed DO)
- Before: gold #FFD76A text on light list cards = 1.33:1 (unreadable).
- After (`src/v45.css`): dark-amber #7A5B00 text/border on a pale amber wash in the light theme (the V18.8 fight colours); gold kept in the dark theme, following the V43 theme pattern. V43 fight-screen rules untouched.
- Measured in real Chrome 157 (worst chip): bosses-hub light **5.54:1** (was 1.33:1), dark **8.69:1**; Collection light **5.54:1**, dark **8.69:1**; V19 zone z1 light **9.64:1**, dark **9.64:1** — all WCAG AA at 1280/1366/360.
- Exception found by the Chrome gate (run 1): V19 zone cards (`.v19zboss`) have a hardcoded dark background (`#241b42`) in BOTH themes, so the light dark-amber text failed there (2.41:1). The zone cards keep GOLD text in both themes (`.v19zboss .v34weakchip` rule). The other list surfaces use the themed `--sf` surface (light in the light theme).

### Pass-C leads fixed with evidence
- `restoreRaw()` (`src/v31.js`): size-check BEFORE `JSON.parse` — oversize invalid JSON returns `file-too-large` (not `bad-json`); small invalid JSON still returns `bad-json`.
- `speedHatch()` (`src/v23.js`): remaining-time check BEFORE spending gems — a ready hatch refuses (`Trứng đã ấp xong — nhận thú cưng ngay!`) and spends 0 gems (was 5).
- `deleteHistoryEntry(at)` (`src/v31.js`): deletes ONE entry, not all entries sharing the timestamp.

## Deliberately NOT fixed (pending decisions — reported, not hidden)

- **C-R3-3**: A1–A2 raw data has 4 duplicate headwords with DISTINCT senses (`sluggish` 403 vs 680, `orange` 313 fruit vs 806 colour, `trip` 530 verb vs 912 noun, `devoted` 351 vs 938). Dedup loses one real sense each for `orange`/`trip` — DECISION, do not drop rows.
- **legDiff scaling + weakness table + KO boss 0 XP**: Claude decided all three DO (2026-11-21 09:40), but they go into the SEPARATE follow-up **V19.0.1 (layer V46) AFTER V19.0** — NOT folded into this build. `legDiff()`'s definition + thresholds (`<200 → A2/B1`, `<600 → B1`, else `B2`) are byte-identical; markKO/markKO19 untouched. The latent getter bug stays: `V15().counts` is a getter, so `V15().counts().mastered` throws, the try/catch swallows it, and `legDiff()` always returns `['A2','B1']` — Legendary difficulty never scales with progress despite the arena card promising it. Fixing the read would change Legendary pools for players with ≥200 mastered words.
- **All other 13 pass-B decision items** (F-12 reset scope, farm +35 vs +25 XP, bubble/shop icons, C-03 BT Listening Quest pays at 0% accuracy, C-08 pet hatch safe-merge loss, "Từ vựng của tôi" boss picker scope, `.v20modal` stacking trap, F-05/F-07 observers, C-09, F4 may/May + side×2, V9 word fixes, V14.1, V16 Q1/Q2/Q4, V17 Q3/Q4/Q7/Q8, PR #7 cleanup): unchanged, no safe fix.
- **Unreproduced leads** (validateSave depth-6 scan, `dayNo()` timezone edge, `farmBuy` silent return on already-owned pet/decor, Chrono overlay DOM leftover): not fixed — direct-call-only / harmless / cosmetic, no evidence of player impact.

## Verification (all on the final build)

- `tools/v45/test45.js` — **249 PASS / 0 FAIL / 7 SKIP (of 256), ×2 runs** on the built `out/`. Sections: §0 107/0/0, §L 9/0/0, §45A 14/0/0, §45B 7/0/0, §45C 12/0/0, §45D 5/0/0, §45E 7/0/0, §45F 9/0/0, §45L 6/0/0, §44A 34/0/0 (Legendary pool identity OLD V18.9 vs NEW V19.0 at mastered 0/250/700 — 550 words A2 300/B1 250 + 24 grammar A2 12/B1 12, identical sorted ids), §44B 14/0/0, §44F 12/0/0, §44R 10/0/0, §V 3/0/0, §C 7 skips (Chrome-only).
- `tools/v45/verify-v45c.js` — **39/39 PASS, ×2 runs**, real Chrome 157, 0 console errors/warnings/dialogs. Run 2: Legendary direct fight 13.5 ms, real UI clicks 20.1/3.8 ms. Run 3: direct 9.9 ms, clicks 8.1/7.8 ms.
- `tools/v45/repro-v45.js` — before-state on pristine V18.9: 30/30 bugs reproduced (Node vm). `verify-v45c.js` on pristine: 15/39 PASS, every fix gate FAILing as expected.
- `build_v45.py` — base-hash gate (pristine V18.9 `1c409217…`), wholesale embedded-block sync (asserted byte-identical to src), exact-match index-only replacements for `load()` + `enIcon()`, marker-order asserts, `node --check` on all edited files. `package_v45.py` — ZIP byte-identical `index.html`, asset counts (V10 30, V11 30, V17 8, V18 8 boss PNGs, pets 53, Chrono pets 9, Chrono eggs 3, Skyroot pets 12).

## Known limits

- `legDiff()` latent getter bug (above) — V19.0.1 follow-up, already decided DO by Claude.
- Firebase login/sync untested live, as in every version — run `FIREBASE_SETUP.md`.
- Real-phone test still needed (layout/touch), as always.
