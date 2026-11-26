#!/usr/bin/env python3
"""Build V19.7 (Bulk Korean Import, layer V54) from the pristine V19.6.1 build.

V19.7 = V19.6.1 (layer V53) + layer V54. Director (Claude,
2026-11-25): item #1 of the V19.7+ Korean plan — bulk Korean import,
FIRST (all later KO features need real data; the KO Forge pool is thin
from missing examples).

WHAT THIS SCRIPT DOES (in order):
  0. Backs up the pristine out/index.html + the new layer files into
     tools/v54/backup-v19.6.1-build/.
  1. Verifies the base is the pristine V19.6.1 build (hash +
     v51/v52/v53 markers present, v54 markers absent). REFUSES
     otherwise. PRE-PASS: every V54 fragment is checked BEFORE any
     file is mutated.
  2. Validates the V54 layer itself: v54.js / v54_seed.js / v54.css
     are well-formed; the seed carries its license header.
  3. Copies the new layer files into out/.
  4. Assembles the new index.html: the V19.7 title + the V54 layer
     injection (seed script, then v54 style + v54 script, LAST, after
     v53js — before </body>, rfind, v37.css gotcha). PURE ADDITIVE:
     no earlier embedded block is touched.
  5. Verifies: marker order (v54 style/script last), v54 version
     19.7.0, node --check on v54.js + v54_seed.js, V51 + V52 + V53
     fragments still present, V54 fragments present with exact counts.

RUN EXACTLY ONCE on a fresh V19.6.1 out/. NEVER re-run build_v51r.py,
build_v52.py, build_v53.py or any older build script on a finished
build (they reorder layers).
REBUILD-FROM-SCRATCH: restore out/index.html from
tools/v54/backup-v19.6.1/out/ (the build script mutates NOTHING in
src/ — it only reads the hand-written src files and copies them into
out/), re-run this script, and compare the out/index.html sha256 — it
must be byte-identical. The layer files are also kept as src__*.new in
tools/v54/backup-v19.6.1-build/.

Usage:  python3 build_v54.py [--out DIR] [--src DIR]
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

# Pristine V19.6.1 out/index.html (2,569,819 B) — verified before any edit.
V1961_HASH = "aa865a5dde58f6844800d6c1ff798b8fca1a0c2531e671ee6a6771ea42063484"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V19.6.1 — KO Forge — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V19.7 — Bulk KO Import — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# V54 markers: must be ABSENT from the pristine V19.6.1 base, present after.
V54_MARKERS = [
    'id="v54js"', 'id="v54"', 'id="v54seedjs"', "VERSION='19.7.0'", 'window.__v54={',
    'window.__V54_SEED', 'koImport', 'dryRun54', 'snapshotBeforeImport54',
    'confirmImport54', 'parseRows54', 'v54hub', 'v54btn',
]

# V51 + V52 + V53 markers: must be PRESENT in the base and in the build.
V51_MARKERS = ['id="v51js"', 'id="v51"', "VERSION='19.6.0'", 'window.__v51={',
               'function genPool(){', 'koDeckFirst', 'forgeAuto', 'v51gen']
V52_MARKERS = ['id="v52js"', "VERSION='19.5.1'", 'window.__v52={',
               'function mark18(ok,w,qkey)', 'function mark19(ok,w,qkey)',
               'wordlessKey18', 'wordlessKey19']
V53_MARKERS = ['id="v53js"', 'id="v53"', "VERSION='19.6.1'", 'window.__v53={',
               'function koQuality(e){', 'function koPool53(cards, deck){',
               'function bandKO(n){', 'function koOrderSession(items, n){']

# No edited src files in V54 — pure additive layer (no earlier embedded
# block is touched).
EDITED_SRC = {}

# --- NEW fragments (must be present in the layer files + built html) ---
NEW_FRAGS = {
    "v54.js": [
        "/* V54 (V19.7) — Bulk Korean Import (flag koImport).",
        "function dryRun54(input, opts) {",
        "function confirmImport54(pv) {",
        "function snapshotBeforeImport54() {",
        "function undoImport54(batchId) {",
        "function seedPreview54() {",
        "function parseRows54(text) {",
        "hanvocab.v12.preimport54-",
        "function open54() {",
        "function decorateData54() {",
    ],
    "v54_seed.js": [
        "window.__V54_SEED = ",
        "CC BY-SA 2.0 KR",
        "한국어기초사전",
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
    tmp = pathlib.Path(dst).with_name(pathlib.Path(dst).name + ".tmp54")
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
    pristine = ROOT / "tools" / "v54" / "backup-v19.6.1"
    v54_js = src_dir / "v54.js"
    v54_css = src_dir / "v54.css"
    v54_seed = src_dir / "v54_seed.js"
    assert v54_js.exists(), "src/v54.js missing"
    assert v54_css.exists(), "src/v54.css missing"
    assert v54_seed.exists(), "src/v54_seed.js missing"
    assert (pristine / "out" / "index.html").exists(), "tools/v54/backup-v19.6.1/out/index.html missing"

    # --- 0. Back up the pristine out/index.html + the new layer files
    # into tools/v54/backup-v19.6.1-build/. ---
    backup = ROOT / "tools" / "v54" / "backup-v19.6.1-build"
    backup.mkdir(parents=True, exist_ok=True)
    live = out / "index.html"
    src_copy = pristine / "out" / "index.html"
    assert live.exists(), "out/index.html missing"
    assert _sha256(live) == _sha256(src_copy), (
        "out/index.html differs from the pristine copy — refusing to build on a moved tree")
    _copy_bytes_epersafe(src_copy, backup / "out__index.html")
    for layer in (v54_js, v54_css, v54_seed):
        _copy_bytes_epersafe(layer, backup / ("src__" + layer.name + ".new"))
    _copy_bytes_epersafe(HERE / "build_v54.py", backup / "build_v54.py")
    print(f"backup OK: out/index.html + 3 new layer files recorded in {backup}")

    # --- 1. Verify the base is pristine V19.6.1 ---
    index = out / "index.html"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V1961_HASH, f"base is not pristine V19.6.1: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    for m in V51_MARKERS:
        assert m in built, f"V51 marker missing — not a V19.6.1 build: {m}"
    for m in V52_MARKERS:
        assert m in built, f"V52 marker missing — not a V19.6.1 build: {m}"
    for m in V53_MARKERS:
        assert m in built, f"V53 marker missing — not a V19.6.1 build: {m}"
    for m in V54_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V19.6.1 title not found exactly once"
    print(f"verified pristine V19.6.1 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v51+v52+v53 markers present, v54 absent")

    # --- 1b. PRE-PASS: V54 fragments in the layer files ---
    for name, frags in NEW_FRAGS.items():
        t = (src_dir / name).read_text(encoding="utf-8")
        for frag in frags:
            assert frag in t, f"PRE-PASS src/{name} missing NEW fragment: {frag[:70]}"
    print("pre-pass OK: V54 layer fragments present")

    # --- 2. Validate the V54 layer itself ---
    v54_js_t = v54_js.read_text(encoding="utf-8")
    assert "</script>" not in v54_js_t.lower(), "v54.js contains </script>"
    assert "VERSION='19.7.0'" in v54_js_t and "window.__v54={" in v54_js_t, "v54.js must expose __v54 19.7.0"
    assert not _re.search(r"window\.S(?![A-Za-z])", _re.sub(r"/\*.*?\*/", "", v54_js_t, flags=_re.S)), "v54.js must never use window.S (lexical let)"
    assert "function dryRun54(input, opts) {" in v54_js_t, "v54.js must define dryRun54"
    assert "function confirmImport54(pv) {" in v54_js_t, "v54.js must define confirmImport54"
    assert "function snapshotBeforeImport54() {" in v54_js_t, "v54.js must define snapshotBeforeImport54"
    assert "function parseRows54(text) {" in v54_js_t, "v54.js must define parseRows54"
    assert "function open54() {" in v54_js_t, "v54.js must define open54"
    v54_css_t = v54_css.read_text(encoding="utf-8")
    assert "</style>" not in v54_css_t.lower(), "v54.css contains </style>"
    assert "</body>" not in v54_css_t, "v54.css contains </body> (v37 trap)"
    assert ".v54hub" in v54_css_t, "v54.css must define .v54hub"
    assert ".v54btn" in v54_css_t, "v54.css must define .v54btn"
    v54_seed_t = v54_seed.read_text(encoding="utf-8")
    assert "window.__V54_SEED" in v54_seed_t, "v54_seed.js must define __V54_SEED"
    assert "CC BY-SA 2.0 KR" in v54_seed_t, "v54_seed.js must carry its license"
    assert "</script>" not in v54_seed_t.lower(), "v54_seed.js contains </script>"
    print(f"validated src/v54.js ({len(v54_js_t)} chars) + src/v54.css ({len(v54_css_t)} chars) + src/v54_seed.js ({len(v54_seed_t)} chars)")

    # --- 3. Copy the new layer files into out/ ---
    _copy_bytes_epersafe(v54_js, out / "v54.js")
    _copy_bytes_epersafe(v54_css, out / "v54.css")
    _copy_bytes_epersafe(v54_seed, out / "v54_seed.js")

    # --- 4. Assemble the new index.html ---
    edits = []
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V19.6.1 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # V54 layer, LAST, before </body> (rfind — v37.css "</body>" trap).
    # Order: seed script, then v54 style, then v54 script — all after v53js.
    body = orig_bytes.rfind(b"</body>")
    assert body != -1, "no </body> in index.html"
    assert body > orig_bytes.rfind(b'id="v53js"'), "injection point is before v53js - wrong </body>"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<script id="v54seedjs">\n'),
        ("file", v54_seed),
        ("glue", b'\n</script>\n<style id="v54">\n'),
        ("file", v54_css),
        ("glue", b'\n</style>\n<script id="v54js">\n'),
        ("file", v54_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 5. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V19.7 title missing / V19.6.1 title remains"
    assert "window.__v54={" in built and "VERSION='19.7.0'" in built, "built index.html missing __v54 19.7.0"
    assert "window.__V54_SEED" in built, "built index.html missing __V54_SEED"
    # marker order: v54 style/script are the LAST markers before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v54", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v54", f"script marker order wrong: {script_ids}"
    assert built.find('id="v54js"') > built.find('id="v53js"'), "v54js is not after v53js"
    assert built.find('id="v54"') > built.find('id="v53"'), "v54 style is not after v53"
    assert built.find('id="v54seedjs"') > built.find('id="v53js"'), "v54seedjs is not after v53js"
    assert built.find('id="v54seedjs"') < built.find('id="v54js"'), "v54seedjs must load before v54js"
    # old layers intact (spot versions incl. the four newest)
    for ver in ("19.3.0", "19.4.0", "19.5.0", "19.5.1", "19.6.0", "19.6.1", "19.7.0"):
        assert built.count("VERSION='%s'" % ver) == 1, f"built html: VERSION {ver} missing / duplicated"
    assert built.count("var TOTAL_BOSSES=87;") == 1, "built html: TOTAL_BOSSES=87 missing"
    assert built.count("lv:77") == 1, "built html: golem Lv 77 missing / duplicated"
    # V51 + V52 + V53 fragments still present
    for m in V51_MARKERS:
        assert m in built, f"built html lost V51 marker: {m}"
    for m in V52_MARKERS:
        assert m in built, f"built html lost V52 marker: {m}"
    for m in V53_MARKERS:
        assert m in built, f"built html lost V53 marker: {m}"
    assert built.count("function genPool(){") == 1, "built html: genPool definition missing / duplicated"
    assert built.count("function koDeckFirst(cards){") == 1, "built html: koDeckFirst definition missing / duplicated"
    assert built.count("function koQuality(e){") == 1, "built html: koQuality definition missing / duplicated"
    assert built.count("function koPool53(cards, deck){") == 1, "built html: koPool53 definition missing / duplicated"
    # V54 fragments present (exact counts)
    assert built.count('id="v54"') == 1, "built html: v54 style marker missing"
    assert built.count('id="v54js"') == 1, "built html: v54js script marker missing"
    assert built.count('id="v54seedjs"') == 1, "built html: v54seedjs script marker missing"
    assert built.count("window.__v54={") == 1, "built html: __v54 export missing"
    assert built.count("window.__V54_SEED") >= 1, "built html: __V54_SEED missing"
    assert built.count("VERSION='19.7.0'") == 1, "built html: __v54 19.7.0 version missing"
    assert built.count("function dryRun54(input, opts) {") == 1, "built html: dryRun54 definition missing / duplicated"
    assert built.count("function confirmImport54(pv) {") == 1, "built html: confirmImport54 definition missing / duplicated"
    assert built.count("function snapshotBeforeImport54() {") == 1, "built html: snapshotBeforeImport54 definition missing / duplicated"
    assert built.count("function parseRows54(text) {") == 1, "built html: parseRows54 definition missing / duplicated"
    assert built.count(".v54hub") == 1, "built html: .v54hub CSS rule missing / duplicated"
    for name, frags in NEW_FRAGS.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW V54 fragment missing ({name}): {frag[:70]}"
    # Standalone out/ files are byte-identical to their src files.
    for layer in ("v54.js", "v54.css", "v54_seed.js"):
        out_t = (out / layer).read_text(encoding="utf-8")
        assert out_t == (src_dir / layer).read_text(encoding="utf-8"), f"out/{layer} differs from src/{layer}"
    _node_check(v54_js)
    _node_check(v54_seed)
    # ship the build script itself with the deliverable (reproducibility)
    _copy_bytes_epersafe(HERE / "build_v54.py", out / "build_v54.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V19.7, layer V54 on V19.6.1")
    print("V54: Bulk Korean Import — dry-run preview, pre-import backup + undo, source/license/level per row, KRDict seed (50 words, CC BY-SA 2.0 KR)")
    print("marker order OK: seed + v54 style/script last (after v53js); V51+V52+V53 fragments intact; pure additive, no earlier block touched")
    return 0


if __name__ == "__main__":
    sys.exit(main())
