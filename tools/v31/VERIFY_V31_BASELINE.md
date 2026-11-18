# V16.3 Backup & Restore — Stage A Runtime Verification (V31 baseline)

- **Build under test:** `/home/hatch/workspace/v7build/out/` — V16, `index.html` 1,993,653 B, sha256 `c59da3366e10e1a909dbc527c08832c9a39dd0cfaf8d810fbd840abff9303ebe` (identical to the AUTO audit's audited build)
- **Date / window:** 2026-11-18 ~14:42–14:46 +07 (run 1, full Chrome run) + follow-up attempts 14:47–15:05 (Chrome would no longer start — see § Host failure)
- **Method:** real Chrome 157 via CDP, 390×844 mobile emulation, HTTP on 127.0.0.1:8951, CDP 9351, scratch profile `/tmp/chrome-v31-prof`, policy `/tmp/webgl-policy.txt` (`hatch-webgl-all-origins-v1`). Seeded saves via `localStorage` + reload; in-memory `S` read via bare `S`; dialogs auto-accepted by the CDP harness (confirm/alert) so dialog latency is measured, not stalled by hand. No game file edited; nothing built; no branch created.
- **Drivers:** [verify-v31.js](sandbox://workspace/v7build/tools/v31/verify-v31.js) (run 1), [verify-v31b.js](sandbox://workspace/v7build/tools/v31/verify-v31b.js) (follow-up: R8/R11/R7-finer/R5-clarify — never ran: Chrome dead)
- **Raw evidence:** [logs/v31-stdout.log](sandbox://workspace/v7build/tools/v31/logs/v31-stdout.log) (run-1 console transcript, 9,789 B — the authoritative record; the JSON results file could not be written because host writes >~1 KB fail with EPERM during the wave, see § Host failure), [fixtures/](sandbox://workspace/v7build/tools/v31/fixtures/) (13 restore JSONs used), [shots/](sandbox://workspace/v7build/tools/v31/shots/) (r7-panel-before/after, r11-smart; r11-pethub.png is 0 bytes — capture failed when Chrome died)

## Verdicts

| Check | Verdict | Measured result (one line) |
|---|---|---|
| R1 F-02 race, EN-Hub (wrapped v15) path | **FAIL — reproduced 1/3** | Restored XP 9001 lost in trial 1 (after reload XP=1005, the pre-restore in-memory value); trials 2–3 survived (XP 9002/9003) |
| R1 F-02 race, V20 `importFile` path | **FAIL — reproduced 3/3** | All 3 trials: after reload XP=1005 (pre-restore), restored XP 9101/9102/9103 lost |
| R1 F-02 race, account-switch guest→guest | **FAIL — reproduced 3/3** | All 3 trials: after reload XP=1005, guest-home XP 9201/9202/9203 lost |
| R2 F-16 invalid restore (EN Hub) | **PASS** | `cards:[{id:'x'}]` → alert `bad-card@0`, save intact (XP 2000); no-`cards` → alert `missing-cards`, intact; valid save applies (XP 3333, gems 33); pre-import snapshot key `hanvocab.v12.preimport-…` created |
| R3 F-15 `__proto__` import | **PASS (not exploitable as audited)** | `validateSave` rejects the crafted save (`bad-key:__proto__`); import alerted and did not apply; `({}).polluted` stays `undefined` after import attempt + one `recordAnswer` + flush |
| R4 F-01 two-device merge loss | **FAIL — reproduced** | `mergeSaves(A,B)`: A's 5 SRS words **0/5 kept** (only B's w6–w10 survive); A's Smart session also dropped (merged `sessions`=1, B's only); XP MAX 800, gems MAX 5 |
| R5 F-13 `hasProgress` (en27-only local) | **FAIL — reproduced (decision branch)** | `hasProgress`=false for en27-only local; `syncNow` (mock adapter) did **not** raise conflict — it downloaded cloud (`action:'downloaded'`, `needsReload:true`, local XP 0→999, whole local bytes replaced) |
| R6 Export completeness | **PASS** | `backupExport` blob is **byte-identical** to `hanvocab.v1` (4,907 B): all top-level keys + all `S.v7` subkeys present, incl. pet, boss win, en27 session, BT quest star |
| R7 Last-backup display | **PASS (live-read, with granularity caveat)** | Panel reads `meta.lastSavedAt` + live save size at render; meta advanced after a flush (…143276→…145149) but displayed text stayed `14:45 18/11/2026` and `3.9 KB` — minute-resolution clock + 0.1 KB rounding, not a static value. Finer probe (distinct-hour meta) NOT TESTED — Chrome died |
| R8 Offline backup | **NOT TESTABLE** | `Emulation.setNetworkConditions` does not exist in Chrome 157 CDP (`-32601`); retry with `Network.emulateNetworkConditions` never ran — Chrome dead before the follow-up driver started |
| R9 Logout/login identity | **PASS (guest cycle) / NOT TESTABLE (Firebase login)** | Guest sign-out → guest re-activation: XP 6000, gems 66, pets 1, en18 wins 1, cards 20 — identical after reload. Real Firebase login not testable: `__v20sync.configured()` is `false` (placeholder `firebase-config.js`) |
| R10 Reload persistence | **PASS** | After R9 + reload: XP 6000, gems 66, pets 1, en18 wins 1, en27 sessions 0, en22 quests 0, cards 20, rawLen 4,267 — byte-identical to pre-reload |
| R11 Regression spot-check | **PARTIAL — smart PASS, rest NOT TESTED** | Smart overlay opens and renders (screenshot `r11-smart.png`). Pet Hub / v18 boss fight / Library never ran — Chrome died during the Pet Hub step (screenshot 0 bytes). **0-JS-errors is NOT established**: the consolidated console-error log was lost when the driver process died with Chrome |

## R1 — F-02 stale-`S` overwrite race (detail)

Protocol per trial: fresh seed (XP 1000, gems 10, 20 cards, `en15.langChoice=true`), then in-page `S.xp += 5; save()` — `__v20._test.isDirty()` confirmed `true` after every trigger — then the restore/switch within the 800 ms debounce window. Restore target XP: v15 path 9001/9002/9003, v20 path 9101/9102/9103, account path 9201/9202/9203 (guest home `hanvocab.v1.guest`).

| Path | T1 | T2 | T3 | Lost |
|---|---|---|---|---|
| EN-Hub `__v15.backupImport` (wrapped → `importFile`) | XP 1005, gems 16 — **lost** (restore at 315 ms after save) | XP 9002 — survived (185 ms) | XP 9003 — survived (203 ms) | **1/3** |
| V20 `__v20.importFile` (temp input) | XP 1005 — **lost** (386 ms) | XP 1005 — **lost** (202 ms) | XP 1005 — **lost** (190 ms) | **3/3** |
| Account switch `__v21._test.activateGuest()` | XP 1005 — **lost** (11 ms) | XP 1005 — **lost** (72 ms) | XP 1005 — **lost** (63 ms) | **3/3** |

Every lost trial ends with exactly the pre-restore in-memory state (XP 1005 = 1000+5, gems 16 — the seeded 10 plus level-up/achievement gems that fired on the artificial seed, same benign drift the AUTO audit noted as N5). The surviving v15 trials are consistent with the mechanism, not luck: when the FileReader+confirm path is slow enough that the 800 ms debounce timer fires **before** `location.reload()`, the pending flush writes the old `S` first and the restore's `setItem` lands afterwards; when the reload happens **before** the timer fires, the `beforeunload` flush writes the old in-memory `S` over the just-restored bytes. The v20 path calls `importFile` immediately after the file is set, so its reload always wins the race against the timer (3/3 lost). The account-switch path writes the slot from `localStorage` (not from in-memory `S`) and reloads within ~10–70 ms, so the `beforeunload` flush always overwrites the switched bytes (3/3 lost). **F-02 is a real, timing-dependent data-loss race, worst on the two paths players use most directly (V20 import and account switch).**

## R2 — F-16 invalid restore (detail)

Seed XP 2000, gems 20. Via the real EN-Hub Backup tab (`openHub('backup')` → `#v15-restore` file input, `DOM.setFileInputFiles`):

- `cards:[{id:'x'}]` (no `h`/`m`): dialog `alert: File sao lưu không hợp lệ: bad-card@0. Dữ liệu hiện tại không thay đổi.`; `__v20._test.lastImportError()` = `['bad-card@0']`; XP/cards unchanged (2000/20). **Rejected, save intact, clear message.**
- JSON with no `cards`: dialog `alert: … missing-cards. Dữ liệu hiện tại không thay đổi.`; `lastImportError()` = `['missing-cards']`; XP unchanged. **Rejected, save intact.**
- Valid full save (XP 3333, gems 33): confirm dialog shown, then applied — after reload XP 3333, gems 33. A pre-import snapshot key exists afterwards (`hanvocab.v12.preimport-1795013124769`).

**Correction to the audit's F-16 as written:** the raw `backupImport` in `v15.js:1611` indeed validates only `cards` and takes no snapshot — but at runtime `v20.js` `init20()` wraps `__v15.backupImport` with `importFile` (validated + snapshot + confirm), so the live EN-Hub path is already the safe one. F-16 does **not** reproduce through the UI on this build. The fix agent should keep that wrap in place (and keep the raw function from ever being called unwrapped) rather than re-fixing the V15 function in isolation.

## R3 — F-15 `__proto__` import (detail)

Crafted save: valid seeded save (XP 1501) with `en27.en.last` replaced at the JSON-string level by `{"__proto__":{"polluted":"V31MARKER"}}` (fixture `r3-proto.json`, marker confirmed present in the file).

- Direct call: `__v20sync.validateSave(crafted)` → `{ok:false, errors:['bad-key:__proto__']}`.
- Via the V20 import path: dialog `alert: File sao lưu không hợp lệ: bad-key:__proto__. Dữ liệu hiện tại không thay đổi.`; the save was **not** applied (XP stayed 1500, raw bytes contain no `V31MARKER`).
- After one `__v27.recordAnswer('en','testword-v31',true,'smart')` + `__v20._test.flush()`: `({}).polluted` and `Object.prototype.polluted` both `undefined`.

**Correction to the audit's F-15 as written:** the scan does catch this key. `scan(obj,0)` walks `v7(1) → en27(2) → en(3) → last(4)` and checks `last`'s keys at depth 4, so `__proto__` is seen and rejected — the audit's "depth 5" counting is off by one (the key is inspected at its parent's depth). No pollution path was demonstrated through import. Not tested: `recordAnswer('en','__proto__',…)` directly (follow-up driver never ran) — no claim is made about it.

