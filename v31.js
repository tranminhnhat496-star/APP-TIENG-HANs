/* ================================================================
   Korean & English Vocab Farm — V31 (V16.3 Backup & Restore Fix)
   Layer V31: additive fix layer, version 16.3.0, loads LAST.

   SCOPE (PLAN_V31.md — backup/restore/sync only):
   - F-01/F-03 merge branches: build replacements R-F-01a/b, R-F-03a/b,
     R-F-01-en16 (in v20_sync.js, applied by build_v31.py).
   - F-02 stale-S race: build replacements R-F-02a/b/c/d.
   - F-11: no-op-with-warn guard on __v27.recordAnswer (§2 below) +
     build replacement R-V31-F11 on the closure-local recordAnswer.
   - F-12: resetEN clears ONLY the EN-side en27.en maps (EN-side-only
     interpretation, CHOSEN PENDING OWNER CONFIRMATION — see CHANGELOG).
   - F-13/F-14/F-15/F-16: build replacements (hasProgress, localTime
     fallback, scan depth 4->6 hardening, standalone backupImport).
   - C1 export: flush-before-export + v16.3 filename (build R-V31-C1).
   - C6 conflict summary: flat-V18 boss-win predicate fix (R-V31-C6)
     + updated merge copy (R-V31-C6b/c) + post-merge report (§6).
   - C9 Account Center restore: passes the input element, not a File
     (build R-V31-C9).
   - D.3 backup history (new key hanvocab.v16.backup-history, cap 20),
     D.5 cloud read-back verification (option b — V31-side post-sync
     check, see §5), D.7 export history.

   Z-INDEX STACK (documented, not changed — F-06 is out of scope):
     .v20modal 1200 < V31 overlays 1400 < #v21account 9998 /
     #v21auth 9999. V31 adds no modal of its own; 1400 is reserved for
     any future V31 confirm overlay.

   RULES (per vocab_farm_versioned_builds skill): IIFE, 'use strict',
   try/catch around everything, other layers only through window.__vNN
   with guards, never edit another layer's source, never change a
   schema, localStorage key, Firestore path, XP/gold/gems, boss/pet/
   vocab/SRS data, or working game logic. No feature is disabled,
   hidden, or error-suppressed anywhere in this file. The V6 save
   object is a top-level `let S` (NOT a window property) — read it via
   bare S in try/catch, never window.S (the V11.1 lesson).
   ================================================================ */
(function(){
'use strict';
var VERSION='16.3.0';

/* ---------- small helpers ---------- */
function logWarn(msg){ try{ if(window.console&&console.warn) console.warn('[V31] '+msg); }catch(e){} }
function hasS(){ try{ return typeof S!=='undefined' && !!S; }catch(e){ return false; } }
function getS31(){ try{ return S; }catch(e){ return null; } }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtTime(ts){
  if(!ts) return 'chưa có';
  try{ var d=new Date(ts); return d.toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}); }catch(e){ return String(ts); }
}
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } }
function lsDel(k){ try{ localStorage.removeItem(k); return true; }catch(e){ return false; } }
function lsKeys(){ try{ var a=[]; for(var i=0;i<localStorage.length;i++) a.push(localStorage.key(i)); return a; }catch(e){ return []; } }
function fnv(s){
  var h=0x811c9dc5; s=String(s||'');
  for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,0x01000193)>>>0; }
  return ('0000000'+h.toString(16)).slice(-8);
}
function hashOf(raw){ try{ var s=window.__v20sync; if(s&&s.hash) return s.hash(raw); }catch(e){} return fnv(raw||''); }
function saveBytes(){ try{ return (lsGet('hanvocab.v1')||'').length; }catch(e){ return 0; } }

