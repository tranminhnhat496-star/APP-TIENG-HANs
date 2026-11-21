/* ===== V46 DATA — V19.0.1 (layer V46): Boss Weakness redesign =====
   Per-boss weakness overrides for the 23 bosses whose Break meter could
   not fill (13 pool-blocked on V19.0 + the 10 Legendary bosses, which
   become pool-blocked the moment legDiff() is fixed — see v46.js).
   Every entry below is a REAL weakness kind/key from the existing v34
   system (kind 'a1a2' + a real A1–A2 topic slug; weakMatch/weakName
   already handle it, and the Vietnamese labels already exist in
   __V34_DATA.a1a2Labels). No word, IPA, or meaning is invented here:
   each topic was chosen ONLY because the live word data proves it has
   words inside that boss's question pool (counts measured on the
   pristine V19.0 base — tools/v46/logs-analysis.txt):
     - Legendary pools change with mastered words (legDiff): a topic is
       usable for a Legendary boss ONLY if it has words at ALL THREE
       bands — A2+B1 (<200 mastered), B1-only (200–599), B2-only (>=600).
       Only four A1–A2 topics qualify, with (m0 / m200 / m600) counts:
       education 19/19/13, nature 42/20/14, travel 36/17/12,
       emotions-and-feelings 10/7/7. (Chrono/Skyroot sets have 60 B2
       words each but ZERO A2/B1 words, so they cannot serve a Legendary
       boss below 600 mastered; body-parts and leisure-time have zero
       words at every band.)
     - B1-only pools (250 words): education 19, nature 20, travel 17,
       emotions 7 — same four topics.
     - B2-only pools (630 words): education 13, nature 14, travel 12,
       emotions 7 (+ Chrono/Skyroot 60 each — not used here, to keep EN
       bosses on English-vocabulary topics).
     - v10_owl's pool is Oxford-only B1 (149 words): education 13,
       nature 6, travel 6, emotions 5 — education is the fattest.
   Assignments spread the 10 Legendary bosses across the four topics
   (3 nature / 3 travel / 3 emotions / 1 education) with a loose element
   fit where one exists (sea/earth/tree -> nature; fire/light/dark
   feeling -> emotions; ice/fire journey -> travel); the 13 older
   pool-blocked bosses take the thematically nearest fillable topic
   (z6 sea animals -> nature; z8 vehicles -> travel; owl/wizard/fox/
   dict learning -> education; tiger speed -> travel; octopus/fairy
   water & nature -> nature; king -> travel).
   The 15 mode-blocked bosses (grammar/read/builder-only modes) are NOT
   touched: their meter cannot fill because their fights ask no word
   questions at all, and changing their mode would change fight
   mechanics — out of scope for this balance version. After this table,
   pool-blocked = 0 at mastered 0/200/600/700 and distinct blocked = 15
   (mode only), down from 26. See tools/v46/analysis-boss-tables.json
   for the per-boss before/after proof (test46 §46B recomputes it live).
   weakFor() (src/v34.js, patched by build_v46.py) consults this table
   FIRST — after the KO-deck rule, before the v34/v35 explicit tables —
   so it overrides zoneWeak / elWeak / diffWeak for exactly these 23
   boss ids and changes nothing for the other 63 bosses. */
(function(){
'use strict';
var WEAK_EXPLICIT46={
  /* Legendary (10) — old: B1 -> clothes-and-accessories, B2 -> fruit-and-vegetables (diffWeak). */
  'v10_firedragon':{kind:'a1a2',key:'emotions-and-feelings'},
  'v10_icewolf':{kind:'a1a2',key:'travel'},
  'v10_thunderlion':{kind:'a1a2',key:'education'},
  'v10_seaoctopus':{kind:'a1a2',key:'nature'},
  'v10_titan':{kind:'a1a2',key:'travel'},
  'v10_phoenix':{kind:'a1a2',key:'emotions-and-feelings'},
  'v10_voidghost':{kind:'a1a2',key:'emotions-and-feelings'},
  'v10_godturtle':{kind:'a1a2',key:'nature'},
  'v10_ninetails':{kind:'a1a2',key:'travel'},
  'v10_ancienttree':{kind:'a1a2',key:'nature'},
  /* Boss Map zones (5) — old: z6 -> animals, z8 -> vehicles (zoneWeak). */
  'v11_seadragon':{kind:'a1a2',key:'nature'},
  'v11_sharkking':{kind:'a1a2',key:'nature'},
  'v11_timemachine':{kind:'a1a2',key:'travel'},
  'v11_golem':{kind:'a1a2',key:'travel'},
  'v11_goldephant':{kind:'a1a2',key:'travel'},
  /* English Challenge + Elemental, B1 pool (5) — old: clothes (diffWeak B1),
     fruit (elWeak nature), food-and-drinks (elWeak water). */
  'v10_owl':{kind:'a1a2',key:'education'},
  'v10_tiger':{kind:'a1a2',key:'travel'},
  'v10_wizard':{kind:'a1a2',key:'education'},
  'v10_fox':{kind:'a1a2',key:'education'},
  'v10_octopus':{kind:'a1a2',key:'nature'},
  /* English Challenge + Elemental, B2 pool (3) — old: fruit-and-vegetables
     (diffWeak B2 / elWeak nature). */
  'v10_dict':{kind:'a1a2',key:'education'},
  'v10_king':{kind:'a1a2',key:'travel'},
  'v10_fairy':{kind:'a1a2',key:'nature'}
};
window.__V46_DATA={
  version:'19.0.1',
  weakExplicit:WEAK_EXPLICIT46
};
})();
