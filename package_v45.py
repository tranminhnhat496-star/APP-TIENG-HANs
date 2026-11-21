#!/usr/bin/env python3
"""Package the V19.0 ROUND-3 BUG FIXES deliverable ZIP from out/ + docs.
Run AFTER the build (build_v45.py) and AFTER the tests pass
(test45.js is run on the built out/ AND on the packaged ZIP — counts
are recorded in SMOKE_TEST_V19_0_2026-11-21.md, not claimed here).
Output: ~/workspace/v7build/Korean_English_Vocab_Farm_V19_0_Round3_Bug_Fixes.zip

The ZIP ships the PLACEHOLDER firebase-config.js from the build tree
(the local tree holds the placeholder; the repo's real config is never
touched by this script — see CHANGELOG). Firebase login/sync is NOT
claimed working until Anh runs the FIREBASE_SETUP.md live checklist.

V19.0 adds NO art and NO new words: all PNGs and vocabulary ship
unchanged from the V18.9 tree. It adds the V45 fixes: due = box 1-4
AND due<=now at 14 sites (v15/v17/v22/v25/v27/v34), the corrupt-save
quarantine in load() + the _warn45 warning display (v45.js), unique
pre-restore snapshot keys + 2 lead fixes (v31.js), the speedHatch
ready-check (v23.js), the enIcon() guard, and the weakchip list-row
contrast rules (v45.css). No schema change, no new save key.
tools/v45 is copied ALLOWLIST-ONLY (PUSH_MANIFESTS.md):
test45.js + verify-v45c.js + repro-v45.js + probe-toast.js ARE inside
the ZIP this time (they were finished BEFORE packaging); the V18.9
backup (backup-v18.9/), the pristine copy (pristine-v18.9-out/), logs
and screenshots stay out of the ZIP.
"""
import hashlib
import pathlib
import shutil
import sys
import time
import zipfile

# EPERM write waves (host condition, same signature as the V18.4
# overnight block): exec-path writes intermittently fail with
# PermissionError for minutes at a time. Retry copies through the
# wave instead of failing fast; the ZIP write below gets its own
# retry loop.
_orig_copy2 = shutil.copy2


def _copy2_retry(src, dst, *a, **kw):
    last = None
    for attempt in range(1800):
        try:
            return _orig_copy2(src, dst, *a, **kw)
        except PermissionError as e:
            last = e
            if attempt % 60 == 0:
                print(f"  EPERM wave on {dst} (attempt {attempt}) — waiting...")
            time.sleep(1)
    raise last


shutil.copy2 = _copy2_retry

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build_v41 as _b41  # V33–V40 in-scope fragments + out-of-scope markers, verbatim
OUT = HERE / "out"
DOCS = ["README_V7.md", "README_V8_IMPORT.md", "README_V9_LIBRARY.md",
        "README_V10_BOSSES.md", "README_V11_BOSS_ADVENTURE.md",
        "README_V11_1_KOREAN_BOSS_MAP.md", "README_V12_SAVE_SYNC.md", "README_V13_LOGIN_ACCOUNT.md", "README_V14_BASIC_TACTICS.md", "README_V15_PETS.md",
        "README_V15_1_UI.md", "README_V15_2_LIBRARY.md", "README_V15_3_MOBILE_NAV.md",
        "README_V16_SMART_LEARNING.md",
        "README_V16_3_BACKUP_FIX.md",
        "README_V16_4_DATA_SAFETY.md",
        "README_V17_0_CHRONO_KINGDOM.md",
        "README_V17_1_CHRONO_COMPLETE.md",
        "README_V18_0_SKYROOT_SANCTUARY.md",
        "README_V18_1_BUG_FIXES.md",
        "README_V18_2_SCOPE_BANNER_FIX.md",
        "README_V18_3_BOSS_WORD_SETS.md",
        "README_V18_4_KOREAN_BOSSES.md",
        "README_V18_5_BUG_FIXES_II.md",
        "README_V18_6_BUG_FIXES_III.md",
        "README_V18_7_UNLOCK_SHORTCUTS.md",
        "README_V18_8_BOSS_FIGHT_READABILITY.md",
        "README_V18_9_LEGENDARY_FREEZE_FIX.md",
        "README_V19_0_ROUND3_BUG_FIXES.md",
        "CHANGELOG_V6_to_V7.md", "CHANGELOG_V7_to_V8.md",
        "CHANGELOG_V8_to_V9.md", "CHANGELOG_V9_to_V10.md",
        "CHANGELOG_V10_to_V11.md", "CHANGELOG_V11_to_V11_1.md", "CHANGELOG_V11_1_to_V12.md", "CHANGELOG_V12_to_V13.md", "CHANGELOG_V13_to_V14.md",
        "CHANGELOG_V14_to_V15.md",
        "CHANGELOG_V15_to_V15_1.md", "CHANGELOG_V15_1_to_V15_2.md", "CHANGELOG_V15_2_to_V15_3.md",
        "CHANGELOG_V15_3_to_V16.md", "CHANGELOG_V16_to_V16_3.md",
        "CHANGELOG_V16_3_to_V16_4.md",
        "CHANGELOG_V16_4_to_V17_0.md",
        "CHANGELOG_V17_0_to_V17_1.md",
        "CHANGELOG_V17_1_to_V18_0.md",
        "CHANGELOG_V18_0_to_V18_1.md",
        "CHANGELOG_V18_1_to_V18_2.md",
        "CHANGELOG_V18_2_to_V18_3.md",
        "CHANGELOG_V18_3_to_V18_4.md",
        "CHANGELOG_V18_4_to_V18_5.md",
        "CHANGELOG_V18_5_to_V18_6.md",
        "CHANGELOG_V18_6_to_V18_7.md",
        "CHANGELOG_V18_7_to_V18_8.md", "CHANGELOG_V18_8_to_V18_9.md",
        "CHANGELOG_V18_9_to_V19_0.md",
        "CHANGED_FILES.md",
        "GITHUB_DESKTOP_GUIDE.md", "SMOKE_TEST_V10_2026-11-17.md",
        "SMOKE_TEST_V11_2026-11-17.md", "SMOKE_TEST_V11_1_2026-11-17.md", "SMOKE_TEST_V12_2026-11-17.md", "SMOKE_TEST_V13_2026-11-17.md",
        "FIREBASE_SETUP.md",
        "REPORT_PDF_EXTRACTION.md", "REPORT_BASIC_TACTICS.md", "REVIEW_LIST_V14.md",
        "ASSET_REPORT_V10.md", "ASSET_REPORT_V11.md",
        "SMOKE_TEST_V14_2026-11-17.md", "ASSET_REPORT_V15.md", "SMOKE_TEST_V15_2026-11-17.md",
        "SMOKE_TEST_V15_1_2026-11-17.md", "SMOKE_TEST_V15_2_2026-11-17.md", "SMOKE_TEST_V15_3_2026-11-17.md",
        "SMOKE_TEST_V16_2026-11-18.md", "SMOKE_TEST_V16_3_2026-11-18.md", "SMOKE_TEST_V16_4_2026-11-19.md",
        "SMOKE_TEST_V17_0_2026-11-19.md",
        "SMOKE_TEST_V17_1_2026-11-19.md",
        "SMOKE_TEST_V18_0_2026-11-19.md",
        "SMOKE_TEST_V18_1_2026-11-19.md",
        "SMOKE_TEST_V18_2_2026-11-19.md",
        "SMOKE_TEST_V18_3_2026-11-19.md",
        "SMOKE_TEST_V18_4_2026-11-19.md",
        "SMOKE_TEST_V18_5_2026-11-20.md",
        "SMOKE_TEST_V18_6_2026-11-20.md",
        "SMOKE_TEST_V18_7_2026-11-20.md",
        "SMOKE_TEST_V18_8_2026-11-21.md", "SMOKE_TEST_V18_9_2026-11-21.md",
        "SMOKE_TEST_V19_0_2026-11-21.md"]
