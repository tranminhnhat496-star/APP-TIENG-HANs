# PUSH_MANIFESTS — V19.7 Bulk Korean Import (19.7.0, layer V54)

**Base:** main @ `7ad41466` (PR #38, V19.6.1, đã merge 2026-11-25 14:46:00Z).
**Suggested branch:** `muse/bulk-ko-import-v197`
**ZIP:** `Korean_English_Vocab_Farm_V19_7_Bulk_KO_Import.zip` — sha256 `70644d489cfe4339dd3ea3ea863699a8642e5ab56a60414afef633680e7641f7`, 79,433,060 B (75.75 MB), 897 files.
**Built `out/index.html`:** sha256 `aa6333d0135cc110635851ad00f274a219cb183f26a98fbe8a36796f3d057322`, 2,627,515 B.
**ZIP↔out byte-identity:** **verified** — the ZIP's `index.html` is byte-identical to `out/index.html`, checked by `package_v54.py` and re-verified independently after publishing.
**Build:** layer V54 applied onto the pristine V19.6.1 base (`build_v54.py` gates on the V19.6.1 hash `aa865a5d…`); rebuild-from-scratch is byte-identical. `v54` style/script inject LAST, after `v53js`; pure additive — `index.html` is the only file changed vs V19.6.1.

## Files to push (13 paths — flat repo-root layout, same as all V18.x/V19.x pushes)

### CHANGED (1)
- `index.html` — V19.7 title + `v54seedjs` + `v54` style/script injected last (after `v53js`)

### ADDED (12)
- `v54.js` — `window.__v54={version:'19.7.0'}` — parseRows54, dryRun54, confirmImport54, snapshotBeforeImport54, undoImport54, restoreBackup54, seedPreview54/importSeed54, flagOn/setFlag (koImport), entry-button decorator
- `v54.css` — `.v54hub/.v54in/.v54btn/.v54tag` (dark pet palette, 44px targets; tag white on #1e3a5f, 11.50:1)
- `v54_seed.js` — `window.__V54_SEED`: 50 KRDict 초급 rows (VI gloss + real example each), license CC BY-SA 2.0 KR
- `build_v54.py` — build script (base gate on V19.6.1 hash `aa865a5d…`)
- `package_v54.py` — packager (.part-safe)
- `README_V19_7_BULK_KO_IMPORT.md`
- `CHANGELOG_V19_6_1_to_V19_7.md`
- `SMOKE_TEST_V19_7_2026-11-25.md`
- `tools/v54/test54.js` — Node vm suite: **131 PASS / 0 FAIL / 5 SKIP, ×4 runs** on the build + **×1 on the packaged ZIP** (incl. §R0 repro-first on pristine V19.6.1)
- `tools/v54/verify-v54c.js` — real-Chrome gates: **54/54 PASS, ×2 clean runs** on the final build, 0 console errors/warnings/dialogs (incl. live import + seed import by real DOM clicks, dedup senses, flag-off, 360px)
- `tools/v54/repro-v54.js` — vm repro on pristine V19.6.1: **6/6 defects reproduced**
- `tools/v54/PUSH_MANIFESTS.md` — this file

### NOT pushed (deliberate)
- `tools/v54/backup-v19.6.1/` (pristine V19.6.1 base) + `tools/v54/backup-v19.6.1-build/` (build inputs), `tools/v54/logs/`, `tools/v54/shots/` — work files only.
- `tools/v54/krdict-5000.xml`, `tools/v54/krdict-25000.xml`, `tools/v54/krdict-50000.xml` (~100 MB KRDict source downloads, provenance only — NOT shipped; the seed data is in `v54_seed.js` + `tools/v54/ko_seed54.json`).
- `tools/v54/ko_seed54.json` + `tools/v54/extract_seed54.py` — seed provenance, kept in the workspace (not in the ZIP's allowlist).

## ZIP record (fill after packaging)

- ZIP sha256: `70644d489cfe4339dd3ea3ea863699a8642e5ab56a60414afef633680e7641f7`
- ZIP size: `79,433,060` B (75.75 MB, 897 files)
