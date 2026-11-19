/* ===== V27 — SMART LEARNING 16.0.0 (additive layer) =====
   V16 "Học thông minh": một overlay duy nhất với 3 tab nội bộ
   (Bảng điều khiển / Từ yếu / Kế hoạch ngày) + nút chuyển EN/KO
   nội bộ V27 (en27.uiLang — KHÔNG BAO GIỜ ghi en15().lang).
   - Lưu trữ riêng: S.v7.en27 (lazy, đầy đủ defaults; xem design
     Appendix A). EN chỉ ghi last/cw/cr (right/wrong đã có ở S.v7.en).
     KO ghi right/wrong/cw/cr/last — CHỈ tính từ khi dùng Học thông minh.
   - Ghi đáp án qua hook H1/H2/H3 trong mark15/mark18/mark19
     (recordAnswer: đồng bộ, nhẹ, KHÔNG gọi save()).
   - Bộ máy câu hỏi riêng của V27 (§4.4): mỗi câu EN gọi mark15
     (SRS + XP chạy đúng như cũ); mỗi câu KO tự cập nhật box/due
     (bản sao bảng IV của V6) + gain() + res() — KHÔNG gọi mark(ok).
   - XP chỉ qua đúng một kênh mỗi câu trả lời; thưởng hoàn thành kế
     hoạch +20 XP một lần/ngày/ngôn ngữ (claimed, Q4: mức đề xuất,
     chờ Anh xác nhận); +1 gem khi đạt chuỗi Smart 7 ngày (claimed).
   - Không tiền tệ mới, không gọi API ngoài, không bịa số: ô nào chưa
     có dữ liệu ghi "chưa có dữ liệu". Không bao giờ fallback lặng lẽ
     sang toàn bộ từ khi kế hoạch/phạm vi cho ít từ.
   - Vào từ: EN Hub (decorator MutationObserver, không sửa file cũ),
     KO Hub (nút build-time v27kotab, theo mẫu v19/v23).
*/
(function(){
'use strict';
var VERSION='16.0.0';

/* ---------- tiny helpers ---------- */
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function norm(s){return (s||'').toLowerCase().replace(/[^a-z0-9\s']/g,'').replace(/\s+/g,' ').trim()}
function dayNo(){return Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5)}
function todayStr(){return new Date().toDateString()}
function ymdStr(d){d=d||new Date();var m=d.getMonth()+1,dd=d.getDate();return d.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(dd<10?'0':'')+dd}
function ymdOf(ts){return ymdStr(new Date(ts))}
function fmtDate(ts){if(!ts)return 'chưa có dữ liệu';var d=new Date(ts);return (d.getDate()<10?'0':'')+d.getDate()+'/'+((d.getMonth()+1)<10?'0':'')+(d.getMonth()+1)+'/'+d.getFullYear()}
function weekKey(d){d=d||new Date();var t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));var day=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-day+3);var first=new Date(Date.UTC(t.getUTCFullYear(),0,4));var week=1+Math.round(((t-first)/864e5-3+((first.getUTCDay()+6)%7))/7);return t.getUTCFullYear()+'-W'+(week<10?'0':'')+week}
function fmtMins(m){m=Math.round((m||0)*10)/10;if(m<=0)return '0 phút';if(m<1)return '<1 phút';return m+' phút'}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}

/* ---------- save object access (S is a lexical `let`, NOT window.S) ---------- */
function getS(){try{return S}catch(e){return null}}
function saveSoon(){try{if(typeof save==='function')save()}catch(e){}}
function gainShared(n){try{if(window.__v15&&__v15.gain15){__v15.gain15(n);return}}catch(e){}try{if(typeof gain==='function')gain(n)}catch(e){}}

/* ---------- S.v7.en27 schema (design Appendix A, exact) ---------- */
function defPlan(){return {d:'',mins:10,newN:5,dueN:10,weakN:5,ids:[],doneIds:[],goals:{complete:false,acc80:false,weak5:false}}}
function defEn27(){return {v:1,created:Date.now(),
  en:{last:{},cw:{},cr:{}},
  ko:{right:{},wrong:{},cw:{},cr:{},last:{}},
  plan:{en:defPlan(),ko:defPlan()},
  sessions:[],days:{},
  streak:{en:{d:'',n:0},ko:{d:'',n:0}},
  claimed:{},uiLang:'en'}}
var _mem=null;
function en27(){
  var S0=getS();
  if(!S0){if(!_mem)_mem=defEn27();return _mem}
  try{
    S0.v7=S0.v7||{};
    var d=S0.v7.en27;
    if(!d){
      d=S0.v7.en27=defEn27();
      /* KO streak: seed từ chuỗi ngày chung S.sk.n (ghi nhãn seeded) */
      try{if(S0.sk&&S0.sk.n>0){d.streak.ko.n=S0.sk.n;d.streak.ko.d=S0.sk.d||'';d.streak.ko.seeded=true}}catch(e){}
    }
    backfill(d);
    return d;
  }catch(e){if(!_mem)_mem=defEn27();return _mem}
}
function backfill(d){
  if(typeof d!=='object'||!d)return;
  if(d.v!==1)d.v=1;
  if(!d.en||typeof d.en!=='object')d.en={last:{},cw:{},cr:{}};
  d.en.last=d.en.last||{};d.en.cw=d.en.cw||{};d.en.cr=d.en.cr||{};
  if(!d.ko||typeof d.ko!=='object')d.ko={right:{},wrong:{},cw:{},cr:{},last:{}};
  d.ko.right=d.ko.right||{};d.ko.wrong=d.ko.wrong||{};d.ko.cw=d.ko.cw||{};d.ko.cr=d.ko.cr||{};d.ko.last=d.ko.last||{};
  if(!d.plan||typeof d.plan!=='object')d.plan={en:defPlan(),ko:defPlan()};
  if(!d.plan.en||typeof d.plan.en!=='object')d.plan.en=defPlan();
  if(!d.plan.ko||typeof d.plan.ko!=='object')d.plan.ko=defPlan();
  ['en','ko'].forEach(function(l){
    var p=d.plan[l];
    if(typeof p.mins!=='number'||!(p.mins>0))p.mins=10;
    if(typeof p.newN!=='number')p.newN=5;
    if(typeof p.dueN!=='number')p.dueN=10;
    if(typeof p.weakN!=='number')p.weakN=5;
    if(!Array.isArray(p.ids))p.ids=[];
    if(!Array.isArray(p.doneIds))p.doneIds=[];
    if(!p.goals||typeof p.goals!=='object')p.goals={complete:false,acc80:false,weak5:false};
  });
  if(!Array.isArray(d.sessions))d.sessions=[];
  if(!d.days||typeof d.days!=='object')d.days={};
  if(!d.streak||typeof d.streak!=='object')d.streak={en:{d:'',n:0},ko:{d:'',n:0}};
  if(!d.streak.en||typeof d.streak.en!=='object')d.streak.en={d:'',n:0};
  if(!d.streak.ko||typeof d.streak.ko!=='object')d.streak.ko={d:'',n:0};
  if(!d.claimed||typeof d.claimed!=='object')d.claimed={};
  if(d.uiLang!=='en'&&d.uiLang!=='ko')d.uiLang='en';
}

/* ---------- pruning (never blocks save) ---------- */
var _pruneLogged=false;
function pruneMaps(d){
  try{
    var sides=[['en','last'],['en','cw'],['en','cr'],['ko','right'],['ko','wrong'],['ko','cw'],['ko','cr'],['ko','last']];
    var total=0,i,j,k,keys,m,lastMap;
    for(i=0;i<sides.length;i++){
      m=d[sides[i][0]][sides[i][1]];
      keys=Object.keys(m);total+=keys.length;
      if(keys.length>1000){
        lastMap=d[sides[i][0]].last;
        keys.sort(function(a,b){return (lastMap[a]||0)-(lastMap[b]||0)});
        for(j=0;j<keys.length-1000;j++)delete m[keys[j]];
      }
    }
    if(d.sessions.length>30)d.sessions.length=30;
    var dk=Object.keys(d.days);
    if(dk.length>90){dk.sort(function(a,b){return (+a)-(+b)});for(j=0;j<dk.length-90;j++)delete d.days[dk[j]]}
    if(total>1500){
      var size=0;
      try{size=JSON.stringify(d).length}catch(e){}
      if(size>150*1024){
        /* halve the last maps by recency; never throw, never skip save */
        ['en','ko'].forEach(function(side){
          var lm=d[side].last;var lk=Object.keys(lm);
          if(lk.length>100){
            lk.sort(function(a,b){return lm[a]-lm[b]});
            var cut=Math.floor(lk.length/2);
            for(k=0;k<cut;k++){var id=lk[k];delete lm[id];['cw','cr','right','wrong'].forEach(function(f){if(d[side][f])delete d[side][f][id]})}
          }
        });
        if(!_pruneLogged){_pruneLogged=true;try{console.warn('[v27] en27 pruned to stay under 150 KB')}catch(e){}}
      }
    }
  }catch(e){}
}

