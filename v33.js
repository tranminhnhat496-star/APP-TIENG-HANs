/* ================================================================
   Korean & English Vocab Farm — V33 (V17.0 CHRONO KINGDOM)
   Layer V33: additive region layer, version 17.0.0, loads LAST.

   SCOPE (BRIEF_V33.md — ChatGPT CHRONO KINGDOM proposal, adapted):
   - 8 Chrono bosses (v17_*) fighting in the V19 Universal Combat
     Engine (no new engine). Stats on game scale (lv 61-68, hp
     620-750), continuing the V19 progression (V19 max lv 60 /
     hp 600). ChatGPT's Lv 71-78 / HP 18,000-50,000 are NOT on game
     scale and were NOT used. Elements mapped onto the real V19 EL
     (Sand->earth, Metal->earth, Dark->dark, Electric->thunder,
     Void->cosmic, Light->light, Time->cosmic). Skill ids come only
     from the V19 palette. GEAR GOLEM: 90-HP gear shield at fight
     start, 2 phases only (NO P3 Knowledge Counterattack — deliberate
     adaptation), time-reversal heal +10 HP on wrong answers in P2
     (guarded branches in v19.js, keyed on boss id).
   - 70-win region gate with a V33-LOCAL corrected win count.
     bossWinCount() (v21.js:111) undercounts flat V18 wins (AUTO
     finding V17-1); it is NOT changed here (avatar unlocks belong
     to the AUTO project). V33 counts en15 keys + en18 (flat win OR
     nested en/ko win) + en19 (nested en/ko win). Correct total =
     10 + 30 + 30 = 70, so the gate opens exactly when the player
     has won everything. Locked state shows real x/70 progress.
   - 3 pet species x 3 stages + 3 eggs, registered into the live
     __V23_DATA (guarded + idempotent). Elements nature/thunder/
     light; skills use existing v23 types only (Star Deer: passive
     'wisdom' + active 'heal'; Gear Beetle: active 'shield' +
     passive 'crystal'; Cosmic Unicorn: passive 'storm' + active
     'dmg'). Evolution uses the element's stone + feather/fruit/
     coins per PET_EVO_COST — no new materials. Collection
     milestones extended with a 45-form milestone (36 + 9 new
     forms) — the existing ladder topped out at 36.
   - 6 story quests via the V27 engine (ONE guarded replacement
     exports startSession on __v27). Completion is detected from
     en27 session records (rec.t >= startedAt, rec.words covers
     the quest ids, accuracy >= 0.8); rewards are claimed-guarded
     in en33.quests and come only from real stores (XP via gain15,
     gems via S.v7.gems).
   - Time Echo: up to 10 words with en27.en.cw >= 1 (most-wrong
     first), launched via startSession kind 'echo'; honest empty
     state when there is nothing to echo. No extra bonus — the
     session already pays through mark15.
   - Chrono Rift: 3 floors x 7 questions, one V27 session per
     floor (kind 'rift'). Floor N+1 unlocks only if floor N
     accuracy >= 0.7. Rewards accuracy-scaled, once per day per
     floor, claimed-guarded in en33.rift. NOTE: the V27 session
     still reasks wrong words in its main phase; the floor
     accuracy is correct/total of the session record, reasks
     included.
   - 240 Chrono words (4 sets x 60) enter the shared WORDS array
     via the V33 block inside buildWords() (BT precedent) with ids
     'v33_<slug>', lib 'chrono', lv 'B2'. No S.cards entries are
     ever created — the ko field is display/learning data only.
   - New save key S.v7.en33 (lazy, no migration). Boss wins stay
     in en19 (UCE); en33 holds quests / rift / echo / region
     claims / pending launches only. Worst case < 20 KB.

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
var VERSION='17.0.0';
var GATE_TOTAL=70;
var CHRONO_IDS=['v17_sandwisp','v17_pendulum','v17_specter','v17_mantis','v17_hound','v17_oracle','v17_titan','v17_geargolem'];
var REGION_XP=150, REGION_GEMS=5, REGION_TITLE='Chúa Tể Thời Gian';
var QUEST_XP=20, QUEST_BONUS_XP=10, QUEST_FINAL_GEMS=1, QUEST_MIN_ACC=0.8;
var RIFT_REWARDS=[{acc:0.9,xp:40,gems:2},{acc:0.7,xp:25,gems:1},{acc:0,xp:10,gems:0}];

function $(s,r){try{return (r||document).querySelector(s)}catch(e){return null}}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function getS(){try{return S}catch(e){return null}}
function V15(){try{return window.__v15||null}catch(e){return null}}
function V19(){try{return window.__v19||null}catch(e){return null}}
function V23(){try{return window.__v23||null}catch(e){return null}}
function V27(){try{return window.__v27||null}catch(e){return null}}
function D33(){try{return window.__V33_DATA||{}}catch(e){return {}}}
function save33(){try{var v=V15();if(v&&v.save15)v.save15();}catch(e){}}
function gain33(n){try{var v=V15();if(v&&v.gain15)v.gain15(n);}catch(e){}}
function pop33(t){try{var v=V15();if(v&&v.pop15){v.pop15(t);return}}catch(e){} try{if(window.console&&console.log)console.log('[V33] '+t)}catch(e){}}
function addGems(n){try{var s=getS();if(s){s.v7=s.v7||{};s.v7.gems=(s.v7.gems||0)+n}}catch(e){}}
function todayStr(){try{return new Date().toDateString()}catch(e){return ''}}

/* ---------- en33 state (lazy, no migration) ---------- */
function en33(){
  try{
    var s=getS();if(!s)return {quests:{},rift:{day:'',best:{},claimed:{}},regionClaimed:{en:0,ko:0},pending:{},created:Date.now()};
    s.v7=s.v7||{};
    var e=s.v7.en33;
    if(!e)e=s.v7.en33={quests:{},rift:{day:'',best:{},claimed:{}},regionClaimed:{en:0,ko:0},pending:{},created:Date.now()};
    e.quests=e.quests||{};e.rift=e.rift||{day:'',best:{},claimed:{}};
    e.rift.best=e.rift.best||{};e.rift.claimed=e.rift.claimed||{};
    e.regionClaimed=e.regionClaimed||{en:0,ko:0};e.pending=e.pending||{};
    return e;
  }catch(err){return {quests:{},rift:{day:'',best:{},claimed:{}},regionClaimed:{en:0,ko:0},pending:{},created:Date.now()}}
}

