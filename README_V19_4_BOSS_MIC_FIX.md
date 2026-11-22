# Korean & English Vocab Farm — V19.4 Boss Mic Fix (Sửa lỗi micro khi đánh boss)

**Version 19.4.0 — layer V49 (loads LAST). Base: V19.3 (layer V48, 19.3.0). Date: 2026-11-22.**

Anh reported (2026-11-22 01:30): **"bosses ko nhận mic"** — boss fights don't pick up the microphone. V19.4 fixes the boss-fight speech recognition (`bossSpeak()` in both combat engines) so the mic actually works: the player can see the mic is listening, gets a specific reason when it fails, and is never stuck on a frozen speak card.

**Honest testing note:** verified by `build_v49.py` (base-hash gate on the V19.3 hash `dc971a6c…`, exact-match anchors, marker order, `node --check`), by the vm suite `test49.js` (**122 PASS / 0 FAIL / 5 SKIP, ×3 runs** on the final built `out/`) and by real-Chrome gates `verify-v49c.js` (**59/59 PASS, ×2 runs**) in Chrome 157, with **0 console errors, 0 warnings, 0 JS dialogs**. The defects were proved first on the pristine V19.3 base, in Node vm (`tools/v49/repro-v49.js`, **9/9 reproduced**) and in real Chrome (`tools/v49/repro-v49c.js`, **7/7 reproduced**) with a controllable stubbed SpeechRecognition. One thing is honestly NOT verified live and is reported as such, not claimed: speech recognition **with a real microphone** — headless Chrome has no mic, so every gate uses a stub that fires results/errors/end on command. A real-mic test on Anh's phone is still needed before claiming the mic works end to end. Firebase login/sync is untested live, as in every version — run `FIREBASE_SETUP.md`.

## Gameplay impact — read this first

- **Boss speak questions now work with the mic.** The only bosses that ask speak questions are **Pháp Sư Phát Âm (`v10_wizard`, Challenge, Lv 8)** and the Elemental **`v10_mage` (Lv 19)** — plus the old-arena `wizard` (V6 flow, untouched). There are zero speak-mode bosses in the V19 map, Chrono, Skyroot, or Golem data, and KO fights map speak → Korean multiple-choice, so this fix affects **English boss fights only**.
- **What the player sees now:** after tapping "Nói", the card shows **"Đang nghe… hãy nói: \<word\>"** with a pulsing red dot, and the "Nói" button is disabled while the mic is live — before, the screen did not change at all and the player could not tell the mic was on. If the mic fails, the card shows a **specific reason with a retry step** instead of the generic "(không nghe được)": mic blocked → how to allow it; no speech heard → speak louder and closer; no mic found → plug in / turn on the mic; network error → check the network; stopped → tap "Nói" again. If recognition ends with no result and no error, the card shows the no-speech message and the player can tap "Nói" again — before, the card stayed frozen with no way forward.
- **A stale result can no longer answer the next question.** Each speak question gets its own token; a recognition result that arrives after the question was answered, or after moving to the next question, is dropped. Advancing (`next()`) or leaving the fight (`close()`) stops the recognition. A timed boss can no longer time out a speak question mid-speech — no timer ever runs on a speak question (no speak question is timed in the shipped data, so this changes no live fight; it is defense in depth for a future timed speak boss).
- **Rewards and XP are unchanged.** A correct voice answer pays exactly what a correct multiple-choice answer pays (+10 XP per fresh correct word, +5 at every 5th streak, 0 on wrong) through the same shared V46 XP function — verified live in Chrome (full wizard fight won by voice: XP 20 → 85 in the gate run). First-win and replay rewards, SRS, pets, boss stats/HP/skills, and the save schema are untouched. **No new save key, no schema change.**
- **The v15 speak mode and the v48 Pronunciation Dojo are untouched** except regression checks (their source is byte-identical to V19.3; the Dojo overlay still opens; the v15 speak mode still opens).

## What V19.4 changes

### 1. New layer files (`src/v49.js`, `src/v49.css`)

- `window.__v49={version:'19.4.0', speakErrMsg}` — `speakErrMsg(code)` returns one Vietnamese message per SpeechRecognition error code, each with a clear retry step: `not-allowed` / `service-not-allowed` → mic blocked (how to allow it in the browser), `no-speech` → nothing heard (speak louder, closer), `audio-capture` → no mic found, `network` → network error, `aborted` → stopped, `start-failed` → could not open the mic, `unknown` → fallback. A pure helper: no localStorage, no `window.S`, no save key.
- `.v49listen` (listening chip, solid dark-blue background `#1e3a5f`, white text, pulsing red dot) and `.v49err` (error box, solid dark-red background `#4a1f1f`, light-pink text). Solid dark chips with light text, so they stay readable on both the fixed-dark V19 fight panel and the theme-driven V18 fight panel, in light and dark themes — measured in real Chrome: **11.50:1 / 10.59:1** (v19 panel), all WCAG AA.

### 2. `bossSpeak()` rewritten in both engines (`src/v18.js`, `src/v19.js` — byte-identical new block)

