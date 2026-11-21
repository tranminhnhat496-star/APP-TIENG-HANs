# Korean & English Vocab Farm — V19.3 Sentence Forge (Lò Rèn Câu)

**Version 19.3.0 — layer V48 (loads LAST). Base: V19.2 (layer V47, 19.2.0). Date: 2026-11-21.**

V19.3 is the **Sentence Forge** build from Claude's V19.1 proposal (2026-11-21 09:37): Sentence Forge (Lò Rèn Câu), Bounty Board (Bảng Truy Nã), Word Family Tree (Cây Họ Từ), Pronunciation Dojo (Võ Đường Phát Âm), and a new boss — Hangul Golem, Chúa Tể Phụ Âm. It ships as V19.3 (not V19.1) because V19.2, the round-4 duplicate-senses fix, shipped first. Build order follows Claude's proposal: Forge → Bounty → Family Tree → Dojo → boss. **Every feature has its own feature flag** (`en48.flags`: `forge` / `bounty` / `tree` / `dojo` / `boss`, all on by default, kill-switchable via `window.__v48.setFlag(name, on)`) so a new-feature bug can never take down the game.

**Honest testing note:** verified by `build_v48.py` (base-hash gate on the V19.2 hash `0aff5ceb…`, exact-match anchors, marker order, `node --check`), by the vm suite `test48.js` (**135 PASS / 0 FAIL / 7 SKIP, ×3 runs** on the final built `out/`) and by real-Chrome gates `verify-v48c.js` (**30/30 PASS, ×2 runs** — run 1 was 29/30 with one test-harness bug in G3c, since fixed; see `SMOKE_TEST_V19_3_2026-11-21.md`) in Chrome 157, with **0 console errors, 0 warnings, 0 JS dialogs**. One thing is honestly NOT verified live and is reported as such, not claimed: Web Speech **recognition** end-to-end — headless Chrome has no microphone, so the gate only proves the recognition attempt runs and falls back honestly to self-assessment (G3e); a real mic test on a real device is still needed. The Hangul Golem art (`assets/bosses/v18/v18_golem.png`, 1024×1024 RGBA, transparent background) was generated and verified after the build, so the boss card and fight show the golem image. Anh's real-phone test remains the final word for layout and touch. Firebase login/sync is untested live, as in every version — run `FIREBASE_SETUP.md`.

## Gameplay impact — read this first

