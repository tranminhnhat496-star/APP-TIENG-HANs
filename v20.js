/* ===== V20 — SAVE MANAGER + MIGRATION + DATA PANEL (V12, additive) =====
   Wraps the game's single save funnel (V6 `save()` — every layer funnels
   through it: save15/save7/save19 all call it) with:
   - debounced, verified writes (read-back check; a failed write is
     reported as an error, never as "saved")
   - flush on page hide / close (visibilitychange + beforeunload)
   - a visible save status (panel + header pill) with last-saved time
   - one-time V11 -> V12 migration: pre-migration backup, structural
     validation + repair of missing subkeys, version stamp, rollback
   - the "Quản lý dữ liệu" panel (rendered into the Backup tab) and the
     Korean Data-view entry button (V16-style setView/render wrap)
   The cloud sync engine lives in v20_sync.js (__v20sync); this file only
   reads its state and calls its methods (guarded — the game works fully
   without any cloud configuration).
*/
(function(){
'use strict';
var SAVE_KEY='hanvocab.v1';
var BACKUP_KEY='hanvocab.v11-backup';
var SAVE_VERSION=12;
function $(s){return document.querySelector(s)}
function getS(){ try{ return S; }catch(e){ return null; } } /* V6 declares `let S` — a lexical global, NOT window.S (V11.1 lesson) */
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function sync(){ return window.__v20sync||null; }
function fmtTime(ts){
  if(!ts) return 'chưa có';
  try{ var d=new Date(ts); return d.toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}); }catch(e){ return String(ts); }
}

/* ---------- meta (lives outside the save, so stamping it never re-saves) ---------- */
function meta(){ var s=sync(); return s?s.meta():{}; }
function saveMeta(m){ var s=sync(); if(s) s.saveMeta(m); }

/* ---------- save manager: wrap the one global save() ---------- */
var origSave=null;
var dirty=false, timer=null, lastFlush=0, dirtySince=0, saveState='idle', saveError='';
var DEBOUNCE_MS=800;
function setSaveState(st,err){
  saveState=st; saveError=err||'';
  renderPill();
  /* update the panel in place — never re-render the whole tab here, or the
     player would lose what they are typing in the sign-in form */
  var el=document.querySelector('#v20panel .v20status');
  if(el){ el.textContent=saveStateText()+(saveError?' — '+saveError:''); el.className='v20status '+st; }
  var lt=document.querySelector('#v20lastsaved');
  if(lt){ var m=meta(); lt.textContent=fmtTime(m.lastSavedAt); }
}
function verifyWrite(){
  /* Strong check: the bytes on disk must equal the current in-memory save.
     The V6 save() swallows its own errors, so a failed write is invisible
     unless we compare read-back content — a shape/count check alone would
     pass against stale data with the same shape. */
  try{
    var raw=localStorage.getItem(SAVE_KEY)||'';
    if(!raw) return {ok:false, error:'empty-after-write'};
    var S0=getS();
    if(!S0) return {ok:false, error:'no-state'};
    if(raw!==JSON.stringify(S0)) return {ok:false, error:'readback-mismatch'};
    var j=JSON.parse(raw);
    if(!j||!Array.isArray(j.cards)) return {ok:false, error:'bad-shape-after-write'};
    return {ok:true};
  }catch(e){ return {ok:false, error:'readback-failed'}; }
}
function flush(){
  if(timer){ clearTimeout(timer); timer=null; }
  if(!dirty) return true;
  dirty=false; dirtySince=0; lastFlush=Date.now();
  var ok=false;
  try{ if(origSave) origSave(); else if(typeof save==='function') save(); ok=true; }catch(e){ ok=false; }
  if(ok){
    var v=verifyWrite();
    if(v.ok){
      var m=meta(); m.lastSavedAt=Date.now(); saveMeta(m);
      setSaveState('saved');
      var s2=sync(); if(s2) s2.noteLocalSaved();
      return true;
    }
    setSaveState('error', v.error||'verify-failed');
    dirty=true;
    return false;
  }
  setSaveState('error','write-failed');
  dirty=true;
  return false;
}
function requestSave(){
  if(!dirty) dirtySince=Date.now();
  dirty=true;
  setSaveState('saving');
  if(!timer) timer=setTimeout(flush, DEBOUNCE_MS);
  /* safety: never let a pending save sit longer than 5s */
  if(dirtySince&&Date.now()-dirtySince>5000) flush();
}
function saveNow(){
  /* explicit "save now": always write the current state, even if nothing
     called save() since the last flush (e.g. the player edited data and
     pressed the button directly). */
  dirty=true;
  var r=flush();
  if(r&&window.__v15&&window.__v15.pop15) window.__v15.pop15('Đã lưu trên thiết bị.');
  return r;
}
function wrapSave(){
  if(window.save&&window.save.__v20) return;
  try{
    origSave=window.save;
    var w=function(){ requestSave(); };
    w.__v20=true;
    window.save=w;
  }catch(e){}
}
function installFlushHooks(){
  try{
    window.addEventListener('beforeunload', function(){ if(dirty) flush(); });
    document.addEventListener('visibilitychange', function(){ if(document.hidden&&dirty) flush(); });
  }catch(e){}
}