/* ---------- D.3 backup history (new key, cap 20) ---------- */
var HIST_KEY='hanvocab.v16.backup-history';
var VERIFIED_KEY='hanvocab.v16.last-verified-cloud';
var MAX_HIST=20;
var KIND_LABEL={'local-export':'Xuất file','cloud-upload':'Sao lưu đám mây','cloud-download':'Tải từ đám mây','restore':'Khôi phục','pre-restore':'Ảnh chụp trước khôi phục','conflict':'Xung đột','merge':'Hợp nhất'};
function readHistory(){
  try{ var a=JSON.parse(lsGet(HIST_KEY)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; }
}
function writeHistory(a){ try{ lsSet(HIST_KEY, JSON.stringify((a||[]).slice(0,MAX_HIST))); }catch(e){} }
function recordBackupEvent(kind, bytes, hash, key, ok, note){
  try{
    var h=readHistory();
    h.unshift({at:Date.now(), kind:kind, bytes:(bytes==null?0:bytes), hash:(hash||''), key:(key||''), ok:(ok!==false), note:(note||'')});
    writeHistory(h.slice(0,MAX_HIST));
    return true;
  }catch(e){ return false; }
}
function lastVerifiedCloud(){ try{ var v=JSON.parse(lsGet(VERIFIED_KEY)||'null'); return v||null; }catch(e){ return null; } }

/* Pre-existing snapshots (C7): enumerate the known prefixes READ-ONLY.
   hanvocab.v11-backup (pre-migration) is listed info-only: it is never
   deleted by V31 and its restore stays on the existing rollback button. */
var SNAP_PREFIXES=['hanvocab.v12.preimport-','hanvocab.v12.pre-download-','hanvocab.v12.conflict-local-','hanvocab.v12.conflict-cloud-','hanvocab.v12.pre-merge-','hanvocab.v12.pre-rollback-'];
function listSystemSnapshots(){
  var out=[];
  try{
    lsKeys().forEach(function(k){
      if(k==='hanvocab.v11-backup'){ out.push({key:k, at:0, label:'Bản sao lưu trước khi chuyển đổi V12', valid:null}); return; }
      for(var i=0;i<SNAP_PREFIXES.length;i++){
        var p=SNAP_PREFIXES[i];
        if(k.indexOf(p)===0){
          var at=parseInt(k.slice(p.length),10)||0, ok=null;
          try{
            var j=JSON.parse(lsGet(k)||'null');
            if(j&&Array.isArray(j.cards)){
              var s=window.__v20sync;
              if(s&&s.validateSave){ var v=s.validateSave(j); ok=!!(v&&v.ok); } else ok=true;
            } else ok=false;
          }catch(e){ ok=false; }
          out.push({key:k, at:at, label:p.replace('hanvocab.v12.',''), valid:ok});
          break;
        }
      }
    });
  }catch(e){}
  out.sort(function(a,b){ return (b.at||0)-(a.at||0); });
  return out;
}

/* ---------- C8 restore / undo (snapshot first, validate, confirm) ---------- */
var _reloadCalled=false;
function reloadPage(){ _reloadCalled=true; try{ location.reload(); }catch(e){} }
var _snapSeq45=0; /* V45 (V19.0, C-R3-4): per-process snapshot counter — part of the unique suffix below. */
function snapshotCurrent(){
  try{
    var s=window.__v20sync;
    if(s&&s.snapshot){
      var cur=lsGet('hanvocab.v1')||'';
      /* V45 (V19.0, C-R3-4): the key was 'hanvocab.v12.preimport-<ms>'
         alone, so two snapshots in the same millisecond overwrote each
         other. The counter + random suffix make every key unique; the
         leading ms number is kept so newestPreRestoreKey()'s parseInt
         still resolves the newest snapshot. */
      var k='hanvocab.v12.preimport-'+Date.now()+'-'+(++_snapSeq45)+'-'+Math.random().toString(36).slice(2,8);
      s.snapshot(k, cur);
      recordBackupEvent('pre-restore', cur.length, hashOf(cur), k, true, 'Ảnh chụp trước khi khôi phục');
      return k;
    }
  }catch(e){}
  return '';
}
function restoreRaw(raw, sourceLabel){
  /* Validate -> flush pending in-memory changes -> snapshot current ->
     write -> record -> reload. Returns {ok} / {ok:false, reason}. */
  var s=window.__v20sync;
  /* V45 (V19.0, lead): size-check BEFORE parsing — a >10 MB file was
     parsed into memory first and only then refused as file-too-large. */
  if((raw||'').length>((s&&s.MAX_IMPORT_BYTES)||10485760)) return {ok:false, reason:'file-too-large'};
  var j=null;
  try{ j=JSON.parse(raw); }catch(e){ return {ok:false, reason:'bad-json'}; }
  if(s&&s.validateSave){
    var v=s.validateSave(j);
    if(!v.ok) return {ok:false, reason:'invalid', errors:(v.errors||[])};
  } else if(!j||!Array.isArray(j.cards)) return {ok:false, reason:'bad-save'};
  try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}
  snapshotCurrent();
  try{ localStorage.setItem('hanvocab.v1', JSON.stringify(j)); }catch(e){ return {ok:false, reason:'write-failed'}; }
  recordBackupEvent('restore', (raw||'').length, hashOf(raw), '', true, 'Khôi phục từ '+(sourceLabel||'lịch sử'));
  reloadPage();
  return {ok:true};
}
function confirmDlg(msg){
  try{ if(typeof window.confirm==='function') return !!window.confirm(msg); }catch(e){}
  return false;
}
function restoreHistoryEntry(key){
  try{
    if(!key) return {ok:false, reason:'no-key'};
    var raw=lsGet(key);
    if(raw==null) return {ok:false, reason:'not-found'};
    if(!confirmDlg('Khôi phục bản sao lưu này? Dữ liệu hiện tại sẽ được thay thế — bản hiện tại đã được giữ lại trước khi khôi phục.')) return {ok:false, reason:'cancelled'};
    return restoreRaw(raw, key);
  }catch(e){ return {ok:false, reason:'error'}; }
}
function newestPreRestoreKey(){
  var best='', bestAt=0;
  lsKeys().forEach(function(k){
    if(k.indexOf('hanvocab.v12.preimport-')===0){
      var at=parseInt(k.slice('hanvocab.v12.preimport-'.length),10)||0;
      if(at>bestAt){ bestAt=at; best=k; }
    }
  });
  return best;
}
function undoRestore(){
  /* Undo always targets the NEWEST pre-restore snapshot, so it undoes
     the latest restore; restoreRaw snapshots the current save first,
     so an undo is itself undoable (undo/redo toggle). */
  try{
    var k=newestPreRestoreKey();
    if(!k) return {ok:false, reason:'no-snapshot'};
    if(!confirmDlg('Hoàn tác lần khôi phục gần nhất? Dữ liệu hiện tại sẽ được thay thế bằng bản đã giữ lại trước khi khôi phục.')) return {ok:false, reason:'cancelled'};
    return restoreRaw(lsGet(k)||'', k+' (hoàn tác)');
  }catch(e){ return {ok:false, reason:'error'}; }
}
function deleteHistoryEntry(at){
  try{
    /* V45 (V19.0, lead): delete ONE entry, not every entry sharing the
       timestamp — two backup-history events recorded in the same
       millisecond were both deleted. */
    var h=readHistory(),removed=false;
    h=h.filter(function(e){ if(!removed&&e.at===at){removed=true;return false} return true; });
    writeHistory(h);
    return {ok:true};
  }catch(e){ return {ok:false}; }
}
function deleteSnapshot(key){
  try{
    if(!key||key==='hanvocab.v11-backup') return {ok:false, reason:'protected'};
    if(!confirmDlg('Xóa bản sao lưu đã giữ lại này? Không thể hoàn tác.')) return {ok:false, reason:'cancelled'};
    lsDel(key);
    return {ok:true};
  }catch(e){ return {ok:false, reason:'error'}; }
}
function restoreFromFile(input){
  /* V31 section file picker: one code path — the existing V20 importFile
     (validate + snapshot + confirm). V31 only routes to it. */
  try{
    if(window.__v20&&__v20.importFile){ __v20.importFile(input); return {ok:true, started:true}; }
    return {ok:false, reason:'no-import'};
  }catch(e){ return {ok:false, reason:'error'}; }
}

