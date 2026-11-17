/* ===== V5 ULTIMATE (v7 layer) — built on V6, KEY hanvocab.v1 unchanged ===== */
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var esc0=window.esc||function(s){return String(s==null?'':s)};
var R=matchMedia('(prefers-reduced-motion:reduce)').matches;
var TODAY=function(){return new Date().toDateString()};
var DAYNO=function(){return Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5)};
function def(o,k,v){if(o[k]===undefined)o[k]=v;return o[k]}
/* ---------- Migration: never touch cards/decks/xp/dex/bw ---------- */
S.v7=S.v7||{};
var V=S.v7;
def(V,'gems',0); def(V,'ach',{}); def(V,'plots',[]); def(V,'boss8',{});
def(V,'dq',{d:0,ok:0,boss:0,water:0,done:{}}); def(V,'wq',{w:0,master:0,boss:0,done:{}});
def(V,'totalOk',0); def(V,'harvests',0); def(V,'lastLogin',''); def(V,'chest','');
def(V,'musicOn',false); def(V,'vol',0.5); def(V,'night',null); def(V,'gemOwn',[]);
def(V,'soundOn',true);
if(V.night===null){var h=new Date().getHours(); V.night=(h>=19||h<6)}
document.documentElement.dataset.v7night=V.night?'1':'';
function save7(){try{save()}catch(e){}}
/* ---------- Toast / floating numbers / particles ---------- */
function toast(t,ms){var d=document.createElement('div');d.className='v7toast';d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove()},ms||2600)}
function dmgNum(txt,x,y,cls){if(R)return;var d=document.createElement('div');d.className='v7dmg '+(cls||'');d.textContent=txt;var r={x:x||innerWidth/2,y:y||innerHeight/3};d.style.left=(r.x-20)+'px';d.style.top=r.y+'px';document.body.appendChild(d);setTimeout(function(){d.remove()},1000)}
function burstAt(x,y,n){if(window.v4burst&&!R)try{v4burst(x,y,n||8)}catch(e){}}
/* ---------- Sound: WebAudio SFX + pentatonic music loop ---------- */
var AC2=null, musicTimer=null, musicStep=0;
var MELODY=[523,587,659,784,880,784,659,587,523,0,659,784,880,1047,880,784];
function ac(){try{AC2=AC2||new (window.AudioContext||window.webkitAudioContext)(); if(AC2.state==='suspended')AC2.resume(); return AC2}catch(e){return null}}
function tone(f,dl,d,type,vol){if(!V.soundOn)return;var c=ac();if(!c)return;try{var o=c.createOscillator(),g=c.createGain(),t=c.currentTime+(dl||0);o.type=type||'sine';o.frequency.value=f;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime((vol||0.12)*(V.vol+0.2),t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+d+0.02)}catch(e){}}
function v7sfx(k){
  if(k==='plant'){tone(392,0,.12);tone(523,.08,.15)}
  else if(k==='water'){tone(880,0,.08,'sine',.07);tone(660,.07,.1,'sine',.07);tone(990,.14,.12,'sine',.07)}
  else if(k==='coin'){tone(988,0,.09);tone(1319,.07,.16)}
  else if(k==='hit'){tone(220,0,.12,'sawtooth',.14);tone(180,.05,.12,'sawtooth',.12)}
  else if(k==='bossHit'){tone(150,0,.18,'sawtooth',.16)}
  else if(k==='gem'){tone(1047,0,.1);tone(1319,.08,.1);tone(1568,.16,.22)}
  else if(k==='chest'){tone(523,0,.12);tone(659,.1,.12);tone(784,.2,.12);tone(1047,.3,.3)}
}
function musicTick(){if(!V.musicOn)return;var f=MELODY[musicStep%MELODY.length];musicStep++;if(f)tone(f,0,.32,'triangle',.05)}
function setMusic(on){V.musicOn=!!on;save7();if(on){if(!musicTimer)musicTimer=setInterval(musicTick,340);toast('Đã bật nhạc nền')}else{if(musicTimer){clearInterval(musicTimer);musicTimer=null}toast('Đã tắt nhạc nền')}syncHud()}
/* ---------- Achievements / quests ---------- */
var ACH=[
 {id:'a1',icon:'🌱',n:'Hạt mầm đầu tiên',d:'Trả lời đúng 1 câu',ok:function(){return V.totalOk>=1}},
 {id:'a2',icon:'📚',n:'Chăm chỉ',d:'Trả lời đúng 50 câu',ok:function(){return V.totalOk>=50}},
 {id:'a3',icon:'👑',n:'Bậc thầy Hangul',d:'Trả lời đúng 200 câu',ok:function(){return V.totalOk>=200}},
 {id:'a4',icon:'⭐',n:'Cấp 5',d:'Đạt Lv 5',ok:function(){return 1+Math.floor((S.xp||0)/100)>=5}},
 {id:'a5',icon:'💎',n:'Cấp 10',d:'Đạt Lv 10',ok:function(){return 1+Math.floor((S.xp||0)/100)>=10}},
 {id:'a6',icon:'⚔️',n:'Thợ săn boss',d:'Hạ 1 boss bất kỳ',ok:function(){return bossWins()>=1}},
 {id:'a7',icon:'🏆',n:'Vua đấu trường',d:'Hạ cả 8 boss V5',ok:function(){return Object.keys(V.boss8).length>=8}},
 {id:'a8',icon:'🔥',n:'Chuỗi 7 ngày',d:'Học liên tiếp 7 ngày',ok:function(){return (typeof streak==='function'?streak():0)>=7}},
 {id:'a9',icon:'🌾',n:'Vườn thuộc lòng',d:'Thuộc 20 từ (mức nhớ ≥ 3)',ok:function(){return CS().filter(function(c){return c.box>=3}).length>=20}},
 {id:'a10',icon:'🧺',n:'Nông dân chăm chỉ',d:'Thu hoạch 10 lần',ok:function(){return V.harvests>=10}},
 {id:'a11',icon:'🏁',n:'Tốc độ ánh sáng',d:'Đạt 100 điểm Đua 60 giây',ok:function(){return (S.best||0)>=100}},
 {id:'a12',icon:'📖',n:'Nhà sưu tầm',d:'Có 100 từ vựng',ok:function(){return S.cards.length>=100}}
];
function bossWins(){var n=Object.values(V.boss8).reduce(function(a,b){return a+(b||0)},0);try{n+=Object.values(S.dex||{}).reduce(function(a,b){return a+(b||0)},0)}catch(e){}try{n+=Object.values((S.bw&&S.bw.dex)||{}).reduce(function(a,b){return a+(b||0)},0)}catch(e){}return n}
function checkAch(){var changed=false;ACH.forEach(function(a){if(!V.ach[a.id]&&a.ok()){V.ach[a.id]=Date.now();V.gems+=3;changed=true;toast('🏆 Thành tựu: '+a.n+' (+3 💎)');v7sfx('gem');try{confetti()}catch(e){}}});if(changed)save7()}
function dq(){if(V.dq.d!==DAYNO())V.dq={d:DAYNO(),ok:0,boss:0,water:0,done:{}};return V.dq}
function wq(){var w=Math.floor(DAYNO()/7);if(V.wq.w!==w)V.wq={w:w,master:0,boss:0,done:{}};return V.wq}
function trackOk(){V.totalOk++;var d=dq();d.ok++;if(d.ok>=10&&!d.done.ok){d.done.ok=1;gain(15);V.gems+=1;toast('Nhiệm vụ ngày: 10 câu đúng! +15 XP, +1 💎')}save7();checkAch()}
function trackMaster(){var w=wq();w.master++;if(w.master>=5&&!w.done.master){w.done.master=1;gain(60);V.gems+=5;toast('Nhiệm vụ tuần: thuộc 5 từ mới! +60 XP, +5 💎')}save7();checkAch()}
function trackBossWin(){var d=dq(),w=wq();d.boss++;w.boss++;if(d.boss>=1&&!d.done.boss){d.done.boss=1;gain(20);V.gems+=2;toast('Nhiệm vụ ngày: hạ 1 boss! +20 XP, +2 💎')}if(w.boss>=3&&!w.done.boss){w.done.boss=1;gain(80);V.gems+=5;toast('Nhiệm vụ tuần: hạ 3 boss! +80 XP, +5 💎')}save7();checkAch()}
/* ---------- Wrap core functions (same pattern as V3/V4) ---------- */
function wrap(n,f){try{var o=window[n];if(typeof o==='function')window[n]=function(){var r=o.apply(this,arguments);try{f(arguments,r)}catch(e){}return r}}catch(e){}}
wrap('mark',function(a){var ok=a[0];if(ok)trackOk();if(ok&&cur&&cur.box===3)trackMaster()});
wrap('harvest',function(){V.harvests++;var d=dq();save7();checkAch()});
wrap('gain',function(){checkAch()});
/* ---------- HUD ---------- */
function coins0(){try{return coins()}catch(e){return (S.xp||0)-(S.spent||0)}}
function syncHud(){var h=$('#v7hud');if(!h)return;var lv=1+Math.floor((S.xp||0)/100);
 h.innerHTML='<span class="chip">⭐ Lv <b>'+lv+'</b></span><span class="chip">🪙 <b>'+coins0()+'</b> XP</span><span class="chip gem">💎 <b>'+V.gems+'</b></span><span class="chip">🔥 <b>'+(typeof streak==='function'?streak():0)+'</b> ngày</span>'+
 '<button class="v7btn" onclick="v7Open(\'quest\')">Nhiệm vụ</button><button class="v7btn" onclick="v7Open(\'ach\')">Thành tựu</button><button class="v7btn gold" onclick="v7Chest()">🎁 Rương</button>'+
 '<button class="v7btn" onclick="v7ToggleMusic()">'+(V.musicOn?'🔊 Nhạc: bật':'🔇 Nhạc: tắt')+'</button>'+
 '<button class="v7btn" onclick="v7ToggleNight()">'+(V.night?'🌙 Đêm':'☀️ Ngày')+'</button>'+
 '<button class="v7btn pri" onclick="v7Open(\'boss\')">⚔️ Đấu Boss</button>';
}
window.v7ToggleMusic=function(){setMusic(!V.musicOn)};
window.v7ToggleNight=function(){V.night=!V.night;document.documentElement.dataset.v7night=V.night?'1':'';save7();syncHud()};
/* ---------- Farm plots ---------- */
var CROPS=['carrot','tomato','wheat','strawberry','sunflower'];
function plotStage(p){var c=S.cards.find(function(x){return x.id===p.cardId});if(!c)return 0;return Math.min(4,Math.max(0,c.box)+(p.watered===TODAY()?1:0))}
function ensurePlots(){if(V.plots.length)return;for(var i=0;i<6;i++)V.plots.push({cardId:'',watered:''})}
function renderFarm(){ensurePlots();var host=$('#v7farm');if(!host)return;
 var due=CS().filter(function(c){return c.due<=Date.now()});
 host.innerHTML='<div class="v7plots">'+V.plots.map(function(p,i){
   var c=S.cards.find(function(x){return x.id===p.cardId});
   if(!c)return '<div class="v7plot" onclick="v7Plant('+i+')"><span style="font-size:34px">🌱</span><span class="nm">Luống trống</span><span class="st2">Bấm để gieo hạt</span></div>';
   var st=plotStage(p),ripe=c.box>=4;
   return '<div class="v7plot '+(p.watered===TODAY()?'watered ':'')+(ripe?'ripe':'')+'" onclick="v7PlotTap('+i+')"><img src="assets/crops/'+CROPS[i%CROPS.length]+'_'+st+'.png" alt="" onerror="this.style.display=\'none\'"><span class="nm">'+esc0(c.h)+'</span><span class="st2">'+(ripe?'Đã chín — bấm để thu hoạch':('Giai đoạn '+(st+1)+'/5'+(p.watered===TODAY()?' · đã tưới':'')))+'</span></div>';
 }).join('')+'</div><div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="v7btn pri" onclick="v7WaterAll()">💧 Tưới tất cả</button><span class="mute" style="align-self:center">Tưới mỗi luống 1 lần/ngày được +2 XP. Trả lời đúng từ đó thì cây lớn thêm.</span></div>';
}
window.v7Plant=function(i){var due=CS().filter(function(c){return c.due<=Date.now()});var pool=due.length?due:CS();if(!pool.length){toast('Chưa có từ để gieo — hãy thêm từ vựng trước');return}var c=pool[Math.floor(Math.random()*pool.length)];V.plots[i]={cardId:c.id,watered:''};v7sfx('plant');save7();renderFarm();toast('Đã gieo “'+c.h+'” vào luống '+(i+1))};
window.v7PlotTap=function(i){var p=V.plots[i];if(!p||!p.cardId)return;var c=S.cards.find(function(x){return x.id===p.cardId});if(!c){p.cardId='';renderFarm();return}
 if(c.box>=4){var xp=8;V.harvests++;gain(xp);v7sfx('coin');burstAt(innerWidth/2,innerHeight/2,10);c.box=2;c.due=Date.now()+72e5;V.plots[i]={cardId:'',watered:''};toast('Thu hoạch “'+c.h+'”! +'+xp+' XP');save7();renderFarm();if(typeof farm==='function')farm();checkAch();return}
 if(p.watered!==TODAY()){p.watered=TODAY();gain(2);v7sfx('water');var d=dq();d.water++;if(d.water>=3&&!d.done.water){d.done.water=1;gain(15);V.gems+=1;toast('Nhiệm vụ ngày: tưới 3 luống! +15 XP, +1 💎')}toast('Đã tưới “'+c.h+'” +2 XP');save7();renderFarm()}else toast('Luống này hôm nay đã tưới rồi — hãy trả lời đúng từ “'+c.h+'” để cây lớn')};
