#!/usr/bin/env python3
"""Build V16.3 (Backup & Restore Fix) from the pristine V16 build + the V31 layer.

V16.3 = V16 (Smart Learning, layer V27) + layer V31 (src/v31.css + src/v31.js)
+ guarded build-script replacements (PLAN_V31.md sections A/B/C/D).

WHAT THIS SCRIPT DOES (in order):
  1. Verifies the base is the pristine V16 build (hash + v27 markers
     present, v28/v29/v31 markers absent). REFUSES to run otherwise.
     NOTE: V28 never landed and V29 was never applied — the base is V16,
     NOT V16.1, so this script gates on the V16 hash (see PLAN_V31.md).
  2. Applies every IN-SCOPE replacement (14 staged + 10 new V31) to the
     standalone src/*.js files (exact-match asserts, fails the build
     if any anchor is missing/duplicated/already applied).
  3. Mirrors the patched src files into out/ (all copies must agree).
  4. Applies the same replacements to the inlined blocks in
     out/index.html (byte edits, exact-count asserts).
  5. Injects <style id="v31"> + <script id="v31js"> before </body>, LAST.
  6. Verifies: marker order (v31 last), v31 version 16.3.0, node --check
     on v31.js + every touched src file, KO tabs line unchanged
     (no v31kotab), out-of-scope replacements absent.

RUN EXACTLY ONCE on a fresh V16 out/. NEVER re-run build_v15*.py /
build_v16.py on a finished build (they reorder layers — see
tools/rebuild-proof-2026-11-18/REBUILD_PROOF_2026-11-18.md).

Usage:  python3 build_v31.py [--out DIR] [--src DIR]
Default out: out/ next to this script; default src: src/ next to it.
"""
import argparse
import hashlib
import os
import pathlib
import re as _re
import shutil
import subprocess
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE

# Pristine V16 out/index.html (1,993,653 B) — verified before any edit.
V16_HASH = "c59da3366e10e1a909dbc527c08832c9a39dd0cfaf8d810fbd840abff9303ebe"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V16 — Smart Learning — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V16.3 — Backup &amp; Restore Fix — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# Replacement table: (label, src file, anchor, replacement).
# Anchors are verbatim; each must occur EXACTLY ONCE in its src file AND
# exactly once in the inlined block of index.html.
# The 14 staged in-scope entries (PLAN_V31.md section A.2 rows 1-14) are
# filled in by the generator (copied byte-exact from build_v16auto.py,
# with the single change R-F-01a: '/* V29 (F-01):' -> '/* V31 (F-01):').
# The 10 new V31 entries (PLAN_V31.md sections B/C/D, plus R-V31-F01-en18 —
# a mergeBossMaps gap found during the build, see CHANGELOG) are listed below.
REPLACEMENTS = [
    ("R-F-01a", "v20_sync.js",
     "function mergeSaves(localS, cloudS, localTime, cloudTime){",
     "function mergeSaves(localS, cloudS, localTime, cloudTime){\n"
     "  /* V31 (F-01): helpers for the per-subkey merge branches below.\n"
     "     maxMap: per-key MAX (counters, boxes, timestamps). fillMissing:\n"
     "     cloud keys fill only keys absent locally (local-first on\n"
     "     conflict). unionTrue: a flag key is set if EITHER side has it\n"
     "     (local-first on conflict — values are 1/true either way).\n"
     "     unionArr: set union, order-preserving. */\n"
     "  function maxMap(a,b){ var o={}; [a,b].forEach(function(src){ if(src) for(var k in src) o[k]=Math.max(o[k]||0, src[k]||0); }); return o; }\n"
     "  function fillMissing(l,c){ var o={}; if(c) for(var k in c) o[k]=c[k]; if(l) for(var k2 in l) o[k2]=l[k2]; return o; }\n"
     "  function unionTrue(a,b){ var o={}; if(b) for(var k in b) o[k]=b[k]; if(a) for(var k2 in a) o[k2]=a[k2]; return o; }\n"
     "  function unionArr(a,b){ return Array.from(new Set([].concat(a||[],b||[]))); }"),
    ("R-F-01b", "v20_sync.js",
     "        else if(v7[kk]===undefined) v7[kk]=newer.v7[kk]!==undefined?newer.v7[kk]:older.v7[kk];",
     "        else if(kk==='en'){\n"
     "          var lEn=(localS.v7&&localS.v7.en)||{}, cEn=(cloudS.v7&&cloudS.v7.en)||{};\n"
     "          var mEn={};\n"
     "          for(var kEn in lEn) mEn[kEn]=lEn[kEn];\n"
     "          for(var kEn2 in cEn){\n"
     "            if(kEn2==='box'||kEn2==='right'||kEn2==='wrong'||kEn2==='xpAt') mEn[kEn2]=maxMap(lEn[kEn2], cEn[kEn2]);\n"
     "            else if(kEn2==='review') mEn.review=unionArr(lEn.review, cEn.review);\n"
     "            else if(kEn2==='streak') mEn.streak=Math.max(lEn.streak||0, cEn.streak||0);\n"
     "            else if(kEn2==='done') mEn.done=unionTrue(lEn.done, cEn.done);\n"
     "            else if(kEn2==='custom') mEn.custom=unionById(lEn.custom, cEn.custom, (newer.v7&&newer.v7.en&&newer.v7.en.custom)||null);\n"
     "            else if(kEn2==='stats'){\n"
     "              var stEn={};\n"
     "              ['ev','ve'].forEach(function(d){ var a=(lEn.stats&&lEn.stats[d])||{}, b=(cEn.stats&&cEn.stats[d])||{}; stEn[d]={r:Math.max(a.r||0,b.r||0), w:Math.max(a.w||0,b.w||0)}; });\n"
     "              mEn.stats=stEn;\n"
     "            }\n"
     "            else if(kEn2==='dir'||kEn2==='ex'||kEn2==='topic'||kEn2==='lastDay') mEn[kEn2]=(newer.v7&&newer.v7.en&&newer.v7.en[kEn2]!==undefined)?newer.v7.en[kEn2]:((older.v7&&older.v7.en&&older.v7.en[kEn2]!==undefined)?older.v7.en[kEn2]:undefined);\n"
     "            else if(mEn[kEn2]===undefined) mEn[kEn2]=cEn[kEn2];\n"
     "          }\n"
     "          v7.en=mEn;\n"
     "        }\n"
     "        else if(kk==='en22'){\n"
     "          var l22=(localS.v7&&localS.v7.en22)||{}, c22=(cloudS.v7&&cloudS.v7.en22)||{};\n"
     "          var m22={}; for(var k22 in l22) m22[k22]=l22[k22];\n"
     "          var q22={};\n"
     "          [l22.quest,c22.quest].forEach(function(src){ if(!src) return; for(var u in src){ var s=src[u]||{}; var d=q22[u]=q22[u]||{}; d.stars=Math.max(d.stars||0,s.stars||0); d.best=Math.max(d.best||0,s.best||0); d.attempts=Math.max(d.attempts||0,s.attempts||0); d.lastAt=Math.max(d.lastAt||0,s.lastAt||0); if(s.claimed1)d.claimed1=1; if(s.claimed3)d.claimed3=1; } });\n"
     "          m22.quest=q22;\n"
     "          v7.en22=m22;\n"
     "        }\n"
     "        else if(kk==='en23'){\n"
     "          var l23=(localS.v7&&localS.v7.en23)||{}, c23=(cloudS.v7&&cloudS.v7.en23)||{};\n"
     "          var m23={};\n"
     "          var o23p=(older.v7&&older.v7.en23&&older.v7.en23.pets)||{}, n23p=(newer.v7&&newer.v7.en23&&newer.v7.en23.pets)||{};\n"
     "          var pets23={}; for(var p23 in o23p) pets23[p23]=o23p[p23]; for(var p23b in n23p) pets23[p23b]=n23p[p23b];\n"
     "          m23.pets=pets23;\n"
     "          m23.eggs=maxMap(l23.eggs, c23.eggs);\n"
     "          m23.hatch=(newer.v7&&newer.v7.en23&&newer.v7.en23.hatch!==undefined)?newer.v7.en23.hatch:(older.v7&&older.v7.en23?older.v7.en23.hatch:null);\n"
     "          m23.mats=maxMap(l23.mats, c23.mats);\n"
     "          m23.team=(newer.v7&&newer.v7.en23&&newer.v7.en23.team!==undefined)?newer.v7.en23.team:(older.v7&&older.v7.en23?older.v7.en23.team:[null,null,null]);\n"
     "          m23.claimed=unionTrue(l23.claimed, c23.claimed);\n"
     "          m23.affClaimed=unionTrue(l23.affClaimed, c23.affClaimed);\n"
     "          m23.created=Math.min(l23.created||Infinity, c23.created||Infinity);\n"
     "          if(!isFinite(m23.created)) m23.created=(l23.created||c23.created||Date.now());\n"
     "          v7.en23=m23;\n"
     "        }\n"
     "        else if(kk==='en27'){\n"
     "          var l27=(localS.v7&&localS.v7.en27)||{}, c27=(cloudS.v7&&cloudS.v7.en27)||{};\n"
     "          var m27={v:Math.max(l27.v||1, c27.v||1)};\n"
     "          m27.created=Math.min(l27.created||Infinity, c27.created||Infinity);\n"
     "          if(!isFinite(m27.created)) m27.created=(l27.created||c27.created||Date.now());\n"
     "          m27.en={last:maxMap(l27.en&&l27.en.last, c27.en&&c27.en.last), cw:maxMap(l27.en&&l27.en.cw, c27.en&&c27.en.cw), cr:maxMap(l27.en&&l27.en.cr, c27.en&&c27.en.cr)};\n"
     "          m27.ko={right:maxMap(l27.ko&&l27.ko.right, c27.ko&&c27.ko.right), wrong:maxMap(l27.ko&&l27.ko.wrong, c27.ko&&c27.ko.wrong), cw:maxMap(l27.ko&&l27.ko.cw, c27.ko&&c27.ko.cw), cr:maxMap(l27.ko&&l27.ko.cr, c27.ko&&c27.ko.cr), last:maxMap(l27.ko&&l27.ko.last, c27.ko&&c27.ko.last)};\n"
     "          var ses27={};\n"
     "          (l27.sessions||[]).concat(c27.sessions||[]).forEach(function(s){ if(s&&s.t!=null) ses27[s.t]=s; });\n"
     "          m27.sessions=Object.keys(ses27).map(function(k){ return ses27[k]; }).sort(function(a,b){ return b.t-a.t; }).slice(0,30);\n"
     "          var dys27={};\n"
     "          [l27.days,c27.days].forEach(function(src){ if(!src) return; for(var dn in src){ var a=dys27[dn]=dys27[dn]||{c:0,t:0,xp:0,mins:0}; var b=src[dn]||{}; a.c=Math.max(a.c,b.c||0); a.t=Math.max(a.t,b.t||0); a.xp=Math.max(a.xp,b.xp||0); a.mins=Math.max(a.mins,b.mins||0); } });\n"
     "          var dk27=Object.keys(dys27).sort().slice(-90), dys27b={};\n"
     "          dk27.forEach(function(k){ dys27b[k]=dys27[k]; });\n"
     "          m27.days=dys27b;\n"
     "          m27.streak={en:{d:'',n:0}, ko:{d:'',n:0}};\n"
     "          ['en','ko'].forEach(function(lg){ var a=(l27.streak&&l27.streak[lg])||{}, b=(c27.streak&&c27.streak[lg])||{}, nw=(newer.v7&&newer.v7.en27&&newer.v7.en27.streak&&newer.v7.en27.streak[lg])||{}; m27.streak[lg]={d:nw.d||a.d||b.d||'', n:Math.max(a.n||0,b.n||0)}; });\n"
     "          m27.claimed=unionTrue(l27.claimed, c27.claimed);\n"
     "          var n27p=(newer.v7&&newer.v7.en27)||{}, o27p=(older.v7&&older.v7.en27)||{};\n"
     "          m27.plan=n27p.plan!==undefined?n27p.plan:(o27p.plan||{en:{},ko:{}});\n"
     "          m27.uiLang=n27p.uiLang||o27p.uiLang||'en';\n"
     "          v7.en27=m27;\n"
     "        }\n"
     "        else if(v7[kk]===undefined) v7[kk]=newer.v7[kk]!==undefined?newer.v7[kk]:older.v7[kk];"),
    ("R-F-03a", "v20_sync.js",
     "            if(k15b==='old'&&l15.old&&c15.old){\n"
     "              var o={};\n"
     "              ['box','right','wrong','xpAt'].forEach(function(f){\n"
     "                o[f]={};\n"
     "                [l15.old[f],c15.old[f]].forEach(function(src){ if(src) for(var wid in src) o[f][wid]=Math.max(o[f][wid]||0, src[wid]||0); });\n"
     "              });\n"
     "              o.review=Array.from(new Set([].concat(l15.old.review||[],c15.old.review||[])));\n"
     "              o.streak=Math.max(l15.old.streak||0, c15.old.streak||0);\n"
     "              m15.old=o;\n"
     "            } else if(m15[k15b]===undefined) m15[k15b]=c15[k15b];",
     "            if(k15b==='due'){ var d15={}; [l15.due,c15.due].forEach(function(src){ if(src) for(var wid in src) d15[wid]=(d15[wid]===undefined)?src[wid]:Math.min(d15[wid], src[wid]); }); m15.due=d15; }\n"
     "            else if(k15b==='intv'){ m15.intv=maxMap(l15.intv, c15.intv); }\n"
     "            else if(k15b==='hist'){ var h15={}; [l15.hist,c15.hist].forEach(function(src){ if(!src) return; for(var dn in src){ var a=h15[dn]=h15[dn]||{c:0,t:0,xp:0}; var b=src[dn]||{}; a.c=Math.max(a.c,b.c||0); a.t=Math.max(a.t,b.t||0); a.xp=Math.max(a.xp,b.xp||0); } }); m15.hist=h15; }\n"
     "            else if(k15b==='daily'){ m15.daily=(newer.v7&&newer.v7.en15&&newer.v7.en15.daily!==undefined)?newer.v7.en15.daily:(older.v7&&older.v7.en15?older.v7.en15.daily:undefined); }\n"
     "            else if(k15b==='bosses'){ m15.bosses=unionTrue(l15.bosses, c15.bosses); }\n"
     "            else if(m15[k15b]===undefined) m15[k15b]=c15[k15b];"),
    ("R-F-03b", "v20_sync.js",
     "            if(k17b==='fav'||k17b==='mastered') m17[k17b]=Array.from(new Set([].concat(l17[k17b]||[],c17[k17b]||[])));",
     "            if(k17b==='fav') m17[k17b]=Array.from(new Set([].concat(l17[k17b]||[],c17[k17b]||[])));\n"
     "            else if(k17b==='claimed') m17.claimed=fillMissing(l17.claimed, c17.claimed);"),
    ("R-F-01-en16", "v20_sync.js",
     "            else if(m16[k16b]===undefined) m16[k16b]=c16[k16b];",
     "            else if(k16b==='map'||k16b==='overrides') m16[k16b]=fillMissing(l16[k16b], c16[k16b]);\n"
     "            else if(m16[k16b]===undefined) m16[k16b]=c16[k16b];"),
    ("R-F-13a", "v20_sync.js",
     "    if(b) for(var id in b){ var r=b[id]||{}; if((r.en&&r.en.win)||(r.ko&&r.ko.win)) return true; }",
     "    if(b) for(var id in b){ var r=b[id]||{}; if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) return true; }"),
    ("R-F-13b", "v20_sync.js",
     "  if(v7.en15&&v7.en15.bosses){ var b15=v7.en15.bosses; for(var k in b15){ if(b15[k]) return true; } }\n"
     "  return false;",
     "  if(v7.en15&&v7.en15.bosses){ var b15=v7.en15.bosses; for(var k in b15){ if(b15[k]) return true; } }\n"
     "  if(v7.en27&&v7.en27.sessions&&v7.en27.sessions.length) return true;\n"
     "  if(v7.en27&&v7.en27.days){ for(var d27 in v7.en27.days){ if(v7.en27.days[d27]) return true; } }\n"
     "  if(v7.en23&&v7.en23.pets){ for(var p23 in v7.en23.pets){ if(v7.en23.pets[p23]) return true; } }\n"
     "  if(v7.en22&&v7.en22.quest){ for(var q22 in v7.en22.quest){ if(v7.en22.quest[q22]) return true; } }\n"
     "  return false;"),
    ("R-F-14", "v20_sync.js",
     "    engine.conflict={local:loc.obj, cloud:cloud.data, localTime:m.lastSavedAt||0, cloudTime:cloud.updatedAt||0, localHash:loc.hash, cloudHash:cloudHash};",
     "    engine.conflict={local:loc.obj, cloud:cloud.data, localTime:(m.lastSavedAt||(loc.obj.v7&&loc.obj.v7.meta&&loc.obj.v7.meta.migratedAt)||(loc.obj.v7&&loc.obj.v7.en15&&loc.obj.v7.en15.created)||0), cloudTime:cloud.updatedAt||0, localHash:loc.hash, cloudHash:cloudHash};"),
    ("R-F-15", "v20_sync.js",
     "    if(depth>4||!o||typeof o!=='object') return;",
     "    if(depth>6||!o||typeof o!=='object') return;"),
    ("R-F-02a", "v15.js",
     "      localStorage.setItem('hanvocab.v1',JSON.stringify(j));\n      location.reload();",
     "      try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}\n"
     "      localStorage.setItem('hanvocab.v1',JSON.stringify(j));\n      location.reload();"),
    ("R-F-02b", "v20.js",
     "    try{ localStorage.setItem(SAVE_KEY, JSON.stringify(j)); }catch(e){ alert('Không ghi được dữ liệu (bộ nhớ trình duyệt đầy?).'); return; }",
     "    try{ flush(); }catch(e){}\n"
     "    try{ localStorage.setItem(SAVE_KEY, JSON.stringify(j)); }catch(e){ alert('Không ghi được dữ liệu (bộ nhớ trình duyệt đầy?).'); return; }"),
    ("R-F-02c", "v21.js",
     "  setSession({mode:'account', uid:uid, at:Date.now()});\n  reload();",
     "  try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}\n"
     "  setSession({mode:'account', uid:uid, at:Date.now()});\n  reload();"),
    ("R-F-02d", "v21.js",
     "  setSession({mode:'guest', at:Date.now()});\n  reload();",
     "  try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}\n"
     "  setSession({mode:'guest', at:Date.now()});\n  reload();"),
    ("R-F-16", "v15.js",
     "      if(!j||!Array.isArray(j.cards))throw new Error('bad save');",
     "      if(!j||!Array.isArray(j.cards))throw new Error('bad save');\n"
     "      try{ var _s20=window.__v20sync; if(_s20&&_s20.validateSave){ var _v=_s20.validateSave(j); if(!_v.ok) throw new Error('invalid save: '+(_v.errors||[]).slice(0,3).join(', ')); if(_s20.snapshot){ var _cur=''; try{ _cur=localStorage.getItem('hanvocab.v1')||''; }catch(e){} _s20.snapshot('hanvocab.v12.preimport-'+Date.now(), _cur); } } }catch(_ve){ if(_ve&&String(_ve.message||'').indexOf('invalid save')===0) throw _ve; }"),
]