/* ================================================================
   §2. F-11 — en27 _mem guard (defense-in-depth; the primary fix is
   build replacement R-V31-F11 on the closure-local recordAnswer).
   DECISION: no-op with console.warn (NOT flush _mem into S.v7.en27).
   A flush would need a poller watching for S to appear, plus a copy
   that must not double-count answers the hooks record again after S
   appears. S absent means the game never loaded a save — there is no
   live session whose records deserve rescuing — so dropping the write
   visibly (warn) loses nothing a real session could have saved, while
   a flush could write stale, half-counted data into a live save. The
   claim paths get the same guard for external callers; V27's own UI
   calls the closure-local claimPlanBonus/claimStreak7 directly, which
   V31 cannot reach — but those paths can only run after openSmart(),
   which itself requires S, so the unreachable case cannot occur
   from the UI.
   ================================================================ */
function wrapRecordAnswer(){
  try{
    var v27=window.__v27;
    if(!v27||typeof v27.recordAnswer!=='function') return;
    if(v27.__v31wrapped) return;
    var _rec=v27.recordAnswer;
    v27.recordAnswer=function(lang,id,ok,mode){
      if(!hasS()){
        logWarn('recordAnswer dropped: game state S is unavailable; refusing to write into the never-persisted _mem fallback (F-11).');
        return;
      }
      return _rec.apply(this,arguments);
    };
    v27.__v31wrapped=true;
    try{
      var t=v27._test;
      if(t){
        if(typeof t.claimPlanBonus==='function'&&!t.__v31wrapped){
          var _cpb=t.claimPlanBonus;
          t.claimPlanBonus=function(l){
            if(!hasS()){ logWarn('claimPlanBonus dropped: S unavailable (F-11).'); return 0; }
            return _cpb.apply(this,arguments);
          };
        }
        if(typeof t.claimStreak7==='function'&&!t.__v31wrapped){
          var _cs7=t.claimStreak7;
          t.claimStreak7=function(l){
            if(!hasS()){ logWarn('claimStreak7 dropped: S unavailable (F-11).'); return 0; }
            return _cs7.apply(this,arguments);
          };
        }
        t.__v31wrapped=true;
      }
    }catch(e){}
  }catch(e){}
}

/* ================================================================
   §5. D.5 cloud read-back verification (option b — V31-side post-sync
   check, chosen because it is additive: no edit to the closure-local
   engine.syncNow upload branches).
   After an upload, verification re-loads the cloud doc through a
   fresh syncNow({auto:true}) and requires action 'already-synced'
   with the local hash unchanged — i.e. the cloud copy was actually
   read back and compared. 'already-synced' on a later manual sync is
   itself a read-back confirmation, so it also marks the cloud copy
   verified. The V31 section NEVER shows "Đã sao lưu lên đám mây"
   until a check has passed; before that it shows "chưa có" / "đang
   xác minh…" / "chưa được xác minh — thử lại".
   KNOWN LIMIT: auto-syncs (noteLocalSaved -> engine.syncNow, which
   bypasses the __v20sync.syncNow export) are NOT verified by this
   wrapper; they become verified on the next manual sync, which
   returns 'already-synced' after reading the cloud doc back. The
   pre-existing V20 toast "Đã đồng bộ lên đám mây." still fires on
   adapter.save() resolve (V20's own wording, out of V31 scope); the
   V31 panel is the authoritative verified-backup indicator.
   ================================================================ */
