#!/usr/bin/env python3
"""Build V19.2 (DUPLICATE SENSES: C-R3-3) from the pristine V19.0.1
build + the V47 layer.

V19.2 = V19.0.1 (Legendary Scaling + KO Boss XP, layer V46) + layer
V47. FIX build — Claude's decided C-R3-3 fix (2026-11-21): KEEP both
rows for sluggish / orange / trip (distinct senses), MERGE devoted
into one row. No schema change, no new save key.

THE CHANGES (repro-first on the pristine V19.0.1 base; repro evidence
in tools/v47/repro-v47.js + logs/repro-v47-pristine.log — each pair is
exactly 1 WORDS record today; a1a2Total 999 vs deduped 995; mastering
'orange' once counts as learned in BOTH FRUIT and COLORS; no twin
ids, no labelOf, no distractor guard):
  1. Devoted merge (data only): delete the no-938 row (devoted,
     FAMILY, "tận tâm, tận tụy" — near-identical to no-351) from
     data/v17_a1a2.json, src/v17_a1a2.js, out/v17_a1a2.js,
     out/v17_a1a2.json and the inline v17data block, exactly as
     build_v41.py did for airplane/each-other. Assert '"no": 938'
     absent and '"no": 351' present once. The three kept second
     senses stay in the data files untouched.
  2. Twin creation (new src/v47.js + a hook call at the end of
     buildWords() in src/v15.js, AFTER the V17b/V22/V33/V35 attach
     blocks and the V16 override loop): for each kept pair
     (sluggish 403->680 EMOTIONS, orange 313->806 COLORS, trip
     530->912 FAMILY) the primary WORDS record is restricted to its
     first topic (a1a2Topics=[first], a1a2Topic=first, second topic
     dropped from a1a2NoMap, a1a2No=firstNo; the twin sense removed
     from extra[]; Oxford extra / oxLessons / oxOrdMap / lib / lv
     untouched — orange keeps t:'fruits', lv:'A1') and the twin
     {id:'a1a2_'+twinNo, ... sense:twinTopicName} is appended with NO
     extra, NO oxLessons, NO Oxford attach. Twin rows are read from
     __V17_A1A2 by `no` — no gloss is invented or edited. The hook
     sits INSIDE buildWords() (not a wrapper on the __v15 export)
     because buildWords() is also called through its closure from
     init15/add/delete/reset/attachBT and the V33/V35 ensureData
     paths, which a wrapper would miss.
  3. Distractor guard (headword-based, NOT id-based — EN-text
     options would otherwise show two identical "orange" buttons):
     (x.en||'').toLowerCase()!==(w.en||'').toLowerCase() added to the
     filter in all four functions — distractors (v15), distractorsEN
     (v18, v19, v27) — in BOTH the base pool and the in-scope
     replacement pool, plus v27's `rest` fallback. 9 sites total.
  4. Session-list guard: pickPool() (v15) dedupes its return list
     by lowercased en (covers Matching's identical EN tiles).
  5. Sense labels (display only; NEVER baked into w.en):
     labelOf(w) returns w.en + ' (' + sense + ')' when w.sense
     exists; used in wordCard() (v17, REQUIRED) and in the MC /
     Speed / Review / boss meaning-mode prompts (v15, v18, v19)
     and the Smart Learning mc-ev prompt (v27). Deliberately NOT
     labelled: speak-mode prompts and v27 flash prompts (the
     Vietnamese meaning is shown alongside the headword there, so
     the two senses are already distinguishable), type prompts
     (the prompt IS the Vietnamese meaning), listen prompts (the
     prompt is "Nghe"; the options are guard-protected), and Match
     tiles (pickPool dedup prevents both twins in one session).
  Deliberately NOT touched: pushV17IntoV14 / pushDataIntoV14, the
  inline v14js block, any S.v7 shape, counts15/legDiff thresholds,
  reward amounts, any Vietnamese gloss.

MIGRATION EFFECTS (honest, in the changelog): WORDS total
4,889 -> 4,892; FAMILY topic 100 -> 99; a1a2Total 999 -> 998;
per-topic learned now needs each sense mastered separately
(already-claimed rewards stay claimed). Existing saves load with
the primary's SRS history intact and each twin new.

WHAT THIS SCRIPT DOES (in order):
  0. Backs up the pristine out/index.html + the pre-fix standalone
     src files (from tools/v47/backup-v19.0.1/) + the new layer file
     + the pre-fix devoted-row files (data/src/out json+js) into
     tools/v47/backup-v19.0.1-build/.
  1. Verifies the base is the pristine V19.0.1 build (hash + v46
     markers present, v47 markers absent). REFUSES otherwise.
     PRE-PASS: every V47 replacement anchor is checked (src files
     AND out/index.html AND the JSON files) BEFORE any file is
     mutated — including the devoted-row anchors (must be present
     exactly once each; the deletion is applied by THIS script).
  2. Validates the V47 layer itself: every edited src file carries
     its NEW fragments and no longer carries its OLD fragments;
     the new layer file (v47.js) is well-formed.
  3. Applies the devoted deletion to data/v17_a1a2.json,
     src/v17_a1a2.js, out/v17_a1a2.js and out/v17_a1a2.json in
     place (exact-count asserts + JSON re-parse + row counts).
  4. Copies the edited src files + the new layer file into out/.
  5. Assembles the new index.html: the V19.2 title + wholesale
     sync of each edited embedded script block with its src file
     (the old embedded block must equal the pristine standalone
     file, asserted byte-for-byte) + the devoted-row deletion in
     the inline v17data block + the V47 layer injection (script
     v47js, LAST, before </body>).
  6. Verifies: marker order (v47js last), v47 version 19.2.0,
     node --check on v47.js + every touched src file, old versions
     intact, V33-V46 fragments still present, V47 fragments present
     with exact counts, the devoted row GONE (all three places),
     out-of-scope markers absent.

RUN EXACTLY ONCE on a fresh V19.0.1 out/. NEVER re-run build_v33.py
/ build_v34.py / ... / build_v46.py (or any older build script) on
a finished build (they reorder layers — see the V32 skill notes).
REBUILD-FROM-SCRATCH: restore out/ from tools/v47/backup-v19.0.1/,
restore src/v17_a1a2.js + data/v17_a1a2.json from
tools/v47/backup-v19.0.1-build/, re-run this script, and compare
the out/index.html sha256 — it must be byte-identical.

Usage:  python3 build_v47.py [--out DIR] [--src DIR]
Default out: out/ next to this script; default src: src/ next to it.
"""
import argparse
import hashlib
import json
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

