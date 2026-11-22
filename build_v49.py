#!/usr/bin/env python3
"""Build V19.4 (BOSS MIC FIX) from the pristine V19.3 build + the V49 layer.

V19.4 = V19.3 (Sentence Forge, layer V48) + layer V49. Anh reported
(2026-11-22 01:30): "bosses ko nhận mic" — boss fights don't pick up
the microphone.

ROOT CAUSE (verified from src/ + reproduced in Node vm AND real
Chrome 157, tools/v49/repro-v49.js + repro-v49c.js, 9/9 + 7/7):
bossSpeak() in src/v18.js:639-655 and src/v19.js:704-720 (byte-identical
bodies) had six defects, all in bossSpeak:
  D1. rec.start() called BEFORE rec.onresult/rec.onerror are assigned —
      a result fired inside start() is lost (sync-fire stub: lostSync).
  D2. No listening state: after tapping "Nói" nothing changes on screen
      (no "Đang nghe…" cue, button stays enabled).
  D3. Silent failure: try{rec.start()}catch(e){return} — a start()
      throw leaves no message and no retry.
  D4. No onend handler: recognition ending with no result and no error
      leaves the card frozen — an unanswered speak question has no
      "Tiếp tục" button, so the player is stuck re-tapping "Nói".
  D5. Timer race (LATENT in shipped data): a timed boss could time out
      a speak question mid-speech via answer(false,true); the late
      result is then dropped (answer() returns early when
      F.answered!==null). No speak question is timed today (wizard/mage
      have no timer; zero speak bosses in v19/v33/v35 data; golem is
      'mixed'), so this is defense in depth — but a stale result CAN
      answer the NEXT question (repro D5c: old transcript marked the
      new question correct), which the per-question token also fixes.
  D6. onerror shows only the generic "(không nghe được)" with no reason
      (not-allowed vs no-speech vs network vs aborted) and no retry
      guidance.
Reference implementations that already do it RIGHT (mirrored here):
src/v48.js dojoListen() and src/v15.js speakRecord() — handlers
before start, listening state, onend, specific error fallback.
KO fights map speak->mc (v18.js:468, v19.js:452), so this affects EN
boss fights only. Speak-mode bosses: ONLY v10_wizard (Challenge,
lv 8) and v10_mage (Elemental, lv 19) in v18_data.js, plus the
old-arena 'wizard' (V6 flow, untouched). Zero in v19/v33/v35 data.

THE CHANGES:
  1. New files: src/v49.js (window.__v49: speakErrMsg(code) — one
     Vietnamese message per SpeechRecognition error code, each with
     a clear retry step) + src/v49.css (.v49listen listening chip +
     .v49err error box; solid dark chips, readable in light + dark
     themes on both the fixed-dark V19 panel and the theme-driven
     V18 panel).
  2. src/v18.js + src/v19.js (x8 edits each, same structure):
     - F literal gains listening:false, rec:null, speakToken:0,
       speakErr:null (per-fight state only, NO save/schema change).
     - nextQ() clears the speak state at its top (no leak of the
       previous question's heard line / listening flag / error).
     - startTimer() returns immediately on a speak question
       (no timer ever runs on one — D5 defense in depth).
     - next() and close() call stopSpeak() first (abort + token bump).
     - bossSpeak() rewritten: handlers BEFORE start(); listening
       state + renderFight(); start() failure shows a specific
       message; onend with no result shows the no-speech message
       (never a freeze); per-question token guards late results;
       entry guard (qmode==='speak', answered===null, !over,
       F.cur&&F.cur.w, not already listening).
     - qHTML speak card: listening line "Đang nghe… hãy nói: <word>"
       + disabled "Nói" button while listening; .v49err box when
       F.speakErr is set.
     - Export gains speakState:speakState (test hook; precedent: the
       existing _test hooks).
  3. Title -> V19.4 Boss Mic Fix; style v49 + script v49js injected
     LAST before </body> (rfind, v37.css gotcha).
  4. NO rewards/XP/SRS/pets/save-schema change; NO new save key;
     v15 speak mode and v48 Dojo untouched except regression checks.

WHAT THIS SCRIPT DOES (in order):
  0. Backs up the pristine out/index.html + the pre-fix standalone
     src files (from tools/v49/backup-v19.3/out/) + the new layer
     files into tools/v49/backup-v19.3-build/.
  1. Verifies the base is the pristine V19.3 build (hash + v48
     markers present, v49 markers absent). REFUSES otherwise.
     PRE-PASS: every V49 replacement anchor is checked (src files
     AND out/index.html) BEFORE any file is mutated; OLD fragments
     must be present in the pristine files and absent in the new
     src files.
  2. Validates the V49 layer itself: the edited src files carry
     their NEW fragments and no longer carry their OLD fragments;
     the new layer files are well-formed.
  3. Copies the edited src files + the new layer files into out/.
  4. Assembles the new index.html: the V19.4 title + wholesale
     sync of each edited embedded script block with its src file
     (the old embedded block must equal the pristine standalone
     file, asserted byte-for-byte) + the V49 layer injection
     (style v49 + script v49js, LAST, before </body>).
  5. Verifies: marker order (v49 style/script last), v49 version
     19.4.0, node --check on v49.js + every touched src file, old
     versions intact, V33–V48 fragments still present, V49
     fragments present with exact counts, out-of-scope markers
     absent.

RUN EXACTLY ONCE on a fresh V19.3 out/. NEVER re-run build_v33.py
/ ... / build_v48.py (or any older build script) on a finished
build (they reorder layers — see the V32 skill notes).
REBUILD-FROM-SCRATCH: restore out/index.html from
tools/v49/backup-v19.3/out/ (the build script mutates NOTHING in
src/ — it only reads the hand-edited src files and copies them into
out/), re-run this script, and compare the out/index.html sha256
— it must be byte-identical. The hand-edited src files are also
kept as src__*.new in tools/v49/backup-v19.3-build/ in case the
working tree is ever reset to pristine.

Usage:  python3 build_v49.py [--out DIR] [--src DIR]
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
sys.path.insert(0, str(HERE))
import build_v41 as _b41  # V33-V40 in-scope fragments + out-of-scope markers, verbatim
import build_v45 as _b45  # V41-V45 fragment lists + index-only replacements, verbatim
import build_v46 as _b46  # V46 fragment lists (legDiff/KO-XP), verbatim
import build_v47 as _b47  # V47 fragment lists (duplicate senses), verbatim
import build_v48 as _b48  # V48 fragment lists (Sentence Forge), verbatim

# Pristine V19.3 out/index.html (2,513,911 B) — verified before any edit.
V193_HASH = "dc971a6c1f386b6bc27a3423d9352ff606697d057d156e7e0141777f82dc36bd"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V19.3 — Sentence Forge — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V19.4 — Boss Mic Fix — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# V49 markers: must be ABSENT from the pristine V19.3 base, present after.
V49_MARKERS = [
    'id="v49js"', 'id="v49"', "VERSION='19.4.0'", 'window.__v49={',
    'speakErrMsg', 'stopSpeak()', 'speakState()', 'v49listen', 'v49err',
]

# Distinctive strings that exist ONLY in work V49 does NOT do
# (copied verbatim from build_v41.py — the base must not have moved).
OUT_OF_SCOPE_MARKERS = _b41.OUT_OF_SCOPE_MARKERS

# src files edited by V49 (embedded blocks are synced wholesale).
EDITED_SRC = {"v18.js": "v18js", "v19.js": "v19js"}

# --- NEW fragments (must be present in each edited src file + built html) ---
# Identical in both engines: the rewritten stopSpeak/bossSpeak/speakState
# block is byte-identical in src/v18.js and src/v19.js (60 lines).
_NEW_COMMON = [
    "listening:false,rec:null,speakToken:0,speakErr:null,",
    "F.listening=false;F.rec=null;F.heard=null;F.speakErr=null;",
    "if(F.qmode==='speak'){F.left=0;return}",
    "function stopSpeak(){",
    "var token=(F.speakToken||0)+1;F.speakToken=token;",
    "if(F.listening)return;",
    "if(!F||token!==F.speakToken)return;",
    "F.speakErr=(window.__v49&&__v49.speakErrMsg?__v49.speakErrMsg(code):'Không nghe được giọng nói. Hãy kiểm tra micro rồi bấm “Nói” thử lại.');",
    "F.speakErr=(window.__v49&&__v49.speakErrMsg?__v49.speakErrMsg('no-speech'):'Máy không nghe thấy gì. Hãy nói to và rõ hơn, rồi bấm “Nói” thử lại.');",
    "F.speakErr=(window.__v49&&__v49.speakErrMsg?__v49.speakErrMsg('start-failed'):'Không mở được micro. Hãy kiểm tra micro rồi bấm “Nói” thử lại.');",
    "function speakState(){",
    "speakState:speakState,",
    'class="v49listen"',
    'class="v49err"',
    '<button class="btn pri" disabled>Nói</button>',
    "function close(){\n  stopSpeak();",
]
NEW_FRAGS = {"v18.js": list(_NEW_COMMON), "v19.js": list(_NEW_COMMON)}
# --- OLD fragments (must be present in the PRISTINE files, GONE after) ---
_OLD_COMMON = [
    "  var w=F.cur.w;if(!w)return;",
    "  try{rec.start()}catch(e){return}",
    "  rec.onerror=function(){F.heard='(không nghe được)';renderFight()};",
    "ok:null,heard:null,\n",
    "bossSpeak:bossSpeak,\n",
    "function close(){\n  if(F&&F.timer)clearInterval(F.timer);",
]
OLD_FRAGS = {
    "v18.js": list(_OLD_COMMON) + [
        "  if(!F||F.over)return;\n  F.q++;F.banner=F.koWarn||null;nextQ();renderFight();",
        "onclick=\"__v18.bossSpeak()\">Nói</button></div>';\n      if(F.heard)h+='<div class=\"v18explain\">",
    ],
    "v19.js": list(_OLD_COMMON) + [
        "  if(!F||F.over)return;\n  if(F.ultActive){F.answered=null;F.ok=null;nextQ();renderFight();return}",
        "onclick=\"__v19.bossSpeak()\">Nói</button></div>';\n      if(F.heard)h+='<div class=\"v19explain\">",
    ],
}


# --- helpers (EPERM-safe pattern from build_v41.py / build_v48.py) ---
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
    tmp = pathlib.Path(dst).with_name(pathlib.Path(dst).name + ".tmp49")
    with open(tmp, "wb", buffering=0) as f:
        for off in range(0, len(data), 8192):
            _wsmall(f, data[off:off + 8192])
    os.rename(tmp, dst)
    assert hashlib.sha256(pathlib.Path(dst).read_bytes()).hexdigest() == hashlib.sha256(data).hexdigest(), f"backup copy mismatch: {dst}"


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
    pristine = ROOT / "tools" / "v49" / "backup-v19.3" / "out"
    v49_js = src_dir / "v49.js"
    v49_css = src_dir / "v49.css"
    assert v49_js.exists(), "src/v49.js missing"
    assert v49_css.exists(), "src/v49.css missing"
    assert pristine.is_dir(), "tools/v49/backup-v19.3/out missing — the hash-verified V19.3 backup source"

    # --- 0. Back up the pristine out/index.html + the pre-fix standalone
    # src files (from the pristine copy) + the new layer files into
    # tools/v49/backup-v19.3-build/. ---
    backup = ROOT / "tools" / "v49" / "backup-v19.3-build"
    backup.mkdir(parents=True, exist_ok=True)
    live = out / "index.html"
    src_copy = pristine / "index.html"
    assert live.exists(), "out/index.html missing"
    assert src_copy.exists(), "tools/v49/backup-v19.3/out/index.html missing"
    assert _sha256(live) == _sha256(src_copy), (
        "out/index.html differs from the pristine copy — refusing to build on a moved tree")
    _copy_bytes_epersafe(src_copy, backup / "out__index.html")
    for name in EDITED_SRC:
        _copy_bytes_epersafe(pristine / name, backup / ("src__" + name + ".old"))
    for layer in (v49_js, v49_css):
        _copy_bytes_epersafe(layer, backup / ("src__" + layer.name))
    print(f"backup OK: out/index.html + {len(EDITED_SRC)} pre-fix src files + 2 new layer files recorded in {backup}")

    # --- 1. Verify the base is pristine V19.3 ---
    index = out / "index.html"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V193_HASH, f"base is not pristine V19.3: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v48js"' in built and 'id="v47js"' in built, "V48/V47 markers missing — not a V19.3 build"
    for m in V49_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V19.3 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    assert _b46.LEGDIFF_NEW in built and built.count(_b46.LEGDIFF_NEW) == 1, "pre-fix NEW legDiff() (V46) not found exactly once in base"
    assert built.count('id="v48js"') == 1 and built.count("VERSION='19.3.0'") == 1, "V48 markers missing/duplicated in base"
    # Each edited embedded script block must equal its pristine standalone file.
    for name, vid in EDITED_SRC.items():
        old_src = (pristine / name).read_text(encoding="utf-8")
        pat = '<script id="%s">\n%s\n</script>' % (vid, old_src)
        assert built.count(pat) == 1, f"embedded {vid} block does not match pristine {name} exactly once"
    print(f"verified pristine V19.3 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v48 markers present, v49 absent")

    # --- 1b. PRE-PASS: V49 anchors (src + index.html) ---
    for name, frags in NEW_FRAGS.items():
        t = (src_dir / name).read_text(encoding="utf-8")
        for frag in frags:
            assert frag in t, f"PRE-PASS src/{name} missing NEW fragment: {frag[:70]}"
    for name, frags in OLD_FRAGS.items():
        t = (src_dir / name).read_text(encoding="utf-8")
        for frag in frags:
            assert frag not in t, f"PRE-PASS src/{name} still has OLD fragment: {frag[:70]}"
    # The OLD fragments must be present in the pristine files (proves the
    # anchor existed and the OLD fragment is not a typo).
    for name, frags in OLD_FRAGS.items():
        old_t = (pristine / name).read_text(encoding="utf-8")
        for frag in frags:
            assert frag in old_t, f"PRE-PASS pristine {name} missing OLD fragment (base moved?): {frag[:70]}"
    # The NEW fragments must NOT be in the pristine files.
    for name, frags in NEW_FRAGS.items():
        old_t = (pristine / name).read_text(encoding="utf-8")
        for frag in frags:
            assert frag not in old_t, f"PRE-PASS pristine {name} already has NEW fragment (base moved?): {frag[:70]}"
    print("pre-pass OK: V49 src fragments (new present, old gone, old present in pristine)")

    # --- 2. Validate the V49 layer itself ---
    v49_js_t = v49_js.read_text(encoding="utf-8")
    assert "</script>" not in v49_js_t.lower(), "v49.js contains </script>"
    assert "VERSION='19.4.0'" in v49_js_t and "window.__v49={" in v49_js_t, "v49.js must expose __v49 19.4.0"
    assert not _re.search(r"window\.S(?![A-Za-z])", _re.sub(r"/\*.*?\*/", "", v49_js_t, flags=_re.S)), "v49.js must never use window.S (lexical let)"
    assert "localStorage" not in _re.sub(r"/\*.*?\*/", "", v49_js_t, flags=_re.S), "v49.js must not touch localStorage"
    assert "function speakErrMsg(code){" in v49_js_t, "v49.js must define speakErrMsg"
    for code in ("'not-allowed'", "'service-not-allowed'", "'no-speech'", "'audio-capture'", "'network'", "'aborted'", "'start-failed'", "'unknown'"):
        assert code in v49_js_t, f"v49.js missing error code {code}"
    v49_css_t = v49_css.read_text(encoding="utf-8")
    assert "</style>" not in v49_css_t.lower(), "v49.css contains </style>"
    assert "</body>" not in v49_css_t, "v49.css contains </body> (v37 trap)"
    assert ".v49listen" in v49_css_t and ".v49err" in v49_css_t, "v49.css must define .v49listen and .v49err"
    assert "min-height:44px" in v49_css_t, "v49.css must carry 44px touch targets"
    assert "#1e3a5f" in v49_css_t and "#4a1f1f" in v49_css_t, "v49.css must use solid dark chips (theme-independent contrast)"
    print(f"validated src/v49.js ({len(v49_js_t)} chars) + src/v49.css ({len(v49_css_t)} chars)")

    # --- 3. Copy the edited src files + the new layer files into out/ ---
    for name in EDITED_SRC:
        _copy_bytes_epersafe(src_dir / name, out / name)
    _copy_bytes_epersafe(v49_js, out / "v49.js")
    _copy_bytes_epersafe(v49_css, out / "v49.css")

    # --- 4. Assemble the new index.html ---
    edits = []
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V19.3 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # wholesale sync of each edited embedded script block with its src file
    for name, vid in EDITED_SRC.items():
        old_src = (pristine / name).read_bytes()
        new_src = (src_dir / name).read_bytes()
        old_block = b'<script id="' + vid.encode() + b'">\n' + old_src + b'\n</script>'
        new_block = b'<script id="' + vid.encode() + b'">\n' + new_src + b'\n</script>'
        o0 = orig_bytes.find(old_block)
        assert o0 != -1 and orig_bytes.count(old_block) == 1, f"index.html: embedded {vid} block not found exactly once"
        edits.append({"start": o0, "end": o0 + len(old_block),
                      "chunks": [("glue", new_block)]})
    # V49 layer, LAST, before </body> (style + script together, V45 pattern).
    # rfind, NOT find: see the v37.css "</body>" comment trap (build_v41.py).
    body = orig_bytes.rfind(b"</body>")
    assert body != -1, "no </body> in index.html"
    assert body > orig_bytes.rfind(b'id="v48js"'), "injection point is before v48js - wrong </body>"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v49">\n'),
        ("file", v49_css),
        ("glue", b'\n</style>\n<script id="v49js">\n'),
        ("file", v49_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 5. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V19.4 title missing / V19.3 title remains"
    assert "window.__v49={" in built and "VERSION='19.4.0'" in built, "built index.html missing __v49 19.4.0"
    # v49 markers are the LAST style/script markers before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v49", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v49", f"script marker order wrong: {script_ids}"
    assert built.find('id="v49js"') > built.find('id="v48js"'), "v49js is not after v48js"
    assert built.find('id="v49"') > built.find('id="v48"'), "v49 style is not after v48"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0", "17.0.0", "17.1.0", "18.0.0", "18.1.0", "18.2.0", "18.3.0", "18.4.0", "18.5.0", "18.6.0", "18.7.0", "18.8.0", "18.9.0", "19.0.0", "19.0.1", "19.2.0", "19.3.0"):
        assert ver in built, f"built html lost version {ver}"
    # V33–V40 fragments still present (verbatim lists from build_v41.py)
    for frag in _b41.V33_FRAGMENTS:
        assert frag in built, f"built html lost V33 fragment: {frag[:60]}"
    for frag in _b41.V34_FRAGMENTS:
        assert frag in built, f"built html lost V34 fragment: {frag[:60]}"
    for frag in _b41.V35_FRAGMENTS:
        # V48 deliberately superseded this one fragment: TOTAL_BOSSES
        # 86 -> 87 (Hangul Golem). Asserted separately below.
        if frag == "var TOTAL_BOSSES=86;":
            continue
        assert frag in built, f"built html lost V35 fragment: {frag[:60]}"
    for frag in _b41.V36_FRAGMENTS:
        assert frag in built, f"built html lost V36 fragment: {frag[:60]}"
    for frag in _b41.V37_FRAGMENTS:
        assert frag in built, f"built html lost V37 fragment: {frag[:60]}"
    for frag in _b41.V38_FRAGMENTS:
        assert frag in built, f"built html lost V38 fragment: {frag[:60]}"
    for frag in _b41.V39_FRAGMENTS:
        assert frag in built, f"built html lost V39 fragment: {frag[:60]}"
    for frag in _b41.V40_FRAGMENTS:
        assert frag in built, f"built html lost V40 fragment: {frag[:60]}"
    # V41 key fragments still present (exact counts, from build_v45.py §5)
    assert built.count("indexOf('ca-')===0") == 4, "built html: CA gate count changed"
    assert built.count("Math.min(3,F.caRight)") == 1, "built html: R-V41-V19-CA-CLAMP missing"
    assert built.count("if(!j.opt)j.opt={mode:'card',dir:'kv',group:'',due:false}") == 1, "built html: R-V41-INDEX-OPT missing"
    assert built.count("var old=$('#v15farmquiz');if(old)old.remove();") == 1, "built html: R-V41-V15-FARMQUIZ missing"
    assert built.count("try{ flush(); }catch(e){}") == 2, "built html: R-V41-V20-FLUSH count changed"
    assert built.count("try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}") == 6, "built html: R-V41-V15-FLUSH count changed"
    assert built.count('flex:0 0 auto;min-width:64px') == 1, "built html: R-V41-V41-NAV min-width rule missing"
    assert built.count('"src": "oxford"') == 3395, "built html: Oxford raw rows != 3395"
    # V42/V43/V44 key fragments still present (exact counts, from build_v45.py §5)
    assert built.count("chronoGateHTML") == 6, "built html: chronoGateHTML count changed"
    assert built.count("skyrootGateHTML") == 6, "built html: skyrootGateHTML count changed"
    assert built.count(".v42btn{min-height:44px") == 1, "built html: v42.css rule missing"
    assert built.count("window.__v42={") == 1, "built html: __v42 export missing"
    assert built.count('id="v43"') == 1, "built html: v43 style marker missing"
    assert built.count('id="v43js"') == 1, "built html: v43js script marker missing"
    assert built.count("window.__v43={version:VERSION}") == 1, "built html: __v43 export missing"
    assert built.count(".v19fight .v19qword{color:#fff}") == 1, "built html: V43 V19 qword rule missing"
    assert built.count('id="v44js"') == 1, "built html: v44js script marker missing"
    assert built.count("window.__v44={version:VERSION}") == 1, "built html: __v44 export missing"
    assert built.count("var lv=b.arena==='leg'?legDiff():null;") == 2, "built html: hoisted legDiff() call sites changed"
    assert built.count("if(b.arena==='leg'){if(lv.indexOf(w.lv)<0)return false}") == 1, "built html: hoisted wordPool filter line missing"
    assert built.count("return b.arena==='leg'?lv.indexOf(x.lv)>=0:x.lv===b.diff") == 1, "built html: hoisted grammarPool filter line missing"
    # V45 fragments still present (exact counts, from build_v45.py §5)
    assert built.count('id="v45"') == 1, "built html: v45 style marker missing"
    assert built.count('id="v45js"') == 1, "built html: v45js script marker missing"
    assert built.count("window.__v45={version:VERSION}") == 1, "built html: __v45 export missing"
    assert built.count("VERSION='19.0.0'") == 1, "built html: __v45 19.0.0 version missing"
    for name, frags in _b45.NEW_DUE.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW due fragment missing ({name}): {frag[:70]}"
    for name, frags in _b45.OLD_DUE.items():
        for frag in frags:
            assert frag not in built, f"built html: OLD due line still present ({name}): {frag[:70]}"
    for frag in _b45.NEW_V31:
        assert frag in built, f"built html: NEW v31 fragment missing: {frag[:70]}"
    for frag in _b45.OLD_V31:
        assert frag not in built, f"built html: OLD v31 fragment still present: {frag[:70]}"
    for frag in _b45.NEW_V23:
        assert frag in built, f"built html: NEW v23 fragment missing: {frag[:70]}"
    assert built.count(_b45.LOAD_OLD) == 0, "built html: old load() still present"
    assert built.count("hanvocab.v12.corrupt-") == 2, "built html: quarantine key pattern count changed"
    assert built.count("window.__V45_CORRUPT") == 5, "built html: __V45_CORRUPT count changed"
    assert built.count(_b45.ENICON_OLD) == 0, "built html: old enIcon() still present"
    assert built.count("if(!name)return '';") == 1, "built html: enIcon() falsy guard missing"
    # V46 fragments still present (exact counts, from build_v46.py §5)
    assert built.count('id="v46data"') == 1, "built html: v46data script marker missing"
    assert built.count('id="v46js"') == 1, "built html: v46js script marker missing"
    assert built.count("window.__v46={") == 1, "built html: __v46 export missing"
    assert built.count("VERSION='19.0.1'") == 1, "built html: __v46 19.0.1 version missing"
    assert built.count("window.__V46_DATA={") == 1, "built html: __V46_DATA export missing"
    for bid in _b46.WEAK46_IDS:
        assert built.count("'%s'" % bid) >= 1, f"built html: weakness override boss id {bid} missing"
    for name, frags in _b46.NEW_FRAGS.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW V46 fragment missing ({name}): {frag[:70]}"
    for name, frags in _b46.OLD_FRAGS.items():
        for frag in frags:
            assert frag not in built, f"built html: OLD V46 fragment still present ({name}): {frag[:70]}"
    for name, frags in _b46.FALLBACK_FRAGS.items():
        for frag in frags:
            assert built.count(frag) == 1, f"built html: EN fallback block count != 1 ({name}): {frag[:70]}"
    assert built.count(_b46.LEGDIFF_OLD) == 0, "built html: OLD legDiff() definition still present"
    assert built.count(_b46.LEGDIFF_NEW) == 1, "built html: NEW legDiff() definition missing / duplicated"
    assert built.count(_b46.LEGDIFF_THRESHOLDS) == 1, "built html: legDiff thresholds changed"
    assert built.count("V15().counts().mastered") == 1, f"built html: V15().counts().mastered count {built.count('V15().counts().mastered')}, expected 1 (V44 comment only)"
    assert built.count("koStreak") >= 6, f"built html: koStreak count {built.count('koStreak')}, expected >= 6"
    assert built.count("awardBossAnswerXP") >= 7, f"built html: awardBossAnswerXP count {built.count('awardBossAnswerXP')}, expected >= 7"
    # V47 fragments still present (exact counts, from build_v47.py §6)
    assert built.count('id="v47js"') == 1, "built html: v47js script marker missing"
    assert built.count("window.__v47={") == 1, "built html: __v47 export missing"
    assert built.count("VERSION='19.2.0'") == 1, "built html: __v47 19.2.0 version missing"
    assert built.count("function labelOf(w){") == 1, "built html: labelOf definition missing / duplicated"
    assert built.count("window.labelOf=labelOf;") == 1, "built html: labelOf global exposure missing"
    assert built.count("function splitDuplicateSenses(WORDS,BYID){") == 1, "built html: splitDuplicateSenses definition missing / duplicated"
    assert built.count("__v47.splitDuplicateSenses(WORDS,BYID)") == 1, "built html: buildWords hook call missing / duplicated"
    assert built.count(_b47.GUARD) == 9, f"built html: headword guard present {built.count(_b47.GUARD)}x, expected 9"
    assert built.count("labelOf(w)") == 7, f"built html: labelOf(w) occurrences {built.count('labelOf(w)')}, expected 7"
    assert built.count("labelOf(w2)") == 3, f"built html: labelOf(w2) call sites {built.count('labelOf(w2)')}, expected 3"
    assert built.count("var seen={},ded=[];") == 1, "built html: pickPool dedupe missing / duplicated"
    for name, frags in _b47.NEW_FRAGS.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW V47 fragment missing ({name}): {frag[:70]}"
    for name, frags in _b47.OLD_FRAGS.items():
        for frag in frags:
            assert frag not in built, f"built html: OLD V47 fragment still present ({name}): {frag[:70]}"
    assert built.count('"no": 938') == 0, "built html: dropped devoted row (no 938) still present"
    assert built.count('"no": 351') == 1, "built html: kept devoted row (no 351) missing / duplicated"
    assert built.count('"src": "a1a2"') == 998, "built html: A1-A2 raw rows != 998"
    assert built.count('"src": "oxford"') == 3395, "built html: Oxford raw rows != 3395"
    for no in (680, 806, 912):
        assert built.count('"no": %d}' % no) == 1, f"built html: kept twin row no {no} missing / duplicated"
    # V48 fragments still present (regression; exact counts from build_v48.py §5)
    assert built.count('id="v48"') == 1, "built html: v48 style marker missing"
    assert built.count('id="v48data"') == 1, "built html: v48data script marker missing"
    assert built.count('id="v48js"') == 1, "built html: v48js script marker missing"
    assert built.count("window.__v48={") == 1, "built html: __v48 export missing"
    assert built.count("VERSION='19.3.0'") == 1, "built html: __v48 19.3.0 version missing"
    assert built.count("window.__V48_DATA={") == 1, "built html: __V48_DATA export missing"
    assert built.count("v48kotab") == 1, "built html: v48kotab KO button missing / duplicated"
    assert built.count("v35kotab") == 1, "built html: v35kotab KO button count changed"
    assert built.count("var TOTAL_BOSSES=87;") == 1, "built html: TOTAL_BOSSES=87 missing"
    assert built.count("var TOTAL_BOSSES=86;") == 0, "built html: TOTAL_BOSSES=86 still present"
    assert built.count("'v18_golem'") >= 3, f"built html: v18_golem mentions {built.count(chr(39)+'v18_golem'+chr(39))}, expected >= 3"
    assert built.count("lv:77") == 1, "built html: golem Lv 77 missing / duplicated"
    assert built.count("hp:620") >= 1, "built html: golem HP 620 missing"
    for name, frags in _b48.NEW_FRAGS.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW V48 fragment missing ({name}): {frag[:70]}"
    for name, frags in _b48.OLD_FRAGS.items():
        for frag in frags:
            assert frag not in built, f"built html: OLD V48 fragment still present ({name}): {frag[:70]}"
    # V49 fragments present (exact counts)
    assert built.count('id="v49"') == 1, "built html: v49 style marker missing"
    assert built.count('id="v49js"') == 1, "built html: v49js script marker missing"
    assert built.count("window.__v49={") == 1, "built html: __v49 export missing"
    assert built.count("VERSION='19.4.0'") == 1, "built html: __v49 19.4.0 version missing"
    assert built.count("function speakErrMsg(code){") == 1, "built html: speakErrMsg definition missing / duplicated"
    assert built.count("speakErrMsg") == 15, f"built html: speakErrMsg occurrences {built.count('speakErrMsg')}, expected 15 (3 in v49.js + 6 per engine: guard + call x3 sites)"
    assert built.count("function stopSpeak(){") == 2, "built html: stopSpeak definition missing / duplicated (one per engine)"
    assert built.count("stopSpeak()") == 6, f"built html: stopSpeak() occurrences {built.count('stopSpeak()')}, expected 6 (2 defs + next/close per engine)"
    assert built.count("function speakState(){") == 2, "built html: speakState definition missing / duplicated (one per engine)"
    assert built.count("speakState:speakState,") == 2, "built html: speakState export missing / duplicated (one per engine)"
    assert built.count("if(F.qmode==='speak'){F.left=0;return}") == 2, "built html: speak timer guard missing / duplicated (one per engine)"
    assert built.count("F.listening=false;F.rec=null;F.heard=null;F.speakErr=null;") == 2, "built html: nextQ speak-state clear missing / duplicated (one per engine)"
    assert built.count("listening:false,rec:null,speakToken:0,speakErr:null,") == 2, "built html: F-literal speak fields missing / duplicated (one per engine)"
    assert built.count("var token=(F.speakToken||0)+1;F.speakToken=token;") == 2, "built html: per-question token missing / duplicated (one per engine)"
    assert built.count('class="v49listen"') == 2, "built html: .v49listen card missing / duplicated (one per engine)"
    assert built.count('class="v49err"') == 2, "built html: .v49err box missing / duplicated (one per engine)"
    assert built.count('<button class="btn pri" disabled>Nói</button>') == 2, "built html: disabled Nói button missing / duplicated (one per engine)"
    for name, frags in NEW_FRAGS.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW V49 fragment missing ({name}): {frag[:70]}"
    for name, frags in OLD_FRAGS.items():
        for frag in frags:
            # Two OLD fragments also occur in files V49 deliberately does
            # NOT touch, so they cannot be asserted absent from the whole
            # built html (the pre-pass already proves them gone from the
            # edited v18.js/v19.js):
            #  - "try{rec.start()}catch(e){return}" also in v15.js:1537
            #    (a different speak path, not bossSpeak).
            #  - "bossSpeak:bossSpeak,\n" also in the v15 export
            #    (old-arena V6 boss flow, not the v18/v19 engines).
            if frag in ("  try{rec.start()}catch(e){return}", "bossSpeak:bossSpeak,\n"):
                continue
            assert frag not in built, f"built html: OLD V49 fragment still present ({name}): {frag[:70]}"
    # v15 speak mode and v48 Dojo untouched (regression): their entry
    # points must still be present exactly as in the V19.3 base.
    assert built.count("function speakRecord(") == 1, "built html: v15 speakRecord missing / duplicated"
    assert built.count("function dojoListen(") == 1, "built html: v48 dojoListen missing / duplicated"
    # Embedded blocks are byte-identical to their src files (sync guarantee).
    for name, vid in EDITED_SRC.items():
        src_t = (src_dir / name).read_text(encoding="utf-8")
        pat = '<script id="%s">\n%s\n</script>' % (vid, src_t)
        assert built.count(pat) == 1, f"built html: embedded {vid} block does not match src/{name}"
        out_t = (out / name).read_text(encoding="utf-8")
        assert out_t == src_t, f"out/{name} differs from src/{name}"
    for layer in ("v49.js", "v49.css"):
        out_t = (out / layer).read_text(encoding="utf-8")
        assert out_t == (src_dir / layer).read_text(encoding="utf-8"), f"out/{layer} differs from src/{layer}"
    # out-of-scope replacements absent
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"built index.html: out-of-scope marker {marker!r} present"
    _node_check(v49_js)
    for name in EDITED_SRC:
        _node_check(src_dir / name)
    # ship the build script itself with the deliverable (reproducibility)
    _copy_bytes_epersafe(HERE / "build_v49.py", out / "build_v49.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V19.4, layer V49 injected last")
    print("V49: bossSpeak rewritten in both engines (handlers before start, listening state, specific errors, onend, per-question token, timer guard); __v49.speakErrMsg; speakState hook")
    print("marker order OK: v49 style/script last; out-of-scope markers absent; embedded blocks == src files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
