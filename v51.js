/* ================================================================
   Korean & English Vocab Farm — V51 (V19.6 SENTENCE FORGE AUTO)
   Layer V51: additive feature layer, version 19.6.0, loads LAST.
   Anh (2026-11-22): "Sửa sentence forge, chỉ toàn mấy câu đơn
   giản, hãy làm tự động tạo ra các câu liên quan bộ từ" — Forge
   served ONLY the fixed 40-sentence builder bank (repro-v51:
   200 sessions x 5 -> exactly 40 distinct sentences, and the
   active Library scope changed nothing). V51 generates sentences
   AUTOMATICALLY from the active word set instead.

   HOW IT WORKS (template-based generation from REAL data only):
   - The target words come from the ACTIVE scope — en15().scope
     (Library set / topic / lesson, via V15().wordsFiltered) —
     in priority order: learned words in the scope, then learned
     words anywhere, then unlearned words in the scope. With no
     scope set, the set is the player's learned words.
   - Per target word, ONE of two paths (never invented data):
     1) EX-EXTEND: the word's own real example sentence (w.ex —
        all 1,576 V15 A1-B2 words have one) is kept verbatim and
        extended by level with a fixed adjunct: A1 as-is (short
        simple), A2 + time/place phrase, B1 + because-clause,
        B2 + which-clause. Adjuncts are fixed English function
        phrases (template scaffolding), never a translated meaning.
        If the ex already contains the adjunct, another one is
        picked; '!'/'?' sentences are never extended.
     2) TEMPLATE: for words with no ex (library-only words), a
        POS-keyed template filled with the real word: nouns use
        "the {n}" (safe for singular/plural/mass), verbs use
        1st-person plural + base form ("We {v} every day" —
        no -s needed, safe for regular and irregular verbs),
        adjectives use a predicative frame with a NOUN PARTNER
        from the same scope ("The {n} is {adj}."). Difficulty
        scales by the word's level: A1 short simple, A2 +
        time/place, B1 compound/complex (because/when), B2
        multi-clause (relative clause / conditional).
   - SKIPPED HONESTLY (bank fallback for that turn, never a
     fabricated sentence): multi-word headwords (316), words
     starting with a capital (51), modal/auxiliary/linking verbs
     and tone words (VDENY), attributive-only adjectives
     (ADENY: main/former/only/...), adjectives with no noun
     partner in the scope, and any word whose generation throws.
   - The bank (40 sentences) remains as the fallback: if fewer
     than 5 generated items exist, bank items fill the session
     to 5. Flag off (forgeAuto=0) restores the exact old
     behaviour — bank only.
   - Scoring is unchanged: tokens x tier, tier from the word's
     level (A1:1, A2/A1-A2:2, B1/OX:3, B2/BT:4); +2 XP/correct
     and the one claimed-guarded +10 session bonus still live
     in v48's forgeCheck/forgeNext, untouched.
   - The Vietnamese hint shown is the TARGET WORD's real vi
     (and its real ipa as "Đọc:" when present) — never a
     translation of the whole generated sentence, which the
     game has no source for.
   - KO: unchanged except the selected KO deck (S.deck) is now
     preferred — deck cards first, the rest after. No Korean
     sentence is ever invented; KO items stay verbatim card.e.

   FLAG: forgeAuto in S.v7.en48.flags (default 1, on), added
   to __v48.setFlag's names by the build script, kill-switchable
   via __v48.setFlag('forgeAuto', false). A generator bug can
   never take down Forge: genPool() returns null on any error
   and v48 falls back to the bank.

   RULES (per vocab_farm_versioned_builds skill): IIFE, 'use
   strict', try/catch around everything, other layers only
   through window.__vNN with guards, never edit another layer's
   source (v48.js is edited ONLY by build_v51.py's exact
   replacements), never change a schema, localStorage key,
   Firestore path, XP/gold/gems, boss/pet/vocab/SRS data, or
   working game logic. The V6 save object is a top-level
   `let S` (NOT a window property) — read it via bare S in
   try/catch, never via a window property. No new localStorage
   key, no new S.v7 key (forgeAuto lives inside en48.flags).
   ================================================================ */
