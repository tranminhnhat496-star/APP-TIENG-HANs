/* ===== V34 — CHRONO COMPLETION (V17.1) =====
   1) Library 5th group (Chrono) — the group itself lives in v17.js
      (patched by build_v34.py); this layer supplies the analytics
      behind it (setStats / chronoAnalytics) and the KO empty state.
   2) SRS — no enrolment code: mark15() already enrols any WORDS id,
      including v33_* (verified by probe, see SMOKE_TEST_V17_1).
   3) Vocabulary Analytics — derived ONLY from live SRS data
      (enOld box/right/wrong + en15 due). Never stored, never cached.
   4) Boss Weakness System — per-fight state on F/B ONLY (weak/brk/
      brkMax). No new localStorage key, no schema change, no migration.
      Correct answers on weakness words fill the meter (3 hits =
      BREAK: +10% of boss max HP, clamped 10–50, added BEFORE the
      shield-halving step). Wrong answers never drain the meter (v1).
      KO fights: weakness = the selected Korean deck; no deck selected
      means the meter is hidden and never fills (honest, never fake).
   5) Smart mid-flight guard — one guarded endEarly() call in
      v33.js launchSession() (patched by build_v34.py); endEarly() is
      a no-op when no Smart session is live.
   Guards: every cross-layer read goes through window.__vNN with a
   guard + try/catch; bare S only inside try/catch (never window.S). */