ZIP = HERE / "Korean_English_Vocab_Farm_V19_0_Round3_Bug_Fixes.zip"

# Distinctive strings that exist ONLY in out-of-scope work
# (copied verbatim from build_v41.py — must be absent from the ZIP).
OUT_OF_SCOPE_MARKERS = _b41.OUT_OF_SCOPE_MARKERS

# V31 in-scope fragments (copied verbatim from package_v41.py — V18.7
# must keep every V31 fix). Checked present at least once in the ZIP's
# index.html.
IN_SCOPE_FRAGMENTS = [
    "/* V31 (F-01):",
    "/* V31 (F-01): V18 boss records are FLAT",
    "mEn[kEn2]=maxMap(lEn[kEn2], cEn[kEn2])",
    "m15.due=d15;",
    "m17.claimed=fillMissing(l17.claimed, c17.claimed)",
    "m16[k16b]=fillMissing(l16[k16b], c16[k16b])",
    "if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) return true;",
    "if(v7.en27&&v7.en27.sessions&&v7.en27.sessions.length) return true;",
    "loc.obj.v7.meta.migratedAt",
    "if(depth>6||!o||typeof o!=='object') return;",
    "try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}",
    "try{ flush(); }catch(e){}",
    "if(_ve&&String(_ve.message||'').indexOf('invalid save')===0) throw _ve;",
    "[V31] recordAnswer dropped",
    "_e27.en.last={};",
    "__v20.importFile(imp)",
    "if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) wins++;",
    "korean-vocab-farm-backup-v16.3.json",
    "Đã bắt đầu tải file sao lưu",
    "từ tiếng Anh giữ mức cao nhất từng từ (box/số câu đúng/số câu sai)",
    "Hợp nhất: từ tiếng Anh giữ mức cao nhất từng từ;",
]

# V43 in-scope fragments (checked present at least once in the ZIP's index.html).
V43_FRAGMENTS = [
    'id="v43"',                            # V43 style block
    'id="v43js"',                          # V43 script block
    "18.8.0",                              # V43 version
    "VERSION='18.8.0'",                    # V43 version marker (v43.js)
    "window.__v43={",                      # V43 export
    ".v19fight .v19qword{color:#fff}",      # V43 V19 qword rule
    ".v19fight .v19qcard .mute",           # V43 V19 qcard mute rule
    ".v19fight .v19opt{color:#fff}",        # V43 V19 opt rule
    ".v18fight .v18qword{color:var(--ink)}",  # V43 V18 qword rule
    ".v18fight .v18opt{color:var(--ink)}",  # V43 V18 opt rule
    ".v23bar-fight .v23bf-skill:disabled",  # V43 disabled pet-skill button
    ".v19fight .v34bar-t{color:#fff}",      # V43 V19 blocked break-bar title
    ".v18fight .v34bar.v34blocked .mute{color:var(--ink)}",  # V43 V18 blocked break-bar mute
    ".v19fight .v19phase{background:#5B3FD4;color:#fff}",  # V43 V19 phase chip
    ".v18fight .v34breaklabel{color:var(--ink)}",  # V43 V18 break label
]

# V44 in-scope fragments (checked present at least once in the ZIP's index.html).
V44_FRAGMENTS = [
    'id="v44js"',                          # V44 script block
    "18.9.0",                              # V44 version
    "VERSION='18.9.0'",                    # V44 version marker (v44.js)
    "window.__v44={",                      # V44 export
    "var lv=b.arena==='leg'?legDiff():null;",  # V44 hoisted legDiff() (x2)
    "if(b.arena==='leg'){if(lv.indexOf(w.lv)<0)return false}",  # V44 hoisted wordPool filter
    "return b.arena==='leg'?lv.indexOf(x.lv)>=0:x.lv===b.diff",  # V44 hoisted grammarPool filter
    "/* V44 (V18.9): legDiff() was called once PER WORD inside this filter",  # V44 wordPool comment
    "/* V44 (V18.9): same hoist as wordPool",  # V44 grammarPool comment
    "function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}if(m<200)return ['A2','B1'];if(m<600)return ['B1'];return ['B2']}",  # legDiff def UNCHANGED
]

# V45 in-scope fragments (checked present at least once in the ZIP's index.html).
V45_FRAGMENTS = [
    'id="v45"',                            # V45 style block
    'id="v45js"',                          # V45 script block
    "19.0.0",                              # V45 version
    "VERSION='19.0.0'",                    # V45 version marker (v45.js)
    "window.__v45={",                      # V45 export
    "if(b>=1&&b<=4&&(e.due[w.id]||0)<=now)c.due++;",  # C-R3-1 counts15 box 1-4
    "if(b>=1&&b<=4&&(e.due[w.id]||0)<=now)s.due++;",  # C-R3-1 v17 statsOf box 1-4
    "if(b>=1&&b<=4&&((v.en15().due)||{})[w.id]<=now)s.due++;",  # C-R3-1 v22 unitStats box 1-4
    "if(b>=1&&b<=4&&dueOf(w.id)<=now)s.due++;",  # C-R3-1 v25 statsOf box 1-4
    "if(c.box>=1&&c.box<=4&&c.due<=now)dueN++;",  # C-R3-1 v27 dashboard dueN EN box 1-4
    "if(cc.box>=1&&cc.box<=4&&cc.due<=now)dueN++;",  # C-R3-1 v27 dashboard dueN KO box 1-4
    "if(b>=1&&b<=4&&(due[w.id]||0)<=now)s.due++;",  # C-R3-1 v34 statsForList box 1-4
    "hanvocab.v12.corrupt-",              # C-R3-2 quarantine key pattern
    "window.__V45_CORRUPT",               # C-R3-2 quarantine flag
    "__v45corruptShown",                   # C-R3-2 warning shown flag
    "Không đọc được bản lưu cũ",           # C-R3-2 warning copy
    "var k='hanvocab.v12.preimport-'+Date.now()+'-'+(++_snapSeq45)+'-'+Math.random().toString(36).slice(2,8);",  # C-R3-4 unique snapshot key
    "if((e.hatch.endsAt||0)<=Date.now())return{ok:false,msg:'Trứng đã ấp xong — nhận thú cưng ngay!'};",  # LEAD speedHatch ready check
    "h=h.filter(function(e){ if(!removed&&e.at===at){removed=true;return false} return true; });",  # LEAD deleteHistoryEntry single-delete
    "if(!name)return '';",                 # NEW-1 enIcon falsy guard
    ".v34weakchip{color:#7A5B00;border-color:#7A5B00;background:rgba(122,91,0,.08)}",  # weakchip light list-row rule
    ".v19zboss .v34weakchip{color:var(--ui-title-gold,#FFD76A);border-color:var(--ui-border,#A78BFA);background:rgba(255,215,106,.08)}",  # weakchip v19zboss gold rule
    "_warn45",                             # C-R3-2 _warn45 helper (toast is closure-local in v7js)
    "d.className='v7toast'",               # C-R3-2 _warn45 builds the .v7toast div directly
]

