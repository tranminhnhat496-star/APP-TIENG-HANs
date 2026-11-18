# Changelog — V15.3 → V16 (Smart Learning)

**Version:** 16.0.0 · **Layer:** V27 (`src/v27.js`, `src/v27.css`) · **Date:** 2026-11-18
**Base:** V15.3 (commit `f099a2ff`) · **Build:** `build_v16.py` (run once on pristine V15.3 `out/`)
**Package:** `Korean_English_Vocab_Farm_V16_Smart_Learning.zip`

## What changed

### New: Học Thông Minh (Smart Learning) — one overlay, three tabs
- **New files:** `src/v27.js` (54,387 B), `src/v27.css` (8,671 B), `build_v16.py`,
  `package_v16.py`, `README_V16_SMART_LEARNING.md`, this changelog,
  `tools/v16/TODO_Q1_merge_branch.md`.
- **Overlay** (z-index 990, dark purple `#201535` / gold `#FFD76A`, chick mascot
  `assets/mascot-chick.png`): **Bảng điều khiển** (stats + "Gợi ý học thông minh"
  banner), **Từ yếu** (search + filters + word rows with speak / "Ôn ngay"),
  **Kế hoạch ngày** (5/10/15/custom time picker, ~2 words/min labelled estimate,
  5 new + 10 due + 5 weak default, max 30 ids, goal checklist).
- **Entry points:** EN Hub via MutationObserver decorator (zero old-file edits —
  injects a "🧠 Học thông minh" button into `.v15hub-headbtns` and `#v15langbar`,
  re-injected after every render); KO Hub via one build-time button append
  (`v27kotab`, after `v23kotab`, build_v15.py:381-387 precedent). The EN/KO toggle
  inside the overlay is V27-local state (`en27.uiLang`) — it never writes
  `en15().lang`.
- **New save key `S.v7.en27`** (lazy creation, full defaults; same `hanvocab.v1`
  key, no migration): EN `last`/`cw`/`cr` only; KO `right`/`wrong`/`cw`/`cr`/`last`
  (V27-observed only — UI labels them "từ khi dùng Học thông minh"); plan,
  sessions (max 30), days (max 90), per-language streaks, `claimed`, `uiLang`.
  Per-word maps cap 1,000 entries (LRU); 150 KB prune guard never blocks `save()`.
- **Hooks H1/H2/H3** (the only old-file edits, each a single guarded line before
  the save call): `mark15` (`src/v15.js:390`), `mark18` (`src/v18.js:321`),
  `mark19` (`src/v19.js:331`) → `recordAnswer('en', id, ok, mode|'boss18'|'boss19')`.
  Applied to `src/`, `out/*.js` and the inlined blocks in `out/index.html` — all
  copies agree, each with an exact-match assert that fails the build if the anchor
  is not found.
- **V27 question engine:** EN MC (EN→VI / VI→EN), type-the-word, listen, flash
  self-rate; KO MC (Hangul→meaning / meaning→Hangul), listen, self-rate.
  **No Hangul typing in v1.** Per EN answer calls `mark15(ok, w, 'smart')`; per KO
  answer updates `box`/`due` with V27's own copy of the KO interval table
  `[0, 10min, 1d, 3d, 7d, 14d]` (×1.5 if pet 3 owned) + `gain(ok?5:1)` + `res(card, ok)`.
  Wrong answers are re-asked at the end of the session; the summary shows real
  measured minutes, improved/still-weak words and the next review date.
- **Classification** NEW / LEARNING / WEAK / REVIEW / MASTERED per design §5.2
  (MASTERED needs box ≥4 AND right ≥3 AND no wrong in 30 days; legacy box-5-only
  needs wrong == 0) and **priority** per §5.3, with one short reason per word.
- **Rewards:** XP through exactly one channel per answer (no end-of-round
  `score × 2`, no `gain` for boss-fight answers). Plan-completion bonus and 7-day
  streak gem are `claimed`-guarded (same pattern as Library rewards).