/* ---------- day aggregate + study-day streak (Smart-only) ---------- */
function touchDay(d,ok){
  try{
    var dn=dayNo();var day=d.days[dn]=d.days[dn]||{c:0,t:0,xp:0,mins:0};
    day.t++;if(ok)day.c++;
  }catch(e){}
}
function touchStreak(d,lang){
  try{
    var st=d.streak[lang];if(!st)return;
    var today=todayStr();
    if(st.d===today)return;
    var y=new Date(Date.now()-864e5).toDateString();
    st.n=(st.d===y)?(st.n||0)+1:1;
    st.d=today;
  }catch(e){}
}

/* ---------- recordAnswer: sync, allocation-light, NEVER calls save() ----------
   Hook H1/H2/H3 gọi hàm này sau khi mark15/mark18/mark19 đã xong mọi
   mutation, ngay trước save15()/save18()/save19() — ghi V27 sẽ đi cùng
   lần flush debounce của V20. mode 'smart' = đáp án trong Học thông minh
   (days/streak chỉ đếm hoạt động Smart; các mode khác chỉ ghi last/cw/cr). */
function recordAnswer(lang,id,ok,mode){
  try{
    if(!id)return;
    if(!getS()){ try{ if(window.console&&console.warn) console.warn('[V31] recordAnswer dropped: S unavailable, refusing to write into the never-persisted _mem fallback (F-11).'); }catch(e){} return; }
    var d=en27(),now=Date.now();
    if(lang==='ko'){
      var k=d.ko;
      if(ok){k.right[id]=(k.right[id]||0)+1;delete k.cw[id];k.cr[id]=(k.cr[id]||0)+1}
      else{k.wrong[id]=(k.wrong[id]||0)+1;delete k.cr[id];k.cw[id]=(k.cw[id]||0)+1}
      k.last[id]=now;
    }else{
      var e=d.en;
      if(ok){delete e.cw[id];e.cr[id]=(e.cr[id]||0)+1}
      else{delete e.cr[id];e.cw[id]=(e.cw[id]||0)+1}
      e.last[id]=now;
    }
    if(mode==='smart'){touchDay(d,ok);touchStreak(d,lang==='ko'?'ko':'en')}
    pruneMaps(d);
  }catch(err){}
}

/* ---------- English data access (read-only; never write S.v7.en) ---------- */
function v15(){try{return window.__v15||null}catch(e){return null}}
function enOld(){try{var v=v15();if(v&&v.enOld)return v.enOld()}catch(e){}return {box:{},right:{},wrong:{}}}
function en15st(){try{var v=v15();if(v&&v.en15)return v.en15()}catch(e){}return {due:{},scope:null}}
function allENWords(){
  var list=[];
  try{var v=v15();if(v&&v.words)list=v.words.slice()}catch(e){}
  try{
    var v2=v15();
    if(v2&&v2.en15){
      var sc=v2.en15().scope;
      if(sc&&sc.kind==='lib')list=list.filter(function(w){return v2.inScope(w)});
    }
  }catch(e){}
  return list;
}
function scopeNameEN(){
  try{
    var v=v15();if(!v)return '';
    var sc=v.en15().scope;
    if(!sc||sc.kind!=='lib')return '';
    if(sc.lib==='a1a2')return 'A1–A2 (1.000 từ)'+(sc.topic?' · '+sc.topic:'');
    if(sc.lib==='oxford')return 'Oxford 3000'+(sc.lesson?' · Bài '+sc.lesson:'');
    if(sc.lib==='bt')return 'Basic Tactics'+(sc.unit?(' · Unit '+sc.unit):'');
    return String(sc.lib||'Bộ của bạn');
  }catch(e){return ''}
}

/* ---------- Korean data access (bare S — lexical global, never window.S) ---------- */
function koCards(){
  var cards=[];
  try{var S0=getS();if(!S0||!S0.cards)return [];cards=S0.cards.filter(function(c){return c&&c.h&&c.m})}catch(e){return []}
  /* v19 pattern: chỉ giới hạn theo deck khi deck đang chọn có >= 8 thẻ dùng được */
  try{
    var S0b=getS();
    if(S0b&&S0b.deck){
      var inDeck=cards.filter(function(c){return c.d===S0b.deck});
      if(inDeck.length>=8)return inDeck;
    }
  }catch(e){}
  return cards;
}
function koDeckName(){
  try{
    var S0=getS();if(!S0)return '';
    if(!S0.deck)return 'Tất cả các bộ';
    var dk=(S0.decks||[]).filter(function(x){return x.id===S0.deck})[0];
    return dk?dk.name:'Tất cả các bộ';
  }catch(e){return ''}
}
var KO_IV=[0,6e5,864e5,2592e5,6048e5,12096e5]; /* bản sao bảng IV của V6: box 0->0, 1->10p, 2->1d, 3->3d, 4->7d, 5->14d */
function koPetMult(){
  try{if(typeof has==='function'&&has(3))return 1.5}catch(e){}
  try{var S0=getS();if(S0&&(S0.own||[]).indexOf(3)>=0)return 1.5}catch(e){}
  return 1;
}

/* ---------- classification (§5.2) + priority (§5.3) ---------- */
/* noWrong30: không có đáp án sai trong 30 ngày qua. Chứng minh được từ
   dữ liệu V27: wrong==0 (chưa sai bao giờ), hoặc đáp án gần nhất đã
   đúng và cách đây >30 ngày (mọi đáp án sai — nếu có — đều cũ hơn).
   Trường hợp còn lại (đáp án gần nhất đúng nhưng mới đây) KHÔNG kết
   luận được nên giữ ở mức thận trọng: chưa tính là đã thuộc. */
function noWrong30(last,cw,wrong){
  if(!wrong)return true;
  if(!last)return false;
  return cw===0&&(Date.now()-last>30*864e5);
}
function prioOf(box,cw,wrong,right,due,mastered){
  var now=Date.now();
  var overdue=box>0?Math.max(0,(now-(due||0))/864e5):0;
  var p=cw*10+Math.max(0,wrong-right)*3+Math.min(overdue,30)+(box===0?1:0);
  if(mastered)p-=100;
  return {prio:p,overdue:overdue};
}
function classifyEN(w){
  var old=enOld(),e15=en15st(),d=en27(),now=Date.now();
  var box=old.box[w.id]||0,r=old.right[w.id]||0,wr=old.wrong[w.id]||0;
  var cw=d.en.cw[w.id]||0,cr=d.en.cr[w.id]||0,last=d.en.last[w.id]||0;
  var due=e15.due[w.id]||0;
  var weak=(wr>r)||cw>=2;
  var mastered=false;
  if(last>0)mastered=(box>=4&&r>=3&&noWrong30(last,cw,wr));
  else mastered=(box>=5&&wr===0); /* legacy: chưa có lịch sử V27 */
  var dueNow=(box>=1&&box<=4&&due<=now);
  var cls,reason;
  if(weak){cls='WEAK';reason=cw>=2?('Sai '+cw+' lần liên tiếp'):('Sai '+wr+' / đúng '+r+' lần')}
  else if(mastered){cls='MASTERED';reason='Đã thuộc — ôn nhắc lại'}
  else if(dueNow){cls='REVIEW';var od=Math.floor(Math.max(0,(now-due)/864e5));reason=od>0?('Đến hạn '+od+' ngày'):('Đến hạn hôm nay')}
  else if(box===0&&r===0&&wr===0){cls='NEW';reason='Từ mới — chưa học'}
  else{cls='LEARNING';reason='Đang học — box '+box+'/5'}
  var pr=prioOf(box,cw,wr,r,due,mastered);
  return {cls:cls,prio:pr.prio,overdue:pr.overdue,reason:reason,box:box,r:r,wr:wr,cw:cw,cr:cr,last:last,due:due};
}
function classifyKO(c){
  var d=en27(),now=Date.now();
  var box=c.box||0,w=c.w||0,due=c.due||0;
  var kr=d.ko.right[c.id]||0,kw=d.ko.wrong[c.id]||0;
  var cw=d.ko.cw[c.id]||0,cr=d.ko.cr[c.id]||0,last=d.ko.last[c.id]||0;
  var hasHist=last>0||kr>0||kw>0;
  var weak=(kw>kr)||cw>=2||(w>=3&&box<4);
  var mastered=false;
  if(hasHist)mastered=(box>=4&&kr>=3&&noWrong30(last,cw,kw));
  else mastered=(box>=5&&!w); /* legacy: chưa có lịch sử V27 */
  var dueNow=(box>=1&&box<=4&&due<=now);
  var cls,reason;
  if(weak){cls='WEAK';reason=cw>=2?('Sai '+cw+' lần liên tiếp'):(w>=3&&kw===0?('Sai '+w+' lần (trước khi dùng Học thông minh)'):('Sai '+kw+' / đúng '+kr+' lần (từ khi dùng Học thông minh)'))}
  else if(mastered){cls='MASTERED';reason='Đã thuộc — ôn nhắc lại'}
  else if(dueNow){cls='REVIEW';var od=Math.floor(Math.max(0,(now-due)/864e5));reason=od>0?('Đến hạn '+od+' ngày'):('Đến hạn hôm nay')}
  else if(box===0&&!w&&!hasHist){cls='NEW';reason='Từ mới — chưa học'}
  else{cls='LEARNING';reason='Đang học — box '+box+'/5'}
  /* priority KO: wrong hiệu dụng = max(số sai V27, bộ đếm w của thẻ) */
  var wrongEff=Math.max(kw,w);
  var pr=prioOf(box,cw,wrongEff,kr,due,mastered);
  return {cls:cls,prio:pr.prio,overdue:pr.overdue,reason:reason,box:box,r:kr,wr:kw,cw:cw,cr:cr,last:last,due:due,w:w};
}
var CLS_VI={NEW:'Mới',LEARNING:'Đang học',WEAK:'Từ yếu',REVIEW:'Đến hạn',MASTERED:'Đã thuộc'};

