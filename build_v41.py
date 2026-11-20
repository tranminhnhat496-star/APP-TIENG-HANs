#!/usr/bin/env python3
"""Build V18.6 (BUG FIXES III) from the pristine V18.5 build + the V41 layer.

V18.6 = V18.5 (Bug Fixes II, layer V40) + layer V41 (src/v41.js +
src/v41.css) + 10 guarded build-script replacements (see REPLACEMENTS
below) + 1 index-only fix (F1 load()) + 4 JSON row removals (F4).

THE REVIEW (round 2, 2026-11-20; three passes on the V18.5 base —
V40 regressions, deep areas, playthroughs + 360px mobile; findings in
tools/v41/review-A-v40.md, review-B-deep.md, review-C-play.md):
  2 MAJOR regressions introduced by the V40 C-02 fix (R1+R2, one root
  cause), 4 MINOR confirmed bugs (F1–F4-partial), 1 MAJOR that needs
  Anh's decision (C-R2-1, NOT fixed here). Every user-visible fix was
  reproduced on the pristine V18.5 base BEFORE this build (R1/R2 in
  real Chrome 157 with tools/v41/review-scratch/verify-a-v40c.js;
  F1/F2/F3 in real Chrome 157 with verify-v41b2.js/verify-v41b3.js;
  F4 from the raw data with Node).

THE FIXES (no engine/fight/SRS/data change beyond the fixes
themselves, no schema change, no new save key):
  R-V41-V19-CA-ANSWER (R1 MAJOR): v19.js answer() takes the CA path
    ONLY when the current question IS a CA question (F.qmode starts
    with 'ca-'). Before, a team skill that dropped the boss to <=20%
    started the Counterattack while a normal question was still on
    screen, and answering it counted as a CA answer (caRight 4 after
    a perfect run -> resolveUltimate's 0/3 failure branch: -2 hearts,
    no reflect).
  R-V41-V19-CA-PICK (R1/R2 MAJOR): v19.js pick() uses the same CA
    gate with the qHTML fallback (F.caMode||F.qmode). Before, a
    grammar/read/builder question on screen when the CA started was
    evaluated under mode=undefined (caMode unset on the first CA) and
    threw TypeError reading optsVi/findIndex; buttons dead until the
    15 s CA timer expired.
  R-V41-V19-CA-PC (R1/R2 MAJOR): v19.js pickCorrect() AND pickWrong()
    (same anchor, count 2 — pickWrong is the same test hook with the
    same throw) use the same CA gate.
  R-V41-V19-CA-CLAMP (R1 belt-and-braces): resolveUltimate() clamps
    r=Math.min(3,F.caRight) so an out-of-range count can never fall
    into the 0/3 failure branch again.
  R-V41-INDEX-OPT (F1 MINOR, index-only): the V6 load() in
    out/index.html defaults j.opt when a stored save has cards but no
    opt. Before, boot threw TypeError (reading 'group') inside
    startSession and #app stayed empty on every boot.
  R-V41-V15-FARMQUIZ (F2 MINOR): farmPlotTap() removes any existing
    #v15farmquiz div before creating a new harvest quiz. Before, a
    second tap within the 1200 ms cleanup window created a duplicate
    id and the stale "Thu hoạch: dog?" card resurfaced.
  R-V41-V20-FLUSH (F3 MINOR): importFile() flushes the pending
    debounced save BEFORE taking the pre-restore snapshot. Before,
    the snapshot read localStorage and missed changes still inside
    the ~800 ms debounce window (undo restored stale bytes).
  R-V41-V15-FLUSH (F3 MINOR): backupImport() does the same flush
    (via __v20.flush) before its snapshot.
  R-V41-V41-NAV (C-R2-2 MINOR, CSS only): v41.css restores a minimum
    tab width at <=640px so the fixed bottom-nav row scrolls
    horizontally instead of crushing 11 labels into each other.
  R-V41-F4-AIRPLANE / R-V41-F4-EACHOTHER (F4-partial MINOR): drop
    exactly two zero-information-loss rows — the 2nd byte-identical
    'airplane' (A1-A2 VEHICLES, no 864) and the 2nd 'each other'
    (Oxford lesson 38, ord 942, empty pos). Patched in src/*.js,
    data/*.json, out/*.js (mirror), out/*.json (in place) and the
    inlined v17data block in out/index.html. Raw counts: A1-A2
    1000 -> 999, Oxford 3396 -> 3395; deduped WORDS unchanged
    (995 / 3393). 'may'/'May' and 'side' x2 are NOT touched (different
    meanings; IPA needs a decision).
  Deliberately NOT changed: C-R2-1 (KO boss correct answers pay 0 XP
    — needs Anh's decision: mirror the mark18 award in markKO/
    markKO19, or document KO answers as intentionally XP-free);
    legDiff() + weakness table; F-12 resetEN scope; farm harvest +35
    vs +25 XP; bubble.png/shop.png icons; C-03 BT Listening Quest 0%
    reward; C-08 pet-hatch safe-merge loss; "Từ vựng của tôi" picker;
    .v20modal trap; F-05/F-07 observers; V9 word fixes; V14.1;
    V16 Q1/Q2/Q4; V17 Q3/Q4/Q7/Q8; regex-fix; PR #7 cleanup.
  U2 (pre-existing, NOT changed): castSkillInFight's try{F.render()}
    line is a no-op (F.render is never defined) but the fight IS
    re-rendered at the end of castSkillInFight via __v18/__v19
    _petRefresh() -> renderFight(), and Chrome showed no HP/shield lag
    after a team skill, so the dead line was left alone.

WHAT THIS SCRIPT DOES (in order):
  0. Backs up every file it will touch into tools/v41/backup-v18.5/
     (src/ + data/ files have no other copy — the V18.5 ZIP only
     holds out/). Backup uses the EPERM-safe chunk writer (the host
     has intermittent EPERM write waves; plain cp/copy_file_range
     fails during a wave).
  1. Verifies the base is the pristine V18.5 build (hash + v40
     markers present, v41 markers absent). REFUSES to run otherwise.
     PRE-PASS: every replacement anchor is checked (src files AND
     out/index.html AND the JSON files) BEFORE any file is mutated.
  2. Applies the src replacements to the standalone src/*.js files
     (exact-match asserts, fails if an anchor is missing / duplicated /
     already applied).
  3. Mirrors the patched src files into out/ (copies must agree).
  4. Applies the same replacements + the index-only F1 fix to the
     inlined blocks in out/index.html (byte edits, exact-count
     asserts), plus the V18.6 title and the V41 layer injection
     (style v41 + script v41js, LAST, before </body>).
  5. Applies the F4 JSON row removals to data/*.json and out/*.json
     in place (exact-count asserts + JSON re-parse + row counts).
  6. Verifies: marker order (v41 last), v41 version 18.6.0,
     node --check on v41.js + every touched src file, old versions
     intact, V33–V40 fragments still present, V41 fragments present,
     out-of-scope markers absent, C-R2-1 untouched.

RUN EXACTLY ONCE on a fresh V18.5 out/. NEVER re-run build_v33.py /
build_v34.py / build_v35.py / build_v36.py / build_v37.py / build_v38.py
/ build_v39.py / build_v40.py (or any older build script) on a finished
build (they reorder layers — see the V32 skill notes).

Usage:  python3 build_v41.py [--out DIR] [--src DIR]
Default out: out/ next to this script; default src: src/ next to it.
"""
import argparse
import hashlib
import json
import os
import pathlib
import re as _re
import shutil
import subprocess
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE

# Pristine V18.5 out/index.html (2,390,555 B) — verified before any edit.
V185_HASH = "9a2fdd741d8027dd3e95a5bcae64a4e8989bd726bcb74fe74f49f29a0e779827"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V18.5 — Bug Fixes II — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V18.6 — Bug Fixes III — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

CA_GATE = "(F.qmode||'').indexOf('ca-')===0"
REPLACEMENTS = [
    ('R-V41-V19-CA-ANSWER', 'v19.js',
     "  if(F.ultActive){\n"
     "    /* counterattack questions: score only, no boss damage / no heart loss yet */",
     "  /* V41 (R1): take the CA path ONLY when the current question IS\n"
     "     a CA question (qmode 'ca-*'). checkPhase() (V40 C-02) can\n"
     "     start the Counterattack while a normal question is still on\n"
     "     screen; keying off ultActive alone counted that in-flight\n"
     "     normal answer as a CA answer (caRight 4 after a perfect run\n"
     "     -> resolveUltimate's 0/3 failure branch: -2 hearts, no\n"
     "     reflect). The in-flight answer now takes the normal path\n"
     "     (damage, hearts, checkPhase is a no-op while ultActive). */\n"
     "  if(F.ultActive&&" + CA_GATE + "){\n"
     "    /* counterattack questions: score only, no boss damage / no heart loss yet */",
     1),
    ('R-V41-V19-CA-PICK', 'v19.js',
     "  var mode=F.ultActive?F.caMode:F.qmode,ok=false;",
     "  /* V41 (R1/R2): same CA gate as answer() — a normal question on\n"
     "     screen when the CA starts keeps its own mode. qHTML already\n"
     "     falls back with F.caMode||F.qmode; pick() had no fallback,\n"
     "     so a grammar cur (no optsVi) threw TypeError under\n"
     "     mode=undefined. */\n"
     "  var mode=(F.ultActive&&" + CA_GATE + ")?(F.caMode||F.qmode):F.qmode,ok=false;",
     1),
    ('R-V41-V19-CA-PC', 'v19.js',
     "  var mode=F.ultActive?F.caMode:F.qmode,idx=-1;",
     "  /* V41 (R1/R2): same CA gate as answer()/pick() — pickCorrect()\n"
     "     and pickWrong() share this anchor (count 2) and the same\n"
     "     throw on a grammar/read/builder question. */\n"
     "  var mode=(F.ultActive&&" + CA_GATE + ")?(F.caMode||F.qmode):F.qmode,idx=-1;",
     2),
    ('R-V41-V19-CA-CLAMP', 'v19.js',
     "  var b=F.boss,r=F.caRight;",
     "  /* V41 (R1 belt-and-braces): clamp so an out-of-range count can\n"
     "     never fall into the 0/3 failure branch again. */\n"
     "  var b=F.boss,r=Math.min(3,F.caRight);",
     1),
    ('R-V41-V15-FARMQUIZ', 'v15.js',
     "function farmPlotTap(i){\n"
     "  var e=en15(),p=e.farm.plots[i];if(!p||!p.wordId)return;",
     "function farmPlotTap(i){\n"
     "  /* V41 (F2): drop any stale harvest-quiz div first — the\n"
     "     correct-harvest branch only re-renders and relies on a\n"
     "     1200 ms timer's renderTab() to clean up, so a second tap\n"
     "     within the window created a duplicate id=\"v15farmquiz\"\n"
     "     and the stale card resurfaced when the new one was\n"
     "     dismissed. */\n"
     "  var old=$('#v15farmquiz');if(old)old.remove();\n"
     "  var e=en15(),p=e.farm.plots[i];if(!p||!p.wordId)return;",
     1),
    ('R-V41-V20-FLUSH', 'v20.js',
     "    var cur=''; try{ cur=localStorage.getItem(SAVE_KEY)||''; }catch(e){}\n"
     "    snapshot('hanvocab.v12.preimport-'+Date.now(), cur);",
     "    /* V41 (F3): flush the pending debounced save BEFORE the\n"
     "       snapshot — the snapshot reads localStorage, and a change\n"
     "       still inside the ~800 ms debounce window would otherwise\n"
     "       be missed (undo would restore the stale bytes and the\n"
     "       dirty change would be lost). */\n"
     "    try{ flush(); }catch(e){}\n"
     "    var cur=''; try{ cur=localStorage.getItem(SAVE_KEY)||''; }catch(e){}\n"
     "    snapshot('hanvocab.v12.preimport-'+Date.now(), cur);",
     1),
    ('R-V41-V15-FLUSH', 'v15.js',
     "      try{ var _s20=window.__v20sync; if(_s20&&_s20.validateSave){",
     "      /* V41 (F3): flush the pending debounced save BEFORE the\n"
     "         snapshot (same race as importFile in v20.js — the\n"
     "         snapshot below reads localStorage, not the in-memory\n"
     "         save). */\n"
     "      try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}\n"
     "      try{ var _s20=window.__v20sync; if(_s20&&_s20.validateSave){",
     1),
    ('R-V41-F4-AIRPLANE', 'v17_a1a2.js',
     ', {"en": "airplane", "vi": "máy bay", "ipa": "/ˈer.pleɪn/", "pos": "n", "t": "a1_vehicles", "topic": "VEHICLES", "tv": "PHƯƠNG TIỆN GIAO THÔNG", "lv": "A1-A2", "src": "a1a2", "no": 864}',
     "",
     1),
    ('R-V41-F4-EACHOTHER', 'v17_oxford.js',
     ', {"en": "each other", "vi": "nhau, lẫn nhau", "ipa": "", "pos": "", "t": "oxford", "ord": 942, "lesson": 38, "lv": "", "src": "oxford"}',
     "",
     1),
]

