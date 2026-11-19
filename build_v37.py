#!/usr/bin/env python3
"""Build V18.2 (SCOPE BANNER FIX) from the pristine V18.1 build + the V37 layer.

V18.2 = V18.1 (Bug Fixes, layer V36) + layer V37 (src/v37.js + src/v37.css)
+ 4 guarded build-script replacements (see REPLACEMENTS below).

THE BUG (reported by Anh, diagnosed from source, reproduced in real
Chrome 157 with tools/v37/repro-v37.js BEFORE this build):
  The English Hub scope banner ("Đang học: A1–A2 · Education … ✕ Bỏ
  chọn") is rendered by __v17.scopeBannerHTML() and injected by
  renderHub() (src/v15.js:563) into the hub shell — OUTSIDE the
  #v15body tab container. Its button calls __v17.clearScope()
  (src/v17.js:460), which clears en15().scope and then only calls
  renderTab() — re-rendering #v15body only. The banner is never
  re-rendered, so after tapping "Bỏ chọn" it stays on screen and the
  button looks dead. (Switching hub tabs calls setTab -> renderHub(),
  so the banner does disappear then — proving the data was cleared and
  only the re-render was missing.) Same defect class in the Smart
  Learning overlay: the v27 scope banner button (src/v27.js:845) calls
  __v15.clearScope() with NO re-render at all.

THE FIX (minimal, surgical — no game-logic / reward / pool / SRS change):
  R-V37-V15-RENDERHUB: window.__v15 gains renderHub:renderHub
    (pure additive export; renderHub was closure-local before).
  R-V37-V17-CLEARSCOPE: clearScope() calls v.renderHub() when present,
    else falls back to renderTab(). renderHub() ends in renderTab(),
    which ends in renderMode() when a mode is active — exactly the
    current code path — the only change is the hub shell (header / tabs
    / banner) is rebuilt too. The mode timer (M.timer) is a JS interval,
    untouched by re-render.
  R-V37-V27-RENDER: window.__v27 gains render:render.
  R-V37-V27-BANNER: the Smart banner button also calls
    window.__v27.render() after clearing (render() early-returns when
    the overlay is hidden, so it is safe).
  __v15.clearScope itself is NOT changed (shared; the fix stays local
  to each banner's handler).

WHAT THIS SCRIPT DOES (in order):
  0. Backs up every file it will touch into tools/v37/backup-v18.1/
     (src/ files have no other copy — the V18.1 ZIP only holds out/).
  1. Verifies the base is the pristine V18.1 build (hash + v36 markers
     present, v37 markers absent). REFUSES to run otherwise.
     PRE-PASS: every replacement anchor is checked (src files AND
     out/index.html) BEFORE any file is mutated.
  2. Applies the 4 replacements to the standalone src/*.js files
     (exact-match asserts, fails if an anchor is missing / duplicated /
     already applied).
  3. Mirrors the patched src files into out/ (copies must agree).
  4. Applies the same replacements to the inlined blocks in
     out/index.html (byte edits, exact-count asserts), plus the V18.2
     title and the V37 layer injection (style v37 + script v37js,
     LAST, before </body>).
  5. Verifies: marker order (v37 last), v37 version 18.2.0,
     node --check on v37.js + every touched src file, old versions
     intact, V33/V34/V35/V36 fragments still present, V37 fragments
     present, out-of-scope markers absent.

RUN EXACTLY ONCE on a fresh V18.1 out/. NEVER re-run build_v33.py /
build_v34.py / build_v35.py / build_v36.py (or any older build script)
on a finished build (they reorder layers — see the V32 skill notes).

Usage:  python3 build_v37.py [--out DIR] [--src DIR]
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

# Pristine V18.1 out/index.html (2,358,811 B) — verified before any edit.
V181_HASH = "eabcccc2e4b8b86eeca807698cd0a3d5575b267bec03ff395de080da9d082a39"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V18.1 — Bug Fixes — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V18.2 — Scope Banner Fix — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

REPLACEMENTS = [
    # --- R-V37-V15-RENDERHUB: expose renderHub on window.__v15 ---
    # The scope banner lives in the hub shell (renderHub), not in
    # #v15body (renderTab). No existing export could refresh it.
    ("R-V37-V15-RENDERHUB", "v15.js",
     "  renderTab:renderTab,topicName:topicName,counts15:counts15,",
     "  renderTab:renderTab,renderHub:renderHub,topicName:topicName,counts15:counts15,",
     1),
    # --- R-V37-V17-CLEARSCOPE: re-render the whole hub on clear ---
    # renderHub() ends in renderTab() (-> renderMode() when a mode is
    # active), so an active mode re-renders from its own state; the
    # mode timer is a JS interval, untouched by re-render.
    ("R-V37-V17-CLEARSCOPE", "v17.js",
     "function clearScope(){var v=V15();if(!v)return;v.clearScope();renderTab()}",
     "/* V37 (V18.2): the scope banner lives in the hub shell (renderHub),\n"
     "   not in #v15body (renderTab) — re-render the whole hub so the\n"
     "   banner disappears when the scope is cleared. */\n"
     "function clearScope(){var v=V15();if(!v)return;v.clearScope();if(v.renderHub)v.renderHub();else renderTab()}",
     1),
    # --- R-V37-V27-RENDER: expose render on window.__v27 ---
    ("R-V37-V27-RENDER", "v27.js",
     "    openSmart:openSmart,closeSmart:closeSmart,setTab:setTab,setLang:setLang,goTab:goTab,goWeak:goWeak,",
     "    openSmart:openSmart,closeSmart:closeSmart,setTab:setTab,setLang:setLang,goTab:goTab,goWeak:goWeak,render:render,",
     1),
    # --- R-V37-V27-BANNER: Smart banner button re-renders after clear ---
    # render() early-returns when the overlay is hidden, so this is safe.
    ("R-V37-V27-BANNER", "v27.js",
     "    +' <button type=\"button\" class=\"v27link\" onclick=\"window.__v15&&__v15.clearScope&&__v15.clearScope()\">✕ Bỏ chọn</button></div>';",
     "    +' <button type=\"button\" class=\"v27link\" onclick=\"window.__v15&&__v15.clearScope&&__v15.clearScope();window.__v27&&__v27.render&&__v27.render()\">✕ Bỏ chọn</button></div>';",
     1),
]

ALL_REPLACEMENTS = REPLACEMENTS

# V37 markers: must be ABSENT from the pristine V18.1 base, present after.
V37_MARKERS = [
    'id="v37"', 'id="v37js"', '__v37', "VERSION='18.2.0'",
    'renderHub:renderHub', 'if(v.renderHub)v.renderHub();else renderTab()',
    '__v27.render&&__v27.render()',
]

# Distinctive strings that exist ONLY in work V37 does NOT do.
OUT_OF_SCOPE_MARKERS = [
    "armV27Obs",        # observer scoping (F-05) — NOT fixed in V18.2
    "rearmObserver",    # observer lifecycle (F-07) — NOT fixed in V18.2
    "_speakXp",         # V29 name for the speak fix — V36 uses _sxp36
    "V29 (F-05)",       # V29 observer comment — NOT in V18.2
]

# Files this build touches (for the pre-build backup + node --check).
TOUCHED_SRC = ["v15.js", "v17.js", "v27.js"]

# V33/V34/V35/V36 in-scope fragments (spot-checks, copied from
# build_v36.py / package_v36.py) — must survive V18.2.
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
V36_FRAGMENTS = [
    "function resolveLethal(Ff){",
    "partial:!!partial",
    "wind:'stone_wind'",
    "_sxp36",
    "v21emailbtn",
    "z-index:1600",
    "z-index:1700",
]


# --- helpers (EPERM-safe pattern from build_v16.py, verbatim from build_v36.py) ---
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
    tmp_path = path.with_name(path.name + ".tmp37")
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


def _sha256(path):
    return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None)
    ap.add_argument("--src", default=None)
    args = ap.parse_args()
    out = pathlib.Path(args.out) if args.out else ROOT / "out"
    src_dir = pathlib.Path(args.src) if args.src else ROOT / "src"
    v37_js = src_dir / "v37.js"
    v37_css = src_dir / "v37.css"
    assert v37_js.exists() and v37_css.exists(), "src/v37.js / src/v37.css missing"

    # --- 0. Back up every file this build will touch (src/ has no other copy) ---
    backup = ROOT / "tools" / "v37" / "backup-v18.1"
    backup.mkdir(parents=True, exist_ok=True)
    backed = []
    for fname in TOUCHED_SRC:
        for base in (src_dir, out):
            p = base / fname
            if p.exists():
                dst = backup / (base.name + "__" + fname)
                _safe_copyfile(p, dst)
                assert _sha256(p) == _sha256(dst), f"backup mismatch: {p}"
                backed.append(str(p))
    for extra in [out / "index.html"]:
        if extra.exists():
            dst = backup / ("__".join(extra.relative_to(ROOT).parts))
            dst.parent.mkdir(parents=True, exist_ok=True)
            _safe_copyfile(extra, dst)
            assert _sha256(extra) == _sha256(dst), f"backup mismatch: {extra}"
            backed.append(str(extra))
    print(f"backup OK: {len(backed)} files into {backup}")

    # --- 1. Verify the base is pristine V18.1 ---
    index = out / "index.html"
    assert index.exists(), "out/index.html missing — run on a V18.1 build"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V181_HASH, f"base is not pristine V18.1: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v36"' in built and 'id="v36js"' in built, "V36 markers missing — not a V18.1 build"
    for m in V37_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V18.1 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    print(f"verified pristine V18.1 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v36 markers present, v37 absent")

    # --- 1b. PRE-PASS: check every anchor (src files + index.html)
    # before mutating anything, so a missing anchor fails cleanly.
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        p = src_dir / fname
        text = p.read_text(encoding="utf-8")
        assert text.count(anchor) == count, f"PRE-PASS {label}: {fname}: anchor found {text.count(anchor)}x, expected exactly {count}"
        assert replacement not in text, f"PRE-PASS {label}: {fname}: replacement already present — refusing to double-apply"
    groups_pre = {}
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        g = groups_pre.setdefault(anchor, {"replacement": replacement, "total": 0, "labels": []})
        assert g["replacement"] == replacement, f"PRE-PASS anchor shared with different replacement: {label}"
        g["total"] += count
        g["labels"].append(label)
    for anchor, g in groups_pre.items():
        n = orig_bytes.count(anchor.encode("utf-8"))
        assert n == g["total"], f"PRE-PASS index.html: {g['labels']} anchor found {n}x, expected {g['total']}"
    print(f"pre-pass OK: {len(ALL_REPLACEMENTS)} replacements anchor-checked in src + index.html")

    # --- 2. Validate the V37 layer itself ---
    v37_js_t = v37_js.read_text(encoding="utf-8")
    v37_css_t = v37_css.read_text(encoding="utf-8")
    assert "</script>" not in v37_js_t.lower(), "v37.js contains </script>"
    assert "VERSION='18.2.0'" in v37_js_t and "__v37" in v37_js_t, "v37.js must expose __v37 18.2.0"
    _stripped = _re.sub(r"/\*.*?\*/", "", v37_js_t, flags=_re.S)
    _stripped = _re.sub(r"//[^\n]*", "", _stripped)
    assert "window.S" not in _stripped, "v37.js must never use window.S (lexical let)"
    assert "localStorage" not in v37_js_t, "v37.js must not touch localStorage (no new key/schema)"
    assert v37_css_t.strip(), "v37.css is empty"
    print(f"validated src/v37.js ({len(v37_js_t)} chars) + src/v37.css ({len(v37_css_t)} chars)")

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
    _safe_copyfile(v37_js, out / "v37.js")
    _safe_copyfile(v37_css, out / "v37.css")

    # --- 4. Assemble the new index.html: replacements + title + V37 ---
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
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V18.1 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # V37 layer, LAST, before </body>
    body = orig_bytes.find(b"</body>")
    assert body != -1, "no </body> in index.html"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v37">\n'),
        ("file", v37_css),
        ("glue", b'\n</style>\n<script id="v37js">\n'),
        ("file", v37_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 5. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    for anchor, g in groups.items():
        assert built.count(g["replacement"]) == g["total"], (
            f"built index.html: {g['labels']} replacement present {built.count(g['replacement'])}x, expected {g['total']}")
        assert built.count(anchor) == 0 or anchor in g["replacement"], (
            f"built index.html: {g['labels']} anchor still present (replacement did not consume it)")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V18.2 title missing / V18.1 title remains"
    assert "window.__v37" in built and "VERSION='18.2.0'" in built, "built index.html missing __v37 18.2.0"
    # v37 markers are the LAST style/script markers before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v37", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v37", f"script marker order wrong: {script_ids}"
    assert built.find('id="v37js"') > built.find('id="v36js"'), "v37js is not after v36js"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0", "17.0.0", "17.1.0", "18.0.0", "18.1.0"):
        assert ver in built, f"built html lost version {ver}"
    # V33/V34/V35/V36 fragments still present
    for frag in V33_FRAGMENTS:
        assert frag in built, f"built html lost V33 fragment: {frag[:60]}"
    for frag in V34_FRAGMENTS:
        assert frag in built, f"built html lost V34 fragment: {frag[:60]}"
    for frag in V35_FRAGMENTS:
        assert frag in built, f"built html lost V35 fragment: {frag[:60]}"
    for frag in V36_FRAGMENTS:
        assert frag in built, f"built html lost V36 fragment: {frag[:60]}"
    # V37 fragments present (exact counts where the string is unique)
    assert built.count("renderTab:renderTab,renderHub:renderHub,topicName:topicName,counts15:counts15,") == 1, "built html: R-V37-V15-RENDERHUB missing"
    assert built.count("if(v.renderHub)v.renderHub();else renderTab()") == 1, "built html: R-V37-V17-CLEARSCOPE missing"
    assert built.count("function clearScope(){var v=V15();if(!v)return;v.clearScope();renderTab()}") == 0, "built html: old clearScope line remains"
    assert built.count("goTab:goTab,goWeak:goWeak,render:render,") == 1, "built html: R-V37-V27-RENDER missing"
    assert built.count("__v27.render&&__v27.render()") == 1, "built html: R-V37-V27-BANNER missing"
    assert built.count("window.__v15&&__v15.clearScope&&__v15.clearScope()\">✕ Bỏ chọn") == 0, "built html: old v27 banner onclick remains"
    # KO tabs line: no new button in V18.2; v35kotab/v33kotab still x1
    assert built.count('<button class="tab v35kotab"') == 1, "built index.html: KO v35kotab button changed"
    assert built.count('<button class="tab v33kotab"') == 1, "built index.html: KO v33kotab button changed"
    # out-of-scope replacements absent
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"built index.html: out-of-scope marker {marker!r} present"
    # src/out/index copies agree on every replacement
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        for base in (src_dir, out):
            assert (base / fname).read_text(encoding="utf-8").count(replacement) == count, (
                f"{base}/{fname}: {label} count != {count}")
    _node_check(v37_js)
    for fname in touched:
        _node_check(src_dir / fname)
    _safe_copyfile(HERE / "build_v37.py", out / "build_v37.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V18.2, layer V37 injected last")
    print("V37: Scope Banner Fix — 4 replacements (V15 x1, V17 x1, V27 x2) + title")
    print("marker order OK: v37 last (styles + scripts), v37js after v36js; KO tabs line unchanged; out-of-scope markers absent")
    return 0


if __name__ == "__main__":
    sys.exit(main())
