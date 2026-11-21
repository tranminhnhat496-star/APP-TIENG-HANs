#!/usr/bin/env python3
"""Build V19.0 (ROUND-3 BUG FIXES) from the pristine V18.9 build + the V45 layer.

V19.0 = V18.9 (Legendary Freeze Fix, layer V44) + layer V45.
Bug-fix build ONLY — no new features, no schema change, no new save key.

THE FIXES (repro-first on the pristine V18.9 base; repro evidence in
tools/v45/repro-v45.js — 30/30 bugs reproduced in Node vm — and in the
Chrome driver tools/v45/verify-v45c.js run against the pristine base,
15/39 PASS with every fix gate FAILING as expected):

  1. C-R3-1 MAJOR — never-learned words counted as "due".
     Every due counter used `(due||0)<=now` with no box filter, so a
     fresh player was told 4,889 words "need review today", the Review
     tab could never show "no words due", and Review sessions taught
     brand-new words under the "review" label. Smart Learning already
     did it correctly (v27 classifyEN/KO: box>=1&&box<=4&&due<=now).
     FIX (src/v15.js, v17.js, v22.js, v25.js, v27.js, v34.js): due now
     means box 1-4 AND due<=now, everywhere — counts15, dueTodayCount,
     reviewHTML/reviewStart, wordsFiltered onlyDue + BT status filters,
     v17 statsOf/filterWords, v22 unitStats/filterEntries, v25 statsOf,
     v34 statsForList, v27 dashboard dueN (EN + KO). Box 5 (mastered)
     is deliberately EXCLUDED: mastered words are "da thuoc" (shown
     separately); V27 classifies them MASTERED even past due, and the
     dashboard dueN now uses the same 1-4 range so all counters agree.
     Review with 0 truly-due words shows the honest empty pop — it does
     NOT fall back to all words (pickPool's silent fallback is the trap
     that hid this bug; reviewStart never used pickPool, but the empty
     list could never occur while box-0 words counted as due).
  2. C-R3-2 SEVERE — corrupt / card-less save silently destroyed.
     load() (index-only, V6 core) returned a fresh sample on any parse
     failure / missing cards, and boot-time dailyLogin()->save()
     overwrote the original bytes — no warning, no backup holding them.
     FIX (index-only): on parse failure or missing cards, the raw bytes
     are quarantined FIRST under hanvocab.v12.corrupt-<ms>-<n>-<rand>
     (unique key, never overwritten by a later boot) and
     window.__V45_CORRUPT is set; src/v45.js (running last) shows the
     honest warning toast. First boot (no save stored) is never
     quarantined. Valid saves boot exactly as before.
  3. C-R3-4 MINOR — snapshotCurrent() keys collided in the same ms.
     FIX (src/v31.js): key is now preimport-<ms>-<counter>-<random>;
     the leading ms number is kept so newestPreRestoreKey()'s parseInt
     still resolves the newest snapshot.
  4. NEW-1 MINOR — 20 topic icons rendered as assets/icons/v6/undefined.
     pushV17IntoV14() builds the 19 A1-A2 topics + Oxford with no icon
     field, and topicsHTML() called enIcon(t.icon) with no fallback.
     FIX (index-only, minimal, NO art choice): enIcon() emits no <img>
     when there is no icon. No icon is invented or assigned; the card
     keeps its name/counts. (The BT topic, also icon-less, is covered
     by the same guard.)
  5. .v34weakchip in boss LIST rows — CSS-only contrast fix
     (Claude-directed DO, same problem V18.8 fixed on the fight screen).
     FIX (src/v45.css, new layer): explicit dark-amber text/border on a
     pale amber wash in the light theme (the V18.8 fight colours);
     gold text kept in the dark theme, following the V43 theme pattern
     (dark override inside @media (prefers-color-scheme:dark) with
     :not([data-theme="light"]), plus :root[data-theme="dark"] — a bare
     :not() outside the media query would wrongly match a light theme
     with no data-theme attribute). Fight-screen rules in v43 stay more
     specific and are untouched. Measured in real Chrome 157: light
     list rows 1.33:1 -> ~5.9:1; dark stays 8.69:1.
  6. Leads fixed with vm repros (same build, no decision needed):
     restoreRaw() size-checks BEFORE parsing (a >10 MB file was parsed
     into memory first); speedHatch() checks remaining time BEFORE
     spending gems (a ready hatch still charged 5 gems); 
     deleteHistoryEntry() deletes ONE same-ms entry, not all of them.

DELIBERATELY NOT FIXED HERE (pending decisions — reported, not hidden):
  - C-R3-3: A1-A2 raw data has 4 duplicate headwords with DISTINCT
    senses (sluggish/orange/trip/devoted). Dedup would lose one real
    sense each for orange/trip. Same class as round-2 F4 — DECISION.
  - legDiff scaling + weakness table + KO boss 0 XP: Claude decided DO,
    but they go into the SEPARATE follow-up V19.0.1 (layer V46) AFTER
    V19.0 — NOT folded into this build. legDiff's definition and the
    markKO/markKO19 XP behaviour are asserted UNCHANGED below.
  - All other 13 pass-B decision items, and the unreproduced leads
    (validateSave depth-6 scan, dayNo() timezone edge, farmBuy silent
    return, Chrono overlay DOM leftover) — listed in the changelog.

WHAT THIS SCRIPT DOES (in order):
  0. Backs up the pristine out/index.html + the pre-fix standalone
     src files (from tools/v45/pristine-v18.9-out/) + the new layer
     files into tools/v45/backup-v18.9/.
  1. Verifies the base is the pristine V18.9 build (hash + v44 markers
     present, v45 markers absent). REFUSES otherwise.
  2. Validates the V45 layer itself: every edited src file carries its
     NEW fragments and no longer carries its OLD fragments; the new
     layer files (v45.js/v45.css) are well-formed.
  3. Copies the edited src files + the new layer files into out/.
  4. Assembles the new index.html: the V19.0 title + wholesale sync of
     each edited embedded script block with its src file (the old
     embedded block must equal the pristine standalone file, asserted
     byte-for-byte) + the two index-only replacements (load(),
     enIcon()) + the V45 layer injection (style v45 + script v45js,
     LAST, before </body>).
  5. Verifies: marker order (v45 style/script last), v45 version
     19.0.0, node --check on v45.js, old versions intact, V33–V44
     fragments still present, V45 fragments present with exact counts,
     the OLD due lines / OLD load() / OLD enIcon() / OLD snapshot key
     GONE, legDiff + C-R2-1 deliberately UNCHANGED, embedded blocks
     byte-identical to their src files, out-of-scope markers absent.

RUN EXACTLY ONCE on a fresh V18.9 out/. NEVER re-run build_v33.py
/ build_v34.py / ... / build_v44.py (or any older build script) on
a finished build (they reorder layers — see the V32 skill notes).

Usage:  python3 build_v45.py [--out DIR] [--src DIR]
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

# Pristine V18.9 out/index.html (2,423,227 B) — verified before any edit.
V189_HASH = "1c409217a6511839fb2a5dfdcffda33c2adc6101116480f7d5f3b1b9229f0bdd"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V18.9 — Legendary Freeze Fix — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V19.0 — Round-3 Bug Fixes — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# V45 markers: must be ABSENT from the pristine V18.9 base, present after.
V45_MARKERS = [
    'id="v45"', 'id="v45js"', '__v45', "VERSION='19.0.0'",
]

# Distinctive strings that exist ONLY in work V45 does NOT do
# (copied verbatim from build_v41.py — the base must not have moved).
OUT_OF_SCOPE_MARKERS = _b41.OUT_OF_SCOPE_MARKERS

# src files edited by V45 (embedded blocks are synced wholesale).
EDITED_SRC = ["v15.js", "v17.js", "v22.js", "v25.js", "v27.js", "v34.js", "v31.js", "v23.js"]

# --- NEW fragments (must be present in each edited src file + built html) ---
# C-R3-1 due definition (one per file, each unique in its file).
NEW_DUE = {
    "v15.js": [
        "if(b>=1&&b<=4&&(e.due[w.id]||0)<=now)c.due++;",
        "if(sc.status==='due'&&((old2.box[w.id]||0)<1||(old2.box[w.id]||0)>4||(e2.due[w.id]||0)>Date.now()))return false;",
        "if(sc.status==='due'&&((old.box[w.id]||0)<1||(old.box[w.id]||0)>4||(e.due[w.id]||0)>Date.now()))return false;",
        "if(o.onlyDue){var _b45=(old.box[w.id]||0);if(_b45<1||_b45>4||(e.due[w.id]||0)>Date.now())return false}",
        "/* V45 (V19.0, C-R3-1): \"due\" means box 1-4 AND due<=now",
        "var due=WORDS.filter(function(w){var _b45=(_o45.box[w.id]||0);return inScope15(w)&&_b45>=1&&_b45<=4&&(e.due[w.id]||0)<=now});",
        "else list=WORDS.filter(function(w){var _b45=(_o45.box[w.id]||0);return inScope15(w)&&_b45>=1&&_b45<=4&&(e.due[w.id]||0)<=now});",
    ],
    "v17.js": [
        "if(b>=1&&b<=4&&(e.due[w.id]||0)<=now)s.due++;",
        "if(V.status==='due'&&(b<1||b>4||(e.due[w.id]||0)>now))return false;",
    ],
    "v22.js": [
        "if(b>=1&&b<=4&&((v.en15().due)||{})[w.id]<=now)s.due++;",
        "if(ST.status==='due'&&w&&(b<1||b>4||(dueMap[w.id]||0)>now))return false;",
    ],
    "v25.js": [
        "if(b>=1&&b<=4&&dueOf(w.id)<=now)s.due++;",
    ],
    "v27.js": [
        "if(c.box>=1&&c.box<=4&&c.due<=now)dueN++;",
        "if(cc.box>=1&&cc.box<=4&&cc.due<=now)dueN++;",
    ],
    "v34.js": [
        "if(b>=1&&b<=4&&(due[w.id]||0)<=now)s.due++;",
    ],
}
# OLD due lines (must be GONE from each edited src file + built html).
OLD_DUE = {
    "v15.js": [
        "if((e.due[w.id]||0)<=now)c.due++;",
        "if(sc.status==='due'&&(e2.due[w.id]||0)>Date.now())return false;",
        "if(sc.status==='due'&&(e.due[w.id]||0)>Date.now())return false;",
        "if(o.onlyDue){var due=e.due[w.id]||0;if(due>Date.now())return false}",
        "WORDS.forEach(function(w){if((e.due[w.id]||0)<=now)n++});",
        "var due=WORDS.filter(function(w){return inScope15(w)&&(e.due[w.id]||0)<=now});",
        "else list=WORDS.filter(function(w){return inScope15(w)&&(e.due[w.id]||0)<=now});",
    ],
    "v17.js": [
        "if((e.due[w.id]||0)<=now)s.due++;",
        "if(V.status==='due'&&(e.due[w.id]||0)>now)return false;",
    ],
    "v22.js": [
        "if(((v.en15().due)||{})[w.id]<=now)s.due++;",
        "if(ST.status==='due'&&w&&(dueMap[w.id]||0)>now)return false;",
    ],
    "v25.js": [
        "if(dueOf(w.id)<=now)s.due++;",
    ],
    "v27.js": [
        "if(c.box>=1&&c.due<=now)dueN++;",
        "if(cc.box>=1&&cc.due<=now)dueN++;",
    ],
    "v34.js": [
        "if((due[w.id]||0)<=now)s.due++;",
    ],
}
# C-R3-4 / leads (v31.js) + speedHatch (v23.js).
NEW_V31 = [
    "var _snapSeq45=0;",
    "var k='hanvocab.v12.preimport-'+Date.now()+'-'+(++_snapSeq45)+'-'+Math.random().toString(36).slice(2,8);",
    "/* V45 (V19.0, lead): size-check BEFORE parsing",
    "h=h.filter(function(e){ if(!removed&&e.at===at){removed=true;return false} return true; });",
]
OLD_V31 = [
    "var k='hanvocab.v12.preimport-'+Date.now();",
    "var h=readHistory().filter(function(e){ return e.at!==at; });",
]
NEW_V23 = [
    "if((e.hatch.endsAt||0)<=Date.now())return{ok:false,msg:'Trứng đã ấp xong — nhận thú cưng ngay!'};",
]

# --- index-only replacements (V6 core has no src file) ---
LOAD_OLD = "function load(){try{const j=JSON.parse(localStorage.getItem(KEY));if(j&&j.cards){/* V41 (F1): default S.opt — a stored save without opt threw TypeError (reading 'group') in startSession on every boot and left #app empty; defaulting here covers both boot and validated import. */if(!j.opt)j.opt={mode:'card',dir:'kv',group:'',due:false};return j}}catch(e){}\n  return{cards:toCards(parseTable(SAMPLE)),opt:{mode:'card',dir:'kv',group:'',due:false}}}"
LOAD_NEW = """function load(){var _raw45=null,_reason45=null;try{_raw45=localStorage.getItem(KEY);const j=JSON.parse(_raw45);if(j&&j.cards){/* V41 (F1): default S.opt — a stored save without opt threw TypeError (reading 'group') in startSession on every boot and left #app empty; defaulting here covers both boot and validated import. */if(!j.opt)j.opt={mode:'card',dir:'kv',group:'',due:false};return j}_reason45='no-cards'}catch(e){if(_reason45===null)_reason45='bad-json'}
  /* V45 (V19.0, C-R3-2): a corrupt or card-less save used to be silently
     destroyed here — load() returned a fresh sample and boot-time
     dailyLogin()->save() overwrote the original bytes, with no warning
     and no backup holding them. Quarantine the raw bytes FIRST (unique
     key, never overwritten by a later boot) and flag it for the V45
     layer, which shows the user an honest warning. First boot (no save
     stored) has _raw45 null/empty and is never quarantined. */
  if(_raw45&&_reason45){try{var _qk45='hanvocab.v12.corrupt-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);localStorage.setItem(_qk45,_raw45);window.__V45_CORRUPT={key:_qk45,reason:_reason45,quarantined:true}}catch(_e45){try{window.__V45_CORRUPT={key:null,reason:_reason45,quarantined:false}}catch(_e452){}}}
  return{cards:toCards(parseTable(SAMPLE)),opt:{mode:'card',dir:'kv',group:'',due:false}}}"""
ENICON_OLD = "function enIcon(name){ return '<img src=\"assets/icons/v6/'+name+'\" style=\"width:18px;height:18px;vertical-align:-4px\" alt=\"\">'; }"
ENICON_NEW = "function enIcon(name){ /* V45 (V19.0, NEW-1): no icon -> no <img> (was: assets/icons/v6/undefined). No icon is invented or assigned. */ if(!name)return ''; return '<img src=\"assets/icons/v6/'+name+'\" style=\"width:18px;height:18px;vertical-align:-4px\" alt=\"\">'; }"


# --- helpers (EPERM-safe pattern from build_v41.py / build_v42.py / build_v43.py / build_v44.py) ---
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
    tmp = pathlib.Path(dst).with_name(pathlib.Path(dst).name + ".tmp45")
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
    pristine = ROOT / "tools" / "v45" / "pristine-v18.9-out"
    v45_js = src_dir / "v45.js"
    v45_css = src_dir / "v45.css"
    assert v45_js.exists() and v45_css.exists(), "src/v45.js / src/v45.css missing"
    assert pristine.is_dir(), "tools/v45/pristine-v18.9-out missing — the hash-verified V18.9 backup source"

    # --- 0. Back up the pristine out/index.html + the pre-fix standalone
    # src files (from the pristine copy) + the new layer files into
    # tools/v45/backup-v18.9/. ---
    backup = ROOT / "tools" / "v45" / "backup-v18.9"
    backup.mkdir(parents=True, exist_ok=True)
    live = out / "index.html"
    src_copy = pristine / "index.html"
    assert live.exists(), "out/index.html missing"
    assert src_copy.exists(), "pristine-v18.9-out/index.html missing"
    assert _sha256(live) == _sha256(src_copy), (
        "out/index.html differs from the pristine copy — refusing to build on a moved tree")
    _copy_bytes_epersafe(src_copy, backup / "out__index.html")
    for name in EDITED_SRC:
        _copy_bytes_epersafe(pristine / name, backup / ("src__" + name + ".old"))
    _copy_bytes_epersafe(v45_js, backup / "src__v45.js")
    _copy_bytes_epersafe(v45_css, backup / "src__v45.css")
    print(f"backup OK: out/index.html + {len(EDITED_SRC)} pre-fix src files + new layer files recorded in {backup}")

    # --- 1. Verify the base is pristine V18.9 ---
    index = out / "index.html"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V189_HASH, f"base is not pristine V18.9: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v43"' in built and 'id="v44js"' in built, "V43/V44 markers missing — not a V18.9 build (style ids end v43, script ids end v44 — V44 was JS-only)"
    for m in V45_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V18.9 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    assert built.count(LOAD_OLD) == 1, "pre-fix load() not found exactly once in base"
    assert built.count(ENICON_OLD) == 1, "pre-fix enIcon() not found exactly once in base"
    # Each edited embedded script block must equal its pristine standalone file.
    for name in EDITED_SRC:
        vid = name[:-3]  # 'v15.js' -> 'v15'
        old_src = (pristine / name).read_text(encoding="utf-8")
        pat = '<script id="%sjs">\n%s\n</script>' % (vid, old_src)
        assert built.count(pat) == 1, f"embedded {vid}js block does not match pristine {name} exactly once"
    print(f"verified pristine V18.9 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v44 markers present, v45 absent")

    # --- 2. Validate the V45 layer itself ---
    # Each edited src file carries its NEW fragments and none of its OLD ones.
    for name in EDITED_SRC:
        t = (src_dir / name).read_text(encoding="utf-8")
        for frag in NEW_DUE.get(name, []):
            assert frag in t, f"src/{name} missing NEW fragment: {frag[:70]}"
        for frag in OLD_DUE.get(name, []):
            assert frag not in t, f"src/{name} still has OLD fragment: {frag[:70]}"
    v31_t = (src_dir / "v31.js").read_text(encoding="utf-8")
    for frag in NEW_V31:
        assert frag in v31_t, f"src/v31.js missing NEW fragment: {frag[:70]}"
    for frag in OLD_V31:
        assert frag not in v31_t, f"src/v31.js still has OLD fragment: {frag[:70]}"
    # The restoreRaw size check now precedes the JSON.parse.
    assert v31_t.index("reason:'file-too-large'") < v31_t.index("j=JSON.parse(raw)"), "src/v31.js: restoreRaw size check is not before JSON.parse"
    v23_t = (src_dir / "v23.js").read_text(encoding="utf-8")
    for frag in NEW_V23:
        assert frag in v23_t, f"src/v23.js missing NEW fragment: {frag[:70]}"
    assert v23_t.index("Trứng đã ấp xong") < v23_t.index("spendGems23(H.speedGems"), "src/v23.js: speedHatch time check is not before the gem spend"
    # The pristine (old) standalone files must NOT carry the new fragments.
    for name in EDITED_SRC:
        old_t = (pristine / name).read_text(encoding="utf-8")
        for frag in NEW_DUE.get(name, []):
            assert frag not in old_t, f"pristine {name} already has NEW fragment (base moved?): {frag[:70]}"
    v45_js_t = v45_js.read_text(encoding="utf-8")
    assert "</script>" not in v45_js_t.lower(), "v45.js contains </script>"
    assert "VERSION='19.0.0'" in v45_js_t and "__v45" in v45_js_t, "v45.js must expose __v45 19.0.0"
    assert "__V45_CORRUPT" in v45_js_t and "__v45corruptShown" in v45_js_t, "v45.js must display the C-R3-2 quarantine warning"
    assert "_warn45" in v45_js_t, "v45.js must have the _warn45 helper (toast is closure-local in v7js, so the layer builds the .v7toast div itself)"
    assert "d.className='v7toast'" in v45_js_t, "v45.js _warn45 must build a .v7toast div directly when toast() is not global"
    _stripped = _re.sub(r"/\*.*?\*/", "", v45_js_t, flags=_re.S)
    _stripped = _re.sub(r"//[^\n]*", "", _stripped)
    assert "window.S" not in _stripped, "v45.js must never use window.S (lexical let)"
    assert "localStorage" not in v45_js_t, "v45.js must not touch localStorage (the quarantine happens in load(), before this layer runs)"
    v45_css_t = v45_css.read_text(encoding="utf-8")
    assert v45_css_t.strip(), "v45.css is empty"
    assert "</style>" not in v45_css_t.lower(), "v45.css contains </style>"
    assert ".v34weakchip{color:#7A5B00;border-color:#7A5B00;background:rgba(122,91,0,.08)}" in v45_css_t, "v45.css missing the light list-row weakchip rule"
    assert ".v19zboss .v34weakchip{color:var(--ui-title-gold,#FFD76A);border-color:var(--ui-border,#A78BFA);background:rgba(255,215,106,.08)}" in v45_css_t, "v45.css missing the v19zboss gold weakchip rule (dark zone cards in both themes)"
    assert ':root[data-theme="dark"] .v34weakchip{color:var(--ui-title-gold,#FFD76A)' in v45_css_t, "v45.css missing the dark list-row weakchip rule"
    print(f"validated src edits ({len(EDITED_SRC)} files: NEW fragments present, OLD fragments gone) + src/v45.js ({len(v45_js_t)} chars) + src/v45.css ({len(v45_css_t)} chars)")

    # --- 3. Copy the edited src files + the new layer files into out/ ---
    for name in EDITED_SRC:
        _copy_bytes_epersafe(src_dir / name, out / name)
    _copy_bytes_epersafe(v45_js, out / "v45.js")
    _copy_bytes_epersafe(v45_css, out / "v45.css")

    # --- 4. Assemble the new index.html ---
    edits = []
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V18.9 title not found exactly once"
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
    # index-only: load() quarantine (C-R3-2)
    l_old = LOAD_OLD.encode("utf-8")
    l0 = orig_bytes.find(l_old)
    assert l0 != -1 and orig_bytes.count(l_old) == 1, "index.html: pre-fix load() not found exactly once"
    edits.append({"start": l0, "end": l0 + len(l_old),
                  "chunks": [("glue", LOAD_NEW.encode("utf-8"))]})
    # index-only: enIcon() guard (NEW-1)
    e_old = ENICON_OLD.encode("utf-8")
    e0 = orig_bytes.find(e_old)
    assert e0 != -1 and orig_bytes.count(e_old) == 1, "index.html: pre-fix enIcon() not found exactly once"
    edits.append({"start": e0, "end": e0 + len(e_old),
                  "chunks": [("glue", ENICON_NEW.encode("utf-8"))]})
    # V45 layer, LAST, before </body> (style + script together, V43 pattern)
    # rfind, NOT find: see the v37.css "</body>" comment trap (build_v41.py).
    body = orig_bytes.rfind(b"</body>")
    assert body != -1, "no </body> in index.html"
    assert body > orig_bytes.rfind(b'id="v44js"'), "injection point is before v44js - wrong </body>"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v45">\n'),
        ("file", v45_css),
        ("glue", b'\n</style>\n<script id="v45js">\n'),
        ("file", v45_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 5. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V19.0 title missing / V18.9 title remains"
    assert "window.__v45" in built and "VERSION='19.0.0'" in built, "built index.html missing __v45 19.0.0"
    # v45 markers are the LAST style/script markers before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v45", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v45", f"script marker order wrong: {script_ids}"
    assert built.find('id="v45js"') > built.find('id="v44js"'), "v45js is not after v44js"
    assert built.find('id="v45"') > built.find('id="v43"'), "v45 style is not after v43"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0", "17.0.0", "17.1.0", "18.0.0", "18.1.0", "18.2.0", "18.3.0", "18.4.0", "18.5.0", "18.6.0", "18.7.0", "18.8.0", "18.9.0"):
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
    # V44 fragments present (exact counts, from build_v44.py §5)
    assert built.count('id="v44js"') == 1, "built html: v44js script marker missing"
    assert built.count("window.__v44={version:VERSION}") == 1, "built html: __v44 export missing"
    assert built.count("var lv=b.arena==='leg'?legDiff():null;") == 2, "built html: hoisted legDiff() present %dx, expected 2 (wordPool + grammarPool)" % built.count("var lv=b.arena==='leg'?legDiff():null;")
    assert built.count("if(b.arena==='leg'){if(lv.indexOf(w.lv)<0)return false}") == 1, "built html: hoisted wordPool filter line missing"
    assert built.count("return b.arena==='leg'?lv.indexOf(x.lv)>=0:x.lv===b.diff") == 1, "built html: hoisted grammarPool filter line missing"
    assert built.count("/* V44 (V18.9): legDiff() was called once PER WORD inside this filter") == 1, "built html: V44 wordPool comment missing"
    assert built.count("/* V44 (V18.9): same hoist as wordPool") == 1, "built html: V44 grammarPool comment missing"
    # V45 fragments present (exact counts)
    assert built.count('id="v45"') == 1, "built html: v45 style marker missing"
    assert built.count('id="v45js"') == 1, "built html: v45js script marker missing"
    assert built.count("window.__v45={version:VERSION}") == 1, "built html: __v45 export missing"
    assert built.count("VERSION='19.0.0'") == 1, "built html: __v45 19.0.0 version missing"
    # C-R3-1: every NEW due fragment present, every OLD due line gone.
    for name, frags in NEW_DUE.items():
        for frag in frags:
            assert built.count(frag) >= 1, f"built html: NEW due fragment missing ({name}): {frag[:70]}"
    for name, frags in OLD_DUE.items():
        for frag in frags:
            assert frag not in built, f"built html: OLD due line still present ({name}): {frag[:70]}"
    for frag in NEW_V31:
        assert frag in built, f"built html: NEW v31 fragment missing: {frag[:70]}"
    for frag in OLD_V31:
        assert frag not in built, f"built html: OLD v31 fragment still present: {frag[:70]}"
    for frag in NEW_V23:
        assert frag in built, f"built html: NEW v23 fragment missing: {frag[:70]}"
    # C-R3-2: new load() present, old load() gone; quarantine key + flag present.
    assert built.count(LOAD_OLD) == 0, "built html: old load() still present"
    assert built.count("hanvocab.v12.corrupt-") == 2, f"built html: quarantine key pattern present {built.count('hanvocab.v12.corrupt-')}x, expected 2 (load() + v45.js comment)"
    assert built.count("window.__V45_CORRUPT") == 5, f"built html: __V45_CORRUPT present {built.count('window.__V45_CORRUPT')}x, expected 5 (load() x2 + v45.js code x1 + v45.js comments x2)"
    assert built.count("__v45corruptShown") == 2, f"built html: __v45corruptShown present {built.count('__v45corruptShown')}x, expected 2"
    assert built.count("Không đọc được bản lưu cũ") == 2, "built html: corrupt-save warning copy missing (expected 2: quarantined msg + not-quarantined msg)"
    # NEW-1: new enIcon() present, old gone; topicsHTML still calls enIcon(t.icon).
    assert built.count(ENICON_OLD) == 0, "built html: old enIcon() still present"
    assert built.count("if(!name)return '';") == 1, "built html: enIcon() falsy guard missing"
    assert built.count("enIcon(t.icon)") == 1, "built html: topicsHTML enIcon(t.icon) call site missing"
    # weakchip: v45 list-row rules present (light x1 + dark x2), V43 fight rules untouched.
    assert built.count(".v34weakchip{color:#7A5B00;border-color:#7A5B00;background:rgba(122,91,0,.08)}") == 2, f"built html: weakchip #7A5B00 rule present {built.count('.v34weakchip{color:#7A5B00;border-color:#7A5B00;background:rgba(122,91,0,.08)}')}x, expected 2 (v43 fight + v45 list)"
    assert built.count('.v34weakchip{color:var(--ui-title-gold,#FFD76A);border-color:var(--ui-border,#A78BFA);background:rgba(255,215,106,.08)}') == 5, "built html: weakchip dark rule != 5 (v43 fight media + v43 fight data-theme + v45 media + v45 data-theme + v45 v19zboss)"
    assert built.count('.v19zboss .v34weakchip{color:var(--ui-title-gold,#FFD76A);border-color:var(--ui-border,#A78BFA);background:rgba(255,215,106,.08)}') == 1, "built html: weakchip v19zboss gold rule missing (dark zone cards need gold in both themes)"
    assert built.count(':root[data-theme="dark"] .v34weakchip') == 1, "built html: weakchip data-theme dark rule != 1"
    assert built.count(".v18fight .v34weakchip{color:#7A5B00;border-color:#7A5B00;background:rgba(122,91,0,.08)}") == 1, "built html: V43 V18 fight weakchip rule changed"
    assert built.count(".v18fight .v34weakchip{color:var(--ui-title-gold,#FFD76A);border-color:var(--ui-border,#A78BFA);background:rgba(255,215,106,.08)}") == 2, "built html: V43 V18 dark fight weakchip rules changed (expected 2: media + data-theme)"
    # Deliberately UNCHANGED by V45: legDiff's definition + thresholds
    # (the getter-call latent bug stays exactly as it was — see header).
    assert built.count("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}if(m<200)return ['A2','B1'];if(m<600)return ['B1'];return ['B2']}") == 1, "built html: legDiff definition/thresholds changed (out of scope for V19.0 — V19.0.1)"
    assert built.count("legDiff") == 16, f"built html: legDiff occurrences {built.count('legDiff')}, expected 16 (15 in base + 1 in the v45.js header comment naming the V19.0.1 follow-up)"
    # Deliberately UNCHANGED by V45: C-R2-1 (markKO/markKO19 pay no XP).
    assert built.count("/* V39 (V18.4): KO boss answers also feed Smart Learning (V27) —") == 2, "built html: markKO/markKO19 changed (C-R2-1 is out of scope for V19.0 — V19.0.1)"
    # KO entry buttons unchanged.
    assert built.count('<button class="tab v35kotab"') == 1, "built index.html: KO v35kotab button changed"
    assert built.count('<button class="tab v33kotab"') == 1, "built index.html: KO v33kotab button changed"
    # Embedded blocks are byte-identical to their src files (sync guarantee).
    for name in EDITED_SRC:
        vid = name[:-3]
        src_t = (src_dir / name).read_text(encoding="utf-8")
        pat = '<script id="%sjs">\n%s\n</script>' % (vid, src_t)
        assert built.count(pat) == 1, f"built html: embedded {vid}js block does not match src/{name}"
        out_t = (out / name).read_text(encoding="utf-8")
        assert out_t == src_t, f"out/{name} differs from src/{name}"
    # out-of-scope replacements absent
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"built index.html: out-of-scope marker {marker!r} present"
    _node_check(v45_js)
    for name in EDITED_SRC:
        _node_check(src_dir / name)
    # ship the build script itself with the deliverable (reproducibility)
    _copy_bytes_epersafe(HERE / "build_v45.py", out / "build_v45.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V19.0, layer V45 injected last")
    print("V45: C-R3-1 due=box1-4, C-R3-2 corrupt quarantine + warning, C-R3-4 snapshot keys, NEW-1 enIcon guard, weakchip list rows, 3 leads; legDiff + C-R2-1 untouched")
    print("marker order OK: v45 style/script last, v45js after v44js; KO tabs unchanged; out-of-scope markers absent; embedded blocks == src files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
