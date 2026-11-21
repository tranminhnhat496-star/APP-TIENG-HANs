/* ================================================================
   Korean & English Vocab Farm — V48 (V19.3 SENTENCE FORGE)
   Layer V48: additive feature layer, version 19.3.0, loads LAST.
   Claude's V19.1 proposal (renamed V19.3 — V19.2 shipped first
   as the round-4 fix), build order: Forge -> Bounty -> Family
   Tree -> Dojo -> boss (Hangul Golem). EACH feature has its own
   feature flag (en48.flags, on by default, kill-switchable via
   __v48.setFlag) so a new-feature bug can't take down the game.

   1) Sentence Forge (Lò Rèn Câu): arrange shuffled tokens into
      the correctly ordered sentence. A SEPARATE practice mode,
      NOT an SRS algorithm. Sentences come ONLY from real data:
      EN = the real __V15_DATA.builder bank (40 sentences, lv
      A1-B2, with Vietnamese translations); KO = the real example
      sentences stored on the player's own learned Korean cards
      (card.e, Hangul, >=2 tokens). NEVER invented. Gate: EN needs
      >=8 learned EN words (SRS box>=1), KO needs >=8 learned KO
      cards AND >=3 usable example sentences — otherwise an honest
      "learn more words first" state, never fake content. Score =
      tokens x tier (EN tier by lv A1=1/A2=2/B1=3/B2=4; KO tier by
      token count <=4:1, 5-7:2, >=8:3). XP: +2 per correct sentence
      (gain15 — the ONE per-answer channel) + at most ONE
      claimed-guarded session bonus (+10 XP at >=4/5 correct,
      key 'sess:'+sessionId, once per session, never stacked).
   2) Bounty Board (Bảng Truy Nã): daily/weekly quests with
      concrete goals (see __V48_DATA.bountyDaily/Weekly), streaks
      (consecutive days with >=1 correct Forge sentence), reward
      chests. Progress counts ONLY real V48 events. Rewards are
      claimed-guarded per period (daily key = date string, weekly
      key = ISO week) — a chest can never pay twice in its period.
   3) Word Family Tree (Cây Họ Từ): relations derived ONLY from
      real data — same topic (EN: same t / shared a1a2Topic; KO:
      same deck d / same topic g), same part of speech, same level.
      Synonyms / antonyms / Sino-Korean roots have NO source data
      in the game, so those branches show an honest empty state,
      NEVER invented relations. A branch completes when every
      shown word (max 8) is mastered (box>=3); +10 XP once per
      (word, branch), claimed-guarded in en48.tree.claimed.
   4) Pronunciation Dojo (Võ Đường Phát Âm): listen and repeat.
      speechSynthesis speaks the word; webkitSpeechRecognition
      scores it Tốt/Khá/Lệch when the browser supports it AND the
      user grants the microphone; otherwise the honest
      self-assessment fallback (no fake grade — self-assessed
      attempts are recorded as "Tự đánh giá", never as Tốt/Khá/
      Lệch). Advanced tier (EN B1/B2, KO >=3 syllables) unlocks
      only after the first Hangul Golem win (derived from the real
      en19 win record, never faked). Dojo pays NO per-attempt XP;
      its rewards come only through Bounty chests.
   5) Boss: Hangul Golem, Chúa Tể Phụ Âm — Lv 77, HP 620 (see
      v48_data.js: Lv 58 is TAKEN by v11_butterflyqueen; V11
      lv 31-60, V10 lv 1-30, Chrono lv 61-68, Skyroot lv 69-76 —
      no free level in 32-76, nearest free is 77). Rides the V19
      Universal Combat Engine (mode 'mixed': builder assembly +
      listen rotation; KO maps to mc/type/listen). Weak to
      LISTENING questions (V34 'listen' kind — correct answers on
      listen-mode questions fill the Break meter). Unlock: 70 boss
      wins (the same corrected count as the Chrono gate). First
      win drops 'Bùa Phát Âm Cao Cấp' and unlocks the advanced
      Dojo tier. Wins land in en19; TOTAL_BOSSES 86 -> 87 (v21.js).

   ENTRY: EN Hub decorator (MutationObserver, V33/V35 precedent)
   + KO build-time button (V11.1/V27/V33 precedent — injected by
   the build script, never by this file). Overlay z-index 1500
   (same as V33/V35). New save key S.v7.en48 (lazy, no migration;
   merge branch + hasProgress entry in v20_sync.js, V33/V35
   pattern). No new currency, no energy system, no schema change
   to any existing key.

   RULES (per vocab_farm_versioned_builds skill): IIFE, 'use
   strict', try/catch around everything, other layers only through
   window.__vNN with guards, never edit another layer's source,
   never change a schema, localStorage key, Firestore path, XP/
   gold/gems, boss/pet/vocab/SRS data, or working game logic. The
   V6 save object is a top-level `let S` (NOT a window property)
   — read it via bare S in try/catch, never via a window property
   (the V11.1 lesson). No new localStorage key. ================================================================ */