NEW_REPLACEMENTS = [
    ("R-V31-F11", "v27.js",
     "function recordAnswer(lang,id,ok,mode){\n  try{\n    if(!id)return;",
     "function recordAnswer(lang,id,ok,mode){\n  try{\n    if(!id)return;\n    if(!getS()){ try{ if(window.console&&console.warn) console.warn('[V31] recordAnswer dropped: S unavailable, refusing to write into the never-persisted _mem fallback (F-11).'); }catch(e){} return; }"),
    ("R-V31-F12", "v15.js",
     "  try{delete S.v7.en;delete S.v7.en15;save15();buildWords();pop15('Đã đặt lại tiến trình tiếng Anh.');renderTab()}catch(e){}",
     "  try{delete S.v7.en;delete S.v7.en15;try{var _e27=S.v7&&S.v7.en27;if(_e27&&_e27.en){_e27.en.last={};_e27.en.cw={};_e27.en.cr={};}}catch(_e27e){}save15();buildWords();pop15('Đã đặt lại tiến trình tiếng Anh.');renderTab()}catch(e){}"),
    ("R-V31-C9", "v21.js",
     "        __v20.importFile(f).then(function(r){\n          if(msg){ msg.textContent=r&&r.ok?'Đã khôi phục. Trang sẽ tải lại để áp dụng.':'Không khôi phục được: '+((r&&r.error)||'file không hợp lệ'); msg.className='v21msg'+(r&&r.ok?'':' err')+' show'; }\n          if(r&&r.ok) setTimeout(reload, 800);\n        });",
     "        __v20.importFile(imp);\n        if(msg){ msg.textContent='Đang khôi phục — trang sẽ tải lại nếu file hợp lệ.'; msg.className='v21msg show'; }"),
    ("R-V31-C6", "v20.js",
     "['en18','en19'].forEach(function(k){ var b=x.v7&&x.v7[k]&&x.v7[k].bosses; if(b) for(var id in b){ var r=b[id]||{}; if((r.en&&r.en.win)||(r.ko&&r.ko.win)) wins++; } });",
     "['en18','en19'].forEach(function(k){ var b=x.v7&&x.v7[k]&&x.v7[k].bosses; if(b) for(var id in b){ var r=b[id]||{}; if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) wins++; } });"),
    ("R-V31-C1a", "v15.js",
     "function backupExport(){\n  var raw='';try{raw=localStorage.getItem('hanvocab.v1')||'{}'}catch(e){raw='{}'}",
     "function backupExport(){\n  try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}\n  var raw='';try{raw=localStorage.getItem('hanvocab.v1')||'{}'}catch(e){raw='{}'}"),
    ("R-V31-C1b", "v15.js",
     "  dl('korean-vocab-farm-backup-v7.json',raw);",
     "  dl('korean-vocab-farm-backup-v16.3.json',raw);"),
    ("R-V31-C1c", "v21.js",
     "msg.textContent='Đã tải file sao lưu.'",
     "msg.textContent='Đã bắt đầu tải file sao lưu — kiểm tra thư mục tải về.'"),
    ("R-V31-C6b", "v20.js",
     "Hợp nhất an toàn: boss đã thắng ở bên nào cũng tính, sao lấy mức cao nhất; XP/kim cương lấy mức cao nhất (không cộng dồn); thẻ từ hợp nhất theo ID.",
     "Hợp nhất an toàn: từ tiếng Anh giữ mức cao nhất từng từ (box/số câu đúng/số câu sai); boss, thú cưng, nhiệm vụ và lịch sử Học thông minh được hợp nhất từ cả hai bên; XP/kim cương lấy mức cao nhất (không cộng dồn); một số lựa chọn hiện tại (đội thú cưng, kế hoạch hôm nay) lấy theo bản mới hơn."),
    ("R-V31-C6c", "v21.js",
     "Hợp nhất lấy XP/kim cương cao nhất, không cộng dồn.",
     "Hợp nhất: từ tiếng Anh giữ mức cao nhất từng từ; boss, thú cưng, nhiệm vụ và lịch sử Học thông minh hợp nhất từ cả hai bên; XP/kim cương lấy mức cao nhất, không cộng dồn."),
    ("R-V31-F01-en18", "v20_sync.js",
     "      ['en','ko'].forEach(function(l){",
     "      /* V31 (F-01): V18 boss records are FLAT {win,wins,at,item} (v18.js:496),\n         not nested {en,ko} like V19 — merge them directly, or a two-device\n         merge silently drops every English Challenge Arena win. */\n"
     "      if(src.win||src.wins){\n"
     "        dst.win=(dst.win||src.win)?1:0;\n"
     "        dst.wins=Math.max(dst.wins||0,src.wins||0);\n"
     "        if(src.stars!==undefined) dst.stars=Math.max(dst.stars||0,src.stars);\n"
     "        if(src.at!==undefined) dst.at=Math.max(dst.at||0,src.at);\n"
     "        if(src.item!==undefined&&dst.item===undefined) dst.item=src.item;\n"
     "      }\n"
     "      ['en','ko'].forEach(function(l){"),
]