# Pristine V19.0.1 out/index.html (2,449,080 B) — verified before any edit.
V1901_HASH = "d3d27cdab865befb1aaa495856b561f34520f9607dcdfdeb025a661b765de271"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V19.0.1 — Legendary Scaling &amp; KO Boss XP — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V19.2 — Duplicate Senses — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# V47 markers: must be ABSENT from the pristine V19.0.1 base, present after.
V47_MARKERS = [
    'id="v47js"', 'window.__v47={', "VERSION='19.2.0'",
    'splitDuplicateSenses', 'function labelOf(w){',
    "var twinId='a1a2_'+row.no;",
]

# Distinctive strings that exist ONLY in work V47 does NOT do
# (copied verbatim from build_v41.py — the base must not have moved).
OUT_OF_SCOPE_MARKERS = _b41.OUT_OF_SCOPE_MARKERS

# src files edited by V47 (embedded blocks are synced wholesale).
EDITED_SRC = ["v15.js", "v17.js", "v18.js", "v19.js", "v27.js"]

# The headword guard string (identical at all 9 sites).
GUARD = "(x.en||'').toLowerCase()!==(w.en||'').toLowerCase()"

# --- NEW fragments (must be present in each edited src file + built html) ---
NEW_FRAGS = {
    "v15.js": [
        "/* V47 (C-R3-3): dedupe the session list by lowercased headword",
        "var seen={},ded=[];",
        "/* V47 (C-R3-3): same-headword exclusion",
        "var pool=WORDS.filter(function(x){return x.id!==w.id&&" + GUARD + "&&(x.t===w.t||x.lv===w.lv)});",
        "var inSc=WORDS.filter(function(x){return x.id!==w.id&&" + GUARD + "&&inScope15(x)});",
        "__v47.splitDuplicateSenses(WORDS,BYID)",
        "esc(labelOf(w))",
        "esc(labelOf(w2))",
    ],
    "v17.js": [
        "/* V47 (C-R3-3): sense label",
        "esc(labelOf(w))",
    ],
    "v18.js": [
        "/* V47 (C-R3-3): same-headword exclusion (see v15.js). */",
        "var pool=words.filter(function(x){return x.id!==w.id&&" + GUARD + "&&(x.t===w.t||x.lv===w.lv)});",
        "var inSc=words.filter(function(x){return x.id!==w.id&&" + GUARD + "&&v.inScope(x)});",
        "esc(labelOf(w2))",
    ],
    "v19.js": [
        "/* V47 (C-R3-3): same-headword exclusion (see v15.js). */",
        "var pool=words.filter(function(x){return x.id!==w.id&&" + GUARD + "&&(x.t===w.t||x.lv===w.lv)});",
        "var inSc=words.filter(function(x){return x.id!==w.id&&" + GUARD + "&&v.inScope(x)});",
        "esc(labelOf(w2))",
    ],
    "v27.js": [
        "/* V47 (C-R3-3): same-headword exclusion (see v15.js). */",
        "pool=v.words.filter(function(x){return x.id!==w.id&&" + GUARD + "&&(x.t===w.t||x.lv===w.lv)});",
        "var inSc=v.words.filter(function(x){return x.id!==w.id&&" + GUARD + "&&v.inScope(x)});",
        "var rest=v.words.filter(function(x){return x.id!==w.id&&" + GUARD + "&&pool.indexOf(x)<0});",
        "var q=kind==='mc-ev'?labelOf(w):w.vi, isEv=kind==='mc-ev';",
    ],
}
# --- OLD fragments (must be GONE from each edited src file + built html) ---
OLD_FRAGS = {
    "v15.js": [
        "  var pool=WORDS.filter(function(x){return x.id!==w.id&&(x.t===w.t||x.lv===w.lv)});",
        "      var inSc=WORDS.filter(function(x){return x.id!==w.id&&inScope15(x)});",
        "  return shuffle(list).slice(0,n);\n}\nfunction distractors(w,n){",
    ],
    "v18.js": [
        "  var pool=words.filter(function(x){return x.id!==w.id&&(x.t===w.t||x.lv===w.lv)});",
        "      var inSc=words.filter(function(x){return x.id!==w.id&&v.inScope(x)});",
    ],
    "v19.js": [
        "  var pool=words.filter(function(x){return x.id!==w.id&&(x.t===w.t||x.lv===w.lv)});",
        "      var inSc=words.filter(function(x){return x.id!==w.id&&v.inScope(x)});",
    ],
    "v27.js": [
        "    pool=v.words.filter(function(x){return x.id!==w.id&&(x.t===w.t||x.lv===w.lv)});",
        "      var inSc=v.words.filter(function(x){return x.id!==w.id&&v.inScope(x)});",
        "      var rest=v.words.filter(function(x){return x.id!==w.id&&pool.indexOf(x)<0});",
        "        var q=kind==='mc-ev'?w.en:w.vi, isEv=kind==='mc-ev';",
    ],
}