var _verifyState='idle'; /* idle | verifying | verified | unverified | error */
var _verifyMsg='';
var _syncNowOrig=null;
var _verifying=false; /* re-entrancy guard: a verify in flight never starts another */
function verifyCloudBackup(source){
  try{
    if(_verifying) return Promise.resolve({ok:false, reason:'verifying'});
    var s=window.__v20sync;
    if(!s||typeof s.syncNow!=='function') return Promise.resolve({ok:false, reason:'no-sync'});
    if(!s.configured||!s.configured()) return Promise.resolve({ok:false, reason:'not-configured'});
    if(!s.currentUser||!s.currentUser()) return Promise.resolve({ok:false, reason:'guest'});
    var h0=''; try{ h0=hashOf(lsGet('hanvocab.v1')||''); }catch(e){}
    _verifying=true;
    _verifyState='verifying'; _verifyMsg='Đang xác minh bản sao lưu đám mây…';
    refreshVerifyText();
    var orig=_syncNowOrig||s.syncNow;
    return orig.call(s,{auto:true}).then(function(r){
      _verifying=false;
      var h1=''; try{ h1=hashOf(lsGet('hanvocab.v1')||''); }catch(e){}
      if(r&&r.ok&&r.action==='already-synced'&&h0===h1){
        _verifyState='verified';
        var at=Date.now();
        _verifyMsg='Đã xác minh sao lưu đám mây lúc '+fmtTime(at)+'.';
        try{ lsSet(VERIFIED_KEY, JSON.stringify({at:at, hash:h0})); }catch(e){}
        recordBackupEvent('cloud-upload', saveBytes(), h0, '', true, 'Sao lưu đám mây đã xác minh'+(source?' ('+source+')':''));
        refreshVerifyText();
        return {ok:true, verified:true, at:at};
      }
      _verifyState='unverified';
      _verifyMsg='Đồng bộ chưa được xác minh'+(r&&r.action?(' (kết quả: '+r.action+')'):'')+' — thử lại.';
      recordBackupEvent('cloud-upload', 0, h0, '', false, 'Sao lưu đám mây chưa được xác minh'+(source?' ('+source+')':''));
      refreshVerifyText();
      return {ok:false, verified:false, action:r&&r.action};
    }).catch(function(e){
      _verifying=false;
      _verifyState='error'; _verifyMsg='Không xác minh được sao lưu đám mây: '+String((e&&e.message)||e);
      refreshVerifyText();
      return {ok:false, verified:false, error:String((e&&e.message)||e)};
    });
  }catch(e){ return Promise.resolve({ok:false, reason:'error'}); }
}
function wrapSyncNow(){
  try{
    var s=window.__v20sync;
    if(!s||typeof s.syncNow!=='function'||s.syncNow.__v31) return;
    _syncNowOrig=s.syncNow;
    var nw=function(opts){
      return _syncNowOrig.call(s, opts).then(function(r){
        try{
          if(r&&r.ok&&r.action==='uploaded'){
            verifyCloudBackup('syncNow');
          } else if(r&&r.ok&&r.action==='already-synced'){
            /* The cloud doc was just read back and its hash equals the
               local hash: the cloud copy is confirmed present. */
            var h=''; try{ h=hashOf(lsGet('hanvocab.v1')||''); }catch(e){}
            _verifyState='verified';
            _verifyMsg='Đã xác minh sao lưu đám mây lúc '+fmtTime(Date.now())+'.';
            try{ lsSet(VERIFIED_KEY, JSON.stringify({at:Date.now(), hash:h})); }catch(e){}
            refreshVerifyText();
          } else if(r&&!r.ok&&r.reason==='conflict'){
            recordBackupEvent('conflict', saveBytes(), hashOf(lsGet('hanvocab.v1')||''), '', true, 'Xung đột dữ liệu — chờ lựa chọn của bạn');
          }
        }catch(e){}
        return r;
      });
    };
    nw.__v31=true; s.syncNow=nw;
  }catch(e){}
}
function syncAndVerify(){
  try{
    var v=window.__v20;
    if(!v||typeof v.syncNow!=='function') return Promise.resolve({ok:false, reason:'no-sync'});
    return v.syncNow().then(function(r){ refreshVerifyText(); return r; });
  }catch(e){ return Promise.resolve({ok:false, reason:'error'}); }
}