window.v7WaterAll=function(){var n=0;V.plots.forEach(function(p,i){if(p.cardId&&p.watered!==TODAY()){p.watered=TODAY();n++}});if(n){gain(2*n);v7sfx('water');toast('Đã tưới '+n+' luống +'+(2*n)+' XP')}else toast('Các luống hôm nay đã được tưới');save7();renderFarm()};
/* ---------- Grammar bank (real questions, not fake) ---------- */
var GRAMMAR=[
 {q:'“저는 학생___.” — chọn trợ từ chủ ngữ đúng',o:['은','를','에','에서'],a:0,ex:'은/는 đánh dấu chủ ngữ / chủ đề.'},
 {q:'“책___ 읽어요.” — chọn trợ từ tân ngữ đúng',o:['이','을','은','에'],a:1,ex:'을/를 đánh dấu tân ngữ.'},
 {q:'“학교___ 가요.” — chọn trợ từ nơi đến đúng',o:['에서','에','를','와'],a:1,ex:'에 chỉ nơi đến / thời điểm.'},
 {q:'“집___ 공부해요.” — chọn trợ từ nơi chốn đúng',o:['에','에서','을','의'],a:1,ex:'에서 chỉ nơi diễn ra hành động.'},
 {q:'“저___ 친구___ 영화를 봐요.” — cặp trợ từ đúng',o:['는 / 와','를 / 에','에 / 를','은 / 에서'],a:0,ex:'는 = chủ đề, 와/과 = cùng với.'},
 {q:'“먹다” ở thì hiện tại kính ngữ là…',o:['먹어요','먹었어요','먹을 거예요','먹지 마세요'],a:0,ex:'먹다 → 먹어요 (đuôi -아/어요).'},
 {q:'“가다” ở thì quá khứ là…',o:['가요','갔어요','갈 거예요','가지 마세요'],a:1,ex:'가다 → 갔어요 (quá khứ -았/었어요).'},
 {q:'“공부하다” ở thì tương lai là…',o:['공부해요','공부했어요','공부할 거예요','공부하고 싶어요'],a:2,ex:'-을/ㄹ 거예요 = sẽ làm gì.'},
 {q:'“선생님___ 말씀하세요.” — kính ngữ đúng',o:['이','께','을','에서'],a:1,ex:'에게 → 께 khi nói với người lớn tuổi / thầy cô.'},
 {q:'“주세요” trong “물 주세요” có nghĩa là…',o:['Đừng làm','Hãy cho tôi','Muốn làm','Đã làm'],a:1,ex:'-아/어 주세요 = hãy làm giúp tôi.'},
 {q:'“먹지 마세요” có nghĩa là…',o:['Hãy ăn đi','Đừng ăn','Muốn ăn','Đã ăn'],a:1,ex:'-지 마세요 = đừng làm gì.'},
 {q:'“한국어를 배우고 싶어요” — “-고 싶어요” nghĩa là…',o:['Đã làm','Muốn làm','Đừng làm','Phải làm'],a:1,ex:'-고 싶어요 = muốn làm gì.'},
 {q:'“이것은 제 책___.” — trợ từ sở hữu đúng',o:['의','에','를','와'],a:0,ex:'의 = của.'},
 {q:'“저도 학생이에요.” — “도” nghĩa là…',o:['Chỉ','Cũng','Chỉ có','Không'],a:1,ex:'도 = cũng.'},
 {q:'“사과만 먹어요.” — “만” nghĩa là…',o:['Cũng','Chỉ','Cùng','Không'],a:1,ex:'만 = chỉ.'},
 {q:'“비가 ___ 우산을 가져가요.” — nối câu nguyên nhân đúng',o:['오고','와서','오면','오니까'],a:1,ex:'-아/어서 = vì / nên (nguyên nhân).'},
 {q:'“시간이 ___ 영화를 봐요.” — nối câu “khi” đúng',o:['있으면','있을 때','있고','있어서'],a:1,ex:'-을/ㄹ 때 = khi…'},
 {q:'“밥을 먹고 학교에 가요.” — “-고” ở đây nghĩa là…',o:['Và / rồi','Nhưng','Vì','Nếu'],a:0,ex:'-고 nối hai hành động liên tiếp.'},
 {q:'“이 가방은 ___?” — hỏi giá đúng',o:['얼마예요','어디예요','누구예요','언제예요'],a:0,ex:'얼마 = bao nhiêu tiền.'},
 {q:'“지금 ___ 시예요?” — hỏi giờ đúng',o:['몇','무엇','어느','어떻게'],a:0,ex:'몇 시 = mấy giờ.'},
 {q:'“저는 어제 영화를 ___.” — quá khứ của “보다”',o:['봐요','봤어요','볼 거예요','보지 마세요'],a:1,ex:'보다 → 봤어요.'},
 {q:'“친구를 ___.” — “gặp bạn” đúng',o:['만나요','가요','먹어요','읽어요'],a:0,ex:'친구를 만나요 = gặp bạn.'},
 {q:'“한국어 ___ 어려워요.” — trợ từ chủ ngữ cho tính từ',o:['가','를','에','와'],a:0,ex:'이/가 đi với tính từ mô tả chủ ngữ.'},
 {q:'“저는 내일 서울___ 가요.” — chọn đúng',o:['에','에서','를','의'],a:0,ex:'서울에 가요 = đi đến Seoul.'}
];
/* ---------- 8 Bosses V5 ---------- */
var TIGER_SVG='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="60" cy="45" r="28" fill="#F2A007"/><circle cx="140" cy="45" r="28" fill="#F2A007"/><circle cx="60" cy="45" r="14" fill="#FFD964"/><circle cx="140" cy="45" r="14" fill="#FFD964"/><ellipse cx="100" cy="115" rx="82" ry="78" fill="#F2A007"/><path d="M40 60l20 8M160 60l-20 8M35 95l22 5M165 95l-22 5M38 130l22-3M162 130l-22-3" stroke="#3A2E22" stroke-width="7" stroke-linecap="round"/><ellipse cx="72" cy="105" rx="13" ry="17" fill="#fff"/><ellipse cx="128" cy="105" rx="13" ry="17" fill="#fff"/><circle cx="72" cy="108" r="7" fill="#222"/><circle cx="128" cy="108" r="7" fill="#222"/><ellipse cx="100" cy="145" rx="22" ry="14" fill="#FFF6E3"/><path d="M92 140h16l-8 10z" fill="#D9503F"/><path d="M85 158q15 12 30 0" stroke="#3A2E22" stroke-width="5" fill="none" stroke-linecap="round"/></svg>');
var BOSSES=[
 {id:'U1',n:'Yêu Tinh Từ Vựng',kr:'도깨비',en:'Vocabulary Goblin',art:'assets/bosses/dokkaebi.png',r:'Hiếm',rc:'#2E9B52',hp:8,mode:'vocab',skill:'Bẫy từ: mỗi 3 lượt, đáp án gây nhiễu xuất hiện và chỉ có 8 giây.',xp:40},
 {id:'U2',n:'Rồng Ngữ Pháp',kr:'용',en:'Grammar Dragon',art:'assets/bosses/yong.png',r:'Sử thi',rc:'#7B4FD8',hp:12,mode:'grammar',skill:'Hỏa công: mỗi 4 lượt, trả lời sai mất thêm 1 tim.',xp:60},
 {id:'U3',n:'Ma Nghe',kr:'귀신',en:'Listening Phantom',art:'assets/bosses/gwisin.png',r:'Sử thi',rc:'#5B6ABF',hp:10,mode:'listen',skill:'Ẩn hình: bạn chỉ được NGHE, không thấy chữ Hàn. Mỗi 3 lượt, đáp án mờ đi 2 giây.',xp:60},
 {id:'U4',n:'Quái Chính Tả',kr:'강시',en:'Spelling Monster',art:'assets/bosses/gangsi.png',r:'Hiếm',rc:'#3D5A80',hp:10,mode:'type',skill:'Hút máu: trả lời sai, boss hồi 1 máu. Mỗi câu có 10 giây.',xp:50},
 {id:'U5',n:'Hổ Hàn Quốc',kr:'호랑이',en:'Korean Tiger',art:TIGER_SVG,r:'Sử thi',rc:'#E8821E',hp:11,mode:'speed',skill:'Vồ nhanh: mỗi câu chỉ có 6 giây. Combo từ 3 trở lên gây gấp đôi sát thương.',xp:60},
 {id:'U6',n:'Bậc Thầy Bóng Tối',kr:'그림자',en:'Shadow Master',art:'assets/bosses/gangsi_alt.png',r:'Huyền thoại',rc:'#4A3A6B',hp:13,mode:'sentence',skill:'Ảo ảnh câu: chọn đúng thứ tự câu. Mỗi 3 lượt chỉ có 7 giây.',xp:80},
 {id:'U7',n:'Vệ Binh Vàng',kr:'황금 수호자',en:'Golden Guardian',art:'assets/bosses/v6_bingo.png',r:'Huyền thoại',rc:'#B97A00',hp:13,mode:'match',skill:'Khiên vàng: mỗi 4 lượt, câu đúng đầu tiên chỉ phá khiên. Mỗi câu có 8 giây.',xp:80},
 {id:'U8',n:'Vua Từ Vựng',kr:'왕',en:'Korean Vocabulary King',art:'assets/bosses/v6_hac.png',r:'Thần thoại',rc:'#C0452F',hp:16,mode:'king',skill:'Vua toàn năng: mỗi lượt đổi dạng (từ vựng / ngữ pháp / nghe / chính tả / xếp câu). Dưới 50% máu: biến hình, sai mất 2 tim, 20% né đòn.',xp:100}
];
var B7=null;
function bossArt(b){return b.art.indexOf('data:')===0?b.art:b.art}
function openModal(html){closeModal();var d=document.createElement('div');d.className='v7modal';d.id='v7modal';d.innerHTML='<div class="v7box">'+html+'</div>';d.addEventListener('click',function(e){if(e.target===d)closeModal()});document.body.appendChild(d)}
function closeModal(){var m=$('#v7modal');if(m)m.remove();if(B7&&B7.iv)clearInterval(B7.iv);if(B7&&B7.iv2)clearInterval(B7.iv2);B7=null}
window.v7Close=function(){closeModal();syncHud()};
function bossMapHtml(){return '<h2>⚔️ Đấu trường 8 Boss — V5 Ultimate</h2><p class="mute">Đã hạ '+Object.keys(V.boss8).length+'/8 boss. Mỗi boss là một dạng thử thách thật, dùng chính từ vựng của bạn (trừ boss ngữ pháp dùng ngân hàng câu hỏi thật). Thắng nhận XP + 💎, lần đầu +5 💎.</p><div class="v7bossgrid">'+BOSSES.map(function(b){var w=V.boss8[b.id]||0;return '<div class="v7bosscard"><img src="'+bossArt(b)+'" alt="" onerror="this.style.display=\'none\'"><div><b>'+b.n+'</b><br><span style="font:700 18px \'Noto Sans KR\'">'+b.kr+'</span> · '+b.en+'</div><div><span class="rare" style="background:'+b.rc+'">'+b.r+'</span> <span class="mute">· '+b.hp+' máu</span></div><div class="mute" style="font-size:12px">'+b.skill+'</div><div class="mute">'+(w?'Đã hạ '+w+' lần':'Chưa hạ')+'</div><button class="v7btn pri" style="margin-top:8px" onclick="v7BossStart(\''+b.id+'\')">Khiêu chiến</button></div>'}).join('')+'</div><div class="acts"><button class="v7btn" onclick="v7Close()">Đóng</button></div>'}
function pickCard(exId){var p=CS();if(!p.length)return null;var c;do{c=p[Math.floor(Math.random()*p.length)]}while(p.length>1&&exId&&c.id===exId);return c}
function mkOpts7(c){var pool=CS().filter(function(x){return x.id!==c.id&&x.m!==c.m});var d=shuffle(pool).slice(0,3);return shuffle([c].concat(d)).map(function(x){return x.id})}
function sentenceQ(c){var toks=(c.e||'').trim().split(/\s+/).filter(Boolean);if(toks.length<3)return null;var opts=[c.e];var seen={};seen[c.e]=1;var guard=0;while(opts.length<4&&guard++<20){var s=shuffle(toks.slice()).join(' ');if(!seen[s]){seen[s]=1;opts.push(s)}}return {toks:toks,opts:shuffle(opts),ans:c.e}}
function nextQ(){var b=B7, boss=b.boss; b.turn++;
 var mode=boss.mode; if(mode==='king'){var kinds=['vocab','grammar','listen','type','sentence'];mode=kinds[Math.floor(Math.random()*kinds.length)]}
 b.qmode=mode; b.pick=null; b.lock=false; clearInterval(b.iv); clearInterval(b.iv2); b.t0=Date.now();
 b.shield=(boss.id==='U7'&&b.turn%4===1)?1:0;
 b.lim=0;
 if(mode==='grammar'){var g=GRAMMAR[Math.floor(Math.random()*GRAMMAR.length)];b.g=g;b.opts=g.o;b.q={kind:'grammar',prompt:g.q,ans:g.a}}
 else if(mode==='sentence'){var c0=pickCard(b.lastId);var sq=null,guard=0;while(!sq&&guard++<12){c0=pickCard(b.lastId);sq=c0?sentenceQ(c0):null}if(!sq){b.qmode='vocab';mode='vocab'}else{b.card=c0;b.lastId=c0.id;b.q={kind:'sentence',prompt:'Xếp đúng thứ tự câu có từ “'+c0.h+'” ('+c0.m+')',opts:sq.opts,ans:sq.ans}}}
 if(mode==='vocab'||mode==='speed'||mode==='match'){var c=pickCard(b.lastId);if(!c){toast('Cần ít nhất 2 từ vựng để đấu boss');closeModal();return}b.card=c;b.lastId=c.id;b.opts=mkOpts7(c);b.q={kind:'vocab',prompt:c.h,ans:c.id}}
 if(mode==='listen'){var c2=pickCard(b.lastId);if(!c2){toast('Cần ít nhất 2 từ vựng để đấu boss');closeModal();return}b.card=c2;b.lastId=c2.id;b.opts=mkOpts7(c2);b.q={kind:'listen',prompt:'Nghe và chọn nghĩa đúng',ans:c2.id}}
 if(mode==='type'){var c3=pickCard(b.lastId);if(!c3){toast('Cần ít nhất 2 từ vựng để đấu boss');closeModal();return}b.card=c3;b.lastId=c3.id;b.q={kind:'type',prompt:c3.m,ans:c3.h}}
 if(boss.id==='U1'&&b.turn%3===0)b.lim=8000;
 if(boss.id==='U2'&&b.turn%4===0)b.lim=8000;
 if(boss.id==='U4')b.lim=10000;
 if(boss.id==='U5')b.lim=6000;
 if(boss.id==='U6'&&b.turn%3===0)b.lim=7000;
 if(boss.id==='U7')b.lim=8000;
 if(boss.id==='U8'&&b.phase===2)b.lim=7000;
 if(b.lim){var L=b.lim;b.iv=setInterval(function(){var f=Math.max(0,1-(Date.now()-b.t0)/L);var e=$('#v7bt');if(e)e.style.width=(f*100)+'%';if(f<=0){clearInterval(b.iv);if(B7===b&&!b.lock&&!b.over)v7BossAns('__timeout')}},150)}
 if(boss.id==='U3'&&b.turn%3===0){b.iv2=setTimeout(function(){var e=$('#v7opts');if(e)e.classList.add('v7blur');setTimeout(function(){if(e)e.classList.remove('v7blur')},2000)},400)}
 renderBoss();
 if(b.qmode==='listen')setTimeout(function(){try{speak(b.card.h)}catch(e){}},150);
}
function renderBoss(){var b=B7;if(!b)return;var boss=b.boss;var host=$('#v7arena');if(!host)return;
 if(b.over){host.innerHTML='<div class="v7arena"><img class="bossimg" src="'+bossArt(boss)+'" alt=""><div class="v7qtext">'+(b.over==='win'?'🏆 Bạn đã hạ '+boss.n+'!':'💔 '+boss.n+' thắng rồi')+'</div><p class="mute">'+(b.over==='win'?('Nhận '+b.xp+' XP'+(b.first?' · lần đầu +5 💎':'')+' · Boss còn '+b.hp+'/'+b.max+' máu.'):'Boss còn '+b.hp+'/'+b.max+' máu. Ôn lại từ vựng rồi thử lại nhé.')+'</p><div class="acts"><button class="v7btn pri" onclick="v7BossStart(\''+boss.id+'\')">Đấu lại</button><button class="v7btn" onclick="v7Open(\'boss\')">Bản đồ boss</button><button class="v7btn" onclick="v7Close()">Đóng</button></div></div>';return}
 var q=b.q, hearts='❤️'.repeat(Math.max(0,b.hearts))+'🖤'.repeat(Math.max(0,b.maxH-b.hearts));
 var h='<div class="v7arena"><div class="mute">'+hearts+' · Combo '+b.combo+' · Lượt '+b.turn+'</div><div class="v7hp"><i style="width:'+(b.hp/b.max*100)+'%"></i><b>'+boss.n+' · '+b.hp+'/'+b.max+' máu'+(b.phase===2?' · GIAI ĐOẠN 2':'')+'</b></div>'+
 (b.lim?'<div class="v7timer"><i id="v7bt" style="width:100%"></i></div>':'')+
 '<img class="bossimg '+(b.phase===2?'p2 ':'')+(b.hit?'hit':b.atk?'atk':'')+'" src="'+bossArt(boss)+'" alt=""><div><span class="rare" style="background:'+boss.rc+';color:#fff;border-radius:999px;padding:2px 8px;font:700 11px \'Be Vietnam Pro\'">'+boss.r+'</span> <b>'+boss.n+' ('+boss.kr+')</b></div><div class="v7skill">🛡 '+boss.skill+'</div>';
 if(b.shield)h+='<div class="v7skill" style="background:#FFE9A8">🛡 Khiên vàng đang bật — câu đúng này chỉ phá khiên!</div>';
 if(q.kind==='grammar'){h+='<div class="v7qtext" style="font-size:22px;font-family:\'Be Vietnam Pro\'">'+esc0(q.prompt)+'</div><div class="opts" id="v7opts">'+b.opts.map(function(o,i){var cl=b.pick===null?'':(i===q.ans?'right':(i===b.pick?'wrong':''));return '<button class="opt '+cl+'" '+(b.lock?'disabled':'')+' onclick="v7BossAns('+i+')">'+(i+1)+'. '+esc0(o)+'</button>'}).join('')+'</div>'}
 else if(q.kind==='sentence'){h+='<div class="v7qtext" style="font-size:20px;font-family:\'Be Vietnam Pro\'">'+esc0(q.prompt)+'</div><div class="opts" id="v7opts">'+q.opts.map(function(o,i){var cl=b.pick===null?'':(o===q.ans?'right':(o===b.pick?'wrong':''));return '<button class="opt '+cl+'" '+(b.lock?'disabled':'')+' onclick="v7BossAnsStr('+i+')">'+esc0(o)+'</button>'}).join('')+'</div>'}
 else if(q.kind==='type'){h+='<div class="v7qtext">'+esc0(q.prompt)+'</div><div class="mute">Gõ đúng tiếng Hàn của từ này (có gợi ý phát âm: '+esc0(b.card.p||'')+')</div>'+(b.pick!==null?'<div class="msg" style="color:var(--'+(b.wasOk?'ok':'bad')+')">'+(b.wasOk?'Chính xác! ':'Chưa đúng. Đáp án: ')+'<b style="font-family:\'Noto Sans KR\'">'+esc0(b.card.h)+'</b></div>':'<input id="v7ti" type="text" lang="ko" autocomplete="off" spellcheck="false" placeholder="Gõ bằng tiếng Hàn" style="width:100%;margin-top:10px;font:700 26px \'Noto Sans KR\'"><div class="acts"><button class="v7btn pri" onclick="v7BossType()">Kiểm tra</button></div>')}
 else if(q.kind==='listen'){h+='<div class="v7qtext">🔊 Nghe…</div><div class="acts" style="justify-content:center"><button class="v7btn pri" onclick="speak(B7.card.h)">🔊 Nghe lại</button></div><div class="opts" id="v7opts">'+b.opts.map(function(id,i){var o=S.cards.find(function(k){return k.id===id});var cl=b.pick===null?'':(id===q.ans?'right':(id===b.pick?'wrong':''));return '<button class="opt '+cl+'" '+(b.lock?'disabled':'')+' onclick="v7BossAns(\''+id+'\')">'+(i+1)+'. '+esc0(o?o.m:'')+'</button>'}).join('')+'</div>'}
 else{h+='<div class="v7qtext">'+esc0(q.prompt)+'</div><div class="opts" id="v7opts">'+b.opts.map(function(id,i){var o=S.cards.find(function(k){return k.id===id});var cl=b.pick===null?'':(id===q.ans?'right':(id===b.pick?'wrong':''));return '<button class="opt '+cl+'" '+(b.lock?'disabled':'')+' onclick="v7BossAns(\''+id+'\')">'+(i+1)+'. '+esc0(o?o.m:'')+'</button>'}).join('')+'</div>'}
 if(b.pick!==null)h+='<div class="acts" style="justify-content:center"><button class="v7btn pri" onclick="v7BossNext()">Tiếp →</button></div>';
 h+='<div class="acts" style="justify-content:center"><button class="v7btn" onclick="v7Close()">Rời trận (thua)</button></div></div>';
 host.innerHTML=h; b.hit=0; b.atk=0;
 if(q.kind==='type'&&b.pick===null)setTimeout(function(){var i=$('#v7ti');if(i)i.focus()},50);
}
window.v7BossStart=function(id){var boss=BOSSES.find(function(x){return x.id===id});if(!boss)return;if(CS().length<2&&boss.mode!=='grammar'){toast('Cần ít nhất 2 từ vựng để đấu boss này — hãy thêm từ trước');return}
 openModal('<div id="v7arena"></div>');
 B7={boss:boss,max:boss.hp,hp:boss.hp,hearts:3,maxH:3,turn:0,combo:0,streak:0,shield:0,phase:1,lock:false,pick:null,over:'',xp:0,first:!(V.boss8[id]),t0:0,lim:0,lastId:null,card:null,opts:[],q:null,qmode:boss.mode,g:null,hit:0,atk:0,wasOk:false};
 nextQ()};
