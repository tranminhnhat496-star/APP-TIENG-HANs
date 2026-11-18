#!/usr/bin/env python3
"""Package the V16 Smart Learning deliverable ZIP from out/ + docs.
Run AFTER build_v16.py and AFTER the smoke tests pass (final packaging
is re-run by the coordinator once tools/v16/test27.js lands).
Output: ~/workspace/v7build/Korean_English_Vocab_Farm_V16_Smart_Learning.zip
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
        "CHANGELOG_V6_to_V7.md", "CHANGELOG_V7_to_V8.md",
        "CHANGELOG_V8_to_V9.md", "CHANGELOG_V9_to_V10.md",
        "CHANGELOG_V10_to_V11.md", "CHANGELOG_V11_to_V11_1.md", "CHANGELOG_V11_1_to_V12.md", "CHANGELOG_V12_to_V13.md", "CHANGELOG_V13_to_V14.md", "CHANGELOG_V14_to_V15.md",
        "CHANGELOG_V15_to_V15_1.md", "CHANGELOG_V15_1_to_V15_2.md", "CHANGELOG_V15_2_to_V15_3.md",
        "CHANGELOG_V15_3_to_V16.md",
        "CHANGED_FILES.md",
        "GITHUB_DESKTOP_GUIDE.md", "SMOKE_TEST_V10_2026-11-17.md",
        "SMOKE_TEST_V11_2026-11-17.md", "SMOKE_TEST_V11_1_2026-11-17.md", "SMOKE_TEST_V12_2026-11-17.md", "SMOKE_TEST_V13_2026-11-17.md",
        "FIREBASE_SETUP.md",
        "REPORT_PDF_EXTRACTION.md", "REPORT_BASIC_TACTICS.md", "REVIEW_LIST_V14.md",
        "ASSET_REPORT_V10.md", "ASSET_REPORT_V11.md",
        "SMOKE_TEST_V14_2026-11-17.md", "ASSET_REPORT_V15.md", "SMOKE_TEST_V15_2026-11-17.md",
        "SMOKE_TEST_V15_1_2026-11-17.md", "SMOKE_TEST_V15_2_2026-11-17.md", "SMOKE_TEST_V15_3_2026-11-17.md",
        "SMOKE_TEST_V16_2026-11-18.md"]
ZIP = HERE / "Korean_English_Vocab_Farm_V16_Smart_Learning.zip"

assert (OUT / "index.html").exists(), "run build_v16.py first"
assert (OUT / "v27.js").exists() and (OUT / "v27.css").exists(), "V27 layer missing from out/"
for d in DOCS:
    src = HERE / d
    assert src.exists(), f"missing doc {d}"
    shutil.copy2(src, OUT / d)

# build + package scripts travel with the deliverable (reproducibility)
shutil.copy2(HERE / "package_v16.py", OUT / "package_v16.py")

# test harness (no screenshots: PNGs stay in the workspace only)
for tool_dir in ("v15ui", "v15lib", "v15nav", "v16"):
    tools_src = HERE / "tools" / tool_dir
    assert tools_src.is_dir(), f"tools/{tool_dir} missing"
    for p in sorted(tools_src.rglob("*")):
        if p.is_file() and "shots-before" not in p.parts and "shots-after" not in p.parts and "zip-extract" not in p.parts:
            rel = p.relative_to(tools_src)
            dst = OUT / "tools" / tool_dir / rel
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
# sanity: index.html at zip root, V27 layer + all old layers present
with zipfile.ZipFile(ZIP) as z:
    names = z.namelist()
    assert "index.html" in names
    assert "v27.js" in names and "v27.css" in names and "build_v16.py" in names and "package_v16.py" in names
    # test27.js is written by the test agent AFTER the build; first packaging
    # warns instead of failing, and the FINAL packaging is re-run after tests.
    if "tools/v16/test27.js" not in names:
        print("WARNING: tools/v16/test27.js not in ZIP yet (test agent has not written it) — "
              "re-run package_v16.py after the tests land for the final package.")
    else:
        print("tools/v16/test27.js present in ZIP")
    assert "README_V16_SMART_LEARNING.md" in names and "CHANGELOG_V15_3_to_V16.md" in names
    assert "tools/v16/TODO_Q1_merge_branch.md" in names
    v10 = [n for n in names if n.startswith("assets/bosses/v10/v10_") and n.endswith(".png")]
    assert len(v10) == 30, f"zip has {len(v10)} V10 boss PNGs, expected 30"
    v11 = [n for n in names if n.startswith("assets/bosses/v11/v11_") and n.endswith(".png")]
    assert len(v11) == 30, f"zip has {len(v11)} V11 boss PNGs, expected 30"
    pets = [n for n in names if n.startswith("assets/pets/v15/") and n.endswith(".png")]
    assert len(pets) == 41, f"zip has {len(pets)} pet PNGs, expected 41 (36 forms + 5 eggs)"
    html = z.read("index.html").decode("utf-8")
    assert 'id="v27"' in html and 'id="v27js"' in html, "index.html missing V27 layer"
    assert "__v27" in html and "16.0.0" in html, "index.html missing V27 version"
    # V27 must be the LAST style/script (wins the cascade)
    assert html.rfind('id="v27"') > html.rfind('id="v26"'), "V27 style is not after V26"
    assert html.rfind('id="v27js"') > html.rfind('id="v26js"'), "V27 script is not after V26"
    # hooks present exactly once in the built file
    for hook in ("__v27.recordAnswer('en',id,ok,mode)",
                 "__v27.recordAnswer('en',id,ok,'boss18')",
                 "__v27.recordAnswer('en',id,ok,'boss19')"):
        assert html.count(hook) == 1, f"index.html: hook present {html.count(hook)}x, expected 1: {hook}"
    assert html.count('<button class="tab v27kotab"') == 1, "index.html: KO v27kotab button missing/duplicated"
    # old layers intact
    for mid in ('id="v15js"', 'id="v16js"', 'id="v17js"', 'id="v18js"',
                'id="v19js"', 'id="v20js"', 'id="v21js"', 'id="v22js"', 'id="v23js"',
                'id="v24js"', 'id="v25js"', 'id="v26js"'):
        assert mid in html, f"index.html missing layer {mid}"
    assert "VERSION='15.1.0'" in html, "old layers lost version 15.1.0"
    assert "VERSION='15.2.0'" in html, "old layers lost version 15.2.0"
    assert "VERSION='16.0.0'" in html, "index.html missing V27 version 16.0.0"
    assert "Vocab Farm V16" in html, "index.html title is not V16"
    assert "--nav-bg" in html, "index.html missing V26 design tokens"
    assert "#201535" in html and ".v27hub" in html, "index.html missing V27 styles"
    print("zip checks OK:", len(names), "entries")
