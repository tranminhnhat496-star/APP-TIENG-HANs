# PUSH_MANIFESTS — V19.6.1 KO Forge (19.6.1, layer V53)

**Base:** main @ `9ac0a94e` **AFTER PR #37 (V19.6) merges** — the push itself waits for that merge. Do NOT branch from the pre-merge main.
**Suggested branch:** `muse/ko-forge-v1961`
**ZIP:** `Korean_English_Vocab_Farm_V19_6_1_KO_Forge.zip` — sha256 `49304a5fb5c55acf43d048d0e89b07f6ef16d29022b37fb2c8974ed21e123b7f`, 79,339,963 B (75.66 MB), 885 files.
**Built `out/index.html`:** sha256 `aa865a5dde58f6844800d6c1ff798b8fca1a0c2531e671ee6a6771ea42063484`, 2,569,819 B.
**ZIP↔out byte-identity:** **verified** — the ZIP's `index.html` is byte-identical to `out/index.html`, checked by `package_v53.py` and re-verified independently after publishing.
**Build:** layer V53 applied onto the V19.6 rebased base (`build_v53.py` gates on the V19.6 hash `48555ddf…`); rebuild-from-scratch is byte-identical. `v53` style/script inject LAST, after `v52js`.

## Files to push (13 paths — flat repo-root layout, same as all V18.x/V19.x pushes)

### CHANGED (2)
- `index.html` — V19.6.1 title + v48 embedded block re-synced + `v53` style/script injected last (after `v52js`)
- `v48.js` — V53 Forge KO hooks (5 sites): expanded-pool call with learned-only fallback, KO session draw + `FS.notice`, intro pool/notice lines, “chưa học” badge + Q1 notice line, end-screen unlearned count. V50 score + V52 TTS untouched.

### ADDED (11)
- `v53.js` — `window.__v53={version:'19.6.1'}` — koQuality (6 rules), koPool53 (learned → group/deck → other, dedup, supplement notice), bandKO, koOrderSession (priority-first + token ladder)
- `v53.css` — `.v53new` badge (white on #6b3a00, 9.42:1 live), `.v48card p.v53note` gold notice (#FFD76A, 10.97:1 live)
- `build_v53.py` — build script (base gate on V19.6 hash `48555ddf…`)
- `package_v53.py` — packager (.part-safe)
- `README_V19_6_1_KO_FORGE.md`
- `CHANGELOG_V19_6_to_V19_6_1.md`
- `SMOKE_TEST_V19_6_1_2026-11-25.md`
- `tools/v53/test53.js` — Node vm suite: **115 PASS / 0 FAIL / 5 SKIP, ×3 runs** on the build + **×1 on the packaged ZIP** (incl. §R0 repro-first on pristine V19.6)
- `tools/v53/verify-v53c.js` — real-Chrome gates: **47/47 PASS, ×2 clean runs** on the final build, 0 console errors/warnings/dialogs (incl. live KO session by real DOM clicks, badge/notice contrast, 360px)
- `tools/v53/repro-v53.js` — vm repro on pristine V19.6: **5/5 defects reproduced**
- `tools/v53/PUSH_MANIFESTS.md` — this file

### NOT pushed (deliberate)
- `tools/v53/backup-v19.6/` (pristine V19.6 base) + `tools/v53/backup-v19.6-build/` (build inputs), `tools/v53/logs/`, `tools/v53/shots/`, `tools/v53/edit_verify.py`, `tools/v53/new_main.js` — work files only.
- `SMOKE_TEST_V19_6_2026-11-25.md` + `tools/v51/PUSH_MANIFESTS.md` — unchanged vs the V19.6 deliverable (no drift in this version), so they are not part of this change set at all.
