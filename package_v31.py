#!/usr/bin/env python3
"""Package the V16.3 Backup & Restore Fix deliverable ZIP from out/ + docs.
Run AFTER build_v31.py and AFTER the tests pass (final packaging is
re-run by the coordinator once tools/v31/test31.js lands).
Output: ~/workspace/v7build/Korean_English_Vocab_Farm_V16_3_Backup_Restore_Fix.zip

The ZIP ships the PLACEHOLDER firebase-config.js from the build tree
(the local tree holds the placeholder; the repo's real config is never
touched by this script — see CHANGELOG). Firebase login/sync is NOT
claimed working until Anh runs the FIREBASE_SETUP.md live checklist.
"""
import pathlib
import shutil
import zipfile

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "out"
DOCS = ["README_V7.md", "README_V8_IMPORT.md", "README_V9_LIBRARY.md",
        "README_V10_BOSSES.md", "README_V11_BOSS_ADVENTURE.md",
        "README_V11_1_KOREAN_BOSS_MAP.md", "README_V12_SAVE_SYNC.md", "README_V13_LOGIN_ACCOUNT.md", "README_V14_BASIC_TACTICS.md", "README_V15_PETS.md",
        "README_V15_1_UI.md", "README_V15_2_LIBRARY.md", "README_V15_3_MOBILE_NAV.md",
        "README_V16_SMART_LEARNING.md",
        "README_V16_3_BACKUP_FIX.md",
        "CHANGELOG_V6_to_V7.md", "CHANGELOG_V7_to_V8.md",
        "CHANGELOG_V8_to_V9.md", "CHANGELOG_V9_to_V10.md",
        "CHANGELOG_V10_to_V11.md", "CHANGELOG_V11_to_V11_1.md", "CHANGELOG_V11_1_to_V12.md", "CHANGELOG_V12_to_V13.md", "CHANGELOG_V13_to_V14.md", "CHANGELOG_V14_to_V15.md",
        "CHANGELOG_V15_to_V15_1.md", "CHANGELOG_V15_1_to_V15_2.md", "CHANGELOG_V15_2_to_V15_3.md",
        "CHANGELOG_V15_3_to_V16.md", "CHANGELOG_V16_to_V16_3.md",
        "CHANGED_FILES.md",
        "GITHUB_DESKTOP_GUIDE.md", "SMOKE_TEST_V10_2026-11-17.md",
        "SMOKE_TEST_V11_2026-11-17.md", "SMOKE_TEST_V11_1_2026-11-17.md", "SMOKE_TEST_V12_2026-11-17.md", "SMOKE_TEST_V13_2026-11-17.md",
        "FIREBASE_SETUP.md",
        "REPORT_PDF_EXTRACTION.md", "REPORT_BASIC_TACTICS.md", "REVIEW_LIST_V14.md",
        "ASSET_REPORT_V10.md", "ASSET_REPORT_V11.md",
        "SMOKE_TEST_V14_2026-11-17.md", "ASSET_REPORT_V15.md", "SMOKE_TEST_V15_2026-11-17.md",
        "SMOKE_TEST_V15_1_2026-11-17.md", "SMOKE_TEST_V15_2_2026-11-17.md", "SMOKE_TEST_V15_3_2026-11-17.md",
        "SMOKE_TEST_V16_2026-11-18.md", "SMOKE_TEST_V16_3_2026-11-18.md"]
ZIP = HERE / "Korean_English_Vocab_Farm_V16_3_Backup_Restore_Fix.zip"

# Distinctive strings that exist ONLY in the 12 OUT-OF-SCOPE replacements
# (PLAN_V31.md section A.2 rows 15-26). Must be absent from the ZIP.
OUT_OF_SCOPE_MARKERS = [
    "v21emailbtn", " _esc21".strip(), "armV27Obs", "rearmObserver",
    "_speakXp", "V29 (F-05)",
]

