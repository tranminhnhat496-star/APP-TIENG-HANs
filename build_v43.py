#!/usr/bin/env python3
"""Build V18.8 (BOSS-FIGHT READABILITY) from the pristine V18.7 build + the V43 layer.

V18.8 = V18.7 (Unlock Shortcuts, layer V42) + layer V43 (src/v43.js +
src/v43.css) + the V18.8 title. NO src replacements: the fix is a
pure CSS layer, loaded LAST, so its rules win over the earlier layers
at the same specificity.

THE BUG (Anh's live report, 2026-11-20/21: Bosses section, laptop —
the fight question card is nearly unreadable, dark text on a dark
background). Measured in real Chrome 157 on the pristine V18.7 base
(tools/v43/repro/logs/r43-results.json):
  V19 fight, LIGHT theme (headless default = Anh's laptop theme):
    .v19qword #3A2E22 on #241b42 = 1.22:1 (needs 3:1, large text)
    .v19qcard .mute #7C6B58 on #241b42 = 3.13:1 (needs 4.5:1)
    boss name <b> #3A2E22 on the dark .v19fight panel = 1.12:1
    info .mute lines 2.89:1, hearts + HP label 1.12:1
    .v19opt buttons #fff on #2e2454 = 14.03:1 — PASS, they were
    never the failing part (the card + top bar were).
  V19 fight, DARK theme: everything passes (qword 13.48:1, mute
  6.67:1) — the bug is light-theme-only, which is why it showed
  on the laptop and not on a dark-themed phone.
  ROOT CAUSE: the V19 fight panel is FIXED dark (.v19fight
  rgba(24,18,48,.92), .v19qcard #241b42, .v19passage/.v19explain
  #1c1533) but its text INHERITS the theme ink/mute — .v19qword
  sets size/weight but NO colour, and .mute has no colour in the
  fight context. In the light theme those are DARK (--ink #3A2E22,
  --mute #7C6B58): dark-on-dark. In the dark theme they are light:
  light-on-dark, fine. V24 (V15.1, WCAG AA on 14 screens) never
  covered these fight cards.
  V18 fight: theme-var-driven, so its Q&A passes in both themes —
  but its warn banner (dark ink on fixed #4a2b00), feedback line
  (var(--ok)/var(--bad) 3.48/3.99:1 on the light card) and the V34
  break bar fail in the light theme; the V19 bad-state feedback
  line fails too (4.29:1). Both engines share the disabled pet
  team-skill button: opacity .45 over the dark bar blends to
  dark-on-dark 1.5:1 in BOTH themes (opacity alone can never fix
  it — text and background fade together).

THE FIX (src/v43.css, all scoped to .v18fight / .v19fight /
.v23bar-fight — no other screen touched, NOT the stopped V28
Boss UI project):
  V19: explicit #fff on qword / boss name / HP+hearts / opts,
    --ui-text-muted-dark #C4B9E2 on the .mute lines (8.69:1 on
    #241b42), #E5DEF5 on passage text, bad-state feedback
    overridden to #FF8A78 (the dark theme's own --bad value),
    phase chip darkened (#5B3FD4), element/rarity chips darkened
    (colour-mix 45% --ec + black).
  V18: the theme pair pinned explicitly (qword/info/opts/passage
    = var(--ink), .mute = var(--mute)), warn banner gold #FFE066,
    feedback lines overridden in the light theme to the darker
    original --ok/--bad (#1B7F5A/#C23A30) with dark-theme
    restorations, phase chip stops darkened, V34 break label/chip
    fixed for the light card, element chips same as V19.
  Pet bar: disabled skill button gets a muted solid gold-grey
    background (#6E5F3E) + #FFF8E1 text at full opacity (5.94:1)
    — it still reads as disabled, just legibly.
  No fight logic, reward, XP, SRS, pet or save change; no layout
  change; dark fight cards stay dark.

WHAT THIS SCRIPT DOES (in order):
  0. Backs up out/index.html (from the hash-verified pristine copy
     tools/v43/pristine-v18.7-out/) into tools/v43/backup-v18.7/.
     The layer files src/v43.js / src/v43.css are new (no prior
     version to back up); copies of them are kept in the backup
     dir for the record.
  1. Verifies the base is the pristine V18.7 build (hash + v42
     markers present, v43 markers absent). REFUSES otherwise.
  2. Validates the V43 layer itself (no </script> in v43.js,
     VERSION='18.8.0', __v43 export, no localStorage, no window.S,
     v43.css non-empty).
  3. Copies the layer files into out/.
  4. Assembles the new index.html: the V18.8 title + the V43
     layer injection (style v43 + script v43js, LAST, before
     </body>).
  5. Verifies: marker order (v43 last), v43 version 18.8.0,
     node --check on v43.js, old versions intact, V33–V42
     fragments still present, V43 fragments present with exact
     counts, deliberately-unchanged items (legDiff, C-R2-1) intact,
     out-of-scope markers absent.

RUN EXACTLY ONCE on a fresh V18.7 out/. NEVER re-run build_v33.py
/ build_v34.py / ... / build_v42.py (or any older build script) on
a finished build (they reorder layers — see the V32 skill notes).

Usage:  python3 build_v43.py [--out DIR] [--src DIR]
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

# Pristine V18.7 out/index.html (2,412,801 B) — verified before any edit.
V187_HASH = "9d4a113b72898718c3f1fbb184652a90a58b86a1696353117afadd7f239a9dd2"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V18.7 — Unlock Shortcuts — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V18.8 — Boss-Fight Readability — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

# V43 markers: must be ABSENT from the pristine V18.7 base, present after.
V43_MARKERS = [
    'id="v43"', 'id="v43js"', '__v43', "VERSION='18.8.0'",
]

# Distinctive strings that exist ONLY in work V43 does NOT do
# (copied verbatim from build_v41.py — the base must not have moved).
OUT_OF_SCOPE_MARKERS = _b41.OUT_OF_SCOPE_MARKERS


# --- helpers (EPERM-safe pattern from build_v41.py / build_v42.py) ---
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
    tmp = pathlib.Path(dst).with_name(pathlib.Path(dst).name + ".tmp43")
    with open(tmp, "wb", buffering=0) as f:
        for off in range(0, len(data), 8192):
            _wsmall(f, data[off:off + 8192])
    os.rename(tmp, dst)
    assert hashlib.sha256(pathlib.Path(dst).read_bytes()).hexdigest() == hashlib.sha256(data).hexdigest(), f"backup copy mismatch: {dst}"


def _write_text_epersafe(path, text):
    """Write text to path via tmp file + atomic rename (EPERM-safe)."""
    tmp_path = path.with_name(path.name + ".tmp43")
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
    pristine = ROOT / "tools" / "v43" / "pristine-v18.7-out"
    v43_js = src_dir / "v43.js"
    v43_css = src_dir / "v43.css"
    assert v43_js.exists() and v43_css.exists(), "src/v43.js / src/v43.css missing"
    assert pristine.is_dir(), "tools/v43/pristine-v18.7-out missing — the hash-verified V18.7 backup source"

    # --- 0. Back up out/index.html (from the pristine copy, verified
    # byte-identical to the live out/) + record copies of the new
    # layer files into tools/v43/backup-v18.7/. ---
    backup = ROOT / "tools" / "v43" / "backup-v18.7"
    backup.mkdir(parents=True, exist_ok=True)
    live = out / "index.html"
    src_copy = pristine / "index.html"
    assert live.exists(), "out/index.html missing"
    assert src_copy.exists(), "pristine-v18.7-out/index.html missing"
    assert _sha256(live) == _sha256(src_copy), (
        "out/index.html differs from the pristine copy — refusing to build on a moved tree")
    _copy_bytes_epersafe(src_copy, backup / "out__index.html")
    _copy_bytes_epersafe(v43_js, backup / "src__v43.js")
    _copy_bytes_epersafe(v43_css, backup / "src__v43.css")
    print(f"backup OK: out/index.html + new layer files recorded in {backup}")

    # --- 1. Verify the base is pristine V18.7 ---
    index = out / "index.html"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V187_HASH, f"base is not pristine V18.7: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v42"' in built and 'id="v42js"' in built, "V42 markers missing — not a V18.7 build"
    for m in V43_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V18.7 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    print(f"verified pristine V18.7 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v42 markers present, v43 absent")

    # --- 2. Validate the V43 layer itself ---
    v43_js_t = v43_js.read_text(encoding="utf-8")
    v43_css_t = v43_css.read_text(encoding="utf-8")
    assert "</script>" not in v43_js_t.lower(), "v43.js contains </script>"
    assert "VERSION='18.8.0'" in v43_js_t and "__v43" in v43_js_t, "v43.js must expose __v43 18.8.0"
    _stripped = _re.sub(r"/\*.*?\*/", "", v43_js_t, flags=_re.S)
    _stripped = _re.sub(r"//[^\n]*", "", _stripped)
    assert "window.S" not in _stripped, "v43.js must never use window.S (lexical let)"
    assert "localStorage" not in v43_js_t, "v43.js must not touch localStorage (no new key/schema)"
    assert v43_css_t.strip(), "v43.css is empty"
    assert "</style>" not in v43_css_t.lower(), "v43.css contains </style>"
    print(f"validated src/v43.js ({len(v43_js_t)} chars) + src/v43.css ({len(v43_css_t)} chars)")

    # --- 3. Copy the layer files into out/ ---
    _copy_bytes_epersafe(v43_js, out / "v43.js")
    _copy_bytes_epersafe(v43_css, out / "v43.css")

    # --- 4. Assemble the new index.html: title + V43 layer ---
    edits = []
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V18.7 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # V43 layer, LAST, before </body>
    # rfind, NOT find: see the v37.css "</body>" comment trap (build_v41.py).
    body = orig_bytes.rfind(b"</body>")
    assert body != -1, "no </body> in index.html"
    assert body > orig_bytes.rfind(b'id="v42js"'), "injection point is before v42js - wrong </body>"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v43">\n'),
        ("file", v43_css),
        ("glue", b'\n</style>\n<script id="v43js">\n'),
        ("file", v43_js),
        ("glue", b'\n</script>\n'),
    ]})
    _assemble_index(index, edits)

    # --- 5. Verify the assembled file ---
    built = index.read_text(encoding="utf-8")
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V18.8 title missing / V18.7 title remains"
    assert "window.__v43" in built and "VERSION='18.8.0'" in built, "built index.html missing __v43 18.8.0"
    # v43 markers are the LAST style/script markers before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v43", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v43", f"script marker order wrong: {script_ids}"
    assert built.find('id="v43js"') > built.find('id="v42js"'), "v43js is not after v42js"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0", "17.0.0", "17.1.0", "18.0.0", "18.1.0", "18.2.0", "18.3.0", "18.4.0", "18.5.0", "18.6.0", "18.7.0"):
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
    # V42 fragments present (exact counts, from build_v42.py §5)
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
    # V43 fragments present (exact counts)
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
    # Deliberately UNCHANGED by V43 (needs Anh's decision): legDiff's
    # counts-getter bug stays exactly as it was in V18.5/V18.6/V18.7.
    assert built.count("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}") == 1, "built html: legDiff changed (out of scope for V18.8)"
    # Deliberately UNCHANGED by V43: C-R2-1 (markKO/markKO19 pay no XP).
    assert built.count("/* V39 (V18.4): KO boss answers also feed Smart Learning (V27) —") == 2, "built html: markKO/markKO19 changed (C-R2-1 is out of scope for V18.8)"
    # KO entry buttons unchanged.
    assert built.count('<button class="tab v35kotab"') == 1, "built index.html: KO v35kotab button changed"
    assert built.count('<button class="tab v33kotab"') == 1, "built index.html: KO v33kotab button changed"
    # out-of-scope replacements absent
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"built index.html: out-of-scope marker {marker!r} present"
    _node_check(v43_js)
    # ship the build script itself with the deliverable (reproducibility)
    _copy_bytes_epersafe(HERE / "build_v43.py", out / "build_v43.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V18.8, layer V43 injected last")
    print("V43: Boss-Fight Readability — CSS-only layer, no src replacements, no logic/schema change")
    print("marker order OK: v43 last (styles + scripts), v43js after v42js; KO tabs line unchanged; out-of-scope markers absent; C-R2-1 + legDiff untouched")
    return 0


if __name__ == "__main__":
    sys.exit(main())
