#!/usr/bin/env python3
"""Package the V18.0 SKYROOT SANCTUARY deliverable ZIP from out/ + docs.
Run AFTER build_v35.py and AFTER the tests pass (final packaging is
re-run by the coordinator once the test agent's suite lands).
Output: ~/workspace/v7build/Korean_English_Vocab_Farm_V18_0_Skyroot_Sanctuary.zip

The ZIP ships the PLACEHOLDER firebase-config.js from the build tree
(the local tree holds the placeholder; the repo's real config is never
touched by this script — see CHANGELOG). Firebase login/sync is NOT
claimed working until Anh runs the FIREBASE_SETUP.md live checklist.

V18.0 adds art: 8 V18 boss PNGs + 12 V18 pet PNGs (9 stages + 3 eggs)
under assets/bosses/v18/ + assets/pets/v18/. tools/v35 is copied
ALLOWLIST-ONLY (scripts + reports): the staging art (assets-staging/),
raw-originals/ and intermediate candidate JSONs (35 MB) are build
inputs, not deliverables — the shipped art already lives in out/assets/.
There is NO assets/pets/v17/ anywhere (V17.0 MOVE decision).
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
        "README_V16_4_DATA_SAFETY.md",
        "README_V17_0_CHRONO_KINGDOM.md",
        "README_V17_1_CHRONO_COMPLETE.md",
        "README_V18_0_SKYROOT_SANCTUARY.md",
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
        "SMOKE_TEST_V18_0_2026-11-19.md"]
ZIP = HERE / "Korean_English_Vocab_Farm_V18_0_Skyroot_Sanctuary.zip"

# Distinctive strings that exist ONLY in the 12 OUT-OF-SCOPE replacements
# (PLAN_V31.md section A.2 rows 15-26). Must be absent from the ZIP.
OUT_OF_SCOPE_MARKERS = [
    "v21emailbtn", " _esc21".strip(), "armV27Obs", "rearmObserver",
    "_speakXp", "V29 (F-05)",
]

# Substrings that identify each in-scope V31 replacement in the built file.
# Copied verbatim from package_v31.py — V18.0 must keep every V31 fix.
# Checked present at least once in the ZIP's index.html.
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

# V33 in-scope fragments (checked present at least once in the ZIP's index.html).
# NOTE: "var TOTAL_BOSSES=78;" is NOT here — V35 changes it to 86 (asserted below).
V33_FRAGMENTS = [
    "__V33_DATA.byId(id)",                   # R-V33-V19-FIGHT / V18-CH
    "b.zone==='chrono'&&window.__v33&&__v33.bossUnlocked",  # R-V33-V19-UNLOCK
    "b.id==='v17_geargolem'?90:",            # R-V33-V19-SHIELD
    "F.boss.id!=='v17_geargolem'",           # R-V33-V19-PHASE
    "GEAR GOLEM hồi 10 HP",                  # R-V33-V19-HEAL
    "__V33_DATA?__V33_DATA.bosses:[]",       # R-V33-V18-ALL
    "startSession:startSession",             # R-V33-V27-EXP
    "v7.en33.quests",                        # R-V33-V20-HAS
    "else if(kk==='en33')",                  # R-V33-V20-MERGE
    "/* V33: CHRONO KINGDOM",                # R-V33-V15-BUILDWORDS
    "m33.regionClaimed={en:Math.max(rcL.en||0,rcC.en||0),ko:Math.max(rcL.ko||0,rcC.ko||0)}",  # B-33-2 fix
    "hit.acc>=QUEST_MIN_ACC",                # B-33-1 fix
    "QUEST_MIN_ACC=0.8",                     # B-33-1 fix (threshold constant)
]

# V34 in-scope fragments (checked present at least once in the ZIP's index.html).
V34_FRAGMENTS = [
    "chronoSets()",                          # R-V34-V17-DATA
    "chronoGroupHTML()",                     # R-V34-V17-GROUP
    "V.lib==='chrono'&&V.set",               # R-V34-V17-LESSON
    "t.indexOf('Chrono')>=0",                # R-V34-V25-KEY
    "sc.lib==='chrono'&&sc.set",             # R-V34-V15-INSCOPE
    "set:sc.set",                            # R-V34-V19-SC2 / R-V34-V18-SC2
    "__v34.breakDmg(F)",                     # R-V34-V19-BREAK / R-V34-V18-BREAK
    "__v34.breakDmg(B)",                     # R-V34-V15-BREAK
    "__v34.weakPick",                        # R-V34-V19/V18/V15-BIAS
    "__v34.breakBarHTML",                    # R-V34-V19/V18/V15-BAR
    "try{if(window.__v27&&__v27.endEarly)__v27.endEarly()}catch(e){}",  # R-V34-V33-GUARD
    "weakCountInPool(F.weak,pool)===0",      # B-34-1 fix (scopeBlocked generalized)
    "noun:'n',verb:'v',adjective:'adj',adverb:'adv'",  # R-V34-V15-POSNORM (V34-BUG-1)
]

# V35 in-scope fragments (checked present at least once in the ZIP's index.html).
V35_FRAGMENTS = [
    "__V35_DATA.byId(id)",                   # R-V35-V19-FIGHT / V18-CH
    "b.zone==='skyroot'&&window.__v35&&__v35.bossUnlocked",  # R-V35-V19-UNLOCK
    "__V35_DATA?__V35_DATA.bosses:[]",       # R-V35-V18-ALL
    "var TOTAL_BOSSES=86;",                  # R-V35-V21-TOTAL
    "v7.en35.quests",                        # R-V35-V20-HAS
    "else if(kk==='en35')",                  # R-V35-V20-MERGE
    "/* V35: SKYROOT SANCTUARY",             # R-V35-V15-BUILDWORDS
    "sc.lib==='skyroot'&&sc.set",            # R-V35-V15-INSCOPE / WORDFILT
    "skyrootSets()",                         # R-V35-V17-DATA
    "skyrootGroupHTML()",                    # R-V35-V17-GROUP
    "V.lib==='skyroot'&&V.set",              # R-V35-V17-LESSON
    "t.indexOf('Skyroot')>=0",               # R-V35-V25-KEY
    "kind:'skyroot'",                        # R-V35-V34-WEAKMATCH / WEAKFOR
    "stone_wind",                            # R-V35-V23DATA-STONE
    "GEAR_GOLEM='v17_geargolem'",            # V35 gate
]

# tools/v35 allowlist (text only — staging art + raw-originals + intermediate
# JSONs stay out of the ZIP; the shipped art already lives in out/assets/).
TOOLS_V35_ALLOW = [
    "gen_v35_data.py", "validate_words35.py", "build_v35_json.py",
    "author_records.py", "VALIDATION_V35_WORDS.md", "ASSET_REPORT_V18.md",
    "PUSH_MANIFESTS.md",
]

assert (OUT / "index.html").exists(), "run build_v35.py first"
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
shutil.copy2(HERE / "build_v35.py", OUT / "build_v35.py")
shutil.copy2(HERE / "package_v35.py", OUT / "package_v35.py")

# tools/v35 allowlist (see header — no staging art, no raw-originals)
tools_src = HERE / "tools" / "v35"
assert tools_src.is_dir(), "tools/v35 missing"
(OUT / "tools" / "v35").mkdir(parents=True, exist_ok=True)
for name in TOOLS_V35_ALLOW:
    p = tools_src / name
    assert p.exists(), f"missing tools/v35/{name}"
    shutil.copy2(p, OUT / "tools" / "v35" / name)
test35 = tools_src / "test35.js"
if test35.exists():
    shutil.copy2(test35, OUT / "tools" / "v35" / "test35.js")
    print("tools/v35/test35.js present in package")
else:
    print("NOTE: tools/v35/test35.js not in package yet (test agent has not written it) — "
          "re-run package_v35.py after the tests land for the final package.")

if ZIP.exists():
    ZIP.unlink()
files = sorted(p for p in OUT.rglob("*") if p.is_file())
with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for p in files:
        z.write(p, p.relative_to(OUT))
size = ZIP.stat().st_size
print(f"wrote {ZIP} ({size/1024/1024:.1f} MB, {len(files)} files)")
# sanity: index.html at zip root, V35 layer + all old layers present
with zipfile.ZipFile(ZIP) as z:
    names = z.namelist()
    assert "index.html" in names
    assert "v35.js" in names and "v35.css" in names and "v35_data.js" in names and "build_v35.py" in names and "package_v35.py" in names
    assert "v34.js" in names and "v34.css" in names and "v34_data.js" in names, "V34 layer missing from ZIP"
    assert "v33.js" in names and "v33.css" in names and "v33_data.js" in names, "V33 layer missing from ZIP"
    assert "v32.js" in names and "v32.css" in names, "V32 layer missing from ZIP"
    assert "v31.js" in names and "v31.css" in names, "V31 layer missing from ZIP"
    if "tools/v35/test35.js" not in names:
        print("WARNING: tools/v35/test35.js not in ZIP yet (test agent has not written it) — "
              "re-run package_v35.py after the tests land for the final package.")
    else:
        print("tools/v35/test35.js present in ZIP")
    assert "README_V18_0_SKYROOT_SANCTUARY.md" in names and "CHANGELOG_V17_1_to_V18_0.md" in names
    assert "SMOKE_TEST_V18_0_2026-11-19.md" in names
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
    assert 'id="v35"' in html and 'id="v35js"' in html and 'id="v35data"' in html, "index.html missing V35 layer"
    assert "__v35" in html and "18.0.0" in html, "index.html missing V35 version"
    assert 'id="v34"' in html and 'id="v34js"' in html, "index.html missing V34 layer"
    assert 'id="v33"' in html and 'id="v33js"' in html, "index.html missing V33 layer"
    assert 'id="v32"' in html and 'id="v32js"' in html, "index.html missing V32 layer"
    assert 'id="v31"' in html and 'id="v31js"' in html, "index.html missing V31 layer"
    # V35 must be the LAST style/script (wins the cascade)
    assert html.rfind('id="v35"') > html.rfind('id="v34"'), "V35 style is not after V34"
    assert html.rfind('id="v35js"') > html.rfind('id="v34js"'), "V35 script is not after V34"
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
    # V33 in-scope fragments present in the ZIP's index.html
    for frag in V33_FRAGMENTS:
        n = html.count(frag)
        assert n >= 1, f"ZIP index.html: V33 in-scope fragment missing: {frag[:60]}"
        print(f"  V33 in-scope fragment OK ({n}x): {frag[:60]}")
    # V34 in-scope fragments present in the ZIP's index.html
    for frag in V34_FRAGMENTS:
        n = html.count(frag)
        assert n >= 1, f"ZIP index.html: V34 in-scope fragment missing: {frag[:60]}"
        print(f"  V34 in-scope fragment OK ({n}x): {frag[:60]}")
    # V35 in-scope fragments present in the ZIP's index.html
    for frag in V35_FRAGMENTS:
        n = html.count(frag)
        assert n >= 1, f"ZIP index.html: V35 in-scope fragment missing: {frag[:60]}"
        print(f"  V35 in-scope fragment OK ({n}x): {frag[:60]}")
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
                'id="v24js"', 'id="v25js"', 'id="v26js"', 'id="v27js"', 'id="v31js"', 'id="v32js"', 'id="v33js"', 'id="v34js"'):
        assert mid in html, f"index.html missing layer {mid}"
    assert "VERSION='15.1.0'" in html, "old layers lost version 15.1.0"
    assert "VERSION='15.2.0'" in html, "old layers lost version 15.2.0"
    assert "VERSION='16.0.0'" in html, "index.html missing V27 version 16.0.0"
    assert "VERSION='16.3.0'" in html, "index.html missing V31 version 16.3.0"
    assert "VERSION='16.4.0'" in html, "index.html missing V32 version 16.4.0"
    assert "VERSION='17.0.0'" in html, "index.html missing V33 version 17.0.0"
    assert "VERSION='17.1.0'" in html, "index.html missing V34 version 17.1.0"
    assert "Vocab Farm V18.0" in html, "index.html title is not V18.0"
    assert "korean-vocab-farm-backup-v7.json" not in html, "stale v7 backup filename in ZIP"
    # firebase-config.js in the ZIP must be the placeholder (never the repo's real config)
    if "firebase-config.js" in names:
        cfg = z.read("firebase-config.js").decode("utf-8", "replace")
        assert "YOUR_API_KEY" in cfg or 'apiKey: ""' in cfg or "apiKey:''" in cfg, (
            "ZIP firebase-config.js is not the placeholder — refusing to ship a real config")
        print("  firebase-config.js in ZIP is the placeholder (repo config untouched)")
    print("zip checks OK:", len(names), "entries")
