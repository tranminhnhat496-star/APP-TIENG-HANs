/* ===== V18 — 30 NEW BOSSES (V10, additive layer) =====
   Built ON TOP of V9. It never edits V6/V14/V15/V16/V17 logic — the only
   touch points in v15.js are three surgical, guarded hooks (see
   CHANGED_FILES.md): a "collection" hub tab, the bosses tab appending
   __v18.arenasHTML(), and version '10.0.0'. The 10 original V15 bosses
   still fight in v15.js untouched; V18 only reads their win state
   (S.v7.en15.bosses) for arena unlocks and the Collection.

   New state (new key, migration-safe): S.v7.en18 = {bosses:{}, stones:{},
   titles:[], koStats:{right:0,wrong:0}, created}. First-win rewards are
   once-only; replay wins give +10 XP practice reward.
   Shared wallet: XP via __v15.gain15(), gems via S.v7.gems — same as V15.
   EN word SRS: mark18() mirrors V15 mark15() exactly (box/right/wrong/
   review/due/intv, 10-minute anti-farm XP rule) so boss fights feed the
   same SRS boxes. KO answers only touch en18.koStats — the Korean deck
   (S.cards) is never modified by V18.
*/
(function(){
'use strict';
function $(s,r){return (r||document).querySelector(s)}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function V15(){return window.__v15||null}
function B18(){return window.__V18_BOSSES||{}}
function arenaMeta(id){var a=(B18().arenas||[]);for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null}
function bossById(id){return (B18().byId?B18().byId(id):null)}
function newBosses(){var d=B18();return (d.en||[]).concat(d.el||[],d.leg||[])}
function v19Bosses(){return (window.__V19_DATA&&__V19_DATA.bosses)||[]}
function allBosses(){var d=B18();return (d.old||[]).concat(newBosses(),v19Bosses(),(window.__V33_DATA?__V33_DATA.bosses:[]),(window.__V35_DATA?__V35_DATA.bosses:[]))}

/* ---------- V18 state (new key) ---------- */
function en18(){
  try{S.v7=S.v7||{}}catch(e){return {}}
  var e=S.v7.en18;
  if(!e){e=S.v7.en18={bosses:{},stones:{},titles:[],koStats:{right:0,wrong:0},created:Date.now()};}
  e.bosses=e.bosses||{};e.stones=e.stones||{};e.titles=e.titles||[];
  e.koStats=e.koStats||{right:0,wrong:0};
  return e;
}
function save18(){var v=V15();if(v)v.save15()}
function gain18(n){var v=V15();if(v)v.gain15(n)}
function pop18(t){var v=V15();if(v)v.pop15(t)}

/* ---------- wins / unlocks ---------- */
function oldWins(){try{var e=V15().en15().bosses||{};var n=0;for(var k in e)if(e[k]&&e[k].win)n++;return n}catch(err){return 0}}
function arenaWins(a){var e=en18(),list=(B18()[a]||[]),n=0;list.forEach(function(b){if(e.bosses[b.id]&&e.bosses[b.id].win)n++});return n}
function totalWins(){return oldWins()+arenaWins('en')+arenaWins('el')+arenaWins('leg')}
function arenaOpen(a){
  if(a==='en')return true;
  if(a==='el')return totalWins()>=5;
  if(a==='leg')return arenaWins('el')>=5;
  return false;
}
function arenaNeedText(a){
  if(a==='el')return 'Cần thắng tổng cộng 5 boss ('+totalWins()+'/5).';
  if(a==='leg')return 'Cần thắng 5 boss nguyên tố ('+arenaWins('el')+'/5).';
  return '';
}
function bossUnlocked(b){
  if(b.zone){var v19b=window.__v19;return v19b?v19b.bossUnlocked(b.id):false}
  if(!arenaOpen(b.arena))return false;
  var list=B18()[b.arena]||[],i=list.indexOf(b);
  if(i<=0)return true;
  var prev=list[i-1];
  return !!(en18().bosses[prev.id]&&en18().bosses[prev.id].win);
}
function isWon(b){
  if(b.zone){var v19=window.__v19;return v19?v19.isWonAny(b.id):false}
  if(b.arena==='old'){try{var e=V15().en15().bosses||{};return !!(e[b.id]&&e[b.id].win)}catch(err){return false}}
  return !!(en18().bosses[b.id]&&en18().bosses[b.id].win);
}
function elChip(b){
  var el=(B18().elements||{})[b.el]||((window.__V19_DATA||{}).elements||{})[b.el];if(!el)return '';
  return '<span class="v18chip" style="--ec:'+(el.c||el.color)+'">'+el.ic+' '+esc(el.n)+'</span>';
}
function rarChip(b){
  var r=((B18().rarities||{})[b.rarity])||(((window.__V19_DATA||{}).rarities||{})[b.rarity])||{n:b.rarity,c:'#999'};
  return '<span class="v18chip rar-'+b.rarity+'" style="--ec:'+(r.c||r.color)+'">'+esc(r.n)+'</span>';
}

/* ---------- arenas section (appended to the V15 bosses tab) ---------- */
function arenasHTML(){
  var h='<div class="v18arenas"><h3>⚔️ Đấu Trường Mới — 30 boss (V10)</h3>'
  +'<p class="mute">Ba đấu trường mới với 30 boss từ 3 bộ sưu tập bạn gửi. Boss cũ vẫn ở trên — đánh thắng boss để mở khóa đấu trường tiếp theo. Phần thưởng lần đầu chỉ nhận một lần; đánh lại chỉ được +10 XP luyện tập.</p>'
  +'<div class="v18arena-cards">';
  (B18().arenas||[]).forEach(function(a){
    var wins=arenaWins(a.id),open=arenaOpen(a.id);
    h+='<div class="v18arena" style="--ac:'+a.color+'"><b>'+a.icon+' '+esc(a.n)+'</b><span>'+esc(a.vi)+'</span><p>'+esc(a.desc)+'</p><p class="mute">'+esc(a.need)+'</p><span>Đã thắng: '+wins+'/10</span>'
    +(open?'<button class="btn pri" onclick="__v18.openArena(\''+a.id+'\')">Vào đấu trường</button>':'<em>🔒 '+esc(arenaNeedText(a.id))+'</em>')
    +'</div>';
  });
  h+='</div><div class="acts"><button class="btn" onclick="__v18.openCollection()">🏆 Xem Bộ Sưu Tập Boss (40 boss)</button></div><div id="v18fight"></div></div>';
  return h;
}
function openCollection(){var v=V15();if(v)v.tab('collection')}
function bossCardHTML(b){
  var won=isWon(b),un=bossUnlocked(b);
  var h='<div class="v18boss '+(won?'done':'')+'"><img src="'+b.img+'" alt="" onerror="this.style.display=\'none\'">'
  +'<b>'+b.lv+'. '+esc(b.vi)+'</b><span class="mute">'+esc(b.n)+'</span>'
  +'<span>'+elChip(b)+rarChip(b)+' · HP '+b.hp+' · Lv '+b.lv+'</span>'
  +'<span>'+esc(b.skill.n)+' — '+esc(b.skill.desc)+'</span>'
  +'<span>Thưởng lần đầu: +'+b.reward.xp+' XP, +'+b.reward.gems+' 💎, '+esc(b.reward.item)
  +(b.reward.stone?', '+esc(b.reward.stone):'')+(b.reward.title?', danh hiệu “'+esc(b.reward.title)+'”':'')+'</span>'
  +(won?'<em>Đã thắng ✓ — '+esc(b.reward.item)+' đã nhận</em>'
    :(un?'<button class="btn pri" onclick="__v18.fight(\''+b.id+'\')">Khiêu chiến</button>'
    :'<em>🔒 '+(arenaOpen(b.arena)?'Thắng boss trước để mở khóa':'Chưa mở đấu trường')+'</em>'))
  +'</div>';
  return h;
}
function openArena(a){
  var host=$('#v15body');if(!host)return;
  var meta=arenaMeta(a);if(!meta)return;
  var list=B18()[a]||[];
  var h='<div class="v18arena-view"><button class="btn sm" onclick="__v15.tab(\'bosses\')">← Quay lại Bosses</button>'
  +'<h3>'+meta.icon+' '+esc(meta.n)+'</h3><p class="mute">'+esc(meta.desc)+'</p>'
  +'<p class="mute">'+esc(meta.need)+' · Đã thắng '+arenaWins(a)+'/10</p>';
  if(a==='el')h+='<p class="mute">Mỗi trận: chọn học 🇬🇧 tiếng Anh hoặc 🇰🇷 tiếng Hàn trước khi đánh. Câu hỏi tiếng Hàn lấy từ chính bộ thẻ tiếng Hàn của bạn.</p>';
  if(a==='leg')h+='<p class="mute">Mỗi boss có 3 giai đoạn: P1 khởi đầu, P2 cường hóa khi HP còn 50%, P3 tuyệt kỹ khi HP còn 20%. Độ khó câu hỏi tăng theo số từ bạn đã thuộc.</p>';
  /* V22: chọn bộ từ Basic Tactics trước khi đánh boss tiếng Anh */
  h+=(window.__v22&&__v22.bossScopeHTML?__v22.bossScopeHTML():'');
  h+='<div class="v18bosses">'+list.map(bossCardHTML).join('')+'</div><div id="v18fight"></div></div>';
  host.innerHTML=h;
  var f=$('#v18fight');if(f)f.scrollIntoView&&f.scrollIntoView();
}

/* ---------- Collection (hub tab) ---------- */
var CF={q:'',arena:'all',el:'all',rar:'all',st:'all',detail:null};
function collFiltered(){
  var q=(CF.q||'').toLowerCase();
  return allBosses().filter(function(b){
    if(CF.arena==='map'){if(!b.zone)return false}
    else if(CF.arena!=='all'&&b.arena!==CF.arena)return false;
    if(CF.el!=='all'&&b.el!==CF.el)return false;
    if(CF.rar!=='all'&&b.rarity!==CF.rar)return false;
    var won=isWon(b),un=bossUnlocked(b);
    if(CF.st==='won'&&!won)return false;
    if(CF.st==='open'&&!(un&&!won))return false;
    if(CF.st==='locked'&&un)return false;
    var skn=b.skill?b.skill.n:(b.skills?b.skills.elem.n+' '+b.skills.ult.n:'');
    if(q&&(b.vi.toLowerCase().indexOf(q)<0&&b.n.toLowerCase().indexOf(q)<0&&skn.toLowerCase().indexOf(q)<0))return false;
    return true;
  });
}
function arenaName(a){
  if(a==='old')return 'Boss gốc V7';
  if(a&&a[0]==='z'&&window.__V19_DATA){var z=__V19_DATA.zoneById(a);return z?('🗺️ '+z.vi):a}
  var m=arenaMeta(a);return m?m.vi:a;
}
function collCardHTML(b){
  var won=isWon(b),un=bossUnlocked(b);
  return '<div class="v18coll '+(won?'done':'')+(!un?'locked':'')+'" onclick="__v18.collDetail(\''+b.id+'\')">'
  +'<img src="'+b.img+'" alt="" onerror="this.style.display=\'none\'">'
  +'<b>'+esc(b.vi)+'</b><span class="mute">'+esc(b.n)+'</span>'
  +'<span>'+elChip(b)+rarChip(b)+'</span>'
  +'<span class="mute">'+esc(b.zone?arenaName(b.zone):arenaName(b.arena))+' · Lv '+b.lv+' · HP '+b.hp+'</span>'
  +(window.__v34&&__v34.weakChipHTML?__v34.weakChipHTML(b):'')
  +'<em>'+(won?'✅ Đã thắng':(un?'⚔️ Có thể đánh':'🔒 Đang khóa'))+'</em></div>';
}
function collGridHTML(){
  var list=collFiltered();
  var won=allBosses().filter(isWon).length,total=allBosses().length;
  var h='<div class="v18coll-head"><b>'+won+'/'+total+' boss đã thắng ('+Math.round(won/total*100)+'%)</b>'
  +'<div class="v18hpbar"><i style="width:'+(won/total*100)+'%"></i></div></div>'
  +'<div class="v18colls">'+(list.length?list.map(collCardHTML).join(''):'<p class="mute">Không có boss nào khớp bộ lọc.</p>')+'</div>';
  return h;
}
function collectionHTML(){
  var els=B18().elements||{},rars=B18().rarities||{};
  var tot19=allBosses().length;
  var h='<h3>🏆 Bộ Sưu Tập Boss — '+tot19+' boss</h3>'
  +'<p class="mute">Boss gốc (10), 30 boss đấu trường (V10)'+(tot19>40?' và 30 boss bản đồ (V11)':'')+'. Bấm vào một boss để xem chi tiết. Phần thưởng lần đầu chỉ nhận một lần.</p>'
  +'<div class="v18filters"><input id="v18coll-q" type="search" placeholder="Tìm boss…" value="'+esc(CF.q)+'" oninput="__v18.collSearch(this.value)">'
  +'<select onchange="__v18.collSet(\'arena\',this.value)">'
  +'<option value="all">Tất cả đấu trường</option>'
  +'<option value="old"'+(CF.arena==='old'?' selected':'')+'>Boss gốc V7</option>'
  +'<option value="map"'+(CF.arena==='map'?' selected':'')+'>🗺️ Bản Đồ Boss (V11)</option>'
  +(B18().arenas||[]).map(function(a){return '<option value="'+a.id+'"'+(CF.arena===a.id?' selected':'')+'>'+esc(a.vi)+'</option>'}).join('')
  +'</select>'
  +'<select onchange="__v18.collSet(\'el\',this.value)"><option value="all">Tất cả hệ</option>'
  +Object.keys(els).map(function(k){return '<option value="'+k+'"'+(CF.el===k?' selected':'')+'>'+els[k].ic+' '+esc(els[k].n)+'</option>'}).join('')
  +'</select>'
  +'<select onchange="__v18.collSet(\'rar\',this.value)"><option value="all">Tất cả độ hiếm</option>'
  +Object.keys(rars).map(function(k){return '<option value="'+k+'"'+(CF.rar===k?' selected':'')+'>'+esc(rars[k].n)+'</option>'}).join('')
  +'</select>'
  +'<select onchange="__v18.collSet(\'st\',this.value)"><option value="all">Tất cả trạng thái</option>'
  +'<option value="won"'+(CF.st==='won'?' selected':'')+'>Đã thắng</option>'
  +'<option value="open"'+(CF.st==='open'?' selected':'')+'>Có thể đánh</option>'
  +'<option value="locked"'+(CF.st==='locked'?' selected':'')+'>Đang khóa</option></select></div>'
  +'<div id="v18collgrid">'+collGridHTML()+'</div><div id="v18colldetail"></div>';
  return h;
}
function collApply(){var g=$('#v18collgrid');if(g)g.innerHTML=collGridHTML()}
function collSearch(q){CF.q=q;collApply()}
function collSet(k,v){CF[k]=v;var v15=V15();if(v15)v15.renderTab()}
function collDetail(id){
  CF.detail=id;
  var b=bossById(id)||(window.__V19_DATA&&__V19_DATA.byId?__V19_DATA.byId(id):null)||(window.__V33_DATA&&__V33_DATA.byId?__V33_DATA.byId(id):null)||(window.__V35_DATA&&__V35_DATA.byId?__V35_DATA.byId(id):null);if(!b)return;
  var host=$('#v18colldetail');if(!host)return;
  var won=isWon(b),un=bossUnlocked(b);
  var e=en18();
  var rec=b.arena==='old'?null:(e.bosses[b.id]||null);
  var h='<div class="v18detail"><button class="v15x" onclick="__v18.collCloseDetail()" aria-label="Đóng">✕</button>'
  +'<img src="'+b.img+'" alt="" onerror="this.style.display=\'none\'">'
  +'<div><h3>'+esc(b.vi)+' <span class="mute">'+esc(b.n)+'</span></h3>'
  +'<p>'+elChip(b)+rarChip(b)+' · Lv '+b.lv+' · '+esc(b.zone?arenaName(b.zone):arenaName(b.arena))+'</p>'
  +'<p>HP '+b.hp+' · Phòng thủ '+b.def+' · Chế độ: '+esc(b.mode)+' · Độ khó: '+esc(b.diff)+' · Ngôn ngữ: '+(b.lang==='both'?'Anh / Hàn (chọn trước trận)':(b.lang==='ko'?'Tiếng Hàn':'Tiếng Anh'))+'</p>'
  +'<p><b>Kỹ năng:</b> '+(b.skill?esc(b.skill.n)+' — '+esc(b.skill.desc):esc(b.skills.elem.n)+' · Tuyệt kỹ: '+esc(b.skills.ult.n))+'</p>'
  +(window.__v34&&__v34.weakChipHTML?__v34.weakChipHTML(b):'')
  +'<p><b>Thưởng lần đầu:</b> +'+b.reward.xp+' XP, +'+b.reward.gems+' 💎, '+esc(b.reward.item)
  +(b.reward.stone?', '+esc(b.reward.stone):'')+(b.reward.title?', danh hiệu “'+esc(b.reward.title)+'”':'')+'</p>'
  +'<p><b>Trạng thái:</b> '+(won?'✅ Đã thắng'+(rec&&rec.wins>1?' ('+rec.wins+' lần)':''):(un?'⚔️ Có thể khiêu chiến':'🔒 Đang khóa — '+(b.arena==='old'?'thắng boss trước trong tab Bosses':(b.zone?'thắng boss trước trên bản đồ để mở khóa':esc(arenaNeedText(b.arena)||'thắng boss trước để mở khóa')))))+'</p>'
  +(won?'':'<div class="acts">'+(un?'<button class="btn pri" onclick="__v18.challenge(\''+b.id+'\')">Khiêu chiến</button>':'')+'</div>')
  +'</div></div>';
  host.innerHTML=h;
  host.scrollIntoView&&host.scrollIntoView();
}
function collCloseDetail(){var host=$('#v18colldetail');if(host)host.innerHTML='';CF.detail=null}
function challenge(id){
  var b=bossById(id)||(window.__V19_DATA&&__V19_DATA.byId?__V19_DATA.byId(id):null)||(window.__V33_DATA&&__V33_DATA.byId?__V33_DATA.byId(id):null)||(window.__V35_DATA&&__V35_DATA.byId?__V35_DATA.byId(id):null);if(!b)return;
  if(b.zone){var v19=window.__v19;if(v19){v19.openMap();v19.fight(id)}return}
  if(b.arena==='old'){var v=V15();if(v){v.tab('bosses');v.bossFight(id)}return}
  openArena(b.arena);fight(id);
}

/* ---------- question pools ---------- */
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
function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}if(m<200)return ['A2','B1'];if(m<600)return ['B1'];return ['B2']}
function wordPool(b){
  var v=V15();var words=(v&&v.words)||[];
  /* V22: phạm vi Thư viện đang chọn (vd Basic Tactics) thắng mọi bộ lọc
     mặc định của boss — trận đấu dùng đúng từ người chơi đã chọn. */
  try{
    var sc=v&&v.en15().scope;
    if(sc&&sc.kind==='lib'&&v.wordsFiltered){
      var sl=v.wordsFiltered({level:'ALL'});
      if(sl.length>=8)return shuffle(sl);
      /* phạm vi quá nhỏ (vd 'chỉ cần ôn' trên một Unit ít từ) — nới
         bộ lọc trạng thái nhưng giữ nguyên lựa chọn Unit/loại từ */
      var sc2={kind:'lib',lib:sc.lib,unit:sc.unit,type:sc.type,set:sc.set};
      var sl2=v.wordsFiltered({scope:sc2,level:'ALL'});
      if(sl2.length)return shuffle(sl2);
      if(sl.length)return shuffle(sl);
    }
  }catch(e){}
  var list=words.filter(function(w){
    if(b.lib==='a1a2'&&(!w.lib||w.lib.indexOf('a1a2')<0))return false;
    if(b.lib==='oxford'&&(!w.lib||w.lib.indexOf('oxford')<0))return false;
    if(b.arena==='leg'){var lv=legDiff();if(lv.indexOf(w.lv)<0)return false}
    else if(b.diff&&w.lv!==b.diff)return false;
    return true;
  });
  if(list.length<12)list=words.slice();
  return shuffle(list);
}
function grammarPool(b){
  var g=(window.__V15_DATA&&__V15_DATA.grammar)||[];
  var list=g.filter(function(x){return b.arena==='leg'?legDiff().indexOf(x.lv)>=0:x.lv===b.diff});
  return shuffle(list.length?list:g);
}
function readPool(){return shuffle((window.__V15_DATA&&__V15_DATA.reading)||[])}
function builderPool(){return shuffle((window.__V15_DATA&&__V15_DATA.builder)||[])}
function koPool(){
  /* V36 (F16a): mirror v19 koCardsRaw() (V11.1 fix) — the KO question
     pool must come from the SELECTED deck (S.deck) when that deck
     holds >= 8 usable cards, else all cards. v18 never had this
     scoping: every V10-arena KO fight asked from all cards, so the
     V34 'selected deck' rule was false for the whole arena. */
  var cards=[];try{cards=(S&&S.cards)||[]}catch(e){}
  cards=cards.filter(function(c){return c&&c.h&&c.m});
  var deck='';try{deck=(S&&S.deck)||''}catch(e){}
  if(deck){
    var dc=cards.filter(function(c){return c.d===deck});
    if(dc.length>=8)return shuffle(dc);
  }
  return shuffle(cards);
}
function distractorsKO(c,n){
  /* V36 (F16a): distractors come from the same deck-scoped pool as
     the questions (mirror v19, which reads koCardsRaw()). */
  var pool=koPool().filter(function(x){return x.id!==c.id&&x.h&&x.m});
  return shuffle(pool).slice(0,n);
}