- **Sentence Forge is a practice mode, NOT an SRS algorithm.** You arrange word fragments into correctly ordered sentences, in English or Korean, built only from words you have already learned. English sentences come from the real sentence-builder bank already in the game (40 sentences, A1–B2, with Vietnamese translations); Korean sentences come from the real example sentences stored on your own learned Korean cards. If you have too few learned words, the Forge shows an honest "learn more words first" state — it never invents a sentence, a translation, IPA, or a meaning.
- **Scoring:** points = number of words × difficulty tier (EN tier by sentence level A1=1 / A2=2 / B1=3 / B2=4; KO tier by token count ≤4:1, 5–7:2, ≥8:3). Each correct sentence pays **+2 XP**; a session of 5 sentences pays at most one **+10 XP** completion bonus (at ≥4/5 correct), claimed-guarded so it can never stack.
- **Bounty Board** adds daily and weekly quests (e.g. "5 correct Forge sentences today") with streaks and reward chests: daily chest **+20 XP / +1 gem**, weekly chest **+60 XP / +2 gems**, each claimable once per period. Progress counts only real V48 events — nothing is faked.
- **Word Family Tree** shows, for a learned word, the other learned words that share its topic, part of speech, or level — relations derived only from real data. Synonyms, antonyms, and Sino-Korean roots have **no source data in the game**, so those branches honestly say so instead of inventing relations. Completing a branch (all shown words, max 8, mastered at box ≥3) pays **+10 XP, once per (word, branch)**.
- **Pronunciation Dojo:** listen and repeat. The game speaks the word (Web Speech synthesis); if the browser supports speech recognition and you grant the microphone, it scores your attempt **Tốt / Khá / Lệch**; otherwise it says so honestly and offers self-assessment ("Tự đánh giá" — never a fake grade). The advanced tier (EN B1/B2 words, KO words of ≥3 syllables) unlocks only after your first Hangul Golem win. The Dojo pays **no XP per attempt** — its rewards come only through Bounty chests.
- **Hangul Golem, Chúa Tể Phụ Âm — Lv 77, HP 620** (not Lv 58: see below). Its attacks are consonant/vowel assembly questions and listen-and-choose; it is **weak to listening questions** (correct listen answers fill its Break meter). Unlock needs **70 boss wins**. First win pays **+170 XP, +5 gems, the "Bùa Phát Âm Cao Cấp"** (which unlocks the advanced Dojo tier), and the title "Chúa Tể Phụ Âm". Wins land in `en19` like every other boss. **TOTAL_BOSSES goes 86 → 87.**
- **Why Lv 77, not Lv 58:** Claude's proposal said Lv 58 "if free, else the nearest free level 32–76". Lv 58 is **taken** — by `v11_butterflyqueen` (Lv 58, HP 540). The V11 bosses occupy lv 31–60 contiguously, V10 lv 1–30, Chrono lv 61–68, Skyroot lv 69–76, so **no free level exists in 32–76** and the nearest free level is **77**. (An earlier note, `LV58_CHECK_2026-11-21.md`, claimed Lv 58 was free — it was wrong: it grepped for `lv:58`, but V11 levels are positional arguments in the `B(...)` constructor, not `lv:` fields.)
- **Boss art included:** `assets/bosses/v18/v18_golem.png` (1024×1024 RGBA, transparent background — a cute chibi stone golem in the V18 boss style, with glowing Hangul letters carved into the stone, generated after the build and verified). The card and the fight show the golem image. Note: the PNG is binary, so it travels in the ZIP; on GitHub it needs Anh's Desktop push like the other art.
- Nothing else changes: no existing boss, word, reward, or currency is touched; no save-schema change beyond the new lazy `S.v7.en48` subkey; WORDS stays at 4,892.

## What V19.3 changes

### 1. Sentence Forge (`src/v48.js`, `src/v48_data.js`)

- Entry points: the **EN Hub** gets a "🔨 Sentence Forge" button (class `v48hubbtn`, added by a MutationObserver decorator, V33/V35 precedent); the **KO tabs** get a `v48kotab` button appended right after `v35kotab` (build-time append, stripping only the trailing `;`).
- One overlay `#v48hub` (z-index 1500, `--ui-*` design tokens, 44px touch targets, WCAG AA) hosts all five V48 features behind tabs: Forge, Bounty, Tree, Dojo, Golem.
- **EN sentences** are drawn from the real `__V15_DATA.builder` bank (40 sentences with Vietnamese translations, lv A1–B2). **KO sentences** are drawn from the player's own learned Korean cards' `card.e` example sentences (Hangul, ≥2 tokens). Nothing is invented: a sentence is only offered if every word in it is already learned (EN: SRS box ≥1; KO: card learned).
- **Gates (honest empty states):** EN needs ≥8 learned EN words; KO needs ≥8 learned KO cards AND ≥3 usable example sentences. Below that, the Forge shows exactly how many words you have and tells you to learn more first.
- **Session:** 5 sentences, tiles shuffled, click tiles in order, check, next. Scoring = tokens × tier (EN tier by lv; KO tier by token count). XP: +2 per correct sentence through `gain15` — the ONE per-answer channel — plus at most one claimed-guarded session bonus (+10 XP at ≥4/5 correct, key `sess:<sessionId>`).

### 2. Bounty Board (`src/v48_data.js` — 4 daily + 4 weekly quests)

