/* ============================================================
   Korean & English Vocab Farm — V21 (V13): Login & Account System
   Layer V21: Welcome / Login / Register / Forgot Password,
   Player Profile, Account Center, 10 fantasy avatars, guest mode
   with account linking, and per-UID local-save separation.
   Built on the V12 save manager (v20.js) and sync engine
   (v20_sync.js) — no second Firebase system. The save schema and
   the hanvocab.v1 key are unchanged.
   Version 13.0.0
   ============================================================ */
(function(){
'use strict';
var VERSION='13.0.0';
var SAVE_KEY='hanvocab.v1';
var SESSION_KEY='hanvocab.v13.session';
var SETTINGS_KEY='hanvocab.v13.settings';
var GUEST_HOME_KEY='hanvocab.v1.guest';
var GUEST_ID_KEY='hanvocab.v13.guestid';
function homeKey(uid){ return 'hanvocab.v1.acc.'+uid; }

/* 10 fantasy avatars. `wins` = unique bosses defeated (across the old
   boss mode + V10 + V11, 70 total) needed to unlock. The chick is free. */
var AVATARS=[
  {id:'chick',   name:'Gà con chiến binh', wins:0},
  {id:'fox',     name:'Cáo pháp sư',       wins:3},
  {id:'panda',   name:'Gấu trúc võ sĩ',    wins:8},
  {id:'cat',     name:'Mèo kiếm sĩ',       wins:15},
  {id:'rabbit',  name:'Thỏ phép thuật',    wins:20},
  {id:'owl',     name:'Cú học giả',        wins:30},
  {id:'wolf',    name:'Sói băng',          wins:40},
  {id:'dragon',  name:'Rồng con',          wins:50},
  {id:'unicorn', name:'Kỳ lân',            wins:60},
  {id:'phoenix', name:'Phượng hoàng',      wins:70}
];
var TOTAL_BOSSES=86; /* 10 old (V15) + 30 (V10) + 30 (V11) + 8 (V17 Chrono) + 8 (V18 Skyroot) */

function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function getS(){ try{ return S; }catch(e){ return null; } }
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } }
function lsRemove(k){ try{ localStorage.removeItem(k); }catch(e){} }
function writeVerified(k, raw){
  /* setItem + read-back compare (the V12 lesson: a silent write failure
     must never be reported as success). '' and missing both mean empty. */
  try{
    localStorage.setItem(k, raw);
    return (localStorage.getItem(k)||'')===(raw||'');
  }catch(e){ return false; }
}
function $(sel, root){ return (root||document).querySelector(sel); }
function fmtTime(ts){
  if(!ts) return 'Chưa có';
  var d=new Date(ts);
  function p(n){ return (n<10?'0':'')+n; }
  return p(d.getHours())+':'+p(d.getMinutes())+' '+p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear();
}

/* ---------- session (the identity the current slot belongs to) ---------- */
function session(){
  try{ var s=JSON.parse(lsGet(SESSION_KEY)||'null'); if(s&&typeof s==='object') return s; }catch(e){}
  return null;
}
function setSession(obj){ return lsSet(SESSION_KEY, JSON.stringify(obj||{})); }
function settings(){
  try{ var s=JSON.parse(lsGet(SETTINGS_KEY)||'null'); if(s&&typeof s==='object') return s; }catch(e){}
  return {};
}
function saveSettings(s){ lsSet(SETTINGS_KEY, JSON.stringify(s||{})); }
function guestId(){
  var id=lsGet(GUEST_ID_KEY);
  if(!id){ id='g'+Math.floor(Math.random()*36*36*36*36*36).toString(36).toUpperCase().padStart(5,'0'); lsSet(GUEST_ID_KEY, id); }
  return id;
}
function codeFrom(str){
  /* A safe display Player ID: a short code derived from the identity
     (never the raw UID). Deterministic, 6 characters. */
  var h='0';
  try{ h=window.__v20sync?__v20sync.hash(String(str)):'0'; }catch(e){}
  var n=parseInt(h,16)%(36*36*36*36*36*36);
  return '#'+n.toString(36).toUpperCase().padStart(6,'0');
}

/* ---------- player profile (stored in S.v7.profile, syncs with the save) ---------- */
function profile(){
  var S=getS(); if(!S) return {displayName:'', avatarId:'chick'};
  try{
    S.v7=S.v7||{};
    var p=S.v7.profile;
    if(!p||typeof p!=='object'){ p=S.v7.profile={displayName:'', avatarId:'chick', created:Date.now()}; }
    if(!p.avatarId) p.avatarId='chick';
    if(typeof p.displayName!=='string') p.displayName='';
    return p;
  }catch(e){ return {displayName:'', avatarId:'chick'}; }
}
function curAvatar(){ var p=profile(); return p.avatarId||'chick'; }
function displayName(){
  var p=profile();
  if(p.displayName) return p.displayName;
  try{ var u=window.__v20sync&&__v20sync.currentUser&&__v20sync.currentUser(); if(u&&u.displayName) return u.displayName; }catch(e){}
  return 'Người chơi';
}
function saveProfile(){
  /* profile changes must persist immediately (the player may close the
     tab right after picking an avatar), so write through the V20 save
     manager's forced flush instead of the debounced queue. */
  try{ if(window.__v20&&__v20.saveNow) __v20.saveNow(); else if(typeof save==='function') save(); }catch(e){}
  refreshAvatarBtn();
}

/* ---------- real stats, computed from the game data ---------- */
function bossWinCount(){
  var S=getS(); if(!S||!S.v7) return 0;
  var n=0;
  try{ n+=Object.keys((S.v7.en15&&S.v7.en15.bosses)||{}).length; }catch(e){}
  ['en18','en19'].forEach(function(k){
    var b=S.v7[k]&&S.v7[k].bosses;
    if(!b) return;
    for(var id in b){ var r=b[id]||{}; if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) n++; }
  });
  return n;
}
function stats(){
  var S=getS()||{};
  var xp=(S.xp||0);
  var coins=xp-((S.spent||0));
  try{ if(typeof coins==='function') coins=coins(); }catch(e){}
  var koCards=(S.cards||[]);
  var koLearned=0, koMastered=0;
  koCards.forEach(function(c){ if((c.box||0)>=1) koLearned++; if((c.box||0)>=3) koMastered++; });
  var enLearned=0, enMastered=0, enTotal=0;
  try{
    if(window.__v15&&__v15.words&&__v15.enOld){
      var words=__v15.words, old=__v15.enOld()||{};
      enTotal=words.length;
      words.forEach(function(w){ var b=(old.box&&old.box[w.id])||0; if(b>=1) enLearned++; if(b>=3) enMastered++; });
    }
  }catch(e){}
  var titles=[];
  try{ ['en18','en19'].forEach(function(k){ var t=S.v7&&S.v7[k]&&S.v7[k].titles; if(t) titles=titles.concat(t); }); }catch(e){}
  titles=Array.from(new Set(titles));
  var lastSync=0;
  try{ lastSync=(window.__v20sync?__v20sync.meta().lastSyncAt:0)||0; }catch(e){}
  return {
    xp:xp, level:1+Math.floor(xp/100), xpInLevel:xp%100,
    coins:coins, gems:(S.v7&&S.v7.gems)||0,
    koTotal:koCards.length, koLearned:koLearned, koMastered:koMastered,
    enTotal:enTotal, enLearned:enLearned, enMastered:enMastered,
    bossWins:bossWinCount(), bossTotal:TOTAL_BOSSES,
    titles:titles, streak:(S.sk&&S.sk.n)||0, lastSyncAt:lastSync
  };
}
function summarizeSave(obj){
  /* a short, honest summary of a save (used for link / conflict dialogs) */
  if(!obj||typeof obj!=='object') return null;
  var xp=obj.xp||0, cards=(obj.cards||[]).length, gems=(obj.v7&&obj.v7.gems)||0;
  var wins=0;
  try{ wins+=Object.keys((obj.v7&&obj.v7.en15&&obj.v7.en15.bosses)||{}).length; }catch(e){}
  ['en18','en19'].forEach(function(k){
    var b=obj.v7&&obj.v7[k]&&obj.v7[k].bosses;
    if(!b) return;
    for(var id in b){ var r=b[id]||{}; if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) wins++; }
  });
  return {xp:xp, cards:cards, gems:gems, bossWins:wins};
}
function identitySummary(){
  /* summary of the save currently in the slot (for the link dialog) */
  var s=summarizeSave(getS());
  return s||{xp:0, cards:0, gems:0, bossWins:0};
}