/* ---------- SRS marking (mirrors V15 mark15; no farm watering — V15-internal) ---------- */
function dayNo18(){return Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5)}
function todayStr18(){return new Date().toDateString()}
function mark18(ok,w){
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
  if(xp>0)gain18(xp);
  var dn=dayNo18();e.hist[dn]=e.hist[dn]||{c:0,t:0,xp:0};
  e.hist[dn].t++;if(ok)e.hist[dn].c++;e.hist[dn].xp+=xp;
  if(e.daily.d!==todayStr18())e.daily={d:todayStr18(),correct:0,wrong:0,xp:0};
  if(ok){e.daily.correct++;e.daily.xp+=xp}else e.daily.wrong++;
  try{if(window.__v27)__v27.recordAnswer('en',id,ok,'boss18')}catch(e){}
  save18();
}
function markKO(ok){
  var e=en18();
  if(ok)e.koStats.right++;else e.koStats.wrong++;
  save18();
}

/* ---------- fight engine ---------- */
var F=null;
function fight(id,lang){
  var b=bossById(id);if(!b)return;
  if(b.arena==='old'){var v=V15();if(v){v.tab('bosses');v.bossFight(id)}return}
  if(!bossUnlocked(b)){pop18('Boss này chưa mở khóa.');return}
  if(!document.querySelector('#v18fight'))openArena(b.arena);
  if(b.lang==='both'&&!lang){showLangPick(b);return}
  startFight(b,lang||'en');
}
function showLangPick(b){
  var host=$('#v18fight');if(!host)return;
  host.innerHTML='<div class="v18fight"><h3>'+esc(b.vi)+'</h3><p class="mute">Chọn ngôn ngữ cho trận này — câu hỏi lấy từ '+(b.lang==='both'?'bộ từ của ngôn ngữ đó':'')+':</p><div class="acts"><button class="btn pri" onclick="__v18.fight(\''+b.id+'\',\'en\')">🇬🇧 Tiếng Anh</button><button class="btn pri" onclick="__v18.fight(\''+b.id+'\',\'ko\')">🇰🇷 Tiếng Hàn</button></div><div class="acts"><button class="btn" onclick="__v18.close()">Đóng</button></div></div>';
  host.scrollIntoView&&host.scrollIntoView();
}
function startFight(b,lang){
  var hearts=b.arena==='leg'?5:(b.arena==='el'?4:3);
  F={boss:b,lang:lang,hp:b.hp,maxHp:b.hp,hearts:hearts,maxHearts:hearts,
    combo:0,score:0,q:0,qCount:0,wrongCount:0,phase:1,
    shield:(b.skill.id==='shield'?30:0),cleansed:false,reborn:false,
    over:null,pools:null,cur:null,answered:null,ok:null,heard:null,
    anim:'idle',banner:null,hideIpa:false,rewardNote:'',firstWin:false,
    timer:null,left:0,lastDmg:0,crit:false};
  /* V34: Boss Weakness — per-fight state only (no save change). */
  try{if(window.__v34){F.weak=__v34.weakFor(b,lang);F.brk=0;F.brkMax=3}}catch(e){}
  /* V23: pet team joins the fight (shield, energy, damage bonus). */
  try{if(window.__v23)__v23.battleStart(F)}catch(e){}
  nextQ();renderFight();
}
function timerFor(){
  var b=F.boss,sk=b.skill.id;
  if(b.id==='v10_goblin')return 12;
  if(b.id==='v10_dragon'&&F.hp<=F.maxHp/2)return 10;
  if(b.id==='v10_tiger')return 8;
  if(b.id==='v10_king')return 12;
  if(sk==='freeze')return 15;
  if(sk==='gale')return 8;
  if(b.arena==='leg'){
    if(F.phase===2&&(sk==='inferno'||sk==='blizzard'))return 10;
    if(F.phase===3&&(sk==='storm'||sk==='worldtree'))return 8;
  }
  return 0;
}
function nextQ(){
  if(!F)return;
  var b=F.boss;
  var mode=b.mode==='mixed'?['mc','grammar','listen','builder'][F.q%4]:b.mode;
  if(b.mode==='speed')mode='mc';
  /* KO fights: grammar/builder/reading/speaking have no Korean equivalent
     (they test English grammar, English sentences, English passages) —
     map them to Korean multiple-choice so a KO fight stays Korean. */
  if(F.lang==='ko'){
    if(b.mode==='mixed')mode=['mc','type','listen','mc'][F.q%4];
    else if(mode==='grammar'||mode==='builder'||mode==='read'||mode==='speak')mode='mc';
  }
  F.qmode=mode;
  F.hideIpa=(b.skill.id==='veil')||(b.arena==='leg'&&F.phase>=2&&b.skill.id==='void');
  if(!F.pools)F.pools={grammar:grammarPool(b),read:readPool(),builder:builderPool(),words:wordPool(b),ko:koPool()};
  var P=F.pools;
  F.qCount++;
  /* KO questions (elemental arena, Korean chosen) */
  if(F.lang==='ko'&&(mode==='mc'||mode==='type'||mode==='listen')){
    if(P.ko.length>=8){
      var c=P.ko[F.q%P.ko.length];
      F.cur={k:c,opts:shuffle([c].concat(distractorsKO(c,3))),ko:true};
      F.answered=null;F.ok=null;startTimer();return;
    }
  }
  if(mode==='grammar'){F.cur={g:P.grammar[F.q%P.grammar.length]}}
  else if(mode==='read'){var p=P.read[F.q%P.read.length];F.cur={p:p,q:p.qs[F.q%p.qs.length]}}
  else if(mode==='builder'){var s=P.builder[F.q%P.builder.length];var toks=s.s.replace(/([.!?])$/,'').split(' ');var wrong=[];for(var k=0;k<3;k++){var sh=shuffle(toks);if(sh.join(' ')!==toks.join(' '))wrong.push(sh.join(' ')+' .')}while(wrong.length<3)wrong.push(shuffle(toks).join(' ')+' .');F.cur={s:s,opts:shuffle([s.s].concat(wrong))}}
  else if(mode==='speak'){var w=(window.__v34&&__v34.weakPick?__v34.weakPick(F,P.words,P.words[F.q%P.words.length]):P.words[F.q%P.words.length]);F.cur={w:w,opts:shuffle([w].concat(distractorsEN(w,3)))}}
  else{var w2=(window.__v34&&__v34.weakPick?__v34.weakPick(F,P.words,P.words[F.q%P.words.length]):P.words[F.q%P.words.length]);var opts=shuffle([w2].concat(distractorsEN(w2,3)));F.cur={w:w2,opts:opts,optsVi:shuffle([w2].concat(distractorsEN(w2,3)))}}
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
    var t=$('#v18boss-t');if(t)t.textContent=F.left+'s';
    if(F.left<=0){clearInterval(F.timer);F.timer=null;answer(false,true)}
  },1000);
}
function healBoss(n,msg){
  if(!F||F.over||F.hp<=0)return;
  F.hp=Math.min(F.maxHp,F.hp+n);
  F.banner=(F.banner?F.banner+' ':'')+msg;
}
function checkPhase(){
  var b=F.boss;if(b.arena!=='leg'||F.over)return;
  if(F.phase===1&&F.hp<=F.maxHp/2){
    F.phase=2;F.anim='special';
    F.banner='⚡ '+b.vi+' cường hóa! Giai đoạn 2 — '+b.skill.n+'!';
    if(b.skill.id==='rebirth'){healBoss(20,'🔥 Tái Sinh: phượng hoàng hồi 20 HP!');F.reborn=true}
    if(b.skill.id==='quake'){F.shield=40;F.banner+=' Lá chắn 40 HP!'}
  }
  if(F.phase===2&&F.hp<=F.maxHp*0.2){
    F.phase=3;F.anim='special';
    F.banner='💥 TUYỆT KỸ: '+b.skill.n+'! Giai đoạn 3 — trả lời sai mất 2 tim!';
  }
}
function answer(ok,timeout){
  if(!F||F.answered!==null)return;
  if(F.timer){clearInterval(F.timer);F.timer=null}
  F.answered=timeout?'timeout':1;F.ok=ok;
  var b=F.boss;
  if(ok){
    F.combo++;F.score++;
    var crit=(F.combo%5===0)||(Math.random()<0.1);
    var dmg=12+F.combo*2;
    if(b.id==='v10_tiger')dmg=Math.round(dmg*1.5);
    if(b.skill.id==='gale')dmg=Math.round(dmg*1.25);
    if(F.phase===3&&b.arena==='leg')dmg=Math.round(dmg*1.5);
    if(crit)dmg*=2;
    dmg=Math.max(2,dmg-(b.def||0));
    /* V23: pet team damage bonus + passives (burn / storm); also grants
       pet XP/affection and speeds up the active hatch (onFightCorrect). */
    try{if(window.__v23&&F.pet){var ex=__v23.onFightCorrect(F);dmg=Math.max(2,Math.round(dmg*(1+F.pet.dmgBonus/100))+ex)}}catch(e){}
    if(b.arena==='leg'&&F.phase===2&&b.skill.id==='mountain')dmg=Math.max(2,dmg-3);
    try{if(window.__v34){var _bb34=__v34.breakDmg(F);if(_bb34>0){var _bd36=dmg;dmg+=_bb34;var _bq36=(F.shield>0)?(Math.ceil(dmg/2)-Math.ceil(_bd36/2)):_bb34;F.banner=(F.banner?F.banner+' ':'')+'💥 BREAK! Điểm yếu bị phá vỡ! +'+_bq36+' sát thương!';}}}catch(e){}
    var dealt=dmg;
    if(F.shield>0){dealt=Math.max(1,Math.ceil(dmg/2));F.shield=Math.max(0,F.shield-dealt)}
    F.hp-=dealt;F.anim='hit';F.lastDmg=dealt;F.crit=crit;
    if(F.cur&&F.cur.w)mark18(true,F.cur.w);
    if(F.cur&&F.cur.k)markKO(true);
    pop18((crit?'CHÍ MẠNG! -':'-')+dealt+' HP');
  }else{
    var cost=1;
    if(b.arena==='leg'&&F.phase===3)cost=2;
    else if(b.arena==='leg'&&F.phase===2&&b.skill.id==='storm')cost=2;
    if(b.skill.id==='cleanse'&&!F.cleansed){cost=0;F.cleansed=true;F.banner='✨ Thanh Tẩy: lần sai đầu tiên không mất tim!'}
    F.combo=0;
    /* V23: pet team shield absorbs the boss counterattack first. */
    var petAbsorbed=false;
    if(cost>0){try{if(window.__v23&&F.pet){var pr=__v23.onFightWrong(F);
      if(pr==='rebirth'){F.banner=(F.banner?F.banner+' ':'')+'🌟 Tái Sinh: thú cưng chặn đòn phản công!';petAbsorbed=true;cost=0}
      else if(pr==='shield'){F.banner=(F.banner?F.banner+' ':'')+'🛡️ Khiên đội hấp thụ đòn phản công!';petAbsorbed=true;cost=0}
    }}catch(e){}}
    F.hearts-=cost;F.anim='attack';F.wrongCount++;
    if(cost>0&&!petAbsorbed){try{if(window.__v23&&F.pet)__v23.onHeartLost(F)}catch(e){}}
    if(F.cur&&F.cur.w)mark18(false,F.cur.w);
    if(F.cur&&F.cur.k)markKO(false);
    if(b.skill.id==='burn')healBoss(8,'🔥 Thiêu Đốt: boss hồi 8 HP!');
    if(b.skill.id==='regen'&&F.wrongCount%2===0)healBoss(10,'💧 Dòng Chảy: boss hồi 10 HP!');
  }
  var qc=F.qCount;
  if(b.skill.id==='heal'&&qc>0&&qc%4===0)healBoss(6,'🌸 Hoa Anh Đào: boss hồi 6 HP!');
  if(b.skill.id==='bloom'&&qc>0&&qc%3===0)healBoss(8,'🌿 Hoa Rừng: boss hồi 8 HP!');
  if(b.arena==='leg'&&F.phase===2&&b.skill.id==='tide'&&qc>0&&qc%3===0)healBoss(10,'🌊 Thủy Triều: boss hồi 10 HP!');
  if(b.arena==='leg'&&F.phase===2&&b.skill.id==='worldtree'&&qc>0&&qc%3===0)healBoss(12,'🌳 Cội Nguồn: boss hồi 12 HP!');
  checkPhase();
  if(F.hp<=0){F.hp=0;F.over='win';F.anim='defeat';winReward()}
  else if(F.hearts<=0){F.hearts=0;F.over='lose';F.anim='attack'}
  save18();renderFight();
  if(F&&!F.over){var f=F;setTimeout(function(){if(F===f&&!F.over){F.anim='idle';var h=$('#v18fight');if(h)renderFight()}},450)}
}
function resolveLethal(Ff){
  /* V36 (V17-2): a lethal team-skill blow must resolve the fight at
     once. castSkillInFight() (v23) could drop a boss to 0 HP while
     the fight stayed open — the next answers could even resurrect it
     (healBoss) or LOSE a fight already won by damage. Mirrors the win
     path of the answer() final check: identity-check the live fight,
     clear the timer, set win, pay the reward once, save + re-render.
     (v18 has no ultimate phase, so no ultActive line.) Returns true
     only when it resolved this fight. */
  if(!Ff||Ff!==F||F.over)return false;
  if(F.timer){clearInterval(F.timer);F.timer=null}
  F.hp=0;F.over='win';F.anim='defeat';F.answered=1;
  winReward();save18();renderFight();return true;
}
function winReward(){
  var b=F.boss,e=en18();
  var rec=e.bosses[b.id]||{};
  if(rec.win){
    rec.wins=(rec.wins||1)+1;e.bosses[b.id]=rec;
    gain18(10);
    F.rewardNote='Đánh lại để luyện tập: +10 XP. Phần thưởng lần đầu chỉ nhận một lần.';
  }else{
    e.bosses[b.id]={win:1,wins:1,at:Date.now(),item:b.reward.item};
    /* V23: team leader boosts boss XP; elemental bosses also drop 2 pet
       evolution stones of their element (only for players using pets). */
    var petBonus=0;
    try{if(window.__v23)petBonus=Math.round(b.reward.xp*__v23.learnXpBonus())}catch(e){}
    gain18(b.reward.xp+petBonus);
    try{if(window.__v23&&b.el&&S.v7&&S.v7.en23){var _map={fire:'stone_fire',ice:'stone_ice',nature:'stone_nature',earth:'stone_nature',water:'stone_water',thunder:'stone_thunder',light:'stone_light',dark:'stone_dark',cosmic:'stone_light',wind:'stone_wind'};var _mk=_map[b.el];if(_mk)S.v7.en23.mats[_mk]=(S.v7.en23.mats[_mk]||0)+2}}catch(err){}
    try{S.v7.gems=(S.v7.gems||0)+b.reward.gems}catch(err){}
    if(b.reward.stone)e.stones[b.reward.stone]=(e.stones[b.reward.stone]||0)+1;
    if(b.reward.title&&e.titles.indexOf(b.reward.title)<0)e.titles.push(b.reward.title);
    F.rewardNote='Phần thưởng lần đầu: +'+(b.reward.xp+petBonus)+' XP, +'+b.reward.gems+' 💎, '+b.reward.item
      +(b.reward.stone?', '+b.reward.stone:'')+(b.reward.title?', danh hiệu “'+b.reward.title+'”':'')+'.';
    F.firstWin=true;
  }
  save18();
}
function pick(i){
  if(!F||F.answered!==null||F.over)return;
  var mode=F.qmode,ok=false;
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
  F.q++;F.banner=null;nextQ();renderFight();
}
function close(){
  if(F&&F.timer)clearInterval(F.timer);
  var a=F?F.boss.arena:'en';F=null;
  var host=$('#v18fight');if(host)host.innerHTML='';
  openArena(a);
}
function speakWord(id){
  var v=V15();if(v)v.speakWord(id);
}
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

