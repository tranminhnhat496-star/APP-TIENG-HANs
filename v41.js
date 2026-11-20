/* ===== V41 — BUG FIXES III (V18.6, layer V41) =====
   Round-2 review fixes on the V18.5 base (tools/v41/review-A-v40.md,
   review-B-deep.md, review-C-play.md). Additive layer only: this file
   is the version marker; the fixes themselves are build-script
   replacements in v19.js / v15.js / v20.js / v17 data (see build_v41.py).

   R1+R2 (MAJOR, V19 engine only, introduced by the V40 C-02 fix):
     castSkillInFight's checkPhase() can start the Knowledge
     Counterattack while a normal question is still on screen.
     answer()/pick()/pickCorrect()/pickWrong() in v19.js now take the
     CA path ONLY when the current question IS a CA question
     (F.qmode starts with 'ca-'), and resolveUltimate() clamps
     caRight to 3. Before: the in-flight normal answer counted as a
     CA answer (caRight 4 -> the 0/3 failure branch, -2 hearts), and a
     grammar/read/builder question threw (caMode undefined, no
     optsVi) and was unanswerable until the CA timer expired.
   F1 (MINOR, save/import): load() in index.html now defaults S.opt
     when a stored save has cards but no opt, so boot no longer throws
     TypeError (reading 'group') and leaves #app empty.
   F2 (MINOR, farm): farmPlotTap() removes any stale #v15farmquiz div
     before creating a new harvest quiz (no more duplicate-id divs).
   F3 (MINOR, import/export): importFile() (v20.js) and backupImport()
     (v15.js) flush the pending debounced save BEFORE taking the
     pre-restore snapshot, so in-memory changes made within the ~800 ms
     debounce window are in the snapshot and undo can restore them.
   C-R2-2 (MINOR, bottom nav, 360px): v41.css restores a minimum tab
     width at <=640px so the fixed bottom-nav row scrolls horizontally
     instead of crushing 11 labels into each other (the <=640px rule
     set min-width:0, so "Học thông minh"/"Chrono"/"Skyroot" overlapped
     and "Skyroot" was cut at the right edge).
   F4-partial (MINOR, raw data dupes): dropped exactly two
     zero-information-loss rows — the 2nd byte-identical 'airplane'
     (A1-A2 VEHICLES, no 864) and the 2nd 'each other' (Oxford lesson
     38, ord 942, empty pos). Raw counts: A1-A2 1000 -> 999, Oxford
     3396 -> 3395; deduped WORDS counts unchanged (995 / 3393).
   U2 (pre-existing, NOT changed unless Chrome proves lag):
     castSkillInFight's try{F.render()} line is a no-op (F.render is
     never defined) but the fight IS re-rendered at the end of
     castSkillInFight via __v18/__v19._petRefresh() -> renderFight().
     Fix ONLY if real Chrome (verify-v41c gate E) shows HP/shield
     numbers lagging after a team skill; if no lag is observed the
     dead line stays as-is.

   Deliberately NOT fixed (need Anh's decision — see the changelog):
   C-R2-1 KO boss correct answers pay 0 XP (markKO/markKO19); legDiff
   + weakness table; F-12 reset scope; farm +35 vs +25 XP; bubble/shop
   icons; C-03 BT Listening Quest 0% reward; C-08 pet-hatch safe-merge
   loss; "Từ vựng của tôi" boss picker scope; .v20modal trap; F-05/F-07
   observers; V9 word fixes; V14.1; V16 Q1/Q2/Q4; V17 Q3/Q4/Q7/Q8.
   No schema change, no new save key, no new localStorage key. */
(function(){
'use strict';
var VERSION='18.6.0';
window.__v41={version:VERSION,layer:'V41',name:'Bug Fixes III'};
})();