/* ================================================================
   §6. C6 post-merge report. The merge itself writes the merged save
   locally (v20_sync engine.resolveConflict 'merge' -> writeLocalRaw)
   before uploading, so the wrapper reads the merged save from
   localStorage and diffs it against the conflict's local/cloud sides
   captured before the call. Fields resolved last-write-wins by design
   (en23.team/hatch, en27.plan/uiLang, en15.daily) are named with the
   winning side (the newer side).
   ================================================================ */
var _lastMergeReport=null;
function summarizeSide(x){
  try{
    var enBox=0; if(x&&x.v7&&x.v7.en&&x.v7.en.box) enBox=Object.keys(x.v7.en.box).length;
    var pets=0; if(x&&x.v7&&x.v7.en23&&x.v7.en23.pets) pets=Object.keys(x.v7.en23.pets).length;
    var quests=0; if(x&&x.v7&&x.v7.en22&&x.v7.en22.quest) quests=Object.keys(x.v7.en22.quest).length;
    var sess=0; if(x&&x.v7&&x.v7.en27&&x.v7.en27.sessions) sess=x.v7.en27.sessions.length;
    var wins=0;
    ['en18','en19'].forEach(function(k){
      var b=x&&x.v7&&x.v7[k]&&x.v7[k].bosses;
      if(b) for(var id in b){ var r=b[id]||{}; if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) wins++; }
    });
    return {xp:(x&&x.xp)||0, gems:((x&&x.v7&&x.v7.gems)||0), cards:((x&&x.cards)||[]).length, enWords:enBox, pets:pets, quests:quests, sessions:sess, bossWins:wins};
  }catch(e){ return {xp:0,gems:0,cards:0,enWords:0,pets:0,quests:0,sessions:0,bossWins:0}; }
}
function buildMergeReport(localS, cloudS, mergedS, localTime, cloudTime){
  var L=summarizeSide(localS), C=summarizeSide(cloudS), M=summarizeSide(mergedS);
  var newerSide=((cloudTime||0)>=(localTime||0))?'cloud':'local';
  return {at:Date.now(), local:L, cloud:C, merged:M, newerSide:newerSide,
    lastWriteWins:['Đội thú cưng (en23.team)','Ấp trứng (en23.hatch)','Kế hoạch hôm nay (en27.plan)','Ngôn ngữ giao diện Học thông minh (en27.uiLang)'],
    lastWriteWinsSide:newerSide};
}
var _rcOrig=null;
function wrapResolveConflict(){
  try{
    var s=window.__v20sync;
    if(!s||typeof s.resolveConflict!=='function'||s.resolveConflict.__v31) return;
    _rcOrig=s.resolveConflict;
    var nw=function(choice){
      var c=null; try{ c=s.conflict&&s.conflict(); }catch(e){}
      var loc=c?c.local:null, cld=c?c.cloud:null, lt=c?c.localTime:0, ct=c?c.cloudTime:0;
      return _rcOrig.call(s, choice).then(function(r){
        try{
          if(r&&r.ok&&r.action==='merged'&&loc&&cld){
            var merged=null; try{ merged=JSON.parse(lsGet('hanvocab.v1')||'null'); }catch(e){}
            if(merged){
              _lastMergeReport=buildMergeReport(loc, cld, merged, lt, ct);
              recordBackupEvent('merge', saveBytes(), hashOf(lsGet('hanvocab.v1')||''), '', true,
                'Hợp nhất: '+_lastMergeReport.merged.enWords+' từ EN · '+_lastMergeReport.merged.pets+' thú cưng · '+_lastMergeReport.merged.quests+' nhiệm vụ · '+_lastMergeReport.merged.sessions+' phiên Học thông minh');
            }
            verifyCloudBackup('resolve:merged');
          } else if(r&&r.ok&&r.action==='kept-local'){
            verifyCloudBackup('resolve:kept-local');
          }
        }catch(e){}
        return r;
      });
    };
    nw.__v31=true; s.resolveConflict=nw;
  }catch(e){}
}

/* ---------- export history (D.7) ---------- */
function wrapBackupExport(){
  try{
    var v=window.__v15;
    if(!v||typeof v.backupExport!=='function'||v.backupExport.__v31) return;
    var _be=v.backupExport;
    var nw=function(){
      var r=_be.apply(this,arguments);
      try{
        var raw=lsGet('hanvocab.v1')||'';
        recordBackupEvent('local-export', raw.length, hashOf(raw), '', true, 'Xuất file sao lưu (.json)');
      }catch(e){}
      return r;
    };
    nw.__v31=true; v.backupExport=nw;
  }catch(e){}
}

