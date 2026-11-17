#!/usr/bin/env python3
"""Build V8 index.html from the V6 Bilingual build + V15 + V16 layers.

V6 code is kept verbatim. V15 (English expansion) and V16 (Smart
Vocabulary Import) are appended only:
  - <style id="v15">      : v15.css
  - <script id="v15data"> : v15_data.js + generated EN words (1000, A1-B2)
  - <script id="v15js">   : v15.js
  - <style id="v16">      : v16.css  (Smart Import wizard theme)
  - <script id="v16xlsx"> : vendor/xlsx-0.18.5.full.min.js (SheetJS, pinned,
                            vendored locally — no CDN, no API key)
  - <script id="v16js">   : v16.js   (file upload xlsx/csv/tsv/txt/json,
                            auto-detect, column mapping, preview,
                            duplicate handling, deck manager,
                            Excel/CSV/JSON export, samples)

Usage:  python3 build_v8.py [--src DIR] [--out DIR]
Default src: the V6 tree extracted from the uploaded ZIP.
Default out: out/ next to this script.
"""
import argparse
import json
import pathlib
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE  # this script lives in ~/workspace/v7build/


def load_words(data_dir):
    words = []
    seen = set()
    for name in sorted(data_dir.glob("batch-*.json")):
        batch = json.loads(name.read_text(encoding="utf-8"))
        for w in batch:
            key = (w.get("en") or "").strip().lower()
            if not key or key in seen:
                continue
            seen.add(key)
            words.append({
                "level": w.get("level", "A1"),
                "topic": w.get("topic", "daily"),
                "en": w.get("en", ""),
                "vi": w.get("vi", ""),
                "ipa": w.get("ipa", ""),
                "pos": w.get("pos", "n"),
                "ex": w.get("ex", ""),
                "exvi": w.get("exvi", ""),
            })
    return words


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="/tmp/v6")
    ap.add_argument("--out", default=str(ROOT / "out"))
    args = ap.parse_args()

    src = pathlib.Path(args.src)
    out = pathlib.Path(args.out)
    data_dir = ROOT / "data"
    src_dir = ROOT / "src"

    v6_html_path = src / "Korean_Vocab_Farm_V6_Bilingual.html"
    assert v6_html_path.exists(), f"V6 html not found: {v6_html_path}"
    html = v6_html_path.read_text(encoding="utf-8")
    assert 'id="v14js"' in html, "expected V6 Bilingual build (v14 layer missing)"
    assert 'id="v15js"' not in html, "V15 already present in input"
    assert 'id="v16js"' not in html, "V16 already present in input"

    words = load_words(data_dir)
    print(f"EN words from batches: {len(words)}")
    by_level = {}
    for w in words:
        by_level[w["level"]] = by_level.get(w["level"], 0) + 1
    print("by level:", by_level)
    assert len(words) >= 1000, f"only {len(words)} new EN words, need >= 1000"
    assert all(w["en"] and w["vi"] and w["ipa"] for w in words), "word missing en/vi/ipa"

    v15_data = (src_dir / "v15_data.js").read_text(encoding="utf-8")
    v15_js = (src_dir / "v15.js").read_text(encoding="utf-8")
    v15_css = (src_dir / "v15.css").read_text(encoding="utf-8")
    v16_js = (src_dir / "v16.js").read_text(encoding="utf-8")
    v16_css = (src_dir / "v16.css").read_text(encoding="utf-8")
    xlsx_js = (src_dir / "vendor" / "xlsx-0.18.5.full.min.js").read_text(encoding="utf-8")
    for name, txt in [("v15_data.js", v15_data), ("v15.js", v15_js),
                      ("v15.css", v15_css), ("v16.js", v16_js),
                      ("v16.css", v16_css), ("xlsx vendor", xlsx_js)]:
        assert "</script>" not in txt.lower(), f"{name} contains </script>"
        assert txt.strip(), f"{name} is empty"
    assert "window.XLSX" in xlsx_js or "XLSX" in xlsx_js, "vendor file is not SheetJS"
    assert "__v16" in v16_js, "v16.js does not expose __v16"

    words_js = (
        "window.__V15_DATA = window.__V15_DATA || {};\n"
        "window.__V15_DATA.words = "
        + json.dumps(words, ensure_ascii=False)
        + ";\n"
    )
    layer = (
        '\n<style id="v15">\n' + v15_css + "\n</style>\n"
        '<script id="v15data">\n' + v15_data + "\n" + words_js + "</script>\n"
        '<script id="v15js">\n' + v15_js + "\n</script>\n"
        '\n<style id="v16">\n' + v16_css + "\n</style>\n"
        '<script id="v16xlsx" src="vendor/xlsx-0.18.5.full.min.js"></script>\n'
        '<script id="v16js">\n' + v16_js + "\n</script>\n"
    )
    assert "</body>" in html
    html = html.replace("</body>", layer + "</body>", 1)
    html = html.replace(
        "<title>Học từ vựng tiếng Hàn – Korean Vocab Farm V6 Bilingual</title>",
        "<title>Korean &amp; English Vocab Farm V8 — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>",
        1,
    )

    # --- copy the whole V6 tree, then overwrite index.html with the build ---
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(src, out)
    (out / "index.html").write_text(html, encoding="utf-8")
    # keep the V15/V16 sources alongside for future edits
    (out / "v15_data.js").write_text(v15_data, encoding="utf-8")
    (out / "v15.js").write_text(v15_js, encoding="utf-8")
    (out / "v15.css").write_text(v15_css, encoding="utf-8")
    (out / "v15_words.json").write_text(
        json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    (out / "v16.js").write_text(v16_js, encoding="utf-8")
    (out / "v16.css").write_text(v16_css, encoding="utf-8")
    (out / "vendor").mkdir(exist_ok=True)
    (out / "vendor" / "xlsx-0.18.5.full.min.js").write_text(xlsx_js, encoding="utf-8")
    # sample files (generated by gen_samples.js)
    samples = ROOT / "samples"
    assert samples.is_dir() and any(samples.iterdir()), "samples/ missing — run gen_samples.js first"
    if (out / "samples").exists():
        shutil.rmtree(out / "samples")
    shutil.copytree(samples, out / "samples")
    (out / "build_v8.py").write_text(
        (HERE / "build_v8.py").read_text(encoding="utf-8"), encoding="utf-8"
    )
    (out / "gen_samples.js").write_text(
        (HERE / "gen_samples.js").read_text(encoding="utf-8"), encoding="utf-8"
    )
    print(f"built {out / 'index.html'} ({len(html)/1024:.0f} KB)")
    print(f"total EN words in app: {96 + len(words)} (96 V14 + {len(words)} new)")
    print(f"vendor: xlsx-0.18.5.full.min.js ({len(xlsx_js)/1024:.0f} KB), samples: {sorted(p.name for p in samples.iterdir())}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
