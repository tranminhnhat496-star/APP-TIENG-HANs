#!/usr/bin/env python3
"""Build V15.2 (Vocabulary Library UI/UX Redesign) from the V15.1 build + the V25 layer.

V15.2 = V15.1 + layer V25 (src/v25.css + src/v25.js), an ADDITIVE layer only:
  - <style id="v25">  : library design tokens (--lib-*), set-card frames
                       with dark header band, word-row redesign, status
                       badges, button standardization (green/purple/view),
                       search/filter styling, BT unit tabs, flashcard faces,
                       vocab-tab rows, toast, responsive rules.
  - <script id="v25js">: window.__v25 = {version:'15.2.0'} + a
                       MutationObserver decorator that ADDS status badges,
                       group progress bars, set icons, button classes and
                       type=search to library inputs after every render.
                       Reads only from the app's own stores (WORDS,
                       S.v7.en box/due) — no fake data, no logic change.
No game logic changes, no localStorage key changes, no data loss.
All old layers are kept byte-identical (verified below).

Usage:  python3 build_v15lib.py [--out DIR]
Default out: out/ next to this script (the V15.1 build output).
"""
import argparse
import pathlib
import re
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
    if not index.exists() or 'id="v24js"' not in index.read_text(encoding="utf-8"):
        print("out/ is not a V15.1 build — run build_v15ui.py first")
        return 1

    html = index.read_text(encoding="utf-8")
    assert 'id="v24js"' in html, "V15.1 build expected (v24js missing)"
    # Idempotent rebuild: strip a previously injected V25 layer first.
    if 'id="v25js"' in html or 'id="v25"' in html:
        html = re.sub(r'\n<style id="v25">.*?</style>\n', '\n', html, flags=re.S)
        html = re.sub(r'\n<script id="v25js">.*?</script>\n', '\n', html, flags=re.S)
        html = html.replace(
            "<title>Korean &amp; English Vocab Farm V15.2 — Library UI Upgrade — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>",
            "<title>Korean &amp; English Vocab Farm V15.1 — UI Readability Upgrade — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>",
            1,
        )
        assert 'id="v25js"' not in html and 'id="v25"' not in html, "old V25 layer was not stripped"
        print("stripped previous V25 layer; re-injecting")

    v25_css = (src_dir / "v25.css").read_text(encoding="utf-8")
    v25_js = (src_dir / "v25.js").read_text(encoding="utf-8")

    # --- validate the V25 layer itself ---
    assert "</script>" not in v25_js.lower(), "v25.js contains </script>"
    assert "__v25" in v25_js and "15.2.0" in v25_js, "v25.js must expose __v25 15.2.0"
    assert "MutationObserver" in v25_js, "v25.js missing decorator observer"
    assert "statusOf" in v25_js and "groupStats" in v25_js, "v25.js missing status/progress helpers"
    assert "v25btn-review" in v25_js and "v25btn-view" in v25_js, "v25.js missing button classification"
    assert 'type' in v25_js and "'search'" in v25_js, "v25.js missing search-input type upgrade"
    for token in ("--lib-frame", "--lib-panel", "--lib-ink", "--lib-mute",
                  "--lib-line", "--lib-green", "--lib-purple", "--lib-warn",
                  "--lib-gold"):
        assert token in v25_css, f"v25.css missing design token {token}"
    assert "#247A46" in v25_css, "v25.css missing spec green #247A46"
    assert "#6845A8" in v25_css, "v25.css missing spec purple #6845A8"
    assert "#B45309" in v25_css, "v25.css missing spec warning #B45309"
    assert ".v25status" in v25_css, "v25.css missing status badges"
    assert ".v25group-progress" in v25_css, "v25.css missing group progress"
    assert ".v17group-head" in v25_css and "#292044" in v25_css, "v25.css missing set-card header band"
    assert ".v22type.wd" in v25_css and "#166534" in v25_css, "v25.css missing BT type-badge fix"
    assert ".v15fc-b" in v25_css, "v25.css missing flashcard faces"
    assert v25_css.strip(), "v25.css is empty"

    # --- old layers must be untouched: versions pinned ---
    for marker, ver in (("v15.js", "15.0.0"), ("v18.js", "15.0.0"),
                        ("v19.js", "15.0.0"), ("v23.js", "15.0.0"),
                        ("v17.js", "10.0.0"), ("v20.js", "12.0.0"),
                        ("v22.js", "14.0.0")):
        assert f"version:'{ver}'" in html, f"built html lost {marker} version {ver}"
    # v24.js exposes its version as var VERSION='15.1.0' (not version:'…')
    assert "VERSION='15.1.0'" in html and '__v24' in html, "built html lost v24.js version 15.1.0"

    layer = (
        '\n<style id="v25">\n' + v25_css + "\n</style>\n"
        '<script id="v25js">\n' + v25_js + "\n</script>\n"
    )
    assert "</body>" in html
    html = html.replace("</body>", layer + "</body>", 1)
    html = html.replace(
        "<title>Korean &amp; English Vocab Farm V15.1 — UI Readability Upgrade — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>",
        "<title>Korean &amp; English Vocab Farm V15.2 — Library UI Upgrade — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>",
        1,
    )
    for _mid in ('id="v25"', 'id="v25js"', '__v25'):
        assert _mid in html, "built index.html is missing V25 layer " + _mid
    assert "V15.2" in html, "title was not updated to V15.2"

    index.write_text(html, encoding="utf-8")
    (out / "v25.css").write_text(v25_css, encoding="utf-8")
    (out / "v25.js").write_text(v25_js, encoding="utf-8")
    (out / "build_v15lib.py").write_text(
        (HERE / "build_v15lib.py").read_text(encoding="utf-8"), encoding="utf-8"
    )
    print(f"built {index} ({len(html)/1024:.0f} KB) — V15.2, layer V25 injected last")
    print("V25: library set cards + word rows + status badges + buttons + search + BT units + flashcards")
    return 0


if __name__ == "__main__":
    sys.exit(main())