- Daily quests: 5 correct Forge sentences, a 3-day Forge streak, 5 Dojo attempts, 1 Tree branch. Weekly quests: 25 correct Forge sentences, a 5-day Forge streak, 20 Dojo attempts, 3 Tree branches. Progress counts only real V48 events (Forge correct answers, Dojo attempts, Tree branch completions).
- Rewards are claimed-guarded per period (daily key = date string, weekly key = ISO week): daily chest +20 XP / +1 gem, weekly chest +60 XP / +2 gems. A claimed chest shows "Đã nhận thưởng" and its button disappears.

### 3. Word Family Tree (`src/v48.js`)

- For a learned word, the Tree shows up to 8 other learned words sharing its **topic** (EN: same `t` / shared `a1a2Topic`; KO: same deck `d` / topic `g`), **part of speech**, or **level**. All relations come from the real word banks — nothing is derived from outside data and nothing is invented.
- **Synonyms, antonyms, and Sino-Korean roots have no source data in the game.** Those branches show an honest "no data" state, never invented relations.
- A branch completes when every shown word is mastered (box ≥3) and pays **+10 XP once per (word, branch)**, claimed-guarded in `en48.tree.claimed`.

### 4. Pronunciation Dojo (`src/v48.js`)

- The game speaks the word with `speechSynthesis`. If `webkitSpeechRecognition` exists and the microphone is granted, the attempt is scored **Tốt / Khá / Lệch** from the recognition result; if recognition is unsupported, denied, or errors, the Dojo falls back to honest **self-assessment** ("Tự đánh giá") and records the attempt as such — never a fake grade.
- **Advanced tier** (EN B1/B2 words, KO words of ≥3 syllables) is locked until the first Hangul Golem win, derived from the real `en19` win record — no new flag is stored.
- The Dojo pays **no per-attempt XP**; its rewards come only through Bounty chests (the "5 Dojo attempts" quests).
- **Honest limit:** speech recognition itself is **not verified end-to-end** — headless Chrome 157 has no microphone. The Chrome gate proves the attempt starts (`mode:'listen'`), the recognition error fires, and the Dojo falls back to self-assessment within 2.5 s (G3e), and that a self-assessment click is recorded as `selfOk`, not as a grade (G3f). A real microphone test on a real device is still needed before claiming recognition works.

### 5. Hangul Golem, Chúa Tể Phụ Âm — Lv 77 (`src/v48_data.js`, `src/v48.js`, `src/v19.js`, `src/v34.js`)

- Definition in `__V48_DATA`: id `v18_golem`, Lv 77, HP 620, def 8, mode `mixed`, diff `B2`, zone `golem`, element `earth`, skills from the V19 palette (elemental `shield`, tactical `tshield`, passive `bulwark`), first-win reward +170 XP / +5 gems / "Bùa Phát Âm Cao Cấp" / title "Chúa Tể Phụ Âm".
- The boss rides the **existing V19 Universal Combat Engine** like the Chrono/Skyroot bosses: the UCE lookup chain gains `__V48_DATA.byId` at its two lookup sites (`bossUnlocked19` and `fight()`), and `zone==='golem'` delegates its unlock check to `__v48.bossUnlocked`. Wins land in `en19`. `TOTAL_BOSSES` 86 → 87 (`src/v21.js`).
- **Weak to listening questions:** a new V34 weakness kind `listen` (`src/v34.js` consults `__V48_DATA.weakExplicit` and a `golem`-zone safety net `{kind:'listen'}`; correct listen-mode answers fill the Break meter; `scopeBlocked` skips the `listen` kind because word pools cannot express it; `weakName` returns "Câu hỏi nghe"). The golem's question rotation is `mc` / `grammar` / `listen` / `builder` (KO maps to mc/type/listen in the UCE).
- **Unlock: 70 boss wins** (the same corrected count as the Chrono gate). The golem card shows Lv 77 / HP 620 / listen weakness / the fight button only when unlocked.
- **Art included:** `assets/bosses/v18/v18_golem.png` (1024×1024 RGBA, transparent) — generated after the build in the V18 boss style; the card and fight show the golem image.

