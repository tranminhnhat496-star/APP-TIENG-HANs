/* V38 — V18.3 BOSS WORD SETS (18.3.0). Additive layer, loads LAST.
   The "Bộ từ đánh boss" picker (bossScopeHTML in v22.js) only offered
   Basic Tactics: its lib dropdown had 3 options (all BT) and the chips
   row always showed BT Units 1–24, so boss fights could never use the
   other Library sets even though the scope engine (inScope15 /
   wordsFiltered in v15.js) already supports them and the Library's own
   "Học ngay" buttons already set those scopes. scopeName22() even
   returned the placeholder 'Bộ từ khác' for any non-BT scope.
   The fixes are guarded build replacements applied by build_v38.py
   (they live in closure-local code a runtime layer cannot reach):
     R-V38-V17-EXPORTS — window.__v17 gains topics/lessons/topicName/
       scopeName exports, so v22.js can reuse the Library's own data
       and naming instead of duplicating the 19 topics / 136 lessons.
     R-V38-V22-SCOPENAME — scopeName22() delegates to __v17.scopeName()
       (fallback: the old BT formatter), so every scope the picker can
       produce has a proper name; 'Bộ từ khác' never appears for one.
     R-V38-V22-HELPERS — new bossLibs/bossLibOf/bossTopics/bossLessons/
       bossChronoSets/bossSkyrootSets/bossTopicName/bossSubHTML/
       bossLibChange/bossSubPick/bossSelectedSub helpers before the
       picker comment.
     R-V38-V22-PICKER — bossScopeHTML() rebuilt: lib dropdown gains
       A1–A2, Oxford 3000, Chrono Kingdom, Skyroot Sanctuary; the
       sub-selection area re-renders per lib (19 topic chips / Oxford
       lesson <select> / 4 Chrono set chips / 4 Skyroot set chips /
       BT 24 Unit chips); type + status dropdowns and the pick-all
       buttons show ONLY for BT, because the engine honors sc.type /
       sc.status only for BT (btMap + the if(sc.lib==='bt') block in
       inScope15/wordsFiltered).
     R-V38-V22-APPLY — applyBossScope() builds the exact scope per lib
       (a1a2 {topic}, oxford {lesson}, chrono/skyroot {set}, bt
       unchanged), omitting the sub-field for "Toàn bộ", exactly like
       the Library's learnScopeKey/reviewScopeKey do.
     R-V38-V22-EXPORTS — window.__v22 gains scopeName22/bossLibChange/
       bossSubPick/bossSubHTML/bossSelectedSub exports.
   "Từ vựng của tôi" is NOT in the picker: custom words have NO lib
   field (v15.js builds them without one), so no {kind:'lib'} scope
   can select them — inventing one would be a fake scope. The scope
   engine, fight engines, SRS and data are unchanged; the sc2 fallback
   in v18.js/v19.js wordPool (which drops topic/lesson) is a documented
   known limit, unreachable for picker scopes (smallest picker pool is
   an Oxford lesson at 25 words, above the 8-word threshold).
   No new save key, no schema change, no new data. */
(function(){
  "use strict";
  var VERSION='18.3.0';
  window.__v38={version:VERSION};
})();