(function(){
'use strict';
var VERSION='19.3.0';
var GATE_TOTAL=70;
var GOLEM_ID='v18_golem';
var FORGE_MIN_LEARNED=8, FORGE_MIN_KO_SENT=3, FORGE_SESSION_N=5;
var FORGE_CORRECT_XP=2, FORGE_BONUS_XP=10, FORGE_BONUS_MIN=4;
var TREE_BRANCH_XP=10, TREE_BRANCH_MAX=8;
function D48(){try{return window.__V48_DATA||{}}catch(e){return {}}}
function V15(){try{return window.__v15||null}catch(e){return null}}
function V19(){try{return window.__v19||null}catch(e){return null}}
function V27(){try{return window.__v27||null}catch(e){return null}}
function getS(){try{return S}catch(e){return null}}
function esc(s){try{var v=V15();if(v&&v.esc)return v.esc(s)}catch(e){}return String(s==null?'':s)}
function pop48(t){try{var v=V15();if(v&&v.pop15){v.pop15(t);return}}catch(e){}try{if(window.console&&console.log)console.log('[V48] '+t)}catch(e){}}
function save48(){try{var v=V15();if(v&&v.save15)v.save15();}catch(e){}}
function gain48(n){try{var v=V15();if(v&&v.gain15)v.gain15(n);}catch(e){}}
function addGems(n){try{var s=getS();if(s){s.v7=s.v7||{};s.v7.gems=(s.v7.gems||0)+n}}catch(e){}}
function todayStr(){try{return new Date().toDateString()}catch(e){return ''}}
function dayKey(d){d=d||new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function isoWeek(d){
  try{
    var t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
    var day=(t.getUTCDay()+6)%7; t.setUTCDate(t.getUTCDate()-day+3);
    var first=new Date(Date.UTC(t.getUTCFullYear(),0,4));
    var fday=(first.getUTCDay()+6)%7; first.setUTCDate(first.getUTCDate()-fday+3);
    var w=1+Math.round((t-first)/(7*864e5));
    return t.getUTCFullYear()+'-W'+('0'+w).slice(-2);
  }catch(e){return 'W?'}
}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}

/* ---------- en48 state (lazy, no migration) ---------- */
function defEn48(){return {created:Date.now(),forge:{correct:0,streak:0,bestStreak:0,sessions:0,lastDay:'',correctByDay:{},dayBestStreak:{},bonusClaimed:{}},dojo:{attempts:0,good:0,selfOk:0,attemptsByDay:{}},tree:{claimed:{}},bounty:{claimed:{},streak:{d:'',n:0}},dojoUnlocked:0,flags:{forge:1,bounty:1,tree:1,dojo:1,boss:1}}}
function en48(){
  try{
    var s=getS();if(!s)return defEn48();
    s.v7=s.v7||{};
    var e=s.v7.en48;
    if(!e)e=s.v7.en48=defEn48();
    e.forge=e.forge||{correct:0,streak:0,bestStreak:0,sessions:0,lastDay:'',correctByDay:{},dayBestStreak:{},bonusClaimed:{}};
    e.forge.correctByDay=e.forge.correctByDay||{};e.forge.dayBestStreak=e.forge.dayBestStreak||{};e.forge.bonusClaimed=e.forge.bonusClaimed||{};
    e.dojo=e.dojo||{attempts:0,good:0,selfOk:0,attemptsByDay:{}};e.dojo.attemptsByDay=e.dojo.attemptsByDay||{};
    e.tree=e.tree||{claimed:{}};e.tree.claimed=e.tree.claimed||{};
    e.bounty=e.bounty||{claimed:{},streak:{d:'',n:0}};e.bounty.claimed=e.bounty.claimed||{};e.bounty.streak=e.bounty.streak||{d:'',n:0};
    e.flags=e.flags||{forge:1,bounty:1,tree:1,dojo:1,boss:1};
    return e;
  }catch(err){return defEn48()}
}
function flagOn(name){try{var e=en48();return e.flags[name]!==0}catch(err){return true}}
function setFlag(name,on){
  var names=['forge','bounty','tree','dojo','boss'];
  if(names.indexOf(name)<0)return false;
  try{var e=en48();e.flags[name]=on?1:0;save48();return true}catch(err){return false}
}

/* ---------- learned words (real SRS data only) ---------- */
function learnedEN(){
  try{
    var v=V15();if(!v||!v.words)return [];
    var old=v.enOld? v.enOld():{},box=(old&&old.box)||{};
    return v.words.filter(function(w){return (box[w.id]||0)>=1});
  }catch(e){return []}
}
function learnedKO(){
  try{
    var s=getS();if(!s||!s.cards)return [];
    return s.cards.filter(function(c){return (c.box||0)>=1});
  }catch(e){return []}
}
function masteredEN(id){
  try{var v=V15();if(!v||!v.enOld)return false;var box=(v.enOld().box)||{};return (box[id]||0)>=3}catch(e){return false}
}
function masteredKO(id){
  try{var s=getS();if(!s||!s.cards)return false;for(var i=0;i<s.cards.length;i++)if(s.cards[i].id===id)return (s.cards[i].box||0)>=3;return false}catch(e){return false}
}

/* ---------- Sentence Forge ---------- */
function stripPunct(s){return String(s||'').replace(/[.!?]+$/,'').replace(/^\s+|\s+$/g,'')}
function tokensOf(s){return stripPunct(s).split(/\s+/).filter(function(x){return x})}
function tierEN(lv){return {A1:1,A2:2,B1:3,B2:4}[lv]||1}
function tierKO(n){return n<=4?1:(n<=7?2:3)}
function scoreSentence(nTokens,tier){return nTokens*tier}
/* EN pool: the real builder bank, nothing else. KO pool: real
   example sentences on the player's OWN learned cards (Hangul,
   >=2 tokens). Returns {items:[{text,vi,hint,tier,tokens,src}],
   learned, koSent} — callers show the honest gate when empty. */
function forgePool(lang){
  var out={items:[],learned:0,koSent:0};
  try{
    if(lang==='ko'){
      var cards=learnedKO();out.learned=cards.length;
      cards.forEach(function(c){
        var e=String(c.e||'');
        if(!/[\uAC00-\uD7A3]/.test(e))return;
        var tk=tokensOf(e);
        if(tk.length<2)return;
        out.koSent++;
        out.items.push({text:stripPunct(e),vi:c.m||'',hint:(c.p||''),tier:tierKO(tk.length),tokens:tk,src:'ko:'+(c.id||'?'),cardId:c.id});
      });
    }else{
      out.learned=learnedEN().length;
      var bank=(window.__V15_DATA&&__V15_DATA.builder)||[];
      bank.forEach(function(b){
        if(!b||!b.s)return;
        var tk=tokensOf(b.s);
        if(tk.length<2)return;
        out.items.push({text:stripPunct(b.s),vi:b.vi||'',hint:'',tier:tierEN(b.lv),tokens:tk,src:'builder:'+(b.lv||'?'),lv:b.lv||''});
      });
    }
  }catch(e){}
  return out;
}
function forgeGate(lang){
  var p=forgePool(lang);
  if(lang==='ko'){
    if(p.learned<FORGE_MIN_LEARNED)return {ok:false,why:'ko-words',learned:p.learned,need:FORGE_MIN_LEARNED,koSent:p.koSent};
    if(p.koSent<FORGE_MIN_KO_SENT)return {ok:false,why:'ko-sent',learned:p.learned,need:FORGE_MIN_LEARNED,koSent:p.koSent};
  }else{
    if(p.learned<FORGE_MIN_LEARNED)return {ok:false,why:'en-words',learned:p.learned,need:FORGE_MIN_LEARNED,koSent:0};
    if(!p.items.length)return {ok:false,why:'no-bank',learned:p.learned,need:FORGE_MIN_LEARNED,koSent:0};
  }
  return {ok:true,pool:p};
}
/* Session state (in-memory only — never saved mid-session). */
var FS=null;
function startForgeSession(lang){
  var g=forgeGate(lang);
  if(!g.ok)return {ok:false,gate:g};
  var items=shuffle(g.pool.items).slice(0,FORGE_SESSION_N);
  FS={lang:lang,list:items,i:0,built:[],used:{},right:0,streak:0,checked:false,ok:null,sessionId:'f'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36),done:false,bonusPaid:0};
  return {ok:true,session:FS};
}
function forgeCurrent(){return FS&&FS.list?FS.list[FS.i]:null}
function forgeTap(idx){
  if(!FS||FS.done||FS.checked)return false;
  var cur=forgeCurrent();if(!cur)return false;
  var tiles=FS.tiles||(FS.tiles=shuffle(cur.tokens.map(function(t,i){return {t:t,k:i}})));
  if(FS.used[idx])return false;
  FS.used[idx]=1;FS.built.push(tiles[idx].t);
  return true;
}
function forgeClear(){if(FS&&!FS.done){FS.built=[];FS.used={}}}
function forgeCheck(){
  if(!FS||FS.done||FS.checked)return null;
  var cur=forgeCurrent();if(!cur)return null;
  var built=FS.built.join(' ');
  var ok=built===cur.text;
  FS.checked=true;FS.ok=ok;
  var e=en48();
  if(ok){
    FS.right++;FS.streak++;
    if(FS.streak>(e.forge.bestStreak||0))e.forge.bestStreak=FS.streak;
    var dk=dayKey();
    e.forge.correct++;
    e.forge.correctByDay[dk]=(e.forge.correctByDay[dk]||0)+1;
    if((e.forge.dayBestStreak[dk]||0)<FS.streak)e.forge.dayBestStreak[dk]=FS.streak;
    /* Daily Forge streak: consecutive days with >=1 correct. */
    var st=e.bounty.streak||{d:'',n:0};
    if(st.d!==dk){
      var y=new Date();y.setDate(y.getDate()-1);
      st.n=(st.d===dayKey(y))?(st.n||0)+1:1;st.d=dk;e.bounty.streak=st;
    }
    gain48(FORGE_CORRECT_XP);
  }else{
    FS.streak=0;
  }
  save48();
  return {ok:ok,built:built,target:cur.text,score:ok?scoreSentence(cur.tokens.length,cur.tier):0};
}
function forgeNext(){
  if(!FS)return null;
  if(FS.i+1>=FS.list.length){
    FS.done=true;
    var e=en48();
    e.forge.sessions++;
    var bonus=0;
    if(FS.right>=FORGE_BONUS_MIN&&!e.forge.bonusClaimed['sess:'+FS.sessionId]){
      e.forge.bonusClaimed['sess:'+FS.sessionId]=1;
      gain48(FORGE_BONUS_XP);bonus=FORGE_BONUS_XP;FS.bonusPaid=bonus;
    }
    save48();
    return {done:true,right:FS.right,total:FS.list.length,bonus:bonus};
  }
  FS.i++;FS.built=[];FS.used={};FS.tiles=null;FS.checked=false;FS.ok=null;
  return {done:false};
}

/* ---------- Bounty Board ---------- */
function bountyQuests(){var d=D48();return {daily:(d.bountyDaily||[]).slice(),weekly:(d.bountyWeekly||[]).slice()}}
function _sumWeek(map,week){
  var n=0;
  for(var k in map){try{var p=k.split('-');var dt=new Date(+p[0],+p[1]-1,+p[2]);if(isoWeek(dt)===week)n+=map[k]||0}catch(e){}}
  return n;
}
function bountyProgress(q){
  try{
    var e=en48(),dk=dayKey(),wk=isoWeek(new Date());
    switch(q.key){
      case 'forgeDay':return e.forge.correctByDay[dk]||0;
      case 'forgeWeek':return _sumWeek(e.forge.correctByDay,wk);
      case 'forgeStreak':return e.forge.dayBestStreak[dk]||0;
      case 'forgeStreakDays':{var st=e.bounty.streak||{d:'',n:0};if(!st.d)return 0;var y=new Date();y.setDate(y.getDate()-1);return (st.d===dk||st.d===dayKey(y))?(st.n||0):0}
      case 'dojoDay':return e.dojo.attemptsByDay[dk]||0;
      case 'dojoWeek':return _sumWeek(e.dojo.attemptsByDay,wk);
      case 'treeDay':{var n=0;for(var k in e.tree.claimed){if(dayKey(new Date(e.tree.claimed[k]||0))===dk)n++}return n}
      case 'treeWeek':{var m=0;for(var k2 in e.tree.claimed){if(isoWeek(new Date(e.tree.claimed[k2]||0))===wk)m++}return m}
      default:return 0;
    }
  }catch(err){return 0}
}
function bountyState(q,period){
  var p=bountyProgress(q),done=p>=(q.goal||1);
  var key=(period==='weekly'?isoWeek(new Date()):dayKey())+':'+q.id;
  var claimed=false;
  try{claimed=!!en48().bounty.claimed[key]}catch(e){}
  return {progress:p,goal:q.goal||1,done:done,claimed:claimed,key:key};
}
function claimBounty(qid,period){
  try{
    var all=bountyQuests(),q=null;
    (period==='weekly'?all.weekly:all.daily).forEach(function(x){if(x.id===qid)q=x});
    if(!q)return {ok:false,msg:'Không tìm thấy nhiệm vụ.'};
    var st=bountyState(q,period);
    if(!st.done)return {ok:false,msg:'Nhiệm vụ chưa hoàn thành ('+st.progress+'/'+st.goal+').'};
    if(st.claimed)return {ok:false,msg:'Đã nhận thưởng nhiệm vụ này rồi.'};
    var e=en48();
    e.bounty.claimed[st.key]=1;
    gain48(q.xp||0);if(q.gems)addGems(q.gems);
    save48();
    return {ok:true,msg:'Nhận rương truy nã: +'+(q.xp||0)+' XP'+(q.gems?' +'+q.gems+' 💎':'')+'!'};
  }catch(err){return {ok:false,msg:'Không nhận được thưởng.'}}
}

/* ---------- Word Family Tree ---------- */
/* Relations come ONLY from real data. EN: same topic (t or shared
   a1a2Topic), same part of speech, same level. KO: same deck (d),
   same topic (g). Synonyms / antonyms / Sino-Korean roots have no
   source data — those branches are honest empty states. */
function treeRelations(wordId,lang){
  var out={topic:[],pos:[],level:[],syn:[],ant:[],sino:[],word:null};
  try{
    if(lang==='ko'){
      var s=getS();if(!s||!s.cards)return out;
      var me=null;for(var i=0;i<s.cards.length;i++)if(s.cards[i].id===wordId){me=s.cards[i];break}
      if(!me)return out;
      out.word={id:me.id,head:me.h,mean:me.m,roman:me.p||'',kind:'ko'};
      var deck=[],topic=[];
      s.cards.forEach(function(c){
        if(c.id===me.id)return;
        if(me.d&&c.d===me.d)deck.push({id:c.id,head:c.h,mean:c.m});
        else if(me.g&&c.g===me.g)topic.push({id:c.id,head:c.h,mean:c.m});
      });
      out.topic=topic.slice(0,TREE_BRANCH_MAX);
      out.pos=deck.slice(0,TREE_BRANCH_MAX);
      out.level=[];
    }else{
      var v=V15();if(!v||!v.words)return out;
      var w=null;for(var j=0;j<v.words.length;j++)if(v.words[j].id===wordId){w=v.words[j];break}
      if(!w)return out;
      out.word={id:w.id,head:w.en,mean:w.vi,ipa:w.ipa||'',pos:w.pos||'',kind:'en'};
      var topics=(w.a1a2Topics||[]).slice();if(w.t)topics.push(w.t);
      var tp=[],pp=[],ll=[];
      v.words.forEach(function(x){
        if(x.id===w.id)return;
        var shared=false;
        if(x.t&&topics.indexOf(x.t)>=0)shared=true;
        if(!shared&&(x.a1a2Topics||[]).some(function(t){return topics.indexOf(t)>=0}))shared=true;
        if(shared)tp.push({id:x.id,head:x.en,mean:x.vi});
        else if(w.pos&&x.pos===w.pos)pp.push({id:x.id,head:x.en,mean:x.vi});
        else if(w.lv&&x.lv===w.lv)ll.push({id:x.id,head:x.en,mean:x.vi});
      });
      out.topic=tp.slice(0,TREE_BRANCH_MAX);
      out.pos=pp.slice(0,TREE_BRANCH_MAX);
      out.level=ll.slice(0,TREE_BRANCH_MAX);
    }
  }catch(e){}
  return out;
}
function treeBranchDone(wordId,kind,lang){
  try{
    var r=treeRelations(wordId,lang),list=r[kind]||[];
    if(!list.length)return false;
    for(var i=0;i<list.length;i++){
      if(lang==='ko'){if(!masteredKO(list[i].id))return false}
      else if(!masteredEN(list[i].id))return false;
    }
    return true;
  }catch(e){return false}
}
function claimTreeBranch(wordId,kind,lang){
  try{
    if(['topic','pos','level'].indexOf(kind)<0)return {ok:false,msg:'Nhánh này chưa có dữ liệu thật để hoàn thành.'};
    if(!treeBranchDone(wordId,kind,lang))return {ok:false,msg:'Chưa hoàn thành nhánh — cần thuộc hết các từ trong nhánh (box 3).'};
    var key=wordId+':'+kind, e=en48();
    if(e.tree.claimed[key])return {ok:false,msg:'Đã nhận thưởng nhánh này rồi.'};
    e.tree.claimed[key]=Date.now();
    gain48(TREE_BRANCH_XP);
    save48();
    return {ok:true,msg:'Hoàn thành nhánh cây: +'+TREE_BRANCH_XP+' XP!'};
  }catch(err){return {ok:false,msg:'Không nhận được thưởng.'}}
}

/* ---------- Pronunciation Dojo ---------- */
function lev(a,b){
  a=a||'';b=b||'';
  if(a===b)return 0;
  var m=a.length,n=b.length;
  if(!m)return n;if(!n)return m;
  var d=[];for(var i=0;i<=m;i++){d[i]=[i];for(var j=1;j<=n;j++)d[i][j]=0}
  for(var j2=1;j2<=n;j2++)d[0][j2]=j2;
  for(var i2=1;i2<=m;i2++)for(var j3=1;j3<=n;j3++)d[i2][j3]=Math.min(d[i2-1][j3]+1,d[i2][j3-1]+1,d[i2-1][j3-1]+(a[i2-1]===b[j3-1]?0:1));
  return d[m][n];
}
function normText(s,lang){
  s=String(s||'').toLowerCase().replace(/[.,!?;:'"()\-]/g,'').replace(/\s+/g,' ').replace(/^\s+|\s+$/g,'');
  if(lang==='ko')s=s.replace(/[^a-z0-9\uAC00-\uD7A3\u1100-\u11FF ]/g,'');
  return s;
}
function gradeTranscript(target,heard,lang){
  var a=normText(target,lang),b=normText(heard,lang);
  if(!a||!b)return {grade:'Lệch',sim:0};
  if(a===b)return {grade:'Tốt',sim:1};
  var sim=1-lev(a,b)/Math.max(a.length,b.length);
  return {grade:sim>=0.85?'Tốt':(sim>=0.6?'Khá':'Lệch'),sim:Math.round(sim*100)/100};
}
function dojoPool(lang,advanced){
  var out=[];
  try{
    if(lang==='ko'){
      learnedKO().forEach(function(c){
        var adv=(c.h||'').length>=3;
        if(advanced?adv:!adv)out.push({id:c.id,head:c.h,mean:c.m,roman:c.p||'',kind:'ko',advanced:adv});
      });
    }else{
      var learned=learnedEN();
      learned.forEach(function(w){
        var adv=(w.lv==='B1'||w.lv==='B2');
        if(advanced?adv:!adv)out.push({id:w.id,head:w.en,mean:w.vi,ipa:w.ipa||'',kind:'en',advanced:adv});
      });
    }
  }catch(e){}
  return out;
}
function dojoGate(lang,advanced){
  var base=dojoPool(lang,false),adv=dojoPool(lang,true);
  if(!base.length&&!adv.length)return {ok:false,why:'no-words'};
  if(advanced&&!en48().dojoUnlocked)return {ok:false,why:'locked-advanced'};
  if(advanced&&!adv.length)return {ok:false,why:'no-advanced'};
  return {ok:true,pool:advanced?adv:base};
}
function speakText(text,lang){
  try{
    if(typeof speechSynthesis==='undefined')return false;
    speechSynthesis.cancel();
    var u=new SpeechSynthesisUtterance(text);
    u.lang=(lang==='ko'?'ko-KR':'en-US');
    speechSynthesis.speak(u);
    return true;
  }catch(e){return false}
}
function srAvailable(){
  try{return !!(window.SpeechRecognition||window.webkitSpeechRecognition)}catch(e){return false}
}
var DS=null;
function startDojo(lang,advanced){
  var g=dojoGate(lang,!!advanced);
  if(!g.ok)return {ok:false,gate:g};
  var pick=shuffle(g.pool)[0];
  DS={lang:lang,advanced:!!advanced,word:pick,heard:'',grade:null,sim:0,mode:'idle',self:null,listening:false};
  return {ok:true,dojo:DS};
}
function dojoListen(){
  if(!DS||!DS.word)return {ok:false,why:'no-word'};
  speakText(DS.word.head,DS.lang);
  if(!srAvailable()){DS.mode='self';return {ok:false,why:'no-sr',mode:'self'}}
  try{
    var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    var rec=new SR();
    rec.lang=(DS.lang==='ko'?'ko-KR':'en-US');
    rec.interimResults=false;rec.maxAlternatives=1;
    DS.listening=true;DS.mode='listen';
    rec.onresult=function(ev){
      try{
        var t='';if(ev.results&&ev.results[0]&&ev.results[0][0])t=ev.results[0][0].transcript||'';
        DS.heard=t;DS.listening=false;
        var g=gradeTranscript(DS.word.head,t,DS.lang);
        DS.grade=g.grade;DS.sim=g.sim;DS.mode='graded';
        recordDojoAttempt(g.grade==='Tốt',false);
        rerender();
      }catch(e){}
    };
    rec.onerror=function(){DS.listening=false;if(!DS.grade){DS.mode='self';rerender()}};
    rec.onend=function(){DS.listening=false;if(!DS.grade&&DS.mode==='listen'){DS.mode='self';rerender()}};
    rec.start();
    return {ok:true,mode:'listen'};
  }catch(e){DS.mode='self';return {ok:false,why:'sr-error',mode:'self'}}
}
function dojoSelf(ok){
  if(!DS||!DS.word)return {ok:false};
  DS.self=ok?'Đúng':'Chưa đúng';DS.mode='self-done';
  recordDojoAttempt(false,true);
  rerender();
  return {ok:true};
}
function recordDojoAttempt(good,self){
  try{
    var e=en48(),dk=dayKey();
    e.dojo.attempts++;
    e.dojo.attemptsByDay[dk]=(e.dojo.attemptsByDay[dk]||0)+1;
    if(good)e.dojo.good++;
    if(self)e.dojo.selfOk++;
    save48();
  }catch(err){}
}

/* ---------- Hangul Golem boss ---------- */
function correctedWinCount48(){
  try{if(window.__v33&&__v33.correctedWinCount)return __v33.correctedWinCount()}catch(e){}
  try{
    var s=getS();if(!s||!s.v7)return 0;
    var n=0;
    try{n+=Object.keys((s.v7.en15&&s.v7.en15.bosses)||{}).length}catch(e2){}
    ['en18','en19'].forEach(function(k){
      var b=s.v7[k]&&s.v7[k].bosses;if(!b)return;
      for(var id in b){var r=b[id]||{};if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win))n++}
    });
    return n;
  }catch(e){return 0}
}
function bossUnlocked48(id,lang){
  if(id!==GOLEM_ID)return false;
  if(!flagOn('boss'))return false;
  return correctedWinCount48()>=GATE_TOTAL;
}
function isWon48(id,lang){try{var v=V19();return v?v.isWon(id,lang):false}catch(e){return false}}
function stars48(id,lang){try{var v=V19();return v?v.stars(id,lang):0}catch(e){return 0}}
function syncDojoUnlock(){
  try{
    var e=en48();
    if(!e.dojoUnlocked){
      var v=V19();
      if(v&&(v.isWon(GOLEM_ID,'en')||v.isWon(GOLEM_ID,'ko'))){e.dojoUnlocked=1;save48()}
    }
    return !!e.dojoUnlocked;
  }catch(err){return false}
}
function fightBoss48(id){
  var lang=ST.lang||'en';
  if(!bossUnlocked48(id,lang)){pop48('Hangul Golem cần thắng đủ 70 boss ('+correctedWinCount48()+'/70).');return false}
  var v=V19();if(!v){pop48('Chưa tải được hệ thống Boss (V19).');return false}
  try{v.setLang(lang)}catch(e){}
  closeForge();
  try{v.fight(id)}catch(e){pop48('Không mở được trận đấu.');return false}
  return true;
}

/* ---------- overlay UI ---------- */
var ST={lang:'en',tab:'forge'};
var TS={wordId:null,lang:'en'};
function ensureHub(){
  var h=null;
  try{h=document.getElementById('v48hub')}catch(e){}
  if(h)return h;
  h=document.createElement('div');
  h.id='v48hub';h.className='v48hub';h.style.display='none';
  h.setAttribute('role','dialog');h.setAttribute('aria-label','Sentence Forge — Lò Rèn Câu');
  document.body.appendChild(h);
  return h;
}
function tabBtn(id,label,on){return '<button type="button" class="v48tab'+(on?' on':'')+'" onclick="window.__v48.setTab(\''+id+'\')">'+label+'</button>'}
function flagOffHTML(name){
  return '<div class="v48empty">Tính năng này đang tạm tắt (cờ '+esc(name)+'). Bật lại bằng <b>__v48.setFlag(\''+esc(name)+'\', true)</b> hoặc từ lần cập nhật sau.</div>';
}
function overlayHTML(){
  syncDojoUnlock();
  var lang=ST.lang;
  var h='<div class="v48in">'
    +'<div class="v48head"><div class="v48title"><b>🔨 Sentence Forge — Lò Rèn Câu</b><span>Lò Rèn Câu · Bảng Truy Nã · Cây Họ Từ · Võ Đường Phát Âm · V19.3</span></div>'
    +'<button type="button" class="v48x" onclick="window.__v48.closeForge()" aria-label="Đóng">✕</button></div>'
    +'<div class="v48lang" role="group" aria-label="Chọn ngôn ngữ">'
    +'<button type="button" class="v48langbtn'+(lang==='en'?' on':'')+'" onclick="window.__v48.setLang(\'en\')">🇬🇧 Tiếng Anh</button>'
    +'<button type="button" class="v48langbtn'+(lang==='ko'?' on':'')+'" onclick="window.__v48.setLang(\'ko\')">🇰🇷 Tiếng Hàn</button></div>'
    +'<div class="v48tabs" role="tablist">'
    +tabBtn('forge','🔨 Lò Rèn Câu',ST.tab==='forge')
    +tabBtn('bounty','🎯 Bảng Truy Nã',ST.tab==='bounty')
    +tabBtn('tree','🌳 Cây Họ Từ',ST.tab==='tree')
    +tabBtn('dojo','🥋 Võ Đường Phát Âm',ST.tab==='dojo')
    +tabBtn('boss','👹 Hangul Golem',ST.tab==='boss')
    +'</div>';
  if(ST.tab==='forge')h+=forgeHTML();
  else if(ST.tab==='bounty')h+=bountyHTML();
  else if(ST.tab==='tree')h+=treeHTML();
  else if(ST.tab==='dojo')h+=dojoHTML();
  else h+=bossHTML();
  h+='</div>';
  return h;
}
function forgeHTML(){
  if(!flagOn('forge'))return flagOffHTML('forge');
  var lang=ST.lang;
  if(!FS){
    var g=forgeGate(lang);
    if(!g.ok){
      if(g.why==='ko-words'||g.why==='en-words')return '<div class="v48empty">Học thêm từ trước đã — Lò Rèn Câu cần ít nhất '+FORGE_MIN_LEARNED+' từ đã học ('+(lang==='ko'?'tiếng Hàn':'tiếng Anh')+'). Bạn mới có '+g.learned+' từ. Học từ qua Học / Ôn SRS rồi quay lại đây nhé.</div>';
      if(g.why==='ko-sent')return '<div class="v48empty">Bạn đã học '+g.learned+' từ tiếng Hàn, nhưng mới có '+g.koSent+' câu ví dụ thật (cần ít nhất '+FORGE_MIN_KO_SENT+'). Học thêm từ có câu ví dụ rồi quay lại nhé — Lò Rèn Câu không tự bịa câu.</div>';
      return '<div class="v48empty">Chưa có câu thật để rèn — học thêm từ trước đã.</div>';
    }
    var e0=en48();
    return '<div class="v48card"><b>🔨 Lò Rèn Câu ('+(lang==='ko'?'🇰🇷 Tiếng Hàn':'🇬🇧 Tiếng Anh')+')</b>'
      +'<p class="v48mut">Xếp các mảnh từ thành câu đúng thứ tự. Điểm = số từ × hệ số độ khó. Mỗi câu đúng +'+FORGE_CORRECT_XP+' XP; đúng ≥'+FORGE_BONUS_MIN+'/'+FORGE_SESSION_N+' câu trong một buổi thêm +'+FORGE_BONUS_XP+' XP (một lần mỗi buổi).</p>'
      +'<p class="v48mut">Đã học: '+g.pool.learned+' từ · Đúng tổng: '+e0.forge.correct+' · Chuỗi ngày rèn: '+(e0.bounty.streak.n||0)+' · Câu đúng kỷ lục liên tiếp: '+(e0.forge.bestStreak||0)+'</p>'
      +'<button type="button" class="v48btn pri" onclick="window.__v48.startForge()">Bắt đầu rèn ('+FORGE_SESSION_N+' câu)</button></div>';
  }
  if(FS.done){
    return '<div class="v48card"><b>🎉 Xong buổi rèn!</b>'
      +'<p class="v48mut">Đúng '+FS.right+'/'+FS.list.length+' câu'+(FS.bonusPaid?' · Thưởng buổi: +'+FS.bonusPaid+' XP':'')+'.</p>'
      +'<button type="button" class="v48btn pri" onclick="window.__v48.startForge()">Rèn buổi mới</button></div>';
  }
  var cur=forgeCurrent();
  if(!cur)return '<div class="v48empty">Hết câu — bắt đầu buổi mới nhé.</div>';
  if(!FS.tiles)FS.tiles=shuffle(cur.tokens.map(function(t,i){return {t:t,k:i}}));
  var h='<div class="v48card"><b>Câu '+(FS.i+1)+'/'+FS.list.length+' · Độ khó ×'+cur.tier+(cur.lv?' · '+esc(cur.lv):'')+'</b>'
    +'<p class="v48mut">Nghĩa: '+esc(cur.vi||'(chưa có nghĩa)')+(cur.hint?' · Đọc: '+esc(cur.hint):'')+'</p>'
    +'<div class="v48built">'+(FS.built.length?FS.built.map(esc).join(' '):'<span class="v48mut">Chạm vào các mảnh từ bên dưới để xếp câu…</span>')+'</div>'
    +'<div class="v48tiles">';
  FS.tiles.forEach(function(tl,idx){
    h+='<button type="button" class="v48tile" '+(FS.used[idx]||FS.checked?'disabled':'')+' onclick="window.__v48.forgeTap('+idx+')">'+esc(tl.t)+'</button>';
  });
  h+='</div>';
  if(FS.checked){
    h+='<p class="v48mut">'+(FS.ok?'✅ Đúng! +'+FORGE_CORRECT_XP+' XP · +'+scoreSentence(cur.tokens.length,cur.tier)+' điểm.':'❌ Chưa đúng. Câu đúng: <b>'+esc(cur.text)+'</b>')+'</p>'
      +'<button type="button" class="v48btn pri" onclick="window.__v48.forgeNext()">'+(FS.i+1>=FS.list.length?'Xem kết quả':'Câu tiếp →')+'</button>';
  }else{
    h+='<div class="v48acts"><button type="button" class="v48btn pri" onclick="window.__v48.forgeCheck()" '+(FS.built.length?'':'disabled')+'>Kiểm tra</button>'
      +'<button type="button" class="v48btn" onclick="window.__v48.forgeClear()">Xóa</button></div>';
  }
  h+='<p class="v48mut">Đúng trong buổi: '+FS.right+' · Chuỗi đúng liên tiếp: '+FS.streak+'</p></div>';
  return h;
}
function bountyHTML(){
  if(!flagOn('bounty'))return flagOffHTML('bounty');
  var qs=bountyQuests(),e=en48();
  var h='<div class="v48card"><b>🎯 Bảng Truy Nã</b><p class="v48mut">Nhiệm vụ ngày làm mới mỗi ngày, nhiệm vụ tuần làm mới mỗi tuần (theo tuần ISO). Rương thưởng chỉ nhận được một lần trong mỗi kỳ. Chuỗi rèn hiện tại: '+(e.bounty.streak.n||0)+' ngày.</p></div>';
  [['daily','Nhiệm vụ ngày'],['weekly','Nhiệm vụ tuần']].forEach(function(pair){
    var period=pair[0];
    h+='<div class="v48sec"><h3>'+pair[1]+'</h3><div class="v48quests">';
    qs[period].forEach(function(q){
      var st=bountyState(q,period);
      h+='<div class="v48quest"><b>'+esc(q.n)+'</b><span class="v48mut">'+esc(q.vi)+'</span>'
        +'<em>'+st.progress+'/'+st.goal+(st.claimed?' · ✅ Đã nhận thưởng':st.done?' · 🎉 Hoàn thành — nhận rương!':'')+'</em>'
        +'<span class="v48mut">Thưởng: +'+q.xp+' XP'+(q.gems?' +'+q.gems+' 💎':'')+'</span>'
        +(st.done&&!st.claimed?'<button type="button" class="v48btn pri" onclick="window.__v48.claimBounty(\''+q.id+'\',\''+period+'\')">Nhận rương</button>':'')
        +'</div>';
    });
    h+='</div></div>';
  });
  return h;
}
function treeHTML(){
  if(!flagOn('tree'))return flagOffHTML('tree');
  var lang=ST.lang, h='';
  var learned=(lang==='ko'?learnedKO():learnedEN());
  if(!learned.length)return '<div class="v48empty">Chưa có từ nào đã học ('+(lang==='ko'?'tiếng Hàn':'tiếng Anh')+') để mở Cây Họ Từ — học vài từ trước đã.</div>';
  var wid=TS.wordId;
  if(!wid||!learned.some(function(w){return (w.id||w.id)===wid}))wid=learned[0].id;
  TS.wordId=wid;TS.lang=lang;
  var r=treeRelations(wid,lang);
  if(!r.word)return '<div class="v48empty">Không tìm thấy từ này.</div>';
  h+='<div class="v48card"><b>🌳 Cây Họ Từ — '+esc(r.word.head)+'</b><p class="v48mut">'+esc(r.word.mean||'')+(r.word.ipa?' · /'+esc(r.word.ipa)+'/':'')+(r.word.roman?' · '+esc(r.word.roman):'')+'</p>'
    +'<p class="v48mut">Chọn từ đã học: <select class="v48sel" onchange="window.__v48.setTreeWord(this.value)">'
    +learned.slice(0,60).map(function(w){var id=w.id,head=(lang==='ko'?w.h:w.en);return '<option value="'+esc(id)+'"'+(id===wid?' selected':'')+'>'+esc(head)+'</option>'}).join('')
    +'</select></p></div>';
  var branches=[
    {kind:'topic',label:(lang==='ko'?'Cùng chủ đề / cùng bộ từ':'Cùng chủ đề'),list:r.topic},
    {kind:'pos',label:(lang==='ko'?'Cùng bộ từ đã chọn':'Cùng loại từ'),list:r.pos},
    {kind:'level',label:(lang==='ko'?'Cùng trình độ':'Cùng cấp độ'),list:r.level}
  ];
  branches.forEach(function(br){
    var done=treeBranchDone(wid,br.kind,lang);
    var claimed=false;try{claimed=!!en48().tree.claimed[wid+':'+br.kind]}catch(e){}
    h+='<div class="v48sec"><h3>'+esc(br.label)+' ('+br.list.length+' từ)</h3>'
      +(br.list.length
        ?'<p class="v48mut">'+br.list.map(function(x){return esc(x.head)}).join(' · ')+'</p><p class="v48mut">Hoàn thành khi thuộc hết các từ trong nhánh (box 3). Thưởng +'+TREE_BRANCH_XP+' XP, một lần mỗi nhánh.</p>'
          +(done?(claimed?'<em>✅ Đã nhận thưởng nhánh này.</em>':'<button type="button" class="v48btn pri" onclick="window.__v48.claimTreeBranch(\''+esc(wid)+'\',\''+br.kind+'\')">Nhận thưởng nhánh (+'+TREE_BRANCH_XP+' XP)</button>')
               :'<em>⏳ Chưa hoàn thành — còn từ chưa thuộc (box &lt; 3).</em>')
        :'<p class="v48mut">Chưa có từ nào cùng nhóm trong dữ liệu thật.</p>')
      +'</div>';
  });
  h+='<div class="v48sec"><h3>Từ đồng nghĩa · Từ trái nghĩa · Gốc Hán–Hàn</h3>'
    +'<p class="v48mut">Chưa có dữ liệu thật cho các quan hệ này trong kho từ của game — Lò Rèn Câu không tự bịa từ đồng nghĩa, trái nghĩa hay gốc Hán–Hàn. Các nhánh này sẽ mở khi kho từ có dữ liệu quan hệ.</p></div>';
  return h;
}
function dojoHTML(){
  if(!flagOn('dojo'))return flagOffHTML('dojo');
  var lang=ST.lang;
  var adv=!!(DS&&DS.advanced);
  var h='<div class="v48card"><b>🥋 Võ Đường Phát Âm ('+(lang==='ko'?'🇰🇷 Tiếng Hàn':'🇬🇧 Tiếng Anh')+')</b>'
    +'<p class="v48mut">Nghe rồi đọc lại. Nếu trình duyệt hỗ trợ nhận dạng giọng nói và bạn cho phép micro, máy sẽ chấm Tốt / Khá / Lệch; nếu không, bạn tự đánh giá — không có điểm giả.</p>'
    +'<p class="v48mut">Cấp thường: từ đã học, dễ. Cấp cao: '+(en48().dojoUnlocked?'đã mở (thắng Hangul Golem)':'🔒 thắng Hangul Golem để mở')+'.</p>'
    +'<div class="v48acts"><button type="button" class="v48btn pri" onclick="window.__v48.startDojo(false)">Luyện cấp thường</button>'
    +'<button type="button" class="v48btn" onclick="window.__v48.startDojo(true)" '+(en48().dojoUnlocked?'':'disabled')+'>Luyện cấp cao</button></div></div>';
  if(!DS||!DS.word)return h;
  var w=DS.word;
  h+='<div class="v48card"><b>'+esc(w.head)+'</b><p class="v48mut">'+esc(w.mean||'')+(w.ipa?' · /'+esc(w.ipa)+'/':'')+(w.roman?' · '+esc(w.roman):'')+(adv?' · Cấp cao':' · Cấp thường')+'</p>'
    +'<div class="v48acts"><button type="button" class="v48btn pri" onclick="window.__v48.dojoListen()">🔊 Nghe &amp; đọc lại</button>'
    +'<button type="button" class="v48btn" onclick="window.__v48.nextDojo()">Từ tiếp →</button></div>';
  if(DS.mode==='listen')h+='<p class="v48mut">🎙️ Đang nghe… hãy đọc to từ trên.</p>';
  if(DS.mode==='graded')h+='<p class="v48mut">Bạn đọc: “'+esc(DS.heard)+'” — <b>'+esc(DS.grade)+'</b> (giống '+(Math.round((DS.sim||0)*100))+'%).</p>';
  if(DS.mode==='self')h+='<p class="v48mut">Trình duyệt này không nhận dạng được giọng nói (hoặc chưa cho phép micro) — hãy tự đánh giá thật lòng:</p>'
    +'<div class="v48acts"><button type="button" class="v48btn pri" onclick="window.__v48.dojoSelf(true)">Tôi đọc đúng</button>'
    +'<button type="button" class="v48btn" onclick="window.__v48.dojoSelf(false)">Tôi đọc chưa đúng</button></div>';
  if(DS.mode==='self-done')h+='<p class="v48mut">Đã ghi: Tự đánh giá — '+esc(DS.self||'')+'. (Không chấm điểm giả.)</p>';
  h+='<p class="v48mut">Lượt luyện: '+en48().dojo.attempts+' · Chấm Tốt: '+en48().dojo.good+' · Tự đánh giá đúng: '+en48().dojo.selfOk+'</p></div>';
  return h;
}
function bossHTML(){
  var lang=ST.lang, b=(D48().boss||null);
  if(!b)return '<div class="v48empty">Chưa tải được dữ liệu boss.</div>';
  if(!flagOn('boss'))return flagOffHTML('boss');
  var un=bossUnlocked48(b.id,lang), won=isWon48(b.id,lang), st=stars48(b.id,lang);
  var starStr='';for(var i=0;i<3;i++)starStr+=i<st?'★':'☆';
  var weak='';
  try{if(window.__v34&&__v34.weakChipHTML)weak=__v34.weakChipHTML(b,lang)}catch(e){}
  var h='<div class="v48card"><b>👹 '+esc(b.vi)+'</b>'
    +'<p class="v48mut">'+esc(b.n)+' · Lv '+b.lv+' · HP '+b.hp+' · Thủ '+b.def+' · '+esc(b.mode)+' · '+esc(b.diff)+'</p>'
    +'<p class="v48mut">Đòn tấn công: câu hỏi lắp ráp phụ âm/nguyên âm và nghe–chọn. Kỹ năng: '+esc(b.skills.elem.n)+' · Tuyệt kỹ: '+esc(b.skills.ult.n)+'</p>'
    +'<p class="v48mut">'+weak+'</p>'
    +'<p class="v48mut">Thưởng lần đầu: +'+b.reward.xp+' XP, +'+b.reward.gems+' 💎, '+esc(b.reward.item)+' — mở Võ Đường Phát Âm cấp cao.</p>'
    +'<p class="v48mut">'+(won?'✅ Đã thắng ('+starStr+')':(un?'⚔️ Có thể đánh':'🔒 Cần thắng đủ '+GATE_TOTAL+' boss ('+correctedWinCount48()+'/'+GATE_TOTAL+') để mở'))+'</p>'
    +(un?'<button type="button" class="v48btn pri" onclick="window.__v48.fightBoss(\''+b.id+'\')">Bắt đầu chiến đấu</button>':'')
    +'</div>';
  return h;
}
function openForge(lang,tab){
  try{
    if(lang==='en'||lang==='ko')ST.lang=lang;
    if(tab)ST.tab=tab;
    syncDojoUnlock();
    var h=ensureHub();
    h.innerHTML=overlayHTML();
    h.style.display='flex';
    try{document.body.style.overflow='hidden'}catch(e){}
  }catch(e){}
}
function closeForge(){
  try{
    var h=document.getElementById('v48hub');if(h)h.style.display='none';
    try{if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel()}catch(e){}
    try{var hub15=document.getElementById('v15hub');if(!hub15||hub15.style.display==='none')document.body.style.overflow=''}catch(e){document.body.style.overflow=''}
  }catch(e){}
}
function rerender(){
  try{var h=document.getElementById('v48hub');if(h&&h.style.display!=='none')h.innerHTML=overlayHTML()}catch(e){}
}
function setTab(t){ST.tab=t;rerender()}
function setLang48(l){if(l!=='en'&&l!=='ko')return;ST.lang=l;FS=null;DS=null;rerender()}

/* ---------- EN Hub entry: MutationObserver decorator (V33 precedent) ---------- */
var _decT=null;
function decorateEN(){
  try{
    var hb=document.querySelector('.v15hub-headbtns');
    if(hb&&!hb.querySelector('.v48hubbtn')){
      var b=document.createElement('button');
      b.className='btn sm v48hubbtn';b.type='button';b.textContent='🔨 Sentence Forge';
      b.onclick=function(){openForge('en','forge')};
      var x=hb.querySelector('.v15x');
      if(x)hb.insertBefore(b,x);else hb.appendChild(b);
    }
    var lb=document.querySelector('#v15langbar .v15lb-in');
    if(lb&&!lb.querySelector('.v48hubbtn')){
      var b2=document.createElement('button');
      b2.className='v15lb-hub v48hubbtn';b2.type='button';b2.textContent='🔨 Sentence Forge';
      b2.onclick=function(){openForge('en','forge')};
      lb.appendChild(b2);
    }
  }catch(e){}
}
function scheduleDecorate(){
  if(_decT)return;
  _decT=setTimeout(function(){_decT=null;decorateEN()},60);
}

/* ---------- init ---------- */
function init48(){
  try{
    decorateEN();
    if(window.MutationObserver){
      var _obs=new MutationObserver(function(){scheduleDecorate()});
      _obs.observe(document.body,{childList:true,subtree:true});
    }
  }catch(e){}
}
try{init48()}catch(e){}
if(typeof document!=='undefined'&&document&&document.readyState==='loading'){try{document.addEventListener('DOMContentLoaded',function(){try{init48()}catch(e){}})}catch(e){}}

window.__v48={
  version:VERSION,
  flags:function(){try{return en48().flags}catch(e){return {forge:1,bounty:1,tree:1,dojo:1,boss:1}}},
  setFlag:setFlag,flagOn:flagOn,
  openForge:openForge,closeForge:closeForge,setTab:setTab,setLang:setLang48,
  en48:en48,
  startForge:function(){var r=startForgeSession(ST.lang);if(!r.ok){pop48('Chưa đủ điều kiện rèn.');}rerender();return r.ok},
  forgeTap:function(i){var ok=forgeTap(i);rerender();return ok},
  forgeClear:function(){forgeClear();rerender()},
  forgeCheck:function(){var r=forgeCheck();rerender();return r},
  forgeNext:function(){var r=forgeNext();rerender();return r},
  claimBounty:function(qid,period){var r=claimBounty(qid,period);pop48(r.msg);rerender();return r.ok},
  setTreeWord:function(id){TS.wordId=id;rerender()},
  claimTreeBranch:function(wid,kind){var r=claimTreeBranch(wid,kind,ST.lang);pop48(r.msg);rerender();return r.ok},
  startDojo:function(adv){var r=startDojo(ST.lang,!!adv);if(!r.ok)pop48(r.gate&&r.gate.why==='locked-advanced'?'Cấp cao đang khóa — thắng Hangul Golem để mở.':'Chưa đủ từ đã học để luyện phát âm.');rerender();return r.ok},
  nextDojo:function(){var r=startDojo(ST.lang,!!(DS&&DS.advanced));rerender();return r.ok},
  dojoListen:function(){var r=dojoListen();rerender();return r},
  dojoSelf:function(ok){return dojoSelf(ok)},
  fightBoss:fightBoss48,
  bossUnlocked:bossUnlocked48,isWon:isWon48,stars:stars48,
  correctedWinCount:correctedWinCount48,syncDojoUnlock:syncDojoUnlock,
  _test:{
    en48:en48,forgePool:forgePool,forgeGate:forgeGate,startForgeSession:startForgeSession,
    forgeCheck:forgeCheck,forgeNext:forgeNext,forgeTap:forgeTap,forgeClear:forgeClear,
    scoreSentence:scoreSentence,tierEN:tierEN,tierKO:tierKO,tokensOf:tokensOf,
    bountyQuests:bountyQuests,bountyProgress:bountyProgress,bountyState:bountyState,claimBounty:claimBounty,
    treeRelations:treeRelations,treeBranchDone:treeBranchDone,claimTreeBranch:claimTreeBranch,
    gradeTranscript:gradeTranscript,dojoPool:dojoPool,dojoGate:dojoGate,startDojo:startDojo,
    srAvailable:srAvailable,isoWeek:isoWeek,dayKey:dayKey,
    bossUnlocked:bossUnlocked48,correctedWinCount:correctedWinCount48,
    learnedEN:learnedEN,learnedKO:learnedKO,masteredEN:masteredEN,masteredKO:masteredKO,
    session:function(){return FS},dojoState:function(){return DS},
    overlayHTML:overlayHTML,openForge:openForge,closeForge:closeForge,
    GOLEM_ID:GOLEM_ID,GATE_TOTAL:GATE_TOTAL,FORGE_MIN_LEARNED:FORGE_MIN_LEARNED
  }
};
})();
