# Korean & English Vocab Farm — V19.5.1 Round-5 Patch (Sửa 2 lỗi: XP boss + TTS Android)

**Version 19.5.1 — layer V52 (loads LAST). Base: V19.5 (19.5.0, layer V50). Date: 2026-11-24.**

V19.5.1 fixes exactly the 2 confirmed defects left from round 5 — nothing else. C-R5-1 is the MAJOR finding the V19.5 changelog deferred pending a director decision; Claude decided **DO** on 2026-11-24 (pay +10 XP + streak for correct grammar/sentence answers via the shared V46 function, wordless). The Android TTS silence is Anh's live report from 2026-11-24 (every "Nghe" button silent on Android phones). OBS-1 (stale Counterattack question re-asked untimed) and the `forgeNext` double-call lead are recorded as leads, not fixed here.

**Honest testing note:** verified by `build_v52.py` (base-hash gate on the V19.5 hash `6241e4a0…`, exact-match anchors, marker order, `node --check`), by the vm suite `test52.js` (**262 PASS / 0 FAIL / 10 SKIP, ×3 runs** on the final built `out/`) and by real-Chrome gates `verify-v52c.js` (**113/113 PASS, ×2 clean runs**) in Chrome 157, with **0 console errors, 0 warnings, 0 JS dialogs**. Both defects were proved first on the pristine V19.5 base in Node vm (`tools/v52/repro-v52.js`, **27/27 reproduced**). The Chrome gates use a controllable stubbed `speechSynthesis` (delayed / no-match / never-loads voices) and a controllable stubbed SpeechRecognition — **real Android TTS audio end-to-end is NOT verified in headless Chrome (no voices, no audio) and needs Anh's real Android phone test**. Firebase login/sync is untested live, as in every version — run `FIREBASE_SETUP.md`.

## Gameplay impact — read this first

- **C-R5-1 (MAJOR): boss grammar/sentence correct answers now pay +10 XP and advance the streak, exactly like word answers.** In V19.5, a mixed-mode boss fight asked 4 question types in rotation (vocab, grammar, listen, sentence-builder) but only vocab/listen paid XP — grammar and sentence answers paid 0 and never moved the streak, so ~1/3 of correct answers in a mixed fight earned nothing. Now every correct answer pays through the ONE shared V46 XP function (`window.__v46.awardBossAnswerXP`), wordless for grammar/sentence: a full 4-question mixed fight pays 40 XP (30 + listen, cooldown-aware) instead of 20–30, and the streak advances 0→1→2→3→4. **Balance note, honest:** there is no per-fight XP cap in the code (verified during the build), so mixed-fight XP rises with this fix; caps were NOT changed. First-win/replay rewards are unchanged; no schema change.
- **Android TTS: "Nghe" buttons now speak on Android.** The game never selected a voice (zero `getVoices`/`voiceschanged` anywhere): every speak path set only `.lang` and swallowed all errors, so on Android Chrome — where the voice list loads asynchronously and is often empty when the page first speaks — the utterance was silently dropped. Now ONE shared helper (`window.__v52.speak`) serves all 6 speak paths: it waits for voices (`voiceschanged` + `getVoices()` poll, bounded 2000 ms), picks a matching voice by lang (exact → prefix → platform default, **never** a voice for the wrong language), attaches `onerror`, and on failure shows an honest **"Không phát được âm thanh — bấm Nghe lại."** toast with a retry button instead of failing silently. `cancel()` runs only when something is actually speaking/pending, and the utterance is spoken on the next tick after a cancel (cancel-then-speak in the same tick can drop the utterance on Android). Auto-play paths queue and speak as soon as voices load. No new save key, no XP/SRS/pet/schema change, no new permissions.
- **Rewards, XP rates for word answers, SRS, pets, bosses and the save schema are unchanged** except the two fixes above. Word-answer XP is byte-identical to V19.5 (same seed, same words, same XP — proved in `test52.js` §13f). KO boss XP parity holds (first KO correct answer still +10).

## What V19.5.1 changes

### 1. New layer file (`src/v52.js`, no CSS)

- `window.__v52={version:'19.5.1', speak, errMsg, _test:{pickVoice, voices, pending, flush, waitMs}}` — the shared speak helper only. No UI change of its own: the honest error goes through the existing pop toasts.

### 2. Boss XP, wordless (`src/v18.js`, `src/v19.js` — same structure in both engines)

- `mark18/mark19(ok,w,qkey)` take a third arg; the early return is now `if(!w&&!qkey)return;` (was `if(!w)return;`). Every step that genuinely needs a word — SRS box/right/wrong/review/intv/due updates and `recordAnswer` — stays behind `if(w)`, so a wordless answer can never corrupt word data.
- The V46 call passes `boxUp:w?(old.box[id]>before):!!ok`, so a correct wordless answer counts as a box-up (+10, with the 10-minute per-item cooldown); the fallback mirrors it (`if(ok&&(w?old.box[id]>before:true))`). The streak increments/resets for every answer, word or wordless. `save18()/save19()` run for wordless answers too.
- Call sites (v18 ×2, v19 ×3 incl. the Counterattack path) pass `F.cur&&F.cur.w` + `wordlessKey18()/19()` — a stable per-item key (`'g:'+question`, `'s:'+sentence`, `'r:'+title|q`) so the cooldown mirrors words. The `if(F.cur&&F.cur.w)` guards at the call sites are removed.
- Wrong wordless answers pay 0 XP, reset the streak, and create no SRS entry (proved in §13d).

### 3. Shared speak helper, all 6 paths (`src/v15.js`, `src/v18.js`, `src/v19.js`, `src/v27.js`, `src/v22.js`, `src/v48.js`)

- `speak15`, `speakKO` (v18/v19/v27), `speak22`, `speakText` (Dojo) each delegate to `__v52.speak(text, lang, rate, onErr)` first, with `onErr` showing the honest message; each keeps its old body as a fallback if `__v52` ever fails to load. `speak22` keeps its `SPOKEN_LOG.push`; `speakText` keeps returning a boolean.

## Files changed vs V19.5

- **CHANGED (7):** `index.html`, `v15.js`, `v18.js`, `v19.js`, `v22.js`, `v27.js`, `v48.js`
- **ADDED (10):** `v52.js`, `build_v52.py`, `package_v52.py`, `README_V19_5_1_PATCH.md`, `CHANGELOG_V19_5_to_V19_5_1.md`, `SMOKE_TEST_V19_5_1_2026-11-24.md`, `tools/v52/test52.js`, `tools/v52/verify-v52c.js`, `tools/v52/repro-v52.js`, `tools/v52/PUSH_MANIFESTS.md`
- **REMOVED (0)**
- **NOT in this build (deliberate):** OBS-1 (Low lead), the `forgeNext` double-call lead, and all other pending decision items (C-03, C-08, F-12, farm harvest +35 vs +25, bubble/shop icons, "Từ vựng của tôi", F4 remainder, F-05/F-07 observers, .v20modal, C-09).