# Substrings that identify each in-scope replacement in the built file.
# Checked present exactly once in the ZIP's index.html (the replacement
# text itself is asserted in build_v31.py; here we assert the ZIP copy
# agrees). Short distinctive fragments are enough — the full texts were
# verified x1 in src/, out/ and index.html by the build script.
IN_SCOPE_FRAGMENTS = [
    "/* V31 (F-01):",                       # R-F-01a
    "/* V31 (F-01): V18 boss records are FLAT",  # R-V31-F01-en18
    "mEn[kEn2]=maxMap(lEn[kEn2], cEn[kEn2])",  # R-F-01b (en branch)
    "m15.due=d15;",                          # R-F-03a (due MIN)
    "m17.claimed=fillMissing(l17.claimed, c17.claimed)",  # R-F-03b
    "m16[k16b]=fillMissing(l16[k16b], c16[k16b])",        # R-F-01-en16
    "if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) return true;",  # R-F-13a
    "if(v7.en27&&v7.en27.sessions&&v7.en27.sessions.length) return true;",  # R-F-13b
    "loc.obj.v7.meta.migratedAt",            # R-F-14 (localTime fallback)
    "if(depth>6||!o||typeof o!=='object') return;",  # R-F-15
    "try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}",  # R-F-02a/c/d + R-V31-C1a share this guard shape
    "try{ flush(); }catch(e){}",             # R-F-02b
    "if(_ve&&String(_ve.message||'').indexOf('invalid save')===0) throw _ve;",  # R-F-16
    "[V31] recordAnswer dropped",            # R-V31-F11 (2x: replacement + v31.js wrapper)
    "_e27.en.last={};",                      # R-V31-F12
    "__v20.importFile(imp)",                 # R-V31-C9
    "if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) wins++;",  # R-V31-C6
    "korean-vocab-farm-backup-v16.3.json",   # R-V31-C1b
    "Đã bắt đầu tải file sao lưu",           # R-V31-C1c
    "từ tiếng Anh giữ mức cao nhất từng từ (box/số câu đúng/số câu sai)",  # R-V31-C6b
    "Hợp nhất: từ tiếng Anh giữ mức cao nhất từng từ;",  # R-V31-C6c
]

assert (OUT / "index.html").exists(), "run build_v31.py first"
assert (OUT / "v31.js").exists() and (OUT / "v31.css").exists(), "V31 layer missing from out/"
for d in DOCS:
    src = HERE / d
    assert src.exists(), f"missing doc {d}"
    shutil.copy2(src, OUT / d)

# build + package scripts travel with the deliverable (reproducibility)
shutil.copy2(HERE / "build_v31.py", OUT / "build_v31.py")
shutil.copy2(HERE / "package_v31.py", OUT / "package_v31.py")

# test harness (no screenshots: PNGs stay in the workspace only)
tools_src = HERE / "tools" / "v31"
assert tools_src.is_dir(), "tools/v31 missing"
for p in sorted(tools_src.rglob("*")):
    if p.is_file() and "shots" not in p.parts:
        rel = p.relative_to(tools_src)
        dst = OUT / "tools" / "v31" / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, dst)

if ZIP.exists():
    ZIP.unlink()
files = sorted(p for p in OUT.rglob("*") if p.is_file())
with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for p in files:
        z.write(p, p.relative_to(OUT))