/* ---------- migration V11 -> V12 (one-time, checked, rollbackable) ---------- */
function saveStamp(){
  var S0=getS(); return (S0&&S0.v7&&S0.v7.meta)||null;
}
function runMigration(){
  var res={done:false, reason:'', backup:false, repaired:[]};
  var raw=''; try{ raw=localStorage.getItem(SAVE_KEY)||''; }catch(e){}
  if(!raw){ res.reason='no-save'; return res; }
  var cur=saveStamp();
  if(cur&&cur.saveVersion>=SAVE_VERSION){ res.done=true; res.reason='already-v12'; return res; }
  /* 1) pre-migration backup of the exact V11 bytes (never overwritten) */
  try{
    if(!localStorage.getItem(BACKUP_KEY)){
      localStorage.setItem(BACKUP_KEY, JSON.stringify({savedAt:Date.now(), version:cur?cur.saveVersion||11:11, raw:raw}));
      res.backup=true;
    } else res.backup=true; /* already kept from the first V12 boot */
  }catch(e){ res.reason='backup-failed'; return res; }
  /* 2) validate + repair the few fields no layer self-heals (never delete
     anything). en/en15/en16/en17/en18/en19 are NOT repaired here: each
     layer lazily creates its own subkey with the full default shape
     (enOld()/en15()/en19()...), and writing a half-empty `{}` would
     defeat that self-healing (it is truthy, so `||` never replaces it). */
  var S0=getS();
  if(!S0||!Array.isArray(S0.cards)){ res.reason='bad-save-shape'; return res; }
  S0.v7=S0.v7||{};
  var v7=S0.v7;
  if(!Array.isArray(S0.decks)) { S0.decks=[]; res.repaired.push('decks'); }
  if(typeof S0.xp!=='number') { S0.xp=0; res.repaired.push('xp'); }
  /* 3) stamp (old stamp kept as prevVersion) */
  var prev=cur?cur.saveVersion||11:11;
  v7.meta={saveVersion:SAVE_VERSION, migratedAt:Date.now(), prevVersion:prev};
  res.done=true; res.reason='migrated';
  /* persist the stamp through the normal (wrapped) save path */
  try{ if(typeof save==='function') save(); }catch(e){}
  flush();
  return res;
}
function restorePreMigration(){
  var b=null;
  try{ b=JSON.parse(localStorage.getItem(BACKUP_KEY)||'null'); }catch(e){}
  if(!b||!b.raw) return {ok:false, reason:'no-backup'};
  var s=sync(); if(!s) return {ok:false, reason:'no-sync-module'};
  var j=safeParseLocal(b.raw);
  if(!j) return {ok:false, reason:'bad-backup'};
  var v=s.validateSave(j);
  if(!v.ok) return {ok:false, reason:'invalid-backup', errors:v.errors};
  snapshot('hanvocab.v12.pre-rollback-'+Date.now(), localStorage.getItem(SAVE_KEY)||'');
  try{ localStorage.setItem(SAVE_KEY, b.raw); }catch(e){ return {ok:false, reason:'write-failed'}; }
  return {ok:true};
}
function safeParseLocal(raw){ try{ var j=JSON.parse(raw); return (j&&typeof j==='object')?j:null; }catch(e){ return null; } }
function snapshot(key, raw){ try{ localStorage.setItem(key, raw); return true; }catch(e){ return false; } }

