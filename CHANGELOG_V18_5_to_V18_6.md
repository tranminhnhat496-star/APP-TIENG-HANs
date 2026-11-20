# Changelog — V18.5 (Bug Fixes II) → V18.6 (Bug Fixes III)

**Version 18.6.0 — layer V41. Base: V18.5 (layer V40, 18.5.0). Date: 2026-11-20.**
**out/index.html sha256 `f0576130e6ff53478727319fa54fd5d703d76717b42561c1b29b5c41849697eb`, 2,397,154 B** (base V18.5: `9a2fdd741d8027dd3e95a5bcae64a4e8989bd726bcb74fe74f49f29a0e779827`, 2,390,555 B).

Round-2 review of the V18.5 build (`tools/v41/review-A-v40.md`, `review-B-deep.md`, `review-C-play.md`). 6 fixes + 1 conditional item checked and left unchanged. No schema change, no new save key, no new localStorage key. No new bosses, art, or rewards beyond the fixes.

## Fixed

### R1+R2 (MAJOR, V19 engine only — introduced by the V40 C-02 fix)
- `src/v19.js` — `answer()`, `pick()`, `pickCorrect()`, `pickWrong()`: take the Counterattack path ONLY when the current question IS a CA question (`F.qmode` starts with `'ca-'`). Before: a team skill that dropped boss HP to ≤20% started the CA while a normal question was still on screen; the in-flight normal answer was counted as a CA answer (`caRight` 4 after a perfect run → the 0/3 failure branch: −2 hearts, no reflect). And a grammar/read/builder question on screen threw `TypeError` (`caMode` undefined, no `optsVi`) and was unanswerable until the 15 s CA timer expired.
- `src/v19.js` — `resolveUltimate()`: clamp `r = Math.min(3, F.caRight)` so an out-of-range count can never fall into the 0/3 failure branch again.
- Must-not-break verified: answer-triggered CA (R1b control), C-02 shield-halving for team-skill damage, checkPhase-after-skill phase transitions, lethal team skill via V36 `resolveLethal`.

### F1 (MINOR, save/import)
- `index.html` — `load()`: default `S.opt` when a stored save has `cards` but no `opt` — `if(!j.opt) j.opt={mode:'card',dir:'kv',group:'',due:false}`. Before: boot threw `TypeError: Cannot read properties of undefined (reading 'group')` in `startSession` and `#app` stayed empty on every boot.

### F2 (MINOR, farm)
- `src/v15.js` — `farmPlotTap()`: remove any existing `#v15farmquiz` div before creating a new harvest quiz (`var old=$('#v15farmquiz');if(old)old.remove();`). Before: a second tap within the 1200 ms cleanup window created a duplicate-id div and the stale card resurfaced when the new one was dismissed.

### F3 (MINOR, import/export)
- `src/v20.js` — `importFile()`: `try{ flush(); }catch(e){}` before the pre-restore snapshot.
- `src/v15.js` — `backupImport()`: `try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}` before the pre-restore snapshot.
- Before: the snapshot read localStorage, so a change still inside the ~800 ms debounce window was missed (undo restored stale bytes, the dirty change unrecoverable). Repro now snapshots the dirty value (8888 / 9999) and undo restores it.

### C-R2-2 (MINOR, bottom nav, 360px)
- `src/v41.css` (new layer file): at ≤640px restore a minimum tab width — `:root .tab{flex:0 0 auto;min-width:64px;padding:6px 8px;font-size:10px}` — so the fixed bottom-nav row scrolls horizontally instead of crushing 11 labels into each other ("Học thông minh"/"Chrono"/"Skyroot" overlapped; "Skyroot" cut at the right edge; also jammed at 390px). No label text changed; nothing above 640px touched. Live verification at 360 + 390 pending (Chrome dead at build time — verify-v41c gate C).

### F4-partial (MINOR, raw data dupes — zero information loss)
- Dropped exactly two rows from all copies (`src/v17_a1a2.js` + `data/v17_a1a2.json`, `src/v17_oxford.js` + `data/v17_oxford.json`, and the inlined copies in `out/index.html` / `out/v17_*.json`):
  - `airplane` (2nd copy, A1–A2 VEHICLES, no 864 — byte-identical to no 863 except the sequence number; no 863 kept).
  - `each other` (2nd copy, Oxford lesson 38, ord 942, empty `pos`; ord 941 with `pos` "n, pro" kept).
- **Raw row counts: A1–A2 1000 → 999, Oxford 3396 → 3395** (out/ AND data/).
- **Deduped WORDS counts UNCHANGED: A1–A2 unique 995, Oxford unique 3393; VEHICLES renders 23, Oxford lesson 38 renders 24.**
- NOT touched: `may`/`May` (Oxford lesson 73 — different meanings) and `side` ×2 (Oxford lesson 108 — different meanings; IPA needs a decision).

