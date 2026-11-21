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
    if(b) for(var id in b){ var r=b[id]||{}; if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) return true; }
  }
  if(v7.en15&&v7.en15.bosses){ var b15=v7.en15.bosses; for(var k in b15){ if(b15[k]) return true; } }
  if(v7.en27&&v7.en27.sessions&&v7.en27.sessions.length) return true;
  if(v7.en27&&v7.en27.days){ for(var d27 in v7.en27.days){ if(v7.en27.days[d27]) return true; } }
  if(v7.en23&&v7.en23.pets){ for(var p23 in v7.en23.pets){ if(v7.en23.pets[p23]) return true; } }
  if(v7.en22&&v7.en22.quest){ for(var q22 in v7.en22.quest){ if(v7.en22.quest[q22]) return true; } }
  if(v7.en33&&v7.en33.quests){ for(var q33 in v7.en33.quests){ if(v7.en33.quests[q33]) return true; } }
  if(v7.en33&&v7.en33.regionClaimed){ for(var rc33 in v7.en33.regionClaimed){ if(v7.en33.regionClaimed[rc33]) return true; } }
  if(v7.en35&&v7.en35.quests){ for(var q35 in v7.en35.quests){ if(v7.en35.quests[q35]) return true; } }
  if(v7.en35&&v7.en35.regionClaimed){ for(var rc35 in v7.en35.regionClaimed){ if(v7.en35.regionClaimed[rc35]) return true; } }
  if(v7.en48&&v7.en48.forge&&(v7.en48.forge.correct||0)>0) return true;
  if(v7.en48&&v7.en48.dojo&&(v7.en48.dojo.attempts||0)>0) return true;
  if(v7.en48&&v7.en48.dojoUnlocked) return true;
  if(v7.en48&&v7.en48.tree&&v7.en48.tree.claimed){ for(var tr48 in v7.en48.tree.claimed){ if(v7.en48.tree.claimed[tr48]) return true; } }
  if(v7.en48&&v7.en48.bounty&&v7.en48.bounty.claimed){ for(var bc48 in v7.en48.bounty.claimed){ if(v7.en48.bounty.claimed[bc48]) return true; } }
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
  if(obj.v7&&obj.v7.meta&&obj.v7.meta.saveVersion!==undefined&&obj.v7.meta.saveVersion!==SAVE_VERSION) errs.push('bad-version:'+obj.v7.meta.saveVersion);
  /* prototype-pollution guard: refuse suspicious keys anywhere shallow */
  var bad=['__proto__','constructor','prototype'];
  function scan(o,depth){
    if(depth>6||!o||typeof o!=='object') return;
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
      /* V31 (F-01): V18 boss records are FLAT {win,wins,at,item} (v18.js:496),
         not nested {en,ko} like V19 — merge them directly, or a two-device
         merge silently drops every English Challenge Arena win. */
      if(src.win||src.wins){
        dst.win=(dst.win||src.win)?1:0;
        dst.wins=Math.max(dst.wins||0,src.wins||0);
        if(src.stars!==undefined) dst.stars=Math.max(dst.stars||0,src.stars);
        if(src.at!==undefined) dst.at=Math.max(dst.at||0,src.at);
        if(src.item!==undefined&&dst.item===undefined) dst.item=src.item;
      }
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
  /* V31 (F-01): helpers for the per-subkey merge branches below.
     maxMap: per-key MAX (counters, boxes, timestamps). fillMissing:
     cloud keys fill only keys absent locally (local-first on
     conflict). unionTrue: a flag key is set if EITHER side has it
     (local-first on conflict — values are 1/true either way).
     unionArr: set union, order-preserving. */
  function maxMap(a,b){ var o={}; [a,b].forEach(function(src){ if(src) for(var k in src) o[k]=Math.max(o[k]||0, src[k]||0); }); return o; }
  function fillMissing(l,c){ var o={}; if(c) for(var k in c) o[k]=c[k]; if(l) for(var k2 in l) o[k2]=l[k2]; return o; }
  function unionTrue(a,b){ var o={}; if(b) for(var k in b) o[k]=b[k]; if(a) for(var k2 in a) o[k2]=a[k2]; return o; }
  function unionArr(a,b){ return Array.from(new Set([].concat(a||[],b||[]))); }
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
            if(k15b==='due'){ var d15={}; [l15.due,c15.due].forEach(function(src){ if(src) for(var wid in src) d15[wid]=(d15[wid]===undefined)?src[wid]:Math.min(d15[wid], src[wid]); }); m15.due=d15; }
            else if(k15b==='intv'){ m15.intv=maxMap(l15.intv, c15.intv); }
            else if(k15b==='hist'){ var h15={}; [l15.hist,c15.hist].forEach(function(src){ if(!src) return; for(var dn in src){ var a=h15[dn]=h15[dn]||{c:0,t:0,xp:0}; var b=src[dn]||{}; a.c=Math.max(a.c,b.c||0); a.t=Math.max(a.t,b.t||0); a.xp=Math.max(a.xp,b.xp||0); } }); m15.hist=h15; }
            else if(k15b==='daily'){ m15.daily=(newer.v7&&newer.v7.en15&&newer.v7.en15.daily!==undefined)?newer.v7.en15.daily:(older.v7&&older.v7.en15?older.v7.en15.daily:undefined); }
            else if(k15b==='bosses'){ m15.bosses=unionTrue(l15.bosses, c15.bosses); }
            else if(m15[k15b]===undefined) m15[k15b]=c15[k15b];
          }
          v7.en15=m15;
        }
        else if(kk==='en16'){
          var l16=(localS.v7&&localS.v7.en16)||{}, c16=(cloudS.v7&&cloudS.v7.en16)||{};
          var m16={};
          for(var k16 in l16) m16[k16]=l16[k16];
          for(var k16b in c16){
            if(k16b==='decks') m16.decks=unionById(l16.decks, c16.decks, newer.v7.en16?newer.v7.en16.decks:null);
            else if(k16b==='map'||k16b==='overrides') m16[k16b]=fillMissing(l16[k16b], c16[k16b]);
            else if(m16[k16b]===undefined) m16[k16b]=c16[k16b];
          }
          v7.en16=m16;
        }
        else if(kk==='en17'){
          var l17=(localS.v7&&localS.v7.en17)||{}, c17=(cloudS.v7&&cloudS.v7.en17)||{};
          var m17={};
          for(var k17 in l17) m17[k17]=l17[k17];
          for(var k17b in c17){
            if(k17b==='fav') m17[k17b]=Array.from(new Set([].concat(l17[k17b]||[],c17[k17b]||[])));
            else if(k17b==='claimed') m17.claimed=fillMissing(l17.claimed, c17.claimed);
            else if(m17[k17b]===undefined) m17[k17b]=c17[k17b];
          }
          v7.en17=m17;
        }
        else if(kk==='meta') v7.meta=newer.v7.meta||older.v7.meta;
        else if(kk==='en'){
          var lEn=(localS.v7&&localS.v7.en)||{}, cEn=(cloudS.v7&&cloudS.v7.en)||{};
          var mEn={};
          for(var kEn in lEn) mEn[kEn]=lEn[kEn];
          for(var kEn2 in cEn){
            if(kEn2==='box'||kEn2==='right'||kEn2==='wrong'||kEn2==='xpAt') mEn[kEn2]=maxMap(lEn[kEn2], cEn[kEn2]);
            else if(kEn2==='review') mEn.review=unionArr(lEn.review, cEn.review);
            else if(kEn2==='streak') mEn.streak=Math.max(lEn.streak||0, cEn.streak||0);
            else if(kEn2==='done') mEn.done=unionTrue(lEn.done, cEn.done);
            else if(kEn2==='custom') mEn.custom=unionById(lEn.custom, cEn.custom, (newer.v7&&newer.v7.en&&newer.v7.en.custom)||null);
            else if(kEn2==='stats'){
              var stEn={};
              ['ev','ve'].forEach(function(d){ var a=(lEn.stats&&lEn.stats[d])||{}, b=(cEn.stats&&cEn.stats[d])||{}; stEn[d]={r:Math.max(a.r||0,b.r||0), w:Math.max(a.w||0,b.w||0)}; });
              mEn.stats=stEn;
            }
            else if(kEn2==='dir'||kEn2==='ex'||kEn2==='topic'||kEn2==='lastDay') mEn[kEn2]=(newer.v7&&newer.v7.en&&newer.v7.en[kEn2]!==undefined)?newer.v7.en[kEn2]:((older.v7&&older.v7.en&&older.v7.en[kEn2]!==undefined)?older.v7.en[kEn2]:undefined);
            else if(mEn[kEn2]===undefined) mEn[kEn2]=cEn[kEn2];
          }
          v7.en=mEn;
        }
        else if(kk==='en22'){
          var l22=(localS.v7&&localS.v7.en22)||{}, c22=(cloudS.v7&&cloudS.v7.en22)||{};
          var m22={}; for(var k22 in l22) m22[k22]=l22[k22];
          var q22={};
          [l22.quest,c22.quest].forEach(function(src){ if(!src) return; for(var u in src){ var s=src[u]||{}; var d=q22[u]=q22[u]||{}; d.stars=Math.max(d.stars||0,s.stars||0); d.best=Math.max(d.best||0,s.best||0); d.attempts=Math.max(d.attempts||0,s.attempts||0); d.lastAt=Math.max(d.lastAt||0,s.lastAt||0); if(s.claimed1)d.claimed1=1; if(s.claimed3)d.claimed3=1; } });
          m22.quest=q22;
          v7.en22=m22;
        }
        else if(kk==='en23'){
          var l23=(localS.v7&&localS.v7.en23)||{}, c23=(cloudS.v7&&cloudS.v7.en23)||{};
          var m23={};
          var o23p=(older.v7&&older.v7.en23&&older.v7.en23.pets)||{}, n23p=(newer.v7&&newer.v7.en23&&newer.v7.en23.pets)||{};
          var pets23={}; for(var p23 in o23p) pets23[p23]=o23p[p23]; for(var p23b in n23p) pets23[p23b]=n23p[p23b];
          m23.pets=pets23;
          m23.eggs=maxMap(l23.eggs, c23.eggs);
          m23.hatch=(newer.v7&&newer.v7.en23&&newer.v7.en23.hatch!==undefined)?newer.v7.en23.hatch:(older.v7&&older.v7.en23?older.v7.en23.hatch:null);
          m23.mats=maxMap(l23.mats, c23.mats);
          m23.team=(newer.v7&&newer.v7.en23&&newer.v7.en23.team!==undefined)?newer.v7.en23.team:(older.v7&&older.v7.en23?older.v7.en23.team:[null,null,null]);
          m23.claimed=unionTrue(l23.claimed, c23.claimed);
          m23.affClaimed=unionTrue(l23.affClaimed, c23.affClaimed);
          m23.created=Math.min(l23.created||Infinity, c23.created||Infinity);
          if(!isFinite(m23.created)) m23.created=(l23.created||c23.created||Date.now());
          v7.en23=m23;
        }
        else if(kk==='en27'){
          var l27=(localS.v7&&localS.v7.en27)||{}, c27=(cloudS.v7&&cloudS.v7.en27)||{};
          var m27={v:Math.max(l27.v||1, c27.v||1)};
          m27.created=Math.min(l27.created||Infinity, c27.created||Infinity);
          if(!isFinite(m27.created)) m27.created=(l27.created||c27.created||Date.now());
          m27.en={last:maxMap(l27.en&&l27.en.last, c27.en&&c27.en.last), cw:maxMap(l27.en&&l27.en.cw, c27.en&&c27.en.cw), cr:maxMap(l27.en&&l27.en.cr, c27.en&&c27.en.cr)};
          m27.ko={right:maxMap(l27.ko&&l27.ko.right, c27.ko&&c27.ko.right), wrong:maxMap(l27.ko&&l27.ko.wrong, c27.ko&&c27.ko.wrong), cw:maxMap(l27.ko&&l27.ko.cw, c27.ko&&c27.ko.cw), cr:maxMap(l27.ko&&l27.ko.cr, c27.ko&&c27.ko.cr), last:maxMap(l27.ko&&l27.ko.last, c27.ko&&c27.ko.last)};
          var ses27={};
          (l27.sessions||[]).concat(c27.sessions||[]).forEach(function(s){ if(s&&s.t!=null) ses27[s.t]=s; });
          m27.sessions=Object.keys(ses27).map(function(k){ return ses27[k]; }).sort(function(a,b){ return b.t-a.t; }).slice(0,30);
          var dys27={};
          [l27.days,c27.days].forEach(function(src){ if(!src) return; for(var dn in src){ var a=dys27[dn]=dys27[dn]||{c:0,t:0,xp:0,mins:0}; var b=src[dn]||{}; a.c=Math.max(a.c,b.c||0); a.t=Math.max(a.t,b.t||0); a.xp=Math.max(a.xp,b.xp||0); a.mins=Math.max(a.mins,b.mins||0); } });
          var dk27=Object.keys(dys27).sort().slice(-90), dys27b={};
          dk27.forEach(function(k){ dys27b[k]=dys27[k]; });
          m27.days=dys27b;
          m27.streak={en:{d:'',n:0}, ko:{d:'',n:0}};
          ['en','ko'].forEach(function(lg){ var a=(l27.streak&&l27.streak[lg])||{}, b=(c27.streak&&c27.streak[lg])||{}, nw=(newer.v7&&newer.v7.en27&&newer.v7.en27.streak&&newer.v7.en27.streak[lg])||{}; m27.streak[lg]={d:nw.d||a.d||b.d||'', n:Math.max(a.n||0,b.n||0)}; });
          m27.claimed=unionTrue(l27.claimed, c27.claimed);
          var n27p=(newer.v7&&newer.v7.en27)||{}, o27p=(older.v7&&older.v7.en27)||{};
          /* V40 (C-07): the plan is per-language — merge en/ko
             independently instead of taking the newer save's plan for
             BOTH languages (the older side's plan + doneIds were
             dropped). Same-day plans union ids/doneIds and OR the
             goals (complete recomputed from coverage); otherwise
             newer-wins per language. claimed stays unioned above, so
             no double payment. */
          (function(){
            var np=n27p.plan||{}, op=o27p.plan||{};
            var mp={};
            ['en','ko'].forEach(function(lg){
              var a=np[lg]||{}, b=op[lg]||{};
              if(a.d&&b.d&&a.d===b.d){
                var ids=Array.from(new Set([].concat(a.ids||[],b.ids||[])));
                var done=Array.from(new Set([].concat(a.doneIds||[],b.doneIds||[])));
                var gA=a.goals||{}, gB=b.goals||{};
                var complete=ids.length>0&&ids.every(function(id){return done.indexOf(id)>=0});
                mp[lg]={d:a.d,mins:Math.max(a.mins||0,b.mins||0),newN:Math.max(a.newN||0,b.newN||0),dueN:Math.max(a.dueN||0,b.dueN||0),weakN:Math.max(a.weakN||0,b.weakN||0),ids:ids,doneIds:done,goals:{complete:complete,acc80:!!(gA.acc80||gB.acc80),weak5:!!(gA.weak5||gB.weak5)}};
              }else if(a.d){mp[lg]=a}
              else if(b.d){mp[lg]=b}
              else{mp[lg]={}}
            });
            m27.plan=mp;
          })();
          m27.uiLang=n27p.uiLang||o27p.uiLang||'en';
          v7.en27=m27;
        }
        else if(kk==='en33'){
          /* V33 (Chrono Kingdom): quests union (done/claimed/acc/at
             MAX), rift best MAX per floor + claimed union for the
             newer day only (claimed reset when the day changes),
             regionClaimed union (per-language MAX — NOT unionTrue:
             unionTrue is local-priority last-writer-wins, so a local
             {ko:0} would overwrite a cloud {ko:1}; regionClaimed
             carries explicit 0s, unlike the 1/absent claimed maps),
             created MIN. XP/gems are never
             summed (MAX at the top level, as everywhere else).
             Pending launches are session-local and dropped. */
          var l33=(localS.v7&&localS.v7.en33)||{}, c33=(cloudS.v7&&cloudS.v7.en33)||{};
          var m33={};
          m33.created=Math.min(l33.created||Infinity, c33.created||Infinity);
          if(!isFinite(m33.created)) m33.created=(l33.created||c33.created||Date.now());
          var q33={};
          [l33.quests,c33.quests].forEach(function(src){ if(!src) return; for(var qk in src){ var a=q33[qk]=q33[qk]||{}; var b=src[qk]||{}; a.done=Math.max(a.done||0,b.done||0); a.claimed=Math.max(a.claimed||0,b.claimed||0); a.acc=Math.max(a.acc||0,b.acc||0); a.at=Math.max(a.at||0,b.at||0); } });
          m33.quests=q33;
          var day33=(newer.v7&&newer.v7.en33&&newer.v7.en33.rift&&newer.v7.en33.rift.day)||(older.v7&&older.v7.en33&&older.v7.en33.rift&&older.v7.en33.rift.day)||'';
          var best33={};
          [l33.rift&&l33.rift.best,c33.rift&&c33.rift.best].forEach(function(src){ if(!src) return; for(var fk in src) best33[fk]=Math.max(best33[fk]||0,src[fk]||0); });
          var cl33={};
          [l33.rift,c33.rift].forEach(function(src){ if(!src||src.day!==day33) return; for(var ck in (src.claimed||{})) cl33[ck]=src.claimed[ck]; });
          m33.rift={day:day33,best:best33,claimed:cl33};
          var rcL=l33.regionClaimed||{}, rcC=c33.regionClaimed||{};
          m33.regionClaimed={en:Math.max(rcL.en||0,rcC.en||0),ko:Math.max(rcL.ko||0,rcC.ko||0)};
          m33.pending={};
          v7.en33=m33;
        }
        else if(kk==='en35'){
          /* V35 (Skyroot Sanctuary): quests union (done/claimed/acc/at
             MAX), regionClaimed union (per-language MAX — NOT unionTrue:
             unionTrue is local-priority last-writer-wins, so a local
             {ko:0} would overwrite a cloud {ko:1}; regionClaimed
             carries explicit 0s, unlike the 1/absent claimed maps),
             created MIN. XP/gems are never
             summed (MAX at the top level, as everywhere else).
             Pending launches are session-local and dropped. No rift
             sub-state exists in V35. */
          var l35=(localS.v7&&localS.v7.en35)||{}, c35=(cloudS.v7&&cloudS.v7.en35)||{};
          var m35={};
          m35.created=Math.min(l35.created||Infinity, c35.created||Infinity);
          if(!isFinite(m35.created)) m35.created=(l35.created||c35.created||Date.now());
          var q35={};
          [l35.quests,c35.quests].forEach(function(src){ if(!src) return; for(var qk in src){ var a=q35[qk]=q35[qk]||{}; var b=src[qk]||{}; a.done=Math.max(a.done||0,b.done||0); a.claimed=Math.max(a.claimed||0,b.claimed||0); a.acc=Math.max(a.acc||0,b.acc||0); a.at=Math.max(a.at||0,b.at||0); } });
          m35.quests=q35;
          var rcL35=l35.regionClaimed||{}, rcC35=c35.regionClaimed||{};
          m35.regionClaimed={en:Math.max(rcL35.en||0,rcC35.en||0),ko:Math.max(rcL35.ko||0,rcC35.ko||0)};
          m35.pending={};
          v7.en35=m35;
        }
        else if(kk==='en48'){
          /* V48 (V19.3 Sentence Forge): forge counters MAX (correct /
             bestStreak / sessions / per-day maps), bonusClaimed union
             (1/absent), dojo counters MAX + per-day attempts MAX,
             tree.claimed per-key MAX (timestamps), bounty.claimed
             union (period keys are unique per day/week), bounty
             streak from the NEWER save (a day-streak is a timeline,
             not a MAX), dojoUnlocked MAX, flags newer-wins (a kill
             switch turned OFF must stay off), created MIN. XP/gems
             are never summed (MAX at the top level, as everywhere
             else). Pending launches are session-local and dropped. */
          var l48=(localS.v7&&localS.v7.en48)||{}, c48=(cloudS.v7&&cloudS.v7.en48)||{};
          var m48={};
          m48.created=Math.min(l48.created||Infinity, c48.created||Infinity);
          if(!isFinite(m48.created)) m48.created=(l48.created||c48.created||Date.now());
          var lf48=l48.forge||{}, cf48=c48.forge||{};
          var m48f={correct:Math.max(lf48.correct||0,cf48.correct||0),streak:Math.max(lf48.streak||0,cf48.streak||0),bestStreak:Math.max(lf48.bestStreak||0,cf48.bestStreak||0),sessions:Math.max(lf48.sessions||0,cf48.sessions||0),lastDay:(newer.v7&&newer.v7.en48&&newer.v7.en48.forge&&newer.v7.en48.forge.lastDay)||(older.v7&&older.v7.en48&&older.v7.en48.forge&&older.v7.en48.forge.lastDay)||'',correctByDay:maxMap(lf48.correctByDay, cf48.correctByDay),dayBestStreak:maxMap(lf48.dayBestStreak, cf48.dayBestStreak),bonusClaimed:unionTrue(lf48.bonusClaimed, cf48.bonusClaimed)};
          m48.forge=m48f;
          var ld48=l48.dojo||{}, cd48=c48.dojo||{};
          m48.dojo={attempts:Math.max(ld48.attempts||0,cd48.attempts||0),good:Math.max(ld48.good||0,cd48.good||0),selfOk:Math.max(ld48.selfOk||0,cd48.selfOk||0),attemptsByDay:maxMap(ld48.attemptsByDay, cd48.attemptsByDay)};
          m48.tree={claimed:maxMap((l48.tree&&l48.tree.claimed)||{}, (c48.tree&&c48.tree.claimed)||{})};
          var n48b=(newer.v7&&newer.v7.en48&&newer.v7.en48.bounty)||{}, o48b=(older.v7&&older.v7.en48&&older.v7.en48.bounty)||{};
          m48.bounty={claimed:unionTrue((l48.bounty&&l48.bounty.claimed)||{}, (c48.bounty&&c48.bounty.claimed)||{}),streak:(n48b.streak&&n48b.streak.d)?{d:n48b.streak.d,n:n48b.streak.n||0}:{d:(o48b.streak&&o48b.streak.d)||'',n:(o48b.streak&&o48b.streak.n)||0}};
          m48.dojoUnlocked=Math.max(l48.dojoUnlocked||0, c48.dojoUnlocked||0);
          var nf48=(newer.v7&&newer.v7.en48&&newer.v7.en48.flags)||(older.v7&&older.v7.en48&&older.v7.en48.flags)||{forge:1,bounty:1,tree:1,dojo:1,boss:1};
          m48.flags={forge:(nf48.forge===0?0:1),bounty:(nf48.bounty===0?0:1),tree:(nf48.tree===0?0:1),dojo:(nf48.dojo===0?0:1),boss:(nf48.boss===0?0:1)};
          v7.en48=m48;
        }
        else if(kk==='ko16'){
          /* V40 (C-01): ko16 = {levels:{cardId:level}} (Smart Import,
             v16) had no merge branch and fell to newer-wins, dropping
             the older side's imported-word levels (and downgrading
             levels the newer save had not learned yet). Merge per-key
             MAX like the en branch; other ko16 keys fill-if-missing. */
          var l16k=(localS.v7&&localS.v7.ko16)||{}, c16k=(cloudS.v7&&cloudS.v7.ko16)||{};
          var m16k={};
          for(var k16k in l16k) m16k[k16k]=l16k[k16k];
          for(var k16k2 in c16k){
            if(k16k2==='levels') m16k.levels=maxMap(l16k.levels, c16k.levels);
            else if(m16k[k16k2]===undefined) m16k[k16k2]=c16k[k16k2];
          }
          v7.ko16=m16k;
        }
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
    engine.conflict={local:loc.obj, cloud:cloud.data, localTime:(m.lastSavedAt||(loc.obj.v7&&loc.obj.v7.meta&&loc.obj.v7.meta.migratedAt)||(loc.obj.v7&&loc.obj.v7.en15&&loc.obj.v7.en15.created)||0), cloudTime:cloud.updatedAt||0, localHash:loc.hash, cloudHash:cloudHash};
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
