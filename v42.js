/* ===== V42 — UNLOCK SHORTCUTS (V18.7, layer V42) =====
   Locked-region shortcuts on the Chrono + Skyroot overlays (Anh's
   live report: locked Skyroot overlay, KO, 13/86 wins, GEAR GOLEM
   unbeaten — "which boss do I fight to unlock this region?").
   Additive layer only: this file computes the next boss to fight and
   renders the shortcut button; the overlays themselves are two
   build-script replacements in v33.js / v35.js (see build_v42.py).

   SKYROOT (gate = GEAR GOLEM defeated in that language):
     skyrootTarget(lang) walks the 8 Chrono bosses in sequence order
     and returns the FIRST one that is unlocked in this language
     (via __v33.bossUnlocked) and not yet won (via __v33.isWon).
     The button jumps straight into that fight via __v33.fightBoss
     (which already closes Chrono, sets the language and fights
     through the V19 UCE). While the 70-win Chrono gate is still
     closed, __v33.bossUnlocked returns false for ALL Chrono bosses,
     so that scan finds nothing — skyrootTarget then falls back to
     chronoTarget(lang) and returns its result flagged viaChrono:true,
     i.e. the easiest unwon, fightable boss of the 70, to climb
     toward 70 wins, open Chrono, and then beat the sequence up to
     GEAR GOLEM. goSkyroot launches a viaChrono target through the
     same pool routing as goChrono (shared launchChronoTarget),
     never through __v33.fightBoss (which would refuse a non-Chrono
     boss while the gate is closed). No new save key, no schema change.
   CHRONO (gate = 70 total wins, __v33.correctedWinCount):
     chronoTarget(lang) pools the three sources that count toward
     the 70 — old V15 bosses (EN only, never offered in KO mode),
     flat V18 bosses (en/el/leg), V19 map bosses (won in EITHER
     language counts, so a boss won in the other language is NOT
     offered again) — keeps only unwon + fightable bosses, sorts
     by lv ascending (tie-break pool order v18, old, v19) and
     returns the easiest. goChrono() closes Chrono and launches
     the fight through the boss's own engine (__v19.fight,
     __v18.fight with the language passed so the lang-pick screen
     is skipped, __v15.bossFight for old bosses).
   All cross-layer reads go through window.__vNN with guards and
   every function is try/catch-wrapped: a missing layer degrades
   to "no shortcut" (honest <p>, never a dead button), never a
   throw. Targets are re-computed at tap time, never trusted from
   the rendered HTML.

   FIXED IN THIS REVISION (was the flagged KNOWN LIMIT):
   __v33.bossUnlocked returns false for ALL Chrono bosses while the
   70-win gate is closed, so the Chrono-sequence scan in
   skyrootTarget() is null in exactly Anh's screenshot state
   (13/86 wins) — the old null text ("already won all 8") was FALSE
   there: the player has won 0 Chrono bosses and cannot even fight
   one yet. skyrootTarget now falls back to chronoTarget(lang)
   (flagged viaChrono:true) while the 70-gate is closed, so the
   Skyroot overlay offers the real next step (the easiest unwon,
   fightable boss of the 70) instead of the false line. The null
   case is now defensive-only and says so honestly ("Không tìm thấy
   boss nào có thể đánh ngay…"). */
