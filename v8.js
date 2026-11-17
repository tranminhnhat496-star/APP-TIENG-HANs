/* ===== V8 — Farm Scene Premium =====
   Rebuilds ONLY the .scene area. No game logic, no weather system, no
   farm data touched. V5's weather button + well onclick are preserved
   (elements are moved/restyled, never recreated). */
(function(){
'use strict';
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var WX={
 sun:{label:'Nắng',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="#F2A007" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5" fill="#FFD964" stroke="none"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/></svg>'},
 rain:{label:'Mưa nhẹ',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="#5B8DEF" stroke-width="2" stroke-linecap="round"><path d="M7 13a5 5 0 1 1 .8-9.93A6 6 0 0 1 19 8a4 4 0 0 1-1 7.9H7z" fill="#BFD7F5" stroke="#5B8DEF"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/></svg>'},
 storm:{label:'Mưa lớn',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="#5B6ABF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 12a5 5 0 1 1 .8-9.93A6 6 0 0 1 19 7a4 4 0 0 1-1 7.9H7z" fill="#8FA8D8" stroke="#3D4A7A"/><path d="M13 13l-3 5h4l-3 5" fill="#FFD964" stroke="#B97A00"/></svg>'},
 rainbow:{label:'Cầu vồng',icon:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round"><path d="M4 19a8 8 0 0 1 16 0" stroke="#FF7A7A"/><path d="M6.5 19a5.5 5.5 0 0 1 11 0" stroke="#FFC25A"/><path d="M9 19a3 3 0 0 1 6 0" stroke="#7BD88F"/></svg>'}
};
var MILL='<svg viewBox="0 0 100 100"><g stroke="#8B5E3C" stroke-width="3" stroke-linejoin="round" fill="#FFF8E1">'
 +'<g><path d="M50 50 L43 6 Q50 0 57 6 Z"/><path d="M46 22h8M47 34h6" stroke-width="2"/></g>'
 +'<g transform="rotate(90 50 50)"><path d="M50 50 L43 6 Q50 0 57 6 Z"/><path d="M46 22h8M47 34h6" stroke-width="2"/></g>'
 +'<g transform="rotate(180 50 50)"><path d="M50 50 L43 6 Q50 0 57 6 Z"/><path d="M46 22h8M47 34h6" stroke-width="2"/></g>'
 +'<g transform="rotate(270 50 50)"><path d="M50 50 L43 6 Q50 0 57 6 Z"/><path d="M46 22h8M47 34h6" stroke-width="2"/></g>'
 +'</g><circle cx="50" cy="50" r="7" fill="#8B5E3C" stroke="#5A3A22" stroke-width="2.5"/></svg>';
function el(cls,html){var d=document.createElement('div');d.className=cls;if(html!=null)d.innerHTML=html;return d}
function img(src,cls){var i=new Image();i.src=src;i.alt='';i.draggable=false;if(cls)i.className=cls;i.onerror=function(){i.remove()};return i}
function syncWx(sc){
  var b=sc.querySelector('.v5wbtn');if(!b)return;
  var w=WX[sc.dataset.w]||WX.sun;
  var html=w.icon+'<span>'+w.label+'</span>';
  if(b.innerHTML!==html)b.innerHTML=html;
  b.setAttribute('aria-label','Thời tiết: '+w.label+' — bấm để đổi');
}
function upgrade(sc){
  if(!sc.classList.contains('v5d'))return;
  syncWx(sc);
  if(sc.classList.contains('v8d'))return;
  sc.classList.add('v8d');sc.classList.add('v8');
  sc.appendChild(el('v8bg'));
  var hero=el('v8hero');hero.appendChild(img('assets/scene/farm_top.png'));sc.appendChild(hero);
  sc.appendChild(el('v8mill',MILL));
  sc.appendChild(el('v8pond','<i></i><i></i>'));
  var tL=el('v8tree l');tL.appendChild(img('assets/decor/tree.svg'));sc.appendChild(tL);
  var tR=el('v8tree r');tR.appendChild(img('assets/decor/maple.svg'));sc.appendChild(tR);
  var tL2=el('v8tree l2');tL2.appendChild(img('assets/decor/sakura.svg'));sc.appendChild(tL2);
  var bL=el('v8bush l');bL.appendChild(img('assets/scene/meadow.png'));sc.appendChild(bL);
  var bR=el('v8bush r');bR.appendChild(img('assets/scene/meadow.png'));sc.appendChild(bR);
  sc.appendChild(el('v8fg'));
  sc.appendChild(el('v8fence'));
  sc.appendChild(el('v8glow'));
  var f1=el('v8bfly b1');f1.appendChild(img('assets/decor/butterflies.svg'));sc.appendChild(f1);
  var f2=el('v8bfly b2');f2.appendChild(img('assets/decor/butterflies.svg'));sc.appendChild(f2);
}
function run(){$$('#farm .scene').forEach(upgrade)}
var q=0;
new MutationObserver(function(){if(!q)q=requestAnimationFrame(function(){q=0;run()})})
 .observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-w','class']});
run();
window.__v8={upgrade:upgrade,syncWx:syncWx,run:run};
})();