ALL_REPLACEMENTS = REPLACEMENTS + NEW_REPLACEMENTS

# Distinctive strings that exist ONLY in the 12 OUT-OF-SCOPE replacements
# (PLAN_V31.md section A.2 rows 15-26). They must be absent from the base
# and must stay absent after the build. (Asserted as replacement text,
# not as identifiers — e.g. 'gain15(5)' legitimately exists in the base,
# so the out-of-scope R-V17-3 is detected by its replacement-only
# '_speakXp'.)
OUT_OF_SCOPE_MARKERS = [
    "v21emailbtn",      # R-F-09a/b (duplicate ids)
    "_esc21",           # R-F-10a/b/c (Escape listener)
    "armV27Obs",        # R-F-05c-1/c-2 (observer scoping)
    "rearmObserver",    # R-F-07c (observer lifecycle)
    "_speakXp",         # R-V17-3 (speak double-pay)
    "V29 (F-05)",       # R-F-05a (observer scoping comment)
]

# --- helpers (EPERM-safe pattern from build_v16.py) ---
def _cfr(fsrc, fdst, off, n):
    """Copy n bytes from fsrc@off to fdst via copy_file_range with retries.

    Userspace write() is EPERM-flaky on this host (memory pressure, waves
    lasting minutes); copy_file_range is filtered the same way, so retry
    each chunk until it lands. Raises on a short/failed copy.
    """
    done = 0
    deadline = time.time() + 540  # give up after 9 min of EPERM waves
    while done < n:
        if time.time() > deadline:
            raise PermissionError("copy_file_range EPERM for 9 minutes")
        try:
            c = os.copy_file_range(fsrc.fileno(), fdst.fileno(), n - done,
                                   offset_src=off + done)
        except PermissionError:
            time.sleep(2)
            continue
        if c == 0:
            raise OSError("copy_file_range returned 0")
        done += c


