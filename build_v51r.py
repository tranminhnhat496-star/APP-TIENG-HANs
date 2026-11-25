#!/usr/bin/env python3
"""Build V19.6 (SENTENCE FORGE AUTO, REBASED) from the pristine V19.5.1 build + the V51 layer.

V19.6 = V19.5.1 (Round-5 Patch, layer V52) + layer V51.
The ORIGINAL V19.6 was built 2026-11-22/23 in the private tree
~/workspace/forge-v51-work/ on the V19.4 base (ZIP sha256 8168b236...,
SUPERSEDED). This script re-applies the SAME V51 layer onto the
V19.5.1 base in the SHARED tree, so V19.6 = V19.5.1 + Forge Auto.

REBASE HAZARDS (handled explicitly):
  1. The private tree's src/v48.js is V19.4-era + 6 V51 edits. The
     shared src/v48.js is NEWER: V50 C-R5-3 score tracking
     (FS.score, scoreTotal/bestScore) AND V52 Android TTS (Dojo
     speakText delegates to __v52). The 6 V51 edits were re-derived
     by diffing the private v48.js against its pristine V19.4
     backup and re-applying each hunk to the shared file by exact
     anchor (7 replacement sites: 3 flag sites + 2 forgePool hooks
     + 2 forgeHTML lines). Verified by 3-way diff: shared-new vs
     private-V51 differs ONLY by V50+V52 hunks; shared-new vs
     pristine V19.5.1 differs ONLY by the V51 hunks. The badge
     line keeps the ORIGINAL position (before the Nghĩa line).
  2. Index injection: V52 injected v52js LAST. The rebased build
     injects v51 style + v51js script immediately BEFORE
     <script id="v52js">, so v52 stays last.
  3. NOTHING else from the private tree moves over: its src/ is
     V19.4-era (v15/v18/v19/v22/v27/v48 lack the V50/V52 fixes).
     Only v51.js, v51.css and the 6 v48.js edits move over.

WHAT THIS SCRIPT DOES (in order):
  0. Backs up the pristine out/index.html + the pre-fix standalone
     src file + the new layer files into
     tools/v51/backup-v19.5.1-build/.
  1. Verifies the base is the pristine V19.5.1 build (hash +
     v50/v52 markers present, v51 markers absent). REFUSES
     otherwise. PRE-PASS: every V51 replacement anchor is
     checked (src files AND out/index.html) BEFORE any file is
     mutated; OLD fragments must be present in the pristine
     files and absent in the new src files.
  2. Validates the V51 layer itself: the edited src file carries
     its NEW fragments and no longer carries its OLD fragments;
     the new layer files are well-formed.
  3. Copies the edited src file + the new layer files into out/.
  4. Assembles the new index.html: the V19.6 title + wholesale
     sync of the edited embedded script block with its src file
     (the old embedded block must equal the pristine standalone
     file, asserted byte-for-byte) + the V51 layer injection
     (style v51 + script v51js, immediately BEFORE v52js, so
     v52 stays last).
  5. Verifies: marker order (v51 style/script before v52js),
     v51 version 19.6.0, node --check on v51.js + the touched
     src file, V50 + V52 fragments still present, V51 fragments
     present with exact counts, out-of-scope markers absent.

RUN EXACTLY ONCE on a fresh V19.5.1 out/. NEVER re-run build_v51.py
(it gates on the V19.4 hash) or any older build script on a
finished build (they reorder layers).
REBUILD-FROM-SCRATCH: restore out/index.html from
tools/v51/backup-v19.5.1/out/ (the build script mutates NOTHING
in src/ — it only reads the hand-edited src files and copies them
into out/), re-run this script, and compare the out/index.html
sha256 — it must be byte-identical. The hand-edited src files are
also kept as src__*.new in tools/v51/backup-v19.5.1-build/.

Usage:  python3 build_v51r.py [--out DIR] [--src DIR]
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

# Pristine V19.5.1 out/index.html (2,539,378 B) — verified before any edit.
V1951_HASH = "2bc0726d643765538cc18da0bc73903604220ef556851afc13c1a3b81f46ad5f"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V19.5.1 — Round5 Patch — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V19.6 — Sentence Forge Auto — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# V51 markers: must be ABSENT from the pristine V19.5.1 base, present after.
V51_MARKERS = [
    'id="v51js"', 'id="v51"', "VERSION='19.6.0'", 'window.__v51={',
    'genPool', 'forgeAuto', 'koDeckFirst', 'v51gen',
]

# V50 + V52 markers: must be PRESENT in the base and in the build.
V50_MARKERS = ['id="v50js"', 'id="v50"', "VERSION='19.5.0'", '_speakSeq50',
               'FS.score', 'scoreTotal', 'bestScore']
V52_MARKERS = ['id="v52js"', "VERSION='19.5.1'", 'window.__v52={',
               'function mark18(ok,w,qkey)', 'function mark19(ok,w,qkey)',
               'wordlessKey18', 'wordlessKey19']

# src files edited by V51 (embedded blocks are synced wholesale).
EDITED_SRC = {"v48.js": "v48js"}

# --- NEW fragments (must be present in the edited src file + built html) ---
NEW_FRAGS = {"v48.js": [
    "flags:{forge:1,bounty:1,tree:1,dojo:1,boss:1,forgeAuto:1}",
    "e.flags=e.flags||{forge:1,bounty:1,tree:1,dojo:1,boss:1,forgeAuto:1};",
    "var names=['forge','bounty','tree','dojo','boss','forgeAuto'];",
    "/* V51 (V19.6): prefer the selected KO deck (S.deck) when set —",
    "try{if(window.__v51&&__v51.koDeckFirst)cards=__v51.koDeckFirst(cards)}catch(e){}",
    "/* V51 (V19.6): auto-generated sentences from the active word",
    "if(window.__v51&&__v51.flagOn&&__v51.flagOn()&&window.__v51.genPool){",
    "if(g&&g.items&&g.items.length){out.items=g.items;out.scopeName=g.scopeName;out.genCount=g.items.filter(function(it){return !!it.gen}).length;return out}",
    "+(g.pool.genCount?'<p class=\"v48mut\">📚 Bộ từ: <b>'+esc(g.pool.scopeName||'Tất cả từ vựng')+'</b> · Câu tạo tự động từ bộ từ ('+g.pool.genCount+' câu) — câu nào không tạo được sẽ lấy từ ngân hàng câu mẫu.</p>':'')",
    '<span class="v51gen">Câu tạo tự động</span>',
    "Bộ từ: '+esc(cur.scopeName||'')+' · Từ khóa: <b>'+esc(cur.word?cur.word.en:'')+'</b>'",
]}
# --- OLD fragments (must be present in the PRISTINE file, GONE after) ---
OLD_FRAGS = {"v48.js": [
    "flags:{forge:1,bounty:1,tree:1,dojo:1,boss:1}}}",
    "e.flags=e.flags||{forge:1,bounty:1,tree:1,dojo:1,boss:1};",
    "var names=['forge','bounty','tree','dojo','boss'];",
    "      var cards=learnedKO();out.learned=cards.length;\n      cards.forEach(function(c){",
    "    }else{\n      out.learned=learnedEN().length;\n      var bank=(window.__V15_DATA&&__V15_DATA.builder)||[];",
]}

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
    tmp = pathlib.Path(dst).with_name(pathlib.Path(dst).name + ".tmp51r")
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
    pristine = ROOT / "tools" / "v51" / "backup-v19.5.1"
    v51_js = src_dir / "v51.js"
    v51_css = src_dir / "v51.css"
    assert v51_js.exists(), "src/v51.js missing"
    assert v51_css.exists(), "src/v51.css missing"
    assert (pristine / "out" / "index.html").exists(), "tools/v51/backup-v19.5.1/out/index.html missing"
    assert (pristine / "src" / "v48.js").exists(), "tools/v51/backup-v19.5.1/src/v48.js missing"

    # --- 0. Back up the pristine out/index.html + the pre-fix standalone
    # src file + the new layer files into tools/v51/backup-v19.5.1-build/. ---
    backup = ROOT / "tools" / "v51" / "backup-v19.5.1-build"
    backup.mkdir(parents=True, exist_ok=True)
    live = out / "index.html"
    src_copy = pristine / "out" / "index.html"
    assert live.exists(), "out/index.html missing"
    assert _sha256(live) == _sha256(src_copy), (
        "out/index.html differs from the pristine copy — refusing to build on a moved tree")
    _copy_bytes_epersafe(src_copy, backup / "out__index.html")
    for name in EDITED_SRC:
        _copy_bytes_epersafe(pristine / "src" / name, backup / ("src__" + name + ".old"))
    for layer in (v51_js, v51_css):
        _copy_bytes_epersafe(layer, backup / ("src__" + layer.name + ".new"))
    _copy_bytes_epersafe(HERE / "build_v51r.py", backup / "build_v51r.py")
    print(f"backup OK: out/index.html + {len(EDITED_SRC)} pre-fix src file + 2 new layer files recorded in {backup}")

    # --- 1. Verify the base is pristine V19.5.1 ---
    index = out / "index.html"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V1951_HASH, f"base is not pristine V19.5.1: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    for m in V50_MARKERS:
        assert m in built, f"V50 marker missing — not a V19.5.1 build: {m}"
    for m in V52_MARKERS:
        assert m in built, f"V52 marker missing — not a V19.5.1 build: {m}"
    for m in V51_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V19.5.1 title not found exactly once"
    # Each edited embedded script block must equal its pristine standalone file.
    for name, vid in EDITED_SRC.items():
        old_src = (pristine / "src" / name).read_text(encoding="utf-8")
        pat = '<script id="%s">\n%s\n</script>' % (vid, old_src)
        assert built.count(pat) == 1, f"embedded {vid} block does not match pristine {name} exactly once"
    # Standalone out/ file must also be pristine before we overwrite it.
    assert (out / "v48.js").read_bytes() == (pristine / "src" / "v48.js").read_bytes(), "out/v48.js differs from pristine src/v48.js"
    print(f"verified pristine V19.5.1 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v50+v52 markers present, v51 absent")

    # --- 1b. PRE-PASS: V51 anchors (src + index.html) ---
    for name, frags in NEW_FRAGS.items():
        t = (src_dir / name).read_text(encoding="utf-8")
        for frag in frags:
            assert frag in t, f"PRE-PASS src/{name} missing NEW fragment: {frag[:70]}"
    for name, frags in OLD_FRAGS.items():
        t = (src_dir / name).read_text(encoding="utf-8")
        for frag in frags:
            assert frag not in t, f"PRE-PASS src/{name} still has OLD fragment: {frag[:70]}"
    for name, frags in OLD_FRAGS.items():
        old_t = (pristine / "src" / name).read_text(encoding="utf-8")
        for frag in frags:
            assert frag in old_t, f"PRE-PASS pristine {name} missing OLD fragment (base moved?): {frag[:70]}"
    for name, frags in NEW_FRAGS.items():
        old_t = (pristine / "src" / name).read_text(encoding="utf-8")
        for frag in frags:
            assert frag not in old_t, f"PRE-PASS pristine {name} already has NEW fragment (base moved?): {frag[:70]}"
    print("pre-pass OK: V51 src fragments (new present, old gone, old present in pristine)")

    # --- 2. Validate the V51 layer itself ---
    v51_js_t = v51_js.read_text(encoding="utf-8")
    assert "</script>" not in v51_js_t.lower(), "v51.js contains </script>"
    assert "VERSION='19.6.0'" in v51_js_t and "window.__v51={" in v51_js_t, "v51.js must expose __v51 19.6.0"
    assert not _re.search(r"window\.S(?![A-Za-z])", _re.sub(r"/\*.*?\*/", "", v51_js_t, flags=_re.S)), "v51.js must never use window.S (lexical let)"
    assert "localStorage" not in _re.sub(r"/\*.*?\*/", "", v51_js_t, flags=_re.S), "v51.js must not touch localStorage"
    assert "function genPool(){" in v51_js_t, "v51.js must define genPool"
    assert "function extendEx(w){" in v51_js_t, "v51.js must define extendEx"
    assert "function templateFor(w,noun){" in v51_js_t, "v51.js must define templateFor"
    assert "function koDeckFirst(cards){" in v51_js_t, "v51.js must define koDeckFirst"
    for code in ("var VDENY=", "var ADENY=", "var A2_TIME=", "var B1_BECAUSE=", "var B2_WHICH=", "var N_TPL=", "var V_TPL=", "var A_TPL="):
        assert code in v51_js_t, f"v51.js missing {code}"
    v51_css_t = v51_css.read_text(encoding="utf-8")
    assert "</style>" not in v51_css_t.lower(), "v51.css contains </style>"
    assert "</body>" not in v51_css_t, "v51.css contains </body> (v37 trap)"
    assert ".v51gen" in v51_css_t, "v51.css must define .v51gen"
    assert "#1e3a5f" in v51_css_t, "v51.css must use the solid dark chip (theme-independent contrast)"
    print(f"validated src/v51.js ({len(v51_js_t)} chars) + src/v51.css ({len(v51_css_t)} chars)")

    # --- 3. Copy the edited src file + the new layer files into out/ ---
    for name in EDITED_SRC:
        _copy_bytes_epersafe(src_dir / name, out / name)
    _copy_bytes_epersafe(v51_js, out / "v51.js")
    _copy_bytes_epersafe(v51_css, out / "v51.css")

    # --- 4. Assemble the new index.html ---
    edits = []
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V19.5.1 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # wholesale sync of each edited embedded script block with its src file
    for name, vid in EDITED_SRC.items():
        old_src = (pristine / "src" / name).read_bytes()
        new_src = (src_dir / name).read_bytes()
        old_block = b'<script id="' + vid.encode() + b'">\n' + old_src + b'\n</script>'
        new_block = b'<script id="' + vid.encode() + b'">\n' + new_src + b'\n</script>'
        o0 = orig_bytes.find(old_block)
        assert o0 != -1 and orig_bytes.count(old_block) == 1, f"index.html: embedded {vid} block not found exactly once"
        edits.append({"start": o0, "end": o0 + len(old_block),
                      "chunks": [("glue", new_block)]})
    # V51 layer, immediately BEFORE <script id="v52js">, so v52 stays last.
    v52pos = orig_bytes.find(b'<script id="v52js">')
    assert v52pos != -1, "no <script id=\"v52js\"> in index.html — not a V19.5.1 build"
    assert v52pos > orig_bytes.rfind(b'id="v50js"'), "v52js is not after v50js - wrong base"
    edits.append({"start": v52pos, "end": v52pos, "chunks": [
        ("glue", b'\n<style id="v51">\n'),
        ("file", v51_css),
        ("glue", b'\n</style>\n<script id="v51js">\n'),
        ("file", v51_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 5. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V19.6 title missing / V19.5.1 title remains"
    assert "window.__v51={" in built and "VERSION='19.6.0'" in built, "built index.html missing __v51 19.6.0"
    # marker order: v51 style/script sit right before v52js (v52 last)
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v51", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v52", f"script marker order wrong: {script_ids}"
    assert script_ids[-2] == "v51", f"v51js is not second-to-last script: {script_ids}"
    assert built.find('id="v51js"') > built.find('id="v50js"'), "v51js is not after v50js"
    assert built.find('id="v51js"') < built.find('id="v52js"'), "v51js is not before v52js"
    assert built.find('id="v51"') > built.find('id="v50"'), "v51 style is not after v50"
    # old layers intact (spot versions incl. the two newest)
    for ver in ("19.3.0", "19.4.0", "19.5.0", "19.5.1", "19.6.0"):
        assert built.count("VERSION='%s'" % ver) == 1, f"built html: VERSION {ver} missing / duplicated"
    assert built.count("var TOTAL_BOSSES=87;") == 1, "built html: TOTAL_BOSSES=87 missing"
    assert built.count("lv:77") == 1, "built html: golem Lv 77 missing / duplicated"
    # V50 + V52 fragments still present
    for m in V50_MARKERS:
        assert m in built, f"built html lost V50 marker: {m}"
    for m in V52_MARKERS:
        assert m in built, f"built html lost V52 marker: {m}"
    assert built.count("_speakSeq50") >= 2, "built html: _speakSeq50 count changed"
    assert built.count("stopSpeak()") >= 6, "built html: stopSpeak() count changed"
    assert built.count("awardBossAnswerXP") >= 7, "built html: awardBossAnswerXP count changed"
    # V51 fragments present (exact counts)
    assert built.count('id="v51"') == 1, "built html: v51 style marker missing"
    assert built.count('id="v51js"') == 1, "built html: v51js script marker missing"
    assert built.count("window.__v51={") == 1, "built html: __v51 export missing"
    assert built.count("VERSION='19.6.0'") == 1, "built html: __v51 19.6.0 version missing"
    assert built.count("function genPool(){") == 1, "built html: genPool definition missing / duplicated"
    assert built.count("function extendEx(w){") == 1, "built html: extendEx definition missing / duplicated"
    assert built.count("function templateFor(w,noun){") == 1, "built html: templateFor definition missing / duplicated"
    assert built.count("function koDeckFirst(cards){") == 1, "built html: koDeckFirst definition missing / duplicated"
    assert built.count("function genItem(w,scopeName,nounPool){") == 1, "built html: genItem definition missing / duplicated"
    assert built.count("forgeAuto") >= 6, f"built html: forgeAuto mentions {built.count('forgeAuto')}, expected >= 6"
    assert built.count(".v51gen") == 1, "built html: .v51gen CSS rule missing / duplicated"
    assert built.count('class="v51gen"') == 1, "built html: .v51gen badge in the Forge card missing / duplicated"
    for name, frags in NEW_FRAGS.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW V51 fragment missing ({name}): {frag[:70]}"
    for name, frags in OLD_FRAGS.items():
        for frag in frags:
            assert frag not in built, f"built html: OLD V51 fragment still present ({name}): {frag[:70]}"
    # Embedded blocks are byte-identical to their src files (sync guarantee).
    for name, vid in EDITED_SRC.items():
        src_t = (src_dir / name).read_text(encoding="utf-8")
        pat = '<script id="%s">\n%s\n</script>' % (vid, src_t)
        assert built.count(pat) == 1, f"built html: embedded {vid} block does not match src/{name}"
        out_t = (out / name).read_text(encoding="utf-8")
        assert out_t == src_t, f"out/{name} differs from src/{name}"
    for layer in ("v51.js", "v51.css"):
        out_t = (out / layer).read_text(encoding="utf-8")
        assert out_t == (src_dir / layer).read_text(encoding="utf-8"), f"out/{layer} differs from src/{layer}"
    _node_check(v51_js)
    for name in EDITED_SRC:
        _node_check(src_dir / name)
    # ship the build script itself with the deliverable (reproducibility)
    _copy_bytes_epersafe(HERE / "build_v51r.py", out / "build_v51r.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V19.6, layer V51 rebased onto V19.5.1")
    print("V51: Forge auto-generates sentences from the active word set (scope/learned) — ex-extend + POS templates, bank fallback, forgeAuto flag; KO deck preference")
    print("marker order OK: v51 style/script before v52js (v52 last); V50+V52 fragments intact; embedded blocks == src files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
