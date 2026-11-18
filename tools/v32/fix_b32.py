#!/usr/bin/env python3
"""Fix B-32-2 + B-32-3 on the finished V16.4 build (layer V32, 16.4.0).

Run EXACTLY ONCE. Never re-run build_v32.py (it refuses: base hash moved)
and never re-run any older build script.

  B-32-2 — panel renders #v31panel x2 + #v32monitor x2 on every render.
    Each layer's wrapDataPanel guards only its own marker (v31.js guards
    __v31, v32.js guards __v32) and both layers re-init on
    DOMContentLoaded, so V31 re-wraps V32's wrapper and the chain doubles.
    Fix (V32-only, v31.js untouched): the V32 wrappers carry BOTH
    markers, so either layer's re-init guard sees its own marker and
    skips. Verification showed the overlap is THREE functions, not one:
    V31 also wraps __v21.openAccount / __v21.closeAccount (v31.js:623),
    and V32 wraps the same two (v32.js wrapAccount) — same re-wrap
    growth, same dual-marker treatment. V32's other wraps do NOT
    overlap: global save (only V20 wraps it, and V32 already copies the
    __v20 marker), __v20.flush (V31 never wraps it),
    __v31.recordBackupEvent (V31 defines it, never wraps it).
  B-32-3 — V16.3 F-02 fix incomplete on account-switch (real-engine
    race still loses 3/3). The F-02c/d flush guards in v21.js sat AFTER
    writeVerified(SAVE_KEY, ...), so the flush wrote stale in-memory S
    over the just-switched bytes. Fix: move the guard (text unchanged)
    to the FIRST statement of activateAccount / activateGuest, before
    parkSlot() AND before readSlot()/any slot write, so the pending
    in-memory save lands in localStorage before the slot is parked or
    switched.

Gate: out/index.html sha256 must equal the pre-fix V16.4 hash below
(2,067,369 B). REFUSES otherwise (already fixed / base moved).

Applies the edits to src/v32.js + src/v21.js (exact-count asserts),
mirrors the patched files into out/ (byte-identical check), applies the
same edits to the inlined <script id="v21js"> / <script id="v32js">
blocks in out/index.html (byte edits within the block spans only,
exact-count asserts, EPERM-safe _assemble_index copied from
build_v32.py), then verifies: marker order still ends v32,
R-V32-VER x1, bad-version x2, F-02 guards still x2 in v21.js (just
moved earlier: guard precedes parkSlot() in both functions, and the
old guard-before-setSession context is gone), node --check on
src/v32.js, out/v32.js, src/v21.js, out/v21.js, KO line unchanged,
inlined blocks == patched src + "\\n".

Usage: python3 tools/v32/fix_b32.py
"""
import hashlib
import os
import pathlib
import shutil
import subprocess
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # ~/workspace/v7build

# Pre-fix V16.4 out/index.html (SMOKE_TEST_V16_4_2026-11-19.md section 0).
PRE_FIX_HASH = "cde193493a77bcd73ad9b204c092942d41a9b45f13beab84cc1652f9a212a1be"
PRE_FIX_SIZE = 2067369

GUARD = "try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}"

# --- helpers (EPERM-safe pattern, verbatim from build_v32.py) ---
def _cfr(fsrc, fdst, off, n):
    done = 0
    deadline = time.time() + 540
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
    shutil.copyfile(str(src), str(dst))


def _write_text_epersafe(path, text):
    tmp_path = path.with_name(path.name + ".tmp32fix")
    with open(tmp_path, "wb", buffering=0) as f:
        _wsmall(f, text.encode("utf-8"))
    os.rename(tmp_path, path)


def _assemble_index(orig_path, edits):
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
    assert node, "node not found — node --check is required"
    r = subprocess.run([node, "--check", str(path)], capture_output=True, text=True)
    assert r.returncode == 0, f"node --check failed for {path}:\n{r.stderr}"
    print(f"node --check OK: {path}")


def _must_count(text, needle, expected, where):
    got = text.count(needle)
    assert got == expected, f"{where}: {needle[:60]!r} found {got}x, expected {expected}x"
    return got


def _replace_once(text, anchor, replacement, where):
    _must_count(text, anchor, 1, where + " (anchor)")
    # NOTE: no "replacement already present" assert here — for the
    # remove-edits the replacement is a substring of the anchor, so that
    # check would false-positive. The count==1 anchor assert above is
    # the double-application guard (an already-applied edit has 0 anchors).
    return text.replace(anchor, replacement, 1)


