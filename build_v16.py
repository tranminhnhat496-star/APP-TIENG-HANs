#!/usr/bin/env python3
"""Build V16 (Smart Learning) from the pristine V15.3 build + the V27 layer.

V16 = V15.3 + layer V27 (src/v27.css + src/v27.js), an ADDITIVE layer only:
  - <style id="v27"> + <script id="v27js"> injected before </body>, LAST
    (window.__v27, VERSION='16.0.0'): one Smart Learning overlay with
    3 internal tabs (Dashboard / Tu yeu / Ke hoach ngay) + a V27-local
    EN/KO toggle (en27.uiLang — never writes en15().lang).
  - S.v7.en27 schema per v16-design.md Appendix A (lazy creation).
  - Three guarded one-line hooks H1/H2/H3 in mark15/mark18/mark19
    (recordAnswer — sync, never calls save()).
  - KO Hub entry: one build-time button append (v27kotab) after the
    v23kotab button in the Korean tabs line (build_v15.py:381-387
    precedent). EN Hub entry needs NO build edit: v27.js decorates
    .v15hub-headbtns / #v15langbar with a MutationObserver.
  - NO edit to any other old file. NO Firebase merge branch (Q1
    deferred). NO hook in V6 code (Q2 deferred).

RUN EXACTLY ONCE on a fresh V15.3 out/. This script REFUSES to run
if v27 markers are already present, and it verifies the pristine
V15.3 hash of out/index.html before touching anything. NEVER re-run
build_v15ui.py / build_v15lib.py / build_v15nav.py on a finished
build (they reorder v24/v25 after v26 — see
tools/rebuild-proof-2026-11-18/REBUILD_PROOF_2026-11-18.md).

Usage:  python3 build_v16.py [--out DIR]
Default out: out/ next to this script (the V15.3 build output).
"""
import argparse
import hashlib
import os
import pathlib
import shutil
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE

# Pristine V15.3 out/index.html (1,930,157 B) — verified before any edit.
V153_HASH = "10492d46871f89de956bcdc5612720ba91a4df625d7db1e421bb96e9bdacb7f2"
V153_TITLE = "Korean &amp; English Vocab Farm V15.3 — Mobile Navigation Fix — Học từ vựng tiếng Hàn &amp; tiếng Anh"
V16_TITLE = "Korean &amp; English Vocab Farm V16 — Smart Learning — Học từ vựng tiếng Hàn &amp; tiếng Anh"

# --- hooks H1/H2/H3: exact anchors (each must occur exactly once) ---
HOOKS = [
    # (src file, anchor, save-line inside anchor, hook line)
    ("v15.js",
     "  sfx15(ok?'ok':'bad');\n  save15();\n  return xp;",
     "  save15();",
     "  try{if(window.__v27)__v27.recordAnswer('en',id,ok,mode)}catch(e){}"),
    ("v18.js",
     "  if(ok){e.daily.correct++;e.daily.xp+=xp}else e.daily.wrong++;\n  save18();\n}",
     "  save18();",
     "  try{if(window.__v27)__v27.recordAnswer('en',id,ok,'boss18')}catch(e){}"),
    ("v19.js",
     "  if(ok){e.daily.correct++;e.daily.xp+=xp}else e.daily.wrong++;\n  save19();\n}",
     "  save19();",
     "  try{if(window.__v27)__v27.recordAnswer('en',id,ok,'boss19')}catch(e){}"),
]

# --- KO tabs button (appended after the v23kotab button) ---
KO_TAIL_OLD = ("+'<button class=\"tab v23kotab\" onclick=\"window.__v23&&__v23.openHub()\" "
               "title=\"Thú Cưng — 펫\"><span class=\"ti\">🐾</span><span>Thú Cưng</span></button>';")
KO_BTN = ("+'<button class=\"tab v27kotab\" onclick=\"window.__v27&&__v27.openSmart(\\'ko\\')\" "
          "title=\"Học thông minh\"><span class=\"ti\">🧠</span><span>Học thông minh</span></button>'")
# Strip ONLY the trailing ';' — the closing quote of the v23 string MUST stay,
# otherwise the v23 string swallows the '+' and the v27 string's opening quote
# and the whole tabs line becomes a JS syntax error (caught 2026-11-18 by
# node --check on the extracted line; [:-2] was the original bug).
KO_TAIL_NEW = KO_TAIL_OLD[:-1] + KO_BTN + ";"


