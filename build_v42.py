#!/usr/bin/env python3
"""Build V18.7 (UNLOCK SHORTCUTS) from the pristine V18.6 build + the V42 layer.

V18.7 = V18.6 (Bug Fixes III, layer V41) + layer V42 (src/v42.js +
src/v42.css) + 2 guarded build-script replacements (see REPLACEMENTS
below) + the V18.7 title.

THE FEATURE (Anh's live report, 2026-11-20: locked Skyroot overlay,
KO, 13/86 wins, GEAR GOLEM unbeaten — "which boss do I fight to
unlock this region?"):
  R-V42-V33-GATE: the Chrono gate card drops the "Không có đường
    tắt" line (the shortcut IS the point now) and appends
    __v42.chronoGateHTML(lang,gate) — a button to the easiest unwon,
    fightable boss of the 70 (old EN-only / flat V18 / V19-map
    pools, lv ascending, pool tie-break v18, old, v19), or an
    honest <p> when no such boss exists.
  R-V42-V35-GATE: the Skyroot gate card appends
    __v42.skyrootGateHTML(lang,gate) — a button to the first
    unlocked, unwon Chrono boss on the road to GEAR GOLEM
    (GEAR GOLEM itself when it is the next one), or an honest <p>
    when none exists.
  The V42 layer (src/v42.js) re-computes the target at tap time
  and launches the fight through the boss's own engine
  (__v33.fightBoss, __v19.fight, __v18.fight with lang passed,
  __v15.bossFight). No schema change, no new save key, no new
  localStorage key, no data change, no art.

FIXED IN THIS REVISION (was the flagged KNOWN LIMIT):
  __v33.bossUnlocked returns false for ALL Chrono bosses while the
  70-win gate is closed, so the Chrono-sequence scan in
  skyrootTarget() is null in exactly Anh's screenshot state (13/86
  wins) — the old null text ("already won all 8") was FALSE there.
  skyrootTarget() now falls back to chronoTarget(lang) while the
  70-gate is closed (flagged viaChrono:true), so the Skyroot overlay
  offers the easiest unwon, fightable boss of the 70 instead, and
  goSkyroot() launches it through the same pool routing as
  goChrono() (shared launchChronoTarget), never through
  __v33.fightBoss (which would refuse a non-Chrono boss while the
  gate is closed). The null case is now defensive-only with the
  honest line "Không tìm thấy boss nào có thể đánh ngay…".

WHAT THIS SCRIPT DOES (in order):
  0. Backs up every file it will touch into tools/v42/backup-v18.6/
     (src/ files from src/; out/ files from the hash-verified
     pristine copy tools/v42/pristine-v18.6-out/). Backup uses the
     EPERM-safe chunk writer (the host has intermittent EPERM write
     waves; plain cp/copy_file_range fails during a wave).
  1. Verifies the base is the pristine V18.6 build (hash + v41
     markers present, v42 markers absent). REFUSES to run otherwise.
     PRE-PASS: every replacement anchor is checked (src files AND
     out/index.html) BEFORE any file is mutated.
  2. Applies the src replacements to the standalone src/*.js files
     (exact-match asserts, fails if an anchor is missing / duplicated /
     already applied).
  3. Mirrors the patched src files into out/ (copies must agree).
  4. Applies the same replacements + the V18.7 title to the inlined
     blocks in out/index.html (byte edits, exact-count asserts),
     plus the V42 layer injection (style v42 + script v42js, LAST,
     before </body>).
  5. Verifies: marker order (v42 last), v42 version 18.7.0,
     node --check on v42.js + every touched src file, old versions
     intact, V33–V41 fragments still present, V42 fragments present.

RUN EXACTLY ONCE on a fresh V18.6 out/. NEVER re-run build_v33.py /
build_v34.py / build_v35.py / build_v36.py / build_v37.py / build_v38.py
/ build_v39.py / build_v40.py / build_v41.py (or any older build
script) on a finished build (they reorder layers — see the V32 skill
notes).

Usage:  python3 build_v42.py [--out DIR] [--src DIR]
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
import build_v41 as _b41  # V33–V40 in-scope fragments + out-of-scope markers, verbatim

# Pristine V18.6 out/index.html (2,397,154 B) — verified before any edit.
V186_HASH = "f0576130e6ff53478727319fa54fd5d703d76717b42561c1b29b5c41849697eb"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V18.6 — Bug Fixes III — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V18.7 — Unlock Shortcuts — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

REPLACEMENTS = [
    ('R-V42-V33-GATE', 'v33.js',
     "    +(gate?'✅ Cổng đã mở — chào mừng đến Vương Quốc Thời Gian!':'Thắng đủ 70 boss để mở vùng đất này. Không có đường tắt — số liệu là thật, đếm từ chính bản lưu của bạn.')+'</p></div>';",
     "    +(gate?'✅ Cổng đã mở — chào mừng đến Vương Quốc Thời Gian!':'Thắng đủ 70 boss để mở vùng đất này — số liệu là thật, đếm từ chính bản lưu của bạn.')+'</p>'\n"
     "    +(window.__v42?window.__v42.chronoGateHTML(lang,gate):'')+'</div>';",
     1),
    ('R-V42-V35-GATE', 'v35.js',
     "    +(n?' Tổng số boss đã thắng: '+n+'/86.':'')+'</p></div>';",
     "    +(n?' Tổng số boss đã thắng: '+n+'/86.':'')+'</p>'\n"
     "    +(window.__v42?window.__v42.skyrootGateHTML(lang,gate):'')+'</div>';",
     1),
]

ALL_REPLACEMENTS = REPLACEMENTS

# V42 markers: must be ABSENT from the pristine V18.6 base, present after.
V42_MARKERS = [
    'id="v42"', 'id="v42js"', '__v42', "VERSION='18.7.0'",
]

# Distinctive strings that exist ONLY in work V42 does NOT do
# (copied verbatim from build_v41.py — the base must not have moved).
OUT_OF_SCOPE_MARKERS = _b41.OUT_OF_SCOPE_MARKERS

# Files this build touches (for the pre-build backup + node --check).
TOUCHED_SRC = ["v33.js", "v35.js"]


# --- helpers (EPERM-safe pattern from build_v41.py) ---
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
    tmp = pathlib.Path(dst).with_name(pathlib.Path(dst).name + ".tmp42")
    with open(tmp, "wb", buffering=0) as f:
        for off in range(0, len(data), 8192):
            _wsmall(f, data[off:off + 8192])
    os.rename(tmp, dst)
    assert hashlib.sha256(pathlib.Path(dst).read_bytes()).hexdigest() == hashlib.sha256(data).hexdigest(), f"backup copy mismatch: {dst}"


def _write_text_epersafe(path, text):
    """Write text to path via tmp file + atomic rename (EPERM-safe)."""
    tmp_path = path.with_name(path.name + ".tmp42")
    with open(tmp_path, "wb", buffering=0) as f:
        _wsmall(f, text.encode("utf-8"))
    os.rename(tmp_path, path)


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
    pristine = ROOT / "tools" / "v42" / "pristine-v18.6-out"
    v42_js = src_dir / "v42.js"
    v42_css = src_dir / "v42.css"
    assert v42_js.exists() and v42_css.exists(), "src/v42.js / src/v42.css missing"
    assert pristine.is_dir(), "tools/v42/pristine-v18.6-out missing — the hash-verified V18.6 backup source"

    # --- 0. Back up every file this build will touch into
    # tools/v42/backup-v18.6/ (src/ files from src/; out/ files from
    # the pristine copy, verified byte-identical to the live out/). ---
    backup = ROOT / "tools" / "v42" / "backup-v18.6"
    backup.mkdir(parents=True, exist_ok=True)
    backed = []
    for fname in TOUCHED_SRC:
        p = src_dir / fname
        assert p.exists(), f"src/{fname} missing"
        dst = backup / ("src__" + fname)
        _copy_bytes_epersafe(p, dst)
        backed.append(str(p))
    for fname in TOUCHED_SRC + ["index.html"]:
        live = out / fname
        src_copy = pristine / fname
        assert live.exists(), f"out/{fname} missing"
        assert src_copy.exists(), f"pristine-v18.6-out/{fname} missing"
        assert _sha256(live) == _sha256(src_copy), (
            f"out/{fname} differs from the pristine copy — refusing to build on a moved tree")
        dst = backup / ("out__" + fname)
        _copy_bytes_epersafe(src_copy, dst)
        backed.append(str(live))
    print(f"backup OK: {len(backed)} files into {backup} (out/ files sourced from the pristine copy)")

    # --- 1. Verify the base is pristine V18.6 ---
    index = out / "index.html"
    assert index.exists(), "out/index.html missing — run on a V18.6 build"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V186_HASH, f"base is not pristine V18.6: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v41"' in built and 'id="v41js"' in built, "V41 markers missing — not a V18.6 build"
    for m in V42_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V18.6 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    print(f"verified pristine V18.6 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v41 markers present, v42 absent")

    # --- 1b. PRE-PASS: check every anchor (src files + index.html)
    # before mutating anything, so a missing anchor fails cleanly. ---
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
    print(f"pre-pass OK: {len(ALL_REPLACEMENTS)} src replacements anchor-checked")

    # --- 2. Validate the V42 layer itself ---
    v42_js_t = v42_js.read_text(encoding="utf-8")
    v42_css_t = v42_css.read_text(encoding="utf-8")
    assert "</script>" not in v42_js_t.lower(), "v42.js contains </script>"
    assert "VERSION='18.7.0'" in v42_js_t and "__v42" in v42_js_t, "v42.js must expose __v42 18.7.0"
    _stripped = _re.sub(r"/\*.*?\*/", "", v42_js_t, flags=_re.S)
    _stripped = _re.sub(r"//[^\n]*", "", _stripped)
    assert "window.S" not in _stripped, "v42.js must never use window.S (lexical let)"
    assert "localStorage" not in v42_js_t, "v42.js must not touch localStorage (no new key/schema)"
    assert v42_css_t.strip(), "v42.css is empty"
    print(f"validated src/v42.js ({len(v42_js_t)} chars) + src/v42.css ({len(v42_css_t)} chars)")

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
        _copy_bytes_epersafe(src_dir / fname, out / fname)
        assert (out / fname).read_text(encoding="utf-8") == (src_dir / fname).read_text(encoding="utf-8"), (
            f"out/{fname} does not match patched src/{fname}")
    _copy_bytes_epersafe(v42_js, out / "v42.js")
    _copy_bytes_epersafe(v42_css, out / "v42.css")

    # --- 4. Assemble the new index.html: replacements + title + V42 layer ---
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
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V18.6 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # V42 layer, LAST, before </body>
    # rfind, NOT find: see the v37.css "</body>" comment trap (build_v41.py).
    body = orig_bytes.rfind(b"</body>")
    assert body != -1, "no </body> in index.html"
    assert body > orig_bytes.rfind(b'id="v41js"'), "injection point is before v41js - wrong </body>"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v42">\n'),
        ("file", v42_css),
        ("glue", b'\n</style>\n<script id="v42js">\n'),
        ("file", v42_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 5. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    for anchor, g in groups.items():
        assert built.count(g["replacement"]) == g["total"], (
            f"built index.html: {g['labels']} replacement present {built.count(g['replacement'])}x, expected {g['total']}")
        assert built.count(anchor) == 0, (
            f"built index.html: {g['labels']} anchor still present (replacement did not consume it)")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V18.7 title missing / V18.6 title remains"
    assert "window.__v42" in built and "VERSION='18.7.0'" in built, "built index.html missing __v42 18.7.0"
    # v42 markers are the LAST style/script markers before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v42", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v42", f"script marker order wrong: {script_ids}"
    assert built.find('id="v42js"') > built.find('id="v41js"'), "v42js is not after v41js"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0", "17.0.0", "17.1.0", "18.0.0", "18.1.0", "18.2.0", "18.3.0", "18.4.0", "18.5.0", "18.6.0"):
        assert ver in built, f"built html lost version {ver}"
    # V33–V40 fragments still present (verbatim lists from build_v41.py)
    for frag in _b41.V33_FRAGMENTS:
        assert frag in built, f"built html lost V33 fragment: {frag[:60]}"
    for frag in _b41.V34_FRAGMENTS:
        assert frag in built, f"built html lost V34 fragment: {frag[:60]}"
    for frag in _b41.V35_FRAGMENTS:
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
    # V41 fragments still present (exact counts, from build_v41.py §6)
    assert built.count("indexOf('ca-')===0") == 4, f"built html: CA gate present {built.count(chr(39)+'ca-'+chr(39))}x, expected 4"
    assert built.count("Math.min(3,F.caRight)") == 1, "built html: R-V41-V19-CA-CLAMP missing"
    assert built.count("if(!j.opt)j.opt={mode:'card',dir:'kv',group:'',due:false}") == 1, "built html: R-V41-INDEX-OPT missing"
    assert built.count("var old=$('#v15farmquiz');if(old)old.remove();") == 1, "built html: R-V41-V15-FARMQUIZ missing"
    assert built.count("try{ flush(); }catch(e){}") == 2, f"built html: R-V41-V20-FLUSH count {built.count('try{ flush(); }catch(e){}')}, expected 2"
    assert built.count("try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}") == 6, f"built html: R-V41-V15-FLUSH count {built.count('try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}')}, expected 6"
    assert built.count('flex:0 0 auto;min-width:64px') == 1, "built html: R-V41-V41-NAV min-width rule missing"
    assert built.count('"src": "a1a2"') == 999, "built html: A1-A2 raw rows != 999"
    assert built.count('"src": "oxford"') == 3395, "built html: Oxford raw rows != 3395"
    # V42 fragments present (exact counts: 5 in the inlined v42.js
    # — definition + export key/value + _test key/value — plus 1 call site each)
    assert built.count("chronoGateHTML") == 6, f"built html: chronoGateHTML present {built.count('chronoGateHTML')}x, expected 6"
    assert built.count("skyrootGateHTML") == 6, f"built html: skyrootGateHTML present {built.count('skyrootGateHTML')}x, expected 6"
    assert built.count("window.__v42?window.__v42.chronoGateHTML(lang,gate)") == 1, "built html: R-V42-V33-GATE call site missing"
    assert built.count("window.__v42?window.__v42.skyrootGateHTML(lang,gate)") == 1, "built html: R-V42-V35-GATE call site missing"
    assert built.count("Không có đường tắt") == 0, "built html: old 'Không có đường tắt' line still present"
    assert built.count("Thắng đủ 70 boss để mở vùng đất này — số liệu là thật") == 1, "built html: new Chrono gate copy missing"
    assert built.count("Thắng đủ 70 boss để mở vùng đất này. Không có đường tắt") == 0, "built html: old Chrono gate copy still present"
    assert built.count(".v42btn{min-height:44px") == 1, "built html: v42.css rule missing"
    assert built.count("window.__v42={") == 1, "built html: __v42 export missing"
    assert built.count("Không tìm thấy boss nào có thể đánh ngay") == 2, "built html: V42 skyroot null-state copy missing (gate HTML + tap-time pop)"
    # Deliberately UNCHANGED by V42 (needs Anh's decision): legDiff's
    # counts-getter bug stays exactly as it was in V18.5/V18.6.
    assert built.count("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}") == 1, "built html: legDiff changed (out of scope for V18.7)"
    # Deliberately UNCHANGED by V42: C-R2-1 (markKO/markKO19 pay no XP).
    assert built.count("/* V39 (V18.4): KO boss answers also feed Smart Learning (V27) —") == 2, "built html: markKO/markKO19 changed (C-R2-1 is out of scope for V18.7)"
    # KO entry buttons unchanged.
    assert built.count('<button class="tab v35kotab"') == 1, "built index.html: KO v35kotab button changed"
    assert built.count('<button class="tab v33kotab"') == 1, "built index.html: KO v33kotab button changed"
    # out-of-scope replacements absent
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"built index.html: out-of-scope marker {marker!r} present"
    # src/out/index copies agree on every replacement
    for label, fname, anchor, replacement, count in ALL_REPLACEMENTS:
        for base in (src_dir, out):
            t = (base / fname).read_text(encoding="utf-8")
            assert t.count(replacement) == count, f"{base}/{fname}: {label} count != {count}"
    _node_check(v42_js)
    for fname in touched:
        _node_check(src_dir / fname)
    # ship the build script itself with the deliverable (reproducibility)
    _copy_bytes_epersafe(HERE / "build_v42.py", out / "build_v42.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V18.7, layer V42 injected last")
    print("V42: Unlock Shortcuts — 2 src replacements (v33 gate card, v35 gate card) + title")
    print("marker order OK: v42 last (styles + scripts), v42js after v41js; KO tabs line unchanged; out-of-scope markers absent; C-R2-1 + legDiff untouched")
    return 0


if __name__ == "__main__":
    sys.exit(main())