/* ---------- per-UID local-save separation ----------
   The game always reads the ACTIVE SLOT (hanvocab.v1). Each identity has
   its own HOME key where its save is parked when it is not active:
     guest        -> hanvocab.v1.guest
     account uid  -> hanvocab.v1.acc.<uid>
   Switching identity = park the slot into the old identity's home
   (verified write), then copy the new identity's home into the slot
   (or leave the slot empty for a fresh seed), record the new session
   and reload. No account ever receives another account's bytes. */
function readSlot(){ return lsGet(SAVE_KEY)||''; }
function readHome(uid){ return uid? (lsGet(homeKey(uid))||'') : (lsGet(GUEST_HOME_KEY)||''); }
function parkSlot(){
  var s=session();
  var home=(s&&s.mode==='account'&&s.uid)? homeKey(s.uid) : GUEST_HOME_KEY;
  var raw=readSlot();
  var ok=writeVerified(home, raw);
  return {ok:ok, home:home};
}
var _reloadCalled=false;
function reload(){
  _reloadCalled=true;
  try{ location.reload(); }catch(e){}
}
function activateAccount(uid, transfer){
  /* transfer=true: the slot's current bytes (a guest's progress) become
     this account's local home. Only honoured when the previous identity
     was the guest or unclaimed (no V13 session yet, e.g. a V12 save);
     an account-to-account switch never copies bytes. */
  /* B-32-3: flush FIRST — before parkSlot()/readSlot()/any slot
     write. The pending in-memory save must land in localStorage
     before the slot is parked/switched, or the flush writes stale
     S over the just-switched bytes. Guard text unchanged (F-02c). */
  try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}
  var prev=session();
  var slot=readSlot();
  var parked=parkSlot();
  if(!parked.ok) return {ok:false, reason:'park-failed'};
  var prevIsGuest=!prev||prev.mode==='guest';
  if(transfer&&prevIsGuest){
    if(!writeVerified(homeKey(uid), slot)) return {ok:false, reason:'home-write-failed'};
    /* slot already holds the transferred bytes — no slot write needed */
  } else {
    var home=readHome(uid);
    if(home){ if(!writeVerified(SAVE_KEY, home)) return {ok:false, reason:'slot-write-failed'}; }
    else { lsRemove(SAVE_KEY); /* fresh seed on reload */ }
  }
  setSession({mode:'account', uid:uid, at:Date.now()});
  reload();
  return {ok:true};
}
function activateGuest(){
  /* B-32-3: flush FIRST — before parkSlot()/any slot write (see
     activateAccount above). Guard text unchanged (F-02d). */
  try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}
  var parked=parkSlot();
  if(!parked.ok) return {ok:false, reason:'park-failed'};
  var gh=readHome(null);
  if(gh){ if(!writeVerified(SAVE_KEY, gh)) return {ok:false, reason:'slot-write-failed'}; }
  else { lsRemove(SAVE_KEY); /* fresh seed on reload */ }
  setSession({mode:'guest', at:Date.now()});
  reload();
  return {ok:true};
}
function signOut21(){
  /* Firebase sign-out (best effort — it clears the local session even
     offline), then the local swap back to the guest save. */
  function done(){ activateGuest(); }
  try{
    var p=window.__v20sync?__v20sync.signOut():null;
    if(p&&p.then) p.then(done, done); else done();
  }catch(e){ done(); }
}
function onSignedIn(u){
  /* A user just signed in (Google / email / register / redirect).
     Never auto-assign the slot's bytes to the new account: if the slot
     has real progress and this account has no local home on this device,
     ask first (link screen). Otherwise switch silently. */
  if(!u||!u.uid){ return; }
  /* the auth listener and the sign-in promise can both deliver the same
     user — never run the swap twice for one sign-in. */
  if(pendingLink&&pendingLink.uid===u.uid&&authScreen==='link') return;
  var s=session();
  if(s&&s.mode==='account'&&s.uid===u.uid){ enterGame(); return; }
  var has=false;
  try{ has=window.__v20sync?__v20sync.hasProgress(getS()):false; }catch(e){}
  var homeExists=!!readHome(u.uid);
  if(has&&!homeExists){
    pendingLink={uid:u.uid, email:u.email||'', summary:identitySummary()};
    showAuth('link');
    return;
  }
  activateAccount(u.uid, false);
}
var pendingLink=null;

/* ---------- auth UI: welcome / login / register / forgot / link ---------- */
var authBusy=false;
var authRoot=null;   /* #v21auth overlay element */
var authScreen='welcome';
var detectedUser=null; /* Firebase user found without a matching session */
var forgotTimer=null;

var GOOGLE_G='<svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>';

function authErrText(err){
  var m=(err&&(err.code||err.message))||'';
  m=String(m);
  if(/not-configured/.test(m)) return 'Chưa cấu hình Firebase. Quản trị viên cần làm theo FIREBASE_SETUP.md để bật đăng nhập.';
  if(/offline|network|Failed to fetch|sdk-load-failed/.test(m)) return 'Mất mạng — kiểm tra kết nối rồi thử lại.';
  if(/invalid-email/.test(m)) return 'Email chưa đúng định dạng.';
  if(/user-not-found|wrong-password|invalid-credential/.test(m)) return 'Email hoặc mật khẩu chưa đúng.';
  if(/email-already-in-use/.test(m)) return 'Email này đã được đăng ký. Hãy đăng nhập hoặc đặt lại mật khẩu.';
  if(/weak-password/.test(m)) return 'Mật khẩu phải có ít nhất 6 ký tự.';
  if(/too-many-requests/.test(m)) return 'Quá nhiều lần thử — chờ một lúc rồi thử lại.';
  if(/popup-blocked/.test(m)) return 'Trình duyệt đã chặn cửa sổ đăng nhập. Cho phép popup cho trang này, hoặc dùng nút "Đăng nhập bằng chuyển trang".';
  if(/popup-closed-by-user|cancelled-popup-request/.test(m)) return 'Cửa sổ đăng nhập đã đóng trước khi hoàn tất.';
  if(/operation-not-supported/.test(m)) return 'Trình duyệt này không hỗ trợ đăng nhập bằng popup. Dùng nút "Đăng nhập bằng chuyển trang".';
  if(/no-user/.test(m)) return 'Chưa đăng nhập.';
  return 'Đã xảy ra lỗi. Thử lại sau. ('+esc(m.slice(0,80))+')';
}
function setAuthMsg(html, isErr){
  var el=$('#v21authmsg'); if(!el) return;
  el.innerHTML=html||'';
  el.className='v21msg'+(isErr?' err':'')+((html)?' show':'');
}
function setBusy(b, btnId, label){
  authBusy=b;
  var btn=btnId?document.getElementById(btnId):null;
  if(btn){ btn.disabled=b; if(label!==undefined) btn.textContent=b?label:btn.getAttribute('data-label')||label; }
  var root=$('#v21auth'); if(root) root.classList.toggle('v21busy', b);
}
function authConfigured(){
  try{ return window.__v20sync?__v20sync.configured():false; }catch(e){ return false; }
}
function notConfiguredNote(){
  return '<div class="v21note">Chưa cấu hình Firebase — đăng nhập chưa dùng được. Quản trị viên xem <b>FIREBASE_SETUP.md</b> trong file ZIP để tạo project và dán cấu hình vào <b>firebase-config.js</b>. Chơi khách vẫn đầy đủ tính năng.</div>';
}

