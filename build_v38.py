#!/usr/bin/env python3
"""Build V18.3 (BOSS WORD SETS) from the pristine V18.2 build + the V38 layer.

V18.3 = V18.2 (Scope Banner Fix, layer V37) + layer V38 (src/v38.js + src/v38.css)
+ 6 guarded build-script replacements (see REPLACEMENTS below).

THE BUG (reported by Anh, diagnosed from source, reproduced in real
Chrome 157 with tools/v38/repro-v38.js BEFORE this build):
  The "Bộ từ đánh boss" picker (bossScopeHTML, src/v22.js:525, shown on
  the Bosses tab arena view and the Boss Map zone view, English fights
  only) offered only Basic Tactics: its lib dropdown had 3 options
  (Tất cả từ vựng / BT — Toàn bộ 24 Units / BT — Chọn Units…), the chips
  row always showed BT Units 1–24, and applyBossScope() only ever built
  {kind:'lib', lib:'bt', ...}. The scope engine already supports the
  other library sets (inScope15/wordsFiltered honor a1a2+topic,
  oxford+lesson, chrono/skyroot+set) — only this picker could not
  produce them. scopeName22() even returned the placeholder 'Bộ từ
  khác' for any non-BT scope.

THE FIX (picker UI only — no scope-engine / fight-engine / SRS / data change):
  R-V38-V17-EXPORTS: window.__v17 gains topics/lessons/topicName/
    scopeName (the Library's own data + naming, reused — not duplicated).
  R-V38-V22-SCOPENAME: scopeName22() delegates to __v17.scopeName()
    (same BT formatting as before, plus real names for a1a2/oxford/
    chrono/skyroot); 'Bộ từ khác' only for a scope the picker cannot make.
  R-V38-V22-HELPERS: new bossLibs/bossLibOf/bossTopics/bossLessons/
    bossChronoSets/bossSkyrootSets/bossTopicName + bossSubHTML (sub-picker
    per lib) + bossLibChange (re-render sub-picker on lib change) +
    bossSubPick (single-select chips) + bossSelectedSub.
  R-V38-V22-PICKER: bossScopeHTML() rebuilt — lib dropdown gains A1–A2,
    Oxford 3000, Chrono Kingdom, Skyroot Sanctuary (BT options kept);
    sub-picker per lib (19 topic chips / 136-lesson select / 4+4 set
    chips / BT 24-unit chips); type/status dropdowns shown ONLY for BT
    (the engine only honors them for BT: btMap + if(sc.lib==='bt'));
    pick-all row shown only for BT; round-trips any existing scope.
  R-V38-V22-APPLY: applyBossScope() builds the right scope per lib
    (a1a2+topic, oxford+lesson, chrono/skyroot+set, bt unchanged) and
    omits the sub-field for "Toàn bộ". BT still loads its lazy data via
    ensureData(); other libs apply immediately (clearing no longer waits
    for the BT download either).
  R-V38-V22-EXPORTS: __v22 gains scopeName22/bossLibChange/bossSubPick/
    bossSubHTML/bossSelectedSub.
  "Từ vựng của tôi" is NOT in the picker: custom words have no lib
  field (v15.js creates them without one), so no scope kind can select
  them — see CHANGELOG. The v18/v19 wordPool sc2 fallback still drops
  topic/lesson when a scoped pool has <8 words (it was written for BT
  only); no library scope the picker can produce is that small
  (Oxford lesson 25, A1–A2 topic >=68, Chrono/Skyroot set 60), so the
  fallback is unreachable here — noted as a known limit, not changed.

WHAT THIS SCRIPT DOES (in order):
  0. Backs up every file it will touch into tools/v38/backup-v18.2/
     (src/ files have no other copy — the V18.2 ZIP only holds out/).
  1. Verifies the base is the pristine V18.2 build (hash + v37 markers
     present, v38 markers absent). REFUSES to run otherwise.
     PRE-PASS: every replacement anchor is checked (src files AND
     out/index.html) BEFORE any file is mutated.
  2. Applies the 6 replacements to the standalone src/*.js files
     (exact-match asserts, fails if an anchor is missing / duplicated /
     already applied).
  3. Mirrors the patched src files into out/ (copies must agree).
  4. Applies the same replacements to the inlined blocks in
     out/index.html (byte edits, exact-count asserts), plus the V18.3
     title and the V38 layer injection (style v38 + script v38js,
     LAST, before </body>).
  5. Verifies: marker order (v38 last), v38 version 18.3.0,
     node --check on v38.js + every touched src file, old versions
     intact, V33/V34/V35/V36/V37 fragments still present, V38 fragments
     present, out-of-scope markers absent.

RUN EXACTLY ONCE on a fresh V18.2 out/. NEVER re-run build_v33.py /
build_v34.py / build_v35.py / build_v36.py / build_v37.py (or any older
build script) on a finished build (they reorder layers — see the V32
skill notes).

Usage:  python3 build_v38.py [--out DIR] [--src DIR]
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

# Pristine V18.2 out/index.html (2,361,084 B) — verified before any edit.
V182_HASH = "fe0ba353568039b8b4b1ac4df132789e5dd876cce33d756993c12600d7bcb065"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V18.2 — Scope Banner Fix — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V18.3 — Boss Word Sets — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

REPLACEMENTS = [
    ('R-V38-V17-EXPORTS', 'v17.js',
     '  reviewScopeKey:reviewScopeKey,reviewTopic:reviewTopic,reviewLesson:reviewLesson,',
     '  reviewScopeKey:reviewScopeKey,reviewTopic:reviewTopic,reviewLesson:reviewLesson,topics:topics,lessons:lessons,topicName:topicName,scopeName:scopeName,',
     1),
    ('R-V38-V22-SCOPENAME', 'v22.js',
     "function scopeName22(sc){\n  if(!sc||sc.kind!=='lib')return 'Tất cả từ vựng';\n  if(sc.lib!=='bt')return 'Bộ từ khác';\n  var u='';\n  if(sc.unit){var us=Array.isArray(sc.unit)?sc.unit:[sc.unit];\n    u=us.length===1?' · Unit '+us[0]:' · '+us.length+' Units';}\n  var t=sc.type?(sc.type==='word'?' · Từ đơn':' · Cụm từ'):'';\n  var s=sc.status?(sc.status==='unlearned'?' · Chưa thuộc':' · Cần ôn'):'';\n  return 'Basic Tactics'+u+t+s;\n}",
     "function scopeName22(sc){\n  if(!sc||sc.kind!=='lib')return 'Tất cả từ vựng';\n  /* V38 (V18.3): reuse the Library's scopeName() — it already names\n     every library set (A1–A2 topic, Oxford lesson, Chrono/Skyroot set,\n     BT units/type/status). Fall back to the local BT formatter when\n     __v17 is unavailable; 'Bộ từ khác' only for a scope this picker\n     cannot produce. */\n  try{var v17=V17();if(v17&&v17.scopeName){var n=v17.scopeName(sc);if(n)return n}}catch(e){}\n  if(sc.lib!=='bt')return 'Bộ từ khác';\n  var u='';\n  if(sc.unit){var us=Array.isArray(sc.unit)?sc.unit:[sc.unit];\n    u=us.length===1?' · Unit '+us[0]:' · '+us.length+' Units';}\n  var t=sc.type?(sc.type==='word'?' · Từ đơn':' · Cụm từ'):'';\n  var s=sc.status?(sc.status==='unlearned'?' · Chưa thuộc':' · Cần ôn'):'';\n  return 'Basic Tactics'+u+t+s;\n}",
     1),
    ('R-V38-V22-HELPERS', 'v22.js',
     '/* ---------- chọn bộ từ trước khi đánh boss ---------- */',
     '/* ---------- V38 (V18.3): chọn bộ từ đánh boss cho MỌI bộ Thư viện ----------\n   V18.2 trở về trước, picker chỉ có Basic Tactics. Các bộ còn lại\n   (A1–A2, Oxford, Chrono, Skyroot) đã có scope {kind:\'lib\',...} mà\n   engine V15 hỗ trợ (inScope15/wordsFiltered) — chỉ picker là không\n   tạo được chúng. "Từ vựng của tôi" KHÔNG có ở đây: từ tự thêm không\n   có trường lib (v15.js tạo custom words không kèm lib) nên không có\n   scope nào chọn được chúng. Loại từ (word/phrase) và trạng thái\n   (chưa thuộc/cần ôn) chỉ engine mới áp dụng cho BT (btMap + khối\n   if(sc.lib===\'bt\') trong inScope15/wordsFiltered) nên hai dropdown\n   đó chỉ hiện khi chọn BT. */\nfunction bossLibs(){\n  return [\n    {v:\'\',n:\'Tất cả từ vựng\'},\n    {v:\'a1a2\',n:\'A1–A2 Vocabulary\'},\n    {v:\'oxford\',n:\'Oxford 3000\'},\n    {v:\'chrono\',n:\'Chrono Kingdom\'},\n    {v:\'skyroot\',n:\'Skyroot Sanctuary\'},\n    {v:\'all\',n:\'Basic Tactics — Toàn bộ 24 Units\'},\n    {v:\'units\',n:\'Basic Tactics — Chọn Units…\'}\n  ];\n}\nfunction bossLibOf(sc){\n  if(!sc||sc.kind!==\'lib\')return \'\';\n  if(sc.lib===\'bt\')return sc.unit?\'units\':\'all\';\n  if(sc.lib===\'a1a2\'||sc.lib===\'oxford\'||sc.lib===\'chrono\'||sc.lib===\'skyroot\')return sc.lib;\n  return \'\';\n}\nfunction bossTopics(){try{var v17=V17();return v17&&v17.topics?v17.topics():[]}catch(e){return []}}\nfunction bossLessons(){try{var v17=V17();return v17&&v17.lessons?v17.lessons():[]}catch(e){return []}}\nfunction bossChronoSets(){try{var v17=V17();return v17&&v17.chronoSets?v17.chronoSets():[]}catch(e){return []}}\nfunction bossSkyrootSets(){try{var v17=V17();return v17&&v17.skyrootSets?v17.skyrootSets():[]}catch(e){return []}}\nfunction bossTopicName(id){try{var v17=V17();return v17&&v17.topicName?v17.topicName(id):id}catch(e){return id}}\n/* Vùng chọn con theo bộ. sc=null nghĩa là "toàn bộ" cho bộ đó. */\nfunction bossSubHTML(lib,sc){\n  if(!lib)return \'\';\n  if(lib===\'a1a2\'){\n    var ts=bossTopics();\n    if(!ts.length)return \'<p class="mute">Không tải được danh sách chủ đề — sẽ dùng toàn bộ A1–A2.</p>\';\n    var cur=sc&&sc.topic?sc.topic:null;\n    return \'<div class="v22chips" id="v22bs-chips">\'\n      +\'<button type="button" class="v15pill\'+(!cur?\' on\':\'\')+\'" data-all="1" onclick="__v22.bossSubPick(this)">Tất cả chủ đề</button>\'\n      +ts.map(function(g){\n        return \'<button type="button" class="v15pill\'+(cur===g.id?\' on\':\'\')+\'" data-t="\'+esc(g.id)+\'" title="\'+esc(g.name)+\' · \'+g.words.length+\' từ" onclick="__v22.bossSubPick(this)">\'+esc(g.name)+\'</button>\';\n      }).join(\'\')+\'</div>\';\n  }\n  if(lib===\'oxford\'){\n    var ls=bossLessons(),nums=ls.length?ls.map(function(x){return x.n}):[];\n    if(!nums.length){for(var i=1;i<=136;i++)nums.push(i)}\n    var curL=sc&&sc.lesson?sc.lesson:0;\n    return \'<div class="v22chips" id="v22bs-chips"><select class="v15sel" id="v22bs-lesson" aria-label="Chọn bài Oxford">\'\n      +\'<option value="">Toàn bộ \'+nums.length+\' bài</option>\'\n      +nums.map(function(n){return \'<option value="\'+n+\'"\'+(curL===n?\' selected\':\'\')+\'>Bài \'+n+\'</option>\'}).join(\'\')\n      +\'</select></div>\';\n  }\n  if(lib===\'chrono\'||lib===\'skyroot\'){\n    var sets=lib===\'chrono\'?bossChronoSets():bossSkyrootSets();\n    if(!sets.length)return \'<p class="mute">Không tải được danh sách bộ từ — sẽ dùng toàn bộ \'+(lib===\'chrono\'?\'Chrono Kingdom\':\'Skyroot Sanctuary\')+\'.</p>\';\n    var curS=sc&&sc.set?sc.set:null;\n    return \'<div class="v22chips" id="v22bs-chips">\'\n      +\'<button type="button" class="v15pill\'+(!curS?\' on\':\'\')+\'" data-all="1" onclick="__v22.bossSubPick(this)">Tất cả 4 bộ</button>\'\n      +sets.map(function(g){\n        return \'<button type="button" class="v15pill\'+(curS===g.id?\' on\':\'\')+\'" data-s="\'+esc(g.id)+\'" title="\'+esc(g.name)+\' · \'+g.words.length+\' từ" onclick="__v22.bossSubPick(this)">\'+esc(g.name)+\'</button>\';\n      }).join(\'\')+\'</div>\';\n  }\n  /* BT: giữ nguyên chips Unit 1–24 đa chọn (hành vi V18.2). */\n  var units=null,isBT=sc&&sc.kind===\'lib\'&&sc.lib===\'bt\';\n  if(sc&&sc.unit)units=Array.isArray(sc.unit)?sc.unit.slice():[sc.unit];\n  return \'<div class="v22chips" id="v22bs-chips">\'+BT_META.map(function(m){\n    var on=!isBT||!units||units.indexOf(m.n)>=0;\n    return \'<button class="v15pill \'+(on?\'on\':\'\')+\'" data-u="\'+m.n+\'" onclick="this.classList.toggle(\\\'on\\\')">Unit \'+m.n+\'</button>\';\n  }).join(\'\')+\'</div>\';\n}\n/* Đổi bộ trong dropdown: vẽ lại vùng chọn con (về "toàn bộ") và chỉ hiện\n   dropdown loại từ/trạng thái + nút chọn tất cả khi đang chọn BT. */\nfunction bossLibChange(){\n  var sel=document.querySelector(\'#v22bs-lib\');if(!sel)return;\n  var lib=sel.value||\'\';\n  var sub=document.querySelector(\'#v22bs-sub\');if(sub)sub.innerHTML=bossSubHTML(lib,null);\n  var isBT=(lib===\'all\'||lib===\'units\');\n  var ts=document.querySelector(\'#v22bs-ts\');if(ts)ts.style.display=isBT?\'\':\'none\';\n  var pa=document.querySelector(\'#v22bs-pickall\');if(pa)pa.style.display=isBT?\'\':\'none\';\n}\n/* Chọn một chip đơn chọn (chủ đề A1–A2 / bộ Chrono / bộ Skyroot). Bấm lại\n   chip đang chọn thì về "Tất cả". */\nfunction bossSubPick(el){\n  if(!el)return;\n  var chips=document.querySelectorAll(\'#v22bs-chips .v15pill\');\n  var wasOn=el.classList.contains(\'on\');\n  for(var i=0;i<chips.length;i++)chips[i].classList.remove(\'on\');\n  if(el.getAttribute(\'data-all\')){el.classList.add(\'on\');return}\n  if(!wasOn){el.classList.add(\'on\');return}\n  for(var j=0;j<chips.length;j++){if(chips[j].getAttribute(\'data-all\'))chips[j].classList.add(\'on\')}\n}\n/* Chip đơn chọn đang bật (bỏ qua nút "Tất cả"): trả về data-t / data-s. */\nfunction bossSelectedSub(attr){\n  var chips=document.querySelectorAll(\'#v22bs-chips .v15pill.on\');\n  for(var i=0;i<chips.length;i++){\n    if(chips[i].getAttribute(\'data-all\'))continue;\n    var val=chips[i].getAttribute(\'data-\'+attr);\n    if(val)return val;\n  }\n  return null;\n}\n\n/* ---------- chọn bộ từ trước khi đánh boss ---------- */',
     1),
    ('R-V38-V22-PICKER', 'v22.js',
     'function bossScopeHTML(){\n  var v=V15();if(!v)return \'\';\n  var sc=null;try{sc=v.en15().scope}catch(e){}\n  var isBT=sc&&sc.kind===\'lib\'&&sc.lib===\'bt\';\n  var units=isBT&&sc.unit?(Array.isArray(sc.unit)?sc.unit.slice():[sc.unit]):null;\n  var h=\'<div class="v22bscope"><b>🎧 Bộ từ đánh boss</b> <span class="mute">Chỉ áp dụng cho trận tiếng Anh — câu hỏi tiếng Hàn không đổi. <span id="v22bs-current">Đang chọn: <b>\'+esc(scopeName22(sc))+\'</b></span></span>\'\n    +\'<div class="acts">\'\n    +\'<select class="v15sel" id="v22bs-lib">\'\n    +\'<option value="">Tất cả từ vựng</option>\'\n    +\'<option value="all"\'+(isBT&&!sc.unit?\' selected\':\'\')+\'>Basic Tactics — Toàn bộ 24 Units</option>\'\n    +\'<option value="units"\'+(isBT&&sc.unit?\' selected\':\'\')+\'>Basic Tactics — Chọn Units…</option>\'\n    +\'</select>\'\n    +\'<select class="v15sel" id="v22bs-type">\'\n    +\'<option value="">Từ đơn + Cụm từ</option>\'\n    +\'<option value="word"\'+(isBT&&sc.type===\'word\'?\' selected\':\'\')+\'>Chỉ từ đơn</option>\'\n    +\'<option value="phrase"\'+(isBT&&sc.type===\'phrase\'?\' selected\':\'\')+\'>Chỉ cụm từ</option>\'\n    +\'</select>\'\n    +\'<select class="v15sel" id="v22bs-status">\'\n    +\'<option value="">Mọi trạng thái</option>\'\n    +\'<option value="unlearned"\'+(isBT&&sc.status===\'unlearned\'?\' selected\':\'\')+\'>Chỉ mục chưa thuộc</option>\'\n    +\'<option value="due"\'+(isBT&&sc.status===\'due\'?\' selected\':\'\')+\'>Chỉ mục cần ôn</option>\'\n    +\'</select>\'\n    +\'<button class="btn sm pri" onclick="__v22.applyBossScope()">Áp dụng</button></div>\'\n    +\'<div class="v22chips" id="v22bs-chips">\'+BT_META.map(function(m){\n      var on=!isBT||!units||units.indexOf(m.n)>=0;\n      return \'<button class="v15pill \'+(on?\'on\':\'\')+\'" data-u="\'+m.n+\'" onclick="this.classList.toggle(\\\'on\\\')">Unit \'+m.n+\'</button>\';\n    }).join(\'\')+\'</div>\'\n    +\'<div class="acts"><button class="btn sm" onclick="__v22.bossPickAll(true)">Chọn tất cả Units</button><button class="btn sm" onclick="__v22.bossPickAll(false)">Bỏ chọn tất cả</button></div>\'\n    +\'</div>\';\n  return h;\n}',
     'function bossScopeHTML(){\n  var v=V15();if(!v)return \'\';\n  var sc=null;try{sc=v.en15().scope}catch(e){}\n  var lib=bossLibOf(sc);\n  var isBT=(lib===\'all\'||lib===\'units\');\n  var h=\'<div class="v22bscope"><b>🎧 Bộ từ đánh boss</b> <span class="mute">Chỉ áp dụng cho trận tiếng Anh — câu hỏi tiếng Hàn không đổi. <span id="v22bs-current">Đang chọn: <b>\'+esc(scopeName22(sc))+\'</b></span></span>\'\n    +\'<div class="acts">\'\n    +\'<select class="v15sel" id="v22bs-lib" onchange="__v22.bossLibChange()">\'\n    +bossLibs().map(function(o){return \'<option value="\'+o.v+\'"\'+(lib===o.v?\' selected\':\'\')+\'>\'+o.n+\'</option>\'}).join(\'\')\n    +\'</select>\'\n    +\'<span id="v22bs-ts" style="display:\'+(isBT?\'\':\'none\')+\'">\'\n    +\'<select class="v15sel" id="v22bs-type">\'\n    +\'<option value="">Từ đơn + Cụm từ</option>\'\n    +\'<option value="word"\'+(isBT&&sc&&sc.type===\'word\'?\' selected\':\'\')+\'>Chỉ từ đơn</option>\'\n    +\'<option value="phrase"\'+(isBT&&sc&&sc.type===\'phrase\'?\' selected\':\'\')+\'>Chỉ cụm từ</option>\'\n    +\'</select>\'\n    +\'<select class="v15sel" id="v22bs-status">\'\n    +\'<option value="">Mọi trạng thái</option>\'\n    +\'<option value="unlearned"\'+(isBT&&sc&&sc.status===\'unlearned\'?\' selected\':\'\')+\'>Chỉ mục chưa thuộc</option>\'\n    +\'<option value="due"\'+(isBT&&sc&&sc.status===\'due\'?\' selected\':\'\')+\'>Chỉ mục cần ôn</option>\'\n    +\'</select></span>\'\n    +\'<button class="btn sm pri" onclick="__v22.applyBossScope()">Áp dụng</button></div>\'\n    +\'<div id="v22bs-sub">\'+bossSubHTML(lib,sc)+\'</div>\'\n    +\'<div class="acts" id="v22bs-pickall" style="display:\'+(isBT?\'\':\'none\')+\'"><button class="btn sm" onclick="__v22.bossPickAll(true)">Chọn tất cả Units</button><button class="btn sm" onclick="__v22.bossPickAll(false)">Bỏ chọn tất cả</button></div>\'\n    +\'</div>\';\n  return h;\n}',
     1),
    ('R-V38-V22-APPLY', 'v22.js',
     "function applyBossScope(){\n  var lib=(document.querySelector('#v22bs-lib')||{}).value||'';\n  var type=(document.querySelector('#v22bs-type')||{}).value||'';\n  var status=(document.querySelector('#v22bs-status')||{}).value||'';\n  var units=[];\n  var chips=document.querySelectorAll('#v22bs-chips .v15pill.on');\n  for(var i=0;i<chips.length;i++){var n=parseInt(chips[i].getAttribute('data-u'),10);if(n)units.push(n)}\n  ensureData().then(function(){\n    var v=V15();if(!v)return;\n    if(!lib){v.clearScope()}\n    else{\n      var sc={kind:'lib',lib:'bt'};\n      if(lib==='units'&&units.length&&units.length<24)sc.unit=units.length===1?units[0]:units;\n      if(type)sc.type=type;\n      if(status)sc.status=status;\n      v.setScope(sc);\n    }\n    var cur=document.querySelector('#v22bs-current');\n    if(cur)cur.innerHTML='Đang chọn: <b>'+esc(scopeName22(v.en15().scope))+'</b>';\n    pop22('Đã chọn bộ từ đánh boss: '+scopeName22(v.en15().scope));\n  }).catch(function(){pop22(DATA_ERR||'Không tải được dữ liệu Basic Tactics.')});\n}",
     "function applyBossScope(){\n  var lib=(document.querySelector('#v22bs-lib')||{}).value||'';\n  var v=V15();if(!v)return;\n  var sc=null;\n  if(lib==='a1a2'){\n    sc={kind:'lib',lib:'a1a2'};\n    var topic=bossSelectedSub('t');\n    if(topic)sc.topic=topic;\n  }else if(lib==='oxford'){\n    sc={kind:'lib',lib:'oxford'};\n    var lsEl=document.querySelector('#v22bs-lesson');\n    var lesson=lsEl?parseInt(lsEl.value,10):0;\n    if(lesson)sc.lesson=lesson;\n  }else if(lib==='chrono'||lib==='skyroot'){\n    sc={kind:'lib',lib:lib};\n    var set=bossSelectedSub('s');\n    if(set)sc.set=set;\n  }else if(lib==='all'||lib==='units'){\n    var type=(document.querySelector('#v22bs-type')||{}).value||'';\n    var status=(document.querySelector('#v22bs-status')||{}).value||'';\n    var units=[];\n    var chips=document.querySelectorAll('#v22bs-chips .v15pill.on');\n    for(var i=0;i<chips.length;i++){var u=parseInt(chips[i].getAttribute('data-u'),10);if(u)units.push(u)}\n    sc={kind:'lib',lib:'bt'};\n    if(lib==='units'&&units.length&&units.length<24)sc.unit=units.length===1?units[0]:units;\n    if(type)sc.type=type;\n    if(status)sc.status=status;\n  }\n  /* lib==='' (Tất cả từ vựng): sc giữ null -> bỏ chọn phạm vi. */\n  var done=function(){\n    if(sc)v.setScope(sc);else v.clearScope();\n    var cur=document.querySelector('#v22bs-current');\n    if(cur)cur.innerHTML='Đang chọn: <b>'+esc(scopeName22(v.en15().scope))+'</b>';\n    pop22('Đã chọn bộ từ đánh boss: '+scopeName22(v.en15().scope));\n  };\n  if(lib==='all'||lib==='units'){\n    ensureData().then(function(){done()}).catch(function(){pop22(DATA_ERR||'Không tải được dữ liệu Basic Tactics.')});\n  }else{\n    /* Các bộ Thư viện khác không cần dữ liệu BT — áp dụng ngay, kể cả\n       khi đang bỏ chọn (trước đây bỏ chọn cũng chờ tải BT xong). */\n    done();\n  }\n}",
     1),
    ('R-V38-V22-EXPORTS', 'v22.js',
     '  bossScopeHTML:bossScopeHTML,bossPickAll:bossPickAll,applyBossScope:applyBossScope,clearBossScope:clearBossScope,',
     '  bossScopeHTML:bossScopeHTML,bossPickAll:bossPickAll,applyBossScope:applyBossScope,clearBossScope:clearBossScope,scopeName22:scopeName22,bossLibChange:bossLibChange,bossSubPick:bossSubPick,bossSubHTML:bossSubHTML,bossSelectedSub:bossSelectedSub,',
     1),
]

ALL_REPLACEMENTS = REPLACEMENTS

# V38 markers: must be ABSENT from the pristine V18.2 base, present after.
V38_MARKERS = [
    'id="v38"', 'id="v38js"', '__v38', "VERSION='18.3.0'",
    'bossLibChange', 'bossSubPick', 'bossSelectedSub',
    'topics:topics,lessons:lessons,topicName:topicName,scopeName:scopeName,',
]

# Distinctive strings that exist ONLY in work V38 does NOT do.
OUT_OF_SCOPE_MARKERS = [
    "armV27Obs",        # observer scoping (F-05) — NOT fixed in V18.3
    "rearmObserver",    # observer lifecycle (F-07) — NOT fixed in V18.3
    "_speakXp",         # V29 name for the speak fix — V36 uses _sxp36
    "V29 (F-05)",       # V29 observer comment — NOT in V18.3
]

# Files this build touches (for the pre-build backup + node --check).
TOUCHED_SRC = ["v17.js", "v22.js"]

# V33/V34/V35/V36 in-scope fragments (spot-checks, copied from
# build_v36.py / package_v36.py) — must survive V18.3.
V33_FRAGMENTS = [
    "__V33_DATA.byId(id)",
    "b.zone==='chrono'&&window.__v33&&__v33.bossUnlocked",
    "b.id==='v17_geargolem'?90:",
    "GEAR GOLEM hồi 10 HP",
    "v7.en33.quests",
    "QUEST_MIN_ACC=0.8",
]
V34_FRAGMENTS = [
    "chronoSets()",
    "__v34.breakDmg(F)",
    "__v34.breakBarHTML",
    "try{if(window.__v27&&__v27.endEarly)__v27.endEarly()}catch(e){}",
    "noun:'n',verb:'v',adjective:'adj',adverb:'adv'",
]
V35_FRAGMENTS = [
    "__V35_DATA.byId(id)",
    "b.zone==='skyroot'&&window.__v35&&__v35.bossUnlocked",
    "var TOTAL_BOSSES=86;",
    "v7.en35.quests",
    "stone_wind",
    "GEAR_GOLEM='v17_geargolem'",
]
V37_FRAGMENTS = [
    "renderHub:renderHub",
    "if(v.renderHub)v.renderHub();else renderTab()",
    "goTab:goTab,goWeak:goWeak,render:render,",
    "__v27.render&&__v27.render()",
]
V36_FRAGMENTS = [
    "function resolveLethal(Ff){",
    "partial:!!partial",
    "wind:'stone_wind'",
    "_sxp36",
    "v21emailbtn",
    "z-index:1600",
    "z-index:1700",
]


# --- helpers (EPERM-safe pattern from build_v16.py, verbatim from build_v36.py) ---
def _cfr(fsrc, fdst, off, n):
    """Copy n bytes from fsrc@off to fdst via copy_file_range with retries."""
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
    tmp_path = path.with_name(path.name + ".tmp38")
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
    v38_js = src_dir / "v38.js"
    v38_css = src_dir / "v38.css"
    assert v38_js.exists() and v38_css.exists(), "src/v38.js / src/v38.css missing"

    # --- 0. Back up every file this build will touch (src/ has no other copy) ---
    backup = ROOT / "tools" / "v38" / "backup-v18.2"
    backup.mkdir(parents=True, exist_ok=True)
    backed = []
    for fname in TOUCHED_SRC:
        for base in (src_dir, out):
            p = base / fname
            if p.exists():
                dst = backup / (base.name + "__" + fname)
                _safe_copyfile(p, dst)
                assert _sha256(p) == _sha256(dst), f"backup mismatch: {p}"
                backed.append(str(p))
    for extra in [out / "index.html"]:
        if extra.exists():
            dst = backup / ("__".join(extra.relative_to(ROOT).parts))
            dst.parent.mkdir(parents=True, exist_ok=True)
            _safe_copyfile(extra, dst)
            assert _sha256(extra) == _sha256(dst), f"backup mismatch: {extra}"
            backed.append(str(extra))
    print(f"backup OK: {len(backed)} files into {backup}")

    # --- 1. Verify the base is pristine V18.2 ---
    index = out / "index.html"
    assert index.exists(), "out/index.html missing — run on a V18.2 build"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V182_HASH, f"base is not pristine V18.2: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v37"' in built and 'id="v37js"' in built, "V37 markers missing — not a V18.2 build"
    for m in V38_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V18.2 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    print(f"verified pristine V18.2 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v37 markers present, v38 absent")

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
    print(f"pre-pass OK: {len(ALL_REPLACEMENTS)} replacements anchor-checked in src + index.html")

    # --- 2. Validate the V38 layer itself ---
    v38_js_t = v38_js.read_text(encoding="utf-8")
    v38_css_t = v38_css.read_text(encoding="utf-8")
    assert "</script>" not in v38_js_t.lower(), "v38.js contains </script>"
    assert "VERSION='18.3.0'" in v38_js_t and "__v38" in v38_js_t, "v38.js must expose __v38 18.3.0"
    _stripped = _re.sub(r"/\*.*?\*/", "", v38_js_t, flags=_re.S)
    _stripped = _re.sub(r"//[^\n]*", "", _stripped)
    assert "window.S" not in _stripped, "v38.js must never use window.S (lexical let)"
    assert "localStorage" not in v38_js_t, "v38.js must not touch localStorage (no new key/schema)"
    assert v38_css_t.strip(), "v38.css is empty"
    print(f"validated src/v38.js ({len(v38_js_t)} chars) + src/v38.css ({len(v38_css_t)} chars)")

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
    _safe_copyfile(v38_js, out / "v38.js")
    _safe_copyfile(v38_css, out / "v38.css")

    # --- 4. Assemble the new index.html: replacements + title + V38 ---
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
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V18.2 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # V38 layer, LAST, before </body>
    # rfind, NOT find: see the v37.css "</body>" comment trap above.
    body = orig_bytes.rfind(b"</body>")
    assert body != -1, "no </body> in index.html"
    assert body > orig_bytes.rfind(b'id="v37js"'), "injection point is before v37js - wrong </body>"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v38">\n'),
        ("file", v38_css),
        ("glue", b'\n</style>\n<script id="v38js">\n'),
        ("file", v38_js),
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
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V18.3 title missing / V18.2 title remains"
    assert "window.__v38" in built and "VERSION='18.3.0'" in built, "built index.html missing __v38 18.3.0"
    # v38 markers are the LAST style/script markers before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v38", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v38", f"script marker order wrong: {script_ids}"
    assert built.find('id="v38js"') > built.find('id="v37js"'), "v38js is not after v37js"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0", "17.0.0", "17.1.0", "18.0.0", "18.1.0", "18.2.0"):
        assert ver in built, f"built html lost version {ver}"
    # V33/V34/V35/V36 fragments still present
    for frag in V33_FRAGMENTS:
        assert frag in built, f"built html lost V33 fragment: {frag[:60]}"
    for frag in V34_FRAGMENTS:
        assert frag in built, f"built html lost V34 fragment: {frag[:60]}"
    for frag in V35_FRAGMENTS:
        assert frag in built, f"built html lost V35 fragment: {frag[:60]}"
    for frag in V36_FRAGMENTS:
        assert frag in built, f"built html lost V36 fragment: {frag[:60]}"
    # V37 fragments still present (previous layer survives).
    for frag in V37_FRAGMENTS:
        assert frag in built, f"built html lost V37 fragment: {frag[:60]}"
    # V38 fragments present (exact counts where the string is unique).
    assert built.count("topics:topics,lessons:lessons,topicName:topicName,scopeName:scopeName,") == 1, "built html: R-V38-V17-EXPORTS missing"
    assert built.count("function bossLibChange(){") == 1, "built html: R-V38-V22-HELPERS (bossLibChange) missing"
    assert built.count("function bossSubHTML(lib,sc){") == 1, "built html: R-V38-V22-HELPERS (bossSubHTML) missing"
    assert built.count("function bossSubPick(el){") == 1, "built html: R-V38-V22-HELPERS (bossSubPick) missing"
    assert built.count("function bossSelectedSub(attr){") == 1, "built html: R-V38-V22-HELPERS (bossSelectedSub) missing"
    assert built.count('id="v22bs-lib" onchange="__v22.bossLibChange()"') == 1, "built html: R-V38-V22-PICKER lib onchange missing"
    assert built.count("{v:'oxford',n:'Oxford 3000'}") == 1, "built html: R-V38-V22-HELPERS bossLibs Oxford entry missing"
    assert built.count("bossSelectedSub('t')") == 1, "built html: R-V38-V22-APPLY a1a2 branch missing"
    assert built.count("bossSelectedSub('s')") == 1, "built html: R-V38-V22-APPLY chrono/skyroot branch missing"
    assert built.count("scopeName22:scopeName22,bossLibChange:bossLibChange,") == 1, "built html: R-V38-V22-EXPORTS missing"
    # KO tabs line: no new button in V18.3; v35kotab/v33kotab still x1
    assert built.count('<button class="tab v35kotab"') == 1, "built index.html: KO v35kotab button changed"
    assert built.count('<button class="tab v33kotab"') == 1, "built index.html: KO v33kotab button changed"
    # out-of-scope replacements absent
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"built index.html: out-of-scope marker {marker!r} present"
    # src/out/index copies agree on every replacement
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        for base in (src_dir, out):
            assert (base / fname).read_text(encoding="utf-8").count(replacement) == count, (
                f"{base}/{fname}: {label} count != {count}")
    _node_check(v38_js)
    for fname in touched:
        _node_check(src_dir / fname)
    _safe_copyfile(HERE / "build_v38.py", out / "build_v38.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V18.3, layer V38 injected last")
    print("V38: Boss Word Sets — 6 replacements (V17 x1, V22 x5) + title")
    print("marker order OK: v38 last (styles + scripts), v38js after v37js; KO tabs line unchanged; out-of-scope markers absent")
    return 0


if __name__ == "__main__":
    sys.exit(main())