# V42 in-scope fragments (checked present at least once in the ZIP's index.html).
V42_FRAGMENTS = [
    'id="v42"',                            # V42 style block
    'id="v42js"',                          # V42 script block
    "18.7.0",                              # V42 version
    "VERSION='18.7.0'",                    # V42 version marker (v42.js)
    "window.__v42={",                      # V42 export
    "window.__v42?window.__v42.chronoGateHTML(lang,gate)",  # R-V42-V33-GATE call site
    "window.__v42?window.__v42.skyrootGateHTML(lang,gate)",  # R-V42-V35-GATE call site
    "Thắng đủ 70 boss để mở vùng đất này — số liệu là thật",  # R-V42-V33-GATE new copy
    "Không tìm thấy boss nào có thể đánh ngay",  # V42 skyroot null-state copy (defensive-only)
    ".v42btn{min-height:44px",             # V42 CSS rule
    "skyrootTarget:skyrootTarget",         # V42 exports
    "chronoTarget:chronoTarget",           # V42 exports
    "goSkyroot:goSkyroot",                 # V42 exports
    "goChrono:goChrono",                   # V42 exports
]

# V41 in-scope fragments (copied verbatim from package_v41.py).
V41_FRAGMENTS = [
    'id="v41"',
    'id="v41js"',
    "18.6.0",
    "VERSION='18.6.0'",
    "window.__v41={version:VERSION",
    "indexOf('ca-')===0",
    "Math.min(3,F.caRight)",
    "if(!j.opt)j.opt={mode:'card',dir:'kv',group:'',due:false}",
    "var old=$('#v15farmquiz');if(old)old.remove();",
    "try{ flush(); }catch(e){}",
    "try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}",
    ":root .tab{flex:0 0 auto;min-width:64px;padding:6px 8px;font-size:10px}",
]

# tools/v45 allowlist (text only — the V18.9 backup, the pristine
# copy, logs and screenshots stay out of the ZIP; test45.js +
# verify-v45c.js + repro-v45.js + probe-toast.js ARE included this time,
# finished before packaging).
TOOLS_V45_ALLOW = [
    "test45.js", "verify-v45c.js", "repro-v45.js", "probe-toast.js",
    "PUSH_MANIFESTS.md",
]

# tools/v44 allowlist (text only — the V18.8 backup, the pristine
# copy, logs and screenshots stay out of the ZIP; test44.js +
# verify-v44c.js + repro-v44.js ARE included this time, finished
# before packaging).
TOOLS_V44_ALLOW = [
    "test44.js", "verify-v44c.js", "repro-v44.js",
    "PUSH_MANIFESTS.md",
]

# tools/v43 allowlist (text only — the V18.7 backup, the pristine
# copy, logs and screenshots stay out of the ZIP; test43.js +
# verify-v43c.js + repro-v43.js ARE included this time, finished
# before packaging).
TOOLS_V43_ALLOW = [
    "test43.js", "verify-v43c.js", "repro-v43.js",
    "PUSH_MANIFESTS.md",
]

# tools/v42 allowlist (text only — the V18.6 backup, the pristine
# copy, logs and screenshots stay out of the ZIP).
TOOLS_V42_ALLOW = [
    "PUSH_MANIFESTS.md",
]

# tools/v41 allowlist (text only — the V18.5 backup, logs and screenshots
# stay out of the ZIP; the shipped art already lives in out/assets/).
TOOLS_V41_ALLOW = [
    "test41.js", "verify-v41c.js", "repro-v41.js",
    "PUSH_MANIFESTS.md",
]

# tools/v40 allowlist (text only — the V18.4 backup, logs and screenshots
# stay out of the ZIP; the shipped art already lives in out/assets/).
TOOLS_V40_ALLOW = [
    "test40.js", "verify-v40c.js", "repro-v40.js", "repro-v40b.js",
    "PUSH_MANIFESTS.md",
]

# tools/v39 allowlist (text only — the V18.3 backup, logs and screenshots
# stay out of the ZIP; the shipped art already lives in out/assets/).
TOOLS_V39_ALLOW = [
    "test39.js", "verify-v39c.js", "repro-v39.js",
    "PUSH_MANIFESTS.md",
]

# tools/v38 allowlist (regression: the V18.3 suite stays in the ZIP).
TOOLS_V38_ALLOW = [
    "test38.js", "verify-v38c.js", "repro-v38.js",
    "PUSH_MANIFESTS.md",
]

# tools/v37 allowlist (regression: the V18.2 suite stays in the ZIP).
TOOLS_V37_ALLOW = [
    "test37.js", "verify-v37c.js", "repro-v37.js",
    "PUSH_MANIFESTS.md",
]

assert (OUT / "index.html").exists(), "run build_v45.py first"
assert (OUT / "v45.js").exists() and (OUT / "v45.css").exists(), "V45 layer missing from out/"
assert (OUT / "v44.js").exists(), "V44 layer missing from out/"
assert (OUT / "v43.js").exists() and (OUT / "v43.css").exists(), "V43 layer missing from out/"
assert (OUT / "v42.js").exists() and (OUT / "v42.css").exists(), "V42 layer missing from out/"
assert (OUT / "v41.js").exists() and (OUT / "v41.css").exists(), "V41 layer missing from out/"
assert (OUT / "v40.js").exists() and (OUT / "v40.css").exists(), "V40 layer missing from out/"
assert (OUT / "v39.js").exists() and (OUT / "v39.css").exists(), "V39 layer missing from out/"
assert (OUT / "v38.js").exists() and (OUT / "v38.css").exists(), "V38 layer missing from out/"
assert (OUT / "v37.js").exists() and (OUT / "v37.css").exists(), "V37 layer missing from out/"
assert (OUT / "v36.js").exists() and (OUT / "v36.css").exists(), "V36 layer missing from out/"
assert (OUT / "v35.js").exists() and (OUT / "v35.css").exists() and (OUT / "v35_data.js").exists(), "V35 layer missing from out/"
assert (OUT / "v34.js").exists() and (OUT / "v34.css").exists() and (OUT / "v34_data.js").exists(), "V34 layer missing from out/"
assert (OUT / "v33.js").exists() and (OUT / "v33.css").exists() and (OUT / "v33_data.js").exists(), "V33 layer missing from out/"
assert (OUT / "v32.js").exists() and (OUT / "v32.css").exists(), "V32 layer missing from out/"
assert (OUT / "v31.js").exists() and (OUT / "v31.css").exists(), "V31 layer missing from out/"
for d in DOCS:
    src = HERE / d
    assert src.exists(), f"missing doc {d}"
    shutil.copy2(src, OUT / d)

# build + package scripts travel with the deliverable (reproducibility)
for _s in ["build_v45.py", "package_v45.py",
           "build_v44.py", "package_v44.py",
           "build_v43.py", "package_v43.py",
           "build_v42.py", "package_v42.py",
           "build_v41.py", "package_v41.py",
           "build_v40.py", "package_v40.py",
           "build_v39.py", "package_v39.py",
           "build_v38.py", "package_v38.py",
           "build_v37.py", "package_v37.py"]:
    shutil.copy2(HERE / _s, OUT / _s)

# tools/v43 allowlist (see header — backup, pristine copy, logs and
# screenshots stay out)
for _ver, _allow in [("v45", TOOLS_V45_ALLOW), ("v44", TOOLS_V44_ALLOW), ("v43", TOOLS_V43_ALLOW), ("v42", TOOLS_V42_ALLOW), ("v41", TOOLS_V41_ALLOW),
                     ("v40", TOOLS_V40_ALLOW), ("v39", TOOLS_V39_ALLOW),
                     ("v38", TOOLS_V38_ALLOW), ("v37", TOOLS_V37_ALLOW)]:
    tools_src = HERE / "tools" / _ver
    assert tools_src.is_dir(), f"tools/{_ver} missing"
    (OUT / "tools" / _ver).mkdir(parents=True, exist_ok=True)
    for name in _allow:
        p = tools_src / name
        assert p.exists(), f"missing tools/{_ver}/{name}"
        shutil.copy2(p, OUT / "tools" / _ver / name)
        print(f"tools/{_ver}/{name} present in package")