/* ---------- ensureData (BT words) ---------- */
function ensureBT(){
  try{
    if(window.__v22&&__v22.ensureData){
      var r=__v22.ensureData();
      if(r&&r.then)return r.catch(function(){return null});
      return Promise.resolve(null);
    }
  }catch(e){}
  return Promise.resolve(null);
}

/* ---------- plan building (§5.3 caps; never silent ALL fallback) ---------- */
function buildPlanCore(lang,mins,newN,dueN,weakN){
  var buckets={NEW:[],DUE:[],WEAK:[]},totals={NEW:0,DUE:0,WEAK:0};
  var items=[];
  if(lang==='en'){
    var v=v15();
    if(!v||!v.words)return {plan:null,avail:{NEW:0,DUE:0,WEAK:0},short:['English Hub chưa tải — hãy mở English Hub rồi thử lại.'],scope:''};
    items=allENWords().map(function(w){return {id:w.id,w:w,c:classifyEN(w)}});
  }else{
    var cards=koCards();
    if(!cards.length)return {plan:null,avail:{NEW:0,DUE:0,WEAK:0},short:['Chưa có đủ thẻ tiếng Hàn (cần ít nhất 4 thẻ có từ và nghĩa).'],scope:''};
    items=cards.map(function(c){return {id:c.id,w:c,c:classifyKO(c)}});
  }
  items.forEach(function(it){
    if(it.c.cls==='WEAK'){buckets.WEAK.push(it);totals.WEAK++}
    else if(it.c.cls==='REVIEW'){buckets.DUE.push(it);totals.DUE++}
    else if(it.c.cls==='NEW'){buckets.NEW.push(it);totals.NEW++}
  });
  ['WEAK','DUE','NEW'].forEach(function(k){buckets[k].sort(function(a,b){return b.c.prio-a.c.prio})});
  var takeW=buckets.WEAK.slice(0,weakN),takeD=buckets.DUE.slice(0,dueN),takeN=buckets.NEW.slice(0,newN);
  var short=[];
  if(totals.WEAK<weakN)short.push('Chỉ có '+totals.WEAK+' từ yếu (kế hoạch cần '+weakN+')');
  if(totals.DUE<dueN)short.push('Chỉ có '+totals.DUE+' từ đến hạn (kế hoạch cần '+dueN+')');
  if(totals.NEW<newN)short.push('Chỉ có '+totals.NEW+' từ mới (kế hoạch cần '+newN+')');
  var ids=takeW.concat(takeD).concat(takeN).map(function(it){return it.id});
  var d=en27();
  var plan={d:todayStr(),mins:mins,newN:takeN.length,dueN:takeD.length,weakN:takeW.length,ids:ids,doneIds:[],goals:{complete:false,acc80:false,weak5:false}};
  d.plan[lang]=plan;
  saveSoon();
  return {plan:plan,avail:{NEW:totals.NEW,DUE:totals.DUE,WEAK:totals.WEAK},short:short,scope:lang==='en'?scopeNameEN():koDeckName()};
}
function buildPlan(lang,mins){
  var d=en27();
  if(typeof mins!=='number'||!(mins>0))mins=d.plan[lang].mins||10;
  mins=clamp(Math.round(mins),1,60);
  var total=Math.min(30,Math.max(1,Math.round(mins*2))); /* ~2 từ/phút — ước tính, ghi rõ là ước tính */
  var newN=Math.round(total*0.25),dueN=Math.round(total*0.5),weakN=total-newN-dueN;
  if(lang==='en')return ensureBT().then(function(){return buildPlanCore('en',mins,newN,dueN,weakN)});
  return Promise.resolve(buildPlanCore('ko',mins,newN,dueN,weakN));
}
function planOf(lang){
  var d=en27(),p=d.plan[lang];
  if(p&&p.d===todayStr()&&p.ids&&p.ids.length)return p;
  return null;
}

/* ---------- rewards (§3.2: exactly one XP channel per answer + claimed bonuses) ---------- */
function claimPlanBonus(lang){
  var d=en27(),key='plan:'+lang+':'+ymdStr();
  if(d.claimed[key])return 0;
  d.claimed[key]=true;
  gainShared(20); /* Q4: +20 XP — mức đề xuất, chờ Anh xác nhận (xem CHANGELOG) */
  saveSoon();
  return 20;
}
function claimStreak7(lang){
  var d=en27();
  if((d.streak[lang].n||0)<7)return 0;
  var key='streak7:'+lang+':'+weekKey();
  if(d.claimed[key])return 0;
  d.claimed[key]=true;
  try{var S0=getS();if(S0){S0.v7=S0.v7||{};S0.v7.gems=(S0.v7.gems||0)+1}}catch(e){}
  saveSoon();
  return 1;
}

/* ---------- Smart Practice engine (§4.4) ---------- */
var KINDS_EN=['mc-ev','mc-ve','type','listen','flash'];
var KINDS_KO=['mc-hm','mc-mh','listen','flash'];
var SES=null; /* {lang,kind,list,allIds,idx,correct,wrong,xp,startedAt,reask,phase,first,everCorrect,weakSet,improved,stillWeak,answered} */
var _elapsedIv=null;

function wordById(lang,id){
  if(lang==='en'){
    try{var v=v15();if(v&&v.words){for(var i=0;i<v.words.length;i++)if(v.words[i].id===id)return v.words[i]}}catch(e){}
    return null;
  }
  try{var S0=getS();if(S0&&S0.cards){for(var j=0;j<S0.cards.length;j++)if(S0.cards[j].id===id)return S0.cards[j]}}catch(e){}
  return null;
}
function distractorsEN(w,n){
  var pool=[];
  try{
    var v=v15();if(!v||!v.words)return [];
    pool=v.words.filter(function(x){return x.id!==w.id&&(x.t===w.t||x.lv===w.lv)});
    var sc=v.en15().scope;
    if(sc&&sc.kind==='lib'){
      var inSc=v.words.filter(function(x){return x.id!==w.id&&v.inScope(x)});
      if(inSc.length>=n)pool=inSc;
    }
    if(pool.length<n){
      var rest=v.words.filter(function(x){return x.id!==w.id&&pool.indexOf(x)<0});
      pool=pool.concat(rest);
    }
  }catch(e){}
  return shuffle(pool).slice(0,n);
}
function distractorsKO(c,n){
  var pool=[];
  try{
    var cards=koCards().filter(function(x){return x.id!==c.id});
    var same=cards.filter(function(x){return x.d===c.d||x.g===c.g});
    pool=same.length>=n?same:cards;
  }catch(e){}
  return shuffle(pool).slice(0,n);
}
function speakEN(id){
  try{if(window.__v15&&__v15.speakWord)__v15.speakWord(id)}catch(e){}
}
function speakKO(text){
  try{speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=.85;speechSynthesis.speak(u)}catch(e){}
}
function speakWord(lang,id){
  if(lang==='en'){speakEN(id);return}
  var c=wordById('ko',id);if(c&&c.h)speakKO(c.h);
}