/* ---------- import (validated; snapshots current save first) ---------- */
var lastImportError=null;
function importFile(input, fallback){
  var f=input&&input.files&&input.files[0]; if(!f) return;
  var rd=new FileReader();
  rd.onload=function(){
    lastImportError=null;
    var raw=String(rd.result||'');
    if(raw.length>((sync()?sync().MAX_IMPORT_BYTES:10*1024*1024))){
      lastImportError=['file-too-large']; alert('File sao lưu quá lớn (tối đa 10 MB).'); return;
    }
    var j=safeParseLocal(raw);
    if(!j){ lastImportError=['bad-json']; alert('File sao lưu không hợp lệ: không đọc được JSON.'); return; }
    var s=sync(); if(!s){ if(fallback) return fallback(input); return; }
    var v=s.validateSave(j);
    if(!v.ok){
      lastImportError=v.errors;
      alert('File sao lưu không hợp lệ: '+v.errors.slice(0,3).join(', ')+'. Dữ liệu hiện tại không thay đổi.');
      return;
    }
    var cur=''; try{ cur=localStorage.getItem(SAVE_KEY)||''; }catch(e){}
    snapshot('hanvocab.v12.preimport-'+Date.now(), cur);
    var stamp=(j.v7&&j.v7.meta&&j.v7.meta.saveVersion)||11;
    if(!confirm('Khôi phục bản lưu này (phiên bản '+stamp+')? Dữ liệu hiện tại sẽ được thay thế — bản sao lưu trước khi khôi phục đã được giữ lại.')) return;
    try{ localStorage.setItem(SAVE_KEY, JSON.stringify(j)); }catch(e){ alert('Không ghi được dữ liệu (bộ nhớ trình duyệt đầy?).'); return; }
    location.reload();
  };
  rd.readAsText(f);
}
function exportFile(){
  var v=window.__v15;
  if(v&&v.backupExport) v.backupExport();
}

/* ---------- header pill (always-visible save status, Korean side) ---------- */
function renderPill(){
  var pill=$('#v20savepill'); if(!pill) return;
  var m=meta();
  var txt='', cls='';
  if(saveState==='saving'){ txt='○ Đang lưu…'; cls='saving'; }
  else if(saveState==='error'){ txt='⚠ Lỗi lưu! Mở mục Dữ liệu để kiểm tra.'; cls='error'; }
  else if(saveState==='saved'){ txt='● Đã lưu '+(m.lastSavedAt?fmtTime(m.lastSavedAt):''); cls='saved'; }
  else { txt=m.lastSavedAt?('● Đã lưu '+fmtTime(m.lastSavedAt)):'● Chưa lưu lần nào'; cls='idle'; }
  var st=syncStatusText();
  if(st) txt+=' · '+st;
  pill.textContent=txt;
  pill.className='v20pill '+cls;
}
function syncStatusText(){
  var s=sync(); if(!s) return '';
  var st=s.status();
  if(!s.configured()) return 'Đám mây: chưa cấu hình';
  if(!st.user) return 'Đám mây: khách (chưa đăng nhập)';
  var map={ready:'sẵn sàng đồng bộ', syncing:'đang đồng bộ…', synced:'đã đồng bộ', offline:'mất mạng — lưu cục bộ', conflict:'xung đột dữ liệu!', 'cloud-newer':'có dữ liệu mới trên đám mây', error:'lỗi đồng bộ'};
  return '☁ '+(map[st.cloud]||st.cloud);
}
function installPill(){
  try{
    var top=document.querySelector('.top>div');
    if(!top||document.getElementById('v20savepill')) return;
    var pill=document.createElement('span');
    pill.id='v20savepill'; pill.className='v20pill idle';
    pill.textContent='● Đang tải…';
    top.appendChild(pill);
    renderPill();
  }catch(e){}
}

