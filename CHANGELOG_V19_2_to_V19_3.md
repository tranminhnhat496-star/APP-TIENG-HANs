# Changelog — V19.2 (Duplicate Senses) → V19.3 (Sentence Forge)

**Version 19.3.0 — layer V48. Base: V19.2 (layer V47, 19.2.0). Date: 2026-11-21.**
**out/index.html sha256 `6049d34f1627d832c8cb8c87c9950b2b3c9477405b9cb202277069739cbb2711`, 2,513,959 B** (base V19.2: `0aff5cebb7474535c3d7f635b289aaffe81d4f023d0bc64d798ae25fb918037f`, 2,457,229 B).

Claude's V19.1 "Sentence Forge" proposal (2026-11-21 09:37), built as V19.3 because V19.2 shipped first as the round-4 fix. Build order per the proposal: Forge → Bounty → Family Tree → Dojo → boss. Each feature has its own feature flag (`en48.flags`: forge / bounty / tree / dojo / boss, on by default, kill-switchable via `window.__v48.setFlag(name, on)`). New lazy save key `S.v7.en48` (no migration). No existing boss, word, reward, or currency touched. One honest gap, recorded not hidden: Web Speech recognition is not verified end-to-end (headless Chrome has no microphone — the gate proves the attempt + honest self-assessment fallback only). The Hangul Golem art (`assets/bosses/v18/v18_golem.png`, 1024×1024 RGBA) was generated and verified after the build and is included in the ZIP.

## Added

### Layer files
- `src/v48.js` (new): `window.__v48={version:'19.3.0'}` — Forge, Bounty, Tree, Dojo, golem unlock/overlay, flags, `setFlag`, test hooks (`__v48._test`).
- `src/v48_data.js` (new): `window.__V48_DATA` — golem definition (`v18_golem`, Lv 77, HP 620), Bounty definitions (4 daily + 4 weekly), `weakExplicit` (golem → listen).
- `src/v48.css` (new): overlay `#v48hub` styles, `--ui-*` tokens, 44px touch targets, WCAG AA.
- `out/v48.js`, `out/v48_data.js`, `out/v48.css`, `out/build_v48.py` (build script shipped for reproducibility); title now "V19.3 — Sentence Forge".

### 1. Sentence Forge — Lò Rèn Câu (`src/v48.js`, `src/v48_data.js`)
- A separate practice mode, NOT an SRS algorithm: arrange word fragments into correctly ordered sentences, EN + KO, from words the player has already learned.
- **EN sentences** come from the real `__V15_DATA.builder` bank (40 sentences, lv A1–B2, with Vietnamese translations). **KO sentences** come from the real example sentences on the player's own learned Korean cards (`card.e`, Hangul, ≥2 tokens). Nothing invented — no sentences, translations, IPA, or meanings are created by this layer.
- **Gates (honest empty states):** EN needs ≥8 learned EN words (SRS box ≥1); KO needs ≥8 learned KO cards AND ≥3 usable example sentences. Below that, the Forge shows the learned count and tells the player to learn more first.
- **Scoring:** points = tokens × tier (EN tier by sentence lv A1=1 / A2=2 / B1=3 / B2=4; KO tier by token count ≤4:1, 5–7:2, ≥8:3). **XP:** +2 per correct sentence via `gain15` (the ONE per-answer channel) + at most ONE claimed-guarded session bonus (+10 XP at ≥4/5 correct, key `sess:<sessionId>`). Verified live in Chrome: 5/5 correct pays exactly +20 XP (G1c/G1d).
- **Entry points:** EN Hub decorator button (class `v48hubbtn`, MutationObserver, V33/V35 precedent); KO tab button `v48kotab` appended after `v35kotab` (build-time append, stripping only the trailing `;` — the V16 `[:-2]` lesson).
- **Flag:** `en48.flags.forge`.