function bossDamage(b,ok,sec){var d=1,tx=[];
 if(b.shield){b.shield=0;d=0;tx.push('Phá khiên!')}
 else{if(b.combo>=3){d++;tx.push('COMBO x'+b.combo)}if(sec<3){d++;tx.push('CRIT!')}if(b.boss.id==='U5'&&b.combo>=3)d++;
  b.streak++;if(b.streak>=5){b.streak=0;d+=2;tx.push('ULTIMATE!')}}
 if(d>0&&b.boss.id==='U8'&&b.phase===2&&Math.random()<0.20){d=0;tx.push('Vua né đòn!')}
 return {d:d,tx:tx}}
function applyBossAnswer(ok,sec){var b=B7;if(!b||b.lock||b.over)return;b.lock=true;clearInterval(b.iv);if(b.iv2)clearTimeout(b.iv2);
 var boss=b.boss; b.pick=b.pick===null?'x':b.pick;
 if(b.card){var c=b.card;c.box=ok?Math.min(5,c.box+1):0;c.due=Date.now()+IV[c.box];try{res(c,ok)}catch(e){}}
 if(ok){b.combo++;var r=bossDamage(b,true,sec);b.hp=Math.max(0,b.hp-r.d);b.hit=1;v7sfx('hit');trackOk();if(b.card)GROW.add(b.card.id);gain(3);
  if(r.tx.length)toast(r.tx.join(' '));dmgNum(r.d>0?('-'+r.d+' HP'):'KHÔNG SÁT THƯƠNG',innerWidth/2,innerHeight/3,r.d>=2?'crit':'');
  if(boss.id==='U2'&&b.turn%4===0&&b.hp>0&&b.hp<b.max){b.hp++;toast('Rồng hồi máu!')}
  if(boss.id==='U8'&&b.phase===1&&b.hp<=b.max/2&&b.hp>0){b.phase=2;toast('👑 VUA BIẾN HÌNH — GIAI ĐOẠN 2!');try{confetti()}catch(e){}}
 }else{b.combo=0;b.streak=0;b.atk=1;v7sfx('bossHit');var dm=1;
  if(boss.id==='U2'&&b.turn%4===0)dm=2;
  if(boss.id==='U8'&&b.phase===2)dm=2;
  if(boss.id==='U4'&&b.hp<b.max){b.hp++;toast('Quái hồi 1 máu!')}
  b.hearts-=dm;dmgNum('-'+dm+' ❤',innerWidth/2,innerHeight/2,'');
 }
 if(b.hp<=0){b.over='win';b.xp=boss.xp+10*Math.max(0,b.hearts)+(b.first?0:0);V.boss8[boss.id]=(V.boss8[boss.id]||0)+1;if(b.first)V.gems+=5;else V.gems+=1;gain(b.xp);trackBossWin();try{sfx('win')}catch(e){}v7sfx('gem');save7();checkAch()}
 else if(b.hearts<=0){b.hearts=0;b.over='lose';try{sfx('lose')}catch(e){}}
 save7();renderBoss();
 if(!b.over&&(b.qmode==='type'||b.pick==='x'||b.pick==='__timeout')){var turnAt=b.turn;setTimeout(function(){if(B7===b&&b.turn===turnAt){b.lock=false;b.pick=null;nextQ()}},ok?600:950)}
 else setTimeout(function(){syncHud()},600);
}
window.v7BossAns=function(id){var b=B7;if(!b||b.lock||b.over)return;var sec=(Date.now()-b.t0)/1000;var ok=false;
 if(b.qmode==='grammar'){b.pick=id;ok=(id===b.q.ans)}
 else{b.pick=id;ok=(id===b.q.ans)}
 if(b.qmode==='grammar'&&ok)toast('Đúng! '+b.g.ex);if(b.qmode==='grammar'&&!ok)toast('Chưa đúng. '+b.g.ex);
 applyBossAnswer(ok,sec)};
