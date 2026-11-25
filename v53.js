/* ================================================================
   Korean & English Vocab Farm — V53 (V19.6.1 KO SENTENCE FORGE)
   Layer V53: additive feature layer, version 19.6.1, loads LAST.
   Director (Claude, 2026-11-25): fix the KOREAN Sentence Forge
   pool by option (b) — keep real examples as the base, expand the
   pool; NO template generation (option (a) rejected: a
   grammatically wrong practice sentence is worse than a missing
   one; 받침 rules only cover particles while verb endings,
   honorifics and natural order have more traps).

   WHAT CHANGES (KO Forge only — EN Forge is untouched):
   1) POOL PRIORITY (koPool53): (1) learned cards' examples first,
      (2) then same-group (c.g) / selected-deck (S.deck, c.d)
      cards' examples, (3) finally other unlearned cards'
      examples. Unlearned items carry learned:false + origin and
      are marked "chưa học" in the UI (display-only — no save
      change, no new key). Duplicate example sentences are kept
      once, at the highest priority tier.
   2) DIFFICULTY LADDER (bandKO + koOrderSession): sessions order
      by token count — 2–3 tokens, then 4–5, then 6+ (easier
      first, shuffled within each band). Scoring tier (tierKO:
      <=4 → 1, <=7 → 2, else 3) is UNCHANGED; the ladder is
      session ORDER only.
   3) SHORT-POOL NOTICE + SUPPLEMENT: the "selected set" is the
      learned + same-group/deck examples (primary). If primary
      has fewer than 5 valid sentences, the session is
      auto-supplemented from the nearest group (tier 3) and a
      clear notice is shown (intro + first question card + end
      screen) — never silently dropped. The ko-sent gate counts
      the EXPANDED pool: the honest empty state fires only when
      even the expanded pool has <3 sentences.
   4) QUALITY FILTER (koQuality) — every example must pass:
      - Hangul present (no-hangul)
      - >= 2 whitespace tokens after stripping trailing
        sentence punctuation (too-short)
      - no odd characters: only Hangul (syllables + jamo),
        Latin, digits, spaces and . , ! ? ; : ' " ( ) - …
        ‘ ’ “ ” are allowed. Anything else (~ # @ / \ | $ %
        ^ & * _ + = < > [ ] { } ` …) is odd-punct. NOTE: ~
        is a placeholder marker, not a complete sentence.
      - no unbalanced double quotes / parens / brackets
        (unbalanced). Single apostrophes are NOT checked:
        they are legitimate mid-word (don't).
      - no sentence punctuation inside a token (mid-punct):
        ". ! ? , ; :" must sit at a token's end — a token like
        "학생입니다.오늘" means a missing space, and whitespace
        tokenisation would make a broken tile.
      - no punctuation-only token (bad-token): every token must
        contain a letter or digit (a lone "," tile is dropped).
      The seed deck's 19 valid examples all pass; the filter
      drops only broken examples, and any drop is covered by
      the notice path (3) when the pool runs short.
   - No Korean is ever invented: every sentence stays verbatim
     card.e (stripPunct only trims trailing sentence marks, as
     v48 already did).

   RULES (per vocab_farm_versioned_builds skill): IIFE, 'use
   strict', try/catch around everything, other layers only
   through window.__vNN with guards, never edit another layer's
   source (v48.js is edited ONLY by build_v53.py's exact
   replacements), never change a schema, localStorage key,
   Firestore path, XP/gold/gems, boss/pet/vocab/SRS data, or
   working game logic. The V6 save object is a top-level
   `let S` (NOT a window property) — read it via bare S in
   try/catch, never via window.S. No new localStorage key, no
   new S.v7 key. EN Forge, V51 EN generation, V52 TTS and V50
   score tracking are untouched (regression-checked).
   ================================================================ */