function farmBackdrop(){
  /* pure-CSS farm scene: sky, sun, drifting clouds, hills, flowers,
     floating leaves. No emoji graphics. */
  return '<div class="v21sky" aria-hidden="true"><div class="v21sun"></div>'
    +'<div class="v21cloud c1"></div><div class="v21cloud c2"></div><div class="v21cloud c3"></div>'
    +'<div class="v21leaf l1"></div><div class="v21leaf l2"></div><div class="v21leaf l3"></div><div class="v21leaf l4"></div>'
    +'<div class="v21hills"></div><div class="v21flowers"></div></div>';
}
function avatarGridHTML(selectedId, forRegister){
  var st=stats();
  var h='<div class="v21avatars" role="radiogroup" aria-label="Chọn avatar">';
  AVATARS.forEach(function(a){
    var locked=st.bossWins<a.wins;
    var sel=selectedId===a.id;
    h+='<button type="button" role="radio" aria-checked="'+(sel?'true':'false')+'" class="v21avatar'+(sel?' sel':'')+(locked?' locked':'')+'" data-avatar="'+a.id+'" '+(locked?'disabled':'')+' title="'+esc(a.name)+(locked?(' — mở khóa khi thắng '+a.wins+' boss ('+st.bossWins+'/'+TOTAL_BOSSES+')'):'')+'">'
      +'<img src="assets/avatars/'+a.id+'.png" alt="'+esc(a.name)+'">'
      +(locked?'<span class="v21lock" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="#fff" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z"/></svg></span>':'')
      +'<span class="v21avname">'+esc(a.name)+'</span>'
      +(locked?'<span class="v21avreq">Thắng '+a.wins+' boss</span>':'')
      +'</button>';
  });
  h+='</div>';
  return h;
}
function screenHTML(name){
  var cfg=authConfigured();
  if(name==='welcome'){
    var det='';
    if(detectedUser){
      det='<div class="v21detected"><img src="assets/avatars/'+curAvatar()+'.png" alt="">'
        +'<div><b>Đã đăng nhập: '+esc(detectedUser.email||detectedUser.displayName||'tài khoản')+'</b>'
        +'<span>Phiên đăng nhập vẫn còn trên trình duyệt này.</span></div>'
        +'<button type="button" class="v21btn primary" id="v21continue" data-label="Tiếp tục với tài khoản này">Tiếp tục với tài khoản này</button>'
        +'<button type="button" class="v21btn ghost" id="v21other">Dùng tài khoản khác</button></div>';
    }
    return farmBackdrop()
      +'<div class="v21card v21welcome"><div class="v21logo"><span class="v21logotitle">Korean &amp; English<br>Vocab Farm</span><span class="v21logosub">Học tiếng Hàn &amp; tiếng Anh qua nông trại và phiêu lưu!</span></div>'
      +'<img class="v21mascot" src="assets/mascot-chick.png" alt="Mascot gà con của game">'
      +det
      +'<div class="v21btns">'
      +'<button type="button" class="v21btn google" id="v21google" data-label="Đăng nhập bằng Google">'+GOOGLE_G+'<span>Đăng nhập bằng Google</span></button>'
      +'<button type="button" class="v21btn primary" id="v21emailbtn" data-label="Đăng nhập bằng Email">Đăng nhập bằng Email</button>'
      +'<button type="button" class="v21btn purple" id="v21register" data-label="Tạo tài khoản">Tạo tài khoản</button>'
      +'<button type="button" class="v21btn amber" id="v21guest" data-label="Chơi với tư cách khách">Chơi với tư cách khách</button>'
      +'</div>'
      +'<div id="v21googlealt"></div>'
      +(cfg?'':'<div class="v21msg show">'+notConfiguredNote()+'</div>')
      +'<div id="v21authmsg" class="v21msg"></div>'
      +'<p class="v21fine">Chơi khách vẫn lưu tiến trình trên thiết bị này. Đăng nhập để đồng bộ giữa các thiết bị.</p></div>';
  }
  if(name==='login'){
    return farmBackdrop()
      +'<div class="v21card"><button type="button" class="v21back" id="v21back" aria-label="Quay lại">←</button>'
      +'<img class="v21mascot small" src="assets/mascot-chick.png" alt="">'
      +'<h2 class="v21title">Đăng nhập</h2>'
      +(cfg?'':'<div class="v21msg show">'+notConfiguredNote()+'</div>')
      +'<form id="v21loginform" novalidate>'
      +'<label class="v21field"><span>Email</span><input id="v21email" name="email" type="email" autocomplete="email" placeholder="ban@example.com" required></label>'
      +'<label class="v21field"><span>Mật khẩu</span><span class="v21pw"><input id="v21pw" name="password" type="password" autocomplete="current-password" placeholder="Mật khẩu" required><button type="button" class="v21eye" id="v21eye" aria-label="Hiện hoặc ẩn mật khẩu">Hiện</button></span></label>'
      +'<label class="v21check"><input type="checkbox" id="v21remember" checked> <span>Ghi nhớ đăng nhập trên thiết bị này</span></label>'
      +'<button type="submit" class="v21btn primary block" id="v21submit" data-label="Đăng nhập">Đăng nhập</button>'
      +'</form>'
      +'<div id="v21authmsg" class="v21msg"></div>'
      +'<button type="button" class="v21link" id="v21forgot">Quên mật khẩu?</button>'
      +'<p class="v21fine">Chưa có tài khoản? <button type="button" class="v21link" id="v21toregister">Đăng ký ngay</button></p></div>';
  }
  if(name==='register'){
    return farmBackdrop()
      +'<div class="v21card"><button type="button" class="v21back" id="v21back" aria-label="Quay lại">←</button>'
      +'<img class="v21mascot small" src="assets/mascot-chick.png" alt="">'
      +'<h2 class="v21title">Tạo tài khoản</h2>'
      +(cfg?'':'<div class="v21msg show">'+notConfiguredNote()+'</div>')
      +'<form id="v21regform" novalidate>'
      +'<label class="v21field"><span>Tên hiển thị</span><input id="v21name" type="text" autocomplete="nickname" placeholder="VD: ChickyLearner" maxlength="24" required></label>'
      +'<label class="v21field"><span>Email</span><input id="v21email" type="email" autocomplete="email" placeholder="ban@example.com" required></label>'
      +'<label class="v21field"><span>Mật khẩu (ít nhất 6 ký tự)</span><span class="v21pw"><input id="v21pw" type="password" autocomplete="new-password" placeholder="Mật khẩu" required><button type="button" class="v21eye" id="v21eye" aria-label="Hiện hoặc ẩn mật khẩu">Hiện</button></span></label>'
      +'<label class="v21field"><span>Nhập lại mật khẩu</span><input id="v21pw2" type="password" autocomplete="new-password" placeholder="Nhập lại mật khẩu" required></label>'
      +'<span class="v21fieldlabel">Chọn avatar</span>'
      +avatarGridHTML('chick', true)
      +'<input type="hidden" id="v21avatarpick" value="chick">'
      +'<button type="submit" class="v21btn primary block" id="v21submit" data-label="Đăng ký">Đăng ký</button>'
      +'</form>'
      +'<div id="v21authmsg" class="v21msg"></div>'
      +'<p class="v21fine">Đã có tài khoản? <button type="button" class="v21link" id="v21tologin">Đăng nhập</button></p></div>';
  }
  if(name==='forgot'){
    return farmBackdrop()
      +'<div class="v21card"><button type="button" class="v21back" id="v21back" aria-label="Quay lại">←</button>'
      +'<div class="v21mailart" aria-hidden="true">✉</div>'
      +'<h2 class="v21title">Quên mật khẩu</h2>'
      +'<p class="v21fine">Nhập email của bạn để nhận liên kết đặt lại mật khẩu.</p>'
      +(cfg?'':'<div class="v21msg show">'+notConfiguredNote()+'</div>')
      +'<form id="v21forgotform" novalidate>'
      +'<label class="v21field"><span>Email</span><input id="v21email" type="email" autocomplete="email" placeholder="ban@example.com" required></label>'
      +'<button type="submit" class="v21btn primary block" id="v21submit" data-label="Gửi liên kết">Gửi liên kết</button>'
      +'</form>'
      +'<div id="v21authmsg" class="v21msg"></div>'
      +'<p class="v21fine">Đã nhớ mật khẩu? <button type="button" class="v21link" id="v21tologin">Đăng nhập</button></p></div>';
  }
  if(name==='link'){
    var L=pendingLink||{uid:'', email:'', summary:{xp:0,cards:0,gems:0,bossWins:0}};
    var s=L.summary;
    return farmBackdrop()
      +'<div class="v21card"><img class="v21mascot small" src="assets/mascot-chick.png" alt="">'
      +'<h2 class="v21title">Bảo vệ tiến trình của bạn</h2>'
      +'<p class="v21fine">Thiết bị này đang có tiến trình chưa gắn tài khoản:</p>'
      +'<div class="v21summary"><span><b>'+s.xp+'</b> XP</span><span><b>'+s.cards+'</b> thẻ Hàn</span><span><b>'+s.bossWins+'</b> boss đã thắng</span><span><b>'+s.gems+'</b> kim cương</span></div>'
      +'<p class="v21fine">Bạn muốn gắn tiến trình này vào tài khoản <b>'+esc(L.email||'vừa đăng nhập')+'</b>, hay bắt đầu mới với tài khoản?</p>'
      +'<div class="v21btns">'
      +'<button type="button" class="v21btn primary" id="v21transfer" data-label="Chuyển tiến trình vào tài khoản">Chuyển tiến trình vào tài khoản</button>'
      +'<button type="button" class="v21btn ghost" id="v21fresh" data-label="Bắt đầu mới với tài khoản">Bắt đầu mới với tài khoản</button>'
      +'</div>'
      +'<div id="v21authmsg" class="v21msg"></div>'
      +'<p class="v21fine">Tiến trình khách vẫn được giữ lại trên thiết bị này nếu bạn đăng xuất sau này. Nếu tài khoản đã có tiến trình trên đám mây, game sẽ hỏi bạn chọn bản nào sau khi vào.</p></div>';
  }
  return '';
}
function showAuth(name, opts){
  authScreen=name;
  if(opts&&opts.detectedUser!==undefined) detectedUser=opts.detectedUser;
  var root=$('#v21auth');
  if(!root){
    root=document.createElement('div');
    root.id='v21auth';
    root.setAttribute('role','dialog');
    root.setAttribute('aria-modal','true');
    document.body.appendChild(root);
    authRoot=root;
  }
  root.innerHTML='<div class="v21overlay">'+screenHTML(name)+'</div>';
  root.style.display='';
  wireAuth(name);
  var first=root.querySelector('input, button.v21btn');
  if(first){ try{ first.focus(); }catch(e){} }
}
function closeAuth(){
  var root=$('#v21auth');
  if(root){ root.style.display='none'; root.innerHTML=''; }
}
function enterGame(){
  closeAuth();
  refreshAvatarBtn();
}
function wireAuth(name){
  var root=$('#v21auth'); if(!root) return;
  function on(id, ev, fn){ var el=document.getElementById(id); if(el) el.addEventListener(ev, fn); }
  on('v21back','click', function(){ showAuth('welcome'); });
  on('v21guest','click', function(){
    setSession({mode:'guest', at:Date.now()});
    enterGame();
  });
  on('v21emailbtn','click', function(){ showAuth('login'); });
  on('v21register','click', function(){ showAuth('register'); });
  on('v21toregister','click', function(){ showAuth('register'); });
  on('v21tologin','click', function(){ showAuth('login'); });
  on('v21forgot','click', function(){ showAuth('forgot'); });
  on('v21other','click', function(){ detectedUser=null; showAuth('welcome'); });
  on('v21continue','click', function(){ if(detectedUser) onSignedIn(detectedUser); });
  on('v21eye','click', function(){
    var pw=document.getElementById('v21pw'); if(!pw) return;
    var show=pw.type==='password';
    pw.type=show?'text':'password';
    this.textContent=show?'Ẩn':'Hiện';
  });
  /* avatar picker (register + account center share the markup) */
  var grid=root.querySelector('.v21avatars');
  if(grid){
    grid.addEventListener('click', function(ev){
      var b=ev.target.closest?ev.target.closest('.v21avatar'):null;
      if(!b||b.disabled) return;
      var pick=document.getElementById('v21avatarpick');
      if(pick) pick.value=b.getAttribute('data-avatar');
      grid.querySelectorAll('.v21avatar').forEach(function(x){ x.classList.remove('sel'); x.setAttribute('aria-checked','false'); });
      b.classList.add('sel'); b.setAttribute('aria-checked','true');
    });
  }
  on('v21google','click', function(){ googleSignIn(false); });
  on('v21transfer','click', function(){
    if(!pendingLink) return;
    var uid=pendingLink.uid; pendingLink=null;
    var r=activateAccount(uid, true);
    if(!r.ok) setAuthMsg('Không chuyển được tiến trình (lỗi ghi dữ liệu). Tiến trình khách vẫn còn nguyên trên thiết bị.', true);
  });
  on('v21fresh','click', function(){
    if(!pendingLink) return;
    var uid=pendingLink.uid; pendingLink=null;
    var r=activateAccount(uid, false);
    if(!r.ok) setAuthMsg('Không mở được tài khoản (lỗi ghi dữ liệu).', true);
  });
  var lf=document.getElementById('v21loginform');
  if(lf) lf.addEventListener('submit', function(ev){ ev.preventDefault(); doLogin(); });
  var rf=document.getElementById('v21regform');
  if(rf) rf.addEventListener('submit', function(ev){ ev.preventDefault(); doRegister(); });
  var ff=document.getElementById('v21forgotform');
  if(ff) ff.addEventListener('submit', function(ev){ ev.preventDefault(); doForgot(); });
}
function validEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e||'').trim()); }
function googleSignIn(useRedirect){
  if(authBusy) return;
  if(!authConfigured()){ setAuthMsg(notConfiguredNote(), true); return; }
  setBusy(true, 'v21google', 'Đang mở đăng nhập Google…');
  setAuthMsg('');
  var attempt=useRedirect
    ? __v20sync.signInGoogleRedirect()
    : __v20sync.signInGoogle();
  attempt.then(function(u){
    setBusy(false, 'v21google');
    if(u) onSignedIn(u);
    else if(useRedirect){ setAuthMsg('Đã chuyển sang trang đăng nhập Google. Sau khi đăng nhập xong bạn sẽ quay lại game.', false); }
  }).catch(function(err){
    setBusy(false, 'v21google');
    var m=String((err&&(err.code||err.message))||'');
    if(!useRedirect&&/popup-blocked|operation-not-supported|popup-closed-by-user/.test(m)){
      /* offer the redirect fallback instead of a dead end */
      var host=document.getElementById('v21googlealt');
      if(host){
        host.innerHTML='<button type="button" class="v21btn ghost block" id="v21redirect">Đăng nhập bằng chuyển trang</button>';
        var rb=document.getElementById('v21redirect');
        if(rb) rb.addEventListener('click', function(){ googleSignIn(true); });
      }
    }
    setAuthMsg(authErrText(err), true);
  });
}
function doLogin(){
  if(authBusy) return;
  var email=($('#v21email')||{}).value||'';
  var pw=($('#v21pw')||{}).value||'';
  var remember=$('#v21remember')?$('#v21remember').checked:true;
  if(!validEmail(email)){ setAuthMsg('Email chưa đúng định dạng.', true); return; }
  if(!pw){ setAuthMsg('Nhập mật khẩu của bạn.', true); return; }
  if(!authConfigured()){ setAuthMsg(notConfiguredNote(), true); return; }
  setBusy(true, 'v21submit', 'Đang đăng nhập…');
  setAuthMsg('');
  var p=__v20sync.setPersistence?__v20sync.setPersistence(remember):Promise.resolve();
  p.then(function(){ return __v20sync.signInEmail(email.trim(), pw); })
   .then(function(u){ setBusy(false, 'v21submit'); if(u) onSignedIn(u); })
   .catch(function(err){ setBusy(false, 'v21submit'); setAuthMsg(authErrText(err), true); });
}
function doRegister(){
  if(authBusy) return;
  var name=(($('#v21name')||{}).value||'').trim();
  var email=($('#v21email')||{}).value||'';
  var pw=($('#v21pw')||{}).value||'';
  var pw2=($('#v21pw2')||{}).value||'';
  var av=($('#v21avatarpick')||{}).value||'chick';
  if(name.length<2){ setAuthMsg('Nhập tên hiển thị (ít nhất 2 ký tự).', true); return; }
  if(!validEmail(email)){ setAuthMsg('Email chưa đúng định dạng.', true); return; }
  if(pw.length<6){ setAuthMsg('Mật khẩu phải có ít nhất 6 ký tự.', true); return; }
  if(pw!==pw2){ setAuthMsg('Hai mật khẩu chưa trùng nhau.', true); return; }
  if(!authConfigured()){ setAuthMsg(notConfiguredNote(), true); return; }
  setBusy(true, 'v21submit', 'Đang tạo tài khoản…');
  setAuthMsg('');
  __v20sync.signUpEmail(email.trim(), pw)
    .then(function(u){
      /* set the display name on the Auth profile (best effort) and in the
         game profile; send a real verification email (non-blocking). */
      var jobs=[];
      if(__v20sync.updateDisplayName) jobs.push(__v20sync.updateDisplayName(name).catch(function(){ return null; }));
      if(__v20sync.sendVerification) jobs.push(__v20sync.sendVerification().catch(function(){ return null; }));
      return Promise.all(jobs).then(function(){ return u; });
    })
    .then(function(u){
      var p=profile();
      p.displayName=name; p.avatarId=av;
      saveProfile();
      setBusy(false, 'v21submit');
      setAuthMsg('Đã tạo tài khoản. Email xác minh đã được gửi tới '+esc(email.trim())+' — kiểm tra hộp thư của bạn.', false);
      if(u) setTimeout(function(){ onSignedIn(u); }, 900);
    })
    .catch(function(err){ setBusy(false, 'v21submit'); setAuthMsg(authErrText(err), true); });
}
function doForgot(){
  if(authBusy) return;
  var email=($('#v21email')||{}).value||'';
  if(!validEmail(email)){ setAuthMsg('Email chưa đúng định dạng.', true); return; }
  if(!authConfigured()){ setAuthMsg(notConfiguredNote(), true); return; }
  setBusy(true, 'v21submit', 'Đang gửi…');
  setAuthMsg('');
  __v20sync.sendPasswordReset(email.trim())
    .then(function(){
      setBusy(false, 'v21submit');
      /* Firebase does not reveal whether the email exists — neither do we. */
      setAuthMsg('Nếu email này đã đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút. Kiểm tra cả mục thư rác.', false);
      var btn=document.getElementById('v21submit');
      if(btn){ btn.disabled=true; var n=60; btn.textContent='Gửi lại sau '+n+'s';
        if(forgotTimer) clearInterval(forgotTimer);
        forgotTimer=setInterval(function(){ n--; if(n<=0){ clearInterval(forgotTimer); btn.disabled=false; btn.textContent='Gửi liên kết'; } else { btn.textContent='Gửi lại sau '+n+'s'; } }, 1000);
      }
    })
    .catch(function(err){ setBusy(false, 'v21submit'); setAuthMsg(authErrText(err), true); });
}

