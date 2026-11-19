/* ================================================================
   Korean & English Vocab Farm — V35 (V18.0 SKYROOT SANCTUARY)
   Layer V35: additive region layer, version 18.0.0, loads LAST.

   SCOPE (ChatGPT SKYROOT SANCTUARY proposal, adapted):
   - 8 Skyroot bosses (v18_*) fighting in the V19 Universal Combat
     Engine (no new engine). Stats AS GIVEN by ChatGPT, on game scale
     (lv 69-76, hp 760-850), continuing the V19 progression (V17
     Chrono max lv 68 / hp 750). Elements mapped onto the real V19 EL
     (Wind->wind, Plant->nature, Water->water, Earth->earth,
     Thunder->thunder, Crystal->cosmic — no 'crystal' key exists in
     the V19 EL; V33 precedent Time->cosmic — Light->light,
     Nature->nature). Skill ids come only from the V19 palette.
     No boss-specific combat branches (no golem-style shield/heal).
   - Region gate = GEAR GOLEM (v17_geargolem, the Chrono final boss)
     defeated in that language — the Chrono region must be complete
     before Skyroot opens. Wins are read from en19 via __v19.isWon
     (the UCE); no en35.bosses key is ever created (V17.0 lesson:
     the V17.0 changelog falsely documented en33.bosses — wins live
     in en19). Locked state shows the real GEAR GOLEM status per
     language plus the corrected total win count from __v33 when
     available (reused, never reimplemented — the V33 corrected count
     is the only correct one; the buggy bossWinCount() is NOT used).
   - 3 pet species x 3 stages + 3 eggs, registered into the live
     __V23_DATA (guarded + idempotent). Elements wind/nature/
     thunder; 'wind' does not exist in v23 PET_ELEMENTS, so the
     build adds it explicitly (R-V35-V23DATA-WIND/STONE) — an
     extension of the existing map, not a parallel system. Skills
     use existing v23 types only (Cloud Fox: active 'dmg' + passive
     'storm'; Sprout Owl: active 'heal' + passive 'wisdom'; Storm
     Ram: active 'shield' + passive 'storm'). Evolution uses the
     element's stone + feather/fruit/coins per PET_EVO_COST — no new
     materials. Collection milestones extended with a 54-form
     milestone (45 + 9 new forms) — the ladder topped out at 45
     after V33.
   - 6 story quests via the V27 engine (ONE guarded replacement
     exports startSession on __v27 — already done by V33). Completion
     is detected from en27 session records (rec.t >= startedAt,
     rec.words covers the quest ids, accuracy >= 0.8); rewards are
     claimed-guarded in en35.quests and come only from real stores
     (XP via gain15, gems via S.v7.gems). Quest word lists are
     pairwise disjoint (see gen_v35_data.py).
   - 240 Skyroot words (4 sets x 60; 120 EN-led + 120 KO-led) enter
     the shared WORDS array via the V35 block inside buildWords()
     (V33 precedent) with ids 'v35_<slug>', lib 'skyroot', lv 'B2'.
     The 'led' field is kept in the data file only; the shared record
     carries an English headword with a Korean translation for every
     word (V33 treatment) — no KO deck entries are created. No
     S.cards entries are ever created — the ko field is display/
     learning data only.
   - Boss Weakness: the 8 Skyroot bosses carry kind 'skyroot'
     weaknesses (one of the 4 Skyroot sets, 2 bosses per set) in
     __V35_DATA.weakExplicit. v34.js weakFor/weakMatch/weakName are
     extended by build_v35.py to understand kind 'skyroot'
     (w.skyrootSet === key). Every set holds 60 B2 words, so every
     Break meter is fillable (V17.1 lesson: 12 Chrono-era bosses
     have unfillable meters — not repeated here).
   - New save key S.v7.en35 (lazy, no migration). Boss wins stay
     in en19 (UCE); en35 holds quests / region claims / pending
     launches only. Worst case < 10 KB. Cloud merge branch in
     v20_sync.js mirrors the en33 branch (quests union MAX,
     regionClaimed union per-language MAX, created MIN, pending
     dropped); no rift sub-state exists in V35.

   ENTRY: EN Hub decorator (MutationObserver, V27 precedent) +
   KO build-time button (V11.1/V27 precedent — injected by the build
   script, never by this file). Overlay
   z-index 1500 (above V31 1400, V20 modal 1200, V32 badge 1100).

   RULES (per vocab_farm_versioned_builds skill): IIFE, 'use
   strict', try/catch around everything, other layers only through
   window.__vNN with guards, never edit another layer's source,
   never change a schema, localStorage key, Firestore path, XP/
   gold/gems, boss/pet/vocab/SRS data, or working game logic. The
   V6 save object is a top-level `let S` (NOT a window property)
   — read it via bare S in try/catch, never via a window property
   (the V11.1 lesson). No new currency, no energy system.
   ================================================================ */