/* ---------- 70-win gate (V33-local corrected count) ---------- */
function correctedWinCount(){
  var s=getS(),n=0;
  if(!s||!s.v7)return 0;
  try{
    var b15=(s.v7.en15&&s.v7.en15.bosses)||{};
    n+=Object.keys(b15).length; /* V21's own definition for en15 */
  }catch(e){}
  try{
    var b18=(s.v7.en18&&s.v7.en18.bosses)||{};
    for(var id18 in b18){var r18=b18[id18]||{};if(r18.win||r18.wins||(r18.en&&r18.en.win)||(r18.ko&&r18.ko.win))n++;}
  }catch(e){}
  try{
    var b19=(s.v7.en19&&s.v7.en19.bosses)||{};
    for(var id19 in b19){var r19=b19[id19]||{};if((r19.en&&r19.en.win)||(r19.ko&&r19.ko.win))n++;}
  }catch(e){}
  return n;
}
function winBreakdown(){
  var s=getS(),o={en15:0,en18:0,en19:0};
  if(!s||!s.v7)return o;
  try{o.en15=Object.keys((s.v7.en15&&s.v7.en15.bosses)||{}).length}catch(e){}
  try{var b18=(s.v7.en18&&s.v7.en18.bosses)||{};for(var k in b18){var r=b18[k]||{};if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win))o.en18++}}catch(e){}
  try{var b19=(s.v7.en19&&s.v7.en19.bosses)||{};for(var k2 in b19){var r2=b19[k2]||{};if((r2.en&&r2.en.win)||(r2.ko&&r2.ko.win))o.en19++}}catch(e){}
  return o;
}
function gateOpen(){return correctedWinCount()>=GATE_TOTAL}

