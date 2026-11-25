# Changelog — V19.5 → V19.5.1 (Round-5 Patch, 19.5.1, layer V52)

**Base:** V19.5 (19.5.0, layer V50; `out/index.html` sha256 `6241e4a0758cd0cd4fd801dd251298a62b35930feb82376536e5b4c0dee0739e`, 2,528,803 B).
**Built:** `out/index.html` sha256 `2bc0726d643765538cc18da0bc73903604220ef556851afc13c1a3b81f46ad5f`, 2,539,378 B (rebuilt from scratch byte-identically).
**Date:** 2026-11-24. **Source:** round-5 review `tools/v50/review-C-scan.md` §C-R5-1 + Anh's live Android report 2026-11-24; director decision by Claude (DO, 2026-11-24) for C-R5-1.

## Fixed (2)

### C-R5-1 (MAJOR) — boss grammar/sentence correct answers pay 0 XP
- **Root cause:** `mark18`/`mark19` bailed with `if(!w)return;` and the call sites guarded `if(F.cur&&F.cur.w)` — grammar/sentence questions carry no `.w`, so ~1/3 of mixed-mode correct answers earned nothing and never advanced the streak (review-C §C-R5-1).
- **Fix (`src/v18.js`, `src/v19.js`, per Claude's DO):** pay +10 XP and count the streak for correct grammar/sentence answers exactly like word answers, through the ONE shared V46 XP function (`window.__v46.awardBossAnswerXP`), wordless. `mark18/mark19(ok,w,qkey)` return early only on `if(!w&&!qkey)`; the call sites pass `F.cur&&F.cur.w` + `wordlessKey18()/19()` (`'g:'+question`, `'s:'+sentence`, `'r:'+title|q`); every word-dependent step (SRS box/right/wrong/review/intv/due, `recordAnswer`, mastered stats) stays behind `if(w)`; the V46 call passes `boxUp:w?(old.box[id]>before):!!ok` and the fallback mirrors it; the streak increments/resets for every answer; `save18()/save19()` run for wordless answers too. First-win/replay rewards unchanged; no schema change.
- **Balance note, honest:** no per-fight XP cap exists in the code (verified during the build) — mixed-fight XP rises (a full 4-question mixed fight now pays 40 XP instead of 20–30, cooldown-aware); caps were NOT changed. This is the behaviour Claude's decision implies; if the XP rate needs tuning it is a separate director decision.
- **Verified:** vm `test52.js` §13 (34 checks: mixed-fight traces in both engines EN + KO, V46/recordAnswer spies, SRS-cleanliness, wrong-answer, KO parity, EN word-XP byte-identical vs pristine V19.5 at the same seed); Chrome `verify-v52c.js` G14 (18 verdicts: live mixed fights v18 EN, v19 EN, v18 KO — grammar +10, builder +10, streak 0→1→2→3→4, no qkey in the word SRS maps).
- **Observation (pre-existing, not changed):** KO correct answers pay +10 XP but do not advance the EN streak (`0->0` in the live KO trace) — the KO path never touched `enOld().streak` in V19.5 either. Out of scope for this patch; recorded here, not fixed.

### Android TTS — no sound on Android phones (user report 2026-11-24, live game)
- **Root cause (verified from source):** the game NEVER selected a voice — zero occurrences of `getVoices` / `voiceschanged` anywhere. Every speak path (`speak15` v15.js, `speakKO` v18.js/v19.js/v27.js, `speak22` v22.js, Dojo `speakText` v48.js) did `speechSynthesis.cancel()` then `new SpeechSynthesisUtterance`, set only `.lang` (+ `.rate`), called `speak()`, and swallowed all errors (`catch(e){}`). On Android Chrome the voice list loads asynchronously and is often empty when the page first speaks, so an utterance with only `lang` set and no matching voice is silently dropped — no error, no sound.
- **Fix (new `src/v52.js`, `window.__v52`):** ONE shared speak helper used by ALL speak paths (each keeps its old body as a fallback if `__v52` ever fails to load) that (a) waits for voices to load (`voiceschanged` listener + `getVoices()` retry every 250 ms, bounded at 2000 ms), (b) picks a matching voice by lang (exact → lang-prefix → platform default; **never** a voice for the wrong language — if voices exist but none matches and there is no default, the call fails honestly), (c) attaches utterance `onerror` and shows an honest user-facing message ("Không phát được âm thanh — bấm Nghe lại.") with a retry button instead of silent failure (`'canceled'`/`'interrupted'` from our own `cancel()` are ignored), (d) runs `cancel()` only when something is actually speaking or pending, and speaks on the next tick after a cancel (cancel-then-speak in the same tick can drop the utterance on Android), (e) makes the auto-play paths queue and speak when voices load (or error honestly after the bound) — and the existing "Nghe lại" buttons retry on the next user tap. No new save key, no XP/SRS/pet/schema change, no new permissions.
- **Verified:** vm `test52.js` §14 (28 checks: helper unit tests with fake timers/clock, live speak15/speakKO/speakKOText/Dojo speakText, speak22 live via a BT entry) + §14c (4 checks); Chrome `verify-v52c.js` G15 (11 verdicts: delayed voices queue then speak with the matched voice, all live paths consult `getVoices()` and pick the right voice, no matching voice shows the honest pop, cancel-then-defer, Dojo listen) + G16 (360px: the honest-error toast is visible, no overflow).

## NOT in this build (deliberate, recorded as pending)

- **OBS-1 (Low, pre-existing)** — stale Counterattack question #3 is re-asked untimed after Counterattack resolves (`src/v19.js:433`). Recorded as a lead.
- **forgeNext double-call lead (round 5)** — re-persists if called twice past the done branch (bonus is claim-guarded). Recorded as a lead.
- **All other pending decision items** (unchanged from round 5): C-03 (BT Listening Quest pays at 0% accuracy), C-08 (pet hatch safe-merge loss), F-12 (EN reset scope), farm harvest +35 vs +25, bubble/shop icons, "Từ vựng của tôi" in the boss word-set picker, F4 remainder (`may`/`May`, `side`×2), F-05/F-07 observers, .v20modal stacking trap, C-09.

## Verification

- `tools/v52/repro-v52.js` on pristine V19.5: **27/27 reproduced** (vm) — C-R5-1 grammar/builder pay 0 in both engines + KO parity baseline; Android TTS: old code stays silent with empty-then-late voices and with no matching voice.
- `tools/v52/test52.js` on the built V19.5.1: **262 PASS / 0 FAIL / 10 SKIP, ×3 runs**.
- `tools/v52/verify-v52c.js` on the built V19.5.1: **113/113 PASS, ×2 clean runs** (Chrome 157). **0 console errors, 0 warnings, 0 JS dialogs** in both runs. (A first Chrome run scored 108/113 — the 5 failures were all diagnosed as gate artefacts, not build bugs: the gate's speech stub never cleared its `speaking` flag so later speaks took the cancel+defer path and reordered; the gate wrapped `__v15.pop15` while the error path funnels through the global `pop`; and the Dojo log was read synchronously before a deferred speak fired. The gate was fixed and the corrected driver passed 113/113 twice.)
- Rebuild-from-scratch byte-identical (`2bc0726d…`, all 855 files).
- ZIP↔out byte-identical (checked by `package_v52.py`; see SMOKE_TEST).

## Honest gaps

- **Real Android TTS end-to-end is NOT verified** — headless Chrome has no voices and no audio; all TTS gates use a controllable stubbed `speechSynthesis` (delayed / no-match / never-loads voices). Needs Anh's real Android phone test.
- **Real-microphone end-to-end NOT verified** (headless Chrome has no mic; all speech gates use a controllable stub). Needs Anh's real-phone test.
- Live Firebase login/sync untested, as in every version.
- KO correct answers do not advance the EN streak (pre-existing, see the C-R5-1 observation above) — not fixed here.