/* ---------- fight rendering ---------- */
function speakKO(text){
  try{speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=.8;speechSynthesis.speak(u)}catch(e){}
}
function renderFight(){
  var host=$('#v18fight');if(!host)return;
  if(!F){host.innerHTML='';return}
  var b=F.boss;
  var phaseTxt=b.arena==='leg'?'<span class="v18phase">Giai đoạn '+F.phase+'/3'+(F.phase===1?' — khởi đầu':(F.phase===2?' — cường hóa':' — TUYỆT KỸ'))+'</span>':'';
  var h='<div class="v18fight '+(F.over==='win'?'win':'')+'">'
  +'<div class="v18fight-top"><img class="v18boss-img anim-'+F.anim+'" src="'+b.img+'" alt="" onerror="this.style.display=\'none\'">'
  +'<div class="v18fight-info"><b>'+esc(b.vi)+'</b> <span class="mute">'+esc(b.n)+' · Lv '+b.lv+'</span>'
  +'<div>'+elChip(b)+rarChip(b)+phaseTxt+'</div>'
  +'<span>'+esc(b.skill.n)+' — '+esc(b.skill.desc)+'</span>'
  +'<div class="v18hpbar"><i style="width:'+Math.max(0,F.hp/F.maxHp*100)+'%"></i></div><span>HP '+Math.max(0,F.hp)+'/'+F.maxHp+(F.shield>0?' · 🛡️ Lá chắn: '+F.shield:'')+'</span>'+(window.__v34&&__v34.breakBarHTML?__v34.breakBarHTML(F):'')
  +'<div class="v18hearts">Tim của bạn: '+'♥'.repeat(F.hearts)+'♡'.repeat(Math.max(0,F.maxHearts-F.hearts))+' · Combo x'+F.combo+' · Đúng '+F.score+(F.lang==='ko'?' · 🇰🇷 Tiếng Hàn':'')+'</div>'
  +(F.left?'<div class="mute">Còn <span id="v18boss-t">'+F.left+'s</span></div>':'')
  +(F.banner?'<div class="v18banner">'+esc(F.banner)+'</div>':'')
  +'</div></div>'
  +(window.__v23&&F.pet?__v23.battleBarHTML(F):'');
  if(F.over){
    h+='<div class="v18done"><div class="v18done-big">'+(F.over==='win'?'CHIẾN THẮNG!':'Thua rồi…')+'</div>'
    +'<p>'+(F.over==='win'?'Bạn đã đánh bại '+esc(b.vi)+'! '+esc(F.rewardNote):'Boss còn '+Math.max(0,F.hp)+' HP. Hãy luyện thêm rồi quay lại!')+'</p>'
    +'<div class="acts"><button class="btn pri" onclick="__v18.fight(\''+b.id+'\''+(b.lang==='both'?',\''+F.lang+'\'':'')+')">Đánh lại</button><button class="btn" onclick="__v18.close()">Đóng</button></div></div>';
  }else{
    h+=qHTML();
  }
  h+='</div>';
  host.innerHTML=h;
}
function feedback(ex){
  if(F.answered===null)return '';
  var h='<div class="v18explain" style="color:var(--'+(F.ok?'ok':'bad')+')">'+(F.ok?'Đòn đánh trúng!':'Boss phản công!')+(ex?' <span class="mute">'+esc(ex)+'</span>':'')+'</div><div class="acts"><button class="btn pri" onclick="__v18.next()">Tiếp tục</button></div>';
  return h;
}
function optBtn(label,i,correct){
  var cl='';if(F.answered!==null)cl=(correct?'right':(i===F.answered?'wrong':''));
  return '<button class="v18opt '+cl+'" '+(F.answered!==null?'disabled':'')+' onclick="__v18.pick('+i+')">'+label+'</button>';
}
function qHTML(){
  var c=F.cur,mode=F.qmode;
  if(c.ko){
    var k=c.k;
    if(mode==='listen'){
      return '<div class="v18qcard"><div class="v18qword">Nghe tiếng Hàn</div><div class="acts"><button class="btn pri" onclick="__v18.speakKO(\''+esc(k.h).replace(/'/g,'\\\'')+'\')">Nghe phát âm</button></div></div><div class="v18opts">'+c.opts.map(function(o,i){return optBtn(esc(o.h),i,o.id===k.id)}).join('')+'</div>'+feedback('');
    }
    if(mode==='type'){
      return '<div class="v18qcard"><div class="v18qword vi">'+esc(k.m)+'</div><div class="mute">Chọn từ tiếng Hàn đúng</div></div><div class="v18opts">'+c.opts.map(function(o,i){return optBtn(esc(o.h),i,o.id===k.id)}).join('')+'</div>'+feedback('');
    }
    return '<div class="v18qcard"><div class="v18qword">'+esc(k.h)+'</div><div class="mute">'+esc(k.p||'')+' · Chọn nghĩa đúng</div></div><div class="v18opts">'+c.opts.map(function(o,i){return optBtn(esc(o.m),i,o.id===k.id)}).join('')+'</div>'+feedback('');
  }
  if(mode==='grammar'){
    var g=c.g;
    return '<div class="v18qcard"><div class="v18qword small">'+esc(g.q)+'</div></div><div class="v18opts">'+g.o.map(function(o,i){return optBtn(esc(o),i,i===g.a)}).join('')+'</div>'+feedback(g.ex);
  }
  if(mode==='read'){
    var q=c.q;
    return '<div class="v18passage"><b>'+esc(c.p.title)+'</b><p>'+esc(c.p.text)+'</p></div><div class="v18qcard"><div class="v18qword small">'+esc(q.q)+'</div></div><div class="v18opts">'+q.o.map(function(o,i){return optBtn(esc(o),i,i===q.a)}).join('')+'</div>'+feedback('');
  }
  if(mode==='builder'){
    return '<div class="v18qcard"><div class="v18qword small">Chọn câu đúng · Nghĩa: '+esc(c.s.vi)+'</div></div><div class="v18opts">'+c.opts.map(function(o,i){return optBtn(esc(o),i,o===c.s.s)}).join('')+'</div>'+feedback('');
  }
  if(mode==='speak'){
    var w=c.w,supported=!!(window.SpeechRecognition||window.webkitSpeechRecognition);
    var h='<div class="v18qcard"><div class="v18qword">'+esc(w.en)+'</div><div class="mute">'+esc(w.ipa)+' · '+esc(w.vi)+'</div><div class="acts"><button class="btn sm" onclick="__v15.speakWord(\''+w.id+'\')">Nghe mẫu</button></div></div>';
    if(supported){
      h+='<p class="mute">Bấm “Nói” và đọc to từ trên. Máy sẽ so khớp phát âm của bạn.</p><div class="acts"><button class="btn pri" onclick="__v18.bossSpeak()">Nói</button></div>';
      if(F.heard)h+='<div class="v18explain">Máy nghe được: “<b>'+esc(F.heard)+'</b>”</div>';
    }else{
      h+='<div class="v18warn"><b>Trình duyệt không hỗ trợ nhận dạng giọng nói.</b> Chế độ thay thế: nghe mẫu rồi chọn từ bạn nghe được — không chấm điểm phát âm.</div><div class="v18opts">'+c.opts.map(function(o,i){return optBtn(esc(o.en),i,o.id===w.id)}).join('')+'</div>';
      F.cur.opts=c.opts;
    }
    h+=feedback('');
    return h;
  }
  var w2=c.w;
  if(mode==='listen'){
    return '<div class="v18qcard"><div class="v18qword">Nghe</div><div class="acts"><button class="btn pri" onclick="__v15.speakWord(\''+w2.id+'\')">Nghe phát âm (1 lần)</button></div></div><div class="v18opts">'+c.opts.map(function(o,i){return optBtn(esc(o.en),i,o.id===w2.id)}).join('')+'</div>'+feedback('');
  }
  if(mode==='type'){
    return '<div class="v18qcard"><div class="v18qword vi">'+esc(w2.vi)+'</div><div class="mute">Chọn cách viết đúng của từ này</div></div><div class="v18opts">'+c.opts.map(function(o,i){return optBtn(esc(o.en),i,o.id===w2.id)}).join('')+'</div>'+feedback('');
  }
  return '<div class="v18qcard"><div class="v18qword">'+esc(w2.en)+'</div><div class="mute">'+(F.hideIpa?'Chọn nghĩa đúng':esc(w2.ipa)+' · Chọn nghĩa đúng')+'</div></div><div class="v18opts">'+c.optsVi.map(function(o,i){return optBtn(esc(o.vi),i,o.id===w2.id)}).join('')+'</div>'+feedback('');
}

/* ---------- test hooks (used by the jsdom suite; harmless in production) ---------- */
function pickCorrect(){
  if(!F||F.answered!==null||F.over)return false;
  var mode=F.qmode,idx=-1;
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
  var mode=F.qmode,idx=-1;
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

window.__v18={
  arenasHTML:arenasHTML,openArena:openArena,openCollection:openCollection,
  collectionHTML:collectionHTML,collSearch:collSearch,collSet:collSet,
  collDetail:collDetail,collCloseDetail:collCloseDetail,challenge:challenge,
  fight:fight,pick:pick,next:next,close:close,speakWord:speakWord,bossSpeak:bossSpeak,
  speakKO:speakKO,en18:en18,arenaWins:arenaWins,totalWins:totalWins,
  oldWins:oldWins,arenaOpen:arenaOpen,bossUnlocked:bossUnlocked,isWon:isWon,
  get bosses(){return B18()},
  _petRefresh:function(){try{renderFight()}catch(e){}},
  _test:{F:function(){return F},pickCorrect:pickCorrect,pickWrong:pickWrong,
    fight:fight,close:close,next:next,en18:en18,legDiff:legDiff,resolveLethal:resolveLethal},
  version:'15.0.0'
};
})();