/* ---------- bosses (records live in en19 via the UCE) ---------- */
function bossList(){var d=D33();return (d.bosses||[]).slice()}
function bossById(id){var d=D33();return (d.byId?d.byId(id):null)}
function isWon33(id,lang){try{var v=V19();return v?v.isWon(id,lang):false}catch(e){return false}}
function stars33(id,lang){try{var v=V19();return v?v.stars(id,lang):0}catch(e){return 0}}
function bossUnlocked(id,lang){
  /* Sequential inside Chrono + the 70-win gate. Called by the V19
     bossUnlocked19 replacement for zone 'chrono' (and by the V33
     overlay). Never calls back into __v19.bossUnlocked (no recursion). */
  lang=lang||ST.lang||'en';
  if(!gateOpen())return false;
  var i=CHRONO_IDS.indexOf(id);
  if(i<0)return false;
  if(i===0)return true;
  return isWon33(CHRONO_IDS[i-1],lang);
}
function regionWon(lang){
  for(var i=0;i<CHRONO_IDS.length;i++)if(!isWon33(CHRONO_IDS[i],lang))return false;
  return true;
}
function claimRegion(lang){
  lang=lang||ST.lang||'en';
  var e=en33();
  if(!regionWon(lang))return {ok:false,msg:'Chưa thắng đủ 8 boss Chrono bằng '+(lang==='ko'?'tiếng Hàn':'tiếng Anh')+'.'};
  if(e.regionClaimed[lang])return {ok:false,msg:'Đã nhận thưởng hoàn thành vùng này rồi.'};
  e.regionClaimed[lang]=1;
  gain33(REGION_XP);addGems(REGION_GEMS);
  try{var v=V19();if(v){var e19=v.en19();e19.titles=e19.titles||[];if(e19.titles.indexOf(REGION_TITLE)<0)e19.titles.push(REGION_TITLE)}}catch(err){}
  save33();
  return {ok:true,msg:'Hoàn thành Vương Quốc Thời Gian ('+(lang==='ko'?'🇰🇷 Tiếng Hàn':'🇬🇧 Tiếng Anh')+'): +'+REGION_XP+' XP, +'+REGION_GEMS+' 💎, danh hiệu “'+REGION_TITLE+'”!'};
}
function fightBoss(id){
  var lang=ST.lang||'en';
  if(!gateOpen()){pop33('Vương Quốc Thời Gian cần thắng đủ 70 boss ('+correctedWinCount()+'/70).');return false}
  if(!bossUnlocked(id,lang)){pop33('Boss này chưa mở khóa — thắng boss trước đó trước nhé.');return false}
  var v=V19();if(!v){pop33('Chưa tải được hệ thống Boss (V19).');return false}
  try{v.setLang(lang)}catch(e){}
  closeChrono();
  try{v.fight(id)}catch(e){pop33('Không mở được trận đấu.');return false}
  return true;
}

/* ---------- words: attach into the shared WORDS array ---------- */
function attachChrono(){
  try{
    if(!window.__V33_WORDS||!window.__V33_WORDS.length)return 0;
    var v=V15();if(!v||!v.buildWords)return 0;
    v.buildWords(); /* the V33 block inside buildWords() merges __V33_WORDS */
    var n=0;
    (v.words||[]).forEach(function(w){if(w.lib&&w.lib.indexOf('chrono')>=0)n++});
    return n;
  }catch(e){return 0}
}

/* ---------- pets: register species + eggs into __V23_DATA ---------- */
function registerPets(){
  var out={species:0,eggs:0,milestone:false};
  try{
    var d=D33(),vd=window.__V23_DATA;
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
    /* Collection ladder topped out at 36 forms; 9 new forms take the
       total to 45 — add one milestone (guarded + idempotent). */
    vd.collectionRewards=vd.collectionRewards||[];
    var has45=false;
    vd.collectionRewards.forEach(function(r){if(r.forms===45)has45=true});
    if(!has45){
      vd.collectionRewards.push({forms:45,gems:60,mats:{},title:'Bậc Thầy Thời Gian',
        d:'Sưu tập đủ 45 hình thái: +60 💎, danh hiệu “Bậc Thầy Thời Gian”'});
      out.milestone=true;
    }
  }catch(e){}
  return out;
}