def _wsmall(f, data):
    """Write a small byte string with retries (small writes sometimes land)."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    for _ in range(600):
        try:
            n = os.write(f.fileno(), data)
            if n == len(data):
                return
            data = data[n:]
        except PermissionError:
            time.sleep(1)
    raise PermissionError("small write failed after retries")


def _safe_copyfile(src, dst):
    """shutil.copyfile (copy_file_range under the hood) — no userspace write."""
    shutil.copyfile(str(src), str(dst))


def _write_text_epersafe(path, text):
    """Write text to path via tmp file + atomic rename (EPERM-safe)."""
    tmp_path = path.with_name(path.name + ".tmp31")
    with open(tmp_path, "wb", buffering=0) as f:
        _wsmall(f, text.encode("utf-8"))
    os.rename(tmp_path, path)


def _assemble_index(orig_path, edits):
    """Rebuild index.html from orig bytes + a list of edits.

    edits: [{start, end, chunks:[('glue', bytes) | ('file', Path)]}],
    sorted by start, non-overlapping. Bytes outside edits are copied
    verbatim with copy_file_range. Writes to index.html.tmp then renames
    into place (atomic, metadata-only).
    """
    orig = orig_path.read_bytes()
    events = sorted(edits, key=lambda e: e["start"])
    parts = []
    pos = 0
    for ev in events:
        s, e = ev["start"], ev["end"]
        assert s >= pos, "overlapping edits in index.html assembly"
        if pos < s:
            parts.append(("orig", pos, s))
        for ch in ev["chunks"]:
            parts.append(ch)
        pos = max(pos, e)
    if pos < len(orig):
        parts.append(("orig", pos, len(orig)))
    tmp_path = orig_path.with_name(orig_path.name + ".tmp")
    with open(orig_path, "rb", buffering=0) as fsrc, \
         open(tmp_path, "wb", buffering=0) as fdst:
        for kind, *rest in parts:
            if kind == "orig":
                s, e = rest
                _cfr(fsrc, fdst, s, e - s)
            elif kind == "file":
                p = rest[0]
                with open(p, "rb", buffering=0) as f:
                    _cfr(f, fdst, 0, os.fstat(f.fileno()).st_size)
            else:
                _wsmall(fdst, rest[0])
    os.rename(tmp_path, orig_path)


def _node_check(path):
    node = shutil.which("node")
    assert node, "node not found — node --check is required for this build"
    r = subprocess.run([node, "--check", str(path)], capture_output=True, text=True)
    assert r.returncode == 0, f"node --check failed for {path}:\n{r.stderr}"
    print(f"node --check OK: {path}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None)
    ap.add_argument("--src", default=None)
    args = ap.parse_args()
    out = pathlib.Path(args.out) if args.out else ROOT / "out"
    src_dir = pathlib.Path(args.src) if args.src else ROOT / "src"
    v31_js = src_dir / "v31.js"
    v31_css = src_dir / "v31.css"
    assert v31_js.exists() and v31_css.exists(), "src/v31.js / src/v31.css missing"

    # --- 1. Verify the base is pristine V16 ---
    index = out / "index.html"
    assert index.exists(), "out/index.html missing — run on a V16 build"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V16_HASH, f"base is not pristine V16: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v27"' in built and 'id="v27js"' in built, "V27 markers missing — not a V16 build"
    for m in ('id="v28"', 'id="v29"', 'id="v31"', '__v28', '__v29', '__v31'):
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V16 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    print(f"verified pristine V16 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…)")

    # --- 2. Validate the V31 layer itself ---
    v31_js_t = v31_js.read_text(encoding="utf-8")
    v31_css_t = v31_css.read_text(encoding="utf-8")
    assert "</script>" not in v31_js_t.lower(), "v31.js contains </script>"
    assert "VERSION='16.3.0'" in v31_js_t and "__v31" in v31_js_t, "v31.js must expose __v31 16.3.0"
    assert "recordBackupEvent" in v31_js_t and "hanvocab.v16.backup-history" in v31_js_t, "v31.js missing backup history"
    assert "verifyCloudBackup" in v31_js_t and "undoRestore" in v31_js_t, "v31.js missing verify/undo"
    _stripped = _re.sub(r"/\*.*?\*/", "", v31_js_t, flags=_re.S)
    _stripped = _re.sub(r"//[^\n]*", "", _stripped)
    assert "window.S" not in _stripped, "v31.js must never use window.S (lexical let)"
    assert "v31kotab" not in v31_js_t, "v31.js must not add a KO tab button"
    for token in ("--ui-text-primary", "--ui-title-gold", "--ui-bg-panel", "--ui-btn-min-height", ".v31section", ".v31hist"):
        assert token in v31_css_t, f"v31.css missing {token}"
    assert v31_css_t.strip(), "v31.css is empty"
    print(f"validated src/v31.js ({len(v31_js_t)} chars) + src/v31.css ({len(v31_css_t)} chars)")

    # --- 3. Apply replacements to standalone src/ files ---
    touched = {}
    for label, fname, anchor, replacement in ALL_REPLACEMENTS:
        p = src_dir / fname
        text = p.read_text(encoding="utf-8")
        assert text.count(anchor) == 1, f"{label}: {fname}: anchor found {text.count(anchor)}x, expected exactly 1"
        assert replacement not in text, f"{label}: {fname}: replacement already present — refusing to double-apply"
        _write_text_epersafe(p, text.replace(anchor, replacement, 1))
        after = p.read_text(encoding="utf-8")
        assert after.count(replacement) == 1, f"{label}: {fname}: replacement not applied exactly once"
        touched.setdefault(fname, []).append(label)
        print(f"applied {label} to src/{fname}")
    for fname in touched:
        _safe_copyfile(src_dir / fname, out / fname)
        assert (out / fname).read_text(encoding="utf-8") == (src_dir / fname).read_text(encoding="utf-8"), (
            f"out/{fname} does not match patched src/{fname}")
    _safe_copyfile(v31_js, out / "v31.js")
    _safe_copyfile(v31_css, out / "v31.css")

    # --- 4. Assemble the new index.html: replacements + title + V31 ---
    edits = []
    for label, fname, anchor, replacement in ALL_REPLACEMENTS:
        ab = anchor.encode("utf-8")
        a0 = orig_bytes.find(ab)
        assert a0 != -1 and orig_bytes.count(ab) == 1, f"index.html: {label} anchor for {fname} not found exactly once"
        edits.append({"start": a0, "end": a0 + len(ab),
                      "chunks": [("glue", replacement.encode("utf-8"))]})
        print(f"{label} staged for inlined {fname} block at byte {a0}")
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V16 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # V31 layer, LAST, before </body>
    body = orig_bytes.find(b"</body>")
    assert body != -1, "no </body> in index.html"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v31">\n'),
        ("file", v31_css),
        ("glue", b'\n</style>\n<script id="v31js">\n'),
        ("file", v31_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 5. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    for label, fname, anchor, replacement in ALL_REPLACEMENTS:
        assert built.count(replacement) == 1, f"built index.html: {label} replacement present {built.count(replacement)}x, expected 1"
        assert built.count(anchor) == 0 or anchor in replacement, (
            f"built index.html: {label} anchor still present (replacement did not consume it)")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V16.3 title missing / V16 title remains"
    assert "window.__v31" in built and "VERSION='16.3.0'" in built, "built index.html missing __v31 16.3.0"
    # C9: no .then / r.ok reference may survive in the Account Center import handler
    assert "__v20.importFile(f).then" not in built, "built index.html: C9 .then handler survives"
    assert "if(r&&r.ok) setTimeout(reload, 800);" not in built, "built index.html: C9 r.ok reload survives"
    assert built.count("__v20.importFile(imp)") == 1, "built index.html: C9 importFile(imp) count != 1"
    # C1: current filename only
    assert built.count("korean-vocab-farm-backup-v16.3.json") == 1, "built index.html: v16.3 filename count != 1"
    assert "korean-vocab-farm-backup-v7.json" not in built, "built index.html: stale v7 filename survives"
    # F-12: EN-side-only clear present exactly once
    assert built.count("_e27.en.last={};") == 1, "built index.html: F-12 en27.en clear count != 1"
    # F-11: guard warn text — once in the R-V31-F11 replacement, once in the v31.js wrapper.
    # (The literal '[V31] ' prefix appears only in the replacement: the wrapper calls
    # logWarn(), which prepends '[V31] ' at runtime, so count the bare text.)
    assert built.count("recordAnswer dropped") == 2, "built index.html: F-11 warn text expected 2x (replacement + v31.js wrapper)"
    # v31 markers are the LAST style/script markers before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v31", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v31", f"script marker order wrong: {script_ids}"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0"):
        assert ver in built, f"built html lost version {ver}"
    # KO tabs line unchanged: v23kotab tail still x1, no v31kotab anywhere
    assert built.count('<button class="tab v23kotab"') == 1, "built index.html: KO v23kotab button changed"
    assert "v31kotab" not in built, "built index.html: unexpected v31kotab (KO button must not be added)"
    # out-of-scope replacements absent
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"built index.html: out-of-scope marker {marker!r} present"
    # src/out/index copies agree on every replacement
    for label, fname, anchor, replacement in ALL_REPLACEMENTS:
        for base in (src_dir, out):
            assert (base / fname).read_text(encoding="utf-8").count(replacement) == 1, (
                f"{base}/{fname}: {label} count != 1")
    _node_check(v31_js)
    for fname in touched:
        _node_check(src_dir / fname)
    _safe_copyfile(HERE / "build_v31.py", out / "build_v31.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V16.3, layer V31 injected last")
    print(f"V31: Backup & Restore Fix — {len(ALL_REPLACEMENTS)} replacements "
          f"({len(REPLACEMENTS)} staged in-scope + {len(NEW_REPLACEMENTS)} new V31)")
    print("marker order OK: v31 last (styles + scripts); KO tabs line unchanged; out-of-scope markers absent")
    return 0


if __name__ == "__main__":
    sys.exit(main())
