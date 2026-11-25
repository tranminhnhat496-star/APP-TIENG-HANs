/* ===== V50 — Round-5 bug fixes (V19.5, layer V50) =====
   The fixes themselves live in the edited src files:
   - F-1 (High): src/v18.js + src/v19.js — startFight() now calls
     stopSpeak() BEFORE creating the new F object, and the new F
     starts its speakToken from a module-level monotonically
     increasing sequence (_speakSeq50, synced by stopSpeak()).
     A fight() restart can therefore never reuse an orphaned
     recognition's token value, so a stale result can no longer
     answer the new question. next()/close() are unchanged (already
     guarded). No XP/reward/SRS/pet/schema change.
   - C-R5-2 (Minor): src/v27.js — prioOf() + classifyEN() +
     classifyKO() no longer compute "days since the epoch" for a
     learned word with no due date; it reads "Đến hạn hôm nay".
     No due dates are invented; en15().due is not backfilled.
   - C-R5-3 (Minor): src/v48.js — the Forge score is now tracked:
     FS.score accumulates per-answer scores in the session,
     forgeNext() persists scoreTotal + bestScore into
     S.v7.en48.forge at session end, and the end screen + intro
     show "Điểm buổi" / "Điểm cao nhất". No XP/SRS change.
   - C-R5-4 (Minor): src/v50.css — 44px min-height for the KO Hub
     buttons that measured under 44px at 360px.
   This file exists only as the version marker for the layer,
   following the V42/V43/V44 pattern.
   DELIBERATELY NOT FIXED HERE (pending director decisions):
   - C-R5-1 (MAJOR): boss grammar/sentence correct answers pay 0 XP
     (they carry no .w, so mark18/mark19 never run) — needs a
     decision on whether they should pay the shared +10/streak rule.
   - OBS-1 (Low, pre-existing): after resolveUltimate() the stale
     CA question #3 is re-asked untimed — recorded as a lead. */
(function(){
  var VERSION='19.5.0';
  window.__v50={version:VERSION};
})();