## Files changed (vs V19.2)

- **Added:** `src/v48.js` (new layer, `window.__v48={version:'19.3.0'}`), `src/v48_data.js` (boss definition + Bounty definitions + `weakExplicit`), `src/v48.css`, `out/v48.js`, `out/v48_data.js`, `out/v48.css`, `build_v48.py`, `package_v48.py`, `tools/v48/test48.js`, `tools/v48/verify-v48c.js`, `tools/v48/PUSH_MANIFESTS.md`, this README, `CHANGELOG_V19_2_to_V19_3.md`, `SMOKE_TEST_V19_3_2026-11-21.md`.
- **Changed:** `src/v19.js` (UCE lookup chain gains `__V48_DATA.byId` at 2 sites + `zone==='golem'` delegation), `src/v34.js` (weakness system: `weakExplicit` consult, `golem` safety net, `listen` kind in `scopeBlocked` / `breakDmg` / `weakName`), `src/v21.js` (`TOTAL_BOSSES` 86 → 87), `src/v20_sync.js` (`hasProgress` entries for `en48` + `en48` merge branch, V33/V35 pattern: counters MAX, claimed unions, streak newer-wins, flags newer-wins, created MIN; XP/gems never summed), `out/index.html` (the four edited embedded blocks re-synced wholesale, `v48css` / `v48data` / `v48js` injected last before `</body>`, `v48data` before `v48js`).
- **Removed:** nothing.
- **Not touched:** `src/v18.js` (its two similar boss-lookup sites belong to the V18 engine — the golem fights in the V19 UCE, not the V18 engine), any existing boss definition, any word bank, any `S.v7` shape other than the new lazy `en48` subkey, any reward amount, any Vietnamese gloss.

## Migration effects (honest)

- New lazy save key `S.v7.en48` (no migration): a fresh profile boots with `en48` absent (`en48:false` in the Chrome gate) and the key is created only when a V48 feature is first used. Existing saves load untouched.
- WORDS stays 4,892; no word, topic, or lesson changes. `TOTAL_BOSSES` 86 → 87 changes only the boss count shown in the game.
- The `listen` weakness kind is new in V34: it applies only to the golem zone. All existing weakness meters, Break behaviour, and boss fights are unchanged (verified by the §48G regression section, 32 checks).
- Feature flags are stored in `en48.flags` and sync like any other `en48` counter (newer-wins on conflict); turning a flag off hides that feature's entry point and disables its logic — the rest of the game is unaffected.

## How to verify after deploying

1. EN Hub → "🔨 Sentence Forge": with 0 learned words you see the honest "learn more" state; after learning 8 EN words the start button appears. Play 5 sentences by clicking tiles in order: 5/5 correct pays +20 XP (5×+2 plus one +10 session bonus).
2. KO tabs → the `v48kotab` button sits right after `v35kotab`; the KO Forge needs 8 learned cards and 3 real example sentences, otherwise the honest learn-more state.
3. Bounty Board: after 5 correct Forge sentences, `d_forge5` shows 5/5 with a claim button; claiming pays +20 XP / +1 gem and the button becomes "Đã nhận thưởng".
4. Tree: pick a learned word (e.g. `dog`) — the same-topic branch shows real words (`cat`, `bird`, `fish`, …); the synonym/antonym/Sino-Korean branches honestly say there is no data.
5. Dojo: listen, then repeat. Without a microphone (or on an unsupported browser) you get honest self-assessment, never a fake grade. The advanced tier says it is locked until you beat Hangul Golem.
6. Golem card: Lv 77, HP 620, weakness "Câu hỏi nghe", locked until 70 boss wins. After the first win, the advanced Dojo tier opens.
7. Kill-switch test: `window.__v48.setFlag('forge', false)` hides the Forge; `setFlag('forge', true)` brings it back — the rest of the game never notices.
