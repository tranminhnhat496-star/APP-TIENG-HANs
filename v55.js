/* ===== V55 — KO SRS REVIEW UI (V19.8) =====
   V19.8 "SRS tiếng Hàn": the dedicated Korean SRS review screen that
   the app never had — due queue + weak words + review stats for KO,
   reusing the EN SRS machinery (Smart Learning v27) instead of
   rewriting it. Director (Claude, 2026-11-25): choose (a), two layers
   — queue + weak + stats first (flag koSrsUI); the Smart Learning
   daily plan (b) comes in a LATER version after TOPIK. Do NOT build
   the daily plan here.

   WHAT EXISTS ALREADY (reused, never rewritten):
   - V6 core SRS: mark(ok) advances box 0..5 / resets to 0, due =
     now + IV[box] (x1.5 if pet 3 owned); res(c,ok) keeps the sticky
     wrong counter w (w++ on wrong, cleared only on correct at
     box>=4); wilt(c) = box>=1 && due<=now.
   - v27 Smart Learning: classifyKO (WEAK/REVIEW/LEARNING/NEW/
     MASTERED + prio), koCards (deck rule), buildPlanCore('ko'),
     startSession('ko', ids, kind) with MC/type/listen/flash and
     answerKO (box/due advance + recordAnswer('ko',...,'smart')),
     startWeak('ko'), en27() stats (ko.right/wrong/cw/cr/last,
     streak.ko). All exported on window.__v27.
   WHAT V55 ADDS:
   - isDue55(box, due, now): ONE shared due rule for BOTH languages —
     box 1-4 AND due<=now (the C-R3-1 rule, also what EN statsOf and
     v27 classifyEN/classifyKO use). The V6 farm predicate wilt() is
     box>=1 with NO box cap, so a box-5 card past due still shows
     "wilted" on the farm while SRS treats box 5 as mastered — that
     is intentional (farm wilt != SRS due), documented in the tests.
   - dueQueue55(cap): learned-only (box>=1) KO cards that are due,
     ordered by due ASC (oldest first), tiebreak by v27 prio DESC,
     capped at cap (default 40, UI-adjustable 30/40/50). Bulk-import
     box-0 cards NEVER enter the queue.
   - weakList55(): KO cards classified WEAK (reuse __v27.classifyKO),
     prio DESC.
   - koStats55(): due / learned / weak / mastered / reviewed-today
     (KO-only, from en27().ko.last within today) / Smart streak (ko).
     All computed read-only — no new storage for stats.
   - openSrs(): overlay #v55hub with the stats, the cap selector,
     the due queue (due order, overdue days, weak badges), the weak
     list, and "Bắt đầu ôn" which hands the capped queue to
     __v27.startSession('ko', ids, 'srs') — the shared EN/KO session
     engine, so answers advance box/due exactly like Smart Learning.
   - KO Hub entry: runtime decorator (V48/V54 precedent) inserts a
     .v55kotab button into #tabs after .v27kotab; the hub itself is
     never rebuilt.
   SAVE RULES: READ-ONLY on box/due/w. The only new state is lazy
   S.v7.en55 {v, flags:{koSrsUI}, cap} — created only when the
   feature is used (cap change / flag set). Reviewed-today and streak
   are read from en27(); the review session writes through v27's own
   recordAnswer/saveSoon path. Cloud Sync is never touched by this
   layer (the wrapped global save() still round-trips the whole S).
   MISSING DATA: cards without IPA/meaning show "Chưa có nghĩa" /
   omit the line — never guessed. No Korean is ever invented here. */
var VERSION='19.8.0';

/* ---------- V15 global re-exposure (drive-by fix, V19.5.1 latent bug) ----------
   v16.js defines `function V15(){ return window.__v15||null; }` as the
   shared accessor every layer uses — but its block is IIFE-wrapped, so
   the bare global V15() does NOT exist in the page. Every caller wraps
   it in try/catch EXCEPT v27's speakKO error callback, which calls it
   unguarded: on any TTS failure (no voices — headless Chrome, some
   Android devices) the "Không phát được âm thanh" toast never shows
   and an uncaught exception fires instead. Re-exposing the exact v16
   implementation as a global fixes that path (and every other caller)
   with no earlier block touched. */
