# Korean & English Vocab Farm — V18.8 BOSS-FIGHT READABILITY

**Version 18.8.0 — layer V43 (loads LAST). Base: V18.7 (Unlock Shortcuts). Date: 2026-11-21.**

V18.8 answers Anh's live report: on his laptop, the boss-fight question card was nearly unreadable — dark text on a dark card (screenshot: a Korean MC fight, "출국 날짜"). The fix is a targeted, CSS-only layer on the fight screen only: explicit high-contrast colours for the question word, the romanization/IPA + instruction line, the answer buttons in every state, the top bar (boss name, hearts, HP), the element/rarity/phase chips, the V34 break bar, the feedback lines, and the disabled pet-skill button. No fight logic, reward, XP, SRS, pet, farm or save logic touched; no new bosses, words, art, or save key. The dark fight cards stay dark — the text is now light on them.

**Scope note:** this is a targeted fix for the boss-fight screen only. It is NOT a resumption of the stopped V28 Boss UI project (43 screens) — no other screen is touched.

**Honest testing note:** verified by `build_v43.py` (base-hash gate, exact-match anchors, marker order, `node --check`), by the jsdom suite `test43.js` (**141 PASS / 0 FAIL / 8 SKIP, ×3 runs** on the built `out/`) and by real-Chrome gates `verify-v43c.js` (**26/26 PASS, ×3 runs**, 0 console errors/warnings/dialogs) measuring computed contrast ratios in Chrome 157. Anh's real-phone test remains the final word for layout and touch. Firebase login/sync is untested live, as in every version — run `FIREBASE_SETUP.md`.

## Root cause (measured, not guessed)