window.v7BossAnsStr=function(i){var b=B7;if(!b||b.lock||b.over)return;var sec=(Date.now()-b.t0)/1000;b.pick=b.q.opts[i];var ok=(b.q.opts[i]===b.q.ans);applyBossAnswer(ok,sec)};
window.v7BossType=function(){var b=B7;if(!b||b.lock||b.over)return;var inp=$('#v7ti');var v=inp?inp.value.trim().replace(/\s+/g,''):'';var sec=(Date.now()-b.t0)/1000;b.pick=v||'—';b.wasOk=(v===b.card.h.replace(/\s+/g,''));applyBossAnswer(b.wasOk,sec)};
window.v7BossNext=function(){var b=B7;if(!b||b.over||!b.lock)return;b.lock=false;b.pick=null;nextQ()};
/* ---------- Quest / Achievement / Collection modals ---------- */
function questHtml(){var d=dq(),w=wq();
 function row(name,prog,total,done){return '<div class="v7q"><div style="flex:1"><b>'+name+'</b><div class="bar"><i style="width:'+Math.min(100,prog/total*100)+'%"></i></div></div><span class="mute">'+Math.min(prog,total)+'/'+total+'</span><span>'+(done?'✅':'⬜')+'</span></div>'}
 return '<h2>🎯 Nhiệm vụ</h2><h3>Nhiệm vụ ngày</h3>'+row('Trả lời đúng 10 câu',d.ok,10,d.done.ok)+row('Hạ 1 boss',d.boss,1,d.done.boss)+row('Tưới 3 luống',d.water,3,d.done.water)+'<h3>Nhiệm vụ tuần</h3>'+row('Thuộc 5 từ mới (mức nhớ lên 3)',w.master,5,w.done.master)+row('Hạ 3 boss',w.boss,3,w.done.boss)+'<p class="mute">Hoàn thành nhiệm vụ ngày được +15–20 XP và +1–2 💎. Nhiệm vụ tuần được +60–80 XP và +5 💎.</p><div class="acts"><button class="v7btn pri" onclick="v7Close()">Đóng</button></div>'}