/* ---------- V27 session plumbing (quests / echo / rift) ---------- */
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
    if(!rec||rec.partial||rec.lang!=='en'||(rec.t||0)<startedAt)continue;
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
  /* V34: kết thúc buổi Smart đang chạy (nếu có) trước khi mở buổi
     Chrono — endEarly() là no-op khi không có buổi nào, và ghi lại
     buổi dở dang một cách trung thực (không thưởng hoàn thành kế
     hoạch khi chưa học hết). */
  try{if(window.__v27&&__v27.endEarly)__v27.endEarly()}catch(e){}
  var v=V27();
  if(!v||!v.startSession){pop33('Chưa tải được Học thông minh (V27).');return false}
  if(!ids||!ids.length)return false;
  closeChrono();
  try{v.openSmart('en')}catch(e){}
  try{return !!v.startSession('en',ids.slice(),kind)}catch(e){return false}
}
function questById(qid){var d=D33();return (d.questById?d.questById(qid):null)}
function startQuest(qid){
  var q=questById(qid);if(!q){pop33('Không tìm thấy nhiệm vụ.');return false}
  var e=en33();
  e.pending['quest:'+qid]={kind:'quest',id:qid,ids:q.ids.slice(),startedAt:Date.now()};
  save33();
  return launchSession(q.ids,'quest');
}
function checkCompletions(){
  /* Quest + Rift pending launches -> completed states. Runs on every
     Chrono overlay open (and after a session ends, when the player
     reopens Chrono to claim). Returns newly completed quest ids. */
  var e=en33(),done=[];
  try{
    var pend=e.pending||{},changed=false;
    Object.keys(pend).forEach(function(key){
      var p=pend[key];if(!p||!p.ids)return;
      var hit=findSession(p.ids,p.startedAt||0);
      if(!hit)return;
      if(p.kind==='quest'){
        var q=e.quests[p.id]=e.quests[p.id]||{};
        /* B-33-1 (found by test33 §4): completion needs accuracy >= 0.8.
           A below-threshold run consumes the attempt (pending is deleted
           below) but does NOT mark the quest done — the player retries
           with a fresh startQuest, whose startedAt excludes the old rec. */
        if(!q.done&&hit.acc>=QUEST_MIN_ACC){q.done=1;q.acc=Math.round(hit.acc*100)/100;q.at=hit.rec.t;done.push(p.id)}
        delete pend[key];changed=true;
      }else if(p.kind==='rift'){
        var f=parseInt(p.id,10);
        if(f>=1&&f<=3){
          var prev=e.rift.best[f]||0;
          if(hit.acc>prev)e.rift.best[f]=Math.round(hit.acc*100)/100;
        }
        delete pend[key];changed=true;
      }
    });
    if(changed)save33();
  }catch(err){}
  return done;
}
function claimQuest(qid){
  var e=en33(),q=e.quests[qid];
  if(!q||!q.done)return {ok:false,msg:'Nhiệm vụ chưa hoàn thành.'};
  if(q.claimed)return {ok:false,msg:'Đã nhận thưởng nhiệm vụ này rồi.'};
  var xp=QUEST_XP+((q.acc||0)>=0.9?QUEST_BONUS_XP:0);
  gain33(xp);
  if(qid==='q_final')addGems(QUEST_FINAL_GEMS);
  q.claimed=1;save33();
  return {ok:true,msg:'Nhận thưởng nhiệm vụ: +'+xp+' XP'+(qid==='q_final'?' +'+QUEST_FINAL_GEMS+' 💎':'')+'.'};
}
function questState(qid){
  var e=en33(),q=e.quests[qid]||{};
  if(q.claimed)return 'claimed';
  if(q.done)return 'done';
  if(e.pending['quest:'+qid])return 'active';
  return 'new';
}

/* ---------- Time Echo ---------- */
function echoList(){
  var out=[];
  try{
    var d=en27rec();if(!d||!d.en||!d.en.cw)return out;
    var cw=d.en.cw;
    Object.keys(cw).forEach(function(id){if((cw[id]||0)>=1)out.push({id:id,cw:cw[id]})});
    out.sort(function(a,b){return b.cw-a.cw});
  }catch(e){}
  return out.slice(0,10);
}
function startEcho(){
  var list=echoList();
  if(!list.length){pop33('Chưa có từ nào trả lời sai — Time Echo đang trống.');return false}
  return launchSession(list.map(function(x){return x.id}),'echo');
}