(function(){
'use strict';
var VERSION='19.6.0';
function V15(){try{return window.__v15||null}catch(e){return null}}
function getS(){try{return S}catch(e){return null}}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function stripPunct(s){return String(s||'').replace(/[.!?]+$/,'').replace(/^\s+|\s+$/g,'')}
function tokensOf(s){return stripPunct(s).split(/\s+/).filter(function(x){return x})}
function hashStr(s){var h=0;try{for(var i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))|0}}catch(e){}return h<0?-h:h}

/* Denylists (template safety, not vocabulary data):
   VDENY — verbs that break the "We {v} every day" frame:
   modals/auxiliaries, linking verbs, and tone words (kill/die/
   murder) that read badly in a bare present-simple frame.
   ADENY — attributive-only adjectives that cannot stand after
   "is" ("The dog is main" is wrong). */
var VDENY=['can','could','may','might','must','shall','should','will','would','be','am','is','are','was','were','been','being','have','has','had','do','does','did','seem','become','appear','feel','look','sound','smell','taste','remain','stay','grow','turn','prove','get','keep','make','let','kill','die','murder','hate'];
var ADENY=['main','former','only','own','mere','utter','sheer','principal','chief','sole','daily','weekly','monthly','annual','front','back','inner','outer','upper','lower','live'];

/* Fixed adjuncts for the ex-extension path (template scaffolding —
   fixed English function phrases, never vocabulary data). */
var A2_TIME=[' every day.',' every morning.',' in the morning.',' at school.',' in the park.',' every night.',' at home.',' with my friend.'];
var B1_BECAUSE=[' because it is good for us.',' because I like it very much.',' because it helps me every day.',' because it is important for my life.'];
var B2_WHICH=[', which makes me happy.',', which is very important for our life.',', which helps me learn new things.'];

/* POS templates per tier. {n} = the target noun (after "the"),
   {v} = the target verb (base form, "We" subject), {adj} = the
   target adjective (predicative, with a noun partner {n}). */
var N_TPL={
  1:['I like the {n}.','We need the {n}.','The {n} is here.','This is my {n}.'],
  2:['I like the {n} in the morning.','We need the {n} at school.','The {n} is in the garden.','I see the {n} every day.'],
  3:['I like the {n} because it is useful for my family.','We need the {n} because it helps us every day.','The {n} is important because we use it every day.'],
  4:['The {n} that we use every day is important for our life.','If we do not have the {n}, our life will be very difficult.','The {n} we learn about at school helps us understand the world.']
};
var V_TPL={
  1:['We {v} every day.','I {v} at home.','They {v} together.'],
  2:['We {v} in the park every morning.','I {v} with my friend at school.','They {v} at home every night.'],
  3:['We {v} every day because it helps us learn new things.','I {v} at home because I like it very much.'],
  4:['If we {v} every day, we will become better and stronger.','When we {v} together, we learn many new things.']
};
var A_TPL={
  1:['The {n} is {adj}.'],
  2:['The {n} is {adj} in the morning.','The {n} is {adj} today.'],
  3:['The {n} is {adj} when the weather is nice.','I think the {n} is {adj} because it looks good.'],
  4:['Although the {n} is {adj}, we still like it very much.','The {n} is {adj}, which makes our day better.']
};

function firstPos(w){try{return String((w&&w.pos)||'').split(',')[0].trim().toLowerCase()}catch(e){return ''}}
/* A word is template-safe only as a single lowercase token of
   letters, apostrophe or hyphen (no phrases, no capitals, no
   punctuation). */
