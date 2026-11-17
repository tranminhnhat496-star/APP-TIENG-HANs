/* ===== V13 Boss World Map — 8 regions =====
   The base BW engine still runs every fight (unchanged). This layer
   only replaces the Boss World MAP view with a fantasy world map
   (assets/maps/boss_world_map.jpg, the image Kenneth provided) and
   organises the 32 bosses into 8 regions with a sequential unlock
   chain. Boss data comes from the base tables exposed by build.py
   (window.__B13 / __RN13 / __TN13 / __SK13).
   Unlock rule: region 1 is open; a region opens when the previous
   region with fightable bosses is complete; inside a region, bosses
   open in order. Only PLAYABLE bosses count (14 of 32 have art and
   implemented skills); the other 18 show as "Sắp ra mắt" silhouettes
   and never block progress. A boss already beaten stays open
   (grandfathering) so no existing progress is lost.
   Region rewards: a one-time treasure chest per completed region
   (+XP, +gems) and a conquest title, stored in S.v7.map.done. */
(()=>{
'use strict';
var B=window.__B13||[];
var RN=window.__RN13||{};
var TN=window.__TN13||{};
var SK=window.__SK13||{};
var byId=function(id){ return B.find(function(b){ return b.id===id; }); };
var playable=function(b){ return !!(b&&b.art&&!b.sk.some(function(k){ return /fire|web|minion|clone/.test(k); })); };
var won=function(id){ try{ return !!((S.bw&&S.bw.dex)||{})[id]; }catch(e){ return false; } };
var seen=function(id){ try{ return !!((S.bw&&S.bw.seen)||{})[id]; }catch(e){ return false; } };

var REGIONS=[
  {id:'mushroom', name:'Rừng Nấm', icon:'seeds.png', col:'#7BC043', thumb:'N2', x:15.5, y:40.6, w:17,
   desc:'Rừng nấm độc và những sinh vật rừng rậm rạp — nơi bắt đầu hành trình của mọi thợ săn boss.',
   bosses:['F1','F2','N2','F3']},
  {id:'ancient', name:'Rừng Cổ Đại', icon:'harvest.png', col:'#5B8C2A', thumb:'F4', x:16.6, y:70.1, w:18,
   desc:'Khu rừng ngàn năm tuổi, nơi cây cổ thụ và những sinh vật huyền thoại trú ngụ.',
   bosses:['N1','N6','F4']},
  {id:'dragon', name:'Thung Lũng Rồng', icon:'flame.svg', col:'#F2753C', thumb:'N3', x:37.5, y:25.5, w:17,
   desc:'Thung lũng dung nham rực lửa, hang ổ của rồng và phượng hoàng tro tàn.',
   bosses:['V1','V2','V3','N3','V4']},
  {id:'frozen', name:'Vương Quốc Băng Giá', icon:'water.png', col:'#7CC8F2', thumb:'N4', x:66.9, y:25.4, w:17,
   desc:'Vương quốc băng tuyết vĩnh cửu, nơi người tuyết và nữ hoàng tuyết cai trị.',
   bosses:['I1','I2','I3','N4','I4']},
  {id:'ghost', name:'Ngôi Làng Ma', icon:'moon.svg', col:'#6B4C9A', thumb:null, x:87.9, y:40.6, w:17,
   desc:'Ngôi làng ma ám dưới ánh trăng, nơi linh hồn và pháp sư bóng tối lang thang. Các boss ở đây đang được vẽ hình riêng nên tạm thời chỉ xem được.',
   bosses:['D1','D2','D3','D4']},
  {id:'thunder', name:'Núi Sấm Sét', icon:'energy.png', col:'#E8B923', thumb:'N9', x:87.1, y:70.1, w:17,
   desc:'Đỉnh núi sấm sét, nơi hổ thần và người đá sấm sét canh giữ bầu trời.',
   bosses:['O1','N7','N9']},
  {id:'coral', name:'Vương Quốc San Hô', icon:'water.png', col:'#3A7BD5', thumb:'N10', x:60.8, y:92.8, w:19,
   desc:'Vương quốc san hô dưới đáy đại dương, nơi kraken và nữ hoàng san hô ngự trị.',
   bosses:['O2','O3','N10','O4']},
  {id:'mystic', name:'Vương Quốc Huyền Bí', icon:'gem.png', col:'#C77DFF', thumb:'N11', x:51.2, y:58.8, w:22,
   desc:'Vương quốc huyền bí của phép thuật, pha lê và ánh trăng — thử thách cuối cùng của Boss World.',
   bosses:['N5','N12','N8','N11']}
];
var justDone=null;

function regionOf(id){ for(var i=0;i<REGIONS.length;i++) if(REGIONS[i].bosses.indexOf(id)>=0) return i; return -1; }
function playableIn(r){ return REGIONS[r].bosses.filter(function(id){ return playable(byId(id)); }); }
function beatenIn(r){ return playableIn(r).filter(function(id){ return won(id); }); }
function regionDone(r){ var p=playableIn(r); return p.length>0&&p.every(function(id){ return won(id); }); }
function prevPlayableRegion(r){ for(var j=r-1;j>=0;j--) if(playableIn(j).length>0) return j; return -1; }
function isRegionOpen(r){
  if(r===0) return true;
  var p=prevPlayableRegion(r);
  if(p>=0&&regionDone(p)) return true;
  for(var i=r;i<REGIONS.length;i++) for(var j=0;j<REGIONS[i].bosses.length;j++) if(won(REGIONS[i].bosses[j])) return true;
  return false;
}
function open(b){
  var r=regionOf(b.id);
  if(r<0) return undefined;
  if(won(b.id)) return true;
  if(!isRegionOpen(r)) return false;
  var pb=playableIn(r), pos=pb.indexOf(b.id);
  if(pos<0) return false;
  if(pos===0) return true;
  return won(pb[pos-1]);
}
function lockReason(r){
  var p=prevPlayableRegion(r);
  if(p>=0) return 'Hoàn thành '+REGIONS[p].name+' để mở khóa';
  return 'Chưa mở khóa';
}

/* ---- region rewards ---- */
function mapState(){ S.v7=S.v7||{}; S.v7.map=S.v7.map||{done:{}}; return S.v7.map; }
function chestOf(r){ return {xp:40+20*r, gems:2+r, title:'Chinh Phục '+REGIONS[r].name}; }
function grantChest(r, msg){
  if(mapState().done[REGIONS[r].id]) return false;
  if(!regionDone(r)) return false;
  var c=chestOf(r);
  mapState().done[REGIONS[r].id]=1;
  S.v7.gems=(S.v7.gems||0)+c.gems;
  S.v7.fbTitles=S.v7.fbTitles||[];
  if(S.v7.fbTitles.indexOf(c.title)<0) S.v7.fbTitles.push(c.title);
  gain(c.xp);
  save();
  if(msg) toast13(msg);
  return true;
}
function win(bs, first, xp){
  var r=regionOf(bs.id);
  if(r<0||!regionDone(r)) return;
  if(mapState().done[REGIONS[r].id]) return;
  justDone=r;
  var c=chestOf(r);
  var nx=r+1<REGIONS.length?REGIONS[r+1].name:null;
  grantChest(r,'Hoàn thành '+REGIONS[r].name+'! '+(nx?('Đã mở khóa '+nx+'. '):'Đã chinh phục toàn bộ Boss World! ')+'Rương: +'+c.xp+' XP, +'+c.gems+' 💎 · Danh hiệu: '+c.title);
}
function unlText(bs){
  if(justDone===null||justDone===undefined) return '';
  var r=justDone;
  if(regionOf(bs.id)!==r) return '';
  var nx=r+1<REGIONS.length?REGIONS[r+1].name:null;
  return nx?(' Mở khóa '+nx+'.'):' Đã chinh phục toàn bộ Boss World!';
}

/* ---- ui helpers ---- */
function toast13(msg){
  var d=document.createElement('div');
  d.className='v10toast'; d.textContent=msg;
  document.body.appendChild(d);
  setTimeout(function(){ d.remove(); },4600);
}
function showModal(html){
  closeModal();
  var d=document.createElement('div');
  d.className='v13modal'; d.id='v13modal';
  d.innerHTML=html;
  document.body.appendChild(d);
}
function closeModal(){ var d=document.getElementById('v13modal'); if(d) d.remove(); }
function thumbSrc(rg){
  if(!rg.thumb) return 'assets/icons/v6/'+rg.icon;
  var b=byId(rg.thumb);
  return b&&b.art?('assets/bosses/'+b.art+'.png'):('assets/icons/v6/'+rg.icon);
}
function skName(k){
  var s=SK[k]||k;
  var m=/^(.*?)(?: — |:)/.exec(s);
  return m?m[1]:s;
}
function bossImg(b, sil){
  if(b.art) return '<img class="bwimg'+(sil?' sil':'')+'" src="assets/bosses/'+b.art+'.png" alt="">';
  return '<div class="bwimg sil" style="font:900 60px/84px Jua;color:#555">?</div>';
}

/* ---- world map ---- */
function renderMap(el){
  justDone=null;
  if(!B.length){ el.innerHTML='<p class="mute">Boss World chưa tải được dữ liệu boss.</p>'; return; }
  var totalWon=0,totalPlay=0,totalSoon=0;
  REGIONS.forEach(function(rg,i){
    totalWon+=beatenIn(i).length; totalPlay+=playableIn(i).length;
    totalSoon+=rg.bosses.filter(function(id){ return !playable(byId(id)); }).length;
  });
  var h='<div class="v13mapwrap"><div class="v13map">';
  h+='<img class="v13mapimg" src="assets/maps/boss_world_map.jpg" alt="Boss World">';
  h+='<div class="v13top"><span class="v13title"><img src="assets/icons/v6/boss.png" alt="">Boss World</span>'
    +'<span class="v13topbtns"><button class="v13tbtn" onclick="__v13.help()" title="Hướng dẫn">?</button>'
    +'<button class="v13tbtn" onclick="bwGo(\'off\')" title="Quay lại">✕</button></span></div>';
  h+='<div class="v13chips">';
  REGIONS.forEach(function(rg,i){
    var isOpen=isRegionOpen(i), done=regionDone(i);
    var pb=playableIn(i), bn=beatenIn(i).length;
    h+='<button class="v13chip'+(done?' done':isOpen?'':' locked')+'" style="left:'+rg.x+'%;top:'+rg.y+'%;--cw:'+rg.w+'%;--rc:'+rg.col+'" onclick="__v13.'+(isOpen?('openRegion(\''+rg.id+'\')'):('locked(\''+rg.id+'\')'))+'">'
      +'<span class="v13thumb"><img src="'+thumbSrc(rg)+'" alt=""></span>'
      +'<span class="v13cname">'+rg.name+'</span>'
      +'<span class="v13cprog">'+(done?'✓ Hoàn thành':isOpen?(bn+'/'+pb.length+' ★'):'🔒 Khóa')+'</span>'
      +'</button>';
  });
  h+='</div></div>';
  h+='<p class="mute v13cap">Đã hạ '+totalWon+' trên '+totalPlay+' boss có thể đấu · '+totalSoon+' boss đang chờ hình ảnh riêng</p>';
  h+='<div class="v13acts"><button class="btn" onclick="__v13.collection()">Bộ sưu tập boss ('+totalWon+'/'+totalPlay+' đã hạ)</button>'
    +'<button class="btn" onclick="bwGo(\'off\')">Quay lại boss cổ điển</button></div>';
  h+='</div>';
  el.innerHTML=h;
}

/* ---- region detail ---- */
function openRegion(id){
  var i=REGIONS.findIndex(function(r){ return r.id===id; });
  if(i<0) return;
  var rg=REGIONS[i];
  var pb=playableIn(i), bn=beatenIn(i).length;
  var soon=rg.bosses.filter(function(bid){ return !playable(byId(bid)); }).length;
  var lastPlay=pb[pb.length-1];
  var h='<div class="v13panel" style="--rc:'+rg.col+'">';
  h+='<div class="v13phead"><img class="v13pimg" src="'+thumbSrc(rg)+'" alt=""><div><h2>'+rg.name+'</h2>'
    +'<p class="mute">'+rg.desc+'</p>'
    +'<p class="mute">Đã hạ '+bn+' trên '+pb.length+' boss có thể đấu'+(soon?' · '+soon+' boss sắp ra mắt':'')+'</p></div>'
    +'<button class="v13x" onclick="__v13.close()">✕</button></div>';
  h+='<div class="v13prog"><i style="width:'+(pb.length?bn/pb.length*100:0)+'%"></i></div>';
  h+='<div class="v13bosses">';
  rg.bosses.forEach(function(bid){
    var b=byId(bid); if(!b) return;
    var isPlay=playable(b), isWon=won(b.id), isOpen=isPlay&&open(b);
    var isFinal=bid===lastPlay;
    var wins=((S.bw&&S.bw.dex)||{})[b.id]||0;
    h+='<div class="bw bwc'+(isFinal?' v13final':'')+'" data-r="'+b.r+'">'
      +bossImg(b,!(isWon||seen(b.id)))
      +'<b>'+(isPlay?b.n:(isWon||seen(b.id)?b.n:'???'))+'</b>'
      +'<div class="mute">'+(isPlay?(RN[b.r]+' · '+TN[b.t]+' · '+b.hp+' máu'+(isWon?' · hạ '+wins+' lần':'')):'Sắp ra mắt')+'</div>'
      +(isPlay?'<div class="v12skills">'+b.sk.map(skName).join(' · ')+'</div>':'')
      +(isFinal?'<div class="v13finaltag">BOSS CUỐI</div>':'')
      +(isPlay?(isOpen?'<button class="btn sm pri" onclick="__v13.fight(\''+b.id+'\')">Khiêu chiến</button>':'<div class="mute">Đang khóa — hạ boss trước để mở</div>'):'<div class="mute">Chưa có hình và kỹ năng riêng</div>')
      +'</div>';
  });
  h+='</div>';
  h+='<div class="acts"><button class="btn" onclick="__v13.close()">Quay lại bản đồ</button></div>';
  h+='</div>';
  showModal(h);
}
function locked(id){
  var i=REGIONS.findIndex(function(r){ return r.id===id; });
  if(i<0) return;
  toast13('🔒 '+REGIONS[i].name+' đang khóa: '+lockReason(i)+'.');
}
function fight(id){ closeModal(); bwStart(id); }

/* ---- collection + help ---- */
function collection(){
  var h='<div class="v13panel"><div class="v13phead"><div><h2>Bộ sưu tập boss</h2>'
    +'<p class="mute">Toàn bộ 32 boss trong Boss World — đã gặp, đã hạ và đang chờ hình ảnh.</p></div>'
    +'<button class="v13x" onclick="__v13.close()">✕</button></div>';
  REGIONS.forEach(function(rg,i){
    var bn=beatenIn(i).length, pb=playableIn(i).length;
    h+='<h3 class="v13collh" style="--rc:'+rg.col+'">'+rg.name+' <span class="mute">'+bn+'/'+pb+' đã hạ</span></h3><div class="v13coll">';
    rg.bosses.forEach(function(bid){
      var b=byId(bid); if(!b) return;
      var isPlay=playable(b), isWon=won(b.id);
      var wins=((S.bw&&S.bw.dex)||{})[b.id]||0;
      h+='<div class="v13crow"><span class="v13cthumb">'+(b.art?'<img src="assets/bosses/'+b.art+'.png" class="'+(isWon||seen(b.id)?'':'sil')+'" alt="">':'<span class="v13q">?</span>')+'</span>'
        +'<span class="v13cname2">'+(isPlay?b.n:(isWon||seen(b.id)?b.n:'???'))+'</span>'
        +'<span class="v13ctag" style="background:'+(isWon?'#2E9B52':isPlay?'#8a6d1f':'#9AA5B1')+'">'+(isWon?('Đã hạ '+wins+' lần'):(isPlay?(seen(b.id)?'Đã gặp':'Chưa gặp'):'Sắp ra mắt'))+'</span>'
        +'<span class="mute">'+RN[b.r]+' · '+b.hp+' máu</span></div>';
    });
    h+='</div>';
  });
  var titles=((S.v7||{}).fbTitles)||[];
  if(titles.length) h+='<h3 class="v13collh">Danh hiệu đã nhận</h3><p>'+titles.join(' · ')+'</p>';
  h+='<div class="acts"><button class="btn" onclick="__v13.close()">Đóng</button></div></div>';
  showModal(h);
}
function help(){
  var h='<div class="v13panel"><div class="v13phead"><div><h2>Cách chơi Boss World</h2>'
    +'<p class="mute">Chinh phục 8 vùng đất, mở khóa dần toàn bộ vương quốc.</p></div>'
    +'<button class="v13x" onclick="__v13.close()">✕</button></div>'
    +'<p>• Bắt đầu tại <b>Rừng Nấm</b>. Trong mỗi vùng, đánh bại boss theo thứ tự để mở boss tiếp theo.</p>'
    +'<p>• Đánh bại <b>boss cuối</b> của một vùng để mở khóa vùng đất tiếp theo.</p>'
    +'<p>• Hoàn thành một vùng (hạ hết boss có thể đấu) nhận ngay <b>rương kho báu</b>: XP, đá quý và danh hiệu chinh phục riêng.</p>'
    +'<p>• Trả lời đúng câu tiếng Hàn để gây sát thương, trả lời sai sẽ bị boss phản công. Combo và trả lời nhanh tăng sát thương.</p>'
    +'<p>• 18 boss chưa có hình riêng hiện là bóng “Sắp ra mắt” — chúng không chặn tiến trình của bạn.</p>'
    +'<div class="acts"><button class="btn pri" onclick="__v13.close()">Bắt đầu khám phá</button></div></div>';
  showModal(h);
}

/* ---- fight view extras ---- */
function enhanceFight(el){
  var b=(window.__bw?window.__bw():null);
  if(!b) return;
  var r=regionOf(b.b.id);
  if(r<0) return;
  var nameEl=el.querySelector('.bw.bwc b');
  if(nameEl&&!el.querySelector('.v13rchip'))
    nameEl.insertAdjacentHTML('afterend',' <span class="v13rchip" style="--rc:'+REGIONS[r].col+'">'+REGIONS[r].name+'</span>');
  var acts=el.querySelector('.acts');
  if(acts&&/Bản đồ boss/.test(acts.textContent)&&!acts.querySelector('.v13tobtn'))
    acts.insertAdjacentHTML('beforeend','<button class="btn v13tobtn" onclick="__v13.openRegion(\''+REGIONS[r].id+'\')">Khu vực: '+REGIONS[r].name+'</button>');
}

/* ---- wiring ---- */
var ogBoss=window.gBoss;
window.gBoss=function(el){
  ogBoss(el);
  if(el.querySelector('.bwg')) renderMap(el);
  else if(el.querySelector('.bwo')||/Bản đồ boss/.test(el.textContent)) enhanceFight(el);
};
var ogStart=window.bwStart;
window.bwStart=function(id){ justDone=null; closeModal(); return ogStart(id); };

window.__v13={
  open:open, win:win, unlText:unlText, REGIONS:REGIONS,
  openRegion:openRegion, locked:locked, fight:fight, close:closeModal,
  collection:collection, help:help, isRegionOpen:isRegionOpen,
  regionDone:regionDone, grantChest:grantChest,
  check:function(){
    var out={regions:REGIONS.map(function(rg,i){
      return {id:rg.id,open:isRegionOpen(i),done:regionDone(i),
              beaten:beatenIn(i).length,playable:playableIn(i).length,total:rg.bosses.length};
    }),chests:((S.v7||{}).map||{done:{}}).done,titles:((S.v7||{}).fbTitles)||[],gems:((S.v7||{}).gems)||0};
    return out;
  }
};

/* Grandfathered region chests: grant once for regions already complete
   before this layer existed. */
setTimeout(function(){
  var granted=[];
  for(var r=0;r<REGIONS.length;r++){
    if(regionDone(r)&&!mapState().done[REGIONS[r].id]){
      var c=chestOf(r);
      grantChest(r,null);
      granted.push(REGIONS[r].name+' (+'+c.xp+' XP, +'+c.gems+' 💎)');
    }
  }
  if(granted.length) toast13('Rương vùng đã hoàn thành trước đây: '+granted.join(' · '));
},1500);
})();
