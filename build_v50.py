#!/usr/bin/env python3
"""Build V19.5 (ROUND-5 BUG FIXES) from the pristine V19.4 build + the V50 layer.

V19.5 = V19.4 (Boss Mic Fix, layer V49) + layer V50. Round-5 review
(2026-11-22 evening, Anh: "rà lỗi") found 4 confirmed bugs; all 4
are fixed here, repro-first (tools/v50/repro-v50.js, 28/28 on the
pristine V19.4 base; Chrome repro via verify-v50c.js on the pristine
backup dir).

  F-1 (High, review-A §F-1): a stale speech result can answer a
  later question after a fight() restart. fight()/startFight()
  never called stopSpeak() and the new F reset speakToken to 0, so
  the orphaned SpeechRecognition kept the mic open and its token
  (1) collided with the new fight's first token (1). Reproduced
  live in Chrome in both engines and via the hub-navigation path
  (review-a-v49-probe2 F5.1-F5.5, probe3 G4.1-G4.3).
  C-R5-2 (Minor, review-C §C-R5-2): Smart Learning weak list shows
  "Đến hạn 20779 ngày" for learned words with no due date — prioOf
  computed days since the epoch when due was 0.
  C-R5-3 (Minor, review-C §C-R5-3): Sentence Forge "Điểm" is
  advertised in the intro ("Điểm = số từ × hệ số độ khó") and in
  per-answer feedback ("+21 điểm") but is never stored, totaled,
  or shown on the session-end screen.
  C-R5-4 (Minor, review-C §C-R5-4): KO Hub at 360px — 11 buttons
  under the 44px touch target (header 34px, "Người chơi" 40px,
  HUD/farm row buttons 42px).

DELIBERATELY NOT FIXED HERE (pending director decisions, recorded
in tools/v50/PUSH_MANIFESTS.md + the changelog):
  - C-R5-1 (MAJOR): boss grammar/sentence correct answers pay 0 XP
    (no .w, so mark18/mark19 never run) — needs a decision on
    whether they should pay the shared +10/streak rule.
  - OBS-1 (Low, pre-existing): after resolveUltimate() the stale CA
    question #3 is re-asked untimed — recorded as a lead.
  - All other pending items (C-03, C-08, F-12, farm harvest +35 vs
    +25, bubble/shop icons, "Từ vựng của tôi", F4 remainder,
    F-05/F-07 observers, .v20modal, C-09).

THE CHANGES:
  1. New files: src/v50.js (window.__v50 version marker only) +
     src/v50.css (C-R5-4: min-height:44px for .v7btn, #sk/#sn,
     #v21avatarbtn, and .tabs .tab at <=640px).
  2. src/v18.js + src/v19.js (F-1, same structure in both engines):
     - module-level _speakSeq50 counter (starts 0) next to `var F`;
     - startFight() calls stopSpeak() FIRST, before the new F object
       is created (aborts the old rec, bumps the token sequence);
     - the new F literal starts from speakToken:_speakSeq50 instead
       of speakToken:0;
     - stopSpeak() syncs _speakSeq50 to the bumped token, so the
       sequence only ever grows — a new fight can never reuse an
       orphaned rec's token value. next()/close() unchanged (they
       already call stopSpeak()); bossSpeak() unchanged (its
       token=(F.speakToken||0)+1 now starts above every orphan).
     No rewards/XP/SRS/pets/save-schema change; no new save key.
  3. src/v27.js (C-R5-2): prioOf() treats a missing due date as
     overdue 0 (was: days since epoch); classifyEN()/classifyKO()
     render "Đến hạn hôm nay" for due-less learned words. No due
     dates invented; en15().due is NOT backfilled.
  4. src/v48.js (C-R5-3): FS gains score:0; forgeCheck() accumulates
     the per-answer score into FS.score; forgeNext() persists
     scoreTotal + bestScore into S.v7.en48.forge (same subkey, two
     new fields with ||0 defaults — no migration, no new save key)
     at session end and returns score; the end screen shows
     "Điểm buổi" + "Điểm cao nhất" and the intro shows the best.
     No XP/SRS change.
  5. Title -> V19.5 Round5 Bug Fixes; style v50 + script v50js
     injected LAST before </body> (rfind, v37.css gotcha).
  6. NO other behaviour change; v15 speak mode and the v48 Dojo
     untouched except regression checks.

WHAT THIS SCRIPT DOES (in order):
  0. Backs up the pristine out/index.html + the pre-fix standalone
     src files (from tools/v50/backup-v19.4/out/) + the new layer
     files into tools/v50/backup-v19.4-build/.
  1. Verifies the base is the pristine V19.4 build (hash + v49
     markers present, v50 markers absent). REFUSES otherwise.
     PRE-PASS: every V50 replacement anchor is checked (src files
     AND out/index.html) BEFORE any file is mutated; OLD fragments
     must be present in the pristine files and absent in the new
     src files.
  2. Validates the V50 layer itself: the edited src files carry
     their NEW fragments and no longer carry their OLD fragments;
     the new layer files are well-formed.
  3. Copies the edited src files + the new layer files into out/.
  4. Assembles the new index.html: the V19.5 title + wholesale
     sync of each edited embedded script block with its src file
     (the old embedded block must equal the pristine standalone
     file, asserted byte-for-byte) + the V50 layer injection
     (style v50 + script v50js, LAST, before </body>).
  5. Verifies: marker order (v50 style/script last), v50 version
     19.5.0, node --check on v50.js + every touched src file, old
     versions intact, V33–V49 fragments still present, V50
     fragments present with exact counts, out-of-scope markers
     absent.

RUN EXACTLY ONCE on a fresh V19.4 out/. NEVER re-run build_v33.py
/ ... / build_v49.py (or any older build script) on a finished
build (they reorder layers — see the V32 skill notes).
REBUILD-FROM-SCRATCH: restore out/index.html from
tools/v50/backup-v19.4/out/ (the build script mutates NOTHING in
src/ — it only reads the hand-edited src files and copies them into
out/), re-run this script, and compare the out/index.html sha256
— it must be byte-identical. The hand-edited src files are also
kept as src__*.new in tools/v50/backup-v19.4-build/ in case the
working tree is ever reset to pristine.

Usage:  python3 build_v50.py [--out DIR] [--src DIR]
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
import build_v48 as _b48  # V48 fragment lists (Sentence Forge), verbatim
import build_v49 as _b49  # V49 fragment lists (boss mic fix), verbatim

# Pristine V19.4 out/index.html (2,522,575 B) — verified before any edit.
V194_HASH = "0b9139ef154096254edd4748cb8a76abc050cb6d1c00c9e0afb17705906a2d65"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V19.4 — Boss Mic Fix — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V19.5 — Round5 Bug Fixes — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# V50 markers: must be ABSENT from the pristine V19.4 base, present after.
V50_MARKERS = [
    'id="v50js"', 'id="v50"', "VERSION='19.5.0'", 'window.__v50={',
    '_speakSeq50', 'scoreTotal',
]

# Distinctive strings that exist ONLY in work V50 does NOT do
# (copied verbatim from build_v41.py — the base must not have moved).
OUT_OF_SCOPE_MARKERS = _b41.OUT_OF_SCOPE_MARKERS

# src files edited by V50 (embedded blocks are synced wholesale).
EDITED_SRC = {"v18.js": "v18js", "v19.js": "v19js", "v27.js": "v27js", "v48.js": "v48js"}

# --- NEW fragments (must be present in each edited src file + built html) ---
# F-1: identical in both engines except the startFight() call line.
_NEW_COMMON = [
    "var _speakSeq50=0;",
    "speakToken:_speakSeq50,speakErr:null,",
    "_speakSeq50=F.speakToken;",
]
NEW_FRAGS = {
    "v18.js": list(_NEW_COMMON) + [
        "  stopSpeak();\n  var hearts=b.arena==='leg'?5:(b.arena==='el'?4:3);",
    ],
    "v19.js": list(_NEW_COMMON) + [
        "  stopSpeak();\n  F={boss:b,lang:lang,hp:b.hp,maxHp:b.hp,hearts:5,maxHearts:5,",
    ],
    # C-R5-2: due-less learned words read "Đến hạn hôm nay".
    "v27.js": [
        "var overdue=(box>0&&due)?Math.max(0,(now-due)/864e5):0;",
        "var od=due?Math.floor(Math.max(0,(now-due)/864e5)):0;",
    ],
    # C-R5-3: Forge score tracked (session + persisted best/total).
    "v48.js": [
        "scoreTotal:0,bestScore:0",
        "score:0,checked:false,ok:null,sessionId:",
        "sc=scoreSentence(cur.tokens.length,cur.tier);FS.score=(FS.score||0)+sc;",
        "e.forge.scoreTotal=(e.forge.scoreTotal||0)+(FS.score||0);",
        "if((e.forge.bestScore||0)<(FS.score||0))e.forge.bestScore=FS.score;",
        "return {done:true,right:FS.right,total:FS.list.length,bonus:bonus,score:FS.score||0};",
        "Điểm buổi: '+(FS.score||0)+' điểm",
        "Điểm cao nhất: '+(en48().forge.bestScore||0)+' điểm",
        "Điểm cao nhất: '+(e0.forge.bestScore||0)+' điểm",
    ],
}
# --- OLD fragments (must be present in the PRISTINE files, GONE after) ---
OLD_FRAGS = {
    "v18.js": [
        "speakToken:0,speakErr:null,",
    ],
    "v19.js": [
        "speakToken:0,speakErr:null,",
    ],
    "v27.js": [
        "var overdue=box>0?Math.max(0,(now-(due||0))/864e5):0;",
        "var od=Math.floor(Math.max(0,(now-due)/864e5));",
    ],
    "v48.js": [
        "bonusClaimed:{}}",
        "right:0,streak:0,checked:false,ok:null,sessionId:",
        "score:ok?scoreSentence(cur.tokens.length,cur.tier):0",
        "return {done:true,right:FS.right,total:FS.list.length,bonus:bonus};",
        "Đúng '+FS.right+'/'+FS.list.length+' câu'+(FS.bonusPaid?",
        "Đúng tổng: '+e0.forge.correct+' · Chuỗi ngày rèn:",
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
    tmp = pathlib.Path(dst).with_name(pathlib.Path(dst).name + ".tmp49")
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
    pristine = ROOT / "tools" / "v50" / "backup-v19.4" / "out"
    v50_js = src_dir / "v50.js"
    v50_css = src_dir / "v50.css"
    assert v50_js.exists(), "src/v50.js missing"
    assert v50_css.exists(), "src/v50.css missing"
    assert pristine.is_dir(), "tools/v50/backup-v19.4/out missing — the hash-verified V19.4 backup source"

    # --- 0. Back up the pristine out/index.html + the pre-fix standalone
    # src files (from the pristine copy) + the new layer files into
    # tools/v50/backup-v19.4-build/. ---
    backup = ROOT / "tools" / "v50" / "backup-v19.4-build"
    backup.mkdir(parents=True, exist_ok=True)
    live = out / "index.html"
    src_copy = pristine / "index.html"
    assert live.exists(), "out/index.html missing"
    assert src_copy.exists(), "tools/v50/backup-v19.4/out/index.html missing"
    assert _sha256(live) == _sha256(src_copy), (
        "out/index.html differs from the pristine copy — refusing to build on a moved tree")
    _copy_bytes_epersafe(src_copy, backup / "out__index.html")
    for name in EDITED_SRC:
        _copy_bytes_epersafe(pristine / name, backup / ("src__" + name + ".old"))
    for layer in (v50_js, v50_css):
        _copy_bytes_epersafe(layer, backup / ("src__" + layer.name))
    print(f"backup OK: out/index.html + {len(EDITED_SRC)} pre-fix src files + 2 new layer files recorded in {backup}")

    # --- 1. Verify the base is pristine V19.4 ---
    index = out / "index.html"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V194_HASH, f"base is not pristine V19.4: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v49js"' in built and 'id="v48js"' in built, "V49/V48 markers missing — not a V19.4 build"
    for m in V50_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V19.4 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    assert _b46.LEGDIFF_NEW in built and built.count(_b46.LEGDIFF_NEW) == 1, "pre-fix NEW legDiff() (V46) not found exactly once in base"
    assert built.count('id="v49js"') == 1 and built.count("VERSION='19.4.0'") == 1, "V49 markers missing/duplicated in base"
    # Each edited embedded script block must equal its pristine standalone file.
    for name, vid in EDITED_SRC.items():
        old_src = (pristine / name).read_text(encoding="utf-8")
        pat = '<script id="%s">\n%s\n</script>' % (vid, old_src)
        assert built.count(pat) == 1, f"embedded {vid} block does not match pristine {name} exactly once"
    print(f"verified pristine V19.4 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v49 markers present, v50 absent")

    # --- 1b. PRE-PASS: V50 anchors (src + index.html) ---
    for name, frags in NEW_FRAGS.items():
        t = (src_dir / name).read_text(encoding="utf-8")
        for frag in frags:
            assert frag in t, f"PRE-PASS src/{name} missing NEW fragment: {frag[:70]}"
    for name, frags in OLD_FRAGS.items():
        t = (src_dir / name).read_text(encoding="utf-8")
        for frag in frags:
            assert frag not in t, f"PRE-PASS src/{name} still has OLD fragment: {frag[:70]}"
    # The OLD fragments must be present in the pristine files (proves the
    # anchor existed and the OLD fragment is not a typo).
    for name, frags in OLD_FRAGS.items():
        old_t = (pristine / name).read_text(encoding="utf-8")
        for frag in frags:
            assert frag in old_t, f"PRE-PASS pristine {name} missing OLD fragment (base moved?): {frag[:70]}"
    # The NEW fragments must NOT be in the pristine files.
    for name, frags in NEW_FRAGS.items():
        old_t = (pristine / name).read_text(encoding="utf-8")
        for frag in frags:
            assert frag not in old_t, f"PRE-PASS pristine {name} already has NEW fragment (base moved?): {frag[:70]}"
    print("pre-pass OK: V50 src fragments (new present, old gone, old present in pristine)")

    # --- 2. Validate the V50 layer itself ---
    v50_js_t = v50_js.read_text(encoding="utf-8")
    assert "</script>" not in v50_js_t.lower(), "v50.js contains </script>"
    assert "VERSION='19.5.0'" in v50_js_t and "window.__v50={" in v50_js_t, "v50.js must expose __v50 19.5.0"
    assert not _re.search(r"window\.S(?![A-Za-z])", _re.sub(r"/\*.*?\*/", "", v50_js_t, flags=_re.S)), "v50.js must never use window.S (lexical let)"
    assert "localStorage" not in _re.sub(r"/\*.*?\*/", "", v50_js_t, flags=_re.S), "v50.js must not touch localStorage"
    v50_css_t = v50_css.read_text(encoding="utf-8")
    assert "</style>" not in v50_css_t.lower(), "v50.css contains </style>"
    assert "</body>" not in v50_css_t, "v50.css contains </body> (v37 trap)"
    assert ".v7btn{min-height:44px}" in v50_css_t, "v50.css must carry the .v7btn 44px rule"
    assert ":root #sk,:root #sn{min-height:44px}" in v50_css_t, "v50.css must carry the #sk/#sn 44px rule (mirrors the base :root selector — bare #sk loses on specificity)"
    assert "#v21avatarbtn{min-height:44px}" in v50_css_t, "v50.css must carry the #v21avatarbtn 44px rule"
    assert ".v15link{min-height:44px}" in v50_css_t, "v50.css must carry the .v15link 44px rule (chooser 'Để sau')"
    assert ".tabs .tab{min-height:44px}" in v50_css_t, "v50.css must carry the bottom-tab 44px rule"
    print(f"validated src/v50.js ({len(v50_js_t)} chars) + src/v50.css ({len(v50_css_t)} chars)")

    # --- 3. Copy the edited src files + the new layer files into out/ ---
    for name in EDITED_SRC:
        _copy_bytes_epersafe(src_dir / name, out / name)
    _copy_bytes_epersafe(v50_js, out / "v50.js")
    _copy_bytes_epersafe(v50_css, out / "v50.css")

    # --- 4. Assemble the new index.html ---
    edits = []
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V19.4 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # wholesale sync of each edited embedded script block with its src file
    for name, vid in EDITED_SRC.items():
        old_src = (pristine / name).read_bytes()
        new_src = (src_dir / name).read_bytes()
        old_block = b'<script id="' + vid.encode() + b'">\n' + old_src + b'\n</script>'
        new_block = b'<script id="' + vid.encode() + b'">\n' + new_src + b'\n</script>'
        o0 = orig_bytes.find(old_block)
        assert o0 != -1 and orig_bytes.count(old_block) == 1, f"index.html: embedded {vid} block not found exactly once"
        edits.append({"start": o0, "end": o0 + len(old_block),
                      "chunks": [("glue", new_block)]})
    # V50 layer, LAST, before </body> (style + script together, V45 pattern).
    # rfind, NOT find: see the v37.css "</body>" comment trap (build_v41.py).
    body = orig_bytes.rfind(b"</body>")
    assert body != -1, "no </body> in index.html"
    assert body > orig_bytes.rfind(b'id="v49js"'), "injection point is before v49js - wrong </body>"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v50">\n'),
        ("file", v50_css),
        ("glue", b'\n</style>\n<script id="v50js">\n'),
        ("file", v50_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 5. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V19.5 title missing / V19.4 title remains"
    assert "window.__v50={" in built and "VERSION='19.5.0'" in built, "built index.html missing __v50 19.5.0"
    # v50 markers are the LAST style/script markers before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v50", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v50", f"script marker order wrong: {script_ids}"
    assert built.find('id="v50js"') > built.find('id="v49js"'), "v50js is not after v49js"
    assert built.find('id="v50"') > built.find('id="v49"'), "v50 style is not after v49"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0", "17.0.0", "17.1.0", "18.0.0", "18.1.0", "18.2.0", "18.3.0", "18.4.0", "18.5.0", "18.6.0", "18.7.0", "18.8.0", "18.9.0", "19.0.0", "19.0.1", "19.2.0", "19.3.0", "19.4.0"):
        assert ver in built, f"built html lost version {ver}"
    # V33–V40 fragments still present (verbatim lists from build_v41.py)
    for frag in _b41.V33_FRAGMENTS:
        assert frag in built, f"built html lost V33 fragment: {frag[:60]}"
    for frag in _b41.V34_FRAGMENTS:
        assert frag in built, f"built html lost V34 fragment: {frag[:60]}"
    for frag in _b41.V35_FRAGMENTS:
        # V48 deliberately superseded this one fragment: TOTAL_BOSSES
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
    # V48 fragments still present (regression; exact counts from build_v48.py §5)
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
    for name, frags in _b48.NEW_FRAGS.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW V48 fragment missing ({name}): {frag[:70]}"
    for name, frags in _b48.OLD_FRAGS.items():
        for frag in frags:
            assert frag not in built, f"built html: OLD V48 fragment still present ({name}): {frag[:70]}"
    # V49 fragments present (exact counts; regression — V50 changed
    # the F-literal token init, see the V50 subsection below)
    assert built.count('id="v49"') == 1, "built html: v49 style marker missing"
    assert built.count('id="v49js"') == 1, "built html: v49js script marker missing"
    assert built.count("window.__v49={") == 1, "built html: __v49 export missing"
    assert built.count("VERSION='19.4.0'") == 1, "built html: __v49 19.4.0 version missing"
    assert built.count("function speakErrMsg(code){") == 1, "built html: speakErrMsg definition missing / duplicated"
    assert built.count("speakErrMsg") == 15, f"built html: speakErrMsg occurrences {built.count('speakErrMsg')}, expected 15 (3 in v49.js + 6 per engine: guard + call x3 sites)"
    assert built.count("function stopSpeak(){") == 2, "built html: stopSpeak definition missing / duplicated (one per engine)"
    assert built.count("  stopSpeak();") == 6, f"built html: stopSpeak() call lines {built.count('  stopSpeak();')}, expected 6 (next + close + startFight, one per engine)"
    assert built.count("function speakState(){") == 2, "built html: speakState definition missing / duplicated (one per engine)"
    assert built.count("speakState:speakState,") == 2, "built html: speakState export missing / duplicated (one per engine)"
    assert built.count("if(F.qmode==='speak'){F.left=0;return}") == 2, "built html: speak timer guard missing / duplicated (one per engine)"
    assert built.count("F.listening=false;F.rec=null;F.heard=null;F.speakErr=null;") == 2, "built html: nextQ speak-state clear missing / duplicated (one per engine)"
    assert built.count("var token=(F.speakToken||0)+1;F.speakToken=token;") == 2, "built html: per-question token missing / duplicated (one per engine)"
    assert built.count('class="v49listen"') == 2, "built html: .v49listen card missing / duplicated (one per engine)"
    assert built.count('class="v49err"') == 2, "built html: .v49err box missing / duplicated (one per engine)"
    assert built.count('<button class="btn pri" disabled>Nói</button>') == 2, "built html: disabled Nói button missing / duplicated (one per engine)"
    for name, frags in _b49.NEW_FRAGS.items():
        for frag in frags:
            # V50 deliberately superseded this one V49 fragment: the
            # F-literal token init is now speakToken:_speakSeq50.
            if frag == "listening:false,rec:null,speakToken:0,speakErr:null,":
                continue
            assert built.count(frag) >= 1, f"built html: NEW V49 fragment missing ({name}): {frag[:70]}"
    for name, frags in _b49.OLD_FRAGS.items():
        for frag in frags:
            # Two OLD fragments also occur in files V49 deliberately does
            # NOT touch, so they cannot be asserted absent from the whole
            # built html (the pre-pass already proves them gone from the
            # edited v18.js/v19.js):
            #  - "try{rec.start()}catch(e){return}" also in v15.js:1537
            #    (a different speak path, not bossSpeak).
            #  - "bossSpeak:bossSpeak,\n" also in the v15 export
            #    (old-arena V6 boss flow, not the v18/v19 engines).
            if frag in ("  try{rec.start()}catch(e){return}", "bossSpeak:bossSpeak,\n"):
                continue
            assert frag not in built, f"built html: OLD V49 fragment still present ({name}): {frag[:70]}"
    # V50 fragments present (exact counts)
    assert built.count('id="v50"') == 1, "built html: v50 style marker missing"
    assert built.count('id="v50js"') == 1, "built html: v50js script marker missing"
    assert built.count("window.__v50={") == 1, "built html: __v50 export missing"
    assert built.count("VERSION='19.5.0'") == 1, "built html: __v50 19.5.0 version missing"
    # F-1: monotonic token sequence (3 per engine: decl + F literal + sync)
    assert built.count("var _speakSeq50=0;") == 2, "built html: _speakSeq50 declaration missing / duplicated (one per engine)"
    assert built.count("speakToken:_speakSeq50,speakErr:null,") == 2, "built html: new F-literal token init missing / duplicated (one per engine)"
    assert built.count("_speakSeq50=F.speakToken;") == 2, "built html: stopSpeak sequence sync missing / duplicated (one per engine)"
    assert built.count("speakToken:0,speakErr:null,") == 0, "built html: OLD per-fight token reset still present"
    assert built.count("  stopSpeak();\n  var hearts=b.arena==='leg'?5:(b.arena==='el'?4:3);") == 1, "built html: v18 startFight stopSpeak() call missing"
    assert built.count("  stopSpeak();\n  F={boss:b,lang:lang,hp:b.hp,maxHp:b.hp,hearts:5,maxHearts:5,") == 1, "built html: v19 startFight stopSpeak() call missing"
    # C-R5-2: due-less words read "Đến hạn hôm nay", never an epoch count
    assert built.count("var overdue=(box>0&&due)?Math.max(0,(now-due)/864e5):0;") == 1, "built html: NEW prioOf overdue guard missing"
    assert built.count("var od=due?Math.floor(Math.max(0,(now-due)/864e5)):0;") == 2, "built html: NEW classify od guard missing / duplicated (EN + KO)"
    assert built.count("Math.max(0,(now-(due||0))/864e5)") == 0, "built html: OLD epoch overdue still present"
    assert built.count("var od=Math.floor(Math.max(0,(now-due)/864e5));") == 0, "built html: OLD classify od still present"
    # C-R5-3: Forge score tracked (session + persisted best/total)
    assert built.count("scoreTotal:0,bestScore:0") == 2, "built html: forge defaults scoreTotal/bestScore missing (defEn48 + en48 fallback)"
    assert built.count("FS.score=(FS.score||0)+sc;") == 1, "built html: forgeCheck score accumulation missing"
    assert built.count("e.forge.scoreTotal=(e.forge.scoreTotal||0)+(FS.score||0);") == 1, "built html: forgeNext scoreTotal persist missing"
    assert built.count("if((e.forge.bestScore||0)<(FS.score||0))e.forge.bestScore=FS.score;") == 1, "built html: forgeNext bestScore persist missing"
    assert built.count("score:FS.score||0") == 1, "built html: forgeNext score return missing"
    assert built.count("Điểm buổi: '+(FS.score||0)+' điểm") == 1, "built html: end-screen session score missing"
    assert built.count("Điểm cao nhất: '+(en48().forge.bestScore||0)+' điểm") == 1, "built html: end-screen best score missing"
    assert built.count("Điểm cao nhất: '+(e0.forge.bestScore||0)+' điểm") == 1, "built html: intro best score missing"
    assert built.count("score:ok?scoreSentence(cur.tokens.length,cur.tier):0") == 0, "built html: OLD forgeCheck score return still present"
    # C-R5-4: KO Hub 44px touch targets
    assert built.count(".v7btn{min-height:44px}") == 1, "built html: v50 .v7btn rule missing"
    assert built.count(":root #sk,:root #sn{min-height:44px}") == 1, "built html: v50 #sk/#sn rule missing"
    assert built.count("#v21avatarbtn{min-height:44px}") == 1, "built html: v50 #v21avatarbtn rule missing"
    assert built.count(".v15link{min-height:44px}") == 1, "built html: v50 .v15link rule missing"
    assert built.count(".tabs .tab{min-height:44px}") == 1, "built html: v50 bottom-tab rule missing"
    for name, frags in NEW_FRAGS.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW V50 fragment missing ({name}): {frag[:70]}"
    for name, frags in OLD_FRAGS.items():
        for frag in frags:
            assert frag not in built, f"built html: OLD V50 fragment still present ({name}): {frag[:70]}"
    # v15 speak mode and v48 Dojo untouched (regression): their entry
    # points must still be present exactly as in the V19.4 base.
    assert built.count("function speakRecord(") == 1, "built html: v15 speakRecord missing / duplicated"
    assert built.count("function dojoListen(") == 1, "built html: v48 dojoListen missing / duplicated"
    # Embedded blocks are byte-identical to their src files (sync guarantee).
    for name, vid in EDITED_SRC.items():
        src_t = (src_dir / name).read_text(encoding="utf-8")
        pat = '<script id="%s">\n%s\n</script>' % (vid, src_t)
        assert built.count(pat) == 1, f"built html: embedded {vid} block does not match src/{name}"
        out_t = (out / name).read_text(encoding="utf-8")
        assert out_t == src_t, f"out/{name} differs from src/{name}"
    for layer in ("v50.js", "v50.css"):
        out_t = (out / layer).read_text(encoding="utf-8")
        assert out_t == (src_dir / layer).read_text(encoding="utf-8"), f"out/{layer} differs from src/{layer}"
    # out-of-scope replacements absent
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"built index.html: out-of-scope marker {marker!r} present"
    _node_check(v50_js)
    for name in EDITED_SRC:
        _node_check(src_dir / name)
    # ship the build script itself with the deliverable (reproducibility)
    _copy_bytes_epersafe(HERE / "build_v50.py", out / "build_v50.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V19.5, layer V50 injected last")
    print("V50: F-1 stopSpeak()+monotonic token in startFight (both engines); C-R5-2 due-less reads 'Đến hạn hôm nay'; C-R5-3 Forge score tracked (session + best/total); C-R5-4 KO Hub 44px targets")
    print("marker order OK: v50 style/script last; out-of-scope markers absent; embedded blocks == src files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
