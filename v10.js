/* ===== V10 — Premium Decor Expansion (V6 Decor Expansion) =====
   12 new decor items (assets/decor/*.png) with a real shop, inventory,
   placement (drag / rotate / recall), per-item effects and seasons.
   Display + data layer only: base V6, old ITEMS, S.cards/xp/dex/bw are
   untouched. New data lives only in S.v7.decor {own, placed, bonus}. */
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function def(o,k,v){if(o[k]===undefined)o[k]=v;return o[k]}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
var V=S.v7||{};
def(V,'decor',{own:{},placed:[],bonus:{}});
var D=V.decor;
if(!D.own)D.own={}; if(!D.placed)D.placed=[]; if(!D.bonus)D.bonus={};

var CAT={nature:'Thiên nhiên',buildings:'Công trình',seasonal:'Theo mùa',special:'Đặc biệt'};
var RAR={common:'Phổ biến',rare:'Hiếm',epic:'Sử thi',mythic:'Huyền thoại'};
var SEA={spring:'Xuân',summer:'Hạ',autumn:'Thu',winter:'Đông',special:'Đặc biệt',all:'Quanh năm'};
/* id, name, price {xp|gem}, category, rarity, season, size, effect, desc */
var DECOR=[
 {id:'ancient_tree',n:'Cây Cổ Thụ',p:{xp:150},cat:'nature',r:'rare',s:'all',w:'big',fx:'sway',d:'Cây cổ thụ tỏa bóng mát cho cả nông trại.'},
 {id:'pumpkin',n:'Bí Ngô Vàng',p:{xp:120},cat:'seasonal',r:'common',s:'autumn',w:'med',fx:'glow',d:'Bí ngô mùa thu, phát sáng dịu vào buổi tối.'},
 {id:'farmhouse',n:'Nhà Nông Ấm Cúng',p:{xp:250},cat:'buildings',r:'epic',s:'all',w:'big',fx:'smoke',d:'Ngôi nhà nhỏ với ống khói luôn tỏa khói ấm.'},
 {id:'tractor',n:'Máy Kéo Đỏ',p:{xp:300},cat:'buildings',r:'epic',s:'all',w:'med',fx:'engine',d:'Máy kéo đỏ mạnh mẽ. Bấm vào để khởi động!'},
 {id:'cherry_blossom',n:'Hoa Anh Đào',p:{gem:5},cat:'seasonal',r:'epic',s:'spring',w:'big',fx:'petals',d:'Cây anh đào nở rộ, cánh hoa rơi bay.'},
 {id:'watermelon_garden',n:'Vườn Dưa Hấu',p:{xp:180},cat:'seasonal',r:'rare',s:'summer',w:'med',fx:'sway',d:'Dưa hấu ngọt lịm dưới nắng hè.'},
 {id:'wind_chime',n:'Chuông Gió',p:{gem:4},cat:'special',r:'rare',s:'special',w:'small',fx:'swing',d:'Chuông gió leng keng theo từng cơn gió.'},
 {id:'autumn_tree',n:'Cây Phong Đỏ',p:{xp:150},cat:'seasonal',r:'rare',s:'autumn',w:'big',fx:'leaves',d:'Lá phong đỏ rực, lá vàng rơi theo gió.'},
 {id:'snowman',n:'Người Tuyết',p:{xp:200},cat:'seasonal',r:'epic',s:'winter',w:'med',fx:'snow',d:'Người tuyết đội mũ đỏ, tuyết rơi nhẹ quanh.'},
 {id:'butterflies',n:'Đàn Bướm',p:{gem:6},cat:'nature',r:'epic',s:'spring',w:'small',fx:'fly',d:'Ba chú bướm bay lượn quanh nông trại.'},
 {id:'roasted_sweet_potato',n:'Khoai Lang Nướng',p:{xp:100},cat:'seasonal',r:'common',s:'autumn',w:'med',fx:'steam',d:'Giỏ khoai lang nướng bốc khói thơm phức.'},
 {id:'moon_lantern',n:'Đèn Trăng',p:{gem:8},cat:'special',r:'mythic',s:'special',w:'med',fx:'nightglow',d:'Đèn lồng trăng phát sáng rực rỡ vào ban đêm.'}
];
var byId={}; DECOR.forEach(function(x){byId[x.id]=x});
function curSeason(){try{return season()}catch(e){return 2}}
var SEASON_KEYS=['spring','summer','autumn','winter'];
function ownCount(id){return D.own[id]||0}
function placedCount(id){return D.placed.filter(function(p){return p.id===id}).length}
function priceHtml(p){
  if(p.xp)return '<img src="assets/icons/v6/coin.png" alt=""> '+p.xp+' XP';
  return '<img src="assets/icons/v6/gem.png" alt=""> '+p.gem+' 💎';
}
function canAfford(it){
  if(it.p.xp)return coins()>=it.p.xp;
  return (V.gems||0)>=it.p.gem;
}
function save10(){try{save()}catch(e){} try{stats()}catch(e){} updateHud10()}
function updateHud10(){
  try{
    var h=$('#v7hud'); if(!h)return;
    var gem=h.querySelector('.chip.gem b'); if(gem)gem.textContent=V.gems||0;
    $$('.chip',h).forEach(function(c){if(/XP/.test(c.textContent)&&!c.classList.contains('gem')){var b=c.querySelector('b'); if(b)b.textContent=coins()}});
  }catch(e){}
}
function toast10(t,ms){
  var d=document.createElement('div');d.className='v10toast';d.textContent=t;
  document.body.appendChild(d);setTimeout(function(){d.remove()},ms||2600);
}
/* ---------- modal: shop + inventory ---------- */
var ST={tab:'shop',cat:'all',rar:'all',sea:'all'};
function ownedTotal(){return DECOR.filter(function(x){return ownCount(x.id)>0}).length}
function shopHtml(){
  var cs=curSeason(), curKey=SEASON_KEYS[cs];
  var list=DECOR.filter(function(x){
    if(ST.cat!=='all'&&x.cat!==ST.cat)return false;
    if(ST.rar!=='all'&&x.r!==ST.rar)return false;
    if(ST.sea!=='all'&&x.s!==ST.sea)return false;
    return true;
  });
  var cards=list.map(function(x){
    var inSeason=x.s===curKey, own=ownCount(x.id), afford=canAfford(x);
    return '<div class="v10card'+(inSeason?' inseason':'')+'">'
      +'<img class="v10thumb" src="assets/decor/'+x.id+'.png" alt="'+esc(x.n)+'" loading="lazy">'
      +'<b>'+esc(x.n)+'</b>'
      +'<div class="v10badges"><span class="v10badge '+x.r+'">'+RAR[x.r]+'</span><span class="v10badge cat">'+CAT[x.cat]+'</span><span class="v10badge season">'+SEA[x.s]+'</span>'+(inSeason?'<span class="v10badge inseason">Đang vào mùa</span>':'')+'</div>'
      +'<div class="d">'+esc(x.d)+'</div>'
      +'<div class="v10price">'+priceHtml(x.p)+'</div>'
      +(own>0?'<div class="v10own">Đã sở hữu: '+own+'</div>':'')
      +'<button class="btn sm '+(afford?'pri':'')+'" '+(afford?'':'disabled')+' onclick="v10Buy(\''+x.id+'\')">'+(afford?'Mua':'Không đủ')+'</button> '
      +'<button class="btn sm" onclick="v10Preview(\''+x.id+'\')">Xem trước</button>'
      +'</div>';
  }).join('');
  return '<div class="v10filters">'
    +['all','nature','buildings','seasonal','special'].map(function(c){return '<button class="v10fchip'+(ST.cat===c?' on':'')+'" onclick="v10Filter(\'cat\',\''+c+'\')">'+(c==='all'?'Tất cả':CAT[c])+'</button>'}).join('')
    +'<select onchange="v10Filter(\'rar\',this.value)" aria-label="Độ hiếm">'+['all','common','rare','epic','mythic'].map(function(r){return '<option value="'+r+'"'+(ST.rar===r?' selected':'')+'>'+(r==='all'?'Mọi độ hiếm':RAR[r])+'</option>'}).join('')+'</select>'
    +['all','spring','summer','autumn','winter','special'].map(function(s){return '<button class="v10fchip'+(ST.sea===s?' on':'')+'" onclick="v10Filter(\'sea\',\''+s+'\')">'+(s==='all'?'Mọi mùa':SEA[s])+'</button>'}).join('')
    +'</div>'
    +'<p class="mute">Mùa hiện tại: '+SN[cs]+'. Đồ theo mùa đặt đúng mùa được thưởng +10 XP (mỗi món một lần mỗi mùa).</p>'
    +'<div class="v10grid">'+(cards||'<p class="mute">Không có vật phẩm nào khớp bộ lọc.</p>')+'</div>';
}
function invHtml(){
  var owned=DECOR.filter(function(x){return ownCount(x.id)>0});
  var rows=owned.map(function(x){
    return '<div class="v10invrow"><img src="assets/decor/'+x.id+'.png" alt="">'
      +'<div class="grow"><b>'+esc(x.n)+'</b><div class="mute">'+CAT[x.cat]+' · '+RAR[x.r]+' · '+SEA[x.s]+'</div></div>'
      +'<span class="v10own">x'+ownCount(x.id)+'</span>'
      +'<button class="btn sm pri" onclick="v10PlaceStart(\''+x.id+'\')">Đặt lên nông trại</button></div>';
  }).join('')||'<p class="mute">Kho trống — hãy mua vật phẩm ở tab Cửa hàng.</p>';
  var placed=D.placed.map(function(p,i){
    var x=byId[p.id];
    return '<div class="v10invrow"><img src="assets/decor/'+p.id+'.png" alt="">'
      +'<div class="grow"><b>'+esc(x.n)+'</b><div class="mute">Vị trí '+Math.round(p.x)+'%, '+Math.round(p.y)+'%'+(p.rot?' · xoay '+p.rot+'°':'')+'</div></div>'
      +'<button class="btn sm" onclick="v10PlaceStart(null,'+i+')">Di chuyển</button>'
      +'<button class="btn sm" onclick="v10Recall('+i+')">Thu hồi</button></div>';
  }).join('')||'<p class="mute">Chưa đặt vật phẩm nào lên nông trại.</p>';
  return '<h3>Kho của bạn</h3>'+rows+'<h3>Đã đặt trên nông trại ('+D.placed.length+')</h3>'+placed;
}
function modalHtml(){
  return '<h2><img src="assets/icons/v6/farm.png" style="width:30px;height:30px;vertical-align:-.25em"> Cửa hàng Trang trí</h2>'
    +'<p class="mute">Đã sở hữu '+ownedTotal()+'/12 món · Đã đặt '+D.placed.length+' món trên nông trại.</p>'
    +'<div class="v10wallet"><span class="chip"><img src="assets/icons/v6/coin.png" alt=""> <b>'+coins()+'</b> XP</span><span class="chip"><img src="assets/icons/v6/gem.png" alt=""> <b>'+(V.gems||0)+'</b> 💎</span></div>'
    +'<div class="v10tabs"><button class="v10tab'+(ST.tab==='shop'?' on':'')+'" onclick="v10Tab(\'shop\')">Cửa hàng</button><button class="v10tab'+(ST.tab==='inv'?' on':'')+'" onclick="v10Tab(\'inv\')">Kho đồ ('+DECOR.reduce(function(a,x){return a+ownCount(x.id)},0)+' trong kho · '+D.placed.length+' đã đặt)</button></div>'
    +'<div id="v10body">'+(ST.tab==='shop'?shopHtml():invHtml())+'</div>'
    +'<div class="v10acts"><button class="btn pri" onclick="v10Close()">Đóng</button></div>';
}
function renderModal(){
  var m=$('#v10modal'); if(!m)return;
  var box=m.querySelector('.v10box'); if(!box)return;
  box.innerHTML=modalHtml();
}
window.v10Open=function(tab){
  if(tab)ST.tab=tab;
  var old=$('#v10modal'); if(old)old.remove();
  var d=document.createElement('div');d.className='v10modal';d.id='v10modal';
  d.innerHTML='<div class="v10box">'+modalHtml()+'</div>';
  d.addEventListener('click',function(e){if(e.target===d)v10Close()});
  document.body.appendChild(d);
};
window.v10Close=function(){var m=$('#v10modal');if(m)m.remove();updateHud10()};
window.v10Tab=function(t){ST.tab=t;renderModal()};
window.v10Filter=function(k,v){ST[k]=v;renderModal()};
var FXLABEL={sway:'Lá đung đưa theo gió',glow:'Phát sáng dịu',smoke:'Khói ống khói bay lên',engine:'Bấm vào để khởi động máy',petals:'Cánh hoa rơi bay',swing:'Rung nhẹ theo gió',leaves:'Lá vàng rơi theo gió',snow:'Tuyết rơi nhẹ quanh món',fly:'Bay lượn quanh chỗ đặt',steam:'Khói bốc lên',nightglow:'Phát sáng mạnh vào ban đêm'};
window.v10Preview=function(id){
  var x=byId[id]; if(!x)return;
  var own=ownCount(id), afford=canAfford(x);
  var old=$('#v10preview'); if(old)old.remove();
  var d=document.createElement('div');d.className='v10modal';d.id='v10preview';
  d.innerHTML='<div class="v10box v11preview"><h2>'+esc(x.n)+'</h2>'
    +'<img src="assets/decor/'+x.id+'.png" alt="'+esc(x.n)+'">'
    +'<div class="v10badges"><span class="v10badge '+x.r+'">'+RAR[x.r]+'</span><span class="v10badge cat">'+CAT[x.cat]+'</span><span class="v10badge season">'+SEA[x.s]+'</span></div>'
    +'<p>'+esc(x.d)+'</p>'
    +'<p class="mute">Hiệu ứng: '+FXLABEL[x.fx]+'. Đặt lên nông trại: kéo thả, xoay 45°, thu hồi về kho.</p>'
    +'<div class="v10price">'+priceHtml(x.p)+'</div>'
    +(own>0?'<div class="v10own">Đã sở hữu: '+own+'</div>':'')
    +'<div class="v10acts">'
    +(own>0?'<button class="btn pri" onclick="v10ClosePreview();v10Open(\'inv\')">Mở kho đồ</button>'
           :'<button class="btn pri" '+(afford?'':'disabled')+' onclick="v10BuyFromPreview(\''+x.id+'\')">'+(afford?'Mua':'Không đủ')+'</button>')
    +'<button class="btn" onclick="v10ClosePreview()">Đóng</button></div></div>';
  d.addEventListener('click',function(e){if(e.target===d)v10ClosePreview()});
  document.body.appendChild(d);
};
window.v10ClosePreview=function(){var m=$('#v10preview');if(m)m.remove()};
window.v10BuyFromPreview=function(id){if(window.v10Buy(id)){v10ClosePreview();v10Open('shop')}};
window.v10Buy=function(id){
  var x=byId[id]; if(!x)return false;
  if(!canAfford(x)){toast10('Chưa đủ '+(x.p.xp?'XP':'💎')+' để mua '+x.n);return false}
  if(x.p.xp){S.spent=(S.spent||0)+x.p.xp}else{V.gems=(V.gems||0)-x.p.gem}
  D.own[id]=ownCount(id)+1;
  save10(); renderModal();
  try{sfx('win')}catch(e){}
  try{pop('Đã mua '+x.n+'!',1)}catch(e){}
  toast10('Đã mua '+x.n+' — vào tab Kho đồ để đặt lên nông trại');
  return true;
};
/* ---------- placement ---------- */
var GH=null; /* {id,x,y,rot,idx} idx=-1 new from inventory, >=0 moving placed */
function sceneEl(){var sc=$('#farm .scene');return sc||null}
function layerEl(){
  var sc=sceneEl(); if(!sc)return null;
  var l=sc.querySelector('.v10layer');
  if(!l){l=document.createElement('div');l.className='v10layer';sc.appendChild(l)}
  return l;
}
function fxSpans(x){
  if(x.fx==='smoke')return '<span class="v10pt s1"></span><span class="v10pt s2"></span>';
  if(x.fx==='steam')return '<span class="v10pt st1"></span><span class="v10pt st2"></span>';
  if(x.fx==='petals')return '<span class="v10pt p1"></span><span class="v10pt p2"></span><span class="v10pt p3"></span>';
  if(x.fx==='leaves')return '<span class="v10pt l1"></span><span class="v10pt l2"></span><span class="v10pt l3"></span>';
  if(x.fx==='snow')return '<span class="v10pt w1"></span><span class="v10pt w2"></span><span class="v10pt w3"></span>';
  return '';
}
function placedEl(p,i){
  var x=byId[p.id]; if(!x)return null;
  var d=document.createElement('div');
  d.className='v10placed w-'+x.w; d.dataset.idx=i;
  d.style.left=p.x+'%'; d.style.top=p.y+'%';
  d.style.transform='translate(-50%,-92%) rotate('+(p.rot||0)+'deg)';
  d.innerHTML='<img class="v10fx-'+x.fx+'" src="assets/decor/'+x.id+'.png" alt="'+esc(x.n)+'" draggable="false">'+fxSpans(x);
  d.addEventListener('click',function(e){e.stopPropagation();selectPlaced(i,e.clientX,e.clientY)});
  return d;
}
var lastSig='';
function renderPlaced(){
  var l=layerEl(); if(!l)return;
  ensureFarmBtn();
  var sig=JSON.stringify(D.placed)+'|'+(GH?JSON.stringify(GH):'');
  if(sig===lastSig&&l.querySelectorAll('.v10placed').length===D.placed.length)return;
  lastSig=sig;
  l.innerHTML='';
  D.placed.forEach(function(p,i){var el=placedEl(p,i); if(el)l.appendChild(el)});
  if(GH){
    var x=byId[GH.id];
    var g=document.createElement('div');
    g.className='v10ghost w-'+x.w; g.id='v10ghost';
    g.style.left=GH.x+'%'; g.style.top=GH.y+'%';
    g.style.transform='translate(-50%,-92%) rotate('+(GH.rot||0)+'deg)';
    g.innerHTML='<img src="assets/decor/'+GH.id+'.png" alt="" draggable="false">';
    l.appendChild(g);
    bindGhostDrag(g);
  }
  ensureFarmBtn();
}
function ensureFarmBtn(){
  var fm=$('#farm .fm'); if(!fm)return;
  if(fm.querySelector('#v10farmbtn'))return;
  var b=document.createElement('button');
  b.className='btn sm'; b.id='v10farmbtn'; b.style.cssText='display:block;margin:8px 0';
  b.textContent='Trang trí nông trại';
  b.addEventListener('click',function(){v10Open('inv')});
  var yard=fm.querySelector('.yard');
  if(yard)yard.after(b); else fm.appendChild(b);
}
/* placement zone = front grass strip of the scene, so items sit on the
   ground in front of the hero farm picture instead of on its buildings */