/* ---------- cloud status snapshot (read-only) ---------- */
function cloudInfo(){
  var info={configured:false, user:null, cloud:'off', lastError:'', pending:false, lastSavedAt:0, lastSyncAt:0};
  try{
    var s=window.__v20sync;
    if(!s) return info;
    if(s.configured) info.configured=!!s.configured();
    if(s.status){ var st=s.status(); info.cloud=st.cloud||'off'; info.user=st.user||null; info.lastError=st.lastError||''; }
    if(s.meta){ var m=s.meta(); info.lastSavedAt=m.lastSavedAt||0; info.lastSyncAt=m.lastSyncAt||0; }
    if(s._test&&s._test.engine) info.pending=!!s._test.engine.pending;
  }catch(e){}
  return info;
}
function cloudStateText(ci){
  if(!ci.configured) return 'Chưa cấu hình Firebase';
  if(!ci.user) return 'Chưa đăng nhập — đang chơi với tư cách khách, tiến trình chỉ lưu trên thiết bị này';
  var map={ready:'Sẵn sàng',syncing:'Đang đồng bộ…',synced:'Đã đồng bộ',offline:'Mất mạng — lưu cục bộ',conflict:'Có xung đột dữ liệu — cần bạn chọn',error:'Lỗi đồng bộ',guest:'Chưa đăng nhập',off:'Chưa cấu hình'};
  return map[ci.cloud]||ci.cloud;
}