/* ---------- Korean Data-view entry (V16-style wrap, no V6 edit) ---------- */
function injectDataBtn(){
  try{
    var app=document.getElementById('app');
    if(!app||document.getElementById('v20ko-btn')) return;
    var b=app.querySelector('[onclick="backup()"]');
    if(!b||!b.parentNode) return;
    var div=document.createElement('div');
    div.className='acts'; div.style.margin='10px 0';
    div.innerHTML='<button class="btn pri" id="v20ko-btn" onclick="window.__v15&&__v15.openHub(\'backup\')">☁️ Quản lý dữ liệu &amp; đồng bộ</button>'
      +'<span class="mute" id="v20ko-status"></span>';
    b.parentNode.parentNode.insertBefore(div, b.parentNode);
    var st=$('#v20ko-status'); if(st) st.textContent=syncStatusText();
  }catch(e){}
}
function wrapGlobals(){
  try{
    if(typeof window.setView==='function'&&!window.setView.__v20){
      var _sv=window.setView;
      var nw=function(v){ _sv(v); if(v==='data') setTimeout(injectDataBtn,0); };
      nw.__v20=true; window.setView=nw;
    }
    if(typeof window.render==='function'&&!window.render.__v20){
      var _r=window.render;
      var nr=function(){ _r(); try{ if(typeof view!=='undefined'&&view==='data') setTimeout(injectDataBtn,0); }catch(e){} };
      nr.__v20=true; window.render=nr;
    }
  }catch(e){}
}

