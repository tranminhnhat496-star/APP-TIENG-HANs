# Changelog — V19.4 → V19.5 (Round-5 Bug Fixes, 19.5.0, layer V50)

**Base:** V19.4 (19.4.0, layer V49; `out/index.html` sha256 `0b9139ef154096254edd4748cb8a76abc050cb6d1c00c9e0afb17705906a2d65`, 2,522,575 B).
**Built:** `out/index.html` sha256 `6241e4a0758cd0cd4fd801dd251298a62b35930feb82376536e5b4c0dee0739e`, 2,528,803 B (rebuilt from scratch byte-identically).
**Date:** 2026-11-23. **Source:** round-5 review reports `tools/v50/review-A-v49.md`, `review-B-known.md`, `review-C-scan.md` (read, not modified).

## Fixed (4)

### F-1 (High) — stale speech result answers a later question after a fight() restart
- **Root cause:** `fight()`/`startFight()` never called `stopSpeak()` and reset `speakToken` to 0 in the new `F`. The orphaned recognition kept the mic open; the next "Nói" tap set token 1 — the exact token the orphan captured — so its late transcript passed the guard and was scored against the new question. Reproduced live in Chrome in both engines and via the hub-navigation path (review-A §F-1, probe 2 F5.1–F5.5, probe 3 G4.1–G4.3).
- **Fix (`src/v18.js`, `src/v19.js`):** `stopSpeak();` is now the first call in `startFight()`, before the new `F` object is created; the new `F` literal starts `speakToken:_speakSeq50` (module-level monotonic sequence, synced in `stopSpeak()`) instead of `speakToken:0`. `next()`/`close()` already called `stopSpeak()` and are unchanged.
- **Verified:** vm `test50.js` §9 (21 checks, incl. direct + hub-nav + v19 restarts, orphan result dropped in all paths); Chrome `verify-v50c.js` G9 (10 verdicts, incl. hub navigation: the navigation itself does not abort the rec — the abort happens at the next `fight()`, which is what the fix guarantees — and the orphan result still cannot answer).

### C-R5-2 (Minor) — Smart Learning weak list shows "Đến hạn 20779 ngày"
- **Root cause:** `prioOf` computed `(now-(due||0))/864e5` for due-less learned words — days since epoch. `classifyEN`/`classifyKO` rendered the same figure.
- **Fix (`src/v27.js`):** a due-less learned word reads **"Đến hạn hôm nay"** with overdue 0 (`prioOf` guards `box>0&&due`; `classifyEN`/`classifyKO` guard `due?...:0`). No due dates are invented; no `en15().due` backfill. A word with a real due date still shows its real lateness.
- **Honest side effect:** the phantom +30 priority those words used to get is gone, so they rank lower in the top-100 weak list; they remain listed under the "Đến hạn" filter.
- **Verified:** vm §10 (8 checks); Chrome G10 (live weak list, "Đến hạn" filter: exactly "1 từ. dog … Đến hạn hôm nay").

### C-R5-3 (Minor) — Sentence Forge "Điểm" advertised but never tracked
- **Root cause:** the intro ("Điểm = số từ × hệ số độ khó") and per-answer feedback ("+21 điểm") promised a score that was never stored, totaled, or shown on the session-end screen.
- **Fix (`src/v48.js`):** `forgeCheck()` accumulates `FS.score`; `forgeNext()`'s done branch persists `scoreTotal` (sum over sessions) and `bestScore` (best single session) in the existing `S.v7.en48.forge` subkey and returns the session score; the end screen shows "Điểm buổi: X điểm · Điểm cao nhất: Y điểm"; the intro shows the best score. No new save key; no XP/SRS change; `||0` defaults mean no migration.
- **Verified:** vm §11 (9 checks, incl. a second worse session never lowering the best); Chrome G11 (live 5/5 session, end screen shows both lines).

### C-R5-4 (Minor) — KO Hub, 360px mobile: 11 buttons under the 44px touch target
- **Root cause:** KO Hub header/tab/row buttons sized 34–42px (`.btn.sm` 34px, `.v7btn` ~42px, avatar button 40px).
- **Fix (`src/v50.css`, new layer):** `min-height:44px` on `.v7btn`, `:root #sk,:root #sn`, `#v21avatarbtn`, `.v15link`, and `.tabs .tab` (≤640px). No horizontal overflow at 320–430px; no other layout change.
- **Follow-ups found by the Chrome gate on a fresh profile (fixed in the same layer):** the base `:root #sk,:root #sn{min-height:34px}` rule (specificity 1,1,0) beats a bare `#sk,#sn` (1,0,0), so the header rule mirrors the base selector; and the first-run farm chooser "Để sau" link (`.v15link`, 17px) gets the same 44px.
- **Verified:** vm §12 (7 static checks); Chrome G12 (live 360px: 0 buttons under 44px on the KO Hub; EN Hub still 0; no overflow).

## NOT in this build (deliberate, recorded as pending)

- **C-R5-1 (MAJOR)** — boss grammar/sentence correct answers pay 0 XP (`mark18`/`mark19` bail with `if(!w)return;`; ~1/3 of mixed-fight correct answers earn nothing). Needs a director decision (pay flat +10 + streak via the shared V46 rule, or deliberately exclude). Goes to Claude separately; do not fix without that decision.
- **OBS-1 (Low, pre-existing)** — stale Counterattack question #3 is re-asked untimed after Counterattack resolves (`src/v19.js:433`). Recorded as a lead.
- **All other pending decision items** (unchanged from round 5): C-03 (BT Listening Quest pays at 0% accuracy), C-08 (pet hatch safe-merge loss), F-12 (EN reset scope), farm harvest +35 vs +25, bubble/shop icons, "Từ vựng của tôi" in the boss word-set picker, F4 remainder (`may`/`May`, `side`×2), F-05/F-07 observers, .v20modal stacking trap, C-09.

## Verification

- `tools/v50/repro-v50.js` on pristine V19.4: **28/28 reproduced** (vm).
- `tools/v50/verify-v50c.js` on pristine V19.4 (Chrome): **63/80** — the 17 failures are exactly the 4 fix-gates + the V19.5 title/marker checks; V49 regressions (G1–G8) all pass.
- `tools/v50/test50.js` on the built V19.5: **181 PASS / 0 FAIL / 7 SKIP, ×3 runs**.
- `tools/v50/verify-v50c.js` on the built V19.5: **81/81 PASS, ×2 runs** (Chrome 157). **0 console errors, 0 warnings, 0 JS dialogs** in both runs.
- Rebuild-from-scratch byte-identical (`6241e4a0…`).
- ZIP↔out byte-identical (checked by `package_v50.py`; see SMOKE_TEST).

## Honest gaps

- Real-microphone end-to-end NOT verified (headless Chrome has no mic; all speech gates use a controllable stub). Needs Anh's real-phone test.
- Live Firebase login/sync untested, as in every version.
- Hub navigation itself does not abort a live recognition (it never did); the abort happens at the next `fight()`. The outcome — a stale result can never answer a new question — is verified on both paths.
- `forgeNext()` re-persists if called twice past the done branch (pre-existing V48 behaviour, sessions/scoreTotal increment again; the bonus is claim-guarded). Not fixed here — out of scope for C-R5-3; recorded as a lead.
