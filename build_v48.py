#!/usr/bin/env python3
"""Build V19.3 (SENTENCE FORGE) from the pristine V19.2 build + the
V48 layer.

V19.3 = V19.2 (Duplicate Senses, layer V47) + layer V48. This IS the
planned "V19.1 Sentence Forge" feature set from Claude (2026-11-21),
renamed V19.3 because V19.2 shipped first as the round-4 fix.
Build order (Claude): Forge -> Bounty -> Family Tree -> Dojo -> boss
(Hangul Golem). EACH feature has its own feature flag (en48.flags,
on by default, kill-switchable via __v48.setFlag).

THE CHANGES:
  1. New files: src/v48.js (Forge/Bounty/Tree/Dojo/boss overlay +
     EN Hub decorator), src/v48_data.js (boss def + Bounty quest
     defs + weakness override), src/v48.css (overlay styles).
  2. src/v21.js: TOTAL_BOSSES 86 -> 87 (Hangul Golem).
  3. src/v19.js (x2): UCE boss lookup chain gains __V48_DATA.byId
     (bossUnlocked19 + fight); zone 'golem' delegates unlock to
     __v48.bossUnlocked.
  4. src/v34.js (x4): weakFor consults __V48_DATA.weakExplicit +
     'golem' zone safety net ({kind:'listen'}); scopeBlocked skips
     the 'listen' kind; breakDmg fills the meter on correct
     listen-mode answers for the 'listen' kind; weakName labels it
     'Câu hỏi nghe'.
  5. src/v20_sync.js (x2): hasProgress entries for en48; en48
     merge branch (counters MAX, claimed unions, streak newer-wins,
     flags newer-wins, created MIN — V33/V35 pattern).
  6. KO tabs button (build-time only, V33 precedent): v48kotab
     appended after v35kotab, strip ONLY the trailing ';'.
  7. Title -> V19.3 Sentence Forge; style v48 + v48data + v48js
     injected LAST before </body> (rfind, v37.css gotcha).

BOSS LEVEL (verified from src/v19_data.js, NOT from the stale
LV58_CHECK note): Lv 58 is TAKEN (v11_butterflyqueen, Lv 58,
HP 540). V11 bosses occupy lv 31-60 contiguously, V10 lv 1-30,
Chrono lv 61-68, Skyroot lv 69-76 — NO free level in 32-76.
Hangul Golem therefore takes the nearest free level, Lv 77,
HP 620 (Claude's HP, game scale).

BOSS ART: assets/bosses/v18/v18_golem.png does NOT ship in this
version (no art batch was commissioned). Every <img> renders it
with onerror hiding, so the card/fight show text instead of a
broken image. Recorded in the changelog; Anh pushes art via
GitHub Desktop when commissioned.

WHAT THIS SCRIPT DOES (in order):
  0. Backs up the pristine out/index.html + the pre-fix standalone
     src files (from tools/v48/backup-v19.2/) + the new layer files
     into tools/v48/backup-v19.2-build/.
  1. Verifies the base is the pristine V19.2 build (hash + v47
     markers present, v48 markers absent). REFUSES otherwise.
     PRE-PASS: every V48 replacement anchor is checked (src files
     AND out/index.html) BEFORE any file is mutated.
  2. Validates the V48 layer itself: every edited src file carries
     its NEW fragments and no longer carries its OLD fragments;
     the new layer files are well-formed.
  3. Copies the edited src files + the new layer files into out/.
  4. Assembles the new index.html: the V19.3 title + wholesale
     sync of each edited embedded script block with its src file
     (the old embedded block must equal the pristine standalone
     file, asserted byte-for-byte) + the KO button append + the V48
     layer injection (style v48 + v48data + v48js, LAST, before
     </body>).
  5. Verifies: marker order (v48 style/script last), v48 version
     19.3.0, node --check on v48.js/v48_data.js + every touched src
     file, old versions intact, V33-V47 fragments still present,
     V48 fragments present with exact counts, out-of-scope markers
     absent.

RUN EXACTLY ONCE on a fresh V19.2 out/. NEVER re-run build_v33.py
/ ... / build_v47.py (or any older build script) on a finished
build (they reorder layers — see the V32 skill notes).
REBUILD-FROM-SCRATCH: restore out/index.html from
tools/v48/backup-v19.2/ (the build script mutates NOTHING in src/
— it only reads the hand-edited src files and copies them into
out/), re-run this script, and compare the out/index.html sha256
— it must be byte-identical. The hand-edited src files are also
kept as src__*.new in tools/v48/backup-v19.2-build/ in case the
working tree is ever reset to pristine.

Usage:  python3 build_v48.py [--out DIR] [--src DIR]
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
import build_v41 as _b41  # V33-V40 in-scope fragments + out-of-scope markers, verbatim
import build_v45 as _b45  # V41-V45 fragment lists + index-only replacements, verbatim
import build_v46 as _b46  # V46 fragment lists (legDiff/KO-XP), verbatim
import build_v47 as _b47  # V47 fragment lists (duplicate senses), verbatim

# Pristine V19.2 out/index.html (2,457,229 B) — verified before any edit.
V192_HASH = "0aff5cebb7474535c3d7f635b289aaffe81d4f023d0bc64d798ae25fb918037f"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V19.2 — Duplicate Senses — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V19.3 — Sentence Forge — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# V48 markers: must be ABSENT from the pristine V19.2 base, present after.
V48_MARKERS = [
    'id="v48js"', 'id="v48data"', 'id="v48"', 'window.__v48={',
    "VERSION='19.3.0'", 'window.__V48_DATA={', 'v18_golem',
    'v48kotab', 'Sentence Forge',
]

# Distinctive strings that exist ONLY in work V48 does NOT do
# (copied verbatim from build_v41.py — the base must not have moved).
OUT_OF_SCOPE_MARKERS = _b41.OUT_OF_SCOPE_MARKERS

# src files edited by V48 (embedded blocks are synced wholesale).
# value = the <script id="..."> in index.html (v20_sync.js is id v20sync).
EDITED_SRC = {"v19.js": "v19js", "v20_sync.js": "v20sync",
              "v21.js": "v21js", "v34.js": "v34js"}

# --- NEW fragments (must be present in each edited src file + built html) ---
NEW_FRAGS = {
    "v19.js": [
        "||(window.__V48_DATA&&__V48_DATA.byId?__V48_DATA.byId(id):null)",
        "if(b.zone==='golem'&&window.__v48&&__v48.bossUnlocked)return __v48.bossUnlocked(id,lang);",
    ],
    "v20_sync.js": [
        "if(v7.en48&&v7.en48.forge&&(v7.en48.forge.correct||0)>0) return true;",
        "if(v7.en48&&v7.en48.dojoUnlocked) return true;",
        "else if(kk==='en48'){",
        "m48.dojoUnlocked=Math.max(l48.dojoUnlocked||0, c48.dojoUnlocked||0);",
        "v7.en48=m48;",
    ],
    "v21.js": [
        "var TOTAL_BOSSES=87; /* 10 old (V15) + 30 (V10) + 30 (V11) + 8 (V17 Chrono) + 8 (V18 Skyroot) + 1 (V19.3 Hangul Golem) */",
    ],
    "v34.js": [
        "/* V48 (V19.3): Hangul Golem weakness — listen-mode questions. */",
        "if(d48&&d48.weakExplicit&&d48.weakExplicit[id])return d48.weakExplicit[id];",
        "if(b.zone==='golem')return {kind:'listen'};",
        "if(!F||!F.weak||F.weak.kind==='ko'||F.weak.kind==='listen')return false;",
        "if(F.weak.kind==='listen'){",
        "if(F.qmode!=='listen'&&F.qmode!=='ca-listen')return 0;",
        "if(weak.kind==='listen')return 'Câu hỏi nghe';",
    ],
}
# --- OLD fragments (must be GONE from each edited src file + built html) ---
OLD_FRAGS = {
    "v19.js": [
        "  var b=D19().byId(id)||(window.__V33_DATA&&__V33_DATA.byId?__V33_DATA.byId(id):null)||(window.__V35_DATA&&__V35_DATA.byId?__V35_DATA.byId(id):null);if(!b)return false;",
        "  var b=D19().byId(id)||(window.__V33_DATA&&__V33_DATA.byId?__V33_DATA.byId(id):null)||(window.__V35_DATA&&__V35_DATA.byId?__V35_DATA.byId(id):null);if(!b)return;",
    ],
    "v21.js": [
        "var TOTAL_BOSSES=86; /* 10 old (V15) + 30 (V10) + 30 (V11) + 8 (V17 Chrono) + 8 (V18 Skyroot) */",
    ],
    "v34.js": [
        "    if(!F||!F.weak||F.weak.kind==='ko')return false;",
    ],
}

# --- KO tabs button (appended after the v35kotab button) ---
KO_TAIL_OLD = "+'<button class=\"tab v35kotab\" onclick=\"window.__v35&&__v35.openSkyroot(\\'ko\\')\" title=\"Skyroot Sanctuary — Thánh Địa Thiên Căn\"><span class=\"ti\">🌿</span><span>Skyroot</span></button>';"
KO_BTN = "+'<button class=\"tab v48kotab\" onclick=\"window.__v48&&__v48.openForge(\\'ko\\')\" title=\"Sentence Forge — Lò Rèn Câu\"><span class=\"ti\">🔨</span><span>Lò Rèn Câu</span></button>'"
# Strip ONLY the trailing ';' — the closing quote of the v35 string MUST stay,
# otherwise the v35 string swallows the '+' and the v48 string's opening quote
# and the whole tabs line becomes a JS syntax error (V16 lesson, [:-2] bug).
KO_TAIL_NEW = KO_TAIL_OLD[:-1] + KO_BTN + ";"


# --- helpers (EPERM-safe pattern from build_v41.py / build_v47.py) ---
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
    tmp = pathlib.Path(dst).with_name(pathlib.Path(dst).name + ".tmp48")
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
    pristine = ROOT / "tools" / "v48" / "backup-v19.2"
    v48_js = src_dir / "v48.js"
    v48_data = src_dir / "v48_data.js"
    v48_css = src_dir / "v48.css"
    assert v48_js.exists(), "src/v48.js missing"
    assert v48_data.exists(), "src/v48_data.js missing"
    assert v48_css.exists(), "src/v48.css missing"
    assert pristine.is_dir(), "tools/v48/backup-v19.2 missing — the hash-verified V19.2 backup source"

    # --- 0. Back up the pristine out/index.html + the pre-fix standalone
    # src files (from the pristine copy) + the new layer files into
    # tools/v48/backup-v19.2-build/. ---
    backup = ROOT / "tools" / "v48" / "backup-v19.2-build"
    backup.mkdir(parents=True, exist_ok=True)
    live = out / "index.html"
    src_copy = pristine / "index.html"
    assert live.exists(), "out/index.html missing"
    assert src_copy.exists(), "tools/v48/backup-v19.2/index.html missing"
    assert _sha256(live) == _sha256(src_copy), (
        "out/index.html differs from the pristine copy — refusing to build on a moved tree")
    _copy_bytes_epersafe(src_copy, backup / "out__index.html")
    for name in EDITED_SRC:
        _copy_bytes_epersafe(pristine / ("src__" + name + ".old"), backup / ("src__" + name + ".old"))
    for layer in (v48_js, v48_data, v48_css):
        _copy_bytes_epersafe(layer, backup / ("src__" + layer.name))
    print(f"backup OK: out/index.html + {len(EDITED_SRC)} pre-fix src files + 3 new layer files recorded in {backup}")

    # --- 1. Verify the base is pristine V19.2 ---
    index = out / "index.html"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V192_HASH, f"base is not pristine V19.2: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v47js"' in built and 'id="v46js"' in built, "V47/V46 markers missing — not a V19.2 build"
    for m in V48_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V19.2 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    assert _b46.LEGDIFF_NEW in built and built.count(_b46.LEGDIFF_NEW) == 1, "pre-fix NEW legDiff() (V46) not found exactly once in base"
    assert built.count('id="v47js"') == 1 and built.count("VERSION='19.2.0'") == 1, "V47 markers missing/duplicated in base"
    assert built.count(KO_TAIL_OLD) == 1, "index.html: Korean tabs v35kotab tail not found exactly once"
    assert "v48kotab" not in built, "v48kotab already in base"
    # Each edited embedded script block must equal its pristine standalone file.
    for name, vid in EDITED_SRC.items():
        old_src = (pristine / ("src__" + name + ".old")).read_text(encoding="utf-8")
        pat = '<script id="%s">\n%s\n</script>' % (vid, old_src)
        assert built.count(pat) == 1, f"embedded {vid} block does not match pristine {name} exactly once"
    print(f"verified pristine V19.2 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v47 markers present, v48 absent")

    # --- 1b. PRE-PASS: V48 anchors (src + index.html) ---
    for name, frags in NEW_FRAGS.items():
        t = (src_dir / name).read_text(encoding="utf-8")
        for frag in frags:
            assert frag in t, f"PRE-PASS src/{name} missing NEW fragment: {frag[:70]}"
    for name, frags in OLD_FRAGS.items():
        t = (src_dir / name).read_text(encoding="utf-8")
        for frag in frags:
            assert frag not in t, f"PRE-PASS src/{name} still has OLD fragment: {frag[:70]}"
    # The pristine standalone files must NOT carry the new fragments.
    for name, frags in NEW_FRAGS.items():
        old_t = (pristine / ("src__" + name + ".old")).read_text(encoding="utf-8")
        for frag in frags:
            assert frag not in old_t, f"PRE-PASS pristine {name} already has NEW fragment (base moved?): {frag[:70]}"
    print("pre-pass OK: V48 src fragments + KO tail anchor")

    # --- 2. Validate the V48 layer itself ---
    v48_js_t = v48_js.read_text(encoding="utf-8")
    assert "</script>" not in v48_js_t.lower(), "v48.js contains </script>"
    assert "VERSION='19.3.0'" in v48_js_t and "window.__v48={" in v48_js_t, "v48.js must expose __v48 19.3.0"
    assert not _re.search(r"window\.S(?![A-Za-z])", _re.sub(r"/\*.*?\*/", "", v48_js_t, flags=_re.S)), "v48.js must never use window.S (lexical let)"
    assert "localStorage" not in _re.sub(r"/\*.*?\*/", "", v48_js_t, flags=_re.S), "v48.js must not touch localStorage"
    assert "v48kotab" not in v48_js_t, "v48.js must not add a KO tab button (build-time only)"
    for fn in ("function en48(){", "function forgePool(lang){", "function forgeCheck(){",
               "function claimBounty(qid,period){", "function treeRelations(wordId,lang){",
               "function gradeTranscript(target,heard,lang){", "function bossUnlocked48(id,lang){",
               "function openForge(lang,tab){"):
        assert fn in v48_js_t, f"v48.js missing {fn}"
    v48_data_t = v48_data.read_text(encoding="utf-8")
    assert "window.__V48_DATA={" in v48_data_t, "v48_data.js must expose __V48_DATA"
    assert "lv:77" in v48_data_t and "hp:620" in v48_data_t, "v48_data.js: golem must be Lv 77 / HP 620"
    assert "lv:58" not in v48_data_t, "v48_data.js must not use the taken Lv 58"
    assert "weakExplicit" in v48_data_t and "{kind:'listen'}" in v48_data_t, "v48_data.js: golem weakness must be listen-kind"
    assert "bountyDaily" in v48_data_t and "bountyWeekly" in v48_data_t, "v48_data.js must define Bounty quests"
    v48_css_t = v48_css.read_text(encoding="utf-8")
    assert "</style>" not in v48_css_t.lower(), "v48.css contains </style>"
    assert "min-height:44px" in v48_css_t or "min-height:var(--ui-btn-min-height,44px)" in v48_css_t, "v48.css must carry 44px touch targets"
    assert "</body>" not in v48_css_t, "v48.css contains </body> (v37 trap)"
    print(f"validated src/v48.js ({len(v48_js_t)} chars) + v48_data.js + v48.css ({len(v48_css_t)} chars)")

    # --- 3. Copy the edited src files + the new layer files into out/ ---
    for name in EDITED_SRC:
        _copy_bytes_epersafe(src_dir / name, out / name)
    _copy_bytes_epersafe(v48_js, out / "v48.js")
    _copy_bytes_epersafe(v48_data, out / "v48_data.js")
    _copy_bytes_epersafe(v48_css, out / "v48.css")

    # --- 4. Assemble the new index.html ---
    edits = []
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V19.2 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # wholesale sync of each edited embedded script block with its src file
    for name, vid in EDITED_SRC.items():
        old_src = (pristine / ("src__" + name + ".old")).read_bytes()
        new_src = (src_dir / name).read_bytes()
        old_block = b'<script id="' + vid.encode() + b'">\n' + old_src + b'\n</script>'
        new_block = b'<script id="' + vid.encode() + b'">\n' + new_src + b'\n</script>'
        o0 = orig_bytes.find(old_block)
        assert o0 != -1 and orig_bytes.count(old_block) == 1, f"index.html: embedded {vid} block not found exactly once"
        edits.append({"start": o0, "end": o0 + len(old_block),
                      "chunks": [("glue", new_block)]})
    # KO tabs button (after v35kotab; strip ONLY the trailing ';')
    k_old = KO_TAIL_OLD.encode("utf-8")
    k0 = orig_bytes.find(k_old)
    assert k0 != -1 and orig_bytes.count(k_old) == 1, "index.html: Korean tabs v35kotab tail not found exactly once"
    edits.append({"start": k0, "end": k0 + len(k_old),
                  "chunks": [("glue", KO_TAIL_NEW.encode("utf-8"))]})
    # V48 layer, LAST, before </body> (style + data + script together, V45 pattern).
    # rfind, NOT find: see the v37.css "</body>" comment trap (build_v41.py).
    body = orig_bytes.rfind(b"</body>")
    assert body != -1, "no </body> in index.html"
    assert body > orig_bytes.rfind(b'id="v47js"'), "injection point is before v47js - wrong </body>"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v48">\n'),
        ("file", v48_css),
        ("glue", b'\n</style>\n<script id="v48data">\n'),
        ("file", v48_data),
        ("glue", b'\n</script>\n<script id="v48js">\n'),
        ("file", v48_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 5. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V19.3 title missing / V19.2 title remains"
    assert "window.__v48={" in built and "VERSION='19.3.0'" in built, "built index.html missing __v48 19.3.0"
    assert "window.__V48_DATA={" in built, "built index.html missing __V48_DATA"
    # v48 markers are the LAST style/script markers before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v48", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v48", f"script marker order wrong: {script_ids}"
    assert built.find('id="v48js"') > built.find('id="v47js"'), "v48js is not after v47js"
    assert built.find('id="v48"') > built.find('id="v45"'), "v48 style is not after v45"
    assert built.find('id="v48data"') < built.find('id="v48js"'), "v48data must come before v48js"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0", "17.0.0", "17.1.0", "18.0.0", "18.1.0", "18.2.0", "18.3.0", "18.4.0", "18.5.0", "18.6.0", "18.7.0", "18.8.0", "18.9.0", "19.0.0", "19.0.1", "19.2.0"):
        assert ver in built, f"built html lost version {ver}"
    # V33–V40 fragments still present (verbatim lists from build_v41.py)
    for frag in _b41.V33_FRAGMENTS:
        assert frag in built, f"built html lost V33 fragment: {frag[:60]}"
    for frag in _b41.V34_FRAGMENTS:
        assert frag in built, f"built html lost V34 fragment: {frag[:60]}"
    for frag in _b41.V35_FRAGMENTS:
        # V48 deliberately supersedes this one fragment: TOTAL_BOSSES
        # 86 -> 87 (Hangul Golem). Asserted separately below.
        if frag == "var TOTAL_BOSSES=86;":
            continue
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
    # V41 key fragments still present (exact counts, from build_v45.py §5)
    assert built.count("indexOf('ca-')===0") == 4, "built html: CA gate count changed"
    assert built.count("Math.min(3,F.caRight)") == 1, "built html: R-V41-V19-CA-CLAMP missing"
    assert built.count("if(!j.opt)j.opt={mode:'card',dir:'kv',group:'',due:false}") == 1, "built html: R-V41-INDEX-OPT missing"
    assert built.count("var old=$('#v15farmquiz');if(old)old.remove();") == 1, "built html: R-V41-V15-FARMQUIZ missing"
    assert built.count("try{ flush(); }catch(e){}") == 2, "built html: R-V41-V20-FLUSH count changed"
    assert built.count("try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}") == 6, "built html: R-V41-V15-FLUSH count changed"
    assert built.count('flex:0 0 auto;min-width:64px') == 1, "built html: R-V41-V41-NAV min-width rule missing"
    assert built.count('"src": "oxford"') == 3395, "built html: Oxford raw rows != 3395"
    # V42/V43/V44 key fragments still present (exact counts, from build_v45.py §5)
    assert built.count("chronoGateHTML") == 6, "built html: chronoGateHTML count changed"
    assert built.count("skyrootGateHTML") == 6, "built html: skyrootGateHTML count changed"
    assert built.count(".v42btn{min-height:44px") == 1, "built html: v42.css rule missing"
    assert built.count("window.__v42={") == 1, "built html: __v42 export missing"
    assert built.count('id="v43"') == 1, "built html: v43 style marker missing"
    assert built.count('id="v43js"') == 1, "built html: v43js script marker missing"
    assert built.count("window.__v43={version:VERSION}") == 1, "built html: __v43 export missing"
    assert built.count(".v19fight .v19qword{color:#fff}") == 1, "built html: V43 V19 qword rule missing"
    assert built.count('id="v44js"') == 1, "built html: v44js script marker missing"
    assert built.count("window.__v44={version:VERSION}") == 1, "built html: __v44 export missing"
    assert built.count("var lv=b.arena==='leg'?legDiff():null;") == 2, "built html: hoisted legDiff() call sites changed"
    assert built.count("if(b.arena==='leg'){if(lv.indexOf(w.lv)<0)return false}") == 1, "built html: hoisted wordPool filter line missing"
    assert built.count("return b.arena==='leg'?lv.indexOf(x.lv)>=0:x.lv===b.diff") == 1, "built html: hoisted grammarPool filter line missing"
    # V45 fragments still present (exact counts, from build_v45.py §5)
    assert built.count('id="v45"') == 1, "built html: v45 style marker missing"
    assert built.count('id="v45js"') == 1, "built html: v45js script marker missing"
    assert built.count("window.__v45={version:VERSION}") == 1, "built html: __v45 export missing"
    assert built.count("VERSION='19.0.0'") == 1, "built html: __v45 19.0.0 version missing"
    for name, frags in _b45.NEW_DUE.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW due fragment missing ({name}): {frag[:70]}"
    for name, frags in _b45.OLD_DUE.items():
        for frag in frags:
            assert frag not in built, f"built html: OLD due line still present ({name}): {frag[:70]}"
    for frag in _b45.NEW_V31:
        assert frag in built, f"built html: NEW v31 fragment missing: {frag[:70]}"
    for frag in _b45.OLD_V31:
        assert frag not in built, f"built html: OLD v31 fragment still present: {frag[:70]}"
    for frag in _b45.NEW_V23:
        assert frag in built, f"built html: NEW v23 fragment missing: {frag[:70]}"
    assert built.count(_b45.LOAD_OLD) == 0, "built html: old load() still present"
    assert built.count("hanvocab.v12.corrupt-") == 2, "built html: quarantine key pattern count changed"
    assert built.count("window.__V45_CORRUPT") == 5, "built html: __V45_CORRUPT count changed"
    assert built.count(_b45.ENICON_OLD) == 0, "built html: old enIcon() still present"
    assert built.count("if(!name)return '';") == 1, "built html: enIcon() falsy guard missing"
    # V46 fragments still present (exact counts, from build_v46.py §5)
    assert built.count('id="v46data"') == 1, "built html: v46data script marker missing"
    assert built.count('id="v46js"') == 1, "built html: v46js script marker missing"
    assert built.count("window.__v46={") == 1, "built html: __v46 export missing"
    assert built.count("VERSION='19.0.1'") == 1, "built html: __v46 19.0.1 version missing"
    assert built.count("window.__V46_DATA={") == 1, "built html: __V46_DATA export missing"
    for bid in _b46.WEAK46_IDS:
        assert built.count("'%s'" % bid) >= 1, f"built html: weakness override boss id {bid} missing"
    for name, frags in _b46.NEW_FRAGS.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW V46 fragment missing ({name}): {frag[:70]}"
    for name, frags in _b46.OLD_FRAGS.items():
        for frag in frags:
            assert frag not in built, f"built html: OLD V46 fragment still present ({name}): {frag[:70]}"
    for name, frags in _b46.FALLBACK_FRAGS.items():
        for frag in frags:
            assert built.count(frag) == 1, f"built html: EN fallback block count != 1 ({name}): {frag[:70]}"
    assert built.count(_b46.LEGDIFF_OLD) == 0, "built html: OLD legDiff() definition still present"
    assert built.count(_b46.LEGDIFF_NEW) == 1, "built html: NEW legDiff() definition missing / duplicated"
    assert built.count(_b46.LEGDIFF_THRESHOLDS) == 1, "built html: legDiff thresholds changed"
    assert built.count("V15().counts().mastered") == 1, f"built html: V15().counts().mastered count {built.count('V15().counts().mastered')}, expected 1 (V44 comment only)"
    assert built.count("koStreak") >= 6, f"built html: koStreak count {built.count('koStreak')}, expected >= 6"
    assert built.count("awardBossAnswerXP") >= 7, f"built html: awardBossAnswerXP count {built.count('awardBossAnswerXP')}, expected >= 7"
    # V47 fragments still present (exact counts, from build_v47.py §6)
    assert built.count('id="v47js"') == 1, "built html: v47js script marker missing"
    assert built.count("window.__v47={") == 1, "built html: __v47 export missing"
    assert built.count("VERSION='19.2.0'") == 1, "built html: __v47 19.2.0 version missing"
    assert built.count("function labelOf(w){") == 1, "built html: labelOf definition missing / duplicated"
    assert built.count("window.labelOf=labelOf;") == 1, "built html: labelOf global exposure missing"
    assert built.count("function splitDuplicateSenses(WORDS,BYID){") == 1, "built html: splitDuplicateSenses definition missing / duplicated"
    assert built.count("__v47.splitDuplicateSenses(WORDS,BYID)") == 1, "built html: buildWords hook call missing / duplicated"
    assert built.count(_b47.GUARD) == 9, f"built html: headword guard present {built.count(_b47.GUARD)}x, expected 9"
    assert built.count("labelOf(w)") == 7, f"built html: labelOf(w) occurrences {built.count('labelOf(w)')}, expected 7"
    assert built.count("labelOf(w2)") == 3, f"built html: labelOf(w2) call sites {built.count('labelOf(w2)')}, expected 3"
    assert built.count("var seen={},ded=[];") == 1, "built html: pickPool dedupe missing / duplicated"
    for name, frags in _b47.NEW_FRAGS.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW V47 fragment missing ({name}): {frag[:70]}"
    for name, frags in _b47.OLD_FRAGS.items():
        for frag in frags:
            assert frag not in built, f"built html: OLD V47 fragment still present ({name}): {frag[:70]}"
    assert built.count('"no": 938') == 0, "built html: dropped devoted row (no 938) still present"
    assert built.count('"no": 351') == 1, "built html: kept devoted row (no 351) missing / duplicated"
    assert built.count('"src": "a1a2"') == 998, "built html: A1-A2 raw rows != 998"
    assert built.count('"src": "oxford"') == 3395, "built html: Oxford raw rows != 3395"
    for no in (680, 806, 912):
        assert built.count('"no": %d}' % no) == 1, f"built html: kept twin row no {no} missing / duplicated"
    # V48 fragments present (exact counts)
    assert built.count('id="v48"') == 1, "built html: v48 style marker missing"
    assert built.count('id="v48data"') == 1, "built html: v48data script marker missing"
    assert built.count('id="v48js"') == 1, "built html: v48js script marker missing"
    assert built.count("window.__v48={") == 1, "built html: __v48 export missing"
    assert built.count("VERSION='19.3.0'") == 1, "built html: __v48 19.3.0 version missing"
    assert built.count("window.__V48_DATA={") == 1, "built html: __V48_DATA export missing"
    assert built.count("v48kotab") == 1, "built html: v48kotab KO button missing / duplicated"
    assert built.count("v35kotab") == 1, "built html: v35kotab KO button count changed"
    assert built.count("var TOTAL_BOSSES=87;") == 1, "built html: TOTAL_BOSSES=87 missing"
    assert built.count("var TOTAL_BOSSES=86;") == 0, "built html: TOTAL_BOSSES=86 still present"
    assert built.count("'v18_golem'") >= 3, f"built html: v18_golem mentions {built.count(chr(39)+'v18_golem'+chr(39))}, expected >= 3"
    assert built.count("lv:77") == 1, "built html: golem Lv 77 missing / duplicated"
    assert built.count("hp:620") >= 1, "built html: golem HP 620 missing"
    for name, frags in NEW_FRAGS.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW V48 fragment missing ({name}): {frag[:70]}"
    for name, frags in OLD_FRAGS.items():
        for frag in frags:
            assert frag not in built, f"built html: OLD V48 fragment still present ({name}): {frag[:70]}"
    # Embedded blocks are byte-identical to their src files (sync guarantee).
    for name, vid in EDITED_SRC.items():
        src_t = (src_dir / name).read_text(encoding="utf-8")
        pat = '<script id="%s">\n%s\n</script>' % (vid, src_t)
        assert built.count(pat) == 1, f"built html: embedded {vid} block does not match src/{name}"
        out_t = (out / name).read_text(encoding="utf-8")
        assert out_t == src_t, f"out/{name} differs from src/{name}"
    for layer in ("v48.js", "v48_data.js", "v48.css"):
        out_t = (out / layer).read_text(encoding="utf-8")
        assert out_t == (src_dir / layer).read_text(encoding="utf-8"), f"out/{layer} differs from src/{layer}"
    # out-of-scope replacements absent
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"built index.html: out-of-scope marker {marker!r} present"
    _node_check(v48_js)
    _node_check(v48_data)
    for name in EDITED_SRC:
        _node_check(src_dir / name)
    # ship the build script itself with the deliverable (reproducibility)
    _copy_bytes_epersafe(HERE / "build_v48.py", out / "build_v48.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V19.3, layer V48 injected last")
    print("V48: Sentence Forge + Bounty Board + Word Family Tree + Pronunciation Dojo + Hangul Golem (Lv 77, HP 620); TOTAL_BOSSES 86 -> 87; KO button v48kotab after v35kotab")
    print("marker order OK: v48 style/script last, v48data before v48js; out-of-scope markers absent; embedded blocks == src files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
