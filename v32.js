/* ================================================================
   Korean & English Vocab Farm — V32 (V16.4 Data Safety)
   Layer V32: additive monitor layer, version 16.4.0, loads LAST.

   SCOPE (PLAN_V32.md — Claude Top-5 #1 + #2 ONLY):
   - #2 localStorage monitor: 5 MB estimated budget, ok/warn/critical
     levels, per-key breakdown, safe cleanup (snapshots beyond newest
     5 + history beyond newest 10, confirm first, never deletes the
     live save / v11-backup / verified-cloud copy / unknown keys),
     pre-save guard (global save wrap + __v20.flush wrap +
     __v31.recordBackupEvent wrap + 30 s interval + visibilitychange),
     dismissible floating badge (z-index 1100, below V20 modal 1200
     and V31 1400).
   - #1 automated data/sync regression suite is tools/v32/test32.js
     (separate test agent owns it) — this file only exposes the
     __v32 API contract the suite codes against.
   - R-V32-VER (build replacement in v20_sync.js validateSave):
     absent saveVersion accepted, ==12 accepted, anything else
     rejected with bad-version:<n>. Preventive hardening, not a fix
     for an observed bug.

   RULES (per vocab_farm_versioned_builds skill): IIFE, 'use strict',
   try/catch around everything, other layers only through window.__vNN
   with guards, never edit another layer's source, never change a
   schema, localStorage key, Firestore path, XP/gold/gems, boss/pet/
   vocab/SRS data, or working game logic. No data is ever deleted to
   make room. No feature is disabled, hidden, or error-suppressed.
   The V6 save object is a top-level `let S` (NOT a window property)
   — read it via bare S in try/catch, never via a window property
   (the V11.1 lesson).

   PRE-SAVE GUARD, save-wrap viability (verified in source before
   writing this layer): V6 HTML:947 declares `function save(){...}`
   at top level inside the classic <script> that opens at line 877,
   so `save` IS a plain window property function. V20 init20()
   (src/v20.js:417, runs once at V20 load, before V32) already
   wrapped it into a debounced requestSave() wrapper marked __v20;
   V20's flush() calls its captured original save, NOT window.save,
   so wrapping window.save here cannot re-enter flush(). The V32
   wrapper calls the original FIRST, then schedules checkBudget()
   after 900 ms (past the V20 800 ms debounce) so the measured size
   is post-flush. It NEVER blocks, delays, or alters the save. The
   wrapper copies the __v20 marker onto itself so a hypothetical
   later wrapSave() call sees __v20 and returns instead of capturing
   this wrapper as its origSave.
   ================================================================ */
(function(){
'use strict';
var VERSION='16.4.0';
var BUDGET_BYTES=5*1024*1024;
var HIST_KEY='hanvocab.v16.backup-history';
var VERIFIED_KEY='hanvocab.v16.last-verified-cloud';
var KEEP_SNAPSHOTS=5;
var KEEP_HISTORY=10;
var SAVE_KEY='hanvocab.v1';
var PROTECTED_KEY='hanvocab.v11-backup';
var SNAP_PREFIXES=['hanvocab.v12.preimport-','hanvocab.v12.pre-download-','hanvocab.v12.conflict-local-','hanvocab.v12.conflict-cloud-','hanvocab.v12.pre-merge-','hanvocab.v12.pre-rollback-'];
var KIND_LABEL={save:'Bản lưu hiện tại',history:'Lịch sử sao lưu',snapshots:'Bản sao lưu hệ thống',verified:'Đã xác minh đám mây',protected:'Được bảo vệ — không xóa',other:'Khác — không xóa được từ đây'};

/* ---------- small helpers ---------- */
function logWarn(msg){ try{ if(window.console&&console.warn) console.warn('[V32] '+msg); }catch(e){} }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtTime(ts){
  if(!ts) return 'chưa có';
  try{ var d=new Date(ts); return d.toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}); }catch(e){ return String(ts); }
}
function fmtKB(bytes){ return (bytes/1024).toFixed(1)+' KB'; }
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } }
function lsDel(k){ try{ localStorage.removeItem(k); return true; }catch(e){ return false; } }
function lsKeys(){ try{ var a=[]; for(var i=0;i<localStorage.length;i++) a.push(localStorage.key(i)); return a; }catch(e){ return []; } }
function getS32(){ try{ return S; }catch(e){ return null; } }

