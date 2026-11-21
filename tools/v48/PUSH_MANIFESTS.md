# PUSH MANIFESTS — V19.3 Sentence Forge (layer V48, 19.3.0)

**Manifest base: main @ `f4518288dd` (PR #29 merged — V19.0.1 on main; V19.2 push pending).**
**Suggested branch: `muse/sentence-forge-v193`.**
**Do NOT merge automatically — Anh merges PRs himself. No force-push, no direct main edits, no history rewrite.**

File lists below are the exact ADDED / CHANGED / REMOVED sets from the
out-vs-V19.2-ZIP diff (`out/` rebuilt V19.3 vs the extracted
`Korean_English_Vocab_Farm_V19_2_Duplicate_Senses.zip`, 818 files,
sha256 `fcdf0efa…`), verified against the ZIP contents after packaging
(`Korean_English_Vocab_Farm_V19_3_Sentence_Forge.zip`).

## ADDED (11 files)

- `v48.js` — new layer (`window.__v48={version:'19.3.0'}`: Forge, Bounty, Tree, Dojo, golem unlock/overlay, flags, `setFlag`).
- `v48_data.js` — new layer data (`window.__V48_DATA`: golem definition `v18_golem` Lv 77 HP 620, Bounty definitions 4 daily + 4 weekly, `weakExplicit` golem → listen).
- `v48.css` — new layer styles (overlay `#v48hub`, `--ui-*` tokens, 44px targets, WCAG AA).
- `build_v48.py` — build script (gates on the V19.2 base hash `0aff5ceb…`, refuses if the layer is present, `rfind()` for the `</body>` injection, wholesale-syncs the four edited embedded blocks, asserts marker order).
- `package_v48.py` — packager for this ZIP.
- `README_V19_3_SENTENCE_FORGE.md`
- `CHANGELOG_V19_2_to_V19_3.md`
- `SMOKE_TEST_V19_3_2026-11-21.md` — see "NOT in this push" below (ZIP hash/size filled in after packaging; excluded per the V46/V47 precedent).
- `tools/v48/test48.js` — Node vm suite (135 PASS / 0 FAIL / 7 SKIP, ×3 runs on the build + ×1 on the packaged ZIP).
- `tools/v48/verify-v48c.js` — real-Chrome 157 gates (30 verdicts, ×2 clean runs).
- `tools/v48/PUSH_MANIFESTS.md` — this file.
- `assets/bosses/v18/v18_golem.png` — Hangul Golem art (1024×1024 RGBA, sha256 `a589a5d0…`), generated and verified AFTER the build; added to `out/` + the top-level `assets/` mirror and included in the re-packaged ZIP. BINARY: excluded from the MCP snapshot-push (text-only) — Anh pushes it via GitHub Desktop like the other art.

## CHANGED (6 files)

- `SMOKE_TEST_V19_2_2026-11-21.md` — NOT a V48 change: pre-existing drift — its V19.2 ZIP hash/size line was filled into the workspace-root copy after `package_v47.py` ran (the copy inside the V19.2 ZIP records the previous packaging's hash `708cfd0a…`, 78,048,804 B; the final V19.2 ZIP is `fcdf0efa…`, 78,048,957 B). The new ZIP carries the filled version. Excluded from this push (see below).

- `index.html` — the four edited embedded blocks re-synced wholesale (`v19js`, `v20js`, `v21js`, `v34js`), `v48css` / `v48data` / `v48js` injected last before `</body>` (`v48data` before `v48js`); title now "V19.3 — Sentence Forge". sha256 `dc971a6c1f386b6bc27a3423d9352ff606697d057d156e7e0141777f82dc36bd`, 2,513,911 B.
- `v19.js` — UCE lookup chain gains `__V48_DATA.byId` at 2 sites (`bossUnlocked19`, `fight()`); `zone==='golem'` delegates unlock to `__v48.bossUnlocked`.
- `v20_sync.js` — `hasProgress` entries for `en48` + `en48` merge branch (V33/V35 pattern: counters MAX, claimed unions, streak newer-wins, flags newer-wins, created MIN; XP/gems never summed).
- `v21.js` — `TOTAL_BOSSES` 86 → 87.
- `v34.js` — weakness system: `weakExplicit` consult + `golem`-zone safety net `{kind:'listen'}`, `listen` kind in `scopeBlocked` / `breakDmg` / `weakName` ("Câu hỏi nghe").

## REMOVED (none)

- No files removed.

## NOT in this push (stays out of the ZIP)

- `tools/v48/backup-v19.2/` (pristine V19.2 build input), `tools/v48/backup-v19.2-build/` (pre-fix build inputs + edited-src copies), `tools/v48/logs/`, `tools/v48/shots/`, `tools/v48/make_test48.py`, `tools/v48/make_verify48c.py`, `tools/v48/sections48.txt` (test generators, not deliverables).
- `SMOKE_TEST_V19_3_2026-11-21.md` — EXCLUDED from this push: its ZIP hash/size/counts are filled into the workspace-root copy AFTER `package_v48.py` runs, so the workspace copy differs from the copy inside the ZIP. Same precedent as the V46 doc-drift files excluded from the V47 push (`SMOKE_TEST_V19_0_1_2026-11-21.md`, `tools/v46/PUSH_MANIFESTS.md`). The ZIP still carries the pre-fill version, which is correct for the archive.
- `SMOKE_TEST_V19_2_2026-11-21.md` — EXCLUDED from this push: NOT a V48 change, pre-existing drift — its V19.2 ZIP hash/size line was filled into the workspace-root copy after `package_v47.py` ran (the copy inside the V19.2 ZIP records the previous packaging's hash `708cfd0a…`, 78,048,804 B; the final V19.2 ZIP is `fcdf0efa…`, 78,048,957 B). The new ZIP carries the filled version.
- Superseded draft PR #28 is still open and needs Anh to close it (PR #29 replaced it) — unrelated to this push.

## Verification summary (see `SMOKE_TEST_V19_3_2026-11-21.md` for the full record)

- `test48.js`: 135 PASS / 0 FAIL / 7 SKIP ×3 runs on the build + ×1 on the packaged ZIP.
- `verify-v48c.js` (real Chrome 157): 30/30 PASS ×2 runs (run 1: 29/30 — one test-harness bug in G3c, fixed), 0 console errors/warnings/dialogs.
- Rebuild-from-scratch reproduces `out/index.html` byte-identically (sha256 `dc971a6c…`).
- Boss level actually used: **Lv 77** (Lv 58 is taken by `v11_butterflyqueen`; no free level exists in 32–76).
- Honest gaps: Web Speech recognition not verified end-to-end (no microphone in headless Chrome — the gate proves the attempt + honest self-assessment fallback only). Hangul Golem art was added after the build (see ADDED above) and the image load was verified in real Chrome after re-packaging.