function achHtml(){return '<h2>🏆 Thành tựu</h2><p class="mute">Đã mở '+(Object.keys(V.ach).length)+'/'+ACH.length+' · Mỗi thành tựu +3 💎.</p><div class="v7ach">'+ACH.map(function(a){var done=!!V.ach[a.id];return '<div class="a '+(done?'done':'')+'"><div class="ic2">'+(done?a.icon:'🔒')+'</div><b>'+a.n+'</b><div>'+a.d+'</div></div>'}).join('')+'</div><div class="acts"><button class="v7btn pri" onclick="v7Close()">Đóng</button></div>'}
function collHtml(){var groups={};CS().forEach(function(c){var g=c.g||'Chưa phân nhóm';groups[g]=groups[g]||{n:0,m:0};groups[g].n++;if(c.box>=3)groups[g].m++});
 return '<h2>📖 Sổ sưu tầm từ vựng</h2><p class="mute">'+CS().length+' từ · '+CS().filter(function(c){return c.box>=3}).length+' từ đã thuộc · '+CS().filter(function(c){return c.box>=5}).length+' từ thuộc lòng.</p>'+Object.keys(groups).sort().map(function(g){var x=groups[g];return '<div class="v7q"><div style="flex:1"><b>'+esc0(g)+'</b><div class="bar"><i style="width:'+(x.n?x.m/x.n*100:0)+'%"></i></div></div><span class="mute">'+x.m+'/'+x.n+'</span></div>'}).join('')+'<div class="acts"><button class="v7btn pri" onclick="v7Close()">Đóng</button></div>'}