/* ---------- Data Management panel (rendered into the Backup tab) ---------- */
function saveSizeKB(){
  try{ return ((localStorage.getItem(SAVE_KEY)||'').length/1024).toFixed(1); }catch(e){ return '?'; }
}
function dataPanelHTML(){
  var m=meta(), st=syncStatusText(), s=sync();
  var stt=s?s.status():{cloud:'off', user:null};
  var mig=saveStamp();
  var hasBackup=false; try{ hasBackup=!!localStorage.getItem(BACKUP_KEY); }catch(e){}
  var S0=getS();
  var h='<div class="v20panel" id="v20panel">'
  +'<h3>💾 Quản lý dữ liệu</h3>'
  /* save status */
  +'<div class="v20card"><b>Trạng thái lưu</b><p class="v20status '+saveState+'">'+esc(saveStateText())+(saveError?' — '+esc(saveError):'')+'</p>'
  +'<p class="mute">Lần lưu gần nhất: <b id="v20lastsaved">'+esc(fmtTime(m.lastSavedAt))+'</b> · Kích thước bản lưu: <b>'+saveSizeKB()+' KB</b> · Khóa: <b>hanvocab.v1</b></p>'
  +'<div class="acts"><button class="btn pri" onclick="__v20.saveNow()">Lưu tiến trình ngay</button></div>'
  +'<p class="mute">Game tự lưu sau mỗi bài học, câu trả lời, trận boss, phần thưởng, mua sắm, trồng/trồng cây và đổi cài đặt (ghi dồn 0,8 giây để tránh ghi liên tục). Đóng tab cũng tự lưu.</p></div>'
  /* migration */
  +'<div class="v20card"><b>Chuyển đổi dữ liệu</b><p class="mute">Phiên bản dữ liệu: <b>'+(mig?('V'+mig.saveVersion+' (từ V'+(mig.prevVersion||'?')+', '+fmtTime(mig.migratedAt)+')'):'chưa chuyển đổi')+'</b></p>'
  +'<p class="mute">Bản sao lưu trước khi chuyển đổi: <b>'+(hasBackup?'đã giữ lại':'không có')+'</b></p>'
  +(hasBackup?'<div class="acts"><button class="btn" onclick="__v20.rollback()">Khôi phục bản trước khi chuyển đổi</button></div>':'')
  +'</div>'
  /* cloud */
  +'<div class="v20card"><b>☁️ Đồng bộ đám mây</b><p class="mute">'+esc(st)+'</p>';
  if(!s||!s.configured()){
    h+='<p class="mute">Chưa cấu hình Firebase — game vẫn lưu đầy đủ trên thiết bị này. Để bật đồng bộ, làm theo <b>FIREBASE_SETUP.md</b> trong file ZIP (tạo project Firebase, bật Google + Email, dán cấu hình vào <b>firebase-config.js</b>), rồi tải lại trang. <b>Không có cấu hình thì không có đồng bộ — game không bao giờ giả vờ đã đồng bộ.</b></p>';
  }else{
    if(stt.user){
      h+='<p>Đã đăng nhập: <b>'+esc(stt.user.email||stt.user.displayName||stt.user.uid)+'</b> <span class="mute">('+esc(stt.user.uid.slice(0,8))+'…)</span></p>'
      +'<p class="mute">Lần đồng bộ gần nhất: <b>'+esc(fmtTime(m.lastSyncAt))+'</b></p>'
      +'<div class="acts"><button class="btn pri" onclick="__v20.syncNow()">Đồng bộ ngay</button><button class="btn" onclick="__v20.signOut()">Đăng xuất</button></div>';
    }else{
      h+='<p class="mute">Chưa đăng nhập — đang chơi với tư cách khách, tiến trình chỉ lưu trên thiết bị này.</p>'
      +'<div class="acts"><button class="btn pri" onclick="__v20.signInGoogle()">Đăng nhập bằng Google</button></div>'
      +'<div class="v20auth"><input id="v20email" type="email" placeholder="Email" autocomplete="email"><input id="v20pw" type="password" placeholder="Mật khẩu" autocomplete="current-password">'
      +'<div class="acts"><button class="btn" onclick="__v20.signInEmail()">Đăng nhập bằng Email</button><button class="btn" onclick="__v20.signUpEmail()">Tạo tài khoản mới</button></div></div>'
      +'<p class="mute">Mỗi tài khoản có dữ liệu riêng. Đăng nhập tài khoản khác sẽ so sánh dữ liệu trước khi làm gì — không tự ghi đè.</p>';
    }
  }
  h+='</div>'
  /* conflict host */
  +'<div id="v20conflict"></div>'
  +'</div>';
  return h;
}
function saveStateText(){
  if(saveState==='saving') return 'Đang lưu…';
  if(saveState==='error') return 'Lỗi lưu dữ liệu — bản lưu trên thiết bị có thể chưa cập nhật';
  if(saveState==='saved') return 'Đã lưu trên thiết bị';
  return 'Sẵn sàng';
}
function conflictHTML(){
  var s=sync(); if(!s) return '';
  var c=s.conflict(); if(!c) return '';
  function sum(x){
    if(!x) return 'không có dữ liệu';
    var wins=0; ['en18','en19'].forEach(function(k){ var b=x.v7&&x.v7[k]&&x.v7[k].bosses; if(b) for(var id in b){ var r=b[id]||{}; if((r.en&&r.en.win)||(r.ko&&r.ko.win)) wins++; } });
    return 'XP '+(x.xp||0)+' · 💎 '+((x.v7&&x.v7.gems)||0)+' · '+(x.cards||[]).length+' thẻ Hàn · '+wins+' boss đã thắng';
  }
  return '<div class="v20modal"><div class="v20card v20conflict"><h3>⚠️ Dữ liệu trên thiết bị và đám mây khác nhau</h3>'
  +'<p class="mute">Cả hai bên đều đã thay đổi từ lần đồng bộ trước. Game <b>không tự chọn</b> — bạn hãy chọn. Trước khi áp dụng, cả hai bản đều đã được sao lưu lại.</p>'
  +'<div class="v20vs"><div><b>📱 Trên thiết bị này</b><p class="mute">'+esc(sum(c.local))+' · lưu '+esc(fmtTime(c.localTime))+'</p></div>'
  +'<div><b>☁️ Trên đám mây</b><p class="mute">'+esc(sum(c.cloud))+' · lưu '+esc(fmtTime(c.cloudTime))+'</p></div></div>'
  +'<div class="acts"><button class="btn pri" onclick="__v20.resolveConflict(\'local\')">Dùng bản trên thiết bị này</button>'
  +'<button class="btn" onclick="__v20.resolveConflict(\'cloud\')">Dùng bản trên đám mây</button>'
  +'<button class="btn" onclick="__v20.resolveConflict(\'merge\')">Hợp nhất an toàn</button></div>'
  +'<p class="mute">Hợp nhất an toàn: boss đã thắng ở bên nào cũng tính, sao lấy mức cao nhất; XP/kim cương lấy mức cao nhất (không cộng dồn); thẻ từ hợp nhất theo ID.</p>'
  +'</div></div>';
}
function refreshConflict(){
  var host=$('#v20conflict'); if(!host) return;
  host.innerHTML=conflictHTML();
}
function syncNow(){
  var s=sync(); if(!s) return Promise.resolve({ok:false, reason:'no-sync-module'});
  return s.syncNow({auto:false}).then(function(r){
    refreshConflict();
    if(window.__v15&&window.__v15.renderTab){ try{ window.__v15.renderTab(); }catch(e){} }
    if(r&&r.ok){
      if(r.needsReload){ if(window.__v15&&window.__v15.pop15) window.__v15.pop15('Đã tải dữ liệu đám mây — đang tải lại…'); setTimeout(function(){ location.reload(); },800); }
      else if(window.__v15&&window.__v15.pop15) window.__v15.pop15(r.action==='uploaded'?'Đã đồng bộ lên đám mây.':'Đã đồng bộ.');
    }else{
      if(r&&r.reason==='account-changed'){
        if(confirm('Bạn vừa đăng nhập một tài khoản khác. Tải tiến trình trên thiết bị này lên tài khoản mới? (Bấm Hủy để giữ nguyên, không đồng bộ.)')){
          s.syncNow({auto:false, force:true}).then(function(r2){ if(window.__v15) try{ window.__v15.renderTab(); }catch(e){} return r2; });
        }
      }
      else if(r&&r.reason==='conflict'){ refreshConflict(); }
      else if(r&&r.reason==='cloud-newer'){ if(window.__v15&&window.__v15.pop15) window.__v15.pop15('Có dữ liệu mới trên đám mây — bấm Đồng bộ ngay để tải về.'); }
      else if(r&&r.reason==='offline'){ if(window.__v15&&window.__v15.pop15) window.__v15.pop15('Mất mạng — vẫn lưu trên thiết bị, sẽ đồng bộ khi có mạng.'); }
      else if(r&&r.reason==='not-configured'){ if(window.__v15&&window.__v15.pop15) window.__v15.pop15('Chưa cấu hình Firebase — xem FIREBASE_SETUP.md.'); }
    }
    return r;
  });
}
function resolveConflict(choice){
  var s=sync(); if(!s) return Promise.resolve({ok:false});
  return s.resolveConflict(choice).then(function(r){
    refreshConflict();
    if(window.__v15&&window.__v15.renderTab){ try{ window.__v15.renderTab(); }catch(e){} }
    if(r&&r.ok&&r.needsReload){ if(window.__v15&&window.__v15.pop15) window.__v15.pop15('Đã áp dụng lựa chọn — đang tải lại…'); setTimeout(function(){ location.reload(); },800); }
    return r;
  });
}
function rollback(){
  if(!confirm('Khôi phục bản sao lưu trước khi chuyển đổi sang V12? Tiến trình hiện tại sẽ được giữ lại trong một bản sao lưu khác trước khi khôi phục.')) return;
  var r=restorePreMigration();
  if(r.ok){ alert('Đã khôi phục bản trước khi chuyển đổi. Trang sẽ tải lại.'); location.reload(); }
  else alert('Không khôi phục được: '+(r.reason||'không rõ')+'.');
}

