# Changelog — V19.5.1 → V19.6 (Sentence Forge Auto, layer V51 — REBASED)

**Version:** 19.6.0 (layer V51). **Base:** V19.5.1 (19.5.1, layer V52). **Date:** 2026-11-25.
**Built `out/index.html`:** sha256 `48555ddfd1ab7c9e8a55fba8cc1eb804ee27b09f665a45a4f5c54e80bb807a8b`, 2,556,928 B.
**ZIP:** `Korean_English_Vocab_Farm_V19_6_Sentence_Forge_Auto.zip` — sha256 TBD (filled after packaging), size TBD, files TBD.

## Rebase note

This V19.6 is the REBASED build (layer V51 onto the V19.5.1 base). The original V19.6 (2026-11-22/23, private tree, V19.4 base, ZIP sha256 `8168b236…`) is superseded. The rebase re-derives the 6 V51 edits in `src/v48.js` (7 replacement sites) against the newer shared file, which carries V50 Forge score tracking and V52 Android TTS. The layer files `src/v51.js` + `src/v51.css` are byte-identical to the original. `index.html` loads v51 before v52 (v52 stays last).

## Added

- **Sentence Forge Auto (`src/v51.js`, `window.__v51`, version 19.6.0; `src/v51.css`, `.v51gen` badge).**
  - `genPool()`: target words from the active scope — learned-in-scope → learned-any → unlearned-in-scope; pool capped at 12, session 5.
  - `genItem()`: EX-EXTEND (word's real `ex` kept verbatim, extended by level) or POS templates (noun/verb/adjective); difficulty A1 simple → B2 which-clause; deterministic.
  - Honest skip to the 40-sentence bank for multi-word headwords, capitals, modal/aux/linking/tone verbs, attributive-only adjectives — never fabricated.
  - KO: `koDeckFirst()` prefers the selected deck; items stay verbatim `card.e`.
  - Flag `forgeAuto` in `S.v7.en48.flags` (default ON; kill-switch via `__v48.setFlag`).
- **Pre-session card** shows the scope name + generated count; **in-session generated questions** show the "Câu tạo tự động" badge + scope + keyword (word + Vietnamese meaning).

## Changed

- `src/v48.js` — exactly the 6 V51 edits (7 sites): flag default + fallback + `setFlag` name list (E1–E3); KO deck-preference hook (E4); EN genPool hook (E5); pre-session scope/count line (E6); in-session badge line (E7). V50 score code and V52 Dojo delegation untouched.
- `index.html` — title V19.6 — Sentence Forge Auto; `v48` embedded block re-synced; `v51` style + `v51js` injected before `v52js` (v52 last).

## Unchanged (verified by the rebase regression checks)

- V50 (19.5.0): F-1 token, C-R5-2 due-less label, C-R5-3 Forge score, C-R5-4 44px rules — all markers survive; Forge score still accumulates and shows on the end screen.
- V52 (19.5.1): C-R5-1 wordless boss XP (full mixed-mode fight 40 XP, both engines, live in Chrome) and the `__v52` TTS helper (delayed / live / no-match paths, live in Chrome with stubbed voices) — all intact.
- Scoring, XP, SRS, pets, bosses, save schema: unchanged. No new save key.

## Files vs V19.5.1

- **CHANGED (2):** `index.html`, `v48.js`
- **ADDED (11):** `v51.js`, `v51.css`, `build_v51r.py`, `package_v51r.py`, `README_V19_6_SENTENCE_FORGE_AUTO.md`, `CHANGELOG_V19_5_1_to_V19_6.md`, `SMOKE_TEST_V19_6_2026-11-25.md`, `tools/v51/test51.js`, `tools/v51/verify-v51c.js`, `tools/v51/repro-v51.js`, `tools/v51/PUSH_MANIFESTS.md`
- **REMOVED (0)**

## Test evidence

- Repro-first on pristine V19.5.1: `tools/v51/repro-v51.js` **5/5 reproduced** (40-bank-only pool, scope changes nothing, KO ignores the deck, no generated items). On the rebased build: R1/R2/R4/R5 fixed; R3 still shows REPRO with the repro's weak seed (first 12 WORDS learned, none in the Education topic — the pool is the same 12 learned words by the documented learned-any priority). The ORIGINAL V19.6 build shows the identical 1/5 on the same repro; scope discrimination is proved properly by `test51.js` §51B (learns the topic's 20 words first: pool all in-scope).
- `tools/v51/test51.js`: **97 PASS / 0 FAIL / 5 SKIP, ×3 runs** on the built `out/` (original 85 + 2 new §0 checks + 10 new §R rebase-regression checks: C-R5-1 mixed fight + `__v52` TTS unit checks).
- `tools/v51/verify-v51c.js`: **61/61 PASS, ×2 clean runs** in real Chrome 157; **0 console errors, 0 warnings, 0 JS dialogs** (original 38 + 23 new G9 rebase-regression verdicts: v18+v19 mixed fights 40 XP each, streak 0→4, no qkey in SRS maps; TTS delayed/live/no-match).
- Rebuild-from-scratch reproduces `out/index.html` **byte-identically** (`48555ddf…`, 2,556,928 B).
- ZIP↔out byte-identity checked by `package_v51r.py`; `test51.js` re-run on the packaged ZIP (see SMOKE_TEST).

## Honest gaps

- **Real Android TTS end-to-end is NOT verified** — headless Chrome has no voices and no audio; all TTS gates use a controllable stubbed `speechSynthesis`. Needs Anh's real Android phone test.
- **Real-microphone end-to-end is NOT verified** — headless Chrome has no mic; all speech gates use a controllable stub. Needs Anh's real-phone test.
- **Live Firebase login/sync untested**, as in every version.
- KO correct answers pay +10 XP but do not advance the EN streak (pre-existing V19.5 behaviour, unchanged).
- No per-fight XP cap exists in the code (verified in V19.5.1; caps unchanged — a rebalance is a director decision).