# Index-only replacements (no standalone src file): the V6 load() lives
# only in out/index.html. Checked/applied against index.html only.
INDEX_ONLY = [
    ('R-V41-INDEX-OPT', 'index.html',
     "function load(){try{const j=JSON.parse(localStorage.getItem(KEY));if(j&&j.cards)return j}catch(e){}",
     "function load(){try{const j=JSON.parse(localStorage.getItem(KEY));if(j&&j.cards){/* V41 (F1): default opt — a stored save with cards but no opt threw TypeError (reading 'group') in startSession on every boot and left #app empty. */if(!j.opt)j.opt={mode:'card',dir:'kv',group:'',due:false};return j}}catch(e){}",
     1),
]

# F4 JSON row removals (pretty-printed data files): the same two rows in
# data/*.json (source) and out/*.json (deployed copy, patched in place —
# out/v17_a1a2.json differs from data/ at the NGHỀNGHIỆP line, so the
# out copy is NOT overwritten from data/).
AIRPLANE_JSON = (',\n {\n  "en": "airplane",\n  "vi": "máy bay",\n  "ipa": "/ˈer.pleɪn/",\n  "pos": "n",\n  "t": "a1_vehicles",\n  "topic": "VEHICLES",\n  "tv": "PHƯƠNG TIỆN GIAO THÔNG",\n  "lv": "A1-A2",\n  "src": "a1a2",\n  "no": 864\n }')
EACHOTHER_JSON = (',\n {\n  "en": "each other",\n  "vi": "nhau, lẫn nhau",\n  "ipa": "",\n  "pos": "",\n  "t": "oxford",\n  "ord": 942,\n  "lesson": 38,\n  "lv": "",\n  "src": "oxford"\n }')
JSON_REPLACEMENTS = [
    ('R-V41-F4-AIRPLANE', 'v17_a1a2.json', AIRPLANE_JSON, "", 1, 999),
    ('R-V41-F4-EACHOTHER', 'v17_oxford.json', EACHOTHER_JSON, "", 1, 3395),
]