/* ---------- Account Center ---------- */
var accountTab='profile';
var ICONS={
  profile:'<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z"/></svg>',
  avatar:'<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>',
  account:'<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.5 9.3-8 11-4.5-1.7-8-6-8-11V5z"/></svg>',
  sync:'<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6.5 19a4.5 4.5 0 0 1-.42-8.98 6 6 0 0 1 11.7-1.62A4 4 0 0 1 17.5 19z"/></svg>',
  backup:'<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 3a1 1 0 0 1 1 1v8.6l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L11 12.6V4a1 1 0 0 1 1-1zM5 19h14a1 1 0 1 1 0 2H5a1 1 0 1 1 0-2z"/></svg>',
  settings:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="7" cy="17" r="2" fill="currentColor" stroke="none"/></svg>'
};
function setDisplayName(name){
  name=(name||'').trim();
  if(name.length<2) return {ok:false, reason:'too-short'};
  var p=profile(); p.displayName=name; saveProfile();
  try{
    var u=window.__v20sync&&__v20sync.currentUser&&__v20sync.currentUser();
    if(u&&__v20sync.updateDisplayName) __v20sync.updateDisplayName(name).catch(function(){});
  }catch(e){}
  return {ok:true};
}
function selectAvatar(id){
  var a=null;
  AVATARS.forEach(function(x){ if(x.id===id) a=x; });
  if(!a) return {ok:false, reason:'unknown'};
  if(stats().bossWins<a.wins) return {ok:false, reason:'locked', wins:a.wins};
  var p=profile(); p.avatarId=id; saveProfile();
  return {ok:true};
}
function cloudStatusText(){
  try{
    var st=__v20sync.status();
    var map={off:'Chưa cấu hình Firebase', guest:'Chưa đăng nhập', ready:'Đã đăng nhập — chưa đồng bộ', syncing:'Đang đồng bộ…', synced:'Đã đồng bộ', offline:'Mất mạng — lưu cục bộ', conflict:'Có xung đột — cần bạn chọn', 'cloud-newer':'Đám mây có bản mới hơn', error:'Lỗi đồng bộ'};
    return map[st.cloud]||st.cloud;
  }catch(e){ return 'Không rõ'; }
}
function accountContentHTML(tab){
  var st=stats();
  var u=null; try{ u=window.__v20sync&&__v20sync.currentUser&&__v20sync.currentUser(); }catch(e){}
  var s=session();
  var isGuest=!u;
  var pid=isGuest? codeFrom('guest:'+guestId()) : codeFrom('uid:'+u.uid);
  if(tab==='profile'){
    var titles=st.titles.length? st.titles.map(function(t){ return '<span class="v21badge">'+esc(t)+'</span>'; }).join('') : '<span class="v21muted">Chưa có danh hiệu — thắng boss để nhận.</span>';
    return '<div class="v21profile">'
      +'<div class="v21phead"><img class="v21pavatar" src="assets/avatars/'+curAvatar()+'.png" alt="Avatar hiện tại">'
      +'<div><div class="v21pname">'+esc(displayName())+'</div>'
      +'<div class="v21pid">Player ID: <b>'+pid+'</b> <button type="button" class="v21mini" id="v21copyid">Sao chép</button></div>'
      +'<div class="v21plevel">Lv. '+st.level+' <span class="v21xpbar"><u style="width:'+st.xpInLevel+'%"></u></span> '+st.xpInLevel+'/100 XP</div></div></div>'
      +'<div class="v21grid4">'
      +'<div class="v21stat"><b>'+st.coins+'</b><span>Tiền vàng (XP)</span></div>'
      +'<div class="v21stat"><b>'+st.gems+'</b><span>Kim cương</span></div>'
      +'<div class="v21stat"><b>'+st.bossWins+' / '+st.bossTotal+'</b><span>Boss đã thắng</span></div>'
      +'<div class="v21stat"><b>'+st.streak+' ngày</b><span>Học liên tiếp</span></div>'
      +'</div>'
      +'<h3 class="v21h3">Tiến trình học</h3>'
      +'<div class="v21prog"><span>Tiếng Hàn — đã học '+st.koLearned+' / '+st.koTotal+' từ ('+st.koMastered+' đã thuộc)</span><div class="v21bar"><u style="width:'+(st.koTotal?Math.round(st.koLearned/st.koTotal*100):0)+'%"></u></div></div>'
      +'<div class="v21prog"><span>Tiếng Anh — đã học '+st.enLearned+' / '+st.enTotal+' từ ('+st.enMastered+' đã thuộc)</span><div class="v21bar"><u style="width:'+(st.enTotal?Math.round(st.enLearned/st.enTotal*100):0)+'%"></u></div></div>'
      +'<h3 class="v21h3">Thành tích &amp; danh hiệu ('+st.titles.length+')</h3><div class="v21badges">'+titles+'</div>'
      +'<p class="v21muted">Đồng bộ gần nhất: '+fmtTime(st.lastSyncAt)+' — '+(isGuest?'đang chơi với tư cách khách':'đã đăng nhập'+(u.email?' ('+esc(u.email)+')':''))+'.</p>'
      +'</div>';
  }
  if(tab==='avatar'){
    return '<h3 class="v21h3">Chọn avatar</h3><p class="v21muted">Avatar miễn phí lúc đầu; các avatar khác mở khóa khi thắng đủ boss. Lựa chọn được lưu vào tiến trình của bạn.</p>'
      +avatarGridHTML(curAvatar(), false)
      +'<div id="v21avmsg" class="v21msg"></div>';
  }
  if(tab==='account'){
    var prov=isGuest?'Khách (chưa đăng nhập)':(u.email&&u.displayName!==undefined?'Email / Google':'Đã đăng nhập');
    var verified=false; try{ verified=window.__v20sync?__v20sync.emailVerified():false; }catch(e){}
    var h='<h3 class="v21h3">Tài khoản</h3>'
      +'<p><b>Trạng thái:</b> '+esc(prov)+'</p>'
      +(u?('<p><b>Email:</b> '+esc(u.email||'(không có email)')+'</p>'
        +'<p><b>Xác minh email:</b> '+(verified?'Đã xác minh':('Chưa xác minh <button type="button" class="v21mini" id="v21resend">Gửi lại email xác minh</button>'))+'</p>'):'')
      +'<label class="v21field"><span>Tên hiển thị</span><span class="v21row"><input id="v21nameedit" type="text" value="'+esc(displayName())+'" maxlength="24"> <button type="button" class="v21btn primary" id="v21savename">Lưu tên</button></span></label>'
      +'<div id="v21accmsg" class="v21msg"></div>';
    if(isGuest){
      h+='<div class="v21card2"><b>Liên kết tài khoản để bảo vệ tiến trình</b><p class="v21muted">Tiến trình khách hiện chỉ lưu trên thiết bị này. Đăng ký hoặc đăng nhập để đồng bộ lên đám mây và chơi trên thiết bị khác.</p><button type="button" class="v21btn primary" id="v21link">Liên kết tài khoản</button></div>';
    } else {
      h+='<button type="button" class="v21btn ghost" id="v21signout">Đăng xuất</button>'
        +'<p class="v21muted">Đăng xuất sẽ lưu tiến trình tài khoản này trên thiết bị, rồi quay lại chế độ khách. Tiến trình khách trước đó (nếu có) vẫn còn nguyên.</p>';
    }
    return h;
  }
  if(tab==='sync'){
    var conf=null; try{ conf=__v20sync.conflict(); }catch(e){}
    var h='<h3 class="v21h3">Đồng bộ đám mây</h3>'
      +'<p><b>Trạng thái:</b> '+esc(cloudStatusText())+'</p>'
      +'<p><b>Đồng bộ gần nhất:</b> '+fmtTime(st.lastSyncAt)+'</p>'
      +'<button type="button" class="v21btn primary" id="v21syncnow">Đồng bộ ngay</button> '
      +'<button type="button" class="v21btn ghost" id="v21refreshsync">Làm mới trạng thái</button>'
      +'<div id="v21syncmsg" class="v21msg"></div>';
    if(conf){
      var L=summarizeSave(conf.local)||{xp:0,cards:0,gems:0,bossWins:0};
      var C=summarizeSave(conf.cloud)||{xp:0,cards:0,gems:0,bossWins:0};
      h+='<div class="v21conflict"><h4>Xung đột dữ liệu — chọn bản giữ lại</h4>'
        +'<div class="v21vs"><div><b>Trên thiết bị này</b><br>XP '+L.xp+' · '+L.cards+' thẻ · '+L.bossWins+' boss · '+L.gems+' kim cương<br><span class="v21muted">'+fmtTime(conf.localTime)+'</span></div>'
        +'<div><b>Trên đám mây</b><br>XP '+C.xp+' · '+C.cards+' thẻ · '+C.bossWins+' boss · '+C.gems+' kim cương<br><span class="v21muted">'+fmtTime(conf.cloudTime)+'</span></div></div>'
        +'<div class="v21btns"><button type="button" class="v21btn primary" data-resolve="local">Dùng bản trên thiết bị</button>'
        +'<button type="button" class="v21btn primary" data-resolve="cloud">Dùng bản trên đám mây</button>'
        +'<button type="button" class="v21btn amber" data-resolve="merge">Hợp nhất an toàn</button></div>'
        +'<p class="v21muted">Cả hai bản đã được sao lưu trước khi áp dụng lựa chọn. Hợp nhất: từ tiếng Anh giữ mức cao nhất từng từ; boss, thú cưng, nhiệm vụ và lịch sử Học thông minh hợp nhất từ cả hai bên; XP/kim cương lấy mức cao nhất, không cộng dồn.</p></div>';
    } else if(!authConfigured()){
      h+='<p class="v21muted">Chưa cấu hình Firebase — xem FIREBASE_SETUP.md trong file ZIP để bật đồng bộ.</p>';
    }
    return h;
  }
  if(tab==='backup'){
    return '<h3 class="v21h3">Sao lưu &amp; khôi phục</h3>'
      +'<p class="v21muted">Xuất toàn bộ tiến trình ra file JSON để giữ ngoài máy, hoặc khôi phục từ một file đã xuất. File khôi phục được kiểm tra cấu trúc trước khi ghi, và bản hiện tại được sao lưu trước.</p>'
      +'<button type="button" class="v21btn primary" id="v21export">Xuất dữ liệu (JSON)</button> '
      +'<label class="v21btn ghost" for="v21importfile" style="display:inline-block;cursor:pointer">Khôi phục dữ liệu</label>'
      +'<input type="file" id="v21importfile" accept=".json,application/json" style="display:none">'
      +'<div id="v21bakmsg" class="v21msg"></div>';
  }
  if(tab==='settings'){
    var stt=settings();
    return '<h3 class="v21h3">Cài đặt</h3>'
      +'<label class="v21check"><input type="checkbox" id="v21reduced" '+(stt.reducedMotion?'checked':'')+'> <span>Giảm chuyển động (tắt lá bay, mây trôi, hiệu ứng)</span></label>'
      +'<p class="v21muted">Phiên bản game: V13.0.0 — lớp tài khoản V21, lớp lưu V20, đồng bộ V20.</p>'
      +'<button type="button" class="v21btn ghost" id="v21opendata">Mở mục Quản lý dữ liệu (tab 💾 Dữ liệu)</button>';
  }
  return '';
}
function openAccount(tab){
  accountTab=tab||'profile';
  var old=$('#v21account'); if(old) old.remove();
  var m=document.createElement('div');
  m.id='v21account';
  m.setAttribute('role','dialog');
  m.setAttribute('aria-modal','true');
  m.setAttribute('aria-label','Trung tâm tài khoản');
  var tabs=[['profile','Hồ sơ'],['avatar','Avatar'],['account','Tài khoản'],['sync','Đồng bộ đám mây'],['backup','Sao lưu & Khôi phục'],['settings','Cài đặt']];
  var side=tabs.map(function(t){ return '<button type="button" class="v21side'+(accountTab===t[0]?' sel':'')+'" data-tab="'+t[0]+'">'+ICONS[t[0]]+'<span>'+t[1]+'</span></button>'; }).join('');
  m.innerHTML='<div class="v21modalbg"><div class="v21modal"><div class="v21mhead"><img src="assets/mascot-chick.png" alt=""><span>Trung tâm tài khoản</span><button type="button" class="v21x" id="v21accclose" aria-label="Đóng">✕</button></div>'
    +'<div class="v21mbody"><div class="v21sidebar">'+side+'</div><div class="v21mcontent" id="v21mcontent">'+accountContentHTML(accountTab)+'</div></div></div></div>';
  document.body.appendChild(m);
  wireAccount();
}
var _esc21=null;
function closeAccount(){ if(_esc21){try{document.removeEventListener('keydown',_esc21)}catch(e){}_esc21=null;} var m=$('#v21account'); if(m) m.remove(); }
function rerenderAccount(){ var c=$('#v21mcontent'); if(c){ c.innerHTML=accountContentHTML(accountTab); wireAccountContent(); } }
function wireAccount(){
  var m=$('#v21account'); if(!m) return;
  m.querySelector('.v21modalbg').addEventListener('click', function(ev){ if(ev.target===this) closeAccount(); });
  var x=$('#v21accclose'); if(x) x.addEventListener('click', closeAccount);
  m.querySelectorAll('.v21side').forEach(function(b){
    b.addEventListener('click', function(){
      accountTab=b.getAttribute('data-tab');
      m.querySelectorAll('.v21side').forEach(function(y){ y.classList.toggle('sel', y===b); });
      rerenderAccount();
    });
  });
  wireAccountContent();
  if(_esc21){try{document.removeEventListener('keydown',_esc21)}catch(e){}} _esc21=function(ev){ if(ev.key==='Escape') closeAccount(); }; document.addEventListener('keydown',_esc21);
}
function wireAccountContent(){
  function on(id, ev, fn){ var el=document.getElementById(id); if(el) el.addEventListener(ev, fn); }
  on('v21copyid','click', function(){
    var st=stats();
    var u=null; try{ u=window.__v20sync&&__v20sync.currentUser&&__v20sync.currentUser(); }catch(e){}
    var pid=u? codeFrom('uid:'+u.uid) : codeFrom('guest:'+guestId());
    var done=false;
    try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(pid).then(function(){ done=true; }); } }catch(e){}
    this.textContent=done?'Đã sao chép':'ID: '+pid;
  });
  var grid=$('#v21account .v21avatars');
  if(grid){
    grid.addEventListener('click', function(ev){
      var b=ev.target.closest?ev.target.closest('.v21avatar'):null;
      if(!b||b.disabled) return;
      var r=selectAvatar(b.getAttribute('data-avatar'));
      var msg=$('#v21avmsg');
      if(r.ok){ rerenderAccount(); }
      else if(msg){ msg.textContent='Avatar này mở khóa khi thắng '+r.wins+' boss.'; msg.className='v21msg err show'; }
    });
  }
  on('v21savename','click', function(){
    var inp=$('#v21nameedit');
    var r=setDisplayName(inp?inp.value:'');
    if(r.ok){ refreshAvatarBtn(); rerenderAccount(); }
    /* set the message AFTER the re-render, or the new content wipes it */
    var msg=$('#v21accmsg');
    if(msg){ msg.textContent=r.ok?'Đã lưu tên hiển thị.':'Tên phải có ít nhất 2 ký tự.'; msg.className='v21msg'+(r.ok?'':' err')+' show'; }
  });
  on('v21resend','click', function(){
    var msg=$('#v21accmsg');
    if(window.__v20sync&&__v20sync.sendVerification){
      __v20sync.sendVerification().then(function(){ if(msg){ msg.textContent='Đã gửi email xác minh. Kiểm tra hộp thư của bạn.'; msg.className='v21msg show'; } })
      .catch(function(err){ if(msg){ msg.textContent=authErrText(err); msg.className='v21msg err show'; } });
    }
  });
  on('v21link','click', function(){ closeAccount(); showAuth('welcome'); });
  on('v21signout','click', function(){ closeAccount(); signOut21(); });
  on('v21syncnow','click', function(){
    var msg=$('#v21syncmsg');
    if(msg){ msg.textContent='Đang đồng bộ…'; msg.className='v21msg show'; }
    if(window.__v20sync&&__v20sync.syncNow){
      __v20sync.syncNow({}).then(function(r){
        if(r&&r.needsReload){ reload(); return; }
        rerenderAccount();
        var m2=$('#v21syncmsg');
        if(m2){ m2.textContent=r&&r.ok?('Đồng bộ xong: '+(r.action||'')):(authErrText({code:r&&r.reason||'error'})||''); m2.className='v21msg'+(r&&r.ok?'':' err')+' show'; }
      });
    }
  });
  on('v21refreshsync','click', function(){ rerenderAccount(); });
  var m2=document.querySelector('#v21account [data-resolve]');
  if(m2){
    document.querySelectorAll('#v21account [data-resolve]').forEach(function(b){
      b.addEventListener('click', function(){
        var choice=b.getAttribute('data-resolve');
        if(window.__v20sync&&__v20sync.resolveConflict){
          __v20sync.resolveConflict(choice).then(function(r){
            if(r&&r.needsReload){ reload(); return; }
            rerenderAccount();
          });
        }
      });
    });
  }
  on('v21export','click', function(){
    var msg=$('#v21bakmsg');
    try{ if(window.__v20&&__v20.exportFile) __v20.exportFile(); if(msg){ msg.textContent='Đã bắt đầu tải file sao lưu — kiểm tra thư mục tải về.'; msg.className='v21msg show'; } }
    catch(e){ if(msg){ msg.textContent='Không xuất được file.'; msg.className='v21msg err show'; } }
  });
  var imp=$('#v21importfile');
  if(imp) imp.addEventListener('change', function(){
    var f=imp.files&&imp.files[0]; var msg=$('#v21bakmsg');
    if(!f) return;
    try{
      if(window.__v20&&__v20.importFile){
        __v20.importFile(imp);
        if(msg){ msg.textContent='Đang khôi phục — trang sẽ tải lại nếu file hợp lệ.'; msg.className='v21msg show'; }
      }
    }catch(e){ if(msg){ msg.textContent='Không khôi phục được file.'; msg.className='v21msg err show'; } }
  });
  on('v21reduced','change', function(){
    var stt=settings(); stt.reducedMotion=this.checked; saveSettings(stt);
    document.documentElement.classList.toggle('v21-reduced-motion', !!this.checked);
  });
  on('v21opendata','click', function(){
    closeAccount();
    try{ if(window.__v15&&__v15.openHub) __v15.openHub('backup'); }catch(e){}
  });
}