- **Honesty rules enforced:** no silent fallback to all words (shortfall shown);
  scope-aware counts + banner when a library scope is active; `ensureData()`
  awaited before any plan that may contain BT words; empty states say
  "chưa có dữ liệu"; no "AI phân tích" anywhere (suggestions are labelled
  "Gợi ý học thông minh").

### Preserved (verified by build asserts)
- All V15.3 layers byte-identical except the three hook lines and the KO button;
  marker order `… v23, v24, v25, v26, v27` asserted in the built `index.html`.
- Korean game, farm, XP/gems, bosses, pets, `hanvocab.v1` save — untouched.
- Firebase Auth/Sync code untouched; login stays optional; no API keys.

## ⚠️ Proposed / deferred — needs Anh's decision

- **Q4 — plan-completion reward +20 XP (PROPOSED, pending confirmation).**
  Implemented as proposed: +20 XP once per day per language for completing a Daily
  Plan (`claimed['plan:<lang>:<YYYY-MM-DD>']`), +1 gem on a 7-day Smart streak
  (`claimed['streak7:<lang>:<week>']`). If Anh wants XP-only / zero / a different
  amount, it is a one-line change in `claimPlanBonus()` (`src/v27.js`).
- **Q1 — DEFERRED (not applied):** no Firebase safe-merge branch for `en27`.
  Until approved, a safe-merge keeps only the newer device's whole `en27`
  (last-write-wins); the older device's Smart history is dropped. Exact patch
  sketch is ready in `tools/v16/TODO_Q1_merge_branch.md` for the moment Anh
  approves it. The same loss already happens to `S.v7.en` today (Q7, separate task).
- **Q2 — DEFERRED (not applied):** no hook in Korean normal modes (`mark()` etc.).
  KO weak detection records Smart sessions + `box`/`due`/`w` proxies only, and
  improves gradually from the ship date.
- **Q6:** no Hangul keyboard typing in KO Smart Practice v1 (MC + listen + self-rate
  only, same as V11.1 boss mode).

## Tests — NOT yet run (test agent owns them)

The 12 test situations from design Appendix B have **not** been run on this build
yet; the test agent runs them and writes `SMOKE_TEST_V16_2026-11-18.md`:

1. Hook coverage — `mark15`/`mark18`/`mark19` each record exactly once (incl. boss fights).
2. No double XP — session XP equals `mark15` returns only (+ plan bonus once).
3. `claimed` anti-duplicate — replaying a completed plan the same day awards nothing.
4. Plan shortfall honesty — a scoped plan with few words never silently becomes "all words".
5. BT `ensureData` path — a plan containing BT words builds after a fresh load.
6. KO derive-only accuracy — seeded weak list from `box`/`w` is honest about its limits.
7. 150 KB prune guard — a synthetic heavy `en27` prunes without blocking `save()`.
8. Merge branch — N/A in V16 (Q1 deferred); runs only if/when the branch is applied.
9. jsdom suite, run 1 on the build.
10. jsdom suite, run 2 on the build (repeatability).
11. jsdom suite, run 1 on the packaged ZIP.
12. Real-Chrome mobile checks — overlay at 320–430 px: no horizontal scroll,
    ≥44 px touch targets, WCAG AA contrast, no menu overlap.

Firebase login/sync remain **NOT live-tested** — Anh must run the `FIREBASE_SETUP.md`
live checklist against a real Firebase project before claiming sync/login work.

## Real bugs found and fixed (during V16 authoring)

