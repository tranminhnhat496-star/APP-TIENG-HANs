#!/usr/bin/env python3
"""Build V18.5 (BUG FIXES II) from the pristine V18.4 build + the V40 layer.

V18.5 = V18.4 (Korean Bosses, layer V39) + layer V40 (src/v40.js + src/v40.css)
+ 20 guarded build-script replacements (see REPLACEMENTS below).

THE REVIEW (Anh: "RÀ LỖI", 2026-11-20; three review passes — V39
regressions, the known-unfixed list from V18.1, whole-game scan; findings
in tools/v40/review-A-v39.md, review-B-known.md, review-C-scan.md):
  1 SEVERE (C-01), 2 MAJOR (C-02, B-8), 9 MINOR confirmed bugs, of which
  12 are fixed here. Every user-visible fix was reproduced in real Chrome
  157 on the pristine V18.4 base with tools/v40/repro-v40.js +
  repro-v40b.js BEFORE this build (R1 B-8, R2 C-02, R3 C-12, R4 A-F2,
  R5 C-04/C-05); C-01/C-07/C-10 were proved with Node vm harnesses in
  tools/v40/review-scratch/ (pure-logic merge/session bugs).

THE FIXES (no engine/fight/SRS/data change beyond the fixes themselves,
no schema change, no new save key):
  R-V40-V20-KO16 (C-01 SEVERE): v20_sync.js gains a ko16 merge branch —
    per-key MAX over levels (mirror the en branch); other ko16 keys
    fill-if-missing. Before, ko16 fell to newer-wins and dropped the
    older side's imported-word levels.
  R-V40-V20-PLAN (C-07 MINOR): v20_sync.js merges the Smart plan per
    language (same-day plans union ids/doneIds and OR the goals with
    complete recomputed from coverage; otherwise newer-wins per
    language). Before, the newer save's plan won for BOTH languages.
  R-V40-V23-SHIELD (C-02 MAJOR): v23.js castSkillInFight routes team-
    skill damage through the boss shield exactly like a correct answer
    (halved while the shield holds; the shield absorbs the dealt
    damage). The toast is corrected when the shield cuts the damage,
    and a non-lethal skill re-runs the owning engine's phase check
    (map bosses -> V19, arenas -> V18).
  R-V40-V18/V19-CHECKPHASE: checkPhase exposed on both engines' _test
    exports (V36 resolveLethal precedent) so v23 can call it.
  R-V40-V15-STARTMODE / REVIEWSTART / LEARNHTML (B-8 MAJOR): v15.js —
    a BT scope on a fresh load has no words attached yet (lazy BT data)
    and pickPool showed "no words". startMode/reviewStart load the data
    first (guarded against leaving the tab while loading); learnHTML
    prefetches it fire-and-forget while the user browses the learn tab
    with a BT scope active.
  R-V40-V18/V19-KOWARN + NEXT (A-F2 MINOR, A-N1 nit): the <8 KO warning
    banner is stored on F.koWarn at startFight (count computed once —
    koCount18()/koCount() re-shuffle the pool on every call) and next()
    restores it instead of clearing the banner.
  R-V40-V34-BREAKLABEL (A-F1 MINOR): the KO Break bar said "bộ từ
    tiếng Hàn đã chọn" while questions came from ALL Korean cards when
    the selected deck had <8 cards. It now says "từ tiếng Hàn của bạn".
    weakChipHTML is untouched (card-level context).
  R-V40-V18-COLLDETAIL (C-04 MINOR): collDetail reads en19 (en + ko
    wins summed) when b.zone is set. Old-arena wins live in
    en15().bosses and carry no wins count.
  R-V40-V18-ARENASBTN / COLLHEAD (C-05 MINOR): arenas button "(40
    boss)" -> live allBosses().length; Collection subtitle names
    Chrono Kingdom + Skyroot Sanctuary when tot19 > 70.
  R-V40-V18/V19-SC2 (C-06 MINOR): wordPool's scope relaxation keeps
    topic + lesson in sc2 (only status is relaxed now).
  R-V40-V27-FINISH (C-10 MINOR): finishSession moves acc80/weak5
    inside the if(!partial) guard (V36/F13 guarded complete + payouts
    only).
  R-V40-V22-APPLY (C-12 MINOR): applyBossScope refuses lib==='units'
    with no Unit chip on ("Chọn ít nhất 1 Unit.") instead of applying
    the whole BT library.
  Deliberately NOT changed: weakness table + legDiff() (coupled —
  fixing legDiff alone grows blocked 26→36); F-12 resetEN scope;
  farm harvest +35 vs +25 XP; bubble.png/shop.png icons; BT Listening
  Quest 0%-accuracy reward; pet-hatch safe-merge loss; .v20modal trap
  (accepted); F-05/F-07 observers incl. v33/v35 double-init (fix only
  on live perf proof); V9 word fixes; V14.1; "Từ vựng của tôi" picker.

WHAT THIS SCRIPT DOES (in order):
  0. Backs up every file it will touch into tools/v40/backup-v18.4/
     (src/ files have no other copy — the V18.4 ZIP only holds out/).
  1. Verifies the base is the pristine V18.4 build (hash + v39 markers
     present, v40 markers absent). REFUSES to run otherwise.
     PRE-PASS: every replacement anchor is checked (src files AND
     out/index.html) BEFORE any file is mutated.
  2. Applies the 20 replacements to the standalone src/*.js files
     (exact-match asserts, fails if an anchor is missing / duplicated /
     already applied).
  3. Mirrors the patched src files into out/ (copies must agree).
  4. Applies the same replacements to the inlined blocks in
     out/index.html (byte edits, exact-count asserts), plus the V18.5
     title and the V40 layer injection (style v40 + script v40js,
     LAST, before </body>).
  5. Verifies: marker order (v40 last), v40 version 18.5.0,
     node --check on v40.js + every touched src file, old versions
     intact, V33–V39 fragments still present, V40 fragments present,
     out-of-scope markers absent.

RUN EXACTLY ONCE on a fresh V18.4 out/. NEVER re-run build_v33.py /
build_v34.py / build_v35.py / build_v36.py / build_v37.py / build_v38.py
/ build_v39.py (or any older build script) on a finished build (they
reorder layers — see the V32 skill notes).

Usage:  python3 build_v40.py [--out DIR] [--src DIR]
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

# Pristine V18.4 out/index.html (2,377,535 B) — verified before any edit.
V184_HASH = "af3fee2961531da00e06ca6cbb01d25692cb326cd30e3b33288eb51837c938d5"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V18.4 — Korean Bosses — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V18.5 — Bug Fixes II — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

REPLACEMENTS = [
    ('R-V40-V20-KO16', 'v20_sync.js',
     "        else if(v7[kk]===undefined) v7[kk]=newer.v7[kk]!==undefined?newer.v7[kk]:older.v7[kk];",
     "        else if(kk==='ko16'){\n"
     "          /* V40 (C-01): ko16 = {levels:{cardId:level}} (Smart Import,\n"
     "             v16) had no merge branch and fell to newer-wins, dropping\n"
     "             the older side's imported-word levels (and downgrading\n"
     "             levels the newer save had not learned yet). Merge per-key\n"
     "             MAX like the en branch; other ko16 keys fill-if-missing. */\n"
     "          var l16k=(localS.v7&&localS.v7.ko16)||{}, c16k=(cloudS.v7&&cloudS.v7.ko16)||{};\n"
     "          var m16k={};\n"
     "          for(var k16k in l16k) m16k[k16k]=l16k[k16k];\n"
     "          for(var k16k2 in c16k){\n"
     "            if(k16k2==='levels') m16k.levels=maxMap(l16k.levels, c16k.levels);\n"
     "            else if(m16k[k16k2]===undefined) m16k[k16k2]=c16k[k16k2];\n"
     "          }\n"
     "          v7.ko16=m16k;\n"
     "        }\n"
     "        else if(v7[kk]===undefined) v7[kk]=newer.v7[kk]!==undefined?newer.v7[kk]:older.v7[kk];",
     1),
    ('R-V40-V20-PLAN', 'v20_sync.js',
     "          var n27p=(newer.v7&&newer.v7.en27)||{}, o27p=(older.v7&&older.v7.en27)||{};\n"
     "          m27.plan=n27p.plan!==undefined?n27p.plan:(o27p.plan||{en:{},ko:{}});",
     "          var n27p=(newer.v7&&newer.v7.en27)||{}, o27p=(older.v7&&older.v7.en27)||{};\n"
     "          /* V40 (C-07): the plan is per-language — merge en/ko\n"
     "             independently instead of taking the newer save's plan for\n"
     "             BOTH languages (the older side's plan + doneIds were\n"
     "             dropped). Same-day plans union ids/doneIds and OR the\n"
     "             goals (complete recomputed from coverage); otherwise\n"
     "             newer-wins per language. claimed stays unioned above, so\n"
     "             no double payment. */\n"
     "          (function(){\n"
     "            var np=n27p.plan||{}, op=o27p.plan||{};\n"
     "            var mp={};\n"
     "            ['en','ko'].forEach(function(lg){\n"
     "              var a=np[lg]||{}, b=op[lg]||{};\n"
     "              if(a.d&&b.d&&a.d===b.d){\n"
     "                var ids=Array.from(new Set([].concat(a.ids||[],b.ids||[])));\n"
     "                var done=Array.from(new Set([].concat(a.doneIds||[],b.doneIds||[])));\n"
     "                var gA=a.goals||{}, gB=b.goals||{};\n"
     "                var complete=ids.length>0&&ids.every(function(id){return done.indexOf(id)>=0});\n"
     "                mp[lg]={d:a.d,mins:Math.max(a.mins||0,b.mins||0),newN:Math.max(a.newN||0,b.newN||0),dueN:Math.max(a.dueN||0,b.dueN||0),weakN:Math.max(a.weakN||0,b.weakN||0),ids:ids,doneIds:done,goals:{complete:complete,acc80:!!(gA.acc80||gB.acc80),weak5:!!(gA.weak5||gB.weak5)}};\n"
     "              }else if(a.d){mp[lg]=a}\n"
     "              else if(b.d){mp[lg]=b}\n"
     "              else{mp[lg]={}}\n"
     "            });\n"
     "            m27.plan=mp;\n"
     "          })();",
     1),
    ('R-V40-V23-SHIELD', 'v23.js',
     "function castSkillInFight(){\n"
     "  if(!_fightF||!_fightF.pet)return;\n"
     "  var r=castTeamSkill(_fightF);\n"
     "  toast23(r.msg);\n"
     "  if(r.ok&&r.dmg>0){\n"
     "    _fightF.hp=Math.max(0,(_fightF.hp||0)-r.dmg);\n"
     "    try{if(_fightF&&typeof _fightF.render==='function')_fightF.render()}catch(e){}\n"
     "  }",
     "function castSkillInFight(){\n"
     "  if(!_fightF||!_fightF.pet)return;\n"
     "  var r=castTeamSkill(_fightF);\n"
     "  if(r.ok&&r.dmg>0){\n"
     "    /* V40 (C-02): team-skill damage goes through the boss shield\n"
     "       exactly like a correct answer (halved while the shield holds;\n"
     "       the shield absorbs the dealt damage). Before, it bypassed the\n"
     "       shield entirely — a 50-dmg skill hit a 30-shield boss for 50\n"
     "       while the shield stayed at 30. */\n"
     "    var dealt=r.dmg;\n"
     "    if((_fightF.shield||0)>0){dealt=Math.max(1,Math.ceil(r.dmg/2));_fightF.shield=Math.max(0,_fightF.shield-dealt)}\n"
     "    if(dealt<r.dmg)r.msg=r.msg.replace('Gây '+r.dmg+' sát thương','Gây '+dealt+' sát thương')+' (Khiên boss chặn một nửa.)';\n"
     "    _fightF.hp=Math.max(0,(_fightF.hp||0)-dealt);\n"
     "    try{if(_fightF&&typeof _fightF.render==='function')_fightF.render()}catch(e){}\n"
     "    /* A non-lethal skill can drop the boss below a phase threshold —\n"
     "       re-run the owning engine's phase check so P2/P3 (and the V19\n"
     "       Knowledge Counterattack) trigger at once, like a correct\n"
     "       answer does. Map bosses (b.zone) belong to V19, arenas to V18. */\n"
     "    if(_fightF.hp>0&&!_fightF.over){\n"
     "      try{\n"
     "        if(_fightF.boss&&_fightF.boss.zone){if(W.__v19&&__v19._test&&__v19._test.checkPhase)__v19._test.checkPhase()}\n"
     "        else if(W.__v18&&__v18._test&&__v18._test.checkPhase)__v18._test.checkPhase();\n"
     "      }catch(e){}\n"
     "    }\n"
     "  }\n"
     "  toast23(r.msg);",
     1),
    ('R-V40-V18-CHECKPHASE', 'v18.js',
     "fight:fight,close:close,next:next,en18:en18,legDiff:legDiff,resolveLethal:resolveLethal},",
     "fight:fight,close:close,next:next,en18:en18,legDiff:legDiff,resolveLethal:resolveLethal,checkPhase:checkPhase},",
     1),
    ('R-V40-V19-CHECKPHASE', 'v19.js',
     "resolveUltimate:resolveUltimate,resolveLethal:resolveLethal},",
     "resolveUltimate:resolveUltimate,resolveLethal:resolveLethal,checkPhase:checkPhase},",
     1),
    ('R-V40-V15-STARTMODE', 'v15.js',
     "function startMode(id){\n"
     "  HUB.mode=id;M={mode:id,q:0,score:0,total:0,answered:null,ok:null,started:Date.now()};",
     "function startMode(id){\n"
     "  /* V40 (B-8): a BT scope needs the lazy BT data (basic_tactics_\n"
     "     vocabulary.json, fetched by __v22.ensureData + attachBT). On a\n"
     "     fresh load the data is not attached yet and pickPool falls back\n"
     "     to \"no words\" — load it first, then start the mode. Guarded\n"
     "     against the user leaving the tab while loading. */\n"
     "  try{\n"
     "    var sc40=en15().scope;\n"
     "    if(sc40&&sc40.kind==='lib'&&sc40.lib==='bt'&&window.__v22&&__v22.ensureData&&!window.__V22_BT){\n"
     "      HUB.mode=id;\n"
     "      var b40=document.querySelector('#v15body');\n"
     "      if(b40)b40.innerHTML='<p class=\"mute\">Đang tải bộ từ Basic Tactics…</p>';\n"
     "      __v22.ensureData().then(function(){\n"
     "        if(HUB.mode!==id||HUB.tab!=='learn')return;\n"
     "        startMode(id);\n"
     "      }).catch(function(){\n"
     "        if(HUB.mode!==id||HUB.tab!=='learn')return;\n"
     "        HUB.mode=null;\n"
     "        var b=document.querySelector('#v15body');\n"
     "        if(b)b.innerHTML='<p class=\"mute\">Không tải được dữ liệu Basic Tactics. Thử mở Thư viện rồi quay lại.</p><div class=\"acts\"><button class=\"btn\" onclick=\"__v15.backToLearn()\">← Tất cả chế độ</button></div>';\n"
     "      });\n"
     "      return;\n"
     "    }\n"
     "  }catch(e){}\n"
     "  HUB.mode=id;M={mode:id,q:0,score:0,total:0,answered:null,ok:null,started:Date.now()};",
     1),
    ('R-V40-V15-REVIEWSTART', 'v15.js',
     "function reviewStart(weakOnly){\n"
     "  var e=en15(),now=Date.now();",
     "function reviewStart(weakOnly){\n"
     "  /* V40 (B-8): same lazy-BT guard as startMode — a BT scope on a\n"
     "     fresh load has no words attached yet; load the data first. */\n"
     "  try{\n"
     "    var sc40=en15().scope;\n"
     "    if(sc40&&sc40.kind==='lib'&&sc40.lib==='bt'&&window.__v22&&__v22.ensureData&&!window.__V22_BT){\n"
     "      pop15('Đang tải bộ từ Basic Tactics…');\n"
     "      __v22.ensureData().then(function(){reviewStart(weakOnly)}).catch(function(){pop15('Không tải được dữ liệu Basic Tactics.')});\n"
     "      return;\n"
     "    }\n"
     "  }catch(e){}\n"
     "  var e=en15(),now=Date.now();",
     1),
    ('R-V40-V15-LEARNHTML', 'v15.js',
     "function learnHTML(){\n"
     "  var e=en15();",
     "function learnHTML(){\n"
     "  /* V40 (B-8): prefetch the lazy BT data while the user is on the\n"
     "     learn tab with a BT scope active, so the mode they pick next\n"
     "     usually starts without waiting. Memoised + fire-and-forget. */\n"
     "  try{\n"
     "    var sc40=en15().scope;\n"
     "    if(sc40&&sc40.kind==='lib'&&sc40.lib==='bt'&&window.__v22&&__v22.ensureData&&!window.__V22_BT)__v22.ensureData().catch(function(){});\n"
     "  }catch(e){}\n"
     "  var e=en15();",
     1),
    ('R-V40-V18-KOWARN', 'v18.js',
     "  if(lang==='ko'&&koCount18()<8)\n"
     "    F.banner='⚠️ Bạn mới có '+koCount18()+'/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ.';",
     "  /* V40 (A-N1/A-F2): compute the count once (koCount18() re-shuffles\n"
     "     the pool on every call) and keep it on F.koWarn so next() can\n"
     "     restore the warning for the whole fight instead of clearing it. */\n"
     "  var _kc40=koCount18();\n"
     "  F.koWarn=null;\n"
     "  if(lang==='ko'&&_kc40<8)\n"
     "    F.banner=F.koWarn='⚠️ Bạn mới có '+_kc40+'/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ.';",
     1),
    ('R-V40-V19-KOWARN', 'v19.js',
     "  if(lang==='ko'&&koCount()<8)\n"
     "    F.banner='⚠️ Bạn mới có '+koCount()+'/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ.';",
     "  /* V40 (A-N1/A-F2): compute the count once (koCount() re-shuffles\n"
     "     the pool on every call) and keep it on F.koWarn so next() can\n"
     "     restore the warning for the whole fight instead of clearing it. */\n"
     "  var _kc40=koCount();\n"
     "  F.koWarn=null;\n"
     "  if(lang==='ko'&&_kc40<8)\n"
     "    F.banner=F.koWarn='⚠️ Bạn mới có '+_kc40+'/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ.';",
     1),
    ('R-V40-V18-NEXT', 'v18.js',
     "F.q++;F.banner=null;nextQ();renderFight();",
     "F.q++;F.banner=F.koWarn||null;nextQ();renderFight();",
     1),
    ('R-V40-V19-NEXT', 'v19.js',
     "F.q++;F.banner=null;nextQ();renderFight();",
     "F.q++;F.banner=F.koWarn||null;nextQ();renderFight();",
     1),
    ('R-V40-V34-BREAKLABEL', 'v34.js',
     "'<div class=\"v34breaklabel\">💥 Điểm yếu: bộ từ tiếng Hàn đã chọn — '+cur+'/'+max+'</div>';",
     "'<div class=\"v34breaklabel\">💥 Điểm yếu: từ tiếng Hàn của bạn — '+cur+'/'+max+'</div>';",
     1),
    ('R-V40-V18-COLLDETAIL', 'v18.js',
     "  var won=isWon(b),un=bossUnlocked(b);\n"
     "  var e=en18();\n"
     "  var rec=b.arena==='old'?null:(e.bosses[b.id]||null);",
     "  var won=isWon(b),un=bossUnlocked(b);\n"
     "  var e=en18();\n"
     "  /* V40 (C-04): map bosses keep wins in en19 (per language), not\n"
     "     en18 — read the right record so the detail can show the replay\n"
     "     count (en + ko wins summed). Old-arena wins live in\n"
     "     en15().bosses and carry no wins count, so they still show no\n"
     "     number. */\n"
     "  var rec=null;\n"
     "  if(b.zone){\n"
     "    try{var r19=window.__v19&&__v19.en19?__v19.en19().bosses[b.id]:null;\n"
     "      if(r19)rec={wins:((r19.en&&r19.en.wins)||0)+((r19.ko&&r19.ko.wins)||0)};}catch(e40){}\n"
     "  }else if(b.arena!=='old'){rec=e.bosses[b.id]||null;}",
     1),
    ('R-V40-V18-ARENASBTN', 'v18.js',
     "🏆 Xem Bộ Sưu Tập Boss (40 boss)",
     "🏆 Xem Bộ Sưu Tập Boss ('+allBosses().length+' boss)",
     1),
    ('R-V40-V18-COLLHEAD', 'v18.js',
     "  var h='<h3>🏆 Bộ Sưu Tập Boss — '+tot19+' boss</h3>'\n"
     "  +'<p class=\"mute\">Boss gốc (10), 30 boss đấu trường (V10)'+(tot19>40?' và 30 boss bản đồ (V11)':'')+'. Bấm vào một boss để xem chi tiết. Phần thưởng lần đầu chỉ nhận một lần.</p>'",
     "  var h='<h3>🏆 Bộ Sưu Tập Boss — '+tot19+' boss</h3>'\n"
     "  +'<p class=\"mute\">Boss gốc (10), 30 boss đấu trường (V10)'+(tot19>40?' và 30 boss bản đồ (V11)':'')+(tot19>70?' + 8 boss Chrono Kingdom (V17) và 8 boss Skyroot Sanctuary (V18)':'')+'. Bấm vào một boss để xem chi tiết. Phần thưởng lần đầu chỉ nhận một lần.</p>'",
     1),
    ('R-V40-V18-SC2', 'v18.js',
     "      /* phạm vi quá nhỏ (vd 'chỉ cần ôn' trên một Unit ít từ) — nới\n"
     "         bộ lọc trạng thái nhưng giữ nguyên lựa chọn Unit/loại từ */\n"
     "      var sc2={kind:'lib',lib:sc.lib,unit:sc.unit,type:sc.type,set:sc.set};",
     "      /* phạm vi quá nhỏ (vd 'chỉ cần ôn' trên một Unit ít từ) — nới\n"
     "         bộ lọc trạng thái nhưng giữ nguyên lựa chọn Unit/chủ đề/bài/loại từ (V40: topic/lesson trước đây bị rơi) */\n"
     "      var sc2={kind:'lib',lib:sc.lib,unit:sc.unit,type:sc.type,set:sc.set,topic:sc.topic,lesson:sc.lesson};",
     1),
    ('R-V40-V19-SC2', 'v19.js',
     "      /* phạm vi quá nhỏ (vd 'chỉ cần ôn' trên một Unit ít từ) — nới\n"
     "         bộ lọc trạng thái nhưng giữ nguyên lựa chọn Unit/loại từ */\n"
     "      var sc2={kind:'lib',lib:sc.lib,unit:sc.unit,type:sc.type,set:sc.set};",
     "      /* phạm vi quá nhỏ (vd 'chỉ cần ôn' trên một Unit ít từ) — nới\n"
     "         bộ lọc trạng thái nhưng giữ nguyên lựa chọn Unit/chủ đề/bài/loại từ (V40: topic/lesson trước đây bị rơi) */\n"
     "      var sc2={kind:'lib',lib:sc.lib,unit:sc.unit,type:sc.type,set:sc.set,topic:sc.topic,lesson:sc.lesson};",
     1),
    ('R-V40-V27-FINISH', 'v27.js',
     "      /* V36 (F13): a PARTIAL (abandoned) session must not mark the plan\n"
     "         complete or pay the plan bonus — only finished sessions do. */\n"
     "      if(!partial)p.goals.complete=doneAll;\n"
     "      p.goals.acc80=answered>0&&(SES.correct/answered>=0.8);\n"
     "      p.goals.weak5=weakFixed>=5;",
     "      /* V36 (F13): a PARTIAL (abandoned) session must not mark the plan\n"
     "         complete or pay the plan bonus — only finished sessions do.\n"
     "         V40 (C-10): acc80/weak5 are plan goals like complete, so\n"
     "         they move inside the same guard; before, a partial session\n"
     "         ticked them. */\n"
     "      if(!partial){\n"
     "        p.goals.complete=doneAll;\n"
     "        p.goals.acc80=answered>0&&(SES.correct/answered>=0.8);\n"
     "        p.goals.weak5=weakFixed>=5;\n"
     "      }",
     1),
    ('R-V40-V22-APPLY', 'v22.js',
     "    var units=[];\n"
     "    var chips=document.querySelectorAll('#v22bs-chips .v15pill.on');\n"
     "    for(var i=0;i<chips.length;i++){var u=parseInt(chips[i].getAttribute('data-u'),10);if(u)units.push(u)}\n"
     "    sc={kind:'lib',lib:'bt'};",
     "    var units=[];\n"
     "    var chips=document.querySelectorAll('#v22bs-chips .v15pill.on');\n"
     "    for(var i=0;i<chips.length;i++){var u=parseInt(chips[i].getAttribute('data-u'),10);if(u)units.push(u)}\n"
     "    /* V40 (C-12): \"Bỏ chọn tất cả\" + Áp dụng previously applied the\n"
     "       WHOLE BT library — the opposite of what the button promised.\n"
     "       Refuse until at least one Unit is picked. (lib==='all' goes\n"
     "       through the same branch with no chips on purpose and is\n"
     "       unaffected — this guard only fires for 'units'.) */\n"
     "    if(lib==='units'&&!units.length){pop22('Chọn ít nhất 1 Unit.');return}\n"
     "    sc={kind:'lib',lib:'bt'};",
     1),
]

ALL_REPLACEMENTS = REPLACEMENTS

# V40 markers: must be ABSENT from the pristine V18.4 base, present after.
V40_MARKERS = [
    'id="v40"', 'id="v40js"', '__v40', "VERSION='18.5.0'",
    "else if(kk==='ko16'){",
    "F.koWarn",
    "checkPhase:checkPhase",
    "Chọn ít nhất 1 Unit.",
]

# Distinctive strings that exist ONLY in work V40 does NOT do.
OUT_OF_SCOPE_MARKERS = [
    "armV27Obs",        # observer scoping (F-05) — NOT fixed in V18.5
    "rearmObserver",    # observer lifecycle (F-07) — NOT fixed in V18.5
    "_speakXp",         # V29 name for the speak fix — V36 uses _sxp36
    "V29 (F-05)",       # V29 observer comment — NOT in V18.5
    # NOTE: legDiff() is NOT in this list — its buggy line is PRESENT in
    # the base and must STAY (V18.5 deliberately does not fix it; see
    # the positive assert in step 5 below).
]

# Files this build touches (for the pre-build backup + node --check).
TOUCHED_SRC = ["v15.js", "v18.js", "v19.js", "v20_sync.js", "v22.js", "v23.js", "v27.js", "v34.js"]

# V33/V34/V35/V36/V37/V38/V39 in-scope fragments (spot-checks, copied from
# build_v39.py / package_v39.py) — must survive V18.5.
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
V38_FRAGMENTS = [
    "topics:topics,lessons:lessons,topicName:topicName,scopeName:scopeName,",
    "function bossLibChange(){",
    "function bossSubHTML(lib,sc){",
    "function bossSubPick(el){",
    "function bossSelectedSub(attr){",
    'id="v22bs-lib" onchange="__v22.bossLibChange()"',
    "{v:'oxford',n:'Oxford 3000'}",
    "bossSelectedSub('t')",
    "bossSelectedSub('s')",
    "scopeName22:scopeName22,bossLibChange:bossLibChange,",
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
V39_FRAGMENTS = [
    # NOTE: two V39 fragments are INTENTIONALLY superseded by V40 and are
    # NOT in this list: "koCount18()<8" (the banner condition — V40
    # computes the count once into _kc40) and "F.banner='⚠️ Bạn mới có
    # '+koCount18()" (the banner text — V40 stores it on F.koWarn).
    # Their V40 successors are asserted in step 5 below.
    "function koCount18(){",
    "recordAnswer('ko',k.id,ok,'boss18')",
    "recordAnswer('ko',k.id,ok,'boss19')",
    "markKO(true,F.cur.k)",
    "markKO(false,F.cur.k)",
    "markKO19(ok,F.cur.k)",
    "markKO19(true,F.cur.k)",
    "markKO19(false,F.cur.k)",
]


# --- helpers (EPERM-safe pattern from build_v16.py, verbatim from build_v39.py) ---
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
    tmp_path = path.with_name(path.name + ".tmp40")
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
    v40_js = src_dir / "v40.js"
    v40_css = src_dir / "v40.css"
    assert v40_js.exists() and v40_css.exists(), "src/v40.js / src/v40.css missing"

    # --- 0. Back up every file this build will touch (src/ has no other copy) ---
    backup = ROOT / "tools" / "v40" / "backup-v18.4"
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

    # --- 1. Verify the base is pristine V18.4 ---
    index = out / "index.html"
    assert index.exists(), "out/index.html missing — run on a V18.4 build"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V184_HASH, f"base is not pristine V18.4: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v39"' in built and 'id="v39js"' in built, "V39 markers missing — not a V18.4 build"
    for m in V40_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V18.4 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    print(f"verified pristine V18.4 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v39 markers present, v40 absent")

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

    # --- 2. Validate the V40 layer itself ---
    v40_js_t = v40_js.read_text(encoding="utf-8")
    v40_css_t = v40_css.read_text(encoding="utf-8")
    assert "</script>" not in v40_js_t.lower(), "v40.js contains </script>"
    assert "VERSION='18.5.0'" in v40_js_t and "__v40" in v40_js_t, "v40.js must expose __v40 18.5.0"
    _stripped = _re.sub(r"/\*.*?\*/", "", v40_js_t, flags=_re.S)
    _stripped = _re.sub(r"//[^\n]*", "", _stripped)
    assert "window.S" not in _stripped, "v40.js must never use window.S (lexical let)"
    assert "localStorage" not in v40_js_t, "v40.js must not touch localStorage (no new key/schema)"
    assert v40_css_t.strip(), "v40.css is empty"
    print(f"validated src/v40.js ({len(v40_js_t)} chars) + src/v40.css ({len(v40_css_t)} chars)")

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
    _safe_copyfile(v40_js, out / "v40.js")
    _safe_copyfile(v40_css, out / "v40.css")

    # --- 4. Assemble the new index.html: replacements + title + V40 ---
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
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V18.4 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # V40 layer, LAST, before </body>
    # rfind, NOT find: see the v37.css "</body>" comment trap above.
    body = orig_bytes.rfind(b"</body>")
    assert body != -1, "no </body> in index.html"
    assert body > orig_bytes.rfind(b'id="v39js"'), "injection point is before v39js - wrong </body>"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v40">\n'),
        ("file", v40_css),
        ("glue", b'\n</style>\n<script id="v40js">\n'),
        ("file", v40_js),
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
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V18.5 title missing / V18.4 title remains"
    assert "window.__v40" in built and "VERSION='18.5.0'" in built, "built index.html missing __v40 18.5.0"
    # v40 markers are the LAST style/script markers before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v40", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v40", f"script marker order wrong: {script_ids}"
    assert built.find('id="v40js"') > built.find('id="v39js"'), "v40js is not after v39js"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0", "17.0.0", "17.1.0", "18.0.0", "18.1.0", "18.2.0", "18.3.0", "18.4.0"):
        assert ver in built, f"built html lost version {ver}"
    # V33–V39 fragments still present
    for frag in V33_FRAGMENTS:
        assert frag in built, f"built html lost V33 fragment: {frag[:60]}"
    for frag in V34_FRAGMENTS:
        assert frag in built, f"built html lost V34 fragment: {frag[:60]}"
    for frag in V35_FRAGMENTS:
        assert frag in built, f"built html lost V35 fragment: {frag[:60]}"
    for frag in V36_FRAGMENTS:
        assert frag in built, f"built html lost V36 fragment: {frag[:60]}"
    for frag in V37_FRAGMENTS:
        assert frag in built, f"built html lost V37 fragment: {frag[:60]}"
    for frag in V38_FRAGMENTS:
        assert frag in built, f"built html lost V38 fragment: {frag[:60]}"
    for frag in V39_FRAGMENTS:
        assert frag in built, f"built html lost V39 fragment: {frag[:60]}"
    # V40 fragments present (exact counts where the string is unique).
    assert built.count("else if(kk==='ko16'){") == 1, "built html: R-V40-V20-KO16 missing"
    assert built.count("m16k.levels=maxMap(l16k.levels, c16k.levels);") == 1, "built html: R-V40-V20-KO16 maxMap missing"
    assert built.count("m27.plan=n27p.plan!==undefined?n27p.plan:(o27p.plan||{en:{},ko:{}});") == 0, "built html: old C-07 plan line still present"
    # count 2: the new PLAN loop + the pre-existing streak loop just above
    # (m27.streak) uses the same ['en','ko'].forEach(function(lg){ shape.
    assert built.count("['en','ko'].forEach(function(lg){") == 2, "built html: R-V40-V20-PLAN merge loop missing"
    assert built.count("_fightF.hp=Math.max(0,(_fightF.hp||0)-r.dmg);") == 0, "built html: old C-02 raw damage still present"
    assert built.count("_fightF.hp=Math.max(0,(_fightF.hp||0)-dealt);") == 1, "built html: R-V40-V23-SHIELD missing"
    assert built.count("Khiên boss chặn một nửa.") == 1, "built html: R-V40-V23-SHIELD toast correction missing"
    assert built.count("checkPhase:checkPhase") == 2, "built html: R-V40 checkPhase exports != 2"
    assert built.count("if(sc40&&sc40.kind==='lib'&&sc40.lib==='bt'") == 3, "built html: R-V40 B-8 guards != 3 (startMode/reviewStart/learnHTML)"
    assert built.count("Đang tải bộ từ Basic Tactics") == 2, "built html: R-V40 B-8 loading states != 2"
    assert built.count("F.koWarn") >= 6, f"built html: F.koWarn present {built.count('F.koWarn')}x, expected >= 6"
    assert built.count("var _kc40=koCount18();") == 1, "built html: R-V40-V18-KOWARN missing"
    assert built.count("var _kc40=koCount();") == 1, "built html: R-V40-V19-KOWARN missing"
    assert built.count("F.banner=F.koWarn||null;") == 2, "built html: R-V40 next() restore != 2"
    assert built.count("F.q++;F.banner=null;") == 0, "built html: old next() banner-clear still present"
    assert built.count("F.banner='⚠️ Bạn mới có '+koCount18()") == 0, "built html: old V18 banner (3x koCount) still present"
    assert built.count("F.banner='⚠️ Bạn mới có '+koCount()") == 0, "built html: old V19 banner (3x koCount) still present"
    assert built.count("F.banner=F.koWarn='⚠️ Bạn mới có '+_kc40") == 2, "built html: R-V40 koWarn banner != 2"
    assert built.count("Điểm yếu: bộ từ tiếng Hàn đã chọn — '+cur") == 0, "built html: old A-F1 break label still present"
    assert built.count("Điểm yếu: từ tiếng Hàn của bạn — '+cur") == 1, "built html: R-V40-V34-BREAKLABEL missing"
    assert built.count("Điểm yếu: bộ từ tiếng Hàn đã chọn</span>") == 1, "built html: weakChipHTML label changed (must stay)"
    assert built.count("var rec=b.arena==='old'?null:(e.bosses[b.id]||null);") == 0, "built html: old C-04 collDetail still present"
    assert built.count("rec={wins:((r19.en&&r19.en.wins)||0)+((r19.ko&&r19.ko.wins)||0)}") == 1, "built html: R-V40-V18-COLLDETAIL missing"
    assert built.count("Xem Bộ Sưu Tập Boss (40 boss)") == 0, "built html: old C-05 arenas button still present"
    assert built.count("allBosses().length+' boss)") == 1, "built html: R-V40-V18-ARENASBTN missing"
    assert built.count("+ 8 boss Chrono Kingdom (V17) và 8 boss Skyroot Sanctuary (V18)") == 1, "built html: R-V40-V18-COLLHEAD missing"
    assert built.count("var sc2={kind:'lib',lib:sc.lib,unit:sc.unit,type:sc.type,set:sc.set};") == 0, "built html: old C-06 sc2 still present"
    assert built.count("topic:sc.topic,lesson:sc.lesson};") == 2, "built html: R-V40 sc2 topic/lesson != 2"
    assert built.count("if(!partial)p.goals.complete=doneAll;") == 0, "built html: old C-10 single-line guard still present"
    assert built.count("if(!partial){\n        p.goals.complete=doneAll;") == 1, "built html: R-V40-V27-FINISH missing"
    assert built.count("if(lib==='units'&&!units.length){pop22('Chọn ít nhất 1 Unit.');return}") == 1, "built html: R-V40-V22-APPLY missing"
    # Data counts unchanged by V40 (no data touched).
    assert built.count("lang:'both'") == 31, "built html: lang:'both' count != 31"
    assert built.count("lang:'en'") == 14, f"built html: lang:'en' count != 14"
    assert built.count("NGHỀNGHIỆP") == 0, "built html: NGHỀNGHIỆP typo back"
    # Deliberately UNCHANGED by V40 (needs Anh's decision): legDiff's
    # counts-getter bug stays exactly as it was in V18.4.
    assert built.count("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}") == 1, "built html: legDiff changed (out of scope for V18.5)"
    # KO entry buttons unchanged.
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
    _node_check(v40_js)
    for fname in touched:
        _node_check(src_dir / fname)
    _safe_copyfile(HERE / "build_v40.py", out / "build_v40.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V18.5, layer V40 injected last")
    print("V40: Bug Fixes II — 20 replacements (v20_sync x2, v23 x1, v18 x6, v19 x4, v15 x3, v27 x1, v22 x1, v34 x1) + title")
    print("marker order OK: v40 last (styles + scripts), v40js after v39js; KO tabs line unchanged; out-of-scope markers absent")
    return 0


if __name__ == "__main__":
    sys.exit(main())