/* UTF-8 byte length via the encodeURIComponent trick (works in Node vm
   too; never use the binary-blob constructor in this layer — it does
   not exist in vm). */
function byteLen(s){
  try{
    s=String(s==null?'':s);
    return encodeURIComponent(s).replace(/%[0-9A-F]{2}/g,'x').length;
  }catch(e){ return String(s==null?'':s).length; }
}
function levelFor(pct){
  if(pct>=90) return 'critical';
  if(pct>=70) return 'warn';
  return 'ok';
}
/* null = not the game's data (ignored entirely, never listed). */
function classifyKey(k){
  if(!k||k.indexOf('hanvocab.')!==0) return null;
  if(k===SAVE_KEY) return 'save';
  if(k===HIST_KEY) return 'history';
  if(k===VERIFIED_KEY) return 'verified';
  if(k===PROTECTED_KEY) return 'protected';
  for(var i=0;i<SNAP_PREFIXES.length;i++){
    if(k.indexOf(SNAP_PREFIXES[i])===0) return 'snapshots';
  }
  return 'other';
}
function listStorageKeys(){ return lsKeys(); }
function snapshotAt(key){
  for(var i=0;i<SNAP_PREFIXES.length;i++){
    var p=SNAP_PREFIXES[i];
    if(key.indexOf(p)===0) return parseInt(key.slice(p.length),10)||0;
  }
  return 0;
}
function readHistoryRaw(){ return lsGet(HIST_KEY); }
function readHistory(){
  try{ var a=JSON.parse(readHistoryRaw()||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; }
}
function readSaveVersion(){
  try{
    var s=getS32();
    if(s&&s.v7&&s.v7.meta&&s.v7.meta.saveVersion!==undefined) return s.v7.meta.saveVersion;
  }catch(e){}
  return null;
}

/* ---------- storage computation (pure reads, no writes) ---------- */
function computeStorage(){
  var keys=[], byKind={save:0,history:0,snapshots:0,verified:0,other:0}, total=0;
  try{
    lsKeys().forEach(function(k){
      var kind=classifyKey(k);
      if(kind===null) return;
      var raw=lsGet(k);
      var b=byteLen(raw||'');
      keys.push({key:k, bytes:b, kind:kind});
      total+=b;
      if(kind==='protected') byKind.other+=b;
      else byKind[kind]+=b;
    });
  }catch(e){}
  keys.sort(function(a,b){ return b.bytes-a.bytes; });
  var pct=Math.round((total/BUDGET_BYTES*100)*10)/10;
  return {totalBytes:total, budgetBytes:BUDGET_BYTES, pct:pct, level:levelFor(pct), keys:keys, byKind:byKind};
}

/* ---------- prune plan (pure, no writes) ---------- */
function prunePlan(){
  var snapKeys=[], histPrune=0, histKept=0, freed=0;
  try{
    var st=computeStorage();
    var snaps=[];
    st.keys.forEach(function(e){ if(e.kind==='snapshots') snaps.push(e); });
    snaps.sort(function(a,b){
      var d=snapshotAt(b.key)-snapshotAt(a.key);
      return d!==0?d:(a.key<b.key?-1:(a.key>b.key?1:0));
    });
    var keep=snaps.slice(0,KEEP_SNAPSHOTS), del=snaps.slice(KEEP_SNAPSHOTS);
    del.forEach(function(e){ snapKeys.push(e.key); freed+=e.bytes; });
    var hist=readHistory();
    histKept=Math.min(KEEP_HISTORY, hist.length);
    if(hist.length>KEEP_HISTORY){
      histPrune=hist.length-KEEP_HISTORY;
      var oldRaw=readHistoryRaw()||'';
      var newRaw=JSON.stringify(hist.slice(0,KEEP_HISTORY));
      freed+=Math.max(0, byteLen(oldRaw)-byteLen(newRaw));
    }
    return {snapshotKeys:snapKeys, deletedKeys:snapKeys.slice(), keptSnapshots:keep.length,
      historyPrune:histPrune, historyKept:histKept, freedBytes:freed};
  }catch(e){
    return {snapshotKeys:[], deletedKeys:[], keptSnapshots:0, historyPrune:0, historyKept:0, freedBytes:0};
  }
}

/* ---------- cleanup (confirm first; deletes ONLY the plan) ---------- */
var _lastCleanup=null;
function cleanupSafe(confirmFn){
  try{
    var plan=prunePlan();
    if(!plan.snapshotKeys.length&&!plan.historyPrune){
      return {ok:true, freedBytes:0, deletedKeys:[], keptSnapshots:plan.keptSnapshots, historyKept:plan.historyKept, note:'nothing-to-delete'};
    }
    var fn=null;
    if(typeof confirmFn==='function') fn=confirmFn;
    else if(typeof window.confirm==='function') fn=window.confirm;
    if(!fn) return {ok:false, reason:'no-confirm'};
    var msg='Dọn dẹp an toàn sẽ xóa '+plan.snapshotKeys.length+' bản sao lưu hệ thống cũ'
      +(plan.snapshotKeys.length?' ('+plan.snapshotKeys.join(', ')+')':'')
      +' và '+plan.historyPrune+' mục lịch sử sao lưu cũ (giữ lại '+KEEP_HISTORY+' mục mới nhất). '
      +'Bản lưu hiện tại (hanvocab.v1), bản sao lưu trước khi chuyển đổi V12 và bản sao lưu đám mây đã xác minh sẽ KHÔNG bị xóa. Tiếp tục?';
    var ok=false;
    try{ ok=!!fn(msg); }catch(e){ ok=false; }
    if(!ok) return {ok:false, reason:'cancelled'};
    var freed=0, deleted=[];
    plan.snapshotKeys.forEach(function(k){
      var raw=lsGet(k);
      if(lsDel(k)){ deleted.push(k); freed+=byteLen(raw||''); }
    });
    var histKept=plan.historyKept;
    if(plan.historyPrune){
      var hist=readHistory();
      var kept=hist.slice(0,KEEP_HISTORY);
      var oldRaw=readHistoryRaw()||'';
      var newRaw=JSON.stringify(kept);
      if(lsSet(HIST_KEY, newRaw)) freed+=Math.max(0, byteLen(oldRaw)-byteLen(newRaw));
      histKept=kept.length;
    }
    var res={ok:true, freedBytes:freed, deletedKeys:deleted, keptSnapshots:plan.keptSnapshots, historyKept:histKept};
    _lastCleanup={at:Date.now(), freedBytes:freed, deletedKeys:deleted.slice()};
    try{
      var v31=window.__v31;
      if(v31&&typeof v31.recordBackupEvent==='function'){
        v31.recordBackupEvent('cleanup', freed, '', '', true,
          'Dọn dẹp an toàn: đã xóa '+deleted.length+' bản sao lưu hệ thống cũ và '+plan.historyPrune+' mục lịch sử cũ, giải phóng '+fmtKB(freed));
      }
    }catch(e){}
    try{ refreshMonitor(); }catch(e){}
    return res;
  }catch(e){ return {ok:false, reason:'error'}; }
}

/* ---------- monitor section HTML (values computed live, never cached) ---------- */
function monitorHTML(){
  try{
    var st=computeStorage();
    var sv=readSaveVersion();
    var versionKnown=(sv===null||sv===12);
    var barW=Math.min(st.pct,100);
    var barCls=st.level==='critical'?'v32barfill-critical':(st.level==='warn'?'v32barfill-warn':'v32barfill-ok');
    var lvlTxt=st.level==='critical'?'Nguy hiểm':(st.level==='warn'?'Cảnh báo':'Ổn');
    var lvlCls=st.level==='critical'?'v32crit':(st.level==='warn'?'v32warn':'v32ok');
    var h='<div class="v32section" id="v32monitor">'
      +'<h3 class="v32h">Giám sát dung lượng lưu trữ — V16.4</h3>'
      +'<div class="v32card"><b>Dung lượng đã dùng (ước tính)</b>'
      +'<p class="v32line"><b>'+esc(fmtKB(st.totalBytes))+'</b> / '+esc(fmtKB(st.budgetBytes))+' ('+st.pct.toFixed(1)+'% — <span class="'+lvlCls+'">'+lvlTxt+'</span>)</p>'
      +'<div class="v32barwrap" role="progressbar" aria-valuenow="'+st.pct+'" aria-valuemin="0" aria-valuemax="100"><div class="v32bar '+barCls+'" style="width:'+barW+'%"></div></div>'
      +'<p class="v32line">Cảnh báo ở 70% — nên dọn dẹp bản sao lưu cũ. Nguy hiểm ở 90% — có nguy cơ không lưu được.</p>'
      +'<p class="v32line">Số liệu là ước tính: cách tính hạn mức của trình duyệt khác với số byte UTF-8, nên đây là cảnh báo sớm thận trọng, không phải đồng hồ đo hạn mức chính xác.</p>'
      +'<p class="v32line">Phiên bản bản lưu hiện tại: <b>'+(sv===null?'không rõ':esc(sv))+'</b>'+(versionKnown?'':' — <span class="v32crit">phiên bản lạ, bản lưu có thể không tương thích</span>')+'</p>'
      +'<p class="v32line">Bản lưu: '+esc(fmtKB(st.byKind.save))+' · Lịch sử sao lưu: '+esc(fmtKB(st.byKind.history))+' · Bản sao lưu hệ thống: '+esc(fmtKB(st.byKind.snapshots))+' · Đã xác minh đám mây: '+esc(fmtKB(st.byKind.verified))+' · Khác: '+esc(fmtKB(st.byKind.other))+'</p>';
    if(!st.keys.length){
      h+='<p class="v32line">Chưa có dữ liệu hanvocab nào trong bộ nhớ trình duyệt.</p>';
    } else {
      h+='<ul class="v32keys">';
      st.keys.forEach(function(e){
        h+='<li class="v32keyrow"><span class="v32keyname">'+esc(e.key)+'</span><span class="v32keykind">'+esc(KIND_LABEL[e.kind]||e.kind)+'</span><span class="v32keybytes">'+e.bytes+' byte ('+esc(fmtKB(e.bytes))+')</span></li>';
      });
      h+='</ul>';
    }
    h+='<div class="v32acts"><button type="button" class="btn pri v32btn" onclick="window.__v32&&__v32.cleanupSafe();window.__v32&&__v32.refreshMonitor()">Dọn dẹp an toàn</button></div>'
      +'<p class="v32line v32note">Chỉ xóa bản sao lưu hệ thống cũ hơn 5 bản mới nhất và mục lịch sử sao lưu cũ hơn 10 mục mới nhất. Bản lưu hiện tại, bản sao lưu trước khi chuyển đổi V12 và bản sao lưu đám mây đã xác minh không bao giờ bị xóa. Luôn hỏi xác nhận trước khi xóa.</p>'
      +(_lastCleanup?'<p class="v32line">Lần dọn dẹp gần nhất: <b>'+esc(fmtTime(_lastCleanup.at))+'</b> — giải phóng '+esc(fmtKB(_lastCleanup.freedBytes))+' ('+_lastCleanup.deletedKeys.length+' bản đã xóa).</p>':'')
      +'</div></div>';
    return h;
  }catch(e){ return ''; }
}
function refreshMonitor(){
  try{
    var nodes=document.querySelectorAll('#v32monitor');
    var list=[];
    for(var i=0;i<nodes.length;i++) list.push(nodes[i]);
    list.forEach(function(n){
      try{
        var tmp=document.createElement('div');
        tmp.innerHTML=monitorHTML();
        var fresh=tmp.firstChild;
        if(fresh&&n.parentNode) n.parentNode.replaceChild(fresh, n);
      }catch(e){}
    });
  }catch(e){}
}

/* ---------- floating badge (warn/critical only, dismissible) ---------- */
var _badgeDismissed=false;
function hideBadge(){
  try{ var b=document.getElementById('v32badge'); if(b&&b.parentNode) b.parentNode.removeChild(b); }catch(e){}
}
function showBadge(level, pct){
  try{
    if(_badgeDismissed) return;
    var b=document.getElementById('v32badge');
    var txt='Dung lượng lưu trữ đạt '+pct.toFixed(1)+'%'+(level==='critical'?' — có nguy cơ không lưu được':' — nên dọn dẹp bản sao lưu cũ')+'. Chạm để xem chi tiết.';
    if(!b){
      b=document.createElement('div');
      b.id='v32badge';
      b.setAttribute('role','alert');
      var span=document.createElement('span');
      span.className='v32badge-text';
      b.appendChild(span);
      var close=document.createElement('button');
      close.type='button';
      close.className='v32badge-close';
      close.textContent='Đóng';
      close.setAttribute('aria-label','Đóng cảnh báo dung lượng');
      close.addEventListener('click', function(ev){ try{ ev.stopPropagation(); }catch(e){} _badgeDismissed=true; hideBadge(); });
      b.appendChild(close);
      b.addEventListener('click', function(){
        try{ if(typeof window.setView==='function'){ window.setView('data'); return; } }catch(e){}
        _badgeDismissed=true; hideBadge();
      });
      if(document.body) document.body.appendChild(b);
      else return;
    }
    b.className='v32badge'+(level==='critical'?' v32badge-critical':'');
    var t=b.querySelector('.v32badge-text');
    if(t) t.textContent=txt;
  }catch(e){}
}

/* ---------- checkBudget: recompute + surface warnings ---------- */
var _lastCheckAt=0;
function checkBudget(){
  var st=computeStorage();
  _lastCheckAt=Date.now();
  try{
    if(st.level==='warn'||st.level==='critical'){
      logWarn('dung lượng lưu trữ đạt '+st.pct.toFixed(1)+'% ('+st.totalBytes+' / '+st.budgetBytes+' byte) — nên dọn dẹp bản sao lưu cũ.');
      showBadge(st.level, st.pct);
    } else {
      hideBadge();
    }
  }catch(e){}
  try{ refreshMonitor(); }catch(e){}
  return st;
}

/* ---------- status probe ---------- */
function status(){
  var st=computeStorage();
  var sv=readSaveVersion();
  var histBytes=0, snapBytes=0;
  try{
    histBytes=byteLen(lsGet(HIST_KEY)||'');
    st.keys.forEach(function(e){ if(e.kind==='snapshots') snapBytes+=e.bytes; });
  }catch(e){}
  return {version:VERSION, budgetBytes:BUDGET_BYTES, totalBytes:st.totalBytes, pct:st.pct, level:st.level,
    keys:st.keys, historyBytes:histBytes, snapshotBytes:snapBytes,
    saveVersion:sv, versionKnown:(sv===null||sv===12), lastCheckAt:_lastCheckAt, lastCleanup:_lastCleanup};
}

/* ---------- wraps (all idempotent) ---------- */
var _saveWrapped=false, _flushWrapped=false;
function wrapSave(){
  try{
    if(typeof window.save!=='function'){ _saveWrapped=false; return false; }
    if(window.save.__v32){ _saveWrapped=true; return true; }
    var orig=window.save;
    var w=function(){
      var r;
      try{ r=orig.apply(this,arguments); }catch(e){ r=undefined; }
      try{ setTimeout(function(){ try{ checkBudget(); }catch(e){} }, 900); }catch(e){}
      return r;
    };
    if(orig.__v20) w.__v20=true;
    w.__v32=true;
    window.save=w;
    _saveWrapped=true;
    return true;
  }catch(e){ return false; }
}
function wrapFlush(){
  try{
    var v=window.__v20;
    if(!v||typeof v.flush!=='function'){ _flushWrapped=false; return false; }
    if(v.flush.__v32){ _flushWrapped=true; return true; }
    var orig=v.flush;
    var w=function(){
      var r;
      try{ r=orig.apply(this,arguments); }catch(e){ r=undefined; }
      try{ checkBudget(); }catch(e){}
      return r;
    };
    w.__v32=true;
    v.flush=w;
    _flushWrapped=true;
    return true;
  }catch(e){ return false; }
}
function wrapRecordBackupEvent(){
  try{
    var v31=window.__v31;
    if(!v31||typeof v31.recordBackupEvent!=='function') return false;
    if(v31.recordBackupEvent.__v32) return true;
    var orig=v31.recordBackupEvent;
    var w=function(){
      var r;
      try{ r=orig.apply(this,arguments); }catch(e){ r=undefined; }
      try{ checkBudget(); }catch(e){}
      return r;
    };
    w.__v32=true;
    v31.recordBackupEvent=w;
    return true;
  }catch(e){ return false; }
}
var panelWrapped=false;
function wrapDataPanel(){
  try{
    var v=window.__v20;
    if(!v||typeof v.dataPanelHTML!=='function') return false;
    if(v.dataPanelHTML.__v32){ panelWrapped=true; return true; }
    var orig=v.dataPanelHTML;
    var nw=function(){
      var h=''; try{ h=orig.apply(this,arguments)||''; }catch(e){ h=''; }
      try{
        var sec=monitorHTML();
        if(h&&sec){
          var idx=h.lastIndexOf('</div>');
          if(idx>=0) h=h.slice(0,idx)+sec+'</div>';
          else h+=sec;
        }
      }catch(e){}
      return h;
    };
    /* B-32-2: carry BOTH markers — V31 re-init guards on __v31,
       V32 re-init guards on __v32; without __v31 V31 re-wraps
       and every panel render appends #v31panel + #v32monitor twice. */
    nw.__v31=true;
    nw.__v32=true;
    v.dataPanelHTML=nw;
    panelWrapped=true;
    return true;
  }catch(e){ return false; }
}

/* Account Center backup tab — MutationObserver decorator (V31 pattern).
   The tab re-renders on every switch, so a one-time injection would be
   wiped; the observer re-inserts the monitor after #v31acct whenever
   the backup tab is showing. */
var _acctObs=null, _acctBodyObs=null, _acctArmed=false;
function decorateAcct(){
  try{
    if(!document.getElementById('v21importfile')) return; /* backup tab not showing */
    var acct=document.getElementById('v31acct');
    if(!acct) return;
    var next=acct.nextElementSibling;
    if(next&&next.id==='v32monitor') return;
    var div=document.createElement('div');
    div.innerHTML=monitorHTML();
    var node=div.firstChild;
    if(node&&acct.parentNode) acct.parentNode.insertBefore(node, acct.nextSibling);
  }catch(e){}
}
function armAcctDecorator(){
  try{
    if(_acctArmed) return;
    _acctArmed=true;
    var start=function(){
      try{
        if(_acctObs) _acctObs.disconnect();
        var host=document.getElementById('v21mcontent');
        if(host){
          _acctObs=new MutationObserver(function(){ decorateAcct(); });
          _acctObs.observe(host,{childList:true,subtree:true});
        } else if(window.MutationObserver){
          if(_acctBodyObs) _acctBodyObs.disconnect();
          _acctBodyObs=new MutationObserver(function(){
            if(document.getElementById('v21mcontent')){
              try{ _acctBodyObs.disconnect(); }catch(e){}
              start();
            }
          });
          if(document.body) _acctBodyObs.observe(document.body,{childList:true,subtree:true});
        }
        decorateAcct();
      }catch(e){}
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }catch(e){}
}
function disarmAcctDecorator(){
  try{ if(_acctObs) _acctObs.disconnect(); if(_acctBodyObs) _acctBodyObs.disconnect(); _acctArmed=false; }catch(e){}
}
function wrapAccount(){
  try{
    var v=window.__v21;
    if(!v) return;
    if(typeof v.openAccount==='function'&&!v.openAccount.__v32){
      var _o=v.openAccount;
      var nw=function(){ var r=_o.apply(this,arguments); armAcctDecorator(); return r; };
      /* B-32-2: dual marker — V31 also wraps openAccount (v31.js:627)
         and its re-init guards on __v31. */
      nw.__v31=true; nw.__v32=true; v.openAccount=nw;
    }
    if(typeof v.closeAccount==='function'&&!v.closeAccount.__v32){
      var _c=v.closeAccount;
      var nc=function(){ var r=_c.apply(this,arguments); disarmAcctDecorator(); return r; };
      /* B-32-2: dual marker — V31 also wraps closeAccount (v31.js:632)
         and its re-init guards on __v31. */
      nc.__v31=true; nc.__v32=true; v.closeAccount=nc;
    }
  }catch(e){}
}

/* ---------- init (all wraps idempotent; safe to call twice) ---------- */
var _intervalSet=false;
function init32(){
  wrapSave();
  wrapFlush();
  wrapRecordBackupEvent();
  wrapDataPanel();
  wrapAccount();
  try{
    if(!_intervalSet&&typeof setInterval==='function'){
      var iv=setInterval(function(){ try{ checkBudget(); }catch(e){} }, 30000);
      if(iv&&typeof iv.unref==='function'){ try{ iv.unref(); }catch(e){} }
      _intervalSet=true;
    }
  }catch(e){}
  try{
    if(typeof document!=='undefined'&&document&&typeof document.addEventListener==='function'){
      document.addEventListener('visibilitychange', function(){
        try{ if(!document.hidden) checkBudget(); }catch(e){}
      });
    }
  }catch(e){}
  try{ checkBudget(); }catch(e){}
}
try{ init32(); }catch(e){}
if(typeof document!=='undefined'&&document&&document.readyState==='loading'){ try{ document.addEventListener('DOMContentLoaded', function(){ try{ init32(); }catch(e){} }); }catch(e){} }

window.__v32={
  version:VERSION,
  status:status,
  computeStorage:computeStorage,
  checkBudget:checkBudget,
  cleanupSafe:cleanupSafe,
  monitorHTML:monitorHTML,
  refreshMonitor:refreshMonitor,
  _test:{
    status:status, computeStorage:computeStorage, checkBudget:checkBudget,
    cleanupSafe:cleanupSafe, monitorHTML:monitorHTML, refreshMonitor:refreshMonitor,
    byteLen:byteLen, levelFor:levelFor, classifyKey:classifyKey,
    listStorageKeys:listStorageKeys, prunePlan:prunePlan,
    saveWrapped:function(){ return _saveWrapped&&!!(window.save&&window.save.__v32); },
    flushWrapped:function(){ try{ return !!(window.__v20&&window.__v20.flush&&window.__v20.flush.__v32); }catch(e){ return false; } },
    init:init32, wrapDataPanel:wrapDataPanel, armAcctDecorator:armAcctDecorator
  }
};
})();
