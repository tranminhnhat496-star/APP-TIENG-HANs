#!/usr/bin/env python3
"""Build V16.4 (Data Safety) from the pristine V16.3 build + the V32 layer.

V16.4 = V16.3 (Backup & Restore Fix, layer V31) + layer V32
(src/v32.css + src/v32.js) + ONE guarded build-script replacement
(R-V32-VER, PLAN_V32.md section 2).

WHAT THIS SCRIPT DOES (in order):
  1. Verifies the base is the pristine V16.3 build (hash + v31 markers
     present, v28/v29/v30/v32 markers absent). REFUSES to run otherwise.
  2. Applies the ONE replacement (R-V32-VER) to the standalone
     src/v20_sync.js (exact-match asserts, fails the build if the
     anchor is missing/duplicated/already applied).
  3. Mirrors the patched src file into out/ (copies must agree).
  4. Applies the same replacement to the inlined block in
     out/index.html (byte edits, exact-count asserts).
  5. Injects <style id="v32"> + <script id="v32js"> before </body>, LAST.
  6. Verifies: marker order (v32 last), v32 version 16.4.0, node --check
     on v32.js + v20_sync.js, KO tabs line unchanged (no v32kotab),
     old versions intact.

RUN EXACTLY ONCE on a fresh V16.3 out/. NEVER re-run build_v31.py (or
any older build script) on a finished build (they reorder layers —
see tools/rebuild-proof-2026-11-18/REBUILD_PROOF_2026-11-18.md).

POST-BUILD FIXES (2026-11-19, tools/v32/fix_b32.py — this script was
NEVER re-run after them; fix_b32.py is the record, with exact-count
asserts and the pre-fix gate hash cde19349…):
  B-32-2 (panel duplication): src/v32.js wrapDataPanel / wrapAccount
    now carry BOTH markers (__v31 + __v32) on their wrappers, so V31's
    DOMContentLoaded re-init (guards __v31) and V32's own re-init
    (guards __v32) both skip instead of re-wrapping. The overlap is
    THREE functions (dataPanelHTML, __v21.openAccount,
    __v21.closeAccount), not one.
  B-32-3 (F-02 account-switch race): the R-F-02c/d replacements live
    in build_v31.py, NOT in this file — there is no F-02 replacement
    text here to change. Their placement as written in build_v31.py
    (flush guard AFTER the slot write, before setSession) is WRONG:
    the flush writes stale in-memory S over the just-switched bytes.
    The corrected placement, applied by fix_b32.py to src/v21.js +
    out/v21.js + the inlined v21 block, is flush FIRST — the first
    statement of activateAccount() / activateGuest(), before
    parkSlot() and readSlot() — guard text unchanged. Do NOT "fix"
    build_v31.py's text and re-run it: that would rebuild from the
    V16.3 base and lose the V32 layer.

Usage:  python3 build_v32.py [--out DIR] [--src DIR]
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

# Pristine V16.3 out/index.html (2,040,471 B) — verified before any edit.
V163_HASH = "4378dc22b10a6c0aefd95c032f005b6cd9ef9f8f88899f48a4bd06c78d04d3a6"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V16.3 — Backup &amp; Restore Fix — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V16.4 — Data Safety — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# The ONE replacement (PLAN_V32.md section 2): validateSave in
# src/v20_sync.js (SAVE_VERSION=12) checks structure only — it has NO
# version check. Add, right after the bad-v7 check: absent
# meta.saveVersion -> accepted (pre-V12 saves have no meta); present
# and == 12 -> accepted; present and anything else -> rejected with
# bad-version:<n>. PREVENTIVE hardening, not a fix for an observed bug.
REPLACEMENTS = [
    ("R-V32-VER", "v20_sync.js",
     "  if(obj.v7!==undefined&&(typeof obj.v7!=='object'||obj.v7===null||Array.isArray(obj.v7))) errs.push('bad-v7');",
     "  if(obj.v7!==undefined&&(typeof obj.v7!=='object'||obj.v7===null||Array.isArray(obj.v7))) errs.push('bad-v7');\n"
     "  if(obj.v7&&obj.v7.meta&&obj.v7.meta.saveVersion!==undefined&&obj.v7.meta.saveVersion!==SAVE_VERSION) errs.push('bad-version:'+obj.v7.meta.saveVersion);"),
]

ALL_REPLACEMENTS = REPLACEMENTS

# NOTE (B-32-3, 2026-11-19): the R-F-02c/d replacements are NOT here —
# they live in build_v31.py, and their flush-guard placement (after the
# slot write) is wrong; the corrected flush-FIRST placement is recorded
# in the module docstring above and was applied by tools/v32/fix_b32.py.
# Do not add an F-02 replacement to this list and do not re-run this
# script: it refuses on the moved base hash by design.

# Distinctive strings that exist ONLY in out-of-scope work (PLAN_V32.md
# section 8). They must be absent from the base and stay absent after
# the build. (V28/V29/V30 never landed; their markers must stay absent.)
OUT_OF_SCOPE_MARKERS = [
    "v21emailbtn",      # R-F-09a/b (duplicate ids)
    "_esc21",           # R-F-10a/b/c (Escape listener)
    "armV27Obs",        # R-F-05c-1/c-2 (observer scoping)
    "rearmObserver",    # R-F-07c (observer lifecycle)
    "_speakXp",         # R-V17-3 (speak double-pay)
    "V29 (F-05)",       # R-F-05a (observer scoping comment)
]

# --- helpers (EPERM-safe pattern from build_v16.py, verbatim from build_v31.py) ---
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
    tmp_path = path.with_name(path.name + ".tmp32")
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
    v32_js = src_dir / "v32.js"
    v32_css = src_dir / "v32.css"
    assert v32_js.exists() and v32_css.exists(), "src/v32.js / src/v32.css missing"

    # --- 1. Verify the base is pristine V16.3 ---
    index = out / "index.html"
    assert index.exists(), "out/index.html missing — run on a V16.3 build"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V163_HASH, f"base is not pristine V16.3: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v31"' in built and 'id="v31js"' in built, "V31 markers missing — not a V16.3 build"
    for m in ('id="v28"', 'id="v29"', 'id="v30"', 'id="v32"', '__v28', '__v29', '__v30', '__v32'):
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V16.3 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    print(f"verified pristine V16.3 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…)")

    # --- 2. Validate the V32 layer itself ---
    v32_js_t = v32_js.read_text(encoding="utf-8")
    v32_css_t = v32_css.read_text(encoding="utf-8")
    assert "</script>" not in v32_js_t.lower(), "v32.js contains </script>"
    assert "VERSION='16.4.0'" in v32_js_t and "__v32" in v32_js_t, "v32.js must expose __v32 16.4.0"
    assert "computeStorage" in v32_js_t and "cleanupSafe" in v32_js_t and "prunePlan" in v32_js_t, "v32.js missing monitor/cleanup API"
    assert "BUDGET_BYTES=5*1024*1024" in v32_js_t, "v32.js missing 5 MB budget"
    _stripped = _re.sub(r"/\*.*?\*/", "", v32_js_t, flags=_re.S)
    _stripped = _re.sub(r"//[^\n]*", "", _stripped)
    assert "window.S" not in _stripped, "v32.js must never use window.S (lexical let)"
    assert "v32kotab" not in v32_js_t, "v32.js must not add a KO tab button"
    for token in ("--ui-text-primary", "--ui-text-secondary", "--ui-title-gold", "--ui-bg-panel", "--ui-border", "--ui-btn-min-height", "--ui-warning", "--ui-danger", "--ui-radius", ".v32section", ".v32bar"):
        assert token in v32_css_t, f"v32.css missing {token}"
    assert v32_css_t.strip(), "v32.css is empty"
    print(f"validated src/v32.js ({len(v32_js_t)} chars) + src/v32.css ({len(v32_css_t)} chars)")

    # --- 3. Apply the ONE replacement to the standalone src/ file ---
    touched = {}
    for label, fname, anchor, replacement in ALL_REPLACEMENTS:
        p = src_dir / fname
        text = p.read_text(encoding="utf-8")
        assert text.count(anchor) == 1, f"{label}: {fname}: anchor found {text.count(anchor)}x, expected exactly 1"
        assert replacement not in text, f"{label}: {fname}: replacement already present — refusing to double-apply"
        _write_text_epersafe(p, text.replace(anchor, replacement, 1))
        after = p.read_text(encoding="utf-8")
        assert after.count(replacement) == 1, f"{label}: {fname}: replacement not applied exactly once"
        touched.setdefault(fname, []).append(label)
        print(f"applied {label} to src/{fname}")
    for fname in touched:
        _safe_copyfile(src_dir / fname, out / fname)
        assert (out / fname).read_text(encoding="utf-8") == (src_dir / fname).read_text(encoding="utf-8"), (
            f"out/{fname} does not match patched src/{fname}")
    _safe_copyfile(v32_js, out / "v32.js")
    _safe_copyfile(v32_css, out / "v32.css")

    # --- 4. Assemble the new index.html: replacement + title + V32 ---
    edits = []
    for label, fname, anchor, replacement in ALL_REPLACEMENTS:
        ab = anchor.encode("utf-8")
        a0 = orig_bytes.find(ab)
        assert a0 != -1 and orig_bytes.count(ab) == 1, f"index.html: {label} anchor for {fname} not found exactly once"
        edits.append({"start": a0, "end": a0 + len(ab),
                      "chunks": [("glue", replacement.encode("utf-8"))]})
        print(f"{label} staged for inlined {fname} block at byte {a0}")
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V16.3 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # V32 layer, LAST, before </body>
    body = orig_bytes.find(b"</body>")
    assert body != -1, "no </body> in index.html"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v32">\n'),
        ("file", v32_css),
        ("glue", b'\n</style>\n<script id="v32js">\n'),
        ("file", v32_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 5. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    for label, fname, anchor, replacement in ALL_REPLACEMENTS:
        assert built.count(replacement) == 1, f"built index.html: {label} replacement present {built.count(replacement)}x, expected 1"
        assert built.count(anchor) == 0 or anchor in replacement, (
            f"built index.html: {label} anchor still present (replacement did not consume it)")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V16.4 title missing / V16.3 title remains"
    assert "window.__v32" in built and "VERSION='16.4.0'" in built, "built index.html missing __v32 16.4.0"
    # R-V32-VER: the bad-version guard appears exactly once in the built
    # file, plus one mention in the v32.js header comment (which says
    # "rejected with bad-version:<n>") — 2x total.
    assert built.count("bad-version") == 2, f"built index.html: 'bad-version' present {built.count('bad-version')}x, expected 2 (1 guard + 1 v32.js header mention)"
    assert built.count("bad-version:'+obj.v7.meta.saveVersion") == 1, "built index.html: bad-version guard text count != 1"
    # The R-V32-VER label appears exactly once in the built file: the
    # mention in the v32.js header comment (the replacement text itself
    # carries no label — it is the only replacement, per PLAN section 2).
    assert built.count("R-V32-VER") == 1, f"built index.html: 'R-V32-VER' present {built.count('R-V32-VER')}x, expected 1 (v32.js header)"
    # v32 markers are the LAST style/script markers before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v32", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v32", f"script marker order wrong: {script_ids}"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0"):
        assert ver in built, f"built html lost version {ver}"
    # V31 fragments still present (spot-check: the F-01 merge branch + C9 importFile(imp))
    assert "/* V31 (F-01):" in built, "built html lost V31 F-01 merge branch"
    assert "__v20.importFile(imp)" in built, "built html lost V31 C9 importFile(imp)"
    assert "VERSION='16.3.0'" in built, "built html lost V31 version 16.3.0"
    # KO tabs line unchanged: v23kotab tail still x1, no v32kotab anywhere
    assert built.count('<button class="tab v23kotab"') == 1, "built index.html: KO v23kotab button changed"
    assert "v32kotab" not in built, "built index.html: unexpected v32kotab (KO button must not be added)"
    # out-of-scope replacements absent
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"built index.html: out-of-scope marker {marker!r} present"
    # src/out/index copies agree on the replacement
    for label, fname, anchor, replacement in ALL_REPLACEMENTS:
        for base in (src_dir, out):
            assert (base / fname).read_text(encoding="utf-8").count(replacement) == 1, (
                f"{base}/{fname}: {label} count != 1")
    _node_check(v32_js)
    for fname in touched:
        _node_check(src_dir / fname)
    _safe_copyfile(HERE / "build_v32.py", out / "build_v32.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V16.4, layer V32 injected last")
    print(f"V32: Data Safety — {len(ALL_REPLACEMENTS)} replacement (R-V32-VER only)")
    print("marker order OK: v32 last (styles + scripts); KO tabs line unchanged; out-of-scope markers absent")
    return 0


if __name__ == "__main__":
    sys.exit(main())
