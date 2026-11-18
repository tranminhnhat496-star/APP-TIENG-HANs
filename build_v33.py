#!/usr/bin/env python3
"""Build V17.0 (CHRONO KINGDOM) from the pristine V16.4 build + the V33 layer.

V17.0 = V16.4 (Data Safety, layer V32) + layer V33
(src/v33.css + src/v33_data.js + src/v33.js) + guarded build-script
replacements (see REPLACEMENTS below) + asset copies (8 boss PNGs,
12 pet PNGs).

WHAT THIS SCRIPT DOES (in order):
  1. Verifies the base is the pristine V16.4 build (hash + v32 markers
     present, v33 markers absent). REFUSES to run otherwise.
  2. Applies the replacements to the standalone src/*.js files
     (exact-match asserts, fails the build if an anchor is missing /
     duplicated / already applied; R-V33-V18-CH is the one deliberate
     count-2 replacement — challenge() AND collDetail() share the
     same lookup line in v18.js).
  3. Mirrors the patched src files into out/ (copies must agree).
  4. Copies the V17 art into out/assets/ (boss PNGs to
     assets/bosses/v17/; pet PNGs to assets/pets/v15/chrono/ +
     assets/pets/v15/eggs/chrono_egg_*.png — MOVE decision, see
     README_V17_0_CHRONO_KINGDOM.md; no duplicate bytes).
  5. Applies the same replacements to the inlined blocks in
     out/index.html (byte edits, exact-count asserts), plus the KO
     v33kotab button (strip ONLY the trailing ';'), the V17.0 title,
     and the V33 layer injection (style v33 + script v33data +
     script v33js, LAST, before </body>).
  6. Verifies: marker order (v33 last, v33data before v33js),
     v33 version 17.0.0, node --check on v33.js/v33_data.js + every
     touched src file, KO tabs line (v33kotab x1 after v27kotab),
     old versions intact.

RUN EXACTLY ONCE on a fresh V16.4 out/. NEVER re-run build_v31.py /
build_v32.py (or any older build script) on a finished build (they
reorder layers — see the V32 skill notes). Do NOT run build_v17.py.

Usage:  python3 build_v33.py [--out DIR] [--src DIR]
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

# Pristine V16.4 out/index.html (2,068,255 B) — verified before any edit.
V164_HASH = "c3639bc7cec58d10125fa0c5bada0d3ed04c9bfe23a6581fec8b40b2e54fda0a"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V16.4 — Data Safety — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V17.0 — Chrono Kingdom — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# --- replacements: (label, file, anchor, replacement, expected count) ---
# Count is the expected occurrence count in BOTH the src file and the
# inlined index.html block (each src file is inlined exactly once).
V33_BUILDWORDS = (
    "  /* V33: CHRONO KINGDOM — gắn 240 từ Chrono (data qua\n"
    "     window.__V33_WORDS, ids 'v33_<slug>') vào WORDS chung, theo mẫu\n"
    "     V22 (Basic Tactics). Từ đã có chỉ được gắn thêm thư viện\n"
    "     'chrono'; từ chỉ có trong Chrono nhận id ổn định 'v33_<slug>'\n"
    "     và cấp độ 'B2' (boss Chrono là diff B2 nên wordPool gồm chúng).\n"
    "     KHÔNG tạo S.cards — trường ko chỉ là dữ liệu hiển thị/học. */\n"
    "  try{\n"
    "    var ch33=(window.__V33_WORDS||[]);\n"
    "    var K2W3={};WORDS.forEach(function(ww){if(!ww.custom)K2W3[ww.en.toLowerCase()]=ww});\n"
    "    ch33.forEach(function(a){\n"
    "      var key=(a.en||'').toLowerCase();if(!key)return;\n"
    "      var ww=K2W3[key];\n"
    "      if(ww){\n"
    "        ww.lib=ww.lib||[];\n"
    "        if(ww.lib.indexOf('chrono')<0)ww.lib.push('chrono');\n"
    "        ww.chronoSet=ww.chronoSet||a.set;\n"
    "        if(!ww.ko&&a.ko)ww.ko=a.ko;\n"
    "      }else{\n"
    "        var nw={id:a.id,t:'chrono',en:a.en,vi:a.vi,ipa:a.ipa||'',pos:a.pos||'',ex:a.ex||'',exvi:a.exvi||'',lv:'B2',custom:false,\n"
    "          lib:['chrono'],chronoSet:a.set,ko:a.ko||''};\n"
    "        WORDS.push(nw);BYID[nw.id]=nw;K2W3[key]=nw;LV[key]='B2';\n"
    "      }\n"
    "    });\n"
    "  }catch(e){}\n"
)

V33_MERGE = (
    "        else if(kk==='en33'){\n"
    "          /* V33 (Chrono Kingdom): quests union (done/claimed/acc/at\n"
    "             MAX), rift best MAX per floor + claimed union for the\n"
    "             newer day only (claimed reset when the day changes),\n"
    "             regionClaimed union (per-language MAX — NOT unionTrue:\n"
    "             unionTrue is local-priority last-writer-wins, so a local\n"
    "             {ko:0} would overwrite a cloud {ko:1}; regionClaimed\n"
    "             carries explicit 0s, unlike the 1/absent claimed maps),\n"
    "             created MIN. XP/gems are never\n"
    "             summed (MAX at the top level, as everywhere else).\n"
    "             Pending launches are session-local and dropped. */\n"
    "          var l33=(localS.v7&&localS.v7.en33)||{}, c33=(cloudS.v7&&cloudS.v7.en33)||{};\n"
    "          var m33={};\n"
    "          m33.created=Math.min(l33.created||Infinity, c33.created||Infinity);\n"
    "          if(!isFinite(m33.created)) m33.created=(l33.created||c33.created||Date.now());\n"
    "          var q33={};\n"
    "          [l33.quests,c33.quests].forEach(function(src){ if(!src) return; for(var qk in src){ var a=q33[qk]=q33[qk]||{}; var b=src[qk]||{}; a.done=Math.max(a.done||0,b.done||0); a.claimed=Math.max(a.claimed||0,b.claimed||0); a.acc=Math.max(a.acc||0,b.acc||0); a.at=Math.max(a.at||0,b.at||0); } });\n"
    "          m33.quests=q33;\n"
    "          var day33=(newer.v7&&newer.v7.en33&&newer.v7.en33.rift&&newer.v7.en33.rift.day)||(older.v7&&older.v7.en33&&older.v7.en33.rift&&older.v7.en33.rift.day)||'';\n"
    "          var best33={};\n"
    "          [l33.rift&&l33.rift.best,c33.rift&&c33.rift.best].forEach(function(src){ if(!src) return; for(var fk in src) best33[fk]=Math.max(best33[fk]||0,src[fk]||0); });\n"
    "          var cl33={};\n"
    "          [l33.rift,c33.rift].forEach(function(src){ if(!src||src.day!==day33) return; for(var ck in (src.claimed||{})) cl33[ck]=src.claimed[ck]; });\n"
    "          m33.rift={day:day33,best:best33,claimed:cl33};\n"
    "          var rcL=l33.regionClaimed||{}, rcC=c33.regionClaimed||{};\n"
    "          m33.regionClaimed={en:Math.max(rcL.en||0,rcC.en||0),ko:Math.max(rcL.ko||0,rcC.ko||0)};\n"
    "          m33.pending={};\n"
    "          v7.en33=m33;\n"
    "        }\n"
)

REPLACEMENTS = [
    ("R-V33-V19-FIGHT", "v19.js",
     "  var b=D19().byId(id);if(!b)return;",
     "  var b=D19().byId(id)||(window.__V33_DATA&&__V33_DATA.byId?__V33_DATA.byId(id):null);if(!b)return;",
     1),
    ("R-V33-V19-UNLOCK", "v19.js",
     "  var b=D19().byId(id);if(!b)return false;",
     "  var b=D19().byId(id)||(window.__V33_DATA&&__V33_DATA.byId?__V33_DATA.byId(id):null);if(!b)return false;\n"
     "  if(b.zone==='chrono'&&window.__v33&&__v33.bossUnlocked)return __v33.bossUnlocked(id,lang);",
     1),
    ("R-V33-V19-SHIELD", "v19.js",
     "    shield:(b.skills.elem.id==='shield'?30:0),cleansed:false,",
     "    shield:(b.id==='v17_geargolem'?90:(b.skills.elem.id==='shield'?30:0)),cleansed:false,",
     1),
    ("R-V33-V19-PHASE", "v19.js",
     "  if(F.phase===2&&F.hp<=F.maxHp*0.2){\n    /* Berserk begins with the Ultimate: Knowledge Counterattack */",
     "  if(F.phase===2&&F.hp<=F.maxHp*0.2&&F.boss.id!=='v17_geargolem'){\n    /* Berserk begins with the Ultimate: Knowledge Counterattack */\n"
     "    /* V33: GEAR GOLEM has no P3 Knowledge Counterattack (2 phases only). */",
     1),
    ("R-V33-V19-HEAL", "v19.js",
     "    if(b.skills.pass.id==='vampiric')healBoss(4,'🧛 Hút Sinh Lực: boss hồi 4 HP!');",
     "    if(b.skills.pass.id==='vampiric')healBoss(4,'🧛 Hút Sinh Lực: boss hồi 4 HP!');\n"
     "    /* V33: GEAR GOLEM time-reversal — wrong answer in P2 heals +10 HP. */\n"
     "    if(b.id==='v17_geargolem'&&F.phase===2)healBoss(10,'⏳ Đảo ngược thời gian: GEAR GOLEM hồi 10 HP!');",
     1),
    ("R-V33-V19-PHASETXT", "v19.js",
     '  var phaseTxt=\'<span class="v19phase">Giai đoạn \'+F.phase+\'/3\'',
     '  var phaseTxt=\'<span class="v19phase">Giai đoạn \'+F.phase+\'/\'+(F.boss.id===\'v17_geargolem\'?\'2\':\'3\')',
     1),
    ("R-V33-V18-ALL", "v18.js",
     "function allBosses(){var d=B18();return (d.old||[]).concat(newBosses(),v19Bosses())}",
     "function allBosses(){var d=B18();return (d.old||[]).concat(newBosses(),v19Bosses(),(window.__V33_DATA?__V33_DATA.bosses:[]))}",
     1),
    # Deliberate count-2: challenge() AND collDetail() share this lookup
    # line in v18.js; both need the V33 fall-through (Collection detail
    # for Chrono bosses, and launching a Chrono fight from Collection).
    ("R-V33-V18-CH", "v18.js",
     "  var b=bossById(id)||(window.__V19_DATA&&__V19_DATA.byId?__V19_DATA.byId(id):null);if(!b)return;",
     "  var b=bossById(id)||(window.__V19_DATA&&__V19_DATA.byId?__V19_DATA.byId(id):null)||(window.__V33_DATA&&__V33_DATA.byId?__V33_DATA.byId(id):null);if(!b)return;",
     2),
    ("R-V33-V21-TOTAL", "v21.js",
     "var TOTAL_BOSSES=70; /* 10 old (V15) + 30 (V10) + 30 (V11) */",
     "var TOTAL_BOSSES=78; /* 10 old (V15) + 30 (V10) + 30 (V11) + 8 (V17 Chrono) */",
     1),
    ("R-V33-V27-EXP", "v27.js",
     "    startPlan:startPlan,startWeak:startWeak,startWeakWord:startWeakWord,",
     "    startPlan:startPlan,startSession:startSession,startWeak:startWeak,startWeakWord:startWeakWord,",
     1),
    ("R-V33-V20-HAS", "v20_sync.js",
     "  if(v7.en22&&v7.en22.quest){ for(var q22 in v7.en22.quest){ if(v7.en22.quest[q22]) return true; } }",
     "  if(v7.en22&&v7.en22.quest){ for(var q22 in v7.en22.quest){ if(v7.en22.quest[q22]) return true; } }\n"
     "  if(v7.en33&&v7.en33.quests){ for(var q33 in v7.en33.quests){ if(v7.en33.quests[q33]) return true; } }\n"
     "  if(v7.en33&&v7.en33.regionClaimed){ for(var rc33 in v7.en33.regionClaimed){ if(v7.en33.regionClaimed[rc33]) return true; } }",
     1),
    ("R-V33-V20-MERGE", "v20_sync.js",
     "        else if(v7[kk]===undefined) v7[kk]=newer.v7[kk]!==undefined?newer.v7[kk]:older.v7[kk];",
     V33_MERGE + "        else if(v7[kk]===undefined) v7[kk]=newer.v7[kk]!==undefined?newer.v7[kk]:older.v7[kk];",
     1),
    ("R-V33-V15-BUILDWORDS", "v15.js",
     "  /* V16: cập nhật từ có sẵn (override) — giữ nguyên id nên tiến trình",
     V33_BUILDWORDS + "  /* V16: cập nhật từ có sẵn (override) — giữ nguyên id nên tiến trình",
     1),
]

ALL_REPLACEMENTS = REPLACEMENTS

# --- KO tabs button (appended after the v27kotab button) ---
KO_TAIL_OLD = '+\'<button class="tab v27kotab" onclick="window.__v27&&__v27.openSmart(\\\'ko\\\')" title="Học thông minh"><span class="ti">🧠</span><span>Học thông minh</span></button>\';'
KO_BTN = '+\'<button class="tab v33kotab" onclick="window.__v33&&__v33.openChrono(\\\'ko\\\')" title="Vương Quốc Thời Gian — Chrono Kingdom"><span class="ti">⏳</span><span>Chrono</span></button>\''
# Strip ONLY the trailing ';' — the closing quote of the v27 string MUST stay,
# otherwise the v27 string swallows the '+' and the v33 string's opening quote
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

BOSS_PNGS = ["v17_sandwisp", "v17_pendulum", "v17_specter", "v17_mantis",
             "v17_hound", "v17_oracle", "v17_titan", "v17_geargolem"]
PET_STAGES = ["stardeer", "gearbeetle", "cosmicunicorn"]
PET_EGGS = ["star", "gear", "cosmic"]

# --- helpers (EPERM-safe pattern from build_v16.py, verbatim from build_v32.py) ---
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
    tmp_path = path.with_name(path.name + ".tmp33")
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
    v33_js = src_dir / "v33.js"
    v33_css = src_dir / "v33.css"
    v33_data = src_dir / "v33_data.js"
    assert v33_js.exists() and v33_css.exists() and v33_data.exists(), "src/v33.js / src/v33.css / src/v33_data.js missing"

    # --- 1. Verify the base is pristine V16.4 ---
    index = out / "index.html"
    assert index.exists(), "out/index.html missing — run on a V16.4 build"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V164_HASH, f"base is not pristine V16.4: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v32"' in built and 'id="v32js"' in built, "V32 markers missing — not a V16.4 build"
    for m in ('id="v33"', 'id="v33js"', 'id="v33data"', '__v33', '__V33_DATA', '__V33_WORDS'):
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V16.4 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    print(f"verified pristine V16.4 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…)")

    # --- 2. Validate the V33 layer itself ---
    v33_js_t = v33_js.read_text(encoding="utf-8")
    v33_css_t = v33_css.read_text(encoding="utf-8")
    v33_data_t = v33_data.read_text(encoding="utf-8")
    assert "</script>" not in v33_js_t.lower(), "v33.js contains </script>"
    assert "</script>" not in v33_data_t.lower(), "v33_data.js contains </script>"
    assert "VERSION='17.0.0'" in v33_js_t and "__v33" in v33_js_t, "v33.js must expose __v33 17.0.0"
    assert "version:'17.0.0'" in v33_data_t and "__V33_DATA" in v33_data_t, "v33_data.js must expose __V33_DATA 17.0.0"
    assert "GATE_TOTAL=70" in v33_js_t, "v33.js missing 70-win gate"
    for fn in ("correctedWinCount", "bossUnlocked", "fightBoss", "startQuest",
               "claimQuest", "checkCompletions", "echoList", "startEcho",
               "startRift", "claimRift", "attachChrono", "registerPets",
               "openChrono", "closeChrono"):
        assert fn in v33_js_t, f"v33.js missing {fn}"
    _stripped = _re.sub(r"/\*.*?\*/", "", v33_js_t, flags=_re.S)
    _stripped = _re.sub(r"//[^\n]*", "", _stripped)
    assert "window.S" not in _stripped, "v33.js must never use window.S (lexical let)"
    assert "v33kotab" not in v33_js_t, "v33.js must not add a KO tab button (build-time only)"
    for token in ("--ui-text-primary", "--ui-text-secondary", "--ui-title-gold", "--ui-bg-panel", "--ui-border", "--ui-btn-min-height", "--ui-selected", "#v33hub", ".v33btn", ".v33boss"):
        assert token in v33_css_t, f"v33.css missing {token}"
    assert v33_css_t.strip(), "v33.css is empty"
    assert "z-index:1500" in v33_css_t, "v33.css overlay must be z-index 1500"
    print(f"validated src/v33.js ({len(v33_js_t)} chars) + src/v33_data.js ({len(v33_data_t)} chars) + src/v33.css ({len(v33_css_t)} chars)")

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
    _safe_copyfile(v33_js, out / "v33.js")
    _safe_copyfile(v33_css, out / "v33.css")
    _safe_copyfile(v33_data, out / "v33_data.js")

    # --- 4. Copy the V17 art into out/assets/ (MOVE decision: pet PNGs
    # live ONLY under v15/chrono + v15/eggs — never under pets/v17) ---
    for bid in BOSS_PNGS:
        src_p = ROOT / "assets" / "bosses" / "v17" / (bid + ".png")
        assert src_p.exists(), f"missing boss art {src_p}"
        dst_p = out / "assets" / "bosses" / "v17" / (bid + ".png")
        dst_p.parent.mkdir(parents=True, exist_ok=True)
        _safe_copyfile(src_p, dst_p)
    for sp in PET_STAGES:
        for s in (1, 2, 3):
            src_p = ROOT / "assets" / "pets" / "v15" / "chrono" / f"{sp}_s{s}.png"
            assert src_p.exists(), f"missing pet art {src_p}"
            dst_p = out / "assets" / "pets" / "v15" / "chrono" / f"{sp}_s{s}.png"
            dst_p.parent.mkdir(parents=True, exist_ok=True)
            _safe_copyfile(src_p, dst_p)
    for eg in PET_EGGS:
        src_p = ROOT / "assets" / "pets" / "v15" / "eggs" / f"chrono_egg_{eg}.png"
        assert src_p.exists(), f"missing egg art {src_p}"
        dst_p = out / "assets" / "pets" / "v15" / "eggs" / f"chrono_egg_{eg}.png"
        _safe_copyfile(src_p, dst_p)
    assert not (out / "assets" / "pets" / "v17").exists(), "out/assets/pets/v17 must not exist (MOVE decision)"
    print("copied 8 boss PNGs + 9 pet stage PNGs + 3 egg PNGs into out/assets/")

    # --- 5. Assemble the new index.html: replacements + KO button + title + V33 ---
    edits = []
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        ab = anchor.encode("utf-8")
        assert orig_bytes.count(ab) == count, f"index.html: {label} anchor for {fname} found {orig_bytes.count(ab)}x, expected {count}"
        pos = 0
        for _ in range(count):
            a0 = orig_bytes.find(ab, pos)
            assert a0 != -1, f"index.html: {label} anchor for {fname} occurrence missing"
            edits.append({"start": a0, "end": a0 + len(ab),
                          "chunks": [("glue", replacement.encode("utf-8"))]})
            print(f"{label} staged for inlined {fname} block at byte {a0} (x{count})")
            pos = a0 + len(ab)
    # KO tabs button (after v27kotab; strip ONLY the trailing ';')
    kot_old = KO_TAIL_OLD.encode("utf-8")
    k0 = orig_bytes.find(kot_old)
    assert k0 != -1 and orig_bytes.count(kot_old) == 1, "index.html: Korean tabs v27kotab tail not found exactly once"
    edits.append({"start": k0, "end": k0 + len(kot_old),
                  "chunks": [("glue", KO_TAIL_NEW.encode("utf-8"))]})
    print("KO button (v33kotab) staged after v27kotab")
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V16.4 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # V33 layer, LAST, before </body>
    body = orig_bytes.find(b"</body>")
    assert body != -1, "no </body> in index.html"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v33">\n'),
        ("file", v33_css),
        ("glue", b'\n</style>\n<script id="v33data">\n'),
        ("file", v33_data),
        ("glue", b'\n</script>\n<script id="v33js">\n'),
        ("file", v33_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 6. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        assert built.count(replacement) == count, f"built index.html: {label} replacement present {built.count(replacement)}x, expected {count}"
        assert built.count(anchor) == 0 or anchor in replacement, (
            f"built index.html: {label} anchor still present (replacement did not consume it)")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V17.0 title missing / V16.4 title remains"
    assert "window.__v33" in built and "VERSION='17.0.0'" in built, "built index.html missing __v33 17.0.0"
    assert "window.__V33_DATA" in built and "window.__V33_WORDS" in built, "built index.html missing __V33_DATA/__V33_WORDS"
    # v33 markers are the LAST style/script markers before </body>; data before js
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v33", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v33", f"script marker order wrong: {script_ids}"
    assert built.find('id="v33data"') < built.find('id="v33js"'), "v33data must load before v33js"
    assert built.find('id="v33js"') > built.find('id="v32js"'), "v33js is not after v32js"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0"):
        assert ver in built, f"built html lost version {ver}"
    # V31/V32 fragments still present (spot-checks)
    assert "/* V31 (F-01):" in built, "built html lost V31 F-01 merge branch"
    assert "__v20.importFile(imp)" in built, "built html lost V31 C9 importFile(imp)"
    assert "VERSION='16.3.0'" in built, "built html lost V31 version 16.3.0"
    assert "bad-version" in built, "built html lost V32 R-V32-VER guard"
    # KO tabs line: v33kotab x1 after v27kotab; v27kotab still x1
    assert built.count('<button class="tab v33kotab"') == 1, "built index.html: KO v33kotab button missing/duplicated"
    assert built.count('<button class="tab v27kotab"') == 1, "built index.html: KO v27kotab button changed"
    assert built.count('<button class="tab v23kotab"') == 1, "built index.html: KO v23kotab button changed"
    assert '</button>\'+\'<button class="tab v33kotab"' in built, "built index.html: v33kotab not appended after v27kotab"
    # out-of-scope replacements absent
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"built index.html: out-of-scope marker {marker!r} present"
    # src/out/index copies agree on every replacement
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        for base in (src_dir, out):
            assert (base / fname).read_text(encoding="utf-8").count(replacement) == count, (
                f"{base}/{fname}: {label} count != {count}")
    # Chrono art referenced by the data file is present in out/
    for bid in BOSS_PNGS:
        assert (out / "assets" / "bosses" / "v17" / (bid + ".png")).exists(), f"out/assets/bosses/v17/{bid}.png missing"
    _node_check(v33_js)
    _node_check(v33_data)
    for fname in touched:
        _node_check(src_dir / fname)
    _safe_copyfile(HERE / "build_v33.py", out / "build_v33.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V17.0, layer V33 injected last")
    print(f"V33: Chrono Kingdom — {len(ALL_REPLACEMENTS)} replacements (V19 x6, V18 x2, V21/V27/V20 x2, V15 x1) + KO button + title")
    print("marker order OK: v33 last (styles + scripts), v33data before v33js; KO tabs line extended; out-of-scope markers absent")
    return 0


if __name__ == "__main__":
    sys.exit(main())