function cleanEn(w){
  try{
    var e=w&&w.en||'';if(!e||/\s/.test(e))return false;
    if(/^[A-Z]/.test(e))return false;
    if(/[^a-zA-Z'\-]/.test(e))return false;
    return true;
  }catch(err){return false}
}
function lvTier(lv){return {A1:1,A2:2,'A1-A2':2,B1:3,OX:3,B2:4,BT:4}[lv]||1}

/* Pick the first adjunct (starting from a per-word offset) whose
   key phrase is not already in the base sentence; '' if all are
   already present. The key phrase is the adjunct without its
   leading comma/space and trailing period. */
function pickAdjunct(list,w,base){
  try{
    var low=String(base||'').toLowerCase();
    var start=hashStr(String((w&&w.id)||(w&&w.en)||''))%list.length;
    for(var k=0;k<list.length;k++){
      var cand=list[(start+k)%list.length];
      var key=cand.replace(/^,\s*/,'').replace(/\.$/,'').trim().toLowerCase();
      if(key&&low.indexOf(key)<0)return cand;
    }
    return '';
  }catch(e){return ''}
}

/* Path 1 — EX-EXTEND: keep the word's real example sentence
   verbatim, extend it by level. Returns {text,tier,via} or null. */
function extendEx(w){
  try{
    if(!w||!w.ex)return null;
    var ex=String(w.ex).trim();if(!ex)return null;
    var bang=/[!?]$/.test(ex);
    var base=stripPunct(ex);
    var tk=tokensOf(ex);if(tk.length<2)return null;
    var tier=lvTier(w.lv);
    var adj='';
    if(!bang){
      if(tier===2)adj=pickAdjunct(A2_TIME,w,base);
      else if(tier===3)adj=pickAdjunct(B1_BECAUSE,w,base)||pickAdjunct(A2_TIME,w,base);
      else if(tier>=4)adj=pickAdjunct(B2_WHICH,w,base)||pickAdjunct(B1_BECAUSE,w,base)||pickAdjunct(A2_TIME,w,base);
    }
    var text=adj?base+adj:base+'.';
    if(tokensOf(text).length<2)return null;
    return {text:text,tier:tier,via:'ex'};
  }catch(e){return null}
}

/* Path 2 — TEMPLATE: build a sentence around the real word.
   noun = a noun partner from the same scope (adjectives only).
   Returns {text,tier,via} or null. */
function templateFor(w,noun){
  try{
    if(!w||!cleanEn(w))return null;
    var fp=firstPos(w),tier=lvTier(w.lv),en=w.en;
    var tpls=null,text='';
    if(fp==='n'){
      tpls=N_TPL[tier]||N_TPL[1];
      text=tpls[hashStr(String(w.id||en))%tpls.length].replace(/\{n\}/g,en);
    }else if(fp==='v'){
      if(VDENY.indexOf(en.toLowerCase())>=0)return null;
      tpls=V_TPL[tier]||V_TPL[1];
      text=tpls[hashStr(String(w.id||en))%tpls.length].replace(/\{v\}/g,en);
    }else if(fp==='adj'){
      if(ADENY.indexOf(en.toLowerCase())>=0)return null;
      if(!noun||!noun.en)return null;
      tpls=A_TPL[tier]||A_TPL[1];
      text=tpls[hashStr(String(w.id||en))%tpls.length].replace(/\{n\}/g,noun.en).replace(/\{adj\}/g,en);
    }else{
      return null;
    }
    if(tokensOf(text).length<3)return null;
    return {text:text,tier:tier,via:'tpl'};
  }catch(e){return null}
}

/* One generated Forge item for a word, or null when the word
   cannot generate (bank fallback covers that turn). Item shape
   matches v48's forgePool items, plus gen/scopeName/word. */
function genItem(w,scopeName,nounPool){
  try{
    if(!w||!w.en)return null;
    var r=extendEx(w);
    if(!r){
      var noun=null;
      try{
        var pool=nounPool||[];
        for(var i=0;i<pool.length;i++){if(pool[i]&&pool[i].id!==w.id){noun=pool[i];break}}
      }catch(e){}
      r=templateFor(w,noun);
    }
    if(!r)return null;
    var tk=tokensOf(r.text);
    if(tk.length<3)return null;
    return {text:stripPunct(r.text),vi:w.vi||'',hint:w.ipa||'',tier:r.tier,tokens:tk,src:'gen:'+r.via+':'+(w.id||'?'),lv:w.lv||'',gen:r.via,scopeName:scopeName||'',word:{en:w.en,vi:w.vi||'',pos:firstPos(w),lv:w.lv||'',id:w.id||''}};
  }catch(e){return null}
}

/* The active scope's display name (Library scopeName when
   available, else a plain lib/topic/lesson/set label). */
function scopeName(){
  try{
    var v=V15();var sc=null;
    if(v&&v.en15)sc=v.en15().scope||null;
    if(!sc)return 'Tất cả từ vựng';
    try{var v17=window.__v17;if(v17&&v17.scopeName){var n=v17.scopeName(sc);if(n)return n}}catch(e){}
    return (sc.lib||'Bộ từ')+((sc.topic||sc.lesson||sc.set)?' · '+(sc.topic||sc.lesson||sc.set):'');
  }catch(e){return 'Tất cả từ vựng'}
}

/* The EN generator pool, in v48 forgePool's shape
   {items,learned,koSent} (+ scopeName/genCount). Returns null
   when nothing can be generated — the caller falls back to the
   fixed bank. Never throws. */
function genPool(){
  try{
    var v=V15();if(!v||!v.words||!v.enOld)return null;
    var sc=null;try{sc=v.en15().scope||null}catch(e){}
    var scopeWords=null;
    try{scopeWords=v.wordsFiltered({scope:sc})||[]}catch(e){return null}
    if(!scopeWords.length)return null;
    var box={};try{box=(v.enOld().box)||{}}catch(e){}
    var totalLearned=0;
    try{v.words.forEach(function(w){if((box[w.id]||0)>=1)totalLearned++})}catch(e){}
    var learnedInScope=scopeWords.filter(function(w){return (box[w.id]||0)>=1});
    var inScopeIds={};scopeWords.forEach(function(w){inScopeIds[w.id]=1});
    var learnedAny=v.words.filter(function(w){return (box[w.id]||0)>=1&&!inScopeIds[w.id]});
    var unlearnedInScope=scopeWords.filter(function(w){return (box[w.id]||0)<1});
    var cands=shuffle(learnedInScope).concat(shuffle(learnedAny)).concat(shuffle(unlearnedInScope)).slice(0,40);
    var nounPool=shuffle(scopeWords.filter(function(w){return firstPos(w)==='n'&&cleanEn(w)})).slice(0,24);
    var name=scopeName();
    var items=[],used={};
    /* Stop at 12 items: enough variety across sessions, and the
       pool stays majority-learned — unlearned words only enter
       when the learned candidates cannot fill 12. */
    for(var i=0;i<cands.length&&items.length<12;i++){
      var w=cands[i];if(!w||used[w.id])continue;
      var it=genItem(w,name,nounPool);
      if(it){used[w.id]=1;items.push(it)}
    }
    if(!items.length)return null;
    /* A session needs 5 sentences: fill with bank items when the
       generator produced fewer (never a fabricated sentence). */
    if(items.length<5){
      try{
        var bank=shuffle((window.__V15_DATA&&__V15_DATA.builder)||[]).slice();
        var bi=0;
        while(items.length<5&&bi<bank.length){
          var b=bank[bi++];if(!b||!b.s)continue;
          var tk=tokensOf(b.s);if(tk.length<2)continue;
          items.push({text:stripPunct(b.s),vi:b.vi||'',hint:'',tier:({A1:1,A2:2,B1:3,B2:4}[b.lv]||1),tokens:tk,src:'builder:'+(b.lv||'?'),lv:b.lv||''});
        }
      }catch(e){}
    }
    return {items:items,learned:totalLearned,koSent:0,scopeName:name,scope:sc,genCount:items.filter(function(it){return !!it.gen}).length};
  }catch(e){return null}
}

/* KO deck preference: deck cards first (stable), the rest after.
   No Korean is invented — the cards themselves are unchanged. */
function koDeckFirst(cards){
  try{
    if(!cards||!cards.length)return cards;
    var deck='';try{var s=getS();deck=(s&&s.deck)||''}catch(e){}
    if(!deck)return cards;
    var a=[],b=[];
    cards.forEach(function(c){((c&&c.d||'')===deck?a:b).push(c)});
    return a.concat(b);
  }catch(e){return cards}
}

/* The forgeAuto flag lives in en48.flags (added by build_v51.py);
   read it through __v48 when present, default ON. */
function flagOn51(){
  try{var v48=window.__v48;if(v48&&v48.flagOn)return v48.flagOn('forgeAuto')}catch(e){}
  return true;
}

window.__v51={
  version:VERSION,
  genPool:genPool,genItem:genItem,extendEx:extendEx,templateFor:templateFor,
  lvTier:lvTier,scopeName:scopeName,koDeckFirst:koDeckFirst,
  firstPos:firstPos,cleanEn:cleanEn,flagOn:flagOn51,
  VDENY:VDENY,ADENY:ADENY,A2_TIME:A2_TIME,B1_BECAUSE:B1_BECAUSE,B2_WHICH:B2_WHICH,
  N_TPL:N_TPL,V_TPL:V_TPL,A_TPL:A_TPL
};
})();
