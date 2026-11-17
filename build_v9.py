#!/usr/bin/env python3
"""Build V9 index.html from the V6 Bilingual build + V15 + V16 + V17 layers.

V6 code is kept verbatim. V15 (English expansion), V16 (Smart Import)
and V17 (Built-in Vocabulary Library) are appended only:
  - <style id="v15">      : v15.css
  - <script id="v15data"> : v15_data.js + generated EN words (1000, A1-B2)
  - <script id="v15js">   : v15.js
  - <style id="v16">      : v16.css  (Smart Import wizard theme)
  - <script id="v16xlsx"> : vendor/xlsx-0.18.5.full.min.js (SheetJS, pinned,
                            vendored locally — no CDN, no API key)
  - <script id="v16js">   : v16.js
  - <style id="v17">      : v17.css  (Library theme)
  - <script id="v17data"> : v17_a1a2.js (1000 từ A1-A2, 19 chủ đề)
                            + v17_oxford.js (3396 từ Oxford, 136 bài)
                            Inlined like V15 data: synchronous, works from
                            file:// and GitHub Pages, no fetch() needed.
                            The UI still loads on demand — lessons render
                            20-30 cards at a time, never thousands at once.
  - <script id="v17js">   : v17.js   (Library UI: 3 groups, lesson view,
                            search/POS/status filters, favorites,
                            copy-to-personal, lesson completion rewards)

Usage:  python3 build_v9.py [--src DIR] [--out DIR]
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
    assert 'id="v17js"' not in html, "V17 already present in input"

    words = load_words(data_dir)
    print(f"EN words from batches: {len(words)}")
    by_level = {}
    for w in words:
        by_level[w["level"]] = by_level.get(w["level"], 0) + 1
    print("by level:", by_level)
    assert len(words) >= 1000, f"only {len(words)} new EN words, need >= 1000"
    assert all(w["en"] and w["vi"] and w["ipa"] for w in words), "word missing en/vi/ipa"

    # --- V17 library data: validate counts before building ---
    a1a2 = json.loads((data_dir / "v17_a1a2.json").read_text(encoding="utf-8"))
    oxford = json.loads((data_dir / "v17_oxford.json").read_text(encoding="utf-8"))
    assert len(a1a2) == 1000, f"A1-A2 data has {len(a1a2)} words, expected 1000"
    assert len(oxford) == 3396, f"Oxford data has {len(oxford)} words, expected 3396"
    assert len({r["topic"] for r in a1a2}) == 19, "A1-A2 topics != 19"
    assert max(r["lesson"] for r in oxford) == 136, "Oxford lessons != 136"
    assert all(r["en"] and r["vi"] for r in a1a2 + oxford), "library word missing en/vi"
    print(f"V17 library: A1-A2 {len(a1a2)} words / 19 topics; Oxford {len(oxford)} words / 136 lessons")

    v15_data = (src_dir / "v15_data.js").read_text(encoding="utf-8")
    v15_js = (src_dir / "v15.js").read_text(encoding="utf-8")
    v15_css = (src_dir / "v15.css").read_text(encoding="utf-8")
    v16_js = (src_dir / "v16.js").read_text(encoding="utf-8")
    v16_css = (src_dir / "v16.css").read_text(encoding="utf-8")
    xlsx_js = (src_dir / "vendor" / "xlsx-0.18.5.full.min.js").read_text(encoding="utf-8")
    v17_a1a2_js = (src_dir / "v17_a1a2.js").read_text(encoding="utf-8")
    v17_oxford_js = (src_dir / "v17_oxford.js").read_text(encoding="utf-8")
    v17_js = (src_dir / "v17.js").read_text(encoding="utf-8")
    v17_css = (src_dir / "v17.css").read_text(encoding="utf-8")
    for name, txt in [("v15_data.js", v15_data), ("v15.js", v15_js),
                      ("v15.css", v15_css), ("v16.js", v16_js),
                      ("v16.css", v16_css), ("xlsx vendor", xlsx_js),
                      ("v17_a1a2.js", v17_a1a2_js), ("v17_oxford.js", v17_oxford_js),
                      ("v17.js", v17_js), ("v17.css", v17_css)]:
        assert "</script>" not in txt.lower(), f"{name} contains </script>"
        assert txt.strip(), f"{name} is empty"
    assert "window.XLSX" in xlsx_js or "XLSX" in xlsx_js, "vendor file is not SheetJS"
    assert "__v16" in v16_js, "v16.js does not expose __v16"
    assert "__v17" in v17_js, "v17.js does not expose __v17"
    assert "__V17_A1A2" in v17_a1a2_js, "v17_a1a2.js missing __V17_A1A2"
    assert "__V17_OXFORD" in v17_oxford_js, "v17_oxford.js missing __V17_OXFORD"
    assert "pushV17IntoV14" in v15_js, "v15.js missing V17 push (buildWords integration)"
    assert "library" in v15_js, "v15.js missing library tab"

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
        '\n<style id="v17">\n' + v17_css + "\n</style>\n"
        '<script id="v17data">\n' + v17_a1a2_js + "\n" + v17_oxford_js + "\n</script>\n"
        '<script id="v17js">\n' + v17_js + "\n</script>\n"
    )
    assert "</body>" in html
    html = html.replace("</body>", layer + "</body>", 1)
    html = html.replace(
        "<title>Học từ vựng tiếng Hàn – Korean Vocab Farm V6 Bilingual</title>",
        "<title>Korean &amp; English Vocab Farm V9 — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>",
        1,
    )

    # --- copy the whole V6 tree, then overwrite index.html with the build ---
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(src, out)
    (out / "index.html").write_text(html, encoding="utf-8")
    # keep the V15/V16/V17 sources alongside for future edits
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
    (out / "v17.js").write_text(v17_js, encoding="utf-8")
    (out / "v17.css").write_text(v17_css, encoding="utf-8")
    (out / "v17_a1a2.js").write_text(v17_a1a2_js, encoding="utf-8")
    (out / "v17_oxford.js").write_text(v17_oxford_js, encoding="utf-8")
    (out / "v17_a1a2.json").write_text(
        json.dumps(a1a2, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    (out / "v17_oxford.json").write_text(
        json.dumps(oxford, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    review = json.loads((data_dir / "v17_review.json").read_text(encoding="utf-8"))
    (out / "v17_review.json").write_text(
        json.dumps(review, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    # sample files (generated by gen_samples.js)
    samples = ROOT / "samples"
    assert samples.is_dir() and any(samples.iterdir()), "samples/ missing — run gen_samples.js first"
    if (out / "samples").exists():
        shutil.rmtree(out / "samples")
    shutil.copytree(samples, out / "samples")
    (out / "build_v9.py").write_text(
        (HERE / "build_v9.py").read_text(encoding="utf-8"), encoding="utf-8"
    )
    (out / "gen_samples.js").write_text(
        (HERE / "gen_samples.js").read_text(encoding="utf-8"), encoding="utf-8"
    )
    print(f"built {out / 'index.html'} ({len(html)/1024:.0f} KB)")
    print(f"total EN words in app: {96 + len(words)} V14+V15 + up to {len(a1a2)+len(oxford)} library entries (deduped into one record per word)")
    print(f"vendor: xlsx-0.18.5.full.min.js ({len(xlsx_js)/1024:.0f} KB), samples: {sorted(p.name for p in samples.iterdir())}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
