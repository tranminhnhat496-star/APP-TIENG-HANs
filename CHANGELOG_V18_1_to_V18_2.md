# Changelog — V18.1 → V18.2 (Scope Banner Fix)

**V18.2.0 — layer V37 (loads LAST). Base: V18.1 (Bug Fixes). Date: 2026-11-19.**

Bug-fix release only: no new features, no new content, no new art, no reward/stat/pool/SRS/region-gate changes, no save-schema change, no new localStorage key. The fix was reproduced first on the pristine V18.1 base in real Chrome 157, then verified by `tools/v37/test37.js` (Node vm) + `tools/v37/verify-v37c.js` (Chrome gates V37-A–D).

## The 4 build replacements (`build_v37.py`)

### V15 — expose renderHub (1)
- `R-V37-V15-RENDERHUB`: `window.__v15` gains `renderHub:renderHub` (`v15.js`, next to `renderTab:renderTab`). Pure additive export — the scope banner lives in the hub shell built by `renderHub()`, not in `#v15body`, and no existing export could refresh it.

### V17 — clearScope re-renders the whole hub (1)
- `R-V37-V17-CLEARSCOPE`: `clearScope()` (`v17.js:460`) now calls `v.renderHub()` when present, else falls back to `renderTab()`. The banner ("Đang học: A1–A2 · Education … ✕ Bỏ chọn") disappeared only when switching tabs before, because only `setTab` → `renderHub()` rebuilt the hub shell; `clearScope()` only re-rendered `#v15body`. `renderHub()` ends in `renderTab()` → `renderMode()` when a mode is active, so an active mode re-renders from its own state (verified live: same MC question after clearing). The mode timer is a JS interval, untouched by re-render.

### V27 — expose render + Smart banner re-renders (2)
- `R-V37-V27-RENDER`: `window.__v27` gains `render:render` (`v27.js` export object).
- `R-V37-V27-BANNER`: the Smart overlay scope banner button (`scopeBanner27()`, `v27.js:845`) now also calls `window.__v27.render()` after `__v15.clearScope()`. `render()` early-returns when the overlay is hidden, so the call is safe. Before, the button cleared the scope with no re-render at all, so the Smart banner also looked dead.

### Not changed
- `__v15.clearScope` itself (`v15.js:357`) is untouched — it still only clears `en15().scope` and saves. The fix stays local to each banner's handler.
- No other file is touched. No data, art, Firebase, or schema change.

## Verification
- `tools/v37/repro-v37.js` on the pristine V18.1 base (hash `eabcccc2…`): R1 hub banner STILL visible after "Bỏ chọn" while scope is `null`; R2 Smart banner STILL visible while scope is `null`. 0 console errors.
- `tools/v37/test37.js`: 91 PASS / 0 FAIL / 6 SKIP (of 97) — §0 static (51), §L page load (9), §37A hub banner (11), §37B Smart banner (7), §R V18.1 regression (10), §V save schema (3), §C Chrome-only (6 SKIP).
- `tools/v37/verify-v37c.js` (real Chrome 157): V37-A banner GONE + scope null; V37-B same MC question after mid-mode clear, mode still answers; V37-C Smart banner GONE + scope null; V37-D regression (hub, Library, bosses tab, live Slime King fight, Pet Hub) with 0 console errors / 0 warnings / 0 dialogs.
- Built `out/index.html`: sha256 `fe0ba353568039b8b4b1ac4df132789e5dd876cce33d756993c12600d7bcb065`, 2,361,084 B (V18.1: `eabcccc2…`, 2,358,811 B). Title: "V18.2 — Scope Banner Fix". Marker order: v37 last (styles + scripts); `TOTAL_BOSSES` still 86; no new save key.