(function(){
'use strict';
var VERSION='17.1.0';
var D34=function(){return window.__V34_DATA||null};
function esc(s){try{var v=window.__v15;if(v&&v.esc)return v.esc(s)}catch(e){}return String(s==null?'':s)}

/* ---------- weakness resolution ---------- */
function weakFor(b,lang){
  try{
    if(!b)return {kind:'t',key:'time'};
    /* KO fights: weakness is the selected Korean deck, whatever the boss. */
    if(lang==='ko')return {kind:'ko'};
    var d=D34();
    var id=b.id||'';
    if(d&&d.weakExplicit&&d.weakExplicit[id])return d.weakExplicit[id];
    var d35=window.__V35_DATA||null;
    if(d35&&d35.weakExplicit&&d35.weakExplicit[id])return d35.weakExplicit[id];
    /* Chrono zone (V33 bosses not in the explicit table — safety net). */
    if(b.zone==='chrono')return {kind:'chrono',key:'change'};
    if(b.zone==='skyroot')return {kind:'skyroot',key:'climate'};
    /* z10 Vô Cực maps to the Chrono 'change' set, not an A1–A2 topic. */
    if(b.zone==='z10')return {kind:'chrono',key:'change'};
    if(b.zone&&d&&d.zoneWeak&&d.zoneWeak[b.zone])return {kind:'a1a2',key:d.zoneWeak[b.zone]};
    if(b.arena==='el'&&b.el&&d&&d.elWeak&&d.elWeak[b.el])return {kind:'a1a2',key:d.elWeak[b.el]};
    if((b.arena==='en'||b.arena==='leg')&&b.diff&&d&&d.diffWeak&&d.diffWeak[b.diff])return {kind:'a1a2',key:d.diffWeak[b.diff]};
    /* V15 originals (no zone/arena/diff/el) + anything unknown. */
    return {kind:'t',key:'time'};
  }catch(e){return {kind:'t',key:'time'}}
}
function weakMatch(w,weak){
  try{
    if(!w||!weak)return false;
    if(weak.kind==='chrono')return w.chronoSet===weak.key;
    if(weak.kind==='skyroot')return w.skyrootSet===weak.key;
    if(weak.kind==='a1a2'){
      var ts=w.a1a2Topics||[];
      for(var i=0;i<ts.length;i++){
        /* a1a2Topics stores 'a1_<slug>' (e.g. 'a1_family'); the
           weakness table stores the bare slug — accept both. */
        if(ts[i]===weak.key||ts[i]==='a1_'+weak.key)return true;
      }
      if(w.a1a2Topic===weak.key||w.a1a2Topic==='a1_'+weak.key)return true;
      /* V6 words share the slug as w.t ('family', 'nature', ...). */
      if(w.t===weak.key)return true;
      return false;
    }
    if(weak.kind==='t')return w.t===weak.key;
    return false;
  }catch(e){return false}
}
function weakName(weak){
  try{
    if(!weak)return '';
    var d=D34();
    if(weak.kind==='chrono'){
      if(d&&d.setLabels&&d.setLabels[weak.key])return d.setLabels[weak.key];
      return weak.key;
    }
    if(weak.kind==='skyroot'){
      var d35n=window.__V35_DATA||null;
      if(d35n&&d35n.setLabels&&d35n.setLabels[weak.key])return d35n.setLabels[weak.key];
      return weak.key;
    }
    if(weak.kind==='ko')return 'Bộ từ tiếng Hàn đã chọn';
    if(weak.kind==='a1a2'){
      if(d&&d.a1a2Labels&&d.a1a2Labels[weak.key])return d.a1a2Labels[weak.key];
      try{var v=window.__v15;if(v&&v.topicName){var n=v.topicName('a1_'+weak.key);if(n&&n!=='a1_'+weak.key)return n}}catch(e){}
      return weak.key;
    }
    if(weak.kind==='t'){
      try{var v2=window.__v15;if(v2&&v2.topicName){var n2=v2.topicName(weak.key);if(n2&&n2!==weak.key)return n2}}catch(e){}
      return 'Thời gian';
    }
    return '';
  }catch(e){return ''}
}
function breakBonus(maxHp){
  try{
    var n=Math.round((maxHp||0)*0.10);
    if(n<10)n=10;
    if(n>50)n=50;
    return n;
  }catch(e){return 10}
}
function koDeckSet(){
  try{return !!(S&&S.deck)}catch(e){return false}
}
function weakCountInPool(weak,words){
  try{
    if(!weak||!words)return 0;
    var n=0;
    for(var i=0;i<words.length;i++)if(weakMatch(words[i],weak))n++;
    return n;
  }catch(e){return 0}
}
/* Fight whose pool holds zero weakness words — Library scope active OR
   difficulty filter alone (e.g. a B1/B2 boss whose weakness is a basic
   A1-A2 topic with no B1/B2 words): the Break bar must say so honestly
   and never fill. Checked live from the actual pool (the pool already
   reflects any scope relaxation). */
function scopeBlocked(F){
  try{
    if(!F||!F.weak||F.weak.kind==='ko')return false;
    var pool=F.pools&&F.pools.words;
    if(!pool||!pool.length)return false;
    return weakCountInPool(F.weak,pool)===0;
  }catch(e){return false}
}

/* ---------- fight hooks (called from v15/v18/v19 answer paths) ---------- */
/* Called on a CORRECT answer only, after damage is computed and BEFORE
   the shield-halving step. Fills the meter on a weakness hit; returns
   the BREAK bonus damage (0 normally, breakBonus at 3/3 — meter resets). */
function breakDmg(F){
  try{
    if(!F||F.over)return 0;
    var lang=F.lang||'en';
    if(lang==='ko'){
      /* KO: any correct KO answer fills +1 while a deck is selected. */
      if(!(F.cur&&F.cur.k))return 0;
      if(!koDeckSet())return 0;
      F.brk=Math.min(3,(F.brk||0)+1);
    }else{
      if(!(F.cur&&F.cur.w))return 0;
      if(!F.weak)return 0;
      if(scopeBlocked(F))return 0;
      if(!weakMatch(F.cur.w,F.weak))return 0;
      F.brk=Math.min(3,(F.brk||0)+1);
    }
    if((F.brk||0)>=3){
      F.brk=0;
      return breakBonus(F.maxHp||100);
    }
    return 0;
  }catch(e){return 0}
}
/* Word-pick bias (called inside nextQ/nextBossQ): while the meter is
   not full and weakness words exist in the pool, draw from them with
   p≈0.5 so the meter fills at a playable rate. Never biases KO fights
   (deck rule), grammar/read/builder picks (not word picks), or a
   scope-blocked fight. */
function weakPick(F,words,fallback){
  try{
    if(!F||!words||!words.length)return fallback;
    if((F.lang||'en')==='ko')return fallback;
    if(!F.weak||F.weak.kind==='ko')return fallback;
    if((F.brk||0)>=(F.brkMax||3))return fallback;
    if(scopeBlocked(F))return fallback;
    var wl=[];
    for(var i=0;i<words.length;i++)if(weakMatch(words[i],F.weak))wl.push(words[i]);
    if(!wl.length)return fallback;
    if(Math.random()<0.5)return wl[Math.floor(Math.random()*wl.length)];
    return fallback;
  }catch(e){return fallback}
}

/* ---------- fight UI ---------- */
function breakBarHTML(F){
  try{
    if(!F||!F.weak)return '';
    var lang=F.lang||'en';
    var max=F.brkMax||3,cur=F.brk||0;
    if(lang==='ko'){
      /* No deck selected: meter hidden/disabled for this fight. */
      if(!koDeckSet())return '';
      var pctK=Math.round(cur/max*100);
      return '<div class="v34breakbar"><i style="width:'+pctK+'%"></i></div>'
        +'<div class="v34breaklabel">💥 Điểm yếu: bộ từ tiếng Hàn đã chọn — '+cur+'/'+max+'</div>';
    }
    if(scopeBlocked(F)){
      return '<div class="v34breaklabel v34blocked">💥 Điểm yếu ngoài phạm vi ôn tập — đổi phạm vi để dùng</div>';
    }
    var pct=Math.round(cur/max*100);
    return '<div class="v34breakbar"><i style="width:'+pct+'%"></i></div>'
      +'<div class="v34breaklabel">💥 Điểm yếu: '+esc(weakName(F.weak))+' — '+cur+'/'+max+'</div>';
  }catch(e){return ''}
}
function weakChipHTML(b,lang){
  try{
    if(!b)return '';
    var wk=weakFor(b,lang||'en');
    if(!wk)return '';
    if(wk.kind==='ko'){
      if(!koDeckSet())return '';
      return '<span class="v34weakchip">💥 Điểm yếu: bộ từ tiếng Hàn đã chọn</span>';
    }
    return '<span class="v34weakchip">💥 Điểm yếu: '+esc(weakName(wk))+'</span>';
  }catch(e){return ''}
}

/* ---------- analytics (derived only — never stored) ---------- */
function statsForList(list){
  var s={total:list.length,learned:0,notLearned:0,mastered:0,due:0,right:0,wrong:0,attempts:0,retention:'—'};
  try{
    var v=window.__v15;if(!v)return s;
    var old=v.enOld()||{},en=v.en15()||{},now=Date.now();
    var box=old.box||{},right=old.right||{},wrong=old.wrong||{},due=en.due||{};
    list.forEach(function(w){
      var b=box[w.id]||0;
      var r=right[w.id]||0,wr=wrong[w.id]||0;
      if(b>=1)s.learned++;else s.notLearned++;
      if(b>=5)s.mastered++;
      if((due[w.id]||0)<=now)s.due++;
      s.right+=r;s.wrong+=wr;
    });
    s.attempts=s.right+s.wrong;
    if(s.attempts>0)s.retention=Math.round(s.right/s.attempts*100)+'%';
  }catch(e){}
  return s;
}
function chronoWords(){
  try{
    var v=window.__v15;if(!v||!v.words)return [];
    return v.words.filter(function(w){return (w.lib||[]).indexOf('chrono')>=0});
  }catch(e){return []}
}
function setStats(setId){
  try{
    var list=chronoWords().filter(function(w){return w.chronoSet===setId});
    return statsForList(list);
  }catch(e){return null}
}
function chronoAnalytics(){
  try{
    var sets={},order=['time','space','machines','change'];
    order.forEach(function(k){sets[k]=setStats(k)});
    var total=statsForList(chronoWords());
    return {sets:sets,total:total,ko:koChronoStats()};
  }catch(e){return null}
}
/* KO Chrono: there are no KO Chrono words by design (the ko field on
   Chrono words is display data only — no S.cards entries, no KO word
   list). Report the empty state honestly instead of fake zeros. */
function koChronoStats(){
  try{
    var d=D34();
    return {empty:true,total:0,learned:0,mastered:0,due:0,retention:'—',
      note:(d&&d.koEmptyNote)||'Chưa có từ Chrono tiếng Hàn'};
  }catch(e){return {empty:true,total:0,learned:0,mastered:0,due:0,retention:'—',note:'Chưa có từ Chrono tiếng Hàn'}}
}

try{
  window.__v34={
    version:VERSION,
    weakFor:weakFor,weakMatch:weakMatch,weakName:weakName,
    breakBonus:breakBonus,breakBarHTML:breakBarHTML,breakDmg:breakDmg,
    weakPick:weakPick,scopeBlocked:scopeBlocked,koDeckSet:koDeckSet,
    weakChipHTML:weakChipHTML,setStats:setStats,
    chronoAnalytics:chronoAnalytics,koChronoStats:koChronoStats,
    _test:{weakFor:weakFor,weakMatch:weakMatch,weakName:weakName,
      breakBonus:breakBonus,breakBarHTML:breakBarHTML,breakDmg:breakDmg,
      weakPick:weakPick,scopeBlocked:scopeBlocked,koDeckSet:koDeckSet,
      weakChipHTML:weakChipHTML,setStats:setStats,
      chronoAnalytics:chronoAnalytics,koChronoStats:koChronoStats,
      weakCountInPool:weakCountInPool,statsForList:statsForList,
      chronoWords:chronoWords}
  };
}catch(e){}
})();
