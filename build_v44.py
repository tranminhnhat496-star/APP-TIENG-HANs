#!/usr/bin/env python3
"""Build V18.9 (LEGENDARY FREEZE FIX) from the pristine V18.8 build + the V44 layer.

V18.9 = V18.8 (Boss-Fight Readability, layer V43) + layer V44:
  (a) two exact-match hoists inside the EMBEDDED v18.js of out/index.html
      (mirrored in src/v18.js, the source of truth) — legDiff() moves OUT
      of the per-item filters in wordPool() and grammarPool();
  (b) the V44 version-marker layer (src/v44.js, inlined LAST, before
      </body>), following the V42/V43 pattern;
  (c) the V18.9 title.

THE BUG (Anh's live report, 2026-11-21: tapping "Khiêu chiến" on a
Legendary boss freezes the game). REPRODUCED in real Chrome 157 on the
pristine V18.8 base (tools/v44/repro/logs/r44-results.json):
  Real UI clicks, Legendary arena, Hắc Long Nham Hỏa (v10_firedragon):
    "Khiêu chiến" click ......... 5.5 ms (language pick renders at once)
    🇬🇧 Tiếng Anh click ......... 3,679.5 ms main-thread block (run 1: 3,649.1 ms)
    direct fight() starts ....... 7,660.6 ms (mastered 250), 7,309.9 ms (mastered 700)
  Controls on the same build:
    Challenge fight start ....... 6.2 ms — the freeze is Legendary-only
    one counts() scan ........... ~3.8 ms (WORDS = 4,889)
    grammar filter replay ....... 123.9 ms for 48 items (2.58 ms per legDiff())
  ROOT CAUSE (src/v18.js:254,275,284 — confirmed in source, then measured):
    legDiff() reads V15().counts().mastered; counts is a GETTER
    (get counts(){return counts15()} at src/v15.js:1787) and counts15()
    (src/v15.js:460-470) is a full scan of the whole WORDS array on
    EVERY call. wordPool() called legDiff() once PER WORD inside its
    filter (~4,889 words x a ~4,889-word scan = O(n^2), ~25M iterations)
    and grammarPool() once per grammar item (48 x the same scan).
    nextQ() builds both pools once per fight, on the FIRST question, so
    the freeze lands exactly on fight start, after the EN/KO pick.
    openArena/bossUnlocked never call legDiff, so opening the arena is fine.
  THE FIX: compute legDiff() ONCE per pool build (var lv=... before the
  filter) and reuse it inside. The level list depends only on the
  mastered count, which cannot change mid-filter, so the filtered pool
  is IDENTICAL — same difficulty, same questions. Thresholds unchanged
  (<200 -> A2/B1, <600 -> B1, else B2); no other fight logic, reward,
  XP, SRS, pet or save change; weakness table untouched.

DELIBERATELY NOT FIXED HERE (needs Anh's decision — reported, not hidden):
  legDiff() reads V15().counts().mastered, but counts is a GETTER, not a
  method, so that call throws TypeError, the try/catch swallows it, m
  stays 0 and legDiff() ALWAYS returns ['A2','B1'] whatever the mastered
  count is (verified in Chrome: mastered 0/250/700 all give ['A2','B1'],
  and the Legendary pool is byte-identical across all three). Fixing the
  read would CHANGE Legendary pools for players with >=200 mastered
  words, so it stays a pending decision item. The hoist preserves the
  exact current behaviour; legDiff's definition is asserted UNCHANGED.
  C-R2-1 (KO boss answers pay no per-answer XP) also stays unchanged.

AUDIT (done before building, in src/):
  v18.js legDiff() call sites: def (254), wordPool filter (275, fixed),
  grammarPool filter (284, fixed), _test export (738, unchanged).
  v19.js: NO legDiff()/counts() call sites at all; its wordPool/
  grammarPool use b.diff directly — clean. No other per-item full-scan
  getter inside a filter/loop in v18.js or v19.js (the remaining V15()
  calls — oldWins, bossUnlocked, wordsFiltered — run once per call, not
  per item).

WHAT THIS SCRIPT DOES (in order):
  0. Backs up out/index.html (from the hash-verified pristine copy
     tools/v44/pristine-v18.8-out/) + the pre-fix src/v18.js + the new
     src/v44.js into tools/v44/backup-v18.8/.
  1. Verifies the base is the pristine V18.8 build (hash + v43 markers
     present, v44 markers absent). REFUSES otherwise.
  2. Validates the V44 replacements against src/v18.js (the new blocks
     are already in src/v18.js; the old blocks are gone there) and the
     V44 marker file itself.
  3. Copies src/v44.js into out/.
  4. Assembles the new index.html: the V18.9 title + the two hoist
     replacements inside the embedded v18.js + the V44 layer injection
     (script v44js, LAST, before </body>).
  5. Verifies: marker order (v44js last), v44 version 18.9.0, node
     --check on v44.js, old versions intact, V33–V43 fragments still
     present, V44 fragments present with exact counts, the OLD per-item
     legDiff() lines GONE (count 0), legDiff's definition + thresholds
     + C-R2-1 deliberately UNCHANGED, out-of-scope markers absent.

RUN EXACTLY ONCE on a fresh V18.8 out/. NEVER re-run build_v33.py
/ build_v34.py / ... / build_v43.py (or any older build script) on
a finished build (they reorder layers — see the V32 skill notes).

Usage:  python3 build_v44.py [--out DIR] [--src DIR]
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

# Pristine V18.8 out/index.html (2,421,418 B) — verified before any edit.
V188_HASH = "3ad47dbf82fb2d5e508ff13b2d441ad63c061690361d18fd113c84f4466ee73b"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V18.8 — Boss-Fight Readability — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V18.9 — Legendary Freeze Fix — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# V44 markers: must be ABSENT from the pristine V18.8 base, present after.
V44_MARKERS = [
    'id="v44js"', '__v44', "VERSION='18.9.0'",
]

# Distinctive strings that exist ONLY in work V44 does NOT do
# (copied verbatim from build_v41.py — the base must not have moved).
OUT_OF_SCOPE_MARKERS = _b41.OUT_OF_SCOPE_MARKERS

# --- the two hoists (exact text; must match src/v18.js byte for byte) ---
OLD_WORDPOOL = """  var list=words.filter(function(w){
    if(b.lib==='a1a2'&&(!w.lib||w.lib.indexOf('a1a2')<0))return false;
    if(b.lib==='oxford'&&(!w.lib||w.lib.indexOf('oxford')<0))return false;
    if(b.arena==='leg'){var lv=legDiff();if(lv.indexOf(w.lv)<0)return false}
    else if(b.diff&&w.lv!==b.diff)return false;
    return true;
  });"""
NEW_WORDPOOL = """  /* V44 (V18.9): legDiff() was called once PER WORD inside this filter —
     each call runs V15().counts(), a full WORDS scan (~4,889 items), so
     a Legendary fight start blocked the main thread for seconds (O(n^2)).
     legDiff() depends only on the mastered count, which cannot change
     mid-filter, so compute it ONCE here. Same levels, same pool. */
  var lv=b.arena==='leg'?legDiff():null;
  var list=words.filter(function(w){
    if(b.lib==='a1a2'&&(!w.lib||w.lib.indexOf('a1a2')<0))return false;
    if(b.lib==='oxford'&&(!w.lib||w.lib.indexOf('oxford')<0))return false;
    if(b.arena==='leg'){if(lv.indexOf(w.lv)<0)return false}
    else if(b.diff&&w.lv!==b.diff)return false;
    return true;
  });"""
OLD_GRAMMARPOOL = """function grammarPool(b){
  var g=(window.__V15_DATA&&__V15_DATA.grammar)||[];
  var list=g.filter(function(x){return b.arena==='leg'?legDiff().indexOf(x.lv)>=0:x.lv===b.diff});
  return shuffle(list.length?list:g);
}"""
NEW_GRAMMARPOOL = """function grammarPool(b){
  var g=(window.__V15_DATA&&__V15_DATA.grammar)||[];
  /* V44 (V18.9): same hoist as wordPool — legDiff() once per pool build,
     not once per grammar item (48 items x a full WORDS scan each). */
  var lv=b.arena==='leg'?legDiff():null;
  var list=g.filter(function(x){return b.arena==='leg'?lv.indexOf(x.lv)>=0:x.lv===b.diff});
  return shuffle(list.length?list:g);
}"""


# --- helpers (EPERM-safe pattern from build_v41.py / build_v42.py / build_v43.py) ---
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
    tmp = pathlib.Path(dst).with_name(pathlib.Path(dst).name + ".tmp44")
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
    pristine = ROOT / "tools" / "v44" / "pristine-v18.8-out"
    v44_js = src_dir / "v44.js"
    v18_js = src_dir / "v18.js"
    assert v44_js.exists(), "src/v44.js missing"
    assert v18_js.exists(), "src/v18.js missing"
    assert pristine.is_dir(), "tools/v44/pristine-v18.8-out missing — the hash-verified V18.8 backup source"

    # --- 0. Back up out/index.html (from the pristine copy, verified
    # byte-identical to the live out/) + the pre-fix src/v18.js + the new
    # src/v44.js into tools/v44/backup-v18.8/. ---
    backup = ROOT / "tools" / "v44" / "backup-v18.8"
    backup.mkdir(parents=True, exist_ok=True)
    live = out / "index.html"
    src_copy = pristine / "index.html"
    assert live.exists(), "out/index.html missing"
    assert src_copy.exists(), "pristine-v18.8-out/index.html missing"
    assert _sha256(live) == _sha256(src_copy), (
        "out/index.html differs from the pristine copy — refusing to build on a moved tree")
    _copy_bytes_epersafe(src_copy, backup / "out__index.html")
    _copy_bytes_epersafe(v44_js, backup / "src__v44.js")
    print(f"backup OK: out/index.html + new layer file recorded in {backup}")

    # --- 1. Verify the base is pristine V18.8 ---
    index = out / "index.html"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V188_HASH, f"base is not pristine V18.8: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v43"' in built and 'id="v43js"' in built, "V43 markers missing — not a V18.8 build"
    for m in V44_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V18.8 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    # The two pre-fix per-item legDiff() lines must each exist exactly once.
    assert built.count(OLD_WORDPOOL) == 1, "pre-fix wordPool block not found exactly once in base"
    assert built.count(OLD_GRAMMARPOOL) == 1, "pre-fix grammarPool block not found exactly once in base"
    print(f"verified pristine V18.8 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v43 markers present, v44 absent")

    # --- 2. Validate the V44 layer itself ---
    # src/v18.js (source of truth) already carries the new blocks and no
    # longer carries the old per-item lines; the embedded copy in
    # out/index.html is replaced with the SAME text below.
    v18_t = v18_js.read_text(encoding="utf-8")
    assert NEW_WORDPOOL in v18_t, "src/v18.js missing the new wordPool block"
    assert NEW_GRAMMARPOOL in v18_t, "src/v18.js missing the new grammarPool block"
    assert OLD_WORDPOOL not in v18_t, "src/v18.js still has the old wordPool block"
    assert OLD_GRAMMARPOOL not in v18_t, "src/v18.js still has the old grammarPool block"
    # legDiff's definition + thresholds are DELIBERATELY unchanged in src.
    assert v18_t.count("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}if(m<200)return ['A2','B1'];if(m<600)return ['B1'];return ['B2']}") == 1, "src/v18.js: legDiff definition/thresholds changed (out of scope)"
    # The pre-fix src/v18.js is preserved in the backup dir for the record.
    _copy_bytes_epersafe(v18_js, backup / "src__v18.js.new")
    v44_js_t = v44_js.read_text(encoding="utf-8")
    assert "</script>" not in v44_js_t.lower(), "v44.js contains </script>"
    assert "VERSION='18.9.0'" in v44_js_t and "__v44" in v44_js_t, "v44.js must expose __v44 18.9.0"
    _stripped = _re.sub(r"/\*.*?\*/", "", v44_js_t, flags=_re.S)
    _stripped = _re.sub(r"//[^\n]*", "", _stripped)
    assert "window.S" not in _stripped, "v44.js must never use window.S (lexical let)"
    assert "localStorage" not in v44_js_t, "v44.js must not touch localStorage (no new key/schema)"
    print(f"validated src/v44.js ({len(v44_js_t)} chars) + src/v18.js hoists (old blocks gone, new blocks present, legDiff def unchanged)")

    # --- 3. Copy the layer file into out/ ---
    _copy_bytes_epersafe(v44_js, out / "v44.js")

    # --- 4. Assemble the new index.html: title + two hoists + V44 layer ---
    edits = []
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V18.8 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # wordPool hoist (exact-match replacement inside embedded v18.js)
    w_old = OLD_WORDPOOL.encode("utf-8")
    w0 = orig_bytes.find(w_old)
    assert w0 != -1 and orig_bytes.count(w_old) == 1, "index.html: pre-fix wordPool block not found exactly once"
    edits.append({"start": w0, "end": w0 + len(w_old),
                  "chunks": [("glue", NEW_WORDPOOL.encode("utf-8"))]})
    # grammarPool hoist (exact-match replacement inside embedded v18.js)
    g_old = OLD_GRAMMARPOOL.encode("utf-8")
    g0 = orig_bytes.find(g_old)
    assert g0 != -1 and orig_bytes.count(g_old) == 1, "index.html: pre-fix grammarPool block not found exactly once"
    edits.append({"start": g0, "end": g0 + len(g_old),
                  "chunks": [("glue", NEW_GRAMMARPOOL.encode("utf-8"))]})
    # V44 layer, LAST, before </body>
    # rfind, NOT find: see the v37.css "</body>" comment trap (build_v41.py).
    body = orig_bytes.rfind(b"</body>")
    assert body != -1, "no </body> in index.html"
    assert body > orig_bytes.rfind(b'id="v43js"'), "injection point is before v43js - wrong </body>"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<script id="v44js">\n'),
        ("file", v44_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 5. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V18.9 title missing / V18.8 title remains"
    assert "window.__v44" in built and "VERSION='18.9.0'" in built, "built index.html missing __v44 18.9.0"
    # v44js is the LAST script marker before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v43", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v44", f"script marker order wrong: {script_ids}"
    assert built.find('id="v44js"') > built.find('id="v43js"'), "v44js is not after v43js"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0", "17.0.0", "17.1.0", "18.0.0", "18.1.0", "18.2.0", "18.3.0", "18.4.0", "18.5.0", "18.6.0", "18.7.0", "18.8.0"):
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
    # V41 fragments still present (exact counts, from build_v41.py §6 / build_v43.py §5)
    assert built.count("indexOf('ca-')===0") == 4, f"built html: CA gate present {built.count(chr(39)+'ca-'+chr(39))}x, expected 4"
    assert built.count("Math.min(3,F.caRight)") == 1, "built html: R-V41-V19-CA-CLAMP missing"
    assert built.count("if(!j.opt)j.opt={mode:'card',dir:'kv',group:'',due:false}") == 1, "built html: R-V41-INDEX-OPT missing"
    assert built.count("var old=$('#v15farmquiz');if(old)old.remove();") == 1, "built html: R-V41-V15-FARMQUIZ missing"
    assert built.count("try{ flush(); }catch(e){}") == 2, f"built html: R-V41-V20-FLUSH count {built.count('try{ flush(); }catch(e){}')}, expected 2"
    assert built.count("try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}") == 6, f"built html: R-V41-V15-FLUSH count {built.count('try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}')}, expected 6"
    assert built.count('flex:0 0 auto;min-width:64px') == 1, "built html: R-V41-V41-NAV min-width rule missing"
    assert built.count('"src": "a1a2"') == 999, "built html: A1-A2 raw rows != 999"
    assert built.count('"src": "oxford"') == 3395, "built html: Oxford raw rows != 3395"
    # V42 fragments present (exact counts, from build_v42.py §5 / build_v43.py §5)
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
    # V43 fragments present (exact counts, from build_v43.py §5)
    assert built.count('id="v43"') == 1, "built html: v43 style marker missing"
    assert built.count('id="v43js"') == 1, "built html: v43js script marker missing"
    assert built.count("window.__v43={version:VERSION}") == 1, "built html: __v43 export missing"
    assert built.count(".v19fight .v19qword{color:#fff}") == 1, "built html: V43 V19 qword rule missing"
    assert built.count(".v19fight .v19qcard .mute{color:var(--ui-text-muted-dark,#C4B9E2)}") == 1, "built html: V43 V19 qcard-mute rule missing"
    assert built.count(".v19fight .v19fight-info>b{color:#fff}") == 1, "built html: V43 V19 boss-name rule missing"
    assert built.count(".v19fight .v19opt{color:#fff}") == 1, "built html: V43 V19 opt rule missing"
    assert built.count(".v19fight .v19explain[style*=\"--bad\"]{color:#FF8A78 !important}") == 1, "built html: V43 V19 explain-bad rule missing"
    assert built.count(".v19fight .v19phase{background:#5B3FD4;color:#fff}") == 1, "built html: V43 V19 phase rule missing"
    assert built.count(".v19fight .v34bar-t{color:#fff}") == 1, "built html: V43 V19 breakbar-t rule missing"
    assert built.count('.v19fight .v34bar.v34blocked .mute{color:var(--ui-text-muted-dark,#C4B9E2)}') == 1, "built html: V43 V19 blocked-bar mute rule missing"
    assert built.count(".v19fight .v19chip{background:color-mix(in srgb,var(--ec,#888) 45%,#000);color:#fff}") == 1, "built html: V43 V19 chip rule missing"
    assert built.count(".v18fight .v18qword{color:var(--ink)}") == 1, "built html: V43 V18 qword rule missing"
    assert built.count(".v18fight .v18opt{color:var(--ink)}") == 1, "built html: V43 V18 opt rule missing"
    assert built.count(".v18fight .v18warn{color:#FFE066}") == 1, "built html: V43 V18 warn rule missing"
    assert built.count('.v18fight .v18explain[style*="--ok"]{color:#1B7F5A !important}') == 1, "built html: V43 V18 explain-ok rule missing"
    assert built.count('.v18fight .v18explain[style*="--bad"]{color:#C23A30 !important}') == 1, "built html: V43 V18 explain-bad rule missing"
    assert built.count(".v18fight .v18phase{background:linear-gradient(90deg,#6D28D9,#C1121F);color:#fff}") == 1, "built html: V43 V18 phase rule missing"
    assert built.count(".v18fight .v34weakchip{color:#7A5B00;border-color:#7A5B00;background:rgba(122,91,0,.08)}") == 1, "built html: V43 V18 break-chip rule missing"
    assert built.count(".v18fight .v34bar-t{color:var(--ink)}") == 1, "built html: V43 V18 breakbar-t rule missing"
    assert built.count(".v18fight .v34bar.v34blocked .mute{color:var(--ink)}") == 1, "built html: V43 V18 blocked-bar mute rule missing"
    assert built.count(".v23bar-fight .v23bf-skill:disabled{opacity:1;background:#6E5F3E;color:#FFF8E1;border-color:#8A7A52;cursor:not-allowed}") == 1, "built html: V43 disabled skill-button rule missing"
    assert built.count(':root[data-theme="dark"] .v18fight') == 3, f"built html: V43 dark-theme restorations present {built.count(chr(58)+'root[data-theme='+chr(34)+'dark'+chr(34)+'] .v18fight')}x, expected 3"
    # V44 fragments present (exact counts) — the hoists
    assert built.count('id="v44js"') == 1, "built html: v44js script marker missing"
    assert built.count("window.__v44={version:VERSION}") == 1, "built html: __v44 export missing"
    assert built.count("var lv=b.arena==='leg'?legDiff():null;") == 2, "built html: hoisted legDiff() present %dx, expected 2 (wordPool + grammarPool)" % built.count("var lv=b.arena==='leg'?legDiff():null;")
    assert built.count("if(b.arena==='leg'){if(lv.indexOf(w.lv)<0)return false}") == 1, "built html: hoisted wordPool filter line missing"
    assert built.count("return b.arena==='leg'?lv.indexOf(x.lv)>=0:x.lv===b.diff") == 1, "built html: hoisted grammarPool filter line missing"
    assert built.count("/* V44 (V18.9): legDiff() was called once PER WORD inside this filter") == 1, "built html: V44 wordPool comment missing"
    assert built.count("/* V44 (V18.9): same hoist as wordPool") == 1, "built html: V44 grammarPool comment missing"
    # The OLD per-item legDiff() lines are GONE
    assert built.count(OLD_WORDPOOL) == 0, "built html: old wordPool block still present"
    assert built.count(OLD_GRAMMARPOOL) == 0, "built html: old grammarPool block still present"
    assert built.count("if(b.arena==='leg'){var lv=legDiff();") == 0, "built html: old per-word legDiff() call still present"
    assert built.count("legDiff().indexOf(x.lv)") == 0, "built html: old per-grammar legDiff() call still present"
    # v19.js wordPool/grammarPool untouched (still b.diff-direct, no legDiff)
    # base 8 occurrences: def + 2 old filter calls + export x2 + 3 in
    # older comments; new build: 8 - 2 old + 3 new wordPool + 2 new
    # grammarPool + 4 in the v44.js marker = 15.
    assert built.count("legDiff") == 15, f"built html: legDiff occurrences {built.count('legDiff')}, expected 15"
    # Deliberately UNCHANGED by V44: legDiff's definition + thresholds
    # (the getter-call latent bug stays exactly as it was — see header).
    assert built.count("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}if(m<200)return ['A2','B1'];if(m<600)return ['B1'];return ['B2']}") == 1, "built html: legDiff definition/thresholds changed (out of scope for V18.9)"
    # Deliberately UNCHANGED by V44: C-R2-1 (markKO/markKO19 pay no XP).
    assert built.count("/* V39 (V18.4): KO boss answers also feed Smart Learning (V27) —") == 2, "built html: markKO/markKO19 changed (C-R2-1 is out of scope for V18.9)"
    # KO entry buttons unchanged.
    assert built.count('<button class="tab v35kotab"') == 1, "built index.html: KO v35kotab button changed"
    assert built.count('<button class="tab v33kotab"') == 1, "built index.html: KO v33kotab button changed"
    # out-of-scope replacements absent
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"built index.html: out-of-scope marker {marker!r} present"
    _node_check(v44_js)
    # ship the build script itself with the deliverable (reproducibility)
    _copy_bytes_epersafe(HERE / "build_v44.py", out / "build_v44.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V18.9, layer V44 injected last")
    print("V44: Legendary Freeze Fix — legDiff() hoisted out of wordPool/grammarPool filters; no logic/schema/reward change")
    print("marker order OK: v44js last, v44js after v43js; KO tabs unchanged; out-of-scope markers absent; legDiff def + C-R2-1 untouched")
    return 0


if __name__ == "__main__":
    sys.exit(main())