/* ---------- Chrono Rift ---------- */
function riftFloor(f){
  var d=D33();return (d.riftByFloor?d.riftByFloor(f):null);
}
function riftUnlocked(f){
  if(f===1)return true;
  var e=en33();
  return (e.rift.best[f-1]||0)>=0.7;
}
function startRift(f){
  var fl=riftFloor(f);if(!fl){pop33('Không tìm thấy tầng này.');return false}
  if(!riftUnlocked(f)){pop33('Mở tầng '+(f-1)+' với độ chính xác ≥ 70% trước nhé.');return false}
  var e=en33();
  e.pending['rift:'+f]={kind:'rift',id:String(f),ids:fl.ids.slice(),startedAt:Date.now()};
  save33();
  return launchSession(fl.ids,'rift');
}
function riftRewardFor(acc){
  for(var i=0;i<RIFT_REWARDS.length;i++)if(acc>=RIFT_REWARDS[i].acc)return RIFT_REWARDS[i];
  return RIFT_REWARDS[RIFT_REWARDS.length-1];
}
function claimRift(f){
  var e=en33();
  var day=todayStr();
  if(e.rift.day!==day){e.rift.day=day;e.rift.claimed={}}
  if(e.rift.claimed[f])return {ok:false,msg:'Đã nhận thưởng tầng '+f+' hôm nay rồi.'};
  var acc=e.rift.best[f];
  if(acc==null||acc===undefined)return {ok:false,msg:'Chưa hoàn thành tầng '+f+' — đánh tầng này trước nhé.'};
  var rw=riftRewardFor(acc);
  gain33(rw.xp);if(rw.gems)addGems(rw.gems);
  e.rift.claimed[f]=1;save33();
  return {ok:true,msg:'Khe Nứt Thời Gian tầng '+f+' ('+Math.round(acc*100)+'%): +'+rw.xp+' XP'+(rw.gems?' +'+rw.gems+' 💎':'')+'.'};
}