function clampPos(x,y){
  return {x:Math.max(3,Math.min(97,x)), y:Math.max(78,Math.min(95,y))};
}
function pointToPct(e){
  var sc=sceneEl(); if(!sc)return null;
  var r=sc.getBoundingClientRect();
  return clampPos((e.clientX-r.left)/r.width*100,(e.clientY-r.top)/r.height*100);
}
function bindGhostDrag(g){
  var dragging=false;
  g.addEventListener('pointerdown',function(e){
    dragging=true; g.setPointerCapture(e.pointerId); e.preventDefault();
  });
  g.addEventListener('pointermove',function(e){
    if(!dragging||!GH)return;
    var p=pointToPct(e); if(!p)return;
    GH.x=p.x; GH.y=p.y;
    g.style.left=p.x+'%'; g.style.top=p.y+'%';
  });
  g.addEventListener('pointerup',function(){dragging=false});
  g.addEventListener('pointercancel',function(){dragging=false});
}
function showBar(){
  hideBar();
  var x=byId[GH.id];
  var bar=document.createElement('div');bar.className='v10bar';bar.id='v10bar';
  bar.innerHTML='<span class="nm">'+esc(x.n)+'</span><span class="mute" style="color:#CFE8C9">Kéo để di chuyển · bấm vào cảnh để đặt</span>'
    +'<button class="rot" onclick="v10RotateGhost()">Xoay</button>'
    +'<button class="ok" onclick="v10PlaceConfirm()">Xác nhận</button>'
    +'<button class="cancel" onclick="v10PlaceCancel()">Hủy</button>';
  document.body.appendChild(bar);
}
function hideBar(){var b=$('#v10bar');if(b)b.remove()}
window.v10PlaceStart=function(id,idx){
  if(!S.skin||S.skin!=='farm'){toast10('Bật Giao diện nông trại để đặt đồ trang trí (nút ở đầu trang)');return false}
  if(!sceneEl()){
    /* farm() rebuilds #farm and V3 garden() re-creates .scene async;
       retry shortly instead of failing */
    try{farm()}catch(e){}
    setTimeout(function(){window.v10PlaceStart(id,idx)},350);
    toast10('Đang chuẩn bị nông trại…');
    return true;
  }
  v10Close();
  if(idx==null||idx===undefined){
    if(!id||ownCount(id)<=0){toast10('Bạn chưa có vật phẩm này trong kho');return false}
    GH={id:id,x:50,y:86,rot:0,idx:-1};
  }else{
    var p=D.placed[idx]; if(!p)return false;
    GH={id:p.id,x:p.x,y:p.y,rot:p.rot||0,idx:idx};
  }
  lastSig=''; renderPlaced(); showBar();
  var sc=sceneEl();
  sc.addEventListener('pointerdown',sceneTap);
  toast10('Đang đặt '+byId[GH.id].n+' — kéo để di chuyển, bấm Xác nhận khi ưng ý');
  return true;
};
function sceneTap(e){
  if(!GH)return;
  if(e.target.closest&&e.target.closest('.v10placed'))return;
  var p=pointToPct(e); if(!p)return;
  GH.x=p.x; GH.y=p.y;
  var g=$('#v10ghost');
  if(g){g.style.left=p.x+'%';g.style.top=p.y+'%'}
}
window.v10RotateGhost=function(){
  if(!GH)return; GH.rot=(GH.rot+45)%360;
  var g=$('#v10ghost'); if(g)g.style.transform='translate(-50%,-92%) rotate('+GH.rot+'deg)';
};
function overlaps(x,y,id){
  for(var i=0;i<D.placed.length;i++){
    if(GH&&GH.idx===i)continue;
    var p=D.placed[i];
    var lim=(id==='butterflies'||p.id==='butterflies')?{dx:5,dy:4}:{dx:9,dy:6};
    if(Math.abs(p.x-x)<lim.dx&&Math.abs(p.y-y)<lim.dy)return true;
  }
  return false;
}
window.v10PlaceAt=function(x,y){if(!GH)return false;var p=clampPos(x,y);GH.x=p.x;GH.y=p.y;lastSig='';renderPlaced();return true};
window.v10PlaceConfirm=function(){
  if(!GH)return false;
  if(overlaps(GH.x,GH.y,GH.id)){
    toast10('Vị trí bị chồng lấn — kéo ra chỗ khác nhé');
    var g=$('#v10ghost'); if(g){g.classList.remove('shake');void g.offsetWidth;g.classList.add('shake')}
    return false;
  }
  var x=byId[GH.id], isNew=GH.idx===-1;
  if(isNew){D.own[GH.id]=ownCount(GH.id)-1;D.placed.push({id:GH.id,x:GH.x,y:GH.y,rot:GH.rot})}
  else{D.placed[GH.idx]={id:GH.id,x:GH.x,y:GH.y,rot:GH.rot}}
  /* season bonus: +10 XP once per item per season, in-season only */
  if(isNew&&x.s!=='all'&&x.s!=='special'&&x.s===SEASON_KEYS[curSeason()]){
    var key=x.id+'|'+new Date().getFullYear()+'-'+curSeason();
    if(!D.bonus[key]){D.bonus[key]=true;try{gain(10)}catch(e){}toast10('Đặt đúng mùa '+SEA[x.s]+'! +10 XP thưởng mùa')}
  }
  GH=null; hideBar();
  var sc=sceneEl(); if(sc)sc.removeEventListener('pointerdown',sceneTap);
  save10(); lastSig=''; renderPlaced();
  try{sfx('win')}catch(e){}
  toast10('Đã đặt '+x.n+' lên nông trại');
  return true;
};
window.v10PlaceCancel=function(){
  GH=null; hideBar();
  var sc=sceneEl(); if(sc)sc.removeEventListener('pointerdown',sceneTap);
  lastSig=''; renderPlaced();
};
window.v10Rotate=function(idx){
  var p=D.placed[idx]; if(!p)return false;
  p.rot=((p.rot||0)+45)%360; save10(); lastSig=''; renderPlaced(); return true;
};
window.v10Recall=function(idx){
  var p=D.placed[idx]; if(!p)return false;
  D.placed.splice(idx,1);
  D.own[p.id]=ownCount(p.id)+1;
  save10(); lastSig=''; renderPlaced(); renderModal();
  toast10('Đã thu hồi '+byId[p.id].n+' về kho');
  return true;
};
/* ---------- select menu for a placed item ---------- */
var menuEl=null;
function closeMenu(){if(menuEl){menuEl.remove();menuEl=null}}
function selectPlaced(idx,cx,cy){
  closeMenu();
  var p=D.placed[idx]; if(!p)return;
  var x=byId[p.id];
  $$('.v10placed').forEach(function(el){el.classList.toggle('sel',+el.dataset.idx===idx)});
  if(x.id==='tractor'){
    var img=$('.v10placed[data-idx="'+idx+'"] img');
    if(img){img.classList.remove('v10fx-engine');void img.offsetWidth;img.classList.add('v10fx-engine')}
    try{sfx('ok')}catch(e){}
    toast10('Brrr! Máy kéo khởi động!');
  }
  var m=document.createElement('div');m.className='v10menu';menuEl=m;
  m.innerHTML='<b style="padding:2px 4px">'+esc(x.n)+'</b>'
    +'<button onclick="v10PlaceStart(null,'+idx+');v10CloseMenu()">Di chuyển</button>'
    +'<button onclick="v10Rotate('+idx+');v10CloseMenu()">Xoay 45°</button>'
    +'<button onclick="v10Recall('+idx+');v10CloseMenu()">Thu hồi về kho</button>';
  document.body.appendChild(m);
  var mw=180, mh=150;
  m.style.left=Math.max(8,Math.min(innerWidth-mw-8,cx-90))+'px';
  m.style.top=Math.max(8,Math.min(innerHeight-mh-8,cy+12))+'px';
  setTimeout(function(){
    document.addEventListener('pointerdown',function h(e){
      if(menuEl&&!menuEl.contains(e.target)){closeMenu();document.removeEventListener('pointerdown',h)}
    });
  },0);
}
window.v10CloseMenu=function(){closeMenu();$$('.v10placed').forEach(function(el){el.classList.remove('sel')})};
/* ---------- entry points: shop banner + farm button + wraps ---------- */
function appendShopBanner(){
  var app=$('#app'); if(!app||app.querySelector('#v10banner'))return;
  var b=document.createElement('div');
  b.className='v10banner'; b.id='v10banner';
  b.innerHTML='<img src="assets/decor/moon_lantern.png" alt="">'
    +'<div class="grow"><b>Cửa hàng Trang trí mới</b><div class="mute">12 vật phẩm trang trí mới: cây cổ thụ, nhà nông, máy kéo, hoa anh đào, đèn trăng… Mua bằng XP hoặc 💎, đặt lên nông trại, kéo thả tùy ý.</div></div>'
    +'<button class="btn pri" onclick="v10Open(\'shop\')">Mở cửa hàng</button>';
  app.prepend(b);
}
function wrap(n,f){
  try{var o=window[n];if(typeof o==='function')window[n]=function(){var r=o.apply(this,arguments);try{f(arguments,r)}catch(e){}return r}}catch(e){}
}
wrap('farm',function(){renderPlaced()});
wrap('rShop',function(){appendShopBanner()});
document.addEventListener('visibilitychange',function(){
  document.documentElement.classList.toggle('v10pause',document.hidden);
});
var q2=0;
new MutationObserver(function(){
  if(q2)return; q2=requestAnimationFrame(function(){q2=0;renderPlaced()});
}).observe(document.body,{childList:true,subtree:true});
renderPlaced();
window.__v10={DECOR:DECOR,get D(){return D},open:window.v10Open,buy:window.v10Buy,
  placeStart:window.v10PlaceStart,placeAt:window.v10PlaceAt,placeConfirm:window.v10PlaceConfirm,
  rotate:window.v10Rotate,recall:window.v10Recall,renderPlaced:renderPlaced};
})();