(function(){
'use strict';
var VERSION='19.6.1';
function getS(){try{return S}catch(e){return null}}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function stripPunct(s){return String(s||'').replace(/[.!?]+$/,'').replace(/^\s+|\s+$/g,'')}
function tokensOf(s){return stripPunct(s).split(/\s+/).filter(function(x){return x})}
function tierKO(n){return n<=4?1:(n<=7?2:3)}

/* Difficulty ladder band by token count: 2–3 → 1, 4–5 → 2, 6+ → 3.
   Session ORDER only — scoring tier (tierKO) is unchanged. */
function bandKO(n){return n<=3?1:(n<=5?2:3)}

/* Quality filter for one Korean example sentence (verbatim card.e).
   Returns {ok:true,tokens:[...]} or {ok:false,why:'no-hangul'|
   'too-short'|'odd-punct'|'unbalanced'|'mid-punct'|'bad-token'}.
   Rules are documented in the header; every rule is unit-tested
   in test53.js §53A. */
function koQuality(e){
  try{
    var s=String(e||'');
    if(!/[\uAC00-\uD7A3]/.test(s))return {ok:false,why:'no-hangul'};
    /* Odd characters: anything outside Hangul (syllables + jamo),
       Latin, digits, whitespace and . , ! ? ; : ' " ( ) - … ‘ ’ “ ”. */
    if(/[^\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318FA-Za-z0-9\s\.,!?;:'"\(\)\-…‘’“”]/.test(s))return {ok:false,why:'odd-punct'};
    /* Unbalanced double quotes / parens / brackets. Single
       apostrophes are skipped on purpose (don't is legitimate). */
    var dq=(s.match(/"/g)||[]).length;
    var lp=(s.match(/\(/g)||[]).length, rp=(s.match(/\)/g)||[]).length;
    var lb=(s.match(/\[/g)||[]).length, rb=(s.match(/\]/g)||[]).length;
    if(dq%2||lp!==rp||lb!==rb)return {ok:false,why:'unbalanced'};
    var tk=tokensOf(s);
    if(tk.length<2)return {ok:false,why:'too-short'};
    for(var i=0;i<tk.length;i++){
      var t=tk[i];
      if(!/[\uAC00-\uD7A3A-Za-z0-9]/.test(t))return {ok:false,why:'bad-token'};
      /* Sentence punctuation must sit at the token's end: strip
         trailing . ! ? ; : , and the remainder must be clean —
         "학생입니다.오늘" (missing space) fails here. */
      var core=t.replace(/[.!?;:,]+$/,'');
      if(/[.!?;:,]/.test(core))return {ok:false,why:'mid-punct'};
    }
    return {ok:true,tokens:tk};
  }catch(err){return {ok:false,why:'error'}}
}

/* The expanded KO pool, in v48 forgePool's shape
   {items,learned,koSent} (+ primary/learnedItems/unlearnedItems/
   notice). cards/deck are optional — when omitted they are read
   from the live save (S.cards / S.deck). Returns null on any
   error — the caller falls back to the old learned-only path.
   Never throws. Item shape matches v48's, plus learned + origin. */
function koPool53(cards, deck){
  try{
    var s=getS();
    if(!cards)cards=(s&&s.cards)||[];
    if(deck===undefined)deck=(s&&s.deck)||'';
    var learnedGroups={}, learnedCount=0;
    cards.forEach(function(c){
      if(!c)return;
      if((c.box||0)>=1){learnedCount++;if(c.g)learnedGroups[c.g]=1}
    });
    var seen={}, items=[];
    function add(c, origin){
      if(!c||!c.e)return;
      var q=koQuality(c.e);
      if(!q.ok)return;
      var text=stripPunct(c.e);
      if(!text||seen[text])return;
      seen[text]=1;
      items.push({text:text,vi:c.m||'',hint:(c.p||''),tier:tierKO(q.tokens.length),
        tokens:q.tokens,src:'ko:'+(c.id||'?'),cardId:c.id,
        learned:origin==='learned',origin:origin});
    }
    var t1d=[], t1o=[], t2d=[], t2g=[], t3=[];
    cards.forEach(function(c){
      if(!c)return;
      /* Learned tier keeps the V51 deck preference (koDeckFirst):
         selected-deck learned cards first, the rest after. */
      if((c.box||0)>=1){if(deck&&(c.d||'')===deck)t1d.push(c);else t1o.push(c)}
      else if(deck&&(c.d||'')===deck)t2d.push(c);
      else if(c.g&&learnedGroups[c.g])t2g.push(c);
      else t3.push(c);
    });
    t1d.forEach(function(c){add(c,'learned')});
    t1o.forEach(function(c){add(c,'learned')});
    t2d.forEach(function(c){add(c,'deck')});
    t2g.forEach(function(c){add(c,'group')});
    t3.forEach(function(c){add(c,'other')});
    var primary=0, tier3=0, learnedItems=0;
    items.forEach(function(it){
      if(it.origin==='other')tier3++;
      else primary++;
      if(it.learned)learnedItems++;
    });
    /* The selected set (learned + same group/deck) is short of a
       full session (5): supplement from the nearest group (tier 3)
       and say so — never silently. */
    var supplemented=primary<5&&tier3>0;
    var notice=supplemented?{supplemented:true,primary:primary,
      added:Math.min(5-primary,tier3),tier3:tier3,total:items.length}:null;
    return {items:items,learned:learnedCount,koSent:items.length,
      primary:primary,learnedItems:learnedItems,
      unlearnedItems:items.length-learnedItems,notice:notice};
  }catch(e){return null}
}

/* Session draw for KO: priority-first (learned → deck → group →
   other unlearned) up to n items, then ladder order
   (2–3 tokens, then 4–5, then 6+), shuffled within each band.
   Returns null when nothing can be drawn — the caller falls
   back to shuffle. Never throws. */
function koOrderSession(items, n){
  try{
    if(!items||!items.length)return null;
    n=n||5;
    var rank={'learned':0,'deck':1,'group':2,'other':3};
    var byRank=[[],[],[],[]];
    items.forEach(function(it){
      var r=rank[it.origin];if(r===undefined)r=3;byRank[r].push(it);
    });
    var picked=[];
    for(var i=0;i<4&&picked.length<n;i++){
      var g=shuffle(byRank[i]);
      for(var j=0;j<g.length&&picked.length<n;j++)picked.push(g[j]);
    }
    if(!picked.length)return null;
    var bands=[[],[],[]];
    picked.forEach(function(it){bands[bandKO(it.tokens.length)-1].push(it)});
    var out=[];
    bands.forEach(function(b){out=out.concat(shuffle(b))});
    return out;
  }catch(e){return null}
}

window.__v53={
  version:VERSION,
  koQuality:koQuality,koPool53:koPool53,bandKO:bandKO,
  koOrderSession:koOrderSession,tierKO:tierKO,
  stripPunct:stripPunct,tokensOf:tokensOf
};
})();