/* ---------- V31 section HTML (shared by panel + Account Center) ---------- */
function sectionHTML(compact){
  try{
    var ci=cloudInfo();
    var vc=lastVerifiedCloud();
    var hist=readHistory();
    var snaps=listSystemSnapshots();
    var undoKey=newestPreRestoreKey();
    var undoAt=0;
    if(undoKey){ var m=undoKey.match(/(\d+)$/); if(m) undoAt=parseInt(m[1],10)||0; }
    var bytes=saveBytes();
    var kb=(bytes/1024).toFixed(1);
    var overCap=bytes>900*1024;
    var h='<div class="v31section" id="'+(compact?'v31acct':'v31panel')+'">'
      +'<h3 class="v31h">Sao lưu &amp; khôi phục — V16.3</h3>'
      /* Cloud Backup Status + Last Backup (three labelled rows, C3) */
      +'<div class="v31card"><b>Trạng thái sao lưu đám mây</b>'
      +'<p class="v31line">'+esc(cloudStateText(ci))+(ci.user?' — '+(esc(ci.user.email||ci.user.displayName||ci.user.uid)||''):'')+'</p>'
      +(ci.lastError?'<p class="v31line v31err">Lỗi: '+esc(ci.lastError)+'</p>':'')
      +(ci.pending?'<p class="v31line">Đang chờ mạng — sẽ tự đồng bộ khi có mạng.</p>':'')
      +'<p class="v31line">Lần lưu gần nhất trên thiết bị (đã xác minh ghi): <b>'+esc(fmtTime(ci.lastSavedAt))+'</b></p>'
      +'<p class="v31line">Lần đồng bộ gần nhất: <b>'+esc(fmtTime(ci.lastSyncAt))+'</b></p>'
      +'<p class="v31line">Lần sao lưu đám mây đã xác minh: <b class="v31lastverified">'+esc(vc?fmtTime(vc.at):'chưa có')+'</b></p>'
      +'<p class="v31line">Kích thước bản lưu: <b>'+esc(kb)+' KB ('+bytes+' byte)</b>'+(overCap?' — <span class="v31err">vượt giới hạn đám mây 900 KB, sao lưu đám mây sẽ bị từ chối (save-too-large)</span>':' — giới hạn đám mây 900 KB')+'</p>'
      +'<p class="v31line v31verify">'+esc(_verifyState==='idle'?'Chưa xác minh lần sao lưu đám mây nào trong phiên này.':_verifyMsg)+'</p>'
      +'<div class="v31acts">'
      +'<button type="button" class="btn pri v31btn" onclick="window.__v31&&__v31.syncAndVerify()"'+((!ci.configured||!ci.user)?' disabled':'')+'>Đồng bộ ngay</button>'
      +'<button type="button" class="btn v31btn" onclick="window.__v15&&__v15.backupExport()">Xuất file sao lưu (.json)</button>'
      +'</div>'
      +((!ci.configured)?'<p class="v31line">Đồng bộ đám mây: Chưa cấu hình Firebase — xem FIREBASE_SETUP.md.</p>':(!ci.user?'<p class="v31line">Đăng nhập để bật đồng bộ đám mây.</p>':'')) 
      +'<p class="v31line v31note">Sao lưu từ file khôi phục không mang theo trạng thái đồng bộ (lần đồng bộ gần nhất); trạng thái này được thiết lập lại ở lần đồng bộ sau.</p>'
      +'</div>'
      /* Backup History (D.3) */
      +'<div class="v31card"><b>Lịch sử sao lưu</b>';
    if(!hist.length){
      h+='<p class="v31line">Chưa có lịch sử sao lưu.</p>';
    } else {
      h+='<ul class="v31hist">';
      hist.forEach(function(e){
        h+='<li><span class="v31histmain"><b>'+esc(fmtTime(e.at))+'</b> · '+esc(KIND_LABEL[e.kind]||e.kind)+' · '+(e.bytes?((e.bytes/1024).toFixed(1)+' KB'):'—')+(e.hash?' · #'+esc(e.hash):'')+(e.ok?'':' · <span class="v31err">chưa xác minh/thất bại</span>')+(e.note?' — '+esc(e.note):'')+'</span>'
          +'<span class="v31histbtns">'
          +(e.key?'<button type="button" class="btn v31btn sm" onclick="window.__v31&&__v31.restoreHistoryEntry(\''+esc(e.key)+'\')">Khôi phục</button>':'')
          +'<button type="button" class="btn v31btn sm" onclick="window.__v31&&__v31.deleteHistoryEntry('+e.at+')">Xóa</button>'
          +'</span></li>';
      });
      h+='</ul>';
    }
    h+='</div>'
      /* System snapshots (C7/C8) + undo */
      +'<div class="v31card"><b>Bản sao lưu hệ thống đã giữ lại</b>';
    if(!snaps.length){
      h+='<p class="v31line">Chưa có bản sao lưu hệ thống nào được giữ lại.</p>';
    } else {
      h+='<ul class="v31hist">';
      snaps.forEach(function(sn){
        h+='<li><span class="v31histmain"><b>'+esc(sn.at?fmtTime(sn.at):'trước khi chuyển đổi V12')+'</b> · '+esc(sn.label)+(sn.valid===true?' · hợp lệ':(sn.valid===false?' · <span class="v31err">file không hợp lệ</span>':''))+'</span>'
          +'<span class="v31histbtns">'
          +(sn.key==='hanvocab.v11-backup'?'<span class="v31line">Dùng nút “Khôi phục bản trước khi chuyển đổi” trong mục Chuyển đổi dữ liệu.</span>'
            :(sn.valid===true?'<button type="button" class="btn v31btn sm" onclick="window.__v31&&__v31.restoreHistoryEntry(\''+esc(sn.key)+'\')">Khôi phục</button>'
            :(sn.valid===false?'<button type="button" class="btn v31btn sm" disabled>Không khôi phục được</button>':'')))
          +(sn.key!=='hanvocab.v11-backup'?'<button type="button" class="btn v31btn sm" onclick="window.__v31&&__v31.deleteSnapshot(\''+esc(sn.key)+'\')">Xóa</button>':'')
          +'</span></li>';
      });
      h+='</ul>';
    }
    h+='<p class="v31line">Mỗi lần khôi phục đều giữ lại một ảnh chụp của dữ liệu hiện tại trước khi ghi đè.</p>'
      +(undoKey?'<div class="v31acts"><button type="button" class="btn v31btn" onclick="window.__v31&&__v31.undoRestore()">Hoàn tác lần khôi phục này'+(undoAt?' ('+esc(fmtTime(undoAt))+')':'')+'</button></div>':'')
      +'</div>'
      /* Restore from file: one picker per screen already exists; point to it */
      +'<div class="v31card"><b>Khôi phục từ file</b>'
      +'<p class="v31line">Chọn file sao lưu .json đã xuất trước đây. File được kiểm tra cấu trúc trước khi ghi, bản hiện tại được giữ lại trước, và bạn xác nhận trước khi thay thế.</p>'
      +'<p class="v31line">Dùng ô “Khôi phục từ file” '+(compact?'ở phía trên trong tab này':'ngay bên dưới')+' — cùng một đường khôi phục đã kiểm tra (V20 importFile).</p>'
      +'</div>';
    if(_lastMergeReport){
      var R=_lastMergeReport;
      h+='<div class="v31card"><b>Báo cáo hợp nhất gần nhất ('+esc(fmtTime(R.at))+')</b>'
        +'<p class="v31line">Từ tiếng Anh (SRS): '+R.merged.enWords+' từ sau hợp nhất (thiết bị: '+R.local.enWords+', đám mây: '+R.cloud.enWords+').</p>'
        +'<p class="v31line">Thú cưng: '+R.merged.pets+' (thiết bị: '+R.local.pets+', đám mây: '+R.cloud.pets+'). Nhiệm vụ: '+R.merged.quests+' (thiết bị: '+R.local.quests+', đám mây: '+R.cloud.quests+'). Phiên Học thông minh: '+R.merged.sessions+' (thiết bị: '+R.local.sessions+', đám mây: '+R.cloud.sessions+'). Boss đã thắng: '+R.merged.bossWins+'.</p>'
        +'<p class="v31line">XP/kim cương lấy mức cao nhất, không cộng dồn. Các mục sau lấy theo bản mới hơn ('+(R.lastWriteWinsSide==='cloud'?'đám mây':'thiết bị')+'): '+esc(R.lastWriteWins.join('; '))+'. Không có dữ liệu nào bị xóa lặng lẽ ngoài các mục đã nêu.</p>'
        +'</div>';
    }
    h+='</div>';
    return h;
  }catch(e){ return ''; }
}
function refreshVerifyText(){
  try{
    var vc=lastVerifiedCloud();
    var nodes=document.querySelectorAll('.v31verify');
    for(var i=0;i<nodes.length;i++) nodes[i].textContent=(_verifyState==='idle'?'Chưa xác minh lần sao lưu đám mây nào trong phiên này.':_verifyMsg);
    var lv=document.querySelectorAll('.v31lastverified');
    for(var j=0;j<lv.length;j++) lv[j].textContent=vc?fmtTime(vc.at):'chưa có';
  }catch(e){}
}

