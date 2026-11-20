/* V39 — V18.4 KOREAN BOSSES (18.4.0). Additive layer, loads LAST.
   The Bosses tab (V10 arenas, v18.js) had no Korean: only the 10
   Elemental bosses carried the 'both' language flag (the EN/KO pick
   screen); the 10 English Challenge bosses and the 10 Legendary
   bosses were English-only and started English fights directly, even
   though the fight engine already maps grammar/builder/read/speak
   modes to Korean multiple choice when F.lang==='ko'. The Boss Map (V19 UCE) had KO fights, but
   both engines silently fell back to English questions when the KO
   pool held <8 cards — V19 showed a warning banner, V18 showed none.
   And KO boss answers never reached Smart Learning: markKO/markKO19
   only touched koStats, while recordAnswer('ko',...) in v27.js fully
   supports the 'ko' branch (right/wrong/cw/cr/last).
   The fixes are guarded build replacements applied by build_v39.py
   (they live in closure-local code a runtime layer cannot reach):
     R-V39-V18DATA-LANG — v18_data.js: the language flag flips from
       'en' to 'both' for the 20 Challenge + Legendary bosses
       (line-scoped: only lines with arena:'en' or arena:'leg'). The
       10 old-arena bosses stay English-only — they redirect to the V6
       boss flow untouched. The boss card language line updates
       automatically via the existing ternary in v18.js:206
       ('Anh / Hàn (chọn trước trận)').
     R-V39-V18-KOCOUNT — v18.js gains koCount18() (koPool().length).
     R-V39-V18-BANNER — v18.js startFight() sets the <8 KO warning
       banner, mirroring V19's wording exactly. The fight is NOT
       blocked (V19 precedent: banner + English fallback).
     R-V39-V18-MARKKO — markKO(ok) -> markKO(ok,k) + a guarded
       __v27.recordAnswer('ko', k.id, ok, 'boss18') call before
       save18(), so the Smart record rides the same V20 flush.
     R-V39-V18-CALLS — both answer() call sites pass F.cur.k.
     R-V39-V18-COMMENT — header comment updated (was: 'KO answers
       only touch en18.koStats').
     R-V39-V19-MARKKO19 — markKO19(ok) -> markKO19(ok,k) +
       recordAnswer('ko', k.id, ok, 'boss19'), same pattern.
     R-V39-V19-CALLS — all three answer() call sites pass F.cur.k
       (normal ok, normal wrong, Knowledge Counterattack path).
     R-V39-V19-COMMENT — header comment updated (was: 'KO answers
       only touch en19.koStats').
   Deliberately NOT changed: V18 wins stay FLAT (en18().bosses[id] =
   {win,wins,at,item} — a KO win in a V18 arena counts as a win flat,
   like an EN win today; per-language V18 wins would be a schema
   change); the old arena; the region gates (GEAR GOLEM per language);
   the Chrono/Skyroot overlays (fightBoss() already calls
   v.setLang(lang) before v.fight(id), so a KO-overlay boss already
   fights in Korean — verified live, no fix needed); unlock chains
   (bossUnlocked/arenaWins read flat wins, language-agnostic);
   rewards/titles/XP; the weakness system (weakFor(b,'ko') already
   returns {kind:'ko'} for any boss — Break fills on correct KO
   answers while a deck is selected).
   No new save key, no schema change, no new data. */
(function(){
  "use strict";
  var VERSION='18.4.0';
  window.__v39={version:VERSION};
})();