def _block_span(html, script_id):
    """Byte span (start, end) of the JS source inside <script id=X>...</script>."""
    open_tag = ('<script id="%s">\n' % script_id).encode("utf-8")
    s = html.find(open_tag)
    assert s != -1, f"<script id={script_id}> not found in index.html"
    body_start = s + len(open_tag)
    body_end = html.find(b"</script>", body_start)
    assert body_end != -1, f"no </script> after <script id={script_id}>"
    return body_start, body_end


def main():
    src_dir = ROOT / "src"
    out = ROOT / "out"
    index = out / "index.html"

    # --- 0. Gate on the CURRENT (pre-fix) build ---
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == PRE_FIX_HASH, \
        f"refusing: out/index.html sha256 {got_hash} != pre-fix {PRE_FIX_HASH}"
    assert len(orig_bytes) == PRE_FIX_SIZE, \
        f"refusing: out/index.html is {len(orig_bytes)} B, expected {PRE_FIX_SIZE}"
    print(f"gate OK: pre-fix V16.4 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}...)")

    v32_src_p, v21_src_p = src_dir / "v32.js", src_dir / "v21.js"
    v32_text = v32_src_p.read_text(encoding="utf-8")
    v21_text = v21_src_p.read_text(encoding="utf-8")

    # --- 1. B-32-2 edits to src/v32.js (dual markers) ---
    v32_text = _replace_once(
        v32_text,
        "    nw.__v32=true;\n    v.dataPanelHTML=nw;",
        "    /* B-32-2: carry BOTH markers — V31 re-init guards on __v31,\n"
        "       V32 re-init guards on __v32; without __v31 V31 re-wraps\n"
        "       and every panel render appends #v31panel + #v32monitor twice. */\n"
        "    nw.__v31=true;\n    nw.__v32=true;\n    v.dataPanelHTML=nw;",
        "src/v32.js wrapDataPanel")
    v32_text = _replace_once(
        v32_text,
        "      nw.__v32=true; v.openAccount=nw;",
        "      /* B-32-2: dual marker — V31 also wraps openAccount (v31.js:627)\n"
        "         and its re-init guards on __v31. */\n"
        "      nw.__v31=true; nw.__v32=true; v.openAccount=nw;",
        "src/v32.js wrapAccount/openAccount")
    v32_text = _replace_once(
        v32_text,
        "      nc.__v32=true; v.closeAccount=nc;",
        "      /* B-32-2: dual marker — V31 also wraps closeAccount (v31.js:632)\n"
        "         and its re-init guards on __v31. */\n"
        "      nc.__v31=true; nc.__v32=true; v.closeAccount=nc;",
        "src/v32.js wrapAccount/closeAccount")
    print("B-32-2 edits staged for src/v32.js (dataPanelHTML + openAccount + closeAccount)")

    # --- 2. B-32-3 edits to src/v21.js (flush guard moved BEFORE parkSlot) ---
    _must_count(v21_text, GUARD, 2, "src/v21.js (pre-fix guard total)")
    # activateAccount: remove the old guard (before setSession), insert at top.
    v21_text = _replace_once(
        v21_text,
        "  " + GUARD + "\n  setSession({mode:'account', uid:uid, at:Date.now()});",
        "  setSession({mode:'account', uid:uid, at:Date.now()});",
        "src/v21.js activateAccount (remove old guard)")
    v21_text = _replace_once(
        v21_text,
        "  var prev=session();\n  var slot=readSlot();\n  var parked=parkSlot();",
        "  /* B-32-3: flush FIRST — before parkSlot()/readSlot()/any slot\n"
        "     write. The pending in-memory save must land in localStorage\n"
        "     before the slot is parked/switched, or the flush writes stale\n"
        "     S over the just-switched bytes. Guard text unchanged (F-02c). */\n"
        "  " + GUARD + "\n"
        "  var prev=session();\n  var slot=readSlot();\n  var parked=parkSlot();",
        "src/v21.js activateAccount (insert guard at top)")
    # activateGuest: same move.
    v21_text = _replace_once(
        v21_text,
        "  " + GUARD + "\n  setSession({mode:'guest', at:Date.now()});",
        "  setSession({mode:'guest', at:Date.now()});",
        "src/v21.js activateGuest (remove old guard)")
    v21_text = _replace_once(
        v21_text,
        "function activateGuest(){\n  var parked=parkSlot();",
        "function activateGuest(){\n"
        "  /* B-32-3: flush FIRST — before parkSlot()/any slot write (see\n"
        "     activateAccount above). Guard text unchanged (F-02d). */\n"
        "  " + GUARD + "\n"
        "  var parked=parkSlot();",
        "src/v21.js activateGuest (insert guard at top)")
    _must_count(v21_text, GUARD, 2, "src/v21.js (post-fix guard total)")
    print("B-32-3 edits staged for src/v21.js (guard moved to top of both functions)")

    # --- 3. Write patched src files, mirror into out/ ---
    _write_text_epersafe(v32_src_p, v32_text)
    _write_text_epersafe(v21_src_p, v21_text)
    _safe_copyfile(v32_src_p, out / "v32.js")
    _safe_copyfile(v21_src_p, out / "v21.js")
    assert (out / "v32.js").read_text(encoding="utf-8") == v32_text
    assert (out / "v21.js").read_text(encoding="utf-8") == v21_text
    print("mirrored patched src/v32.js + src/v21.js into out/ (byte-identical)")

    # --- 4. Same edits to the inlined blocks in out/index.html ---
    # Re-read the ORIGINAL index bytes (still pre-fix on disk) and locate
    # the two block spans; anchors are searched WITHIN each span only
    # (the guard shape also occurs in the v15/v31 blocks).
    html_bytes = index.read_bytes()
    html_text = html_bytes.decode("utf-8")
    edits = []

    def _block_edit(script_id, anchor, replacement, where):
        s, e = _block_span(html_bytes, script_id)
        blk_b = html_bytes[s:e]
        ab = anchor.encode("utf-8")
        # BYTE offsets throughout here: the block holds multibyte UTF-8
        # (Vietnamese), so a decoded-char offset is NOT a byte offset —
        # mixing them landed the first run's edits a few hundred bytes
        # early, inside the wrong text (caught by the step-5 assert;
        # pre-fix state was restored from tools/v32/zip-run/ and this
        # function now counts/indexes bytes only).
        got = blk_b.count(ab)
        assert got == 1, f"index.html {where} (inlined {script_id} block): anchor found {got}x, expected 1x"
        off = blk_b.index(ab)
        edits.append({"start": s + off, "end": s + off + len(ab),
                      "chunks": [("glue", replacement.encode("utf-8"))]})
        print(f"  staged {where} in inlined {script_id} block at byte {s + off}")

    _block_edit("v32js",
                "    nw.__v32=true;\n    v.dataPanelHTML=nw;",
                "    /* B-32-2: carry BOTH markers — V31 re-init guards on __v31,\n"
                "       V32 re-init guards on __v32; without __v31 V31 re-wraps\n"
                "       and every panel render appends #v31panel + #v32monitor twice. */\n"
                "    nw.__v31=true;\n    nw.__v32=true;\n    v.dataPanelHTML=nw;",
                "wrapDataPanel")
    _block_edit("v32js",
                "      nw.__v32=true; v.openAccount=nw;",
                "      /* B-32-2: dual marker — V31 also wraps openAccount (v31.js:627)\n"
                "         and its re-init guards on __v31. */\n"
                "      nw.__v31=true; nw.__v32=true; v.openAccount=nw;",
                "wrapAccount/openAccount")
    _block_edit("v32js",
                "      nc.__v32=true; v.closeAccount=nc;",
                "      /* B-32-2: dual marker — V31 also wraps closeAccount (v31.js:632)\n"
                "         and its re-init guards on __v31. */\n"
                "      nc.__v31=true; nc.__v32=true; v.closeAccount=nc;",
                "wrapAccount/closeAccount")
    _block_edit("v21js",
                "  " + GUARD + "\n  setSession({mode:'account', uid:uid, at:Date.now()});",
                "  setSession({mode:'account', uid:uid, at:Date.now()});",
                "activateAccount (remove old guard)")
    _block_edit("v21js",
                "  var prev=session();\n  var slot=readSlot();\n  var parked=parkSlot();",
                "  /* B-32-3: flush FIRST — before parkSlot()/readSlot()/any slot\n"
                "     write. The pending in-memory save must land in localStorage\n"
                "     before the slot is parked/switched, or the flush writes stale\n"
                "     S over the just-switched bytes. Guard text unchanged (F-02c). */\n"
                "  " + GUARD + "\n"
                "  var prev=session();\n  var slot=readSlot();\n  var parked=parkSlot();",
                "activateAccount (insert guard at top)")
    _block_edit("v21js",
                "  " + GUARD + "\n  setSession({mode:'guest', at:Date.now()});",
                "  setSession({mode:'guest', at:Date.now()});",
                "activateGuest (remove old guard)")
    _block_edit("v21js",
                "function activateGuest(){\n  var parked=parkSlot();",
                "function activateGuest(){\n"
                "  /* B-32-3: flush FIRST — before parkSlot()/any slot write (see\n"
                "     activateAccount above). Guard text unchanged (F-02d). */\n"
                "  " + GUARD + "\n"
                "  var parked=parkSlot();",
                "activateGuest (insert guard at top)")
    _assemble_index(index, edits)
    print("applied 7 byte edits to out/index.html via _assemble_index")

    # --- 5. Verify the assembled file ---
    built_bytes = index.read_bytes()
    built = built_bytes.decode("utf-8")
    import re as _re
    style_ids = _re.findall(r'<style id="(v\d+)"', built)
    script_ids = _re.findall(r'<script id="(v\d+)js"', built)
    assert style_ids and style_ids[-1] == "v32", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v32", f"script marker order wrong: {script_ids}"
    assert built.count("R-V32-VER") == 1, "R-V32-VER count != 1"
    assert built.count("bad-version") == 2, f"bad-version count {built.count('bad-version')} != 2"
    assert built.count("bad-version:'+obj.v7.meta.saveVersion") == 1
    assert "v32kotab" not in built, "v32kotab appeared"
    assert built.count('<button class="tab v23kotab"') == 1, "KO v23kotab button changed"
    # F-02 guards: still x2 in each v21 copy, and moved earlier.
    for label, text in (("src/v21.js", v21_text),
                        ("out/v21.js", (out / "v21.js").read_text(encoding="utf-8"))):
        _must_count(text, GUARD, 2, label + " guard total")
    s21, e21 = _block_span(built_bytes, "v21js")
    blk21 = built_bytes[s21:e21].decode("utf-8")
    _must_count(blk21, GUARD, 2, "inlined v21js block guard total")
    assert blk21 == (out / "v21.js").read_text(encoding="utf-8") + "\n", \
        "inlined v21js block != patched src/v21.js + newline"
    s32, e32 = _block_span(built_bytes, "v32js")
    blk32 = built_bytes[s32:e32].decode("utf-8")
    assert blk32 == (out / "v32.js").read_text(encoding="utf-8") + "\n", \
        "inlined v32js block != patched src/v32.js + newline"
    # Guard precedes parkSlot() in both functions (in src and in the block).
    for label, text in (("src/v21.js", v21_text), ("inlined v21js", blk21)):
        for fn, sess in (("activateAccount", "setSession({mode:'account'"),
                         ("activateGuest", "setSession({mode:'guest'")):
            f0 = text.index("function " + fn + "(")
            f1 = text.index("function ", f0 + 10) if text.find("function ", f0 + 10) != -1 else len(text)
            body = text[f0:f1]
            gi = body.index(GUARD)
            # NOTE: the B-32-3 comment itself mentions "parkSlot()", so
            # search for the real call site, not the bare name.
            pi = body.index("var parked=parkSlot();")
            assert gi < pi, f"{label} {fn}: guard does NOT precede parkSlot()"
            assert (GUARD + "\n  " + sess) not in body, \
                f"{label} {fn}: old guard-before-setSession context still present"
    # Dual markers present in v32 copies.
    for label, text in (("src/v32.js", v32_text),
                        ("out/v32.js", (out / "v32.js").read_text(encoding="utf-8")),
                        ("inlined v32js", blk32)):
        assert "    nw.__v31=true;\n    nw.__v32=true;\n    v.dataPanelHTML=nw;" in text, label + " dataPanel dual marker missing"
        assert "nw.__v31=true; nw.__v32=true; v.openAccount=nw;" in text, label + " openAccount dual marker missing"
        assert "nc.__v31=true; nc.__v32=true; v.closeAccount=nc;" in text, label + " closeAccount dual marker missing"
    _node_check(v32_src_p)
    _node_check(out / "v32.js")
    _node_check(v21_src_p)
    _node_check(out / "v21.js")
    new_hash = hashlib.sha256(built_bytes).hexdigest()
    print(f"FIX COMPLETE: out/index.html now {len(built_bytes)} B, sha256 {new_hash}")
    print(f"  pre-fix: {PRE_FIX_HASH} ({PRE_FIX_SIZE} B) -> post-fix: {new_hash} ({len(built_bytes)} B)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
