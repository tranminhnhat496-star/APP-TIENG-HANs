/* ===== V12 Fantasy Bosses (N9-N12) — Boss World =====
   Bosses + skills are added to the base BW engine by build.py
   (patch_fantasy_bosses). This layer only adds the unlock gates,
   first-win rewards, and the premium presentation (element chips,
   skill list, lock conditions, titles) on top of the Boss World map
   and fight view. It never touches the classic bosses, the V7 arena,
   crops, pets, shop or quests. Progress lives in S.bw.dex (wins) and
   S.v7.fb / S.v7.fbTitles (first-win rewards). */
(()=>{
'use strict';
var FB={
  N9:{name:'Hổ Thần Sấm Sét',el:'Sấm Sét',icon:'energy.png',col:'#C98A1B',col2:'#3A7BD5',
      skills:['Thunder Claw','Lightning Storm','Divine Thunder'],
      unlock:'Hạ ít nhất 1 boss bất kỳ',title:'Chúa Tể Sấm Sét',
      desc:'Hổ trắng mang sấm sét của trời.'},
  N10:{name:'Nữ Hoàng San Hô',el:'Đại Dương',icon:'water.png',col:'#3A7BD5',col2:'#E86AA8',
      skills:['Bubble Prison','Ocean Wave','Abyssal Tide'],
      unlock:'Hạ ít nhất 3 boss',title:'Nữ Hoàng Đại Dương',
      desc:'Nữ hoàng san hô của biển sâu.'},
  N11:{name:'Quạ Bóng Đêm Pháp Sư',el:'Bóng Đêm',icon:'moon.png',col:'#6B4C9A',col2:'#E8445F',
      skills:['Shadow Feather','Dark Curse','Eclipse'],
      unlock:'Hạ ít nhất 5 boss',title:'Chúa Tể Bóng Đêm',
      desc:'Pháp sư quạ của màn đêm.'},
  N12:{name:'Vua Bọ Pha Lê',el:'Pha Lê',icon:'gem.png',col:'#4A90D9',col2:'#F2A93B',
      skills:['Crystal Shield','Gem Explosion','Crystal Cataclysm'],
      unlock:'Đánh bại cả 3 boss Fantasy còn lại',title:'Vua Pha Lê',
      desc:'Vua bọ bọc giáp pha lê.'}
};
var ART={thunder_tiger:'N9',coral_queen:'N10',astral_raven:'N11',crystal_beetle_king:'N12'};

function totalWins(){
  var n=0,i;
  try{ n+=wins(); }catch(e){}
  try{ var d=(S.bw&&S.bw.dex)||{}; for(i in d) n+=d[i]||0; }catch(e){}
  try{ var a=(window.__v7&&window.__v7.V&&window.__v7.V.boss8)||{}; for(i in a) n+=a[i]||0; }catch(e){}
  return n;
}
function bwWon(id){ try{ return !!((S.bw&&S.bw.dex)||{})[id]; }catch(e){ return false; } }

function gate(b){
  if(!FB[b.id]) return undefined;
  if(b.id==='N9') return totalWins()>=1;
  if(b.id==='N10') return totalWins()>=3;
  if(b.id==='N11') return totalWins()>=5;
  if(b.id==='N12') return bwWon('N9')&&bwWon('N10')&&bwWon('N11');
  return undefined;
}

function toast12(msg){
  var d=document.createElement('div');
  d.className='v10toast'; d.textContent=msg;
  document.body.appendChild(d);
  setTimeout(function(){ d.remove(); },4200);
}

/* First-win reward: +5 gems + a title. Called from the BW engine's
   win block (it already computed `first` before incrementing dex). */
function win(bs,first,xp){
  if(!FB[bs.id]||!first) return;
  S.v7=S.v7||{};
  S.v7.gems=(S.v7.gems||0)+5;
  S.v7.fb=S.v7.fb||{};
  S.v7.fb[bs.id]=1;
  S.v7.fbTitles=S.v7.fbTitles||[];
  if(S.v7.fbTitles.indexOf(FB[bs.id].title)<0) S.v7.fbTitles.push(FB[bs.id].title);
  save();
  toast12('Lần đầu hạ '+bs.n+'! +5 💎 · Danh hiệu: '+FB[bs.id].title);
}

function chip(id){
  var f=FB[id];
  return '<span class="v12chip" style="--ec:'+f.col+'"><img src="assets/icons/v6/'+f.icon+'" alt="">'+f.el+'</span>';
}

function enhanceMap(el){
  el.querySelectorAll('.bwg .bwc').forEach(function(card){
    var img=card.querySelector('img.bwimg');
    if(!img) return;
    var m=/assets\/bosses\/(thunder_tiger|coral_queen|astral_raven|crystal_beetle_king)\.png/.exec(img.src||'');
    if(!m) return;
    var id=ART[m[1]], f=FB[id];
    card.classList.add('v12card');
    card.style.setProperty('--ec',f.col);
    var nameEl=card.querySelector('b');
    if(nameEl&&nameEl.textContent.trim()==='???') nameEl.textContent=f.name;
    if(nameEl&&!card.querySelector('.v12chip')) nameEl.insertAdjacentHTML('afterend',' '+chip(id));
    var mutes=card.querySelectorAll('.mute');
    if(mutes.length&&!card.querySelector('.v12skills'))
      mutes[0].insertAdjacentHTML('afterend','<div class="v12skills">'+f.skills.join(' · ')+'</div>');
    if(mutes.length>1&&/Đang khóa/.test(mutes[1].textContent)){
      mutes[1].innerHTML='<span class="v12lock">Khóa: '+f.unlock+'</span>';
    }
    if(bwWon(id)&&!card.querySelector('.v12title'))
      card.insertAdjacentHTML('beforeend','<div class="v12title">Danh hiệu: '+f.title+'</div>');
  });
}

function enhanceFight(el){
  var b=(window.__bw?window.__bw():null);
  if(!b||!FB[b.b.id]) return;
  var f=FB[b.b.id];
  var card=el.querySelector('.bw.bwc');
  if(!card) return;
  card.classList.add('v12card');
  card.style.setProperty('--ec',f.col);
  var nameEl=card.querySelector('b');
  if(nameEl&&!card.querySelector('.v12chip')) nameEl.insertAdjacentHTML('afterend',' '+chip(b.b.id));
  if(b.ph===2) card.classList.add('v12ult');
  if(b.b.sk.indexOf('enrage')>=0&&b.hp<=b.max*0.3&&!card.querySelector('.v12enrage')){
    var bar=card.querySelector('.bar.hp');
    if(bar) bar.insertAdjacentHTML('afterend','<div class="v12enrage">CUỒNG NỘ</div>');
  }
}

var ogBoss=window.gBoss;
window.gBoss=function(el){
  ogBoss(el);
  if(el.querySelector('.bwg')) enhanceMap(el);
  if(el.querySelector('.bwo')) enhanceFight(el);
};

window.__v12={
  gate:gate, win:win, FB:FB, totalWins:totalWins,
  check:function(){
    var out={fantasy:Object.keys(FB),locked:{},wins:totalWins(),
             titles:((S.v7||{}).fbTitles)||[],gems:((S.v7||{}).gems)||0,
             bwDex:((S.bw||{}).dex)||{}};
    Object.keys(FB).forEach(function(id){ out.locked[id]=!gate({id:id}); });
    return out;
  }
};
})();