(function(){
'use strict';
var VERSION='18.7.0';
/* Fallback copy of the Chrono sequence (verified in src/v33.js:
   CHRONO_IDS, GEAR GOLEM last). The live list is read from
   __v33._test.CHRONO_IDS when available. */
var CHRONO_IDS=['v17_sandwisp','v17_pendulum','v17_specter','v17_mantis','v17_hound','v17_oracle','v17_titan','v17_geargolem'];
var GOLEM_ID='v17_geargolem';
var POOL_RANK={v18:0,old:1,v19:2};
function normLang(l){return l==='ko'?'ko':'en'}
function langName(l){return l==='ko'?'tiếng Hàn':'tiếng Anh'}
function esc(s){try{return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}catch(e){return ''}}
function pop(msg){
  try{var v=window.__v15;if(v&&v.pop15){v.pop15(msg);return true}}catch(e){}
  return false;
}
function chronoIds(){
  try{var v=window.__v33;if(v&&v._test&&v._test.CHRONO_IDS&&v._test.CHRONO_IDS.length)return v._test.CHRONO_IDS.slice()}catch(e){}
  return CHRONO_IDS.slice();
}
function chronoVi(id){
  try{var d=window.__V33_DATA;if(d&&d.byId){var b=d.byId(id);if(b&&b.vi)return b.vi}}catch(e){}
  return id;
}
function v18Won(rec){
  /* Mirror of the 70-count rule (v33.js correctedWinCount / V31
     R-F-13a): a flat V18 record counts when ANY of its win shapes
     is set. */
  try{if(!rec)return false;return !!(rec.win||rec.wins||(rec.en&&rec.en.win)||(rec.ko&&rec.ko.win))}catch(e){return false}
}

/* ---------- Skyroot: first unlocked, unwon Chrono boss ----------
   While the 70-win Chrono gate is closed, __v33.bossUnlocked is
   false for every Chrono boss, so the sequence scan finds nothing
   even though the player has won 0 Chrono bosses. In that case
   fall back to chronoTarget(lang) (flagged viaChrono:true): the
   easiest unwon, fightable boss of the 70 is the real next step
   toward opening Chrono and then beating the sequence to GEAR
   GOLEM. Null is now defensive-only (no Chrono boss AND no
   boss of the 70 fightable). */
function skyrootTarget(lang){
  try{
    lang=normLang(lang);
    var v=window.__v33;
    if(!v||typeof v.bossUnlocked!=='function'||typeof v.isWon!=='function')return null;
    var ids=chronoIds();
    for(var i=0;i<ids.length;i++){
      var id=ids[i],un=false,won=false;
      try{un=!!v.bossUnlocked(id,lang)}catch(e){un=false}
      if(!un)continue;
      try{won=!!v.isWon(id,lang)}catch(e){won=false}
      if(won)continue;
      return {id:id,vi:chronoVi(id),isGolem:id===GOLEM_ID};
    }
    /* Chrono-sequence scan empty. If the 70-win gate is still
       closed (guarded: a missing correctedWinCount reads as 0,
       i.e. closed — same convention as the Chrono gate HTML), the real
       next step is the Chrono shortcut, not a Chrono boss. */
    var n=0;
    try{if(typeof v.correctedWinCount==='function')n=v.correctedWinCount()||0}catch(e){n=0}
    if(n<70){
      var ct=chronoTarget(lang);
      if(!ct)return null;
      return {pool:ct.pool,id:ct.id,vi:ct.vi,lv:ct.lv,viaChrono:true};
    }
  }catch(e){}
  return null;
}

/* ---------- Chrono: easiest unwon, fightable boss of the 70 ---------- */
function chronoTarget(lang){
  try{
    lang=normLang(lang);
    var list=[];
    var v15=window.__v15,v18=window.__v18,v19=window.__v19;
    var B18=window.__V18_BOSSES||(v18&&v18.bosses)||{};
    var D19=window.__V19_DATA||(v19&&v19.bosses)||{};
    /* old (V15): EN only — old fights are English-only, never
       offered in KO mode. Sequential rule replicated from
       v15.js bossUnlocked(): idx 0 always; 'king' needs all 9
       previous won; else the previous boss won. Records exist
       ONLY on win. */
    if(lang==='en'&&v15&&typeof v15.en15==='function'){
      try{
        var old=B18.old||[],e15=v15.en15(),b15=(e15&&e15.bosses)||{};
        for(var oi=0;oi<old.length;oi++){
          var ob=old[oi];if(!ob||!ob.id)continue;
          if(b15[ob.id]&&b15[ob.id].win)continue;
          var ok=false;
          if(oi===0)ok=true;
          else if(ob.id==='king'){
            ok=true;
            for(var k=0;k<9&&k<oi;k++){var pb=old[k];if(!(b15[pb.id]&&b15[pb.id].win)){ok=false;break}}
          }else{
            var prev=old[oi-1];
            ok=!!(prev&&b15[prev.id]&&b15[prev.id].win);
          }
          if(ok)list.push({pool:'old',id:ob.id,vi:ob.vi||ob.n||ob.id,lv:(typeof ob.lv==='number'?ob.lv:999)});
        }
      }catch(e){}
    }
    /* v18 (flat V18): en/el/leg arenas. Fightable via
       __v18.bossUnlocked(bossObj) (arena gate + previous won). */
    if(v18&&typeof v18.bossUnlocked==='function'&&typeof v18.en18==='function'){
      try{
        var e18=v18.en18(),b18=(e18&&e18.bosses)||{};
        ['en','el','leg'].forEach(function(ar){
          var arr=B18[ar]||[];
          for(var i=0;i<arr.length;i++){
            var b=arr[i];if(!b||!b.id)continue;
            if(v18Won(b18[b.id]))continue;
            var un=false;
            try{un=!!v18.bossUnlocked(b)}catch(e){un=false}
            if(un)list.push({pool:'v18',id:b.id,vi:b.vi||b.n||b.id,lv:(typeof b.lv==='number'?b.lv:999)});
          }
        });
      }catch(e){}
    }
    /* v19 (Boss Map): a boss won in EITHER language already
       counts toward the 70 (isWonAny), so winning it again in
       this language would NOT advance the count — never offer
       it. Fightable via __v19.bossUnlocked(id,lang). */
    if(v19&&typeof v19.isWonAny==='function'&&typeof v19.bossUnlocked==='function'){
      try{
        var arr19=D19.bosses||[];
        for(var j=0;j<arr19.length;j++){
          var b19=arr19[j];if(!b19||!b19.id)continue;
          var wonAny=false;
          try{wonAny=!!v19.isWonAny(b19.id)}catch(e){wonAny=false}
          if(wonAny)continue;
          var un19=false;
          try{un19=!!v19.bossUnlocked(b19.id,lang)}catch(e){un19=false}
          if(un19)list.push({pool:'v19',id:b19.id,vi:b19.vi||b19.n||b19.id,lv:(typeof b19.lv==='number'?b19.lv:999)});
        }
      }catch(e){}
    }
    if(!list.length)return null;
    list.sort(function(a,b){
      if(a.lv!==b.lv)return a.lv-b.lv;
      return (POOL_RANK[a.pool]||0)-(POOL_RANK[b.pool]||0);
    });
    return list[0];
  }catch(e){return null}
}

/* ---------- overlay HTML ('' when the gate is open) ---------- */
function skyrootGateHTML(lang,gate){
  try{
    if(gate)return '';
    lang=normLang(lang);
    var t=skyrootTarget(lang);
    if(!t)return '<p class="v35mut v42mut">Không tìm thấy boss nào có thể đánh ngay — hãy đóng và mở lại Thánh Địa để cập nhật.</p>';
    var ln=langName(lang);
    if(t.viaChrono){
      var n=0;
      try{var v=window.__v33;if(v&&typeof v.correctedWinCount==='function')n=v.correctedWinCount()||0}catch(e){n=0}
      return '<button type="button" class="v35btn pri v42btn" onclick="window.__v42.goSkyroot(\''+lang+'\')">⚔️ Đánh '+esc(t.vi)+' ngay — mở đường tới GEAR GOLEM</button>'
        +'<p class="v35mut v42mut">'+esc(t.vi)+' · Lv '+t.lv+' · boss dễ nhất bạn chưa thắng — thắng trận này ('+ln+') để lên '+(n+1)+'/70, mở Vương Quốc Thời Gian rồi đánh bại GEAR GOLEM.</p>';
    }
    if(t.isGolem){
      return '<button type="button" class="v35btn pri v42btn" onclick="window.__v42.goSkyroot(\''+lang+'\')">⚔️ Đánh GEAR GOLEM ngay</button>'
        +'<p class="v35mut v42mut">Thắng GEAR GOLEM bằng '+ln+' để mở Thánh Địa Thiên Căn.</p>';
    }
    return '<button type="button" class="v35btn pri v42btn" onclick="window.__v42.goSkyroot(\''+lang+'\')">⚔️ Đánh '+esc(t.vi)+' ngay — mở đường tới GEAR GOLEM</button>'
      +'<p class="v35mut v42mut">Thắng '+esc(t.vi)+' bằng '+ln+' để mở boss tiếp theo trên đường tới GEAR GOLEM.</p>';
  }catch(e){return ''}
}
function chronoGateHTML(lang,gate){
  try{
    if(gate)return '';
    lang=normLang(lang);
    var t=chronoTarget(lang);
    if(!t)return '<p class="v33mut v42mut">Không còn boss nào có thể đánh ngay để tăng số chiến thắng — hãy đóng và mở lại Vương Quốc Thời Gian để cập nhật số liệu.</p>';
    var n=0;
    try{var v=window.__v33;if(v&&typeof v.correctedWinCount==='function')n=v.correctedWinCount()||0}catch(e){n=0}
    var ln=langName(lang);
    return '<button type="button" class="v33btn pri v42btn" onclick="window.__v42.goChrono(\''+lang+'\')">⚔️ Đánh '+esc(t.vi)+' ngay</button>'
      +'<p class="v33mut v42mut">'+esc(t.vi)+' · Lv '+t.lv+' · boss dễ nhất bạn chưa thắng — thắng trận này ('+ln+') để lên '+(n+1)+'/70.</p>';
  }catch(e){return ''}
}

/* ---------- navigation (targets re-computed at tap time) ----------
   launchChronoTarget(lang,target) launches a chronoTarget-shaped
   {pool,id} fight through the boss's own engine. It closes NO
   overlay itself — the caller closes its own (Chrono for goChrono,
   Skyroot for a viaChrono goSkyroot) before calling it. */
function launchChronoTarget(lang,target){
  try{
    var t=target;
    var v19=window.__v19,v18=window.__v18,v15=window.__v15;
    if(t.pool==='v19'){
      if(!v19||typeof v19.fight!=='function'){pop('Chưa tải được hệ thống Boss (V19).');return false}
      try{if(typeof v19.setLang==='function')v19.setLang(lang)}catch(e){}
      try{v19.fight(t.id)}catch(e){pop('Không mở được trận đấu.');return false}
      return true;
    }
    if(t.pool==='v18'){
      if(!v18||typeof v18.fight!=='function'){pop('Chưa tải được hệ thống Boss (V18).');return false}
      try{if(!document.querySelector('#v15body')&&v15&&typeof v15.openHub==='function')v15.openHub('bosses')}catch(e){}
      try{v18.fight(t.id,lang)}catch(e){pop('Không mở được trận đấu.');return false}
      return true;
    }
    /* old */
    if(!v15||typeof v15.bossFight!=='function'){pop('Chưa tải được hệ thống Boss (V15).');return false}
    try{if(!document.querySelector('#v15bossfight')&&typeof v15.openHub==='function')v15.openHub('bosses')}catch(e){}
    try{v15.bossFight(t.id)}catch(e){pop('Không mở được trận đấu.');return false}
    return true;
  }catch(e){return false}
}
function goSkyroot(lang){
  try{
    lang=normLang(lang);
    var t=skyrootTarget(lang);
    if(!t){pop('Không tìm thấy boss nào có thể đánh ngay — hãy đóng và mở lại Thánh Địa để cập nhật.');return false}
    var v35=window.__v35;
    if(t.viaChrono){
      /* NOT a Chrono boss and the 70-gate is closed, so
         __v33.fightBoss would refuse it — launch through the same
         pool routing as goChrono instead. */
      try{if(v35&&typeof v35.closeSkyroot==='function')v35.closeSkyroot()}catch(e){}
      return launchChronoTarget(lang,t);
    }
    var v33=window.__v33;
    if(!v33||typeof v33.fightBoss!=='function'){pop('Chưa tải được hệ thống Boss (V33).');return false}
    try{if(v35&&typeof v35.closeSkyroot==='function')v35.closeSkyroot()}catch(e){}
    try{if(typeof v33.setLang==='function')v33.setLang(lang)}catch(e){}
    return !!v33.fightBoss(t.id);
  }catch(e){return false}
}
function goChrono(lang){
  try{
    lang=normLang(lang);
    var t=chronoTarget(lang);
    if(!t){pop('Không còn boss nào có thể đánh ngay để tăng số chiến thắng.');return false}
    var v33=window.__v33;
    try{if(v33&&typeof v33.closeChrono==='function')v33.closeChrono()}catch(e){}
    return launchChronoTarget(lang,t);
  }catch(e){return false}
}

window.__v42={
  version:VERSION,
  skyrootTarget:skyrootTarget,chronoTarget:chronoTarget,
  skyrootGateHTML:skyrootGateHTML,chronoGateHTML:chronoGateHTML,
  goSkyroot:goSkyroot,goChrono:goChrono,
  _test:{
    skyrootTarget:skyrootTarget,chronoTarget:chronoTarget,
    skyrootGateHTML:skyrootGateHTML,chronoGateHTML:chronoGateHTML,
    goSkyroot:goSkyroot,goChrono:goChrono,
    CHRONO_IDS:CHRONO_IDS,GOLEM_ID:GOLEM_ID
  }
};
})();