/* ---------- header buttons (Korean header + English Hub) ---------- */
function refreshAvatarBtn(){
  var b=document.getElementById('v21avatarbtn');
  if(b){
    var img=b.querySelector('img'); if(img) img.src='assets/avatars/'+curAvatar()+'.png';
    var nm=b.querySelector('.v21abname'); if(nm) nm.textContent=displayName();
  }
  var hb=document.getElementById('v21hubbtn');
  if(hb){ var hi=hb.querySelector('img'); if(hi) hi.src='assets/avatars/'+curAvatar()+'.png'; }
}
function injectHeaderBtn(){
  var top=document.querySelector('.top');
  if(!top||document.getElementById('v21avatarbtn')) return;
  var b=document.createElement('button');
  b.id='v21avatarbtn'; b.className='v21avatarbtn'; b.type='button';
  b.setAttribute('aria-label','Tài khoản và hồ sơ');
  b.innerHTML='<img src="assets/avatars/'+curAvatar()+'.png" alt=""><span class="v21abname">'+esc(displayName())+'</span>';
  b.addEventListener('click', function(){ openAccount('profile'); });
  top.appendChild(b);
}
var hubWrapped=false;
function wrapHub(){
  if(hubWrapped||!window.__v15) return;
  hubWrapped=true;
  var orig=__v15.openHub;
  if(typeof orig!=='function') return;
  __v15.openHub=function(){ var r=orig.apply(this,arguments); setTimeout(injectHubBtn, 60); return r; };
}
function injectHubBtn(){
  var bar=document.querySelector('#v15langbar');
  if(bar&&!document.getElementById('v21hubbtn')){
    var b=document.createElement('button');
    b.id='v21hubbtn'; b.className='v21hubbtn'; b.type='button';
    b.innerHTML='<img src="assets/avatars/'+curAvatar()+'.png" alt=""> Tài khoản';
    b.addEventListener('click', function(){ openAccount('profile'); });
    bar.appendChild(b);
  }
}