(function(){
'use strict';
var VERSION='18.0.0';
var GEAR_GOLEM='v17_geargolem';
var SKYROOT_IDS=['v18_breeze_lynx','v18_thornwing_stag','v18_cloud_serpent','v18_moss_colossus','v18_tempest_harpy','v18_crystal_treant','v18_aurora_griffin','v18_skyroot_empress'];
var REGION_XP=150, REGION_GEMS=5, REGION_TITLE='Chúa Tể Thiên Căn';
var QUEST_XP=20, QUEST_BONUS_XP=10, QUEST_FINAL_GEMS=1, QUEST_MIN_ACC=0.8;
var FINAL_QUEST='q_empress';

function $(s,r){try{return (r||document).querySelector(s)}catch(e){return null}}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function getS(){try{return S}catch(e){return null}}
function V15(){try{return window.__v15||null}catch(e){return null}}
function V19(){try{return window.__v19||null}catch(e){return null}}
function V23(){try{return window.__v23||null}catch(e){return null}}
function V27(){try{return window.__v27||null}catch(e){return null}}
function D35(){try{return window.__V35_DATA||{}}catch(e){return {}}}
function save35(){try{var v=V15();if(v&&v.save15)v.save15();}catch(e){}}
function gain35(n){try{var v=V15();if(v&&v.gain15)v.gain15(n);}catch(e){}}
function pop35(t){try{var v=V15();if(v&&v.pop15){v.pop15(t);return}}catch(e){} try{if(window.console&&console.log)console.log('[V35] '+t)}catch(e){}}
function addGems(n){try{var s=getS();if(s){s.v7=s.v7||{};s.v7.gems=(s.v7.gems||0)+n}}catch(e){}}

/* ---------- en35 state (lazy, no migration) ---------- */
function en35(){
  try{
    var s=getS();if(!s)return {quests:{},regionClaimed:{en:0,ko:0},pending:{},created:Date.now()};
    s.v7=s.v7||{};
    var e=s.v7.en35;
    if(!e)e=s.v7.en35={quests:{},regionClaimed:{en:0,ko:0},pending:{},created:Date.now()};
    e.quests=e.quests||{};
    e.regionClaimed=e.regionClaimed||{en:0,ko:0};e.pending=e.pending||{};
    return e;
  }catch(err){return {quests:{},regionClaimed:{en:0,ko:0},pending:{},created:Date.now()}}
}

/* ---------- region gate: GEAR GOLEM defeated in that language ---------- */
function gearGolemWon(lang){
  try{var v=V19();return v?v.isWon(GEAR_GOLEM,lang||ST.lang||'en'):false}catch(e){return false}
}
function gateOpen(lang){return gearGolemWon(lang||ST.lang||'en')}
function totalWins(){
  /* Display only: reuse the V33 corrected count (the only correct
     one). Never reimplement it here, never use bossWinCount(). */
  try{if(window.__v33&&__v33.correctedWinCount)return __v33.correctedWinCount()}catch(e){}
  return 0;
}

/* ---------- bosses (records live in en19 via the UCE) ---------- */
function bossList(){var d=D35();return (d.bosses||[]).slice()}
function bossById(id){var d=D35();return (d.byId?d.byId(id):null)}
function isWon35(id,lang){try{var v=V19();return v?v.isWon(id,lang):false}catch(e){return false}}
function stars35(id,lang){try{var v=V19();return v?v.stars(id,lang):0}catch(e){return 0}}
function bossUnlocked(id,lang){
  /* Sequential inside Skyroot + the GEAR GOLEM gate. Called by the
     V19 bossUnlocked19 replacement for zone 'skyroot' (and by the
     V35 overlay). Never calls back into __v19.bossUnlocked (no
     recursion). */
  lang=lang||ST.lang||'en';
  if(!gateOpen(lang))return false;
  var i=SKYROOT_IDS.indexOf(id);
  if(i<0)return false;
  if(i===0)return true;
  return isWon35(SKYROOT_IDS[i-1],lang);
}
function regionWon(lang){
  for(var i=0;i<SKYROOT_IDS.length;i++)if(!isWon35(SKYROOT_IDS[i],lang))return false;
  return true;
}
function claimRegion(lang){
  lang=lang||ST.lang||'en';
  var e=en35();
  if(!regionWon(lang))return {ok:false,msg:'Chưa thắng đủ 8 boss Skyroot bằng '+(lang==='ko'?'tiếng Hàn':'tiếng Anh')+'.'};
  if(e.regionClaimed[lang])return {ok:false,msg:'Đã nhận thưởng hoàn thành vùng này rồi.'};
  e.regionClaimed[lang]=1;
  gain35(REGION_XP);addGems(REGION_GEMS);
  try{var v=V19();if(v){var e19=v.en19();e19.titles=e19.titles||[];if(e19.titles.indexOf(REGION_TITLE)<0)e19.titles.push(REGION_TITLE)}}catch(err){}
  save35();
  return {ok:true,msg:'Hoàn thành Skyroot Sanctuary ('+(lang==='ko'?'🇰🇷 Tiếng Hàn':'🇬🇧 Tiếng Anh')+'): +'+REGION_XP+' XP, +'+REGION_GEMS+' 💎, danh hiệu “'+REGION_TITLE+'”!'};
}
function fightBoss(id){
  var lang=ST.lang||'en';
  if(!gateOpen(lang)){pop35('Skyroot Sanctuary cần thắng GEAR GOLEM (boss cuối Chrono) bằng '+(lang==='ko'?'tiếng Hàn':'tiếng Anh')+' trước.');return false}
  if(!bossUnlocked(id,lang)){pop35('Boss này chưa mở khóa — thắng boss trước đó trước nhé.');return false}
  var v=V19();if(!v){pop35('Chưa tải được hệ thống Boss (V19).');return false}
  try{v.setLang(lang)}catch(e){}
  closeSkyroot();
  try{v.fight(id)}catch(e){pop35('Không mở được trận đấu.');return false}
  return true;
}

/* ---------- words: attach into the shared WORDS array ---------- */
function attachSkyroot(){
  try{
    if(!window.__V35_WORDS||!window.__V35_WORDS.length)return 0;
    var v=V15();if(!v||!v.buildWords)return 0;
    v.buildWords(); /* the V35 block inside buildWords() merges __V35_WORDS */
    var n=0;
    (v.words||[]).forEach(function(w){if(w.lib&&w.lib.indexOf('skyroot')>=0)n++});
    return n;
  }catch(e){return 0}
}

/* ---------- pets: register species + eggs into __V23_DATA ---------- */
function registerPets(){
  var out={species:0,eggs:0,milestone:false};
  try{
    var d=D35(),vd=window.__V23_DATA;
    if(!vd||!d.species||!d.eggs)return out;
    vd.species=vd.species||[];vd.eggs=vd.eggs||[];
    d.species.forEach(function(sp){
      var has=false;
      vd.species.forEach(function(x){if(x.id===sp.id)has=true});
      if(!has){vd.species.push(sp);out.species++}
    });
    d.eggs.forEach(function(eg){
      var has=false;
      vd.eggs.forEach(function(x){if(x.id===eg.id)has=true});
      if(!has){vd.eggs.push(eg);out.eggs++}
    });
    /* Collection ladder topped out at 45 forms after V33; 9 new
       forms take the total to 54 — add one milestone (guarded +
       idempotent). */
    vd.collectionRewards=vd.collectionRewards||[];
    var has54=false;
    vd.collectionRewards.forEach(function(r){if(r.forms===54)has54=true});
    if(!has54){
      vd.collectionRewards.push({forms:54,gems:70,mats:{},title:'Bậc Thầy Thiên Căn',
        d:'Sưu tập đủ 54 hình thái: +70 💎, danh hiệu “Bậc Thầy Thiên Căn”'});
      out.milestone=true;
    }
  }catch(e){}
  return out;
}

/* ---------- V27 session plumbing (quests) ---------- */
function en27rec(){
  try{var v=V27();return v?v.en27():null}catch(e){return null}
}
function findSession(ids,startedAt){
  /* First en27 session rec at/after startedAt whose words cover all
     ids (rec.words holds the first 30 ids of the session). Scans all
     sessions, not just the newest, so a later Smart session does not
     steal the completion. */
  var d=en27rec();if(!d||!d.sessions)return null;
  for(var i=0;i<d.sessions.length;i++){
    var rec=d.sessions[i];
    if(!rec||rec.lang!=='en'||(rec.t||0)<startedAt)continue;
    if(!rec.words||!rec.words.length)continue;
    var ok=true;
    for(var j=0;j<ids.length;j++)if(rec.words.indexOf(ids[j])<0){ok=false;break}
    if(!ok)continue;
    var tot=(rec.correct||0)+(rec.wrong||0);
    if(tot<=0)continue;
    return {rec:rec,acc:rec.correct/tot,total:tot};
  }
  return null;
}
function launchSession(ids,kind){
  /* V34 lesson (applied here from day one): end a live Smart session
     before opening a Skyroot one — endEarly() is a no-op when no
     Smart session is live, and records the unfinished session
     honestly (no plan-completion reward for an unfinished plan). */
  try{if(window.__v27&&__v27.endEarly)__v27.endEarly()}catch(e){}
  var v=V27();
  if(!v||!v.startSession){pop35('Chưa tải được Học thông minh (V27).');return false}
  if(!ids||!ids.length)return false;
  closeSkyroot();
  try{v.openSmart('en')}catch(e){}
  try{return !!v.startSession('en',ids.slice(),kind)}catch(e){return false}
}
function questById(qid){var d=D35();return (d.questById?d.questById(qid):null)}
function startQuest(qid){
  var q=questById(qid);if(!q){pop35('Không tìm thấy nhiệm vụ.');return false}
  var e=en35();
  e.pending['quest:'+qid]={kind:'quest',id:qid,ids:q.ids.slice(),startedAt:Date.now()};
  save35();
  return launchSession(q.ids,'quest');
}
function checkCompletions(){
  /* Quest pending launches -> completed states. Runs on every
     Skyroot overlay open (and after a session ends, when the player
     reopens Skyroot to claim). Returns newly completed quest ids. */
  var e=en35(),done=[];
  try{
    var pend=e.pending||{},changed=false;
    Object.keys(pend).forEach(function(key){
      var p=pend[key];if(!p||!p.ids)return;
      var hit=findSession(p.ids,p.startedAt||0);
      if(!hit)return;
      if(p.kind==='quest'){
        var q=e.quests[p.id]=e.quests[p.id]||{};
        /* V33 lesson (B-33-1): completion needs accuracy >= 0.8.
           A below-threshold run consumes the attempt (pending is
           deleted below) but does NOT mark the quest done — the
           player retries with a fresh startQuest, whose startedAt
           excludes the old rec. */
        if(!q.done&&hit.acc>=QUEST_MIN_ACC){q.done=1;q.acc=Math.round(hit.acc*100)/100;q.at=hit.rec.t;done.push(p.id)}
        delete pend[key];changed=true;
      }
    });
    if(changed)save35();
  }catch(err){}
  return done;
}
function claimQuest(qid){
  var e=en35(),q=e.quests[qid];
  if(!q||!q.done)return {ok:false,msg:'Nhiệm vụ chưa hoàn thành.'};
  if(q.claimed)return {ok:false,msg:'Đã nhận thưởng nhiệm vụ này rồi.'};
  var xp=QUEST_XP+((q.acc||0)>=0.9?QUEST_BONUS_XP:0);
  gain35(xp);
  if(qid===FINAL_QUEST)addGems(QUEST_FINAL_GEMS);
  q.claimed=1;save35();
  return {ok:true,msg:'Nhận thưởng nhiệm vụ: +'+xp+' XP'+(qid===FINAL_QUEST?' +'+QUEST_FINAL_GEMS+' 💎':'')+'.'};
}
function questState(qid){
  var e=en35(),q=e.quests[qid]||{};
  if(q.claimed)return 'claimed';
  if(q.done)return 'done';
  if(e.pending['quest:'+qid])return 'active';
  return 'new';
}

/* ---------- overlay UI ---------- */
var ST={lang:'en',tab:'bosses'};
function elChip(el){
  try{var els=(window.__V19_DATA&&__V19_DATA.elements)||{};var o=els[el];if(o)return '<span class="v35chip">'+esc(o.ic+' '+o.n)+'</span>'}catch(e){}
  return '<span class="v35chip">'+esc(el||'')+'</span>';
}
function starStr(n){var s='';for(var i=0;i<3;i++)s+=i<(n||0)?'★':'☆';return s}
function bossCardHTML(b){
  var lang=ST.lang,un=bossUnlocked(b.id,lang),won=isWon35(b.id,lang),st=stars35(b.id,lang);
  var el=elChip(b.el);
  return '<div class="v35boss'+(won?' done':'')+(!un?' locked':'')+'">'
    +'<img src="'+esc(b.img)+'" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
    +'<b>'+esc(b.vi)+'</b><span class="v35mut">'+esc(b.n)+' · Lv '+b.lv+'</span>'
    +'<span>'+el+'</span>'
    +'<span class="v35mut">HP '+b.hp+' · Thủ '+b.def+' · '+esc(b.mode)+' · '+esc(b.diff)+'</span>'
    +'<span>'+starStr(st)+(won?' ✅ Đã thắng':'')+'</span>'
    +'<em>'+(won?'Đã thắng ('+starStr(st)+')':(un?'⚔️ Có thể đánh':'🔒 Thắng boss trước để mở'))+'</em>'
    +'<p class="v35mut">Kỹ năng: '+esc(b.skills.elem.n)+' · Tuyệt kỹ: '+esc(b.skills.ult.n)+'</p>'
    +(un?'<button type="button" class="v35btn pri" onclick="window.__v35.fightBoss(\''+b.id+'\')">Bắt đầu chiến đấu</button>':'')
    +'</div>';
}
function overlayHTML(){
  var lang=ST.lang,gate=gateOpen(lang),golem=gearGolemWon(lang),n=totalWins();
  var h='<div class="v35in">'
    +'<div class="v35head"><div class="v35title"><b>🌿 Skyroot Sanctuary</b><span>Thánh Địa Thiên Căn · V18.0 — đảo trời, rừng cổ, đền gió và Nữ Hoàng Thiên Căn</span></div>'
    +'<button type="button" class="v35x" onclick="window.__v35.closeSkyroot()" aria-label="Đóng">✕</button></div>'
    +'<div class="v35lang" role="group" aria-label="Chọn ngôn ngữ chiến đấu">'
    +'<button type="button" class="v35langbtn'+(lang==='en'?' on':'')+'" onclick="window.__v35.setLang(\'en\')">🇬🇧 Tiếng Anh</button>'
    +'<button type="button" class="v35langbtn'+(lang==='ko'?' on':'')+'" onclick="window.__v35.setLang(\'ko\')">🇰🇷 Tiếng Hàn</button></div>';
  /* gate */
  h+='<div class="v35card"><b>🔒 Cổng Thiên Căn — '+(golem?'✅ GEAR GOLEM đã bị đánh bại':'GEAR GOLEM chưa bị đánh bại')+'</b>'
    +'<p class="v35mut">Skyroot mở khi bạn thắng GEAR GOLEM (boss cuối Vương Quốc Thời Gian) bằng '+(lang==='ko'?'tiếng Hàn':'tiếng Anh')+'. '
    +(gate?'✅ Cổng đã mở — chào mừng đến Thánh Địa Thiên Căn!':'Thắng GEAR GOLEM bằng ngôn ngữ này để mở vùng đất này.')
    +(n?' Tổng số boss đã thắng: '+n+'/86.':'')+'</p></div>';
  if(!gate){
    h+='<div class="v35empty">Thánh Địa Thiên Căn đang khóa. Các boss, nhiệm vụ và thú Skyroot sẽ mở khi bạn thắng GEAR GOLEM bằng '+(lang==='ko'?'tiếng Hàn':'tiếng Anh')+'.</div>';
  }else{
    /* bosses */
    var langLabel=(lang==='ko'?'🇰🇷 Tiếng Hàn':'🇬🇧 Tiếng Anh');
    h+='<div class="v35sec"><h3>⚔️ Boss Skyroot ('+langLabel+')</h3>'
      +'<p class="v35mut">Thắng lần lượt từ trên xuống dưới. Thắng bằng cả hai ngôn ngữ để nhận danh hiệu “Bậc Thầy Song Ngữ” cho từng boss.</p>'
      +'<div class="v35bosses">'+bossList().map(bossCardHTML).join('')+'</div></div>';
    var e=en35();
    if(regionWon(lang)){
      h+='<div class="v35card"><b>👑 Hoàn thành vùng ('+(lang==='ko'?'🇰🇷 Tiếng Hàn':'🇬🇧 Tiếng Anh')+')</b><p class="v35mut">Thắng cả 8 boss Skyroot — thưởng một lần: +'+REGION_XP+' XP, +'+REGION_GEMS+' 💎, danh hiệu “'+REGION_TITLE+'”.</p>'
        +(e.regionClaimed[lang]?'<p>✅ Đã nhận thưởng hoàn thành vùng.</p>'
          :'<button type="button" class="v35btn pri" onclick="window.__v35.claimRegion()">Nhận thưởng hoàn thành vùng</button>')
        +'</div>';
    }
    /* quests */
    h+='<div class="v35sec"><h3>📜 Nhiệm Vụ Cốt Truyện</h3><p class="v35mut">Mỗi nhiệm vụ là một buổi học qua Học thông minh (12–14 từ Skyroot). Hoàn thành với độ chính xác ≥ 80% rồi quay lại đây nhận thưởng. Thưởng lần đầu +'+QUEST_XP+' XP, ≥ 90% thêm +'+QUEST_BONUS_XP+' XP; nhiệm vụ cuối thêm +'+QUEST_FINAL_GEMS+' 💎.</p><div class="v35quests">';
    (D35().quests||[]).forEach(function(q){
      var st=questState(q.id);
      h+='<div class="v35quest"><b>'+esc(q.vi)+'</b><span class="v35mut">'+esc(q.n)+' · '+q.ids.length+' từ</span>'
        +'<p class="v35mut">'+esc(q.d)+'</p>'
        +'<em>'+(st==='claimed'?'✅ Đã nhận thưởng':st==='done'?'🎉 Hoàn thành — nhận thưởng ngay!':st==='active'?'⏳ Đang làm — hoàn thành buổi học rồi quay lại đây':'📖 Chưa bắt đầu')+'</em>'
        +(st==='done'?'<button type="button" class="v35btn pri" onclick="window.__v35.claimQuest(\''+q.id+'\')">Nhận thưởng</button>'
          :st==='claimed'?'':'<button type="button" class="v35btn" onclick="window.__v35.startQuest(\''+q.id+'\')">'+(st==='active'?'Học tiếp':'Bắt đầu nhiệm vụ')+'</button>')
        +'</div>';
    });
    h+='</div></div>';
    /* pets + words */
    var skyN=0;try{var v15=V15();if(v15)(v15.words||[]).forEach(function(w){if(w.lib&&w.lib.indexOf('skyroot')>=0)skyN++})}catch(err){}
    h+='<div class="v35sec"><h3>🐾 Thú Cưng &amp; Từ Vựng Mới</h3>'
      +'<p class="v35mut">3 thú Skyroot mới — Cáo Mây, Cú Mầm, Cừu Bão — đã có trong Cửa hàng Pet (trứng Mây / Mầm / Bão). 240 từ Skyroot ('+skyN+' đã gắn vào kho từ chung, cấp B2, 4 bộ × 60 từ) dùng được trong mọi chế độ học, ôn SRS và trận boss; xem trong Thư viện, nhóm Skyroot Sanctuary.</p>'
      +'<button type="button" class="v35btn" onclick="window.__v35.openPetShop()">Mở Cửa hàng Pet</button></div>';
  }
  h+='</div>';
  return h;
}
function ensureHub(){
  var h=$('#v35hub');
  if(h)return h;
  h=document.createElement('div');
  h.id='v35hub';h.className='v35hub';h.style.display='none';
  h.setAttribute('role','dialog');h.setAttribute('aria-label','Skyroot Sanctuary — Thánh Địa Thiên Căn');
  document.body.appendChild(h);
  return h;
}
function openSkyroot(lang){
  try{
    if(lang==='en'||lang==='ko')ST.lang=lang;
    checkCompletions();
    var h=ensureHub();
    h.innerHTML=overlayHTML();
    h.style.display='flex';
    try{document.body.style.overflow='hidden'}catch(e){}
  }catch(e){}
}
function closeSkyroot(){
  try{
    var h=$('#v35hub');if(h)h.style.display='none';
    try{if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel()}catch(e){}
    try{var hub15=$('#v15hub');if(!hub15||hub15.style.display==='none')document.body.style.overflow=''}catch(e){document.body.style.overflow=''}
  }catch(e){}
}
function setLang35(l){
  if(l!=='en'&&l!=='ko')return;
  ST.lang=l;
  try{var h=$('#v35hub');if(h&&h.style.display!=='none')h.innerHTML=overlayHTML()}catch(e){}
}
function claimRegionUI(){
  var r=claimRegion(ST.lang);
  pop35(r.msg);
  try{var h=$('#v35hub');if(h&&h.style.display!=='none')h.innerHTML=overlayHTML()}catch(e){}
  return r.ok;
}
function claimQuestUI(qid){
  var r=claimQuest(qid);
  pop35(r.msg);
  try{var h=$('#v35hub');if(h&&h.style.display!=='none')h.innerHTML=overlayHTML()}catch(e){}
  return r.ok;
}
function openPetShop(){
  closeSkyroot();
  try{var v=V23();if(v)v.openHub('shop')}catch(e){}
}

/* ---------- EN Hub entry: MutationObserver decorator (V27 precedent) ---------- */
var _decT=null;
function decorateEN(){
  try{
    var hb=document.querySelector('.v15hub-headbtns');
    if(hb&&!hb.querySelector('.v35hubbtn')){
      var b=document.createElement('button');
      b.className='btn sm v35hubbtn';b.type='button';b.textContent='🌿 Skyroot Sanctuary';
      b.onclick=function(){openSkyroot('en')};
      var x=hb.querySelector('.v15x');
      if(x)hb.insertBefore(b,x);else hb.appendChild(b);
    }
    var lb=document.querySelector('#v15langbar .v15lb-in');
    if(lb&&!lb.querySelector('.v35hubbtn')){
      var b2=document.createElement('button');
      b2.className='v15lb-hub v35hubbtn';b2.type='button';b2.textContent='🌿 Skyroot Sanctuary';
      b2.onclick=function(){openSkyroot('en')};
      lb.appendChild(b2);
    }
  }catch(e){}
}
function scheduleDecorate(){
  if(_decT)return;
  _decT=setTimeout(function(){_decT=null;decorateEN()},60);
}

/* ---------- init ---------- */
function init35(){
  try{registerPets()}catch(e){}
  try{attachSkyroot()}catch(e){}
  try{
    decorateEN();
    if(window.MutationObserver){
      var _obs=new MutationObserver(function(){scheduleDecorate()});
      _obs.observe(document.body,{childList:true,subtree:true});
    }
  }catch(e){}
}
try{init35()}catch(e){}
if(typeof document!=='undefined'&&document&&document.readyState==='loading'){try{document.addEventListener('DOMContentLoaded',function(){try{init35()}catch(e){}})}catch(e){}}

window.__v35={
  version:VERSION,
  openSkyroot:openSkyroot,closeSkyroot:closeSkyroot,setLang:setLang35,
  en35:en35,gateOpen:gateOpen,gearGolemWon:gearGolemWon,totalWins:totalWins,
  bossUnlocked:bossUnlocked,fightBoss:fightBoss,isWon:isWon35,stars:stars35,
  claimRegion:claimRegionUI,regionWon:regionWon,
  startQuest:startQuest,claimQuest:claimQuestUI,questState:questState,checkCompletions:checkCompletions,
  attachSkyroot:attachSkyroot,registerPets:registerPets,openPetShop:openPetShop,
  _test:{
    en35:en35,gateOpen:gateOpen,gearGolemWon:gearGolemWon,totalWins:totalWins,
    bossUnlocked:bossUnlocked,regionWon:regionWon,claimRegion:claimRegion,
    startQuest:startQuest,claimQuest:claimQuest,questState:questState,checkCompletions:checkCompletions,
    findSession:findSession,
    attachSkyroot:attachSkyroot,registerPets:registerPets,
    overlayHTML:overlayHTML,openSkyroot:openSkyroot,closeSkyroot:closeSkyroot,
    SKYROOT_IDS:SKYROOT_IDS,GEAR_GOLEM:GEAR_GOLEM,FINAL_QUEST:FINAL_QUEST
  }
};
})();
