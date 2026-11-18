#!/usr/bin/env python3
"""One-off repair for the V16 KO-button bug (2026-11-18).

Bug: build_v16.py built KO_TAIL_NEW as KO_TAIL_OLD[:-2] + KO_BTN + "';",
stripping the v23 string's closing quote as well as the ';'. The built
tabs line then read
  ...</button>+'<button class="tab v27kotab" ...>...</button>'';
i.e. the v23 string swallowed the '+' and the v27 string's opening quote,
leaving bare `<button class=...` code — `node --check` on the extracted
line fails with "SyntaxError: Unexpected token 'class'". A syntax error
in the V6 inline script block would have broken the whole game.

Fix: replace that exact broken tail with the correct one
(KO_TAIL_OLD[:-1] + KO_BTN + ';'), i.e. keep the v23 string's closing
quote. Only out/index.html is touched (the button lives nowhere else);
build_v16.py itself was fixed the same way, plus a structural assert so a
future run fails loudly instead of shipping broken JS.

Run once: python3 tools/v16/repair_kotab_2026-11-18.py
Verifies afterwards with node --check on the repaired line.
"""
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent.parent
OUT = HERE / "out"
INDEX = OUT / "index.html"

KO_TAIL_OLD = ("+'<button class=\"tab v23kotab\" onclick=\"window.__v23&&__v23.openHub()\" "
               "title=\"Thú Cưng — 펫\"><span class=\"ti\">🐾</span><span>Thú Cưng</span></button>';")
KO_BTN = ("+'<button class=\"tab v27kotab\" onclick=\"window.__v27&&__v27.openSmart(\\'ko\\')\" "
          "title=\"Học thông minh\"><span class=\"ti\">🧠</span><span>Học thông minh</span></button>'")
BROKEN = KO_TAIL_OLD[:-2] + KO_BTN + "';"
FIXED = KO_TAIL_OLD[:-1] + KO_BTN + ";"


def main():
    html = INDEX.read_text(encoding="utf-8")
    assert html.count(BROKEN) == 1, f"broken KO tail found {html.count(BROKEN)}x, expected 1"
    assert html.count(FIXED) == 0, "fixed KO tail already present — repair already applied?"
    assert '</button>\'+\'<button class="tab v27kotab"' not in html, "structural check: line already correct?"
    INDEX.write_text(html.replace(BROKEN, FIXED, 1), encoding="utf-8")
    after = INDEX.read_text(encoding="utf-8")
    assert after.count(FIXED) == 1 and after.count(BROKEN) == 0
    assert '</button>\'+\'<button class="tab v27kotab"' in after
    line = [l for l in after.split("\n") if "v27kotab" in l][0]
    pathlib.Path("/tmp/kotab_fixed.js").write_text(line + "\n", encoding="utf-8")
    r = subprocess.run(["node", "--check", "/tmp/kotab_fixed.js"],
                       capture_output=True, text=True)
    assert r.returncode == 0, f"node --check still fails:\n{r.stdout}\n{r.stderr}"
    print("repaired KO tabs line in out/index.html; node --check OK")
    print("fixed tail:", FIXED[-90:])
    return 0


if __name__ == "__main__":
    sys.exit(main())