/* ---------- entry decision ---------- */
function decideEntry(){
  var u=null;
  try{ u=window.__v20sync&&__v20sync.currentUser&&__v20sync.currentUser(); }catch(e){}
  var s=session();
  if(u){
    if(s&&s.mode==='account'&&s.uid===u.uid){ enterGame(); return; }
    if(s&&s.mode==='account'&&s.uid!==u.uid){ showAuth('welcome', {detectedUser:u}); return; }
    onSignedIn(u); return;
  }
  if(s&&s.mode==='guest'){ enterGame(); return; }
  showAuth('welcome');
}
var lastUid=null;
function init(){
  var stt=settings();
  if(stt.reducedMotion) document.documentElement.classList.add('v21-reduced-motion');
  injectHeaderBtn();
  wrapHub();
  if(window.__v20sync&&__v20sync.onChange){
    __v20sync.onChange(function(){
      var u=null; try{ u=__v20sync.currentUser&&__v20sync.currentUser(); }catch(e){}
      var uid=u?u.uid:null;
      if(uid!==lastUid){
        lastUid=uid;
        var root=$('#v21auth');
        if(root&&root.style.display!=='none') decideEntry();
      }
      refreshAvatarBtn();
    });
  }
  var s=session();
  if(s&&s.mode==='guest'){ enterGame(); return; }
  /* Restore a possible Firebase session (popup or redirect) before
     deciding — the SDK loads lazily only when configured, so an
     unconfigured game never fetches anything. */
  var done=false;
  function decide(){ if(!done){ done=true; decideEntry(); } }
  try{
    if(window.__v20sync&&__v20sync.configured&&__v20sync.configured()){
      var p=__v20sync.completeRedirect?__v20sync.completeRedirect():Promise.resolve(null);
      if(p&&p.then) p.then(decide, decide); else decide();
    } else decide();
  }catch(e){ decide(); }
}
try{ init(); }catch(e){}