- **Handlers are attached BEFORE `start()`** — a result or error fired inside `start()` used to be lost (proved by the repro: a synchronously fired correct transcript was dropped and the question stayed unanswered).
- **Listening state:** `F.listening` + `F.rec` + `F.speakErr` (new per-fight fields, no save change). `bossSpeak()` sets them and re-renders immediately, so the card shows the listening line and the disabled "Nói" button.
- **`onend` handler:** if recognition ends with no result and no error while still listening, the card shows the no-speech message with a retry instead of freezing.
- **Specific errors:** `onerror` maps the error code through `__v49.speakErrMsg` and re-renders the error box; `start()` throwing shows the start-failed message instead of failing silently.
- **Per-question token:** `F.speakToken` is bumped on each `bossSpeak()` start and by `stopSpeak()`; every handler checks its token and drops stale results.
- **Entry guard:** `bossSpeak()` now returns unless the question is a speak question, unanswered, and the fight is live, and ignores a second tap while already listening. (The old code had no guard at all — it could answer a non-speak question, and crashed on `F.cur.w` when no question was loaded; the new code uses `F.cur&&F.cur.w`.)
- **`stopSpeak()`** (new, both engines): aborts the live recognition and bumps the token. Called first from `next()` and `close()`.
- **`speakState()`** (new test hook, both engines, exported on `__v18`/`__v19`): `{listening, token, heard, err, answered}` — precedent: the existing `_test` hooks.

### 3. Supporting edits in both engines (`src/v18.js`, `src/v19.js`)

- `nextQ()` clears the speak state at its top (`listening=false; rec=null; heard=null; speakErr=null`) so the previous question's "Máy nghe được" line, listening flag, or error never leaks into the next question.
- `startTimer()` returns immediately on a speak question (`if(F.qmode==='speak'){F.left=0;return}`) — the timer-race defense in depth (D5).
- The speak card in `qHTML()` renders the listening line + disabled button while listening, the `.v49err` box when `F.speakErr` is set, and the heard line as before.

## Files changed (vs V19.3)

- **Added:** `src/v49.js` (new layer, `window.__v49={version:'19.4.0'}`), `src/v49.css`, `out/v49.js`, `out/v49.css`, `build_v49.py`, `package_v49.py`, `tools/v49/test49.js`, `tools/v49/verify-v49c.js`, `tools/v49/repro-v49.js`, `tools/v49/repro-v49c.js`, `tools/v49/PUSH_MANIFESTS.md`, this README, `CHANGELOG_V19_3_to_V19_4.md`, `SMOKE_TEST_V19_4_2026-11-22.md`.
- **Changed:** `src/v18.js` + `src/v19.js` (the 8 edits each listed above — F literal, `nextQ()` clear, `startTimer()` guard, `stopSpeak()` in `next()`/`close()`, rewritten `bossSpeak()` + `stopSpeak()` + `speakState()`, speak card in `qHTML()`, `speakState` export), `out/index.html` (the two edited embedded blocks re-synced wholesale, `v49` style + `v49js` injected last before `</body>`).
- **Not changed:** everything else — no word data, no boss data, no rewards, no SRS, no pets, no save schema, no Firebase code, no v15 speak mode, no v48 Dojo.

## Verification (evidence, not claims)

- **Repro first (pristine V19.3):** `tools/v49/repro-v49.js` (Node vm) — **9/9 defects reproduced** (D1 sync-fire result lost; D2 no listening state; D3 silent start failure; D4 onend freeze; D5a no timer on speak questions today — latent; D5b late result dropped; D5c stale result answers the next question; D5d same defect in v19; D6 generic error). `tools/v49/repro-v49c.js` (real Chrome 157, stubbed SR) — **7/7 reproduced**, 0 console errors.
- **Node vm suite `tools/v49/test49.js`: 122 PASS / 0 FAIL / 5 SKIP, ×3 runs** on the final built `out/` — §0 static integrity (25 checks incl. exact fragment counts), §1 D1 fixed, §2 D2 fixed, §3 D3 fixed, §4 D4 fixed, §5 D5 fixed (forced timed speak questions on the tiger + icequeen: no timer runs; late/stale results dropped in both engines; `next()`/`close()` abort + bump the token), §6 D6 fixed (all 7 error codes), §7 regressions (voice XP parity +10/0, full wizard fight won by voice, non-speak boss unaffected, KO speak→mc, no-SR honest state, `nextQ` clears stale state, v15 `speakRecord` + v48 Dojo source-identical to pristine, WORDS 4892 / a1a2 998 / Oxford 3395, legDiff `[A2,B1]` at mastered 0, no `en49` save key, speak-boss enumeration unchanged), §8 structure (v49.js hygiene). The 5 SKIP are Chrome-only checks.
- **Real-Chrome gates `tools/v49/verify-v49c.js`: 59/59 PASS, ×2 runs** — G0 boot clean, G1 listening state in the live DOM, G2 start-failure + onend boxes + retries, G3 token/abort behaviour live, G4 all 7 error codes live, G5 contrast ≥ 4.5 in light + dark themes on both panels (11.50 / 10.59) + 360px no overflow, G6 full wizard fight won by voice (XP 20 → 85), G7 regressions (slime MC fight, KO wizard MC, v15 speak mode opens, Dojo opens), G8 **0 console errors, 0 warnings, 0 JS dialogs** for the whole run.
- **Rebuild-from-scratch:** restoring `out/index.html` from the pristine V19.3 backup and re-running `build_v49.py` reproduces `out/index.html` **byte-identically** (sha256 `0b9139ef…`, 2,522,575 B).
- **ZIP:** `Korean_English_Vocab_Farm_V19_4_Boss_Mic_Fix.zip` — see `SMOKE_TEST_V19_4_2026-11-22.md` for the hash/size/entry count and the ZIP↔out byte-identity check.

## Honest gaps (not verified, not claimed)

- **Real-microphone end-to-end is NOT verified.** Headless Chrome has no microphone, so every speech gate uses a controllable stub. The fix is proved at the code level (handlers, states, tokens, messages) and at the UI level (the listening line, the error boxes, the disabled button all render), but whether a real phone's mic picks up a real voice in a real boss fight still needs Anh's test on his phone.
- **Live Firebase login/sync untested**, as in every version.
- **The old-arena `wizard` (V6 flow)** still uses its own speak path and was deliberately untouched.
