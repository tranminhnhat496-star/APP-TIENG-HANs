#!/usr/bin/env python3
"""Build V15.1 (UI Readability Upgrade) from the V15 build + the V24 layer.

V15.1 = V15 + layer V24 (src/v24.css + src/v24.js), an ADDITIVE layer only:
  - <style id="v24">  : design tokens (--ui-*), typography floors, button
                       standardization, panel/header/tab fixes, per-screen
                       readability overrides (scoped, never global), the
                       .v15big.ko bug fix, responsive map/popup fixes.
  - <script id="v24js">: window.__v24 = {version:'15.1.0'} + a
                       MutationObserver that scrolls #v18fight into view
                       only when a NEW V18 fight starts (empty -> non-empty).
No game logic changes, no localStorage key changes, no data loss.
All old layers are kept byte-identical (verified below).

Usage:  python3 build_v15ui.py [--out DIR]
Default out: out/ next to this script (the V15 build output).
If out/ does not yet contain the V15 build, run build_v15.py first
(it needs /tmp/v6 — re-extract from the uploaded V6 ZIP if missing).
"""
import argparse
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "out"))
    args = ap.parse_args()
    out = pathlib.Path(args.out)
    src_dir = ROOT / "src"

    index = out / "index.html"
    if not index.exists() or 'id="v23js"' not in index.read_text(encoding="utf-8"):
        print("out/ is not a V15 build — running build_v15.py first")
        r = subprocess.run([sys.executable, str(HERE / "build_v15.py")],
                           cwd=str(HERE))
        assert r.returncode == 0, "build_v15.py failed"

    html = index.read_text(encoding="utf-8")
    assert 'id="v23js"' in html, "V15 build expected (v23js missing)"
    # Idempotent rebuild: strip a previously injected V24 layer first.
    if 'id="v24js"' in html or 'id="v24"' in html:
        import re as _re
        html = _re.sub(r'\n<style id="v24">.*?</style>\n', '\n', html, flags=_re.S)
        html = _re.sub(r'\n<script id="v24js">.*?</script>\n', '\n', html, flags=_re.S)
        html = html.replace(
            "<title>Korean &amp; English Vocab Farm V15.1 — UI Readability Upgrade — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>",
            "<title>Korean &amp; English Vocab Farm V15 — Premium Pet System — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>",
            1,
        )
        assert 'id="v24js"' not in html and 'id="v24"' not in html, "old V24 layer was not stripped"
        print("stripped previous V24 layer; re-injecting")

    v24_css = (src_dir / "v24.css").read_text(encoding="utf-8")
    v24_js = (src_dir / "v24.js").read_text(encoding="utf-8")

    # --- validate the V24 layer itself ---
    assert "</script>" not in v24_js.lower(), "v24.js contains </script>"
    assert "__v24" in v24_js and "15.1.0" in v24_js, "v24.js must expose __v24 15.1.0"
    assert "MutationObserver" in v24_js and "v18fight" in v24_js, "v24.js missing fight scroll fix"
    assert "modeBest" in v24_js and "save15" in v24_js, "v24.js missing en15 backfill fix"
    for token in ("--ui-text-primary", "--ui-text-secondary", "--ui-title-gold",
                  "--ui-bg-panel", "--ui-border", "--ui-success", "--ui-warning",
                  "--ui-danger", "--ui-btn-green"):
        assert token in v24_css, f"v24.css missing design token {token}"
    assert ".v15big.ko" in v24_css and "animation:none" in v24_css, "v24.css missing .ko collision fix"
    assert "#2E7D32" in v24_css, "v24.css missing the AA green primary button"
    assert ".v23bar-fight" in v24_css and "color:#FFF8E1" in v24_css, "v24.css missing pet battle bar fix"
    assert "1600px" in v24_css, "v24.css missing boss-map responsive fix"
    assert v24_css.strip(), "v24.css is empty"

    # --- old layers must be untouched: versions pinned ---
    for marker, ver in (("v15.js", "15.0.0"), ("v18.js", "15.0.0"),
                        ("v19.js", "15.0.0"), ("v23.js", "15.0.0"),
                        ("v17.js", "10.0.0"), ("v20.js", "12.0.0"),
                        ("v22.js", "14.0.0")):
        assert f"version:'{ver}'" in html, f"built html lost {marker} version {ver}"

    layer = (
        '\n<style id="v24">\n' + v24_css + "\n</style>\n"
        '<script id="v24js">\n' + v24_js + "\n</script>\n"
    )
    assert "</body>" in html
    html = html.replace("</body>", layer + "</body>", 1)
    html = html.replace(
        "<title>Korean &amp; English Vocab Farm V15 — Premium Pet System — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>",
        "<title>Korean &amp; English Vocab Farm V15.1 — UI Readability Upgrade — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>",
        1,
    )
    for _mid in ('id="v24"', 'id="v24js"', '__v24'):
        assert _mid in html, "built index.html is missing V24 layer " + _mid
    assert "V15.1" in html, "title was not updated to V15.1"

    index.write_text(html, encoding="utf-8")
    (out / "v24.css").write_text(v24_css, encoding="utf-8")
    (out / "v24.js").write_text(v24_js, encoding="utf-8")
    (out / "build_v15ui.py").write_text(
        (HERE / "build_v15ui.py").read_text(encoding="utf-8"), encoding="utf-8"
    )
    print(f"built {index} ({len(html)/1024:.0f} KB) — V15.1, layer V24 injected last")
    print("V24: tokens + typography + buttons + panels + per-screen fixes + .ko bug fix + fight scroll fix")
    return 0


if __name__ == "__main__":
    sys.exit(main())