## R4 — F-01 two-device merge loss (detail)

`__v20sync.mergeSaves(A, B, localTime=1000, cloudTime=2000)` — A: XP 500, `en.box/right` for w1–w5, 1 Smart session; B: XP 800, `en.box/right` for w6–w10, pet `petB` (team `['petB',null,null]`), BT quest `2` (2★), 1 Smart session (`en.last={w6}`, `en.cr={w6:2}`). Merged result, `validateSave` = `{ok:true}`:

- `en.box` / `en.right`: **only w6–w10** — A's w1–w5 (5 words, box 2, right 3–7 each) are **entirely dropped** (`aWordsKept=0`, `bWordsKept=5`). `S.v7.en` has no merge branch; the newer side (B) wins the whole subkey.
- `en27.sessions`: **1** — B's session only; A's session dropped (same whole-subkey last-write-wins).
- `en23.pets`: `['petB']`, team `['petB',null,null]` — B's pet survives only because B is newer; A's side had no pet, so no pet loss was measurable in this fixture (a pet on A would be dropped by the same mechanism).
- `en22.quest`: `['2']` — B's quest only (A had none).
- XP 800 (MAX), gems 5 (MAX) — currencies behave as documented.

**Quantified loss: the older device loses 100% of its per-word EN SRS progress (5/5 words) and 100% of its Smart sessions (1/1) in the merge.** The merged save still validates, so the loss is silent — exactly the audit's F-01.