## Checked, deliberately NOT changed

### U2 (CONDITIONAL, pre-existing)
- `castSkillInFight` (`src/v23.js`) has a `try{...render()}` line but `F.render` is never defined anywhere (also in the V18.4 backup). The fight IS re-rendered at the end of `castSkillInFight` via `__v18/__v19._petRefresh()` → `renderFight()`, so the dead line is most likely harmless. Fix ONLY if real Chrome shows HP/shield numbers lagging after a team skill — Chrome was dead at build time, so no reproduction exists and the line stays as-is. Verify-v41c gate E covers it.

### C-R2-1 (MAJOR) — needs Anh's decision, NOT fixed
- KO boss correct answers pay 0 XP (`markKO` `src/v18.js:344-353`, `markKO19` `src/v19.js:338-346`); `mark18`/`mark15` pay box-up +10 with a 10-min cooldown + streak +5. **Fix sketch (not implemented):** mirror the `mark18` award inside `markKO`/`markKO19` (box-up +10 XP, same 10-min cooldown, +5 on a streak) — or document in the UI that KO boss answers are intentionally XP-free (they already feed Smart Learning via `recordAnswer('ko',…)` since V39).

### Everything else decision-blocked (unchanged from V18.5)
- legDiff + weakness table (fix together); F-12 reset-EN scope; farm harvest +35 vs +25 XP; bubble/shop icons; C-03 BT Listening Quest 0% reward; C-08 pet-hatch safe-merge loss; "Từ vựng của tôi" boss picker scope; .v20modal stacking trap; F-05/F-07 observers; V9 word fixes ('gram' → "gam", 'pomegranate' → "quả lựu"); V14.1; V16 Q1/Q2/Q4; V17 Q3/Q4/Q7/Q8; regex-fix; PR #7 cleanup. See README_V18_5_BUG_FIXES_II.md.

## Files changed (build replacements)

| File | Change |
|---|---|
| `src/v19.js`, `out/v19.js` (+ inlined in `out/index.html`) | CA gate ×4 (answer/pick/pickCorrect/pickWrong), resolveUltimate clamp ×1 |
| `src/v15.js`, `out/v15.js` (+ inlined) | farmPlotTap stale-div removal; backupImport pre-snapshot flush |
| `src/v20.js`, `out/v20.js` (+ inlined) | importFile pre-snapshot flush |
| `src/v17_a1a2.js`, `out/v17_a1a2.js` (+ inlined), `data/v17_a1a2.json`, `out/v17_a1a2.json` | drop airplane no 864 (999 rows) |
| `src/v17_oxford.js`, `out/v17_oxford.js` (+ inlined), `data/v17_oxford.json`, `out/v17_oxford.json` | drop each-other ord 942 (3395 rows) |
| `out/index.html` | load() opt default; title V18.6; V41 layer injected last (`<style id="v41">` + `<script id="v41js">`) |
| `src/v41.js`, `out/v41.js` | version marker only (`18.6.0`) |
| `src/v41.css`, `out/v41.css` | nav min-width rule only |

## Tests

- `tools/v41/test41.js` (Node vm): **160 PASS / 0 FAIL / 10 SKIP (of 170) ×3 on the build + ×1 on the packaged ZIP.** §0 74, §L 9, §41A 16, §41B 7, §41C 5, §41D 5, §41E 8, §41F 12, §41G 4 (+2 SKIP live), §41R 17, §V 3, §C 8 SKIP. The 10 SKIP are Chrome-only gates.
- `tools/v41/repro-v41.js` + `tools/v41/verify-v41c.js` (real Chrome 157): **NOT RUN — Chrome dead at build time** (headless launch exits SIGTRAP 133 / "chrome did not start"; one retry after a pause also failed). Re-run where Chrome is alive: repro R1/R1b/R2/F1/F2/F3/F4/NAV/U2 on the pristine V18.5 base vs the V41 build; verify V41-A–E. 0 console errors/warnings/dialogs expected.
- V18.5 regression: all 12 V40 fixes hold (§41R).

## Update guide

1. Back up the current game folder (and export a backup from Backup & Restore in the game first — the game itself keeps 20 restore versions).
2. Replace the game folder with this ZIP's contents (GitHub Pages: push the files; the ZIP root IS the site root — `index.html` at the top).
3. Open the game: the title bar reads V18.6 — Bug Fixes III. Your save (`hanvocab.v1`) loads unchanged — no migration, no re-login, no data loss expected. If anything looks wrong, restore from your backup (Backup & Restore → Khôi phục).
4. Firebase is unchanged (placeholder `firebase-config.js` ships in the ZIP, as in every version — the repo's real config is never touched by the build).
