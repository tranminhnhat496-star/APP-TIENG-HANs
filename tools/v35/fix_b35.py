#!/usr/bin/env python3
"""fix_b35.py — V18.0 SKYROOT SANCTUARY test-agent fixes (kept script).

B-35-2 (REAL, SEVERE — found by tools/v35/test35.js §B live-fight probe):
  No Skyroot boss could ever be fought. In src/v19.js bossUnlocked19()
  the boss lookup falls through to __V33_DATA.byId(id) but NOT to
  __V35_DATA.byId(id), so for every v18_* id `b` is null and the
  function returns false — the skyroot delegation added by build
  R-V35-V19-UNLOCK (the very next lines) is unreachable dead code.
  fight() (which DOES have the V35 fall-through, R-V35-V19-FIGHT)
  therefore refuses every Skyroot boss with 'Boss này chưa mở khóa'
  and leaves F null; the overlay's "Bắt đầu chiến đấu" button
  (fightBoss -> v.fight) fails the same way. Root cause: build_v35.py
  R-V35-V19-UNLOCK only inserted the delegation line and never
  extended the lookup line above it (unlike R-V35-V19-FIGHT and
  R-V35-V18-CH, which both got the fall-through).
  Fix: byte-exact edit adding the V35 fall-through to the lookup line
  in src/v19.js AND in the inlined v19js block of out/index.html.
  build_v35.py itself is NOT edited here (per the skill: ask the user
  before changing a build script) — its R-V35-V19-UNLOCK replacement
  needs the same one-line addition as a follow-up, or a rebuild from
  it reintroduces B-35-2. This script documents the exact correction.

Usage: python3 tools/v35/fix_b35.py   (run from ~/workspace/v7build/)
Exit 0 = fix applied and verified (or already applied); 1 = failure.
"""
import hashlib
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OLD = ("  var b=D19().byId(id)||(window.__V33_DATA&&__V33_DATA.byId"
       "?__V33_DATA.byId(id):null);if(!b)return false;")
NEW = ("  var b=D19().byId(id)||(window.__V33_DATA&&__V33_DATA.byId"
       "?__V33_DATA.byId(id):null)||(window.__V35_DATA&&__V35_DATA.byId"
       "?__V35_DATA.byId(id):null);if(!b)return false;")
TARGETS = [
    os.path.join(ROOT, "src", "v19.js"),
    os.path.join(ROOT, "out", "index.html"),
]


def sha(p):
    with open(p, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def patch(path):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    n_old = text.count(OLD)
    n_new = text.count(NEW)
    if n_old == 0 and n_new == 1:
        print(f"  {path}: already fixed (NEW present x1, OLD absent)")
        return True
    assert n_old == 1, f"{path}: expected OLD x1, found x{n_old}"
    assert n_new == 0, f"{path}: NEW already present x{n_new} (unexpected)"
    with open(path, "w", encoding="utf-8") as f:
        f.write(text.replace(OLD, NEW))
    with open(path, encoding="utf-8") as f:
        after = f.read()
    assert after.count(OLD) == 0 and after.count(NEW) == 1, f"{path}: post-check failed"
    print(f"  {path}: patched (OLD x1 -> NEW x1)")
    return True


def main():
    print("fix_b35.py — B-35-2: bossUnlocked19 V35 lookup fall-through")
    for p in TARGETS:
        assert os.path.exists(p), f"missing: {p}"
    before = {p: sha(p) for p in TARGETS}
    print("  before sha256:")
    for p in TARGETS:
        print(f"    {before[p]}  {os.path.relpath(p, ROOT)}")
    for p in TARGETS:
        patch(p)
    print("  after sha256:")
    for p in TARGETS:
        print(f"    {sha(p)}  {os.path.relpath(p, ROOT)}")
    # Verify: src/v19.js parses, and the inlined v19js block in
    # out/index.html parses (extract + node --check, as SMOKE_TEST §2).
    subprocess.run(["node", "--check", os.path.join(ROOT, "src", "v19.js")],
                   check=True)
    print("  node --check src/v19.js OK")
    html = open(os.path.join(ROOT, "out", "index.html"), encoding="utf-8").read()
    import re
    m = re.search(r'<script id="v19js"[^>]*>([\s\S]*?)</script>', html)
    assert m, "v19js block not found in out/index.html"
    tmp = "/tmp/fix_b35_v19js_check.js"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(m.group(1))
    subprocess.run(["node", "--check", tmp], check=True)
    print("  node --check inlined v19js block OK")
    # src/out agreement for v19.js (the inlined block must equal src).
    assert m.group(1).strip() == open(os.path.join(ROOT, "src", "v19.js"),
                                       encoding="utf-8").read().strip(), \
        "inlined v19js block != src/v19.js after fix"
    print("  src/v19.js agrees with inlined v19js block")
    print("B-35-2 FIXED — re-run tools/v35/test35.js and package_v35.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