/* ---------- D.2 entry points ---------- */
var panelWrapped=false;
function wrapDataPanel(){
  try{
    var v=window.__v20;
    if(!v||typeof v.dataPanelHTML!=='function') return false;
    if(v.dataPanelHTML.__v31) { panelWrapped=true; return true; }
    var orig=v.dataPanelHTML;
    var nw=function(){
      var h=''; try{ h=orig.apply(this,arguments)||''; }catch(e){ h=''; }
      try{
        var sec=sectionHTML(false);
        if(h&&sec){
          var idx=h.lastIndexOf('</div>');
          if(idx>=0) h=h.slice(0,idx)+sec+'</div>';
          else h+=sec;
        }
      }catch(e){}
      return h;
    };
    nw.__v31=true;
    v.dataPanelHTML=nw;
    panelWrapped=true;
    return true;
  }catch(e){ return false; }
}

/* Account Center backup tab — MutationObserver decorator (V27 pattern).
   accountContentHTML is closure-local in v21.js and not exported, so no
   runtime wrap is possible; the tab re-renders on every switch, so a
   one-time injection would be wiped. */
var _acctObs=null, _acctBodyObs=null, _acctArmed=false;
function decorateAcct(){
  try{
    if(!document.getElementById('v21importfile')) return; /* backup tab not showing */
    if(document.getElementById('v31acct')) return;
    var msg=document.getElementById('v21bakmsg');
    if(!msg||!msg.parentNode) return;
    var div=document.createElement('div');
    div.innerHTML=sectionHTML(true);
    var node=div.firstChild;
    if(node) msg.parentNode.insertBefore(node, msg.nextSibling);
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
    if(typeof v.openAccount==='function'&&!v.openAccount.__v31){
      var _o=v.openAccount;
      var nw=function(){ var r=_o.apply(this,arguments); armAcctDecorator(); return r; };
      nw.__v31=true; v.openAccount=nw;
    }
    if(typeof v.closeAccount==='function'&&!v.closeAccount.__v31){
      var _c=v.closeAccount;
      var nc=function(){ var r=_c.apply(this,arguments); disarmAcctDecorator(); return r; };
      nc.__v31=true; v.closeAccount=nc;
    }
  }catch(e){}
}

/* ---------- status probe ---------- */
function status(){
  var ci=cloudInfo();
  var vc=lastVerifiedCloud();
  return {version:VERSION, panelWrapped:panelWrapped, acctDecoratorArmed:_acctArmed,
    historyCount:readHistory().length, lastLocalAt:ci.lastSavedAt, lastSyncAt:ci.lastSyncAt,
    lastVerifiedCloudAt:vc?vc.at:0, cloudConfigured:ci.configured, cloudState:ci.cloud,
    cloudUser:!!ci.user, pendingOffline:ci.pending, verifyState:_verifyState, verifyMsg:_verifyMsg,
    mergeReport:_lastMergeReport, reloadCalled:_reloadCalled};
}

/* ---------- init (all wraps idempotent; safe to call twice) ---------- */
function init31(){
  wrapRecordAnswer();
  wrapDataPanel();
  wrapAccount();
  wrapBackupExport();
  wrapSyncNow();
  wrapResolveConflict();
}
try{ init31(); }catch(e){}
if(document.readyState==='loading'){ try{ document.addEventListener('DOMContentLoaded', function(){ try{ init31(); }catch(e){} }); }catch(e){} }

window.__v31={
  version:VERSION,
  status:status,
  syncAndVerify:syncAndVerify,
  verifyCloudBackup:verifyCloudBackup,
  restoreHistoryEntry:restoreHistoryEntry,
  restoreFromFile:restoreFromFile,
  undoRestore:undoRestore,
  deleteHistoryEntry:deleteHistoryEntry,
  deleteSnapshot:deleteSnapshot,
  sectionHTML:sectionHTML,
  recordBackupEvent:recordBackupEvent,
  _test:{
    status:status, readHistory:readHistory, listSystemSnapshots:listSystemSnapshots,
    restoreRaw:restoreRaw, restoreHistoryEntry:restoreHistoryEntry, undoRestore:undoRestore,
    snapshotCurrent:snapshotCurrent, newestPreRestoreKey:newestPreRestoreKey,
    verifyCloudBackup:verifyCloudBackup, buildMergeReport:buildMergeReport,
    summarizeSide:summarizeSide, fmtTime:fmtTime, hashOf:hashOf,
    lastMergeReport:function(){ return _lastMergeReport; },
    setLastMergeReport:function(r){ _lastMergeReport=r; },
    verifyState:function(){ return _verifyState; },
    reloadCalled:function(){ return _reloadCalled; },
    resetReload:function(){ _reloadCalled=false; },
    init:init31, wrapDataPanel:wrapDataPanel, armAcctDecorator:armAcctDecorator
  }
};
})();