/* ---------- auth wrappers (panel buttons) ---------- */
function authErr(e){
  var m=(e&&e.message)||String(e||'');
  var map={'auth/popup-closed-by-user':'Bạn đã đóng cửa sổ đăng nhập.', 'auth/cancelled-popup-request':'Đăng nhập bị hủy.', 'auth/network-request-failed':'Mất mạng — kiểm tra kết nối rồi thử lại.', 'auth/user-not-found':'Không tìm thấy tài khoản với email này.', 'auth/wrong-password':'Sai mật khẩu.', 'auth/email-already-in-use':'Email này đã có tài khoản — hãy đăng nhập.', 'auth/weak-password':'Mật khẩu cần ít nhất 6 ký tự.', 'auth/invalid-email':'Email không hợp lệ.', 'auth/operation-not-allowed':'Phương thức đăng nhập này chưa được bật trong Firebase Console.'};
  for(var k in map){ if(m.indexOf(k)>=0) return map[k]; }
  return 'Đăng nhập thất bại: '+m;
}
function signInGoogle(){
  var s=sync(); if(!s||!s.configured()){ alert('Chưa cấu hình Firebase — xem FIREBASE_SETUP.md.'); return Promise.resolve(null); }
  return s.signInGoogle().then(function(u){ if(window.__v15) try{ window.__v15.renderTab(); }catch(e){} return u; })
    .catch(function(e){ alert(authErr(e)); return null; });
}
function signInEmail(){
  var s=sync(); if(!s||!s.configured()){ alert('Chưa cấu hình Firebase — xem FIREBASE_SETUP.md.'); return Promise.resolve(null); }
  var em=($('#v20email')||{}).value||'', pw=($('#v20pw')||{}).value||'';
  if(!em||!pw){ alert('Nhập email và mật khẩu.'); return Promise.resolve(null); }
  return s.signInEmail(em,pw).then(function(u){ if(window.__v15) try{ window.__v15.renderTab(); }catch(e){} return u; })
    .catch(function(e){ alert(authErr(e)); return null; });
}
function signUpEmail(){
  var s=sync(); if(!s||!s.configured()){ alert('Chưa cấu hình Firebase — xem FIREBASE_SETUP.md.'); return Promise.resolve(null); }
  var em=($('#v20email')||{}).value||'', pw=($('#v20pw')||{}).value||'';
  if(!em||!pw){ alert('Nhập email và mật khẩu để tạo tài khoản.'); return Promise.resolve(null); }
  return s.signUpEmail(em,pw).then(function(u){ if(window.__v15) try{ window.__v15.renderTab(); }catch(e){} return u; })
    .catch(function(e){ alert(authErr(e)); return null; });
}
function signOut(){
  var s=sync(); if(!s) return Promise.resolve();
  return s.signOut().then(function(){ if(window.__v15) try{ window.__v15.renderTab(); }catch(e){} });
}

