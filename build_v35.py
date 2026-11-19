#!/usr/bin/env python3
"""Build V18.0 (SKYROOT SANCTUARY) from the pristine V17.1 build + the V35 layer.

V18.0 = V17.1 (Chrono Complete, layer V34) + layer V35
(src/v35.css + src/v35_data.js + src/v35.js) + guarded build-script
replacements (see REPLACEMENTS below) + asset copies (8 boss PNGs,
9 pet stage PNGs + 3 egg PNGs into out/assets/bosses/v18/ and
out/assets/pets/v18/).

WHAT THIS SCRIPT DOES (in order):
  1. Verifies the base is the pristine V17.1 build (hash + v34 markers
     present, v35 markers absent). REFUSES to run otherwise.
     PRE-PASS: every replacement anchor is checked (src files AND
     out/index.html) BEFORE any file is mutated, so a missing anchor
     fails the build without leaving a half-patched tree.
  2. Applies the replacements to the standalone src/*.js files
     (exact-match asserts, fails the build if an anchor is missing /
     duplicated / already applied). R-V35-V18-CH is the one deliberate
     count-2 replacement — challenge() AND collDetail() share the
     same lookup line in v18.js.
  3. Mirrors the patched src files into out/ (copies must agree).
  4. Copies the V18 art into out/assets/ (boss PNGs to
     assets/bosses/v18/; pet PNGs to assets/pets/v18/ — byte-identical
     to tools/v35/assets-staging/, verified by sha256).
     NOTE: unlike V33's MOVE decision (pet art lived ONLY under
     assets/pets/v15/ because v23.js hardcodes that prefix), V35 pet
     art lives under assets/pets/v18/ and v23.js stageImg()/eggImg()
     are extended (R-V35-V23-STAGEIMG / R-V35-V23-EGGIMG) to resolve
     the 'v18/' prefix. No duplicate bytes.
  5. Applies the same replacements to the inlined blocks in
     out/index.html (byte edits, exact-count asserts), plus the KO
     v35kotab button (strip ONLY the trailing ';'), the V18.0 title,
     and the V35 layer injection (style v35 + script v35data +
     script v35js, LAST, before </body>).
  6. Verifies: marker order (v35 last, v35data before v35js),
     v35 version 18.0.0, node --check on v35.js/v35_data.js + every
     touched src file, KO tabs line (v35kotab x1 after v33kotab),
     art byte-identical to staging, old versions intact,
     V31/V32/V33/V34 fragments still present.

RUN EXACTLY ONCE on a fresh V17.1 out/. NEVER re-run build_v33.py /
build_v34.py (or any older build script) on a finished build (they
reorder layers — see the V32 skill notes).

B-35-2 correction (2026-11-19, found in testing): R-V35-V19-UNLOCK-LOOKUP
extends the bossUnlocked19() lookup line with the V35 fall-through.
Without it the skyroot delegation is unreachable and no v18_* boss can
be fought. tools/v35/fix_b35.py applied the same one-line fix to the
shipped build; this script now reproduces it (verified by a from-scratch
rebuild in tools/v35/rebuild-proof/).

Usage:  python3 build_v35.py [--out DIR] [--src DIR]
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

# Pristine V17.1 out/index.html (2,214,197 B) — verified before any edit.
V171_HASH = "3cdb824d6a52010659de187c07bba020983e5c9f57adf2e418c51bf4b9ed357c"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V17.1 — Chrono Complete — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V18.0 — Skyroot Sanctuary — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# --- V17: Skyroot library data + group helpers (appended after oxWords) ---
V35_V17_DATA = (
    "function skyrootSetName(id){\n"
    "  var m={climate:'Climate & Environment',science:'Science & Innovation',society:'Society & Culture',mind:'Mind & Character'};\n"
    "  return m[id]||id;\n"
    "}\n"
    "function skyrootWords(){return WORDS().filter(function(w){return (w.lib||[]).indexOf('skyroot')>=0})}\n"
    "function skyrootSets(){\n"
    "  var order=['climate','science','society','mind'],map={};\n"
    "  skyrootWords().forEach(function(w){\n"
    "    var k=w.skyrootSet||'climate';\n"
    "    if(!map[k])map[k]={id:k,name:skyrootSetName(k),words:[]};\n"
    "    map[k].words.push(w);\n"
    "  });\n"
    "  return order.filter(function(k){return map[k]}).map(function(k){return map[k]});\n"
    "}\n"
    "function skyrootSetCard(g){\n"
    "  var s=statsOf(g.words);\n"
    "  var pct=s.total?Math.round(s.learned/s.total*100):0;\n"
    "  return '<div class=\"v17card\"><div class=\"v17card-t\"><b>'+esc(g.name)+'</b><span class=\"mute\">'+g.words.length+' từ</span></div>'\n"
    "    +'<div class=\"v17bar\"><i style=\"width:'+pct+'%\"></i></div>'\n"
    "    +'<div class=\"mute\">'+s.learned+' đã học · '+s.mastered+' đã thuộc · '+s.due+' cần ôn</div>'\n"
    "    +'<div class=\"acts\"><button class=\"btn sm pri\" onclick=\"__v17.learnSkyrootSet(\\''+g.id+'\\')\">Học ngay</button>'\n"
    "    +'<button class=\"btn sm\" onclick=\"__v17.reviewSkyrootSet(\\''+g.id+'\\')\">Ôn tập</button>'\n"
    "    +'<button class=\"btn sm\" onclick=\"__v17.openSkyrootSet(\\''+g.id+'\\')\">Xem từ</button></div></div>';\n"
    "}\n"
    "function skyrootGroupHTML(){\n"
    "  var ws=skyrootWords();\n"
    "  var s=statsOf(ws);\n"
    "  var pct=s.total?Math.round(s.learned/s.total*100):0;\n"
    "  return '<div class=\"v17group\"><div class=\"v17group-head\"><b>🌿 Skyroot Sanctuary — Thánh Địa Thiên Căn</b><span class=\"mute\">'+ws.length+' từ · 4 bộ · trình độ B2</span></div>'\n"
    "    +'<p class=\"mute\">Từ vựng Thánh Địa Thiên Căn (V18.0) — học xong mỗi bộ để nhận thưởng, dùng trong trận boss Skyroot. 120 từ dẫn bằng tiếng Hàn (từ Hàn là từ chính trong nguồn) — trong kho từ chung vẫn hiển thị đầu từ tiếng Anh kèm nghĩa Hàn.</p>'\n"
    "    +'<div class=\"acts\"><button class=\"btn sm pri\" onclick=\"__v17.learnScopeKey(\\'skyroot\\')\">Học ngay</button>'\n"
    "    +'<button class=\"btn sm\" onclick=\"__v17.reviewScopeKey(\\'skyroot\\')\">Ôn tập</button>'\n"
    "    +'<button class=\"btn sm\" onclick=\"__v17.openLib(\\'skyroot\\')\">Xem tất cả từ</button></div>'\n"
    "    +'<div class=\"mute\">Tổng: '+s.learned+' đã học · '+s.mastered+' đã thuộc · '+s.due+' cần ôn</div>'\n"
    "    +'<div class=\"v17bar\"><i style=\"width:'+pct+'%\"></i></div>'\n"
    "    +'<div class=\"v17grid\">'+skyrootSets().map(skyrootSetCard).join('')+'</div>'\n"
    "    +'<p class=\"mute\">Tiếng Hàn: từ Skyroot tiếng Hàn học qua deck tiếng Hàn đã chọn (trận boss / Học thông minh); từ Skyroot trong kho từ chung dùng đầu từ tiếng Anh.</p></div>';\n"
    "}\n"
)

V35_BUILDWORDS = (
    "  /* V35: SKYROOT SANCTUARY — gắn 240 từ Skyroot (data qua\n"
    "     window.__V35_WORDS, ids 'v35_<slug>') vào WORDS chung, theo mẫu\n"
    "     V33 (Chrono). Từ đã có chỉ được gắn thêm thư viện\n"
    "     'skyroot'; từ chỉ có trong Skyroot nhận id ổn định 'v35_<slug>'\n"
    "     và cấp độ 'B2' (boss Skyroot là diff B2 nên wordPool gồm chúng).\n"
    "     POS chuẩn hóa dài->ngắn tại đây (bài học V34-BUG-1).\n"
    "     KHÔNG tạo S.cards — trường ko chỉ là dữ liệu hiển thị/học. */\n"
    "  try{\n"
    "    var sk35=(window.__V35_WORDS||[]);\n"
    "    var K2W5={};WORDS.forEach(function(ww){if(!ww.custom)K2W5[ww.en.toLowerCase()]=ww});\n"
    "    sk35.forEach(function(a){\n"
    "      var key=(a.en||'').toLowerCase();if(!key)return;\n"
    "      var ww=K2W5[key];\n"
    "      if(ww){\n"
    "        ww.lib=ww.lib||[];\n"
    "        if(ww.lib.indexOf('skyroot')<0)ww.lib.push('skyroot');\n"
    "        ww.skyrootSet=ww.skyrootSet||a.set;\n"
    "        if(!ww.ko&&a.ko)ww.ko=a.ko;\n"
    "      }else{\n"
    "        var nw={id:a.id,t:'skyroot',en:a.en,vi:a.vi,ipa:a.ipa||'',pos:(function(p){var m={noun:'n',verb:'v',adjective:'adj',adverb:'adv'};return (p||'').split(',').map(function(x){var k=x.trim();return m[k]||k}).join(', ')})(a.pos),ex:a.ex||'',exvi:a.exvi||'',lv:'B2',custom:false,\n"
    "          lib:['skyroot'],skyrootSet:a.set,ko:a.ko||''};\n"
    "        WORDS.push(nw);BYID[nw.id]=nw;K2W5[key]=nw;LV[key]='B2';\n"
    "      }\n"
    "    });\n"
    "  }catch(e){}\n"
)

V35_MERGE = (
    "        else if(kk==='en35'){\n"
    "          /* V35 (Skyroot Sanctuary): quests union (done/claimed/acc/at\n"
    "             MAX), regionClaimed union (per-language MAX — NOT unionTrue:\n"
    "             unionTrue is local-priority last-writer-wins, so a local\n"
    "             {ko:0} would overwrite a cloud {ko:1}; regionClaimed\n"
    "             carries explicit 0s, unlike the 1/absent claimed maps),\n"
    "             created MIN. XP/gems are never\n"
    "             summed (MAX at the top level, as everywhere else).\n"
    "             Pending launches are session-local and dropped. No rift\n"
    "             sub-state exists in V35. */\n"
    "          var l35=(localS.v7&&localS.v7.en35)||{}, c35=(cloudS.v7&&cloudS.v7.en35)||{};\n"
    "          var m35={};\n"
    "          m35.created=Math.min(l35.created||Infinity, c35.created||Infinity);\n"
    "          if(!isFinite(m35.created)) m35.created=(l35.created||c35.created||Date.now());\n"
    "          var q35={};\n"
    "          [l35.quests,c35.quests].forEach(function(src){ if(!src) return; for(var qk in src){ var a=q35[qk]=q35[qk]||{}; var b=src[qk]||{}; a.done=Math.max(a.done||0,b.done||0); a.claimed=Math.max(a.claimed||0,b.claimed||0); a.acc=Math.max(a.acc||0,b.acc||0); a.at=Math.max(a.at||0,b.at||0); } });\n"
    "          m35.quests=q35;\n"
    "          var rcL35=l35.regionClaimed||{}, rcC35=c35.regionClaimed||{};\n"
    "          m35.regionClaimed={en:Math.max(rcL35.en||0,rcC35.en||0),ko:Math.max(rcL35.ko||0,rcC35.ko||0)};\n"
    "          m35.pending={};\n"
    "          v7.en35=m35;\n"
    "        }\n"
)

REPLACEMENTS = [
    # --- V19: UCE fight lookup + unlock delegation for zone 'skyroot' ---
    ("R-V35-V19-FIGHT", "v19.js",
     "  var b=D19().byId(id)||(window.__V33_DATA&&__V33_DATA.byId?__V33_DATA.byId(id):null);if(!b)return;",
     "  var b=D19().byId(id)||(window.__V33_DATA&&__V33_DATA.byId?__V33_DATA.byId(id):null)||(window.__V35_DATA&&__V35_DATA.byId?__V35_DATA.byId(id):null);if(!b)return;",
     1),
    ("R-V35-V19-UNLOCK", "v19.js",
     "  if(b.zone==='chrono'&&window.__v33&&__v33.bossUnlocked)return __v33.bossUnlocked(id,lang);",
     "  if(b.zone==='chrono'&&window.__v33&&__v33.bossUnlocked)return __v33.bossUnlocked(id,lang);\n"
     "  if(b.zone==='skyroot'&&window.__v35&&__v35.bossUnlocked)return __v35.bossUnlocked(id,lang);",
     1),
    # B-35-2 (found in testing 2026-11-19): bossUnlocked19() looked up
    # D19/V33 only, so the skyroot delegation above was unreachable dead
    # code and no v18_* boss could ever be fought. The lookup line itself
    # must also gain the V35 fall-through (like R-V35-V19-FIGHT /
    # R-V35-V18-CH). tools/v35/fix_b35.py applied this one-line fix to
    # the shipped build; this replacement makes the script reproduce it.
    ("R-V35-V19-UNLOCK-LOOKUP", "v19.js",
     "  var b=D19().byId(id)||(window.__V33_DATA&&__V33_DATA.byId?__V33_DATA.byId(id):null);if(!b)return false;",
     "  var b=D19().byId(id)||(window.__V33_DATA&&__V33_DATA.byId?__V33_DATA.byId(id):null)||(window.__V35_DATA&&__V35_DATA.byId?__V35_DATA.byId(id):null);if(!b)return false;",
     1),
    # --- V18: Collection allBosses() + challenge()/collDetail() ---
    ("R-V35-V18-ALL", "v18.js",
     "function allBosses(){var d=B18();return (d.old||[]).concat(newBosses(),v19Bosses(),(window.__V33_DATA?__V33_DATA.bosses:[]))}",
     "function allBosses(){var d=B18();return (d.old||[]).concat(newBosses(),v19Bosses(),(window.__V33_DATA?__V33_DATA.bosses:[]),(window.__V35_DATA?__V35_DATA.bosses:[]))}",
     1),
    # Deliberate count-2: challenge() AND collDetail() share this lookup
    # line in v18.js; both need the V35 fall-through.
    ("R-V35-V18-CH", "v18.js",
     "  var b=bossById(id)||(window.__V19_DATA&&__V19_DATA.byId?__V19_DATA.byId(id):null)||(window.__V33_DATA&&__V33_DATA.byId?__V33_DATA.byId(id):null);if(!b)return;",
     "  var b=bossById(id)||(window.__V19_DATA&&__V19_DATA.byId?__V19_DATA.byId(id):null)||(window.__V33_DATA&&__V33_DATA.byId?__V33_DATA.byId(id):null)||(window.__V35_DATA&&__V35_DATA.byId?__V35_DATA.byId(id):null);if(!b)return;",
     2),
    # --- V21: boss total 78 -> 86 ---
    ("R-V35-V21-TOTAL", "v21.js",
     "var TOTAL_BOSSES=78; /* 10 old (V15) + 30 (V10) + 30 (V11) + 8 (V17 Chrono) */",
     "var TOTAL_BOSSES=86; /* 10 old (V15) + 30 (V10) + 30 (V11) + 8 (V17 Chrono) + 8 (V18 Skyroot) */",
     1),
    # --- V20: hasProgress + safe-merge for en35 (mirror en33, no rift) ---
    ("R-V35-V20-HAS", "v20_sync.js",
     "  if(v7.en33&&v7.en33.quests){ for(var q33 in v7.en33.quests){ if(v7.en33.quests[q33]) return true; } }\n"
     "  if(v7.en33&&v7.en33.regionClaimed){ for(var rc33 in v7.en33.regionClaimed){ if(v7.en33.regionClaimed[rc33]) return true; } }",
     "  if(v7.en33&&v7.en33.quests){ for(var q33 in v7.en33.quests){ if(v7.en33.quests[q33]) return true; } }\n"
     "  if(v7.en33&&v7.en33.regionClaimed){ for(var rc33 in v7.en33.regionClaimed){ if(v7.en33.regionClaimed[rc33]) return true; } }\n"
     "  if(v7.en35&&v7.en35.quests){ for(var q35 in v7.en35.quests){ if(v7.en35.quests[q35]) return true; } }\n"
     "  if(v7.en35&&v7.en35.regionClaimed){ for(var rc35 in v7.en35.regionClaimed){ if(v7.en35.regionClaimed[rc35]) return true; } }",
     1),
    ("R-V35-V20-MERGE", "v20_sync.js",
     "        else if(v7[kk]===undefined) v7[kk]=newer.v7[kk]!==undefined?newer.v7[kk]:older.v7[kk];",
     V35_MERGE + "        else if(v7[kk]===undefined) v7[kk]=newer.v7[kk]!==undefined?newer.v7[kk]:older.v7[kk];",
     1),
    # --- V15: Skyroot words into WORDS + scope filters ---
    ("R-V35-V15-BUILDWORDS", "v15.js",
     "  /* V16: cập nhật từ có sẵn (override) — giữ nguyên id nên tiến trình",
     V35_BUILDWORDS + "  /* V16: cập nhật từ có sẵn (override) — giữ nguyên id nên tiến trình",
     1),
    ("R-V35-V15-INSCOPE", "v15.js",
     "  if(sc.lib==='chrono'&&sc.set){\n    if(w.chronoSet!==sc.set)return false;\n  }",
     "  if(sc.lib==='chrono'&&sc.set){\n    if(w.chronoSet!==sc.set)return false;\n  }\n"
     "  if(sc.lib==='skyroot'&&sc.set){\n    if(w.skyrootSet!==sc.set)return false;\n  }",
     1),
    ("R-V35-V15-WORDFILT", "v15.js",
     "      if(sc.lib==='chrono'&&sc.set){\n        if(w.chronoSet!==sc.set)return false;\n      }",
     "      if(sc.lib==='chrono'&&sc.set){\n        if(w.chronoSet!==sc.set)return false;\n      }\n"
     "      if(sc.lib==='skyroot'&&sc.set){\n        if(w.skyrootSet!==sc.set)return false;\n      }",
     1),
    # --- V17: Library 6th group (Skyroot) ---
    ("R-V35-V17-DATA", "v17.js",
     "function oxWords(){return WORDS().filter(function(w){return (w.lib||[]).indexOf('oxford')>=0})}",
     "function oxWords(){return WORDS().filter(function(w){return (w.lib||[]).indexOf('oxford')>=0})}\n" + V35_V17_DATA.rstrip("\n"),
     1),
    ("R-V35-V17-SCOPE", "v17.js",
     "  if(V.lib==='chrono')return V.set?{kind:'lib',lib:'chrono',set:V.set}:{kind:'lib',lib:'chrono'};",
     "  if(V.lib==='chrono')return V.set?{kind:'lib',lib:'chrono',set:V.set}:{kind:'lib',lib:'chrono'};\n"
     "  if(V.lib==='skyroot')return V.set?{kind:'lib',lib:'skyroot',set:V.set}:{kind:'lib',lib:'skyroot'};",
     1),
    ("R-V35-V17-SCNAME", "v17.js",
     "  if(sc.lib==='chrono'){\n    if(sc.set)return 'Chrono · '+chronoSetName(sc.set);\n    return 'Chrono Kingdom';\n  }",
     "  if(sc.lib==='chrono'){\n    if(sc.set)return 'Chrono · '+chronoSetName(sc.set);\n    return 'Chrono Kingdom';\n  }\n"
     "  if(sc.lib==='skyroot'){\n    if(sc.set)return 'Skyroot · '+skyrootSetName(sc.set);\n    return 'Skyroot Sanctuary';\n  }",
     1),
    ("R-V35-V17-REWARD", "v17.js",
     "  if(key==='chrono:all')return {xp:200,gems:5};\n  if(key.indexOf('chrono:')===0)return {xp:50,gems:2};\n",
     "  if(key==='skyroot:all')return {xp:200,gems:5};\n"
     "  if(key.indexOf('skyroot:')===0)return {xp:50,gems:2};\n"
     "  if(key==='chrono:all')return {xp:200,gems:5};\n  if(key.indexOf('chrono:')===0)return {xp:50,gems:2};\n",
     1),
    ("R-V35-V17-GROUP", "v17.js",
     "  h+=chronoGroupHTML();",
     "  h+=chronoGroupHTML();\n  h+=skyrootGroupHTML();",
     1),
    ("R-V35-V17-LESSON", "v17.js",
     "  else if(V.lib==='a1a2'){list=a1a2Words();title='A1–A2 Vocabulary';key='a1a2:all'}",
     "  else if(V.lib==='skyroot'&&V.set){\n"
     "    var gs=skyrootSets().filter(function(x){return x.id===V.set})[0];\n"
     "    if(!gs)return '<p class=\"mute\">Không tìm thấy bộ từ này.</p><div class=\"acts\"><button class=\"btn\" onclick=\"__v17.goHome()\">← Thư viện</button></div>';\n"
     "    list=gs.words;title='Skyroot · '+gs.name;key='skyroot:'+V.set;\n"
     "  }else if(V.lib==='skyroot'){list=skyrootWords();title='Skyroot Sanctuary — Thánh Địa Thiên Căn';key='skyroot:all'}\n"
     "  else if(V.lib==='a1a2'){list=a1a2Words();title='A1–A2 Vocabulary';key='a1a2:all'}",
     1),
    ("R-V35-V17-WHERE", "v17.js",
     "  if(V.lib==='chrono'&&!V.set)where=chronoSetName(w.chronoSet);",
     "  if(V.lib==='chrono'&&!V.set)where=chronoSetName(w.chronoSet);\n"
     "  if(V.lib==='skyroot'&&!V.set)where=skyrootSetName(w.skyrootSet);",
     1),
    ("R-V35-V17-ACTIONS", "v17.js",
     "function openSet(id){V.view='lesson';V.lib='chrono';V.set=id;V.topic=null;V.lesson=0;V.q='';V.pos='';V.status='all';V.page=0;renderTab()}\n"
     "function learnSet(id){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:'chrono',set:id});v.tab('learn')}\n"
     "function reviewSet(id){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:'chrono',set:id});reviewGo(false)}",
     "function openSet(id){V.view='lesson';V.lib='chrono';V.set=id;V.topic=null;V.lesson=0;V.q='';V.pos='';V.status='all';V.page=0;renderTab()}\n"
     "function learnSet(id){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:'chrono',set:id});v.tab('learn')}\n"
     "function reviewSet(id){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:'chrono',set:id});reviewGo(false)}\n"
     "function openSkyrootSet(id){V.view='lesson';V.lib='skyroot';V.set=id;V.topic=null;V.lesson=0;V.q='';V.pos='';V.status='all';V.page=0;renderTab()}\n"
     "function learnSkyrootSet(id){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:'skyroot',set:id});v.tab('learn')}\n"
     "function reviewSkyrootSet(id){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:'skyroot',set:id});reviewGo(false)}",
     1),
    ("R-V35-V17-EXPORTS", "v17.js",
     "  learnScopeKey:learnScopeKey,learnTopic:learnTopic,learnLesson:learnLesson,learnCurrent:learnCurrent,learnSet:learnSet,openSet:openSet,reviewSet:reviewSet,chronoWords:chronoWords,chronoSets:chronoSets,",
     "  learnScopeKey:learnScopeKey,learnTopic:learnTopic,learnLesson:learnLesson,learnCurrent:learnCurrent,learnSet:learnSet,openSet:openSet,reviewSet:reviewSet,chronoWords:chronoWords,chronoSets:chronoSets,learnSkyrootSet:learnSkyrootSet,openSkyrootSet:openSkyrootSet,reviewSkyrootSet:reviewSkyrootSet,skyrootWords:skyrootWords,skyrootSets:skyrootSets,",
     1),
    # --- V25: Skyroot group progress bar ---
    ("R-V35-V25-KEY", "v25.js",
     "  if(t.indexOf('Chrono')>=0)return 'chrono';",
     "  if(t.indexOf('Chrono')>=0)return 'chrono';\n"
     "  if(t.indexOf('Skyroot')>=0)return 'skyroot';",
     1),
    ("R-V35-V25-STATS", "v25.js",
     "  if(key==='bt'){",
     "  if(key==='skyroot'){\n"
     "    var listS=ws.filter(function(w){return (w.lib||[]).indexOf('skyroot')>=0});\n"
     "    var sS=statsOf(listS);sS.total=listS.length;return sS;\n"
     "  }\n"
     "  if(key==='bt'){",
     1),
    # --- V34: Boss Weakness understands kind 'skyroot' ---
    ("R-V35-V34-WEAKFOR-EXPL", "v34.js",
     "    if(d&&d.weakExplicit&&d.weakExplicit[id])return d.weakExplicit[id];",
     "    if(d&&d.weakExplicit&&d.weakExplicit[id])return d.weakExplicit[id];\n"
     "    var d35=window.__V35_DATA||null;\n"
     "    if(d35&&d35.weakExplicit&&d35.weakExplicit[id])return d35.weakExplicit[id];",
     1),
    ("R-V35-V34-WEAKFOR-ZONE", "v34.js",
     "    if(b.zone==='chrono')return {kind:'chrono',key:'change'};",
     "    if(b.zone==='chrono')return {kind:'chrono',key:'change'};\n"
     "    if(b.zone==='skyroot')return {kind:'skyroot',key:'climate'};",
     1),
    ("R-V35-V34-WEAKMATCH", "v34.js",
     "    if(weak.kind==='chrono')return w.chronoSet===weak.key;",
     "    if(weak.kind==='chrono')return w.chronoSet===weak.key;\n"
     "    if(weak.kind==='skyroot')return w.skyrootSet===weak.key;",
     1),
    ("R-V35-V34-WEAKNAME", "v34.js",
     "    if(weak.kind==='chrono'){\n      if(d&&d.setLabels&&d.setLabels[weak.key])return d.setLabels[weak.key];\n      return weak.key;\n    }",
     "    if(weak.kind==='chrono'){\n      if(d&&d.setLabels&&d.setLabels[weak.key])return d.setLabels[weak.key];\n      return weak.key;\n    }\n"
     "    if(weak.kind==='skyroot'){\n"
     "      var d35n=window.__V35_DATA||null;\n"
     "      if(d35n&&d35n.setLabels&&d35n.setLabels[weak.key])return d35n.setLabels[weak.key];\n"
     "      return weak.key;\n"
     "    }",
     1),
    # --- V23: pet art under assets/pets/v18/ (the 'v18/' prefix) ---
    ("R-V35-V23-STAGEIMG", "v23.js",
     "function stageImg(inst){var sp=spById(inst.sp);return sp?('assets/pets/v15/'+sp.stages[inst.st||0].img):''}",
     "function stageImg(inst){var sp=spById(inst.sp);if(!sp)return '';var _im=sp.stages[inst.st||0].img;return _im.indexOf('v18/')===0?('assets/pets/'+_im):('assets/pets/v15/'+_im)}",
     1),
    ("R-V35-V23-EGGIMG", "v23.js",
     "<img src=\"assets/pets/v15/eggs/'+egg.img+'\"",
     "<img src=\"'+(egg.img.indexOf('v18/')===0?('assets/pets/'+egg.img):('assets/pets/v15/eggs/'+egg.img))+'\"",
     1),
    # --- V23 data: 'wind' element + stone_wind material (explicit
    # extension of the existing maps, not a parallel system) ---
    ("R-V35-V23DATA-WIND", "v23_data.js",
     "  dark:{n:'Bóng Tối',icon:'🌙',color:'#9B59B6'}\n};",
     "  dark:{n:'Bóng Tối',icon:'🌙',color:'#9B59B6'},\n  wind:{n:'Gió',icon:'🌪️',color:'#8FE3C0'}\n};",
     1),
    ("R-V35-V23DATA-STONE", "v23_data.js",
     " {id:'stone_light',n:'Tinh Thể Ánh Sáng',el:'light',price:200,d:'Dùng để tiến hóa thú hệ Ánh Sáng.'},",
     " {id:'stone_light',n:'Tinh Thể Ánh Sáng',el:'light',price:200,d:'Dùng để tiến hóa thú hệ Ánh Sáng.'},\n"
     " {id:'stone_wind',n:'Tinh Thể Gió',el:'wind',price:200,d:'Dùng để tiến hóa thú hệ Gió.'},",
     1),
]

ALL_REPLACEMENTS = REPLACEMENTS

# --- KO tabs button (appended after the v33kotab button) ---
KO_TAIL_OLD = '+\'<button class="tab v33kotab" onclick="window.__v33&&__v33.openChrono(\\\'ko\\\')" title="Vương Quốc Thời Gian — Chrono Kingdom"><span class="ti">⏳</span><span>Chrono</span></button>\';'
KO_BTN = '+\'<button class="tab v35kotab" onclick="window.__v35&&__v35.openSkyroot(\\\'ko\\\')" title="Skyroot Sanctuary — Thánh Địa Thiên Căn"><span class="ti">🌿</span><span>Skyroot</span></button>\''
# Strip ONLY the trailing ';' — the closing quote of the v33 string MUST stay,
# otherwise the v33 string swallows the '+' and the v35 string's opening quote
# and the whole tabs line becomes a JS syntax error (V16 lesson, [:-2] bug).
KO_TAIL_NEW = KO_TAIL_OLD[:-1] + KO_BTN + ";"

# Distinctive strings that exist ONLY in out-of-scope work. They must be
# absent from the base and stay absent after the build.
OUT_OF_SCOPE_MARKERS = [
    "v21emailbtn",      # R-F-09a/b (duplicate ids)
    "_esc21",           # R-F-10a/b/c (Escape listener)
    "armV27Obs",        # R-F-05c-1/c-2 (observer scoping)
    "rearmObserver",    # R-F-07c (observer lifecycle)
    "_speakXp",         # R-V17-3 (speak double-pay)
    "V29 (F-05)",       # R-F-05a (observer scoping comment)
]

BOSS_PNGS = ["v18_breeze_lynx", "v18_thornwing_stag", "v18_cloud_serpent",
             "v18_moss_colossus", "v18_tempest_harpy", "v18_crystal_treant",
             "v18_aurora_griffin", "v18_skyroot_empress"]
PET_STAGES = ["cloudfx", "sproutowl", "stormram"]
PET_EGGS = ["cloud", "sprout", "storm"]

# V33 in-scope fragments (copied from package_v33.py) — must survive V18.0.
V33_FRAGMENTS = [
    "__V33_DATA.byId(id)",
    "b.zone==='chrono'&&window.__v33&&__v33.bossUnlocked",
    "b.id==='v17_geargolem'?90:",
    "F.boss.id!=='v17_geargolem'",
    "GEAR GOLEM hồi 10 HP",
    "__V33_DATA?__V33_DATA.bosses:[]",
    # NOTE: "var TOTAL_BOSSES=78;" is intentionally NOT in this list —
    # V35 changes it to 86 (asserted separately below).
    "startSession:startSession",
    "v7.en33.quests",
    "else if(kk==='en33')",
    "/* V33: CHRONO KINGDOM",
    "m33.regionClaimed={en:Math.max(rcL.en||0,rcC.en||0),ko:Math.max(rcL.ko||0,rcC.ko||0)}",
    "hit.acc>=QUEST_MIN_ACC",
    "QUEST_MIN_ACC=0.8",
]

# V34 in-scope fragments (copied from package_v34.py) — must survive V18.0.
V34_FRAGMENTS = [
    "chronoSets()",
    "chronoGroupHTML()",
    "V.lib==='chrono'&&V.set",
    "t.indexOf('Chrono')>=0",
    "sc.lib==='chrono'&&sc.set",
    "set:sc.set",
    "__v34.breakDmg(F)",
    "__v34.breakDmg(B)",
    "__v34.weakPick",
    "__v34.breakBarHTML",
    "try{if(window.__v27&&__v27.endEarly)__v27.endEarly()}catch(e){}",
    "weakCountInPool(F.weak,pool)===0",
    "noun:'n',verb:'v',adjective:'adj',adverb:'adv'",
]

# --- helpers (EPERM-safe pattern from build_v16.py, verbatim from build_v34.py) ---
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
    tmp_path = path.with_name(path.name + ".tmp35")
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


def _sha256(path):
    return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None)
    ap.add_argument("--src", default=None)
    args = ap.parse_args()
    out = pathlib.Path(args.out) if args.out else ROOT / "out"
    src_dir = pathlib.Path(args.src) if args.src else ROOT / "src"
    v35_js = src_dir / "v35.js"
    v35_css = src_dir / "v35.css"
    v35_data = src_dir / "v35_data.js"
    assert v35_js.exists() and v35_css.exists() and v35_data.exists(), "src/v35.js / src/v35.css / src/v35_data.js missing"

    # --- 1. Verify the base is pristine V17.1 ---
    index = out / "index.html"
    assert index.exists(), "out/index.html missing — run on a V17.1 build"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V171_HASH, f"base is not pristine V17.1: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v34"' in built and 'id="v34js"' in built and 'id="v34data"' in built, "V34 markers missing — not a V17.1 build"
    for m in ('id="v35"', 'id="v35js"', 'id="v35data"', '__v35', '__V35_DATA', '__V35_WORDS'):
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V17.1 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    print(f"verified pristine V17.1 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…)")

    # --- 1b. PRE-PASS: check every anchor (src files + index.html)
    # before mutating anything, so a missing anchor fails cleanly.
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        p = src_dir / fname
        text = p.read_text(encoding="utf-8")
        assert text.count(anchor) == count, f"PRE-PASS {label}: {fname}: anchor found {text.count(anchor)}x, expected exactly {count}"
        assert replacement not in text, f"PRE-PASS {label}: {fname}: replacement already present — refusing to double-apply"
    groups_pre = {}
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        g = groups_pre.setdefault(anchor, {"replacement": replacement, "total": 0, "labels": []})
        assert g["replacement"] == replacement, f"PRE-PASS anchor shared with different replacement: {label}"
        g["total"] += count
        g["labels"].append(label)
    for anchor, g in groups_pre.items():
        n = orig_bytes.count(anchor.encode("utf-8"))
        assert n == g["total"], f"PRE-PASS index.html: {g['labels']} anchor found {n}x, expected {g['total']}"
    kot_old = KO_TAIL_OLD.encode("utf-8")
    assert orig_bytes.count(kot_old) == 1, "PRE-PASS index.html: Korean tabs v33kotab tail not found exactly once"
    print(f"pre-pass OK: {len(ALL_REPLACEMENTS)} replacements anchor-checked in src/ + index.html, KO tail x1")

    # --- 2. Validate the V35 layer itself ---
    v35_js_t = v35_js.read_text(encoding="utf-8")
    v35_css_t = v35_css.read_text(encoding="utf-8")
    v35_data_t = v35_data.read_text(encoding="utf-8")
    assert "</script>" not in v35_js_t.lower(), "v35.js contains </script>"
    assert "</script>" not in v35_data_t.lower(), "v35_data.js contains </script>"
    assert "VERSION='18.0.0'" in v35_js_t and "__v35" in v35_js_t, "v35.js must expose __v35 18.0.0"
    assert "version:'18.0.0'" in v35_data_t and "__V35_DATA" in v35_data_t, "v35_data.js must expose __V35_DATA 18.0.0"
    assert "GEAR_GOLEM='v17_geargolem'" in v35_js_t, "v35.js missing GEAR GOLEM gate"
    _stripped = _re.sub(r"/\*.*?\*/", "", v35_js_t, flags=_re.S)
    _stripped = _re.sub(r"//[^\n]*", "", _stripped)
    assert "en35.bosses" not in _stripped, "v35.js must never create an en35.bosses key (wins live in en19)"
    for fn in ("gearGolemWon", "gateOpen", "bossUnlocked", "fightBoss", "startQuest",
               "claimQuest", "checkCompletions", "attachSkyroot", "registerPets",
               "openSkyroot", "closeSkyroot"):
        assert fn in v35_js_t, f"v35.js missing {fn}"
    _stripped = _re.sub(r"/\*.*?\*/", "", v35_js_t, flags=_re.S)
    _stripped = _re.sub(r"//[^\n]*", "", _stripped)
    assert "window.S" not in _stripped, "v35.js must never use window.S (lexical let)"
    assert "v35kotab" not in v35_js_t, "v35.js must not add a KO tab button (build-time only)"
    for token in ("--ui-text-primary", "--ui-text-secondary", "--ui-title-gold", "--ui-bg-panel", "--ui-border", "--ui-btn-min-height", "--ui-selected", "#v35hub", ".v35btn", ".v35boss"):
        assert token in v35_css_t, f"v35.css missing {token}"
    assert v35_css_t.strip(), "v35.css is empty"
    assert "z-index:1500" in v35_css_t, "v35.css overlay must be z-index 1500"
    for bid in ("v18_breeze_lynx", "v18_thornwing_stag", "v18_cloud_serpent", "v18_moss_colossus",
                "v18_tempest_harpy", "v18_crystal_treant", "v18_aurora_griffin", "v18_skyroot_empress"):
        assert bid in v35_data_t, f"v35_data.js missing boss {bid}"
        assert bid in v35_data_t and ('"kind":"skyroot"' in v35_data_t), "v35_data.js missing skyroot weakness table"
    for sp in ("cloudfx", "sproutowl", "stormram"):
        assert sp in v35_data_t, f"v35_data.js missing species {sp}"
    for eg in ("cloud", "sprout", "storm"):
        assert eg in v35_data_t, f"v35_data.js missing egg {eg}"
    # weakness fillability (static): every weakness set has 60 words in the data file
    import json as _json
    words35 = _json.loads((ROOT / "data" / "v35_words.json").read_text(encoding="utf-8"))
    for s in ("climate", "science", "society", "mind"):
        n = sum(1 for w in words35 if w["set"] == s)
        assert n == 60, f"weakness set {s} has {n} words, expected 60"
    print(f"validated src/v35.js ({len(v35_js_t)} chars) + src/v35_data.js ({len(v35_data_t)} chars) + src/v35.css ({len(v35_css_t)} chars)")
    print("weakness fillability OK: climate/science/society/mind = 60 words each (2 bosses per set)")

    # --- 3. Apply the replacements to the standalone src/ files ---
    touched = {}
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        p = src_dir / fname
        text = p.read_text(encoding="utf-8")
        assert text.count(anchor) == count, f"{label}: {fname}: anchor found {text.count(anchor)}x, expected exactly {count}"
        assert replacement not in text, f"{label}: {fname}: replacement already present — refusing to double-apply"
        _write_text_epersafe(p, text.replace(anchor, replacement))
        after = p.read_text(encoding="utf-8")
        assert after.count(replacement) == count, f"{label}: {fname}: replacement present {after.count(replacement)}x, expected {count}"
        touched.setdefault(fname, []).append(label)
        print(f"applied {label} to src/{fname} (x{count})")
    for fname in touched:
        _safe_copyfile(src_dir / fname, out / fname)
        assert (out / fname).read_text(encoding="utf-8") == (src_dir / fname).read_text(encoding="utf-8"), (
            f"out/{fname} does not match patched src/{fname}")
    _safe_copyfile(v35_js, out / "v35.js")
    _safe_copyfile(v35_css, out / "v35.css")
    _safe_copyfile(v35_data, out / "v35_data.js")

    # --- 4. Copy the V18 art into out/assets/ (byte-identical to staging) ---
    staging = ROOT / "tools" / "v35" / "assets-staging"
    for bid in BOSS_PNGS:
        src_p = staging / "bosses" / "v18" / (bid + ".png")
        assert src_p.exists(), f"missing boss art {src_p}"
        dst_p = out / "assets" / "bosses" / "v18" / (bid + ".png")
        dst_p.parent.mkdir(parents=True, exist_ok=True)
        _safe_copyfile(src_p, dst_p)
        assert _sha256(src_p) == _sha256(dst_p), f"boss art not byte-identical: {bid}"
    for sp in PET_STAGES:
        for s in (1, 2, 3):
            fn = f"v18_{sp}_s{s}.png"
            src_p = staging / "pets" / "v18" / fn
            assert src_p.exists(), f"missing pet art {src_p}"
            dst_p = out / "assets" / "pets" / "v18" / fn
            dst_p.parent.mkdir(parents=True, exist_ok=True)
            _safe_copyfile(src_p, dst_p)
            assert _sha256(src_p) == _sha256(dst_p), f"pet art not byte-identical: {fn}"
    for eg in PET_EGGS:
        fn = f"v18_egg_{eg}.png"
        src_p = staging / "pets" / "v18" / fn
        assert src_p.exists(), f"missing egg art {src_p}"
        dst_p = out / "assets" / "pets" / "v18" / fn
        dst_p.parent.mkdir(parents=True, exist_ok=True)
        _safe_copyfile(src_p, dst_p)
        assert _sha256(src_p) == _sha256(dst_p), f"egg art not byte-identical: {fn}"
    print("copied 8 boss PNGs + 9 pet stage PNGs + 3 egg PNGs into out/assets/ (sha256-verified)")

    # --- 5. Assemble the new index.html: replacements + KO button + title + V35 ---
    # Two anchors are shared between v18.js challenge()/collDetail()
    # (R-V35-V18-CH, count 2): group by anchor and expect the SUM of
    # the per-file counts in index.html.
    groups = {}
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        g = groups.setdefault(anchor, {"replacement": replacement, "total": 0, "labels": []})
        assert g["replacement"] == replacement, f"anchor shared with different replacement: {label}"
        g["total"] += count
        g["labels"].append(label)
    edits = []
    for anchor, g in groups.items():
        ab = anchor.encode("utf-8")
        n = orig_bytes.count(ab)
        assert n == g["total"], f"index.html: anchor {g['labels']} found {n}x, expected {g['total']}"
        pos = 0
        for _ in range(n):
            a0 = orig_bytes.find(ab, pos)
            assert a0 != -1, f"index.html: anchor {g['labels']} occurrence missing"
            edits.append({"start": a0, "end": a0 + len(ab),
                          "chunks": [("glue", g["replacement"].encode("utf-8"))]})
            print(f"{g['labels']} staged for inlined block at byte {a0} (x{n})")
            pos = a0 + len(ab)
    # KO tabs button (after v33kotab; strip ONLY the trailing ';')
    k0 = orig_bytes.find(kot_old)
    assert k0 != -1 and orig_bytes.count(kot_old) == 1, "index.html: Korean tabs v33kotab tail not found exactly once"
    edits.append({"start": k0, "end": k0 + len(kot_old),
                  "chunks": [("glue", KO_TAIL_NEW.encode("utf-8"))]})
    print("KO button (v35kotab) staged after v33kotab")
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V17.1 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # V35 layer, LAST, before </body>
    body = orig_bytes.find(b"</body>")
    assert body != -1, "no </body> in index.html"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v35">\n'),
        ("file", v35_css),
        ("glue", b'\n</style>\n<script id="v35data">\n'),
        ("file", v35_data),
        ("glue", b'\n</script>\n<script id="v35js">\n'),
        ("file", v35_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 6. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    for anchor, g in groups.items():
        assert built.count(g["replacement"]) == g["total"], (
            f"built index.html: {g['labels']} replacement present {built.count(g['replacement'])}x, expected {g['total']}")
        assert built.count(anchor) == 0 or anchor in g["replacement"], (
            f"built index.html: {g['labels']} anchor still present (replacement did not consume it)")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V18.0 title missing / V17.1 title remains"
    assert "window.__v35" in built and "VERSION='18.0.0'" in built, "built index.html missing __v35 18.0.0"
    assert "window.__V35_DATA" in built and "window.__V35_WORDS" in built, "built index.html missing __V35_DATA/__V35_WORDS"
    # v35 markers are the LAST style/script markers before </body>; data before js
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v35", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v35", f"script marker order wrong: {script_ids}"
    assert built.find('id="v35data"') < built.find('id="v35js"'), "v35data must load before v35js"
    assert built.find('id="v35js"') > built.find('id="v34js"'), "v35js is not after v34js"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0", "17.0.0", "17.1.0"):
        assert ver in built, f"built html lost version {ver}"
    # V31/V32 fragments still present (spot-checks)
    assert "/* V31 (F-01):" in built, "built html lost V31 F-01 merge branch"
    assert "__v20.importFile(imp)" in built, "built html lost V31 C9 importFile(imp)"
    assert "VERSION='16.3.0'" in built, "built html lost V31 version 16.3.0"
    assert built.count("bad-version") == 2, f"built html: 'bad-version' present {built.count('bad-version')}x, expected 2"
    # V33 fragments still present (TOTAL_BOSSES is now 86, asserted below)
    for frag in V33_FRAGMENTS:
        assert frag in built, f"built html lost V33 fragment: {frag[:60]}"
    # V34 fragments still present
    for frag in V34_FRAGMENTS:
        assert frag in built, f"built html lost V34 fragment: {frag[:60]}"
    # V35 fragments present
    assert "var TOTAL_BOSSES=86;" in built, "built html: TOTAL_BOSSES is not 86"
    assert "var TOTAL_BOSSES=78;" not in built, "built html: stale TOTAL_BOSSES=78 remains"
    assert "else if(kk==='en35')" in built, "built html missing en35 merge branch"
    assert "v7.en35.quests" in built, "built html missing en35 hasProgress"
    assert "/* V35: SKYROOT SANCTUARY" in built, "built html missing V35 buildWords block"
    assert "b.zone==='skyroot'&&window.__v35&&__v35.bossUnlocked" in built, "built html missing skyroot unlock delegation"
    assert "__V35_DATA?__V35_DATA.bosses:[]" in built, "built html missing V35 allBosses"
    assert "skyrootGroupHTML()" in built, "built html missing Skyroot Library group"
    assert "kind:'skyroot'" in built, "built html missing skyroot weakness kind"
    assert "stone_wind" in built, "built html missing stone_wind (pet wind element)"
    # KO tabs line: v35kotab x1 after v33kotab; v33kotab/v27kotab/v23kotab still x1
    assert built.count('<button class="tab v35kotab"') == 1, "built index.html: KO v35kotab button missing/duplicated"
    assert built.count('<button class="tab v33kotab"') == 1, "built index.html: KO v33kotab button changed"
    assert built.count('<button class="tab v27kotab"') == 1, "built index.html: KO v27kotab button changed"
    assert built.count('<button class="tab v23kotab"') == 1, "built index.html: KO v23kotab button changed"
    assert '</button>\'+\'<button class="tab v35kotab"' in built, "built index.html: v35kotab not appended after v33kotab"
    # out-of-scope replacements absent
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"built index.html: out-of-scope marker {marker!r} present"
    # src/out/index copies agree on every replacement
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        for base in (src_dir, out):
            assert (base / fname).read_text(encoding="utf-8").count(replacement) == count, (
                f"{base}/{fname}: {label} count != {count}")
    # Skyroot art referenced by the data file is present in out/
    for bid in BOSS_PNGS:
        assert (out / "assets" / "bosses" / "v18" / (bid + ".png")).exists(), f"out/assets/bosses/v18/{bid}.png missing"
    for sp in PET_STAGES:
        for s in (1, 2, 3):
            assert (out / "assets" / "pets" / "v18" / f"v18_{sp}_s{s}.png").exists(), f"out/assets/pets/v18/v18_{sp}_s{s}.png missing"
    for eg in PET_EGGS:
        assert (out / "assets" / "pets" / "v18" / f"v18_egg_{eg}.png").exists(), f"out/assets/pets/v18/v18_egg_{eg}.png missing"
    _node_check(v35_js)
    _node_check(v35_data)
    for fname in touched:
        _node_check(src_dir / fname)
    _safe_copyfile(HERE / "build_v35.py", out / "build_v35.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V18.0, layer V35 injected last")
    print(f"V35: Skyroot Sanctuary — {len(ALL_REPLACEMENTS)} replacements (V19 x3, V18 x2, V21 x1, V20 x2, V15 x3, V17 x9, V25 x2, V34 x4, V23 x2, V23-data x2) + KO button + title")
    print("marker order OK: v35 last (styles + scripts), v35data before v35js; KO tabs line extended; out-of-scope markers absent")
    return 0


if __name__ == "__main__":
    sys.exit(main())
