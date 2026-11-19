/* ===== V23 — Premium Pet System (V15) =====
   One shared system for English Hub + Korean Hub. Pets and team are
   shared; vocabulary progress stays separate per language (V7 rule).
   Save: S.v7.en23 = {pets:{}, eggs:{}, hatch:null|{egg,startedAt,endsAt},
   mats:{}, team:[id|null x3], claimed:{}, affClaimed:{}, created}
   V6 farm animals (S.own, assets/pets/*.png) are UNTOUCHED — this is a
   separate combat-pet system with its own art in assets/pets/v15/.
   All currency uses the game's own wallet: coins = S.xp - S.spent,
   gems = S.v7.gems. No new currency (the mock's "energy 120/120" is
   NOT implemented — there is no energy currency in this game). */
(function(){
'use strict';
var D=window.__V23_DATA||{};
var W=window;
function S_(){try{return S}catch(e){return null}} /* V6 `let S` — bare, not window.S */
function save23(){try{if(typeof save==='function')save()}catch(e){}}
function saveNow23(){try{if(W.__v20&&__v20.saveNow)__v20.saveNow();else save23()}catch(e){save23()}}
function coins23(){try{if(typeof coins==='function')return coins()}catch(e){}var s=S_();return s?((s.xp||0)-(s.spent||0)):0}
function spendCoins23(n){var s=S_();if(!s)return false;if(coins23()<n)return false;s.spent=(s.spent||0)+n;return true}
function gems23(){var s=S_();return s&&s.v7?(s.v7.gems||0):0}
function addGems23(n){var s=S_();if(!s||!s.v7)return;s.v7.gems=(s.v7.gems||0)+n}
function spendGems23(n){var s=S_();if(!s||!s.v7||gems23()<n)return false;s.v7.gems=(s.v7.gems||0)-n;return true}
function gain23(n){try{if(typeof gain==='function'){gain(n);return}}catch(e){}var s=S_();if(s)s.xp=(s.xp||0)+n}
function esc(s){try{if(W.__v15&&__v15.esc)return __v15.esc(s)}catch(e){}return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function fmt(n){return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',')}
/* ---------- save ---------- */
function en23(){
  var s=S_();if(!s)return null;
  if(!s.v7)s.v7={};
  var e=s.v7.en23;
  if(!e){
    e={pets:{},eggs:{fire:1,forest:1},hatch:null,mats:{},team:[null,null,null],
       claimed:{},affClaimed:{},created:Date.now()};
    s.v7.en23=e;save23();
  }
  if(!e.pets)e.pets={};if(!e.eggs)e.eggs={};if(!e.mats)e.mats={};
  if(!e.team||e.team.length!==3)e.team=[null,null,null];
  if(!e.claimed)e.claimed={};if(!e.affClaimed)e.affClaimed={};
  return e;
}
function spById(id){var L=D.species||[];for(var i=0;i<L.length;i++)if(L[i].id===id)return L[i];return null}
function eggById(id){var L=D.eggs||[];for(var i=0;i<L.length;i++)if(L[i].id===id)return L[i];return null}
function matById(id){var L=D.materials||[];for(var i=0;i<L.length;i++)if(L[i].id===id)return L[i];return null}
/* ---------- stats / XP / affection ---------- */
function statsOf(inst){
  var sp=spById(inst.sp);if(!sp)return{hp:0,atk:0,def:0,spd:0};
  var m=(D.stageMult||[1,1.6,2.4])[inst.st||0]||1,lv=inst.lv||1;
  function st(base,per){return Math.round((base+per*(lv-1))*m)}
  return{hp:st(sp.base.hp,sp.perLv.hp),atk:st(sp.base.atk,sp.perLv.atk),
         def:st(sp.base.def,sp.perLv.def),spd:st(sp.base.spd,sp.perLv.spd)};
}
function powerOf(inst){var t=statsOf(inst);return t.hp+t.atk*10+t.def*5+t.spd*2}
function xpNeed(lv){return 20*lv} /* Lv n -> n+1 costs 20n XP; total to Lv 30 = 8700 */
function stageName(inst){var sp=spById(inst.sp);return sp?sp.stages[inst.st||0].n:''}
function stageImg(inst){var sp=spById(inst.sp);if(!sp)return '';var _im=sp.stages[inst.st||0].img;return _im.indexOf('v18/')===0?('assets/pets/'+_im):('assets/pets/v15/'+_im)}
function skillUnlocks(inst){
  /* skill 1 at Lv 1, skill 2 at Lv 5, ultimate at stage 3 */
  var out=[];var sp=spById(inst.sp);if(!sp)return out;
  out.push(sp.skills.a.id);
  if((inst.lv||1)>=5)out.push(sp.skills.p.id);
  if((inst.st||0)>=2)out.push(sp.skills.u.id);
  return out;
}
function addPetXP(inst,n){
  if(!inst||n<=0)return{leveled:0};
  inst.xp=(inst.xp||0)+n;var leveled=0;
  var cap=(D.stageMaxLv||[10,20,30])[inst.st||0]||10;
  while((inst.lv||1)<cap&&(inst.xp||0)>=xpNeed(inst.lv||1)){
    inst.xp-=xpNeed(inst.lv||1);inst.lv=(inst.lv||1)+1;leveled++;
  }
  if((inst.lv||1)>=cap)inst.xp=Math.min(inst.xp||0,xpNeed(cap));
  inst.sk=skillUnlocks(inst);
  return{leveled:leveled};
}
function addAff(inst,n){
  if(!inst||n<=0)return[];
  inst.aff=Math.min(1500,(inst.aff||0)+n);
  var got=[],e=en23();if(!e)return got;
  (D.affectionRewards||[]).forEach(function(r){
    var k=inst.id+':'+r.aff;
    if((inst.aff||0)>=r.aff&&!e.affClaimed[k]){
      e.affClaimed[k]=1;addGems23(r.gems);
      if(r.egg)e.eggs[r.egg]=(e.eggs[r.egg]||0)+1;
      got.push(r);
    }
  });
  return got;
}
var _petSeq=0; /* instance id counter: guarantees unique ids even when two
  pets are created in the same millisecond (Date.now+random alone can collide) */
function newPet(spId){
  var sp=spById(spId);if(!sp)return null;
  var id='p'+Date.now().toString(36)+(_petSeq++).toString(36)+Math.floor(Math.random()*1e6).toString(36);
  var inst={id:id,sp:spId,st:0,lv:1,xp:0,aff:0,sk:[sp.skills.a.id],hatchedAt:Date.now()};
  return inst;
}
/* ---------- eggs / hatch ---------- */
function eggSpecies(eggId){
  return (D.species||[]).filter(function(sp){return sp.egg===eggId});
}
function rollSpecies(eggId){
  var ex=(D.eggExtra||{})[eggId];
  if(ex)for(var i=0;i<ex.length;i++)if(Math.random()<ex[i].rate)return ex[i].sp;
  var pool=eggSpecies(eggId);if(!pool.length)return null;
  var tot=0;pool.forEach(function(sp){tot+=sp.rate||0});
  var r=Math.random()*tot;
  for(var j=0;j<pool.length;j++){r-=pool[j].rate||0;if(r<=0)return pool[j].id}
  return pool[pool.length-1].id;
}
function hatchRemaining(){
  var e=en23();if(!e||!e.hatch)return -1;
  return Math.max(0,(e.hatch.endsAt||0)-Date.now());
}
function startHatch(eggId){
  var e=en23();if(!e)return{ok:false,msg:'Không tải được dữ liệu thú cưng.'};
  if(e.hatch)return{ok:false,msg:'Đang ấp một quả trứng rồi — chờ nở xong đã nhé.'};
  var eg=eggById(eggId);if(!eg)return{ok:false,msg:'Không tìm thấy loại trứng này.'};
  if((e.eggs[eggId]||0)<1)return{ok:false,msg:'Bạn không còn '+eg.n+'. Mua thêm ở Cửa hàng Pet nhé.'};
  e.eggs[eggId]--;var now=Date.now();
  e.hatch={egg:eggId,startedAt:now,endsAt:now+eg.hatchMin*60000};
  saveNow23();return{ok:true,msg:'Đã bắt đầu ấp '+eg.n+'! Trứng sẽ nở sau '+eg.hatchMin+' phút (học bài sẽ giúp ấp nhanh hơn).'};
}
var _claimLock=false;
function claimHatch(){
  var e=en23();if(!e)return{ok:false,msg:'Không tải được dữ liệu thú cưng.'};
  if(_claimLock)return{ok:false,msg:'Đang xử lý, chờ một chút…'};
  if(!e.hatch)return{ok:false,msg:'Không có trứng nào đang ấp.'};
  if(hatchRemaining()>0)return{ok:false,msg:'Trứng chưa nở — còn '+fmtHatch(hatchRemaining())+' nữa.'};
  _claimLock=true;
  try{
    var spId=rollSpecies(e.hatch.egg);
    var inst=newPet(spId);
    if(!inst)return{ok:false,msg:'Không nở được thú — thử lại sau nhé.'};
    e.pets[inst.id]=inst;e.hatch=null;
    saveNow23();
    return{ok:true,pet:inst,msg:'Trứng đã nở! Bạn nhận được '+stageName(inst)+' ('+spById(spId).n+')!'};
  }finally{_claimLock=false}
}
function speedHatch(){
  var e=en23();if(!e||!e.hatch)return{ok:false,msg:'Không có trứng nào đang ấp.'};
  var H=D.hatch||{};
  if(!spendGems23(H.speedGems||5))return{ok:false,msg:'Không đủ kim cương (cần '+(H.speedGems||5)+' 💎).'};
  e.hatch.endsAt=Math.max(Date.now(),(e.hatch.endsAt||0)-(H.speedMin||30)*60000);
  save23();return{ok:true,msg:'Đã tăng tốc ấp trứng -'+(H.speedMin||30)+' phút!'};
}
function instantHatch(){
  var e=en23();if(!e||!e.hatch)return{ok:false,msg:'Không có trứng nào đang ấp.'};
  var H=D.hatch||{};
  if(!spendGems23(H.instantGems||20))return{ok:false,msg:'Không đủ kim cương (cần '+(H.instantGems||20)+' 💎).'};
  e.hatch.endsAt=Date.now();save23();
  return claimHatch();
}
function fmtHatch(ms){
  if(ms<=0)return'0:00';
  var s=Math.ceil(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),ss=s%60;
  function p(n){return(n<10?'0':'')+n}
  return h>0?(h+':'+p(m)+':'+p(ss)):(m+':'+p(ss));
}
/* ---------- evolution ---------- */
function evoReq(inst){
  var sp=spById(inst.sp);if(!sp)return null;
  var st=inst.st||0;if(st>=2)return{max:true};
  var cost=(D.evoCost||[])[st];if(!cost)return null;
  var e=en23();
  var mats=[{id:'stone_'+sp.el,need:cost.stone},{id:'feather',need:cost.feather},{id:'fruit',need:cost.fruit}];
  var okLv=(inst.lv||1)>=(D.evoLv||[10,20])[st];
  var okMats=mats.every(function(m){return (e.mats[m.id]||0)>=m.need});
  var okCoins=coins23()>=cost.coins;
  return{max:false,next:st+1,nextName:sp.stages[st+1].n,lvNeed:(D.evoLv||[10,20])[st],
         okLv:okLv,mats:mats,okMats:okMats,coins:cost.coins,okCoins:okCoins,
         ok:okLv&&okMats&&okCoins};
}
var _evoLock=false;
function evolvePet(petId){
  var e=en23();if(!e)return{ok:false,msg:'Không tải được dữ liệu thú cưng.'};
  if(_evoLock)return{ok:false,msg:'Đang tiến hóa, chờ một chút…'};
  var inst=e.pets[petId];if(!inst)return{ok:false,msg:'Không tìm thấy thú cưng này.'};
  var req=evoReq(inst);
  if(!req||req.max)return{ok:false,msg:'Thú này đã ở hình thái tối đa.'};
  if(!req.ok){
    if(!req.okLv)return{ok:false,msg:'Cần đạt cấp '+req.lvNeed+' mới tiến hóa được (hiện tại Lv.'+(inst.lv||1)+').'};
    if(!req.okMats)return{ok:false,msg:'Chưa đủ nguyên liệu tiến hóa — xem chi tiết ở tab Tiến hóa.'};
    return{ok:false,msg:'Không đủ vàng (cần '+fmt(req.coins)+' XP).'};
  }
  _evoLock=true;
  try{
    req.mats.forEach(function(m){e.mats[m.id]=(e.mats[m.id]||0)-m.need});
    var s=S_();s.spent=(s.spent||0)+req.coins;
    inst.st=(inst.st||0)+1;inst.sk=skillUnlocks(inst);
    saveNow23();
    return{ok:true,pet:inst,msg:'Tiến hóa thành công! '+stageName(inst)+' đã xuất hiện — kỹ năng mới đã mở khóa!'};
  }finally{_evoLock=false}
}
/* ---------- feeding ---------- */
function feedPet(petId){
  var e=en23();if(!e)return{ok:false,msg:'Không tải được dữ liệu thú cưng.'};
  var inst=e.pets[petId];if(!inst)return{ok:false,msg:'Không tìm thấy thú cưng này.'};
  var F=D.feed||{coins:100,xp:25,aff:10};
  if(!spendCoins23(F.coins))return{ok:false,msg:'Không đủ vàng (cần '+fmt(F.coins)+' XP) để cho ăn.'};
  var lv=addPetXP(inst,F.xp);
  var rewards=addAff(inst,F.aff);
  save23();
  var msg='Đã cho '+stageName(inst)+' ăn (+'+F.xp+' XP, +'+F.aff+' thân thiết).';
  if(lv.leveled>0)msg+=' Lên cấp '+(inst.lv||1)+'!';
  if(rewards.length)msg+=' Nhận thưởng thân thiết: '+rewards.map(function(r){return r.d}).join('; ');
  return{ok:true,msg:msg};
}
/* ---------- team ---------- */
function teamPets(){
  var e=en23();if(!e)return[];
  return (e.team||[null,null,null]).map(function(id){return id?e.pets[id]||null:null});
}
function setTeamSlot(slot,petId){
  var e=en23();if(!e)return{ok:false,msg:'Không tải được dữ liệu thú cưng.'};
  if(slot<0||slot>2)return{ok:false,msg:'Vị trí không hợp lệ.'};
  if(petId&&!e.pets[petId])return{ok:false,msg:'Không tìm thấy thú cưng này.'};
  var t=e.team;
  if(petId){for(var i=0;i<3;i++)if(i!==slot&&t[i]===petId)t[i]=null} /* no duplicates */
  t[slot]=petId||null;
  save23();
  return{ok:true,msg:petId?('Đã xếp '+stageName(e.pets[petId])+' vào vị trí '+(slot+1)+'.'):'Đã bỏ thú khỏi vị trí '+(slot+1)+'.'};
}
function suggestTeam(){
  var e=en23();if(!e)return{ok:false,msg:'Không tải được dữ liệu thú cưng.'};
  var owned=Object.keys(e.pets).map(function(id){return e.pets[id]});
  if(!owned.length)return{ok:false,msg:'Bạn chưa có thú cưng nào — ấp trứng trước nhé!'};
  owned.sort(function(a,b){return powerOf(b)-powerOf(a)});
  var pick=[],usedEl={};
  owned.forEach(function(p){
    if(pick.length>=3)return;
    var sp=spById(p.sp);
    if(!usedEl[sp.el]){pick.push(p);usedEl[sp.el]=1}
  });
  owned.forEach(function(p){if(pick.length<3&&pick.indexOf(p)<0)pick.push(p)});
  e.team=[pick[0]?pick[0].id:null,pick[1]?pick[1].id:null,pick[2]?pick[2].id:null];
  save23();
  return{ok:true,msg:'Đã gợi ý đội hình: '+pick.map(function(p){return stageName(p)}).join(', ')+' (ưu tiên thú mạnh và khác hệ để kích hoạt Liên Kết Nguyên Tố).'};
}
function teamPower(){
  var t=teamPets(),tot={hp:0,atk:0,def:0,spd:0,power:0};
  t.forEach(function(p){if(!p)return;var s=statsOf(p);tot.hp+=s.hp;tot.atk+=s.atk;tot.def+=s.def;tot.spd+=s.spd;tot.power+=powerOf(p)});
  return tot;
}
/* ---------- battle math (shared by v18/v19) ---------- */
function teamBattle(){
  var team=teamPets().filter(Boolean);
  if(!team.length)return null;
  var dmg=0,shieldStart=0,drainRed=0,startEnergy=0,burn=0,storm=0,
      tide=0,holy=0,rebirth=false,wisdom=false,els={};
  team.forEach(function(p){
    var sp=spById(p.sp);if(!sp)return;
    dmg+=(D.stageDmg||[5,10,15])[p.st||0]||0;
    els[sp.el]=1;
    if((p.lv||1)>=5){
      var pv=sp.skills.p;
      if(pv.type==='burn')burn+=pv.val;
      else if(pv.type==='frost'||pv.type==='crystal')drainRed+=pv.val;
      else if(pv.type==='wisdom')wisdom=true;
      else if(pv.type==='moon'||pv.type==='honey'||pv.type==='grove')shieldStart+=pv.val;
      else if(pv.type==='tide')tide+=pv.val;
      else if(pv.type==='holy')holy+=pv.val;
      else if(pv.type==='rebirth')rebirth=true;
      else if(pv.type==='arcane')startEnergy+=pv.val;
      else if(pv.type==='storm')storm+=pv.val;
    }
  });
  if(Object.keys(els).length>=3)dmg+=10; /* Liên Kết Nguyên Tố */
  dmg=Math.min(40,dmg);
  var shieldMax=Math.round(team.reduce(function(a,p){return a+statsOf(p).hp},0)/5)+shieldStart;
  var leader=team[0],lsp=spById(leader.sp);
  var active=(leader.st||0)>=2?lsp.skills.u:lsp.skills.a;
  var activeVal=active.val+((active.type==='dmg'?2:1)*(leader.lv||1));
  return{
    team:team,leader:leader,active:active,activeVal:activeVal,
    dmgBonus:dmg,shieldMax:shieldMax,
    drain:Math.max(D.shieldDrainMin||30,(D.shieldDrain||60)-drainRed),
    startEnergy:startEnergy,burn:burn,storm:storm,tide:tide,holy:holy,
    rebirth:rebirth,wisdom:wisdom,elements:Object.keys(els)
  };
}
function battleStart(F){
  var tb=teamBattle();if(!tb)return null;
  F.pet={shield:tb.shieldMax,shieldMax:tb.shieldMax,energy:tb.startEnergy,
         dmgBonus:tb.dmgBonus,burn:tb.burn,storm:tb.storm,tide:tb.tide,holy:tb.holy,
         rebirth:tb.rebirth,rebirthUsed:false,wisdom:tb.wisdom,drain:tb.drain,
         team:tb.team,leader:tb.leader,active:tb.active,activeVal:tb.activeVal,elements:tb.elements};
  return F.pet;
}
/* Called on a CORRECT answer inside a fight (both EN and KO). Returns the
   extra damage the pet passives add (burn / storm), or 0. */
function onFightCorrect(F){
  var extra=0;
  if(F&&F.pet){
    F.pet.energy=Math.min(D.teamSkillMaxEnergy||10,(F.pet.energy||0)+1);
    if(F.pet.wisdom&&(F.combo||0)>0&&(F.combo||0)%3===0)F.pet.energy=Math.min(D.teamSkillMaxEnergy||10,F.pet.energy+1);
    extra+=(F.pet.burn||0);
    if((F.combo||0)>=3)extra+=(F.pet.storm||0);
  }
  onLearnCorrect();
  return extra;
}
/* Called on a WRONG answer inside a fight. Returns:
   'rebirth' (first heart loss ignored), 'shield' (shield absorbed the hit),
   'heart' (shield is gone — the fight loses a heart as normal). */
function onFightWrong(F){
  if(!F||!F.pet)return'heart';
  var P=F.pet;
  if(P.rebirth&&!P.rebirthUsed){P.rebirthUsed=true;return'rebirth'}
  if(P.shield>0){
    P.shield=Math.max(0,P.shield-P.drain);
    return'shield';
  }
  return'heart';
}
/* Called when the fight loses a heart (after onFightWrong returned 'heart').
   Tide/Holy passives restore some shield. */
function onHeartLost(F){
  if(!F||!F.pet)return;
  var P=F.pet,back=(P.tide||0)+(P.holy||0);
  if(back>0)P.shield=Math.min(P.shieldMax,P.shield+back);
}
/* Team skill button (costs energy). Returns {ok,msg,dmg} — dmg is dealt to
   the boss when the leader's active skill is a damage skill. */
function castTeamSkill(F){
  if(!F||!F.pet)return{ok:false,msg:'Không có đội hình thú cưng trong trận này.'};
  var P=F.pet,cost=D.teamSkillCost||6;
  if((P.energy||0)<cost)return{ok:false,msg:'Chưa đủ năng lượng (cần '+cost+', đang có '+(P.energy||0)+'). Trả lời đúng để tích năng lượng!'};
  P.energy-=cost;
  var msg='✨ '+P.active.n+'!';
  var dmg=0;
  if(P.active.type==='dmg'){dmg=P.activeVal;msg+=' Gây '+dmg+' sát thương cho boss.'}
  else{P.shield=Math.min(P.shieldMax,P.shield+P.activeVal);msg+=' Hồi '+P.activeVal+' khiên đội.'}
  return{ok:true,msg:msg,dmg:dmg};
}
/* ---------- learning hook: one correct answer anywhere (EN modes via
   mark15, fights via onFightCorrect) ----------
   Team pets gain XP + affection; the active hatch speeds up. Never throws. */
function onLearnCorrect(){
  try{
    var e=en23();if(!e)return;
    var changed=false;
    teamPets().forEach(function(p){
      if(!p)return;
      addPetXP(p,D.xpPerCorrect||2);
      addAff(p,D.affPerCorrect||1);
      changed=true;
    });
    if(e.hatch){
      e.hatch.endsAt=Math.max(Date.now(),(e.hatch.endsAt||0)-(D.hatch.learnSecPerCorrect||30)*1000);
      changed=true;
    }
    if(changed)save23();
  }catch(err){}
}
/* Learning XP bonus from the team leader (stage 1: +5%, 2: +10%, 3: +20%).
   Applied by the caller at mode-finish / boss-reward sites only. */
function learnXpBonus(){
  var t=teamPets();var leader=t[0];
  if(!leader)return 0;
  return [0.05,0.10,0.20][leader.st||0]||0;
}
function learnXpBonusText(){
  var b=learnXpBonus();
  return b>0?('Thú cưng hỗ trợ: +'+Math.round(b*100)+'% XP học tập'):'';
}
/* ---------- UI: Pet Hub ---------- */
var ST={tab:'pets',sel:null,evoSel:null,q:'',filter:'all',collFilter:'all',slot:0};
var _timer=null;
function toast23(msg){
  try{if(W.__v15&&__v15.pop15){__v15.pop15(msg);return}}catch(e){}
  var t=document.getElementById('v23toast');
  if(!t){t=document.createElement('div');t.id='v23toast';t.className='v23toast';document.body.appendChild(t)}
  t.textContent=msg;t.classList.add('on');
  clearTimeout(t._t);t._t=setTimeout(function(){t.classList.remove('on')},2600);
}
function petImgHTML(inst,cls){
  var sp=spById(inst.sp);if(!sp)return'';
  var el=(D.elements||{})[sp.el]||{};
  return '<span class="v23petimg '+(cls||'')+'" style="--elc:'+(el.color||'#999')+'">'
    +'<img src="'+stageImg(inst)+'" alt="'+esc(stageName(inst))+'" loading="lazy" onerror="this.style.display=\'none\';this.parentNode.classList.add(\'v23imgfail\')">'
    +'<span class="v23petfb">'+esc((stageName(inst)||'?').charAt(0))+'</span></span>';
}
function eggImgHTML(egg,cls){
  return '<span class="v23petimg '+(cls||'')+'"><img src="'+(egg.img.indexOf('v18/')===0?('assets/pets/'+egg.img):('assets/pets/v15/eggs/'+egg.img))+'" alt="'+esc(egg.n)+'" loading="lazy" onerror="this.style.display=\'none\';this.parentNode.classList.add(\'v23imgfail\')"><span class="v23petfb">🥚</span></span>';
}
function starsHTML(rar){
  var r=(D.rarity||{})[rar]||{stars:2};
  var s='';for(var i=0;i<5;i++)s+=i<r.stars?'★':'☆';
  return '<span class="v23stars" style="color:'+(r.color||'#999')+'">'+s+'</span>';
}
function openHub(tab){
  ST.tab=tab||'pets';
  var old=document.getElementById('v23hub');if(old)old.remove();
  var h=document.createElement('div');h.id='v23hub';h.className='v23hub';
  h.innerHTML='<div class="v23head"><div class="v23title">🐾 Hệ Thống Thú Cưng</div>'
    +'<div class="v23wallet"><span class="v23chip">🪙 '+fmt(coins23())+' XP</span>'
    +'<span class="v23chip">💎 '+fmt(gems23())+'</span>'
    +'<button class="v23x" onclick="__v23.closeHub()" aria-label="Đóng">✕</button></div></div>'
    +'<div class="v23tabs">'
    +[['pets','Thú cưng'],['hatch','Ấp trứng'],['evo','Tiến hóa'],['team','Đội hình'],['skills','Kỹ năng'],['collection','Sưu tập'],['shop','Cửa hàng Pet']]
      .map(function(t){return '<button class="v23tab'+(ST.tab===t[0]?' on':'')+'" onclick="__v23.openHub(\''+t[0]+'\')">'+t[1]+'</button>'}).join('')
    +'</div><div class="v23body" id="v23body"></div>';
  document.body.appendChild(h);
  renderBody();
  startTimer();
}
function closeHub(){
  var h=document.getElementById('v23hub');if(h)h.remove();
  if(_timer){clearInterval(_timer);_timer=null}
}
function renderBody(){
  var b=document.getElementById('v23body');if(!b)return;
  var fn={pets:tabPets,hatch:tabHatch,evo:tabEvo,team:tabTeam,skills:tabSkills,collection:tabCollection,shop:tabShop}[ST.tab]||tabPets;
  b.innerHTML=fn();
  var w=document.querySelector('#v23hub .v23wallet');
  if(w)w.innerHTML='<span class="v23chip">🪙 '+fmt(coins23())+' XP</span><span class="v23chip">💎 '+fmt(gems23())+'</span><button class="v23x" onclick="__v23.closeHub()" aria-label="Đóng">✕</button>';
}
function rerender(){renderBody()}
function startTimer(){
  if(_timer)clearInterval(_timer);
  _timer=setInterval(function(){
    var t=document.getElementById('v23timer');if(!t)return;
    var e=en23();if(!e||!e.hatch){rerender();return}
    var rem=hatchRemaining();
    t.textContent=fmtHatch(rem);
    var bar=document.getElementById('v23hatchbar');
    if(bar){var eg=eggById(e.hatch.egg);var tot=eg?eg.hatchMin*60000:1;
      bar.style.width=Math.min(100,Math.round((1-rem/tot)*100))+'%'}
    if(rem<=0)rerender();
  },1000);
}
function goBoss(){
  closeHub();
  try{if(W.__v19&&__v19.openMap){__v19.openMap();return}}catch(e){}
  try{if(W.__v15&&__v15.openHub){__v15.openHub('bosses');return}}catch(e){}
}
function ownedList(){
  var e=en23();if(!e)return[];
  return Object.keys(e.pets).map(function(id){return e.pets[id]});
}
function pickSel(){
  var list=ownedList();
  if(ST.sel&&list.some(function(p){return p.id===ST.sel}))return ST.sel;
  return list.length?list[0].id:null;
}
/* ----- tab: pets ----- */
function tabPets(){
  var list=ownedList();
  var q=(ST.q||'').toLowerCase(),f=ST.filter;
  var shown=list.filter(function(p){
    var sp=spById(p.sp);if(!sp)return false;
    if(f!=='all'&&sp.el!==f)return false;
    if(q&&stageName(p).toLowerCase().indexOf(q)<0&&sp.n.toLowerCase().indexOf(q)<0)return false;
    return true;
  });
  var selId=pickSel();var sel=selId?(en23().pets[selId]||null):null;
  var h='<div class="v23pets"><div class="v23side"><div class="v23filter">'
    +'<select onchange="__v23.setFilter(this.value)">'
    +'<option value="all">Tất cả hệ</option>'
    +Object.keys(D.elements||{}).map(function(k){return '<option value="'+k+'"'+(f===k?' selected':'')+'>'+D.elements[k].icon+' '+D.elements[k].n+'</option>'}).join('')
    +'</select>'
    +'<input placeholder="Tìm thú cưng…" value="'+esc(ST.q||'')+'" oninput="__v23.setSearch(this.value)">'
    +'</div><div class="v23grid">'
    +(shown.length?shown.map(function(p){
      var sp=spById(p.sp);
      return '<button class="v23cell'+(selId===p.id?' on':'')+'" onclick="__v23.selectPet(\''+p.id+'\')">'
        +petImgHTML(p,'v23cellimg')
        +'<span class="v23celln">'+esc(stageName(p))+'</span>'
        +'<span class="v23cellm">'+D.elements[sp.el].icon+' Lv.'+(p.lv||1)+'</span></button>';
    }).join(''):'<p class="v23empty">Chưa có thú cưng nào khớp bộ lọc.</p>')
    +'</div><p class="v23count">Bộ sưu tập thú cưng ('+list.length+' thú)</p></div>';
  if(!sel){
    h+='<div class="v23detail v23emptybox"><h3>Chưa có thú cưng nào</h3>'
      +'<p>Ấp trứng để nhận thú cưng đầu tiên của bạn!</p>'
      +'<button class="v23btn pri" onclick="__v23.openHub(\'hatch\')">🥚 Đi ấp trứng</button></div></div>';
    return h;
  }
  var sp=spById(sel.sp),t=statsOf(sel);
  var need=xpNeed(sel.lv||1),cap=(D.stageMaxLv||[10,20,30])[sel.st||0]||10;
  var inTeam=teamPets().some(function(p){return p&&p.id===sel.id});
  h+='<div class="v23detail"><div class="v23dhead">'+petImgHTML(sel,'v23big')
    +'<div><h3>'+esc(stageName(sel))+'</h3><div>'+starsHTML(sp.rar)+' <span class="v23rar">'+(D.rarity[sp.rar]||{}).n+'</span></div>'
    +'<div class="v23lv">Lv.'+(sel.lv||1)+'/'+cap+' · '+D.elements[sp.el].icon+' '+D.elements[sp.el].n+'</div></div></div>'
    +'<div class="v23bar"><span>XP</span><div class="v23bartrack"><div class="v23barfill" style="width:'+Math.min(100,Math.round(((sel.xp||0)/need)*100))+'%"></div></div><span>'+(sel.xp||0)+'/'+need+'</span></div>'
    +'<div class="v23bar"><span>❤️ Thân thiết</span><div class="v23bartrack"><div class="v23barfill aff" style="width:'+Math.min(100,Math.round(((sel.aff||0)/1500)*100))+'%"></div></div><span>'+(sel.aff||0)+'/1,500</span></div>'
    +'<div class="v23stats"><span>❤️ HP <b>'+t.hp+'</b></span><span>⚔️ Công <b>'+t.atk+'</b></span><span>🛡️ Thủ <b>'+t.def+'</b></span><span>⚡ Tốc <b>'+t.spd+'</b></span></div>'
    +'<h4>Kỹ năng</h4><div class="v23skills">'
    +[['a','Kỹ năng chính'],['p','Bị động (mở ở Lv.5)'],['u','Tuyệt kỹ (hình thái 3)']].map(function(k){
      var sk=sp.skills[k[0]],un=(sel.sk||[]).indexOf(sk.id)>=0;
      return '<div class="v23skill'+(un?'':' locked')+'"><b>'+esc(sk.n)+'</b><span>'+esc(sk.d)+'</span><i>'+(un?'Đã mở':k[1])+'</i></div>';
    }).join('')+'</div>'
    +'<h4>Tiến hóa (3 giai đoạn)</h4><div class="v23evochain">'
    +sp.stages.map(function(sg,i){
      return '<span class="v23stage'+(i===(sel.st||0)?' cur':'')+(i<(sel.st||0)?' done':'')+'">'+esc(sg.n)+'</span>'+(i<2?'<span class="v23arr">➜</span>':'');
    }).join('')+'</div>'
    +'<div class="v23btns">'
    +'<button class="v23btn ok" onclick="__v23.doFeed(\''+sel.id+'\')">🍖 Cho ăn (100 XP)</button>'
    +'<button class="v23btn evo" onclick="__v23.openHub(\'evo\');__v23.selectEvo(\''+sel.id+'\')">🦋 Tiến hóa</button>'
    +'<button class="v23btn" onclick="__v23.quickTeam(\''+sel.id+'\')">'+(inTeam?'✓ Đã trong đội':'⚔️ Thêm vào đội')+'</button>'
    +'<button class="v23btn gold" onclick="__v23.goBoss()">⚔️ Ra trận</button>'
    +'</div><p class="v23note">Cho ăn: +25 XP, +10 thân thiết (trả bằng XP). Trả lời đúng khi học hoặc đánh boss cũng cho thú trong đội +2 XP, +1 thân thiết và giúp trứng ấp nhanh hơn 30 giây.</p>'
    +'</div></div>';
  return h;
}
/* ----- tab: hatch ----- */
function tabHatch(){
  var e=en23();if(!e)return'<p>Không tải được dữ liệu thú cưng.</p>';
  var h='<div class="v23hatch">';
  if(e.hatch){
    var eg=eggById(e.hatch.egg),rem=hatchRemaining();
    var tot=eg?eg.hatchMin*60000:1;
    h+='<div class="v23card"><h3>🥚 Đang ấp: '+esc(eg?eg.n:'')+'</h3><div class="v23hatchmain">'
      +eggImgHTML(eg,'v23big')
      +'<div><div class="v23timer" id="v23timer">'+fmtHatch(rem)+'</div>'
      +'<div class="v23bartrack"><div class="v23barfill" id="v23hatchbar" style="width:'+Math.min(100,Math.round((1-rem/tot)*100))+'%"></div></div>'
      +'<p class="v23note">Tổng thời gian: '+eg.hatchMin+' phút · Thời gian ấp tính bằng đồng hồ thật — đóng game rồi mở lại vẫn đúng. Học bài (trả lời đúng) giúp ấp nhanh hơn 30 giây mỗi câu.</p></div></div>'
      +(rem<=0
        ?'<button class="v23btn gold big" onclick="__v23.doClaim()">✨ Nở trứng — Nhận thú mới!</button>'
        :'<div class="v23btns"><button class="v23btn" onclick="__v23.doSpeed()">⏩ Tăng tốc -30 phút (5 💎)</button>'
          +'<button class="v23btn evo" onclick="__v23.doInstant()">⚡ Ấp ngay (20 💎)</button></div>')
      +'</div>';
  }else{
    h+='<div class="v23card"><h3>🥚 Chưa có trứng nào đang ấp</h3><p>Chọn một quả trứng bên dưới để bắt đầu ấp. Mỗi lần chỉ ấp được một quả.</p></div>';
  }
  h+='<h3>Chọn trứng để ấp</h3><div class="v23eggs">'
    +(D.eggs||[]).map(function(eg){
      var n=e.eggs[eg.id]||0;
      var pool=eggSpecies(eg.id).map(function(sp){return sp.n+' ('+Math.round(sp.rate*100)+'%)'}).join(', ');
      return '<div class="v23eggcard">'+eggImgHTML(eg,'v23eggimg')
        +'<b>'+esc(eg.n)+'</b><span>×'+n+' đang có</span>'
        +'<span class="v23note">Ấp '+eg.hatchMin+' phút · '+esc(pool)+'</span>'
        +'<button class="v23btn pri" '+(n<1||e.hatch?'disabled':'')+' onclick="__v23.doStartHatch(\''+eg.id+'\')">'+(e.hatch?'Đang ấp…':(n<1?'Hết trứng':'Bắt đầu ấp'))+'</button></div>';
    }).join('')+'</div></div>';
  return h;
}
/* ----- tab: evolution ----- */
function tabEvo(){
  var list=ownedList();
  var selId=ST.evoSel&&list.some(function(p){return p.id===ST.evoSel})?ST.evoSel:(list.length?list[0].id:null);
  var h='<div class="v23evo"><div class="v23side"><h3>Danh sách thú cưng</h3><div class="v23list">'
    +(list.length?list.map(function(p){
      return '<button class="v23row'+(selId===p.id?' on':'')+'" onclick="__v23.selectEvo(\''+p.id+'\')">'
        +petImgHTML(p,'v23rowimg')+'<span>'+esc(stageName(p))+'<i>Lv.'+(p.lv||1)+' · '+(D.elements[spById(p.sp).el]||{}).n+'</i></span></button>';
    }).join(''):'<p class="v23empty">Chưa có thú cưng nào — ấp trứng trước nhé!</p>')
    +'</div></div>';
  if(!selId){h+='<div class="v23detail v23emptybox"><p>Chọn một thú cưng để xem tiến hóa.</p></div></div>';return h}
  var e=en23(),sel=e.pets[selId],sp=spById(sel.sp);
  var req=evoReq(sel);
  var cur=statsOf(sel);
  var nextT=null;
  if(req&&!req.max){var fake={sp:sel.sp,st:sel.st+1,lv:sel.lv||1};nextT=statsOf(fake)}
  h+='<div class="v23detail"><h3>🦋 Tiến hóa — '+esc(stageName(sel))+'</h3>'
    +'<div class="v23evochain big">'
    +sp.stages.map(function(sg,i){
      return '<span class="v23stage'+(i===(sel.st||0)?' cur':'')+(i<(sel.st||0)?' done':'')+'">'+esc(sg.n)+'</span>'+(i<2?'<span class="v23arr">➜</span>':'');
    }).join('')+'</div>';
  if(!req||req.max){
    h+='<p class="v23ok">🌟 Thú này đã ở hình thái tối đa — '+esc(stageName(sel))+'!</p>'
      +'<p class="v23note">Tuyệt kỹ '+esc(sp.skills.u.n)+' đã mở. Tiếp tục cho ăn và chiến đấu để thú mạnh hơn.</p>';
  }else{
    h+='<table class="v23cmp"><tr><th>Chỉ số</th><th>Trước ('+esc(stageName(sel))+')</th><th>Sau ('+esc(req.nextName)+')</th></tr>'
      +[['HP',cur.hp,nextT.hp],['Công',cur.atk,nextT.atk],['Thủ',cur.def,nextT.def],['Tốc độ',cur.spd,nextT.spd]]
        .map(function(r){return '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td><b>'+r[2]+'</b></td></tr>'}).join('')
      +'</table>'
      +'<h4>Kỹ năng mở khóa</h4><p>'+esc(sp.skills.u.n)+' — '+esc(sp.skills.u.d)+'</p>'
      +'<h4>Nguyên liệu tiến hóa</h4><div class="v23mats">'
      +req.mats.map(function(m){
        var mat=matById(m.id),have=e.mats[m.id]||0;
        return '<div class="v23mat'+(have>=m.need?' ok':' no')+'"><b>'+esc(mat?mat.n:m.id)+'</b><span>'+have+'/'+m.need+'</span><i>'+(have>=m.need?'✓ Đủ':'✗ Thiếu')+'</i></div>';
      }).join('')
      +'<div class="v23mat'+(req.okCoins?' ok':' no')+'"><b>🪙 Vàng (XP)</b><span>'+fmt(coins23())+'/'+fmt(req.coins)+'</span><i>'+(req.okCoins?'✓ Đủ':'✗ Thiếu')+'</i></div>'
      +'<div class="v23mat'+(req.okLv?' ok':' no')+'"><b>⭐ Cấp yêu cầu</b><span>Lv.'+(sel.lv||1)+'/'+req.lvNeed+'</span><i>'+(req.okLv?'✓ Đủ':'✗ Chưa đủ')+'</i></div>'
      +'</div>'
      +'<button class="v23btn gold big" '+(req.ok?'':'disabled')+' onclick="__v23.doEvolve(\''+sel.id+'\')">🦋 TIẾN HÓA</button>'
      +(!req.ok?'<p class="v23note">Chưa đủ điều kiện. Nguyên liệu mua ở Cửa hàng Pet hoặc nhận khi thắng boss (đá nguyên tố theo hệ boss).</p>':'');
  }
  h+='</div></div>';
  return h;
}
/* ----- tab: team ----- */
function teamSkillRows(){
  var tb=teamBattle();
  if(!tb)return'<p class="v23empty">Chưa có đội hình — xếp ít nhất 1 thú vào đội để nhận hiệu ứng chiến đấu.</p>';
  var rows=[];
  rows.push({n:'Liên Kết Nguyên Tố',on:tb.elements.length>=3,
    d:tb.elements.length>=3?'Đội có 3 hệ khác nhau: +10% sát thương (đã tính trong thưởng đội).':'Cần 3 thú khác hệ để kích hoạt (+10% sát thương).'});
  rows.push({n:'Lá Chắn Đồng Đội',on:tb.shieldMax>0,
    d:'Khiên đội '+fmt(tb.shieldMax)+' — hấp thụ đòn phản công của boss trước khi mất tim (mỗi đòn vỡ '+tb.drain+' khiên).'});
  var heal=tb.team.some(function(p){return (p.lv||1)>=5&&['tide','holy'].indexOf(spById(p.sp).skills.p.type)>=0});
  rows.push({n:'Hồi Phục Đồng Hành',on:heal,
    d:heal?'Khi mất một tim, khiên đội hồi lại một phần (kỹ năng Thủy Triều / Thánh Quang).':'Cần thú có kỹ năng Thủy Triều hoặc Thánh Quang (mở ở Lv.5).'});
  rows.push({n:'Bộ Ba Nguyên Tố — Kỹ năng phối hợp',on:(tb.energy===undefined||true),
    d:'Nút kỹ năng trong trận dùng tuyệt kỹ của thú Chủ lực: '+esc(tb.active.n)+' ('+esc(tb.active.d)+'). Tốn '+(D.teamSkillCost||6)+' năng lượng — trả lời đúng để tích năng lượng.'});
  return rows.map(function(r){
    return '<div class="v23skill'+(r.on?'':' locked')+'"><b>'+esc(r.n)+'</b><span>'+esc(r.d)+'</span><i>'+(r.on?'Đang kích hoạt':'Chưa kích hoạt')+'</i></div>';
  }).join('');
}
function tabTeam(){
  var e=en23();if(!e)return'<p>Không tải được dữ liệu thú cưng.</p>';
  var team=teamPets(),tot=teamPower(),tb=teamBattle();
  var h='<div class="v23team"><div class="v23side"><h3>Danh sách thú cưng</h3><p class="v23note">Bấm vào một thú, rồi bấm vào vị trí muốn xếp. Bấm lại vị trí để bỏ thú ra.</p><div class="v23grid">'
    +(ownedList().length?ownedList().map(function(p){
      var sp=spById(p.sp);
      return '<button class="v23cell" onclick="__v23.placePet(\''+p.id+'\')">'
        +petImgHTML(p,'v23cellimg')
        +'<span class="v23celln">'+esc(stageName(p))+'</span>'
        +'<span class="v23cellm">'+D.elements[sp.el].icon+' Lv.'+(p.lv||1)+'</span></button>';
    }).join(''):'<p class="v23empty">Chưa có thú cưng nào — ấp trứng trước nhé!</p>')
    +'</div></div>'
    +'<div class="v23detail"><h3>⚔️ Đội hình thú cưng</h3><p class="v23note">Chọn 3 thú cùng đồng hành ra trận! Thú trong đội nhận XP khi bạn trả lời đúng.</p>'
    +'<div class="v23slots">'
    +['Vị trí 1 · Chủ lực','Vị trí 2 · Hỗ trợ','Vị trí 3 · Phòng thủ'].map(function(label,i){
      var p=team[i];
      return '<button class="v23slot'+(ST.slot===i?' on':'')+'" onclick="__v23.pickSlot('+i+')">'
        +(p?petImgHTML(p,'v23slotimg')+'<b>'+esc(stageName(p))+'</b><span>Lv.'+(p.lv||1)+' · '+(D.elements[spById(p.sp).el]||{}).n+'</span>'
           :'<span class="v23slotempty">＋</span><b>'+label+'</b><span>Trống — bấm để chọn</span>')
        +'</button>';
    }).join('')+'</div>'
    +'<div class="v23stats"><span>⚔️ Tổng lực chiến <b>'+fmt(tot.power)+'</b></span><span>❤️ HP đội <b>'+tot.hp+'</b></span><span>⚔️ Công <b>'+tot.atk+'</b></span><span>🛡️ Thủ <b>'+tot.def+'</b></span><span>⚡ Tốc <b>'+tot.spd+'</b></span></div>'
    +(tb?'<div class="v23stats"><span>💥 Thưởng sát thương <b>+'+tb.dmgBonus+'%</b></span><span>🛡️ Khiên đội <b>'+fmt(tb.shieldMax)+'</b></span><span>⚡ Năng lượng khởi đầu <b>'+tb.startEnergy+'</b></span></div>':'')
    +'<h4>Kỹ năng phối hợp đội hình</h4><div class="v23skills">'+teamSkillRows()+'</div>'
    +'<div class="v23btns"><button class="v23btn" onclick="__v23.doSuggest()">✨ Gợi ý đội hình</button>'
    +'<button class="v23btn ok" onclick="__v23.doSaveTeam()">✔ Lưu đội hình</button>'
    +'<button class="v23btn gold" onclick="__v23.goBoss()">⚔️ Ra trận ngay</button></div>'
    +'</div></div>';
  return h;
}
/* ----- tab: skills ----- */
function tabSkills(){
  var tb=teamBattle();
  var h='<div class="v23skillsTab">';
  if(tb){
    h+='<h3>Kỹ năng của đội hiện tại</h3><div class="v23skills">'
      +'<div class="v23skill"><b>'+esc(tb.active.n)+' (Chủ lực: '+esc(stageName(tb.leader))+')</b><span>'+esc(tb.active.d)+' — hiệu lực '+tb.activeVal+'.</span><i>Kỹ năng phối hợp trong trận · tốn '+(D.teamSkillCost||6)+' năng lượng</i></div>'
      +tb.team.filter(function(p){return (p.lv||1)>=5}).map(function(p){
        var sk=spById(p.sp).skills.p;
        return '<div class="v23skill"><b>'+esc(sk.n)+' ('+esc(stageName(p))+')</b><span>'+esc(sk.d)+'</span><i>Bị động trong trận</i></div>';
      }).join('')
      +'</div>';
  }else{
    h+='<p class="v23empty">Chưa có đội hình — xếp thú vào đội để xem kỹ năng chiến đấu.</p>';
  }
  h+='<h3>Bách khoa kỹ năng (12 loài × 3 kỹ năng)</h3><div class="v23skills">'
    +(D.species||[]).map(function(sp){
      return '<div class="v23skill"><b>'+esc(sp.n)+' — '+esc(sp.skills.a.n)+'</b><span>'+esc(sp.skills.a.d)+' Mở từ Lv.1.</span><i>Kỹ năng chính</i></div>'
        +'<div class="v23skill"><b>'+esc(sp.n)+' — '+esc(sp.skills.p.n)+'</b><span>'+esc(sp.skills.p.d)+' Mở ở Lv.5.</span><i>Bị động</i></div>'
        +'<div class="v23skill"><b>'+esc(sp.n)+' — '+esc(sp.skills.u.n)+'</b><span>'+esc(sp.skills.u.d)+' Mở ở hình thái 3.</span><i>Tuyệt kỹ</i></div>';
    }).join('')+'</div></div>';
  return h;
}
/* ----- tab: collection ----- */
function tabCollection(){
  var e=en23();if(!e)return'<p>Không tải được dữ liệu thú cưng.</p>';
  var ownedForms={};
  ownedList().forEach(function(p){ownedForms[p.sp+'_'+(p.st||0)]=p});
  var total=36,got=Object.keys(ownedForms).length;
  var f=ST.collFilter;
  var h='<div class="v23coll"><div class="v23collhead"><h3>🏆 Bộ Sưu Tập Boss — Thú Cưng ('+got+'/'+total+')</h3>'
    +'<div class="v23bartrack"><div class="v23barfill" style="width:'+Math.round(got/total*100)+'%"></div></div>'
    +'<p class="v23note">Hoàn thành bộ sưu tập để nhận danh hiệu đặc biệt.</p></div>'
    +'<div class="v23rewards"><h4>Phần thưởng sưu tập</h4>'
    +(D.collectionRewards||[]).map(function(r,i){
      var claimed=!!e.claimed['coll'+i];
      return '<div class="v23reward"><span>'+esc(r.d)+'</span>'
        +'<button class="v23btn sm" '+((got>=r.forms&&!claimed)?'':'disabled')+' onclick="__v23.claimCollection('+i+')">'
        +(claimed?'Đã nhận':(got>=r.forms?'Nhận thưởng':'Cần '+r.forms+' hình thái'))+'</button></div>';
    }).join('')+'</div>'
    +'<div class="v23filter"><select onchange="__v23.setCollFilter(this.value)">'
    +'<option value="all">Tất cả</option><option value="owned"'+(f==='owned'?' selected':'')+'>Đã sở hữu</option>'
    +Object.keys(D.elements||{}).map(function(k){return '<option value="'+k+'"'+(f===k?' selected':'')+'>'+D.elements[k].icon+' '+D.elements[k].n+'</option>'}).join('')
    +'</select></div><div class="v23grid big">'
    +(D.species||[]).map(function(sp){
      return [0,1,2].map(function(st){
        if(f==='owned'&&!ownedForms[sp.id+'_'+st])return'';
        if(f!=='all'&&f!=='owned'&&sp.el!==f)return'';
        var inst=ownedForms[sp.id+'_'+st];
        var fake={sp:sp.id,st:st,lv:1};
        return '<div class="v23cell'+(inst?'':' locked')+'">'
          +petImgHTML(fake,'v23cellimg')
          +'<span class="v23celln">'+esc(sp.stages[st].n)+'</span>'
          +'<span class="v23cellm">'+(inst?('Lv.'+(inst.lv||1)+' · Đã sở hữu'):'🔒 Chưa sở hữu')+'</span></div>';
      }).join('');
    }).join('')+'</div></div>';
  return h;
}
function claimCollection(i){
  var e=en23();if(!e)return{ok:false,msg:'Không tải được dữ liệu thú cưng.'};
  var r=(D.collectionRewards||[])[i];if(!r)return{ok:false,msg:'Không tìm thấy mốc thưởng.'};
  if(e.claimed['coll'+i])return{ok:false,msg:'Đã nhận thưởng này rồi.'};
  var ownedForms={};
  ownedList().forEach(function(p){ownedForms[p.sp+'_'+(p.st||0)]=1});
  if(Object.keys(ownedForms).length<r.forms)return{ok:false,msg:'Chưa đủ '+r.forms+' hình thái.'};
  e.claimed['coll'+i]=1;
  if(r.gems)addGems23(r.gems);
  if(r.mats)Object.keys(r.mats).forEach(function(k){e.mats[k]=(e.mats[k]||0)+r.mats[k]});
  if(r.egg)e.eggs[r.egg]=(e.eggs[r.egg]||0)+1;
  if(r.title){
    var s=S_();
    if(s&&s.v7){if(!s.v7.en19)s.v7.en19={};if(!s.v7.en19.titles)s.v7.en19.titles=[];if(s.v7.en19.titles.indexOf(r.title)<0)s.v7.en19.titles.push(r.title)}
  }
  saveNow23();
  return{ok:true,msg:'Đã nhận thưởng sưu tập: '+r.d};
}
/* ----- tab: shop ----- */
function tabShop(){
  var e=en23();if(!e)return'<p>Không tải được dữ liệu thú cưng.</p>';
  var h='<div class="v23shop"><p class="v23note">Trả bằng XP (vàng chung của game). Mua trứng về ấp, mua nguyên liệu để tiến hóa thú.</p>'
    +'<h3>🥚 Trứng thú cưng</h3><div class="v23eggs">'
    +(D.eggs||[]).map(function(eg){
      var n=e.eggs[eg.id]||0,can=coins23()>=eg.price;
      return '<div class="v23eggcard">'+eggImgHTML(eg,'v23eggimg')
        +'<b>'+esc(eg.n)+'</b><span>Đang có ×'+n+'</span>'
        +'<span class="v23note">'+esc(eg.d)+'</span>'
        +'<button class="v23btn pri" '+(can?'':'disabled')+' onclick="__v23.buyEgg(\''+eg.id+'\')">Mua · '+fmt(eg.price)+' XP</button></div>';
    }).join('')+'</div>'
    +'<h3>💎 Nguyên liệu tiến hóa</h3><div class="v23eggs">'
    +(D.materials||[]).map(function(m){
      var n=e.mats[m.id]||0,can=coins23()>=m.price;
      return '<div class="v23eggcard"><div class="v23matico">'+(m.el?(D.elements[m.el]||{}).icon||'💎':'💎')+'</div>'
        +'<b>'+esc(m.n)+'</b><span>Đang có ×'+n+'</span>'
        +'<span class="v23note">'+esc(m.d)+'</span>'
        +'<button class="v23btn pri" '+(can?'':'disabled')+' onclick="__v23.buyMat(\''+m.id+'\')">Mua · '+fmt(m.price)+' XP</button></div>';
    }).join('')+'</div></div>';
  return h;
}
function buyEgg(eggId){
  var e=en23();if(!e)return{ok:false,msg:'Không tải được dữ liệu thú cưng.'};
  var eg=eggById(eggId);if(!eg)return{ok:false,msg:'Không tìm thấy loại trứng này.'};
  if(!spendCoins23(eg.price))return{ok:false,msg:'Không đủ vàng (cần '+fmt(eg.price)+' XP). Học bài để kiếm thêm XP nhé!'};
  e.eggs[eggId]=(e.eggs[eggId]||0)+1;save23();
  return{ok:true,msg:'Đã mua 1 '+eg.n+'! Sang tab Ấp trứng để bắt đầu ấp.'};
}
function buyMat(matId){
  var e=en23();if(!e)return{ok:false,msg:'Không tải được dữ liệu thú cưng.'};
  var m=matById(matId);if(!m)return{ok:false,msg:'Không tìm thấy nguyên liệu này.'};
  if(!spendCoins23(m.price))return{ok:false,msg:'Không đủ vàng (cần '+fmt(m.price)+' XP).'};
  e.mats[matId]=(e.mats[matId]||0)+1;save23();
  return{ok:true,msg:'Đã mua 1 '+m.n+'.'};
}
/* ---------- battle bar (injected into v18/v19 fights) ---------- */
function battleBarHTML(F){
  if(!F||!F.pet)return'';
  _fightF=F; /* the team-skill button casts on this fight */
  var P=F.pet,cost=D.teamSkillCost||6;
  var pct=Math.max(0,Math.round(P.shield/P.shieldMax*100));
  return '<div class="v23bar-fight"><div class="v23bf-pets">'
    +P.team.map(function(p){
      return '<span class="v23bf-pet" title="'+esc(stageName(p))+' Lv.'+(p.lv||1)+'">'+petImgHTML(p,'v23bfimg')+'<i>Lv.'+(p.lv||1)+'</i></span>';
    }).join('')
    +'</div><div class="v23bf-mid">'
    +'<div class="v23bf-row"><span>🛡️ Khiên đội</span><div class="v23bartrack"><div class="v23barfill" style="width:'+pct+'%"></div></div><span>'+P.shield+'/'+P.shieldMax+'</span></div>'
    +'<div class="v23bf-row"><span>⚡ Năng lượng</span><div class="v23bartrack"><div class="v23barfill en" style="width:'+Math.round(P.energy/(D.teamSkillMaxEnergy||10)*100)+'%"></div></div><span>'+P.energy+'/'+(D.teamSkillMaxEnergy||10)+'</span></div>'
    +'<div class="v23bf-note">Thú cưng hỗ trợ: +'+P.dmgBonus+'% sát thương · Trả lời đúng để tích năng lượng.</div></div>'
    +'<button class="v23bf-skill" '+(P.energy>=cost?'':'disabled')+' onclick="window.__v23&&__v23.castSkillInFight()">'+esc(P.active.n)+' ('+cost+'⚡)</button>'
    +'</div>';
}
/* The fight's current F is held here by v18/v19 when they render the bar. */
var _fightF=null;
function castSkillInFight(){
  if(!_fightF||!_fightF.pet)return;
  var r=castTeamSkill(_fightF);
  toast23(r.msg);
  if(r.ok&&r.dmg>0){
    _fightF.hp=Math.max(0,(_fightF.hp||0)-r.dmg);
    try{if(_fightF&&typeof _fightF.render==='function')_fightF.render()}catch(e){}
  }
  /* V36 (V17-2): a lethal team skill must resolve the fight at once —
     route through the engine's win path (resolveLethal) instead of
     leaving a 0-HP boss "alive" for the next answers, which could
     even resurrect it (healBoss) or lose a fight already won. */
  if(_fightF&&_fightF.hp<=0&&!_fightF.over){
    var _done36=false;
    try{if(W.__v19&&__v19._test&&__v19._test.resolveLethal)_done36=__v19._test.resolveLethal(_fightF)}catch(e){}
    if(!_done36){try{if(W.__v18&&__v18._test&&__v18._test.resolveLethal)_done36=__v18._test.resolveLethal(_fightF)}catch(e){}}
  }
  try{if(W.__v18&&__v18._petRefresh)__v18._petRefresh()}catch(e){}
  try{if(W.__v19&&__v19._petRefresh)__v19._petRefresh()}catch(e){}
}
/* ---------- exports ---------- */
W.__v23={
  version:'15.0.0',
  openHub:openHub,closeHub:closeHub,goBoss:goBoss,
  setFilter:function(v){ST.filter=v;renderBody()},
  setSearch:function(v){ST.q=v;var b=document.getElementById('v23body');if(b)b.innerHTML=tabPets()},
  setCollFilter:function(v){ST.collFilter=v;renderBody()},
  selectPet:function(id){ST.sel=id;renderBody()},
  selectEvo:function(id){ST.evoSel=id;renderBody()},
  pickSlot:function(i){ST.slot=i;renderBody()},
  placePet:function(id){var r=setTeamSlot(ST.slot,id);toast23(r.msg);renderBody()},
  quickTeam:function(id){
    var e=en23();if(!e)return;
    var t=e.team,slot=t.indexOf(null);
    if(slot<0){toast23('Đội đã đủ 3 thú — bỏ một thú ra trước khi thêm.');return}
    var r=setTeamSlot(slot,id);toast23(r.msg);renderBody();
  },
  doFeed:function(id){var r=feedPet(id);toast23(r.msg);renderBody()},
  doEvolve:function(id){var r=evolvePet(id);toast23(r.msg);renderBody()},
  doStartHatch:function(id){var r=startHatch(id);toast23(r.msg);renderBody()},
  doClaim:function(){var r=claimHatch();toast23(r.msg);if(r.ok){ST.tab='pets';ST.sel=r.pet.id}renderBody()},
  doSpeed:function(){var r=speedHatch();toast23(r.msg);renderBody()},
  doInstant:function(){var r=instantHatch();toast23(r.msg);if(r.ok){ST.tab='pets';ST.sel=r.pet.id}renderBody()},
  doSuggest:function(){var r=suggestTeam();toast23(r.msg);renderBody()},
  doSaveTeam:function(){saveNow23();toast23('Đã lưu đội hình ✔')},
  claimCollection:function(i){var r=claimCollection(i);toast23(r.msg);renderBody()},
  buyEgg:function(id){var r=buyEgg(id);toast23(r.msg);renderBody()},
  buyMat:function(id){var r=buyMat(id);toast23(r.msg);renderBody()},
  /* battle + learning hooks (called by v15/v18/v19) */
  battleStart:battleStart,onFightCorrect:onFightCorrect,onFightWrong:onFightWrong,
  onHeartLost:onHeartLost,castTeamSkill:castTeamSkill,castSkillInFight:castSkillInFight,battleBarHTML:battleBarHTML,
  onLearnCorrect:onLearnCorrect,learnXpBonus:learnXpBonus,learnXpBonusText:learnXpBonusText,
  teamBattle:teamBattle,teamPets:teamPets,statsOf:statsOf,
  setFight:function(F){_fightF=F},
  data:function(){return D},
  _test:{
    en23:en23,rollSpecies:rollSpecies,statsOf:statsOf,xpNeed:xpNeed,
    startHatch:startHatch,claimHatch:claimHatch,speedHatch:speedHatch,instantHatch:instantHatch,
    buyEgg:buyEgg,buyMat:buyMat,claimCollection:claimCollection,teamBattle:teamBattle,
    newPet:newPet,addPetXP:addPetXP,evolvePet:evolvePet,feedPet:feedPet,
    setTeamSlot:setTeamSlot,suggestTeam:suggestTeam,
    reset:function(){var s=S_();if(s&&s.v7)delete s.v7.en23;save23()},
    /* test-only: force the active hatch to be ready now */
    forceHatchReady:function(){var e=en23();if(e&&e.hatch)e.hatch.endsAt=Date.now();save23()}
  }
};
})();
