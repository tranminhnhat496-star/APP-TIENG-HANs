/* ===== V19 — BOSS MAP + 30 SUPER LEGENDARY BOSSES (V11, additive layer) =====
   Built ON TOP of V10. It never edits V6/V14/V15/V16/V17/V18 logic — the only
   touch points are guarded hooks: a "map" hub tab in v15.js, and a V11 group
   in the V18 Collection (see CHANGED_FILES.md). The 10 old V15 bosses and
   the 30 V18 bosses keep fighting in their own engines untouched.

   Universal Combat Engine (UCE): one ruleset shared with the V18 arena
   engine — same damage formula (12 + combo x2 - def, min 2), same crit rule
   (guaranteed every 5th combo + 10% random), same timer/phase structure —
   extended here with: 5 skills per boss (basic / elemental / tactical /
   passive / ultimate), Awakening (P2, <=50% HP), Berserk + Ultimate with a
   Knowledge Counterattack (P3, <=20% HP), star ratings (1-3), and bilingual
   mastery (each boss has a SEPARATE English and Korean progress record).

   New state (new key, migration-safe): S.v7.en19 = {lang, bosses:{id:
   {en:{win,wins,stars,best}, ko:{...}}}, titles:[], zoneClaimed:{},
   koStats:{right,wrong}, created}. First-win rewards are once-only PER
   LANGUAGE; replay wins give +10 XP. EN answers feed the same SRS boxes
   (mark19 mirrors mark15/mark18); KO answers only touch en19.koStats —
   the Korean deck (S.cards) is never modified by V19.
*/
(function(){
'use strict';
function $(s){return document.querySelector(s)}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function V15(){return window.__v15||null}
function D19(){return window.__V19_DATA||{}}
function save19(){var v=V15();if(v)v.save15()}
function gain19(n){var v=V15();if(v&&v.gain15)v.gain15(n)}
function pop19(t){var v=V15();if(v&&v.pop15)v.pop15(t)}

/* ---------- V19 state (new key) ---------- */
function en19(){
  try{S.v7=S.v7||{}}catch(e){return {lang:'en',bosses:{},titles:[],zoneClaimed:{},koStats:{right:0,wrong:0}}}
  var e=S.v7.en19;
  if(!e){e=S.v7.en19={lang:'en',bosses:{},titles:[],zoneClaimed:{},koStats:{right:0,wrong:0},created:Date.now()};}
  e.bosses=e.bosses||{};e.titles=e.titles||[];e.zoneClaimed=e.zoneClaimed||{};
  e.koStats=e.koStats||{right:0,wrong:0};
  if(!e.lang)e.lang='en';
  return e;
}
function rec19(id,lang){
  var e=en19();e.bosses[id]=e.bosses[id]||{};
  var r=e.bosses[id][lang];
  if(!r){r={win:0,wins:0,stars:0,best:0};e.bosses[id][lang]=r}
  return r;
}
function lang19(){return en19().lang||'en'}
function setLang19(l){
  if(l!=='en'&&l!=='ko')return;
  en19().lang=l;save19();renderMap();
}
function isWon19(id,lang){lang=lang||lang19();var r=(en19().bosses[id]||{})[lang];return !!(r&&r.win)}
function isWonAny19(id){return isWon19(id,'en')||isWon19(id,'ko')}
function isMastered19(id){return isWon19(id,'en')&&isWon19(id,'ko')}
function stars19(id,lang){lang=lang||lang19();var r=(en19().bosses[id]||{})[lang];return r?r.stars||0:0}
function zoneBosses(zid){var z=D19().zoneById(zid);return z?z.bosses:[]}
function zoneWins(zid,lang){lang=lang||lang19();var n=0;zoneBosses(zid).forEach(function(id){if(isWon19(id,lang))n++});return n}
function zoneStars(zid,lang){lang=lang||lang19();var n=0;zoneBosses(zid).forEach(function(id){n+=stars19(id,lang)});return n}
function zoneOpen(zid,lang){
  lang=lang||lang19();
  var zones=D19().zones||[],i=-1;
  for(var k=0;k<zones.length;k++)if(zones[k].id===zid)i=k;
  if(i<=0)return true;
  var prev=zones[i-1];
  return isWon19(prev.main,lang);
}
function zoneState(zid,lang){
  lang=lang||lang19();
  if(!zoneOpen(zid,lang))return 'locked';
  var w=zoneWins(zid,lang),s=zoneStars(zid,lang);
  if(w>=3&&s>=9)return 'mastered';
  if(w>=3)return 'completed';
  if(w>=1)return 'progress';
  return 'unlocked';
}
function zoneNeedText(zid,lang){
  lang=lang||lang19();
  var zones=D19().zones||[],i=-1;
  for(var k=0;k<zones.length;k++)if(zones[k].id===zid)i=k;
  if(i<=0)return '';
  var prev=zones[i-1],pb=D19().byId(prev.main);
  return 'Cần đánh bại '+(pb?pb.vi:prev.main)+' ở '+(lang==='ko'?'Tiếng Hàn':'Tiếng Anh')+' để mở khóa.';
}
function bossUnlocked19(id,lang){
  lang=lang||lang19();
  var b=D19().byId(id);if(!b)return false;
  if(!zoneOpen(b.zone,lang))return false;
  var list=zoneBosses(b.zone),i=list.indexOf(id);
  if(i<=0)return true;
  return isWon19(list[i-1],lang);
}
function mapWon(lang){lang=lang||lang19();var n=0;(D19().bosses||[]).forEach(function(b){if(isWon19(b.id,lang))n++});return n}
function elChip19(b){
  var el=(D19().elements||{})[b.el];if(!el)return '';
  return '<span class="v19chip" style="--ec:'+el.c+'">'+el.ic+' '+esc(el.n)+'</span>';
}
function rarChip19(b){
  var r=((D19().rarities||{})[b.rarity])||{n:b.rarity,c:'#999'};
  return '<span class="v19chip" style="--ec:'+r.c+'">'+esc(r.n)+'</span>';
}
function starStr(n){return '★'.repeat(n||0)+'☆'.repeat(Math.max(0,3-(n||0)))}

/* ---------- Boss Map ---------- */
function mapPathD(){
  /* smooth glowing path through the zone nodes (top% / side -> x%/y%) */
  var zones=(D19().zones||[]).slice().reverse(); /* z10 top -> z1 bottom */
  var pts=zones.map(function(z){
    var x=z.side==='left'?22:(z.side==='right'?78:50);
    return [x,z.top];
  });
  if(pts.length<2)return '';
  var d='M '+pts[0][0]+' '+pts[0][1];
  for(var i=1;i<pts.length;i++){
    var p0=pts[i-1],p1=pts[i];
    var mx=(p0[0]+p1[0])/2;
    d+=' C '+mx+' '+p0[1]+', '+mx+' '+p1[1]+', '+p1[0]+' '+p1[1];
  }
  return d;
}
function zoneNodeHTML(z,lang){
  var st=zoneState(z.id,lang);
  var main=D19().byId(z.main);
  var w=zoneWins(z.id,lang),s=zoneStars(z.id,lang);
  var badge=st==='locked'?'🔒 Khóa':(st==='mastered'?'👑 Làm chủ':(st==='completed'?'✅ Hoàn thành':(st==='progress'?'⚔️ '+w+'/3':'🗺️ Mở')));
  return '<button class="v19zone v19side-'+z.side+' v19st-'+st+'" style="top:'+z.top+'%;--zc:'+z.c+'" '
  +(st==='locked'?'disabled':'')+' onclick="__v19.zoneDetail(\''+z.id+'\')" aria-label="'+esc(z.vi)+'">'
  +'<span class="v19zone-island"><img src="'+(main?main.img:'')+'" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
  +'<span class="v19zone-name">'+esc(z.vi)+'</span>'
  +'<span class="v19zone-meta">'+badge+' · '+starStr(s>0?Math.round(s/3):0)+' '+w+'/3 boss</span></span></button>';
}
function mapHTML(){
  var lang=lang19();
  var won=mapWon(lang),total=(D19().bosses||[]).length||30;
  var mastered=(D19().bosses||[]).filter(function(b){return isMastered19(b.id)}).length;
  var h='<div class="v19mapwrap"><h3>'+(lang==='ko'?'🗺️ 보스 모험 지도 – Bản Đồ Boss Tiếng Hàn':'🗺️ Legendary Boss Adventure Map')+'</h3>'
  +'<p class="mute">Chinh phục 10 vùng đất, 30 boss Siêu Huyền Thoại. Tiến trình tiếng Anh và tiếng Hàn độc lập — thắng bằng tiếng Anh không tính cho tiếng Hàn.</p>'
  +'<div class="v19langpick"><span class="mute">Ngôn ngữ chiến đấu:</span> '
  +'<button class="btn '+(lang==='en'?'pri':'')+'" onclick="__v19.setLang(\'en\')">🇬🇧 Tiếng Anh</button>'
  +'<button class="btn '+(lang==='ko'?'pri':'')+'" onclick="__v19.setLang(\'ko\')">🇰🇷 Tiếng Hàn</button>'
  +(lang==='ko'?'<span class="mute">Câu hỏi tiếng Hàn lấy từ thẻ từ của bạn (cần ≥8 thẻ).</span>':'')
  +'</div>'
  +'<div class="v19map-head"><b>Hoàn thành: '+won+'/'+total+' Boss '+(lang==='ko'?'🇰🇷':'🇬🇧')+'</b>'
  +(mastered?' · 🌐 Song ngữ: '+mastered+'/30 boss':'')
  +'<div class="v19hpbar"><i style="width:'+Math.round(won/total*100)+'%"></i></div></div>'
  +'<div class="v19map" id="v19map"><svg class="v19mappath" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="'+mapPathD()+'" vector-effect="non-scaling-stroke"/></svg>'
  +(D19().zones||[]).map(function(z){return zoneNodeHTML(z,lang)}).join('')
  +'</div><div id="v19zonedetail"></div><div id="v19fight"></div></div>';
  return h;
}
function renderMap(){
  var v=V15();if(!v)return;
  if(v.tab&&document.querySelector('#v15body')){
    /* only re-render when the map tab is showing */
    var b=$('#v15body');
    if(b&&b.querySelector('.v19mapwrap'))b.innerHTML=mapHTML();
  }
}
function openMap(){var v=V15();if(v)v.openHub('map')}
/* V11.1 — one shared entry point for both hubs. Opens the SAME Boss Map
   (no copy), pre-selects the combat language, and remembers which hub the
   player came from. It never touches the main learning-language choice
   (__v15.setLang): only the V19 combat language (en19().lang) changes. */
var MAP_ORIGIN='en'; /* 'en' = English Hub, 'ko' = Korean Hub */
function openMapFor(lang){
  if(lang==='en'||lang==='ko'){en19().lang=lang;save19();}
  MAP_ORIGIN=(lang==='en'||lang==='ko')?lang:lang19();
  openMap();
}
function mapOrigin(){return MAP_ORIGIN}
function zoneDetail(zid){
  var z=D19().zoneById(zid);if(!z)return;
  var lang=lang19();
  var host=$('#v19zonedetail');if(!host)return;
  var st=zoneState(zid,lang);
  var main=D19().byId(z.main);
  var h='<div class="v19zdetail"><button class="v15x" onclick="__v19.zoneClose()" aria-label="Đóng">✕</button>'
  +'<div class="v19zd-top"><img src="'+(main?main.img:'')+'" alt="" onerror="this.style.display=\'none\'">'
  +'<div><h3>'+esc(z.vi)+' <span class="mute">'+esc(z.n)+'</span></h3>'
  +'<p>'+elChip19({el:z.el})+' · Thử thách: '+esc(z.challenge)+'</p>'
  +'<p class="mute">'+esc(z.desc)+'</p>'
  +'<p><b>Trạng thái ('+(lang==='ko'?'🇰🇷 Tiếng Hàn':'🇬🇧 Tiếng Anh')+'):</b> '
  +(st==='locked'?'🔒 Đang khóa — '+esc(zoneNeedText(zid,lang))
    :st==='mastered'?'👑 Đã làm chủ (3 sao cả 3 boss)'
    :st==='completed'?'✅ Đã hoàn thành ('+zoneWins(zid,lang)+'/3 boss)'
    :st==='progress'?'⚔️ Đang chinh phục ('+zoneWins(zid,lang)+'/3 boss)'
    :'🗺️ Đã mở — chưa thắng boss nào')
  +'</p>'
  +'<p><b>Thưởng hoàn thành vùng (mỗi ngôn ngữ, 1 lần):</b> +'+z.reward.xp+' XP, +'+z.reward.gems+' 💎, '+esc(z.reward.item)+'</p>'
  +'<p class="mute">⭐ Thắng trận · ⭐⭐ Thắng với độ chính xác ≥ 80% · ⭐⭐⭐ Độ chính xác ≥ 90% và còn ít nhất 3 tim.</p>'
  /* V22: chọn bộ từ Basic Tactics trước khi đánh boss tiếng Anh */
  +(lang==='en'&&window.__v22&&__v22.bossScopeHTML?__v22.bossScopeHTML():'')
  +'</div></div>';
  if(st!=='locked'){
    h+='<div class="v19zbosses">'+z.bosses.map(function(id){
      var b=D19().byId(id);if(!b)return '';
      var won=isWon19(id,lang),un=bossUnlocked19(id,lang),st2=stars19(id,lang);
      var mast=isMastered19(id);
      return '<div class="v19zboss '+(won?'done':'')+(!un?'locked':'')+'">'
      +'<img src="'+b.img+'" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
      +'<b>'+esc(b.vi)+'</b><span class="mute">'+esc(b.n)+' · Lv '+b.lv+'</span>'
      +'<span>'+elChip19(b)+rarChip19(b)+'</span>'
      +'<span class="mute">HP '+b.hp+' · Thủ '+b.def+' · '+esc(b.mode)+' · '+esc(b.diff)+'</span>'
      +'<span>'+starStr(st2)+(mast?' 🌐 Song ngữ':'')+'</span>'
      +'<em>'+(won?'✅ Đã thắng ('+starStr(st2)+')':(un?'⚔️ Có thể đánh':'🔒 Thắng boss trước để mở'))+'</em>'
      +'<p class="mute">Kỹ năng: '+esc(b.skills.elem.n)+' · Tuyệt kỹ: '+esc(b.skills.ult.n)+'</p>'
      +(un?'<button class="btn pri" onclick="__v19.fight(\''+b.id+'\')">Bắt đầu chiến đấu</button>':'')
      +'</div>';
    }).join('')+'</div>';
  }
  h+='</div>';
  host.innerHTML=h;
  host.scrollIntoView&&host.scrollIntoView();
}
function zoneClose(){var host=$('#v19zonedetail');if(host)host.innerHTML=''}
function challenge(id){fight(id)}

/* ---------- question pools (same sources as V18; shared ruleset) ---------- */
function distractorsEN(w,n){
  var v=V15();var words=(v&&v.words)||[];
  var pool=words.filter(function(x){return x.id!==w.id&&(x.t===w.t||x.lv===w.lv)});
  /* V22 (sửa): khi đang chọn phạm vi Thư viện, đáp án nhiễu phải lấy
     trong cùng phạm vi. Lọc theo chủ đề/cấp độ TRƯỚC làm cạn nguồn —
     từ BT trùng với V14/V15 giữ t/lv cũ nên từ BT-only (t='bt') bị
     loại, chỉ còn 1–2 ứng viên và từ ngoài phạm vi lọt vào đáp án.
     Lấy toàn bộ từ trong phạm vi trước; đủ n thì dùng, không đủ mới
     về lại lọc chủ đề/cấp độ. */
  try{
    var sc=v&&v.en15().scope;
    if(sc&&sc.kind==='lib'&&v.inScope){
      var inSc=words.filter(function(x){return x.id!==w.id&&v.inScope(x)});
      if(inSc.length>=n)pool=inSc;
    }
  }catch(e){}
  return shuffle(pool).slice(0,n);
}
function wordPool(b){
  var v=V15();var words=(v&&v.words)||[];
  /* V22: phạm vi Thư viện đang chọn (vd Basic Tactics) thắng bộ lọc
     mặc định của boss — trận đấu dùng đúng từ người chơi đã chọn. */
  try{
    var sc=v&&v.en15().scope;
    if(sc&&sc.kind==='lib'&&v.wordsFiltered){
      var sl=v.wordsFiltered({level:'ALL'});
      if(sl.length>=8)return shuffle(sl);
      /* phạm vi quá nhỏ (vd 'chỉ cần ôn' trên một Unit ít từ) — nới
         bộ lọc trạng thái nhưng giữ nguyên lựa chọn Unit/loại từ */
      var sc2={kind:'lib',lib:sc.lib,unit:sc.unit,type:sc.type};
      var sl2=v.wordsFiltered({scope:sc2,level:'ALL'});
      if(sl2.length)return shuffle(sl2);
      if(sl.length)return shuffle(sl);
    }
  }catch(e){}
  var list=words.filter(function(w){
    if(b.diff&&w.lv!==b.diff)return false;
    return true;
  });
  if(list.length<12)list=words.slice();
  return shuffle(list);
}
function grammarPool(b){
  var g=(window.__V15_DATA&&__V15_DATA.grammar)||[];
  var list=g.filter(function(x){return x.lv===b.diff});
  return shuffle(list.length?list:g);
}
function readPool(){return shuffle((window.__V15_DATA&&__V15_DATA.reading)||[])}
function builderPool(){return shuffle((window.__V15_DATA&&__V15_DATA.builder)||[])}
function koCardsRaw(){
  /* Korean question pool: all of the player's Korean cards (Hangul + meaning).
     If the player has selected a Korean deck (S.deck) and that deck holds
     at least 8 usable cards, questions come from that deck only; otherwise
     the pool falls back to all cards. No SRS-status filter: boss questions
     use the deck as it is, mastered or not.
     NOTE (V11.1 fix): read bare S, NOT window.S — V6 declares `let S`, a
     lexical global that is NOT a window property, so window.S is undefined
     and the pool used to come back empty (every KO fight silently fell back
     to English questions with a "0/8 cards" banner). Same fix in v18.js. */
  var cards=[];try{cards=(S&&S.cards)||[]}catch(e){}
  cards=cards.filter(function(c){return c&&c.h&&c.m});
  var deck='';try{deck=(S&&S.deck)||''}catch(e){}
  if(deck){
    var dc=cards.filter(function(c){return c.d===deck});
    if(dc.length>=8)return dc;
  }
  return cards;
}
function koCards(){return shuffle(koCardsRaw())}
function koPool(){
  return koCards();
}
function distractorsKO(c,n){
  var pool=koCardsRaw().filter(function(x){return x.id!==c.id&&x.h&&x.m});
  return shuffle(pool).slice(0,n);
}
function koCount(){return koCardsRaw().length}

/* ---------- SRS marking (mirrors V15 mark15 / V18 mark18) ---------- */
function dayNo19(){return Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5)}
function todayStr19(){return new Date().toDateString()}
function mark19(ok,w){
  if(!w)return;
  var v=V15();if(!v)return;
  var old=v.enOld(),e=v.en15(),id=w.id,before=old.box[id]||0;
  old.box=old.box||{};old.right=old.right||{};old.wrong=old.wrong||{};
  old.review=old.review||[];old.xpAt=old.xpAt||{};
  if(ok){
    old.right[id]=(old.right[id]||0)+1;
    old.streak=(old.streak||0)+1;
    old.box[id]=Math.min(5,before+1);
    var ri=old.review.indexOf(id);if(ri>=0)old.review.splice(ri,1);
    var iv=[1,3,7,14,30][Math.min(4,old.box[id]-1)]||1;
    e.intv[id]=iv;e.due[id]=Date.now()+iv*864e5;
  }else{
    old.wrong[id]=(old.wrong[id]||0)+1;
    old.streak=0;old.box[id]=0;
    if(old.review.indexOf(id)<0)old.review.push(id);
    e.intv[id]=0;e.due[id]=Date.now()+10*60*1000;
  }
  var xp=0;
  if(ok&&old.box[id]>before){
    var last=old.xpAt[id]||0;
    if(Date.now()-last>600000){xp=10;old.xpAt[id]=Date.now()}
  }
  if(ok&&old.streak>0&&old.streak%5===0)xp+=5;
  if(xp>0)gain19(xp);
  var dn=dayNo19();e.hist[dn]=e.hist[dn]||{c:0,t:0,xp:0};
  e.hist[dn].t++;if(ok)e.hist[dn].c++;e.hist[dn].xp+=xp;
  if(e.daily.d!==todayStr19())e.daily={d:todayStr19(),correct:0,wrong:0,xp:0};
  if(ok){e.daily.correct++;e.daily.xp+=xp}else e.daily.wrong++;
  save19();
}
function markKO19(ok){
  var e=en19();
  if(ok)e.koStats.right++;else e.koStats.wrong++;
  save19();
}

/* ---------- Universal Combat Engine (UCE) ---------- */
var F=null;
function fight(id){
  var b=D19().byId(id);if(!b)return;
  if(!bossUnlocked19(id)){pop19('Boss này chưa mở khóa.');return}
  if(!document.querySelector('#v19fight'))openMap();
  startFight(b,lang19());
}
function startFight(b,lang){
  F={boss:b,lang:lang,hp:b.hp,maxHp:b.hp,hearts:5,maxHearts:5,
    combo:0,score:0,q:0,qCount:0,right:0,wrong:0,wrongCount:0,phase:1,
    shield:(b.skills.elem.id==='shield'?30:0),cleansed:false,
    over:null,pools:null,cur:null,answered:null,ok:null,heard:null,
    anim:'idle',banner:null,hideIpa:false,rewardNote:'',firstWin:false,stars:0,
    timer:null,left:0,lastDmg:0,crit:false,
    ultUsed:false,ultActive:false,caQ:0,caRight:0,
    enraged:false,nextTimer:0,nextVeil:false};
  if(lang==='ko'&&koCount()<8)
    F.banner='⚠️ Bạn mới có '+koCount()+'/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ.';
  nextQ();renderFight();
}
function timerFor(){
  var b=F.boss,sk=b.skills.elem.id;
  if(F.nextTimer>0){var t=F.nextTimer;F.nextTimer=0;return t}
  if(F.ultActive)return 15;
  var lim=0;
  if(sk==='freeze')lim=15;
  else if(sk==='gale')lim=8;
  else if(sk==='rift')lim=12;
  else if(b.mode==='speed')lim=8;
  else if(F.phase===3)lim=10;
  /* passive swift only shortens an existing timer — it never creates one */
  if(b.skills.pass.id==='swift'&&lim>0)lim=Math.max(5,lim-2);
  return lim;
}
function nextQ(){
  if(!F)return;
  if(F.ultActive){
    /* Knowledge Counterattack: 3 quick questions, no normal combat effects */
    if(F.caQ>=3){resolveUltimate();return}
    var b=F.boss;
    var mode=['mc','type','listen'][F.caQ%3];
    if(F.lang==='ko')mode=['mc','type','listen'][F.caQ%3];
    F.qmode='ca-'+mode;F.caMode=mode;
    if(!F.pools)F.pools={grammar:grammarPool(b),read:readPool(),builder:builderPool(),words:wordPool(b),ko:koPool()};
    var P=F.pools;
    F.caQ++;
    if(F.lang==='ko'&&P.ko.length>=8){
      var c=P.ko[(F.q+F.caQ)%P.ko.length];
      F.cur={k:c,opts:shuffle([c].concat(distractorsKO(c,3))),ko:true};
    }else{
      var w=P.words[(F.q+F.caQ)%P.words.length];
      var opts=shuffle([w].concat(distractorsEN(w,3)));
      F.cur={w:w,opts:opts,optsVi:shuffle([w].concat(distractorsEN(w,3)))};
    }
    F.answered=null;F.ok=null;startTimer();return;
  }
  var b2=F.boss;
  var mode=b2.mode==='mixed'?['mc','grammar','listen','builder'][F.q%4]:b2.mode;
  if(b2.mode==='speed')mode='mc';
  if(F.lang==='ko'){
    if(b2.mode==='mixed')mode=['mc','type','listen','mc'][F.q%4];
    else if(mode==='grammar'||mode==='builder'||mode==='read'||mode==='speak')mode='mc';
  }
  F.qmode=mode;
  F.hideIpa=(b2.skills.elem.id==='veil'||b2.skills.elem.id==='rift')||F.nextVeil;
  F.nextVeil=false;
  if(!F.pools)F.pools={grammar:grammarPool(b2),read:readPool(),builder:builderPool(),words:wordPool(b2),ko:koPool()};
  var P2=F.pools;
  F.qCount++;
  if(F.lang==='ko'&&(mode==='mc'||mode==='type'||mode==='listen')){
    if(P2.ko.length>=8){
      var c2=P2.ko[F.q%P2.ko.length];
      F.cur={k:c2,opts:shuffle([c2].concat(distractorsKO(c2,3))),ko:true};
      F.answered=null;F.ok=null;startTimer();return;
    }
  }
  if(mode==='grammar'){F.cur={g:P2.grammar[F.q%P2.grammar.length]}}
  else if(mode==='read'){var p=P2.read[F.q%P2.read.length];F.cur={p:p,q:p.qs[F.q%p.qs.length]}}
  else if(mode==='builder'){var s=P2.builder[F.q%P2.builder.length];var toks=s.s.replace(/([.!?])$/,'').split(' ');var wrong=[];for(var k=0;k<3;k++){var sh=shuffle(toks);if(sh.join(' ')!==toks.join(' '))wrong.push(sh.join(' ')+' .')}while(wrong.length<3)wrong.push(shuffle(toks).join(' ')+' .');F.cur={s:s,opts:shuffle([s.s].concat(wrong))}}
  else if(mode==='speak'){var w2=P2.words[F.q%P2.words.length];F.cur={w:w2,opts:shuffle([w2].concat(distractorsEN(w2,3)))}}
  else{var w3=P2.words[F.q%P2.words.length];var opts2=shuffle([w3].concat(distractorsEN(w3,3)));F.cur={w:w3,opts:opts2,optsVi:shuffle([w3].concat(distractorsEN(w3,3)))}}
  F.answered=null;F.ok=null;
  startTimer();
}
function startTimer(){
  if(F.timer){clearInterval(F.timer);F.timer=null}
  var limit=timerFor();
  if(!limit){F.left=0;return}
  F.left=limit;
  F.timer=setInterval(function(){
    if(!F)return;
    F.left--;
    var t=$('#v19boss-t');if(t)t.textContent=F.left+'s';
    if(F.left<=0){clearInterval(F.timer);F.timer=null;answer(false,true)}
  },1000);
}
function healBoss(n,msg){
  if(!F||F.over)return;
  F.hp=Math.min(F.maxHp,F.hp+n);
  F.banner=(F.banner?F.banner+' ':'')+msg;
}
function useTact(){
  /* tactical skill: every 5th answered question */
  var b=F.boss,t=b.skills.tact.id;
  if(t==='tshield'){F.shield=(F.shield||0)+15;F.banner='🛡️ '+b.vi+' dùng '+b.skills.tact.n+': +15 khiên!'}
  else if(t==='theal'){healBoss(12,'💚 '+b.vi+' dùng '+b.skills.tact.n+': hồi 12 HP!')}
  else if(t==='ttimer'){F.nextTimer=10;F.banner='⏳ '+b.vi+' dùng '+b.skills.tact.n+': câu sau chỉ còn 10 giây!'}
  else if(t==='tveil'){F.nextVeil=true;F.banner='🌫️ '+b.vi+' dùng '+b.skills.tact.n+': câu sau ẩn phiên âm!'}
  else if(t==='tenrage'){F.enraged=true;F.banner='😡 '+b.vi+' dùng '+b.skills.tact.n+': lần sai sau mất thêm 1 tim!'}
}
function checkPhase(){
  var b=F.boss;if(!b||F.over||F.hp<=0||F.ultActive||F.ultUsed)return;
  if(F.phase===1&&F.hp<=F.maxHp/2){
    F.phase=2;F.anim='special';
    F.banner='⚡ AWAKENING — '+b.vi+' thức tỉnh! Giai đoạn 2: phòng thủ và kỹ năng mạnh hơn!';
  }
  if(F.phase===2&&F.hp<=F.maxHp*0.2){
    /* Berserk begins with the Ultimate: Knowledge Counterattack */
    F.ultActive=true;F.caQ=0;F.caRight=0;F.anim='special';
    F.banner='⚠️ BOSS ĐANG CHUẨN BỊ TUYỆT KỸ: '+b.skills.ult.n+'! Trả lời đúng 3 câu liên tiếp để phản công!';
  }
}
function resolveUltimate(){
  /* 3/3: phá hoàn toàn + phản 40 sát thương · 2/3: phản 15, mất 1 tim
     1/3: mất 1 tim · 0/3: mất 2 tim (sát thương tối đa, có giới hạn) */
  var b=F.boss,r=F.caRight;
  F.ultActive=false;F.ultUsed=true;F.phase=3;F.anim='special';
  if(r===3){
    F.hp=Math.max(0,F.hp-40);
    F.banner='💥 PHÁ TUYỆT KỸ! Bạn trả lời đúng 3/3 — phản 40 sát thương! '+b.vi+' bước vào giai đoạn Cuồng nộ (sai mất 2 tim)!';
  }else if(r===2){
    F.hp=Math.max(0,F.hp-15);F.hearts=Math.max(0,F.hearts-1);
    F.banner='🛡️ Phản công một phần (2/3): giảm 70% sát thương, phản 15 sát thương, mất 1 tim. Giai đoạn Cuồng nộ bắt đầu!';
  }else if(r===1){
    F.hearts=Math.max(0,F.hearts-1);
    F.banner='😖 Chỉ đúng 1/3: giảm 30% sát thương, mất 1 tim. Giai đoạn Cuồng nộ bắt đầu!';
  }else{
    F.hearts=Math.max(0,F.hearts-2);
    F.banner='💢 Không phá được tuyệt kỹ (0/3): nhận sát thương tối đa, mất 2 tim! Giai đoạn Cuồng nộ bắt đầu!';
  }
  if(F.hp<=0){F.hp=0;F.over='win';F.anim='defeat';winReward()}
  else if(F.hearts<=0){F.hearts=0;F.over='lose';F.anim='attack'}
  save19();renderFight();
}
function answer(ok,timeout){
  if(!F||F.answered!==null)return;
  if(F.timer){clearInterval(F.timer);F.timer=null}
  F.answered=timeout?'timeout':1;F.ok=ok;
  var b=F.boss;
  if(F.ultActive){
    /* counterattack questions: score only, no boss damage / no heart loss yet */
    if(ok){F.caRight++;F.right++}else F.wrong++;
    if(F.cur&&F.cur.w)mark19(ok,F.cur.w);
    if(F.cur&&F.cur.k)markKO19(ok);
    renderFight();
    return;
  }
  if(ok){
    F.combo++;F.score++;F.right++;
    var crit=(F.combo%5===0)||(Math.random()<0.1);
    var dmg=12+F.combo*2;
    if(b.skills.elem.id==='gale')dmg=Math.round(dmg*1.25);
    if(F.phase===3)dmg=Math.round(dmg*1.5);
    if(crit)dmg*=2;
    var def=b.def||0;
    if(b.skills.pass.id==='bulwark'&&F.hp<=F.maxHp/2)def+=2;
    dmg=Math.max(2,dmg-def);
    var dealt=dmg;
    if(F.shield>0){dealt=Math.max(1,Math.ceil(dmg/2));F.shield=Math.max(0,F.shield-dealt)}
    F.hp-=dealt;F.anim='hit';F.lastDmg=dealt;F.crit=crit;
    if(F.cur&&F.cur.w)mark19(true,F.cur.w);
    if(F.cur&&F.cur.k)markKO19(true);
    pop19((crit?'CHÍ MẠNG! -':'-')+dealt+' HP');
  }else{
    var cost=1;
    if(F.phase===3)cost=2;
    if(b.skills.elem.id==='chain'&&F.wrongCount%3===2)cost+=1;
    if(b.skills.pass.id==='thorns'&&F.wrongCount%3===2)cost+=1;
    if(F.enraged){cost+=1;F.enraged=false}
    if(b.skills.elem.id==='cleanse'&&!F.cleansed){cost=0;F.cleansed=true;F.banner='✨ Thanh Tẩy: lần sai đầu tiên không mất tim!'}
    F.combo=0;F.hearts-=cost;F.anim='attack';F.wrongCount++;F.wrong++;
    if(F.cur&&F.cur.w)mark19(false,F.cur.w);
    if(F.cur&&F.cur.k)markKO19(false);
    if(b.skills.elem.id==='burn')healBoss(8,'🔥 Thiêu Đốt: boss hồi 8 HP!');
    if(b.skills.elem.id==='regen'&&F.wrongCount%2===0)healBoss(10,'💧 Dòng Chảy: boss hồi 10 HP!');
    if(b.skills.pass.id==='vampiric')healBoss(4,'🧛 Hút Sinh Lực: boss hồi 4 HP!');
  }
  var qc=F.qCount;
  if(b.skills.elem.id==='heal'&&qc>0&&qc%4===0)healBoss(6,'🌸 Hồi Phục: boss hồi 6 HP!');
  if(qc>0&&qc%5===0)useTact();
  checkPhase();
  if(F.hp<=0){F.hp=0;F.over='win';F.anim='defeat';winReward()}
  else if(F.hearts<=0){F.hearts=0;F.over='lose';F.anim='attack'}
  save19();renderFight();
  if(F&&!F.over){var f=F;setTimeout(function(){if(F===f&&!F.over){F.anim='idle';var h=$('#v19fight');if(h)renderFight()}},450)}
}
function starCalc(){
  var tot=F.right+F.wrong;
  var acc=tot?F.right/tot:0;
  var s=1;
  if(acc>=0.8)s=2;
  if(acc>=0.9&&F.hearts>=3)s=3;
  return s;
}
function winReward(){
  var b=F.boss,lang=F.lang,e=en19();
  var rec=rec19(b.id,lang);
  F.stars=starCalc();
  if(rec.win){
    rec.wins=(rec.wins||1)+1;e.bosses[b.id][lang]=rec;
    gain19(10);
    F.rewardNote='Đánh lại để luyện tập: +10 XP. Phần thưởng lần đầu ('+(lang==='ko'?'tiếng Hàn':'tiếng Anh')+') chỉ nhận một lần.';
  }else{
    rec.win=1;rec.wins=1;rec.best=Math.max(rec.best||0,F.stars);
    e.bosses[b.id][lang]=rec;
    gain19(b.reward.xp);
    try{S.v7.gems=(S.v7.gems||0)+b.reward.gems}catch(err){}
    F.rewardNote='Phần thưởng lần đầu ('+(lang==='ko'?'tiếng Hàn':'tiếng Anh')+'): +'+b.reward.xp+' XP, +'+b.reward.gems+' 💎, '+b.reward.item
      +(b.reward.title?', danh hiệu “'+b.reward.title+'”':'')+'.';
    if(b.reward.title&&e.titles.indexOf(b.reward.title)<0)e.titles.push(b.reward.title);
    F.firstWin=true;
    /* bilingual mastery badge + title */
    if(isMastered19(b.id)&&e.titles.indexOf('Bậc Thầy Song Ngữ')<0){
      e.titles.push('Bậc Thầy Song Ngữ');
      F.rewardNote+=' 🌐 Song ngữ: đã đánh bại boss này bằng cả hai ngôn ngữ — danh hiệu “Bậc Thầy Song Ngữ”!';
    }
    /* zone completion (per language, once) */
    var z=D19().zoneById(b.zone);
    if(z&&zoneWins(b.zone,lang)>=3){
      var ck=e.zoneClaimed[b.zone]=e.zoneClaimed[b.zone]||{};
      if(!ck[lang]){
        ck[lang]=1;
        gain19(z.reward.xp);
        try{S.v7.gems=(S.v7.gems||0)+z.reward.gems}catch(err){}
        F.rewardNote+=' 🎁 Hoàn thành vùng '+z.vi+': +'+z.reward.xp+' XP, +'+z.reward.gems+' 💎, '+z.reward.item+'.';
      }
    }
  }
  if(F.stars>(rec.stars||0)){rec.stars=F.stars;e.bosses[b.id][lang]=rec}
  save19();
}
function pick(i){
  if(!F||F.answered!==null||F.over)return;
  var mode=F.ultActive?F.caMode:F.qmode,ok=false;
  if(mode==='grammar')ok=(i===F.cur.g.a);
  else if(mode==='read')ok=(i===F.cur.q.a);
  else if(mode==='builder')ok=(F.cur.opts[i]===F.cur.s.s);
  else if(mode==='speak')ok=(!!F.cur.opts[i]&&F.cur.opts[i].id===F.cur.w.id);
  else if(F.cur.ko)ok=(!!F.cur.opts[i]&&F.cur.opts[i].id===F.cur.k.id);
  else if(mode==='type'||mode==='listen')ok=(!!F.cur.opts[i]&&F.cur.opts[i].id===F.cur.w.id);
  else ok=(!!F.cur.optsVi[i]&&F.cur.optsVi[i].id===F.cur.w.id);
  answer(ok,false);
}
function next(){
  if(!F||F.over)return;
  if(F.ultActive){F.answered=null;F.ok=null;nextQ();renderFight();return}
  F.q++;F.banner=null;nextQ();renderFight();
}
function close(){
  if(F&&F.timer)clearInterval(F.timer);
  F=null;
  var host=$('#v19fight');if(host)host.innerHTML='';
  renderMap();
}
function speakWord(id){var v=V15();if(v)v.speakWord(id)}
function bossSpeak(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR||!F)return;
  var w=F.cur.w;if(!w)return;
  var rec=new SR();rec.lang='en-US';rec.interimResults=false;rec.maxAlternatives=3;
  try{rec.start()}catch(e){return}
  rec.onresult=function(ev){
    var heard='';try{heard=ev.results[0][0].transcript||''}catch(e){}
    F.heard=heard;
    var norm=function(s){return (s||'').toLowerCase().replace(/[^a-z0-9\s']/g,'').replace(/\s+/g,' ').trim()};
    var ok=norm(heard)===norm(w.en)||norm(heard).indexOf(norm(w.en))>=0;
    answer(ok,false);
  };
  rec.onerror=function(){F.heard='(không nghe được)';renderFight()};
}
function speakKO(text){
  try{speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=.8;speechSynthesis.speak(u)}catch(e){}
}

/* ---------- fight rendering ---------- */
function renderFight(){
  var host=$('#v19fight');if(!host)return;
  if(!F){host.innerHTML='';return}
  var b=F.boss;
  var phaseTxt='<span class="v19phase">Giai đoạn '+F.phase+'/3'+(F.phase===1?' — khởi đầu':(F.phase===2?' — Thức tỉnh':' — Cuồng nộ'))+'</span>';
  var sk=b.skills;
  var h='<div class="v19fight '+(F.over==='win'?'win':'')+'">'
  +'<div class="v19fight-top"><img class="v19boss-img anim-'+F.anim+'" src="'+b.img+'" alt="" onerror="this.style.display=\'none\'">'
  +'<div class="v19fight-info"><b>'+esc(b.vi)+'</b> <span class="mute">'+esc(b.n)+' · Lv '+b.lv+' · '+esc((D19().zoneById(b.zone)||{}).vi||'')+'</span>'
  +'<div>'+elChip19(b)+rarChip19(b)+phaseTxt+'</div>'
  +'<span class="mute">⚔️ '+esc(sk.basic.n)+' · '+esc(sk.elem.n)+' · '+esc(sk.tact.n)+' · '+esc(sk.pass.n)+' · 💥 '+esc(sk.ult.n)+'</span>'
  +'<div class="v19hpbar"><i style="width:'+Math.max(0,F.hp/F.maxHp*100)+'%"></i></div><span>HP '+Math.max(0,F.hp)+'/'+F.maxHp+(F.shield>0?' · 🛡️ Lá chắn: '+F.shield:'')+'</span>'
  +'<div class="v19hearts">Tim của bạn: '+'♥'.repeat(F.hearts)+'♡'.repeat(Math.max(0,F.maxHearts-F.hearts))+' · Combo x'+F.combo+' · Đúng '+F.score+(F.lang==='ko'?' · 🇰🇷 Tiếng Hàn':'')+'</div>'
  +(F.left?'<div class="mute">Còn <span id="v19boss-t">'+F.left+'s</span></div>':'')
  +(F.ultActive&&F.caQ>0?'<div class="v19banner">⚠️ PHẢN CÔNG BẰNG KIẾN THỨC — Câu '+(Math.min(F.caQ,3))+'/3 · Đúng '+F.caRight+'/3 · Đúng 3/3 phá hoàn toàn tuyệt kỹ!</div>':'')
  +(F.banner?'<div class="v19banner">'+esc(F.banner)+'</div>':'')
  +'</div></div>';
  if(F.over){
    h+='<div class="v19done"><div class="v19done-big">'+(F.over==='win'?'CHIẾN THẮNG!':'Thua rồi…')+'</div>'
    +'<p>'+(F.over==='win'
      ?'Bạn đã đánh bại '+esc(b.vi)+'! '+starStr(F.stars)+' '+esc(F.rewardNote)
      :'Boss còn '+Math.max(0,F.hp)+' HP. Hãy luyện thêm rồi quay lại!')+'</p>'
    +'<p class="mute">Độ chính xác: '+F.right+'/'+(F.right+F.wrong)+' câu đúng.</p>'
    +'<div class="acts"><button class="btn pri" onclick="__v19.fight(\''+b.id+'\')">Đánh lại</button><button class="btn" onclick="__v19.close()">Về bản đồ</button></div></div>';
  }else{
    h+=qHTML();
  }
  h+='</div>';
  host.innerHTML=h;
}
function feedback(ex){
  if(F.answered===null)return '';
  var h='<div class="v19explain" style="color:var(--'+(F.ok?'ok':'bad')+')">'+(F.ok?'Đòn đánh trúng!':'Boss phản công!')+(ex?' <span class="mute">'+esc(ex)+'</span>':'')+'</div><div class="acts"><button class="btn pri" onclick="__v19.next()">Tiếp tục</button></div>';
  return h;
}
function optBtn(label,i,correct){
  var cl='';if(F.answered!==null)cl=(correct?'right':(i===F.answered?'wrong':''));
  return '<button class="v19opt '+cl+'" '+(F.answered!==null?'disabled':'')+' onclick="__v19.pick('+i+')">'+label+'</button>';
}
function qHTML(){
  var c=F.cur,mode=F.ultActive?(F.caMode||F.qmode):F.qmode;
  if(c.ko){
    var k=c.k;
    if(mode==='listen'){
      return '<div class="v19qcard"><div class="v19qword">Nghe tiếng Hàn</div><div class="acts"><button class="btn pri" onclick="__v19.speakKO(\''+esc(k.h).replace(/'/g,'\\\'')+'\')">Nghe phát âm</button></div></div><div class="v19opts">'+c.opts.map(function(o,i){return optBtn(esc(o.h),i,o.id===k.id)}).join('')+'</div>'+feedback('');
    }
    if(mode==='type'){
      return '<div class="v19qcard"><div class="v19qword vi">'+esc(k.m)+'</div><div class="mute">Chọn từ tiếng Hàn đúng</div></div><div class="v19opts">'+c.opts.map(function(o,i){return optBtn(esc(o.h),i,o.id===k.id)}).join('')+'</div>'+feedback('');
    }
    return '<div class="v19qcard"><div class="v19qword">'+esc(k.h)+'</div><div class="mute">'+esc(k.p||'')+' · Chọn nghĩa đúng</div></div><div class="v19opts">'+c.opts.map(function(o,i){return optBtn(esc(o.m),i,o.id===k.id)}).join('')+'</div>'+feedback('');
  }
  if(mode==='grammar'){
    var g=c.g;
    return '<div class="v19qcard"><div class="v19qword small">'+esc(g.q)+'</div></div><div class="v19opts">'+g.o.map(function(o,i){return optBtn(esc(o),i,i===g.a)}).join('')+'</div>'+feedback(g.ex);
  }
  if(mode==='read'){
    var q=c.q;
    return '<div class="v19passage"><b>'+esc(c.p.title)+'</b><p>'+esc(c.p.text)+'</p></div><div class="v19qcard"><div class="v19qword small">'+esc(q.q)+'</div></div><div class="v19opts">'+q.o.map(function(o,i){return optBtn(esc(o),i,i===q.a)}).join('')+'</div>'+feedback('');
  }
  if(mode==='builder'){
    return '<div class="v19qcard"><div class="v19qword small">Chọn câu đúng · Nghĩa: '+esc(c.s.vi)+'</div></div><div class="v19opts">'+c.opts.map(function(o,i){return optBtn(esc(o),i,o===c.s.s)}).join('')+'</div>'+feedback('');
  }
  if(mode==='speak'){
    var w=c.w,supported=!!(window.SpeechRecognition||window.webkitSpeechRecognition);
    var h='<div class="v19qcard"><div class="v19qword">'+esc(w.en)+'</div><div class="mute">'+esc(w.ipa)+' · '+esc(w.vi)+'</div><div class="acts"><button class="btn sm" onclick="__v15.speakWord(\''+w.id+'\')">Nghe mẫu</button></div></div>';
    if(supported){
      h+='<p class="mute">Bấm “Nói” và đọc to từ trên. Máy sẽ so khớp phát âm của bạn.</p><div class="acts"><button class="btn pri" onclick="__v19.bossSpeak()">Nói</button></div>';
      if(F.heard)h+='<div class="v19explain">Máy nghe được: “<b>'+esc(F.heard)+'</b>”</div>';
    }else{
      h+='<div class="v19warn"><b>Trình duyệt không hỗ trợ nhận dạng giọng nói.</b> Chế độ thay thế: nghe mẫu rồi chọn từ bạn nghe được — không chấm điểm phát âm.</div><div class="v19opts">'+c.opts.map(function(o,i){return optBtn(esc(o.en),i,o.id===w.id)}).join('')+'</div>';
      F.cur.opts=c.opts;
    }
    h+=feedback('');
    return h;
  }
  var w2=c.w;
  if(mode==='listen'){
    return '<div class="v19qcard"><div class="v19qword">Nghe</div><div class="acts"><button class="btn pri" onclick="__v15.speakWord(\''+w2.id+'\')">Nghe phát âm (1 lần)</button></div></div><div class="v19opts">'+c.opts.map(function(o,i){return optBtn(esc(o.en),i,o.id===w2.id)}).join('')+'</div>'+feedback('');
  }
  if(mode==='type'){
    return '<div class="v19qcard"><div class="v19qword vi">'+esc(w2.vi)+'</div><div class="mute">Chọn cách viết đúng của từ này</div></div><div class="v19opts">'+c.opts.map(function(o,i){return optBtn(esc(o.en),i,o.id===w2.id)}).join('')+'</div>'+feedback('');
  }
  return '<div class="v19qcard"><div class="v19qword">'+esc(w2.en)+'</div><div class="mute">'+(F.hideIpa?'Chọn nghĩa đúng':esc(w2.ipa)+' · Chọn nghĩa đúng')+'</div></div><div class="v19opts">'+c.optsVi.map(function(o,i){return optBtn(esc(o.vi),i,o.id===w2.id)}).join('')+'</div>'+feedback('');
}

/* ---------- test hooks (used by the jsdom suite; harmless in production) ---------- */
function pickCorrect(){
  if(!F||F.answered!==null||F.over)return false;
  var mode=F.ultActive?F.caMode:F.qmode,idx=-1;
  if(mode==='grammar')idx=F.cur.g.a;
  else if(mode==='read')idx=F.cur.q.a;
  else if(mode==='builder')idx=F.cur.opts.indexOf(F.cur.s.s);
  else if(F.cur.ko)idx=F.cur.opts.findIndex(function(o){return o.id===F.cur.k.id});
  else if(mode==='speak'){answer(true,F.cur.en,F.cur.en);return true;}
  else if(mode==='type'||mode==='listen')idx=F.cur.opts.findIndex(function(o){return o.id===F.cur.w.id});
  else idx=F.cur.optsVi.findIndex(function(o){return o.id===F.cur.w.id});
  if(idx<0)return false;
  pick(idx);return true;
}
function pickWrong(){
  if(!F||F.answered!==null||F.over)return false;
  var mode=F.ultActive?F.caMode:F.qmode,idx=-1;
  if(mode==='grammar')idx=(F.cur.g.a+1)%F.cur.g.o.length;
  else if(mode==='read')idx=(F.cur.q.a+1)%F.cur.q.o.length;
  else if(mode==='builder')idx=F.cur.opts.findIndex(function(o){return o!==F.cur.s.s});
  else if(F.cur.ko)idx=F.cur.opts.findIndex(function(o){return o.id!==F.cur.k.id});
  else if(mode==='speak'){answer(false,'',F.cur.en);return true;}
  else if(mode==='type'||mode==='listen')idx=F.cur.opts.findIndex(function(o){return o.id!==F.cur.w.id});
  else idx=F.cur.optsVi.findIndex(function(o){return o.id!==F.cur.w.id});
  if(idx<0)return false;
  pick(idx);return true;
}

window.__v19={
  mapHTML:mapHTML,renderMap:renderMap,openMap:openMap,openMapFor:openMapFor,mapOrigin:mapOrigin,
  zoneDetail:zoneDetail,zoneClose:zoneClose,challenge:challenge,
  fight:fight,pick:pick,next:next,close:close,speakWord:speakWord,bossSpeak:bossSpeak,
  speakKO:speakKO,en19:en19,setLang:setLang19,lang:lang19,
  isWon:isWon19,isWonAny:isWonAny19,isMastered:isMastered19,stars:stars19,
  zoneOpen:zoneOpen,zoneState:zoneState,bossUnlocked:bossUnlocked19,
  zoneWins:zoneWins,mapWon:mapWon,
  get bosses(){return D19()},
  _test:{F:function(){return F},pickCorrect:pickCorrect,pickWrong:pickWrong,
    fight:fight,close:close,next:next,en19:en19,zoneOpen:zoneOpen,
    setLang:setLang19,openMapFor:openMapFor,mapOrigin:mapOrigin,koCardsRaw:koCardsRaw,koCount:koCount,
    resolveUltimate:resolveUltimate},
  version:'14.0.0'
};
})();