ALL_REPLACEMENTS = REPLACEMENTS

# V41 markers: must be ABSENT from the pristine V18.5 base, present after.
V41_MARKERS = [
    'id="v41"', 'id="v41js"', '__v41', "VERSION='18.6.0'",
    "Math.min(3,F.caRight)",
    "var old=$('#v15farmquiz');if(old)old.remove();",
]

# Distinctive strings that exist ONLY in work V41 does NOT do.
OUT_OF_SCOPE_MARKERS = [
    "armV27Obs",        # observer scoping (F-05) — NOT fixed in V18.6
    "rearmObserver",    # observer lifecycle (F-07) — NOT fixed in V18.6
    "_speakXp",         # V29 name for the speak fix — V36 uses _sxp36
    "V29 (F-05)",       # V29 observer comment — NOT in V18.6
]

# Files this build touches (for the pre-build backup + node --check).
TOUCHED_SRC = ["v15.js", "v19.js", "v20.js", "v17_a1a2.js", "v17_oxford.js"]
TOUCHED_JSON = ["v17_a1a2.json", "v17_oxford.json"]

# V33/V34/V35/V36/V37/V38/V39/V40 in-scope fragments (spot-checks, copied
# from build_v40.py) — must survive V18.6.
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
    "function koCount18(){",
    "recordAnswer('ko',k.id,ok,'boss18')",
    "recordAnswer('ko',k.id,ok,'boss19')",
    "markKO(true,F.cur.k)",
    "markKO(false,F.cur.k)",
    "markKO19(ok,F.cur.k)",
    "markKO19(true,F.cur.k)",
    "markKO19(false,F.cur.k)",
]
V40_FRAGMENTS = [
    "else if(kk==='ko16'){",
    "m16k.levels=maxMap(l16k.levels, c16k.levels);",
    "m27.plan=mp;",
    "_fightF.hp=Math.max(0,(_fightF.hp||0)-dealt);",
    "Khiên boss chặn một nửa.",
    "checkPhase:checkPhase",
    "Đang tải bộ từ Basic Tactics",
    "F.banner=F.koWarn='⚠️ Bạn mới có '+_kc40",
    "F.banner=F.koWarn||null;",
    "Điểm yếu: từ tiếng Hàn của bạn — '+cur",
    "rec={wins:((r19.en&&r19.en.wins)||0)+((r19.ko&&r19.ko.wins)||0)}",
    "allBosses().length+' boss)",
    "+ 8 boss Chrono Kingdom (V17) và 8 boss Skyroot Sanctuary (V18)",
    "topic:sc.topic,lesson:sc.lesson};",
    "if(lib==='units'&&!units.length){pop22('Chọn ít nhất 1 Unit.');return}",
    "if(!partial){",
]


