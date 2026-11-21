/* ===== V47 — Duplicate senses (C-R3-3, V19.2) =====
   Claude's decided fix (2026-11-21): KEEP both rows for sluggish /
   orange / trip (distinct senses), MERGE devoted into one row (the
   no-938 row is deleted from the data files by build_v47.py, same
   precedent as build_v41.py's airplane/each-other deletions).

   Design (review-C-c33.md §5, the ONLY safe design): the three kept
   second senses are WORDS-only records with stable non-w<N> ids
   (a1a2_<no>), appended at the end of buildWords() by the V47 hook
   (one call site in src/v15.js, after the V17b/V22/V33/V35 attach
   blocks and after the V16 override loop), and NEVER pushed into
   __v14.ENWORDS. V14's question code is closure-private and cannot
   be patched, so routing the twins through ENWORDS would put the
   twin's different meaning into V14's distractors and match mode
   (see review §3.4). The BT precedent (bt<unit>_<seq> ids) proves
   WORDS records need not come from ENWORDS.

   No schema change, no new save key: SRS (box/due/intv/right/wrong/
   xpAt) is keyed by w.id everywhere, so each twin starts with a
   fresh, empty SRS record and the primary keeps its history
   untouched. WORDS total 4,889 -> 4,892; a1a2Total 999 -> 998
   (devoted row deleted); FAMILY topic 100 -> 99. Per-topic rewards
   now need each sense mastered separately (already-claimed rewards
   stay claimed — claimed[key] is sticky).

   The twin rows (vi/ipa/pos/topic) are read from the A1-A2 library
   data (window.__V17_A1A2) by `no` at buildWords() time — no
   Vietnamese gloss is invented, edited, or hard-coded here.
   No new ids start with 'w'+digits (parseInt(id.slice(1)) at
   v15.js:111 and the w<N> <-> ENWORDS-index invariant). */
(function(){
'use strict';
var VERSION='19.2.0';
/* Kept pairs: {en, twinNo}. The primary is the lower-no row (file
   order = no-ascending, first row wins both dedup gates). */
var PAIRS=[
  {en:'sluggish',twinNo:680},
  {en:'orange',twinNo:806},
  {en:'trip',twinNo:912}
];
var _problems=[];
var _madeTotal=0;
function rowByNo(no){
  var lib=window.__V17_A1A2||[];
  for(var i=0;i<lib.length;i++)if(lib[i].no===no)return lib[i];
  return null;
}
/* Display-only sense label. NEVER bake into w.en: typing compares
   norm(input)===norm(w.en), speakWord speaks w.en, search/export
   use the bare headword. Only render sites call labelOf(w). */
function labelOf(w){
  if(!w)return '';
  return w.sense?(w.en+' ('+w.sense+')'):w.en;
}
window.labelOf=labelOf;
/* Split the three kept second senses. Called from the end of
   buildWords() (src/v15.js) on EVERY buildWords() call — the hook
   must sit inside buildWords(), not as a wrapper on the __v15
   export, because buildWords() is also called through its closure
   from init15/add/delete/reset/attachBT and the V33/V35 ensureData
   paths, which a wrapper would miss. buildWords() resets WORDS each
   call, so the split is naturally idempotent (no stale-twin guard
   needed). Returns the number of twins created. */
function splitDuplicateSenses(WORDS,BYID){
  if(!WORDS||!BYID)return 0;
  var made=0;
  PAIRS.forEach(function(p){
    var matches=[];
    WORDS.forEach(function(w){if((w.en||'').toLowerCase()===p.en)matches.push(w)});
    if(matches.length!==1){_problems.push(p.en+': expected exactly 1 WORDS record, found '+matches.length);return}
    var prim=matches[0];
    var row=rowByNo(p.twinNo);
    if(!row){_problems.push(p.en+': twin row no '+p.twinNo+' not found in __V17_A1A2');return}
    if((row.en||'').toLowerCase()!==p.en){_problems.push(p.en+': twin row no '+p.twinNo+' has en '+row.en);return}
    var firstTopic=(prim.a1a2Topics&&prim.a1a2Topics[0])||null;
    if(!firstTopic){_problems.push(p.en+': primary '+prim.id+' has no a1a2Topics');return}
    if(row.t===firstTopic){_problems.push(p.en+': twin topic '+row.t+' equals primary first topic');return}
    var twinId='a1a2_'+row.no;
    if(BYID[twinId]){_problems.push(p.en+': id collision '+twinId);return}
    /* Restrict the primary to its first topic (else it would still
       render in the twin's topic as well as the twin — the word
       would appear twice in that topic's list). Keep its Oxford
       extra, oxLessons, oxOrdMap, lib, lv untouched (orange keeps
       t:'fruits', lv:'A1'). Drop the second sense from the
       primary's extra[] (else the primary's Library card still
       advertises the twin's meaning). */
    prim.a1a2Topics=[firstTopic];
    prim.a1a2Topic=firstTopic;
    if(prim.a1a2NoMap)delete prim.a1a2NoMap[row.t];
    if(prim.a1a2NoMap&&prim.a1a2NoMap[firstTopic]!=null)prim.a1a2No=prim.a1a2NoMap[firstTopic];
    if(prim.extra)prim.extra=prim.extra.filter(function(x){return !(x.src==='a1a2'&&x.vi===row.vi)});
    /* Append the twin AFTER the primary (and after the V17b block
       has run): K2W/K2W2/K2W3/K2W5 first-wins keeps every other
       attach on the primary, and the v17only id-parse at v15.js:111
       has already run. No extra, no oxLessons, no Oxford attach. */
    var twin={id:twinId,t:row.t,en:row.en,vi:row.vi,ipa:row.ipa||'',pos:row.pos||'',ex:'',exvi:'',lv:'A1-A2',custom:false,lib:['a1a2'],a1a2Topics:[row.t],a1a2Topic:row.t,a1a2TopicName:row.topic,a1a2NoMap:{},a1a2No:row.no,sense:row.topic};
    twin.a1a2NoMap[row.t]=row.no;
    WORDS.push(twin);BYID[twin.id]=twin;made++;
  });
  _madeTotal+=made;
  if(_problems.length){
    try{if(typeof console!=='undefined'&&console.warn)console.warn('[V47] splitDuplicateSenses problems:',_problems.join(' | '))}catch(_){}
  }
  return made;
}
window.__v47={
  version:VERSION,
  splitDuplicateSenses:splitDuplicateSenses,
  labelOf:labelOf,
  pairs:PAIRS,
  _test:{
    problems:function(){return _problems.slice()},
    made:function(){return _madeTotal}
  }
};
})();
