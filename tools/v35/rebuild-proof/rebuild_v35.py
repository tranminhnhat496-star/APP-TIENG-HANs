#!/usr/bin/env python3
"""Rebuild V18.0 from scratch (pristine V17.1) with the FIXED build_v35.py
(incl. the B-35-2 R-V35-V19-UNLOCK-LOOKUP replacement) and compare against
the shipped build. Proves the build script reproduces the shipped ZIP.

Usage: python3 tools/v35/rebuild-proof/rebuild_v35.py
Exit 0 = scratch rebuild matches shipped (byte-identical, or blank-lines
only after normalisation); 1 = real difference.
"""
import hashlib
import pathlib
import shutil
import subprocess
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent.parent
SCRATCH = pathlib.Path(__file__).resolve().parent / "scratch"
V171_ZIP = ROOT / "Korean_English_Vocab_Farm_V17_1_Chrono_Complete.zip"


def sha(p):
    return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()


def norm(b):
    # drop blank lines (skill rule: accept a rebuild when only blank
    # lines differ — each layer-script rerun can add one at injection)
    return b"\n".join(ln for ln in b.split(b"\n") if ln.strip() != b"")


def main():
    if SCRATCH.exists():
        shutil.rmtree(SCRATCH)
    (SCRATCH / "src").mkdir(parents=True)
    (SCRATCH / "out").mkdir(parents=True)
    print("extracting pristine V17.1 ZIP ...")
    with zipfile.ZipFile(V171_ZIP) as z:
        z.extractall(SCRATCH / "out")
        for n in z.namelist():
            if (n.endswith(".js") or n.endswith(".css")) and "/" not in n:
                shutil.copyfile(SCRATCH / "out" / n, SCRATCH / "src" / n)
    for f in ("v35.js", "v35.css", "v35_data.js"):
        shutil.copyfile(ROOT / "src" / f, SCRATCH / "src" / f)
    print("pristine out/index.html:", sha(SCRATCH / "out" / "index.html")[:12],
          "(expect 3cdb824d6a52)")
    assert sha(SCRATCH / "out" / "index.html").startswith("3cdb824d6a52")
    print("running fixed build_v35.py on scratch ...")
    r = subprocess.run([sys.executable, str(ROOT / "build_v35.py"),
                        "--out", str(SCRATCH / "out"),
                        "--src", str(SCRATCH / "src")],
                       cwd=ROOT, capture_output=True, text=True)
    print(r.stdout)
    if r.returncode != 0:
        print("STDERR:", r.stderr)
        print("REBUILD FAILED: build script errored")
        return 1
    pairs = [
        ("out/index.html", SCRATCH / "out" / "index.html", ROOT / "out" / "index.html"),
        ("src/v19.js", SCRATCH / "src" / "v19.js", ROOT / "src" / "v19.js"),
        ("out/v19.js", SCRATCH / "out" / "v19.js", ROOT / "out" / "v19.js"),
        ("src/v18.js", SCRATCH / "src" / "v18.js", ROOT / "src" / "v18.js"),
        ("src/v21.js", SCRATCH / "src" / "v21.js", ROOT / "src" / "v21.js"),
    ]
    ok = True
    for name, a, b in pairs:
        ba, bb = a.read_bytes(), b.read_bytes()
        if ba == bb:
            print(f"  {name}: BYTE-IDENTICAL ({len(ba)} B)")
        elif norm(ba) == norm(bb):
            print(f"  {name}: blank-lines-only difference ({len(ba)} vs {len(bb)} B) — ACCEPTED")
        else:
            print(f"  {name}: REAL DIFFERENCE ({len(ba)} vs {len(bb)} B) — FAIL")
            ok = False
    # the B-35-2 line must be present in the rebuilt files
    new = ("(window.__V35_DATA&&__V35_DATA.byId?__V35_DATA.byId(id):null);"
           "if(!b)return false;")
    for p in (SCRATCH / "out" / "index.html", SCRATCH / "src" / "v19.js"):
        assert new in p.read_text(encoding="utf-8"), f"B-35-2 line missing in rebuilt {p}"
    print("  B-35-2 fall-through present in rebuilt index.html + v19.js")
    print("REBUILD:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