/* ---------- overlay UI ---------- */
var ST={lang:'en',tab:'bosses'};
function elChip(el){
  try{var els=(window.__V19_DATA&&__V19_DATA.elements)||{};var o=els[el];if(o)return '<span class="v33chip">'+esc(o.ic+' '+o.n)+'</span>'}catch(e){}
  return '<span class="v33chip">'+esc(el||'')+'</span>';
}
function starStr(n){var s='';for(var i=0;i<3;i++)s+=i<(n||0)?'★':'☆';return s}
function bossCardHTML(b){
  var lang=ST.lang,un=bossUnlocked(b.id,lang),won=isWon33(b.id,lang),st=stars33(b.id,lang);
  var el=elChip(b.el);
  return '<div class="v33boss'+(won?' done':'')+(!un?' locked':'')+'">'
    +'<img src="'+esc(b.img)+'" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
    +'<b>'+esc(b.vi)+'</b><span class="v33mut">'+esc(b.n)+' · Lv '+b.lv+'</span>'
    +'<span>'+el+'</span>'
    +'<span class="v33mut">HP '+b.hp+' · Thủ '+b.def+' · '+esc(b.mode)+' · '+esc(b.diff)+'</span>'
    +'<span>'+starStr(st)+(won?' ✅ Đã thắng':'')+'</span>'
    +'<em>'+(won?'Đã thắng ('+starStr(st)+')':(un?'⚔️ Có thể đánh':'🔒 Thắng boss trước để mở'))+'</em>'
    +'<p class="v33mut">Kỹ năng: '+esc(b.skills.elem.n)+' · Tuyệt kỹ: '+esc(b.skills.ult.n)+'</p>'
    +(un?'<button type="button" class="v33btn pri" onclick="window.__v33.fightBoss(\''+b.id+'\')">Bắt đầu chiến đấu</button>':'')
    +'</div>';
}
function overlayHTML(){
  var lang=ST.lang,gate=gateOpen(),n=correctedWinCount(),bd=winBreakdown();
  var h='<div class="v33in">'
    +'<div class="v33head"><div class="v33title"><b>⏳ Vương Quốc Thời Gian</b><span>Chrono Kingdom · V17.0 — vùng đất cuối, mở sau 70 chiến thắng boss</span></div>'
    +'<button type="button" class="v33x" onclick="window.__v33.closeChrono()" aria-label="Đóng">✕</button></div>'
    +'<div class="v33lang" role="group" aria-label="Chọn ngôn ngữ chiến đấu">'
    +'<button type="button" class="v33langbtn'+(lang==='en'?' on':'')+'" onclick="window.__v33.setLang(\'en\')">🇬🇧 Tiếng Anh</button>'
    +'<button type="button" class="v33langbtn'+(lang==='ko'?' on':'')+'" onclick="window.__v33.setLang(\'ko\')">🇰🇷 Tiếng Hàn</button></div>';
  /* gate */
  h+='<div class="v33card"><b>🔒 Cổng Thời Gian — '+n+'/'+GATE_TOTAL+' boss đã thắng</b>'
    +'<div class="v33bar"><i style="width:'+Math.min(100,Math.round(n/GATE_TOTAL*100))+'%"></i></div>'
    +'<p class="v33mut">Boss cũ (V15): '+bd.en15+'/10 · Boss V10 (V18): '+bd.en18+'/30 · Boss V11 (V19): '+bd.en19+'/30. '
    +(gate?'✅ Cổng đã mở — chào mừng đến Vương Quốc Thời Gian!':'Thắng đủ 70 boss để mở vùng đất này — số liệu là thật, đếm từ chính bản lưu của bạn.')+'</p>'
    +(window.__v42?window.__v42.chronoGateHTML(lang,gate):'')+'</div>';
  if(!gate){
    h+='<div class="v33empty">Vương Quốc Thời Gian đang khóa. Các boss, nhiệm vụ, Time Echo và Khe Nứt Thời Gian sẽ mở khi bạn thắng đủ 70 boss.</div>';
  }else{
    /* bosses */
    var langLabel=(lang==='ko'?'🇰🇷 Tiếng Hàn':'🇬🇧 Tiếng Anh');
    h+='<div class="v33sec"><h3>⚔️ Boss Chrono ('+langLabel+')</h3>'
      +'<p class="v33mut">Thắng lần lượt từ trên xuống dưới. Thắng bằng cả hai ngôn ngữ để nhận danh hiệu “Bậc Thầy Song Ngữ” cho từng boss.</p>'
      +'<div class="v33bosses">'+bossList().map(bossCardHTML).join('')+'</div></div>';
    var e=en33();
    if(regionWon(lang)){
      h+='<div class="v33card"><b>👑 Hoàn thành vùng ('+(lang==='ko'?'🇰🇷 Tiếng Hàn':'🇬🇧 Tiếng Anh')+')</b><p class="v33mut">Thắng cả 8 boss Chrono — thưởng một lần: +'+REGION_XP+' XP, +'+REGION_GEMS+' 💎, danh hiệu “'+REGION_TITLE+'”.</p>'
        +(e.regionClaimed[lang]?'<p>✅ Đã nhận thưởng hoàn thành vùng.</p>'
          :'<button type="button" class="v33btn pri" onclick="window.__v33.claimRegion()">Nhận thưởng hoàn thành vùng</button>')
        +'</div>';
    }
    /* quests */
    h+='<div class="v33sec"><h3>📜 Nhiệm Vụ Cốt Truyện</h3><p class="v33mut">Mỗi nhiệm vụ là một buổi học qua Học thông minh (10–14 từ Chrono). Hoàn thành với độ chính xác ≥ 80% rồi quay lại đây nhận thưởng. Thưởng lần đầu +'+QUEST_XP+' XP, ≥ 90% thêm +'+QUEST_BONUS_XP+' XP; nhiệm vụ cuối thêm +'+QUEST_FINAL_GEMS+' 💎.</p><div class="v33quests">';
    (D33().quests||[]).forEach(function(q){
      var st=questState(q.id);
      h+='<div class="v33quest"><b>'+esc(q.vi)+'</b><span class="v33mut">'+esc(q.n)+' · '+q.ids.length+' từ</span>'
        +'<p class="v33mut">'+esc(q.d)+'</p>'
        +'<em>'+(st==='claimed'?'✅ Đã nhận thưởng':st==='done'?'🎉 Hoàn thành — nhận thưởng ngay!':st==='active'?'⏳ Đang làm — hoàn thành buổi học rồi quay lại đây':'📖 Chưa bắt đầu')+'</em>'
        +(st==='done'?'<button type="button" class="v33btn pri" onclick="window.__v33.claimQuest(\''+q.id+'\')">Nhận thưởng</button>'
          :st==='claimed'?'':'<button type="button" class="v33btn" onclick="window.__v33.startQuest(\''+q.id+'\')">'+(st==='active'?'Học tiếp':'Bắt đầu nhiệm vụ')+'</button>')
        +'</div>';
    });
    h+='</div></div>';
    /* Time Echo */
    var echo=echoList();
    h+='<div class="v33sec"><h3>🪞 Time Echo — Tiếng Vọng Thời Gian</h3>'
      +(echo.length
        ?'<p class="v33mut">Bạn có '+echo.length+' từ trả lời sai gần đây (nhiều nhất: '+echo.map(function(x){return esc(x.id.replace(/^v33_/,'').replace(/_/g,' '))}).slice(0,3).join(', ')+'…). Ôn lại qua Học thông minh — trả lời đúng sẽ xóa từ khỏi danh sách này.</p><button type="button" class="v33btn pri" onclick="window.__v33.startEcho()">Ôn '+echo.length+' từ sai</button>'
        :'<p class="v33mut">Chưa có từ nào trả lời sai — Time Echo đang trống. Trả lời sai trong các buổi học hoặc trận boss sẽ đưa từ vào đây.</p>')
      +'</div>';
    /* Chrono Rift */
    h+='<div class="v33sec"><h3>🌀 Khe Nứt Thời Gian — Chrono Rift</h3><p class="v33mut">3 tầng × 7 câu. Tầng sau mở khi tầng trước đạt ≥ 70%. Thưởng mỗi tầng một lần mỗi ngày theo độ chính xác: ≥ 90% +40 XP/+2 💎 · ≥ 70% +25 XP/+1 💎 · dưới 70% +10 XP.</p><div class="v33quests">';
    for(var f=1;f<=3;f++){
      var fl=riftFloor(f),un=riftUnlocked(f),best=e.rift.best[f],claimedToday=e.rift.day===todayStr()&&!!e.rift.claimed[f];
      h+='<div class="v33quest"><b>'+esc(fl?fl.n:('Tầng '+f))+'</b><span class="v33mut">7 câu hỏi · '+(un?'đã mở':'🔒 cần tầng '+(f-1)+' ≥ 70%')+'</span>'
        +'<em>'+(best==null?'Chưa đánh tầng này':'Kỷ lục: '+Math.round(best*100)+'%')+(claimedToday?' · ✅ Đã nhận thưởng hôm nay':'')+'</em>'
        +(un?'<button type="button" class="v33btn" onclick="window.__v33.startRift('+f+')">Đánh tầng '+f+'</button>':'')
        +(best!=null&&!claimedToday?'<button type="button" class="v33btn pri" onclick="window.__v33.claimRift('+f+')">Nhận thưởng tầng '+f+'</button>':'')
        +'</div>';
    }
    h+='</div></div>';
    /* pets + words */
    var chronoN=0;try{var v15=V15();if(v15)(v15.words||[]).forEach(function(w){if(w.lib&&w.lib.indexOf('chrono')>=0)chronoN++})}catch(err){}
    h+='<div class="v33sec"><h3>🐾 Thú Cưng &amp; Từ Vựng Mới</h3>'
      +'<p class="v33mut">3 thú Chrono mới — Hươu Sao, Bọ Bánh Răng, Kỳ Lân Vũ Trụ — đã có trong Cửa hàng Pet (trứng Sao / Bánh Răng / Vũ Trụ). 240 từ Chrono ('+chronoN+' đã gắn vào kho từ chung, cấp B2) dùng được trong mọi chế độ học, ôn SRS và trận boss.</p>'
      +'<button type="button" class="v33btn" onclick="window.__v33.openPetShop()">Mở Cửa hàng Pet</button></div>';
  }
  h+='</div>';
  return h;
}
function ensureHub(){
  var h=$('#v33hub');
  if(h)return h;
  h=document.createElement('div');
  h.id='v33hub';h.className='v33hub';h.style.display='none';
  h.setAttribute('role','dialog');h.setAttribute('aria-label','Vương Quốc Thời Gian — Chrono Kingdom');
  document.body.appendChild(h);
  return h;
}
function openChrono(lang){
  try{
    if(lang==='en'||lang==='ko')ST.lang=lang;
    checkCompletions();
    var h=ensureHub();
    h.innerHTML=overlayHTML();
    h.style.display='flex';
    try{document.body.style.overflow='hidden'}catch(e){}
  }catch(e){}
}
function closeChrono(){
  try{
    var h=$('#v33hub');if(h)h.style.display='none';
    try{if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel()}catch(e){}
    try{var hub15=$('#v15hub');if(!hub15||hub15.style.display==='none')document.body.style.overflow=''}catch(e){document.body.style.overflow=''}
  }catch(e){}
}
function setLang33(l){
  if(l!=='en'&&l!=='ko')return;
  ST.lang=l;
  try{var h=$('#v33hub');if(h&&h.style.display!=='none')h.innerHTML=overlayHTML()}catch(e){}
}
function claimRegionUI(){
  var r=claimRegion(ST.lang);
  pop33(r.msg);
  try{var h=$('#v33hub');if(h&&h.style.display!=='none')h.innerHTML=overlayHTML()}catch(e){}
  return r.ok;
}
function claimQuestUI(qid){
  var r=claimQuest(qid);
  pop33(r.msg);
  try{var h=$('#v33hub');if(h&&h.style.display!=='none')h.innerHTML=overlayHTML()}catch(e){}
  return r.ok;
}
function claimRiftUI(f){
  var r=claimRift(f);
  pop33(r.msg);
  try{var h=$('#v33hub');if(h&&h.style.display!=='none')h.innerHTML=overlayHTML()}catch(e){}
  return r.ok;
}
function openPetShop(){
  closeChrono();
  try{var v=V23();if(v)v.openHub('shop')}catch(e){}
}