window.__v21={
  version:VERSION,
  AVATARS:AVATARS, TOTAL_BOSSES:TOTAL_BOSSES,
  openAuth:showAuth, openAccount:openAccount, closeAccount:closeAccount,
  enterGame:enterGame, decideEntry:decideEntry,
  session:session, setSession:setSession,
  profile:profile, stats:stats, summarizeSave:summarizeSave,
  selectAvatar:selectAvatar, setDisplayName:setDisplayName,
  signOut:signOut21, onSignedIn:onSignedIn,
  activateAccount:activateAccount, activateGuest:activateGuest, parkSlot:parkSlot,
  readSlot:readSlot, readHome:readHome, codeFrom:codeFrom, guestId:guestId,
  authErrText:authErrText,
  _test:{
    session:session, setSession:setSession, readSlot:readSlot, readHome:readHome,
    parkSlot:parkSlot, activateAccount:activateAccount, activateGuest:activateGuest,
    stats:stats, profile:profile, decideEntry:decideEntry, showAuth:showAuth,
    onSignedIn:onSignedIn, signOut:signOut21, selectAvatar:selectAvatar,
    setDisplayName:setDisplayName, codeFrom:codeFrom, guestId:guestId,
    reloadCalled:function(){ return _reloadCalled; }, resetReload:function(){ _reloadCalled=false; },
    pendingLink:function(){ return pendingLink; }, AVATARS:AVATARS
  }
};
})();
