/* ===== V20 — CLOUD SYNC ENGINE (V12, additive layer) =====
   Local-first save sync. The game ALWAYS works offline (localStorage);
   the cloud is an optional second copy, only when the player signs in
   AND a Firebase project is configured (see firebase-config.js).

   HONEST LIMITS (read before claiming sync "works"):
   - The Firebase adapter below is complete code, but it has NOT been
     tested against a live Firebase project from this environment (no
     project, no real sign-in popup here). The engine logic (compare /
     conflict / merge / offline queue) IS tested with a mock adapter in
     the jsdom suite. Anh must follow FIREBASE_SETUP.md and run the live
     checklist on GitHub Pages before telling players sync works.
   - Firestore documents cap at 1 MB: saves larger than 900 KB are
     refused for cloud upload (local save keeps working). The built-in
     A1-A2/Oxford library is code, not save data, so it is never uploaded.
   - The cloud never silently overwrites anything: if local and cloud
     both changed since the last sync, the player CHOOSES (local / cloud
     / safe merge), after both sides are snapshotted. Auto-sync only ever
     UPLOADS; it never downloads or reloads on its own.
   - Merge never sums XP/gems/items: currencies take the MAX, boss
     progress unions (win on either side counts, stars take max), cards
     union by id. See mergeSaves().
   - Client-side saves can be edited by their owner; Firestore Rules stop
     cross-account access, not self-editing. Competitive features would
     need server-side (Cloud Functions) verification — out of scope for a
     static GitHub Pages game, noted in FIREBASE_SETUP.md.
*/
(function(){
'use strict';
var SAVE_KEY='hanvocab.v1';
var META_KEY='hanvocab.v12.meta';
/* V13: the sync meta follows the active identity (set by the V21 account
   layer in localStorage['hanvocab.v13.session']). Guests keep the V12
   key; each signed-in account gets its own meta key, so switching
   accounts on one browser never mixes sync state. */
var SESSION_KEY='hanvocab.v13.session';
function metaKey(){
  try{ var s=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
    if(s&&s.mode==='account'&&s.uid) return META_KEY+'.'+s.uid;
  }catch(e){}
  return META_KEY;
}
var MAX_CLOUD_BYTES=900*1024;   /* Firestore doc limit is 1 MB */
var MAX_IMPORT_BYTES=10*1024*1024;
var SAVE_VERSION=12;

/* ---------- small helpers (shared with v20.js via __v20sync) ---------- */
function hash(str){
  /* FNV-1a, deterministic; good enough to detect "did the save change" */
  var h=0x811c9dc5; str=String(str==null?'':str);
  for(var i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=(h*0x01000193)>>>0; }
  return ('0000000'+h.toString(16)).slice(-8);
}
function meta(){
  try{ var m=JSON.parse(localStorage.getItem(metaKey())||'null'); if(m&&typeof m==='object')return m; }catch(e){}
  return {};
}
function saveMeta(m){
  try{ localStorage.setItem(metaKey(), JSON.stringify(m||{})); }catch(e){}
}
function safeParse(raw){
  try{ var j=JSON.parse(raw); return (j&&typeof j==='object')?j:null; }catch(e){ return null; }
}
function hasProgress(S){
  if(!S) return false;
  if((S.xp||0)>0) return true;
  if(((S.cards||[]).length)>20) return true; /* fresh V6 seed has 20 cards */
  if(S.v7&&((S.v7.gems||0)>0)) return true;
  var v7=S.v7||{};
  var en=[v7.en18, v7.en19];
  for(var i=0;i<en.length;i++){
    var b=en[i]&&en[i].bosses;
    if(b) for(var id in b){ var r=b[id]||{}; if((r.en&&r.en.win)||(r.ko&&r.ko.win)) return true; }
  }
  if(v7.en15&&v7.en15.bosses){ var b15=v7.en15.bosses; for(var k in b15){ if(b15[k]) return true; } }
  return false;
}
function validateSave(obj){
  /* structural validation for imported / downloaded saves. Returns
     {ok:boolean, errors:[...]}. Never executes anything from the file:
     JSON.parse only builds data, and we only read known fields. */
  var errs=[];
  if(!obj||typeof obj!=='object'||Array.isArray(obj)) return {ok:false, errors:['not-an-object']};
  if(!Array.isArray(obj.cards)){ errs.push('missing-cards'); }
  else{
    if(obj.cards.length>20000) errs.push('too-many-cards');
    for(var i=0;i<Math.min(obj.cards.length,20000);i++){
      var c=obj.cards[i];
      if(!c||typeof c!=='object'||typeof c.id!=='string'||!c.id||typeof c.h!=='string'||typeof c.m!=='string'){
        errs.push('bad-card@'+i); break;
      }
    }
  }
  if(obj.decks!==undefined&&!Array.isArray(obj.decks)) errs.push('bad-decks');
  if(obj.xp!==undefined&&typeof obj.xp!=='number') errs.push('bad-xp');
  if(obj.v7!==undefined&&(typeof obj.v7!=='object'||obj.v7===null||Array.isArray(obj.v7))) errs.push('bad-v7');
  /* prototype-pollution guard: refuse suspicious keys anywhere shallow */
  var bad=['__proto__','constructor','prototype'];
  function scan(o,depth){
    if(depth>4||!o||typeof o!=='object') return;
    for(var k in o){ if(bad.indexOf(k)>=0){ errs.push('bad-key:'+k); return; } scan(o[k],depth+1); }
  }
  scan(obj,0);
  return {ok:errs.length===0, errors:errs};
}
function snapshot(key, raw){
  try{ localStorage.setItem(key, raw); return true; }catch(e){ return false; }
}

/* ---------- merge (never sums currencies; unions progress) ---------- */
function unionById(a,b,newerFirst){
  /* arrays of {id,...}: union by id; on conflict the copy from the newer
     save wins. `newerFirst` is the array from the newer save. */
  var out=[], seen={};
  function push(arr){ for(var i=0;i<(arr||[]).length;i++){ var x=arr[i]; if(!x||!x.id||seen[x.id])continue; seen[x.id]=1; out.push(x); } }
  if(newerFirst){ push(newerFirst); push(newerFirst===a?b:a); }
  else { push(a); push(b); }
  return out;
}
function mergeBossMaps(a,b){
  /* {bossId:{en:{win,wins,stars},ko:{...}}}: win if either won, stars/wins max */
  var out={};
  function put(map){
    if(!map) return;
    for(var id in map){
      var src=map[id]; if(!src) continue;
      var dst=out[id]=out[id]||{};
      ['en','ko'].forEach(function(l){
        var r=src[l]; if(!r) return;
        var d=dst[l]=dst[l]||{win:0,wins:0,stars:0};
        d.win=(d.win||r.win)?1:0;
        d.wins=Math.max(d.wins||0,r.wins||0);
        d.stars=Math.max(d.stars||0,r.stars||0);
        if(r.best!==undefined) d.best=Math.max(d.best||0,r.best);
      });
    }
  }
  put(a); put(b);
  return out;
}
function mergeSaves(localS, cloudS, localTime, cloudTime){
  /* Returns a NEW save object (neither input is mutated). Currencies take
     the MAX (never summed). Farm state, settings and deck choice come from
     the newer save. Boss/library progress unions. */
  var newerIsCloud=(cloudTime||0)>(localTime||0);
  var newer=newerIsCloud?cloudS:localS, older=newerIsCloud?localS:cloudS;
  var out={};
  var keys={};
  [localS,cloudS].forEach(function(s){ if(s) for(var k in s) keys[k]=1; });
  for(var k in keys){
    if(k==='cards') out.cards=unionById(localS.cards, cloudS.cards, newer.cards);
    else if(k==='decks') out.decks=unionById(localS.decks, cloudS.decks, newer.decks);
    else if(k==='xp') out.xp=Math.max(localS.xp||0, cloudS.xp||0);
    else if(k==='v7'){
      var v7={};
      var vk={}; [localS.v7,cloudS.v7].forEach(function(v){ if(v) for(var kk in v) vk[kk]=1; });
      for(var kk in vk){
        if(kk==='gems') v7.gems=Math.max((localS.v7&&localS.v7.gems)||0,(cloudS.v7&&cloudS.v7.gems)||0);
        else if(kk==='en18'||kk==='en19'){
          var l=(localS.v7&&localS.v7[kk])||{}, c=(cloudS.v7&&cloudS.v7[kk])||{};
          var m={};
          for(var mk in l) m[mk]=l[mk];
          for(var mk2 in c){
            if(mk2==='bosses') m.bosses=mergeBossMaps(l.bosses, c.bosses);
            else if(mk2==='titles') m.titles=Array.from(new Set([].concat(l.titles||[],c.titles||[])));
            else if(mk2==='zoneClaimed'){
              var z={}; [l.zoneClaimed,c.zoneClaimed].forEach(function(zc){ if(zc) for(var z2 in zc){ z[z2]=Object.assign({}, z[z2]||{}, zc[z2]); } }); m.zoneClaimed=z;
            }
            else if(mk2==='koStats') m.koStats={right:Math.max((l.koStats||{}).right||0,(c.koStats||{}).right||0), wrong:Math.max((l.koStats||{}).wrong||0,(c.koStats||{}).wrong||0)};
            else if(mk2==='stones') m.stones=Math.max(l.stones||0, c.stones||0);
            else if(m[mk2]===undefined) m[mk2]=c[mk2];
          }
          if(!m.bosses) m.bosses=mergeBossMaps(l.bosses, c.bosses);
          v7[kk]=m;
        }
        else if(kk==='en15'){
          var l15=(localS.v7&&localS.v7.en15)||{}, c15=(cloudS.v7&&cloudS.v7.en15)||{};
          var m15={};
          for(var k15 in l15) m15[k15]=l15[k15];
          for(var k15b in c15){
            if(k15b==='old'&&l15.old&&c15.old){
              var o={};
              ['box','right','wrong','xpAt'].forEach(function(f){
                o[f]={};
                [l15.old[f],c15.old[f]].forEach(function(src){ if(src) for(var wid in src) o[f][wid]=Math.max(o[f][wid]||0, src[wid]||0); });
              });
              o.review=Array.from(new Set([].concat(l15.old.review||[],c15.old.review||[])));
              o.streak=Math.max(l15.old.streak||0, c15.old.streak||0);
              m15.old=o;
            } else if(m15[k15b]===undefined) m15[k15b]=c15[k15b];
          }
          v7.en15=m15;
        }
        else if(kk==='en16'){
          var l16=(localS.v7&&localS.v7.en16)||{}, c16=(cloudS.v7&&cloudS.v7.en16)||{};
          var m16={};
          for(var k16 in l16) m16[k16]=l16[k16];
          for(var k16b in c16){
            if(k16b==='decks') m16.decks=unionById(l16.decks, c16.decks, newer.v7.en16?newer.v7.en16.decks:null);
            else if(m16[k16b]===undefined) m16[k16b]=c16[k16b];
          }
          v7.en16=m16;
        }
        else if(kk==='en17'){
          var l17=(localS.v7&&localS.v7.en17)||{}, c17=(cloudS.v7&&cloudS.v7.en17)||{};
          var m17={};
          for(var k17 in l17) m17[k17]=l17[k17];
          for(var k17b in c17){
            if(k17b==='fav'||k17b==='mastered') m17[k17b]=Array.from(new Set([].concat(l17[k17b]||[],c17[k17b]||[])));
            else if(m17[k17b]===undefined) m17[k17b]=c17[k17b];
          }
          v7.en17=m17;
        }
        else if(kk==='meta') v7.meta=newer.v7.meta||older.v7.meta;
        else if(v7[kk]===undefined) v7[kk]=newer.v7[kk]!==undefined?newer.v7[kk]:older.v7[kk];
      }
      out.v7=v7;
    }
    else if(k==='opt'||k==='deck'||k==='rem'||k==='skin') out[k]=(newer[k]!==undefined?newer[k]:older[k]);
    else out[k]=(newer[k]!==undefined?newer[k]:older[k]);
  }
  return out;
}

/* ---------- Firebase adapter (lazy SDK, compat builds) ---------- */
var CFG=(window.__FIREBASE_CONFIG__||{});
function configured(){ return !!(CFG&&CFG.apiKey&&CFG.projectId); }
var FB={app:null, auth:null, db:null, loading:null, authHooked:false};
var SDK_URLS=[
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];
function loadScript(src){
  return new Promise(function(res,rej){
    var s=document.createElement('script');
    s.src=src; s.onload=function(){res()}; s.onerror=function(){rej(new Error('sdk-load-failed: '+src))};
    document.head.appendChild(s);
  });
}
function ensureFB(){
  if(!configured()) return Promise.reject(new Error('not-configured'));
  if(FB.app) return Promise.resolve(FB);
  if(!FB.loading){
    FB.loading=(async function(){
      for(var i=0;i<SDK_URLS.length;i++){ await loadScript(SDK_URLS[i]); }
      if(!window.firebase||!firebase.initializeApp) throw new Error('sdk-missing');
      FB.app=firebase.initializeApp(CFG);
      FB.auth=firebase.auth();
      FB.db=firebase.firestore();
      if(!FB.authHooked){
        FB.authHooked=true;
        FB.auth.onAuthStateChanged(function(u){ engine.onAuthUser(u?{uid:u.uid,email:u.email||'',displayName:u.displayName||'',emailVerified:!!u.emailVerified}:null); });
      }
      return FB;
    })();
  }
  return FB.loading;
}
function docRef(uid){ return FB.db.collection('players').doc(uid); }
var FirebaseAdapter={
  kind:'firebase',
  signInGoogle:function(){
    return ensureFB().then(function(){
      var p=new firebase.auth.GoogleAuthProvider();
      return FB.auth.signInWithPopup(p).then(function(cr){ return {uid:cr.user.uid,email:cr.user.email||'',displayName:cr.user.displayName||''}; });
    });
  },
  signInEmail:function(email,pw){
    return ensureFB().then(function(){
      return FB.auth.signInWithEmailAndPassword(email,pw).then(function(cr){ return {uid:cr.user.uid,email:cr.user.email||'',displayName:cr.user.displayName||''}; });
    });
  },
  signUpEmail:function(email,pw){
    return ensureFB().then(function(){
      return FB.auth.createUserWithEmailAndPassword(email,pw).then(function(cr){ return {uid:cr.user.uid,email:cr.user.email||'',displayName:cr.user.displayName||''}; });
    });
  },
  signOut:function(){ return ensureFB().then(function(){ return FB.auth.signOut(); }); },
  signInGoogleRedirect:function(){
    /* Popup fallback: if the browser blocks popups, sign in by redirect
       instead. After the redirect back, checkRedirectResult() picks up
       the signed-in user (the V21 layer calls it at boot). */
    return ensureFB().then(function(){
      var p=new firebase.auth.GoogleAuthProvider();
      return FB.auth.signInWithRedirect(p);
    });
  },
  checkRedirectResult:function(){
    return ensureFB().then(function(){
      return FB.auth.getRedirectResult().then(function(cr){
        if(cr&&cr.user) return {uid:cr.user.uid,email:cr.user.email||'',displayName:cr.user.displayName||''};
        return null;
      });
    }).catch(function(){ return null; });
  },
  sendPasswordReset:function(email){
    return ensureFB().then(function(){ return FB.auth.sendPasswordResetEmail(email); });
  },
  sendVerification:function(){
    return ensureFB().then(function(){
      var u=FB.auth.currentUser; if(!u) return Promise.reject(new Error('no-user'));
      return u.sendEmailVerification();
    });
  },
  updateDisplayName:function(name){
    return ensureFB().then(function(){
      var u=FB.auth.currentUser; if(!u) return Promise.reject(new Error('no-user'));
      return u.updateProfile({displayName:name}).then(function(){ if(engine.user) engine.user.displayName=name; });
    });
  },
  setPersistence:function(remember){
    return ensureFB().then(function(){
      return FB.auth.setPersistence(remember?firebase.auth.Auth.Persistence.LOCAL:firebase.auth.Auth.Persistence.SESSION);
    });
  },
  emailVerified:function(){
    try{ var u=FB.auth&&FB.auth.currentUser; return !!(u&&u.emailVerified); }catch(e){ return false; }
  },
  load:function(uid){
    return ensureFB().then(function(){
      return docRef(uid).get().then(function(snap){
        if(!snap.exists) return null;
        var d=snap.data()||{};
        return {saveVersion:d.saveVersion||0, updatedAt:d.updatedAt||0, data:d.data||null};
      });
    });
  },
  save:function(uid,payload){
    return ensureFB().then(function(){
      return docRef(uid).set(payload).then(function(){ return {updatedAt:payload.updatedAt}; });
    });
  }
};

/* ---------- sync engine ---------- */
var engine={
  user:null, adapter:FirebaseAdapter, testAdapter:null,
  cloud:'off', /* off | guest | ready | syncing | synced | offline | conflict | cloud-newer | error */
  cloudMsg:'', conflict:null, syncing:false, pending:false, lastError:''
};
function setCloud(st,msg){
  engine.cloud=st; engine.cloudMsg=msg||'';
  notify();
}
var listeners=[];
function notify(){
  listeners.forEach(function(cb){ try{cb(engine);}catch(e){} });
}
function getAdapter(){ return engine.testAdapter||engine.adapter; }
function readLocal(){
  var raw=''; try{ raw=localStorage.getItem(SAVE_KEY)||''; }catch(e){}
  return {raw:raw, obj:safeParse(raw), hash:hash(raw)};
}
function writeLocalRaw(raw){
  try{ localStorage.setItem(SAVE_KEY, raw); return true; }catch(e){ return false; }
}
function sizeCheck(raw){
  if((raw||'').length>MAX_CLOUD_BYTES) return {ok:false, reason:'save-too-large'};
  return {ok:true};
}
function applyCloudData(data){
  /* writes the cloud save locally; caller reloads the page afterwards */
  var v=validateSave(data);
  if(!v.ok) return {ok:false, errors:v.errors};
  var raw=JSON.stringify(data);
  var cur=readLocal();
  snapshot('hanvocab.v12.pre-download-'+Date.now(), cur.raw);
  if(!writeLocalRaw(raw)) return {ok:false, errors:['write-failed']};
  var m=meta(); m.lastSyncAt=Date.now(); m.lastSyncHash=hash(raw); m.lastSyncAtCloud=engine._cloudUpdatedAt||0; saveMeta(m);
  return {ok:true};
}
engine.onAuthUser=function(u){
  var prevUid=engine.user&&engine.user.uid;
  engine.user=u||null;
  if(!u){ setCloud(configured()?'guest':'off'); return; }
  if(u.uid!==prevUid){ setCloud('ready'); } /* new/different account: ask before syncing */
  notify();
};
engine.syncNow=function(opts){
  opts=opts||{};
  var auto=!!opts.auto;
  if(!configured()){ setCloud('off'); return Promise.resolve({ok:false, reason:'not-configured'}); }
  if(!engine.user){ setCloud('guest'); return Promise.resolve({ok:false, reason:'guest'}); }
  if(typeof navigator!=='undefined'&&navigator.onLine===false){ setCloud('offline'); engine.pending=true; return Promise.resolve({ok:false, reason:'offline'}); }
  if(engine.syncing) return Promise.resolve({ok:false, reason:'busy'});
  engine.syncing=true; setCloud('syncing');
  var adapter=getAdapter();
  var uid=engine.user.uid;
  var m0=meta();
  /* Account switch guard: if this device last synced a DIFFERENT account,
     never upload the local save into the new account on its own. The
     player must explicitly confirm (panel passes force:true after a
     confirm dialog). Local data is never mixed into another account. */
  if(m0.lastSyncUid&&m0.lastSyncUid!==uid&&!opts.force){
    engine.syncing=false; setCloud('ready');
    return Promise.resolve({ok:false, reason:'account-changed'});
  }
  return adapter.load(uid).then(function(cloud){
    var loc=readLocal();
    var m=meta();
    if(!cloud||!cloud.data){
      var chk=sizeCheck(loc.raw);
      if(!chk.ok){ engine.syncing=false; setCloud('error','save-too-large'); return {ok:false, reason:'save-too-large'}; }
      var now=Date.now();
      return adapter.save(uid,{saveVersion:SAVE_VERSION,updatedAt:now,data:loc.obj}).then(function(){
        m.lastSyncAt=now; m.lastSyncHash=loc.hash; m.lastSyncUid=uid; m.lastSyncAtCloud=now; saveMeta(m);
        engine.syncing=false; setCloud('synced'); return {ok:true, action:'uploaded'};
      });
    }
    engine._cloudUpdatedAt=cloud.updatedAt||0;
    var cloudHash=hash(JSON.stringify(cloud.data));
    if(cloudHash===loc.hash){
      m.lastSyncAt=Date.now(); m.lastSyncHash=loc.hash; m.lastSyncUid=uid; m.lastSyncAtCloud=cloud.updatedAt||0; saveMeta(m);
      engine.syncing=false; setCloud('synced'); return {ok:true, action:'already-synced'};
    }
    var localHas=hasProgress(loc.obj), cloudHas=hasProgress(cloud.data);
    var localChanged=(m.lastSyncHash!==undefined&&m.lastSyncHash!==null)?(loc.hash!==m.lastSyncHash):localHas;
    var cloudChanged=(m.lastSyncAtCloud===undefined||m.lastSyncAtCloud===null)?cloudHas:(cloud.updatedAt!==m.lastSyncAtCloud);
    if(!localHas&&cloudHas){
      /* only the cloud has real progress: download (manual sync only) */
      if(auto){ engine.syncing=false; setCloud('cloud-newer'); return {ok:false, reason:'cloud-newer', action:'download-available'}; }
      var r=applyCloudData(cloud.data);
      engine.syncing=false;
      if(!r.ok){ setCloud('error','bad-cloud-data'); return {ok:false, reason:'bad-cloud-data', errors:r.errors}; }
      setCloud('synced'); return {ok:true, action:'downloaded', needsReload:true};
    }
    if(localHas&&!cloudHas){
      var chk2=sizeCheck(loc.raw);
      if(!chk2.ok){ engine.syncing=false; setCloud('error','save-too-large'); return {ok:false, reason:'save-too-large'}; }
      var now=Date.now();
      return adapter.save(uid,{saveVersion:SAVE_VERSION,updatedAt:now,data:loc.obj}).then(function(){
        m.lastSyncAt=now; m.lastSyncHash=loc.hash; m.lastSyncUid=uid; m.lastSyncAtCloud=now; saveMeta(m);
        engine.syncing=false; setCloud('synced'); return {ok:true, action:'uploaded'};
      });
    }
    if(!localChanged&&cloudChanged){
      if(auto){ engine.syncing=false; setCloud('cloud-newer'); return {ok:false, reason:'cloud-newer', action:'download-available'}; }
      var r2=applyCloudData(cloud.data);
      engine.syncing=false;
      if(!r2.ok){ setCloud('error','bad-cloud-data'); return {ok:false, reason:'bad-cloud-data', errors:r2.errors}; }
      setCloud('synced'); return {ok:true, action:'downloaded', needsReload:true};
    }
    if(!localHas&&!cloudHas){
      /* neither side has real progress (two fresh saves): nothing to fight
         over — upload local to establish the cloud doc. */
      var chk4=sizeCheck(loc.raw);
      if(!chk4.ok){ engine.syncing=false; setCloud('error','save-too-large'); return {ok:false, reason:'save-too-large'}; }
      var now=Date.now();
      return adapter.save(uid,{saveVersion:SAVE_VERSION,updatedAt:now,data:loc.obj}).then(function(){
        m.lastSyncAt=now; m.lastSyncHash=loc.hash; m.lastSyncUid=uid; m.lastSyncAtCloud=now; saveMeta(m);
        engine.syncing=false; setCloud('synced'); return {ok:true, action:'uploaded'};
      });
    }
    if(localChanged&&!cloudChanged){
      var chk3=sizeCheck(loc.raw);
      if(!chk3.ok){ engine.syncing=false; setCloud('error','save-too-large'); return {ok:false, reason:'save-too-large'}; }
      var now=Date.now();
      return adapter.save(uid,{saveVersion:SAVE_VERSION,updatedAt:now,data:loc.obj}).then(function(){
        m.lastSyncAt=now; m.lastSyncHash=loc.hash; m.lastSyncUid=uid; m.lastSyncAtCloud=now; saveMeta(m);
        engine.syncing=false; setCloud('synced'); return {ok:true, action:'uploaded'};
      });
    }
    /* both sides changed since the last sync: NEVER auto-pick. */
    engine.conflict={local:loc.obj, cloud:cloud.data, localTime:m.lastSavedAt||0, cloudTime:cloud.updatedAt||0, localHash:loc.hash, cloudHash:cloudHash};
    snapshot('hanvocab.v12.conflict-local-'+Date.now(), loc.raw);
    snapshot('hanvocab.v12.conflict-cloud-'+Date.now(), JSON.stringify(cloud.data));
    engine.syncing=false; setCloud('conflict'); return {ok:false, reason:'conflict'};
  }).catch(function(err){
    engine.syncing=false;
    var msg=(err&&err.message)||String(err);
    if(/offline|network|Failed to fetch|sdk-load-failed/i.test(msg)){ setCloud('offline'); engine.pending=true; return {ok:false, reason:'offline'}; }
    engine.lastError=msg; setCloud('error',msg); return {ok:false, reason:'error', error:msg};
  });
};
engine.resolveConflict=function(choice){
  var c=engine.conflict;
  if(!c) return Promise.resolve({ok:false, reason:'no-conflict'});
  var uid=engine.user&&engine.user.uid;
  if(!uid) return Promise.resolve({ok:false, reason:'guest'});
  if(typeof navigator!=='undefined'&&navigator.onLine===false){ setCloud('offline'); return Promise.resolve({ok:false, reason:'offline'}); }
  var adapter=getAdapter();
  var m=meta();
  if(choice==='local'){
    var loc=readLocal();
    var chk=sizeCheck(loc.raw);
    if(!chk.ok){ setCloud('error','save-too-large'); return Promise.resolve({ok:false, reason:'save-too-large'}); }
    var now=Date.now();
      return adapter.save(uid,{saveVersion:SAVE_VERSION,updatedAt:now,data:loc.obj}).then(function(){
      m.lastSyncAt=now; m.lastSyncHash=loc.hash; m.lastSyncUid=uid; m.lastSyncAtCloud=now; saveMeta(m);
      engine.conflict=null; setCloud('synced'); return {ok:true, action:'kept-local'};
    });
  }
  if(choice==='cloud'){
    var r=applyCloudData(c.cloud);
    if(!r.ok){ setCloud('error','bad-cloud-data'); return Promise.resolve({ok:false, reason:'bad-cloud-data', errors:r.errors}); }
    engine.conflict=null; setCloud('synced'); return Promise.resolve({ok:true, action:'kept-cloud', needsReload:true});
  }
  if(choice==='merge'){
    var merged=mergeSaves(c.local, c.cloud, c.localTime, c.cloudTime);
    var v=validateSave(merged);
    if(!v.ok){ setCloud('error','bad-merge'); return Promise.resolve({ok:false, reason:'bad-merge', errors:v.errors}); }
    var raw=JSON.stringify(merged);
    var chk2=sizeCheck(raw);
    if(!chk2.ok){ setCloud('error','save-too-large'); return Promise.resolve({ok:false, reason:'save-too-large'}); }
    snapshot('hanvocab.v12.pre-merge-'+Date.now(), readLocal().raw);
    if(!writeLocalRaw(raw)){ setCloud('error','write-failed'); return Promise.resolve({ok:false, reason:'write-failed'}); }
    var now=Date.now();
      return adapter.save(uid,{saveVersion:SAVE_VERSION,updatedAt:now,data:merged}).then(function(){
      m.lastSyncAt=now; m.lastSyncHash=hash(raw); m.lastSyncUid=uid; m.lastSyncAtCloud=now; saveMeta(m);
      engine.conflict=null; setCloud('synced'); return {ok:true, action:'merged', needsReload:true};
    });
  }
  return Promise.resolve({ok:false, reason:'bad-choice'});
};
engine.noteLocalSaved=function(){
  /* called by the save manager after a successful local flush. Schedules
     an upload-only auto-sync (never a download/reload) when signed in. */
  if(!configured()||!engine.user) return;
  if(typeof navigator!=='undefined'&&navigator.onLine===false){ engine.pending=true; setCloud('offline'); return; }
  if(engine._autoT) clearTimeout(engine._autoT);
  engine._autoT=setTimeout(function(){ engine._autoT=null; if(engine.cloud!=='conflict') engine.syncNow({auto:true}); }, engine._autoDelay||5000);
};
function onOnline(){
  if(engine.pending&&engine.user&&configured()){
    engine.pending=false;
    engine.syncNow({auto:true});
  }
}
function onOffline(){ engine.pending=true; if(engine.user) setCloud('offline'); }
try{
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
}catch(e){}
if(!configured()) engine.cloud='off';
else engine.cloud='guest';

window.__v20sync={
  configured:configured, version:'13.0.0',
  status:function(){ return {cloud:engine.cloud, cloudMsg:engine.cloudMsg, user:engine.user, lastError:engine.lastError, conflict:engine.conflict?{localTime:engine.conflict.localTime, cloudTime:engine.conflict.cloudTime}:null}; },
  conflict:function(){ return engine.conflict; },
  onChange:function(cb){ if(typeof cb==='function') listeners.push(cb); },
  signInGoogle:function(){ return getAdapter().signInGoogle().then(function(u){ engine.onAuthUser(u); return u; }); },
  signInEmail:function(e,p){ return getAdapter().signInEmail(e,p).then(function(u){ engine.onAuthUser(u); return u; }); },
  signUpEmail:function(e,p){ return getAdapter().signUpEmail(e,p).then(function(u){ engine.onAuthUser(u); return u; }); },
  signOut:function(){
    var a=getAdapter();
    return (a.signOut?a.signOut():Promise.resolve()).then(function(){ engine.user=null; engine.conflict=null; setCloud(configured()?'guest':'off'); });
  },
  signInGoogleRedirect:function(){ return getAdapter().signInGoogleRedirect?getAdapter().signInGoogleRedirect():Promise.reject(new Error('unsupported')); },
  checkRedirectResult:function(){ return getAdapter().checkRedirectResult?getAdapter().checkRedirectResult():Promise.resolve(null); },
  completeRedirect:function(){
    /* After a redirect sign-in, pick up the signed-in user and publish it
       through the normal auth channel (engine.user + listeners). */
    return getAdapter().checkRedirectResult?getAdapter().checkRedirectResult().then(function(u){ if(u) engine.onAuthUser(u); return u; }):Promise.resolve(null);
  },
  sendPasswordReset:function(e){ return getAdapter().sendPasswordReset?getAdapter().sendPasswordReset(e):Promise.reject(new Error('unsupported')); },
  sendVerification:function(){ return getAdapter().sendVerification?getAdapter().sendVerification():Promise.reject(new Error('unsupported')); },
  updateDisplayName:function(n){ return getAdapter().updateDisplayName?getAdapter().updateDisplayName(n):Promise.reject(new Error('unsupported')); },
  setPersistence:function(r){ return getAdapter().setPersistence?getAdapter().setPersistence(r):Promise.resolve(); },
  emailVerified:function(){ return getAdapter().emailVerified?getAdapter().emailVerified():false; },
  currentUser:function(){ return engine.user; },
  syncNow:function(opts){ return engine.syncNow(opts); },
  resolveConflict:function(c){ return engine.resolveConflict(c); },
  noteLocalSaved:function(){ engine.noteLocalSaved(); },
  meta:meta, saveMeta:saveMeta, hash:hash, validateSave:validateSave,
  hasProgress:hasProgress, mergeSaves:mergeSaves, applyCloudData:applyCloudData,
  snapshot:snapshot, readLocal:readLocal,
  MAX_CLOUD_BYTES:MAX_CLOUD_BYTES, MAX_IMPORT_BYTES:MAX_IMPORT_BYTES, SAVE_VERSION:SAVE_VERSION,
  _test:{
    engine:engine, setAdapter:function(a){ engine.testAdapter=a; },
    setConfig:function(c){ CFG=c||{}; if(!configured()) engine.cloud='off'; else if(!engine.user) engine.cloud='guest'; notify(); },
    getConfig:function(){ return CFG; },
    setUser:function(u){ engine.onAuthUser(u); },
    setAutoDelay:function(ms){ engine._autoDelay=ms; },
    applyCloudData:applyCloudData, mergeSaves:mergeSaves, validateSave:validateSave, hasProgress:hasProgress
  }
};
})();
