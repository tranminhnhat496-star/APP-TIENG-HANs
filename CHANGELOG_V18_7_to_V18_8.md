# Changelog — V18.7 (Unlock Shortcuts) → V18.8 (Boss-Fight Readability)

**Version 18.8.0 — layer V43. Base: V18.7 (layer V42, 18.7.0). Date: 2026-11-21.**
**out/index.html sha256 `3ad47dbf82fb2d5e508ff13b2d441ad63c061690361d18fd113c84f4466ee73b`, 2,421,418 B** (base V18.7: `9d4a113b72898718c3f1fbb184652a90a58b86a1696353117afadd7f239a9dd2`, 2,412,801 B).

Boss-fight readability fix, from Anh's live report (laptop screenshot: Korean MC fight "출국 날짜" nearly unreadable — dark text on a dark card). CSS-only layer on the fight screen only. No schema change, no new save key, no new localStorage key. No new bosses, art, words, or rewards. Not a resumption of the stopped V28 Boss UI project.

## Root cause

The V19 fight panel is FIXED dark (`.v19fight` rgba(24,18,48,.92), `.v19qcard` #241b42, `src/v19.css:63`) but its text INHERITS the theme ink/mute: `.v19qword` sets size/weight but NO colour, and `.mute` has no colour in the fight context. In the LIGHT theme (Anh's laptop default) ink is #3A2E22 and mute is #7C6B58 — dark-on-dark. Measured on pristine V18.7 in real Chrome: qword **1.22:1**, qcard mute **3.13:1**, boss name / hearts / HP **1.12:1**, info mute **2.89:1**. The dark theme was never affected. The V18 fight is theme-var-driven so its Q&A passed, but its warn banner, feedback lines, chips and break bar failed the same way in the light theme (worst element chip 1.40:1, phase chip 2.64:1). V24 (V15.1, WCAG AA on 14 screens) never covered these fight cards.

## Added

### Layer files
- `src/v43.js` (new, 543 chars) + `src/v43.css` (new, 7,973 chars): `window.__v43={version:'18.8.0', _test:{}}` (version marker only — no logic, no `localStorage`, no `window.S`). CSS scoped to `.v18fight` / `.v19fight` / `.v23bar-fight`, loaded LAST.
- `out/v43.js`, `out/v43.css` (new); `out/build_v43.py` (build script shipped for reproducibility); title now "V18.8 — Boss-Fight Readability".

### R-V43-V19 — V19 fight: light text on the fixed dark panel
- `.v19fight .v19qword`, boss name (`.v19fight-info > b`), hearts + HP (`.v19hp b`, `.v19hp .mute` → `#fff` via the info rules), options (`.v19opt`, incl. `:hover`/`:focus`/`.right`/`.wrong`/`:disabled`), passage (`.v19passage`, text `#E5DEF5`), done text → `#fff`. Measured: qword **16.02:1**, boss name / hearts / HP **14.78:1**, options **14.03:1** default / **8.63:1** disabled (opacity .75).
- `.v19fight .v19qcard .mute`, `.v19fight-info .mute`, `.v19explain .mute`, `.v19done .mute` → `var(--ui-text-muted-dark,#C4B9E2)` (V24 token). Measured: qcard mute **8.69:1**, info mute **8.02:1**.
- Explain lines: ok state already passed; bad-state `[style*="--bad"]{color:#FF8A78!important}` (wrong-answer explain **7.60:1**; right-answer explain **4.92:1**). `!important` only to beat the inline `style="color:var(--ok)/var(--bad)"`.
- Phase chip `.v19phase{background:#5B3FD4;color:#fff}` (**6.76:1**, was 4.20:1). Element/rarity chips `.v19chip{background:color-mix(in srgb,var(--ec,#888) 45%,#000);color:#fff}` — measured fire **11.54:1**, mythic **6.27:1** (was 2.70–3.22:1 for bright elements).
- Blocked break bar (read/speak bosses, <8-card KO pools): `.v19fight .v34bar-t{color:#fff}` (**11.04:1**), `.v19fight .v34bar.v34blocked .mute{color:var(--ui-text-muted-dark,#C4B9E2)}` (**6.24:1** at the bar's steady .85 opacity).

### R-V43-V18 — V18 fight: pin the theme-var text, fix the dark-on-light failures
- `.v18fight .v18qword`, `.v18fight-info b`, options, passage → `var(--ink)`; qcard/info `.mute` → `var(--mute)`. Measured light: qword **12.26:1**, qcard mute **4.77:1**, options **12.95:1**; dark: qword **14.04:1**, mute **6.95:1**.
- Warn banner `.v18warn{color:#FFE066}` on fixed #4a2b00 — **9.84:1** (static audit; never renders on a fresh guest, KO pool is 20 cards).
- Explain lines, light theme: `[style*="--ok"]{color:#1B7F5A!important}` / `[style*="--bad"]{color:#C23A30!important}` with dark-theme restorations to `var(--ok)`/`var(--bad)` via `@media (prefers-color-scheme:dark)` + `:root[data-theme="dark"]`. Measured: right **4.88:1**, wrong **5.23:1** (was 3.48 / 3.99:1).
- Phase chip gradient darkened to `#6D28D9 → #C1121F`; element chips same 45% `color-mix` treatment as V19 — measured **9.10 / 8.94:1** (was 1.40–1.90:1 for bright elements).
- V34 break bar: `.v34breaklabel{color:var(--ink)}` (**11.33:1**), breakbar track `color-mix(in srgb,var(--ink) 14%,transparent)`, weakchip `#7A5B00` light / gold dark. Blocked variant: `.v18fight .v34bar-t{color:var(--ink)}` + `.v18fight .v34bar.v34blocked .mute{color:var(--ink)}` — **8.07:1** at .85 opacity (was **3.71:1**, caught by the first Chrome run and fixed in this layer before delivery; the bar keeps its dimmed "blocked" look).

### R-V43-PET — disabled pet-skill button
- `.v23bar-fight .v23bf-skill:disabled{opacity:1;background:#6E5F3E;color:#FFF8E1;border-color:#8A7A52;cursor:not-allowed}` — **5.87:1** (was ~1.5:1 at opacity .45; opacity alone could never fix it — text and background fade together). Pet note (13.45:1), pet rows (16.52:1) and pet Lv badges (13.45:1) already passed and are unchanged.

## Fixed in this revision — the blocked break bar (caught by the first Chrome run)

- **V18 blocked break-bar `.mute` measured 3.71:1 on the first verify run** (the `.v34bar.v34blocked` wrapper sets `opacity:.85`, so the theme `--mute` failed on the light card). Fixed in `src/v43.css` (title + mute pinned to `var(--ink)`, V19 counterparts added explicitly), the tree restored from `tools/v43/pristine-v18.7-out/` (base hash re-verified `9d4a113b…`), rebuilt clean to the new `index.html` hash (`3ad47dbf…`). The same run also exposed two measurement bugs in `verify-v43c.js` (see below) — no game code was involved.

## Verification (all on the final build)

- `tools/v43/test43.js` — **141 PASS / 0 FAIL / 8 SKIP (of 149), ×3 runs** on the built `out/` (static contrast audit incl. controls proving the audit detects the pre-fix failures: pre-fix qword 1.22:1, pre-fix blocked-bar mute 3.71:1, worst element chip 5.79:1 post-fix).
- `tools/v43/verify-v43c.js` — **26/26 PASS, ×3 runs**, real Chrome 157, 0 console errors/warnings/dialogs. Gates: V19 KO light 1280×800 + 1366×768 + dark + 360px; V18 KO light + dark + 360px; correct/wrong answer states both engines; V19 EN mc/grammar/listen/builder; V18 read + speak; V19 read (blocked break bar); full V19 KO fight to a win (hp 0, hearts 5, stars 3); 360px no-overflow (scrollW 360 both engines).
- `tools/v43/repro/repro-v43.js` — before-state record on pristine V18.7 (V19 KO light: qword 1.22, mute 3.13, boss name 1.12, info mute 2.89, hearts/HP 1.12, pet-skill 1.21 vs parent bg).
- Measurement fixes made during verification (harness only, not the game): `verify-v43c.js` now parses Chrome's `color(srgb …)` serialisation of resolved `color-mix()` backgrounds (the old parser treated chip backgrounds as transparent — the 1.02:1 chip readings were a measurement artifact, not a real failure); the winning-rule walker now checks rule `.type` instead of the presence of `.cssRules` (in this Chrome a `CSSStyleRule` also exposes an empty `.cssRules` list, so the old walker skipped every style rule); answer-state measurements now wait for the `.v18banner`/`.v19banner` fade-in to settle (an earlier 1.38:1 banner reading was mid-fade, steady state 9.53:1).

## Not changed

- No fight logic, reward, XP, SRS, word pool, pet, farm, gate, unlock or save logic touched. C-R2-1 (KO boss 0 XP), legDiff + weakness table, F-12, farm +35 vs +25, bubble/shop icons, C-03, C-08, "Từ vựng của tôi" picker, `.v20modal`, F-05/F-07, V9 word fixes, V14.1, V16 Q1/Q2/Q4, V17 Q3/Q4/Q7/Q8, PR #7 cleanup — all unchanged.
- `.v19qcard` background (#241b42) and `.v19opt` background (#2e2454) unchanged. No other screen touched (V28 Boss UI stays stopped).
- Build note: first `build_v43.py` run failed its own guard — `src/v43.js`'s comment contained the literal string "localStorage". Comment reworded ("no new save key"), script re-run clean. No hand-editing of build output.
