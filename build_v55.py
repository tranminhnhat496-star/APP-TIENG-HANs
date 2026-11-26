#!/usr/bin/env python3
"""Build V19.8 (KO SRS Review UI, layer V55) from the pristine V19.7 build.

V19.8 = V19.7 (layer V54) + layer V55. Director (Claude,
2026-11-25): item #2 of the V19.7+ Korean plan — KO SRS (due queue +
weak words + stats), inserted right after bulk import and before
cloze. Two layers: queue + weak + stats first (flag koSrsUI); the
Smart Learning daily plan (b) comes in a LATER version after TOPIK.

WHAT THIS SCRIPT DOES (in order):
  0. Backs up the pristine out/index.html + the new layer files into
     tools/v55/backup-v19.7-build/.
  1. Verifies the base is the pristine V19.7 build (hash +
     v51/v52/v53/v54 markers present, v55 markers absent). REFUSES
     otherwise. PRE-PASS: every V55 fragment is checked BEFORE any
     file is mutated.
  2. Validates the V55 layer itself: v55.js / v55.css are
     well-formed; no </script> / </style> / </body> traps.
  3. Copies the new layer files into out/.
  4. Assembles the new index.html: the V19.8 title + the V55 layer
     injection (v55 style + v55 script, LAST, after v54js — before
     </body>, rfind, v37.css gotcha). PURE ADDITIVE: no earlier
     embedded block is touched (the KO Hub entry is a runtime
     decorator, not a build-time string edit).
  5. Verifies: marker order (v55 style/script last), v55 version
     19.8.0, node --check on v55.js, V51 + V52 + V53 + V54
     fragments still present, V55 fragments present with exact
     counts.

RUN EXACTLY ONCE on a fresh V19.7 out/. NEVER re-run build_v51r.py,
build_v52.py, build_v53.py, build_v54.py or any older build script
on a finished build (they reorder layers).
REBUILD-FROM-SCRATCH: restore out/index.html from
tools/v55/backup-v19.7/out/ (the build script mutates NOTHING in
src/ — it only reads the hand-written src files and copies them into
out/), re-run this script, and compare the out/index.html sha256 — it
must be byte-identical. The layer files are also kept as src__*.new in
tools/v55/backup-v19.7-build/.

Usage:  python3 build_v55.py [--out DIR] [--src DIR]
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

# Pristine V19.7 out/index.html (2,627,515 B) — verified before any edit.
V197_HASH = "aa6333d0135cc110635851ad00f274a219cb183f26a98fbe8a36796f3d057322"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V19.7 — Bulk KO Import — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V19.8 — KO SRS — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# V55 markers: must be ABSENT from the pristine V19.7 base, present after.
V55_MARKERS = [
    'id="v55js"', 'id="v55"', "VERSION='19.8.0'", 'window.__v55={',
    'koSrsUI', 'dueQueue55', 'weakList55', 'koStats55', 'isDue55',
    'dueFor55', 'openSrs', 'v55kotab', 'v55hub',
]

# V51 + V52 + V53 + V54 markers: must be PRESENT in the base and in the build.
V51_MARKERS = ['id="v51js"', 'id="v51"', "VERSION='19.6.0'", 'window.__v51={',
               'function genPool(){', 'koDeckFirst', 'forgeAuto', 'v51gen']
V52_MARKERS = ['id="v52js"', "VERSION='19.5.1'", 'window.__v52={',
               'function mark18(ok,w,qkey)', 'function mark19(ok,w,qkey)',
               'wordlessKey18', 'wordlessKey19']
V53_MARKERS = ['id="v53js"', 'id="v53"', "VERSION='19.6.1'", 'window.__v53={',
               'function koQuality(e){', 'function koPool53(cards, deck){',
               'function bandKO(n){', 'function koOrderSession(items, n){']
V54_MARKERS = ['id="v54js"', 'id="v54"', 'id="v54seedjs"', "VERSION='19.7.0'", 'window.__v54={',
               'window.__V54_SEED', 'koImport', 'dryRun54', 'snapshotBeforeImport54',
               'confirmImport54', 'parseRows54', 'v54hub', 'v54btn']

# No edited src files in V55 — pure additive layer (no earlier embedded
# block is touched).
EDITED_SRC = {}

# --- NEW fragments (must be present in the layer files + built html) ---
NEW_FRAGS = {
    "v55.js": [
        "/* ===== V55 — KO SRS REVIEW UI (V19.8) =====",
        "function isDue55(box,due,now){",
        "function dueFor55(lang,id){",
        "function dueQueue55(cap){",
        "function weakList55(){",
        "function koStats55(){",
        "function openSrs(){",
        "function startReview55(){",
        "function decorateKO55(){",
        "function flagOn55Raw(name){",
        "v55kotab",
    ],
    "v55.css": [
        "#v55hub",
        ".v55in",
        ".v55badge.weak",
        ".v55badge.due",
        ".v55btn.pri",
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
    tmp = pathlib.Path(dst).with_name(pathlib.Path(dst).name + ".tmp55")
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
    pristine = ROOT / "tools" / "v55" / "backup-v19.7"
    v55_js = src_dir / "v55.js"
    v55_css = src_dir / "v55.css"
    assert v55_js.exists(), "src/v55.js missing"
    assert v55_css.exists(), "src/v55.css missing"
    assert (pristine / "out" / "index.html").exists(), "tools/v55/backup-v19.7/out/index.html missing"

    # --- 0. Back up the pristine out/index.html + the new layer files
    # into tools/v55/backup-v19.7-build/. ---
    backup = ROOT / "tools" / "v55" / "backup-v19.7-build"
    backup.mkdir(parents=True, exist_ok=True)
    live = out / "index.html"
    src_copy = pristine / "out" / "index.html"
    assert live.exists(), "out/index.html missing"
    assert _sha256(live) == _sha256(src_copy), (
        "out/index.html differs from the pristine copy — refusing to build on a moved tree")
    _copy_bytes_epersafe(src_copy, backup / "out__index.html")
    for layer in (v55_js, v55_css):
        _copy_bytes_epersafe(layer, backup / ("src__" + layer.name + ".new"))
    _copy_bytes_epersafe(HERE / "build_v55.py", backup / "build_v55.py")
    print(f"backup OK: out/index.html + 2 new layer files recorded in {backup}")

    # --- 1. Verify the base is pristine V19.7 ---
    index = out / "index.html"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V197_HASH, f"base is not pristine V19.7: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    for m in V51_MARKERS:
        assert m in built, f"V51 marker missing — not a V19.7 build: {m}"
    for m in V52_MARKERS:
        assert m in built, f"V52 marker missing — not a V19.7 build: {m}"
    for m in V53_MARKERS:
        assert m in built, f"V53 marker missing — not a V19.7 build: {m}"
    for m in V54_MARKERS:
        assert m in built, f"V54 marker missing — not a V19.7 build: {m}"
    for m in V55_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V19.7 title not found exactly once"
    print(f"verified pristine V19.7 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v51+v52+v53+v54 markers present, v55 absent")

    # --- 1b. PRE-PASS: V55 fragments in the layer files ---
    for name, frags in NEW_FRAGS.items():
        t = (src_dir / name).read_text(encoding="utf-8")
        for frag in frags:
            assert frag in t, f"PRE-PASS src/{name} missing NEW fragment: {frag[:70]}"
    print("pre-pass OK: V55 layer fragments present")

    # --- 2. Validate the V55 layer itself ---
    v55_js_t = v55_js.read_text(encoding="utf-8")
    assert "</script>" not in v55_js_t.lower(), "v55.js contains </script>"
    assert "VERSION='19.8.0'" in v55_js_t and "window.__v55={" in v55_js_t, "v55.js must expose __v55 19.8.0"
    assert not _re.search(r"window\.S(?![A-Za-z])", _re.sub(r"/\*.*?\*/", "", v55_js_t, flags=_re.S)), "v55.js must never use window.S (lexical let)"
    assert "function isDue55(box,due,now){" in v55_js_t, "v55.js must define isDue55"
    assert "function dueFor55(lang,id){" in v55_js_t, "v55.js must define dueFor55"
    assert "function dueQueue55(cap){" in v55_js_t, "v55.js must define dueQueue55"
    assert "function weakList55(){" in v55_js_t, "v55.js must define weakList55"
    assert "function koStats55(){" in v55_js_t, "v55.js must define koStats55"
    assert "function openSrs(){" in v55_js_t, "v55.js must define openSrs"
    assert "function startReview55(){" in v55_js_t, "v55.js must define startReview55"
    assert "function decorateKO55(){" in v55_js_t, "v55.js must define decorateKO55"
    v55_css_t = v55_css.read_text(encoding="utf-8")
    assert "</style>" not in v55_css_t.lower(), "v55.css contains </style>"
    assert "</body>" not in v55_css_t, "v55.css contains </body> (v37 trap)"
    assert "#v55hub" in v55_css_t, "v55.css must define #v55hub"
    assert ".v55btn" in v55_css_t, "v55.css must define .v55btn"
    print(f"validated src/v55.js ({len(v55_js_t)} chars) + src/v55.css ({len(v55_css_t)} chars)")

    # --- 3. Copy the new layer files into out/ ---
    _copy_bytes_epersafe(v55_js, out / "v55.js")
    _copy_bytes_epersafe(v55_css, out / "v55.css")

    # --- 4. Assemble the new index.html ---
    edits = []
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V19.7 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # V55 layer, LAST, before </body> (rfind — v37.css "</body>" trap).
    # Order: v55 style, then v55 script — both after v54js.
    body = orig_bytes.rfind(b"</body>")
    assert body != -1, "no </body> in index.html"
    assert body > orig_bytes.rfind(b'id="v54js"'), "injection point is before v54js - wrong </body>"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v55">\n'),
        ("file", v55_css),
        ("glue", b'\n</style>\n<script id="v55js">\n'),
        ("file", v55_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 5. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V19.8 title missing / V19.7 title remains"
    assert "window.__v55={" in built and "VERSION='19.8.0'" in built, "built index.html missing __v55 19.8.0"
    # marker order: v55 style/script are the LAST markers before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v55", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v55", f"script marker order wrong: {script_ids}"
    assert built.find('id="v55js"') > built.find('id="v54js"'), "v55js is not after v54js"
    assert built.find('id="v55"') > built.find('id="v54"'), "v55 style is not after v54"
    # old layers intact (spot versions incl. the five newest)
    for ver in ("19.3.0", "19.4.0", "19.5.0", "19.5.1", "19.6.0", "19.6.1", "19.7.0", "19.8.0"):
        assert built.count("VERSION='%s'" % ver) == 1, f"built html: VERSION {ver} missing / duplicated"
    assert built.count("var TOTAL_BOSSES=87;") == 1, "built html: TOTAL_BOSSES=87 missing"
    assert built.count("lv:77") == 1, "built html: golem Lv 77 missing / duplicated"
    # V51 + V52 + V53 + V54 fragments still present
    for m in V51_MARKERS:
        assert m in built, f"built html lost V51 marker: {m}"
    for m in V52_MARKERS:
        assert m in built, f"built html lost V52 marker: {m}"
    for m in V53_MARKERS:
        assert m in built, f"built html lost V53 marker: {m}"
    for m in V54_MARKERS:
        assert m in built, f"built html lost V54 marker: {m}"
    assert built.count("function genPool(){") == 1, "built html: genPool definition missing / duplicated"
    assert built.count("function koDeckFirst(cards){") == 1, "built html: koDeckFirst definition missing / duplicated"
    assert built.count("function koQuality(e){") == 1, "built html: koQuality definition missing / duplicated"
    assert built.count("function koPool53(cards, deck){") == 1, "built html: koPool53 definition missing / duplicated"
    assert built.count("function dryRun54(input, opts) {") == 1, "built html: dryRun54 definition missing / duplicated"
    assert built.count("function confirmImport54(pv) {") == 1, "built html: confirmImport54 definition missing / duplicated"
    # V55 fragments present (exact counts)
    assert built.count('id="v55"') == 1, "built html: v55 style marker missing"
    assert built.count('id="v55js"') == 1, "built html: v55js script marker missing"
    assert built.count("window.__v55={") == 1, "built html: __v55 export missing"
    assert built.count("VERSION='19.8.0'") == 1, "built html: __v55 19.8.0 version missing"
    assert built.count("function isDue55(box,due,now){") == 1, "built html: isDue55 definition missing / duplicated"
    assert built.count("function dueFor55(lang,id){") == 1, "built html: dueFor55 definition missing / duplicated"
    assert built.count("function dueQueue55(cap){") == 1, "built html: dueQueue55 definition missing / duplicated"
    assert built.count("function weakList55(){") == 1, "built html: weakList55 definition missing / duplicated"
    assert built.count("function koStats55(){") == 1, "built html: koStats55 definition missing / duplicated"
    assert built.count("function openSrs(){") == 1, "built html: openSrs definition missing / duplicated"
    assert built.count("function startReview55(){") == 1, "built html: startReview55 definition missing / duplicated"
    assert built.count("function decorateKO55(){") == 1, "built html: decorateKO55 definition missing / duplicated"
    # #v55hub appears twice as a CSS rule: the base rule + the 430px
    # media-query rule — assert both, exactly once each.
    assert built.count("#v55hub{box-sizing:border-box;position:fixed") == 1, "built html: #v55hub base CSS rule missing / duplicated"
    assert built.count("#v55hub{padding:8px 6px}") == 1, "built html: #v55hub 430px CSS rule missing / duplicated"
    assert built.count(".v55badge.weak{") == 1, "built html: .v55badge.weak CSS rule missing / duplicated"
    assert built.count(".v55badge.due{") == 1, "built html: .v55badge.due CSS rule missing / duplicated"
    for name, frags in NEW_FRAGS.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW V55 fragment missing ({name}): {frag[:70]}"
    # Standalone out/ files are byte-identical to their src files.
    for layer in ("v55.js", "v55.css"):
        out_t = (out / layer).read_text(encoding="utf-8")
        assert out_t == (src_dir / layer).read_text(encoding="utf-8"), f"out/{layer} differs from src/{layer}"
    _node_check(v55_js)
    # ship the build script itself with the deliverable (reproducibility)
    _copy_bytes_epersafe(HERE / "build_v55.py", out / "build_v55.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V19.8, layer V55 on V19.7")
    print("V55: KO SRS Review UI — due queue (learned-only, due order, cap 30/40/50) + weak words + KO review stats, one shared due rule for EN+KO, hands the queue to the shared v27 session engine")
    print("marker order OK: v55 style/script last (after v54js); V51+V52+V53+V54 fragments intact; pure additive, no earlier block touched")
    return 0


if __name__ == "__main__":
    sys.exit(main())