/* ---------- EN Hub entry: MutationObserver decorator (V27 precedent) ---------- */
var _decT=null;
function decorateEN(){
  try{
    var hb=document.querySelector('.v15hub-headbtns');
    if(hb&&!hb.querySelector('.v33hubbtn')){
      var b=document.createElement('button');
      b.className='btn sm v33hubbtn';b.type='button';b.textContent='⏳ Chrono Kingdom';
      b.onclick=function(){openChrono('en')};
      var x=hb.querySelector('.v15x');
      if(x)hb.insertBefore(b,x);else hb.appendChild(b);
    }
    var lb=document.querySelector('#v15langbar .v15lb-in');
    if(lb&&!lb.querySelector('.v33hubbtn')){
      var b2=document.createElement('button');
      b2.className='v15lb-hub v33hubbtn';b2.type='button';b2.textContent='⏳ Chrono Kingdom';
      b2.onclick=function(){openChrono('en')};
      lb.appendChild(b2);
    }
  }catch(e){}
}
function scheduleDecorate(){
  if(_decT)return;
  _decT=setTimeout(function(){_decT=null;decorateEN()},60);
}

/* ---------- init ---------- */
function init33(){
  try{registerPets()}catch(e){}
  try{attachChrono()}catch(e){}
  try{
    decorateEN();
    if(window.MutationObserver){
      var _obs=new MutationObserver(function(){scheduleDecorate()});
      _obs.observe(document.body,{childList:true,subtree:true});
    }
  }catch(e){}
}
try{init33()}catch(e){}
if(typeof document!=='undefined'&&document&&document.readyState==='loading'){try{document.addEventListener('DOMContentLoaded',function(){try{init33()}catch(e){}})}catch(e){}}