function startSession(lang,ids,kind){
  if(!ids||!ids.length)return false;
  var weakSet={};
  ids.forEach(function(id){
    var c=lang==='en'?classifyEN(wordById('en',id)||{id:id}):classifyKO(wordById('ko',id)||{id:id,box:0});
    if(c&&c.cls==='WEAK')weakSet[id]=true;
  });
  SES={lang:lang,kind:kind||'plan',list:ids.slice(),allIds:ids.slice(),idx:0,
    correct:0,wrong:0,xp:0,startedAt:Date.now(),reask:[],phase:'main',
    first:{},everCorrect:{},weakSet:weakSet,improved:[],stillWeak:[],answered:[]};
  renderQuestion();
  return true;
}
function startPlan(lang){
  var body=$('#v27body');if(body)body.innerHTML='<div class="v27loading">Đang chuẩn bị kế hoạch…</div>';
  var d=en27(),mins=d.plan[lang].mins||10;
  var existing=planOf(lang);
  if(existing&&existing.mins===mins){
    /* kế hoạch hôm nay còn hiệu lực: học tiếp phần chưa xong (hoặc học lại nếu đã xong) */
    var rest=existing.ids.filter(function(id){return existing.doneIds.indexOf(id)<0});
    if(startSession(lang,rest.length?rest:existing.ids.slice(),'plan'))return;
    if(body)body.innerHTML='<div class="v27empty">Kế hoạch hôm nay đã hoàn thành. Bạn có thể xây dựng lại kế hoạch hoặc ôn từ yếu.</div>';
    return;
  }
  buildPlan(lang,mins).then(function(res){
    if(!res.plan||!res.plan.ids.length){
      if(body)body.innerHTML='<div class="v27empty">Không xây được kế hoạch: '+(res.short&&res.short.length?esc(res.short.join(' · ')):'chưa có dữ liệu')+'</div>';
      return;
    }
    startSession(lang,res.plan.ids.slice(),'plan');
  });
}
function startWeak(lang,firstId){
  var items=[];
  if(lang==='en'){
    items=allENWords().map(function(w){return {id:w.id,c:classifyEN(w)}}).filter(function(it){return it.c.cls==='WEAK'});
  }else{
    items=koCards().map(function(c){return {id:c.id,c:classifyKO(c)}}).filter(function(it){return it.c.cls==='WEAK'});
  }
  items.sort(function(a,b){return b.c.prio-a.c.prio});
  var ids=items.slice(0,10).map(function(it){return it.id});
  if(firstId&&ids.indexOf(firstId)>=0){ids.splice(ids.indexOf(firstId),1);ids.unshift(firstId)}
  if(!ids.length){
    W27.tab='weak';W27.f='weak';render();
    return;
  }
  startSession(lang,ids,'weak');
}
function curKind(){
  var kinds=SES.lang==='en'?KINDS_EN:KINDS_KO;
  return kinds[SES.idx%kinds.length];
}
function noteAnswer(id,ok,xp){
  SES.xp+=xp||0;
  if(ok)SES.correct++;else SES.wrong++;
  if(!(id in SES.first))SES.first[id]=ok;
  if(ok)SES.everCorrect[id]=true;
  if(SES.answered.indexOf(id)<0)SES.answered.push(id);
  if(!ok&&SES.reask.indexOf(id)<0&&SES.phase==='main')SES.reask.push(id);
  if(!ok&&SES.phase==='reask'&&SES.stillWeak.indexOf(id)<0)SES.stillWeak.push(id);
  if(ok&&SES.phase==='reask'&&SES.first[id]===false&&SES.improved.indexOf(id)<0)SES.improved.push(id);
  /* doneIds của kế hoạch hôm nay */
  try{
    var d=en27(),p=d.plan[SES.lang];
    if(p&&p.d===todayStr()&&p.ids.indexOf(id)>=0&&p.doneIds.indexOf(id)<0)p.doneIds.push(id);
  }catch(e){}
}
function answerEN(w,ok){
  var xp=0;
  try{if(window.__v15&&__v15.mark15)xp=__v15.mark15(ok,w,'smart')||0}catch(e){}
  /* hook H1 trong mark15 đã ghi en27 (last/cw/cr + days/streak Smart) */
  noteAnswer(w.id,ok,xp);
}
function answerKO(c,ok){
  var xp=ok?5:1;
  try{
    c.box=ok?Math.min(5,(c.box||0)+1):0;
    var iv=KO_IV[Math.min(5,c.box)]||0;
    c.due=Date.now()+iv*koPetMult();
    if(typeof gain==='function')gain(xp);
    if(typeof res==='function')res(c,ok);
  }catch(e){}
  recordAnswer('ko',c.id,ok,'smart');
  noteAnswer(c.id,ok,xp);
}
function answerCurrent(ok){
  if(!SES||SES.answeredCur)return;
  SES.answeredCur=true;
  var id=SES.list[SES.idx];
  if(SES.lang==='en'){var w=wordById('en',id);if(w)answerEN(w,ok)}
  else{var c=wordById('ko',id);if(c)answerKO(c,ok)}
  showFeedback(ok);
}
function finishSession(){
  if(!SES)return;
  var mins=Math.max(0,(Date.now()-SES.startedAt)/60000);
  var answered=SES.correct+SES.wrong;
  var weakFixed=0;
  Object.keys(SES.weakSet).forEach(function(id){if(SES.everCorrect[id])weakFixed++});
  var d=en27();
  var rec={t:Date.now(),lang:SES.lang,total:answered,correct:SES.correct,wrong:SES.wrong,xp:SES.xp,
    mins:Math.round(mins*10)/10,weakFixed:weakFixed,words:SES.allIds.slice(0,30)};
  d.sessions.unshift(rec);
  if(d.sessions.length>30)d.sessions.length=30;
  var dn=dayNo();d.days[dn]=d.days[dn]||{c:0,t:0,xp:0,mins:0};
  d.days[dn].xp+=SES.xp;
  d.days[dn].mins=Math.round((d.days[dn].mins+mins)*10)/10;
  var bonus=0,gem=0;
  if(SES.kind==='plan'){
    var p=d.plan[SES.lang];
    if(p&&p.d===todayStr()){
      var doneAll=p.ids.length>0&&p.ids.every(function(id){return p.doneIds.indexOf(id)>=0});
      p.goals.complete=doneAll;
      p.goals.acc80=answered>0&&(SES.correct/answered>=0.8);
      p.goals.weak5=weakFixed>=5;
      if(doneAll)bonus=claimPlanBonus(SES.lang);
    }
  }
  gem=claimStreak7(SES.lang); /* chuỗi 7 ngày: mọi buổi Smart đều có thể chạm mốc, chống nhận trùng bằng claimed */
  saveSoon();
  var s=SES;SES=null;
  if(_elapsedIv){clearInterval(_elapsedIv);_elapsedIv=null}
  renderSummary(s,rec,bonus,gem);
}
function nextQ(){
  if(!SES)return;
  SES.idx++;SES.answeredCur=false;
  if(SES.idx>=SES.list.length){
    if(SES.phase==='main'&&SES.reask.length){
      SES.phase='reask';SES.list=SES.reask.slice();SES.idx=0;
      renderQuestion();return;
    }
    finishSession();return;
  }
  renderQuestion();
}
function endEarly(){
  if(!SES)return;
  if(SES.phase==='main'&&SES.reask.length&&SES.idx>=SES.list.length){finishSession();return}
  finishSession();
}