## R5 — F-13 `hasProgress` (detail)

Local save: only progress is `en27` (1 session, `en.last={w1}`, `en.cr={w1:2}`, streak n=2), XP 0, gems 0, 20 seed cards, no boss wins. Cloud save (mock adapter): XP 999, gems 9. Mock adapter + `setConfig({apiKey:'v31-test',projectId:'v31-test'})` + `setUser({uid:'v31-uid'})`, sync meta cleared.

- `hasProgress(local)` = **false**; `hasProgress(cloud)` = **true** (reproduces the F-13 gap: `en27`/`en23`/`en22` are not checked).
- `syncNow({})` → `{ok:true, action:'downloaded', needsReload:true}`, adapter `load:1, save:0`, cloud status `synced`. **No conflict was raised.** Local XP went 0 → 999 — the local bytes were fully replaced by the cloud copy (`applyCloudData` is a whole-save replace).
- Caveat, stated plainly: in this fixture the cloud copy was cloned from the local save (plus XP/gems), so the local `en27` sessions happened to survive inside the downloaded bytes (`en27sessionsAfter=1`). That survival is a **fixture artifact, not a safety property** — a real second device's cloud copy would not contain this device's Smart sessions, and they would be destroyed by the same whole-save replace that demonstrably overwrote XP 0→999. The independent-cloud clarification run (cloud with no `en27` at all) was prepared in `verify-v31b.js` but never ran (Chrome dead).