window.v7Open=function(kind){if(kind==='boss'){openModal(bossMapHtml())}else if(kind==='quest'){openModal(questHtml())}else if(kind==='ach'){openModal(achHtml())}else if(kind==='coll'){openModal(collHtml())}else if(kind==='sound'){openModal('<h2>🔊 Âm thanh</h2><div class="v7vol"><span>Âm lượng</span><input type="range" min="0" max="100" value="'+Math.round(V.vol*100)+'" oninput="v7SetVol(this.value)"><b id="v7volv">'+Math.round(V.vol*100)+'%</b></div><div class="acts"><button class="v7btn" onclick="v7ToggleMusic()">'+(V.musicOn?'Tắt nhạc nền':'Bật nhạc nền')+'</button><button class="v7btn" onclick="V.soundOn=!V.soundOn;save();v7Open(\'sound\')">Hiệu ứng: '+(V.soundOn?'bật':'tắt')+'</button><button class="v7btn pri" onclick="v7Close()">Đóng</button></div><p class="mute">Nhạc nền là giai điệu tự tạo bằng WebAudio, không cần file nhạc. Âm thanh gieo hạt, tưới nước, thu hoạch, đánh boss và nhận thưởng đều có hiệu ứng riêng.</p>')}};
window.v7SetVol=function(v){V.vol=v/100;var e=$('#v7volv');if(e)e.textContent=v+'%';save7()};
/* ---------- Daily login + chest ---------- */
window.v7Chest=function(){if(V.chest===TODAY()){toast('Rương hôm nay đã mở rồi — quay lại ngày mai nhé');return}V.chest=TODAY();var isGem=Math.random()<0.4;var amt=isGem?2+Math.floor(Math.random()*4):15+Math.floor(Math.random()*26);if(isGem)V.gems+=amt;else gain(amt);v7sfx('chest');try{confetti()}catch(e){}save7();syncHud();openModal('<div style="text-align:center"><div class="v7chest">🎁</div><h2>Mở rương hằng ngày!</h2><p>Bạn nhận được <b>'+(isGem?amt+' 💎':amt+' XP')+'</b></p><div class="acts" style="justify-content:center"><button class="v7btn pri" onclick="v7Close()">Nhận thưởng</button></div></div>')};
function dailyLogin(){if(V.lastLogin===TODAY())return;var first=!V.lastLogin;V.lastLogin=TODAY();gain(20);V.gems+=3;save7();setTimeout(function(){toast(first?'Chào mừng trở lại nông trại! Quà đăng nhập +20 XP, +3 💎':'Quà đăng nhập hôm nay: +20 XP, +3 💎')},600)}
/* ---------- Render hooks: HUD + farm + dex/collection + shop gems ---------- */
function injectHud(){if(!$('#v7hud')){var top=$('.top');if(top){var d=document.createElement('div');d.id='v7hud';d.className='v7hud';top.after(d)}}syncHud()}
function injectFarm(){if(!$('#v7farm')){var farm=$('#farm');if(farm){var d=document.createElement('div');d.id='v7farm';d.className='v7farm';farm.after(d)}}renderFarm()}
var GEM_ITEMS=[{id:'g1',n:'Cây anh đào vàng',p:5,img:'assets/decor/sakura.svg',d:'Trang trí vàng trong vườn, +10 XP ngay khi mua'},{id:'g2',n:'Mũ Vua Từ Vựng',p:8,img:'assets/bosses/v6_hac.png',d:'Danh hiệu Vua Từ Vựng trong sổ sưu tầm'}];
window.v7BuyGem=function(id){var it=GEM_ITEMS.find(function(x){return x.id===id});if(!it||V.gemOwn.includes(id))return;if(V.gems<it.p){toast('Chưa đủ 💎 — cần '+it.p+' 💎');return}V.gems-=it.p;V.gemOwn.push(id);if(id==='g1')gain(10);save7();syncHud();v7sfx('gem');toast('Đã mua '+it.n+'!');if(typeof render==='function')render()};
function injectAfterRender(){
 injectHud(); injectFarm();
 if(view==='dex'){var app=$('#app');if(app&&!$('#v7coll')){var b=document.createElement('button');b.className='v7btn pri';b.id='v7coll';b.textContent='📖 Mở sổ sưu tầm từ vựng';b.style.margin='10px 0';b.onclick=function(){v7Open('coll')};app.appendChild(b)}}
 if(view==='shop'){var app2=$('#app');if(app2&&!$('#v7gemshop')){var sec=document.createElement('div');sec.id='v7gemshop';sec.className='v7sec';sec.innerHTML='<h3>💎 Cửa hàng đá quý — bạn có '+V.gems+' 💎</h3>'+GEM_ITEMS.map(function(it){var own=V.gemOwn.includes(it.id);return '<div class="v7q"><img src="'+it.img+'" style="width:44px;height:44px;object-fit:contain" onerror="this.style.display=\'none\'"><div style="flex:1"><b>'+it.n+'</b><div class="mute">'+it.d+'</div></div>'+(own?'<span class="mute">Đã có</span>':'<button class="v7btn gold" '+(V.gems>=it.p?'':'disabled')+' onclick="v7BuyGem(\''+it.id+'\')">'+it.p+' 💎</button>')+'</div>'}).join('');app2.appendChild(sec)}}
 var snd=$('#sn');if(snd&&!snd.dataset.v7){snd.dataset.v7='1';snd.onclick=function(){v7Open('sound')}}
}
wrap('render',function(){injectAfterRender()});
wrap('farm',function(){injectFarm()});
window.__v7={get B7(){return B7},BOSSES:BOSSES,GRAMMAR:GRAMMAR,get V(){return V}};
/* ---------- Init ---------- */
dailyLogin();
if(!S.skin){/* keep user's skin choice; farm panel still shows */}
injectHud(); injectFarm(); injectAfterRender();
if(V.musicOn&&!musicTimer)musicTimer=setInterval(musicTick,340);
checkAch();
})();