/* ---------- question rendering ---------- */
function qHeadHTML(){
  var total=SES.allIds.length;
  var qno=SES.phase==='main'?(SES.idx+1):(total+SES.idx+1);
  var qtotal=SES.phase==='main'?total:(total+SES.reask.length);
  var pct=clamp(Math.round(((SES.idx)/(SES.list.length||1))*100),0,100);
  return '<div class="v27qhead"><div class="v27qmeta"><b>'+(SES.phase==='reask'?'Ôn lại từ sai':'Câu '+qno+'/'+qtotal)+'</b>'
    +'<span>Đúng '+SES.correct+' · Sai '+SES.wrong+' · +'+SES.xp+' XP · <span id="v27elapsed">'+fmtMins((Date.now()-SES.startedAt)/60000)+'</span></span></div>'
    +'<div class="v27bar"><i style="width:'+pct+'%"></i></div>'
    +'<button type="button" class="v27link" onclick="window.__v27.endEarly()">Kết thúc sớm</button></div>';
}
function optBtnHTML(label,sub,onclick,cls){
  return '<button type="button" class="v27opt '+(cls||'')+'" onclick="'+onclick+'"><span class="v27opt-t">'+label+'</span>'+(sub?'<span class="v27opt-s">'+sub+'</span>':'')+'</button>';
}
function renderQuestion(){
  var body=$('#v27body');if(!body||!SES)return;
  SES.answeredCur=false;
  var id=SES.list[SES.idx];
  var kind=curKind();
  var html=qHeadHTML();
  if(SES.lang==='en'){
    var w=wordById('en',id);
    if(!w){nextQ();return}
    if(kind==='mc-ev'||kind==='mc-ve'){
      var ds=distractorsEN(w,3);
      if(ds.length<1)kind='flash';
      else{
        var q=kind==='mc-ev'?w.en:w.vi, isEv=kind==='mc-ev';
        var opts=shuffle([w].concat(ds));
        html+='<div class="v27q"><div class="v27q-prompt">'+esc(q)+'</div>'
          +(isEv&&w.ipa?'<div class="v27q-ipa">/'+esc(w.ipa)+'/</div>':'')
          +'<p class="v27q-hint">'+(isEv?'Chọn nghĩa tiếng Việt đúng':'Chọn từ tiếng Anh đúng')+'</p><div class="v27opts">'
          +opts.map(function(o){
              var label=isEv?o.vi:o.en, sub=isEv?(''):(o.ipa?'IPA: /'+o.ipa+'/':'');
              var ok=o.id===w.id;
              return optBtnHTML(esc(label),esc(sub),"window.__v27.answerMC('"+esc(w.id)+"',"+(ok?'true':'false')+",'"+esc(o.id)+"')");
            }).join('')+'</div>'
          +'<button type="button" class="v27link" onclick="window.__v27.speakEN(\''+esc(w.id)+'\')">🔊 Nghe phát âm</button></div>';
      }
    }
    if(kind==='type'){
      html+='<div class="v27q"><div class="v27q-prompt">'+esc(w.vi)+'</div>'
        +'<p class="v27q-hint">Gõ từ tiếng Anh tương ứng'+(w.pos?' ('+esc(w.pos)+')':'')+'</p>'
        +'<input id="v27type-in" class="v27input" type="text" autocomplete="off" autocapitalize="off" placeholder="Nhập từ tiếng Anh…" aria-label="Nhập từ tiếng Anh">'
        +'<div class="v27row"><button type="button" class="v27btn pri" onclick="window.__v27.answerType(\''+esc(w.id)+'\')">Kiểm tra</button>'
        +'<button type="button" class="v27btn ghost" onclick="window.__v27.typeHint(\''+esc(w.id)+'\')">Gợi ý</button></div>'
        +'<div id="v27type-hint" class="v27hint"></div></div>';
    }
    if(kind==='listen'){
      var ds2=distractorsEN(w,3);
      if(ds2.length<1)kind='flash';
      else{
        var opts2=shuffle([w].concat(ds2));
        html+='<div class="v27q"><div class="v27q-prompt">🔊 Nghe và chọn từ</div>'
          +'<p class="v27q-hint">Nhấn nghe rồi chọn từ bạn nghe được</p>'
          +'<button type="button" class="v27btn ghost" onclick="window.__v27.speakEN(\''+esc(w.id)+'\')">🔊 Nghe lại</button><div class="v27opts">'
          +opts2.map(function(o){
              return optBtnHTML(esc(o.en),o.ipa?('/'+esc(o.ipa)+'/'):'' ,"window.__v27.answerMC('"+esc(w.id)+"',"+(o.id===w.id?'true':'false')+",'"+esc(o.id)+"')");
            }).join('')+'</div></div>';
        setTimeout(function(){speakEN(w.id)},200);
      }
    }
    if(kind==='flash'){
      html+='<div class="v27q"><div class="v27q-prompt">'+esc(w.en)+'</div>'
        +(w.ipa?'<div class="v27q-ipa">/'+esc(w.ipa)+'/</div>':'')
        +'<div class="v27q-mean">'+esc(w.vi)+'</div>'
        +'<p class="v27q-hint">Tự đánh giá: bạn có nhớ từ này không?</p><div class="v27row">'
        +'<button type="button" class="v27btn ok" onclick="window.__v27.answerFlash(\''+esc(w.id)+'\',true)">Nhớ rồi</button>'
        +'<button type="button" class="v27btn bad" onclick="window.__v27.answerFlash(\''+esc(w.id)+'\',false)">Chưa nhớ</button></div></div>';
    }
  }else{
    var c=wordById('ko',id);
    if(!c){nextQ();return}
    if(kind==='mc-hm'||kind==='mc-mh'){
      var dsk=distractorsKO(c,3);
      if(dsk.length<1)kind='flash';
      else{
        var isHm=kind==='mc-hm';
        var optsK=shuffle([c].concat(dsk));
        html+='<div class="v27q"><div class="v27q-prompt">'+esc(isHm?c.h:c.m)+'</div>'
          +(isHm&&c.p?'<div class="v27q-ipa">'+esc(c.p)+'</div>':'')
          +'<p class="v27q-hint">'+(isHm?'Chọn nghĩa tiếng Việt đúng':'Chọn từ tiếng Hàn đúng')+'</p><div class="v27opts">'
          +optsK.map(function(o){
              var label=isHm?o.m:o.h, sub=isHm?'':(o.p||'');
              return optBtnHTML(esc(label),esc(sub),"window.__v27.answerMC('"+esc(c.id)+"',"+(o.id===c.id?'true':'false')+",'"+esc(o.id)+"')");
            }).join('')+'</div>'
          +'<button type="button" class="v27link" onclick="window.__v27.speakKOText(\''+esc(c.h)+'\')">🔊 Nghe tiếng Hàn</button></div>';
      }
    }
    if(kind==='listen'){
      var dsk2=distractorsKO(c,3);
      if(dsk2.length<1)kind='flash';
      else{
        var optsK2=shuffle([c].concat(dsk2));
        html+='<div class="v27q"><div class="v27q-prompt">🔊 Nghe và chọn từ</div>'
          +'<p class="v27q-hint">Nhấn nghe rồi chọn từ tiếng Hàn bạn nghe được</p>'
          +'<button type="button" class="v27btn ghost" onclick="window.__v27.speakKOText(\''+esc(c.h)+'\')">🔊 Nghe lại</button><div class="v27opts">'
          +optsK2.map(function(o){
              return optBtnHTML(esc(o.h),esc(o.p||''),"window.__v27.answerMC('"+esc(c.id)+"',"+(o.id===c.id?'true':'false')+",'"+esc(o.id)+"')");
            }).join('')+'</div></div>';
        setTimeout(function(){speakKO(c.h)},200);
      }
    }
    if(kind==='flash'){
      html+='<div class="v27q"><div class="v27q-prompt">'+esc(c.h)+'</div>'
        +(c.p?'<div class="v27q-ipa">'+esc(c.p)+'</div>':'')
        +'<div class="v27q-mean">'+esc(c.m)+'</div>'
        +'<p class="v27q-hint">Tự đánh giá: bạn có nhớ từ này không?</p><div class="v27row">'
        +'<button type="button" class="v27btn ok" onclick="window.__v27.answerFlash(\''+esc(c.id)+'\',true)">Nhớ rồi</button>'
        +'<button type="button" class="v27btn bad" onclick="window.__v27.answerFlash(\''+esc(c.id)+'\',false)">Chưa nhớ</button></div></div>';
    }
  }
  body.innerHTML=html;
  if(_elapsedIv)clearInterval(_elapsedIv);
  _elapsedIv=setInterval(function(){
    var el=$('#v27elapsed');
    if(el&&SES)el.textContent=fmtMins((Date.now()-SES.startedAt)/60000);
    else if(_elapsedIv){clearInterval(_elapsedIv);_elapsedIv=null}
  },15000);
}
function showFeedback(ok){
  var body=$('#v27body');if(!body||!SES)return;
  var id=SES.list[SES.idx];
  var right='';
  if(SES.lang==='en'){var w=wordById('en',id);if(w)right=w.en+' — '+w.vi}
  else{var c=wordById('ko',id);if(c)right=c.h+' — '+c.m}
  var fb=document.createElement('div');
  fb.className='v27fb '+(ok?'ok':'bad');
  fb.innerHTML='<b>'+(ok?'Chính xác!':'Chưa đúng.')+'</b><span>'+esc(right)+'</span>'
    +'<button type="button" class="v27btn pri" onclick="window.__v27.nextQ()">'+(SES.idx+1>=SES.list.length&&!(SES.phase==='main'&&SES.reask.length)?'Xem kết quả':'Câu tiếp theo')+' →</button>';
  body.appendChild(fb);
  try{fb.scrollIntoView({block:'nearest'})}catch(e){}
  /* khóa các nút đáp án sau khi đã trả lời */
  $$('.v27opt',body).forEach(function(b){b.disabled=true});
  var tin=$('#v27type-in');if(tin)tin.disabled=true;
}
function answerMC(id,ok,pickedId){
  if(!SES||SES.answeredCur)return;
  if(pickedId){
    var btns=$$('.v27opt');
    btns.forEach(function(b){
      if(b.getAttribute('onclick')&&b.getAttribute('onclick').indexOf("'"+pickedId+"'")>=0)b.classList.add(ok?'picked-ok':'picked-bad');
    });
  }
  answerCurrent(ok);
}
function answerType(id){
  if(!SES||SES.answeredCur)return;
  var inp=$('#v27type-in');if(!inp)return;
  var w=wordById('en',id);if(!w)return;
  answerCurrent(norm(inp.value)===norm(w.en)&&norm(inp.value).length>0);
}
function typeHint(id){
  var w=wordById('en',id);if(!w)return;
  var h=$('#v27type-hint');if(!h)return;
  h.textContent='Gợi ý: bắt đầu bằng "'+w.en.charAt(0).toUpperCase()+'", '+w.en.length+' chữ cái.';
}
function answerFlash(id,ok){
  if(!SES||SES.answeredCur)return;
  answerCurrent(ok);
}
function renderSummary(s,rec,bonus,gem){
  var body=$('#v27body');if(!body)return;
  var acc=rec.total>0?Math.round(rec.correct/rec.total*100):0;
  var nextReview='chưa có dữ liệu';
  try{
    var d=en27(),dueList=[];
    s.allIds.forEach(function(id){
      if(s.lang==='en'){var e15=en15st();if(e15.due[id])dueList.push(e15.due[id])}
      else{var c=wordById('ko',id);if(c&&c.due)dueList.push(c.due)}
    });
    if(dueList.length)nextReview=fmtDate(Math.min.apply(null,dueList));
  }catch(e){}
  var wordLine=function(id){
    if(s.lang==='en'){var w=wordById('en',id);return w?esc(w.en+' — '+w.vi):esc(id)}
    var c=wordById('ko',id);return c?esc(c.h+' — '+c.m):esc(id);
  };
  var html='<div class="v27done"><img class="v27mascot" src="assets/mascot-chick.png" alt="Gà con chúc mừng bạn">'
    +'<h3>Hoàn thành buổi học!</h3>'
    +'<div class="v27stats">'
    +'<div class="v27stat"><b>'+rec.correct+'/'+rec.total+'</b><span>câu đúng ('+acc+'%)</span></div>'
    +'<div class="v27stat"><b>+'+rec.xp+' XP</b><span>điểm kinh nghiệm</span></div>'
    +'<div class="v27stat"><b>'+fmtMins(rec.mins)+'</b><span>thời gian học thật</span></div>'
    +'<div class="v27stat"><b>'+rec.weakFixed+'</b><span>từ yếu đã củng cố</span></div></div>'
    +(s.improved.length?'<p class="v27line">Đã cải thiện: '+s.improved.slice(0,10).map(wordLine).join(' · ')+'</p>':'')
    +(s.stillWeak.length?'<p class="v27line warn">Vẫn còn yếu: '+s.stillWeak.slice(0,10).map(wordLine).join(' · ')+' — sẽ ưu tiên trong kế hoạch ngày mai.</p>':'')
    +'<p class="v27line">Lần ôn tiếp theo (sớm nhất): <b>'+esc(nextReview)+'</b></p>'
    +(bonus>0?'<p class="v27line bonus">+'+bonus+' XP — thưởng hoàn thành kế hoạch hôm nay (1 lần/ngày).</p>':'')
    +(gem>0?'<p class="v27line bonus">+1 💎 — bạn đã đạt chuỗi Học thông minh 7 ngày!</p>':'')
    +'<div class="v27row"><button type="button" class="v27btn pri" onclick="window.__v27.goTab(\'dash\')">Về Bảng điều khiển</button>'
    +'<button type="button" class="v27btn ghost" onclick="window.__v27.goTab(\'weak\')">Xem Từ yếu</button>'
    +'<button type="button" class="v27btn ghost" onclick="window.__v27.closeSmart()">Đóng</button></div></div>';
  body.innerHTML=html;
}