## R6 — Export completeness (detail)

Seeded distinctive save (XP 1234, gems 55→61 after load-time achievement drift, pet `pet1` phoenix Lv 5, en18 boss win `v18_slime`, en27 session, BT quest `1` 3★, `en.box={w1:3,w2:2}`). `__v15.backupExport()` was intercepted at the `Blob` constructor (the download payload captured in-page):

- Blob length 4,907 B = `localStorage` raw length 4,907 B; `identicalToLocalStorage: true`. **The export is a byte-for-byte copy of `hanvocab.v1`, not a filtered subset.**
- Top-level keys present: `cards, opt, rem, decks, deck, dq, v7, xp, sk` — nothing missing (there is no other top-level key in the save to miss).
- `S.v7` keys present (20): `gems, ach, plots, boss8, dq, wq, totalOk, harvests, lastLogin, chest, musicOn, vol, night, gemOwn, soundOn, decor, meta, en, en18, en23, en27, en22, en15, profile`. All seeded markers present in the export: pet `pet1`, en18 win 1, en27 sessions 1, en22 quest `['1']`, `en.box` `[w1,w2]`.
- After reload the save matches the pre-export state (XP 1234, pets 1, en18 wins 1, en27 sessions 1). No key is exported that the game does not store, and no stored key is omitted.

## R7 — Last-backup display (detail)

Data Management panel (`#v20panel`, rendered into the Backup tab) + header pill `#v20savepill`:

- Before change: pill `● Đã lưu 14:45 18/11/2026 · Đám mây: chưa cấu hình`; `#v20lastsaved` = `14:45 18/11/2026`; `Kích thước bản lưu: 3.9 KB · Khóa: hanvocab.v1`; `meta.lastSavedAt` = 1795013143276. Screenshots `r7-panel-before.png` / `r7-panel-after.png`.
- After `S.xp=4567; save();` + flush (waited >800 ms, then explicit `flush()`): XP after change 4567, rawLen 3,944; `meta.lastSavedAt` = 1795013145149 (**advanced by ~1.9 s — the flush really wrote**). Displayed text unchanged: still `14:45 …` and `3.9 KB`.
- Reading: the displayed values are **live-read from `meta()` and `localStorage` at panel render** (`dataPanelHTML` reads `meta().lastSavedAt` and `saveSizeKB()` fresh), not hard-coded cosmetics — but the clock renders at minute resolution (`vi-VN` hour+minute) and the size at 0.1 KB, so a change inside the same minute / same 0.1 KB band is invisible. That is a granularity limit, not a static display. The finer probe (set `meta.lastSavedAt` to 3 h ago, grow the save by 30 cards, re-read) was prepared but NOT TESTED (Chrome dead).

## R8 — Offline backup

**NOT TESTABLE in this run.** First attempt used `Emulation.setNetworkConditions`, which Chrome 157's CDP does not implement (`{"code":-32601,"message":"'Emulation.setNetworkConditions' wasn't found"}`). The correct call is `Network.emulateNetworkConditions`; the retry was written into `verify-v31b.js` but never executed — Chrome stopped launching at ~14:46 (see § Host failure). No claim is made about offline behaviour, queueing, or retry. Note for the rerun: the engine code path is `navigator.onLine===false` → `{ok:false, reason:'offline'}`, `engine.pending=true` — that is code reading only, not a measurement.

## R9 — Logout/login identity (detail)

Seed XP 6000, gems 60→66 (load-time drift, as in N5), pet `pet9`, en18 win `v18_slime` (wins 2), 20 cards. `__v21.signOut()` → guest re-activation → reload:

- After: XP 6000, gems 66, pets 1, en18 wins 1, cards 20 — **identical**. Session after: `{mode:'guest', at:…}`.
- Firebase login/logout is **NOT TESTABLE**: `__v20sync.configured()` is `false`; the shipped `firebase-config.js` is the placeholder (empty apiKey/projectId). No live project, no sign-in was attempted, and none is claimed.

