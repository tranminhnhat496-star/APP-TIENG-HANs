#!/usr/bin/env python3
"""Build V18.4 (KOREAN BOSSES) from the pristine V18.3 build + the V39 layer.

V18.4 = V18.3 (Boss Word Sets, layer V38) + layer V39 (src/v39.js + src/v39.css)
+ 11 guarded build-script replacements (see REPLACEMENTS below) + the
v18_data.js lang flip (20 bosses, line-scoped, see _flip_v18data_lang).

THE BUG (reported by Anh: "phần bosses ko có tiếng Hàn", diagnosed from
source, reproduced in real Chrome 157 with tools/v39/repro-v39.js BEFORE
this build):
  The Bosses tab (V10 arenas, v18.js) had no Korean: only the 10 Elemental
  bosses carried lang:'both' (the EN/KO pick screen); the 10 English
  Challenge bosses and the 10 Legendary bosses were lang:'en' and started
  English fights directly, even though the fight engine already maps
  grammar/builder/read/speak modes to Korean multiple choice when
  F.lang==='ko'. The Boss Map (V19 UCE) had KO fights, but both engines
  silently fell back to English questions when the KO pool held <8 cards
  — V19 showed a warning banner, V18 showed none. And KO boss answers
  never reached Smart Learning: markKO/markKO19 only touched koStats,
  while recordAnswer('ko',...) in v27.js fully supports the 'ko' branch
  (right/wrong/cw/cr/last).

THE FIX (no engine/fight/SRS/data change, no schema change):
  R-V39-V18DATA-LANG (flip, not in REPLACEMENTS): v18_data.js
    lang:'en' -> lang:'both' for the 20 Challenge + Legendary bosses
    (only lines with arena:'en' or arena:'leg'). The 10 old-arena bosses
    keep lang:'en' — they redirect to the V6 boss flow untouched. The
    boss card language line updates automatically via the existing
    ternary in v18.js:206.
  R-V39-V18-KOCOUNT: v18.js gains koCount18() (koPool().length).
  R-V39-V18-BANNER: v18.js startFight() sets the <8 KO warning banner,
    mirroring V19's wording exactly. The fight is NOT blocked (V19
    precedent: banner + English fallback).
  R-V39-V18-MARKKO: markKO(ok) -> markKO(ok,k) + a guarded
    __v27.recordAnswer('ko', k.id, ok, 'boss18') before save18().
  R-V39-V18-CALL-TRUE/FALSE: both answer() call sites pass F.cur.k.
  R-V39-V18-COMMENT: header comment updated.
  R-V39-V19-MARKKO19: markKO19(ok) -> markKO19(ok,k) +
    recordAnswer('ko', k.id, ok, 'boss19').
  R-V39-V19-CALL-CA/TRUE/FALSE: all three answer() call sites pass
    F.cur.k (normal ok, normal wrong, Knowledge Counterattack path).
  R-V39-V19-COMMENT: header comment updated.
  Deliberately NOT changed: V18 wins stay FLAT (en18().bosses[id] =
  {win,wins,at,item} — a KO win counts as a win flat, like an EN win
  today; per-language V18 wins would be a schema change); the old
  arena; the region gates (GEAR GOLEM per language); the Chrono/Skyroot
  overlays (fightBoss() already calls v.setLang(lang) before v.fight(id),
  so a KO-overlay boss already fights in Korean — verified live, no fix
  needed); unlock chains (bossUnlocked/arenaWins read flat wins,
  language-agnostic); rewards/titles/XP; the weakness system
  (weakFor(b,'ko') already returns {kind:'ko'} for any boss).

WHAT THIS SCRIPT DOES (in order):
  0. Backs up every file it will touch into tools/v39/backup-v18.3/
     (src/ files have no other copy — the V18.3 ZIP only holds out/).
  1. Verifies the base is the pristine V18.3 build (hash + v38 markers
     present, v39 markers absent). REFUSES to run otherwise.
     PRE-PASS: every replacement anchor is checked (src files AND
     out/index.html) BEFORE any file is mutated; the v18_data.js flip
     is pre-checked the same way (exactly 20 lines flip, 10 old-arena
     lang:'en' lines remain).
  2. Applies the 11 replacements + the data flip to the standalone
     src/*.js files (exact-match asserts, fails if an anchor is missing
     / duplicated / already applied).
  3. Mirrors the patched src files into out/ (copies must agree).
  4. Applies the same replacements + the data flip to the inlined
     blocks in out/index.html (byte edits, exact-count asserts), plus
     the V18.4 title and the V39 layer injection (style v39 + script
     v39js, LAST, before </body>).
  5. Verifies: marker order (v39 last), v39 version 18.4.0,
     node --check on v39.js + every touched src file, old versions
     intact, V33/V34/V35/V36/V37/V38 fragments still present, V39
     fragments present, out-of-scope markers absent.

RUN EXACTLY ONCE on a fresh V18.3 out/. NEVER re-run build_v33.py /
build_v34.py / build_v35.py / build_v36.py / build_v37.py / build_v38.py
(or any older build script) on a finished build (they reorder layers —
see the V32 skill notes).

Usage:  python3 build_v39.py [--out DIR] [--src DIR]
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

# Pristine V18.3 out/index.html (2,372,032 B) — verified before any edit.
V183_HASH = "6b953ac1577b97ced538b3f92ff4d4af42e907e1be4b36e5e874e553eb4e6106"
TITLE_OLD = "<title>Korean &amp; English Vocab Farm V18.3 — Boss Word Sets — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"
TITLE_NEW = "<title>Korean &amp; English Vocab Farm V18.4 — Korean Bosses — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"

REPLACEMENTS = [
    ('R-V39-V18-MARKKO', 'v18.js',
     "function markKO(ok){\n  var e=en18();\n  if(ok)e.koStats.right++;else e.koStats.wrong++;\n  save18();\n}",
     "function markKO(ok,k){\n  var e=en18();\n  if(ok)e.koStats.right++;else e.koStats.wrong++;\n  /* V39 (V18.4): KO boss answers also feed Smart Learning (V27) —\n     recordAnswer('ko',...) records right/wrong/cw/cr/last for the\n     card. Called BEFORE save18() so the record rides the same V20\n     flush. The Korean deck itself is still never modified by V18. */\n  try{if(window.__v27&&k&&k.id)__v27.recordAnswer('ko',k.id,ok,'boss18')}catch(e){}\n  save18();\n}",
     1),
    ('R-V39-V18-CALL-TRUE', 'v18.js',
     "    if(F.cur&&F.cur.w)mark18(true,F.cur.w);\n    if(F.cur&&F.cur.k)markKO(true);",
     "    if(F.cur&&F.cur.w)mark18(true,F.cur.w);\n    if(F.cur&&F.cur.k)markKO(true,F.cur.k);",
     1),
    ('R-V39-V18-CALL-FALSE', 'v18.js',
     "    if(F.cur&&F.cur.w)mark18(false,F.cur.w);\n    if(F.cur&&F.cur.k)markKO(false);",
     "    if(F.cur&&F.cur.w)mark18(false,F.cur.w);\n    if(F.cur&&F.cur.k)markKO(false,F.cur.k);",
     1),
    ('R-V39-V18-KOCOUNT', 'v18.js',
     "  return shuffle(cards);\n}\nfunction distractorsKO(c,n){",
     "  return shuffle(cards);\n}\nfunction koCount18(){\n  /* V39 (V18.4): koPool().length — the count for the <8 KO warning\n     banner in startFight(). koPool() already applies the V36 F16a\n     deck scoping, so the count matches the pool the fight uses. */\n  return koPool().length;\n}\nfunction distractorsKO(c,n){",
     1),
    ('R-V39-V18-BANNER', 'v18.js',
     "  /* V23: pet team joins the fight (shield, energy, damage bonus). */\n  try{if(window.__v23)__v23.battleStart(F)}catch(e){}\n  nextQ();renderFight();",
     "  /* V23: pet team joins the fight (shield, energy, damage bonus). */\n  try{if(window.__v23)__v23.battleStart(F)}catch(e){}\n  /* V39 (V18.4): mirror the V19 <8 KO warning — a KO fight with fewer\n     than 8 usable Korean cards falls back to English questions (see\n     nextQ); say so honestly instead of silently. The fight is NOT\n     blocked (V19 precedent: banner + English fallback). */\n  if(lang==='ko'&&koCount18()<8)\n    F.banner='⚠️ Bạn mới có '+koCount18()+'/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ.';\n  nextQ();renderFight();",
     1),
    ('R-V39-V18-COMMENT', 'v18.js',
     "   same SRS boxes. KO answers only touch en18.koStats — the Korean deck\n   (S.cards) is never modified by V18.",
     "   same SRS boxes. KO answers feed Smart Learning too (markKO calls\n   __v27.recordAnswer('ko',...) for right/wrong/cw/cr/last); the Korean\n   deck (S.cards) is still never modified by V18.",
     1),
    ('R-V39-V19-MARKKO19', 'v19.js',
     "function markKO19(ok){\n  var e=en19();\n  if(ok)e.koStats.right++;else e.koStats.wrong++;\n  save19();\n}",
     "function markKO19(ok,k){\n  var e=en19();\n  if(ok)e.koStats.right++;else e.koStats.wrong++;\n  /* V39 (V18.4): KO boss answers also feed Smart Learning (V27) —\n     recordAnswer('ko',...) records right/wrong/cw/cr/last for the\n     card. Called BEFORE save19() so the record rides the same V20\n     flush. The Korean deck itself is still never modified by V19. */\n  try{if(window.__v27&&k&&k.id)__v27.recordAnswer('ko',k.id,ok,'boss19')}catch(e){}\n  save19();\n}",
     1),
    ('R-V39-V19-CALL-CA', 'v19.js',
     "    if(F.cur&&F.cur.w)mark19(ok,F.cur.w);\n    if(F.cur&&F.cur.k)markKO19(ok);",
     "    if(F.cur&&F.cur.w)mark19(ok,F.cur.w);\n    if(F.cur&&F.cur.k)markKO19(ok,F.cur.k);",
     1),
    ('R-V39-V19-CALL-TRUE', 'v19.js',
     "    if(F.cur&&F.cur.w)mark19(true,F.cur.w);\n    if(F.cur&&F.cur.k)markKO19(true);",
     "    if(F.cur&&F.cur.w)mark19(true,F.cur.w);\n    if(F.cur&&F.cur.k)markKO19(true,F.cur.k);",
     1),
    ('R-V39-V19-CALL-FALSE', 'v19.js',
     "    if(F.cur&&F.cur.w)mark19(false,F.cur.w);\n    if(F.cur&&F.cur.k)markKO19(false);",
     "    if(F.cur&&F.cur.w)mark19(false,F.cur.w);\n    if(F.cur&&F.cur.k)markKO19(false,F.cur.k);",
     1),
    ('R-V39-V19-COMMENT', 'v19.js',
     "   (mark19 mirrors mark15/mark18); KO answers only touch en19.koStats —\n   the Korean deck (S.cards) is never modified by V19.",
     "   (mark19 mirrors mark15/mark18); KO answers feed Smart Learning too\n   (markKO19 calls __v27.recordAnswer('ko',...) for right/wrong/cw/\n   cr/last); the Korean deck (S.cards) is still never modified by V19.",
     1),
]

ALL_REPLACEMENTS = REPLACEMENTS

# V39 markers: must be ABSENT from the pristine V18.3 base, present after.
V39_MARKERS = [
    'id="v39"', 'id="v39js"', '__v39', "VERSION='18.4.0'",
    'function koCount18(){',
    "recordAnswer('ko',k.id,ok,'boss18')",
    "recordAnswer('ko',k.id,ok,'boss19')",
    'markKO(true,F.cur.k)',
]

# Distinctive strings that exist ONLY in work V39 does NOT do.
OUT_OF_SCOPE_MARKERS = [
    "armV27Obs",        # observer scoping (F-05) — NOT fixed in V18.4
    "rearmObserver",    # observer lifecycle (F-07) — NOT fixed in V18.4
    "_speakXp",         # V29 name for the speak fix — V36 uses _sxp36
    "V29 (F-05)",       # V29 observer comment — NOT in V18.4
]

# Files this build touches (for the pre-build backup + node --check).
TOUCHED_SRC = ["v18_data.js", "v18.js", "v19.js"]

# V33/V34/V35/V36 in-scope fragments (spot-checks, copied from
# build_v36.py / package_v36.py) — must survive V18.4.
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
V37_FRAGMENTS = [
    "renderHub:renderHub",
    "if(v.renderHub)v.renderHub();else renderTab()",
    "goTab:goTab,goWeak:goWeak,render:render,",
    "__v27.render&&__v27.render()",
]
V38_FRAGMENTS = [
    "topics:topics,lessons:lessons,topicName:topicName,scopeName:scopeName,",
    "function bossLibChange(){",
    "function bossSubHTML(lib,sc){",
    "function bossSubPick(el){",
    "function bossSelectedSub(attr){",
    'id="v22bs-lib" onchange="__v22.bossLibChange()"',
    "{v:'oxford',n:'Oxford 3000'}",
    "bossSelectedSub('t')",
    "bossSelectedSub('s')",
    "scopeName22:scopeName22,bossLibChange:bossLibChange,",
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
    tmp_path = path.with_name(path.name + ".tmp39")
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


def _flip_v18data_lang(text):
    """R-V39-V18DATA-LANG: lang:'en' -> lang:'both' ONLY on boss-data lines
    whose arena is 'en' (English Challenge) or 'leg' (Legendary).
    Lines with arena:'old' (old arena, V6 flow) are untouched, as are the
    non-boss-data lang:'en' occurrences (en19() defaults, overlay ST).
    Returns (new_text, n_flipped); asserts exactly 20 flipped and that no
    old-arena line was touched."""
    out_lines = []
    flipped = 0
    for ln in text.split("\n"):
        if "lang:'en'" in ln and ("arena:'en'" in ln or "arena:'leg'" in ln):
            assert "arena:'old'" not in ln, "flip hit an old-arena line"
            out_lines.append(ln.replace("lang:'en'", "lang:'both'", 1))
            flipped += 1
        else:
            out_lines.append(ln)
    assert flipped == 20, f"v18_data flip: flipped {flipped} lines, expected 20"
    return "\n".join(out_lines), flipped


def _v18data_block_range(orig_bytes):
    """Byte range (start, end) of the CONTENT of <script id="v18data">...
    </script> in index.html (exclusive of the tags themselves)."""
    tag = b'<script id="v18data">'
    t0 = orig_bytes.find(tag)
    assert t0 != -1, "index.html: <script id=\"v18data\"> missing"
    start = orig_bytes.find(b"\n", t0) + 1
    end = orig_bytes.find(b"</script>", start)
    assert end != -1, "index.html: </script> after v18data missing"
    return start, end


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None)
    ap.add_argument("--src", default=None)
    args = ap.parse_args()
    out = pathlib.Path(args.out) if args.out else ROOT / "out"
    src_dir = pathlib.Path(args.src) if args.src else ROOT / "src"
    v39_js = src_dir / "v39.js"
    v39_css = src_dir / "v39.css"
    assert v39_js.exists() and v39_css.exists(), "src/v39.js / src/v39.css missing"

    # --- 0. Back up every file this build will touch (src/ has no other copy) ---
    backup = ROOT / "tools" / "v39" / "backup-v18.3"
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

    # --- 1. Verify the base is pristine V18.3 ---
    index = out / "index.html"
    assert index.exists(), "out/index.html missing — run on a V18.3 build"
    orig_bytes = index.read_bytes()
    got_hash = hashlib.sha256(orig_bytes).hexdigest()
    assert got_hash == V183_HASH, f"base is not pristine V18.3: index.html sha256 {got_hash}"
    built = orig_bytes.decode("utf-8")
    assert 'id="v38"' in built and 'id="v38js"' in built, "V38 markers missing — not a V18.3 build"
    for m in V39_MARKERS:
        assert m not in built, f"{m} already present — refusing to run (layer exists or base moved)"
    assert TITLE_OLD in built and built.count(TITLE_OLD) == 1, "V18.3 title not found exactly once"
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in built, f"out-of-scope marker {marker!r} already in base — refusing to build on a moved tree"
    print(f"verified pristine V18.3 out/index.html ({len(orig_bytes)} B, sha256 {got_hash[:12]}…), v38 markers present, v39 absent")

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
    # --- 1c. PRE-PASS (flip): v18_data.js line-scoped flip, src + index ---
    _d18 = (src_dir / "v18_data.js").read_text(encoding="utf-8")
    _flipped_src, _n = _flip_v18data_lang(_d18)
    assert _n == 20, f"PRE-PASS flip src/v18_data.js: {_n} lines, expected 20"
    assert _flipped_src.count("lang:'en'") == 10, "PRE-PASS flip src/v18_data.js: remaining lang:'en' != 10 (old arena)"
    assert _flipped_src.count("arena:'old'") == 10, "PRE-PASS flip src/v18_data.js: old-arena count != 10"
    _b0, _b1 = _v18data_block_range(orig_bytes)
    _blk = orig_bytes[_b0:_b1].decode("utf-8")
    assert _blk == _d18 + "\n", "PRE-PASS flip: inlined v18data block != src/v18_data.js + trailing \\n (range excludes the newline right after the <script> tag)"
    _flipped_blk, _n2 = _flip_v18data_lang(_blk)
    assert _n2 == 20, f"PRE-PASS flip index.html v18data: {_n2} lines, expected 20"
    print("pre-pass OK: v18_data flip (20 Challenge+Legendary lines, 10 old-arena kept) in src + index.html")

    # --- 2. Validate the V39 layer itself ---
    v39_js_t = v39_js.read_text(encoding="utf-8")
    v39_css_t = v39_css.read_text(encoding="utf-8")
    assert "</script>" not in v39_js_t.lower(), "v39.js contains </script>"
    assert "VERSION='18.4.0'" in v39_js_t and "__v39" in v39_js_t, "v39.js must expose __v39 18.4.0"
    _stripped = _re.sub(r"/\*.*?\*/", "", v39_js_t, flags=_re.S)
    _stripped = _re.sub(r"//[^\n]*", "", _stripped)
    assert "window.S" not in _stripped, "v39.js must never use window.S (lexical let)"
    assert "localStorage" not in v39_js_t, "v39.js must not touch localStorage (no new key/schema)"
    assert v39_css_t.strip(), "v39.css is empty"
    print(f"validated src/v39.js ({len(v39_js_t)} chars) + src/v39.css ({len(v39_css_t)} chars)")

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
    # --- 3b. Flip v18_data.js (Challenge + Legendary -> 'both') ---
    _d18p = src_dir / "v18_data.js"
    _flipped, _n = _flip_v18data_lang(_d18p.read_text(encoding="utf-8"))
    _write_text_epersafe(_d18p, _flipped)
    assert _d18p.read_text(encoding="utf-8").count("lang:'both'") == 30, "src/v18_data.js: 'both' count != 30 after flip"
    assert _d18p.read_text(encoding="utf-8").count("lang:'en'") == 10, "src/v18_data.js: 'en' count != 10 after flip"
    touched.setdefault("v18_data.js", []).append("R-V39-V18DATA-LANG")
    _safe_copyfile(_d18p, out / "v18_data.js")
    assert (out / "v18_data.js").read_text(encoding="utf-8") == _flipped, "out/v18_data.js does not match patched src/v18_data.js"
    print(f"applied R-V39-V18DATA-LANG to src/v18_data.js (x{_n})")
    _safe_copyfile(v39_js, out / "v39.js")
    _safe_copyfile(v39_css, out / "v39.css")

    # --- 4. Assemble the new index.html: replacements + flip + title + V39 ---
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
    # v18data block flip (same 20 lines, inlined copy)
    _b0, _b1 = _v18data_block_range(orig_bytes)
    _flipped_blk, _n2 = _flip_v18data_lang(orig_bytes[_b0:_b1].decode("utf-8"))
    edits.append({"start": _b0, "end": _b1,
                  "chunks": [("glue", _flipped_blk.encode("utf-8"))]})
    print(f"R-V39-V18DATA-LANG staged for inlined v18data block at byte {_b0} (x{_n2})")
    # title
    t_old = TITLE_OLD.encode("utf-8")
    t0 = orig_bytes.find(t_old)
    assert t0 != -1 and orig_bytes.count(t_old) == 1, "index.html: V18.3 title not found exactly once"
    edits.append({"start": t0, "end": t0 + len(t_old),
                  "chunks": [("glue", TITLE_NEW.encode("utf-8"))]})
    # V39 layer, LAST, before </body>
    # rfind, NOT find: see the v37.css "</body>" comment trap above.
    body = orig_bytes.rfind(b"</body>")
    assert body != -1, "no </body> in index.html"
    assert body > orig_bytes.rfind(b'id="v38js"'), "injection point is before v38js - wrong </body>"
    edits.append({"start": body, "end": body, "chunks": [
        ("glue", b'\n<style id="v39">\n'),
        ("file", v39_css),
        ("glue", b'\n</style>\n<script id="v39js">\n'),
        ("file", v39_js),
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
    assert TITLE_NEW in built and TITLE_OLD not in built, "built index.html: V18.4 title missing / V18.3 title remains"
    assert "window.__v39" in built and "VERSION='18.4.0'" in built, "built index.html missing __v39 18.4.0"
    # v39 markers are the LAST style/script markers before </body>
    style_ids = [m for m in _re.findall(r'<style id="(v\d+)"', built)]
    script_ids = [m for m in _re.findall(r'<script id="(v\d+)js"', built)]
    assert style_ids and style_ids[-1] == "v39", f"style marker order wrong: {style_ids}"
    assert script_ids and script_ids[-1] == "v39", f"script marker order wrong: {script_ids}"
    assert built.find('id="v39js"') > built.find('id="v38js"'), "v39js is not after v38js"
    # old layers intact
    for ver in ("13.0.0", "15.0.0", "15.1.0", "15.2.0", "15.3.0", "16.0.0", "16.3.0", "16.4.0", "17.0.0", "17.1.0", "18.0.0", "18.1.0", "18.2.0", "18.3.0"):
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
    # V37 fragments still present (previous layer survives).
    for frag in V37_FRAGMENTS:
        assert frag in built, f"built html lost V37 fragment: {frag[:60]}"
    # V38 fragments still present (previous layer survives).
    for frag in V38_FRAGMENTS:
        assert frag in built, f"built html lost V38 fragment: {frag[:60]}"
    # V39 fragments present (exact counts where the string is unique).
    assert built.count("function koCount18(){") == 1, "built html: R-V39-V18-KOCOUNT missing"
    assert built.count("koCount18()<8") == 1, "built html: R-V39-V18-BANNER condition missing"
    assert built.count("F.banner='⚠️ Bạn mới có '+koCount18()") == 1, "built html: R-V39-V18-BANNER text missing"
    assert built.count("recordAnswer('ko',k.id,ok,'boss18')") == 1, "built html: R-V39-V18-MARKKO missing"
    assert built.count("recordAnswer('ko',k.id,ok,'boss19')") == 1, "built html: R-V39-V19-MARKKO19 missing"
    assert built.count("markKO(true,F.cur.k)") == 1, "built html: R-V39-V18-CALL-TRUE missing"
    assert built.count("markKO(false,F.cur.k)") == 1, "built html: R-V39-V18-CALL-FALSE missing"
    assert built.count("markKO19(ok,F.cur.k)") == 1, "built html: R-V39-V19-CALL-CA missing"
    assert built.count("markKO19(true,F.cur.k)") == 1, "built html: R-V39-V19-CALL-TRUE missing"
    assert built.count("markKO19(false,F.cur.k)") == 1, "built html: R-V39-V19-CALL-FALSE missing"
    # Old signatures / stale comments are gone.
    assert built.count("function markKO(ok){") == 0, "built html: old markKO(ok) still present"
    assert built.count("function markKO19(ok){") == 0, "built html: old markKO19(ok) still present"
    assert built.count("markKO(true);") == 0, "built html: old markKO(true) call still present"
    assert built.count("markKO(false);") == 0, "built html: old markKO(false) call still present"
    assert built.count("markKO19(ok);") == 0, "built html: old markKO19(ok) call still present"
    assert built.count("markKO19(true);") == 0, "built html: old markKO19(true) call still present"
    assert built.count("markKO19(false);") == 0, "built html: old markKO19(false) call still present"
    assert "KO answers only touch en18.koStats" not in built, "built html: stale V18 header comment remains"
    assert "KO answers only touch en19.koStats" not in built, "built html: stale V19 header comment remains"
    # Data flip: 20 Challenge + Legendary bosses are 'both' now.
    # (11 'both' before: 10 Elemental + 1 V19 factory; 34 lang:'en' before
    #  -> 14 after: 10 old-arena + 2 en19 defaults + 2 overlay ST.)
    assert built.count("lang:'both'") == 31, "built html: lang:'both' count != 31"
    assert built.count("lang:'en'") == 14, f"built html: lang:'en' count != 14"
    _m39 = _re.search(r'<script id="v18data">(.*?)</script>', built, _re.S)
    assert _m39, "built html: v18data block missing"
    assert _m39.group(1).count("lang:'both'") == 30, "built html: v18data 'both' count != 30 (20 flipped + 10 Elemental)"
    assert _m39.group(1).count("lang:'en'") == 10, "built html: v18data 'en' count != 10 (old arena only)"
    assert _m39.group(1).count("arena:'old'") == 10, "built html: v18data old-arena count != 10"
    assert all("arena:'old'" in ln for ln in _m39.group(1).split('\n') if "lang:'en'" in ln), "built html: a lang:'en' line is not old-arena"
    assert built.count("scopeName22:scopeName22,bossLibChange:bossLibChange,") == 1, "built html: R-V38-V22-EXPORTS missing"
    # KO tabs line: no new button in V18.4; v35kotab/v33kotab still x1
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
    _node_check(v39_js)
    for fname in touched:
        _node_check(src_dir / fname)
    _safe_copyfile(HERE / "build_v39.py", out / "build_v39.py")
    print(f"built {index} ({len(built)/1024:.0f} KB) — V18.4, layer V39 injected last")
    print("V39: Korean Bosses — 11 replacements (V18 x6, V19 x5) + v18_data flip + title")
    print("marker order OK: v39 last (styles + scripts), v39js after v38js; KO tabs line unchanged; out-of-scope markers absent")
    return 0


if __name__ == "__main__":
    sys.exit(main())