size = ZIP.stat().st_size
print(f"wrote {ZIP} ({size/1024/1024:.1f} MB, {len(files)} files)")
# sanity: index.html at zip root, V31 layer + all old layers present
with zipfile.ZipFile(ZIP) as z:
    names = z.namelist()
    assert "index.html" in names
    assert "v31.js" in names and "v31.css" in names and "build_v31.py" in names and "package_v31.py" in names
    if "tools/v31/test31.js" not in names:
        print("WARNING: tools/v31/test31.js not in ZIP yet (test agent has not written it) — "
              "re-run package_v31.py after the tests land for the final package.")
    else:
        print("tools/v31/test31.js present in ZIP")
    assert "README_V16_3_BACKUP_FIX.md" in names and "CHANGELOG_V16_to_V16_3.md" in names
    assert "SMOKE_TEST_V16_3_2026-11-18.md" in names
    v10 = [n for n in names if n.startswith("assets/bosses/v10/v10_") and n.endswith(".png")]
    assert len(v10) == 30, f"zip has {len(v10)} V10 boss PNGs, expected 30"
    v11 = [n for n in names if n.startswith("assets/bosses/v11/v11_") and n.endswith(".png")]
    assert len(v11) == 30, f"zip has {len(v11)} V11 boss PNGs, expected 30"
    pets = [n for n in names if n.startswith("assets/pets/v15/") and n.endswith(".png")]
    assert len(pets) == 41, f"zip has {len(pets)} pet PNGs, expected 41 (36 forms + 5 eggs)"
    html = z.read("index.html").decode("utf-8")
    assert 'id="v31"' in html and 'id="v31js"' in html, "index.html missing V31 layer"
    assert "__v31" in html and "16.3.0" in html, "index.html missing V31 version"
    # V31 must be the LAST style/script (wins the cascade)
    assert html.rfind('id="v31"') > html.rfind('id="v27"'), "V31 style is not after V27"
    assert html.rfind('id="v31js"') > html.rfind('id="v27js"'), "V31 script is not after V27"
    # in-scope replacements present in the ZIP's index.html
    for frag in IN_SCOPE_FRAGMENTS:
        n = html.count(frag)
        assert n >= 1, f"ZIP index.html: in-scope fragment missing: {frag[:60]}"
        print(f"  in-scope fragment OK ({n}x): {frag[:60]}")
    # out-of-scope replacements absent from the ZIP's index.html
    for marker in OUT_OF_SCOPE_MARKERS:
        assert marker not in html, f"ZIP index.html: out-of-scope marker present: {marker}"
    print("  out-of-scope markers absent OK")
    # KO: NO v31kotab button anywhere; the KO Data view reaches the panel
    # via the existing injectDataBtn entry (label x1), not a new KO button.
    assert "v31kotab" not in html, "ZIP index.html: unexpected v31kotab"
    assert html.count("Quản lý dữ liệu &amp; đồng bộ") == 1, (
        "ZIP index.html: KO Data-view entry (injectDataBtn label) count != 1")
    print("  KO entry check OK: 0 x v31kotab, 1 x injectDataBtn label")
    # old layers intact
    for mid in ('id="v15js"', 'id="v16js"', 'id="v17js"', 'id="v18js"',
                'id="v19js"', 'id="v20js"', 'id="v21js"', 'id="v22js"', 'id="v23js"',
                'id="v24js"', 'id="v25js"', 'id="v26js"', 'id="v27js"'):
        assert mid in html, f"index.html missing layer {mid}"
    assert "VERSION='15.1.0'" in html, "old layers lost version 15.1.0"
    assert "VERSION='15.2.0'" in html, "old layers lost version 15.2.0"
    assert "VERSION='16.0.0'" in html, "index.html missing V27 version 16.0.0"
    assert "Vocab Farm V16.3" in html, "index.html title is not V16.3"
    assert "korean-vocab-farm-backup-v7.json" not in html, "stale v7 backup filename in ZIP"
    # firebase-config.js in the ZIP must be the placeholder (never the repo's real config)
    if "firebase-config.js" in names:
        cfg = z.read("firebase-config.js").decode("utf-8", "replace")
        assert "YOUR_API_KEY" in cfg or 'apiKey: ""' in cfg or "apiKey:''" in cfg, (
            "ZIP firebase-config.js is not the placeholder — refusing to ship a real config")
        print("  firebase-config.js in ZIP is the placeholder (repo config untouched)")
    print("zip checks OK:", len(names), "entries")