## R10 — Reload persistence

Measured after R9 (state: XP 6000, gems 66, pets 1, en18 wins 1, en27 sessions 0, en22 quests 0, cards 20, rawLen 4,267) and after R6 (XP 1234 save, rawLen 4,907) and after the R2 valid restore (XP 3333): in every case the post-reload save matched the pre-reload state exactly on all compared fields, including `rawLen`. **PASS.**

## R11 — Regression spot-check

- **Smart overlay: PASS.** `__v27.openSmart('en')` opens `#v27hub` (display flex); screenshot `r11-smart.png` shows the rendered dashboard (0/4409 từ đã học, 0 cần ôn hôm nay, 0 từ yếu, 0 ngày chuỗi, "chưa có dữ liệu" honesty strings, "Bắt đầu kế hoạch hôm nay" button).
- **Pet Hub / v18 boss fight / Library: NOT TESTED.** The run died during the Pet Hub step: `Page.captureScreenshot` returned empty data (`r11-pethub.png` is 0 bytes), the driver process then exited, and Chrome never launched again. No boss-fight answer and no Library open were measured by this agent on this build.
- **Console errors: NOT ESTABLISHED.** No page-eval error surfaced in any completed step's output, but the consolidated console-error tally was held in the dead driver process and never written to disk. Do not cite "0 JS errors" from this run.

## Host failure — why R8 / R11 / R7-finer / R5-clarify are incomplete

At ~14:46, during the R11 Pet Hub step, the running Chrome died; every launch attempt since (~8 attempts, 14:47–15:05, including fresh profiles in `/tmp` and under `~/workspace`, `--single-process`, `--no-zygote`, `--disable-seccomp-filter-sandbox`, and the AUTO audit's own profile/ports) fails instantly with `Trace/breakpoint trap` before creating a profile dir or listening on the DevTools port. `--version` still works; a launch without the Hatch WebGL policy flags fails cleanly with "Hatch WebGL domain policy is required for browser startup". In parallel, host writes larger than ~1 KB intermittently fail with `EPERM: operation not permitted` (node/python `writeFileSync` of a 9.8 KB file fails; a 14-byte shell write succeeds; `cp` of the same log fails) and loopback TCP to a wedged `python3 -m http.server` returned empty replies until it was replaced by a Node static server on the same port (which then served 200). Host memory sits at ~125–175 MB free / ~480–505 MB available throughout. This matches the AUTO audit's §10 note of intermittent host EPERM write waves that "cleared after a service restart". No host service was restarted by this agent; the failure is environmental, not a game bug, and the follow-up driver `verify-v31b.js` is staged and ready to run once Chrome launches again (same ports 8951/9351; the Node static server on 8951 is still running).

Note: an unrelated file `PLAN_V31.md` (75,261 B, 14:47) appeared in `tools/v31/` during this window; it was not written by this agent and was not read or modified.

## Files

- Report: `tools/v31/VERIFY_V31_BASELINE.md` (this file)
- Drivers: [tools/v31/verify-v31.js](sandbox://workspace/v7build/tools/v31/verify-v31.js), [tools/v31/verify-v31b.js](sandbox://workspace/v7build/tools/v31/verify-v31b.js)
- Run-1 transcript: [tools/v31/logs/v31-stdout.log](sandbox://workspace/v7build/tools/v31/logs/v31-stdout.log)
- Fixtures: [tools/v31/fixtures/](sandbox://workspace/v7build/tools/v31/fixtures/) (`r1-*-t*.json`, `r2-*.json`, `r3-proto.json`)
- Screenshots: [tools/v31/shots/r11-smart.png](sandbox://workspace/v7build/tools/v31/shots/r11-smart.png), [tools/v31/shots/r7-panel-before.png](sandbox://workspace/v7build/tools/v31/shots/r7-panel-before.png), [tools/v31/shots/r7-panel-after.png](sandbox://workspace/v7build/tools/v31/shots/r7-panel-after.png)
- Known gaps in evidence files: `logs/v31-results.json` is 0 bytes (host EPERM wave blocked the write; the same data is in `v31-stdout.log`); `logs/v31b-*.json` were never produced; `shots/r11-pethub.png` is 0 bytes (capture failed as Chrome died).
