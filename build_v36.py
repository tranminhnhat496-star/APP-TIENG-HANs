#!/usr/bin/env python3
"""Build V18.1 (BUG FIXES) from the pristine V18.0 build + the V36 layer.

V18.1 = V18.0 (Skyroot Sanctuary, layer V35) + layer V36
(src/v36.js + src/v36.css) + guarded build-script replacements
(see REPLACEMENTS below) + the V17-4 typo fix (54 occurrences x4 files)
+ the V34 probe-model fix (tools/v34/probe_v34.js).

WHAT THIS SCRIPT DOES (in order):
  0. Backs up every file it will touch into tools/v36/backup-v18.0/
     (src/ files have no other copy — the V18.0 ZIP only holds out/).
  1. Verifies the base is the pristine V18.0 build (hash + v35 markers
     present, v36 markers absent). REFUSES to run otherwise.
     PRE-PASS: every replacement anchor is checked (src files AND
     out/index.html) BEFORE any file is mutated, so a missing anchor
     fails the build without leaving a half-patched tree.
  2. Applies the replacements to the standalone src/*.js files
     (exact-match asserts, fails if an anchor is missing / duplicated /
     already applied). Deliberate count-2 pairs (same anchor +
     replacement in two files): R-WIND, R-V172F/G, R-F17, R-F13F/G.
  3. Mirrors the patched src files into out/ (copies must agree).
  4. Fixes the V17-4 typo 'NGHỀNGHIỆP' -> 'NGHỀ NGHIỆP' (54x each)
     in src/v17_a1a2.js + data/v17_a1a2.json + out/v17_a1a2.js (via the
     src mirror) + the inlined block in out/index.html (post-assembly
     text pass, count-asserted).
  5. Fixes the V34 probe model (tools/v34/probe_v34.js: oxford branch
     gains the diff filter the real wordPool applies) and mirrors it
     into out/tools/v34/probe_v34.js.
  6. Applies the same replacements to the inlined blocks in
     out/index.html (byte edits, exact-count asserts), plus the V18.1
     title and the V36 layer injection (style v36 + script v36js,
     LAST, before </body>). No new hub button, no new data file.
  7. Verifies: marker order (v36 last), v36 version 18.1.0,
     node --check on v36.js + every touched src file, typo count 0,
     old versions intact, V31/V32/V33/V34/V35 fragments still present,
     V36 fragments present, out-of-scope markers absent.

WHY SOME FIXES ARE BUILD-SCRIPT REPLACEMENTS (not runtime layer):
  v21 bossWinCount/summarizeSave, v15 speak, v18/v19 resolveLethal +
  healBoss + stone map + BREAK banner, v23 castSkillInFight, v27
  finishSession/endEarly, v33/v35 findSession, v18 koPool — all live in
  closure-local functions that a later layer cannot reach (callers use
  the closure-local bare names, never window.__vNN). A runtime wrapper
  is provably ineffective for these; the guarded replacement is the
  established pattern (build_v35.py made 37 of them). Each replacement
  carries a reason comment in the code it inserts.

RUN EXACTLY ONCE on a fresh V18.0 out/. NEVER re-run build_v33.py /
build_v34.py / build_v35.py (or any older build script) on a finished
build (they reorder layers — see the V32 skill notes).

Usage:  python3 build_v36.py [--out DIR] [--src DIR]
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

# Pristine V18.0 out/index.html (2,347,000 B) — verified before any edit.
V180_HASH = "eb7dcbdda825519ec597bb84d4e39e51be6b4be41bbfbe3fd66cc18d78a95568"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V18.0 — Skyroot Sanctuary — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V18.1 — Bug Fixes — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# --- V36 fix code blocks (inserted by the replacements below) ---
V36_RESOLVE_LETHAL_19 = (
    "function resolveLethal(Ff){\n"
    "  /* V36 (V17-2): a lethal team-skill blow must resolve the fight at\n"
    "     once. castSkillInFight() (v23) could drop a boss to 0 HP while\n"
    "     the fight stayed open — the next answers could even resurrect it\n"
    "     (healBoss) or LOSE a fight already won by damage. Mirrors the win\n"
    "     path of resolveUltimate(): identity-check the live fight, clear\n"
    "     the timer, clear the ultimate, set win, pay the reward once, save\n"
    "     + re-render. Returns true only when it resolved this fight. */\n"
    "  if(!Ff||Ff!==F||F.over)return false;\n"
    "  if(F.timer){clearInterval(F.timer);F.timer=null}\n"
    "  F.ultActive=false;F.hp=0;F.over='win';F.anim='defeat';F.answered=1;\n"
    "  winReward();save19();renderFight();return true;\n"
    "}\n"
)
V36_RESOLVE_LETHAL_18 = (
    "function resolveLethal(Ff){\n"
    "  /* V36 (V17-2): a lethal team-skill blow must resolve the fight at\n"
    "     once. castSkillInFight() (v23) could drop a boss to 0 HP while\n"
    "     the fight stayed open — the next answers could even resurrect it\n"
    "     (healBoss) or LOSE a fight already won by damage. Mirrors the win\n"
    "     path of the answer() final check: identity-check the live fight,\n"
    "     clear the timer, set win, pay the reward once, save + re-render.\n"
    "     (v18 has no ultimate phase, so no ultActive line.) Returns true\n"
    "     only when it resolved this fight. */\n"
    "  if(!Ff||Ff!==F||F.over)return false;\n"
    "  if(F.timer){clearInterval(F.timer);F.timer=null}\n"
    "  F.hp=0;F.over='win';F.anim='defeat';F.answered=1;\n"
    "  winReward();save18();renderFight();return true;\n"
    "}\n"
)
V36_KOPOOL_18 = (
    "function koPool(){\n"
    "  /* V36 (F16a): mirror v19 koCardsRaw() (V11.1 fix) — the KO question\n"
    "     pool must come from the SELECTED deck (S.deck) when that deck\n"
    "     holds >= 8 usable cards, else all cards. v18 never had this\n"
    "     scoping: every V10-arena KO fight asked from all cards, so the\n"
    "     V34 'selected deck' rule was false for the whole arena. */\n"
    "  var cards=[];try{cards=(S&&S.cards)||[]}catch(e){}\n"
    "  cards=cards.filter(function(c){return c&&c.h&&c.m});\n"
    "  var deck='';try{deck=(S&&S.deck)||''}catch(e){}\n"
    "  if(deck){\n"
    "    var dc=cards.filter(function(c){return c.d===deck});\n"
    "    if(dc.length>=8)return shuffle(dc);\n"
    "  }\n"
    "  return shuffle(cards);\n"
    "}\n"
)
V36_DISTRACTORS_18 = (
    "function distractorsKO(c,n){\n"
    "  /* V36 (F16a): distractors come from the same deck-scoped pool as\n"
    "     the questions (mirror v19, which reads koCardsRaw()). */\n"
    "  var pool=koPool().filter(function(x){return x.id!==c.id&&x.h&&x.m});\n"
    "  return shuffle(pool).slice(0,n);\n"
    "}\n"
)

REPLACEMENTS = [
    # --- V17-1: bossWinCount() + summarizeSave() ignore flat V18 wins ---
    ("R-V171-A", "v21.js",
     "    for(var id in b){ var r=b[id]||{}; if((r.en&&r.en.win)||(r.ko&&r.ko.win)) n++; }",
     "    for(var id in b){ var r=b[id]||{}; if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) n++; }",
     1),
    ("R-V171-B", "v21.js",
     "    for(var id in b){ var r=b[id]||{}; if((r.en&&r.en.win)||(r.ko&&r.ko.win)) wins++; }",
     "    for(var id in b){ var r=b[id]||{}; if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) wins++; }",
     1),
    # --- V17-3: Speaking Practice double-pay (+15 while the UI says +5) ---
    ("R-V173-SPEAK", "v15.js",
     "    M.result={ok:ok,text:ok?'Khớp tốt ('+Math.round(ratio*100)+'% từ đúng)! +5 XP':'Chưa khớp lắm ('+Math.round(ratio*100)+'% từ đúng). Hãy nghe mẫu và thử lại — đáp án: '+w.en};\n"
     "    if(ok){M.score++;gain15(5);mark15(true,w,'speak')}\n"
     "    else mark15(false,w,'speak');",
     "    var _sxp36=0;\n"
     "    if(ok){M.score++;_sxp36=mark15(true,w,'speak')}\n"
     "    else mark15(false,w,'speak');\n"
     "    M.result={ok:ok,text:ok?'Khớp tốt ('+Math.round(ratio*100)+'% từ đúng)! +'+_sxp36+' XP':'Chưa khớp lắm ('+Math.round(ratio*100)+'% từ đúng). Hãy nghe mẫu và thử lại — đáp án: '+w.en};",
     1),
    # --- WIND stone: Breeze Lynx (and the V11 wind boss Stormeagle)
    #     dropped no evolution stone on first win (no 'wind' key) ---
    ("R-WIND-18", "v18.js",
     "var _map={fire:'stone_fire',ice:'stone_ice',nature:'stone_nature',earth:'stone_nature',water:'stone_water',thunder:'stone_thunder',light:'stone_light',dark:'stone_dark',cosmic:'stone_light'}",
     "var _map={fire:'stone_fire',ice:'stone_ice',nature:'stone_nature',earth:'stone_nature',water:'stone_water',thunder:'stone_thunder',light:'stone_light',dark:'stone_dark',cosmic:'stone_light',wind:'stone_wind'}",
     1),
    ("R-WIND-19", "v19.js",
     "var _map={fire:'stone_fire',ice:'stone_ice',nature:'stone_nature',earth:'stone_nature',water:'stone_water',thunder:'stone_thunder',light:'stone_light',dark:'stone_dark',cosmic:'stone_light'}",
     "var _map={fire:'stone_fire',ice:'stone_ice',nature:'stone_nature',earth:'stone_nature',water:'stone_water',thunder:'stone_thunder',light:'stone_light',dark:'stone_dark',cosmic:'stone_light',wind:'stone_wind'}",
     1),
    # --- F-09: duplicate id 'v21email' (welcome button vs 3 inputs) ---
    ("R-F09A", "v21.js",
     'id="v21email" data-label="Đăng nhập bằng Email"',
     'id="v21emailbtn" data-label="Đăng nhập bằng Email"',
     1),
    ("R-F09B", "v21.js",
     "  on('v21email','click', function(){ showAuth('login'); });",
     "  on('v21emailbtn','click', function(){ showAuth('login'); });",
     1),
    # --- F-10: Escape listener accumulates (anonymous {once:true}) ---
    ("R-F10A", "v21.js",
     "function closeAccount(){ var m=$('#v21account'); if(m) m.remove(); }",
     "var _esc21=null;\nfunction closeAccount(){ if(_esc21){try{document.removeEventListener('keydown',_esc21)}catch(e){}_esc21=null;} var m=$('#v21account'); if(m) m.remove(); }",
     1),
    ("R-F10B", "v21.js",
     "  document.addEventListener('keydown', function esc21(ev){ if(ev.key==='Escape') closeAccount(); }, {once:true});",
     "  if(_esc21){try{document.removeEventListener('keydown',_esc21)}catch(e){}} _esc21=function(ev){ if(ev.key==='Escape') closeAccount(); }; document.addEventListener('keydown',_esc21);",
     1),
    # --- F-04: live icon 404s (flame.svg / moon.svg exist in assets/icons/v6/) ---
    # (OUT_ONLY_REPLACEMENTS below — v12.js/v14.js have no src/ copy.)
    # --- V35 overlay copy: Skyroot pets are NOT region-gated ---
    ("R-V35COPY", "v35.js",
     "Các boss, nhiệm vụ và thú Skyroot sẽ mở khi bạn thắng GEAR GOLEM bằng ",
     "Các boss và nhiệm vụ sẽ mở khi bạn thắng GEAR GOLEM bằng ",
     1),
    # --- F13: endEarly() records abandoned sessions as finished ---
    ("R-F13A", "v27.js",
     "function finishSession(){\n  if(!SES)return;",
     "function finishSession(partial){\n  if(!SES)return;",
     1),
    ("R-F13B", "v27.js",
     "  var rec={t:Date.now(),lang:SES.lang,total:answered,correct:SES.correct,wrong:SES.wrong,xp:SES.xp,",
     "  var rec={t:Date.now(),lang:SES.lang,partial:!!partial,total:answered,correct:SES.correct,wrong:SES.wrong,xp:SES.xp,",
     1),
    ("R-F13C", "v27.js",
     "      var doneAll=p.ids.length>0&&p.ids.every(function(id){return p.doneIds.indexOf(id)>=0});\n"
     "      p.goals.complete=doneAll;\n"
     "      p.goals.acc80=answered>0&&(SES.correct/answered>=0.8);\n"
     "      p.goals.weak5=weakFixed>=5;\n"
     "      if(doneAll)bonus=claimPlanBonus(SES.lang);",
     "      var doneAll=p.ids.length>0&&p.ids.every(function(id){return p.doneIds.indexOf(id)>=0});\n"
     "      /* V36 (F13): a PARTIAL (abandoned) session must not mark the plan\n"
     "         complete or pay the plan bonus — only finished sessions do. */\n"
     "      if(!partial)p.goals.complete=doneAll;\n"
     "      p.goals.acc80=answered>0&&(SES.correct/answered>=0.8);\n"
     "      p.goals.weak5=weakFixed>=5;\n"
     "      if(!partial&&doneAll)bonus=claimPlanBonus(SES.lang);",
     1),
    ("R-F13D", "v27.js",
     "  gem=claimStreak7(SES.lang); /* chuỗi 7 ngày: mọi buổi Smart đều có thể chạm mốc, chống nhận trùng bằng claimed */",
     "  if(!partial)gem=claimStreak7(SES.lang); /* chuỗi 7 ngày: mọi buổi Smart đều có thể chạm mốc, chống nhận trùng bằng claimed */",
     1),
    ("R-F13E", "v27.js",
     "function endEarly(){\n"
     "  if(!SES)return;\n"
     "  if(SES.phase==='main'&&SES.reask.length&&SES.idx>=SES.list.length){finishSession();return}\n"
     "  finishSession();\n"
     "}",
     "function endEarly(){\n"
     "  if(!SES)return;\n"
     "  /* V36 (F13): an early-ended session is PARTIAL unless it already\n"
     "     answered every question — finishSession(true) records it honestly\n"
     "     (rec.partial) and pays no plan/streak rewards, so quests cannot\n"
     "     complete and the plan bonus cannot pay for an abandoned session.\n"
     "     Done-ness is phase-aware: in 'reask' the list IS the reask list\n"
     "     (idx reset to 0 on entry); in 'main' the session is done only\n"
     "     when the main list is exhausted AND no reask questions remain. */\n"
     "  var _done36=(SES.phase==='reask')?(SES.idx>=SES.list.length):(SES.idx>=SES.list.length&&(!SES.reask||!SES.reask.length));\n"
     "  finishSession(!_done36);\n"
     "}",
     1),
    # findSession must skip partial records (v33 + v35 carry identical copies)
    ("R-F13F", "v33.js",
     "    if(!rec||rec.lang!=='en'||(rec.t||0)<startedAt)continue;",
     "    if(!rec||rec.partial||rec.lang!=='en'||(rec.t||0)<startedAt)continue;",
     1),
    ("R-F13G", "v35.js",
     "    if(!rec||rec.lang!=='en'||(rec.t||0)<startedAt)continue;",
     "    if(!rec||rec.partial||rec.lang!=='en'||(rec.t||0)<startedAt)continue;",
     1),
    # --- V17-2: lethal team skill leaves the fight unresolved ---
    ("R-V172A", "v19.js",
     "function resolveUltimate(){",
     V36_RESOLVE_LETHAL_19 + "function resolveUltimate(){",
     1),
    ("R-V172B", "v19.js",
     "    resolveUltimate:resolveUltimate},",
     "    resolveUltimate:resolveUltimate,resolveLethal:resolveLethal},",
     1),
    ("R-V172C", "v18.js",
     "function winReward(){\n  var b=F.boss,e=en18();",
     V36_RESOLVE_LETHAL_18 + "function winReward(){\n  var b=F.boss,e=en18();",
     1),
    ("R-V172D", "v18.js",
     "    fight:fight,close:close,next:next,en18:en18,legDiff:legDiff},",
     "    fight:fight,close:close,next:next,en18:en18,legDiff:legDiff,resolveLethal:resolveLethal},",
     1),
    ("R-V172E", "v23.js",
     "  if(r.ok&&r.dmg>0){\n"
     "    _fightF.hp=Math.max(0,(_fightF.hp||0)-r.dmg);\n"
     "    try{if(_fightF&&typeof _fightF.render==='function')_fightF.render()}catch(e){}\n"
     "  }",
     "  if(r.ok&&r.dmg>0){\n"
     "    _fightF.hp=Math.max(0,(_fightF.hp||0)-r.dmg);\n"
     "    try{if(_fightF&&typeof _fightF.render==='function')_fightF.render()}catch(e){}\n"
     "  }\n"
     "  /* V36 (V17-2): a lethal team skill must resolve the fight at once —\n"
     "     route through the engine's win path (resolveLethal) instead of\n"
     "     leaving a 0-HP boss \"alive\" for the next answers, which could\n"
     "     even resurrect it (healBoss) or lose a fight already won. */\n"
     "  if(_fightF&&_fightF.hp<=0&&!_fightF.over){\n"
     "    var _done36=false;\n"
     "    try{if(W.__v19&&__v19._test&&__v19._test.resolveLethal)_done36=__v19._test.resolveLethal(_fightF)}catch(e){}\n"
     "    if(!_done36){try{if(W.__v18&&__v18._test&&__v18._test.resolveLethal)_done36=__v18._test.resolveLethal(_fightF)}catch(e){}}\n"
     "  }",
     1),
    # healBoss must not resurrect a 0-HP boss (guards only F.over today)
    ("R-V172F", "v18.js",
     "function healBoss(n,msg){\n  if(!F||F.over)return;",
     "function healBoss(n,msg){\n  if(!F||F.over||F.hp<=0)return;",
     1),
    ("R-V172G", "v19.js",
     "function healBoss(n,msg){\n  if(!F||F.over)return;",
     "function healBoss(n,msg){\n  if(!F||F.over||F.hp<=0)return;",
     1),
    # --- F16a: v18 KO pool never reads the selected deck ---
    ("R-F16A1", "v18.js",
     "function koPool(){\n"
     "  var cards=[];try{cards=(S&&S.cards)||[]}catch(e){}\n"
     "  cards=cards.filter(function(c){return c&&c.h&&c.m});\n"
     "  return shuffle(cards);\n"
     "}",
     V36_KOPOOL_18.rstrip("\n"),
     1),
    ("R-F16A2", "v18.js",
     "function distractorsKO(c,n){\n"
     "  var cards=[];try{cards=(S&&S.cards)||[]}catch(e){}\n"
     "  var pool=cards.filter(function(x){return x.id!==c.id&&x.h&&x.m});\n"
     "  return shuffle(pool).slice(0,n);\n"
     "}",
     V36_DISTRACTORS_18.rstrip("\n"),
     1),
    # --- F17: BREAK banner quotes the pre-shield bonus on shielded bosses ---
    ("R-F17A", "v18.js",
     "    try{if(window.__v34){var _bb34=__v34.breakDmg(F);if(_bb34>0){dmg+=_bb34;F.banner=(F.banner?F.banner+' ':'')+'💥 BREAK! Điểm yếu bị phá vỡ! +'+_bb34+' sát thương!';}}}catch(e){}",
     "    try{if(window.__v34){var _bb34=__v34.breakDmg(F);if(_bb34>0){var _bd36=dmg;dmg+=_bb34;var _bq36=(F.shield>0)?(Math.ceil(dmg/2)-Math.ceil(_bd36/2)):_bb34;F.banner=(F.banner?F.banner+' ':'')+'💥 BREAK! Điểm yếu bị phá vỡ! +'+_bq36+' sát thương!';}}}catch(e){}",
     1),
    ("R-F17B", "v19.js",
     "    try{if(window.__v34){var _bb34=__v34.breakDmg(F);if(_bb34>0){dmg+=_bb34;F.banner=(F.banner?F.banner+' ':'')+'💥 BREAK! Điểm yếu bị phá vỡ! +'+_bb34+' sát thương!';}}}catch(e){}",
     "    try{if(window.__v34){var _bb34=__v34.breakDmg(F);if(_bb34>0){var _bd36=dmg;dmg+=_bb34;var _bq36=(F.shield>0)?(Math.ceil(dmg/2)-Math.ceil(_bd36/2)):_bb34;F.banner=(F.banner?F.banner+' ':'')+'💥 BREAK! Điểm yếu bị phá vỡ! +'+_bq36+' sát thương!';}}}catch(e){}",
     1),
]

ALL_REPLACEMENTS = REPLACEMENTS

# Files with NO standalone src/ copy (the V12/V14 layers live only in
# out/ + the inlined index.html blocks). Their fixes are applied to
# out/*.js directly + the inlined block — same exact-count asserts,
# no src mirror step.
OUT_ONLY_REPLACEMENTS = [
    # --- F-04: live icon 404s (flame.svg / moon.svg exist in assets/icons/v6/) ---
    ("R-F04A", "v14.js",
     "enIcon('flame.png')",
     "enIcon('flame.svg')",
     1),
    ("R-F04B", "v12.js",
     "icon:'moon.png'",
     "icon:'moon.svg'",
     1),
]

# V36 markers: must be ABSENT from the pristine V18.0 base, present after.
V36_MARKERS = [
    'id="v36"', 'id="v36js"', '__v36', "VERSION='18.1.0'",
    'v21emailbtn', '_esc21', '_sxp36', 'resolveLethal',
    'partial:!!partial', 'z-index:1600', 'z-index:1700',
    # NOTE: 'v34blocked' is NOT here — v34.js:191 already uses the
    # class for its out-of-scope blocked label. V36 reuses the class
    # on its own .v34bar bars (scoped .v34bar.v34blocked in v36.css).
]

# Distinctive strings that exist ONLY in work V36 does NOT do.
# They must be absent from the base and stay absent after the build.
OUT_OF_SCOPE_MARKERS = [
    "armV27Obs",        # observer scoping (F-05) — NOT fixed in V18.1
    "rearmObserver",    # observer lifecycle (F-07) — NOT fixed in V18.1
    "_speakXp",         # V29 name for the speak fix — V36 uses _sxp36
    "V29 (F-05)",       # V29 observer comment — NOT in V18.1
]

# V17-4 typo: 'NGHỀNGHIỆP' -> 'NGHỀ NGHIỆP' (54 occurrences per file).
TYPO_OLD = "NGHỀNGHIỆP"
TYPO_NEW = "NGHỀ NGHIỆP"
TYPO_FILES = ["src/v17_a1a2.js", "data/v17_a1a2.json"]
TYPO_COUNT = 54

# V34 probe-model fix: the oxford branch of poolOf() must apply the same
# diff filter the real wordPool applies (v18/v19 wordPool filters
# w.lv===b.diff for every boss). Without it the probe models the Oxford
# pool as all 3,396 words and misses v10_owl (B1, weakness
# 'clothes-and-accessories' has no B1 words in its real pool).
PROBE_FILE = "tools/v34/probe_v34.js"
PROBE_ANCHOR = "      else if(b.lib==='oxford') list=words.filter(function(x){ return (x.lib||[]).indexOf('oxford')>=0; });"
PROBE_REPLACEMENT = "      else if(b.lib==='oxford'){ list=words.filter(function(x){ return (x.lib||[]).indexOf('oxford')>=0; }); if(b.diff) list=list.filter(function(x){ return x.lv===b.diff; }); }"

# Files this build touches (for the pre-build backup + node --check).
TOUCHED_SRC = ["v12.js", "v14.js", "v15.js", "v17_a1a2.js", "v18.js", "v19.js",
               "v21.js", "v23.js", "v27.js", "v33.js", "v35.js"]

# V33 in-scope fragments (copied from package_v33.py) — must survive V18.1.
V33_FRAGMENTS = [
    "__V33_DATA.byId(id)",
    "b.zone==='chrono'&&window.__v33&&__v33.bossUnlocked",
    "b.id==='v17_geargolem'?90:",
    "F.boss.id!=='v17_geargolem'",
    "GEAR GOLEM hồi 10 HP",
    "__V33_DATA?__V33_DATA.bosses:[]",
    "startSession:startSession",
    "v7.en33.quests",
    "else if(kk==='en33')",
    "/* V33: CHRONO KINGDOM",
    "m33.regionClaimed={en:Math.max(rcL.en||0,rcC.en||0),ko:Math.max(rcL.ko||0,rcC.ko||0)}",
    "hit.acc>=QUEST_MIN_ACC",
    "QUEST_MIN_ACC=0.8",
]

# V34 in-scope fragments (copied from package_v34.py) — must survive V18.1.
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

# V35 in-scope fragments (copied from package_v35.py) — must survive V18.1.
V35_FRAGMENTS = [
    "__V35_DATA.byId(id)",
    "b.zone==='skyroot'&&window.__v35&&__v35.bossUnlocked",
    "__V35_DATA?__V35_DATA.bosses:[]",
    "var TOTAL_BOSSES=86;",
    "v7.en35.quests",
    "else if(kk==='en35')",
    "/* V35: SKYROOT SANCTUARY",
    "sc.lib==='skyroot'&&sc.set",
    "skyrootSets()",
    "skyrootGroupHTML()",
    "V.lib==='skyroot'&&V.set",
    "t.indexOf('Skyroot')>=0",
    "kind:'skyroot'",
    "stone_wind",
    "GEAR_GOLEM='v17_geargolem'",
]


# --- helpers (EPERM-safe pattern from build_v16.py, verbatim from build_v35.py) ---
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
    tmp_path = path.with_name(path.name + ".tmp36")
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
    v36_js = src_dir / "v36.js"
    v36_css = src_dir / "v36.css"
    assert v36_js.exists() and v36_css.exists(), "src/v36.js / src/v36.css missing"

    # --- 0. Back up every file this build will touch (src/ has no other copy) ---
    backup = ROOT / "tools" / "v36" / "backup-v18.0"
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
    for extra in [ROOT / "data" / "v17_a1a2.json", ROOT / PROBE_FILE,
                  out / "index.html", out / "tools" / "v34" / "probe_v34.js"]:
        if extra.exists():
            dst = backup / ("__".join(extra.relative_to(ROOT).parts))
            dst.parent.mkdir(parents=True, exist_ok=True)
            _safe_copyfile(extra, dst)
            assert _sha256(extra) == _sha256(dst), f"backup mismatch: {extra}"
            backed.append(str(extra))
    print(f"backup OK: {len(backed)} files into {backup}")

    # --- 1. Verify the base is pristine V18.0 ---
    index = out / "index.html"
    assert index.exists(), "out/index.html missing — run on a V18.0 build"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V180_HASH, f"base is not pristine V18.0: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v35"' in built and 'id="v35js"' in built and 'id="v35data"' in built, "V35 markers missing — not a V18.0 build"
    for m in V36_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V18.0 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    assert built.count(TYPO_OLD) == TYPO_COUNT, f"base index.html typo count {built.count(TYPO_OLD)}, expected {TYPO_COUNT}"
    print(f"verified pristine V18.0 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), typo x{TYPO_COUNT}")

    # --- 1b. PRE-PASS: check every anchor (src files + index.html)
    # before mutating anything, so a missing anchor fails cleanly.
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        p = src_dir / fname
        text = p.read_text(encoding="utf-8")
        assert text.count(anchor) == count, f"PRE-PASS {label}: {fname}: anchor found {text.count(anchor)}x, expected exactly {count}"
        assert replacement not in text, f"PRE-PASS {label}: {fname}: replacement already present — refusing to double-apply"
    for label, fname, anchor, replacement, count in OUT_ONLY_REPLACEMENTS:
        p = out / fname
        text = p.read_text(encoding="utf-8")
        assert text.count(anchor) == count, f"PRE-PASS {label}: out/{fname}: anchor found {text.count(anchor)}x, expected exactly {count}"
        assert replacement not in text, f"PRE-PASS {label}: out/{fname}: replacement already present — refusing to double-apply"
    groups_pre = {}
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS + OUT_ONLY_REPLACEMENTS:
        g = groups_pre.setdefault(anchor, {"replacement": replacement, "total": 0, "labels": []})
        assert g["replacement"] == replacement, f"PRE-PASS anchor shared with different replacement: {label}"
        g["total"] += count
        g["labels"].append(label)
    for anchor, g in groups_pre.items():
        n = orig_bytes.count(anchor.encode("utf-8"))
        assert n == g["total"], f"PRE-PASS index.html: {g['labels']} anchor found {n}x, expected {g['total']}"
    # typo pre-pass (src + data files)
    for rel in TYPO_FILES:
        p = ROOT / rel
        t = p.read_text(encoding="utf-8")
        assert t.count(TYPO_OLD) == TYPO_COUNT, f"PRE-PASS typo: {rel} has {t.count(TYPO_OLD)}x, expected {TYPO_COUNT}"
        assert TYPO_NEW not in t or t.count(TYPO_NEW) == 0, f"PRE-PASS typo: {rel} already fixed?"
    # probe pre-pass
    probe_p = ROOT / PROBE_FILE
    probe_t = probe_p.read_text(encoding="utf-8")
    assert probe_t.count(PROBE_ANCHOR) == 1, f"PRE-PASS probe: anchor found {probe_t.count(PROBE_ANCHOR)}x, expected 1"
    assert PROBE_REPLACEMENT not in probe_t, "PRE-PASS probe: replacement already present"
    print(f"pre-pass OK: {len(ALL_REPLACEMENTS) + len(OUT_ONLY_REPLACEMENTS)} replacements anchor-checked in src/out + index.html, typo x{TYPO_COUNT} x{len(TYPO_FILES) + 1} files, probe x1")

    # --- 2. Validate the V36 layer itself ---
    v36_js_t = v36_js.read_text(encoding="utf-8")
    v36_css_t = v36_css.read_text(encoding="utf-8")
    assert "</script>" not in v36_js_t.lower(), "v36.js contains </script>"
    assert "VERSION='18.1.0'" in v36_js_t and "__v36" in v36_js_t, "v36.js must expose __v36 18.1.0"
    assert "breakBarHTML" in v36_js_t and "blockedReason" in v36_js_t, "v36.js missing breakBarHTML wrapper"
    assert "__v34.breakBarHTML" in v36_js_t, "v36.js must wrap __v34.breakBarHTML"
    _stripped = _re.sub(r"/\*.*?\*/", "", v36_js_t, flags=_re.S)
    _stripped = _re.sub(r"//[^\n]*", "", _stripped)
    assert "window.S" not in _stripped, "v36.js must never use window.S (lexical let)"
    assert "localStorage" not in v36_js_t, "v36.js must not touch localStorage (no new key/schema)"
    for token in ("#v27hub", "#v23toast", "z-index:1600", "z-index:1700",
                  ".v15filters", ".v15x", ".v15pill", ".v15back", ".v34blocked"):
        assert token in v36_css_t, f"v36.css missing {token}"
    assert v36_css_t.strip(), "v36.css is empty"
    print(f"validated src/v36.js ({len(v36_js_t)} chars) + src/v36.css ({len(v36_css_t)} chars)")

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
    _safe_copyfile(v36_js, out / "v36.js")
    _safe_copyfile(v36_css, out / "v36.css")

    # --- 3b. Apply the out-only replacements to out/*.js directly ---
    for label, fname, anchor, replacement, count in OUT_ONLY_REPLACEMENTS:
        p = out / fname
        text = p.read_text(encoding="utf-8")
        assert text.count(anchor) == count, f"{label}: out/{fname}: anchor found {text.count(anchor)}x, expected exactly {count}"
        assert replacement not in text, f"{label}: out/{fname}: replacement already present — refusing to double-apply"
        _write_text_epersafe(p, text.replace(anchor, replacement))
        after = p.read_text(encoding="utf-8")
        assert after.count(replacement) == count, f"{label}: out/{fname}: replacement present {after.count(replacement)}x, expected {count}"
        print(f"applied {label} to out/{fname} (x{count})")

    # --- 4. Typo fix (V17-4) in src + data files; out/ via the src mirror ---
    for rel in TYPO_FILES:
        p = ROOT / rel
        t = p.read_text(encoding="utf-8")
        assert t.count(TYPO_OLD) == TYPO_COUNT, f"typo {rel}: found {t.count(TYPO_OLD)}x, expected {TYPO_COUNT}"
        _write_text_epersafe(p, t.replace(TYPO_OLD, TYPO_NEW))
        after = p.read_text(encoding="utf-8")
        assert after.count(TYPO_OLD) == 0 and after.count(TYPO_NEW) == TYPO_COUNT, f"typo {rel}: post-fix counts wrong"
        print(f"typo fixed in {rel} (x{TYPO_COUNT})")
    _safe_copyfile(src_dir / "v17_a1a2.js", out / "v17_a1a2.js")
    assert (out / "v17_a1a2.js").read_text(encoding="utf-8").count(TYPO_OLD) == 0, "out/v17_a1a2.js typo remains"

    # --- 5. Probe-model fix (workspace file + shipped copy) ---
    _write_text_epersafe(probe_p, probe_t.replace(PROBE_ANCHOR, PROBE_REPLACEMENT))
    after_probe = probe_p.read_text(encoding="utf-8")
    assert after_probe.count(PROBE_REPLACEMENT) == 1 and PROBE_ANCHOR not in after_probe, "probe fix not applied cleanly"
    _safe_copyfile(probe_p, out / "tools" / "v34" / "probe_v34.js")
    assert (out / "tools" / "v34" / "probe_v34.js").read_text(encoding="utf-8") == after_probe, "out/tools/v34/probe_v34.js mismatch"
    print("probe model fixed (oxford branch gains the diff filter)")

    # --- 6. Assemble the new index.html: replacements + title + V36 ---
    groups = {}
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS + OUT_ONLY_REPLACEMENTS:
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
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V18.0 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # V36 layer, LAST, before </body>
    body = orig_bytes.find(b"</body>")
    assert body != -1, "no </body> in index.html"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v36">\n'),
        ("file", v36_css),
        ("glue", b'\n</style>\n<script id="v36js">\n'),
        ("file", v36_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 6b. Typo fix inside the inlined block (post-assembly text pass) ---
    built_t = index.read_text(encoding="utf-8")
    assert built_t.count(TYPO_OLD) == TYPO_COUNT, f"built index.html typo count {built_t.count(TYPO_OLD)}, expected {TYPO_COUNT}"
    _write_text_epersafe(index, built_t.replace(TYPO_OLD, TYPO_NEW))
    built_t = index.read_text(encoding="utf-8")
    assert built_t.count(TYPO_OLD) == 0 and built_t.count(TYPO_NEW) == TYPO_COUNT, "built index.html typo post-fix counts wrong"
    print(f"typo fixed in built index.html (x{TYPO_COUNT})")

    # --- 7. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    # R-F04B's replacement pre-exists once in the base: the 'ghost'
    # village record (inlined V6 map data, index.html:2596) already uses
    # icon:'moon.svg'. The fixed v12.js occurrence is the second one.
    EXTRA_PREEXISTING = {"R-F04B": 1}
    for anchor, g in groups.items():
        extra = sum(EXTRA_PREEXISTING.get(lb, 0) for lb in g["labels"])
        assert built.count(g["replacement"]) == g["total"] + extra, (
            f"built index.html: {g['labels']} replacement present {built.count(g['replacement'])}x, expected {g['total'] + extra}")
        assert built.count(anchor) == 0 or anchor in g["replacement"], (
            f"built index.html: {g['labels']} anchor still present (replacement did not consume it)")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V18.1 title missing / V18.0 title remains"
    assert "window.__v36" in built and "VERSION='18.1.0'" in built, "built index.html missing __v36 18.1.0"
    # v36 markers are the LAST style/script markers before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v36", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v36", f"script marker order wrong: {script_ids}"
    assert built.find('id="v36js"') > built.find('id="v35js"'), "v36js is not after v35js"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0", "17.0.0", "17.1.0", "18.0.0"):
        assert ver in built, f"built html lost version {ver}"
    # V31/V32 fragments still present (spot-checks)
    assert "/* V31 (F-01):" in built, "built html lost V31 F-01 merge branch"
    assert "__v20.importFile(imp)" in built, "built html lost V31 C9 importFile(imp)"
    assert "VERSION='16.3.0'" in built, "built html lost V31 version 16.3.0"
    assert built.count("bad-version") == 2, f"built html: 'bad-version' present {built.count('bad-version')}x, expected 2"
    # V33/V34/V35 fragments still present
    for frag in V33_FRAGMENTS:
        assert frag in built, f"built html lost V33 fragment: {frag[:60]}"
    for frag in V34_FRAGMENTS:
        assert frag in built, f"built html lost V34 fragment: {frag[:60]}"
    for frag in V35_FRAGMENTS:
        assert frag in built, f"built html lost V35 fragment: {frag[:60]}"
    # V36 fragments present (exact counts where the string is unique)
    assert built.count("if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) n++;") == 1, "built html: V17-1 bossWinCount fix missing"
    assert built.count("if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) wins++;") == 3, "built html: V17-1 wins++ count != 3 (2 pre-existing: v20.js:327 + v31.js:373, + 1 V36 summarizeSave)"
    assert "v21emailbtn" in built and built.count("v21emailbtn") == 2, "built html: F-09 v21emailbtn count != 2"
    assert built.count('id="v21email"') == 3, "built html: F-09 inputs changed (expected exactly 3 id=\"v21email\")"
    assert "_esc21" in built, "built html: F-10 _esc21 missing"
    assert "_sxp36" in built, "built html: V17-3 _sxp36 missing"
    assert "gain15(5);mark15(true,w,'speak')" not in built, "built html: V17-3 double-pay line remains"
    assert "wind:'stone_wind'" in built and built.count("wind:'stone_wind'") == 2, "built html: wind stone count != 2"
    assert "partial:!!partial" in built, "built html: F13 partial flag missing"
    assert "resolveLethal" in built and built.count("function resolveLethal(Ff){") == 2, "built html: V17-2 resolveLethal definitions != 2"
    assert "Các boss và nhiệm vụ sẽ mở khi bạn thắng GEAR GOLEM bằng " in built, "built html: V35 copy fix missing"
    assert "Các boss, nhiệm vụ và thú Skyroot sẽ mở" not in built, "built html: stale V35 overlay copy remains"
    assert "enIcon('flame.svg')" in built and "enIcon('flame.png')" not in built, "built html: F-04 flame fix missing/stale"
    assert "icon:'moon.svg'" in built and "icon:'moon.png'" not in built, "built html: F-04 moon fix missing/stale"
    assert "z-index:1600" in built and "z-index:1700" in built, "built html: F-06 z-index fixes missing"
    assert "v34bar v34blocked" in built, "built html: F14/F16b blocked bar missing"
    assert built.count(TYPO_OLD) == 0, "built html: typo remains"
    # KO tabs line: no new button in V18.1; v35kotab/v33kotab still x1
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
    for label, fname, anchor, replacement, count in OUT_ONLY_REPLACEMENTS:
        assert (out / fname).read_text(encoding="utf-8").count(replacement) == count, (
            f"out/{fname}: {label} count != {count}")
    _node_check(v36_js)
    for fname in touched:
        _node_check(src_dir / fname)
    _node_check(src_dir / "v17_a1a2.js")
    for fname in ("v12.js", "v14.js"):
        _node_check(out / fname)
    _safe_copyfile(HERE / "build_v36.py", out / "build_v36.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V18.1, layer V36 injected last")
    print(f"V36: Bug Fixes — {len(ALL_REPLACEMENTS) + len(OUT_ONLY_REPLACEMENTS)} replacements (V21 x4, V15 x1, V18 x7, V19 x7, V23 x1, V27 x5, V33 x1, V35 x2, V14 x1, V12 x1) + typo x54 + probe fix + title")
    print("marker order OK: v36 last (styles + scripts), v36js after v35js; KO tabs line unchanged; out-of-scope markers absent")
    return 0


if __name__ == "__main__":
    sys.exit(main())
