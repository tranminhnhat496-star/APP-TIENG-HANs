# PUSH_MANIFESTS — V19.8 KO SRS Review UI (19.8.0, layer V55)

**Base:** main @ `7ad41466` (PR #38, V19.6.1, đã merge 2026-11-25 14:46:00Z) — **nhưng push V19.8 CHỜ PR #39 (V19.7) merge trước**, vì V19.8 xây trên V19.7. Base thực tế lúc push = main sau khi PR #39 merge.
**Suggested branch:** `muse/ko-srs-v198`
**ZIP:** `Korean_English_Vocab_Farm_V19_8_KO_SRS.zip` — sha256 `e9d9d1a1df68e1e5358c2c0cd987cc0c47d34a40cde722c1cb4d33e96aa1ec13`, 79,515,839 B (75.83 MB), 908 files.
**Built `out/index.html`:** sha256 `e5e716e4a1d4352a989732915c2178902ddd115b411342690eb1334f57799445`, 2,653,286 B.
**ZIP↔out byte-identity:** **verified** — the ZIP's `index.html` is byte-identical to `out/index.html`, checked by `package_v55.py` and re-verified independently after publishing.
**Build:** layer V55 applied onto the pristine V19.7 base (`build_v55.py` gates on the V19.7 hash `aa6333d0…`); rebuild-from-scratch is byte-identical. `v55` style/script inject LAST, after `v54js`; pure additive — `index.html` is the only file changed vs V19.7.

## Files to push (13 paths — flat repo-root layout, same as all V18.x/V19.x pushes)

### CHANGED (1)
- `index.html` — V19.8 title + `v55` style/script injected last (after `v54js`)

### ADDED (12)
- `v55.js` — `window.__v55={version:'19.8.0'}` — isDue55 (shared EN+KO due rule), dueQueue55, weakList55, koStats55, startReview55, startWeak55, setCap, flagOn/setFlag (koSrsUI), openSrs/closeSrs, entry-button decorator, V15 global re-exposure (drive-by fix for the v27 speakKO error path)
- `v55.css` — `.v55hub/.v55stats/.v55badge(.due/.weak)/.v55kotab` (dark pet palette, 44px targets; due badge #1E3A5F 11.50:1, weak badge #7F1D1D 10.02:1)
- `build_v55.py` — build script (base gate on V19.7 hash `aa6333d0…`)
- `package_v55.py` — packager (.part-safe)
- `README_V19_8_KO_SRS.md`
- `CHANGELOG_V19_7_to_V19_8.md`
- `SMOKE_TEST_V19_8_2026-11-26.md`
- `tools/v55/test55.js` — Node vm suite: **157 PASS / 0 FAIL / 6 SKIP, ×4 runs** on the build + **×1 on the packaged ZIP** (incl. §R0 repro-first on pristine V19.7)
- `tools/v55/verify-v55c.js` — real-Chrome gates: **50/50 PASS, ×2 clean runs** on the final build, 0 console errors/warnings/dialogs (incl. live 7-card KO SRS session + 2-card weak session by real DOM clicks, cap 30/40/50, flag-off, 360px, Hangul)
- `tools/v55/repro-v55.js` — vm repro: **5/5 defects on pristine V19.7 → 0/5 on the built V19.8**
- `tools/v55/PUSH_MANIFESTS.md` — this file

### NOT pushed (deliberate)
- `tools/v55/backup-v19.7/` (pristine V19.7 base) + `tools/v55/backup-v19.7-build/` (build inputs), `tools/v55/logs/`, `tools/v55/shots/` — work files only.
- `firebase-config.js` — NEVER pushed (repo holds Anh's real config; ZIPs ship the placeholder).

## ZIP record (fill after packaging)

- ZIP sha256: `e9d9d1a1df68e1e5358c2c0cd987cc0c47d34a40cde722c1cb4d33e96aa1ec13`
- ZIP size: `79,515,839` B (75.83 MB, 908 files)