/* ---------- overlay UI ---------- */
var W27={tab:'dash',q:'',f:'all'};
function lang(){return en27().uiLang||'en'}
function ensureHub(){
  var h=$('#v27hub');
  if(h)return h;
  h=document.createElement('div');
  h.id='v27hub';h.className='v27hub';h.style.display='none';
  h.setAttribute('role','dialog');h.setAttribute('aria-label','Học thông minh');
  h.innerHTML='<div class="v27in">'
    +'<div class="v27head"><img class="v27mascot" src="assets/mascot-chick.png" alt="Gà con — mascot Học thông minh">'
    +'<div class="v27title"><b>Học thông minh</b><span>Smart Learning · gợi ý ôn tập theo tiến độ của bạn</span></div>'
    +'<button type="button" class="v27x" onclick="window.__v27.closeSmart()" aria-label="Đóng">✕</button></div>'
    +'<div class="v27lang" role="group" aria-label="Chọn ngôn ngữ">'
    +'<button type="button" id="v27lang-en" class="v27langbtn" onclick="window.__v27.setLang(\'en\')">🇬🇧 Tiếng Anh</button>'
    +'<button type="button" id="v27lang-ko" class="v27langbtn" onclick="window.__v27.setLang(\'ko\')">🇰🇷 Tiếng Hàn</button></div>'
    +'<div class="v27tabs" role="tablist">'
    +'<button type="button" class="v27tab" data-tab="dash" onclick="window.__v27.setTab(\'dash\')">Bảng điều khiển</button>'
    +'<button type="button" class="v27tab" data-tab="weak" onclick="window.__v27.setTab(\'weak\')">Từ yếu</button>'
    +'<button type="button" class="v27tab" data-tab="plan" onclick="window.__v27.setTab(\'plan\')">Kế hoạch ngày</button></div>'
    +'<div id="v27offline" class="v27offline" style="display:'+((typeof navigator!=='undefined'&&navigator.onLine===false)?'block':'none')+'">Bạn đang ngoại tuyến — Học thông minh vẫn học được, dữ liệu lưu trên máy này.</div>'
    +'<div class="v27body" id="v27body"></div></div>';
  document.body.appendChild(h);
  return h;
}
function openSmart(l){
  try{
    var d=en27();
    if(l==='en'||l==='ko')d.uiLang=l;
    saveSoon();
  }catch(e){}
  W27.tab='dash';
  var h=ensureHub();
  h.style.display='flex';
  try{document.body.style.overflow='hidden'}catch(e){}
  render();
}
function closeSmart(){
  var h=$('#v27hub');if(h)h.style.display='none';
  if(_elapsedIv){clearInterval(_elapsedIv);_elapsedIv=null}
  try{if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel()}catch(e){}
  try{
    var hub15=$('#v15hub');
    if(!hub15||hub15.style.display==='none')document.body.style.overflow='';
  }catch(e){document.body.style.overflow=''}
}
function setLang(l){
  if(l!=='en'&&l!=='ko')return;
  try{en27().uiLang=l;saveSoon()}catch(e){}
  W27.q='';W27.f='all';
  render();
}
function setTab(t){W27.tab=t;render()}
function goTab(t){W27.tab=t;render()}
function render(){
  var h=ensureHub();
  if(h.style.display==='none')return;
  var l=lang();
  $$('.v27langbtn',h).forEach(function(b){b.classList.toggle('on',b.id==='v27lang-'+l)});
  $$('.v27tab',h).forEach(function(b){b.classList.toggle('on',b.getAttribute('data-tab')===W27.tab)});
  if(W27.tab==='dash')renderDashboard();
  else if(W27.tab==='weak')renderWeak();
  else renderPlan();
}
function statCardHTML(b,span){return '<div class="v27stat"><b>'+b+'</b><span>'+span+'</span></div>'}
function scopeBanner27(){
  var l=lang();
  if(l!=='en')return '';
  var sc=scopeNameEN();
  if(!sc)return '';
  return '<div class="v27scope">Đang học trong bộ: <b>'+esc(sc)+'</b> — kế hoạch và thống kê chỉ tính từ trong bộ này.'
    +' <button type="button" class="v27link" onclick="window.__v15&&__v15.clearScope&&__v15.clearScope()">✕ Bỏ chọn</button></div>';
}
function renderDashboard(){
  var body=$('#v27body');if(!body)return;
  var l=lang(),d=en27(),now=Date.now();
  var learned=0,dueN=0,weakN=0,masteredN=0,total=0,last7c=0,last7t=0;
  var accHtml='chưa có dữ liệu',weekHtml='chưa có dữ liệu';
  if(l==='en'){
    var words=allENWords();
    total=words.length;
    words.forEach(function(w){var c=classifyEN(w);
      if(c.box>=1)learned++;
      if(c.cls==='MASTERED')masteredN++;
      if(c.cls==='WEAK')weakN++;
      if(c.box>=1&&c.due<=now)dueN++;
    });
    /* độ chính xác 7 ngày (mọi chế độ EN) từ hist có sẵn */
    try{
      var e15=en15st(),dn0=dayNo();
      for(var i=0;i<7;i++){var day=e15.hist[dn0-i];if(day){last7c+=day.c||0;last7t+=day.t||0}}
      if(last7t>0)accHtml=Math.round(last7c/last7t*100)+'%';
      var daysStudied=0;
      for(var j=0;j<7;j++){var dy=e15.hist[dn0-j];if(dy&&(dy.t||0)>0)daysStudied++}
      weekHtml=daysStudied+'/7 ngày';
    }catch(e){}
  }else{
    var cards=koCards();
    total=cards.length;
    cards.forEach(function(c){var cc=classifyKO(c);
      if(cc.box>=1)learned++;
      if(cc.cls==='MASTERED')masteredN++;
      if(cc.cls==='WEAK')weakN++;
      if(cc.box>=1&&cc.due<=now)dueN++;
    });
    /* KO: chỉ có dữ liệu Học thông minh (days) — chưa có thì nói rõ */
    try{
      var dn1=dayNo(),hasAny=false;
      for(var k=0;k<7;k++){var dd=d.days[dn1-k];if(dd){hasAny=true;last7c+=dd.c||0;last7t+=dd.t||0}}
      if(hasAny&&last7t>0)accHtml=Math.round(last7c/last7t*100)+'%';
      var ds=0,hasAny2=false;
      for(var k2=0;k2<7;k2++){var dd2=d.days[dn1-k2];if(dd2){hasAny2=true;if((dd2.t||0)>0)ds++}}
      if(hasAny2)weekHtml=ds+'/7 ngày';
    }catch(e){}
  }
  var pct=total>0?Math.round(masteredN/total*100):0;
  var mins7=0,ses7=0;
  try{
    var cutoff=Date.now()-7*864e5;
    d.sessions.forEach(function(s){if(s.lang===l&&s.t>=cutoff){mins7+=s.mins||0;ses7++}});
  }catch(e){}
  var minsHtml=(ses7>0)?(fmtMins(mins7)+' · '+ses7+' buổi'):'chưa có dữ liệu';
  var streak=d.streak[l]||{n:0};
  var suggest='';
  if(dueN>0||weakN>0){
    suggest='Gợi ý học thông minh: bạn có <b>'+dueN+' từ đến hạn</b>'+(weakN>0?' và <b>'+weakN+' từ yếu</b>':'')+' — nên ôn hôm nay trước khi học từ mới.';
  }else if(total===0){
    suggest='Chưa có dữ liệu — hãy thêm từ vựng rồi quay lại đây.';
  }else{
    suggest='Gợi ý học thông minh: không có từ nào đến hạn — hôm nay học từ mới hoặc ôn lại từ yếu nhé.';
  }
  body.innerHTML=scopeBanner27()
    +'<div class="v27suggest">'+suggest+'</div>'
    +'<div class="v27stats">'
    +statCardHTML(learned+'/'+total,'từ đã học')
    +statCardHTML(dueN,'cần ôn hôm nay')
    +statCardHTML(weakN,'từ yếu')
    +statCardHTML((streak.n||0)+' ngày','chuỗi Học thông minh')
    +statCardHTML(accHtml,'độ chính xác 7 ngày'+(l==='ko'?' (Học thông minh)':''))
    +statCardHTML(minsHtml,'thời gian học gần đây')
    +statCardHTML(pct+'%','tiến độ đã thuộc ('+masteredN+'/'+total+')')
    +statCardHTML(weekHtml,'tiến trình tuần')
    +'</div>'
    +'<div class="v27row"><button type="button" class="v27btn pri" onclick="window.__v27.startPlan(\''+l+'\')">Bắt đầu kế hoạch hôm nay</button>'
    +'<button type="button" class="v27btn ghost" onclick="window.__v27.goWeak()">Ôn từ yếu ('+weakN+')</button></div>'
    +'<p class="v27note">XP và 💎 dùng chung cho cả hai ngôn ngữ. Số liệu tiếng Hàn chỉ tính từ khi dùng Học thông minh; lịch sử cũ không khôi phục được.</p>';
}
function goWeak(){W27.tab='weak';W27.f='weak';render()}
function weakSearch(q){W27.q=q||'';renderWeak(true)}
function weakFilter(f){W27.f=f;renderWeak(true)}
function renderWeak(keepFocus){
  var body=$('#v27body');if(!body)return;
  var l=lang(),q=(W27.q||'').toLowerCase(),f=W27.f||'all';
  var rows=[];
  if(l==='en'){
    allENWords().forEach(function(w){
      var c=classifyEN(w);
      if(f!=='all'&&c.cls!==f.toUpperCase())return;
      if(q&&w.en.toLowerCase().indexOf(q)<0&&(w.vi||'').toLowerCase().indexOf(q)<0)return;
      rows.push({id:w.id,w:w,c:c});
    });
  }else{
    koCards().forEach(function(cd){
      var cc=classifyKO(cd);
      if(f!=='all'&&cc.cls!==f.toUpperCase())return;
      if(q&&cd.h.toLowerCase().indexOf(q)<0&&(cd.m||'').toLowerCase().indexOf(q)<0&&(cd.p||'').toLowerCase().indexOf(q)<0)return;
      rows.push({id:cd.id,w:cd,c:cc});
    });
  }
  rows.sort(function(a,b){return b.c.prio-a.c.prio});
  var shown=rows.slice(0,100);
  var filters=[['all','Tất cả'],['weak','Từ yếu'],['review','Đến hạn'],['new','Mới'],['learning','Đang học'],['mastered','Đã thuộc']];
  var html=scopeBanner27()
    +'<div class="v27search"><input class="v27input" type="search" placeholder="Tìm từ…" value="'+esc(W27.q||'')+'" oninput="window.__v27.weakSearch(this.value)" aria-label="Tìm từ"></div>'
    +'<div class="v27filters">'+filters.map(function(ft){
        return '<button type="button" class="v27chip '+(f===ft[0]?'on':'')+'" onclick="window.__v27.weakFilter(\''+ft[0]+'\')">'+ft[1]+'</button>';
      }).join('')+'</div>';
  if(!rows.length){
    html+='<div class="v27empty">'+(f==='weak'?'Chưa có từ yếu — tuyệt vời!':(q?'Không tìm thấy từ nào khớp "'+esc(W27.q)+'".':'Chưa có dữ liệu cho mục này.'))+'</div>';
  }else{
    html+='<p class="v27note">'+rows.length+' từ'+(rows.length>100?' — hiển thị 100 từ ưu tiên cao nhất, thu hẹp bộ lọc để xem thêm':'')+'.</p><div class="v27rows">'
      +shown.map(function(r){
        var stars='★'.repeat(r.c.box)+'☆'.repeat(5-r.c.box);
        var wrongLine,sub2;
        if(l==='en'){
          wrongLine='Sai '+r.c.wr+' · Đúng '+r.c.r+' lần';
          sub2=(r.w.pos?esc(r.w.pos)+' · ':'')+(r.w.lv?esc(r.w.lv):'');
        }else{
          wrongLine='Sai '+(r.w.w||0)+' lần (thẻ)'+((r.c.r>0||r.c.wr>0)?' · Học thông minh: đúng '+r.c.r+'/sai '+r.c.wr:'');
          sub2=esc((r.w.p||'')+(r.w.g?' · '+r.w.g:''));
        }
        var main=l==='en'?esc(r.w.en):esc(r.w.h);
        var mean=l==='en'?esc(r.w.vi||'Chưa có dữ liệu'):esc(r.w.m||'Chưa có dữ liệu');
        return '<div class="v27row2"><div class="v27w"><b>'+main+'</b><span>'+mean+'</span><span class="v27sub">'+sub2+'</span>'
          +'<span class="v27sub">'+esc(wrongLine)+' · Lần ôn gần nhất: '+fmtDate(r.c.last)+'</span>'
          +'<span class="v27sub">Mức độ: '+stars+' (box '+r.c.box+'/5) · '+esc(r.c.reason)+'</span></div>'
          +'<div class="v27rowacts"><span class="v27badge '+r.c.cls.toLowerCase()+'">'+CLS_VI[r.c.cls]+'</span>'
          +'<button type="button" class="v27btn ghost sm" onclick="window.__v27.speakWord(\''+l+'\',\''+esc(r.id)+'\')">🔊 Nghe</button>'
          +'<button type="button" class="v27btn pri sm" onclick="window.__v27.startWeakWord(\''+l+'\',\''+esc(r.id)+'\')">Ôn ngay</button></div></div>';
      }).join('')+'</div>';
  }
  body.innerHTML=html;
  if(keepFocus){
    var inp=$('.v27search input',body);
    if(inp&&document.activeElement!==inp){/* giữ nguyên vị trí gõ: chỉ focus lại khi đang gõ */
      try{inp.focus();var v=inp.value;inp.setSelectionRange(v.length,v.length)}catch(e){}
    }
  }
}
function startWeakWord(lang,id){startWeak(lang,id)}
function setMins(m){
  var l=lang();
  try{en27().plan[l].mins=clamp(Math.round(m),1,60);saveSoon()}catch(e){}
  renderPlan();
}
function setCustomMins(){
  var inp=$('#v27custom-mins');if(!inp)return;
  var m=parseInt(inp.value,10);
  if(!m||m<1||m>60){inp.focus();return}
  setMins(m);
}
function rebuildPlan(){
  var l=lang(),mins=en27().plan[l].mins||10;
  var body=$('#v27body');if(body)body.innerHTML='<div class="v27loading">Đang xây dựng lại kế hoạch…</div>';
  buildPlan(l,mins).then(function(){renderPlan()});
}
function renderPlan(){
  var body=$('#v27body');if(!body)return;
  var l=lang(),d=en27();
  var mins=d.plan[l].mins||10;
  var est=Math.min(30,Math.max(1,Math.round(mins*2)));
  /* đếm số từ có sẵn theo từng nhóm (số thật từ kho dữ liệu) */
  var avail={NEW:0,DUE:0,WEAK:0},total=0;
  if(l==='en'){
    allENWords().forEach(function(w){var c=classifyEN(w);total++;
      if(c.cls==='NEW')avail.NEW++;else if(c.cls==='REVIEW')avail.DUE++;else if(c.cls==='WEAK')avail.WEAK++;});
  }else{
    koCards().forEach(function(cd){var cc=classifyKO(cd);total++;
      if(cc.cls==='NEW')avail.NEW++;else if(cc.cls==='REVIEW')avail.DUE++;else if(cc.cls==='WEAK')avail.WEAK++;});
  }
  var p=planOf(l);
  var goals=p?p.goals:{complete:false,acc80:false,weak5:false};
  var lastSes=null;
  try{d.sessions.forEach(function(s){if(!lastSes&&s.lang===l)lastSes=s})}catch(e){}
  var goalRow=function(ok,label){
    return '<div class="v27goal '+(ok?'done':'')+'"><span>'+(ok?'✓':'○')+'</span><span>'+label+'</span></div>';
  };
  body.innerHTML=scopeBanner27()
    +'<div class="v27plan"><h3>Kế hoạch ngày — '+(l==='en'?'Tiếng Anh':'Tiếng Hàn')+'</h3>'
    +'<p class="v27note">Chọn thời gian bạn có hôm nay. Số từ là <b>ước tính</b> (~2 từ/phút), không phải cam kết.</p>'
    +'<div class="v27time">'
    +[5,10,15].map(function(m){return '<button type="button" class="v27chip big '+(mins===m?'on':'')+'" onclick="window.__v27.setMins('+m+')">'+m+' phút</button>'}).join('')
    +'<span class="v27custom"><input id="v27custom-mins" class="v27input sm" type="number" min="1" max="60" value="'+mins+'" aria-label="Số phút tùy chọn"> phút '
    +'<button type="button" class="v27btn ghost sm" onclick="window.__v27.setCustomMins()">Áp dụng</button></span></div>'
    +'<p class="v27line">Ước tính: <b>~'+est+' từ</b> cho '+mins+' phút.</p>'
    +'<div class="v27stats">'
    +statCardHTML(avail.NEW,'từ mới có sẵn')
    +statCardHTML(avail.DUE,'từ đến hạn có sẵn')
    +statCardHTML(avail.WEAK,'từ yếu có sẵn')
    +'</div>'
    +(p?'<p class="v27line">Kế hoạch hôm nay: <b>'+p.ids.length+' từ</b> ('+p.newN+' mới · '+p.dueN+' đến hạn · '+p.weakN+' yếu) — đã học '+p.doneIds.length+'/'+p.ids.length+'.</p>'
      :'<p class="v27line">Chưa có kế hoạch cho hôm nay — nhấn "Bắt đầu học" để xây dựng.</p>')
    +'<div class="v27goals">'
    +goalRow(goals.complete,'Hoàn thành kế hoạch hôm nay')
    +goalRow(goals.acc80,'Độ chính xác ≥ 80%')
    +goalRow(goals.weak5,'Củng cố ≥ 5 từ yếu')
    +'</div>'
    +'<div class="v27row"><button type="button" class="v27btn pri" onclick="window.__v27.startPlan(\''+l+'\')">Bắt đầu học</button>'
    +'<button type="button" class="v27btn ghost" onclick="window.__v27.rebuildPlan()">Xây dựng lại kế hoạch</button></div>'
    +(lastSes?'<p class="v27line">Buổi gần nhất: '+fmtDate(lastSes.t)+' — đúng '+lastSes.correct+'/'+lastSes.total+' · +'+lastSes.xp+' XP · '+fmtMins(lastSes.mins)+'.</p>':'<p class="v27line">Chưa có buổi Học thông minh nào — buổi đầu tiên sẽ được ghi lại ở đây.</p>')
    +'<p class="v27note">Hoàn thành kế hoạch: +20 XP (1 lần/ngày/ngôn ngữ — mức đề xuất, chờ xác nhận). Đạt chuỗi Học thông minh 7 ngày: +1 💎 (1 lần/tuần/ngôn ngữ).</p>'
    +'<p class="v27note">Nếu bộ đang chọn có ít từ hơn kế hoạch cần, V27 sẽ báo thiếu rõ ràng chứ không tự lấy từ ngoài bộ.</p>'
    +'</div>';
}

