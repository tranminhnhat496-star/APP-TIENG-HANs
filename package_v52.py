"""Package the V19.5.1 ROUND-5 PATCH deliverable ZIP from out/ + docs.
Run AFTER the build (build_v52.py) and AFTER the tests pass
(test52.js is run on the built out/ AND on the packaged ZIP — counts
are recorded in SMOKE_TEST_V19_5_1_2026-11-24.md, not claimed here).
Output: ~/workspace/v7build/Korean_English_Vocab_Farm_V19_5_1_Patch.zip

The ZIP ships the PLACEHOLDER firebase-config.js from the build tree
(the local tree holds the placeholder; the repo's real config is never
touched by this script — see CHANGELOG). Firebase login/sync is NOT
claimed working until Anh runs the FIREBASE_SETUP.md live checklist.

V19.5.1 fixes exactly the 2 confirmed defects left from round 5:
C-R5-1 (MAJOR — boss grammar/sentence correct answers pay 0 XP;
director Claude decided DO 2026-11-24: pay +10 XP + streak via the
shared V46 function, wordless) and Android TTS (Anh's live report
2026-11-24: every "Nghe" button silent on Android — the game never
selected a voice). New file src/v52.js (window.__v52, the shared speak
helper); no v52.css (no UI change — the honest error goes through the
existing pop toasts). C-R5-1 touches src/v18.js + src/v19.js; TTS
touches src/v15.js + src/v18.js + src/v19.js + src/v22.js +
src/v27.js + src/v48.js (each keeps its old body as a fallback).
No rewards/XP-rate (word answers)/SRS/pets/save-schema change beyond
the two fixes; no per-fight XP cap exists in the code (verified) —
mixed-fight XP rises, caps NOT changed. OBS-1 + the forgeNext
double-call lead are deliberately NOT in this build (recorded as
leads in the changelog).
tools/v52 is copied ALLOWLIST-ONLY (PUSH_MANIFESTS.md):
test52.js + verify-v52c.js + repro-v52.js ARE inside the ZIP
(finished BEFORE packaging); the V19.5 backup (backup-v19.5/),
the pre-fix build inputs (backup-v19.5-build/), the make_* generator
scripts, the test-section source, logs and screenshots stay out.

Unlike package_v50.py, the out-vs-pristine diff here compares out/
against the FULL pristine V19.5 out/ tree in tools/v52/backup-v19.5/
— the checks here are: the V52 layer + fix fragments, the V50/V49/
V48/V47/V46 layers intact, the asset counts (no new art), the firebase
placeholder, and the exact out-vs-V19.5 diff.
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
        "README_V19_0_1_LEGDIFF_KO_XP.md",
        "CHANGELOG_V6_to_V7.md", "CHANGELOG_V7_to_V8.md",
        "CHANGELOG_V8_to_V9.md", "CHANGELOG_V9_to_V10.md",
        "CHANGELOG_V10_to_V11.md", "CHANGELOG_V11_to_V11_1.md", "CHANGELOG_V11_1_to_V12.md", "CHANGELOG_V12_to_V13.md", "CHANGELOG_V13_to_V14.md",
        "CHANGELOG_V14_to_V15.md",
        "CHANGELOG_V15_to_V15_1.md", "CHANGELOG_V15_1_to_V15_2.md", "CHANGELOG_V15_2_to_V15_3.md",
        "CHANGELOG_V15_3_to_V16.md", "CHANGELOG_V16_to_V16_3.md",
        "CHANGELOG_V16_3_to_V16_4.md",
        "CHANGELOG_V16_4_to_V17_0.md",
        "CHANGELOG_V17_0_to_V17_1.md", "CHANGELOG_V17_1_to_V18_0.md",
        "CHANGELOG_V18_0_to_V18_1.md",
        "CHANGELOG_V18_1_to_V18_2.md",
        "CHANGELOG_V18_2_to_V18_3.md",
        "CHANGELOG_V18_3_to_V18_4.md",
        "CHANGELOG_V18_4_to_V18_5.md",
        "CHANGELOG_V18_5_to_V18_6.md",
        "CHANGELOG_V18_6_to_V18_7.md",
        "CHANGELOG_V18_7_to_V18_8.md", "CHANGELOG_V18_8_to_V18_9.md",
        "CHANGELOG_V18_9_to_V19_0.md",
        "CHANGELOG_V19_0_to_V19_0_1.md",
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
        "SMOKE_TEST_V19_0_2026-11-21.md", "SMOKE_TEST_V19_0_1_2026-11-21.md",
        "README_V19_2_DUPLICATE_SENSES.md", "CHANGELOG_V19_0_1_to_V19_2.md",
        "SMOKE_TEST_V19_2_2026-11-21.md",
        "README_V19_3_SENTENCE_FORGE.md", "CHANGELOG_V19_2_to_V19_3.md",
        "SMOKE_TEST_V19_3_2026-11-21.md",
        "README_V19_4_BOSS_MIC_FIX.md", "CHANGELOG_V19_3_to_V19_4.md",
        "SMOKE_TEST_V19_4_2026-11-22.md",
        "README_V19_5_ROUND5_BUG_FIXES.md", "CHANGELOG_V19_4_to_V19_5.md",
        "SMOKE_TEST_V19_5_2026-11-23.md",
        "README_V19_5_1_PATCH.md", "CHANGELOG_V19_5_to_V19_5_1.md",
        "SMOKE_TEST_V19_5_1_2026-11-24.md"]
ZIP = HERE / "Korean_English_Vocab_Farm_V19_5_1_Patch.zip"
ZIP_FINAL = ZIP
# Write to a temp name; publish only after all checks pass (EPERM-wave
# safety: a failed write must never clobber a good ZIP — 2026-11-21 the
# 8e083b10… ZIP was destroyed by a failed re-package that left a 0-byte file).
ZIP = ZIP.with_name(ZIP.name + ".part")

# tools/v50 allowlist (finished before packaging; backup, pre-fix
# build inputs, round-5 review reports + probes, logs and screenshots
# stay out).
TOOLS_V50_ALLOW = [
    "test50.js", "verify-v50c.js", "repro-v50.js",
    "PUSH_MANIFESTS.md",
]
# tools/v52 allowlist (finished before packaging; backup, pre-fix
# build inputs, make_* generators, test-section source, logs and
# screenshots stay out).
TOOLS_V52_ALLOW = [
    "test52.js", "verify-v52c.js", "repro-v52.js",
    "PUSH_MANIFESTS.md",
]
# tools/v49 allowlist (finished before packaging; backup, pre-fix
# build inputs, logs and screenshots stay out).
TOOLS_V49_ALLOW = [
    "test49.js", "verify-v49c.js", "repro-v49.js", "repro-v49c.js",
    "PUSH_MANIFESTS.md",
]
# tools/v48 allowlist (finished before packaging; backup, pre-fix
# build inputs, logs, screenshots and test generators stay out).
TOOLS_V48_ALLOW = [
    "test48.js", "verify-v48c.js",
    "PUSH_MANIFESTS.md",
]
# tools/v47 allowlist (finished before packaging; backup, pre-fix
# build inputs, logs, screenshots and round-4 review artifacts stay out).
TOOLS_V47_ALLOW = [
    "test47.js", "verify-v47c.js", "repro-v47.js",
    "PUSH_MANIFESTS.md",
]
# tools/v46 allowlist (finished before packaging; backup, pristine
# copy, logs, screenshots and dev probes stay out of the ZIP).
TOOLS_V46_ALLOW = [
    "test46.js", "verify-v46c.js", "repro-v46.js", "analyze.js",
    "PUSH_MANIFESTS.md",
]
# tools/v45..v37 allowlists (copied verbatim from package_v45.py —
# the old suites stay in the ZIP).
TOOLS_V45_ALLOW = [
    "test45.js", "verify-v45c.js", "repro-v45.js", "probe-toast.js",
    "PUSH_MANIFESTS.md",
]
TOOLS_V44_ALLOW = [
    "test44.js", "verify-v44c.js", "repro-v44.js",
    "PUSH_MANIFESTS.md",
]
TOOLS_V43_ALLOW = [
    "test43.js", "verify-v43c.js", "repro-v43.js",
    "PUSH_MANIFESTS.md",
]
TOOLS_V42_ALLOW = [
    "PUSH_MANIFESTS.md",
]
TOOLS_V41_ALLOW = [
    "test41.js", "verify-v41c.js", "repro-v41.js",
    "PUSH_MANIFESTS.md",
]
TOOLS_V40_ALLOW = [
    "test40.js", "verify-v40c.js", "repro-v40.js", "repro-v40b.js",
    "PUSH_MANIFESTS.md",
]
TOOLS_V39_ALLOW = [
    "test39.js", "verify-v39c.js", "repro-v39.js",
    "PUSH_MANIFESTS.md",
]
TOOLS_V38_ALLOW = [
    "test38.js", "verify-v38c.js", "repro-v38.js",
    "PUSH_MANIFESTS.md",
]
TOOLS_V37_ALLOW = [
    "test37.js", "verify-v37c.js", "repro-v37.js",
    "PUSH_MANIFESTS.md",
]

assert (OUT / "index.html").exists(), "run build_v50.py first"
assert (OUT / "v50.js").exists() and (OUT / "v50.css").exists(), "V50 layer missing from out/"
assert (OUT / "v52.js").exists(), "V52 layer missing from out/"  # no v52.css: V52 ships no CSS
assert (OUT / "v49.js").exists() and (OUT / "v49.css").exists(), "V49 layer missing from out/"
assert (OUT / "v48.js").exists() and (OUT / "v48.css").exists() and (OUT / "v48_data.js").exists(), "V48 layer missing from out/"
assert (OUT / "v47.js").exists(), "V47 layer missing from out/"
assert (OUT / "v46.js").exists() and (OUT / "v46_data.js").exists(), "V46 layer missing from out/"
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
for _s in ["build_v52.py", "package_v52.py",
           "build_v50.py", "package_v50.py",
           "build_v49.py", "package_v49.py",
           "build_v48.py", "package_v48.py",
           "build_v47.py", "package_v47.py",
           "build_v46.py", "package_v46.py",
           "build_v45.py", "package_v45.py",
           "build_v44.py", "package_v44.py",
           "build_v43.py", "package_v43.py",
           "build_v42.py", "package_v42.py",
           "build_v41.py", "package_v41.py",
           "build_v40.py", "package_v40.py",
           "build_v39.py", "package_v39.py",
           "build_v38.py", "package_v38.py",
           "build_v37.py", "package_v37.py"]:
    shutil.copy2(HERE / _s, OUT / _s)

# tools allowlists (backup, pristine copy, logs and screenshots stay out)
for _ver, _allow in [("v52", TOOLS_V52_ALLOW), ("v50", TOOLS_V50_ALLOW), ("v49", TOOLS_V49_ALLOW), ("v48", TOOLS_V48_ALLOW), ("v47", TOOLS_V47_ALLOW), ("v46", TOOLS_V46_ALLOW), ("v45", TOOLS_V45_ALLOW), ("v44", TOOLS_V44_ALLOW), ("v43", TOOLS_V43_ALLOW), ("v42", TOOLS_V42_ALLOW), ("v41", TOOLS_V41_ALLOW),
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
# sanity: index.html at zip root, V46 layer + all old layers present
with zipfile.ZipFile(ZIP) as z:
    names = z.namelist()
    assert "index.html" in names
    # ZIP index.html must be byte-identical to out/index.html
    assert z.read("index.html") == (OUT / "index.html").read_bytes(), "ZIP index.html differs from out/index.html"
    print("  ZIP index.html byte-identical to out/index.html OK")
    assert "v49.js" in names and "v49.css" in names and "build_v49.py" in names and "package_v49.py" in names
    assert "v50.js" in names and "v50.css" in names and "build_v50.py" in names and "package_v50.py" in names
    assert "v52.js" in names and "build_v52.py" in names and "package_v52.py" in names
    assert "tools/v50/test50.js" in names, "tools/v50/test50.js missing from ZIP"
    assert "tools/v50/verify-v50c.js" in names, "tools/v50/verify-v50c.js missing from ZIP"
    assert "tools/v50/repro-v50.js" in names, "tools/v50/repro-v50.js missing from ZIP"
    assert "tools/v50/PUSH_MANIFESTS.md" in names, "tools/v50/PUSH_MANIFESTS.md missing from ZIP"
    assert "tools/v52/test52.js" in names, "tools/v52/test52.js missing from ZIP"
    assert "tools/v52/verify-v52c.js" in names, "tools/v52/verify-v52c.js missing from ZIP"
    assert "tools/v52/repro-v52.js" in names, "tools/v52/repro-v52.js missing from ZIP"
    assert "tools/v52/PUSH_MANIFESTS.md" in names, "tools/v52/PUSH_MANIFESTS.md missing from ZIP"
    assert "tools/v49/test49.js" in names, "tools/v49/test49.js missing from ZIP"
    assert "tools/v49/verify-v49c.js" in names, "tools/v49/verify-v49c.js missing from ZIP"
    assert "tools/v49/repro-v49.js" in names, "tools/v49/repro-v49.js missing from ZIP"
    assert "tools/v49/repro-v49c.js" in names, "tools/v49/repro-v49c.js missing from ZIP"
    assert "tools/v49/PUSH_MANIFESTS.md" in names, "tools/v49/PUSH_MANIFESTS.md missing from ZIP"
    assert "v48.js" in names and "v48.css" in names and "v48_data.js" in names and "build_v48.py" in names and "package_v48.py" in names
    assert "tools/v48/test48.js" in names, "tools/v48/test48.js missing from ZIP"
    assert "tools/v48/verify-v48c.js" in names, "tools/v48/verify-v48c.js missing from ZIP"
    assert "tools/v48/PUSH_MANIFESTS.md" in names, "tools/v48/PUSH_MANIFESTS.md missing from ZIP"
    assert "v47.js" in names and "build_v47.py" in names and "package_v47.py" in names
    assert "tools/v47/test47.js" in names, "tools/v47/test47.js missing from ZIP"
    assert "tools/v47/verify-v47c.js" in names, "tools/v47/verify-v47c.js missing from ZIP"
    assert "tools/v47/repro-v47.js" in names, "tools/v47/repro-v47.js missing from ZIP"
    assert "tools/v47/PUSH_MANIFESTS.md" in names, "tools/v47/PUSH_MANIFESTS.md missing from ZIP"
    assert "v46.js" in names and "v46_data.js" in names and "build_v46.py" in names and "package_v46.py" in names
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
    assert "tools/v46/test46.js" in names, "tools/v46/test46.js missing from ZIP"
    assert "tools/v46/verify-v46c.js" in names, "tools/v46/verify-v46c.js missing from ZIP"
    assert "tools/v46/repro-v46.js" in names, "tools/v46/repro-v46.js missing from ZIP"
    assert "tools/v46/analyze.js" in names, "tools/v46/analyze.js missing from ZIP"
    assert "tools/v46/PUSH_MANIFESTS.md" in names, "tools/v46/PUSH_MANIFESTS.md missing from ZIP"
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
    assert not any(n.startswith("tools/v52/backup-v19.5/") for n in names), "ZIP must not contain tools/v52/backup-v19.5/ (build input)"
    assert not any(n.startswith("tools/v52/backup-v19.5-build/") for n in names), "ZIP must not contain tools/v52/backup-v19.5-build/ (build input)"
    assert not any(n.startswith("tools/v52/logs/") for n in names), "ZIP must not contain tools/v52/logs/"
    assert not any(n.startswith("tools/v52/shots/") for n in names), "ZIP must not contain tools/v52/shots/"
    assert not any(n.startswith("tools/v50/backup-v19.4/") for n in names), "ZIP must not contain tools/v50/backup-v19.4/ (build input)"
    assert not any(n.startswith("tools/v50/backup-v19.4-build/") for n in names), "ZIP must not contain tools/v50/backup-v19.4-build/ (build input)"
    assert not any(n.startswith("tools/v50/logs/") for n in names), "ZIP must not contain tools/v50/logs/"
    assert not any(n.startswith("tools/v50/shots/") for n in names), "ZIP must not contain tools/v50/shots/"
    assert not any(n.startswith("tools/v50/review-") for n in names), "ZIP must not contain tools/v50/review-*.md (round-5 reports stay in the workspace)"
    assert not any(n.startswith("tools/v49/backup-v19.3/") for n in names), "ZIP must not contain tools/v49/backup-v19.3/ (build input)"
    assert not any(n.startswith("tools/v49/backup-v19.3-build/") for n in names), "ZIP must not contain tools/v49/backup-v19.3-build/ (build input)"
    assert not any(n.startswith("tools/v49/logs/") for n in names), "ZIP must not contain tools/v49/logs/"
    assert not any(n.startswith("tools/v49/shots/") for n in names), "ZIP must not contain tools/v49/shots/"
    assert not any(n.startswith("tools/v48/backup-v19.2/") for n in names), "ZIP must not contain tools/v48/backup-v19.2/ (build input)"
    assert not any(n.startswith("tools/v48/backup-v19.2-build/") for n in names), "ZIP must not contain tools/v48/backup-v19.2-build/ (build input)"
    assert not any(n.startswith("tools/v48/logs/") for n in names), "ZIP must not contain tools/v48/logs/"
    assert not any(n.startswith("tools/v48/shots/") for n in names), "ZIP must not contain tools/v48/shots/"
    assert not any(n.startswith("tools/v47/backup-v19.0.1/") for n in names), "ZIP must not contain tools/v47/backup-v19.0.1/ (build input)"
    assert not any(n.startswith("tools/v47/backup-v19.0.1-build/") for n in names), "ZIP must not contain tools/v47/backup-v19.0.1-build/ (build input)"
    assert not any(n.startswith("tools/v47/logs/") for n in names), "ZIP must not contain tools/v47/logs/"
    assert not any(n.startswith("tools/v47/shots/") for n in names), "ZIP must not contain tools/v47/shots/"
    assert not any(n.startswith("tools/v46/backup-v19.0/") for n in names), "ZIP must not contain tools/v46/backup-v19.0/ (build input)"
    assert not any(n.startswith("tools/v46/pristine-v19.0-out/") for n in names), "ZIP must not contain tools/v46/pristine-v19.0-out/ (build input)"
    assert not any(n.startswith("tools/v46/logs/") for n in names), "ZIP must not contain tools/v46/logs/"
    assert not any(n.startswith("tools/v46/shots/") for n in names), "ZIP must not contain tools/v46/shots/"
    assert not any(n.startswith("tools/v45/backup-v18.9/") for n in names), "ZIP must not contain tools/v45/backup-v18.9/ (build input)"
    assert not any(n.startswith("tools/v45/pristine-v18.9-out/") for n in names), "ZIP must not contain tools/v45/pristine-v18.9-out/ (build input)"
    assert not any(n.startswith("tools/v45/logs/") for n in names), "ZIP must not contain tools/v45/logs/"
    assert not any(n.startswith("tools/v45/shots/") for n in names), "ZIP must not contain tools/v45/shots/"
    assert not any(n.startswith("tools/v44/backup-v18.8/") for n in names), "ZIP must not contain tools/v44/backup-v18.8/ (build input)"
    assert not any(n.startswith("tools/v44/pristine-v18.8-out/") for n in names), "ZIP must not contain tools/v44/pristine-v18.8-out/ (build input)"
    assert not any(n.startswith("tools/v44/logs/") for n in names), "ZIP must not contain tools/v44/logs/"
    assert not any(n.startswith("tools/v44/shots/") for n in names), "ZIP must not contain tools/v44/shots/"
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
    assert "README_V19_5_ROUND5_BUG_FIXES.md" in names and "CHANGELOG_V19_4_to_V19_5.md" in names
    assert "SMOKE_TEST_V19_5_2026-11-23.md" in names
    assert "README_V19_5_1_PATCH.md" in names and "CHANGELOG_V19_5_to_V19_5_1.md" in names
    assert "SMOKE_TEST_V19_5_1_2026-11-24.md" in names
    assert "README_V19_4_BOSS_MIC_FIX.md" in names and "CHANGELOG_V19_3_to_V19_4.md" in names
    assert "SMOKE_TEST_V19_4_2026-11-22.md" in names
    assert "README_V19_3_SENTENCE_FORGE.md" in names and "CHANGELOG_V19_2_to_V19_3.md" in names
    assert "SMOKE_TEST_V19_3_2026-11-21.md" in names
    assert "README_V19_2_DUPLICATE_SENSES.md" in names and "CHANGELOG_V19_0_1_to_V19_2.md" in names
    assert "SMOKE_TEST_V19_2_2026-11-21.md" in names
    assert "README_V19_0_1_LEGDIFF_KO_XP.md" in names and "CHANGELOG_V19_0_to_V19_0_1.md" in names
    assert "README_V19_0_ROUND3_BUG_FIXES.md" in names and "CHANGELOG_V18_9_to_V19_0.md" in names
    assert "SMOKE_TEST_V19_0_1_2026-11-21.md" in names
    assert "SMOKE_TEST_V19_0_2026-11-21.md" in names
    v10 = [n for n in names if n.startswith("assets/bosses/v10/v10_") and n.endswith(".png")]
    assert len(v10) == 30, f"zip has {len(v10)} V10 boss PNGs, expected 30"
    v11 = [n for n in names if n.startswith("assets/bosses/v11/v11_") and n.endswith(".png")]
    assert len(v11) == 30, f"zip has {len(v11)} V11 boss PNGs, expected 30"
    v17 = [n for n in names if n.startswith("assets/bosses/v17/v17_") and n.endswith(".png")]
    assert len(v17) == 8, f"zip has {len(v17)} V17 boss PNGs, expected 8"
    v18 = [n for n in names if n.startswith("assets/bosses/v18/v18_") and n.endswith(".png")]
    assert len(v18) == 9, f"zip has {len(v18)} V18 boss PNGs, expected 9 (8 Skyroot + 1 Hangul Golem)"
    assert "assets/bosses/v18/v18_golem.png" in names, "golem art missing from the ZIP"
    assert hashlib.sha256(z.read("assets/bosses/v18/v18_golem.png")).hexdigest().startswith("a589a5d0"), "golem PNG hash mismatch"
    print("  golem art present in ZIP (1024x1024 RGBA, sha256 a589a5d0...)")
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
    # ---- V49 layer checks ----
    assert 'id="v49"' in html and 'id="v49js"' in html, "index.html missing V49 layer"
    assert "window.__v49={" in html and "VERSION='19.4.0'" in html, "index.html missing V49 version"
    assert "speakErrMsg" in html, "index.html missing speakErrMsg"
    assert "stopSpeak" in html and "speakState" in html, "index.html missing stopSpeak/speakState"
    assert "v49listen" in html and "v49err" in html, "index.html missing v49listen/v49err"
    assert "V19.5.1 — Round5 Patch" in html, "index.html title is not V19.5.1"
    assert "V19.5 — Round5 Bug Fixes" not in html, "index.html still carries the V19.5 title"
    assert html.rfind('id="v49js"') > html.rfind('id="v48js"'), "V49 script is not after V48 (must load last)"
    assert html.count("speakErrMsg") == 15, f"ZIP index.html: speakErrMsg != 15 (got {html.count('speakErrMsg')})"
    # stopSpeak() is 14 in V19.5 (was 6 in V19.4): 2 defs + 6 call lines
    # (next + close + startFight per engine) + 4 comment mentions in the
    # engines + 2 in the v50.js docstring.
    assert html.count("stopSpeak()") == 14, f"ZIP index.html: stopSpeak() != 14 (got {html.count('stopSpeak()')})"
    assert html.count("  stopSpeak();") == 6, f"ZIP index.html: stopSpeak() call lines != 6 (got {html.count('  stopSpeak();')})"
    assert html.count("function speakState(){") == 2, "ZIP index.html: speakState def != 2"
    assert html.count("if(F.qmode==='speak'){F.left=0;return}") == 2, "ZIP index.html: speak timer guard != 2"
    assert html.count('class="v49listen"') == 2, "ZIP index.html: v49listen card != 2"
    assert html.count('class="v49err"') == 2, "ZIP index.html: v49err box != 2"
    assert "  try{rec.start()}catch(e){return}" not in html or html.count("  try{rec.start()}catch(e){return}") == 1, "ZIP index.html: old silent start-catch in bossSpeak (only v15.js:1537 may keep it)"
    assert "rec.onerror=function(){F.heard='(không nghe được)';renderFight()};" not in html, "ZIP index.html: old generic onerror still present"
    assert "  var w=F.cur.w;if(!w)return;" not in html, "ZIP index.html: old bossSpeak entry still present"
    assert "function speakRecord(" in html and "function dojoListen(" in html, "ZIP index.html: v15 speakRecord / v48 dojoListen missing"
    # ---- V50 layer checks ----
    assert 'id="v50"' in html and 'id="v50js"' in html, "index.html missing V50 layer"
    assert "window.__v50={" in html and "VERSION='19.5.0'" in html, "index.html missing V50 version"
    assert html.rfind('id="v50js"') > html.rfind('id="v49js"'), "V50 script is not after V49 (must load last)"
    assert html.rfind('id="v50"') > html.rfind('id="v49"'), "V50 style is not after V49"
    # F-1: monotonic token sequence (3 per engine + 1 in v50.js docstring)
    assert html.count("_speakSeq50") == 7, f"ZIP index.html: _speakSeq50 != 7 (got {html.count('_speakSeq50')})"
    assert html.count("speakToken:_speakSeq50,speakErr:null,") == 2, "ZIP index.html: new F-literal token init != 2"
    assert html.count("speakToken:0,speakErr:null,") == 0, "ZIP index.html: OLD per-fight token reset still present"
    assert html.count("var _speakSeq50=0;") == 2, "ZIP index.html: _speakSeq50 declaration != 2"
    # C-R5-2: due-less guard (prioOf x1, classify x2, epoch fragments gone)
    assert html.count("var overdue=(box>0&&due)?Math.max(0,(now-due)/864e5):0;") == 1, "ZIP index.html: NEW prioOf guard missing"
    assert html.count("var od=due?Math.floor(Math.max(0,(now-due)/864e5)):0;") == 2, "ZIP index.html: NEW classify od guard != 2"
    assert html.count("Math.max(0,(now-(due||0))/864e5)") == 0, "ZIP index.html: OLD epoch overdue still present"
    # C-R5-3: Forge score (defaults x2: defEn48 + en48 fallback)
    assert html.count("scoreTotal:0,bestScore:0") == 2, "ZIP index.html: forge score defaults != 2"
    assert html.count("FS.score=(FS.score||0)+sc;") == 1, "ZIP index.html: forgeCheck score accumulation missing"
    assert html.count("e.forge.scoreTotal=(e.forge.scoreTotal||0)+(FS.score||0);") == 1, "ZIP index.html: forgeNext scoreTotal persist missing"
    assert html.count("Điểm buổi: '+(FS.score||0)+' điểm") == 1, "ZIP index.html: end-screen session score missing"
    assert html.count("score:ok?scoreSentence(cur.tokens.length,cur.tier):0") == 0, "ZIP index.html: OLD forgeCheck score return still present"
    # C-R5-4: 44px rules (5: .v7btn / :root #sk,#sn / #v21avatarbtn / .v15link / .tabs .tab)
    assert html.count(".v7btn{min-height:44px}") == 1, "ZIP index.html: v50 .v7btn rule missing"
    assert html.count(":root #sk,:root #sn{min-height:44px}") == 1, "ZIP index.html: v50 #sk/#sn rule missing"
    assert html.count("#v21avatarbtn{min-height:44px}") == 1, "ZIP index.html: v50 #v21avatarbtn rule missing"
    assert html.count(".v15link{min-height:44px}") == 1, "ZIP index.html: v50 .v15link rule missing"
    assert html.count(".tabs .tab{min-height:44px}") == 1, "ZIP index.html: v50 bottom-tab rule missing"
    # ---- V52 layer checks ----
    assert 'id="v52js"' in html, "index.html missing V52 layer"
    assert "window.__v52={" in html and "VERSION='19.5.1'" in html, "index.html missing V52 version"
    assert html.rfind('id="v52js"') > html.rfind('id="v50js"'), "V52 script is not after V50 (must load last)"
    # C-R5-1: wordless mark signatures + keys (x1 each), wordless early
    # return x2, OLD guarded signatures/call sites gone.
    assert html.count("function mark18(ok,w,qkey){") == 1, "ZIP index.html: mark18 qkey signature != 1"
    assert html.count("function mark19(ok,w,qkey){") == 1, "ZIP index.html: mark19 qkey signature != 1"
    assert html.count("function wordlessKey18(){") == 1, "ZIP index.html: wordlessKey18 != 1"
    assert html.count("function wordlessKey19(){") == 1, "ZIP index.html: wordlessKey19 != 1"
    assert html.count("  if(!w&&!qkey)return;") == 2, "ZIP index.html: wordless early return != 2"
    assert html.count("function mark18(ok,w){") == 0, "ZIP index.html: OLD mark18 signature still present"
    assert html.count("function mark19(ok,w){") == 0, "ZIP index.html: OLD mark19 signature still present"
    assert html.count("if(F.cur&&F.cur.w)mark18(") == 0, "ZIP index.html: OLD guarded mark18 call site still present"
    assert html.count("if(F.cur&&F.cur.w)mark19(") == 0, "ZIP index.html: OLD guarded mark19 call site still present"
    assert html.count("boxUp:w?(old.box[id]>before):!!ok") == 2, "ZIP index.html: wordless V46 boxUp != 2"
    # Android TTS: 6 speak paths delegate to __v52; the helper waits for
    # voices and carries the honest-error message (x8: def + comment + 6
    # call-site onErr handlers).
    assert html.count("__v52.speak(") == 6, f"ZIP index.html: __v52.speak call sites != 6 (got {html.count('__v52.speak(')})"
    assert html.count("getVoices") == 4, f"ZIP index.html: getVoices != 4 (got {html.count('getVoices')})"
    assert html.count("voiceschanged") == 6, f"ZIP index.html: voiceschanged != 6 (got {html.count('voiceschanged')})"
    assert html.count("Không phát được âm thanh — bấm Nghe lại.") == 8, f"ZIP index.html: honest TTS error message != 8 (got {html.count('Không phát được âm thanh — bấm Nghe lại.')})"
    # ---- V46 layer checks ----
    assert 'id="v46data"' in html and 'id="v46js"' in html, "index.html missing V46 layer"
    assert "window.__v46={" in html and "VERSION='19.0.1'" in html, "index.html missing V46 version"
    assert "window.__V46_DATA" in html, "index.html missing __V46_DATA"
    assert "awardBossAnswerXP" in html, "index.html missing shared XP function"
    assert "koStreak" in html, "index.html missing koStreak"
    assert "[V46 legDiff]" in html, "index.html missing legDiff failure log"
    assert html.rfind('id="v46js"') > html.rfind('id="v45js"'), "V46 script is not after V45"
    assert html.rfind('id="v46data"') < html.rfind('id="v46js"'), "V46 data is not before V46 script"
    # legDiff: new getter read present (code + its error message = 2);
    # old one-liner gone; only the v44 historical comment still calls .counts()
    assert html.count("V15().counts.mastered") == 2, f"ZIP index.html: new legDiff getter read != 2 (got {html.count('V15().counts.mastered')})"
    assert html.count("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}") == 0, "ZIP index.html: old legDiff one-liner still present"
    assert html.count("V15().counts().mastered") == 1, f"ZIP index.html: V15().counts().mastered != 1 (only the V44 comment may remain, got {html.count('V15().counts().mastered')})"
    # ---- V47 layer checks ----
    assert 'id="v47js"' in html, "index.html missing V47 layer"
    assert "window.__v47={" in html and "VERSION='19.2.0'" in html, "index.html missing V47 version"
    assert "splitDuplicateSenses" in html and "labelOf" in html, "index.html missing V47 split/labelOf"
    assert html.rfind('id="v47js"') > html.rfind('id="v46js"'), "V47 script is not after V46 (must load last)"
    # ---- V48 layer checks ----
    assert 'id="v48"' in html and 'id="v48data"' in html and 'id="v48js"' in html, "index.html missing V48 layer"
    assert "window.__v48={" in html and "VERSION='19.3.0'" in html, "index.html missing V48 version"
    assert "window.__V48_DATA" in html, "index.html missing __V48_DATA"
    assert "v18_golem" in html, "index.html missing golem id"
    assert "Hangul Golem" in html, "index.html missing golem name"
    assert "TOTAL_BOSSES=87" in html, "index.html TOTAL_BOSSES is not 87"
    assert "en48" in html, "index.html missing en48 save key"
    assert "setFlag" in html, "index.html missing flag kill-switch"
    assert "v48hubbtn" in html and "v48kotab" in html, "index.html missing V48 entry points"
    assert html.rfind('id="v48js"') > html.rfind('id="v47js"'), "V48 script is not after V47 (must load last)"
    assert html.rfind('id="v48data"') < html.rfind('id="v48js"'), "V48 data is not before V48 script"
    assert "VERSION='19.3.0'" in html, "index.html missing V48 version 19.3.0"
    # headword guard x9 (v15x2 + v18x2 + v19x2 + v27x3); devoted row gone, kept row once; a1a2 998
    assert html.count("(x.en||'').toLowerCase()!==(w.en||'').toLowerCase()") == 9, "ZIP index.html: headword guard != 9"
    assert '"no": 938' not in html, "ZIP index.html: devoted no-938 row still present"
    assert html.count('"no": 351}') == 1, "ZIP index.html: kept devoted no-351 row != 1"
    assert html.count('"src": "a1a2"') == 998, "ZIP index.html: A1-A2 raw rows != 998"
    # Twin ids are built at runtime as 'a1a2_'+row.no, so the literal
    # "a1a2_680" never appears in the html; check the PAIRS twinNo
    # values + the 'a1a2_' prefix instead.
    assert "'a1a2_'" in html and "twinNo:680" in html and "twinNo:806" in html and "twinNo:912" in html, "ZIP index.html: twin PAIRS data missing"
    assert "VERSION='19.0.1'" in html, "index.html missing V46 version 19.0.1"
    # V39 KO Smart Learning comment preserved (markKO/markKO19 still feed Smart Learning)
    assert html.count("/* V39 (V18.4): KO boss answers also feed Smart Learning (V27) —") == 2, "ZIP index.html: V39 KO comment != 2"
    # ---- V45/V44/V43/V42 layer ids still present ----
    assert 'id="v45"' in html and 'id="v45js"' in html, "index.html missing V45 layer"
    assert "window.__v45={" in html and "19.0.0" in html, "index.html missing V45 version"
    assert 'id="v44js"' in html, "index.html missing V44 layer"
    assert "window.__v44={" in html and "18.9.0" in html, "index.html missing V44 version"
    assert 'id="v43"' in html and 'id="v43js"' in html, "index.html missing V43 layer"
    assert "window.__v43={" in html and "18.8.0" in html, "index.html missing V43 version"
    assert 'id="v42"' in html and 'id="v42js"' in html, "index.html missing V42 layer"
    assert "window.__v42={" in html and "18.7.0" in html, "index.html missing V42 version"
    # old layers intact
    for mid in ('id="v15js"', 'id="v16js"', 'id="v17js"', 'id="v18js"',
                'id="v19js"', 'id="v20js"', 'id="v21js"', 'id="v22js"', 'id="v23js"',
                'id="v24js"', 'id="v25js"', 'id="v26js"', 'id="v27js"', 'id="v31js"', 'id="v32js"', 'id="v33js"', 'id="v34js"', 'id="v37js"', 'id="v38js"', 'id="v39js"', 'id="v40js"', 'id="v41js"', 'id="v42js"', 'id="v43js"', 'id="v44js"', 'id="v45js"', 'id="v46js"', 'id="v47js"', 'id="v48js"', 'id="v49js"', 'id="v50js"', 'id="v52js"'):
        assert mid in html, f"index.html missing layer {mid}"
    assert "VERSION='19.5.0'" in html, "index.html missing V50 version 19.5.0"
    assert "VERSION='19.5.1'" in html, "index.html missing V52 version 19.5.1"
    assert "VERSION='19.4.0'" in html, "index.html missing V49 version 19.4.0"
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
    assert "VERSION='19.0.1'" in html, "index.html missing V46 version 19.0.1"
    assert "VERSION='19.3.0'" in html, "index.html missing V48 version 19.3.0"
    assert "Vocab Farm V19.5" in html, "index.html title is not V19.5"
    assert "korean-vocab-farm-backup-v7.json" not in html, "stale v7 backup filename in ZIP"
    # firebase-config.js in the ZIP must be the placeholder (never the repo's real config)
    if "firebase-config.js" in names:
        cfg = z.read("firebase-config.js").decode("utf-8", "replace")
        assert "YOUR_API_KEY" in cfg or 'apiKey: ""' in cfg or "apiKey:''" in cfg, (
            "ZIP firebase-config.js is not the placeholder — refusing to ship a real config")
        print("  firebase-config.js in ZIP is the placeholder (repo config untouched)")
    print("zip checks OK:", len(names), "entries")

# ---- out-vs-pristine-V19.4 exact diff (V50 changes 5 files, adds 11, removes none) ----
def _sha(p):
    return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()


_v195 = HERE / "tools" / "v52" / "backup-v19.5" / "out"
assert _v195.is_dir(), "pristine V19.5 out/ tree missing (tools/v52/backup-v19.5/out/)"
_out_files = {str(p.relative_to(OUT)): _sha(p) for p in OUT.rglob("*") if p.is_file()}
_v195_files = {str(p.relative_to(_v195)): _sha(p) for p in _v195.rglob("*") if p.is_file()}
_changed = sorted(k for k in _out_files.keys() & _v195_files.keys() if _out_files[k] != _v195_files[k])
_added = sorted(k for k in _out_files.keys() - _v195_files.keys())
_removed = sorted(k for k in _v195_files.keys() - _out_files.keys())
_EXPECTED_CHANGED = ["index.html", "v15.js", "v18.js", "v19.js", "v22.js", "v27.js", "v48.js"]
# No doc drift in this version: SMOKE_TEST_V19_5_2026-11-23.md +
# tools/v50/PUSH_MANIFESTS.md are unchanged vs the pristine V19.5
# backup (the backup already holds the filled V19.5 copies, taken
# after package_v50.py ran) — unlike the V50 diff, where the V19.4
# smoke test + v49 manifest were pre-existing drift.
_EXPECTED_ADDED = sorted([
    "v52.js", "build_v52.py", "package_v52.py",
    "README_V19_5_1_PATCH.md", "CHANGELOG_V19_5_to_V19_5_1.md",
    "SMOKE_TEST_V19_5_1_2026-11-24.md",
    "tools/v52/test52.js", "tools/v52/verify-v52c.js",
    "tools/v52/repro-v52.js",
    "tools/v52/PUSH_MANIFESTS.md",
])
assert _changed == _EXPECTED_CHANGED, f"out-vs-V19.5 changed != expected: {_changed}"
assert _added == _EXPECTED_ADDED, f"out-vs-V19.5 added != expected: {_added}"
assert _removed == [], f"out-vs-V19.5 removed (must be none): {_removed}"
print(f"out-vs-V19.5 diff OK: changed {_changed}, added {len(_added)} files, removed none")
print(f"ZIP sha256: {zsha}")
print(f"ZIP size: {size} bytes ({size/1024/1024:.2f} MB), {len(files)} files")
ZIP.replace(ZIP_FINAL)
print(f"published {ZIP_FINAL}")