window.__v33={
  version:VERSION,
  openChrono:openChrono,closeChrono:closeChrono,setLang:setLang33,
  en33:en33,gateOpen:gateOpen,correctedWinCount:correctedWinCount,winBreakdown:winBreakdown,
  bossUnlocked:bossUnlocked,fightBoss:fightBoss,isWon:isWon33,stars:stars33,
  claimRegion:claimRegionUI,regionWon:regionWon,
  startQuest:startQuest,claimQuest:claimQuestUI,questState:questState,checkCompletions:checkCompletions,
  echoList:echoList,startEcho:startEcho,
  startRift:startRift,claimRift:claimRiftUI,riftUnlocked:riftUnlocked,
  attachChrono:attachChrono,registerPets:registerPets,openPetShop:openPetShop,
  _test:{
    en33:en33,correctedWinCount:correctedWinCount,winBreakdown:winBreakdown,gateOpen:gateOpen,
    bossUnlocked:bossUnlocked,regionWon:regionWon,claimRegion:claimRegion,
    startQuest:startQuest,claimQuest:claimQuest,questState:questState,checkCompletions:checkCompletions,
    echoList:echoList,startEcho:startEcho,startRift:startRift,claimRift:claimRift,
    riftUnlocked:riftUnlocked,riftRewardFor:riftRewardFor,findSession:findSession,
    attachChrono:attachChrono,registerPets:registerPets,
    overlayHTML:overlayHTML,openChrono:openChrono,closeChrono:closeChrono,
    CHRONO_IDS:CHRONO_IDS,GATE_TOTAL:GATE_TOTAL
  }
};
})();