### 2. Bounty Board — Bảng Truy Nã (`src/v48_data.js`)
- 4 daily + 4 weekly quests: Forge correct counts, Forge streak, Dojo attempts, Tree branches. Progress counts only real V48 events.
- Rewards claimed-guarded per period (daily key = date string, weekly key = ISO week): daily chest **+20 XP / +1 gem**, weekly chest **+60 XP / +2 gems**. Verified live in Chrome: claiming `d_forge5` at 5/5 pays exactly +20 XP / +1 gem and the button becomes "Đã nhận thưởng" (G2b).
- **Flag:** `en48.flags.bounty`.

### 3. Word Family Tree — Cây Họ Từ (`src/v48.js`)
- For a learned word, shows up to 8 other learned words sharing its **topic** (EN: same `t` / shared `a1a2Topic`; KO: same deck `d` / topic `g`), **part of speech**, or **level** — relations derived only from the real word banks.
- **Synonyms, antonyms, and Sino-Korean roots have no source data in the game**, so those branches show an honest "no data" state — never invented relations (verified live in Chrome, G3b).
- A branch completes when all shown words are mastered (box ≥3) and pays **+10 XP once per (word, branch)**, claimed-guarded in `en48.tree.claimed`.
- **Flag:** `en48.flags.tree`.

### 4. Pronunciation Dojo — Võ Đường Phát Âm (`src/v48.js`)
- Listen and repeat: `speechSynthesis` speaks the word; `webkitSpeechRecognition` scores **Tốt / Khá / Lệch** when supported AND the microphone is granted; otherwise an honest **self-assessment fallback** ("Tự đánh giá", recorded as `selfOk` — never a fake grade).
- **Advanced tier** (EN B1/B2, KO ≥3 syllables) unlocks only after the first Hangul Golem win, derived from the real `en19` win record — no new flag stored. Verified live in Chrome: locked before any golem win (G3d), open after the win (G4e).
- The Dojo pays **no per-attempt XP**; rewards come only through Bounty chests.
- **Honest limit:** speech recognition itself is **not verified end-to-end** — headless Chrome 157 has no microphone. The Chrome gate proves the attempt starts (`mode:'listen'`), the recognition error fires, and the Dojo falls back to self-assessment within 2.5 s (G3e), and a self-assessment click records `selfOk` with no grade (G3f). A real microphone test on a real device is still needed.
- **Flag:** `en48.flags.dojo`.

