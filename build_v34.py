#!/usr/bin/env python3
"""Build V17.1 (CHRONO COMPLETION) from the pristine V17.0 build + the V34 layer.

V17.1 = V17.0 (Chrono Kingdom, layer V33) + layer V34
(src/v34.css + src/v34_data.js + src/v34.js) + guarded build-script
replacements (see REPLACEMENTS below). No new art, no new hub/KO
buttons, no new entry points, no localStorage key, no migration.

WHAT THIS SCRIPT DOES (in order):
  1. Verifies the base is the pristine V17.0 build (hash + v33 markers
     present, v34 markers absent). REFUSES to run otherwise.
  2. Applies the replacements to the standalone src/*.js files
     (exact-match asserts, fails the build if an anchor is missing /
     duplicated / already applied). Two anchors are SHARED between
     v18.js and v19.js (the sc2 fallback line and `var dealt=dmg;`)
     with byte-identical replacements — each file carries count 1 and
     the inlined index.html carries count 2 total (see the grouping
     logic in step 4).
  3. Mirrors the patched src files into out/ (copies must agree).
  4. Applies the same replacements to the inlined blocks in
     out/index.html (byte edits, exact-count asserts), plus the V17.1
     title and the V34 layer injection (style v34 + script v34data +
     script v34js, LAST, before </body>).
  5. Verifies: marker order (v34 last, v34data before v34js),
     v34 version 17.1.0, node --check on v34.js/v34_data.js + every
     touched src file, old versions intact, V31/V32/V33 fragments
     still present (V33 list copied from package_v33.py).

RUN EXACTLY ONCE on a fresh V17.0 out/. NEVER re-run build_v33.py
(or any older build script) on a finished build (they reorder layers
— see the V32 skill notes).

Usage:  python3 build_v34.py [--out DIR] [--src DIR]
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

# Pristine V17.0 out/index.html (2,190,956 B) — verified before any edit.
V170_HASH = "b04179cf05aca77295ac27f40b3aef9f46f6edab80a3e15489d428dc80a7951f"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V17.0 — Chrono Kingdom — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V17.1 — Chrono Complete — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# --- V17: Chrono library data + group helpers (appended after oxWords) ---
V34_V17_DATA = (
    "function chronoSetName(id){\n"
    "  var m={time:'Time & Calendar',space:'Space & Astronomy',machines:'Machines & Engineering',change:'Change & Sequence'};\n"
    "  return m[id]||id;\n"
    "}\n"
    "function chronoWords(){return WORDS().filter(function(w){return (w.lib||[]).indexOf('chrono')>=0})}\n"
    "function chronoSets(){\n"
    "  var order=['time','space','machines','change'],map={};\n"
    "  chronoWords().forEach(function(w){\n"
    "    var k=w.chronoSet||'time';\n"
    "    if(!map[k])map[k]={id:k,name:chronoSetName(k),words:[]};\n"
    "    map[k].words.push(w);\n"
    "  });\n"
    "  return order.filter(function(k){return map[k]}).map(function(k){return map[k]});\n"
    "}\n"
    "function chronoSetCard(g){\n"
    "  var s=statsOf(g.words);\n"
    "  var pct=s.total?Math.round(s.learned/s.total*100):0;\n"
    "  var ret='';\n"
    "  try{if(window.__v34&&__v34.setStats){var st=__v34.setStats(g.id);if(st&&st.attempts>0)ret=' · nhớ đúng '+st.retention;}}catch(e){}\n"
    "  return '<div class=\"v17card\"><div class=\"v17card-t\"><b>'+esc(g.name)+'</b><span class=\"mute\">'+g.words.length+' từ</span></div>'\n"
    "    +'<div class=\"v17bar\"><i style=\"width:'+pct+'%\"></i></div>'\n"
    "    +'<div class=\"mute\">'+s.learned+' đã học · '+s.mastered+' đã thuộc · '+s.due+' cần ôn'+ret+'</div>'\n"
    "    +'<div class=\"acts\"><button class=\"btn sm pri\" onclick=\"__v17.learnSet(\\''+g.id+'\\')\">Học ngay</button>'\n"
    "    +'<button class=\"btn sm\" onclick=\"__v17.reviewSet(\\''+g.id+'\\')\">Ôn tập</button>'\n"
    "    +'<button class=\"btn sm\" onclick=\"__v17.openSet(\\''+g.id+'\\')\">Xem từ</button></div></div>';\n"
    "}\n"
    "function chronoGroupHTML(){\n"
    "  var ws=chronoWords();\n"
    "  var s=statsOf(ws);\n"
    "  var pct=s.total?Math.round(s.learned/s.total*100):0;\n"
    "  var ret='';\n"
    "  try{if(window.__v34&&__v34.chronoAnalytics){var a=__v34.chronoAnalytics();if(a&&a.total&&a.total.attempts>0)ret=' · nhớ đúng '+a.total.retention;}}catch(e){}\n"
    "  return '<div class=\"v17group\"><div class=\"v17group-head\"><b>⏳ Chrono Kingdom — Vương Quốc Thời Gian</b><span class=\"mute\">'+ws.length+' từ · 4 bộ · trình độ B2</span></div>'\n"
    "    +'<p class=\"mute\">Từ vựng Vương Quốc Thời Gian (V17.0) — học xong mỗi bộ để nhận thưởng, dùng trong trận boss Chrono.</p>'\n"
    "    +'<div class=\"acts\"><button class=\"btn sm pri\" onclick=\"__v17.learnScopeKey(\\'chrono\\')\">Học ngay</button>'\n"
    "    +'<button class=\"btn sm\" onclick=\"__v17.reviewScopeKey(\\'chrono\\')\">Ôn tập</button>'\n"
    "    +'<button class=\"btn sm\" onclick=\"__v17.openLib(\\'chrono\\')\">Xem tất cả từ</button></div>'\n"
    "    +'<div class=\"mute\">Tổng: '+s.learned+' đã học · '+s.mastered+' đã thuộc · '+s.due+' cần ôn'+ret+'</div>'\n"
    "    +'<div class=\"v17bar\"><i style=\"width:'+pct+'%\"></i></div>'\n"
    "    +'<div class=\"v17grid\">'+chronoSets().map(chronoSetCard).join('')+'</div>'\n"
    "    +'<p class=\"mute\">Tiếng Hàn: Chưa có từ Chrono tiếng Hàn — từ Chrono hiện chỉ có bản tiếng Anh (kèm nghĩa tiếng Hàn hiển thị).</p></div>';\n"
    "}\n"
)

# Shared v18/v19 replacement: BREAK bonus, added AFTER damage is computed
# and BEFORE the shield-halving step (both engines use F + `var dealt=dmg;`).
V34_BREAK_DEALT = (
    "    try{if(window.__v34){var _bb34=__v34.breakDmg(F);if(_bb34>0){dmg+=_bb34;F.banner=(F.banner?F.banner+' ':'')+'💥 BREAK! Điểm yếu bị phá vỡ! +'+_bb34+' sát thương!';}}}catch(e){}\n"
    "    var dealt=dmg;"
)
# Shared v18/v19 replacement: scope fallback keeps the Chrono set filter.
V34_SC2 = "      var sc2={kind:'lib',lib:sc.lib,unit:sc.unit,type:sc.type,set:sc.set};"

REPLACEMENTS = [
    # --- V17: Library 5th group (Chrono) ---
    ("R-V34-V17-STATE", "v17.js",
     "var V={view:'home',lib:null,topic:null,lesson:0,q:'',pos:'',status:'all',page:0,oxPage:0,oxQ:'',oxPos:''};",
     "var V={view:'home',lib:null,topic:null,lesson:0,set:null,q:'',pos:'',status:'all',page:0,oxPage:0,oxQ:'',oxPos:''};",
     1),
    ("R-V34-V17-DATA", "v17.js",
     "function oxWords(){return WORDS().filter(function(w){return (w.lib||[]).indexOf('oxford')>=0})}",
     "function oxWords(){return WORDS().filter(function(w){return (w.lib||[]).indexOf('oxford')>=0})}\n" + V34_V17_DATA.rstrip("\n"),
     1),
    ("R-V34-V17-SCOPE", "v17.js",
     "  if(V.lib==='oxford')return V.lesson?{kind:'lib',lib:'oxford',lesson:V.lesson}:{kind:'lib',lib:'oxford'};",
     "  if(V.lib==='oxford')return V.lesson?{kind:'lib',lib:'oxford',lesson:V.lesson}:{kind:'lib',lib:'oxford'};\n"
     "  if(V.lib==='chrono')return V.set?{kind:'lib',lib:'chrono',set:V.set}:{kind:'lib',lib:'chrono'};",
     1),
    ("R-V34-V17-SCNAME", "v17.js",
     "  if(sc.lib==='oxford'){\n    if(sc.lesson)return 'Oxford 3000 · Bài '+sc.lesson;\n    return 'Oxford 3000';\n  }",
     "  if(sc.lib==='oxford'){\n    if(sc.lesson)return 'Oxford 3000 · Bài '+sc.lesson;\n    return 'Oxford 3000';\n  }\n"
     "  if(sc.lib==='chrono'){\n    if(sc.set)return 'Chrono · '+chronoSetName(sc.set);\n    return 'Chrono Kingdom';\n  }",
     1),
    ("R-V34-V17-REWARD", "v17.js",
     "  if(key.indexOf('a1a2:')===0)return {xp:50,gems:2};",
     "  if(key==='chrono:all')return {xp:200,gems:5};\n"
     "  if(key.indexOf('chrono:')===0)return {xp:50,gems:2};\n"
     "  if(key.indexOf('a1a2:')===0)return {xp:50,gems:2};",
     1),
    ("R-V34-V17-GROUP", "v17.js",
     "  /* Nhóm 3 — Basic Tactics for Listening (V22, dữ liệu tải lười) */",
     "  /* Nhóm 2b — Chrono Kingdom (V34, V17.1: 240 từ đã có từ V17.0) */\n"
     "  h+=chronoGroupHTML();\n"
     "  /* Nhóm 3 — Basic Tactics for Listening (V22, dữ liệu tải lười) */",
     1),
    ("R-V34-V17-LESSON", "v17.js",
     "  }else if(V.lib==='a1a2'){list=a1a2Words();title='A1–A2 Vocabulary';key='a1a2:all'}",
     "  }else if(V.lib==='chrono'&&V.set){\n"
     "    var gs=chronoSets().filter(function(x){return x.id===V.set})[0];\n"
     "    if(!gs)return '<p class=\"mute\">Không tìm thấy bộ từ này.</p><div class=\"acts\"><button class=\"btn\" onclick=\"__v17.goHome()\">← Thư viện</button></div>';\n"
     "    list=gs.words;title='Chrono · '+gs.name;key='chrono:'+V.set;\n"
     "  }else if(V.lib==='chrono'){list=chronoWords();title='Chrono Kingdom — Vương Quốc Thời Gian';key='chrono:all'}\n"
     "  else if(V.lib==='a1a2'){list=a1a2Words();title='A1–A2 Vocabulary';key='a1a2:all'}",
     1),
    ("R-V34-V17-WHERE", "v17.js",
     "  if(V.lib==='a1a2'&&!V.topic)where=topicName(w.a1a2Topic||w.t);",
     "  if(V.lib==='a1a2'&&!V.topic)where=topicName(w.a1a2Topic||w.t);\n"
     "  if(V.lib==='chrono'&&!V.set)where=chronoSetName(w.chronoSet);",
     1),
    ("R-V34-V17-ACTIONS", "v17.js",
     "function openLesson(n){V.view='lesson';V.lib='oxford';V.lesson=n;V.topic=null;V.q='';V.pos='';V.status='all';V.page=0;renderTab()}",
     "function openLesson(n){V.view='lesson';V.lib='oxford';V.lesson=n;V.topic=null;V.set=null;V.q='';V.pos='';V.status='all';V.page=0;renderTab()}\n"
     "function openSet(id){V.view='lesson';V.lib='chrono';V.set=id;V.topic=null;V.lesson=0;V.q='';V.pos='';V.status='all';V.page=0;renderTab()}\n"
     "function learnSet(id){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:'chrono',set:id});v.tab('learn')}\n"
     "function reviewSet(id){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:'chrono',set:id});reviewGo(false)}",
     1),
    ("R-V34-V17-EXPORTS", "v17.js",
     "  learnScopeKey:learnScopeKey,learnTopic:learnTopic,learnLesson:learnLesson,learnCurrent:learnCurrent,",
     "  learnScopeKey:learnScopeKey,learnTopic:learnTopic,learnLesson:learnLesson,learnCurrent:learnCurrent,learnSet:learnSet,openSet:openSet,reviewSet:reviewSet,chronoWords:chronoWords,chronoSets:chronoSets,",
     1),
    ("R-V34-V17-GOHOME", "v17.js",
     "function goHome(){V.view='home';V.lib=null;V.topic=null;V.lesson=0;V.q='';V.page=0;renderTab()}",
     "function goHome(){V.view='home';V.lib=null;V.topic=null;V.lesson=0;V.set=null;V.q='';V.page=0;renderTab()}",
     1),
    ("R-V34-V17-OPENLIB", "v17.js",
     "function openLib(lib){V.view='lesson';V.lib=lib;V.topic=null;V.lesson=0;V.q='';V.pos='';V.status='all';V.page=0;renderTab()}",
     "function openLib(lib){V.view='lesson';V.lib=lib;V.topic=null;V.lesson=0;V.set=null;V.q='';V.pos='';V.status='all';V.page=0;renderTab()}",
     1),
    ("R-V34-V17-OPENTOPIC", "v17.js",
     "function openTopic(id){V.view='lesson';V.lib='a1a2';V.topic=id;V.lesson=0;V.q='';V.pos='';V.status='all';V.page=0;renderTab()}",
     "function openTopic(id){V.view='lesson';V.lib='a1a2';V.topic=id;V.lesson=0;V.set=null;V.q='';V.pos='';V.status='all';V.page=0;renderTab()}",
     1),
    # --- V25: Chrono group progress bar ---
    ("R-V34-V25-KEY", "v25.js",
     "  if(t.indexOf('Basic Tactics')>=0)return 'bt';",
     "  if(t.indexOf('Basic Tactics')>=0)return 'bt';\n"
     "  if(t.indexOf('Chrono')>=0)return 'chrono';",
     1),
    ("R-V34-V25-STATS", "v25.js",
     "  if(key==='bt'){",
     "  if(key==='chrono'){\n"
     "    var listC=ws.filter(function(w){return (w.lib||[]).indexOf('chrono')>=0});\n"
     "    var sC=statsOf(listC);sC.total=listC.length;return sC;\n"
     "  }\n"
     "  if(key==='bt'){",
     1),
    # --- V15: chrono scope + original-10 weakness hooks ---
    ("R-V34-V15-INSCOPE", "v15.js",
     "  if(sc.lesson){\n    var ll=w.oxLessons||[];\n    if(ll.indexOf(sc.lesson)<0&&w.oxLesson!==sc.lesson)return false;\n  }",
     "  if(sc.lesson){\n    var ll=w.oxLessons||[];\n    if(ll.indexOf(sc.lesson)<0&&w.oxLesson!==sc.lesson)return false;\n  }\n"
     "  if(sc.lib==='chrono'&&sc.set){\n    if(w.chronoSet!==sc.set)return false;\n  }",
     1),
    ("R-V34-V15-WORDFILT", "v15.js",
     "      if(sc.lesson){\n        var ll=w.oxLessons||[];\n        if(ll.indexOf(sc.lesson)<0&&w.oxLesson!==sc.lesson)return false;\n      }",
     "      if(sc.lesson){\n        var ll=w.oxLessons||[];\n        if(ll.indexOf(sc.lesson)<0&&w.oxLesson!==sc.lesson)return false;\n      }\n"
     "      if(sc.lib==='chrono'&&sc.set){\n        if(w.chronoSet!==sc.set)return false;\n      }",
     1),
    ("R-V34-V15-INIT", "v15.js",
     "  B={boss:b,hp:b.hp,maxHp:b.hp,hearts:3,combo:0,score:0,q:0,skillUsed:false,over:null};",
     "  B={boss:b,hp:b.hp,maxHp:b.hp,hearts:3,combo:0,score:0,q:0,skillUsed:false,over:null};\n"
     "  /* V34: Boss Weakness — per-fight state only (no save change). */\n"
     "  try{if(window.__v34){B.weak=__v34.weakFor(b,'en');B.brk=0;B.brkMax=3}}catch(e){}",
     1),
    ("R-V34-V15-BIAS", "v15.js",
     "P.words[B.q%P.words.length]",
     "(window.__v34&&__v34.weakPick?__v34.weakPick(B,P.words,P.words[B.q%P.words.length]):P.words[B.q%P.words.length])",
     2),
    ("R-V34-V15-BREAK", "v15.js",
     "    B.hp-=dmg;B.hit=true;\n    if(B.cur.w)mark15(true,B.cur.w,'boss');\n    sfx15('ok');pop15((crit?'CHÍ MẠNG! -':'-')+dmg+' HP');",
     "    try{B._breakNote='';if(window.__v34){var _bb34=__v34.breakDmg(B);if(_bb34>0){dmg+=_bb34;B._breakNote='💥 BREAK! Điểm yếu bị phá vỡ! +'+_bb34+' sát thương!';}}}catch(e){}\n"
     "    B.hp-=dmg;B.hit=true;\n"
     "    if(B.cur.w)mark15(true,B.cur.w,'boss');\n"
     "    sfx15('ok');pop15((crit?'CHÍ MẠNG! -':'-')+dmg+' HP'+(B._breakNote?' · '+B._breakNote:''));",
     1),
    ("R-V34-V15-BAR", "v15.js",
     "  +'<div class=\"v15hpbar\"><i style=\"width:'+Math.max(0,B.hp/B.maxHp*100)+'%\"></i></div><span>HP '+Math.max(0,B.hp)+'/'+B.maxHp+'</span>'",
     "  +'<div class=\"v15hpbar\"><i style=\"width:'+Math.max(0,B.hp/B.maxHp*100)+'%\"></i></div><span>HP '+Math.max(0,B.hp)+'/'+B.maxHp+'</span>'"
     "+(window.__v34&&__v34.breakBarHTML?__v34.breakBarHTML(B):'')",
     1),
    ("R-V34-V15-CARD", "v15.js",
     "+esc(b.skill)+'</span><span>Thưởng: +'",
     "+esc(b.skill)+'</span>'+(window.__v34&&__v34.weakChipHTML?__v34.weakChipHTML(b):'')+'<span>Thưởng: +'",
     1),
    # --- V34-BUG-1 fix: Chrono POS normalisation at the merge point ---
    # v33_data.js ships LONG codes (noun/verb/adjective/adverb) but the
    # Library POS dropdown + shared hasPos() (v17.js) match EXACT short
    # codes (n/v/adj/adv), so every POS filter on Chrono words returned 0.
    # Normalise here, when the Chrono WORDS record is created, so WORDS
    # stays consistent (short codes everywhere). The shipped data file
    # and the shared filter are untouched; the attach-only branch above
    # never sets pos, so it needs no change. Multi-values pass through
    # part by part (e.g. "noun, verb" -> "n, v"); unknown values pass
    # through unchanged.
    ("R-V34-V15-POSNORM", "v15.js",
     "pos:a.pos||''",
     "pos:(function(p){var m={noun:'n',verb:'v',adjective:'adj',adverb:'adv'};return (p||'').split(',').map(function(x){var k=x.trim();return m[k]||k}).join(', ')})(a.pos)",
     1),
    # --- V19: UCE weakness hooks ---
    ("R-V34-V19-SC2", "v19.js",
     "      var sc2={kind:'lib',lib:sc.lib,unit:sc.unit,type:sc.type};",
     V34_SC2,
     1),
    ("R-V34-V19-INIT", "v19.js",
     "    enraged:false,nextTimer:0,nextVeil:false};",
     "    enraged:false,nextTimer:0,nextVeil:false};\n"
     "  /* V34: Boss Weakness — per-fight state only (no save change). */\n"
     "  try{if(window.__v34){F.weak=__v34.weakFor(b,lang);F.brk=0;F.brkMax=3}}catch(e){}",
     1),
    ("R-V34-V19-BIAS", "v19.js",
     "P2.words[F.q%P2.words.length]",
     "(window.__v34&&__v34.weakPick?__v34.weakPick(F,P2.words,P2.words[F.q%P2.words.length]):P2.words[F.q%P2.words.length])",
     2),
    ("R-V34-V19-BREAK", "v19.js",
     "    var dealt=dmg;",
     V34_BREAK_DEALT,
     1),
    ("R-V34-V19-BAR", "v19.js",
     "  +'<div class=\"v19hpbar\"><i style=\"width:'+Math.max(0,F.hp/F.maxHp*100)+'%\"></i></div><span>HP '+Math.max(0,F.hp)+'/'+F.maxHp+(F.shield>0?' · 🛡️ Lá chắn: '+F.shield:'')+'</span>'",
     "  +'<div class=\"v19hpbar\"><i style=\"width:'+Math.max(0,F.hp/F.maxHp*100)+'%\"></i></div><span>HP '+Math.max(0,F.hp)+'/'+F.maxHp+(F.shield>0?' · 🛡️ Lá chắn: '+F.shield:'')+'</span>'"
     "+(window.__v34&&__v34.breakBarHTML?__v34.breakBarHTML(F):'')",
     1),
    ("R-V34-V19-ZONECHIP", "v19.js",
     "      +'<p class=\"mute\">Kỹ năng: '+esc(b.skills.elem.n)+' · Tuyệt kỹ: '+esc(b.skills.ult.n)+'</p>'",
     "      +'<p class=\"mute\">Kỹ năng: '+esc(b.skills.elem.n)+' · Tuyệt kỹ: '+esc(b.skills.ult.n)+'</p>'\n"
     "      +(window.__v34&&__v34.weakChipHTML?__v34.weakChipHTML(b,lang):'')",
     1),
    # --- V18: arena weakness hooks (sc2 + dealt shared with V19) ---
    ("R-V34-V18-SC2", "v18.js",
     "      var sc2={kind:'lib',lib:sc.lib,unit:sc.unit,type:sc.type};",
     V34_SC2,
     1),
    ("R-V34-V18-INIT", "v18.js",
     "    timer:null,left:0,lastDmg:0,crit:false};",
     "    timer:null,left:0,lastDmg:0,crit:false};\n"
     "  /* V34: Boss Weakness — per-fight state only (no save change). */\n"
     "  try{if(window.__v34){F.weak=__v34.weakFor(b,lang);F.brk=0;F.brkMax=3}}catch(e){}",
     1),
    ("R-V34-V18-BIAS", "v18.js",
     "P.words[F.q%P.words.length]",
     "(window.__v34&&__v34.weakPick?__v34.weakPick(F,P.words,P.words[F.q%P.words.length]):P.words[F.q%P.words.length])",
     2),
    ("R-V34-V18-BREAK", "v18.js",
     "    var dealt=dmg;",
     V34_BREAK_DEALT,
     1),
    ("R-V34-V18-BAR", "v18.js",
     "  +'<div class=\"v18hpbar\"><i style=\"width:'+Math.max(0,F.hp/F.maxHp*100)+'%\"></i></div><span>HP '+Math.max(0,F.hp)+'/'+F.maxHp+(F.shield>0?' · 🛡️ Lá chắn: '+F.shield:'')+'</span>'",
     "  +'<div class=\"v18hpbar\"><i style=\"width:'+Math.max(0,F.hp/F.maxHp*100)+'%\"></i></div><span>HP '+Math.max(0,F.hp)+'/'+F.maxHp+(F.shield>0?' · 🛡️ Lá chắn: '+F.shield:'')+'</span>'"
     "+(window.__v34&&__v34.breakBarHTML?__v34.breakBarHTML(F):'')",
     1),
    ("R-V34-V18-COLLCARD", "v18.js",
     "  +'<span class=\"mute\">'+esc(b.zone?arenaName(b.zone):arenaName(b.arena))+' · Lv '+b.lv+' · HP '+b.hp+'</span>'",
     "  +'<span class=\"mute\">'+esc(b.zone?arenaName(b.zone):arenaName(b.arena))+' · Lv '+b.lv+' · HP '+b.hp+'</span>'\n"
     "  +(window.__v34&&__v34.weakChipHTML?__v34.weakChipHTML(b):'')",
     1),
    ("R-V34-V18-COLLDETAIL", "v18.js",
     "  +'<p><b>Kỹ năng:</b> '+(b.skill?esc(b.skill.n)+' — '+esc(b.skill.desc):esc(b.skills.elem.n)+' · Tuyệt kỹ: '+esc(b.skills.ult.n))+'</p>'",
     "  +'<p><b>Kỹ năng:</b> '+(b.skill?esc(b.skill.n)+' — '+esc(b.skill.desc):esc(b.skills.elem.n)+' · Tuyệt kỹ: '+esc(b.skills.ult.n))+'</p>'\n"
     "  +(window.__v34&&__v34.weakChipHTML?__v34.weakChipHTML(b):'')",
     1),
    # --- V33: Smart mid-flight guard ---
    ("R-V34-V33-GUARD", "v33.js",
     "function launchSession(ids,kind){\n  var v=V27();",
     "function launchSession(ids,kind){\n"
     "  /* V34: kết thúc buổi Smart đang chạy (nếu có) trước khi mở buổi\n"
     "     Chrono — endEarly() là no-op khi không có buổi nào, và ghi lại\n"
     "     buổi dở dang một cách trung thực (không thưởng hoàn thành kế\n"
     "     hoạch khi chưa học hết). */\n"
     "  try{if(window.__v27&&__v27.endEarly)__v27.endEarly()}catch(e){}\n"
     "  var v=V27();",
     1),
]

ALL_REPLACEMENTS = REPLACEMENTS

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

# V33 in-scope fragments (copied from package_v33.py) — must survive V17.1.
V33_FRAGMENTS = [
    "__V33_DATA.byId(id)",
    "b.zone==='chrono'&&window.__v33&&__v33.bossUnlocked",
    "b.id==='v17_geargolem'?90:",
    "F.boss.id!=='v17_geargolem'",
    "GEAR GOLEM hồi 10 HP",
    "__V33_DATA?__V33_DATA.bosses:[]",
    "var TOTAL_BOSSES=78;",
    "startSession:startSession",
    "v7.en33.quests",
    "else if(kk==='en33')",
    "/* V33: CHRONO KINGDOM",
    "m33.regionClaimed={en:Math.max(rcL.en||0,rcC.en||0),ko:Math.max(rcL.ko||0,rcC.ko||0)}",
    "hit.acc>=QUEST_MIN_ACC",
    "QUEST_MIN_ACC=0.8",
]

# --- helpers (EPERM-safe pattern from build_v16.py, verbatim from build_v33.py) ---
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
    tmp_path = path.with_name(path.name + ".tmp34")
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
    v34_js = src_dir / "v34.js"
    v34_css = src_dir / "v34.css"
    v34_data = src_dir / "v34_data.js"
    assert v34_js.exists() and v34_css.exists() and v34_data.exists(), "src/v34.js / src/v34.css / src/v34_data.js missing"

    # --- 1. Verify the base is pristine V17.0 ---
    index = out / "index.html"
    assert index.exists(), "out/index.html missing — run on a V17.0 build"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V170_HASH, f"base is not pristine V17.0: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v33"' in built and 'id="v33js"' in built and 'id="v33data"' in built, "V33 markers missing — not a V17.0 build"
    for m in ('id="v34"', 'id="v34js"', 'id="v34data"', '__v34', '__V34_DATA'):
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V17.0 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    print(f"verified pristine V17.0 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…)")

    # --- 2. Validate the V34 layer itself ---
    v34_js_t = v34_js.read_text(encoding="utf-8")
    v34_css_t = v34_css.read_text(encoding="utf-8")
    v34_data_t = v34_data.read_text(encoding="utf-8")
    assert "</script>" not in v34_js_t.lower(), "v34.js contains </script>"
    assert "</script>" not in v34_data_t.lower(), "v34_data.js contains </script>"
    assert "VERSION='17.1.0'" in v34_js_t and "__v34" in v34_js_t, "v34.js must expose __v34 17.1.0"
    assert "version:'17.1.0'" in v34_data_t and "__V34_DATA" in v34_data_t, "v34_data.js must expose __V34_DATA 17.1.0"
    for fn in ("weakFor", "weakMatch", "weakName", "breakBonus", "breakBarHTML",
               "breakDmg", "weakPick", "scopeBlocked", "koDeckSet",
               "weakChipHTML", "setStats", "chronoAnalytics", "koChronoStats"):
        assert fn in v34_js_t, f"v34.js missing {fn}"
    _stripped = _re.sub(r"/\*.*?\*/", "", v34_js_t, flags=_re.S)
    _stripped = _re.sub(r"//[^\n]*", "", _stripped)
    assert "window.S" not in _stripped, "v34.js must never use window.S (lexical let)"
    for token in ("--ui-text-secondary", "--ui-title-gold", "--ui-border", ".v34breakbar", ".v34breaklabel", ".v34weakchip"):
        assert token in v34_css_t, f"v34.css missing {token}"
    assert v34_css_t.strip(), "v34.css is empty"
    for bid in ("v17_sandwisp", "v17_pendulum", "v17_specter", "v17_mantis",
                "v17_hound", "v17_oracle", "v17_titan", "v17_geargolem"):
        assert bid in v34_data_t, f"v34_data.js missing explicit weakness for {bid}"
    for z in ("'z1':", "'z9':"):
        assert z in v34_data_t, f"v34_data.js missing zone weakness {z}"
    print(f"validated src/v34.js ({len(v34_js_t)} chars) + src/v34_data.js ({len(v34_data_t)} chars) + src/v34.css ({len(v34_css_t)} chars)")

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
    _safe_copyfile(v34_js, out / "v34.js")
    _safe_copyfile(v34_css, out / "v34.css")
    _safe_copyfile(v34_data, out / "v34_data.js")

    # --- 4. Assemble the new index.html: replacements + title + V34 ---
    # Two anchors are shared between v18.js and v19.js (sc2 fallback,
    # `var dealt=dmg;`) with byte-identical replacements: group by anchor
    # and expect the SUM of the per-file counts in index.html.
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
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V17.0 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # V34 layer, LAST, before </body>
    body = orig_bytes.find(b"</body>")
    assert body != -1, "no </body> in index.html"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v34">\n'),
        ("file", v34_css),
        ("glue", b'\n</style>\n<script id="v34data">\n'),
        ("file", v34_data),
        ("glue", b'\n</script>\n<script id="v34js">\n'),
        ("file", v34_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 5. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    for anchor, g in groups.items():
        assert built.count(g["replacement"]) == g["total"], (
            f"built index.html: {g['labels']} replacement present {built.count(g['replacement'])}x, expected {g['total']}")
        assert built.count(anchor) == 0 or anchor in g["replacement"], (
            f"built index.html: {g['labels']} anchor still present (replacement did not consume it)")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V17.1 title missing / V17.0 title remains"
    assert "window.__v34" in built and "VERSION='17.1.0'" in built, "built index.html missing __v34 17.1.0"
    assert "window.__V34_DATA" in built, "built index.html missing __V34_DATA"
    # v34 markers are the LAST style/script markers before </body>; data before js
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v34", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v34", f"script marker order wrong: {script_ids}"
    assert built.find('id="v34data"') < built.find('id="v34js"'), "v34data must load before v34js"
    assert built.find('id="v34js"') > built.find('id="v33js"'), "v34js is not after v33js"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0", "17.0.0"):
        assert ver in built, f"built html lost version {ver}"
    # V31/V32 fragments still present (spot-checks)
    assert "/* V31 (F-01):" in built, "built html lost V31 F-01 merge branch"
    assert "__v20.importFile(imp)" in built, "built html lost V31 C9 importFile(imp)"
    assert "VERSION='16.3.0'" in built, "built html lost V31 version 16.3.0"
    assert built.count("bad-version") == 2, f"built html: 'bad-version' present {built.count('bad-version')}x, expected 2"
    # V33 fragments still present
    for frag in V33_FRAGMENTS:
        assert frag in built, f"built html lost V33 fragment: {frag[:60]}"
    # out-of-scope replacements absent
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"built index.html: out-of-scope marker {marker!r} present"
    # src/out/index copies agree on every replacement
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        for base in (src_dir, out):
            assert (base / fname).read_text(encoding="utf-8").count(replacement) == count, (
                f"{base}/{fname}: {label} count != {count}")
    _node_check(v34_js)
    _node_check(v34_data)
    for fname in touched:
        _node_check(src_dir / fname)
    _safe_copyfile(HERE / "build_v34.py", out / "build_v34.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V17.1, layer V34 injected last")
    print(f"V34: Chrono Completion — {len(ALL_REPLACEMENTS)} replacements (V17 x13, V25 x2, V15 x8, V19 x6, V18 x7, V33 x1) + title")
    print("marker order OK: v34 last (styles + scripts), v34data before v34js; out-of-scope markers absent")
    return 0


if __name__ == "__main__":
    sys.exit(main())