def _cfr(fsrc, fdst, off, n):
    """Copy n bytes from fsrc@off to fdst via in-kernel copy_file_range.

    Userspace write() is EPERM-flaky on this host (memory pressure, waves
    lasting minutes); copy_file_range is filtered the same way, so retry
    each chunk until it lands. Raises on a short/failed copy.
    (Copied from build_v15nav.py — same host, same workaround.)
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
    tmp_path = path.with_name(path.name + ".tmp16")
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "out"))
    args = ap.parse_args()
    out = pathlib.Path(args.out)
    src_dir = ROOT / "src"

    index = out / "index.html"
    assert index.exists(), "out/index.html missing — run on a V15.3 build"
    orig_bytes = index.read_bytes()

    # --- 1. Verify pristine V15.3 BEFORE touching anything ---
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V153_HASH, (
        f"out/index.html hash mismatch: got {got_hash}, expected V15.3 {V153_HASH}. "
        "STOP — do not build on a non-pristine tree (see REBUILD_PROOF_2026-11-18.md: "
        "a clean rebuild differs by 10 blank lines only; anything else means the tree moved).")
    html = orig_bytes.decode("utf-8")
    assert 'id="v26js"' in html, "V15.3 build expected (v26js missing)"
    assert 'id="v27"' not in html and 'id="v27js"' not in html and "__v27" not in html, (
        "V27 layer already present — build_v16.py runs exactly ONCE. Refusing to re-run.")
    print(f"verified pristine V15.3 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…)")

    # --- 2. Validate the V27 layer itself ---
    v27_js = (src_dir / "v27.js").read_text(encoding="utf-8")
    v27_css = (src_dir / "v27.css").read_text(encoding="utf-8")
    assert "</script>" not in v27_js.lower(), "v27.js contains </script>"
    assert "VERSION='16.0.0'" in v27_js and "__v27" in v27_js, "v27.js must expose __v27 16.0.0"
    assert "recordAnswer" in v27_js and "en27" in v27_js, "v27.js missing recordAnswer/en27"
    assert "openSmart" in v27_js and "MutationObserver" in v27_js, "v27.js missing openSmart/decorator"
    assert "claimed" in v27_js and "plan:" in v27_js, "v27.js missing claimed anti-duplicate rewards"
    assert "mascot-chick.png" in v27_js, "v27.js missing chick mascot asset"
    import re as _re
    _stripped = _re.sub(r"/\*.*?\*/", "", v27_js, flags=_re.S)
    _stripped = _re.sub(r"//[^\n]*", "", _stripped)
    assert "window.S" not in _stripped, "v27.js must never use window.S (lexical let)"
    assert "boss18" not in v27_js and "boss19" not in v27_js, "v27.js must not contain hook literals"
    for token in ("#201535", "#F7BE38", "#6845A8", "#FFD76A", "#A78BFA", "#v27hub", ".v27kotab"):
        assert token in v27_css, f"v27.css missing {token}"
    assert v27_css.strip(), "v27.css is empty"
    print(f"validated src/v27.js ({len(v27_js)} chars) + src/v27.css ({len(v27_css)} chars)")

    # --- 3. Apply hooks H1/H2/H3 to the standalone src/ files ---
    for fname, anchor, saveline, hook in HOOKS:
        p = src_dir / fname
        text = p.read_text(encoding="utf-8")
        assert text.count(anchor) == 1, f"{fname}: hook anchor found {text.count(anchor)}x, expected exactly 1"
        assert hook not in text, f"{fname}: hook already present — refusing to double-apply"
        new_anchor = anchor.replace(saveline, hook + "\n" + saveline, 1)
        _write_text_epersafe(p, text.replace(anchor, new_anchor, 1))
        after = p.read_text(encoding="utf-8")
        assert after.count(hook) == 1, f"{fname}: hook not applied exactly once"
        print(f"hook applied to src/{fname} ({hook[:60]}…)")

    # --- 4. Mirror the hooked src files into out/ (all copies must agree) ---
    hook_by_file = {fname: hook for fname, _, _, hook in HOOKS}
    for fname in ("v15.js", "v18.js", "v19.js"):
        _safe_copyfile(src_dir / fname, out / fname)
        assert (out / fname).read_text(encoding="utf-8").count(hook_by_file[fname]) == 1, \
            f"out/{fname}: hook count != 1"
    _safe_copyfile(src_dir / "v27.js", out / "v27.js")
    _safe_copyfile(src_dir / "v27.css", out / "v27.css")

    # --- 5. Assemble the new index.html: hooks (inlined blocks) + KO button + title + V27 ---
    edits = []
    for fname, anchor, saveline, hook in HOOKS:
        ab = anchor.encode("utf-8")
        a0 = orig_bytes.find(ab)
        assert a0 != -1 and orig_bytes.count(ab) == 1, f"index.html: hook anchor for {fname} not found exactly once"
        save_off = ab.find(saveline.encode("utf-8"))
        assert save_off != -1
        ins = a0 + save_off
        edits.append({"start": ins, "end": ins,
                      "chunks": [("glue", (hook + "\n").encode("utf-8"))]})
        print(f"hook staged for inlined {fname} block at byte {ins}")
    # KO tabs button
    kot_old = KO_TAIL_OLD.encode("utf-8")
    k0 = orig_bytes.find(kot_old)
    assert k0 != -1 and orig_bytes.count(kot_old) == 1, "index.html: Korean tabs v23kotab tail not found exactly once"
    edits.append({"start": k0, "end": k0 + len(kot_old),
                  "chunks": [("glue", KO_TAIL_NEW.encode("utf-8"))]})
    print("KO button (v27kotab) staged after v23kotab")
    # title
    t_old = ("<title>" + V153_TITLE + "</title>").encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V15.3 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", ("<title>" + V16_TITLE + "</title>").encode("utf-8"))]})
    # V27 layer, LAST, before </body>
    body = orig_bytes.find(b"</body>")
    assert body != -1, "no </body> in index.html"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v27">\n'),
        ("file", src_dir / "v27.css"),
        ("glue", b'\n</style>\n<script id="v27js">\n'),
        ("file", src_dir / "v27.js"),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 6. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    for _, _, _, hook in HOOKS:
        assert built.count(hook) == 1, f"built index.html: hook present {built.count(hook)}x, expected 1: {hook[:60]}"
    assert built.count('<button class="tab v27kotab"') == 1, "built index.html: KO v27kotab button missing/duplicated"
    # structural check: the v23 string must CLOSE before the '+' that opens v27
    assert '</button>\'+\'<button class="tab v27kotab"' in built, (
        "built index.html: KO button concatenation broken (v23 string not closed before v27)")
    assert "window.__v27" in built and "VERSION='16.0.0'" in built, "built index.html missing __v27 16.0.0"
    assert "Vocab Farm V16" in built, "built index.html title is not V16"
    # marker order: ... v23, v24, v25, v26, v27 (styles and scripts)
    order = ["v23", "v24", "v25", "v26", "v27"]
    style_pos = [built.rfind(f'id="{m}"') for m in order]
    script_pos = [built.rfind(f'id="{m}js"') for m in order]
    assert all(p != -1 for p in style_pos), f"style markers missing: {style_pos}"
    assert all(p != -1 for p in script_pos), f"script markers missing: {script_pos}"
    assert style_pos == sorted(style_pos), f"style marker order wrong: {style_pos}"
    assert script_pos == sorted(script_pos), f"script marker order wrong: {script_pos}"
    # old layers intact
    for mid, ver in (("v15.js", "15.0.0"), ("v18.js", "15.0.0"), ("v19.js", "15.0.0"),
                     ("v23.js", "15.0.0"), ("v17.js", "10.0.0"), ("v20.js", "12.0.0"),
                     ("v22.js", "14.0.0")):
        assert f"version:'{ver}'" in built, f"built html lost {mid} version {ver}"
    assert "VERSION='15.1.0'" in built and "VERSION='15.2.0'" in built, "built html lost v24/v25 versions"
    # hooks agree across all three copies
    for fname, _, _, hook in HOOKS:
        for base in (src_dir, out):
            assert (base / fname).read_text(encoding="utf-8").count(hook) == 1, \
                f"{base}/{fname}: hook count != 1"
    _safe_copyfile(HERE / "build_v16.py", out / "build_v16.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V16, layer V27 injected last")
    print("V27: Smart Learning overlay (Dashboard / Tu yeu / Ke hoach ngay) + hooks H1/H2/H3 + KO v27kotab button")
    print("marker order OK: v23 < v24 < v25 < v26 < v27 (styles + scripts)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