### 5. Hangul Golem, Chúa Tể Phụ Âm — Lv 77 (`src/v48_data.js`, `src/v48.js`)
- **Lv 77, not Lv 58.** Lv 58 is taken by `v11_butterflyqueen` (Lv 58, HP 540), verified from `src/v19_data.js`: V11 bosses occupy lv 31–60 contiguously, V10 lv 1–30, Chrono lv 61–68, Skyroot lv 69–76 — no free level exists in 32–76, so the nearest free level is 77. (The earlier `LV58_CHECK_2026-11-21.md` note claiming Lv 58 was free was wrong: it grepped for `lv:58`, but V11 levels are positional `B(...)` constructor arguments.)
- Definition: id `v18_golem`, Lv 77, HP 620, def 8, mode `mixed`, diff `B2`, zone `golem`, element `earth`, skills `shield` / `tshield` / `bulwark` (V19 palette), first-win reward +170 XP / +5 gems / "Bùa Phát Âm Cao Cấp" / title "Chúa Tể Phụ Âm".
- Rides the **existing V19 Universal Combat Engine** (Chrono/Skyroot pattern): the UCE lookup chain gains `__V48_DATA.byId` at 2 sites (`bossUnlocked19`, `fight()`); `zone==='golem'` delegates unlock to `__v48.bossUnlocked`. Wins land in `en19`. `TOTAL_BOSSES` 86 → 87 (`src/v21.js`).
- **Weak to listening questions** — new V34 weakness kind `listen` (`src/v34.js`: `weakExplicit` consult + `golem`-zone safety net `{kind:'listen'}`; correct listen-mode answers fill the Break meter; `scopeBlocked` skips the `listen` kind because word pools cannot express it; `weakName` returns "Câu hỏi nghe"). Question rotation: `mc` / `grammar` / `listen` / `builder`. Verified live in Chrome: listen appears within 4 questions, the fight can be won, first-win reward pays and the win is recorded (G4b–G4d; live fight paid +200 XP total: +170 first-win + per-answer XP).
- **Unlock: 70 boss wins** (same corrected count as the Chrono gate).
- **Art included:** `assets/bosses/v18/v18_golem.png` (1024×1024 RGBA, transparent) — generated after the build in the V18 boss style. The card and fight show the golem image. (Binary file: travels in the ZIP; on GitHub it needs Anh's Desktop push like the other art.)
- **Flag:** `en48.flags.boss`.

## Changed in this revision

### Save / sync — new lazy subkey `S.v7.en48` (`src/v20_sync.js`)
- `hasProgress` entries for `en48` + an `en48` merge branch, following the V33/V35 pattern: counters MAX, claimed unions, streak newer-wins, flags newer-wins, created MIN; XP/gems never summed. No migration — the key is created only on first V48 use; a fresh profile boots with `en48` absent (verified live, G0c).

### Boss lookup — V48 data in the UCE chain (`src/v19.js`)
- `bossUnlocked19` and `fight()` gain `__V48_DATA.byId` in their lookup chains (exact-match asserts in `build_v48.py`). `zone==='golem'` delegates to `__v48.bossUnlocked`. `src/v18.js` deliberately NOT touched — its two similar lookup sites belong to the V18 engine; the golem fights in the V19 UCE.

### Weakness system — `listen` kind (`src/v34.js`)
- `weakFor` consults `__V48_DATA.weakExplicit` + a `golem`-zone safety net; `scopeBlocked` skips `listen`; `breakDmg` has a listen branch; `weakName` returns "Câu hỏi nghe". Applies only to the golem zone; all existing weakness meters and Break behaviour unchanged (§48G regression, 32 checks).

### Boss count (`src/v21.js`)
- `TOTAL_BOSSES` 86 → 87.

### Build (`build_v48.py`)
- Gates on the V19.2 base hash (`0aff5ceb…`, refuses if the layer is present), uses `rfind()` for the `</body>` injection (v37.css gotcha), wholesale-syncs the four edited embedded blocks, asserts marker order (`v48css` / `v48data` / `v48js` last, `v48data` before `v48js`), and skips the V35 fragment list's stale `var TOTAL_BOSSES=86;` with an explicit 87 assert. Rebuild-from-scratch reproduces `out/index.html` byte-identically (sha256 `6049d34f…`).

## Not changed (deliberately)

- No existing boss definition, stat, HP, skill, reward, or fight mechanic; no word bank, topic, or lesson; no `S.v7` shape other than the new lazy `en48` subkey; no reward amount; no Vietnamese gloss; no farm, pet, or Smart Learning logic.
- `src/v18.js` untouched (see above). No `firebase-config.js` in this deliverable's changes (the ZIP ships the placeholder, as always).
- WORDS stays 4,892. `TOTAL_BOSSES` is the only count that changes (86 → 87).

## Verification (see `SMOKE_TEST_V19_3_2026-11-21.md`)

- `test48.js`: **135 PASS / 0 FAIL / 7 SKIP, ×3 runs** on the built `out/` + ×1 on the packaged ZIP.
- `verify-v48c.js` (real Chrome 157): **30/30 PASS, ×2 runs** (run 1: 29/30 — one test-harness bug in G3c, fixed), 0 console errors/warnings/dialogs.
- Rebuild-from-scratch reproduces `out/index.html` byte-identically (sha256 `6049d34f…`).
- ZIP-vs-ZIP diff vs V19.2: changed 6 files (5 V48 files — `index.html`, `v19.js`, `v20_sync.js`, `v21.js`, `v34.js` — plus the pre-existing `SMOKE_TEST_V19_2_2026-11-21.md` drift, whose V19.2 ZIP hash/size line was filled after `package_v47.py` ran), added 11 files (`v48.js`, `v48.css`, `v48_data.js`, `build_v48.py`, `package_v48.py`, 3 docs, `tools/v48/test48.js`, `tools/v48/verify-v48c.js`, `tools/v48/PUSH_MANIFESTS.md`), removed none.