files = sorted(p for p in OUT.rglob("*") if p.is_file())
# ZIP write with retries: a PermissionError mid-write aborts the
# archive, so retry the whole write (up to 5 attempts) after a pause.
for _attempt in range(5):
    try:
        if ZIP.exists():
            ZIP.unlink()
        with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
            for p in files:
                z.write(p, p.relative_to(OUT))
        break
    except PermissionError as e:
        print(f"  EPERM wave during ZIP write (attempt {_attempt}) — waiting 60 s: {e}")
        time.sleep(60)
else:
    raise RuntimeError("ZIP write failed through 5 EPERM-wave attempts")
size = ZIP.stat().st_size
zsha = hashlib.sha256(ZIP.read_bytes()).hexdigest()
print(f"wrote {ZIP} ({size/1024/1024:.1f} MB, {len(files)} files, sha256 {zsha})")
# sanity: index.html at zip root, V42 layer + all old layers present
with zipfile.ZipFile(ZIP) as z:
    names = z.namelist()
    assert "index.html" in names
    # ZIP index.html must be byte-identical to out/index.html
    assert z.read("index.html") == (OUT / "index.html").read_bytes(), "ZIP index.html differs from out/index.html"
    print("  ZIP index.html byte-identical to out/index.html OK")
    assert "v45.js" in names and "v45.css" in names and "build_v45.py" in names and "package_v45.py" in names
    assert "v44.js" in names and "build_v44.py" in names and "package_v44.py" in names
    assert "v43.js" in names and "v43.css" in names and "build_v43.py" in names and "package_v43.py" in names
    assert "v42.js" in names and "v42.css" in names and "build_v42.py" in names and "package_v42.py" in names
    assert "v41.js" in names and "v41.css" in names and "build_v41.py" in names and "package_v41.py" in names
    assert "v40.js" in names and "v40.css" in names and "build_v40.py" in names and "package_v40.py" in names
    assert "v39.js" in names and "v39.css" in names and "build_v39.py" in names and "package_v39.py" in names
    assert "v38.js" in names and "v38.css" in names and "build_v38.py" in names and "package_v38.py" in names
    assert "v37.js" in names and "v37.css" in names and "build_v37.py" in names and "package_v37.py" in names
    assert "v36.js" in names and "v36.css" in names and "build_v36.py" in names and "package_v36.py" in names
    assert "v35.js" in names and "v35.css" in names and "v35_data.js" in names and "build_v35.py" in names and "package_v35.py" in names
    assert "v34.js" in names and "v34.css" in names and "v34_data.js" in names, "V34 layer missing from ZIP"
    assert "v33.js" in names and "v33.css" in names and "v33_data.js" in names, "V33 layer missing from ZIP"
    assert "v32.js" in names and "v32.css" in names, "V32 layer missing from ZIP"
    assert "v31.js" in names and "v31.css" in names, "V31 layer missing from ZIP"
    assert "tools/v43/test43.js" in names, "tools/v43/test43.js missing from ZIP"
    assert "tools/v43/verify-v43c.js" in names, "tools/v43/verify-v43c.js missing from ZIP"
    assert "tools/v43/repro-v43.js" in names, "tools/v43/repro-v43.js missing from ZIP"
    assert "tools/v43/PUSH_MANIFESTS.md" in names, "tools/v43/PUSH_MANIFESTS.md missing from ZIP"
    assert "tools/v45/test45.js" in names, "tools/v45/test45.js missing from ZIP"
    assert "tools/v45/verify-v45c.js" in names, "tools/v45/verify-v45c.js missing from ZIP"
    assert "tools/v45/repro-v45.js" in names, "tools/v45/repro-v45.js missing from ZIP"
    assert "tools/v45/probe-toast.js" in names, "tools/v45/probe-toast.js missing from ZIP"
    assert "tools/v45/PUSH_MANIFESTS.md" in names, "tools/v45/PUSH_MANIFESTS.md missing from ZIP"
    assert "tools/v44/test44.js" in names, "tools/v44/test44.js missing from ZIP"
    assert "tools/v44/verify-v44c.js" in names, "tools/v44/verify-v44c.js missing from ZIP"
    assert "tools/v44/repro-v44.js" in names, "tools/v44/repro-v44.js missing from ZIP"
    assert "tools/v44/PUSH_MANIFESTS.md" in names, "tools/v44/PUSH_MANIFESTS.md missing from ZIP"
    assert "tools/v42/PUSH_MANIFESTS.md" in names, "tools/v42/PUSH_MANIFESTS.md missing from ZIP"
    assert "tools/v41/test41.js" in names, "tools/v41/test41.js missing from ZIP"
    assert "tools/v41/verify-v41c.js" in names, "tools/v41/verify-v41c.js missing from ZIP"
    assert "tools/v41/repro-v41.js" in names, "tools/v41/repro-v41.js missing from ZIP"
    assert "tools/v41/PUSH_MANIFESTS.md" in names, "tools/v41/PUSH_MANIFESTS.md missing from ZIP"
    assert "tools/v40/test40.js" in names, "tools/v40/test40.js missing from ZIP"
    assert "tools/v40/verify-v40c.js" in names, "tools/v40/verify-v40c.js missing from ZIP"
    assert "tools/v40/repro-v40.js" in names, "tools/v40/repro-v40.js missing from ZIP"
    assert "tools/v40/repro-v40b.js" in names, "tools/v40/repro-v40b.js missing from ZIP"
    assert "tools/v40/PUSH_MANIFESTS.md" in names, "tools/v40/PUSH_MANIFESTS.md missing from ZIP"
    assert "tools/v39/test39.js" in names, "tools/v39/test39.js missing from ZIP"
    assert "tools/v39/verify-v39c.js" in names, "tools/v39/verify-v39c.js missing from ZIP"
    assert "tools/v39/repro-v39.js" in names, "tools/v39/repro-v39.js missing from ZIP"
    assert "tools/v39/PUSH_MANIFESTS.md" in names, "tools/v39/PUSH_MANIFESTS.md missing from ZIP"
    assert "tools/v38/test38.js" in names, "tools/v38/test38.js missing from ZIP"
    assert "tools/v38/verify-v38c.js" in names, "tools/v38/verify-v38c.js missing from ZIP"
    assert "tools/v38/repro-v38.js" in names, "tools/v38/repro-v38.js missing from ZIP"
    assert "tools/v38/PUSH_MANIFESTS.md" in names, "tools/v38/PUSH_MANIFESTS.md missing from ZIP"
    assert "tools/v37/test37.js" in names, "tools/v37/test37.js missing from ZIP"
    assert "tools/v37/verify-v37c.js" in names, "tools/v37/verify-v37c.js missing from ZIP"
    assert "tools/v37/repro-v37.js" in names, "tools/v37/repro-v37.js missing from ZIP"
    assert "tools/v37/PUSH_MANIFESTS.md" in names, "tools/v37/PUSH_MANIFESTS.md missing from ZIP"
    assert not any(n.startswith("tools/v43/backup-v18.7/") for n in names), "ZIP must not contain tools/v43/backup-v18.7/ (build input)"
    assert not any(n.startswith("tools/v43/pristine-v18.7-out/") for n in names), "ZIP must not contain tools/v43/pristine-v18.7-out/ (build input)"
    assert not any(n.startswith("tools/v43/logs/") for n in names), "ZIP must not contain tools/v43/logs/"
    assert not any(n.startswith("tools/v43/shots/") for n in names), "ZIP must not contain tools/v43/shots/"
    assert not any(n.startswith("tools/v43/repro/") for n in names), "ZIP must not contain tools/v43/repro/ (before-state evidence stays out)"
    assert not any(n.startswith("tools/v45/backup-v18.9/") for n in names), "ZIP must not contain tools/v45/backup-v18.9/ (build input)"
    assert not any(n.startswith("tools/v45/pristine-v18.9-out/") for n in names), "ZIP must not contain tools/v45/pristine-v18.9-out/ (build input)"
    assert not any(n.startswith("tools/v45/logs/") for n in names), "ZIP must not contain tools/v45/logs/"
    assert not any(n.startswith("tools/v45/shots/") for n in names), "ZIP must not contain tools/v45/shots/"
    assert not any(n.startswith("tools/v45/repro-A/") for n in names), "ZIP must not contain tools/v45/repro-A/ (before-state evidence stays out)"
    assert not any(n.startswith("tools/v45/repro-B/") for n in names), "ZIP must not contain tools/v45/repro-B/ (before-state evidence stays out)"
    assert not any(n.startswith("tools/v45/repro-C/") for n in names), "ZIP must not contain tools/v45/repro-C/ (before-state evidence stays out)"
    assert not any(n.startswith("tools/v44/backup-v18.8/") for n in names), "ZIP must not contain tools/v44/backup-v18.8/ (build input)"
    assert not any(n.startswith("tools/v44/pristine-v18.8-out/") for n in names), "ZIP must not contain tools/v44/pristine-v18.8-out/ (build input)"
    assert not any(n.startswith("tools/v44/logs/") for n in names), "ZIP must not contain tools/v44/logs/"
    assert not any(n.startswith("tools/v44/shots/") for n in names), "ZIP must not contain tools/v44/shots/"
    assert not any(n.startswith("tools/v44/repro/") for n in names), "ZIP must not contain tools/v44/repro/ (before-state evidence stays out)"
    assert not any(n.startswith("tools/v42/backup-v18.6/") for n in names), "ZIP must not contain tools/v42/backup-v18.6/ (build input)"
    assert not any(n.startswith("tools/v42/pristine-v18.6-out/") for n in names), "ZIP must not contain tools/v42/pristine-v18.6-out/ (build input)"
    assert not any(n.startswith("tools/v42/logs/") for n in names), "ZIP must not contain tools/v42/logs/"
    assert not any(n.startswith("tools/v42/shots/") for n in names), "ZIP must not contain tools/v42/shots/"
    assert not any(n.startswith("tools/v41/backup-v18.5/") for n in names), "ZIP must not contain tools/v41/backup-v18.5/ (build input)"
    assert not any(n.startswith("tools/v41/logs/") for n in names), "ZIP must not contain tools/v41/logs/"
    assert not any(n.startswith("tools/v41/shots/") for n in names), "ZIP must not contain tools/v41/shots/"
    assert not any(n.startswith("tools/v40/backup-v18.4/") for n in names), "ZIP must not contain tools/v40/backup-v18.4/ (build input)"
    assert not any(n.startswith("tools/v40/logs/") for n in names), "ZIP must not contain tools/v40/logs/"
    assert not any(n.startswith("tools/v40/shots/") for n in names), "ZIP must not contain tools/v40/shots/"
    assert not any(n.startswith("tools/v39/backup-v18.3/") for n in names), "ZIP must not contain tools/v39/backup-v18.3/ (build input)"
    assert not any(n.startswith("tools/v39/logs/") for n in names), "ZIP must not contain tools/v39/logs/"
    assert not any(n.startswith("tools/v39/shots/") for n in names), "ZIP must not contain tools/v39/shots/"
    assert not any(n.startswith("tools/v38/backup-v18.2/") for n in names), "ZIP must not contain tools/v38/backup-v18.2/ (build input)"
    assert not any(n.startswith("tools/v38/logs/") for n in names), "ZIP must not contain tools/v38/logs/"
    assert not any(n.startswith("tools/v38/shots/") for n in names), "ZIP must not contain tools/v38/shots/"
    assert not any(n.startswith("tools/v37/backup-v18.1/") for n in names), "ZIP must not contain tools/v37/backup-v18.1/ (build input)"
    assert not any(n.startswith("tools/v37/logs/") for n in names), "ZIP must not contain tools/v37/logs/"
    assert not any(n.startswith("tools/v37/shots/") for n in names), "ZIP must not contain tools/v37/shots/"
    assert "README_V18_1_BUG_FIXES.md" in names and "CHANGELOG_V18_0_to_V18_1.md" in names
    assert "README_V18_2_SCOPE_BANNER_FIX.md" in names and "CHANGELOG_V18_1_to_V18_2.md" in names
    assert "README_V18_3_BOSS_WORD_SETS.md" in names and "CHANGELOG_V18_2_to_V18_3.md" in names
    assert "README_V18_4_KOREAN_BOSSES.md" in names and "CHANGELOG_V18_3_to_V18_4.md" in names
    assert "README_V18_5_BUG_FIXES_II.md" in names and "CHANGELOG_V18_4_to_V18_5.md" in names
    assert "README_V18_6_BUG_FIXES_III.md" in names and "CHANGELOG_V18_5_to_V18_6.md" in names
    assert "README_V18_7_UNLOCK_SHORTCUTS.md" in names and "CHANGELOG_V18_6_to_V18_7.md" in names
    assert "README_V18_8_BOSS_FIGHT_READABILITY.md" in names and "CHANGELOG_V18_7_to_V18_8.md" in names
    assert "README_V18_9_LEGENDARY_FREEZE_FIX.md" in names and "CHANGELOG_V18_8_to_V18_9.md" in names
    assert "README_V19_0_ROUND3_BUG_FIXES.md" in names and "CHANGELOG_V18_9_to_V19_0.md" in names
    assert "SMOKE_TEST_V18_1_2026-11-19.md" in names
    assert "SMOKE_TEST_V18_2_2026-11-19.md" in names
    assert "SMOKE_TEST_V18_3_2026-11-19.md" in names
    assert "SMOKE_TEST_V18_4_2026-11-19.md" in names
    assert "SMOKE_TEST_V18_5_2026-11-20.md" in names
    assert "SMOKE_TEST_V18_6_2026-11-20.md" in names
    assert "SMOKE_TEST_V18_7_2026-11-20.md" in names
    assert "SMOKE_TEST_V18_8_2026-11-21.md" in names
    assert "SMOKE_TEST_V18_9_2026-11-21.md" in names
    assert "SMOKE_TEST_V19_0_2026-11-21.md" in names
    v10 = [n for n in names if n.startswith("assets/bosses/v10/v10_") and n.endswith(".png")]
    assert len(v10) == 30, f"zip has {len(v10)} V10 boss PNGs, expected 30"
    v11 = [n for n in names if n.startswith("assets/bosses/v11/v11_") and n.endswith(".png")]
    assert len(v11) == 30, f"zip has {len(v11)} V11 boss PNGs, expected 30"
    v17 = [n for n in names if n.startswith("assets/bosses/v17/v17_") and n.endswith(".png")]
    assert len(v17) == 8, f"zip has {len(v17)} V17 boss PNGs, expected 8"
    v18 = [n for n in names if n.startswith("assets/bosses/v18/v18_") and n.endswith(".png")]
    assert len(v18) == 8, f"zip has {len(v18)} V18 boss PNGs, expected 8"
    pets = [n for n in names if n.startswith("assets/pets/v15/") and n.endswith(".png")]
    assert len(pets) == 53, f"zip has {len(pets)} pet PNGs, expected 53 (36 forms + 5 eggs + 9 chrono stages + 3 chrono eggs)"
    chrono_pets = [n for n in names if n.startswith("assets/pets/v15/chrono/") and n.endswith(".png")]
    assert len(chrono_pets) == 9, f"zip has {len(chrono_pets)} Chrono pet stage PNGs, expected 9"
    chrono_eggs = [n for n in names if n.startswith("assets/pets/v15/eggs/chrono_egg_") and n.endswith(".png")]
    assert len(chrono_eggs) == 3, f"zip has {len(chrono_eggs)} Chrono egg PNGs, expected 3"
    sky_pets = [n for n in names if n.startswith("assets/pets/v18/") and n.endswith(".png")]
    assert len(sky_pets) == 12, f"zip has {len(sky_pets)} Skyroot pet PNGs, expected 12 (9 stages + 3 eggs)"
    assert not any(n.startswith("assets/pets/v17/") for n in names), "ZIP must not contain assets/pets/v17/ (MOVE decision)"
    assert not any(n.startswith("tools/v35/assets-staging/") for n in names), "ZIP must not contain tools/v35/assets-staging/ (build input, not deliverable)"
    assert not any(n.startswith("tools/v35/raw-originals/") for n in names), "ZIP must not contain tools/v35/raw-originals/"
    html = z.read("index.html").decode("utf-8")
    assert 'id="v45"' in html and 'id="v45js"' in html, "index.html missing V45 layer"
    assert "__v45" in html and "19.0.0" in html, "index.html missing V45 version"
    assert 'id="v44js"' in html, "index.html missing V44 layer"
    assert "__v44" in html and "18.9.0" in html, "index.html missing V44 version"
    assert 'id="v43"' in html and 'id="v43js"' in html, "index.html missing V43 layer"
    assert "__v43" in html and "18.8.0" in html, "index.html missing V43 version"
    assert 'id="v42"' in html and 'id="v42js"' in html, "index.html missing V42 layer"
    assert "__v42" in html and "18.7.0" in html, "index.html missing V42 version"
    assert 'id="v41"' in html and 'id="v41js"' in html, "index.html missing V41 layer"
    assert "__v41" in html and "18.6.0" in html, "index.html missing V41 version"
    assert 'id="v40"' in html and 'id="v40js"' in html, "index.html missing V40 layer"
    assert "__v40" in html and "18.5.0" in html, "index.html missing V40 version"
    assert 'id="v39"' in html and 'id="v39js"' in html, "index.html missing V39 layer"
    assert "__v39" in html and "18.4.0" in html, "index.html missing V39 version"
    assert 'id="v38"' in html and 'id="v38js"' in html, "index.html missing V38 layer"
    assert "__v38" in html and "18.3.0" in html, "index.html missing V38 version"
    assert 'id="v37"' in html and 'id="v37js"' in html, "index.html missing V37 layer"
    assert "__v37" in html and "18.2.0" in html, "index.html missing V37 version"
    assert 'id="v36"' in html and 'id="v36js"' in html, "index.html missing V36 layer"
    assert "__v36" in html and "18.1.0" in html, "index.html missing V36 version"
    assert 'id="v35"' in html and 'id="v35js"' in html and 'id="v35data"' in html, "index.html missing V35 layer"
    assert "__v35" in html and "18.0.0" in html, "index.html missing V35 version"
    assert 'id="v34"' in html and 'id="v34js"' in html, "index.html missing V34 layer"
    assert 'id="v33"' in html and 'id="v33js"' in html, "index.html missing V33 layer"
    assert 'id="v32"' in html and 'id="v32js"' in html, "index.html missing V32 layer"
    assert 'id="v31"' in html and 'id="v31js"' in html, "index.html missing V31 layer"
    # V45 must be the LAST style/script (wins the cascade)
    assert html.rfind('id="v45"') > html.rfind('id="v43"'), "V45 style is not after V43"
    assert html.rfind('id="v45js"') > html.rfind('id="v44js"'), "V45 script is not after V44"
    assert html.rfind('id="v43"') > html.rfind('id="v42"'), "V43 style is not after V42"
    assert html.rfind('id="v43js"') > html.rfind('id="v42js"'), "V43 script is not after V42"
    assert html.rfind('id="v44js"') > html.rfind('id="v43js"'), "V44 script is not after V43"
    assert html.rfind('id="v42"') > html.rfind('id="v41"'), "V42 style is not after V41"
    assert html.rfind('id="v42js"') > html.rfind('id="v41js"'), "V42 script is not after V41"
    assert html.rfind('id="v41"') > html.rfind('id="v40"'), "V41 style is not after V40"
    assert html.rfind('id="v41js"') > html.rfind('id="v40js"'), "V41 script is not after V40"
    assert html.rfind('id="v40"') > html.rfind('id="v39"'), "V40 style is not after V39"
    assert html.rfind('id="v40js"') > html.rfind('id="v39js"'), "V40 script is not after V39"
    assert html.rfind('id="v39"') > html.rfind('id="v38"'), "V39 style is not after V38"
    assert html.rfind('id="v39js"') > html.rfind('id="v38js"'), "V39 script is not after V38"
    assert html.rfind('id="v38"') > html.rfind('id="v37"'), "V38 style is not after V37"
    assert html.rfind('id="v38js"') > html.rfind('id="v37js"'), "V38 script is not after V37"
    assert html.rfind('id="v37"') > html.rfind('id="v36"'), "V37 style is not after V36"
    assert html.rfind('id="v37js"') > html.rfind('id="v36js"'), "V37 script is not after V36"
    assert html.find('id="v35data"') < html.find('id="v35js"'), "v35data must load before v35js"
    # R-V32-VER present exactly once in the ZIP's index.html, plus one
    # mention in the v32.js header comment — 2x total.
    assert html.count("bad-version") == 2, f"ZIP index.html: 'bad-version' present {html.count('bad-version')}x, expected 2 (1 guard + 1 v32.js header mention)"
    assert html.count("bad-version:'+obj.v7.meta.saveVersion") == 1, "ZIP index.html: bad-version guard text count != 1"
    # V31 in-scope fragments still present in the ZIP's index.html
    for frag in IN_SCOPE_FRAGMENTS:
        n = html.count(frag)
        assert n >= 1, f"ZIP index.html: V31 in-scope fragment missing: {frag[:60]}"
        print(f"  V31 in-scope fragment OK ({n}x): {frag[:60]}")
    # V33–V40 in-scope fragments present in the ZIP's index.html
    for _label, _frags in [("V33", _b41.V33_FRAGMENTS), ("V34", _b41.V34_FRAGMENTS),
                           ("V35", _b41.V35_FRAGMENTS), ("V36", _b41.V36_FRAGMENTS),
                           ("V37", _b41.V37_FRAGMENTS), ("V38", _b41.V38_FRAGMENTS),
                           ("V39", _b41.V39_FRAGMENTS), ("V40", _b41.V40_FRAGMENTS)]:
        for frag in _frags:
            n = html.count(frag)
            assert n >= 1, f"ZIP index.html: {_label} in-scope fragment missing: {frag[:60]}"
            print(f"  {_label} in-scope fragment OK ({n}x): {frag[:60]}")
    # V41 in-scope fragments present in the ZIP's index.html
    for frag in V41_FRAGMENTS:
        n = html.count(frag)
        assert n >= 1, f"ZIP index.html: V41 in-scope fragment missing: {frag[:60]}"
        print(f"  V41 in-scope fragment OK ({n}x): {frag[:60]}")
    # V43 in-scope fragments present in the ZIP's index.html
    for frag in V43_FRAGMENTS:
        n = html.count(frag)
        assert n >= 1, f"ZIP index.html: V43 in-scope fragment missing: {frag[:60]}"
        print(f"  V43 in-scope fragment OK ({n}x): {frag[:60]}")
    # V44 in-scope fragments present in the ZIP's index.html
    for frag in V44_FRAGMENTS:
        n = html.count(frag)
        assert n >= 1, f"ZIP index.html: V44 in-scope fragment missing: {frag[:60]}"
        print(f"  V44 in-scope fragment OK ({n}x): {frag[:60]}")
    # V45 in-scope fragments present in the ZIP's index.html
    for frag in V45_FRAGMENTS:
        n = html.count(frag)
        assert n >= 1, f"ZIP index.html: V45 in-scope fragment missing: {frag[:60]}"
        print(f"  V45 in-scope fragment OK ({n}x): {frag[:60]}")
    # V45 exact counts.
    assert html.count("legDiff") == 16, f"ZIP index.html: legDiff occurrences != 16 (got {html.count('legDiff')}) (15 in base + 1 in the v45.js header comment naming V19.0.1)"
    assert html.count("Không đọc được bản lưu cũ") == 2, "ZIP index.html: corrupt-save warning copy != 2"
    assert html.count("hanvocab.v12.corrupt-") == 2, "ZIP index.html: quarantine key pattern != 2"
    assert html.count("window.__V45_CORRUPT") == 5, "ZIP index.html: __V45_CORRUPT != 5"
    assert html.count("__v45corruptShown") == 2, "ZIP index.html: __v45corruptShown != 2"
    assert html.count('.v34weakchip{color:var(--ui-title-gold,#FFD76A);border-color:var(--ui-border,#A78BFA);background:rgba(255,215,106,.08)}') == 5, "ZIP index.html: weakchip dark rule != 5"
    assert html.count('.v19zboss .v34weakchip{color:var(--ui-title-gold,#FFD76A);border-color:var(--ui-border,#A78BFA);background:rgba(255,215,106,.08)}') == 1, "ZIP index.html: weakchip v19zboss rule != 1"
    assert html.count('.v34weakchip{color:#7A5B00;border-color:#7A5B00;background:rgba(122,91,0,.08)}') == 2, "ZIP index.html: weakchip light rule != 2"
    assert html.count("if(!name)return '';") == 1, "ZIP index.html: enIcon() falsy guard != 1"
    assert html.count("enIcon(t.icon)") == 1, "ZIP index.html: topicsHTML enIcon(t.icon) call site != 1"
    # V45: the OLD due lines / OLD load() / OLD enIcon() / OLD snapshot key are GONE.
    assert "if((e.due[w.id]||0)<=now)c.due++;" not in html, "ZIP index.html: OLD counts15 due line still present"
    assert "if(sc.status==='due'&&(e.due[w.id]||0)>Date.now())return false;" not in html, "ZIP index.html: OLD wordsFiltered status filter still present"
    assert "if(o.onlyDue){var due=e.due[w.id]||0;if(due>Date.now())return false}" not in html, "ZIP index.html: OLD onlyDue line still present"
    assert "var due=WORDS.filter(function(w){return inScope15(w)&&(e.due[w.id]||0)<=now});" not in html, "ZIP index.html: OLD reviewHTML due filter still present"
    assert "if((e.due[w.id]||0)<=now)s.due++;" not in html, "ZIP index.html: OLD v17 statsOf due line still present"
    assert "if(dueOf(w.id)<=now)s.due++;" not in html, "ZIP index.html: OLD v25 statsOf due line still present"
    assert "if(c.box>=1&&c.due<=now)dueN++;" not in html, "ZIP index.html: OLD v27 dashboard dueN EN still present"
    assert "if((due[w.id]||0)<=now)s.due++;" not in html, "ZIP index.html: OLD v34 statsForList due line still present"
    assert "function load(){try{const j=JSON.parse(localStorage.getItem(KEY));if(j&&j.cards)" not in html, "ZIP index.html: OLD load() still present"
    assert "function enIcon(name){ return '<img src=\"assets/icons/v6/'+name+'\"" not in html, "ZIP index.html: OLD enIcon() still present"
    assert "var k='hanvocab.v12.preimport-'+Date.now();" not in html, "ZIP index.html: OLD colliding snapshot key still present"
    assert "var h=readHistory().filter(function(e){ return e.at!==at; });" not in html, "ZIP index.html: OLD deleteHistoryEntry (delete-all-same-ms) still present"
    # V44 exact counts: the hoist line twice, the OLD per-item lines gone.
    assert html.count("var lv=b.arena==='leg'?legDiff():null;") == 2, "ZIP index.html: hoisted legDiff() != 2"
    assert "if(b.arena==='leg'){var lv=legDiff();" not in html, "ZIP index.html: old per-word legDiff() call still present"
    assert "legDiff().indexOf(x.lv)" not in html, "ZIP index.html: old per-grammar legDiff() call still present"
    # V43 exact-count fragments (blocked break-bar rules added after
    # the first Chrome run caught them; the pet-skill rule is the
    # disabled-state fix).
    assert html.count(".v19fight .v34bar-t{color:#fff}") == 1, "ZIP index.html: V19 breakbar-t rule != 1"
    assert html.count(".v19fight .v34bar.v34blocked .mute{color:var(--ui-text-muted-dark,#C4B9E2)}") == 1, "ZIP index.html: V19 blocked-bar mute rule != 1"
    assert html.count(".v18fight .v34bar-t{color:var(--ink)}") == 1, "ZIP index.html: V18 breakbar-t rule != 1"
    assert html.count(".v18fight .v34bar.v34blocked .mute{color:var(--ink)}") == 1, "ZIP index.html: V18 blocked-bar mute rule != 1"
    assert html.count(".v23bar-fight .v23bf-skill:disabled{opacity:1;background:#6E5F3E;color:#FFF8E1;border-color:#8A7A52;cursor:not-allowed}") == 1, "ZIP index.html: disabled pet-skill rule != 1"
    assert html.count(".v19fight .v19qword{color:#fff}") == 1, "ZIP index.html: V19 qword rule != 1"
    assert html.count(".v18fight .v18qword{color:var(--ink)}") == 1, "ZIP index.html: V18 qword rule != 1"
    # V42 in-scope fragments present in the ZIP's index.html
    for frag in V42_FRAGMENTS:
        n = html.count(frag)
        assert n >= 1, f"ZIP index.html: V42 in-scope fragment missing: {frag[:60]}"
        print(f"  V42 in-scope fragment OK ({n}x): {frag[:60]}")
    # V40 exact-count fragments
    assert html.count("checkPhase:checkPhase") == 2, "ZIP index.html: checkPhase exports != 2"
    assert html.count("F.banner=F.koWarn='⚠️ Bạn mới có '+_kc40") == 2, "ZIP index.html: koWarn banner lines != 2"
    assert html.count("F.banner=F.koWarn||null;") == 2, "ZIP index.html: next() koWarn restore != 2"
    assert html.count("topic:sc.topic,lesson:sc.lesson};") == 2, "ZIP index.html: sc2 topic/lesson != 2"
    assert html.count("Đang tải bộ từ Basic Tactics") == 2, "ZIP index.html: BT loading states != 2"
    # V41 exact-count fragments
    assert html.count("indexOf('ca-')===0") == 4, "ZIP index.html: CA gate != 4"
    assert html.count("Math.min(3,F.caRight)") == 1, "ZIP index.html: resolveUltimate clamp != 1"
    assert html.count("if(!j.opt)j.opt={mode:'card',dir:'kv',group:'',due:false}") == 1, "ZIP index.html: load() opt default != 1"
    assert html.count("var old=$('#v15farmquiz');if(old)old.remove();") == 1, "ZIP index.html: farmPlotTap removal != 1"
    assert html.count("try{ flush(); }catch(e){}") == 2, "ZIP index.html: importFile flush != 2"
    assert html.count("try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}") == 6, "ZIP index.html: backupImport flush guard != 6"
    assert html.count(':root .tab{flex:0 0 auto;min-width:64px;padding:6px 8px;font-size:10px}') == 1, "ZIP index.html: nav rule != 1"
    assert html.count('"src": "a1a2"') == 999, "ZIP index.html: A1-A2 raw rows != 999"
    assert html.count('"src": "oxford"') == 3395, "ZIP index.html: Oxford raw rows != 3395"
    assert html.count('"no": 864}') == 0, "ZIP index.html: dropped airplane row still present"
    assert html.count('"ord": 942') == 0, "ZIP index.html: dropped each-other row still present"
    assert html.count('"no": 863}') == 1, "ZIP index.html: kept airplane row != 1"
    assert html.count('"ord": 941') == 1, "ZIP index.html: kept each-other row != 1"
    # V42 exact-count fragments
    assert html.count("chronoGateHTML") == 6, f"ZIP index.html: chronoGateHTML != 6 (got {html.count('chronoGateHTML')})"
    assert html.count("skyrootGateHTML") == 6, f"ZIP index.html: skyrootGateHTML != 6 (got {html.count('skyrootGateHTML')})"
    assert html.count("window.__v42?window.__v42.chronoGateHTML(lang,gate)") == 1, "ZIP index.html: R-V42-V33-GATE call site != 1"
    assert html.count("window.__v42?window.__v42.skyrootGateHTML(lang,gate)") == 1, "ZIP index.html: R-V42-V35-GATE call site != 1"
    assert html.count("Không có đường tắt") == 0, "ZIP index.html: old 'Không có đường tắt' line still present"
    assert html.count("Thắng đủ 70 boss để mở vùng đất này — số liệu là thật") == 1, "ZIP index.html: new Chrono gate copy != 1"
    assert html.count(".v42btn{min-height:44px") == 1, "ZIP index.html: v42.css rule != 1"
    assert html.count("window.__v42={") == 1, "ZIP index.html: __v42 export != 1"
    assert html.count("Không tìm thấy boss nào có thể đánh ngay") == 2, "ZIP index.html: V42 skyroot null-state copy != 2"
    # V41 deliberately-unchanged guards
    assert html.count("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}") == 1, "ZIP index.html: legDiff changed (must stay as-is)"
    assert html.count("/* V39 (V18.4): KO boss answers also feed Smart Learning (V27) —") == 2, "ZIP index.html: markKO/markKO19 changed (C-R2-1 needs Anh's decision)"
    # V39 banner fragments SUPERSEDED by V40: must be ABSENT
    assert "koCount18()<8" not in html, "ZIP index.html: superseded V39 fragment koCount18()<8 still present"
    assert "F.banner='⚠️ Bạn mới có '+koCount18()" not in html, "ZIP index.html: superseded V39 banner line still present"
    assert "F.banner='⚠️ Bạn mới có '+koCount()" not in html, "ZIP index.html: superseded V39 banner line still present"
    print("  V39 superseded fragments absent OK")
    # V17-4 typo: zero occurrences of the old spelling anywhere in the ZIP
    assert html.count("NGHỀNGHIỆP") == 0, "ZIP index.html still contains the NGHỀNGHIỆP typo"
    print("  typo check OK: NGHỀNGHIỆP 0x in index.html")
    # out-of-scope replacements absent from the ZIP's index.html
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in html, f"ZIP index.html: out-of-scope marker present: {marker}"
    print("  out-of-scope markers absent OK")
    # KO: v35kotab button x1 (after v33kotab); v33kotab + v27kotab + v23kotab still x1.
    assert html.count('<button class="tab v35kotab"') == 1, "ZIP index.html: KO v35kotab button count != 1"
    assert html.count('<button class="tab v33kotab"') == 1, "ZIP index.html: KO v33kotab button count != 1"
    assert html.count('<button class="tab v27kotab"') == 1, "ZIP index.html: KO v27kotab button count != 1"
    assert html.count('<button class="tab v23kotab"') == 1, "ZIP index.html: KO v23kotab button count != 1"
    print("  KO entry check OK: 1 x v35kotab, 1 x v33kotab, 1 x v27kotab, 1 x v23kotab")
    # old layers intact
    for mid in ('id="v15js"', 'id="v16js"', 'id="v17js"', 'id="v18js"',
                'id="v19js"', 'id="v20js"', 'id="v21js"', 'id="v22js"', 'id="v23js"',
                'id="v24js"', 'id="v25js"', 'id="v26js"', 'id="v27js"', 'id="v31js"', 'id="v32js"', 'id="v33js"', 'id="v34js"', 'id="v37js"', 'id="v38js"', 'id="v39js"', 'id="v40js"', 'id="v41js"', 'id="v42js"', 'id="v43js"', 'id="v44js"', 'id="v45js"'):
        assert mid in html, f"index.html missing layer {mid}"
    assert "VERSION='15.1.0'" in html, "old layers lost version 15.1.0"
    assert "VERSION='15.2.0'" in html, "old layers lost version 15.2.0"
    assert "VERSION='16.0.0'" in html, "index.html missing V27 version 16.0.0"
    assert "VERSION='16.3.0'" in html, "index.html missing V31 version 16.3.0"
    assert "VERSION='16.4.0'" in html, "index.html missing V32 version 16.4.0"
    assert "VERSION='17.0.0'" in html, "index.html missing V33 version 17.0.0"
    assert "VERSION='17.1.0'" in html, "index.html missing V34 version 17.1.0"
    assert "VERSION='18.1.0'" in html, "index.html missing V36 version 18.1.0"
    assert "VERSION='18.2.0'" in html, "index.html missing V37 version 18.2.0"
    assert "VERSION='18.3.0'" in html, "index.html missing V38 version 18.3.0"
    assert "VERSION='18.4.0'" in html, "index.html missing V39 version 18.4.0"
    assert "VERSION='18.5.0'" in html, "index.html missing V40 version 18.5.0"
    assert "VERSION='18.6.0'" in html, "index.html missing V41 version 18.6.0"
    assert "VERSION='18.7.0'" in html, "index.html missing V42 version 18.7.0"
    assert "VERSION='18.8.0'" in html, "index.html missing V43 version 18.8.0"
    assert "VERSION='18.9.0'" in html, "index.html missing V44 version 18.9.0"
    assert "VERSION='19.0.0'" in html, "index.html missing V45 version 19.0.0"
    assert "Vocab Farm V19.0" in html, "index.html title is not V19.0"
    assert "korean-vocab-farm-backup-v7.json" not in html, "stale v7 backup filename in ZIP"
    # firebase-config.js in the ZIP must be the placeholder (never the repo's real config)
    if "firebase-config.js" in names:
        cfg = z.read("firebase-config.js").decode("utf-8", "replace")
        assert "YOUR_API_KEY" in cfg or 'apiKey: ""' in cfg or "apiKey:''" in cfg, (
            "ZIP firebase-config.js is not the placeholder — refusing to ship a real config")
        print("  firebase-config.js in ZIP is the placeholder (repo config untouched)")
    print("zip checks OK:", len(names), "entries")