# --- Devoted merge (no-938 row deletion, build_v41.py F4 precedent) ---
DEVOTED_JS = ', {"en": "devoted", "vi": "tận tâm, tận tụy", "ipa": "/dɪˈvoʊ.t̬ɪd/", "pos": "adj", "t": "a1_family", "topic": "FAMILY", "tv": "GIA ĐÌNH", "lv": "A1-A2", "src": "a1a2", "no": 938}'
DEVOTED_JSON = (',\n {\n  "en": "devoted",\n  "vi": "tận tâm, tận tụy",\n  "ipa": "/dɪˈvoʊ.t̬ɪd/",\n  "pos": "adj",\n  "t": "a1_family",\n  "topic": "FAMILY",\n  "tv": "GIA ĐÌNH",\n  "lv": "A1-A2",\n  "src": "a1a2",\n  "no": 938\n }')
DEVOTED_KEPT_JS = '"no": 351}'
DEVOTED_KEPT_JSON = '"no": 351\n }'


# --- helpers (EPERM-safe pattern from build_v41.py / build_v46.py) ---
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
    tmp = pathlib.Path(dst).with_name(pathlib.Path(dst).name + ".tmp47")
    with open(tmp, "wb", buffering=0) as f:
        for off in range(0, len(data), 8192):
            _wsmall(f, data[off:off + 8192])
    os.rename(tmp, dst)
    assert hashlib.sha256(pathlib.Path(dst).read_bytes()).hexdigest() == hashlib.sha256(data).hexdigest(), f"backup copy mismatch: {dst}"