try{if(typeof V15==='undefined')window.V15=function(){try{return window.__v15||null}catch(e){return null}}}catch(e){}

/* ---------- tiny helpers (bare S — lexical global, never window.S) ---------- */
function getS55(){try{return S}catch(e){return null}}
function esc55(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function save55(){try{if(typeof save==='function')save()}catch(e){}}
function clamp55(n,a,b){return Math.max(a,Math.min(b,n))}

/* ---------- flags + settings (lazy S.v7.en55; v54 flag pattern) ---------- */
function defEn55(){return {v:1,flags:{koSrsUI:1},cap:40}}
function en55(){
  var s=getS55();
  if(!s)return defEn55();
  try{
    s.v7=s.v7||{};
    var d=s.v7.en55;
    if(!d){d=s.v7.en55=defEn55()}
    if(typeof d!=='object'||!d)d=s.v7.en55=defEn55();
    if(!d.flags||typeof d.flags!=='object')d.flags={koSrsUI:1};
    if(typeof d.cap!=='number'||!(d.cap>=30&&d.cap<=50))d.cap=40;
    return d;
  }catch(e){return defEn55()}
}
/* flagOn55Raw — read WITHOUT creating en55 (default ON when the state
   does not exist yet). Used by the load-time decorator so a fresh
   boot stays lazy: no en55 key until the feature is actually used. */
function flagOn55Raw(name){
  try{
    var s=getS55();if(!s||!s.v7||!s.v7.en55||!s.v7.en55.flags)return true;
    var v=s.v7.en55.flags[name];
    return v===undefined?true:v!==0;
  }catch(e){return true}
}
function flagOn55(name){try{var e=en55();return e.flags[name]!==0}catch(e){return true}}
function setFlag55(name,on){
  try{var e=en55();e.flags[name]=on?1:0;save55();return true}catch(e){return false}
}
function cap55(){try{return clamp55(parseInt(en55().cap,10)||40,30,50)}catch(e){return 40}}
function setCap55(n){
  try{
    n=clamp55(parseInt(n,10)||40,30,50);
    var e=en55();e.cap=n;save55();
    renderSrs();
    return n;
  }catch(e){return 40}
}

/* ---------- ONE shared due rule for both languages (C-R3-1) ----------
   due = box 1-4 AND due<=now. A due-less learned card (due 0 /
   missing) reads as "due today", never as overdue since the epoch
   (V50 C-R5-2). Box 5 is mastered, never due — the farm predicate
   wilt() (box>=1, no cap) is a DIFFERENT concept and is left alone. */
function isDue55(box,due,now){
  var b=(box||0)|0,du=(due||0),t=(now||Date.now());
  return b>=1&&b<=4&&du<=t;
}
function dueFor55(lang,id){
  var out={box:0,due:0,isDue:false,found:false};
  try{
    if(lang==='en'){
      var v=null;try{v=window.__v15||null}catch(e){}
      if(!v||!v.enOld||!v.en15)return out;
      var old=v.enOld(),e15=v.en15();
      out.box=(old.box||{})[id]||0;
      out.due=(e15.due||{})[id]||0;
      out.found=true;
    }else{
      var s=getS55();if(!s||!s.cards)return out;
      for(var i=0;i<s.cards.length;i++){
        if(s.cards[i]&&s.cards[i].id===id){
          out.box=s.cards[i].box||0;
          out.due=s.cards[i].due||0;
          out.found=true;
          break;
        }
      }
    }
    out.isDue=isDue55(out.box,out.due,Date.now());
  }catch(e){}
  return out;
}

/* ---------- KO data access (reuse __v27 when present) ---------- */
function koCards55(){
  try{
    if(window.__v27&&__v27._test&&__v27._test.koCards)return __v27._test.koCards();
  }catch(e){}
  /* fallback: the v27 koCards rule, verbatim (deck >=8 -> deck only) */
  var cards=[];
  try{
    var S0=getS55();if(!S0||!S0.cards)return [];
    cards=S0.cards.filter(function(c){return c&&c.h&&c.m});
    if(S0.deck){
      var inDeck=cards.filter(function(c){return c.d===S0.deck});
      if(inDeck.length>=8)return inDeck;
    }
  }catch(e){return []}
  return cards;
}
function classify55(c){
  try{
    if(window.__v27&&__v27.classifyKO)return __v27.classifyKO(c);
  }catch(e){}
  /* fallback: the v27 classifyKO rule, simplified (no v27 history) */
  var now=Date.now(),box=c.box||0,w=c.w||0,due=c.due||0;
  var weak=(w>=3&&box<4);
  var mastered=(box>=5&&!w);
  var dueNow=isDue55(box,due,now);
  var cls,reason;
  if(weak){cls='WEAK';reason='Sai '+w+' lần (thẻ)'}
  else if(mastered){cls='MASTERED';reason='Đã thuộc — ôn nhắc lại'}
  else if(dueNow){cls='REVIEW';var od=due?Math.floor(Math.max(0,(now-due)/864e5)):0;reason=od>0?('Đến hạn '+od+' ngày'):('Đến hạn hôm nay')}
  else if(box===0&&!w){cls='NEW';reason='Từ mới — chưa học'}
  else{cls='LEARNING';reason='Đang học — box '+box+'/5'}
  var overdue=(box>0&&due)?Math.max(0,(now-due)/864e5):0;
  var prio=Math.max(0,w)*3+Math.min(overdue,30)+(box===0?1:0)-(mastered?100:0);
  return {cls:cls,prio:prio,overdue:overdue,reason:reason,box:box,r:0,wr:0,cw:0,cr:0,last:0,due:due,w:w};
}

/* ---------- due queue (learned only, due order, capped) ---------- */
function dueQueue55(cap){
  if(!flagOn55('koSrsUI'))return {items:[],total:0,capped:false,cap:cap55()};
  var now=Date.now();
  var n=(typeof cap==='number'&&cap>0)?Math.floor(cap):cap55();
  var rows=[];
  try{
    koCards55().forEach(function(c){
      var box=c.box||0,due=c.due||0;
      if(box<1)return; /* learned only — bulk-import box-0 cards never queue */
      if(!isDue55(box,due,now))return;
      var cl=classify55(c);
      var od=due?Math.floor(Math.max(0,(now-due)/864e5)):0;
      rows.push({id:c.id,h:c.h,m:c.m,p:c.p||'',g:c.g||'',box:box,due:due,
        overdueDays:od,cls:cl.cls,reason:cl.reason,prio:cl.prio||0,
        weak:cl.cls==='WEAK'});
    });
  }catch(e){}
  /* due ASC (oldest first); tiebreak prio DESC (weakest first).
     prio carries fractional overdue days, so two cards with the same
     due and the same wrong count can differ by microseconds of
     classify-call time — treat prio differences below 1e-6 (about
     0.1 s of wall time, far below any meaningful prio step of 1) as
     a tie and keep koCards order, so the queue order is deterministic
     across calls instead of jittering between opens. */
  rows.forEach(function(r,i){r._i=i});
  rows.sort(function(a,b){
    if(a.due!==b.due)return a.due-b.due;
    var dp=b.prio-a.prio;
    if(dp>1e-6||dp<-1e-6)return dp;
    return a._i-b._i;
  });
  rows.forEach(function(r){delete r._i});
  var total=rows.length;
  var items=rows.slice(0,n);
  return {items:items,total:total,capped:total>n,cap:n};
}

/* ---------- weak words (reuse __v27.classifyKO) ---------- */
function weakList55(){
  if(!flagOn55('koSrsUI'))return [];
  var rows=[];
  try{
    koCards55().forEach(function(c){
      var cl=classify55(c);
      if(cl.cls!=='WEAK')return;
      rows.push({id:c.id,h:c.h,m:c.m,p:c.p||'',g:c.g||'',box:c.box||0,
        due:c.due||0,reason:cl.reason,prio:cl.prio||0,w:c.w||0});
    });
  }catch(e){}
  /* prio DESC (weakest first); same epsilon tiebreak as the due
     queue — two weak cards with the same wrong count and due date
     must not swap places between calls on classify-call timing. */
  rows.forEach(function(r,i){r._i=i});
  rows.sort(function(a,b){
    var dp=b.prio-a.prio;
    if(dp>1e-6||dp<-1e-6)return dp;
    return a._i-b._i;
  });
  rows.forEach(function(r){delete r._i});
  return rows;
}

/* ---------- KO review stats (all read-only) ---------- */
function koStats55(){
  var st={total:0,learned:0,due:0,weak:0,mastered:0,reviewedToday:0,streak:0};
  if(!flagOn55('koSrsUI'))return st;
  try{
    var cards=koCards55();
    st.total=cards.length;
    cards.forEach(function(c){
      var cl=classify55(c);
      if((c.box||0)>=1)st.learned++;
      if(cl.cls==='MASTERED')st.mastered++;
      if(cl.cls==='WEAK')st.weak++;
    });
    st.due=dueQueue55().total;
    /* reviewed today (KO only): en27().ko.last within today. */
    try{
      var d=null;
      if(window.__v27&&__v27.en27)d=__v27.en27();
      if(d&&d.ko&&d.ko.last){
        var t0=new Date();t0.setHours(0,0,0,0);
        var n0=t0.getTime();
        Object.keys(d.ko.last).forEach(function(id){
          if((d.ko.last[id]||0)>=n0)st.reviewedToday++;
        });
      }
      if(d&&d.streak&&d.streak.ko)st.streak=d.streak.ko.n||0;
    }catch(e){}
  }catch(e){}
  return st;
}

/* ---------- overlay UI ---------- */
function ensureHub55(){
  var h=null;
  try{h=document.getElementById('v55hub')}catch(e){}
  if(h)return h;
  h=document.createElement('div');
  h.id='v55hub';h.className='v55hub';h.style.display='none';
  h.setAttribute('role','dialog');h.setAttribute('aria-label','Ôn SRS tiếng Hàn');
  document.body.appendChild(h);
  return h;
}
function flagOffHTML55(){
  return '<div class="v55empty">Tính năng này đang tạm tắt (cờ koSrsUI). Bật lại bằng <b>__v55.setFlag(\'koSrsUI\', true)</b> hoặc từ lần cập nhật sau.</div>';
}
function overdueText55(od){return od>0?('Đến hạn '+od+' ngày'):('Đến hạn hôm nay')}
function stars55(box){var s='';for(var i=0;i<5;i++)s+=i<box?'★':'☆';return s}
function rowHTML55(r){
  var mean=(r.m&&String(r.m).trim())?esc55(r.m):'<span class="v55mut">Chưa có nghĩa</span>';
  var sub=[r.p?esc55(r.p):'',r.g?esc55(r.g):''].filter(function(x){return x}).join(' · ');
  return '<div class="v55row"><div class="v55w"><b>'+esc55(r.h)+'</b><span>'+mean+'</span>'
    +(sub?'<span class="v55sub">'+sub+'</span>':'')
    +'<span class="v55sub">Mức độ: '+stars55(r.box)+' (box '+r.box+'/5) · '+esc55(r.reason||overdueText55(r.overdueDays))+'</span></div>'
    +'<div class="v55rowacts">'
    +(r.weak?'<span class="v55badge weak">Từ yếu</span>':'<span class="v55badge due">'+esc55(overdueText55(r.overdueDays))+'</span>')
    +'</div></div>';
}
function srsHTML55(){
  if(!flagOn55('koSrsUI'))return flagOffHTML55();
  var st=koStats55();
  var q=dueQueue55();
  var weak=weakList55();
  var cap=cap55();
  var h='<div class="v55card"><b>📅 Ôn SRS — tiếng Hàn</b>'
    +'<p class="v55mut">Hàng đợi ôn đến hạn cho tiếng Hàn — dùng chung cơ chế SRS với tiếng Anh (box 1–4, đến hạn thì ôn; box 5 là đã thuộc). Thẻ mới nhập (box 0) không vào hàng đợi cho đến khi bạn học nó.</p>'
    +'<div class="v55stats">'
    +'<div class="v55stat"><b>'+st.due+'</b><span>đến hạn hôm nay</span></div>'
    +'<div class="v55stat"><b>'+st.learned+'/'+st.total+'</b><span>từ đã học</span></div>'
    +'<div class="v55stat"><b>'+st.weak+'</b><span>từ yếu</span></div>'
    +'<div class="v55stat"><b>'+st.reviewedToday+'</b><span>đã ôn hôm nay</span></div>'
    +'<div class="v55stat"><b>'+(st.streak||0)+' ngày</b><span>chuỗi Học thông minh</span></div>'
    +'<div class="v55stat"><b>'+st.mastered+'</b><span>đã thuộc (box 5)</span></div>'
    +'</div>'
    +'<div class="v55rowline"><label for="v55cap">Mỗi buổi ôn tối đa</label>'
    +'<select id="v55cap" class="v55sel" onchange="window.__v55.setCap(this.value)" aria-label="Số từ tối đa mỗi buổi ôn">'
    +[30,40,50].map(function(n){return '<option value="'+n+'"'+(n===cap?' selected':'')+'>'+n+' từ</option>'}).join('')
    +'</select><span class="v55mut">Hàng đợi hôm nay có '+q.total+' từ'+(q.capped?' — buổi này ôn '+q.items.length+' từ đến hạn lâu nhất, còn lại để ngày mai':'')+'.</span></div>'
    +'<div class="v55acts"><button type="button" class="v55btn pri" onclick="window.__v55.startReview()" '+(q.items.length?'':'disabled')+'>Bắt đầu ôn ('+q.items.length+' từ)</button>'
    +'<button type="button" class="v55btn" onclick="window.__v55.startWeak()" '+(weak.length?'':'disabled')+'>Ôn từ yếu ('+weak.length+')</button></div>'
    +'</div>';
  /* due queue */
  h+='<div class="v55sec"><h3>Đến hạn ('+q.total+' từ)</h3>';
  if(!q.items.length){
    h+='<div class="v55empty">'+(st.learned===0?'Chưa có từ tiếng Hàn nào đã học — học vài từ trước đã rồi quay lại đây nhé.':'Không có từ nào đến hạn — tuyệt vời! Hôm nay học từ mới hoặc ôn lại từ yếu nhé.')+'</div>';
  }else{
    h+='<div class="v55rows">'+q.items.map(rowHTML55).join('')+'</div>';
    if(q.capped)h+='<p class="v55mut">Còn '+(q.total-q.items.length)+' từ đến hạn nữa — tăng giới hạn buổi ôn hoặc ôn tiếp ngày mai.</p>';
  }
  h+='</div>';
  /* weak words */
  h+='<div class="v55sec"><h3>Từ yếu ('+weak.length+')</h3>';
  if(!weak.length){
    h+='<div class="v55empty">Chưa có từ yếu — tuyệt vời!</div>';
  }else{
    h+='<div class="v55rows">'+weak.slice(0,20).map(function(r){
      return '<div class="v55row"><div class="v55w"><b>'+esc55(r.h)+'</b><span>'+((r.m&&String(r.m).trim())?esc55(r.m):'<span class="v55mut">Chưa có nghĩa</span>')+'</span>'
        +'<span class="v55sub">Mức độ: '+stars55(r.box)+' (box '+r.box+'/5) · '+esc55(r.reason)+'</span></div>'
        +'<div class="v55rowacts"><span class="v55badge weak">Từ yếu</span></div></div>';
    }).join('')+'</div>';
    if(weak.length>20)h+='<p class="v55mut">Hiển thị 20 từ yếu nhất — còn '+(weak.length-20)+' từ nữa.</p>';
  }
  h+='</div>';
  return h;
}
function overlayHTML55(){
  var h='<div class="v55in">'
    +'<div class="v55head"><div class="v55title"><b>📅 Ôn SRS — tiếng Hàn</b><span>Hàng đợi đến hạn · Từ yếu · Thống kê ôn tập</span></div>'
    +'<button type="button" class="v55x" onclick="window.__v55.closeSrs()" aria-label="Đóng">✕</button></div>';
  h+=srsHTML55();
  h+='</div>';
  return h;
}
function renderSrs(){
  try{
    var h=document.getElementById('v55hub');
    if(h&&h.style.display!=='none')h.innerHTML=overlayHTML55();
  }catch(e){}
}
function openSrs(){
  try{
    var h=ensureHub55();
    h.innerHTML=overlayHTML55();
    h.style.display='flex';
    try{document.body.style.overflow='hidden'}catch(e){}
  }catch(e){}
}
function closeSrs(){
  try{
    var h=document.getElementById('v55hub');if(h)h.style.display='none';
    try{document.body.style.overflow=''}catch(e){}
  }catch(e){}
}
/* Hand the capped due queue to the shared EN/KO session engine
   (v27 startSession). The v27 hub must be open first — startSession
   renders into #v27body. kind 'srs': finishSession only special-cases
   'plan', so no plan bonus or plan completion is ever touched. */
function startReview55(){
  try{
    if(!flagOn55('koSrsUI'))return false;
    var q=dueQueue55();
    if(!q.items.length){renderSrs();return false}
    var ids=q.items.map(function(it){return it.id});
    if(!window.__v27||!__v27.openSmart||!__v27.startSession)return false;
    closeSrs();
    __v27.openSmart('ko');
    return __v27.startSession('ko',ids,'srs');
  }catch(e){return false}
}
function startWeak55(){
  try{
    if(!flagOn55('koSrsUI'))return false;
    if(!window.__v27||!__v27.openSmart||!__v27.startWeak)return false;
    closeSrs();
    __v27.openSmart('ko');
    __v27.startWeak('ko');
    return true;
  }catch(e){return false}
}

/* ---------- KO Hub entry: MutationObserver decorator (V48/V54 precedent) ----------
   The V6 tab bar (#tabs) is re-rendered on every render(), so the
   button is re-inserted after each mutation. The hub itself is never
   rebuilt. Flag off -> the button is removed. */
var _decT55=null;
function decorateKO55(){
  try{
    var tabs=document.querySelector('#tabs');
    if(!tabs)return;
    /* Existence is checked against the tab bar's real children, not
       querySelector alone: a stub/odd DOM may answer a class query
       with a placeholder, and the precise condition we want is
       "the button is already a direct child of #tabs". */
    var btn=null;
    try{
      var ch=tabs.children||[];
      for(var i=0;i<ch.length;i++){if(ch[i]&&String(ch[i].className||'').indexOf('v55kotab')>=0){btn=ch[i];break}}
    }catch(e){}
    if(!flagOn55Raw('koSrsUI')){
      if(btn&&btn.parentNode&&btn.parentNode.removeChild)btn.parentNode.removeChild(btn);
      return;
    }
    if(btn)return;
    var b=document.createElement('button');
    b.type='button';b.className='tab v55kotab';
    b.setAttribute('onclick',"window.__v55&&__v55.openSrs()");
    b.setAttribute('title','Ôn SRS — SRS 복습');
    b.innerHTML='<span class="ti">📅</span><span>Ôn SRS</span>';
    var anchor=tabs.querySelector('.v27kotab');
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(b,anchor.nextSibling);
    else tabs.appendChild(b);
  }catch(e){}
}
function scheduleDecorate55(){
  if(_decT55)return;
  _decT55=setTimeout(function(){_decT55=null;decorateKO55()},60);
}

/* ---------- init ---------- */
function init55(){
  try{
    decorateKO55();
    if(window.MutationObserver){
      var _obs=new MutationObserver(function(){scheduleDecorate55()});
      _obs.observe(document.body,{childList:true,subtree:true});
    }
  }catch(e){}
}
try{init55()}catch(e){}
if(typeof document!=='undefined'&&document&&document.readyState==='loading'){try{document.addEventListener('DOMContentLoaded',function(){try{init55()}catch(e){}})}catch(e){}}

window.__v55={
  version:VERSION,
  isDue:isDue55,dueFor:dueFor55,
  dueQueue:dueQueue55,weakList:weakList55,koStats:koStats55,
  koCards:koCards55,classify:classify55,
  cap:cap55,setCap:setCap55,
  openSrs:openSrs,closeSrs:closeSrs,renderSrs:renderSrs,
  startReview:startReview55,startWeak:startWeak55,
  flagOn:flagOn55,setFlag:setFlag55,flagOnRaw:flagOn55Raw,
  en55:en55
};