/* ---------- init ---------- */
function init20(){
  if(window.__v20) return;
  runMigration();
  wrapSave();
  installFlushHooks();
  installPill();
  wrapGlobals();
  var s=sync();
  if(s) s.onChange(function(){ renderPill(); refreshConflict(); });
  /* wrap the old import so file restores go through validation + snapshot */
  try{
    var v=window.__v15;
    if(v&&v.backupImport&&!v.backupImport.__v20){
      var _bi=v.backupImport;
      var nw=function(input){ importFile(input,_bi); };
      nw.__v20=true; v.backupImport=nw;
    }
  }catch(e){}
  setSaveState(meta().lastSavedAt?'saved':'idle');
}
init20();

window.__v20={
  saveNow:saveNow, flush:flush,
  status:function(){ return {saveState:saveState, saveError:saveError, lastSavedAt:meta().lastSavedAt||0}; },
  statusText:saveStateText, syncStatusText:syncStatusText,
  dataPanelHTML:dataPanelHTML, conflictHTML:conflictHTML, refreshConflict:refreshConflict,
  importFile:importFile, exportFile:exportFile,
  syncNow:syncNow, resolveConflict:resolveConflict,
  signInGoogle:signInGoogle, signInEmail:signInEmail, signUpEmail:signUpEmail, signOut:signOut,
  rollback:rollback, runMigration:runMigration, restorePreMigration:restorePreMigration,
  meta:meta, injectDataBtn:injectDataBtn,
  version:'12.0.0',
  _test:{
    saveState:function(){ return saveState; }, flush:flush, requestSave:requestSave,
    verifyWrite:verifyWrite, runMigration:runMigration, restorePreMigration:restorePreMigration,
    importFile:importFile, lastImportError:function(){ return lastImportError; },
    setDirty:function(){ dirty=true; }, isDirty:function(){ return dirty; },
    snapshot:snapshot, BACKUP_KEY:BACKUP_KEY
  }
};
})();
