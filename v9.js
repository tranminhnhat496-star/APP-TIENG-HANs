/* ===== V9 — Complete Icon Redesign (V6 Icon Edition) =====
   Central map lives in assets/icons/v6/ICON_MAP.json; this file is the
   runtime copy. Two mechanisms, both display-only:
   1) swapOld(): <img> created by the V3 art layer from old SVG icons
      (learn/book/shop/trophy/bell/save/speaker/heart/heart_off/unknown/
      medal/medal_off + CSS-background coin) -> new v6 PNG/SVG.
   2) skin9(): remaining UI emoji text nodes -> new v6 icons.
   NOT mapped here (kept as-is): emoji that are internal data keys whose
   art already exists via V3 — pets, decor, classic bosses, crop stages,
   and everything inside garden plots (.pl), which V3 garden() reads as
   text to build crop images. V9 skips .pl subtrees entirely. */
(function(){
'use strict';
var A='assets/icons/v6/';
/* [file, dim?] — dim = greyed out (lost heart, unmet boss, muted, wilted) */
var SRC={
 'assets/icons/learn.svg':['seeds.png',0],
 'assets/icons/book.svg':['book.png',0],
 'assets/icons/shop.svg':['backpack.png',0],
 'assets/icons/trophy.svg':['defense.png',0],
 'assets/icons/bell.svg':['bell.svg',0],
 'assets/icons/save.svg':['settings.png',0],
 'assets/icons/speaker.svg':['listen.png',0],
 'assets/icons/heart.svg':['health.png',0],
 'assets/icons/heart_off.svg':['health.png',1],
 'assets/icons/unknown.svg':['question.svg',0],
 'assets/icons/medal.svg':['check.svg',0],
 'assets/icons/medal_off.svg':['boss.png',1],
 'assets/icons/coin.svg':['coin.png',0],
 'assets/icons/star.svg':['xp.png',0],
 'assets/icons/chest.svg':['chest.png',0],
 'assets/icons/bubble.svg':['speak.png',0]
};
/* emoji -> [file, dim?] — only emoji V3 does NOT map to art already */
var EMOJI={
 '💎':['gem.png',0],'⭐':['xp.png',0],'🪙':['coin.png',0],
 '🔥':['flame.svg',0],'⚔️':['attack.png',0],'⚔':['attack.png',0],
 '🎁':['chest.png',0],'👑':['boss.png',0],'🌾':['harvest.png',0],
 '☀️':['weather.png',0],'☀':['weather.png',0],'🌙':['moon.svg',0],
 '🔇':['listen.png',1],'💧':['water.png',0],'💔':['health.png',1],
 '🎯':['quest.png',0],'🔒':['lock.svg',0],'📚':['book.png',0],
 '🧺':['harvest.png',0],'🏁':['energy.png',0],'⚡':['energy.png',0],
 '🛡':['defense.png',0],'🌿':['seeds.png',0],'🌊':['water.png',0],
 '🔮':['gem.png',0],'☠️':['boss.png',0],'☠':['boss.png',0],
 '🥀':['wilt.svg',1],'🐛':['wilt.svg',1]
};
var SKIP=/^(TEXTAREA|OPTION|SELECT|SCRIPT|STYLE|INPUT)$/;
function escRe(s){return s.replace(/[\\^$.*+?()[\]{}|]/g,'\\$&')}
var RE=new RegExp(Object.keys(EMOJI).sort(function(a,b){return b.length-a.length}).map(escRe).join('|'),'g');
function mkImg(file,dim){
  var i=new Image();i.src=A+file;i.className='ic v9i'+(dim?' dim':'');
  i.alt='';i.draggable=false;
  i.onerror=function(){i.replaceWith(document.createTextNode(''))};
  return i;
}
function swapImg(im){
  if(!im||im.dataset.v9)return;
  var m=SRC[im.getAttribute('src')||''];
  if(!m)return;
  im.dataset.v9='1';im.src=A+m[0];
  im.classList.add('v9i');if(m[1])im.classList.add('dim');
}
function swapAll(root){
  if(!root||!root.querySelectorAll)return;
  var list=root.querySelectorAll('img[src*="assets/icons/"]');
  for(var i=0;i<list.length;i++)swapImg(list[i]);
  if(root.tagName==='IMG')swapImg(root);
}
function skin9(root){
  if(!root||!root.ownerDocument)return;
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
    var p=n.parentNode;
    if(!p||SKIP.test(p.nodeName))return NodeFilter.FILTER_REJECT;
    if(p.nodeType===1&&p.closest&&p.closest('.pl'))return NodeFilter.FILTER_REJECT;
    RE.lastIndex=0;
    return RE.test(n.data)?(RE.lastIndex=0,NodeFilter.FILTER_ACCEPT):(RE.lastIndex=0,NodeFilter.FILTER_REJECT);
  }}),L=[];
  while(w.nextNode())L.push(w.currentNode);
  L.forEach(function(n){
    var f=document.createDocumentFragment(),p=0,m;
    RE.lastIndex=0;
    while((m=RE.exec(n.data))){
      var e=EMOJI[m[0]];if(!e)continue;
      f.append(n.data.slice(p,m.index),mkImg(e[0],e[1]));
      p=m.index+m[0].length;
    }
    f.append(n.data.slice(p));n.replaceWith(f);
  });
}
/* text-only buttons get an icon too (HUD + main action buttons) */
function enhanceHud(){
  var h=document.querySelector('#v7hud');if(!h)return;
  var btns=h.querySelectorAll('.v7btn');
  for(var i=0;i<btns.length;i++){
    var b=btns[i],t=b.textContent||'';
    var f=t.indexOf('Nhiệm vụ')===0?'quest.png':t.indexOf('Thành tựu')===0?'defense.png':null;
    if(f&&!b.querySelector('.v9i'))b.insertBefore(mkImg(f,0),b.firstChild);
  }
}
var BTN_ICONS=[
 ['Nghe','listen.png'],['Thu hoạch','harvest.png'],['Cứu tất cả','health.png'],
 ['Đấu boss mới','attack.png'],['Đấu lại','attack.png'],['Quản lý bộ','book.png']
];
function enhanceButtons(){
  var btns=document.querySelectorAll('#app button, #farm button, .acts button');
  for(var i=0;i<btns.length;i++){
    var b=btns[i];
    if(b.querySelector('img'))continue;
    var t=(b.textContent||'').trim();
    for(var j=0;j<BTN_ICONS.length;j++){
      if(t.indexOf(BTN_ICONS[j][0])===0){b.insertBefore(mkImg(BTN_ICONS[j][1],0),b.firstChild);break}
    }
  }
}
if(typeof window.syncHud==='function'){
  var _syncHud=window.syncHud;
  window.syncHud=function(){_syncHud();enhanceHud()};
}
function run(){
  try{skin9(document.body)}catch(e){}
  try{swapAll(document.body)}catch(e){}
  try{enhanceHud()}catch(e){}
  try{enhanceButtons()}catch(e){}
}
var q=0;
new MutationObserver(function(){if(!q)q=requestAnimationFrame(function(){q=0;run()})})
  .observe(document.body,{childList:true,subtree:true});
run();
window.__v9={SRC:SRC,EMOJI:EMOJI,run:run,enhanceHud:enhanceHud};
})();