# --- helpers (EPERM-safe pattern from build_v40.py, extended: the backup
# copy below also uses the retrying chunk writer, because plain
# shutil.copyfile (copy_file_range) fails during the host's EPERM waves) ---
def _wsmall(f, data):
    """Write a small byte string with retries (small writes sometimes land)."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    for _ in range(900):
        try:
            n = os.write(f.fileno(), data)
            if n == len(data):
                return
            data = data[n:]
        except PermissionError:
            time.sleep(1)
    raise PermissionError("small write failed after retries")


def _copy_bytes_epersafe(src, dst):
    """Copy a file with plain read() + retrying chunked os.write()."""
    data = pathlib.Path(src).read_bytes()
    tmp = pathlib.Path(dst).with_name(pathlib.Path(dst).name + ".tmp41")
    with open(tmp, "wb", buffering=0) as f:
        for off in range(0, len(data), 8192):
            _wsmall(f, data[off:off + 8192])
    os.rename(tmp, dst)
    assert hashlib.sha256(pathlib.Path(dst).read_bytes()).hexdigest() == hashlib.sha256(data).hexdigest(), f"backup copy mismatch: {dst}"


def _write_text_epersafe(path, text):
    """Write text to path via tmp file + atomic rename (EPERM-safe)."""
    tmp_path = path.with_name(path.name + ".tmp41")
    with open(tmp_path, "wb", buffering=0) as f:
        _wsmall(f, text.encode("utf-8"))
    os.rename(tmp_path, path)


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
    data_dir = ROOT / "data"
    v41_js = src_dir / "v41.js"
    v41_css = src_dir / "v41.css"
    assert v41_js.exists() and v41_css.exists(), "src/v41.js / src/v41.css missing"

    # --- 0. Back up every file this build will touch (src/ + data/ have
    # no other copy — the V18.5 ZIP only holds out/). ---
    backup = ROOT / "tools" / "v41" / "backup-v18.5"
    backup.mkdir(parents=True, exist_ok=True)
    backed = []
    for fname in TOUCHED_SRC:
        for base in (src_dir, out):
            p = base / fname
            if p.exists():
                dst = backup / (base.name + "__" + fname)
                _copy_bytes_epersafe(p, dst)
                backed.append(str(p))
    for fname in TOUCHED_JSON:
        for base in (data_dir, out):
            p = base / fname
            if p.exists():
                dst = backup / (base.name + "__" + fname)
                _copy_bytes_epersafe(p, dst)
                backed.append(str(p))
    for extra in [out / "index.html"]:
        if extra.exists():
            dst = backup / ("__".join(extra.relative_to(ROOT).parts))
            dst.parent.mkdir(parents=True, exist_ok=True)
            _copy_bytes_epersafe(extra, dst)
            backed.append(str(extra))
    print(f"backup OK: {len(backed)} files into {backup}")

    # --- 1. Verify the base is pristine V18.5 ---
    index = out / "index.html"
    assert index.exists(), "out/index.html missing — run on a V18.5 build"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V185_HASH, f"base is not pristine V18.5: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v40"' in built and 'id="v40js"' in built, "V40 markers missing — not a V18.5 build"
    for m in V41_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V18.5 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    print(f"verified pristine V18.5 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v40 markers present, v41 absent")

    # --- 1b. PRE-PASS: check every anchor (src files + index.html +
    # JSON files) before mutating anything, so a missing anchor fails
    # cleanly. ---
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        p = src_dir / fname
        text = p.read_text(encoding="utf-8")
        assert text.count(anchor) == count, f"PRE-PASS {label}: {fname}: anchor found {text.count(anchor)}x, expected exactly {count}"
        assert replacement not in text or replacement == "", f"PRE-PASS {label}: {fname}: replacement already present — refusing to double-apply"
    for label, fname, anchor, replacement, count in INDEX_ONLY:
        assert orig_bytes.count(anchor.encode("utf-8")) == count, f"PRE-PASS {label}: index.html: anchor found {orig_bytes.count(anchor.encode('utf-8'))}x, expected exactly {count}"
        assert replacement.encode("utf-8") not in orig_bytes, f"PRE-PASS {label}: index.html: replacement already present — refusing to double-apply"
    for label, fname, anchor, replacement, count, _rows in JSON_REPLACEMENTS:
        for base in (data_dir, out):
            p = base / fname
            text = p.read_text(encoding="utf-8")
            assert text.count(anchor) == count, f"PRE-PASS {label}: {base.name}/{fname}: anchor found {text.count(anchor)}x, expected exactly {count}"
            rows = json.loads(text)
            assert len(rows) == count + _rows, f"PRE-PASS {label}: {base.name}/{fname}: {len(rows)} rows before, expected {count + _rows}"
    groups_pre = {}
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        g = groups_pre.setdefault(anchor, {"replacement": replacement, "total": 0, "labels": []})
        assert g["replacement"] == replacement, f"PRE-PASS anchor shared with different replacement: {label}"
        g["total"] += count
        g["labels"].append(label)
    for anchor, g in groups_pre.items():
        n = orig_bytes.count(anchor.encode("utf-8"))
        assert n == g["total"], f"PRE-PASS index.html: {g['labels']} anchor found {n}x, expected {g['total']}"
    print(f"pre-pass OK: {len(ALL_REPLACEMENTS)} src replacements + {len(INDEX_ONLY)} index-only + {len(JSON_REPLACEMENTS)} JSON removals anchor-checked")

    # --- 2. Validate the V41 layer itself ---
    v41_js_t = v41_js.read_text(encoding="utf-8")
    v41_css_t = v41_css.read_text(encoding="utf-8")
    assert "</script>" not in v41_js_t.lower(), "v41.js contains </script>"
    assert "VERSION='18.6.0'" in v41_js_t and "__v41" in v41_js_t, "v41.js must expose __v41 18.6.0"
    _stripped = _re.sub(r"/\*.*?\*/", "", v41_js_t, flags=_re.S)
    _stripped = _re.sub(r"//[^\n]*", "", _stripped)
    assert "window.S" not in _stripped, "v41.js must never use window.S (lexical let)"
    assert "localStorage" not in v41_js_t, "v41.js must not touch localStorage (no new key/schema)"
    assert v41_css_t.strip(), "v41.css is empty"
    print(f"validated src/v41.js ({len(v41_js_t)} chars) + src/v41.css ({len(v41_css_t)} chars)")

    # --- 3. Apply the replacements to the standalone src/ files ---
    touched = {}
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        p = src_dir / fname
        text = p.read_text(encoding="utf-8")
        assert text.count(anchor) == count, f"{label}: {fname}: anchor found {text.count(anchor)}x, expected exactly {count}"
        assert replacement not in text or replacement == "", f"{label}: {fname}: replacement already present — refusing to double-apply"
        _write_text_epersafe(p, text.replace(anchor, replacement))
        after = p.read_text(encoding="utf-8")
        if replacement:
            assert after.count(replacement) == count, f"{label}: {fname}: replacement present {after.count(replacement)}x, expected {count}"
        else:
            assert after.count(anchor) == 0, f"{label}: {fname}: removed row still present"
        touched.setdefault(fname, []).append(label)
        print(f"applied {label} to src/{fname} (x{count})")
    for fname in touched:
        _copy_bytes_epersafe(src_dir / fname, out / fname)
        assert (out / fname).read_text(encoding="utf-8") == (src_dir / fname).read_text(encoding="utf-8"), (
            f"out/{fname} does not match patched src/{fname}")
    _copy_bytes_epersafe(v41_js, out / "v41.js")
    _copy_bytes_epersafe(v41_css, out / "v41.css")

    # --- 4. Assemble the new index.html: replacements + index-only F1
    # + title + V41 layer ---
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
    for label, fname, anchor, replacement, count in INDEX_ONLY:
        ab = anchor.encode("utf-8")
        n = orig_bytes.count(ab)
        assert n == count, f"index.html: {label} anchor found {n}x, expected {count}"
        a0 = orig_bytes.find(ab)
        edits.append({"start": a0, "end": a0 + len(ab),
                      "chunks": [("glue", replacement.encode("utf-8"))]})
        print(f"{label} staged for index-only edit at byte {a0}")
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V18.5 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # V41 layer, LAST, before </body>
    # rfind, NOT find: see the v37.css "</body>" comment trap above.
    body = orig_bytes.rfind(b"</body>")
    assert body != -1, "no </body> in index.html"
    assert body > orig_bytes.rfind(b'id="v40js"'), "injection point is before v40js - wrong </body>"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v41">\n'),
        ("file", v41_css),
        ("glue", b'\n</style>\n<script id="v41js">\n'),
        ("file", v41_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 5. F4 JSON row removals (data/*.json source + out/*.json copy,
    # patched in place so the out copy keeps its own NGHỀNGHIỆP line). ---
    for label, fname, anchor, replacement, count, rows_after in JSON_REPLACEMENTS:
        for base in (data_dir, out):
            p = base / fname
            text = p.read_text(encoding="utf-8")
            assert text.count(anchor) == count, f"{label}: {base.name}/{fname}: anchor found {text.count(anchor)}x, expected exactly {count}"
            _write_text_epersafe(p, text.replace(anchor, replacement))
            after = p.read_text(encoding="utf-8")
            assert after.count(anchor) == 0, f"{label}: {base.name}/{fname}: removed row still present"
            rows = json.loads(after)
            assert len(rows) == rows_after, f"{label}: {base.name}/{fname}: {len(rows)} rows after, expected {rows_after}"
            print(f"applied {label} to {base.name}/{fname} ({len(rows)} rows)")

    # --- 6. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    for anchor, g in groups.items():
        if g["replacement"]:
            assert built.count(g["replacement"]) == g["total"], (
                f"built index.html: {g['labels']} replacement present {built.count(g['replacement'])}x, expected {g['total']}")
        assert built.count(anchor) == 0 or anchor in g["replacement"], (
            f"built index.html: {g['labels']} anchor still present (replacement did not consume it)")
    for label, fname, anchor, replacement, count in INDEX_ONLY:
        assert built.count(replacement) == count, f"built index.html: {label} replacement present {built.count(replacement)}x, expected {count}"
        assert built.count(anchor) == 0, f"built index.html: {label} anchor still present"
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V18.6 title missing / V18.5 title remains"
    assert "window.__v41" in built and "VERSION='18.6.0'" in built, "built index.html missing __v41 18.6.0"
    # v41 markers are the LAST style/script markers before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v41", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v41", f"script marker order wrong: {script_ids}"
    assert built.find('id="v41js"') > built.find('id="v40js"'), "v41js is not after v40js"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0", "17.0.0", "17.1.0", "18.0.0", "18.1.0", "18.2.0", "18.3.0", "18.4.0", "18.5.0"):
        assert ver in built, f"built html lost version {ver}"
    # V33–V40 fragments still present
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
    for frag in V40_FRAGMENTS:
        assert frag in built, f"built html lost V40 fragment: {frag[:60]}"
    # V41 fragments present (exact counts).
    assert built.count("indexOf('ca-')===0") == 4, f"built html: CA gate present {built.count(chr(39)+'ca-'+chr(39))}x, expected 4 (answer + pick + pickCorrect + pickWrong)"
    assert built.count("Math.min(3,F.caRight)") == 1, "built html: R-V41-V19-CA-CLAMP missing"
    assert built.count("if(!j.opt)j.opt={mode:'card',dir:'kv',group:'',due:false}") == 1, "built html: R-V41-INDEX-OPT missing"
    assert built.count("var old=$('#v15farmquiz');if(old)old.remove();") == 1, "built html: R-V41-V15-FARMQUIZ missing"
    assert built.count("try{ flush(); }catch(e){}") == 2, f"built html: R-V41-V20-FLUSH count {built.count('try{ flush(); }catch(e){}')}, expected 2 (old post-confirm + new pre-snapshot)"
    assert built.count("try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}") == 6, f"built html: R-V41-V15-FLUSH count {built.count('try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}')}, expected 6 (was 5 + backupImport)"
    assert built.count('flex:0 0 auto;min-width:64px') == 1, "built html: R-V41-V41-NAV min-width rule missing"
    # F4 row counts in the inlined data block.
    assert built.count('"src": "a1a2"') == 999, f"built html: A1-A2 raw rows {built.count(chr(34)+'src'+chr(34)+': '+chr(34)+'a1a2'+chr(34))}, expected 999"
    assert built.count('"src": "oxford"') == 3395, f"built html: Oxford raw rows {built.count(chr(34)+'src'+chr(34)+': '+chr(34)+'oxford'+chr(34))}, expected 3395"
    assert built.count('"no": 864}') == 0, "built html: dropped airplane row (no 864) still present"
    assert built.count('"ord": 942') == 0, "built html: dropped each-other row (ord 942) still present"
    assert built.count('"no": 863}') == 1, "built html: kept airplane row (no 863) missing"
    assert built.count('"ord": 941') == 1, "built html: kept each-other row (ord 941) missing"
    # Data counts unchanged elsewhere by V41 (no other data touched).
    assert built.count("lang:'both'") == 31, "built html: lang:'both' count != 31"
    assert built.count("lang:'en'") == 14, f"built html: lang:'en' count != 14"
    assert built.count("NGHỀNGHIỆP") == 0, "built html: NGHỀNGHIỆP typo back"
    # Deliberately UNCHANGED by V41 (needs Anh's decision): legDiff's
    # counts-getter bug stays exactly as it was in V18.5.
    assert built.count("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}") == 1, "built html: legDiff changed (out of scope for V18.6)"
    # Deliberately UNCHANGED by V41 (needs Anh's decision): C-R2-1 —
    # markKO/markKO19 still pay no XP (their V39 comment survives in
    # both, and neither body gains an XP award).
    assert built.count("/* V39 (V18.4): KO boss answers also feed Smart Learning (V27) —") == 2, "built html: markKO/markKO19 changed (C-R2-1 is out of scope for V18.6)"
    # KO entry buttons unchanged.
    assert built.count('<button class="tab v35kotab"') == 1, "built index.html: KO v35kotab button changed"
    assert built.count('<button class="tab v33kotab"') == 1, "built index.html: KO v33kotab button changed"
    # out-of-scope replacements absent
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"built index.html: out-of-scope marker {marker!r} present"
    # src/out/index copies agree on every replacement
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        for base in (src_dir, out):
            t = (base / fname).read_text(encoding="utf-8")
            if replacement:
                assert t.count(replacement) == count, f"{base}/{fname}: {label} count != {count}"
            else:
                assert t.count(anchor) == 0, f"{base}/{fname}: {label} row still present"
    _node_check(v41_js)
    for fname in touched:
        _node_check(src_dir / fname)
    _safe_copy = None
    # ship the build script itself with the deliverable (reproducibility)
    _copy_bytes_epersafe(HERE / "build_v41.py", out / "build_v41.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V18.6, layer V41 injected last")
    print("V41: Bug Fixes III — 9 src replacements (v19 x4, v15 x2, v20 x1, v17 data x2) + 1 index-only (load opt default) + 4 JSON row removals + title")
    print("marker order OK: v41 last (styles + scripts), v41js after v40js; KO tabs line unchanged; out-of-scope markers absent; C-R2-1 + legDiff untouched")
    return 0


if __name__ == "__main__":
    sys.exit(main())