def _write_text_epersafe(path, text):
    """Write text to path via tmp file + atomic rename (EPERM-safe)."""
    tmp_path = path.with_name(path.name + ".tmp47")
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
    data_dir = ROOT / "data"
    pristine = ROOT / "tools" / "v47" / "backup-v19.0.1"
    v47_js = src_dir / "v47.js"
    assert v47_js.exists(), "src/v47.js missing"
    assert pristine.is_dir(), "tools/v47/backup-v19.0.1 missing — the hash-verified V19.0.1 backup source"

    # --- 0. Back up the pristine out/index.html + the pre-fix standalone
    # src files (from the pristine copy) + the new layer file + the
    # pre-fix devoted-row files into tools/v47/backup-v19.0.1-build/. ---
    backup = ROOT / "tools" / "v47" / "backup-v19.0.1-build"
    backup.mkdir(parents=True, exist_ok=True)
    live = out / "index.html"
    src_copy = pristine / "index.html"
    assert live.exists(), "out/index.html missing"
    assert src_copy.exists(), "tools/v47/backup-v19.0.1/index.html missing"
    assert _sha256(live) == _sha256(src_copy), (
        "out/index.html differs from the pristine copy — refusing to build on a moved tree")
    _copy_bytes_epersafe(src_copy, backup / "out__index.html")
    for name in EDITED_SRC + ["v17_a1a2.js"]:
        _copy_bytes_epersafe(pristine / name, backup / ("src__" + name + ".old"))
    _copy_bytes_epersafe(v47_js, backup / "src__v47.js")
    for base, fname in ((data_dir, "v17_a1a2.json"), (src_dir, "v17_a1a2.js"),
                        (out, "v17_a1a2.json"), (out, "v17_a1a2.js")):
        _copy_bytes_epersafe(base / fname, backup / (base.name + "__" + fname + ".old"))
    print(f"backup OK: out/index.html + {len(EDITED_SRC) + 1} pre-fix src files + new layer file + devoted-row files recorded in {backup}")

    # --- 1. Verify the base is pristine V19.0.1 ---
    index = out / "index.html"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V1901_HASH, f"base is not pristine V19.0.1: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v46data"' in built and 'id="v46js"' in built, "V46 markers missing — not a V19.0.1 build"
    for m in V47_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V19.0.1 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    assert _b46.LEGDIFF_NEW in built and built.count(_b46.LEGDIFF_NEW) == 1, "pre-fix NEW legDiff() (V46) not found exactly once in base"
    # Each edited embedded script block must equal its pristine standalone file.
    for name in EDITED_SRC:
        vid = name[:-3]
        old_src = (pristine / name).read_text(encoding="utf-8")
        pat = '<script id="%sjs">\n%s\n</script>' % (vid, old_src)
        assert built.count(pat) == 1, f"embedded {vid}js block does not match pristine {name} exactly once"
    print(f"verified pristine V19.0.1 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v46 markers present, v47 absent")

    # --- 1b. PRE-PASS: V47 anchors (src + index.html) + devoted rows ---
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
        old_t = (pristine / name).read_text(encoding="utf-8")
        for frag in frags:
            assert frag not in old_t, f"PRE-PASS pristine {name} already has NEW fragment (base moved?): {frag[:70]}"
    # Devoted row present exactly once in every place it will be deleted.
    for base, fname, anchor in ((data_dir, "v17_a1a2.json", DEVOTED_JSON),
                                (src_dir, "v17_a1a2.js", DEVOTED_JS),
                                (out, "v17_a1a2.json", DEVOTED_JSON),
                                (out, "v17_a1a2.js", DEVOTED_JS)):
        t = (base / fname).read_text(encoding="utf-8")
        kept = DEVOTED_KEPT_JSON if fname.endswith(".json") else DEVOTED_KEPT_JS
        assert t.count(anchor) == 1, f"PRE-PASS {base.name}/{fname}: devoted anchor found {t.count(anchor)}x, expected exactly 1"
        assert t.count(kept) == 1, f"PRE-PASS {base.name}/{fname}: kept devoted row ('\"no\": 351') found {t.count(kept)}x, expected exactly 1"
    assert built.count(DEVOTED_JS) == 1, f"PRE-PASS index.html: devoted JS row found {built.count(DEVOTED_JS)}x, expected exactly 1"
    assert built.count(DEVOTED_KEPT_JS) == 1, f"PRE-PASS index.html: kept devoted row found {built.count(DEVOTED_KEPT_JS)}x, expected exactly 1"
    rows_pre = json.loads((data_dir / "v17_a1a2.json").read_text(encoding="utf-8"))
    assert len(rows_pre) == 999, f"PRE-PASS data/v17_a1a2.json: {len(rows_pre)} rows, expected 999"
    print("pre-pass OK: V47 src fragments + devoted-row anchors (data/src/out/index)")

    # --- 2. Validate the V47 layer itself ---
    v47_js_t = v47_js.read_text(encoding="utf-8")
    assert "</script>" not in v47_js_t.lower(), "v47.js contains </script>"
    assert "VERSION='19.2.0'" in v47_js_t and "window.__v47={" in v47_js_t, "v47.js must expose __v47 19.2.0"
    assert "function labelOf(w){" in v47_js_t and "window.labelOf=labelOf;" in v47_js_t, "v47.js must define + expose labelOf"
    assert "function splitDuplicateSenses(WORDS,BYID){" in v47_js_t, "v47.js must define splitDuplicateSenses(WORDS,BYID)"
    assert "window.S" not in _re.sub(r"/\*.*?\*/", "", v47_js_t, flags=_re.S), "v47.js must never use window.S (lexical let)"
    assert "localStorage" not in v47_js_t, "v47.js must not touch localStorage"
    for pair in ("{en:'sluggish',twinNo:680}", "{en:'orange',twinNo:806}", "{en:'trip',twinNo:912}"):
        assert pair in v47_js_t, f"v47.js missing kept pair {pair}"
    assert "twinNo:938" not in v47_js_t and "'devoted'" not in v47_js_t and '"devoted"' not in v47_js_t, "v47.js must not carry the devoted merge as a twin (that is a data deletion, not a twin)"
    print(f"validated src/v47.js ({len(v47_js_t)} chars, 3 kept pairs, labelOf + splitDuplicateSenses)")

    # --- 3. Devoted deletion (data/src/out in place; inline block in §5) ---
    for base, fname, anchor in ((data_dir, "v17_a1a2.json", DEVOTED_JSON),
                                (src_dir, "v17_a1a2.js", DEVOTED_JS),
                                (out, "v17_a1a2.json", DEVOTED_JSON),
                                (out, "v17_a1a2.js", DEVOTED_JS)):
        p = base / fname
        text = p.read_text(encoding="utf-8")
        assert text.count(anchor) == 1, f"{base.name}/{fname}: devoted anchor found {text.count(anchor)}x, expected exactly 1"
        _write_text_epersafe(p, text.replace(anchor, ""))
        after = p.read_text(encoding="utf-8")
        assert after.count(anchor) == 0, f"{base.name}/{fname}: devoted row still present"
        kept = DEVOTED_KEPT_JSON if fname.endswith(".json") else DEVOTED_KEPT_JS
        assert after.count(kept) == 1, f"{base.name}/{fname}: kept devoted row ('\"no\": 351') missing/duplicated after deletion"
        if fname.endswith(".json"):
            rows = json.loads(after)
            assert len(rows) == 998, f"{base.name}/{fname}: {len(rows)} rows after, expected 998"
        print(f"applied devoted deletion to {base.name}/{fname}")

    # --- 4. Copy the edited src files + the new layer file into out/ ---
    for name in EDITED_SRC:
        _copy_bytes_epersafe(src_dir / name, out / name)
    _copy_bytes_epersafe(v47_js, out / "v47.js")
    _copy_bytes_epersafe(src_dir / "v17_a1a2.js", out / "v17_a1a2.js")
    assert (out / "v17_a1a2.js").read_text(encoding="utf-8") == (src_dir / "v17_a1a2.js").read_text(encoding="utf-8"), "out/v17_a1a2.js differs from src/v17_a1a2.js"

    # --- 5. Assemble the new index.html ---
    edits = []
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V19.0.1 title not found exactly once"
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
    # devoted row deletion in the inline v17data block
    d0 = orig_bytes.find(DEVOTED_JS.encode("utf-8"))
    assert d0 != -1 and orig_bytes.count(DEVOTED_JS.encode("utf-8")) == 1, "index.html: devoted JS row not found exactly once"
    edits.append({"start": d0, "end": d0 + len(DEVOTED_JS.encode("utf-8")),
                  "chunks": []})
    # V47 layer, LAST, before </body> (script only — no data file, no CSS).
    # rfind, NOT find: see the v37.css "</body>" comment trap (build_v41.py).
    body = orig_bytes.rfind(b"</body>")
    assert body != -1, "no </body> in index.html"
    assert body > orig_bytes.rfind(b'id="v46js"'), "injection point is before v46js - wrong </body>"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<script id="v47js">\n'),
        ("file", v47_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 6. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V19.2 title missing / V19.0.1 title remains"
    assert "window.__v47={" in built and "VERSION='19.2.0'" in built, "built index.html missing __v47 19.2.0"
    # v47js is the LAST script before </body>
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert script_ids and script_ids[-1] == "v47", f"script marker order wrong: {script_ids}"
    assert built.find('id="v47js"') > built.find('id="v46js"'), "v47js is not after v46js"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0", "17.0.0", "17.1.0", "18.0.0", "18.1.0", "18.2.0", "18.3.0", "18.4.0", "18.5.0", "18.6.0", "18.7.0", "18.8.0", "18.9.0", "19.0.0", "19.0.1"):
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
    # V47 fragments present (exact counts)
    assert built.count('id="v47js"') == 1, "built html: v47js script marker missing"
    assert built.count("window.__v47={") == 1, "built html: __v47 export missing"
    assert built.count("VERSION='19.2.0'") == 1, "built html: __v47 19.2.0 version missing"
    assert built.count("function labelOf(w){") == 1, "built html: labelOf definition missing / duplicated"
    assert built.count("window.labelOf=labelOf;") == 1, "built html: labelOf global exposure missing"
    assert built.count("function splitDuplicateSenses(WORDS,BYID){") == 1, "built html: splitDuplicateSenses definition missing / duplicated"
    assert built.count("__v47.splitDuplicateSenses(WORDS,BYID)") == 1, "built html: buildWords hook call missing / duplicated"
    assert built.count(GUARD) == 9, f"built html: headword guard present {built.count(GUARD)}x, expected 9 (v15x2 + v18x2 + v19x2 + v27x3)"
    # 5 call sites + the definition + one mention in the v47.js header comment.
    assert built.count("labelOf(w)") == 7, f"built html: labelOf(w) occurrences {built.count('labelOf(w)')}, expected 7 (v15 mc/speed/review + v17 card + v27 mc-ev + definition + header comment)"
    assert built.count("labelOf(w2)") == 3, f"built html: labelOf(w2) call sites {built.count('labelOf(w2)')}, expected 3 (v15/v18/v19 boss meaning mode)"
    assert built.count("var seen={},ded=[];") == 1, "built html: pickPool dedupe missing / duplicated"
    for name, frags in NEW_FRAGS.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW V47 fragment missing ({name}): {frag[:70]}"
    for name, frags in OLD_FRAGS.items():
        for frag in frags:
            assert frag not in built, f"built html: OLD V47 fragment still present ({name}): {frag[:70]}"
    # Devoted merge: row gone everywhere, kept row intact, counts moved.
    assert built.count('"no": 938') == 0, "built html: dropped devoted row (no 938) still present"
    assert built.count('"no": 351') == 1, "built html: kept devoted row (no 351) missing / duplicated"
    assert built.count('"src": "a1a2"') == 998, f"built html: A1-A2 raw rows {built.count(chr(34)+'src'+chr(34)+': '+chr(34)+'a1a2'+chr(34))}, expected 998"
    assert built.count('"src": "oxford"') == 3395, "built html: Oxford raw rows != 3395"
    # The kept second senses stay in the data (untouched by the merge).
    for no in (680, 806, 912):
        assert built.count('"no": %d}' % no) == 1, f"built html: kept twin row no {no} missing / duplicated"
    # Embedded blocks are byte-identical to their src files (sync guarantee).
    for name in EDITED_SRC:
        vid = name[:-3]
        src_t = (src_dir / name).read_text(encoding="utf-8")
        pat = '<script id="%sjs">\n%s\n</script>' % (vid, src_t)
        assert built.count(pat) == 1, f"built html: embedded {vid}js block does not match src/{name}"
        out_t = (out / name).read_text(encoding="utf-8")
        assert out_t == src_t, f"out/{name} differs from src/{name}"
    out_t = (out / "v47.js").read_text(encoding="utf-8")
    assert out_t == (src_dir / "v47.js").read_text(encoding="utf-8"), "out/v47.js differs from src/v47.js"
    # out-of-scope replacements absent
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"built index.html: out-of-scope marker {marker!r} present"
    _node_check(v47_js)
    for name in EDITED_SRC:
        _node_check(src_dir / name)
    # ship the build script itself with the deliverable (reproducibility)
    _copy_bytes_epersafe(HERE / "build_v47.py", out / "build_v47.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V19.2, layer V47 injected last")
    print("V47: C-R3-3 duplicate senses — devoted no-938 row deleted (data/src/out/index); 3 WORDS-only twins (a1a2_680/806/912) via the buildWords hook; headword distractor guard x9; pickPool headword dedupe; sense labels at 8 render sites")
    print("marker order OK: v47js last, v47js after v46js; out-of-scope markers absent; embedded blocks == src files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