The V19 fight panel is FIXED dark (`.v19fight` rgba(24,18,48,.92), `.v19qcard` #241b42, `src/v19.css:63`) but its text INHERITS the theme ink/mute: `.v19qword` sets size/weight but NO colour, and `.mute` has no colour in the fight context. In the LIGHT theme (Anh's laptop default) ink is #3A2E22 and mute is #7C6B58 — dark-on-dark. The dark theme was never affected (all dark-theme measurements passed on the pristine V18.7 base). The V18 fight is theme-var-driven, so its Q&A passed in both themes, but its warn banner, feedback lines, chips and break bar failed the same way in the light theme. V24 (V15.1, WCAG AA on 14 screens) never covered these fight cards.

Winning-rule evidence (real Chrome, pristine V18.7, V19 KO fight, 1280×800 light): `.v19qword` computed `rgb(58, 46, 34)` on `rgb(36, 27, 66)` = **1.22:1** — no winning colour rule at all, just the inherited `--ink`. The `.v19opt` buttons were never the failing part: they declare `color:#fff` and measured **14.03:1** before and after.

## Before → after (computed contrast, real Chrome 157, light theme unless noted)

| Element | Before (V18.7) | After (V18.8) | Need |
|---|---|---|---|
| V19 question word `.v19qword` (1280/1366/360, light + dark) | 1.22:1 | **16.02:1** | 3:1 (large) |
| V19 qcard mute (romanization + instruction) | 3.13:1 | **8.69:1** | 4.5:1 |
| V19 boss name / hearts / HP label / skill line | 1.12:1 | **14.78:1** | 4.5:1 |
| V19 info `.mute` lines | 2.89:1 | **8.02:1** | 4.5:1 |
| V19 answer buttons (default / right / wrong / disabled) | 14.03:1 (already OK) | **14.03 / 8.63 (disabled)** | 4.5:1 |
| V19 explain line (right / wrong) | 4.92 / 4.29:1 (wrong failed) | **4.92 / 7.60:1** | 4.5:1 |
| V19 phase chip (white on #7B61FF) | 4.20:1 | **6.76:1** | 4.5:1 |
| V19 element/rarity chips (worst: light 2.70, ice 3.22) | 2.70–3.22:1 | **6.27–11.54:1** (measured: mythic 6.27, fire 11.54) | 4.5:1 |
| V18 question word `.v18qword` (light / dark) | passed (theme vars) | **12.26 / 14.04:1** | 3:1 |
| V18 qcard mute | passed | **4.77 / 6.95:1** | 4.5:1 |
| V18 answer buttons | passed | **12.95 / 12.38:1** | 4.5:1 |
| V18 warn banner (dark ink on #4a2b00) | failed | **9.84:1** (#FFE066, static audit — see note) | 4.5:1 |
| V18 explain line (ok / bad on light card) | 3.48 / 3.99:1 | **4.88 / 5.23:1** | 4.5:1 |
| V18 phase chip (white on gradient → #B388FF) | 2.64:1 | darkened gradient (static audit) | 4.5:1 |
| V18 element chips (worst: thunder 1.40, ice 1.90) | 1.40–1.90:1 | **8.94–9.10:1** (measured) | 4.5:1 |
| V18 normal break label | — | **11.33:1** | 4.5:1 |
| Blocked break bar `.mute` (V18, steady .85 opacity) | **3.71:1** | **8.07:1** | 4.5:1 |
| Blocked break bar `.mute` (V19) | — | **6.24:1** | 4.5:1 |
| Blocked break-bar title (V18 / V19) | — | **8.07 / 11.04:1** | 4.5:1 |
| Disabled pet-skill button (energy 0 < cost) | ~1.5:1 (opacity .45) | **5.87:1** | 4.5:1 |
| V18 wrong-answer banner (`.v18banner`, steady state) | — | **9.53:1** | 4.5:1 |
| Win screen (done-big / boss name) | — | **10.24 / 14.78:1** | 4.5:1 |

Notes: (1) The disabled pet-skill button could never be fixed by opacity alone — text and background fade together — so the rule now sets an explicit opaque background + light text when disabled. (2) The V18 warn banner (`.v18warn`, KO pool < 8 cards) never renders on a fresh guest (KO pool is 20 cards), so it has no live measurement; its 9.84:1 is from the static audit in `test43.js` §43A. (3) The V19 wrong-answer banner measured 10.61:1; the V18 one 9.53:1 at full opacity — an earlier 1.38:1 reading was a mid-fade measurement of the `.3s` fade-in animation, not the steady state.

## What V18.8 adds

### 1. The layer itself (`src/v43.js` + `src/v43.css`, loaded LAST)

- `src/v43.js` (543 chars): version marker only — `window.__v43={version:'18.8.0', _test:{}}`. No logic, no `localStorage`, no `window.S`.
- `src/v43.css` (7,973 chars): CSS-only, scoped to `.v18fight` / `.v19fight` / `.v23bar-fight`. Key rules:
  - **V19 (fixed dark panel):** `.v19qword`, boss name, hearts, HP, options → `#fff` (16.02 / 14.78 / 14.03:1); qcard/info/explain `.mute` → `var(--ui-text-muted-dark,#C4B9E2)` (8.69 / 8.02:1, reusing the V24 token); passage → `#fff`, passage text `#E5DEF5`; phase chip `#5B3FD4` (6.76:1); element/rarity chips → `color-mix(in srgb, var(--ec) 45%, #000)` background + `#fff` text (worst measured 6.27:1); bad-state explain line → `#FF8A78` (the ok state already passed).
  - **V18 (theme-var card):** qword/info/options/passage pinned to `var(--ink)`, `.mute` to `var(--mute)` (12.26 / 4.77:1 light); warn `#FFE066` on #4a2b00 (9.84:1); explain light-theme overrides `[style*="--ok"]{color:#1B7F5A!important}` / `[style*="--bad"]{color:#C23A30!important}` with dark-theme restorations to `var(--ok)`/`var(--bad)`; phase gradient darkened to `#6D28D9 → #C1121F`; break label `var(--ink)`, breakbar track `color-mix(in srgb,var(--ink) 14%,transparent)`, weakchip `#7A5B00` light / gold dark.
  - **Blocked break bar** (read/speak-mode bosses and <8-card KO pools can never break the weakness, `src/v36.js`): V19 title `#fff`, mute `var(--ui-text-muted-dark,#C4B9E2)`; V18 title + mute `var(--ink)` — the bar keeps its dimmed `.85` opacity "blocked" look, only the text is strengthened (8.07 / 6.24:1). This was caught by the first Chrome run (V18 blocked `.mute` 3.71:1) and fixed in the same layer before delivery.
  - **Pet bar:** `.v23bar-fight .v23bf-skill:disabled{opacity:1;background:#6E5F3E;color:#FFF8E1;border-color:#8A7A52;cursor:not-allowed}` (5.87:1).
  - `!important` is used only to beat the inline `style="color:var(--ok)/var(--bad)"` on explain lines. No other screen is touched: every selector starts with `.v18fight`, `.v19fight` or `.v23bar-fight`.

### 2. Build + test evidence (shipped in the ZIP)

- `build_v43.py` — no `src/` replacements; title swap + layer injection last before `</body>`; refuses unless the base is pristine V18.7 (hash `9d4a113b…`). `package_v43.py` — same pattern as V42; `test43.js` + `verify-v43c.js` + `repro-v43.js` are inside the ZIP (finished BEFORE packaging — the V18.7 mistake is not repeated).
- `tools/v43/test43.js` — **141 PASS / 0 FAIL / 8 SKIP (of 149), ×3 runs** on the built `out/` (static contrast audit incl. controls proving the audit detects the pre-fix failures, e.g. pre-fix qword 1.22:1 and pre-fix blocked-bar mute 3.71:1).
- `tools/v43/verify-v43c.js` — **26/26 PASS, ×3 runs**, real Chrome 157, 0 console errors/warnings/dialogs. Gates: V19 KO light 1280×800 + 1366×768 + dark + 360px; V18 KO light + dark + 360px; correct/wrong answer states for both engines; V19 EN mc/grammar/listen/builder; V18 read + speak; V19 read (blocked break bar); full V19 KO fight to a win (hp 0, hearts 5, stars 3); 360px no-overflow (scrollW 360 both engines).
- `tools/v43/repro/repro-v43.js` — the before-state record on pristine V18.7 (fails with numbers, see the table above).

## Not changed

- No fight logic, reward, XP, SRS, word pool, pet, farm, gate, unlock or save logic touched. `legDiff` + weakness table, C-R2-1 (KO boss correct answers pay 0 XP), F-12 reset scope, farm +35 vs +25 XP, bubble/shop icons, C-03, C-08, "Từ vựng của tôi" picker scope, `.v20modal`, F-05/F-07 observers, V9 word fixes, V14.1, V16 Q1/Q2/Q4, V17 Q3/Q4/Q7/Q8, PR #7 cleanup — all unchanged, as before.
- `.v19qcard` background (#241b42) and `.v19opt` background (#2e2454) unchanged — only text colours were set. No other screen touched (V28 Boss UI stays stopped).
- `out/index.html` sha256 `3ad47dbf82fb2d5e508ff13b2d441ad63c061690361d18fd113c84f4466ee73b`, 2,421,418 B (base V18.7: `9d4a113b72898718c3f1fbb184652a90a58b86a1696353117afadd7f239a9dd2`, 2,412,801 B).
- Build note: the first `build_v43.py` run failed its own guard — `src/v43.js`'s comment contained the literal string "localStorage". The comment was reworded ("no new save key") and the script re-run clean. The tree was then restored byte-identical from `tools/v43/pristine-v18.7-out/` (base hash re-verified `9d4a113b…`) for the blocked-break-bar fix revision, and rebuilt clean to the new hash above. No hand-editing of build output.

## Known limits (not fixed here)

- `.v34weakchip` renders in boss LIST rows (V15/V18/V19 arena + map lists), not inside fights — its list-row contrast is a different screen and is out of scope for this fix; it needs Anh's decision whether the lists get the same treatment. The V43 rules for it inside fights are defensive only.
- The V18 warn banner (`.v18warn`, KO pool < 8) has a static-audit value only (9.84:1) — it never renders on a fresh guest, so no live measurement exists.
