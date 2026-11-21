#!/usr/bin/env python3
"""Build V19.0.1 (BALANCE: Legendary scaling + weakness redesign + KO XP)
from the pristine V19.0 build + the V46 layer.

V19.0.1 = V19.0 (Round-3 Bug Fixes, layer V45) + layer V46.
BALANCE build — Claude-directed DO, not a bug-fix round. No new
features, no schema change, no new save key (koStreak is a new OPTIONAL
field on en18()/en19() state, defaulted ||0 — same pattern as koStats).

THE CHANGES (repro-first on the pristine V19.0 base; repro evidence in
tools/v46/repro-v46.js + logs-repro-pristine.txt — legDiff [A2,B1] at
mastered 700 with a live Legendary pool of A2 300 / B1 250, never B2;
KO correct answers pay 0 XP in both engines while EN pays 75 (v18) /
70 (v19) for 8 correct answers; blocked bosses 26 buggy / 36 if
legDiff alone were fixed):

  1. Legendary difficulty scaling (legDiff, src/v18.js:254) + weakness
     table redesign (src/v34.js weakFor + src/v46_data.js), SAME version.
     Root cause: legDiff() read V15().counts() as a function, but counts
     is a getter (src/v15.js:1787), so the call threw TypeError, the
     try/catch swallowed it, m stayed 0, and legDiff() ALWAYS returned
     ['A2','B1']. Legendary difficulty never scaled despite the arena
     card promising "Do kho cau hoi tang theo tien trinh hoc cua ban".
     FIX: read the getter WITHOUT calling it (V15().counts.mastered);
     thresholds UNCHANGED (<200 -> ['A2','B1'], <600 -> ['B1'], else
     ['B2']); a failed read is console.warn-ed (never silently
     swallowed) with a logged fallback to ['A2','B1'].
     The weakness table is redesigned in the same version so the blocked
     count does NOT grow 26->36: 23 per-boss overrides in
     __V46_DATA.weakExplicit (v46_data.js), consulted FIRST in weakFor()
     (after the KO-deck rule, before the v34/v35 explicit tables), put
     every previously pool-blocked boss (13) and every Legendary boss
     (10) on an A1-A2 topic the live data proves fillable in its pool
     at every mastered band (education 19/19/13, nature 42/20/14,
     travel 36/17/12, emotions 10/7/7 across m0/m200/m600; counts in
     tools/v46/logs-analysis.txt). Recomputed: pool-blocked 0 at
     mastered 0/200/600/700; distinct blocked 15 (the 15 mode-blocked
     bosses, untouched by design — their grammar/read/builder fights
     ask no word questions, and changing their mode would change fight
     mechanics). No boss stats, HP, skills, rewards, or fight mechanics
     change — only weakness topics and the legDiff read.
  2. Korean boss XP (C-R2-1): correct KO answers paid 0 XP while EN
     paid up to +10 for identical effort, in BOTH engines (v18 markKO
     vs mark18; v19 markKO19 vs mark19). First-win (+50 XP/+1 gem) and
     replay (+10 XP) rewards already worked and stay UNCHANGED.
     FIX: ONE shared XP-award function __v46.awardBossAnswerXP
     (src/v46.js) now serves all four mark functions — +10 on a box-up
     correct answer (10-min per-item cooldown in old.xpAt), +5 every
     5th consecutive correct answer, 0 on wrong, identical hist/daily
     bookkeeping. EN calls it with boxUp=(box rose), streak 'streak' on
     enOld() — byte-identical XP to V19.0. KO calls it with boxUp=true
     on a correct answer (KO has no SRS box — the deck is never modified
     by boss fights) and streak 'koStreak' on en18()/en19() state; KO
     cooldown keys are 'ko:'+card id inside the SAME old.xpAt map.
     If the V46 layer ever failed to load, the EN mark functions fall
     back to their original inline XP block (kept verbatim, marked
     fallback-only); KO falls back to its V19.0 behaviour (0 XP).

WHAT THIS SCRIPT DOES (in order):
  0. Backs up the pristine out/index.html + the pre-fix standalone
     src files (from tools/v46/pristine-v19.0-out/) + the new layer
     files into tools/v46/backup-v19.0/.
  1. Verifies the base is the pristine V19.0 build (hash + v45 markers
     present, v46 markers absent). REFUSES otherwise.
  2. Validates the V46 layer itself: every edited src file carries its
     NEW fragments and no longer carries its OLD fragments; the new
     layer files (v46.js/v46_data.js) are well-formed.
  3. Copies the edited src files + the new layer files into out/.
  4. Assembles the new index.html: the V19.0.1 title + wholesale sync
     of each edited embedded script block with its src file (the old
     embedded block must equal the pristine standalone file, asserted
     byte-for-byte) + the V46 layer injection (data v46data + script
     v46js, LAST, before </body>).
  5. Verifies: marker order (v46js last), v46 version 19.0.1,
     node --check on v46.js/v46_data.js, old versions intact, V33-V45
     fragments still present, V46 fragments present with exact counts,
     the OLD legDiff def / OLD mark blocks GONE, thresholds intact,
     embedded blocks byte-identical to their src files, out-of-scope
     markers absent.

RUN EXACTLY ONCE on a fresh V19.0 out/. NEVER re-run build_v33.py
/ build_v34.py / ... / build_v45.py (or any older build script) on
a finished build (they reorder layers — see the V32 skill notes).

Usage:  python3 build_v46.py [--out DIR] [--src DIR]
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

# Pristine V19.0 out/index.html (2,433,827 B) — verified before any edit.
V190_HASH = "d5fb0ddcd12a314b0f72a8191ec23b0fa4d04b923aa3dd53404e0ddad8e441bb"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V19.0 — Round-3 Bug Fixes — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V19.0.1 — Legendary Scaling &amp; KO Boss XP — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# V46 markers: must be ABSENT from the pristine V19.0 base, present after.
V46_MARKERS = [
    'id="v46data"', 'id="v46js"', 'window.__v46={', "VERSION='19.0.1'",
    'window.__V46_DATA={', 'awardBossAnswerXP', 'koXpKey',
]

# Distinctive strings that exist ONLY in work V46 does NOT do
# (copied verbatim from build_v41.py — the base must not have moved).
OUT_OF_SCOPE_MARKERS = _b41.OUT_OF_SCOPE_MARKERS

# src files edited by V46 (embedded blocks are synced wholesale).
EDITED_SRC = ["v18.js", "v19.js", "v34.js"]

# --- the OLD legDiff definition (must be GONE) + the NEW one (must be present once) ---
LEGDIFF_OLD = "function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}if(m<200)return ['A2','B1'];if(m<600)return ['B1'];return ['B2']}"
LEGDIFF_NEW = "function legDiff(){var m=0;try{var c=V15().counts;if(c&&typeof c.mastered==='number')m=c.mastered;else throw new Error('V46 legDiff: V15().counts.mastered is not a number')}catch(e){try{if(typeof console!=='undefined'&&console.warn)console.warn('[V46 legDiff] mastered read failed, falling back to A2/B1:',e&&e.message||e)}catch(_){}}if(m<200)return ['A2','B1'];if(m<600)return ['B1'];return ['B2']}"
LEGDIFF_THRESHOLDS = "if(m<200)return ['A2','B1'];if(m<600)return ['B1'];return ['B2']"

# --- NEW fragments (must be present in each edited src file + built html) ---
NEW_FRAGS = {
    "v18.js": [
        LEGDIFF_NEW,
        "awardBossAnswerXP({ok:ok,id:id,boxUp:old.box[id]>before,streakObj:old,streakKey:'streak',xpAt:old.xpAt,gain:gain18,hist:e.hist,daily:e.daily})",
        "awardBossAnswerXP({ok:ok,id:__v46.koXpKey(k.id),boxUp:!!ok,streakObj:e,streakKey:'koStreak',xpAt:_old.xpAt,gain:gain18,hist:_en.hist,daily:_en.daily})",
        "e.koStreak=e.koStreak||0;",
    ],
    "v19.js": [
        "awardBossAnswerXP({ok:ok,id:id,boxUp:old.box[id]>before,streakObj:old,streakKey:'streak',xpAt:old.xpAt,gain:gain19,hist:e.hist,daily:e.daily})",
        "awardBossAnswerXP({ok:ok,id:__v46.koXpKey(k.id),boxUp:!!ok,streakObj:e,streakKey:'koStreak',xpAt:_old.xpAt,gain:gain19,hist:_en.hist,daily:_en.daily})",
        "e.koStreak=e.koStreak||0;",
    ],
    "v34.js": [
        "var d46=window.__V46_DATA||null;",
        "if(d46&&d46.weakExplicit&&d46.weakExplicit[id])return d46.weakExplicit[id];",
    ],
}
# --- OLD fragments (must be GONE from each edited src file + built html) ---
# NOTE: the EN fallback blocks keep the original XP lines at a deeper
# indent (4 spaces), so the OLD strings below (2-space indent, exact
# pre-fix shape) must be absent while the fallback survives — asserted
# separately by the fallback counts.
OLD_FRAGS = {
    "v18.js": [
        LEGDIFF_OLD,
        "  var xp=0;\n  if(ok&&old.box[id]>before){\n    var last=old.xpAt[id]||0;\n    if(Date.now()-last>600000){xp=10;old.xpAt[id]=Date.now()}\n  }\n  if(ok&&old.streak>0&&old.streak%5===0)xp+=5;\n  if(xp>0)gain18(xp);\n  var dn=dayNo18();e.hist[dn]=e.hist[dn]||{c:0,t:0,xp:0};",
        "function markKO(ok,k){\n  var e=en18();\n  if(ok)e.koStats.right++;else e.koStats.wrong++;\n  /* V39 (V18.4)",
    ],
    "v19.js": [
        "  var xp=0;\n  if(ok&&old.box[id]>before){\n    var last=old.xpAt[id]||0;\n    if(Date.now()-last>600000){xp=10;old.xpAt[id]=Date.now()}\n  }\n  if(ok&&old.streak>0&&old.streak%5===0)xp+=5;\n  if(xp>0)gain19(xp);\n  var dn=dayNo19();e.hist[dn]=e.hist[dn]||{c:0,t:0,xp:0};",
        "function markKO19(ok,k){\n  var e=en19();\n  if(ok)e.koStats.right++;else e.koStats.wrong++;\n  /* V39 (V18.4)",
    ],
    "v34.js": [
        "    var id=b.id||'';\n    if(d&&d.weakExplicit&&d.weakExplicit[id])return d.weakExplicit[id];",
    ],
}
# EN fallback blocks (original XP lines at 4-space indent) — must survive exactly once per engine.
FALLBACK_FRAGS = {
    "v18.js": [
        "    if(ok&&old.box[id]>before){\n      var last=old.xpAt[id]||0;\n      if(Date.now()-last>600000){xp=10;old.xpAt[id]=Date.now()}\n    }\n    if(ok&&old.streak>0&&old.streak%5===0)xp+=5;\n    if(xp>0)gain18(xp);",
    ],
    "v19.js": [
        "    if(ok&&old.box[id]>before){\n      var last=old.xpAt[id]||0;\n      if(Date.now()-last>600000){xp=10;old.xpAt[id]=Date.now()}\n    }\n    if(ok&&old.streak>0&&old.streak%5===0)xp+=5;\n    if(xp>0)gain19(xp);",
    ],
}
# The 23 weakness-override boss ids (must all be present in v46_data.js + built html).
WEAK46_IDS = [
    'v10_firedragon', 'v10_icewolf', 'v10_thunderlion', 'v10_seaoctopus',
    'v10_titan', 'v10_phoenix', 'v10_voidghost', 'v10_godturtle',
    'v10_ninetails', 'v10_ancienttree',
    'v11_seadragon', 'v11_sharkking', 'v11_timemachine', 'v11_golem',
    'v11_goldephant',
    'v10_owl', 'v10_tiger', 'v10_wizard', 'v10_fox', 'v10_octopus',
    'v10_dict', 'v10_king', 'v10_fairy',
]


# --- helpers (EPERM-safe pattern from build_v41.py / build_v45.py) ---
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
    tmp = pathlib.Path(dst).with_name(pathlib.Path(dst).name + ".tmp46")
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
    pristine = ROOT / "tools" / "v46" / "pristine-v19.0-out"
    v46_js = src_dir / "v46.js"
    v46_data_js = src_dir / "v46_data.js"
    assert v46_js.exists() and v46_data_js.exists(), "src/v46.js / src/v46_data.js missing"
    assert pristine.is_dir(), "tools/v46/pristine-v19.0-out missing — the hash-verified V19.0 backup source"

    # --- 0. Back up the pristine out/index.html + the pre-fix standalone
    # src files (from the pristine copy) + the new layer files into
    # tools/v46/backup-v19.0/. ---
    backup = ROOT / "tools" / "v46" / "backup-v19.0"
    backup.mkdir(parents=True, exist_ok=True)
    live = out / "index.html"
    src_copy = pristine / "index.html"
    assert live.exists(), "out/index.html missing"
    assert src_copy.exists(), "pristine-v19.0-out/index.html missing"
    assert _sha256(live) == _sha256(src_copy), (
        "out/index.html differs from the pristine copy — refusing to build on a moved tree")
    _copy_bytes_epersafe(src_copy, backup / "out__index.html")
    for name in EDITED_SRC:
        _copy_bytes_epersafe(pristine / name, backup / ("src__" + name + ".old"))
    _copy_bytes_epersafe(v46_js, backup / "src__v46.js")
    _copy_bytes_epersafe(v46_data_js, backup / "src__v46_data.js")
    print(f"backup OK: out/index.html + {len(EDITED_SRC)} pre-fix src files + new layer files recorded in {backup}")

    # --- 1. Verify the base is pristine V19.0 ---
    index = out / "index.html"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V190_HASH, f"base is not pristine V19.0: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v45"' in built and 'id="v45js"' in built, "V45 markers missing — not a V19.0 build"
    for m in V46_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V19.0 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    assert LEGDIFF_OLD in built and built.count(LEGDIFF_OLD) == 1, "pre-fix legDiff() not found exactly once in base"
    # Each edited embedded script block must equal its pristine standalone file.
    for name in EDITED_SRC:
        vid = name[:-3]
        old_src = (pristine / name).read_text(encoding="utf-8")
        pat = '<script id="%sjs">\n%s\n</script>' % (vid, old_src)
        assert built.count(pat) == 1, f"embedded {vid}js block does not match pristine {name} exactly once"
    print(f"verified pristine V19.0 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v45 markers present, v46 absent")

    # --- 2. Validate the V46 layer itself ---
    for name in EDITED_SRC:
        t = (src_dir / name).read_text(encoding="utf-8")
        for frag in NEW_FRAGS.get(name, []):
            assert frag in t, f"src/{name} missing NEW fragment: {frag[:70]}"
        for frag in OLD_FRAGS.get(name, []):
            assert frag not in t, f"src/{name} still has OLD fragment: {frag[:70]}"
        for frag in FALLBACK_FRAGS.get(name, []):
            assert t.count(frag) == 1, f"src/{name} EN fallback block count != 1: {frag[:70]}"
    # The pristine (old) standalone files must NOT carry the new fragments.
    for name in EDITED_SRC:
        old_t = (pristine / name).read_text(encoding="utf-8")
        for frag in NEW_FRAGS.get(name, []):
            assert frag not in old_t, f"pristine {name} already has NEW fragment (base moved?): {frag[:70]}"
    v46_js_t = v46_js.read_text(encoding="utf-8")
    assert "</script>" not in v46_js_t.lower(), "v46.js contains </script>"
    assert "VERSION='19.0.1'" in v46_js_t and "window.__v46={" in v46_js_t, "v46.js must expose __v46 19.0.1"
    assert "awardBossAnswerXP" in v46_js_t and "koXpKey" in v46_js_t, "v46.js must define the shared XP function + KO key"
    assert "window.S" not in _re.sub(r"/\*.*?\*/", "", v46_js_t, flags=_re.S), "v46.js must never use window.S (lexical let)"
    assert "localStorage" not in v46_js_t, "v46.js must not touch localStorage"
    v46_data_t = v46_data_js.read_text(encoding="utf-8")
    assert "</script>" not in v46_data_t.lower(), "v46_data.js contains </script>"
    assert "window.__V46_DATA={" in v46_data_t, "v46_data.js must expose __V46_DATA"
    for bid in WEAK46_IDS:
        assert ("'%s'" % bid) in v46_data_t, f"v46_data.js missing override boss id {bid}"
    assert len(WEAK46_IDS) == 23, "weakness override table must hold exactly 23 bosses"
    # legDiff thresholds intact in the new definition (exact string, once).
    assert LEGDIFF_NEW.count(LEGDIFF_THRESHOLDS) == 1, "new legDiff() lost its thresholds"
    print(f"validated src edits ({len(EDITED_SRC)} files: NEW fragments present, OLD fragments gone, EN fallbacks intact) + src/v46.js ({len(v46_js_t)} chars) + src/v46_data.js ({len(v46_data_t)} chars, 23 overrides)")

    # --- 3. Copy the edited src files + the new layer files into out/ ---
    for name in EDITED_SRC:
        _copy_bytes_epersafe(src_dir / name, out / name)
    _copy_bytes_epersafe(v46_js, out / "v46.js")
    _copy_bytes_epersafe(v46_data_js, out / "v46_data.js")

    # --- 4. Assemble the new index.html ---
    edits = []
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V19.0 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # wholesale sync of each edited embedded script block with its src file
    for name in EDITED_SRC:
        vid = name[:-3]
        old_src = (pristine / name).read_bytes()
        new_src = (src_dir / name).read_bytes()
        old_block = b'<script id="' + vid.encode() + b'js">\n' + old_src + b'\n</script>'
        new_block = b'<script id="' + vid.encode() + b'js">\n' + new_src + b'\n</script>'
        o0 = orig_bytes.find(old_block)
        assert o0 != -1 and orig_bytes.count(old_block) == 1, f"index.html: embedded {vid}js block not found exactly once"
        edits.append({"start": o0, "end": o0 + len(old_block),
                      "chunks": [("glue", new_block)]})
    # V46 layer, LAST, before </body> (data + script, V33-V35 pattern:
    # data script first, logic script last).
    # rfind, NOT find: see the v37.css "</body>" comment trap (build_v41.py).
    body = orig_bytes.rfind(b"</body>")
    assert body != -1, "no </body> in index.html"
    assert body > orig_bytes.rfind(b'id="v45js"'), "injection point is before v45js - wrong </body>"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<script id="v46data">\n'),
        ("file", v46_data_js),
        ("glue", b'\n</script>\n<script id="v46js">\n'),
        ("file", v46_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 5. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V19.0.1 title missing / V19.0 title remains"
    assert "window.__v46={" in built and "VERSION='19.0.1'" in built, "built index.html missing __v46 19.0.1"
    assert "window.__V46_DATA={" in built, "built index.html missing __V46_DATA"
    # v46 markers are the LAST scripts before </body>
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert script_ids and script_ids[-1] == "v46", f"script marker order wrong: {script_ids}"
    assert built.find('id="v46js"') > built.find('id="v45js"'), "v46js is not after v45js"
    assert built.find('id="v46data"') > built.find('id="v45js"'), "v46data is not after v45js"
    assert built.find('id="v46data"') < built.find('id="v46js"'), "v46data is not before v46js"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0", "17.0.0", "17.1.0", "18.0.0", "18.1.0", "18.2.0", "18.3.0", "18.4.0", "18.5.0", "18.6.0", "18.7.0", "18.8.0", "18.9.0", "19.0.0"):
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
    # V41 key fragments still present (exact counts, from build_v45.py §5)
    assert built.count("indexOf('ca-')===0") == 4, "built html: CA gate count changed"
    assert built.count("Math.min(3,F.caRight)") == 1, "built html: R-V41-V19-CA-CLAMP missing"
    assert built.count("if(!j.opt)j.opt={mode:'card',dir:'kv',group:'',due:false}") == 1, "built html: R-V41-INDEX-OPT missing"
    assert built.count("var old=$('#v15farmquiz');if(old)old.remove();") == 1, "built html: R-V41-V15-FARMQUIZ missing"
    assert built.count("try{ flush(); }catch(e){}") == 2, "built html: R-V41-V20-FLUSH count changed"
    assert built.count("try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}") == 6, "built html: R-V41-V15-FLUSH count changed"
    assert built.count('flex:0 0 auto;min-width:64px') == 1, "built html: R-V41-V41-NAV min-width rule missing"
    assert built.count('"src": "a1a2"') == 999, "built html: A1-A2 raw rows != 999"
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
    # V46 fragments present (exact counts)
    assert built.count('id="v46data"') == 1, "built html: v46data script marker missing"
    assert built.count('id="v46js"') == 1, "built html: v46js script marker missing"
    assert built.count("window.__v46={") == 1, "built html: __v46 export missing"
    assert built.count("VERSION='19.0.1'") == 1, "built html: __v46 19.0.1 version missing"
    assert built.count("window.__V46_DATA={") == 1, "built html: __V46_DATA export missing"
    for bid in WEAK46_IDS:
        assert built.count("'%s'" % bid) >= 1, f"built html: weakness override boss id {bid} missing"
    for name, frags in NEW_FRAGS.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW V46 fragment missing ({name}): {frag[:70]}"
    for name, frags in OLD_FRAGS.items():
        for frag in frags:
            assert frag not in built, f"built html: OLD V46 fragment still present ({name}): {frag[:70]}"
    for name, frags in FALLBACK_FRAGS.items():
        for frag in frags:
            assert built.count(frag) == 1, f"built html: EN fallback block count != 1 ({name}): {frag[:70]}"
    # legDiff: OLD def gone, NEW def present exactly once, thresholds intact.
    assert built.count(LEGDIFF_OLD) == 0, "built html: OLD legDiff() definition still present"
    assert built.count(LEGDIFF_NEW) == 1, "built html: NEW legDiff() definition missing / duplicated"
    assert built.count(LEGDIFF_THRESHOLDS) == 1, "built html: legDiff thresholds changed"
    # The only remaining live getter-call is the V44 header comment (historical).
    assert built.count("V15().counts().mastered") == 1, f"built html: V15().counts().mastered count {built.count('V15().counts().mastered')}, expected 1 (V44 comment only)"
    assert built.count("koStreak") >= 6, f"built html: koStreak count {built.count('koStreak')}, expected >= 6"
    assert built.count("awardBossAnswerXP") >= 7, f"built html: awardBossAnswerXP count {built.count('awardBossAnswerXP')}, expected >= 7"
    # Embedded blocks are byte-identical to their src files (sync guarantee).
    for name in EDITED_SRC:
        vid = name[:-3]
        src_t = (src_dir / name).read_text(encoding="utf-8")
        pat = '<script id="%sjs">\n%s\n</script>' % (vid, src_t)
        assert built.count(pat) == 1, f"built html: embedded {vid}js block does not match src/{name}"
        out_t = (out / name).read_text(encoding="utf-8")
        assert out_t == src_t, f"out/{name} differs from src/{name}"
    for name in ("v46.js", "v46_data.js"):
        out_t = (out / name).read_text(encoding="utf-8")
        assert out_t == (src_dir / name).read_text(encoding="utf-8"), f"out/{name} differs from src/{name}"
    # out-of-scope replacements absent
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"built index.html: out-of-scope marker {marker!r} present"
    _node_check(v46_js)
    _node_check(v46_data_js)
    for name in EDITED_SRC:
        _node_check(src_dir / name)
    # ship the build script itself with the deliverable (reproducibility)
    _copy_bytes_epersafe(HERE / "build_v46.py", out / "build_v46.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V19.0.1, layer V46 injected last")
    print("V46: legDiff getter-read fix (thresholds unchanged) + 23-boss weakness redesign (pool-blocked 0, distinct 15) + KO boss XP via one shared rule; first-win/replay unchanged; EN XP unchanged")
    print("marker order OK: v46data + v46js last, v46js after v45js; out-of-scope markers absent; embedded blocks == src files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