**4. KO-button syntax error in the built `index.html` — the serious one, found by
verification before delivery.** `build_v16.py` built the KO tail as
`KO_TAIL_OLD[:-2] + KO_BTN + "';"` — stripping the v23 string's closing quote
as well as the `;`. The built Korean tabs line then read
`...</button>+'<button class="tab v27kotab" ...>...</button>'';`: the v23
string swallowed the `+` and the v27 string's opening quote, leaving bare
`<button class=...` code. `node --check` on the extracted line failed with
`SyntaxError: Unexpected token 'class'`. A syntax error in the V6 inline script
block would have broken the whole game on load. Fixed by a surgical exact-match
repair of `out/index.html` (`tools/v16/repair_kotab_2026-11-18.py`, which asserts
the broken form occurs exactly once and re-verifies with `node --check`), and
`build_v16.py` was corrected to `KO_TAIL_OLD[:-1] + KO_BTN + ";"` plus a new
structural assert (`</button>'+'<button class="tab v27kotab"`) so a future run
fails loudly instead of shipping broken JS. After the repair, **all 32 inline
`<script>` blocks in the built `index.html` pass `node --check`** (V6 block,
v15/v18/v19 with hooks, v27 included). No pre-existing bugs were found in the
old layers — the only old-code changes are the three hook lines and the KO
button, both asserted.

**Build-script limitation (found during testing, not a bug in the game):
`build_v16.py` is NOT idempotent for v27.** It asserts the pristine V15.3
hash and refuses to run if any v27 marker is present — it does not strip a
previous v27 layer before injecting. If a v27 fix is ever needed, `out/`
cannot be regenerated by re-running it; it needs a v27-strip step or a fresh
V15.3 tree. No fix was needed this round. Never re-run
`build_v15ui.py` / `build_v15lib.py` / `build_v15nav.py` on a finished build
either (they reorder v24/v25 after v26 — see the rebuild proof). Issues found in the **new V27 code itself** while writing
it, fixed before delivery:

1. **Offline banner referenced a non-existent element** — the `online`/`offline`
   listeners looked up `#v27offline`, but the overlay shell never rendered it.
   Fixed: the banner is now rendered in the shell (shown only when
   `navigator.onLine === false`).
2. **Streak-7 gem could only trigger from plan sessions** — `claimStreak7()` was
   first wired to plan sessions only, so a weak-review session on the day the
   streak hit 7 would never award the gem. Fixed: it is attempted at the end of
   every Smart session (once-per-week `claimed` guard makes this safe).
3. **Dead variables in the question header** (`done`, `shown` computed but unused)
   and in the Weak tab (`counts`) — removed.

## Build verification (build agent)

- `out/index.html` verified pristine V15.3 before the build: sha256
  `10492d46871f89de956bcdc5612720ba91a4df625d7db1e421bb96e9bdacb7f2`
  (1,930,157 B). `build_v16.py` ran exactly once; no `build_v15*.py` script was
  re-run (per the rebuild proof, re-running them reorders v24/v25 after v26).
- `node --check src/v27.js` clean; **all 32 inline `<script>` blocks of the
  built `out/index.html` pass `node --check`** (incl. the repaired Korean tabs
  line and the hooked v15/v18/v19 blocks). Build asserts passed (see build log):
  marker order `v23 < v24 < v25 < v26 < v27` (styles + scripts), `__v27` version
  `16.0.0`, KO `v27kotab` button present once (with its string correctly closed),
  each hook present exactly once in the built `index.html`, in
  `src/v15.js`/`src/v18.js`/`src/v19.js` and in `out/v15.js`/`out/v18.js`/`out/v19.js`;
  old layer versions pinned. Full post-repair re-verification: 23/23 checks pass.
- **CDP smoke load in real Chrome could NOT run in this environment:** Chrome 157
  refuses to start without a valid `/tmp/webgl-policy.txt` ("Hatch WebGL domain
  policy is required for browser startup"; an empty file and a single-domain file
  both fail with "invalid WebGL domain policy contract", and the contract format
  is not documented anywhere in this environment). `tools/v16/smoke27.js` is
  ready for the test agent to run wherever the policy file exists. The 12-spec
  test suite (test agent) is therefore the first real-browser evidence for V16.
- Package asserts passed: `index.html`, `v27.js`, `v27.css`, `build_v16.py` in the
  ZIP; `tools/v16/test27.js` NOT yet present at first packaging (test agent adds
  it — the package assert warns and the final packaging is re-run after tests).
