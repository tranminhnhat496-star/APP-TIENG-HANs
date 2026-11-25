#!/usr/bin/env python3
"""Build V19.6.1 (KO SENTENCE FORGE, layer V53) from the pristine V19.6 build.

V19.6.1 = V19.6 (rebased, layer V51) + layer V53. Director (Claude,
2026-11-25): fix the KOREAN Sentence Forge pool by option (b) — keep
real examples as the base, expand the pool; NO template generation.

WHAT THIS SCRIPT DOES (in order):
  0. Backs up the pristine out/index.html + the pre-fix standalone
     src file + the new layer files into
     tools/v53/backup-v19.6-build/.
  1. Verifies the base is the pristine V19.6 build (hash +
     v51/v52 markers present, v53 markers absent). REFUSES
     otherwise. PRE-PASS: every V53 replacement anchor is
     checked (src files AND out/index.html) BEFORE any file is
     mutated; OLD fragments must be present in the pristine
     files and absent in the new src files.
  2. Validates the V53 layer itself: the edited src file carries
     its NEW fragments and no longer carries its OLD fragments;
     the new layer files are well-formed.
  3. Copies the edited src file + the new layer files into out/.
  4. Assembles the new index.html: the V19.6.1 title + wholesale
     sync of the edited embedded script block with its src file
     (the old embedded block must equal the pristine standalone
     file, asserted byte-for-byte) + the V53 layer injection
     (style v53 + script v53js, LAST, before </body> — rfind,
     v37.css gotcha).
  5. Verifies: marker order (v53 style/script last), v53 version
     19.6.1, node --check on v53.js + the touched src file,
     V51 + V52 fragments still present, V53 fragments present
     with exact counts, out-of-scope markers absent.

RUN EXACTLY ONCE on a fresh V19.6 out/. NEVER re-run build_v51r.py,
build_v52.py or any older build script on a finished build (they
reorder layers).
REBUILD-FROM-SCRATCH: restore out/index.html from
tools/v53/backup-v19.6/out/ (the build script mutates NOTHING
in src/ — it only reads the hand-edited src files and copies them
into out/), re-run this script, and compare the out/index.html
sha256 — it must be byte-identical. The hand-edited src files are
also kept as src__*.new in tools/v53/backup-v19.6-build/.

Usage:  python3 build_v53.py [--out DIR] [--src DIR]
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

# Pristine V19.6 (rebased) out/index.html (2,556,928 B) — verified before any edit.
V196_HASH = "48555ddfd1ab7c9e8a55fba8cc1eb804ee27b09f665a45a4f5c54e80bb807a8b"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V19.6 — Sentence Forge Auto — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V19.6.1 — KO Forge — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# V53 markers: must be ABSENT from the pristine V19.6 base, present after.
V53_MARKERS = [
    'id="v53js"', 'id="v53"', "VERSION='19.6.1'", 'window.__v53={',
    'koQuality', 'koPool53', 'koOrderSession', 'bandKO', 'v53new', 'v53note',
]

# V51 + V52 markers: must be PRESENT in the base and in the build.
V51_MARKERS = ['id="v51js"', 'id="v51"', "VERSION='19.6.0'", 'window.__v51={',
               'function genPool(){', 'koDeckFirst', 'forgeAuto', 'v51gen']
V52_MARKERS = ['id="v52js"', "VERSION='19.5.1'", 'window.__v52={',
               'function mark18(ok,w,qkey)', 'function mark19(ok,w,qkey)',
               'wordlessKey18', 'wordlessKey19']

# src files edited by V53 (embedded blocks are synced wholesale).
EDITED_SRC = {"v48.js": "v48js"}

# --- NEW fragments (must be present in the edited src file + built html) ---
NEW_FRAGS = {"v48.js": [
    "/* V53 (V19.6.1): expanded KO pool — learned examples first,",
    "try{if(window.__v53&&__v53.koPool53)ko53=__v53.koPool53()}catch(e){ko53=null}",
    "out.items=ko53.items;out.learned=ko53.learned;out.koSent=ko53.koSent;",
    "out.notice=ko53.notice||null;out.primary=ko53.primary;",
    "/* V53 (V19.6.1): KO session draws priority-first (learned → same",
    "try{if(window.__v53&&__v53.koOrderSession)items=__v53.koOrderSession(g.pool.items,FORGE_SESSION_N)}catch(e){items=null}",
    "bonusPaid:0,notice:(g.pool&&g.pool.notice)||null};",
    "Câu ví dụ thật: '+g.pool.koSent+' câu'",
    "v53note\">⚠️ Bộ từ đang học chỉ có '+g.pool.notice.primary+' câu ví dụ (cần ~'+FORGE_SESSION_N+')",
    "'<span class=\"v53new\">chưa học</span>'",
    "v53note\">⚠️ Đã bổ sung '+FS.notice.added+' câu từ từ chưa học / bộ khác (bộ đang học chỉ có '+FS.notice.primary+' câu).",
    "Buổi này có '+FS.list.filter(function(it){return it.learned===false}).length+' câu từ từ chưa học (đã đánh dấu “chưa học”).",
]}
# --- OLD fragments (must be present in the PRISTINE file, GONE after) ---
OLD_FRAGS = {"v48.js": [
    "  var items=shuffle(g.pool.items).slice(0,FORGE_SESSION_N);\n  FS={lang:lang,list:items,i:0,built:[],used:{},right:0,streak:0,score:0,checked:false,ok:null,sessionId:'f'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36),done:false,bonusPaid:0};",
    "      var cards=learnedKO();out.learned=cards.length;\n      /* V51 (V19.6): prefer the selected KO deck (S.deck) when set —",
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
    tmp = pathlib.Path(dst).with_name(pathlib.Path(dst).name + ".tmp53")
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
    pristine = ROOT / "tools" / "v53" / "backup-v19.6"
    v53_js = src_dir / "v53.js"
    v53_css = src_dir / "v53.css"
    assert v53_js.exists(), "src/v53.js missing"
    assert v53_css.exists(), "src/v53.css missing"
    assert (pristine / "out" / "index.html").exists(), "tools/v53/backup-v19.6/out/index.html missing"
    assert (pristine / "src" / "v48.js").exists(), "tools/v53/backup-v19.6/src/v48.js missing"

    # --- 0. Back up the pristine out/index.html + the pre-fix standalone
    # src file + the new layer files into tools/v53/backup-v19.6-build/. ---
    backup = ROOT / "tools" / "v53" / "backup-v19.6-build"
    backup.mkdir(parents=True, exist_ok=True)
    live = out / "index.html"
    src_copy = pristine / "out" / "index.html"
    assert live.exists(), "out/index.html missing"
    assert _sha256(live) == _sha256(src_copy), (
        "out/index.html differs from the pristine copy — refusing to build on a moved tree")
    _copy_bytes_epersafe(src_copy, backup / "out__index.html")
    for name in EDITED_SRC:
        _copy_bytes_epersafe(pristine / "src" / name, backup / ("src__" + name + ".old"))
    for layer in (v53_js, v53_css):
        _copy_bytes_epersafe(layer, backup / ("src__" + layer.name + ".new"))
    _copy_bytes_epersafe(HERE / "build_v53.py", backup / "build_v53.py")
    print(f"backup OK: out/index.html + {len(EDITED_SRC)} pre-fix src file + 2 new layer files recorded in {backup}")

    # --- 1. Verify the base is pristine V19.6 ---
    index = out / "index.html"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V196_HASH, f"base is not pristine V19.6: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    for m in V51_MARKERS:
        assert m in built, f"V51 marker missing — not a V19.6 build: {m}"
    for m in V52_MARKERS:
        assert m in built, f"V52 marker missing — not a V19.6 build: {m}"
    for m in V53_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V19.6 title not found exactly once"
    # Each edited embedded script block must equal its pristine standalone file.
    for name, vid in EDITED_SRC.items():
        old_src = (pristine / "src" / name).read_text(encoding="utf-8")
        pat = '<script id="%s">\n%s\n</script>' % (vid, old_src)
        assert built.count(pat) == 1, f"embedded {vid} block does not match pristine {name} exactly once"
    # Standalone out/ file must also be pristine before we overwrite it.
    assert (out / "v48.js").read_bytes() == (pristine / "src" / "v48.js").read_bytes(), "out/v48.js differs from pristine src/v48.js"
    print(f"verified pristine V19.6 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v51+v52 markers present, v53 absent")

    # --- 1b. PRE-PASS: V53 anchors (src + index.html) ---
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
    print("pre-pass OK: V53 src fragments (new present, old gone, old present in pristine)")

    # --- 2. Validate the V53 layer itself ---
    v53_js_t = v53_js.read_text(encoding="utf-8")
    assert "</script>" not in v53_js_t.lower(), "v53.js contains </script>"
    assert "VERSION='19.6.1'" in v53_js_t and "window.__v53={" in v53_js_t, "v53.js must expose __v53 19.6.1"
    assert not _re.search(r"window\.S(?![A-Za-z])", _re.sub(r"/\*.*?\*/", "", v53_js_t, flags=_re.S)), "v53.js must never use window.S (lexical let)"
    assert "localStorage" not in _re.sub(r"/\*.*?\*/", "", v53_js_t, flags=_re.S), "v53.js must not touch localStorage"
    assert "function koQuality(e){" in v53_js_t, "v53.js must define koQuality"
    assert "function koPool53(cards, deck){" in v53_js_t, "v53.js must define koPool53"
    assert "function bandKO(n){" in v53_js_t, "v53.js must define bandKO"
    assert "function koOrderSession(items, n){" in v53_js_t, "v53.js must define koOrderSession"
    v53_css_t = v53_css.read_text(encoding="utf-8")
    assert "</style>" not in v53_css_t.lower(), "v53.css contains </style>"
    assert "</body>" not in v53_css_t, "v53.css contains </body> (v37 trap)"
    assert ".v53new" in v53_css_t, "v53.css must define .v53new"
    assert ".v53note" in v53_css_t, "v53.css must define .v53note"
    assert "#6b3a00" in v53_css_t, "v53.css must use the solid dark chip (theme-independent contrast)"
    assert "#ffd76a" in v53_css_t, "v53.css must use the gold notice colour"
    print(f"validated src/v53.js ({len(v53_js_t)} chars) + src/v53.css ({len(v53_css_t)} chars)")

    # --- 3. Copy the edited src file + the new layer files into out/ ---
    for name in EDITED_SRC:
        _copy_bytes_epersafe(src_dir / name, out / name)
    _copy_bytes_epersafe(v53_js, out / "v53.js")
    _copy_bytes_epersafe(v53_css, out / "v53.css")

    # --- 4. Assemble the new index.html ---
    edits = []
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V19.6 title not found exactly once"
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
    # V53 layer, LAST, before </body> (rfind — v37.css "</body>" trap).
    body = orig_bytes.rfind(b"</body>")
    assert body != -1, "no </body> in index.html"
    assert body > orig_bytes.rfind(b'id="v52js"'), "injection point is before v52js - wrong </body>"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v53">\n'),
        ("file", v53_css),
        ("glue", b'\n</style>\n<script id="v53js">\n'),
        ("file", v53_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 5. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V19.6.1 title missing / V19.6 title remains"
    assert "window.__v53={" in built and "VERSION='19.6.1'" in built, "built index.html missing __v53 19.6.1"
    # marker order: v53 style/script are the LAST markers before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v53", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v53", f"script marker order wrong: {script_ids}"
    assert built.find('id="v53js"') > built.find('id="v52js"'), "v53js is not after v52js"
    assert built.find('id="v53"') > built.find('id="v52"'), "v53 style is not after v52"
    # old layers intact (spot versions incl. the three newest)
    for ver in ("19.3.0", "19.4.0", "19.5.0", "19.5.1", "19.6.0", "19.6.1"):
        assert built.count("VERSION='%s'" % ver) == 1, f"built html: VERSION {ver} missing / duplicated"
    assert built.count("var TOTAL_BOSSES=87;") == 1, "built html: TOTAL_BOSSES=87 missing"
    assert built.count("lv:77") == 1, "built html: golem Lv 77 missing / duplicated"
    # V51 + V52 fragments still present
    for m in V51_MARKERS:
        assert m in built, f"built html lost V51 marker: {m}"
    for m in V52_MARKERS:
        assert m in built, f"built html lost V52 marker: {m}"
    assert built.count("_speakSeq50") >= 2, "built html: _speakSeq50 count changed"
    assert built.count("stopSpeak()") >= 6, "built html: stopSpeak() count changed"
    assert built.count("awardBossAnswerXP") >= 7, "built html: awardBossAnswerXP count changed"
    assert built.count("function genPool(){") == 1, "built html: genPool definition missing / duplicated"
    assert built.count("function koDeckFirst(cards){") == 1, "built html: koDeckFirst definition missing / duplicated"
    # V53 fragments present (exact counts)
    assert built.count('id="v53"') == 1, "built html: v53 style marker missing"
    assert built.count('id="v53js"') == 1, "built html: v53js script marker missing"
    assert built.count("window.__v53={") == 1, "built html: __v53 export missing"
    assert built.count("VERSION='19.6.1'") == 1, "built html: __v53 19.6.1 version missing"
    assert built.count("function koQuality(e){") == 1, "built html: koQuality definition missing / duplicated"
    assert built.count("function koPool53(cards, deck){") == 1, "built html: koPool53 definition missing / duplicated"
    assert built.count("function bandKO(n){") == 1, "built html: bandKO definition missing / duplicated"
    assert built.count("function koOrderSession(items, n){") == 1, "built html: koOrderSession definition missing / duplicated"
    assert built.count(".v53new") == 1, "built html: .v53new CSS rule missing / duplicated"
    assert built.count(".v53note") == 1, "built html: .v53note CSS rule missing / duplicated"
    assert built.count('class="v53new"') == 1, "built html: .v53new badge in the Forge card missing / duplicated"
    assert built.count("v53note") >= 3, f"built html: v53note mentions {built.count('v53note')}, expected >= 3"
    for name, frags in NEW_FRAGS.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW V53 fragment missing ({name}): {frag[:70]}"
    for name, frags in OLD_FRAGS.items():
        for frag in frags:
            assert frag not in built, f"built html: OLD V53 fragment still present ({name}): {frag[:70]}"
    # Embedded blocks are byte-identical to their src files (sync guarantee).
    for name, vid in EDITED_SRC.items():
        src_t = (src_dir / name).read_text(encoding="utf-8")
        pat = '<script id="%s">\n%s\n</script>' % (vid, src_t)
        assert built.count(pat) == 1, f"built html: embedded {vid} block does not match src/{name}"
        out_t = (out / name).read_text(encoding="utf-8")
        assert out_t == src_t, f"out/{name} differs from src/{name}"
    for layer in ("v53.js", "v53.css"):
        out_t = (out / layer).read_text(encoding="utf-8")
        assert out_t == (src_dir / layer).read_text(encoding="utf-8"), f"out/{layer} differs from src/{layer}"
    _node_check(v53_js)
    for name in EDITED_SRC:
        _node_check(src_dir / name)
    # ship the build script itself with the deliverable (reproducibility)
    _copy_bytes_epersafe(HERE / "build_v53.py", out / "build_v53.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V19.6.1, layer V53 on V19.6")
    print("V53: KO Forge pool expanded (learned → group/deck → other unlearned, 'chưa học' badge), token ladder 2-3 → 4-5 → 6+, short-pool notice + supplement, quality filter")
    print("marker order OK: v53 style/script last (after v52js); V51+V52 fragments intact; embedded blocks == src files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