/* ---------- EN Hub entry: MutationObserver decorator (zero old-file edits) ---------- */
var _decT=null;
function decorateEN(){
  try{
    var hb=document.querySelector('.v15hub-headbtns');
    if(hb&&!hb.querySelector('.v27hubbtn')){
      var b=document.createElement('button');
      b.className='btn sm v27hubbtn';b.type='button';b.textContent='🧠 Học thông minh';
      b.onclick=function(){openSmart('en')};
      var x=hb.querySelector('.v15x');
      if(x)hb.insertBefore(b,x);else hb.appendChild(b);
    }
    var lb=document.querySelector('#v15langbar .v15lb-in');
    if(lb&&!lb.querySelector('.v27hubbtn')){
      var b2=document.createElement('button');
      b2.className='v15lb-hub v27hubbtn';b2.type='button';b2.textContent='🧠 Học thông minh';
      b2.onclick=function(){openSmart('en')};
      lb.appendChild(b2);
    }
  }catch(e){}
}
function scheduleDecorate(){
  if(_decT)return;
  _decT=setTimeout(function(){_decT=null;decorateEN()},60);
}
try{
  decorateEN();
  if(window.MutationObserver){
    var _obs=new MutationObserver(function(){scheduleDecorate()});
    _obs.observe(document.body,{childList:true,subtree:true});
  }
}catch(e){}

