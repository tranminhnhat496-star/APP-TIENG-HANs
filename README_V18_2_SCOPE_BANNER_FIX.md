# Korean & English Vocab Farm — V18.2 SCOPE BANNER FIX

**Version 18.2.0 — layer V37 (loads LAST). Base: V18.1 (Bug Fixes). Date: 2026-11-19.**

V18.2 fixes one user-reported bug — the "✕ Bỏ chọn" button on the scope banners looked dead — in both places it occurs. No new features, no new content, no new art, no reward/stat/pool/SRS/region-gate changes, no save-schema change, no new localStorage key. The fix was verified by reproducing the bug first on the pristine V18.1 base in real Chrome 157, then by a Node vm suite and Chrome gates on the fixed build; anything not verified is listed under "Not fixed / still open" instead of being fixed blind.

## What V18.2 fixes

### The "✕ Bỏ chọn" button did nothing (reported by Anh, 2026-11-19)
- **Evidence:** the English Hub scope banner ("Đang học: A1–A2 · Education – GIÁO DỤC — … ✕ Bỏ chọn") is rendered by `__v17.scopeBannerHTML()` (`src/v17.js:211-216`) and injected by `renderHub()` (`src/v15.js:563-574`) into the hub shell — OUTSIDE the `#v15body` tab container. Its button calls `__v17.clearScope()` (`src/v17.js:460`), which clears `en15().scope` and saves, then only calls `renderTab()` — re-rendering `#v15body` only. The banner is never re-rendered, so after tapping "Bỏ chọn" it stays on screen and the button looks dead. Switching hub tabs calls `setTab` → `renderHub()`, so the banner does disappear then — proving the data was cleared and only the re-render was missing.
- **Same defect class in the Smart Learning overlay:** the v27 scope banner button (`src/v27.js:845`) calls `__v15.clearScope()` with NO re-render at all, and `window.__v27` did not expose its internal `render()`.
- **Fix (4 guarded build replacements in `build_v37.py`; a runtime layer cannot reach these closure-local functions):**
  - `R-V37-V15-RENDERHUB` — `window.__v15` gains `renderHub:renderHub` (pure additive export).
  - `R-V37-V17-CLEARSCOPE` — `clearScope()` calls `v.renderHub()` when present, else falls back to `renderTab()`. `renderHub()` ends in `renderTab()`, which ends in `renderMode()` when a mode is active — exactly the current code path — the only change is the hub shell (header / tabs / banner) is rebuilt too. The mode timer (`M.timer`) is a JS interval, untouched by re-render.
  - `R-V37-V27-RENDER` — `window.__v27` gains `render:render`.
  - `R-V37-V27-BANNER` — the Smart banner button also calls `window.__v27.render()` after clearing (`render()` early-returns when the overlay is hidden, so it is safe).
  - `__v15.clearScope` itself is NOT changed (shared; the fix stays local to each banner's handler).
- **Verified:**
  - Reproduced first on the pristine V18.1 base in real Chrome 157 (`tools/v37/repro-v37.js`): hub banner STILL visible after the click while `__v15.en15().scope` is `null`; same for the Smart banner. Screenshots `tools/v37/shots/repro-hub-banner-after.png` / `repro-smart-banner-after.png` show the stuck banner (the hub shot matches Anh's own screenshot).
  - Fixed build, same flow (`tools/v37/verify-v37c.js`, gates V37-A/C): banner GONE after the click, scope `null`, 0 console errors/warnings/dialogs.
  - Mid-mode clear (gate V37-B): Multiple Choice started inside the Education scope ("qualification" / "lecture" / "concentrate" across runs) — after Bỏ chọn the SAME question is still showing, the mode still accepts an answer, no crash back to the menu, banner gone, scope null.
  - Node vm suite `tools/v37/test37.js`: 91 PASS / 0 FAIL / 6 SKIP (of 97) — including the `renderHub`-called-once assertion, the `renderTab` fallback when `renderHub` is absent (banner stays, as before — the old behaviour), and executing the shipped Smart-banner onclick code verbatim from the rendered HTML.
  - Regression spot-check (gate V37-D): hub (10 modes), Library (Chrono + Skyroot + A1–A2), bosses tab, a live Vua Slime Từ Vựng fight render (HP 70/70, question "chin" /tʃɪn/), Pet Hub open — 0 console errors/warnings/dialogs.

## What V18.2 does NOT change
- No vocabulary data, no art, no Firebase, no login/sync, no save keys, no localStorage keys (verified: `en37` absent, only `hanvocab.*` keys).
- No change to `__v15.clearScope` (still just clears + saves), no change to pools, SRS, rewards, quests, bosses, pets, or the region gates.
- The fallback path in `clearScope()` (when `renderHub` is absent, e.g. an older build) keeps the old behaviour — the banner stays — by design; it only exists so the handler never throws.

## Files
- Layer: `src/v37.js` + `src/v37.css` (version marker only; the fixes are the 4 build replacements). Build: `build_v37.py` (gates on the V18.1 base hash, refuses if V37 is already present; backs up touched files into `tools/v37/backup-v18.1/`). Package: `package_v37.py`.
- Tests: `tools/v37/test37.js` (Node vm), `tools/v37/repro-v37.js` (Chrome repro on the pristine V18.1 base), `tools/v37/verify-v37c.js` (Chrome gates V37-A–D), logs + screenshots under `tools/v37/logs/` + `tools/v37/shots/`.
- Push manifest (NOT pushed — Anh decides): `tools/v37/PUSH_MANIFESTS.md`.

## Not fixed / still open (unchanged from V18.1)
- Farm harvest grants +35 XP instead of +25 (may be intentional — needs Anh's call).
- `bubble.png` / `shop.png` icons (F-04 remainder — need Anh's words).
- The weakness table for the 26 blocked bosses (design decision for Anh).
- `legDiff()` counts-getter, the `.v20modal` stacking trap, F-05/F-07 observers, F-12 resetEN scope.
- Live Firebase login/sync: never tested against a real Firebase project in any version — Anh must run the `FIREBASE_SETUP.md` checklist before anyone claims it works. Real-phone touch / Safari: needs Anh's real-phone test.
