# Changelog — V19.3 → V19.4 (Boss Mic Fix)

**Version 19.4.0 — layer V49 (loads LAST). Base: V19.3 (19.3.0, layer V48). Date: 2026-11-22.**

## Why

Anh reported (2026-11-22 01:30): "bosses ko nhận mic" — boss fights don't pick up the microphone. Root cause, verified from `src/` and reproduced on the pristine V19.3 base in Node vm (9/9) and real Chrome 157 (7/7): `bossSpeak()` in `src/v18.js` and `src/v19.js` (byte-identical bodies) called `rec.start()` BEFORE assigning `rec.onresult`/`rec.onerror`, showed no listening state, failed silently when `start()` threw, had no `onend` handler (frozen card), let a timed boss time out a speak question mid-speech, and showed only the generic "(không nghe được)" on errors. A stale recognition result could even answer the NEXT question (proved in the repro: the old transcript marked the new question correct).

## Changed

### Added
- `src/v49.js` — `window.__v49={version:'19.4.0', speakErrMsg}`: one Vietnamese error message per SpeechRecognition error code (`not-allowed`, `service-not-allowed`, `no-speech`, `audio-capture`, `network`, `aborted`, `start-failed`, `unknown`), each with a clear retry step. Pure helper: no localStorage, no `window.S`, no save key.
- `src/v49.css` — `.v49listen` (listening chip, `#1e3a5f` / white, pulsing red dot) and `.v49err` (error box, `#4a1f1f` / `#ffd7d7`); solid dark chips, readable in light + dark themes on both fight panels (measured 11.50:1 / 10.59:1 in real Chrome).
- `tools/v49/test49.js`, `tools/v49/verify-v49c.js`, `tools/v49/repro-v49.js`, `tools/v49/repro-v49c.js`, `tools/v49/PUSH_MANIFESTS.md`, `build_v49.py`, `package_v49.py`.

### Fixed — `bossSpeak()` rewritten in both engines (byte-identical new block)
- Handlers attached BEFORE `start()` (D1).
- Listening state: `F.listening` + `F.rec` + `F.speakErr`; the card shows "Đang nghe… hãy nói: \<word\>" and disables the "Nói" button while listening (D2).
- `start()` throwing shows the specific start-failed message with a retry instead of failing silently (D3).
- `onend` with no result shows the no-speech message with a retry instead of freezing the card (D4).
- Per-question token `F.speakToken` guards late results; `stopSpeak()` (new) aborts the live recognition and bumps the token, called first from `next()` and `close()` (D5).
- `onerror` maps the error code through `__v49.speakErrMsg` (D6).
- Entry guard (`qmode==='speak'`, unanswered, fight live, not already listening) and `F.cur&&F.cur.w` null-safety (the old code had no guard and crashed on `F.cur.w` with no question loaded).
- New test hook `speakState()` exported on `__v18`/`__v19`.

### Fixed — supporting edits in both engines
- `nextQ()` clears the speak state at its top (no leak of the previous question's heard line / listening flag / error).
- `startTimer()` returns immediately on a speak question — no timer ever runs on one (D5 defense in depth; no speak question is timed in shipped data, so no live fight changes).
- Speak card in `qHTML()` renders the listening line + disabled button and the `.v49err` box.

## Unchanged (deliberately)
- Rewards/XP/SRS/pets/save schema: **no change, no new save key.** A correct voice answer pays the same +10 XP as a correct MC answer (V46 shared function).
- Word data, boss data, boss stats/HP/skills, TOTAL_BOSSES (87), WORDS (4,892), legDiff thresholds.
- v15 speak mode and v48 Pronunciation Dojo (regression-checked only; source byte-identical to V19.3).
- Old-arena `wizard` (V6 flow) — untouched.
- Firebase code — untested live, as always.

## Verification
- `test49.js`: **122 PASS / 0 FAIL / 5 SKIP, ×3 runs** on the final built `out/`.
- `verify-v49c.js` (real Chrome 157): **59/59 PASS, ×2 runs**; **0 console errors, 0 warnings, 0 JS dialogs**.
- Rebuild-from-scratch reproduces `out/index.html` byte-identically (sha256 `0b9139ef154096254edd4748cb8a76abc050cb6d1c00c9e0afb17705906a2d65`, 2,522,575 B).
- Repro-first: `repro-v49.js` 9/9 and `repro-v49c.js` 7/7 defects reproduced on pristine V19.3 before the fix.

## Honest gaps
- Real-microphone end-to-end NOT verified (headless Chrome has no mic; all speech gates use a controllable stub). Needs Anh's real-phone test.
- Live Firebase login/sync untested, as in every version.