/* ---------- offline note (listening only; learning stays local) ---------- */
try{
  window.addEventListener('online',function(){var n=$('#v27offline');if(n)n.style.display='none'});
  window.addEventListener('offline',function(){var n=$('#v27offline');if(n)n.style.display='block'});
}catch(e){}

try{
  window.__v27={
    version:VERSION,
    openSmart:openSmart,closeSmart:closeSmart,setTab:setTab,setLang:setLang,goTab:goTab,goWeak:goWeak,
    recordAnswer:recordAnswer,buildPlan:buildPlan,planOf:planOf,
    startPlan:startPlan,startSession:startSession,startWeak:startWeak,startWeakWord:startWeakWord,
    setMins:setMins,setCustomMins:setCustomMins,rebuildPlan:rebuildPlan,
    answerMC:answerMC,answerType:answerType,answerFlash:answerFlash,typeHint:typeHint,
    nextQ:nextQ,endEarly:endEarly,
    speakEN:speakEN,speakKOText:speakKO,speakWord:speakWord,
    weakSearch:weakSearch,weakFilter:weakFilter,
    en27:en27,classifyEN:classifyEN,classifyKO:classifyKO,
    _test:{en27:en27,koCards:koCards,allENWords:allENWords,buildPlanCore:buildPlanCore,claimPlanBonus:claimPlanBonus,claimStreak7:claimStreak7}
  };
}catch(e){}
})();
